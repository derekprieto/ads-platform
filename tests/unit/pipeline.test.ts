import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, schema } from "@/db";
import { balance } from "@/lib/credits";
import * as brain from "@/lib/brain";
import { createPack, listAds, patchAd, readBrand, undo } from "@/lib/service";
import { drain } from "@/worker/index";
import { newAccount, reset } from "./helpers";

describe("generation pipeline (mock providers)", () => {
  beforeEach(async () => { await reset(); vi.restoreAllMocks(); });

  it("makes a full funnel pack, charges exactly once per ready ad", async () => {
    const a = await newAccount(20);
    const { brand } = await readBrand(a, "signalleads.co");
    expect(brand.type).toBe("services");
    const { ads } = await createPack(a, { brandId: brand.id, counts: { cold: 10, warm: 6, hot: 4 }, angleNames: ["Pain", "Result"] });
    expect(ads).toHaveLength(20);
    expect(await balance(a)).toBe(0);
    await drain();
    const after = (await listAds(a, brand.id)).ads;
    expect(after.filter((x) => x.status === "ready")).toHaveLength(20);
    expect(after.every((x) => Object.keys(x.renders).length === 2)).toBe(true);
    expect(await balance(a)).toBe(0);
    // Hot ads follow the formula rules
    for (const x of after.filter((x) => x.stage === "hot" && x.style === "formula")) expect(x.copy?.big).toMatch(/\d/);
  }, 120_000);

  it("402s when credits run out and creates nothing", async () => {
    const a = await newAccount(3);
    const { brand } = await readBrand(a, "nimbussleep.com");
    await expect(createPack(a, { brandId: brand.id, counts: { cold: 4, warm: 0, hot: 0 }, angleNames: [] })).rejects.toMatchObject({ status: 402 });
    expect((await listAds(a, brand.id)).ads).toHaveLength(0);
    expect(await balance(a)).toBe(3);
  });

  it("a failing ad retries, then fails alone and refunds its credit", async () => {
    const a = await newAccount(5);
    const { brand } = await readBrand(a, "flowdesk.io");
    const real = brain.writeCopy;
    let calls = 0;
    vi.spyOn(brain, "writeCopy").mockImplementation(async (i) => { if (i.stage === "hot") { calls++; throw new Error("provider down"); } return real(i); });
    await createPack(a, { brandId: brand.id, counts: { cold: 2, warm: 0, hot: 1 }, angleNames: ["Pain"] });
    await db.update(schema.jobs).set({ maxAttempts: 2 });
    for (let i = 0; i < 3; i++) { await drain(); await db.update(schema.jobs).set({ runAt: new Date(0) }).where(eq(schema.jobs.status, "pending")); }
    const ads = (await listAds(a, brand.id)).ads;
    expect(ads.filter((x) => x.status === "ready")).toHaveLength(2);
    expect(ads.filter((x) => x.status === "failed")).toHaveLength(1);
    expect(calls).toBe(2);
    expect(await balance(a)).toBe(3); // 5 - 2 ready; the failed one was refunded
  }, 120_000);

  it("text edits make a new version, undo restores it", async () => {
    const a = await newAccount(5);
    const { brand } = await readBrand(a, "nimbussleep.com");
    const { ads } = await createPack(a, { brandId: brand.id, counts: { cold: 1, warm: 0, hot: 0 }, angleNames: ["Pain"] });
    await drain();
    const before = (await listAds(a, brand.id)).ads[0];
    const { ad } = await patchAd(a, ads[0].id, { layers: [{ id: "headline", text: "NEW TOP TEXT" }] });
    expect(ad.copy?.headline).toBe("NEW TOP TEXT");
    expect(ad.canUndo).toBe(true);
    const u = await undo(a, ads[0].id);
    expect(u.ad.copy?.headline).toBe(before.copy?.headline);
  }, 60_000);
});
