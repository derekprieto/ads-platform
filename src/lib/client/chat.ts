/**
 * Guided chat state machine. Pure: step(state, event) -> { state, effects }.
 * The React hook (useApp) runs the effects (API calls) and feeds results back as events.
 */
import type { AccountDTO, AdDTO, AngleDTO, BrandDTO, BusinessType, Counts, Stage } from "@/lib/api-types";

export type TipTopic = "funnel" | "angles" | "gallery" | "layers" | "credits" | "offer" | "account" | "formula";
export type Clients = "1-5" | "6-20" | "20+";

export type Action =
  | { k: "mode"; mode: "brand" | "agency" }
  | { k: "clients"; clients: Clients }
  | { k: "brand"; brandId: string }
  | { k: "newBrand" }
  | { k: "offerOk" }
  | { k: "offerChange" }
  | { k: "funnel"; counts: Counts }
  | { k: "anglesAll" }
  | { k: "anglesOk" }
  | { k: "more" }
  | { k: "funnier" }
  | { k: "download" }
  | { k: "topup" };

export type Opt = { label: string; action: Action };

export type Card =
  | { kind: "offer"; brand: BrandDTO }
  | { kind: "reading"; url: string; done: boolean; failed?: boolean }
  | { kind: "pack"; packId: string; title: string }
  | { kind: "angles"; names: string[] }
  | { kind: "ads"; adIds: string[] };

export type Msg = { id: number; from: "ai" | "me"; text: string; tip?: TipTopic; card?: Card; opts?: Opt[] };
export type Await = "url" | "change" | "angle" | null;

export type PackBody = { brandId: string; counts: Counts; angleNames: string[]; request?: string; funny?: boolean };

export type ChatState = {
  msgs: Msg[];
  nextId: number;
  loaded: boolean;
  mode: "brand" | "agency" | null;
  account: AccountDTO | null;
  brands: BrandDTO[];
  brandId: string | null;
  credits: number;
  await: Await;
  busy: boolean;
  counts: Counts | null;
  angles: AngleDTO[];
  recommended: string[];
  angleSel: string[];
  pendingRequest: string | null;
  ads: AdDTO[];
  tab: Stage;
  packs: { packId: string; announced: boolean }[];
};

export type Effect =
  | { type: "onboarding"; body: { type: "brand" | "agency"; clients?: Clients } }
  | { type: "readBrand"; url: string }
  | { type: "patchBrand"; brandId: string; note: string }
  | { type: "loadAngles"; brandId: string; all: boolean }
  | { type: "addAngle"; brandId: string; name: string }
  | { type: "createPack"; body: PackBody; intro: string }
  | { type: "loadAds"; brandId: string }
  | { type: "download"; brandId: string }
  | { type: "refreshCredits" }
  | { type: "goCredits" };

export type ChatEvent =
  | { type: "loaded"; account: AccountDTO; credits: number; brands: BrandDTO[]; lastBrandId?: string | null }
  | { type: "pick"; opt: Opt }
  | { type: "send"; text: string }
  | { type: "toggleAngle"; name: string }
  | { type: "switchBrand"; brandId: string }
  | { type: "newClient" }
  | { type: "onboarded"; account: AccountDTO }
  | { type: "brandRead"; brand: BrandDTO }
  | { type: "brandPatched"; brand: BrandDTO }
  | { type: "anglesLoaded"; angles: AngleDTO[]; recommended: string[]; all: boolean }
  | { type: "angleAdded"; angle: AngleDTO }
  | { type: "packStarted"; packId: string; ads: AdDTO[]; intro: string }
  | { type: "insufficient"; needed: number; balance: number }
  | { type: "adsLoaded"; brandId: string; ads: AdDTO[] }
  | { type: "adUpdated"; ad: AdDTO }
  | { type: "adsAdded"; ads: AdDTO[]; afterId?: string }
  | { type: "credits"; balance: number }
  | { type: "setTab"; tab: Stage }
  | { type: "failed"; message: string; retry?: Await };

