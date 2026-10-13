import type { Sql } from "../db";

/**
 * Fila de tarefas persistida no PostgreSQL.
 *
 * - enqueue é idempotente (dedupe_key único).
 * - claim usa FOR UPDATE SKIP LOCKED: vários workers não pegam a mesma tarefa.
 * - Uma tarefa "running" cujo lock expirou (worker caiu) volta a ser elegível.
 * - Falhas reagendam com backoff exponencial até max_attempts; depois "dead".
 */

export type JobKind = "generate_book" | "send_book_email";

export type JobRow = {
  id: string;
  kind: JobKind;
  order_id: string;
  payload: Record<string, unknown>;
  dedupe_key: string;
  status: "queued" | "running" | "succeeded" | "dead" | "cancelled";
  attempts: number;
  max_attempts: number;
  last_error: string | null;
};

export async function enqueueJob(
  sql: Sql,
  job: { kind: JobKind; orderId: string; dedupeKey: string; payload?: Record<string, unknown>; maxAttempts?: number },
): Promise<{ id: string; created: boolean }> {
  const inserted = await sql.query<{ id: string }>(
    `insert into public.jobs (kind, order_id, dedupe_key, payload, max_attempts)
     values ($1, $2, $3, $4::jsonb, $5)
     on conflict (dedupe_key) do nothing
     returning id`,
    [job.kind, job.orderId, job.dedupeKey, JSON.stringify(job.payload ?? {}), job.maxAttempts ?? 5],
  );
  if (inserted[0]) return { id: inserted[0].id, created: true };
  const existing = await sql.query<{ id: string }>(`select id from public.jobs where dedupe_key = $1`, [job.dedupeKey]);
  return { id: existing[0].id, created: false };
}

export async function claimJob(sql: Sql, workerId: string, lockSeconds = 600): Promise<JobRow | null> {
  const rows = await sql.query<JobRow>(
    `with next as (
       select id from public.jobs
        where (status = 'queued' and run_after <= now())
           or (status = 'running' and locked_until < now())
        order by run_after
        for update skip locked
        limit 1
     )
     update public.jobs j
        set status = 'running',
            attempts = j.attempts + 1,
            locked_by = $1,
            locked_until = now() + make_interval(secs => $2),
            updated_at = now()
       from next
      where j.id = next.id
     returning j.id, j.kind, j.order_id, j.payload, j.dedupe_key, j.status, j.attempts, j.max_attempts, j.last_error`,
    [workerId, lockSeconds],
  );
  return rows[0] ?? null;
}

export async function completeJob(sql: Sql, id: string, status: "succeeded" | "cancelled", note?: string) {
  await sql.query(
    `update public.jobs
        set status = $2, finished_at = now(), locked_until = null, updated_at = now(),
            last_error = coalesce($3, last_error)
      where id = $1`,
    [id, status, note ?? null],
  );
}

export function backoffSeconds(attempt: number): number {
  return Math.min(30 * 2 ** Math.max(0, attempt - 1), 1800);
}

/** Registra falha. Retorna true se a tarefa morreu (sem novas tentativas). */
export async function failJob(sql: Sql, job: JobRow, error: string, permanent = false): Promise<boolean> {
  const dead = permanent || job.attempts >= job.max_attempts;
  await sql.query(
    `update public.jobs
        set status = $2,
            last_error = $3,
            run_after = now() + make_interval(secs => $4),
            locked_until = null,
            finished_at = case when $2 = 'dead' then now() else null end,
            updated_at = now()
      where id = $1`,
    [job.id, dead ? "dead" : "queued", error.slice(0, 2000), dead ? 0 : backoffSeconds(job.attempts)],
  );
  return dead;
}

/** Recoloca uma tarefa morta/cancelada na fila (ação administrativa). */
export async function retryJob(sql: Sql, id: string): Promise<boolean> {
  const rows = await sql.query(
    `update public.jobs
        set status = 'queued', attempts = 0, run_after = now(), locked_until = null,
            finished_at = null, updated_at = now()
      where id = $1 and status in ('dead', 'cancelled')
      returning id`,
    [id],
  );
  return rows.length === 1;
}

export async function cancelPendingJobsForOrder(sql: Sql, orderId: string, reason: string) {
  await sql.query(
    `update public.jobs
        set status = 'cancelled', last_error = $2, finished_at = now(), locked_until = null, updated_at = now()
      where order_id = $1 and status in ('queued', 'running')`,
    [orderId, reason],
  );
}
