import { beforeEach, describe, expect, it } from "vitest";
import { handleCaktoWebhook, processStoredEvent, type WebhookDeps } from "@/lib/cakto/webhook";
import { extractCheckoutRefs, normalizeCaktoPayload, redactPayload, toCents } from "@/lib/cakto/payload";
import type { Sql } from "@/lib/db";
import { manualLink, releaseOrder } from "@/lib/orders";
import { createPersonalization } from "@/lib/personalizations";
import { caktoPayload, PRODUCT, SECRET } from "./helpers/cakto";
import { newTestDb } from "./helpers/db";

let sql: Sql;
let deps: WebhookDeps;

beforeEach(async () => {
  ({ sql } = await newTestDb());
  deps = { sql, secret: SECRET, policy: { productId: PRODUCT, autoRelease: true } };
});

const send = (payload: unknown, d: Partial<WebhookDeps> = {}) => handleCaktoWebhook({ ...deps, ...d }, JSON.stringify(payload));
const order = async (providerOrderId: string) =>
  (await sql.query<Record<string, unknown>>(`select * from public.orders where provider_order_id = $1`, [providerOrderId]))[0];
const jobs = async () => sql.query<{ kind: string; order_id: string; status: string }>(`select kind, order_id, status from public.jobs`);
const newPersonalization = (name = "Miguel") => createPersonalization(sql, { child_name: name, age_group: "5-7", illustration_style: "colorful" });

describe("autenticidade", () => {
  it("recusa segredo errado ou ausente (401) e não grava nada", async () => {
    expect((await send(caktoPayload({ secret: "errado" }))).status).toBe(401);
    expect((await send({ event: "purchase_approved", data: { id: "x" } })).status).toBe(401);
    expect(await sql.query(`select 1 from public.webhook_events`)).toHaveLength(0);
  });

  it("responde 503 se o segredo não estiver configurado no servidor", async () => {
    expect((await send(caktoPayload(), { secret: undefined })).status).toBe(503);
  });

  it("recusa JSON inválido e payload sem pedido", async () => {
    expect((await handleCaktoWebhook(deps, "{nope")).status).toBe(400);
    expect((await send({ secret: SECRET, event: "purchase_approved", data: {} })).status).toBe(400);
  });

  it("ignora produto diferente do configurado", async () => {
    const r = await send(caktoPayload({ productId: "outro" }));
    expect(r.status).toBe(200);
    expect(r.body.outcome).toBe("ignored_wrong_product");
    expect(await sql.query(`select 1 from public.orders`)).toHaveLength(0);
  });
});

describe("pagamento aprovado", () => {
  it("associa pelo checkout_ref e enfileira a geração (auto-liberação ligada)", async () => {
    const p = await newPersonalization();
    const r = await send(caktoPayload({ orderId: "A1", ref: p.checkout_ref }));
    expect(r.status).toBe(200);
    expect(r.body.outcome).toBe("matched_and_queued");
    const o = await order("A1");
    expect(o.payment_status).toBe("approved");
    expect(o.fulfillment_status).toBe("queued");
    expect(o.personalization_id).toBe(p.id);
    expect(o.match_method).toBe("checkout_ref");
    expect(await jobs()).toEqual([{ kind: "generate_book", order_id: o.id, status: "queued" }]);
  });

  it("modo seguro: associa mas aguarda liberação manual", async () => {
    const p = await newPersonalization();
    await send(caktoPayload({ orderId: "A2", ref: p.checkout_ref }), { policy: { productId: PRODUCT, autoRelease: false } });
    const o = await order("A2");
    expect(o.fulfillment_status).toBe("awaiting_release");
    expect(await jobs()).toHaveLength(0);
    await sql.transaction((tx) => releaseOrder(tx, o.id as string));
    expect((await order("A2")).fulfillment_status).toBe("queued");
    expect(await jobs()).toHaveLength(1);
  });

  it("encontra a referência mesmo dentro de uma URL codificada (ex.: checkoutUrl)", async () => {
    const p = await newPersonalization();
    const payload = caktoPayload({ orderId: "A3", ref: p.checkout_ref, refField: "checkoutUrl" });
    (payload.data as Record<string, unknown>).checkoutUrl = encodeURIComponent(String((payload.data as Record<string, unknown>).checkoutUrl));
    expect((await send(payload)).body.outcome).toBe("matched_and_queued");
  });

  it("com CAKTO_CORRELATION_PATH, só aceita a referência no caminho configurado", async () => {
    const p = await newPersonalization();
    const r = await send(caktoPayload({ orderId: "A4", ref: p.checkout_ref, refField: "sck" }), { correlationPath: "data.utm_content" });
    expect(r.body.outcome).toBe("unmatched:no_checkout_ref_in_payload");
    const p2 = await newPersonalization();
    const r2 = await send(caktoPayload({ orderId: "A5", ref: p2.checkout_ref, refField: "utm_content" }), { correlationPath: "data.utm_content" });
    expect(r2.body.outcome).toBe("matched_and_queued");
  });

  it("valor abaixo do esperado vai para revisão", async () => {
    const p = await newPersonalization();
    const r = await send(caktoPayload({ orderId: "A6", ref: p.checkout_ref, amount: 1 }), { policy: { productId: PRODUCT, autoRelease: true, expectedAmountCents: 2990 } });
    expect(r.body.outcome).toBe("needs_review:amount_below_expected");
  });
});