export type StepResult = { state: ChatState; effects: Effect[] };

export const TYPE_NAME: Record<BusinessType, string> = { ecom: "Ecommerce", saas: "Tech / SaaS", services: "Services / lead gen" };
export const STAGES: Stage[] = ["cold", "warm", "hot"];
export const STAGE_NAME: Record<Stage, string> = { cold: "Cold", warm: "Warm", hot: "Hot" };
export const PLAN_INFO: Record<string, { name: string; price: string; credits: string }> = {
  starter: { name: "Starter", price: "$39", credits: "100" },
  growth: { name: "Growth", price: "$99", credits: "300" },
  agency: { name: "Agency", price: "$299", credits: "1,000" },
};
export const FULL_PACK: Counts = { cold: 10, warm: 6, hot: 4 };
export const FUNNEL_OPTS: Opt[] = [
  { label: "Full Funnel Pack · 20 ads", action: { k: "funnel", counts: FULL_PACK } },
  { label: "Cold only · 10 ads", action: { k: "funnel", counts: { cold: 10, warm: 0, hot: 0 } } },
  { label: "Warm only · 6 ads", action: { k: "funnel", counts: { cold: 0, warm: 6, hot: 0 } } },
  { label: "Hot only · 4 ads", action: { k: "funnel", counts: { cold: 0, warm: 0, hot: 4 } } },
];
export const AFTER_OPTS: Opt[] = [
  { label: "Make 10 more · 10 credits", action: { k: "more" } },
  { label: "Make them funnier", action: { k: "funnier" } },
  { label: "Try new angles", action: { k: "anglesAll" } },
  { label: "Download kept ads", action: { k: "download" } },
];

export const GREETING = "hey! I'm your ad creative assistant\n\nI'll learn what you sell and make scroll-stopping ads for your whole funnel\n\nquick q: who's this account for?";

export const isPending = (ad: AdDTO) => ad.status !== "ready" && ad.status !== "failed";
export const total = (c: Counts) => c.cold + c.warm + c.hot;
export const cleanUrl = (u: string) => u.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");

export function initialState(): ChatState {
  return {
    msgs: [], nextId: 1, loaded: false, mode: null, account: null, brands: [], brandId: null, credits: 0,
    await: null, busy: false, counts: null, angles: [], recommended: [], angleSel: [], pendingRequest: null,
    ads: [], tab: "cold", packs: [],
  };
}

type Draft = Omit<Msg, "id">;

function push(s: ChatState, list: Draft[], patch: Partial<ChatState> = {}): ChatState {
  let id = s.nextId;
  const msgs = s.msgs.concat(list.map((m) => ({ ...m, id: id++ })));
  return { ...s, ...patch, msgs, nextId: id };
}

export const brandOf = (s: ChatState) => s.brands.find((b) => b.id === s.brandId) ?? null;
export const brandAds = (s: ChatState) => s.ads.filter((a) => a.brandId === s.brandId);

/** Options of the last AI message that had any, so a free-text reply can re-offer them. */
function lastOpts(s: ChatState): Opt[] | undefined {
  for (let i = s.msgs.length - 1; i >= 0; i--) if (s.msgs[i].opts?.length) return s.msgs[i].opts;
  return undefined;
}

/** Options are only tappable on the newest message. */
export function optsVisible(s: ChatState, m: Msg) {
  return !!m.opts?.length && !s.busy && s.msgs[s.msgs.length - 1]?.id === m.id;
}

/** The angles card that can still be toggled (latest one, while we wait for angles). */
export function liveAnglesId(s: ChatState): number | null {
  if (s.await !== "angle") return null;
  for (let i = s.msgs.length - 1; i >= 0; i--) if (s.msgs[i].card?.kind === "angles") return s.msgs[i].id;
  return null;
}

function funnelMsg(b: BrandDTO): Draft {
  return { from: "ai", text: `cool, making ads for ${b.name} (${TYPE_NAME[b.type]})\n\nwhich part of the funnel?`, tip: "funnel", opts: FUNNEL_OPTS };
}

