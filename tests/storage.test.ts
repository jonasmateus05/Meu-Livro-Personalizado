import { describe, expect, it } from "vitest";
import { bookStoragePath, R2BookStorage } from "@/lib/storage";

const cfg = { accountId: "0123456789abcdef0123456789abcdef", accessKeyId: "AKIATESTE", secretAccessKey: "segredo-de-teste", bucket: "livros" };

describe("armazenamento R2 (URLs assinadas, sem rede)", () => {
  it("gera URL assinada curta, no bucket privado, forçando download com nome amigável", async () => {
    const storage = new R2BookStorage(cfg);
    const url = new URL(await storage.signedUrl("orders/abc/livro-v1.pdf", 120, "livro-biblico-joao-angelo.pdf"));
    expect(url.hostname).toBe(`${cfg.accountId}.r2.cloudflarestorage.com`);
    expect(url.pathname).toBe("/livros/orders/abc/livro-v1.pdf");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("120");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get("response-content-disposition")).toBe('attachment; filename="livro-biblico-joao-angelo.pdf"');
    expect(url.toString()).not.toContain(cfg.secretAccessKey);
  });

  it("caminho do arquivo deriva só do id do pedido (sem entrada do usuário)", () => {
    expect(bookStoragePath("2f1d3c5e-9b8a-4c7d-8e6f-1a2b3c4d5e6f", "v1")).toBe("orders/2f1d3c5e-9b8a-4c7d-8e6f-1a2b3c4d5e6f/livro-v1.pdf");
    expect(() => bookStoragePath("../outro", "v1")).toThrow();
  });

  it("recusa account id inválido", () => {
    expect(() => new R2BookStorage({ ...cfg, accountId: "x" })).toThrow(/R2_ACCOUNT_ID/);
  });
});
