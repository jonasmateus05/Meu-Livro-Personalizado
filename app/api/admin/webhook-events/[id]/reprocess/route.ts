import { NextResponse } from "next/server";
import { adminRoute, UUID } from "@/lib/admin-route";
import { processStoredEvent } from "@/lib/cakto/webhook";
import { config, db, log } from "@/lib/server";

export const runtime = "nodejs";

/** POST — reprocessa um evento de webhook que falhou (status "failed"). */
export const POST = adminRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const c = config();
  const result = await processStoredEvent(
    await db(),
    id,
    { productId: c.cakto.productId, expectedAmountCents: c.cakto.expectedAmountCents, autoRelease: c.autoRelease },
    log,
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
});
