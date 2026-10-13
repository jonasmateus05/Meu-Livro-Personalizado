import { NextResponse } from "next/server";
import { buildCheckoutUrl, CheckoutConfigError } from "@/lib/cakto/checkout";
import { ConfigError } from "@/lib/config";
import { createPersonalization } from "@/lib/personalizations";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { config, db, log } from "@/lib/server";
import { personalizationSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inicia a compra: valida a personalização, grava no banco com um checkout_ref
 * aleatório e devolve a URL do checkout da Cakto. NÃO registra pagamento:
 * o status de pagamento só muda pelo webhook autenticado.
 */
export async function POST(request: Request) {
  if (!rateLimit(`checkout:${clientIp(request)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const parsed = personalizationSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Dados inválidos.", field: first?.path?.[0] }, { status: 400 });
  }

  const c = config();
  if (!c.cakto.checkoutUrl) {
    log("checkout_not_configured");
    return NextResponse.json({ error: "O checkout ainda não foi configurado. Tente novamente mais tarde." }, { status: 503 });
  }
  try {
    const personalization = await createPersonalization(await db(), parsed.data);
    const url = buildCheckoutUrl(c.cakto.checkoutUrl, personalization.checkout_ref, c.cakto.checkoutRefParams);
    log("checkout_started", { personalizationId: personalization.id });
    return NextResponse.json({ checkoutUrl: url }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutConfigError || error instanceof ConfigError) {
      log("checkout_config_error", { error: error.message });
      return NextResponse.json({ error: "O checkout está temporariamente indisponível." }, { status: 503 });
    }
    log("checkout_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Não foi possível iniciar a compra. Tente novamente." }, { status: 500 });
  }
}
