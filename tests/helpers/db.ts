import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import type { Sql } from "@/lib/db";

/** Adaptador PGlite -> interface Sql (PostgreSQL real, em memória). */
class PgliteSql implements Sql {
  constructor(private readonly db: PGlite | Transaction, private readonly inTx = false) {}
  async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
    const r = await this.db.query<T>(text, params as unknown[]);
    return r.rows;
  }
  async transaction<R>(fn: (tx: Sql) => Promise<R>): Promise<R> {
    if (this.inTx) return fn(this);
    return (this.db as PGlite).transaction((tx) => fn(new PgliteSql(tx, true)));
  }
}

const SCHEMA = readFileSync(path.join(__dirname, "..", "..", "supabase", "schema.sql"), "utf8");

export async function newTestDb(): Promise<{ sql: Sql; pg: PGlite }> {
  const pg = new PGlite();
  // Papéis do Supabase, para exercitar o REVOKE do schema.
  await pg.exec("create role anon; create role authenticated;");
  await pg.exec(SCHEMA);
  return { sql: new PgliteSql(pg), pg };
}
