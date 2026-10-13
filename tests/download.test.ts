import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { handleCaktoWebhook } from "@/lib/cakto/webhook";
import type { Sql } from "@/lib/db";
import { describeDownload, redeemDownload } from "@/lib/download";
import { caktoPayload, PRODUCT, SECRET } from "./helpers/cakto";
import { newTestDb } from "./helpers/db";
import { drain, makeDeps, paidOrder, sharedRenderer, tokenFromEmail } from "./helpers/pipeline";

let sql: Sql;
beforeEach(async () => {
  ({ sql } = await newTestDb());
});
afterAll(() => sharedRenderer.close());

describe("acesso seguro ao PDF", () => {
  async function twoDeliveredOrders() {
    const ctx = makeDeps(sql);
    const a = await paidOrder(sql, { orderId: "DA", child_name: "Alice", email: "a@example.com" });
    const b = await paidOrder(sql, { orderId: "DB", child_name: "Bruno", email: "b@example.com" });
    await drain(ctx.deps);
    const tokenA = tokenFromEmail(ctx.mailer.sent.find((m) => m.to === "a@example.com")!.text);
    const tokenB = tokenFromEmail(ctx.mailer.sent.find((m) => m.to === "b@example.com")!.text);
    return { ...ctx, a, b, tokenA, tokenB };
  }

  it("cada token só abre o PDF do próprio pedido (sem acesso ao PDF de outro pedido)", async () => {
    const { storage, a, b, tokenA, tokenB } = await twoDeliveredOrders();
    const ra = await redeemDownload(sql, storage, tokenA, 60);
    const rb = await redeemDownload(sql, storage, tokenB, 60);
    expect(ra.ok && ra.url).toContain(encodeURIComponent(`orders/${a.orderId}/`));
    expect(rb.ok && rb.url).toContain(encodeURIComponent(`orders/${b.orderId}/`));
    expect(ra.ok && ra.url).not.toContain(b.orderId);
    expect(storage.signed.map((s) => s.name)).toEqual(["livro-biblico-alice.pdf", "livro-biblico-bruno.pdf"]);
  });

  it("tokens adulterados, inventados ou ids de pedido não dão acesso", async () => {
    const { storage, a, tokenA } = await twoDeliveredOrders();
    const tampered = tokenA.slice(0, -1) + (tokenA.endsWith("A") ? "B" : "A");
    for (const t of [tampered, "x".repeat(43), a.orderId, `../${a.orderId}`, "", a.personalization.checkout_ref]) {
      expect(await describeDownload(sql, t)).toEqual({ ok: false, reason: "invalid" });
      expect(await redeemDownload(sql, storage, t, 60)).toEqual({ ok: false, reason: "invalid" });
    }
  });

  it("página de download não consome; limite de downloads e expiração são respeitados", async () => {
    const { storage, tokenA } = await twoDeliveredOrders();
    const info = await describeDownload(sql, tokenA);
    expect(info).toMatchObject({ ok: true, childName: "Alice", remaining: 3 });
    for (let i = 0; i < 3; i++) expect((await redeemDownload(sql, storage, tokenA, 60)).ok).toBe(true);
    expect(await redeemDownload(sql, storage, tokenA, 60)).toEqual({ ok: false, reason: "limit" });
    await sql.query(`update public.download_tokens set download_count = 0, expires_at = now() - interval '1 minute'`);
    expect(await redeemDownload(sql, storage, tokenA, 60)).toEqual({ ok: false, reason: "expired" });
  });

  it("reembolso/chargeback revoga o link já enviado", async () => {
    const { storage, tokenA, tokenB } = await twoDeliveredOrders();
    await handleCaktoWebhook(
      { sql, secret: SECRET, policy: { productId: PRODUCT, autoRelease: true } },
      JSON.stringify(caktoPayload({ event: "chargeback", orderId: "DA", status: "chargedback" })),
    );
    expect(await redeemDownload(sql, storage, tokenA, 60)).toEqual({ ok: false, reason: "revoked" });
    expect((await redeemDownload(sql, storage, tokenB, 60)).ok).toBe(true); // o outro pedido continua válido
  });

  it("o banco guarda só o hash do token", async () => {
    const { tokenA } = await twoDeliveredOrders();
    const rows = await sql.query<{ token_hash: string }>(`select token_hash from public.download_tokens`);
    expect(rows.some((r) => r.token_hash === tokenA)).toBe(false);
    expect(rows.every((r) => /^[0-9a-f]{64}$/.test(r.token_hash))).toBe(true);
  });
});
