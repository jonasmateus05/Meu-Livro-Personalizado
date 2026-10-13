export const SECRET = "test-webhook-secret-0123456789abcdef";
export const PRODUCT = "prod_livro_123";

let n = 0;
/** Payload no formato do exemplo público da Cakto (pagamento único). */
export function caktoPayload(over: {
  event?: string;
  orderId?: string;
  status?: string;
  email?: string;
  ref?: string | string[];
  refField?: "utm_content" | "sck" | "checkoutUrl" | "none";
  productId?: string;
  amount?: number;
  secret?: string;
} = {}) {
  n++;
  const refs = over.ref === undefined ? [] : Array.isArray(over.ref) ? over.ref : [over.ref];
  const data: Record<string, unknown> = {
    id: over.orderId ?? `order_${n}`,
    refId: `ref_${n}`,
    customer: { name: "Comprador Teste", email: over.email ?? "compra@example.com", phone: "5511999999999", docNumber: "12345678909" },
    product: { id: over.productId ?? PRODUCT, name: "A Bíblia Infantil Personalizada" },
    offer: { id: "offer_1", name: "Oferta", price: 29.9 },
    status: over.status ?? "paid",
    amount: over.amount ?? 29.9,
    paymentMethod: "pix",
    paidAt: "2026-10-13T12:00:00.000Z",
  };
  const field = over.refField ?? "utm_content";
  if (refs.length && field === "checkoutUrl") data.checkoutUrl = `https://pay.cakto.com.br/abc?${refs.map((r) => `utm_content=${r}`).join("&")}`;
  else if (refs.length && field !== "none") refs.forEach((r, i) => (data[i === 0 ? field : `${field}_${i}`] = r));
  return { secret: over.secret ?? SECRET, event: over.event ?? "purchase_approved", data };
}