function askBrand(s: ChatState): StepResult {
  if (s.brands.length) {
    const opts: Opt[] = s.brands.map((b) => ({ label: b.name, action: { k: "brand", brandId: b.id } }));
    opts.push({ label: "+ New client", action: { k: "newBrand" } });
    return { state: push(s, [{ from: "ai", text: "which client are we doing today?", opts }], { await: null }), effects: [] };
  }
  return { state: push(s, [{ from: "ai", text: "drop the client's website below" }], { await: "url" }), effects: [] };
}

function offerMsg(brand: BrandDTO, text: string): Draft {
  return {
    from: "ai", text, card: { kind: "offer", brand },
    opts: [{ label: "Looks good", action: { k: "offerOk" } }, { label: "Change something", action: { k: "offerChange" } }],
  };
}

function startPack(s: ChatState, counts: Counts, intro: string, extra: { funny?: boolean; request?: string } = {}): StepResult {
  const b = brandOf(s);
  if (!b) return { state: push(s, [{ from: "ai", text: "pick a brand first" }]), effects: [] };
  const n = total(counts);
  if (s.credits < n) return insufficient(s, n, s.credits);
  const request = extra.request ?? s.pendingRequest ?? undefined;
  const body: PackBody = { brandId: b.id, counts, angleNames: s.angleSel.length ? s.angleSel : s.recommended };
  if (request) body.request = request;
  if (extra.funny) body.funny = true;
  return { state: { ...s, busy: true, await: null, pendingRequest: null }, effects: [{ type: "createPack", body, intro }] };
}

function insufficient(s: ChatState, needed: number, balance: number): StepResult {
  return {
    state: push(s, [{ from: "ai", text: `that's ${needed} credits and you've got ${balance}. wanna top up?`, opts: [{ label: "Top up credits", action: { k: "topup" } }] }], { busy: false, credits: balance }),
    effects: [],
  };
}

function act(s: ChatState, a: Action): StepResult {
  const b = brandOf(s);
  switch (a.k) {
    case "mode":
      if (a.mode === "agency") {
        return {
          state: push(s, [{ from: "ai", text: "nice. how many clients are you making ads for?", opts: [
            { label: "1 to 5", action: { k: "clients", clients: "1-5" } },
            { label: "6 to 20", action: { k: "clients", clients: "6-20" } },
            { label: "20+", action: { k: "clients", clients: "20+" } },
          ] }], { mode: "agency" }),
          effects: [],
        };
      }
      return {
        state: push(s, [{ from: "ai", text: "love it. drop your website below and I'll figure out your offer" }], { mode: "brand", await: "url" }),
        effects: [{ type: "onboarding", body: { type: "brand" } }],
      };
    case "clients":
      return { state: { ...s, busy: true }, effects: [{ type: "onboarding", body: { type: "agency", clients: a.clients } }] };
    case "brand": {
      const next = { ...s, brandId: a.brandId };
      const nb = brandOf(next);
      if (!nb) return { state: s, effects: [] };
      return { state: push(next, [funnelMsg(nb)], { await: null }), effects: [{ type: "loadAds", brandId: nb.id }] };
    }
    case "newBrand":
      return { state: push(s, [{ from: "ai", text: "drop the client's website below" }], { await: "url" }), effects: [] };
    case "offerOk":
      return b ? { state: push(s, [funnelMsg(b)], { await: null }), effects: [] } : { state: s, effects: [] };
    case "offerChange":
      return { state: push(s, [{ from: "ai", text: "sure, what should I change?" }], { await: "change" }), effects: [] };
    case "funnel":
      if (!b) return { state: s, effects: [] };
      return { state: { ...s, counts: a.counts, busy: true }, effects: [{ type: "loadAngles", brandId: b.id, all: false }] };
    case "anglesAll":
      if (!b) return { state: s, effects: [] };
      return { state: { ...s, busy: true }, effects: [{ type: "loadAngles", brandId: b.id, all: true }] };
    case "anglesOk":
      if (!s.angleSel.length) {
        return { state: push(s, [{ from: "ai", text: "pick at least one angle first", opts: [{ label: "Use selected angles", action: { k: "anglesOk" } }] }]), effects: [] };
      }
      return startPack(s, s.counts ?? FULL_PACK, `on it. writing hooks for ${s.angleSel.length} angle${s.angleSel.length === 1 ? "" : "s"} across the funnel`);
    case "more":
      return startPack(s, { cold: 6, warm: 2, hot: 2 }, "making 10 more w/ new hooks + scenes");
    case "funnier":
      return startPack(s, { cold: 4, warm: 0, hot: 0 }, "say less. 4 funnier ones coming up", { funny: true });
    case "download":
      if (!b) return { state: s, effects: [] };
      return {
        state: push(s, [{ from: "ai", text: "downloaded! files are named by stage + style so they're easy to find in Ads Manager", opts: AFTER_OPTS }]),
        effects: [{ type: "download", brandId: b.id }],
      };
    case "topup":
      return { state: s, effects: [{ type: "goCredits" }] };
  }
}

