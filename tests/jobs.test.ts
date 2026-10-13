import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { handleCaktoWebhook } from "@/lib/cakto/webhook";
import type { Sql } from "@/lib/db";
import { requestResend } from "@/lib/jobs/handlers";
import { backoffSeconds, claimJob, enqueueJob, retryJob } from "@/lib/jobs/queue";
import { runJobs } from "@/lib/jobs/runner";
import { caktoPayload, PRODUCT, SECRET } from "./helpers/cakto";
import { newTestDb } from "./helpers/db";
import { drain, makeDeps, paidOrder, sharedRenderer, tokenFromEmail } from "./helpers/pipeline";

let sql: Sql;
beforeEach(async () => {
  ({ sql } = await newTestDb());
});
afterAll(() => sharedRenderer.close());

const state = async (orderId: string) =>
  (
    await sql.query<{ fulfillment_status: string; book_status: string | null; attempt_count: number | null; last_error: string | null }>(
      `select o.fulfillment_status, b.status as book_status, b.attempt_count, b.last_error
         from public.orders o left join public.generated_books b on b.order_id = o.id where o.id = $1`,
      [orderId],
    )
  )[0];

describe("fila", () => {
  it("enfileiramento idempotente e claim exclusivo", async () => {
    const { orderId } = await paidOrder(sql, { orderId: "Q1" }); // já cria generate_book
    const again = await enqueueJob(sql, { kind: "generate_book", orderId, dedupeKey: `generate_book:${orderId}` });
    expect(again.created).toBe(false);
    const a = await claimJob(sql, "w1");
    const b = await claimJob(sql, "w2");
    expect(a?.attempts).toBe(1);
    expect(b).toBeNull(); // travada por w1
    // lock expirado (worker caiu): volta a ser elegível
    await sql.query(`update public.jobs set locked_until = now() - interval '1 second'`);
    const c = await claimJob(sql, "w2");
    expect(c?.id).toBe(a?.id);
    expect(c?.attempts).toBe(2);
  });

  it("backoff exponencial limitado", () => {
    expect([1, 2, 3, 10].map(backoffSeconds)).toEqual([30, 60, 120, 1800]);
  });
});

