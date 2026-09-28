import { sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db";

export type JobKind = "ad.generate" | "ad.artEdit";
export type Job = typeof schema.jobs.$inferSelect;

/** Enqueue once per key (idempotent). */
export async function enqueue(kind: JobKind, payload: Record<string, unknown>, key: string, maxAttempts = 4) {
  await db.insert(schema.jobs).values({ kind, payload, key, maxAttempts }).onConflictDoNothing();
}

/** Claim up to n jobs. SKIP LOCKED so many workers never grab the same job. Lease expires if a worker dies. */
export async function claim(n: number, leaseSeconds = 300): Promise<Job[]> {
  const rows = await db.execute(dsql`
    update jobs set status = 'running', attempts = attempts + 1, locked_until = now() + (${leaseSeconds} || ' seconds')::interval, updated_at = now()
    where id in (
      select id from jobs
      where (status = 'pending' and run_at <= now()) or (status = 'running' and locked_until < now())
      order by run_at
      limit ${n}
      for update skip locked
    )
    returning id, kind, payload, status, attempts, max_attempts as "maxAttempts", key`);
  return rows as unknown as Job[];
}

export async function complete(id: string) {
  await db.execute(dsql`update jobs set status = 'done', locked_until = null, updated_at = now() where id = ${id}`);
}

/** Retry with exponential backoff (5s, 20s, 80s...) or mark failed. Returns true if it will retry. */
export async function fail(job: Pick<Job, "id" | "attempts" | "maxAttempts">, error: string, retryable = true) {
  const retry = retryable && job.attempts < job.maxAttempts;
  const delay = 5 * Math.pow(4, job.attempts - 1);
  await db.execute(dsql`
    update jobs set status = ${retry ? "pending" : "failed"}, last_error = ${error.slice(0, 2000)},
      run_at = now() + (${delay} || ' seconds')::interval, locked_until = null, updated_at = now()
    where id = ${job.id}`);
  return retry;
}

export async function logStep(e: { jobId: string; adId?: string; step: string; provider?: string; costCents?: number; ms?: number; ok: boolean; error?: string }) {
  await db.insert(schema.jobLogs).values({ ...e, costCents: e.costCents ?? 0 });
}
