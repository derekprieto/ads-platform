import { describe, expect, it } from "vitest";
import type { AccountDTO, AdDTO, AngleDTO, BrandDTO } from "@/lib/api-types";
import { AFTER_OPTS, initialState, liveAnglesId, optsVisible, step, type ChatEvent, type ChatState, type Effect, type Opt } from "./chat";

const acct = (type: AccountDTO["type"], recommendedPlan: string | null = null): AccountDTO => ({ id: "a1", type, plan: "free", recommendedPlan });
const brand = (id = "b1", name = "Nimbus Sleep"): BrandDTO => ({
  id, name, url: "nimbussleep.com", type: "ecom",
  offer: { sell: "gummies", offer: "40% off", who: "tired adults", pains: ["2am brain"], proof: "", formula: { number: "20 min", guarantee: "30 nights", urgency: "ends Sunday", result: "wake up clear" } },
});
const angles: AngleDTO[] = [
  { id: "g1", name: "Pain", line: "can't sleep", tag: "Proven" },
  { id: "g2", name: "Result", line: "asleep in 20", tag: "Proven" },
  { id: "g3", name: "Us vs them", line: "vs melatonin", tag: "Proven" },
  { id: "g4", name: "Enemy", line: "melatonin", tag: "Try this" },
  { id: "g5", name: "Gift", line: "for tired people", tag: "Try this" },
  { id: "g6", name: "Identity", line: "hate mornings", tag: "" },
];
const ad = (id: string, packId: string, stage: AdDTO["stage"], status: AdDTO["status"], brandId = "b1"): AdDTO => ({
  id, packId, brandId, stage, angle: "Pain", style: "meme", status, removed: false, error: null, version: 1, canUndo: false,
  copy: status === "ready" ? { headline: "hi", scene: "x" } : null, layers: [], imageUrl: null, renders: {},
});

function run(events: ChatEvent[], from: ChatState = initialState()) {
  let s = from;
  const effects: Effect[] = [];
  for (const e of events) {
    const r = step(s, e);
    s = r.state;
    effects.push(...r.effects);
  }
  return { s, effects };
}
const last = (s: ChatState) => s.msgs[s.msgs.length - 1];
const optByLabel = (s: ChatState, prefix: string): Opt => {
  const o = last(s).opts?.find((x) => x.label.startsWith(prefix));
  if (!o) throw new Error(`no option ${prefix} in: ${JSON.stringify(last(s).opts?.map((x) => x.label))}`);
  return o;
};

