/**
 * Ad generation pipeline. Every step is idempotent: it checks what's already saved and
 * skips done work, so a retry after a crash resumes instead of starting over or double-spending.
 *
 *   briefing -> generating (4 candidates) -> judging -> rendering -> ready
 */
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AdCopy } from "@/db/schema";
import { judge, writeCopy } from "./brain";
import { validateCopy } from "./copy";
import { refund, settle } from "./credits";
import { imageProviders, withFallback, ProviderError } from "./providers";
import { logStep, type Job } from "./queue";
import { renderAll } from "./render";
import { importRemote } from "./storage";
import { layersFor, styleByKey } from "./styles";

const CANDIDATES = 4;
const MIN_SCORE = 5;

type AdRow = typeof schema.ads.$inferSelect;

async function setStatus(adId: string, status: AdRow["status"], extra: Partial<AdRow> = {}) {
  await db.update(schema.ads).set({ status, ...extra }).where(eq(schema.ads.id, adId));
}

async function addCost(ad: AdRow, cents: number) {
  if (cents) await db.update(schema.ads).set({ costCents: ad.costCents + cents }).where(eq(schema.ads.id, ad.id));
  ad.costCents += cents;
}

export async function currentVersion(adId: string) {
  const [v] = await db.select().from(schema.adVersions).where(eq(schema.adVersions.adId, adId)).orderBy(desc(schema.adVersions.version)).limit(1);
  return v ?? null;
}

