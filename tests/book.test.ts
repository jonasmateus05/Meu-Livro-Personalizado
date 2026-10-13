import { afterAll, describe, expect, it } from "vitest";
import { fontFaceCssEmbedded } from "@/lib/book/fonts-embedded";
import { BookValidationError, checkLayout, PlaywrightPdfRenderer } from "@/lib/book/pdf";
import { STORIES } from "@/lib/book/stories";
import { buildPages, expectedPageCount, renderBookHtml, wordSearchFor, type BookInput } from "@/lib/book/template";
import { validatePdf } from "@/lib/book/validate-pdf";
import { AGE_GROUPS } from "@/lib/validation";

import { CHROMIUM } from "./helpers/chromium";

describe("modelo editorial", () => {
  it("tem 10 histórias, cada uma com texto, lição, prática, oração e perguntas para as 3 idades", () => {
    expect(STORIES).toHaveLength(10);
    for (const s of STORIES) {
      expect(s.reference).toMatch(/\d/);
      expect(s.prayer.short.length).toBeGreaterThan(10);
      expect(s.prayer.full.length).toBeGreaterThan(s.prayer.short.length);
      for (const age of AGE_GROUPS) {
        expect(s.paragraphs[age].length, `${s.id} ${age}`).toBeGreaterThanOrEqual(4);
        expect(s.lesson[age]).toContain("{nome}");
        expect(s.practice[age].length).toBeGreaterThan(10);
        expect(s.questions[age].length).toBeGreaterThanOrEqual(2);
      }
      // Textos para 8-10 são mais longos que para 2-4 (adequação à idade).
      const len = (age: (typeof AGE_GROUPS)[number]) => s.paragraphs[age].join(" ").length;
      expect(len("2-4")).toBeLessThan(len("5-7"));
      expect(len("5-7")).toBeLessThan(len("8-10"));
    }
  });

  it("não apresenta paráfrases como citação literal (sem aspas atribuídas a personagens)", () => {
    const all = JSON.stringify(STORIES);
    expect(all).not.toMatch(/[“”«»]/);
    expect(all).not.toMatch(/\\"/);
  });

  it("monta o livro completo com capa, boas-vindas, 10 histórias, atividades e oração para dormir", () => {
    for (const age of AGE_GROUPS) {
      const pages = buildPages({ childName: "Miguel", ageGroup: age, style: "colorful" });
      const kinds = pages.map((p) => p.kind);
      expect(kinds[0]).toBe("cover");
      expect(kinds.filter((k) => k === "story-open")).toHaveLength(10);
      expect(kinds.filter((k) => k === "reflect")).toHaveLength(10);
      expect(kinds).toContain("bedtime");
      expect(kinds.some((k) => k.startsWith("activity"))).toBe(true);
      expect(pages.length).toBe(age === "2-4" ? 41 : 44);
    }
  });

  it("escapa o nome no HTML (sem injeção mesmo se a validação falhar)", () => {
    const html = renderBookHtml({ childName: `<img src=x onerror=alert(1)>`, ageGroup: "5-7", style: "colorful" }, { fontCss: "" });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("caça-palavras é determinístico e inclui o nome quando cabe", () => {
    const input: BookInput = { childName: "Heloísa", ageGroup: "8-10", style: "colorful" };
    const a = wordSearchFor(input);
    const b = wordSearchFor(input);
    expect(a.grid).toEqual(b.grid);
    expect(a.words).toContain("HELOISA");
    for (const p of a.placements) {
      const word = Array.from(p.word, (_, i) => a.grid[p.row + p.dr * i][p.col + p.dc * i]).join("");
      expect(word).toBe(p.word);
    }
  });

  it("checkLayout recusa texto transbordando, nome ausente e contagem errada de páginas", () => {
    const ok = { pageCount: 3, overflowing: [], brokenImages: 0, nameNodes: 5, nameMismatches: 0, fontsFailed: [], ready: true };
    expect(() => checkLayout(ok, 3)).not.toThrow();
    expect(() => checkLayout({ ...ok, overflowing: [{ page: 2, selector: ".content", detail: "x" }] }, 3)).toThrow(BookValidationError);
    expect(() => checkLayout({ ...ok, nameNodes: 0 }, 3)).toThrow(/nome/);
    expect(() => checkLayout({ ...ok, brokenImages: 1 }, 3)).toThrow(/imagem/);
    expect(() => checkLayout(ok, 4)).toThrow(/páginas/);
  });
});

describe("geração real de PDF (Chromium)", () => {
  const renderer = new PlaywrightPdfRenderer(CHROMIUM);
  afterAll(() => renderer.close());

  const cases: BookInput[] = [
    { childName: "Lu", ageGroup: "2-4", style: "colorful" },
    { childName: "Miguel", ageGroup: "5-7", style: "colorful" },
    { childName: "Maria Eduarda Albuquerque de Bragança", ageGroup: "8-10", style: "colorful" },
    { childName: "João Ângelo D'Ávila", ageGroup: "5-7", style: "watercolor" },
    { childName: "Ñuño Łukasz Çeylin", ageGroup: "2-4", style: "colorful" },
    { childName: "Bartholomeuzinhoalexandrinodemontecarlo", ageGroup: "8-10", style: "colorful" },
  ];

  it.each(cases)("gera e valida o PDF de $childName ($ageGroup, $style)", async (input) => {
    const fontCss = await fontFaceCssEmbedded();
    const pages = expectedPageCount(input);
    const { pdf, layout } = await renderer.render(renderBookHtml(input, { fontCss }), { expectedName: input.childName, expectedPages: pages });
    expect(layout.overflowing).toEqual([]);
    expect(layout.nameMismatches).toBe(0);
    const check = await validatePdf(pdf, { pages, childName: input.childName });
    expect(check.pageCount).toBe(pages);
    expect(check.namePages[0]).toBe(1); // capa
    expect(check.namePages.length).toBeGreaterThanOrEqual(10);
  });

  it("validatePdf recusa PDF de outro nome (associação errada)", async () => {
    const input: BookInput = { childName: "Miguel", ageGroup: "5-7", style: "colorful" };
    const pages = expectedPageCount(input);
    const { pdf } = await renderer.render(renderBookHtml(input, { fontCss: await fontFaceCssEmbedded() }), { expectedName: "Miguel", expectedPages: pages });
    await expect(validatePdf(pdf, { pages, childName: "Rafael" })).rejects.toThrow(/Nome da criança/);
    await expect(validatePdf(pdf, { pages: pages + 1, childName: "Miguel" })).rejects.toThrow(/páginas/);
    await expect(validatePdf(new Uint8Array(2048), { pages, childName: "Miguel" })).rejects.toThrow(/PDF/);
  });

  it("o renderizador recusa um layout que transborda", async () => {
    const html = `<!doctype html><html><body><section class="page" style="width:100px;height:100px;overflow:hidden"><div class="content" style="position:absolute;inset:0;overflow:hidden"><p style="font-size:40px"><span class="nm">Ana</span> ${"texto ".repeat(200)}</p></div></section><script>document.documentElement.setAttribute('data-ready','1')</script></body></html>`;
    await expect(renderer.render(html, { expectedName: "Ana", expectedPages: 1 })).rejects.toThrow(/transbordando/);
  });
});