describe("chat state machine", () => {
  it("asks who the account is for when type is null", () => {
    const { s } = run([{ type: "loaded", account: acct(null), credits: 20, brands: [] }]);
    expect(last(s).text).toContain("who's this account for?");
    expect(last(s).tip).toBe("account");
    expect(last(s).opts?.map((o) => o.label)).toEqual(["My own brand", "An agency (we run ads for clients)"]);
    expect(optsVisible(s, last(s))).toBe(true);
  });

  it("runs the brand path to a finished pack", () => {
    let { s, effects } = run([{ type: "loaded", account: acct(null), credits: 20, brands: [] }]);
    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "My own brand") }], s));
    expect(effects).toEqual([{ type: "onboarding", body: { type: "brand" } }]);
    expect(s.await).toBe("url");
    expect(last(s).text).toContain("drop your website below");

    ({ s, effects } = run([{ type: "send", text: "https://nimbussleep.com/" }], s));
    expect(effects).toEqual([{ type: "readBrand", url: "https://nimbussleep.com/" }]);
    expect(last(s).card).toEqual({ kind: "reading", url: "nimbussleep.com", done: false });
    expect(s.busy).toBe(true);

    ({ s, effects } = run([{ type: "brandRead", brand: brand() }], s));
    expect(s.brandId).toBe("b1");
    expect(last(s).card?.kind).toBe("offer");
    expect(s.msgs.some((m) => m.card?.kind === "reading" && m.card.done)).toBe(true);

    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "Looks good") }], s));
    expect(last(s).text).toContain("which part of the funnel?");
    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "Full Funnel Pack") }], s));
    expect(effects).toEqual([{ type: "loadAngles", brandId: "b1", all: false }]);

    ({ s, effects } = run([{ type: "anglesLoaded", angles, recommended: ["Pain", "Result", "Us vs them", "Enemy", "Gift"], all: false }], s));
    expect(s.angleSel).toHaveLength(5);
    expect(s.await).toBe("angle");
    expect(liveAnglesId(s)).toBe(last(s).id);

    ({ s } = run([{ type: "toggleAngle", name: "Gift" }], s));
    expect(s.angleSel).not.toContain("Gift");

    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "Use these") }], s));
    expect(effects).toEqual([{ type: "createPack", body: { brandId: "b1", counts: { cold: 10, warm: 6, hot: 4 }, angleNames: ["Pain", "Result", "Us vs them", "Enemy"] }, intro: "on it. writing hooks for 4 angles across the funnel" }]);

    const ads = [ad("x1", "p1", "cold", "queued"), ad("x2", "p1", "hot", "queued")];
    ({ s, effects } = run([{ type: "packStarted", packId: "p1", ads, intro: "on it" }], s));
    expect(last(s).card).toEqual({ kind: "pack", packId: "p1", title: "Making 2 ads for Nimbus Sleep" });
    expect(s.credits).toBe(18);
    expect(s.tab).toBe("cold");

    ({ s, effects } = run([{ type: "adsLoaded", brandId: "b1", ads: [ad("x1", "p1", "cold", "ready"), ad("x2", "p1", "hot", "generating")] }], s));
    expect(last(s).card?.kind).toBe("pack");

    ({ s, effects } = run([{ type: "adsLoaded", brandId: "b1", ads: [ad("x1", "p1", "cold", "ready"), ad("x2", "p1", "hot", "failed")] }], s));
    expect(last(s).text).toContain("done! 1 ads are in your gallery");
    expect(last(s).text).toContain("1 didn't make it, credits refunded");
    expect(last(s).card).toEqual({ kind: "ads", adIds: ["x1"] });
    expect(last(s).opts).toEqual(AFTER_OPTS);
    expect(effects).toEqual([{ type: "refreshCredits" }]);

    // announced only once
    ({ s, effects } = run([{ type: "adsLoaded", brandId: "b1", ads: [ad("x1", "p1", "cold", "ready"), ad("x2", "p1", "hot", "failed")] }], s));
    expect(s.msgs.filter((m) => m.text.startsWith("done!"))).toHaveLength(1);
  });

  it("agency onboarding recommends a plan then asks for a client", () => {
    let { s, effects } = run([{ type: "loaded", account: acct(null), credits: 20, brands: [] }]);
    ({ s } = run([{ type: "pick", opt: optByLabel(s, "An agency") }], s));
    expect(last(s).text).toContain("how many clients");
    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "6 to 20") }], s));
    expect(effects).toEqual([{ type: "onboarding", body: { type: "agency", clients: "6-20" } }]);
    ({ s } = run([{ type: "onboarded", account: acct("agency", "Agency") }], s));
    expect(s.msgs.some((m) => m.text.includes("the Agency plan fits you best: 1,000 credits/mo for $299"))).toBe(true);
    expect(last(s).text).toBe("drop the client's website below");
    expect(s.await).toBe("url");
  });

  it("agency with brands asks which client", () => {
    const { s } = run([{ type: "loaded", account: acct("agency"), credits: 50, brands: [brand("b1"), brand("b2", "Flowdesk")] }]);
    expect(last(s).text).toBe("which client are we doing today?");
    expect(last(s).opts?.map((o) => o.label)).toEqual(["Nimbus Sleep", "Flowdesk", "+ New client"]);
    const r = step(s, { type: "pick", opt: optByLabel(s, "Flowdesk") });
    expect(r.state.brandId).toBe("b2");
    expect(last(r.state).text).toContain("making ads for Flowdesk");
    expect(r.effects).toEqual([{ type: "loadAds", brandId: "b2" }]);
  });

  it("brand account with a brand skips to the funnel question", () => {
    const { s, effects } = run([{ type: "loaded", account: acct("brand"), credits: 20, brands: [brand()] }]);
    expect(last(s).text).toContain("which part of the funnel?");
    expect(effects).toEqual([{ type: "loadAds", brandId: "b1" }]);
  });

  it("asks to top up when credits are short, locally and on 402", () => {
    let { s, effects } = run([
      { type: "loaded", account: acct("brand"), credits: 5, brands: [brand()] },
    ]);
    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "Full Funnel") }, { type: "anglesLoaded", angles, recommended: ["Pain"], all: false }], s));
    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "Use these") }], s));
    expect(effects).toEqual([]);
    expect(last(s).text).toBe("that's 20 credits and you've got 5. wanna top up?");
    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "Top up") }], s));
    expect(effects).toEqual([{ type: "goCredits" }]);

    ({ s } = run([{ type: "insufficient", needed: 10, balance: 3 }], s));
    expect(last(s).text).toBe("that's 10 credits and you've got 3. wanna top up?");
    expect(s.credits).toBe(3);
  });

  it("change something patches the brand with a note", () => {
    let { s, effects } = run([{ type: "loaded", account: acct("brand"), credits: 20, brands: [] }]);
    ({ s } = run([{ type: "send", text: "nimbussleep.com" }, { type: "brandRead", brand: brand() }], s));
    ({ s } = run([{ type: "pick", opt: optByLabel(s, "Change something") }], s));
    expect(s.await).toBe("change");
    ({ s, effects } = run([{ type: "send", text: "offer is 50% off" }], s));
    expect(effects).toEqual([{ type: "patchBrand", brandId: "b1", note: "offer is 50% off" }]);
    ({ s } = run([{ type: "brandPatched", brand: { ...brand(), offer: { ...brand().offer, offer: "50% off" } } }], s));
    expect(last(s).text).toBe("done. anything else?");
    expect(last(s).card?.kind).toBe("offer");
  });

  it("typing during angles adds a custom angle", () => {
    let { s, effects } = run([{ type: "loaded", account: acct("brand"), credits: 20, brands: [brand()] }]);
    ({ s } = run([{ type: "pick", opt: optByLabel(s, "Cold only") }, { type: "anglesLoaded", angles, recommended: ["Pain"], all: false }], s));
    ({ s, effects } = run([{ type: "send", text: "jealous of friends" }], s));
    expect(effects).toEqual([{ type: "addAngle", brandId: "b1", name: "jealous of friends" }]);
    ({ s } = run([{ type: "angleAdded", angle: { id: "c1", name: "jealous of friends", line: "Your own angle.", tag: "Custom" } }], s));
    expect(s.angleSel).toEqual(["Pain", "jealous of friends"]);
    expect(last(s).card).toMatchObject({ kind: "angles" });
    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "Use selected") }], s));
    expect(effects[0]).toMatchObject({ type: "createPack", body: { counts: { cold: 10, warm: 0, hot: 0 }, angleNames: ["Pain", "jealous of friends"] } });
  });

  it("free typing after ads exist makes 4 cold ads from the request; funnier sets funny", () => {
    let { s, effects } = run([{ type: "loaded", account: acct("brand"), credits: 50, brands: [brand()] }, { type: "adsLoaded", brandId: "b1", ads: [ad("x1", "p0", "cold", "ready")] }]);
    ({ s, effects } = run([{ type: "send", text: "more about mornings" }], s));
    expect(effects[0]).toMatchObject({ type: "createPack", body: { counts: { cold: 4, warm: 0, hot: 0 }, request: "more about mornings" } });
    ({ s } = run([{ type: "packStarted", packId: "p2", ads: [ad("y1", "p2", "cold", "ready")], intro: "x" }], s));
    expect(last(s).text).toContain("done! 1 ads");
    ({ s, effects } = run([{ type: "pick", opt: optByLabel(s, "Make them funnier") }], s));
    expect(effects[0]).toMatchObject({ type: "createPack", body: { counts: { cold: 4, warm: 0, hot: 0 }, funny: true } });
  });

  it("read failure asks for the link again", () => {
    let { s } = run([{ type: "loaded", account: acct("brand"), credits: 20, brands: [] }]);
    ({ s } = run([{ type: "send", text: "bad" }, { type: "failed", message: "site not reachable", retry: "url" }], s));
    expect(s.await).toBe("url");
    expect(s.busy).toBe(false);
    expect(last(s).text).toContain("try the link again?");
  });
});
