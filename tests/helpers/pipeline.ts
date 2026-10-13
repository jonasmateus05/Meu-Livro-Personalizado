import { fontFaceCssEmbedded } from "@/lib/book/fonts-embedded";
import { PlaywrightPdfRenderer } from "@/lib/book/pdf";
import { handleCaktoWebhook } from "@/lib/cakto/webhook";
import type { Sql } from "@/lib/db";
import type { HandlerDeps } from "@/lib/jobs/handlers";
import { runJobs } from "@/lib/jobs/runner";
import { createPersonalization } from "@/lib/personalizations";
import type { PersonalizationInput } from "@/lib/validation";
import { caktoPayload, PRODUCT, SECRET } from "./cakto";
import { FakeMailer, FlakyRenderer, MemoryStorage } from "./fakes";

import { CHROMIUM } from "./chromium";
export const sharedRenderer = new PlaywrightPdfRenderer(CHROMIUM);
let fontCss: string | undefined;

export function makeDeps(sql: Sql, opts: { renderFailures?: number } = {}) {
  const storage = new MemoryStorage();
  const mailer = new FakeMailer();
  const renderer = new FlakyRenderer(sharedRenderer, opts.renderFailures ?? 0);
  const deps: HandlerDeps = {
    sql,
    storage,
    mailer,
    renderer,
    fontCss: async () => (fontCss ??= await fontFaceCssEmbedded()),
    siteUrl: "https://livro.test",
    downloadTokenSecret: "download-secret-for-tests-0123456789",
    downloadTtlDays: 14,
    downloadMaxCount: 3,
  };
  return { deps, storage, mailer, renderer };
}

export async function paidOrder(sql: Sql, input: Partial<PersonalizationInput> & { orderId: string; email?: string }) {
  const p = await createPersonalization(sql, {
    child_name: input.child_name ?? "Miguel",
    age_group: input.age_group ?? "5-7",
    illustration_style: input.illustration_style ?? "colorful",
  });
  const r = await handleCaktoWebhook(
    { sql, secret: SECRET, policy: { productId: PRODUCT, autoRelease: true } },
    JSON.stringify(caktoPayload({ orderId: input.orderId, ref: p.checkout_ref, email: input.email })),
  );
  if (r.body.outcome !== "matched_and_queued") throw new Error(`webhook inesperado: ${JSON.stringify(r.body)}`);
  const o = await sql.query<{ id: string }>(`select id from public.orders where provider_order_id = $1`, [input.orderId]);
  return { personalization: p, orderId: o[0].id };
}

/** Roda a fila até esvaziar (ignorando o backoff, para o teste não esperar). */
export async function drain(deps: HandlerDeps, rounds = 10) {
  const totals = { processed: 0, succeeded: 0, failed: 0, dead: 0, cancelled: 0 };
  for (let i = 0; i < rounds; i++) {
    await deps.sql.query(`update public.jobs set run_after = now() where status = 'queued'`);
    const s = await runJobs(deps, { workerId: "test", maxJobs: 20 });
    for (const k of Object.keys(totals) as (keyof typeof totals)[]) totals[k] += s[k];
    if (s.processed === 0) break;
  }
  return totals;
}

export function tokenFromEmail(text: string): string {
  const m = /\/download\/([A-Za-z0-9_-]{43})/.exec(text);
  if (!m) throw new Error("link não encontrado no e-mail");
  return m[1];
}
