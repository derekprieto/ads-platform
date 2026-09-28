/** Server-side use cases. API routes are thin wrappers around these. Every function checks ownership. */
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, sql as dsql } from "drizzle-orm";
import JSZip from "jszip";
import { db, schema } from "@/db";
import type { OfferBrain } from "@/db/schema";
import type { AdDTO, AngleDTO, BrandDTO, Counts } from "./api-types";
import { ANGLE_LIBRARY, recommendedAngles } from "./angles";
import { applyNote, newHeadline, readOffer } from "./brain";
import { balance, grant, PLANS, reserve } from "./credits";
import { generationEnabled } from "./killswitch";
import { currentVersion } from "./pipeline";
import { enqueue } from "./queue";
import { renderAll } from "./render";
import { getMedia } from "./storage";
import { layersFor, pickStyles, styleByKey } from "./styles";

export class HttpError extends Error {
  constructor(public status: number, msg: string, public extra: Record<string, unknown> = {}) { super(msg); }
}

const MAX_ADS_PER_DAY = Number(process.env.MAX_ADS_PER_DAY ?? 1000);

// ---------- account ----------

export async function getMe(accountId: string) {
  const [a] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, accountId));
  const brands = await db.select().from(schema.brands).where(eq(schema.brands.accountId, accountId)).orderBy(asc(schema.brands.createdAt));
  return {
    account: { id: a.id, type: a.type, plan: a.plan, recommendedPlan: a.recommendedPlan },
    credits: await balance(accountId),
    brands: brands.map(brandDTO),
  };
}

export async function onboard(accountId: string, type: "brand" | "agency", clients?: string) {
  const rec = type === "brand" ? "Starter" : clients === "1-5" ? "Growth" : "Agency";
  const [a] = await db.update(schema.accounts).set({ type, recommendedPlan: rec }).where(eq(schema.accounts.id, accountId)).returning();
  return { account: { id: a.id, type: a.type, plan: a.plan, recommendedPlan: a.recommendedPlan } };
}

// ---------- brands ----------

const brandDTO = (b: typeof schema.brands.$inferSelect): BrandDTO => ({ id: b.id, name: b.name, url: b.url, type: b.type, offer: b.offer });

async function ownBrand(accountId: string, brandId: string) {
  const [b] = await db.select().from(schema.brands).where(and(eq(schema.brands.id, brandId), eq(schema.brands.accountId, accountId)));
  if (!b) throw new HttpError(404, "brand not found");
  return b;
}

