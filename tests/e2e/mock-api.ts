/**
 * Stateful fake of the API contract (src/lib/api-types.ts) for e2e tests.
 * Set E2E_REAL_API=1 to skip it and hit the real backend instead.
 */
import type { Page, Route } from "@playwright/test";
import type { AccountDTO, AdDTO, AngleDTO, BrandDTO, Stage } from "../../src/lib/api-types";

export const REAL = process.env.E2E_REAL_API === "1";

type Opts = { accountType?: AccountDTO["type"]; withAds?: boolean; credits?: number };

const STYLE_BY_STAGE: Record<Stage, string[]> = {
  cold: ["meme", "tweet", "notes", "bold_claim", "ugc_photo"],
  warm: ["review", "listicle", "us_vs_them"],
  hot: ["formula", "offer_color", "objection"],
};

const BRAND: BrandDTO = {
  id: "brand-1",
  name: "Nimbus Sleep",
  url: "nimbussleep.com",
  type: "ecom",
  offer: {
    sell: "Magnesium sleep gummies that help you fall asleep fast and wake up clear.",
    offer: "First bottle 40% off. 30-night money-back guarantee.",
    who: "Busy adults 25 to 45 who can't turn their brain off at night.",
    pains: ["Can't fall asleep", "mind racing at 2am", "groggy mornings"],
    proof: "",
    formula: { number: "Asleep in 20 minutes", guarantee: "30 nights or your money back", urgency: "40% off ends Sunday", result: "Wake up clear" },
  },
};

const ANGLES: AngleDTO[] = [
  { id: "g1", name: "Pain", line: "Can't fall asleep. Mind racing at 2am.", tag: "Proven" },
  { id: "g2", name: "Result", line: "Asleep in 20 minutes, wake up clear.", tag: "Proven" },
  { id: "g3", name: "Us vs them", line: "Nimbus vs the melatonin hangover.", tag: "Proven" },
  { id: "g4", name: "Enemy", line: "Melatonin is the problem.", tag: "Try this" },
  { id: "g5", name: "Gift", line: "The gift for the most tired person you know.", tag: "Try this" },
  { id: "g6", name: "Identity", line: "For people who hate mornings.", tag: "" },
];

function makeAd(id: string, packId: string, stage: Stage, i: number, angle: string): AdDTO {
  const style = STYLE_BY_STAGE[stage][i % STYLE_BY_STAGE[stage].length];
  const copy = {
    headline: stage === "cold" ? "ME AT 2AM" : "I fall asleep in 20 minutes now.",
    sub: "JUST ONE MORE VIDEO",
    cta: "Shop now",
    big: "20",
    extra: "40% off ends Sunday",
    handle: "@mayasleeps",
    items: ["No morning fog", "Tastes like berries", "Works in 30 minutes"],
    rows: [{ l: "No groggy mornings", r: "Morning fog" }],
    scene: "tired woman in bed",
  };
  return {
    id, packId, brandId: BRAND.id, stage, angle, style, status: "queued", removed: false, error: null, version: 1, canUndo: false,
    copy: null,
    layers: [
      { id: "headline", field: "headline", label: "Headline", text: copy.headline, kind: "layer" },
      { id: "sub", field: "sub", label: "Sub", text: copy.sub, kind: "layer" },
    ],
    imageUrl: null,
    renders: {},
    _copy: copy,
  } as AdDTO & { _copy: typeof copy };
}

export type Mock = { patches: { id: string; body: unknown }[]; state: { ads: AdDTO[]; credits: number } };

