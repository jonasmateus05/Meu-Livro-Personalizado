import { z } from "zod";

/**
 * Configuração do servidor, lida das variáveis de ambiente.
 * Nada aqui pode ir para o navegador: este módulo só é importado por código de
 * servidor (rotas de API, worker, scripts).
 */

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: optionalString,
  DATABASE_CA_CERT: optionalString,
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_BOOKS_BUCKET: z.string().default("books"),

  CAKTO_WEBHOOK_SECRET: optionalString,
  CAKTO_PRODUCT_ID: optionalString,
  CAKTO_CHECKOUT_URL: optionalString,
  /** Parâmetros de URL que levam o checkout_ref ao checkout (separados por vírgula). */
  CAKTO_CHECKOUT_REF_PARAMS: z.string().default("utm_content,sck,src"),
  /**
   * Caminho exato (ex.: "data.utm_content") onde o checkout_ref volta no webhook.
   * Preencha DEPOIS de confirmar com uma compra de teste real. Vazio = varre o
   * payload inteiro procurando o formato do token (lb_ + 24 caracteres).
   */
  CAKTO_CORRELATION_PATH: optionalString,
  CAKTO_EXPECTED_AMOUNT_CENTS: z.coerce.number().int().positive().optional(),
  CAKTO_WEBHOOK_CAPTURE: bool,

  /** Liberação automática da geração após a associação (deixe false até validar a Cakto). */
  FULFILLMENT_AUTO_RELEASE: bool,

  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalString,
  RESEND_REPLY_TO: optionalString,

  DOWNLOAD_TOKEN_SECRET: optionalString,
  DOWNLOAD_LINK_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  DOWNLOAD_MAX_COUNT: z.coerce.number().int().min(1).max(1000).default(20),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(10).max(3600).default(120),

  ADMIN_API_TOKEN: optionalString,
  CRON_SECRET: optionalString,
  CHROMIUM_EXECUTABLE_PATH: optionalString,
});

export type AppConfig = {
  siteUrl: string;
  isProduction: boolean;
  databaseUrl?: string;
  databaseCaCert?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  booksBucket: string;
  cakto: {
    webhookSecret?: string;
    productId?: string;
    checkoutUrl?: string;
    checkoutRefParams: string[];
    correlationPath?: string;
    expectedAmountCents?: number;
    captureEnabled: boolean;
  };
  autoRelease: boolean;
  resend: { apiKey?: string; from?: string; replyTo?: string };
  download: { tokenSecret?: string; ttlDays: number; maxCount: number; signedUrlTtlSeconds: number };
  adminApiToken?: string;
  cronSecret?: string;
  chromiumExecutablePath?: string;
};

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const e = envSchema.parse(env);
  return {
    siteUrl: e.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ""),
    isProduction: e.NODE_ENV === "production",
    databaseUrl: e.DATABASE_URL,
    databaseCaCert: e.DATABASE_CA_CERT?.replace(/\\n/g, "\n"),
    supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
    booksBucket: e.SUPABASE_BOOKS_BUCKET,
    cakto: {
      webhookSecret: e.CAKTO_WEBHOOK_SECRET,
      productId: e.CAKTO_PRODUCT_ID,
      checkoutUrl: e.CAKTO_CHECKOUT_URL,
      checkoutRefParams: e.CAKTO_CHECKOUT_REF_PARAMS.split(",")
        .map((p) => p.trim())
        .filter((p) => /^[A-Za-z0-9_.-]{1,40}$/.test(p)),
      correlationPath: e.CAKTO_CORRELATION_PATH,
      expectedAmountCents: e.CAKTO_EXPECTED_AMOUNT_CENTS,
      captureEnabled: e.CAKTO_WEBHOOK_CAPTURE,
    },
    autoRelease: e.FULFILLMENT_AUTO_RELEASE,
    resend: { apiKey: e.RESEND_API_KEY, from: e.RESEND_FROM_EMAIL, replyTo: e.RESEND_REPLY_TO },
    download: {
      tokenSecret: e.DOWNLOAD_TOKEN_SECRET,
      ttlDays: e.DOWNLOAD_LINK_TTL_DAYS,
      maxCount: e.DOWNLOAD_MAX_COUNT,
      signedUrlTtlSeconds: e.SIGNED_URL_TTL_SECONDS,
    },
    adminApiToken: e.ADMIN_API_TOKEN,
    cronSecret: e.CRON_SECRET,
    chromiumExecutablePath: e.CHROMIUM_EXECUTABLE_PATH,
  };
}

export class ConfigError extends Error {
  constructor(public readonly missing: string) {
    super(`Variável de ambiente obrigatória ausente: ${missing}`);
    this.name = "ConfigError";
  }
}

export function required<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null || value === "") throw new ConfigError(name);
  return value;
}