function announcePacks(s: ChatState): StepResult {
  let state = s;
  const effects: Effect[] = [];
  for (const p of s.packs) {
    if (p.announced) continue;
    const ads = state.ads.filter((a) => a.packId === p.packId);
    if (!ads.length || ads.some(isPending)) continue;
    const ready = ads.filter((a) => a.status === "ready");
    const failed = ads.length - ready.length;
    let text = `done! ${ready.length} ads are in your gallery`;
    if (failed) text += `\n\n${failed} didn't make it, credits refunded`;
    text += "\n\nI made 4 versions of each and kept the best one. tap any ad to change the text";
    state = push(state, [{ from: "ai", text, card: ready.length ? { kind: "ads", adIds: ready.slice(0, 4).map((a) => a.id) } : undefined, opts: AFTER_OPTS }], {
      packs: state.packs.map((x) => (x.packId === p.packId ? { ...x, announced: true } : x)),
    });
    effects.push({ type: "refreshCredits" });
  }
  return { state, effects };
}

function mergeAds(current: AdDTO[], incoming: AdDTO[]) {
  const byId = new Map(incoming.map((a) => [a.id, a]));
  const kept = current.map((a) => byId.get(a.id) ?? a);
  const seen = new Set(current.map((a) => a.id));
  return kept.concat(incoming.filter((a) => !seen.has(a.id)));
}

