import { sql as dsql } from "drizzle-orm";
import { db } from "@/db";

/** Health + failure-rate check. Alert if ok=false (wire to uptime monitor). */
export async function GET() {
  const [r] = await db.execute(dsql`
    select count(*) filter (where status = 'failed')::int as failed, count(*)::int as total
    from ads where created_at > now() - interval '1 hour'`) as unknown as { failed: number; total: number }[];
  const rate = r.total ? r.failed / r.total : 0;
  const [q] = await db.execute(dsql`select count(*)::int as pending from jobs where status in ('pending','running')`) as unknown as { pending: number }[];
  return Response.json({ ok: rate <= 0.05, failureRateLastHour: rate, adsLastHour: r.total, queue: q.pending }, { status: rate <= 0.05 ? 200 : 503 });
}