describe("associação incorreta ou ambígua entre pagamento e personalização", () => {
  it("sem referência no payload: fica 'unmatched' e NADA é gerado (nunca associa por e-mail)", async () => {
    await newPersonalization("Miguel"); // existe uma personalização pendente...
    await send(caktoPayload({ orderId: "B1", email: "pai@example.com" })); // ...mas o payload não traz a referência
    const o = await order("B1");
    expect(o.payment_status).toBe("approved");
    expect(o.fulfillment_status).toBe("unmatched");
    expect(o.personalization_id).toBeNull();
    expect(await jobs()).toHaveLength(0);
  });

  it("referência desconhecida (ou forjada): needs_review", async () => {
    const r = await send(caktoPayload({ orderId: "B2", ref: "lb_AAAAAAAAAAAAAAAAAAAAAAAA" }));
    expect(r.body.outcome).toBe("needs_review:unknown_checkout_ref");
    expect(await jobs()).toHaveLength(0);
  });

  it("duas referências no mesmo payload: needs_review", async () => {
    const a = await newPersonalization("Ana");
    const b = await newPersonalization("Bia");
    const r = await send(caktoPayload({ orderId: "B3", ref: [a.checkout_ref, b.checkout_ref] }));
    expect(r.body.outcome).toBe("needs_review:multiple_checkout_refs");
  });

  it("mesma personalização paga por dois pedidos: o segundo vai para revisão (sem livro duplicado)", async () => {
    const p = await newPersonalization();
    await send(caktoPayload({ orderId: "B4", ref: p.checkout_ref }));
    const r = await send(caktoPayload({ orderId: "B5", ref: p.checkout_ref }));
    expect(r.body.outcome).toBe("needs_review:personalization_already_paid_by_other_order");
    expect(await jobs()).toHaveLength(1);
  });

  it("personalizações diferentes no mesmo e-mail de comprador geram pedidos e livros separados e corretos", async () => {
    const miguel = await newPersonalization("Miguel");
    const sofia = await newPersonalization("Sofia");
    await send(caktoPayload({ orderId: "C1", email: "familia@example.com", ref: sofia.checkout_ref }));
    await send(caktoPayload({ orderId: "C2", email: "FAMILIA@example.com", ref: miguel.checkout_ref }));
    const rows = await sql.query<{ provider_order_id: string; child_name: string; customer_email: string }>(
      `select o.provider_order_id, p.child_name, o.customer_email from public.orders o join public.personalizations p on p.id = o.personalization_id order by 1`,
    );
    expect(rows).toEqual([
      { provider_order_id: "C1", child_name: "Sofia", customer_email: "familia@example.com" },
      { provider_order_id: "C2", child_name: "Miguel", customer_email: "familia@example.com" },
    ]);
    expect(await jobs()).toHaveLength(2);
  });

  it("reconciliação manual: associa um pedido 'unmatched' e libera; recusa associação duplicada", async () => {
    const p = await newPersonalization();
    await send(caktoPayload({ orderId: "D1" }));
    const o = await order("D1");
    await sql.transaction((tx) => manualLink(tx, o.id as string, p.checkout_ref));
    const after = await order("D1");
    expect(after.personalization_id).toBe(p.id);
    expect(after.match_method).toBe("manual");
    expect(after.fulfillment_status).toBe("queued");
    await send(caktoPayload({ orderId: "D2" }));
    const o2 = await order("D2");
    await expect(sql.transaction((tx) => manualLink(tx, o2.id as string, p.checkout_ref))).rejects.toThrow(/já tem um pedido aprovado/);
  });

  it("o banco impede dois pedidos aprovados na mesma personalização (restrição única)", async () => {
    const p = await newPersonalization();
    await send(caktoPayload({ orderId: "E1", ref: p.checkout_ref }));
    await send(caktoPayload({ orderId: "E2" }));
    await expect(
      sql.query(`update public.orders set personalization_id = $1 where provider_order_id = 'E2'`, [p.id]),
    ).rejects.toThrow();
  });
});

