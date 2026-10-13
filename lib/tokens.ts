import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Referência opaca enviada ao checkout: "lb_" + 24 caracteres (~142 bits). */
export const CHECKOUT_REF_PATTERN = /lb_[A-Za-z0-9]{24}(?![A-Za-z0-9])/g;
export const CHECKOUT_REF_EXACT = /^lb_[A-Za-z0-9]{24}$/;

export function newCheckoutRef(): string {
  // Amostragem por rejeição para não enviesar a distribuição.
  let out = "";
  while (out.length < 24) {
    for (const byte of randomBytes(32)) {
      if (byte < 248 && out.length < 24) out += ALPHANUM[byte % 62];
    }
  }
  return `lb_${out}`;
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Comparação em tempo constante (evita ataques de temporização no segredo). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

/**
 * Token de download determinístico por (livro, versão): se o envio do e-mail
 * for repetido, o link é o mesmo — e o Resend deduplica pela idempotency key.
 * Só o hash vai para o banco.
 */
export function deriveDownloadToken(secret: string, bookId: string, version: number): string {
  return createHmac("sha256", secret).update(`download:${bookId}:v${version}`).digest("base64url");
}

export const DOWNLOAD_TOKEN_EXACT = /^[A-Za-z0-9_-]{43}$/;
