/**
 * Aplica db/schema.sql no banco de DATABASE_URL (Neon ou qualquer PostgreSQL 15+).
 * Idempotente: pode ser executado novamente.
 *
 *   DATABASE_URL=postgresql://... npm run db:migrate
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DATABASE_URL");
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  const client = new Client({
    connectionString: url,
    ssl: isLocal ? undefined : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true },
  });
  await client.connect();
  try {
    await client.query(await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8"));
    const t = await client.query(`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
    console.log(`db/schema.sql aplicado (${t.rows[0].n} tabelas em public)`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
