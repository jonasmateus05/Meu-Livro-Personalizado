/**
 * Monta a URL de checkout da Cakto com o checkout_ref da personalização.
 *
 * A URL base é o link de checkout do produto/oferta copiado do painel da Cakto
 * (CAKTO_CHECKOUT_URL). O checkout_ref é anexado nos parâmetros configurados em
 * CAKTO_CHECKOUT_REF_PARAMS (padrão: utm_content, sck, src).
 *
 * Isso NÃO garante que a Cakto devolva o valor no webhook: é exatamente o que
 * o teste de integração (docs/CAKTO.md) precisa confirmar. Enquanto não houver
 * confirmação, os pedidos sem referência ficam "unmatched" e nada é liberado.
 */

const ALLOWED_HOSTS = /(^|\.)cakto\.com\.br$/i;

export class CheckoutConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutConfigError";
  }
}

export function buildCheckoutUrl(baseUrl: string, checkoutRef: string, refParams: string[]): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new CheckoutConfigError("CAKTO_CHECKOUT_URL inválida");
  }
  if (url.protocol !== "https:") throw new CheckoutConfigError("CAKTO_CHECKOUT_URL precisa usar HTTPS");
  if (!ALLOWED_HOSTS.test(url.hostname)) {
    throw new CheckoutConfigError("CAKTO_CHECKOUT_URL precisa apontar para um domínio da Cakto (cakto.com.br)");
  }
  if (refParams.length === 0) throw new CheckoutConfigError("CAKTO_CHECKOUT_REF_PARAMS vazio");
  for (const p of refParams) url.searchParams.set(p, checkoutRef);
  return url.toString();
}