async function timed<T>(job: Job, adId: string, step: string, fn: () => Promise<T & { costCents?: number; provider?: string }>) {
  const t = Date.now();
  try {
    const r = await fn();
    await logStep({ jobId: job.id, adId, step, provider: r.provider, costCents: r.costCents, ms: Date.now() - t, ok: true });
    return r;
  } catch (e) {
    await logStep({ jobId: job.id, adId, step, ms: Date.now() - t, ok: false, error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

function imagePrompt(styleKey: string, copy: AdCopy) {
  const st = styleByKey(styleKey);
  return [
    `SCENE: ${copy.scene}`,
    `LOOK: ${st.look}`,
    copy.artText ? `The image must clearly show this exact text, spelled exactly: "${copy.artText}".` : "No text, letters, captions or watermarks anywhere in the image.",
    "Photorealistic, looks like a real photo posted on social media, not an ad, not a 3D render, not a cartoon.",
    "Leave clean empty space where text will be placed.",
  ].join("\n");
}

export async function runGenerate(job: Job) {
  const adId = String(job.payload.adId);
  const [ad] = await db.select().from(schema.ads).where(eq(schema.ads.id, adId));
  if (!ad || ad.status === "ready") return;
  const [pack] = await db.select().from(schema.packs).where(eq(schema.packs.id, ad.packId));
  const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.id, ad.brandId));
  const st = styleByKey(ad.style);

  // 1. Brief (copy)
  let v = await currentVersion(ad.id);
  if (!v) {
    await setStatus(ad.id, "briefing");
    const angleRow = (await db.select().from(schema.angles).where(and(eq(schema.angles.brandId, brand.id), eq(schema.angles.name, ad.angle))))[0];
    const others = await db.select({ copy: schema.adVersions.copy }).from(schema.adVersions)
      .innerJoin(schema.ads, eq(schema.ads.id, schema.adVersions.adId))
      .where(and(eq(schema.ads.brandId, brand.id), ne(schema.ads.id, ad.id))).limit(40);
    let copy: AdCopy | null = null;
    let problems: string[] = [];
    for (let i = 0; i < 3 && !copy; i++) {
      const r = await timed(job, ad.id, "brief", () => writeCopy({
        styleKey: ad.style, stage: ad.stage, angle: ad.angle, angleLine: angleRow?.line ?? "",
        brandName: brand.name, type: brand.type, offer: brand.offer,
        request: [pack.request, problems.length ? `Fix these problems from your last try: ${problems.join("; ")}` : ""].filter(Boolean).join("\n") || null,
        avoid: others.map((o) => o.copy.headline), seed: ad.createdAt.getTime() % 97 + i,
      }));
      await addCost(ad, r.costCents);
      problems = validateCopy(ad.style, ad.stage, r.data, brand.offer);
      if (!problems.length) copy = r.data;
    }
    if (!copy) throw new ProviderError(`copy failed validation: ${problems.join("; ")}`);
    [v] = await db.insert(schema.adVersions).values({ adId: ad.id, version: 1, copy, layers: layersFor(ad.style, copy) })
      .onConflictDoNothing().returning();
    v ??= (await currentVersion(ad.id))!;
    await db.update(schema.ads).set({ currentVersion: 1 }).where(eq(schema.ads.id, ad.id));
  }

  // 2. Generate candidates + 3. judge
  let imageUrl = v.imageUrl;
  if (st.needsImage && !imageUrl) {
    let cands = await db.select().from(schema.candidates).where(eq(schema.candidates.adId, ad.id)).orderBy(asc(schema.candidates.createdAt));
    const refs = (await db.select().from(schema.assets).where(eq(schema.assets.brandId, brand.id))).filter((a) => a.kind === "product").map((a) => a.url).slice(0, 2);
    for (let round = 0; round < 2 && !imageUrl; round++) {
      if (cands.length < CANDIDATES * (round + 1)) {
        await setStatus(ad.id, "generating");
        const g = await timed(job, ad.id, "generate", () => withFallback(imageProviders(), (p) =>
          p.generate({ prompt: imagePrompt(ad.style, v!.copy), refImageUrls: refs.filter((u) => u.startsWith("http")), aspect: "4:5", n: CANDIDATES })));
        await addCost(ad, g.costCents);
        const stored = await Promise.all(g.urls.map((u) => (u.startsWith("/media/") ? u : importRemote(u, "candidates"))));
        await db.insert(schema.candidates).values(stored.map((imageUrl) => ({ adId: ad.id, imageUrl })));
        cands = await db.select().from(schema.candidates).where(eq(schema.candidates.adId, ad.id)).orderBy(asc(schema.candidates.createdAt));
      }
      await setStatus(ad.id, "judging");
      const batch = cands.slice(round * CANDIDATES, (round + 1) * CANDIDATES);
      const j = await timed(job, ad.id, "judge", () => judge(batch.map((c) => c.imageUrl), v!.copy, ad.style));
      await addCost(ad, j.costCents);
      for (const s of j.data) if (batch[s.index]) await db.update(schema.candidates).set({ score: s.score, notes: s.notes }).where(eq(schema.candidates.id, batch[s.index].id));
      const best = [...j.data].sort((a, b) => b.score - a.score)[0];
      if (best && best.score >= MIN_SCORE && batch[best.index]) imageUrl = batch[best.index].imageUrl;
    }
    if (!imageUrl) throw new ProviderError("no candidate passed quality check", false);
    await db.update(schema.adVersions).set({ imageUrl }).where(eq(schema.adVersions.id, v.id));
  }

  // 4. Render final PNGs
  await setStatus(ad.id, "rendering");
  const renders = await timed(job, ad.id, "render", async () => ({ ...(await renderAll({ id: ad.id, style: ad.style, copy: v!.copy, imageUrl: imageUrl ?? null })), costCents: 0, provider: "satori" }));
  const { costCents: _c, provider: _p, ...files } = renders;
  await db.update(schema.adVersions).set({ renders: files }).where(eq(schema.adVersions.id, v.id));
  await setStatus(ad.id, "ready", { error: null });
  await settle(brand.accountId, `ad:${ad.id}`);
}

export async function runArtEdit(job: Job) {
  const adId = String(job.payload.adId);
  const text = String(job.payload.text);
  const creditKey = String(job.payload.creditKey);
  const [ad] = await db.select().from(schema.ads).where(eq(schema.ads.id, adId));
  const v = await currentVersion(adId);
  if (!ad || !v) return;
  if (v.copy.artText === text && v.imageUrl) { await setStatus(adId, "ready"); return; }
  await setStatus(adId, "generating");
  const r = await timed(job, adId, "art-edit", () => withFallback(imageProviders(), (p) => p.edit({
    imageUrl: v.imageUrl ?? "",
    prompt: `Change only the written text in this image so it reads exactly: "${text}". Keep the same handwriting/neon style, position, lighting and everything else identical.`,
  })));
  const imageUrl = r.url.startsWith("/media/") ? r.url : await importRemote(r.url, "candidates");
  const copy = { ...v.copy, artText: text };
  const renders = await renderAll({ id: ad.id, style: ad.style, copy, imageUrl });
  await db.insert(schema.adVersions).values({ adId, version: v.version + 1, copy, layers: layersFor(ad.style, copy), imageUrl, renders }).onConflictDoNothing();
  await db.update(schema.ads).set({ currentVersion: v.version + 1, status: "ready", costCents: ad.costCents + r.costCents }).where(eq(schema.ads.id, adId));
  await settle(await accountOf(ad.brandId), creditKey);
}

export async function accountOf(brandId: string) {
  const [b] = await db.select({ accountId: schema.brands.accountId }).from(schema.brands).where(eq(schema.brands.id, brandId));
  return b.accountId;
}

/** Called when a job has used all its retries. Marks the ad failed and refunds its credits. */
export async function onJobDead(job: Job, error: string) {
  const adId = String(job.payload.adId);
  const [ad] = await db.select().from(schema.ads).where(eq(schema.ads.id, adId));
  if (!ad) return;
  const accountId = await accountOf(ad.brandId);
  if (job.kind === "ad.artEdit") {
    await setStatus(adId, "ready");
    await refund(accountId, String(job.payload.creditKey));
    return;
  }
  await setStatus(adId, "failed", { error: error.slice(0, 300) });
  await refund(accountId, `ad:${adId}`);
}
