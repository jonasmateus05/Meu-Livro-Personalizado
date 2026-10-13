import { HANDLERS, PermanentJobError, type HandlerDeps } from "./handlers";
import { claimJob, completeJob, failJob } from "./queue";

export type RunSummary = { processed: number; succeeded: number; failed: number; dead: number; cancelled: number };

/**
 * Processa até `maxJobs` tarefas (ou até acabar o tempo). Usado pelo worker
 * contínuo (scripts/worker.ts) e pela rota protegida /api/jobs/run (cron).
 */
export async function runJobs(
  deps: HandlerDeps,
  opts: { workerId: string; maxJobs?: number; deadlineMs?: number; lockSeconds?: number },
): Promise<RunSummary> {
  const summary: RunSummary = { processed: 0, succeeded: 0, failed: 0, dead: 0, cancelled: 0 };
  const deadline = Date.now() + (opts.deadlineMs ?? 50_000);
  const maxJobs = opts.maxJobs ?? 10;

  while (summary.processed < maxJobs && Date.now() < deadline) {
    const job = await claimJob(deps.sql, opts.workerId, opts.lockSeconds ?? 600);
    if (!job) break;
    summary.processed++;

    if (job.attempts > job.max_attempts) {
      await failJob(deps.sql, job, job.last_error ?? "tentativas esgotadas", true);
      await markOrderFailed(deps, job.order_id, job.kind);
      summary.dead++;
      continue;
    }

    try {
      const handler = HANDLERS[job.kind];
      const result = await handler(deps, job);
      await completeJob(deps.sql, job.id, result === "cancelled" ? "cancelled" : "succeeded", result === "cancelled" ? "pedido não está mais apto" : undefined);
      if (result === "cancelled") summary.cancelled++;
      else summary.succeeded++;
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      const dead = await failJob(deps.sql, job, message, error instanceof PermanentJobError);
      deps.log?.("job_failed", { jobId: job.id, kind: job.kind, attempt: job.attempts, dead, error: message });
      if (dead) {
        await markOrderFailed(deps, job.order_id, job.kind);
        summary.dead++;
      } else summary.failed++;
    }
  }
  return summary;
}

async function markOrderFailed(deps: HandlerDeps, orderId: string, kind: string) {
  await deps.sql.query(
    `update public.orders set fulfillment_status = 'failed', review_reason = $2, updated_at = now()
      where id = $1 and fulfillment_status not in ('revoked', 'delivered')`,
    [orderId, `job_dead:${kind}`],
  );
}
