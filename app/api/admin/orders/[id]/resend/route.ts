import { NextResponse } from "next/server";
import { adminRoute, UUID } from "@/lib/admin-route";
import { requestResend } from "@/lib/jobs/handlers";
import { db, log } from "@/lib/server";

export const runtime = "nodejs";

/** POST — gera um novo link (nova versão) e reenvia o e-mail de entrega. */
export const POST = adminRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const version = await requestResend(await db(), id);
  log("admin_resend", { orderId: id, version });
  return NextResponse.json({ ok: true, version });
});
