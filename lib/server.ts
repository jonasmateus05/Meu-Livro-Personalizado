import { loadConfig, required, type AppConfig } from "./config";
import { createPgSql, type Sql } from "./db";
import { ResendMailer } from "./email";
import { R2BookStorage, type BookStorage } from "./storage";
import { safeEqual } from "./tokens";
import type { HandlerDeps } from "./jobs/handlers";

/** Montagem das dependências reais (somente servidor). */

export function log(event: string, data: Record<string, unknown> = {}) {
  // Logs estruturados, sem dados pessoais (nunca logar e-mail, nome, payload).
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...data }));
}

let cachedConfig: AppConfig | undefined;
export function config(): AppConfig {
  cachedConfig ??= loadConfig();
  return cachedConfig;
}

export async function db(): Promise<Sql> {
  const c = config();
  return createPgSql(required(c.databaseUrl, "DATABASE_URL"), { caCert: c.databaseCaCert });
}

export function storage(): BookStorage {
  const { r2 } = config();
  return new R2BookStorage({
    accountId: required(r2.accountId, "R2_ACCOUNT_ID"),
    accessKeyId: required(r2.accessKeyId, "R2_ACCESS_KEY_ID"),
    secretAccessKey: required(r2.secretAccessKey, "R2_SECRET_ACCESS_KEY"),
    bucket: r2.bucket,
  });
}

export async function handlerDeps(): Promise<HandlerDeps> {
  const c = config();
  const [{ PlaywrightPdfRenderer }, { fontFaceCssEmbedded }] = await Promise.all([
    import("./book/pdf"),
    import("./book/fonts-embedded"),
  ]);
  let fontCssCache: string | undefined;
  return {
    sql: await db(),
    storage: storage(),
    renderer: new PlaywrightPdfRenderer(c.chromiumExecutablePath),
    mailer: new ResendMailer(required(c.resend.apiKey, "RESEND_API_KEY"), required(c.resend.from, "RESEND_FROM_EMAIL"), c.resend.replyTo),
    fontCss: async () => (fontCssCache ??= await fontFaceCssEmbedded()),
    siteUrl: c.siteUrl,
    downloadTokenSecret: required(c.download.tokenSecret, "DOWNLOAD_TOKEN_SECRET"),
    downloadTtlDays: c.download.ttlDays,
    downloadMaxCount: c.download.maxCount,
    log,
  };
}

/** Autorização por Bearer token (rotas administrativas e cron). */
export function bearerOk(request: Request, expected: string | undefined): boolean {
  if (!expected || expected.length < 24) return false;
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer (.+)$/.exec(header);
  return !!m && safeEqual(m[1], expected);
}