export async function readBrand(accountId: string, url: string) {
  const clean = url.trim().replace(/\/$/, "");
  if (!clean || clean.length > 300) throw new HttpError(400, "enter a website url");
  const r = await readOffer(clean);
  const o = r.data;
  const offer: OfferBrain = { sell: o.sell, offer: o.offer, who: o.who, pains: o.pains, proof: o.proof, formula: o.formula };
  const [b] = await db.insert(schema.brands).values({ accountId, name: o.name, url: clean.replace(/^https?:\/\//, ""), type: o.type, offer }).returning();
  const lines = new Map(o.angleLines.map((a) => [a.name.toLowerCase(), a.line]));
  await db.insert(schema.angles).values(ANGLE_LIBRARY[o.type].map((a) => ({ brandId: b.id, name: a.name, tag: a.tag, line: lines.get(a.name.toLowerCase()) ?? a.line })));
  return { brand: brandDTO(b) };
}

export async function patchBrand(accountId: string, brandId: string, body: { name?: string; offer?: Partial<OfferBrain>; note?: string }) {
  const b = await ownBrand(accountId, brandId);
  let offer = { ...b.offer, ...(body.offer ?? {}) };
  if (body.note?.trim()) offer = (await applyNote(offer, body.note.trim())).data;
  const [nb] = await db.update(schema.brands).set({ name: body.name ?? b.name, offer }).where(eq(schema.brands.id, brandId)).returning();
  return { brand: brandDTO(nb) };
}

export async function getAngles(accountId: string, brandId: string) {
  await ownBrand(accountId, brandId);
  const rows = await db.select().from(schema.angles).where(eq(schema.angles.brandId, brandId)).orderBy(asc(schema.angles.createdAt));
  const angles: AngleDTO[] = rows.map((a) => ({ id: a.id, name: a.name, line: a.line, tag: a.tag as AngleDTO["tag"] }));
  return { angles, recommended: recommendedAngles(angles) };
}

export async function addAngle(accountId: string, brandId: string, name: string) {
  await ownBrand(accountId, brandId);
  const n = name.trim().slice(0, 80);
  if (!n) throw new HttpError(400, "angle name required");
  const [a] = await db.insert(schema.angles).values({ brandId, name: n, line: "Your own angle.", tag: "Custom" }).returning();
  return { angle: { id: a.id, name: a.name, line: a.line, tag: "Custom" as const } };
}

// ---------- packs & ads ----------

export async function createPack(accountId: string, body: { brandId: string; counts: Counts; angleNames: string[]; look?: string; request?: string; funny?: boolean }) {
  const b = await ownBrand(accountId, body.brandId);
  if (!(await generationEnabled())) throw new HttpError(503, "generation is paused, try again soon");
  const counts = { cold: clamp(body.counts?.cold), warm: clamp(body.counts?.warm), hot: clamp(body.counts?.hot) };
  const total = counts.cold + counts.warm + counts.hot;
  if (!total) throw new HttpError(400, "ask for at least 1 ad");
  const angleNames = (body.angleNames?.length ? body.angleNames : ["Pain"]).slice(0, 20);

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [{ n }] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.ads)
    .innerJoin(schema.brands, eq(schema.brands.id, schema.ads.brandId))
    .where(and(eq(schema.brands.accountId, accountId), gte(schema.ads.createdAt, since)));
  if (n + total > MAX_ADS_PER_DAY) throw new HttpError(429, `daily limit of ${MAX_ADS_PER_DAY} ads reached`);

  const existing = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.ads).where(eq(schema.ads.brandId, b.id));
  const seed = existing[0]?.n ?? 0;

  const created = await db.transaction(async (tx) => {
    const bal = await balance(accountId, tx);
    if (bal < total) throw new HttpError(402, "insufficient_credits", { code: "insufficient_credits", needed: total, balance: bal });
    const [pack] = await tx.insert(schema.packs).values({ brandId: b.id, counts, angleNames, look: body.look ?? "Mix it up", request: body.request?.slice(0, 500) ?? null }).returning();
    const rows: (typeof schema.ads.$inferInsert)[] = [];
    let k = 0;
    for (const stage of ["cold", "warm", "hot"] as const) {
      for (const st of pickStyles(stage, b.type, counts[stage], { funny: body.funny, seed })) {
        rows.push({ packId: pack.id, brandId: b.id, stage, style: st.key, angle: angleNames[(k++ + seed) % angleNames.length] });
      }
    }
    const ads = await tx.insert(schema.ads).values(rows).returning();
    for (const ad of ads) await reserve(accountId, 1, `ad:${ad.id}`, tx);
    return { pack, ads };
  });
  for (const ad of created.ads) await enqueue("ad.generate", { adId: ad.id }, `gen:${ad.id}`);
  return { packId: created.pack.id, ads: await adDTOs(created.ads.map((a) => a.id)) };
}

const clamp = (n: unknown) => Math.max(0, Math.min(40, Math.floor(Number(n) || 0)));

export async function listAds(accountId: string, brandId: string) {
  await ownBrand(accountId, brandId);
  const rows = await db.select({ id: schema.ads.id }).from(schema.ads).where(eq(schema.ads.brandId, brandId)).orderBy(desc(schema.ads.createdAt), asc(schema.ads.id));
  return { ads: await adDTOs(rows.map((r) => r.id)) };
}

export async function adDTOs(ids: string[]): Promise<AdDTO[]> {
  if (!ids.length) return [];
  const ads = await db.select().from(schema.ads).where(inArray(schema.ads.id, ids));
  const versions = await db.select().from(schema.adVersions).where(inArray(schema.adVersions.adId, ids));
  const byId = new Map(ads.map((a) => [a.id, a]));
  return ids.map((id) => byId.get(id)!).filter(Boolean).map((a) => {
    const v = versions.filter((x) => x.adId === a.id).sort((x, y) => y.version - x.version)[0];
    return {
      id: a.id, packId: a.packId, brandId: a.brandId, stage: a.stage, angle: a.angle, style: a.style, status: a.status,
      removed: a.removed, error: a.error, version: v?.version ?? 0, canUndo: (v?.version ?? 0) > 1,
      copy: v?.copy ?? null, layers: v?.layers ?? [], imageUrl: v?.imageUrl ?? null, renders: v?.renders ?? {},
    };
  });
}

async function ownAd(accountId: string, adId: string) {
  const [row] = await db.select({ ad: schema.ads, accountId: schema.brands.accountId }).from(schema.ads)
    .innerJoin(schema.brands, eq(schema.brands.id, schema.ads.brandId)).where(eq(schema.ads.id, adId));
  if (!row || row.accountId !== accountId) throw new HttpError(404, "ad not found");
  return row.ad;
}

/** New version with changed copy. Text-layer edits are free and re-render instantly. */
async function saveVersion(ad: typeof schema.ads.$inferSelect, patch: Partial<NonNullable<AdDTO["copy"]>>) {
  const v = await currentVersion(ad.id);
  if (!v) throw new HttpError(409, "ad is still being made");
  const copy = { ...v.copy, ...patch };
  // Fast save: final PNGs are rendered lazily at download time (the app previews live).
  await db.insert(schema.adVersions).values({ adId: ad.id, version: v.version + 1, copy, layers: layersFor(ad.style, copy), imageUrl: v.imageUrl, renders: {} });
  await db.update(schema.ads).set({ currentVersion: v.version + 1 }).where(eq(schema.ads.id, ad.id));
}

export async function patchAd(accountId: string, adId: string, body: { removed?: boolean; layers?: { id: string; text: string }[] }) {
  const ad = await ownAd(accountId, adId);
  if (typeof body.removed === "boolean") await db.update(schema.ads).set({ removed: body.removed }).where(eq(schema.ads.id, adId));
  if (body.layers?.length) {
    const st = styleByKey(ad.style);
    const patch: Record<string, string> = {};
    for (const l of body.layers) {
      const f = st.fields.find((x) => x.field === l.id);
      if (!f) continue;
      if (f.kind === "art") throw new HttpError(400, "this text is part of the image, use art-edit");
      patch[f.field] = String(l.text).slice(0, 400);
    }
    if (Object.keys(patch).length) await saveVersion(ad, patch);
  }
  return { ad: (await adDTOs([adId]))[0] };
}

export async function artEdit(accountId: string, adId: string, text: string) {
  const ad = await ownAd(accountId, adId);
  if (ad.status !== "ready") throw new HttpError(409, "ad is still being made");
  const key = `art:${adId}:${Date.now()}`;
  await reserve(accountId, 1, key);
  await db.update(schema.ads).set({ status: "generating" }).where(eq(schema.ads.id, adId));
  await enqueue("ad.artEdit", { adId, text: text.slice(0, 120), creditKey: key }, key, 3);
  return { ad: (await adDTOs([adId]))[0] };
}

export async function undo(accountId: string, adId: string) {
  const ad = await ownAd(accountId, adId);
  const v = await currentVersion(adId);
  if (!v || v.version <= 1) throw new HttpError(400, "nothing to undo");
  // Undo = delete the latest version. Earlier versions are untouched.
  await db.delete(schema.adVersions).where(eq(schema.adVersions.id, v.id));
  await db.update(schema.ads).set({ currentVersion: v.version - 1 }).where(eq(schema.ads.id, ad.id));
  return { ad: (await adDTOs([adId]))[0] };
}

export async function headline(accountId: string, adId: string) {
  const ad = await ownAd(accountId, adId);
  const st = styleByKey(ad.style);
  if (st.fields[0]?.kind === "art") throw new HttpError(400, "this text is part of the image, use art-edit");
  const v = await currentVersion(adId);
  if (!v) throw new HttpError(409, "ad is still being made");
  const [b] = await db.select().from(schema.brands).where(eq(schema.brands.id, ad.brandId));
  const r = await newHeadline({ styleKey: ad.style, stage: ad.stage, angle: ad.angle, angleLine: "", brandName: b.name, type: b.type, offer: b.offer, avoid: [], seed: v.version, current: v.copy.headline });
  const text = st.template === "meme" ? r.data.toUpperCase() : r.data;
  await saveVersion(ad, { headline: text });
  return { ad: (await adDTOs([adId]))[0] };
}

export async function more(accountId: string, adId: string) {
  const ad = await ownAd(accountId, adId);
  const [pack] = await db.select().from(schema.packs).where(eq(schema.packs.id, ad.packId));
  const counts = { cold: 0, warm: 0, hot: 0, [ad.stage]: 3 } as Counts;
  const r = await createPack(accountId, { brandId: ad.brandId, counts, angleNames: [ad.angle], request: `Make 3 new variations like this ${styleByKey(ad.style).name} ad. Keep the angle, change the hook and scene.${pack?.request ? " " + pack.request : ""}` });
  return { ads: r.ads };
}

export async function download(accountId: string, brandId: string) {
  const b = await ownBrand(accountId, brandId);
  const { ads } = await listAds(accountId, brandId);
  const zip = new JSZip();
  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  let n = 0;
  for (const ad of ads.filter((a) => a.status === "ready" && !a.removed)) {
    if (!ad.renders["4x5"] && ad.copy) {
      ad.renders = await renderAll({ id: ad.id, style: ad.style, copy: ad.copy, imageUrl: ad.imageUrl });
      await db.update(schema.adVersions).set({ renders: ad.renders }).where(and(eq(schema.adVersions.adId, ad.id), eq(schema.adVersions.version, ad.version)));
    }
    for (const [fmt, url] of Object.entries(ad.renders)) {
      zip.file(`${safe(b.name)}_${ad.stage}_${safe(styleByKey(ad.style).name)}_${safe(ad.angle)}_${ad.id.slice(0, 6)}_${fmt}.png`, await getMedia(url));
      n++;
    }
  }
  return { bytes: await zip.generateAsync({ type: "uint8array" }), name: `${safe(b.name)}-ads.zip`, files: n };
}

// ---------- sharing ----------

export async function createShare(accountId: string, brandId: string, origin: string) {
  await ownBrand(accountId, brandId);
  const token = randomBytes(18).toString("base64url");
  await db.insert(schema.shareLinks).values({ brandId, token, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) });
  return { url: `${origin}/s/${token}` };
}

