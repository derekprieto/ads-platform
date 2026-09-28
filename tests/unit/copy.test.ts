import { describe, expect, it } from "vitest";
import { validateCopy } from "@/lib/copy";
import { layersFor, pickStyles, STYLES } from "@/lib/styles";

const offer = { sell: "x", offer: "y", who: "z", pains: ["slow season"], proof: "", formula: { number: "25 booked appointments in 30 days", guarantee: "or you don't pay", urgency: "1 per city", result: "full calendar" } };

describe("copy validator", () => {
  it("accepts a full Hot formula ad", () => {
    expect(validateCopy("formula", "hot", { big: "25", headline: "booked HVAC appointments in 30 days", sub: "Or you don't pay.", extra: "1 company per city", scene: "dark" }, offer)).toEqual([]);
  });
  it("rejects a formula ad missing the guarantee or number", () => {
    const errs = validateCopy("formula", "hot", { big: "lots", headline: "appointments", extra: "soon", scene: "dark" }, offer);
    expect(errs.join()).toMatch(/number/);
    expect(errs.join()).toMatch(/guarantee/);
  });
  it("rejects Hot ads with no number and no guarantee", () => {
    expect(validateCopy("objection", "hot", { headline: "Try us today.", scene: "dark" }, offer).join()).toMatch(/hot/);
  });
  it("rejects corporate words and em dashes", () => {
    expect(validateCopy("bold_claim", "cold", { headline: "Unlock your potential", scene: "x" }).join()).toMatch(/unlock/);
    expect(validateCopy("bold_claim", "cold", { headline: "Sleep — better", scene: "x" }).join()).toMatch(/banned/);
  });
});

describe("styles", () => {
  it("every stage has styles for every business type", () => {
    for (const t of ["ecom", "saas", "services"] as const) for (const s of ["cold", "warm", "hot"] as const) expect(pickStyles(s, t, 3).length).toBe(3);
  });
  it("art text is marked as art, the rest as layers", () => {
    expect(layersFor("neon", { headline: "", artText: "hi", scene: "" })[0].kind).toBe("art");
    expect(layersFor("meme", { headline: "A", sub: "B", scene: "" }).map((l) => l.kind)).toEqual(["layer", "layer"]);
  });
  it("style keys are unique", () => {
    expect(new Set(STYLES.map((s) => s.key)).size).toBe(STYLES.length);
  });
});