export function step(s: ChatState, e: ChatEvent): StepResult {
  switch (e.type) {
    case "loaded": {
      const base: ChatState = { ...s, loaded: true, account: e.account, mode: e.account.type, credits: e.credits, brands: e.brands };
      if (!e.account.type) {
        return {
          state: push(base, [{ from: "ai", text: GREETING, tip: "account", opts: [
            { label: "My own brand", action: { k: "mode", mode: "brand" } },
            { label: "An agency (we run ads for clients)", action: { k: "mode", mode: "agency" } },
          ] }]),
          effects: [],
        };
      }
      if (e.account.type === "brand") {
        const b = e.brands[0];
        if (b) return { state: push({ ...base, brandId: b.id }, [{ from: "ai", text: "hey! welcome back" }, funnelMsg(b)]), effects: [{ type: "loadAds", brandId: b.id }] };
        return { state: push(base, [{ from: "ai", text: "hey! drop your website below and I'll figure out your offer" }], { await: "url" }), effects: [] };
      }
      const last = e.brands.find((b) => b.id === e.lastBrandId);
      if (last) return { state: push({ ...base, brandId: last.id }, [{ from: "ai", text: `hey! welcome back. still on ${last.name}?` }, funnelMsg(last)]), effects: [{ type: "loadAds", brandId: last.id }] };
      return askBrand(push(base, [{ from: "ai", text: "hey! welcome back" }]));
    }
    case "pick": {
      if (e.opt.action.k === "topup") return act(s, e.opt.action);
      return act(push(s, [{ from: "me", text: e.opt.label }]), e.opt.action);
    }
    case "send": {
      const text = e.text.trim();
      if (!text || s.busy) return { state: s, effects: [] };
      const withMe = push(s, [{ from: "me", text }]);
      const b = brandOf(s);
      if (s.await === "url") {
        const url = cleanUrl(text);
        return {
          state: push(withMe, [{ from: "ai", text: `checking out ${url}...`, card: { kind: "reading", url, done: false } }], { await: null, busy: true }),
          effects: [{ type: "readBrand", url: text }],
        };
      }
      if (s.await === "change" && b) return { state: { ...withMe, await: null, busy: true }, effects: [{ type: "patchBrand", brandId: b.id, note: text }] };
      if (s.await === "angle" && b) return { state: { ...withMe, busy: true }, effects: [{ type: "addAngle", brandId: b.id, name: text }] };
      if (!b) return { state: push(withMe, [{ from: "ai", text: "tap one of the options above to get started", opts: lastOpts(s) }]), effects: [] };
      if (brandAds(s).some((a) => a.status === "ready")) return startPack(withMe, { cold: 4, warm: 0, hot: 0 }, `on it: "${text}". making 4 new versions`, { request: text });
      return { state: push(withMe, [{ from: "ai", text: "got it, I'll use that. tap an option above to keep going", opts: lastOpts(s) }], { pendingRequest: text }), effects: [] };
    }
    case "toggleAngle": {
      if (s.await !== "angle") return { state: s, effects: [] };
      const on = s.angleSel.includes(e.name);
      return { state: { ...s, angleSel: on ? s.angleSel.filter((n) => n !== e.name) : s.angleSel.concat(e.name) }, effects: [] };
    }
    case "switchBrand": {
      const next = { ...s, brandId: e.brandId, angles: [], recommended: [], angleSel: [], counts: null };
      const b = brandOf(next);
      if (!b) return { state: s, effects: [] };
      return { state: push(next, [{ from: "ai", text: `switched to ${b.name}` }, funnelMsg(b)], { await: null }), effects: [{ type: "loadAds", brandId: b.id }] };
    }
    case "newClient":
      return { state: push(s, [{ from: "ai", text: "drop the new client's website below" }], { await: "url" }), effects: [] };
    case "onboarded": {
      const next = { ...s, account: e.account, mode: e.account.type, busy: false };
      if (e.account.type !== "agency") return { state: next, effects: [] };
      const plan = e.account.recommendedPlan ? PLAN_INFO[e.account.recommendedPlan.toLowerCase()] : undefined;
      const intro = plan
        ? `got it. the ${plan.name} plan fits you best: ${plan.credits} credits/mo for ${plan.price}\n\neach client gets their own folder + brand voice, and you can send ads to them for approval`
        : "got it. each client gets their own folder + brand voice, and you can send ads to them for approval";
      return askBrand(push(next, [{ from: "ai", text: intro }]));
    }
    case "brandRead": {
      const msgs = s.msgs.map((m) => (m.card?.kind === "reading" && !m.card.done ? { ...m, card: { ...m.card, done: true } } : m));
      const brands = s.brands.filter((b) => b.id !== e.brand.id).concat(e.brand);
      return {
        state: push({ ...s, msgs, brands, brandId: e.brand.id, busy: false, angles: [], recommended: [], angleSel: [] }, [offerMsg(e.brand, "ok here's what I got. every ad uses this so lmk if anything's off")]),
        effects: [{ type: "loadAds", brandId: e.brand.id }],
      };
    }
    case "brandPatched": {
      const brands = s.brands.map((b) => (b.id === e.brand.id ? e.brand : b));
      return { state: push({ ...s, brands, busy: false }, [offerMsg(e.brand, "done. anything else?")]), effects: [] };
    }
    case "anglesLoaded": {
      const b = brandOf(s);
      const recommended = e.recommended.length ? e.recommended : e.angles.slice(0, 5).map((a) => a.name);
      const base = { ...s, angles: e.angles, recommended, busy: false, await: "angle" as const };
      if (e.all) {
        const angleSel = s.angleSel.length ? s.angleSel : recommended;
        return {
          state: push({ ...base, angleSel }, [{ from: "ai", text: `here's everything I found for ${b?.name ?? "you"}. tap to pick, or type your own below`, tip: "angles", card: { kind: "angles", names: e.angles.map((a) => a.name) }, opts: [{ label: "Use selected angles", action: { k: "anglesOk" } }] }]),
          effects: [],
        };
      }
      const kind = b ? TYPE_NAME[b.type].toLowerCase() : "";
      return {
        state: push({ ...base, angleSel: recommended }, [{
          from: "ai",
          text: `which angles? I picked 3 that usually work for ${kind} brands + 2 your competitors basically never use. tap to change`,
          tip: "angles", card: { kind: "angles", names: recommended },
          opts: [{ label: "Use these · recommended", action: { k: "anglesOk" } }, { label: "Show all angles", action: { k: "anglesAll" } }],
        }]),
        effects: [],
      };
    }
    case "angleAdded": {
      const angles = s.angles.filter((a) => a.name !== e.angle.name).concat(e.angle);
      const angleSel = s.angleSel.includes(e.angle.name) ? s.angleSel : s.angleSel.concat(e.angle.name);
      return {
        state: push({ ...s, angles, angleSel, busy: false, await: "angle" }, [{ from: "ai", text: `added "${e.angle.name}". I'll write hooks for it`, card: { kind: "angles", names: angles.map((a) => a.name) }, opts: [{ label: "Use selected angles", action: { k: "anglesOk" } }] }]),
        effects: [],
      };
    }
    case "packStarted": {
      const b = brandOf(s);
      const counts = { cold: 0, warm: 0, hot: 0 };
      e.ads.forEach((a) => counts[a.stage]++);
      const tab = STAGES.find((st) => counts[st] > 0) ?? s.tab;
      const state = push({ ...s, busy: false, ads: mergeAds(s.ads, e.ads), tab, credits: Math.max(0, s.credits - e.ads.length), packs: s.packs.concat({ packId: e.packId, announced: false }) }, [
        { from: "ai", text: e.intro, card: { kind: "pack", packId: e.packId, title: `Making ${e.ads.length} ads for ${b?.name ?? "you"}` } },
      ]);
      return announcePacks(state);
    }
    case "insufficient":
      return insufficient(s, e.needed, e.balance);
    case "adsLoaded": {
      return announcePacks({ ...s, ads: s.ads.filter((a) => a.brandId !== e.brandId).concat(e.ads) });
    }
    case "adUpdated":
      return announcePacks({ ...s, ads: s.ads.map((a) => (a.id === e.ad.id ? e.ad : a)) });
    case "adsAdded": {
      const idx = e.afterId ? s.ads.findIndex((a) => a.id === e.afterId) : -1;
      const fresh = e.ads.filter((a) => !s.ads.some((x) => x.id === a.id));
      const ads = idx >= 0 ? [...s.ads.slice(0, idx + 1), ...fresh, ...s.ads.slice(idx + 1)] : s.ads.concat(fresh);
      return { state: { ...s, ads }, effects: [{ type: "refreshCredits" }] };
    }
    case "credits":
      return { state: { ...s, credits: e.balance }, effects: [] };
    case "setTab":
      return { state: { ...s, tab: e.tab }, effects: [] };
    case "failed": {
      const msgs = s.msgs.map((m) => (m.card?.kind === "reading" && !m.card.done ? { ...m, card: { ...m.card, done: true, failed: true } } : m));
      const retry = e.retry ?? null;
      const opts = retry ? undefined : lastOpts(s);
      return { state: push({ ...s, msgs, busy: false, await: retry ?? s.await }, [{ from: "ai", text: `hmm, that didn't work: ${e.message}. ${retry === "url" ? "try the link again?" : "try again?"}`, opts }]), effects: [] };
    }
  }
}