describe("processamento assíncrono completo", () => {
  it("pagamento aprovado -> PDF validado no storage privado -> e-mail com link seguro", async () => {
    const { deps, storage, mailer } = makeDeps(sql);
    const { orderId } = await paidOrder(sql, { orderId: "P1", child_name: "Ana Lívia", age_group: "2-4", email: "mae@example.com" });
    const totals = await drain(deps);
    expect(totals.succeeded).toBe(2); // generate_book + send_book_email
    const s = await state(orderId);
    expect(s.fulfillment_status).toBe("delivered");
    expect(s.book_status).toBe("ready");
    expect([...storage.files.keys()]).toEqual([`orders/${orderId}/livro-v1.pdf`]);
    expect(mailer.sent).toHaveLength(1);
    const email = mailer.sent[0];
    expect(email.to).toBe("mae@example.com");
    expect(email.subject).toContain("Ana Lívia");
    expect(email.text).toMatch(/https:\/\/livro\.test\/download\/[A-Za-z0-9_-]{43}/);
    expect(email.html).not.toContain("storage"); // nunca expõe o caminho do arquivo
    expect(email.idempotencyKey).toBe(`book-ready/${orderId}/v1`);
    const book = (await sql.query<{ sha256: string; page_count: number }>(`select sha256, page_count from public.generated_books`))[0];
    expect(book.page_count).toBe(41);
    expect(book.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("falha na geração do PDF: registra erro, tenta de novo e conclui", async () => {
    const { deps, mailer, renderer } = makeDeps(sql, { renderFailures: 2 });
    const { orderId } = await paidOrder(sql, { orderId: "P2" });
    // 1ª rodada: falha e reagenda
    const first = await runJobs(deps, { workerId: "t" });
    expect(first.failed).toBe(1);
    let s = await state(orderId);
    expect(s.book_status).toBe("failed");
    expect(s.last_error).toMatch(/chromium crashed/);
    const job = (await sql.query<{ status: string; attempts: number; run_after: Date }>(`select status, attempts, run_after from public.jobs`))[0];
    expect(job.status).toBe("queued");
    expect(new Date(job.run_after).getTime()).toBeGreaterThan(Date.now()); // backoff
    // demais rodadas: conclui
    await drain(deps);
    s = await state(orderId);
    expect(renderer.calls).toBe(3);
    expect(s.fulfillment_status).toBe("delivered");
    expect(s.attempt_count).toBe(3);
    expect(mailer.sent).toHaveLength(1);
  });

  it("falha persistente na geração: tarefa morre, pedido fica 'failed' e pode ser reprocessado", async () => {
    const { deps, renderer } = makeDeps(sql, { renderFailures: 99 });
    const { orderId } = await paidOrder(sql, { orderId: "P3" });
    const totals = await drain(deps, 10);
    expect(totals.dead).toBe(1);
    expect((await state(orderId)).fulfillment_status).toBe("failed");
    const job = (await sql.query<{ id: string; status: string; attempts: number }>(`select id, status, attempts from public.jobs`))[0];
    expect(job).toMatchObject({ status: "dead", attempts: 5 });
    // problema corrigido -> admin recoloca na fila
    renderer.failTimes = 0;
    expect(await retryJob(sql, job.id)).toBe(true);
    await sql.query(`update public.orders set fulfillment_status = 'queued' where id = $1`, [orderId]);
    await drain(deps);
    expect((await state(orderId)).fulfillment_status).toBe("delivered");
  });

  it("falha no envio de e-mail: registra, tenta de novo com a MESMA chave de idempotência e o MESMO link", async () => {
    const { deps, mailer } = makeDeps(sql);
    mailer.failNext = 2;
    const { orderId } = await paidOrder(sql, { orderId: "P4" });
    await drain(deps);
    expect(mailer.attempts).toHaveLength(3);
    expect(mailer.sent).toHaveLength(1);
    expect(new Set(mailer.attempts.map((m) => m.idempotencyKey)).size).toBe(1);
    expect(new Set(mailer.attempts.map((m) => tokenFromEmail(m.text))).size).toBe(1);
    const d = (await sql.query<{ status: string; attempt_count: number }>(`select status, attempt_count from public.email_deliveries`))[0];
    expect(d).toEqual({ status: "sent", attempt_count: 3 });
    expect((await state(orderId)).fulfillment_status).toBe("delivered");
    expect(await sql.query(`select 1 from public.download_tokens`)).toHaveLength(1);
  });

  it("não envia e-mail duplicado (tarefa repetida, webhook repetido)", async () => {
    const { deps, mailer } = makeDeps(sql);
    const { orderId, personalization } = await paidOrder(sql, { orderId: "P5" });
    await drain(deps);
    // Webhook reenviado pela Cakto + tarefa de e-mail recolocada manualmente
    await handleCaktoWebhook(
      { sql, secret: SECRET, policy: { productId: PRODUCT, autoRelease: true } },
      JSON.stringify(caktoPayload({ orderId: "P5", ref: personalization.checkout_ref })),
    );
    await sql.query(`update public.jobs set status = 'queued', run_after = now() where kind = 'send_book_email'`);
    await drain(deps);
    expect(mailer.sent).toHaveLength(1);
    expect((await state(orderId)).fulfillment_status).toBe("delivered");
  });

  it("reenvio administrativo cria nova versão com novo link", async () => {
    const { deps, mailer } = makeDeps(sql);
    const { orderId } = await paidOrder(sql, { orderId: "P6" });
    await drain(deps);
    expect(await requestResend(sql, orderId)).toBe(2);
    await drain(deps);
    expect(mailer.sent).toHaveLength(2);
    expect(tokenFromEmail(mailer.sent[0].text)).not.toBe(tokenFromEmail(mailer.sent[1].text));
  });

  it("reembolso antes da geração cancela a tarefa; nada é gerado nem enviado", async () => {
    const { deps, storage, mailer } = makeDeps(sql);
    const { orderId } = await paidOrder(sql, { orderId: "P7" });
    await handleCaktoWebhook(
      { sql, secret: SECRET, policy: { productId: PRODUCT, autoRelease: true } },
      JSON.stringify(caktoPayload({ event: "refund", orderId: "P7", status: "refunded" })),
    );
    await drain(deps);
    expect(storage.files.size).toBe(0);
    expect(mailer.sent).toHaveLength(0);
    expect((await state(orderId)).fulfillment_status).toBe("revoked");
  });

  it("livros de personalizações diferentes no mesmo e-mail saem com o nome certo", async () => {
    const { deps, mailer } = makeDeps(sql);
    await paidOrder(sql, { orderId: "P8", child_name: "Sofia", email: "familia@example.com" });
    await paidOrder(sql, { orderId: "P9", child_name: "Miguel", email: "familia@example.com", age_group: "8-10" });
    await drain(deps);
    expect(mailer.sent.map((m) => m.subject).sort()).toEqual(["O livro de Miguel está pronto!", "O livro de Sofia está pronto!"]);
    const books = await sql.query<{ child_name: string; page_count: number }>(
      `select p.child_name, b.page_count from public.generated_books b join public.personalizations p on p.id = b.personalization_id order by 1`,
    );
    expect(books).toEqual([
      { child_name: "Miguel", page_count: 44 },
      { child_name: "Sofia", page_count: 44 },
    ]);
  });
});
