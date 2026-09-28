import { and, eq, sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db";

export class InsufficientCredits extends Error {
  constructor(public needed: number, public balance: number) { super("insufficient_credits"); }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Exec = typeof db | Tx;

export const PLANS = [
  { name: "Starter", price: 39, credits: 100, perAd: "$0.39", videos: 10 },
  { name: "Growth", price: 99, credits: 300, perAd: "$0.33", videos: 30 },
  { name: "Agency", price: 299, credits: 1000, perAd: "$0.30", videos: 100 },
];
export const SIGNUP_CREDITS = 20;

export async function balance(accountId: string, x: Exec = db): Promise<number> {
  const [r] = await x.select({ b: dsql<number>`coalesce(sum(${schema.creditLedger.delta}), 0)::int` })
    .from(schema.creditLedger).where(eq(schema.creditLedger.accountId, accountId));
  return r?.b ?? 0;
}

/** Insert a ledger row once. Same key twice = no-op (idempotent). Returns true if written. */
async function write(x: Exec, accountId: string, kind: typeof schema.creditLedger.$inferInsert.kind, delta: number, key: string, ref?: string) {
  const rows = await x.insert(schema.creditLedger).values({ accountId, kind, delta, key, ref }).onConflictDoNothing().returning({ id: schema.creditLedger.id });
  return rows.length > 0;
}

export const grant = (accountId: string, amount: number, key: string, kind: "grant" | "purchase" = "grant") => write(db, accountId, kind, amount, key);

/**
 * Reserve credits for a unit of work (e.g. one ad). Locks the account row so two packs
 * can't overspend at the same time. Throws InsufficientCredits.
 */
export async function reserve(accountId: string, amount: number, key: string, x?: Tx) {
  const run = async (tx: Tx) => {
    await tx.execute(dsql`select id from accounts where id = ${accountId} for update`);
    const b = await balance(accountId, tx);
    if (b < amount) throw new InsufficientCredits(amount, b);
    await write(tx, accountId, "reserve", -amount, `reserve:${key}`, key);
  };
  return x ? run(x) : db.transaction(run);
}

/** Work finished: the reservation becomes a charge (net zero movement, kept for the audit trail). */
export async function settle(accountId: string, key: string) {
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(schema.creditLedger).where(and(eq(schema.creditLedger.key, `reserve:${key}`)));
    if (!r) return;
    await write(tx, accountId, "release", -r.delta, `release:${key}`, key);
    await write(tx, accountId, "charge", r.delta, `charge:${key}`, key);
  });
}

/** Work failed: give the reserved credits back. Safe to call many times. */
export async function refund(accountId: string, key: string) {
  const [r] = await db.select().from(schema.creditLedger).where(eq(schema.creditLedger.key, `reserve:${key}`));
  if (!r) return false;
  const [charged] = await db.select().from(schema.creditLedger).where(eq(schema.creditLedger.key, `charge:${key}`));
  if (charged) return false;
  return write(db, accountId, "refund", -r.delta, `refund:${key}`, key);
}
