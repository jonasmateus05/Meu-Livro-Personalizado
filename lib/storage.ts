import type { S3Client } from "@aws-sdk/client-s3";

/**
 * Armazenamento dos PDFs. Produção: Cloudflare R2 (API compatível com S3),
 * bucket PRIVADO — nenhum arquivo é público; o download usa URL assinada de
 * curta duração. O caminho do arquivo nunca vem do usuário: deriva do id do pedido.
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

export type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };

export class R2BookStorage implements BookStorage {
  private clientPromise?: Promise<S3Client>;

  constructor(private readonly cfg: R2Config) {
    if (!/^[0-9a-f]{32}$/i.test(cfg.accountId)) throw new Error("R2_ACCOUNT_ID inválido (32 caracteres hexadecimais)");
  }

  private client(): Promise<S3Client> {
    this.clientPromise ??= import("@aws-sdk/client-s3").then(
      ({ S3Client }) =>
        new S3Client({
          region: "auto",
          forcePathStyle: true,
          endpoint: `https://${this.cfg.accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: this.cfg.accessKeyId, secretAccessKey: this.cfg.secretAccessKey },
        }),
    );
    return this.clientPromise;
  }

  async upload(path: string, bytes: Uint8Array) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    // Idempotente: nova tentativa sobrescreve o mesmo arquivo.
    await (await this.client()).send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: path,
        Body: bytes,
        ContentType: "application/pdf",
        CacheControl: "private, max-age=0",
      }),
    );
  }

  async signedUrl(path: string, expiresInSeconds: number, downloadName: string) {
    const [{ GetObjectCommand }, { getSignedUrl }] = await Promise.all([
      import("@aws-sdk/client-s3"),
      import("@aws-sdk/s3-request-presigner"),
    ]);
    const safeName = downloadName.replace(/[^A-Za-z0-9._-]/g, "_");
    return getSignedUrl(
      await this.client(),
      new GetObjectCommand({
        Bucket: this.cfg.bucket,
        Key: path,
        ResponseContentDisposition: `attachment; filename="${safeName}"`,
        ResponseContentType: "application/pdf",
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async exists(path: string) {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      await (await this.client()).send(new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: path }));
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) return false;
      throw error;
    }
  }
}
