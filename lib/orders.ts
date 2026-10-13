import type { Sql } from "./db";
import type { NormalizedCaktoEvent } from "./cakto/payload";
import { cancelPendingJobsForOrder, enqueueJob } from "./jobs/queue";
import { CHECKOUT_REF_EXACT } from "./tokens";

/**
 * Regras de negócio de pedidos. Todas as funções recebem um `Sql` que já está
 * dentro de uma transação (o chamador controla commit/rollback).
 */

export type PaymentStatus = "pending" | "approved" | "refused" | "refunded" | "chargeback";

export type OrderRow = {
  id: string;
  provider_order_id: string;
  personalization_id: string | null;
  payment_status: PaymentStatus;
  fulfillment_status: string;
  customer_email: string | null;
  review_reason: string | null;
  match_method: string | null;
};

export type ProcessingPolicy = {
  productId?: string;
  expectedAmountCents?: number;
  autoRelease: boolean;
};

export type EventOutcome = { status: "processed" | "ignored"; outcome: string; orderId?: string };

const EVENT_TO_STATUS: Record<string, Exclude<PaymentStatus, "pending">> = {
  purchase_approved: "approved",
  purchase_refused: "refused",
  refund: "refunded",
  chargeback: "chargeback",
};

export const generateDedupeKey = (orderId: string) => `generate_book:${orderId}`;

async function lockOrCreateOrder(tx: Sql, ev: NormalizedCaktoEvent, initialStatus: PaymentStatus): Promise<OrderRow> {
  await tx.query(
    `insert into public.orders
       (provider_order_id, provider_ref_id, provider_product_id, provider_offer_id,
        customer_email, amount_cents, payment_method, payment_status)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (provider, provider_order_id) do nothing`,
    [ev.orderId, ev.refId, ev.productId, ev.offerId, ev.email, ev.amountCents, ev.paymentMethod, initialStatus === "approved" ? "pending" : initialStatus],
  );
  const rows = await tx.query<OrderRow>(
    `select id, provider_order_id, personalization_id, payment_status, fulfillment_status,
            customer_email, review_reason, match_method
       from public.orders where provider = 'cakto' and provider_order_id = $1 for update`,
    [ev.orderId],
  );
  return rows[0];
}

/** Processa um evento já autenticado e normalizado. */
export async function applyPaymentEvent(tx: Sql, ev: NormalizedCaktoEvent, policy: ProcessingPolicy): Promise<EventOutcome> {
  const target = EVENT_TO_STATUS[ev.event];
  if (!target) return { status: "ignored", outcome: `ignored_event_type:${ev.event}` };

  if (policy.productId && ev.productId !== policy.productId) {
    return { status: "ignored", outcome: "ignored_wrong_product" };
  }
  if (target === "approved" && ev.status && !["paid", "approved"].includes(ev.status.toLowerCase())) {
    return { status: "ignored", outcome: `ignored_unexpected_status:${ev.status}` };
  }

  const order = await lockOrCreateOrder(tx, ev, target);

  if (target === "approved") return approve(tx, order, ev, policy);
  if (target === "refused") return refuse(tx, order);
  return reverse(tx, order, target as "refunded" | "chargeback");
}

async function approve(tx: Sql, order: OrderRow, ev: NormalizedCaktoEvent, policy: ProcessingPolicy): Promise<EventOutcome> {
  if (order.payment_status === "refunded" || order.payment_status === "chargeback") {
    // Evento fora de ordem: estorno já registrado. Não reverte para aprovado.
    return { status: "processed", outcome: "approval_after_reversal_kept_reversed", orderId: order.id };
  }
  if (order.payment_status === "approved") {
    return { status: "processed", outcome: "already_approved", orderId: order.id };
  }

  await tx.query(
    `update public.orders
        set payment_status = 'approved',
            paid_at = coalesce($2::timestamptz, now()),
            customer_email = coalesce($3, customer_email),
            amount_cents = coalesce($4, amount_cents),
            payment_method = coalesce($5, payment_method),
            provider_ref_id = coalesce($6, provider_ref_id),
            provider_product_id = coalesce($7, provider_product_id),
            provider_offer_id = coalesce($8, provider_offer_id),
            updated_at = now()
      where id = $1`,
    [order.id, ev.paidAt, ev.email, ev.amountCents, ev.paymentMethod, ev.refId, ev.productId, ev.offerId],
  );

  const match = await matchPersonalization(tx, order.id, ev, policy);
  return { status: "processed", outcome: match, orderId: order.id };
}

