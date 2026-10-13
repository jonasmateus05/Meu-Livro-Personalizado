import { NextResponse } from "next/server";
import { adminRoute, UUID } from "@/lib/admin-route";
import { manualLink } from "@/lib/orders";
import { db, log } from "@/lib/server";

export const runtime = "nodejs";

/** POST { "checkout_ref": "lb_..." } — reconciliação manual de um pedido pago sem referência. */
export const POST = adminRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { checkout_ref?: unknown };
  if (typeof body.checkout_ref !== "string") return NextResponse.json({ error: "checkout_ref obrigatório" }, { status: 400 });
  const sql = await db();
  await sql.transaction((tx) => manualLink(tx, id, body.checkout_ref as string));
  log("admin_manual_link", { orderId: id });
  return NextResponse.json({ ok: true });
});
