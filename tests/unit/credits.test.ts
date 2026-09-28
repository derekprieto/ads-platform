import { beforeEach, describe, expect, it } from "vitest";
import { balance, grant, InsufficientCredits, refund, reserve, settle } from "@/lib/credits";
import { newAccount, reset } from "./helpers";

describe("credit ledger", () => {
  beforeEach(reset);

  it("reserve, settle and refund move balance correctly", async () => {
    const a = await newAccount(10);
    await reserve(a, 3, "job1");
    expect(await balance(a)).toBe(7);
    await settle(a, "job1");
    expect(await balance(a)).toBe(7); // charged, not refunded
    expect(await refund(a, "job1")).toBe(false); // can't refund a charged job
    await reserve(a, 2, "job2");
    await refund(a, "job2");
    expect(await balance(a)).toBe(7);
  });

  it("is idempotent: same key twice never double-charges or double-refunds", async () => {
    const a = await newAccount(10);
    await reserve(a, 4, "k");
    await reserve(a, 4, "k");
    expect(await balance(a)).toBe(6);
    await refund(a, "k");
    await refund(a, "k");
    expect(await balance(a)).toBe(10);
    await grant(a, 5, "g1");
    await grant(a, 5, "g1");
    expect(await balance(a)).toBe(15);
  });

  it("never lets parallel reservations overspend", async () => {
    const a = await newAccount(5);
    const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => reserve(a, 1, `p${i}`)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(results.filter((r) => r.status === "rejected" && r.reason instanceof InsufficientCredits)).toHaveLength(5);
    expect(await balance(a)).toBe(0);
  });
});