async function setReview(tx: Sql, orderId: string, status: "unmatched" | "needs_review", reason: string) {
  await tx.query(
    `update public.orders set fulfillment_status = $2, review_reason = $3, updated_at = now() where id = $1`,
    [orderId, status, reason],
  );
  return `${status}:${reason}`;
}

/**
 * Associação inequívoca pedido -> personalização.
 * Só associa quando o payload traz EXATAMENTE UM checkout_ref válido, que
 * existe no banco e ainda não tem outro pedido aprovado. Nunca usa e-mail,
 * nome do comprador ou horário para "adivinhar".
 */
async function matchPersonalization(tx: Sql, orderId: string, ev: NormalizedCaktoEvent, policy: ProcessingPolicy): Promise<string> {
  const refs = ev.checkoutRefs.filter((r) => CHECKOUT_REF_EXACT.test(r));
  if (refs.length === 0) return setReview(tx, orderId, "unmatched", "no_checkout_ref_in_payload");
  if (refs.length > 1) return setReview(tx, orderId, "needs_review", "multiple_checkout_refs");

  const found = await tx.query<{ id: string; status: string }>(
    `select id, status from public.personalizations where checkout_ref = $1 for update`,
    [refs[0]],
  );
  if (!found[0]) return setReview(tx, orderId, "needs_review", "unknown_checkout_ref");
  if (found[0].status === "cancelled") return setReview(tx, orderId, "needs_review", "personalization_cancelled");

  const other = await tx.query(
    `select 1 from public.orders where personalization_id = $1 and payment_status = 'approved' and id <> $2`,
    [found[0].id, orderId],
  );
  if (other.length > 0) return setReview(tx, orderId, "needs_review", "personalization_already_paid_by_other_order");

  if (policy.expectedAmountCents !== undefined && (ev.amountCents ?? -1) < policy.expectedAmountCents) {
    return setReview(tx, orderId, "needs_review", "amount_below_expected");
  }

  await linkAndRelease(tx, orderId, found[0].id, "checkout_ref", policy.autoRelease);
  return policy.autoRelease ? "matched_and_queued" : "matched_awaiting_release";
}

async function linkAndRelease(tx: Sql, orderId: string, personalizationId: string, method: "checkout_ref" | "manual", release: boolean) {
  await tx.query(
    `update public.orders
        set personalization_id = $2, match_method = $3, review_reason = null,
            fulfillment_status = $4, updated_at = now()
      where id = $1`,
    [orderId, personalizationId, method, release ? "queued" : "awaiting_release"],
  );
  await tx.query(`update public.personalizations set status = 'paid', updated_at = now() where id = $1`, [personalizationId]);
  if (release) await enqueueJob(tx, { kind: "generate_book", orderId, dedupeKey: generateDedupeKey(orderId) });
}

async function refuse(tx: Sql, order: OrderRow): Promise<EventOutcome> {
  if (order.payment_status === "pending" || order.payment_status === "refused") {
    await tx.query(`update public.orders set payment_status = 'refused', updated_at = now() where id = $1`, [order.id]);
    return { status: "processed", outcome: "refused", orderId: order.id };
  }
  // Recusa depois de aprovação/estorno não altera o pedido (tentativa antiga).
  return { status: "processed", outcome: `refusal_ignored_status_${order.payment_status}`, orderId: order.id };
}

