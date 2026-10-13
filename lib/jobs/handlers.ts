import type { Sql } from "../db";
import { bookReadyEmail, type Mailer } from "../email";
import { bookStoragePath, type BookStorage } from "../storage";
import { deriveDownloadToken, sha256Hex } from "../tokens";
import type { PdfRenderer } from "../book/pdf";
import { expectedPageCount, renderBookHtml, TEMPLATE_VERSION, type BookInput } from "../book/template";
import { validatePdf } from "../book/validate-pdf";
import { enqueueJob, type JobRow } from "./queue";

/**
 * Tarefas assíncronas:
 *   generate_book    -> gera PDF, valida, salva no bucket privado, enfileira e-mail
 *   send_book_email  -> cria link seguro e envia pelo Resend (sem duplicar)
 *
 * Cada tarefa reconfere o estado do pedido no banco (um reembolso pode chegar
 * a qualquer momento) e é idempotente: repetir não gera efeito duplicado.
 */

export type HandlerDeps = {
  sql: Sql;
  storage: BookStorage;
  renderer: PdfRenderer;
  mailer: Mailer;
  fontCss: () => Promise<string>;
  siteUrl: string;
  downloadTokenSecret: string;
  downloadTtlDays: number;
  downloadMaxCount: number;
  log?: (event: string, data?: Record<string, unknown>) => void;
};

export type HandlerResult = "done" | "cancelled";

export class PermanentJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}

type OrderForJob = {
  id: string;
  payment_status: string;
  fulfillment_status: string;
  customer_email: string | null;
  personalization_id: string | null;
  child_name: string | null;
  age_group: BookInput["ageGroup"] | null;
  illustration_style: BookInput["style"] | null;
};

async function loadOrder(sql: Sql, orderId: string, lock = false): Promise<OrderForJob | undefined> {
  const rows = await sql.query<OrderForJob>(
    `select o.id, o.payment_status, o.fulfillment_status, o.customer_email, o.personalization_id,
            p.child_name, p.age_group, p.illustration_style
       from public.orders o
       left join public.personalizations p on p.id = o.personalization_id
      where o.id = $1 ${lock ? "for update of o" : ""}`,
    [orderId],
  );
  return rows[0];
}

function stillDeliverable(o: OrderForJob | undefined): o is OrderForJob {
  return !!o && o.payment_status === "approved" && o.fulfillment_status !== "revoked" && !!o.personalization_id;
}

export const emailDedupeKey = (orderId: string, version: number) => `send_book_email:${orderId}:v${version}`;

export async function generateBook(deps: HandlerDeps, job: JobRow): Promise<HandlerResult> {
  const { sql } = deps;
  // 1) Reserva: confere estado e marca "gerando".
  const prep = await sql.transaction(async (tx) => {
    const order = await loadOrder(tx, job.order_id, true);
    if (!stillDeliverable(order)) return { skip: true as const };
    const book = await tx.query<{ id: string; status: string }>(
      `insert into public.generated_books (order_id, personalization_id, template_version, status)
       values ($1, $2, $3, 'pending')
       on conflict (order_id) do update set updated_at = now()
       returning id, status`,
      [order.id, order.personalization_id, TEMPLATE_VERSION],
    );
    if (book[0].status === "ready") return { skip: false as const, alreadyReady: true as const, order };
    await tx.query(
      `update public.generated_books set status = 'generating', attempt_count = attempt_count + 1, updated_at = now() where id = $1`,
      [book[0].id],
    );
    await tx.query(`update public.orders set fulfillment_status = 'generating', updated_at = now() where id = $1`, [order.id]);
    return { skip: false as const, alreadyReady: false as const, order, bookId: book[0].id };
  });
  if (prep.skip) return "cancelled";
  if (prep.alreadyReady) {
    await enqueueJob(sql, { kind: "send_book_email", orderId: job.order_id, dedupeKey: emailDedupeKey(job.order_id, 1), payload: { version: 1 } });
    return "done";
  }

  const order = prep.order;
  const input: BookInput = { childName: order.child_name!, ageGroup: order.age_group!, style: order.illustration_style! };
  try {
    // 2) Gera e valida (fora de transação: pode levar segundos).
    const html = renderBookHtml(input, { fontCss: await deps.fontCss(), variant: "full" });
    const expectedPages = expectedPageCount(input);
    const { pdf } = await deps.renderer.render(html, { expectedName: input.childName, expectedPages });
    const check = await validatePdf(pdf, { pages: expectedPages, childName: input.childName });
    const path = bookStoragePath(order.id, TEMPLATE_VERSION);
    await deps.storage.upload(path, pdf);

    // 3) Conclui — reconferindo que o pedido continua válido.
    const finished = await sql.transaction(async (tx) => {
      const current = await loadOrder(tx, order.id, true);
      if (!stillDeliverable(current)) {
        await tx.query(`update public.generated_books set status = 'revoked', updated_at = now() where id = $1`, [prep.bookId]);
        return false;
      }
      await tx.query(
        `update public.generated_books
            set status = 'ready', storage_path = $2, page_count = $3, byte_size = $4, sha256 = $5,
                last_error = null, generated_at = now(), updated_at = now()
          where id = $1`,
        [prep.bookId, path, check.pageCount, check.byteSize, sha256Hex(pdf)],
      );
      await tx.query(`update public.orders set fulfillment_status = 'generated', updated_at = now() where id = $1`, [order.id]);
      await enqueueJob(tx, { kind: "send_book_email", orderId: order.id, dedupeKey: emailDedupeKey(order.id, 1), payload: { version: 1 } });
      return true;
    });
    deps.log?.("book_generated", { orderId: order.id, pages: check.pageCount, bytes: check.byteSize });
    return finished ? "done" : "cancelled";
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    await sql.query(
      `update public.generated_books set status = 'failed', last_error = $2, updated_at = now() where id = $1`,
      [prep.bookId, message.slice(0, 2000)],
    );
    throw error;
  }
}

