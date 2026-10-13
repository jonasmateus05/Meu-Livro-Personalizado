import type { Sql } from "./db";
import { fileSlug } from "./names";
import type { BookStorage } from "./storage";
import { DOWNLOAD_TOKEN_EXACT, sha256Hex } from "./tokens";

/**
 * Download seguro: o e-mail leva um token opaco (HMAC, 256 bits). O banco só
 * guarda o hash. O token resolve para UM livro; o caminho do arquivo vem do
 * banco, nunca da URL. Cada clique gera uma URL assinada do Supabase válida
 * por poucos segundos/minutos.
 */

export type DownloadInfo =
  | { ok: true; childName: string; expiresAt: Date; remaining: number }
  | { ok: false; reason: "invalid" | "expired" | "revoked" | "limit" | "unavailable" };

type Row = {
  token_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  download_count: number;
  max_downloads: number;
  book_status: string;
  storage_path: string | null;
  payment_status: string;
  fulfillment_status: string;
  child_name: string;
};

async function lookup(sql: Sql, token: string, lock = false): Promise<Row | undefined> {
  if (!DOWNLOAD_TOKEN_EXACT.test(token)) return undefined;
  const rows = await sql.query<Row>(
    `select t.id as token_id, t.expires_at, t.revoked_at, t.download_count, t.max_downloads,
            b.status as book_status, b.storage_path, o.payment_status, o.fulfillment_status, p.child_name
       from public.download_tokens t
       join public.generated_books b on b.id = t.book_id
       join public.orders o on o.id = b.order_id
       join public.personalizations p on p.id = b.personalization_id
      where t.token_hash = $1 ${lock ? "for update of t" : ""}`,
    [sha256Hex(token)],
  );
  return rows[0];
}

function evaluate(row: Row | undefined): DownloadInfo {
  if (!row) return { ok: false, reason: "invalid" };
  if (row.revoked_at || row.payment_status !== "approved" || row.fulfillment_status === "revoked" || row.book_status === "revoked") {
    return { ok: false, reason: "revoked" };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (row.download_count >= row.max_downloads) return { ok: false, reason: "limit" };
  if (row.book_status !== "ready" || !row.storage_path) return { ok: false, reason: "unavailable" };
  return { ok: true, childName: row.child_name, expiresAt: new Date(row.expires_at), remaining: row.max_downloads - row.download_count };
}

/** Para a página de download (não consome downloads). */
export async function describeDownload(sql: Sql, token: string): Promise<DownloadInfo> {
  return evaluate(await lookup(sql, token));
}

/** Consome um download e devolve uma URL assinada de curta duração. */
export async function redeemDownload(
  sql: Sql,
  storage: BookStorage,
  token: string,
  signedUrlTtlSeconds: number,
): Promise<{ ok: true; url: string } | { ok: false; reason: Exclude<DownloadInfo, { ok: true }>["reason"] }> {
  const result = await sql.transaction(async (tx) => {
    const row = await lookup(tx, token, true);
    const info = evaluate(row);
    if (!info.ok) return info;
    await tx.query(
      `update public.download_tokens set download_count = download_count + 1, last_downloaded_at = now() where id = $1`,
      [row!.token_id],
    );
    return { ok: true as const, path: row!.storage_path!, childName: row!.child_name };
  });
  if (!result.ok) return result;
  const url = await storage.signedUrl(result.path, signedUrlTtlSeconds, `livro-biblico-${fileSlug(result.childName)}.pdf`);
  return { ok: true, url };
}