async function reverse(tx: Sql, order: OrderRow, target: "refunded" | "chargeback"): Promise<EventOutcome> {
  if (order.payment_status === "chargeback" && target === "refunded") {
    return { status: "processed", outcome: "refund_after_chargeback_kept", orderId: order.id };
  }
  await tx.query(
    `update public.orders
        set payment_status = $2,
            reversed_at = coalesce(reversed_at, now()),
            fulfillment_status = 'revoked',
            updated_at = now()
      where id = $1`,
    [order.id, target],
  );
  await revokeAccess(tx, order.id, target);
  return { status: "processed", outcome: target, orderId: order.id };
}

/** Bloqueia downloads e cancela tarefas pendentes do pedido. */
export async function revokeAccess(tx: Sql, orderId: string, reason: string) {
  await cancelPendingJobsForOrder(tx, orderId, `revoked:${reason}`);
  await tx.query(
    `update public.generated_books set status = 'revoked', updated_at = now() where order_id = $1`,
    [orderId],
  );
  await tx.query(
    `update public.download_tokens t set revoked_at = coalesce(t.revoked_at, now())
       from public.generated_books b
      where b.id = t.book_id and b.order_id = $1`,
    [orderId],
  );
}

// ---------------------------------------------------------------------------
// Ações administrativas (reconciliação manual e liberação)
// ---------------------------------------------------------------------------

export class AdminActionError extends Error {
  constructor(message: string, public readonly httpStatus = 409) {
    super(message);
    this.name = "AdminActionError";
  }
}

/** Associa manualmente um pedido pago (sem referência) a uma personalização. */
export async function manualLink(tx: Sql, orderId: string, checkoutRef: string): Promise<void> {
  if (!CHECKOUT_REF_EXACT.test(checkoutRef)) throw new AdminActionError("checkout_ref inválido", 400);
  const orders = await tx.query<OrderRow>(
    `select id, payment_status, fulfillment_status, personalization_id from public.orders where id = $1 for update`,
    [orderId],
  );
  const order = orders[0];
  if (!order) throw new AdminActionError("Pedido não encontrado", 404);
  if (order.payment_status !== "approved") throw new AdminActionError("Pedido não está aprovado");
  if (order.personalization_id) throw new AdminActionError("Pedido já associado");
  if (!["unmatched", "needs_review"].includes(order.fulfillment_status)) {
    throw new AdminActionError(`Status de entrega não permite associação: ${order.fulfillment_status}`);
  }
  const p = await tx.query<{ id: string; status: string }>(
    `select id, status from public.personalizations where checkout_ref = $1 for update`,
    [checkoutRef],
  );
  if (!p[0]) throw new AdminActionError("Personalização não encontrada", 404);
  if (p[0].status === "cancelled") throw new AdminActionError("Personalização cancelada");
  const other = await tx.query(
    `select 1 from public.orders where personalization_id = $1 and payment_status = 'approved'`,
    [p[0].id],
  );
  if (other.length) throw new AdminActionError("Personalização já tem um pedido aprovado");
  // Ação humana explícita: libera a geração imediatamente.
  await linkAndRelease(tx, orderId, p[0].id, "manual", true);
}

/** Libera a geração de um pedido associado que aguarda liberação. */
export async function releaseOrder(tx: Sql, orderId: string): Promise<void> {
  const rows = await tx.query<OrderRow>(
    `select id, payment_status, fulfillment_status, personalization_id from public.orders where id = $1 for update`,
    [orderId],
  );
  const order = rows[0];
  if (!order) throw new AdminActionError("Pedido não encontrado", 404);
  if (order.payment_status !== "approved") throw new AdminActionError("Pedido não está aprovado");
  if (!order.personalization_id) throw new AdminActionError("Pedido sem personalização associada");
  if (order.fulfillment_status !== "awaiting_release") {
    throw new AdminActionError(`Pedido não aguarda liberação (${order.fulfillment_status})`);
  }
  await tx.query(`update public.orders set fulfillment_status = 'queued', updated_at = now() where id = $1`, [orderId]);
  await enqueueJob(tx, { kind: "generate_book", orderId, dedupeKey: generateDedupeKey(orderId) });
}
