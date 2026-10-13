import { NextResponse } from "next/server";
import { handleCaktoWebhook } from "@/lib/cakto/webhook";
import { config, db, log } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook da Cakto (configure em Integrações > Webhooks apontando para
 * https://SEU-DOMINIO/api/webhooks/cakto). Apenas registra e processa o evento;
 * a geração do PDF acontece no worker.
 */
export async function POST(request: Request) {
  const c = config();
  const raw = await request.text();
  try {
    const result = await handleCaktoWebhook(
      {
        sql: await db(),
        secret: c.cakto.webhookSecret,
        policy: { productId: c.cakto.productId, expectedAmountCents: c.cakto.expectedAmountCents, autoRelease: c.autoRelease },
        correlationPath: c.cakto.correlationPath,
        captureEnabled: c.cakto.captureEnabled,
        log,
      },
      raw,
      [...request.headers.keys()],
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    log("cakto_webhook_error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
