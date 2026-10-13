import type { Sql } from "../db";
import { applyPaymentEvent, type ProcessingPolicy } from "../orders";
import { safeEqual, sha256Hex } from "../tokens";
import { normalizeCaktoPayload, PayloadError, redactPayload, type NormalizedCaktoEvent } from "./payload";

/**
 * Recebimento do webhook da Cakto.
 *
 * Autenticidade: segundo o exemplo público da Cakto, o JSON enviado contém o
 * campo `secret` com a chave configurada no painel do webhook. Comparamos em
 * tempo constante com CAKTO_WEBHOOK_SECRET. Não há (na documentação consultada)
 * assinatura HMAC por cabeçalho; se a Cakto passar a enviar uma, adicione aqui.
 *
 * Nada pesado acontece aqui: o PDF é gerado por um worker a partir da fila.
 */

export const MAX_WEBHOOK_BYTES = 256 * 1024;

export type WebhookDeps = {
  sql: Sql;
  secret: string | undefined;
  policy: ProcessingPolicy;
  correlationPath?: string;
  captureEnabled?: boolean;
  log?: (event: string, data?: Record<string, unknown>) => void;
};

export type WebhookResult = { status: number; body: Record<string, unknown> };

export function eventKeyFor(ev: Pick<NormalizedCaktoEvent, "event" | "orderId" | "status">): string {
  return sha256Hex(`cakto:${ev.event}:${ev.orderId}:${ev.status ?? ""}`);
}

export async function handleCaktoWebhook(deps: WebhookDeps, rawBody: string, headerNames: string[] = []): Promise<WebhookResult> {
  const log = deps.log ?? (() => undefined);
  if (!deps.secret) {
    log("cakto_webhook_secret_missing");
    return { status: 503, body: { error: "webhook_not_configured" } };
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return { status: 413, body: { error: "payload_too_large" } };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "invalid_json" } };
  }

  const provided = (payload as { secret?: unknown } | null)?.secret;
  if (typeof provided !== "string" || !safeEqual(provided, deps.secret)) {
    log("cakto_webhook_unauthorized");
    return { status: 401, body: { error: "unauthorized" } };
  }

  if (deps.captureEnabled) {
    // Diagnóstico de integração: estrutura do payload com dados pessoais mascarados.
    await deps.sql
      .query(
        `insert into public.webhook_captures (event_type, redacted_payload, header_names) values ($1, $2::jsonb, $3)`,
        [
          typeof (payload as { event?: unknown }).event === "string" ? (payload as { event: string }).event : null,
          JSON.stringify(redactPayload(payload)),
          headerNames.slice(0, 100),
        ],
      )
      .catch((e: unknown) => log("cakto_capture_failed", { error: String(e) }));
  }

  let ev: NormalizedCaktoEvent;
  try {
    ev = normalizeCaktoPayload(payload, deps.correlationPath);
  } catch (e) {
    if (e instanceof PayloadError) return { status: 400, body: { error: "invalid_payload", detail: e.message } };
    throw e;
  }

  const key = eventKeyFor(ev);
  const inserted = await deps.sql.query<{ id: string }>(
    `insert into public.webhook_events (event_key, event_type, provider_order_id, normalized)
     values ($1, $2, $3, $4::jsonb)
     on conflict (event_key) do nothing
     returning id`,
    [key, ev.event, ev.orderId, JSON.stringify(ev)],
  );
  let eventId = inserted[0]?.id;
  if (!eventId) {
    const existing = await deps.sql.query<{ id: string; status: string }>(
      `select id, status from public.webhook_events where event_key = $1`,
      [key],
    );
    if (existing[0] && (existing[0].status === "processed" || existing[0].status === "ignored")) {
      log("cakto_webhook_duplicate", { eventType: ev.event });
      return { status: 200, body: { received: true, duplicate: true } };
    }
    eventId = existing[0].id;
  }

  const result = await processStoredEvent(deps.sql, eventId, deps.policy, log);
  if (result.ok) return { status: 200, body: { received: true, outcome: result.outcome } };
  // 500 => a Cakto tentará novamente; o evento fica como "failed" para reprocessamento.
  return { status: 500, body: { error: "processing_failed" } };
}

/**
 * Processa (ou reprocessa) um evento guardado. Usado pelo webhook e pela rota
 * administrativa de reprocessamento. A linha do evento é travada para impedir
 * processamento concorrente do mesmo evento.
 */
export async function processStoredEvent(
  sql: Sql,
  eventId: string,
  policy: ProcessingPolicy,
  log: (event: string, data?: Record<string, unknown>) => void = () => undefined,
): Promise<{ ok: true; outcome: string } | { ok: false; error: string }> {
  try {
    const outcome = await sql.transaction(async (tx) => {
      const rows = await tx.query<{ status: string; normalized: NormalizedCaktoEvent; outcome: string | null }>(
        `select status, normalized, outcome from public.webhook_events where id = $1 for update`,
        [eventId],
      );
      const row = rows[0];
      if (!row) throw new Error("evento não encontrado");
      if (row.status === "processed" || row.status === "ignored") return row.outcome ?? "already_processed";

      const res = await applyPaymentEvent(tx, row.normalized, policy);
      await tx.query(
        `update public.webhook_events
            set status = $2, outcome = $3, processed_at = now(), attempt_count = attempt_count + 1,
                last_error = null, updated_at = now()
          where id = $1`,
        [eventId, res.status, res.outcome],
      );
      return res.outcome;
    });
    log("cakto_webhook_processed", { outcome });
    return { ok: true, outcome };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("cakto_webhook_processing_failed", { error: message });
    await sql
      .query(
        `update public.webhook_events
            set status = 'failed', last_error = $2, attempt_count = attempt_count + 1, updated_at = now()
          where id = $1`,
        [eventId, message.slice(0, 2000)],
      )
      .catch(() => undefined);
    return { ok: false, error: message };
  }
}
