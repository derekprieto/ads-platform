import { sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db";
import { grant } from "@/lib/credits";

export async function reset() {
  await db.execute(dsql`truncate accounts, jobs, job_logs, settings restart identity cascade`);
}

export async function newAccount(credits = 20) {
  const [a] = await db.insert(schema.accounts).values({ type: "agency" }).returning();
  if (credits) await grant(a.id, credits, `test-grant:${a.id}`);
  return a.id;
}
