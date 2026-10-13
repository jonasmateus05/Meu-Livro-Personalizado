import type { Pool, PoolClient } from "pg";

/**
 * Interface mínima de acesso ao PostgreSQL.
 * Produção: `pg` conectado a qualquer PostgreSQL (ex.: Neon) via DATABASE_URL.
 * Testes: PGlite (PostgreSQL real em WebAssembly) com o mesmo db/schema.sql.
 */
export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  transaction<R>(fn: (tx: Sql) => Promise<R>): Promise<R>;
}

class PgClientSql implements Sql {
  constructor(private readonly client: PoolClient) {}
  async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.client.query(text, params);
    return res.rows as T[];
  }
  // Transação aninhada reaproveita a transação atual.
  transaction<R>(fn: (tx: Sql) => Promise<R>): Promise<R> {
    return fn(this);
  }
}

export class PgSql implements Sql {
  constructor(private readonly pool: Pool) {}
  async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query(text, params);
    return res.rows as T[];
  }
  async transaction<R>(fn: (tx: Sql) => Promise<R>): Promise<R> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await fn(new PgClientSql(client));
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

let poolSingleton: Pool | undefined;

export async function createPgSql(
  databaseUrl: string,
  options: { max?: number; caCert?: string } = {},
): Promise<Sql> {
  if (!poolSingleton) {
    const { Pool } = await import("pg");
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);
    poolSingleton = new Pool({
      connectionString: databaseUrl,
      max: options.max ?? 3,
      idleTimeoutMillis: 10_000,
      // TLS obrigatório fora de localhost, com verificação do certificado
      // (Neon usa certificado público). DATABASE_CA_CERT permite informar uma
      // CA própria, se o provedor exigir.
      ssl: isLocal ? undefined : options.caCert ? { ca: options.caCert, rejectUnauthorized: true } : { rejectUnauthorized: true },
    });
  }
  return new PgSql(poolSingleton);
}

export async function closePgPool(): Promise<void> {
  if (poolSingleton) {
    await poolSingleton.end();
    poolSingleton = undefined;
  }
}
