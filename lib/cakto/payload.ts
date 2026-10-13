import { CHECKOUT_REF_PATTERN } from "../tokens";

/**
 * Normalização do payload de webhook da Cakto.
 *
 * O formato abaixo segue o exemplo público da Cakto para pagamento único
 * ({ secret, event, data: { id, refId, status, amount, paymentMethod, paidAt,
 * customer: { email }, product: { id }, offer: { id } } }). Os campos são lidos
 * de forma defensiva: qualquer ausência vira null, nunca um valor inventado.
 *
 * IMPORTANTE: a documentação consultada NÃO garante que algum campo devolva um
 * identificador nosso (metadados/UTM). Por isso a referência da personalização
 * é procurada pelo FORMATO do token (lb_ + 24 caracteres), que só existe se
 * tiver saído do nosso link de checkout. Confirme com uma compra de teste real
 * (docs/CAKTO.md) e então fixe o caminho em CAKTO_CORRELATION_PATH.
 */

export type NormalizedCaktoEvent = {
  event: string;
  orderId: string;
  refId: string | null;
  status: string | null;
  productId: string | null;
  offerId: string | null;
  amountCents: number | null;
  paymentMethod: string | null;
  email: string | null;
  paidAt: string | null;
  checkoutRefs: string[];
};

export class PayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadError";
  }
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, max = 300): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t.slice(0, max);
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** Converte valor monetário (reais) para centavos. Strings "90,00"/"90.00" aceitas. */
export function toCents(v: unknown): number | null {
  let n: number | null = null;
  if (typeof v === "number" && Number.isFinite(v)) n = v;
  else if (typeof v === "string" && /^\d{1,9}([.,]\d{1,2})?$/.test(v.trim())) {
    n = Number(v.trim().replace(",", "."));
  }
  if (n === null || n < 0) return null;
  return Math.round(n * 100);
}

function normalizeEmail(v: unknown): string | null {
  const s = str(v, 320);
  if (!s) return null;
  const e = s.toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}

function normalizeDate(v: unknown): string | null {
  const s = str(v, 60);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Lê "data.foo.0.bar" de um objeto. */
export function getPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const key of path.split(".")) {
    if (Array.isArray(cur) && /^\d+$/.test(key)) cur = cur[Number(key)];
    else if (isObject(cur)) cur = cur[key];
    else return undefined;
  }
  return cur;
}

function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 12 || out.length > 5000) return;
  if (typeof value === "string") {
    out.push(value);
    // Valores podem chegar URL-encoded (ex.: checkoutUrl com query string).
    if (value.includes("%")) {
      try {
        out.push(decodeURIComponent(value));
      } catch {
        /* ignora codificação inválida */
      }
    }
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out, depth + 1);
  } else if (isObject(value)) {
    for (const v of Object.values(value)) collectStrings(v, out, depth + 1);
  }
}

/** Encontra checkout_refs distintos no payload (ou só no caminho configurado). */
export function extractCheckoutRefs(payload: unknown, correlationPath?: string): string[] {
  const strings: string[] = [];
  if (correlationPath) collectStrings(getPath(payload, correlationPath), strings);
  else if (isObject(payload)) {
    // Nunca procurar dentro do campo `secret`.
    const { secret: _ignored, ...rest } = payload;
    void _ignored;
    collectStrings(rest, strings);
  }
  const refs = new Set<string>();
  for (const s of strings) {
    for (const match of s.matchAll(CHECKOUT_REF_PATTERN)) refs.add(match[0]);
  }
  return [...refs].sort();
}

export function normalizeCaktoPayload(payload: unknown, correlationPath?: string): NormalizedCaktoEvent {
  if (!isObject(payload)) throw new PayloadError("Payload não é um objeto JSON");
  const event = str(payload.event, 80);
  if (!event || !/^[a-z0-9_.-]+$/i.test(event)) throw new PayloadError("Campo `event` ausente ou inválido");
  const data = payload.data;
  if (!isObject(data)) throw new PayloadError("Campo `data` ausente");
  const orderId = str(data.id, 200);
  if (!orderId) throw new PayloadError("Campo `data.id` (pedido) ausente");

  const customer = isObject(data.customer) ? data.customer : {};
  const product = isObject(data.product) ? data.product : {};
  const offer = isObject(data.offer) ? data.offer : {};

  return {
    event,
    orderId,
    refId: str(data.refId, 200),
    status: str(data.status, 60),
    productId: str(product.id, 200),
    offerId: str(offer.id, 200),
    amountCents: toCents(data.amount),
    paymentMethod: str(data.paymentMethod, 60),
    email: normalizeEmail(customer.email),
    paidAt: normalizeDate(data.paidAt),
    checkoutRefs: extractCheckoutRefs(payload, correlationPath),
  };
}

const SENSITIVE_KEY =
  /secret|token|password|senha|cpf|cnpj|doc|document|phone|fone|tel|whats|address|endereco|street|rua|zip|cep|card|cartao|ip|birth|nascimento|name|nome|email/i;

/**
 * Mascara dados pessoais para a captura de diagnóstico, preservando a
 * ESTRUTURA (nomes de campos e tipos) e qualquer checkout_ref encontrado.
 */
export function redactPayload(value: unknown, keyName = "", depth = 0): Json {
  if (depth > 12) return "[depth-limit]";
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redactPayload(v, keyName, depth + 1));
  if (isObject(value)) {
    const out: Record<string, Json> = {};
    for (const [k, v] of Object.entries(value).slice(0, 200)) out[k] = redactPayload(v, k, depth + 1);
    return out;
  }
  if (typeof value === "string") {
    const refs = [...value.matchAll(CHECKOUT_REF_PATTERN)].map((m) => m[0]);
    if (SENSITIVE_KEY.test(keyName) || /@/.test(value)) {
      return refs.length ? `[redacted; contém checkout_ref ${refs.join(",")}]` : `[redacted:${value.length}]`;
    }
    return value.slice(0, 500);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return SENSITIVE_KEY.test(keyName) ? `[redacted:${typeof value}]` : value;
  }
  return String(value);
}
