/**
 * Aplica supabase/schema.sql (e supabase/storage.sql, se o schema `storage`
 * existir) no banco de DATABASE_URL. Idempotente.
 *
 *   DATABASE_URL=postgres://... npm run db:migrate
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
    ssl: isLocal ? undefined : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const schema = await readFile(path.join(process.cwd(), "supabase", "schema.sql"), "utf8");
    await client.query(schema);
    console.log("schema.sql aplicado");
    const hasStorage = await client.query(`select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets'`);
    if (hasStorage.rowCount) {
      await client.query(await readFile(path.join(process.cwd(), "supabase", "storage.sql"), "utf8"));
      console.log("storage.sql aplicado (bucket privado `books`)");
    } else {
      console.log("schema storage não encontrado: pulei storage.sql (não é Supabase?)");
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