export async function mockApi(page: Page, opts: Opts = {}): Promise<Mock> {
  const account: AccountDTO = { id: "acct-1", type: opts.accountType ?? null, plan: "free", recommendedPlan: null };
  const brands: BrandDTO[] = [];
  const state = { ads: [] as AdDTO[], credits: opts.credits ?? 20 };
  const patches: Mock["patches"] = [];
  let n = 0;

  const ready = (a: AdDTO): AdDTO => ({ ...a, status: "ready", copy: (a as AdDTO & { _copy: AdDTO["copy"] })._copy });

  if (opts.withAds) {
    brands.push(BRAND);
    account.type = account.type ?? "brand";
    (["cold", "warm", "hot"] as Stage[]).forEach((st, k) => {
      for (let i = 0; i < 3; i++) state.ads.push(ready(makeAd(`seed-${k}-${i}`, "seed", st, i, "Pain")));
    });
  }

  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  const statuses: AdDTO["status"][] = ["queued", "briefing", "generating", "judging", "splitting", "ready"];

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const m = req.method();
    const body = req.postData() ? JSON.parse(req.postData()!) : {};

    if (p === "/api/me") return json(route, { account, credits: state.credits, brands });
    if (p === "/api/onboarding") {
      account.type = body.type;
      account.recommendedPlan = body.type === "agency" ? "Growth" : "Starter";
      return json(route, { account });
    }
    if (p === "/api/brands/read") {
      await new Promise((r) => setTimeout(r, 600));
      if (!brands.includes(BRAND)) brands.push(BRAND);
      return json(route, { brand: BRAND });
    }
    if (p === `/api/brands/${BRAND.id}` && m === "PATCH") return json(route, { brand: BRAND });
    if (p === `/api/brands/${BRAND.id}/angles`) {
      if (m === "POST") return json(route, { angle: { id: `c${++n}`, name: body.name, line: "Your own angle.", tag: "Custom" } });
      return json(route, { angles: ANGLES, recommended: ANGLES.slice(0, 5).map((a) => a.name) });
    }
    if (p === "/api/packs") {
      const total = body.counts.cold + body.counts.warm + body.counts.hot;
      if (total > state.credits) return json(route, { error: "not enough credits", code: "insufficient_credits", needed: total, balance: state.credits }, 402);
      state.credits -= total;
      const packId = `pack-${++n}`;
      const ads: AdDTO[] = [];
      (["cold", "warm", "hot"] as Stage[]).forEach((st) => {
        for (let i = 0; i < body.counts[st]; i++) ads.push(makeAd(`${packId}-${st}-${i}`, packId, st, i, body.angleNames[i % body.angleNames.length]));
      });
      state.ads.push(...ads);
      return json(route, { packId, ads });
    }
    if (p === `/api/brands/${BRAND.id}/ads`) {
      // Each poll moves every pending ad one step forward.
      state.ads = state.ads.map((a) => {
        if (a.status === "ready" || a.status === "failed") return a;
        const next = statuses[statuses.indexOf(a.status) + 2] ?? "ready";
        return next === "ready" ? ready(a) : { ...a, status: next };
      });
      return json(route, { ads: state.ads });
    }
    const adMatch = p.match(/^\/api\/ads\/([^/]+)(?:\/(\w[\w-]*))?$/);
    if (adMatch) {
      const [, id, action] = adMatch;
      const i = state.ads.findIndex((a) => a.id === id);
      if (i < 0) return json(route, { error: "not found" }, 404);
      const a = state.ads[i];
      if (!action && m === "PATCH") {
        patches.push({ id, body });
        const layers = body.layers ? a.layers.map((l) => ({ ...l, text: body.layers.find((x: { id: string }) => x.id === l.id)?.text ?? l.text })) : a.layers;
        const next: AdDTO = { ...a, removed: body.removed ?? a.removed, layers, version: a.version + 1, canUndo: true };
        state.ads[i] = next;
        return json(route, { ad: next });
      }
      if (action === "headline" || action === "undo") {
        const next: AdDTO = { ...a, layers: a.layers.map((l) => (l.id === "headline" ? { ...l, text: action === "undo" ? "ME AT 2AM" : "YOUR 2AM BRAIN IS LYING" } : l)), canUndo: action === "headline" };
        state.ads[i] = next;
        return json(route, { ad: next });
      }
      if (action === "more") {
        const extra = [0, 1, 2].map((k) => ready(makeAd(`${id}-more-${k}`, a.packId, a.stage, k, a.angle)));
        state.ads.splice(i + 1, 0, ...extra);
        state.credits -= 3;
        return json(route, { ads: extra });
      }
    }
    if (p === "/api/credits") {
      return json(route, {
        balance: state.credits, plan: "free", recommendedPlan: account.recommendedPlan,
        plans: [
          { name: "Starter", price: 39, credits: 100, perAd: "$0.39", videos: 10 },
          { name: "Growth", price: 99, credits: 300, perAd: "$0.33", videos: 30 },
          { name: "Agency", price: 299, credits: 1000, perAd: "$0.30", videos: 100 },
        ],
      });
    }
    if (p === "/api/credits/topup") {
      state.credits += 100;
      return json(route, { balance: state.credits });
    }
    if (p === `/api/brands/${BRAND.id}/share`) return json(route, { url: "/s/tok123" });
    if (p === "/api/share/tok123") {
      if (m === "POST") return json(route, { ok: true });
      return json(route, { brand: { name: BRAND.name }, ads: state.ads, approvals: {} });
    }
    return json(route, { error: `mock: no route for ${m} ${p}` }, 404);
  });

  return { patches, state };
}