describe("recusa, reembolso e chargeback", () => {
  it("pagamento recusado: registra 'refused' e não gera nada", async () => {
    const p = await newPersonalization();
    const r = await send(caktoPayload({ event: "purchase_refused", orderId: "R1", status: "refused", ref: p.checkout_ref }));
    expect(r.body.outcome).toBe("refused");
    const o = await order("R1");
    expect(o.payment_status).toBe("refused");
    expect(o.fulfillment_status).toBe("not_started");
    expect(await jobs()).toHaveLength(0);
    // nova tentativa aprovada com outro pedido para a mesma personalização funciona
    expect((await send(caktoPayload({ orderId: "R2", ref: p.checkout_ref }))).body.outcome).toBe("matched_and_queued");
  });

  it("reembolso depois da aprovação: revoga acesso e cancela tarefas pendentes", async () => {
    const p = await newPersonalization();
    await send(caktoPayload({ orderId: "R3", ref: p.checkout_ref }));
    const r = await send(caktoPayload({ event: "refund", orderId: "R3", status: "refunded" }));
    expect(r.body.outcome).toBe("refunded");
    const o = await order("R3");
    expect(o.payment_status).toBe("refunded");
    expect(o.fulfillment_status).toBe("revoked");
    expect((await jobs())[0].status).toBe("cancelled");
  });

  it("chargeback: revoga acesso", async () => {
    const p = await newPersonalization();
    await send(caktoPayload({ orderId: "R4", ref: p.checkout_ref }));
    await send(caktoPayload({ event: "chargeback", orderId: "R4", status: "chargedback" }));
    const o = await order("R4");
    expect(o.payment_status).toBe("chargeback");
    expect(o.fulfillment_status).toBe("revoked");
  });

  it("eventos fora de ordem: aprovação depois do reembolso NÃO reativa o pedido", async () => {
    const p = await newPersonalization();
    await send(caktoPayload({ event: "refund", orderId: "R5", status: "refunded" }));
    const r = await send(caktoPayload({ orderId: "R5", ref: p.checkout_ref }));
    expect(r.body.outcome).toBe("approval_after_reversal_kept_reversed");
    expect((await order("R5")).payment_status).toBe("refunded");
    expect(await jobs()).toHaveLength(0);
  });

  it("recusa de uma tentativa antiga não desfaz aprovação", async () => {
    const p = await newPersonalization();
    await send(caktoPayload({ orderId: "R6", ref: p.checkout_ref }));
    await send(caktoPayload({ event: "purchase_refused", orderId: "R6", status: "refused" }));
    expect((await order("R6")).payment_status).toBe("approved");
  });

  it("eventos não tratados (ex.: pix_gerado) são registrados como ignorados", async () => {
    const r = await send(caktoPayload({ event: "pix_gerado", orderId: "R7", status: "waiting_payment" }));
    expect(r.body.outcome).toBe("ignored_event_type:pix_gerado");
    expect(await sql.query(`select 1 from public.orders`)).toHaveLength(0);
  });
});

