import { describe, expect, it } from "vitest";
import { buildPages } from "@/lib/book/template";
import { parsePrice, priceFromEnv, showcasePages, TESTIMONIALS } from "@/lib/funnel";
import { AGE_GROUPS } from "@/lib/validation";

describe("funil de vendas", () => {
  it("lê preços em formatos comuns e recusa valores inválidos", () => {
    expect(parsePrice("29,90")).toBe(29.9);
    expect(parsePrice("29.90")).toBe(29.9);
    expect(parsePrice("R$ 1.299,90")).toBe(1299.9);
    for (const v of ["", "abc", "0", "-5", "29,9,9", undefined]) expect(parsePrice(v)).toBeUndefined();
  });

  it("sem preço configurado não inventa valor", () => {
    expect(priceFromEnv(undefined, "97")).toEqual({ current: undefined, original: undefined });
  });

  it("só mostra preço riscado quando ele é real e maior que o atual", () => {
    const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    expect(priceFromEnv("29,90", "47,00")).toEqual({ current: fmt(29.9), original: fmt(47) });
    expect(priceFromEnv("29,90", undefined).original).toBeUndefined();
    expect(priceFromEnv("29,90", "19,90").original).toBeUndefined();
    expect(priceFromEnv("29,90", "29,90").original).toBeUndefined();
  });

  it("não há depoimentos fictícios cadastrados", () => {
    expect(TESTIMONIALS).toEqual([]);
  });

  it("o carrossel aponta para páginas reais do livro em todas as idades", () => {
    for (const age of AGE_GROUPS) {
      const input = { childName: "Miguel", ageGroup: age, style: "colorful" as const };
      const kinds = buildPages(input).map((p) => p.kind);
      const slides = showcasePages(input);
      expect(slides).toHaveLength(7);
      expect(kinds[slides[0].page - 1]).toBe("cover");
      expect(kinds[slides[1].page - 1]).toBe("welcome");
      expect(kinds[slides[2].page - 1]).toBe("story-open");
      expect(kinds[slides[3].page - 1]).toBe("story-text");
      expect(kinds[slides[4].page - 1]).toBe("reflect");
      expect(kinds[slides[5].page - 1]).toContain("coloring");
      expect(kinds[slides[6].page - 1]).toBe("bedtime");
    }
  });
});
