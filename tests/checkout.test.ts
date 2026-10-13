import { describe, expect, it } from "vitest";
import { buildCheckoutUrl, CheckoutConfigError } from "@/lib/cakto/checkout";
import { loadConfig } from "@/lib/config";
import { createPersonalization, purgeStaleData } from "@/lib/personalizations";
import { CHECKOUT_REF_EXACT, newCheckoutRef, safeEqual } from "@/lib/tokens";
import { newTestDb } from "./helpers/db";

describe("início do checkout", () => {
  it("anexa o checkout_ref nos parâmetros configurados", () => {
    const url = new URL(buildCheckoutUrl("https://pay.cakto.com.br/abc123_456?coupon=X", "lb_AAAAAAAAAAAAAAAAAAAAAAAA", ["utm_content", "sck"]));
    expect(url.searchParams.get("utm_content")).toBe("lb_AAAAAAAAAAAAAAAAAAAAAAAA");
    expect(url.searchParams.get("sck")).toBe("lb_AAAAAAAAAAAAAAAAAAAAAAAA");
    expect(url.searchParams.get("coupon")).toBe("X");
  });

  it("recusa URL de checkout fora da Cakto ou sem HTTPS", () => {
    expect(() => buildCheckoutUrl("https://evil.example/pay", "lb_AAAAAAAAAAAAAAAAAAAAAAAA", ["sck"])).toThrow(CheckoutConfigError);
    expect(() => buildCheckoutUrl("http://pay.cakto.com.br/x", "lb_AAAAAAAAAAAAAAAAAAAAAAAA", ["sck"])).toThrow(CheckoutConfigError);
    expect(() => buildCheckoutUrl("https://cakto.com.br.evil.example/x", "lb_AAAAAAAAAAAAAAAAAAAAAAAA", ["sck"])).toThrow(CheckoutConfigError);
  });

  it("referências são aleatórias, únicas e no formato esperado", () => {
    const refs = new Set(Array.from({ length: 2000 }, newCheckoutRef));
    expect(refs.size).toBe(2000);
    for (const r of refs) expect(r).toMatch(CHECKOUT_REF_EXACT);
  });

  it("grava só o mínimo (sem e-mail ou dados do comprador) e com status pendente", async () => {
    const { sql } = await newTestDb();
    const p = await createPersonalization(sql, { child_name: "Miguel", age_group: "5-7", illustration_style: "colorful" });
    expect(p.status).toBe("pending_payment");
    const cols = await sql.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema='public' and table_name='personalizations'`,
    );
    expect(cols.map((c) => c.column_name).sort()).toEqual(
      ["age_group", "checkout_ref", "child_name", "created_at", "id", "illustration_style", "status", "updated_at"].sort(),
    );
  });

  it("o banco recusa nomes inválidos mesmo sem passar pela API", async () => {
    const { sql } = await newTestDb();
    await expect(
      sql.query(`insert into public.personalizations (checkout_ref, child_name, age_group, illustration_style) values ($1, $2, '5-7', 'colorful')`, [newCheckoutRef(), " x"]),
    ).rejects.toThrow();
    await expect(
      sql.query(`insert into public.personalizations (checkout_ref, child_name, age_group, illustration_style) values ($1, $2, '5-7', 'colorful')`, [newCheckoutRef(), "x".repeat(41)]),
    ).rejects.toThrow();
  });

  it("limpeza remove personalizações não pagas antigas", async () => {
    const { sql } = await newTestDb();
    await createPersonalization(sql, { child_name: "Velha", age_group: "5-7", illustration_style: "colorful" });
    await createPersonalization(sql, { child_name: "Nova", age_group: "5-7", illustration_style: "colorful" });
    await sql.query(`update public.personalizations set created_at = now() - interval '40 days' where child_name = 'Velha'`);
    expect(await purgeStaleData(sql)).toEqual({ personalizations: 1, captures: 0 });
  });
});

describe("segurança de configuração", () => {
  it("comparação de segredo em tempo constante", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("modo seguro (sem auto-liberação) é o padrão", () => {
    expect(loadConfig({}).autoRelease).toBe(false);
    expect(loadConfig({ FULFILLMENT_AUTO_RELEASE: "true" }).autoRelease).toBe(true);
    expect(loadConfig({}).cakto.checkoutRefParams).toEqual(["utm_content", "sck", "src"]);
  });

  it("RLS está ligado e os papéis públicos não têm privilégios", async () => {
    const { sql } = await newTestDb();
    const rls = await sql.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`,
    );
    expect(rls.length).toBe(8);
    expect(rls.every((r) => r.relrowsecurity)).toBe(true);
    const grants = await sql.query(
      `select 1 from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated')`,
    );
    expect(grants).toHaveLength(0);
  });
});
