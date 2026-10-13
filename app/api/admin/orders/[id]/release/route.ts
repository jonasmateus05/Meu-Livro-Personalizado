import { NextResponse } from "next/server";
import { adminRoute, UUID } from "@/lib/admin-route";
import { releaseOrder } from "@/lib/orders";
import { db, log } from "@/lib/server";

export const runtime = "nodejs";

/** POST — libera a geração de um pedido associado em "awaiting_release". */
export const POST = adminRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const sql = await db();
  await sql.transaction((tx) => releaseOrder(tx, id));
  log("admin_release", { orderId: id });
  return NextResponse.json({ ok: true });
});