describe("idempotência e novas tentativas", () => {
  it("webhook duplicado: processa uma vez só", async () => {
    const p = await newPersonalization();
    const payload = caktoPayload({ orderId: "W1", ref: p.checkout_ref });
    const first = await send(payload);
    const second = await send(payload);
    const third = await send(payload);
    expect(first.body.outcome).toBe("matched_and_queued");
    expect(second.body).toEqual({ received: true, duplicate: true });
    expect(third.body.duplicate).toBe(true);
    expect(await sql.query(`select 1 from public.orders`)).toHaveLength(1);
    expect(await sql.query(`select 1 from public.webhook_events`)).toHaveLength(1);
    expect(await jobs()).toHaveLength(1);
  });

  it("duplicados concorrentes não criam pedidos ou tarefas em dobro", async () => {
    const p = await newPersonalization();
    const payload = caktoPayload({ orderId: "W2", ref: p.checkout_ref });
    const results = await Promise.all([send(payload), send(payload), send(payload)]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await sql.query(`select 1 from public.orders`)).toHaveLength(1);
    expect(await jobs()).toHaveLength(1);
  });

  it("falha de processamento: devolve 500, registra erro e permite reprocessar", async () => {
    const p = await newPersonalization();
    // Simula falha: remove temporariamente a tabela de jobs usada no processamento.
    await sql.query(`alter table public.jobs rename to jobs_off`);
    const r = await send(caktoPayload({ orderId: "W3", ref: p.checkout_ref }));
    expect(r.status).toBe(500);
    const ev = (await sql.query<{ id: string; status: string; last_error: string }>(`select id, status, last_error from public.webhook_events`))[0];
    expect(ev.status).toBe("failed");
    expect(ev.last_error).toBeTruthy();
    expect(await sql.query(`select 1 from public.orders`)).toHaveLength(0); // transação desfeita
    await sql.query(`alter table public.jobs_off rename to jobs`);
    // A Cakto reenvia (ou o admin reprocessa): agora funciona.
    const retry = await processStoredEvent(sql, ev.id, deps.policy);
    expect(retry).toEqual({ ok: true, outcome: "matched_and_queued" });
    expect(await jobs()).toHaveLength(1);
  });
});

describe("captura de payload para o teste de integração", () => {
  it("guarda a estrutura com dados pessoais mascarados e preserva o checkout_ref", async () => {
    const p = await newPersonalization();
    await send(caktoPayload({ orderId: "K1", ref: p.checkout_ref, email: "pessoa@example.com" }), { captureEnabled: true });
    const cap = (await sql.query<{ redacted_payload: Record<string, unknown> }>(`select redacted_payload from public.webhook_captures`))[0];
    const text = JSON.stringify(cap.redacted_payload);
    expect(text).not.toContain("pessoa@example.com");
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain("12345678909");
    expect(text).toContain(p.checkout_ref);
  });
});

describe("normalização do payload", () => {
  it("converte valores e e-mail, sem inventar campos ausentes", () => {
    const ev = normalizeCaktoPayload({ event: "purchase_approved", data: { id: 123, amount: "29,90", customer: { email: " A@B.COM " } } });
    expect(ev).toMatchObject({ orderId: "123", amountCents: 2990, email: "a@b.com", productId: null, paidAt: null, checkoutRefs: [] });
    expect(toCents(29.9)).toBe(2990);
    expect(toCents("abc")).toBeNull();
  });

  it("não procura referência dentro do campo secret", () => {
    expect(extractCheckoutRefs({ secret: "lb_AAAAAAAAAAAAAAAAAAAAAAAA", data: {} })).toEqual([]);
  });

  it("redactPayload mascara chaves sensíveis", () => {
    expect(redactPayload({ customer: { email: "x@y.z", docNumber: "1" }, amount: 10 })).toEqual({
      customer: { email: "[redacted:5]", docNumber: "[redacted:1]" },
      amount: 10,
    });
  });
});
