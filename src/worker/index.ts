/**
 * Background worker. Run with `npm run worker`. Safe to run many copies at once:
 * jobs are claimed with SKIP LOCKED and leases expire if a worker dies mid-job.
 */
import { claim, complete, fail, type Job } from "@/lib/queue";
import { onJobDead, runArtEdit, runGenerate } from "@/lib/pipeline";
import { ProviderError } from "@/lib/providers";
import { generationEnabled } from "@/lib/killswitch";

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 6);
let running = 0;
let stopping = false;

export async function runJob(job: Job) {
  try {
    if (job.kind === "ad.generate") await runGenerate(job);
    else if (job.kind === "ad.artEdit") await runArtEdit(job);
    await complete(job.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const retryable = !(e instanceof ProviderError) || e.retryable;
    const willRetry = await fail(job, msg, retryable);
    if (!willRetry) await onJobDead(job, msg);
    console.error(`[worker] ${job.kind} ${job.id} attempt ${job.attempts} failed${willRetry ? ", retrying" : ", giving up"}: ${msg}`);
  }
}

/** Process whatever is ready right now. Used by tests and by the loop below. */
export async function drain(max = 100) {
  let done = 0;
  while (done < max) {
    const jobs = await claim(CONCURRENCY);
    if (!jobs.length) break;
    await Promise.all(jobs.map(runJob));
    done += jobs.length;
  }
  return done;
}

export async function loop() {
  console.log(`[worker] started, concurrency ${CONCURRENCY}`);
  while (!stopping) {
    if (running < CONCURRENCY && (await generationEnabled())) {
      const jobs = await claim(CONCURRENCY - running).catch((e) => { console.error("[worker] claim failed", e); return []; });
      for (const job of jobs) {
        running++;
        runJob(job).finally(() => { running--; });
      }
      if (jobs.length) continue;
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  while (running > 0) await new Promise((r) => setTimeout(r, 200));
  process.exit(0);
}

export function stop() { stopping = true; }
