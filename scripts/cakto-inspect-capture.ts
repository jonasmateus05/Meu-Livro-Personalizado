/**
 * TESTE DE INTEGRAÇÃO COM A CAKTO — análise de um payload REAL.
 *
 * Objetivo: descobrir se (e onde) o checkout_ref enviado no link de checkout
 * volta no webhook da Cakto. Nada aqui presume o formato: o script lista todos
 * os caminhos do JSON e procura o token.
 *
 * Uso:
 *   a) Com captura no banco (CAKTO_WEBHOOK_CAPTURE=true durante a compra de teste):
 *        DATABASE_URL=... npm run cakto:inspect -- --db --ref lb_XXXXXXXXXXXXXXXXXXXXXXXX
 *   b) Com um JSON salvo (ex.: copiado dos logs de entrega do painel da Cakto):
 *        npm run cakto:inspect -- --file payload.json --ref lb_XXXXXXXXXXXXXXXXXXXXXXXX
 *
 * O --ref é o checkout_ref da personalização usada na compra de teste
 * (veja na tabela personalizations ou na URL do checkout).
 */
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { normalizeCaktoPayload, PayloadError } from "../lib/cakto/payload";
import { CHECKOUT_REF_EXACT } from "../lib/tokens";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function walk(value: unknown, prefix: string, out: { path: string; type: string; sample: string; full: string }[]) {
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${prefix}.${i}`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, prefix ? `${prefix}.${k}` : k, out);
  else out.push({ path: prefix, type: value === null ? "null" : typeof value, sample: String(value).slice(0, 80), full: String(value) });
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

async function loadPayloads(): Promise<unknown[]> {
  const file = arg("file");
  if (file) return [JSON.parse(await readFile(file, "utf8"))];
  if (process.argv.includes("--db")) {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const r = await client.query(`select redacted_payload from public.webhook_captures order by received_at desc limit 10`);
    await client.end();
    return r.rows.map((row) => row.redacted_payload);
  }
  throw new Error("Use --file payload.json ou --db");
}

async function main() {
  const ref = arg("ref");
  if (ref && !CHECKOUT_REF_EXACT.test(ref)) throw new Error("--ref deve ter o formato lb_ + 24 caracteres");
  const payloads = await loadPayloads();
  if (!payloads.length) throw new Error("Nenhum payload encontrado");
  payloads.forEach((payload, n) => {
    const fields: { path: string; type: string; sample: string; full: string }[] = [];
    walk(payload, "", fields);
    console.log(`\n=== Payload #${n + 1} — ${fields.length} campos ===`);
    for (const f of fields) console.log(`${f.path}  (${f.type})  ${f.path === "secret" ? "[omitido]" : f.sample}`);
    if (ref) {
      const hits = fields.filter((f) => f.full.includes(ref) || safeDecode(f.full).includes(ref));
      console.log(hits.length ? `\n✔ checkout_ref encontrado em: ${hits.map((h) => h.path).join(", ")}` : `\n✘ checkout_ref ${ref} NÃO aparece neste payload`);
      if (hits.length === 1) console.log(`  Sugestão: CAKTO_CORRELATION_PATH=${hits[0].path}`);
    }
    try {
      const ev = normalizeCaktoPayload(payload);
      console.log("\nNormalização:", JSON.stringify({ ...ev, email: ev.email ? "[presente]" : null }, null, 2));
    } catch (e) {
      console.log("\nNormalização falhou:", e instanceof PayloadError ? e.message : e);
    }
  });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
