import { NextResponse } from "next/server";
import { adminRoute, UUID } from "@/lib/admin-route";
import { retryJob } from "@/lib/jobs/queue";
import { db, log } from "@/lib/server";

export const runtime = "nodejs";

/** POST — recoloca na fila uma tarefa "dead" ou "cancelled". */
export const POST = adminRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const sql = await db();
  const ok = await retryJob(sql, id);
  if (ok) {
    await sql.query(
      `update public.orders o set fulfillment_status = case when j.kind = 'generate_book' then 'queued' else 'generated' end,
              review_reason = null, updated_at = now()
         from public.jobs j where j.id = $1 and o.id = j.order_id and o.fulfillment_status = 'failed'`,
      [id],
    );
  }
  log("admin_job_retry", { jobId: id, ok });
  return NextResponse.json({ ok }, { status: ok ? 200 : 409 });
});