export async function sendBookEmail(deps: HandlerDeps, job: JobRow): Promise<HandlerResult> {
  const { sql } = deps;
  const version = Number(job.payload.version ?? 1);
  if (!Number.isInteger(version) || version < 1) throw new PermanentJobError("versão de e-mail inválida");
  const idempotencyKey = `book-ready/${job.order_id}/v${version}`;

  const prep = await sql.transaction(async (tx) => {
    const order = await loadOrder(tx, job.order_id, true);
    if (!stillDeliverable(order)) return { skip: true as const };
    if (!order.customer_email) throw new PermanentJobError("pedido sem e-mail do comprador");
    const books = await tx.query<{ id: string; status: string }>(
      `select id, status from public.generated_books where order_id = $1`,
      [order.id],
    );
    if (books[0]?.status !== "ready") throw new Error("livro ainda não está pronto");

    await tx.query(
      `insert into public.email_deliveries (order_id, kind, version, idempotency_key)
       values ($1, 'book_ready', $2, $3) on conflict (order_id, kind, version) do nothing`,
      [order.id, version, idempotencyKey],
    );
    const delivery = await tx.query<{ id: string; status: string }>(
      `select id, status from public.email_deliveries where order_id = $1 and kind = 'book_ready' and version = $2 for update`,
      [order.id, version],
    );
    if (delivery[0].status === "sent") return { skip: false as const, alreadySent: true as const };

    const token = deriveDownloadToken(deps.downloadTokenSecret, books[0].id, version);
    await tx.query(
      `insert into public.download_tokens (book_id, version, token_hash, expires_at, max_downloads)
       values ($1, $2, $3, now() + make_interval(days => $4), $5)
       on conflict (book_id, version) do nothing`,
      [books[0].id, version, sha256Hex(token), deps.downloadTtlDays, deps.downloadMaxCount],
    );
    const tok = await tx.query<{ expires_at: Date; max_downloads: number }>(
      `select expires_at, max_downloads from public.download_tokens where book_id = $1 and version = $2`,
      [books[0].id, version],
    );
    await tx.query(
      `update public.email_deliveries set status = 'sending', attempt_count = attempt_count + 1, updated_at = now() where id = $1`,
      [delivery[0].id],
    );
    await tx.query(`update public.orders set fulfillment_status = 'emailing', updated_at = now() where id = $1`, [order.id]);
    return {
      skip: false as const,
      alreadySent: false as const,
      deliveryId: delivery[0].id,
      to: order.customer_email,
      childName: order.child_name!,
      token,
      expiresAt: new Date(tok[0].expires_at),
      maxDownloads: tok[0].max_downloads,
    };
  });
  if (prep.skip) return "cancelled";
  if (prep.alreadySent) return "done";

  const email = bookReadyEmail({
    childName: prep.childName,
    downloadUrl: `${deps.siteUrl}/download/${prep.token}`,
    expiresAt: prep.expiresAt,
    maxDownloads: prep.maxDownloads,
  });
  try {
    const sent = await deps.mailer.send({ to: prep.to, ...email, idempotencyKey });
    await sql.transaction(async (tx) => {
      await tx.query(
        `update public.email_deliveries
            set status = 'sent', provider_message_id = $2, sent_at = now(), last_error = null, updated_at = now()
          where id = $1`,
        [prep.deliveryId, sent.id],
      );
      await tx.query(
        `update public.orders set fulfillment_status = 'delivered', updated_at = now()
          where id = $1 and fulfillment_status <> 'revoked'`,
        [job.order_id],
      );
    });
    deps.log?.("book_email_sent", { orderId: job.order_id, version });
    return "done";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await sql.query(
      `update public.email_deliveries set status = 'failed', last_error = $2, updated_at = now() where id = $1`,
      [prep.deliveryId, message.slice(0, 2000)],
    );
    throw error;
  }
}

export const HANDLERS: Record<JobRow["kind"], (deps: HandlerDeps, job: JobRow) => Promise<HandlerResult>> = {
  generate_book: generateBook,
  send_book_email: sendBookEmail,
};

/** Reenvio administrativo: nova versão => novo link e novo e-mail. */
export async function requestResend(sql: Sql, orderId: string): Promise<number> {
  return sql.transaction(async (tx) => {
    const rows = await tx.query<{ payment_status: string; fulfillment_status: string }>(
      `select payment_status, fulfillment_status from public.orders where id = $1 for update`,
      [orderId],
    );
    if (!rows[0]) throw new PermanentJobError("pedido não encontrado");
    if (rows[0].payment_status !== "approved" || rows[0].fulfillment_status === "revoked") {
      throw new PermanentJobError("pedido não está apto para reenvio");
    }
    const ready = await tx.query(`select 1 from public.generated_books where order_id = $1 and status = 'ready'`, [orderId]);
    if (!ready.length) throw new PermanentJobError("livro ainda não foi gerado");
    const v = await tx.query<{ v: number }>(
      `select coalesce(max(version), 0) + 1 as v from public.email_deliveries where order_id = $1 and kind = 'book_ready'`,
      [orderId],
    );
    const version = Number(v[0].v);
    await enqueueJob(tx, { kind: "send_book_email", orderId, dedupeKey: emailDedupeKey(orderId, version), payload: { version } });
    return version;
  });
}
