import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Armazenamento dos PDFs. Produção: Supabase Storage, bucket PRIVADO.
 * O caminho do arquivo nunca vem do usuário: é derivado do id do pedido.
 */
export interface BookStorage {
  upload(path: string, bytes: Uint8Array): Promise<void>;
  /** URL temporária (segundos) para download, com nome de arquivo amigável. */
  signedUrl(path: string, expiresInSeconds: number, downloadName: string): Promise<string>;
  exists(path: string): Promise<boolean>;
}

export function bookStoragePath(orderId: string, templateVersion: string): string {
  if (!/^[0-9a-f-]{36}$/.test(orderId)) throw new Error("orderId inválido para caminho de storage");
  return `orders/${orderId}/livro-${templateVersion}.pdf`;
}

export class SupabaseBookStorage implements BookStorage {
  constructor(private readonly client: SupabaseClient, private readonly bucket: string) {}

  async upload(path: string, bytes: Uint8Array) {
    const { error } = await this.client.storage.from(this.bucket).upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true, // idempotente: nova tentativa sobrescreve o mesmo arquivo
      cacheControl: "private, max-age=0",
    });
    if (error) throw new Error(`storage_upload_failed: ${error.message}`);
  }

  async signedUrl(path: string, expiresInSeconds: number, downloadName: string) {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresInSeconds, { download: downloadName });
    if (error || !data?.signedUrl) throw new Error(`storage_sign_failed: ${error?.message ?? "sem URL"}`);
    return data.signedUrl;
  }

  async exists(path: string) {
    const slash = path.lastIndexOf("/");
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });
    if (error) throw new Error(`storage_list_failed: ${error.message}`);
    return (data ?? []).some((f) => f.name === path.slice(slash + 1));
  }
}