async function shareByToken(token: string) {
  const [s] = await db.select().from(schema.shareLinks).where(eq(schema.shareLinks.token, token));
  if (!s || (s.expiresAt && s.expiresAt < new Date())) throw new HttpError(404, "link expired or not found");
  return s;
}

export async function getShare(token: string) {
  const s = await shareByToken(token);
  const [b] = await db.select().from(schema.brands).where(eq(schema.brands.id, s.brandId));
  const rows = await db.select({ id: schema.ads.id }).from(schema.ads).where(and(eq(schema.ads.brandId, s.brandId), eq(schema.ads.removed, false), eq(schema.ads.status, "ready")));
  const appr = await db.select().from(schema.approvals).where(eq(schema.approvals.shareLinkId, s.id)).orderBy(asc(schema.approvals.createdAt));
  const approvals: Record<string, { status: string; comment: string | null }> = {};
  for (const a of appr) approvals[a.adId] = { status: a.status, comment: a.comment };
  return { brand: { name: b.name }, ads: await adDTOs(rows.map((r) => r.id)), approvals };
}

export async function postApproval(token: string, body: { adId: string; status: string; comment?: string }) {
  const s = await shareByToken(token);
  if (!["approved", "rejected"].includes(body.status)) throw new HttpError(400, "bad status");
  const [ad] = await db.select().from(schema.ads).where(and(eq(schema.ads.id, body.adId), eq(schema.ads.brandId, s.brandId)));
  if (!ad) throw new HttpError(404, "ad not found");
  await db.insert(schema.approvals).values({ shareLinkId: s.id, adId: ad.id, status: body.status, comment: body.comment?.slice(0, 1000) ?? null });
  return { ok: true };
}

// ---------- credits ----------

export async function getCredits(accountId: string) {
  const [a] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, accountId));
  return { balance: await balance(accountId), plan: a.plan, recommendedPlan: a.recommendedPlan, plans: PLANS };
}

/** Dev: grants credits directly. With Stripe keys this returns a Checkout URL instead (billing step). */
export async function topUp(accountId: string, plan?: string) {
  if (process.env.STRIPE_SECRET_KEY) throw new HttpError(501, "Stripe checkout not wired yet");
  const p = PLANS.find((x) => x.name === plan);
  if (p) await db.update(schema.accounts).set({ plan: p.name }).where(eq(schema.accounts.id, accountId));
  await grant(accountId, p ? p.credits : 100, `topup:${accountId}:${Date.now()}`, "purchase");
  return { balance: await balance(accountId) };
}
