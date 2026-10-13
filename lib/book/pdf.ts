import type { Browser } from "playwright-core";

/**
 * Renderização HTML -> PDF com Chromium (playwright-core) e verificação de
 * layout ANTES de imprimir. Precisa de Node.js com Chromium disponível
 * (CHROMIUM_EXECUTABLE_PATH ou o navegador instalado pelo Playwright).
 */

export type LayoutReport = {
  pageCount: number;
  overflowing: { page: number; selector: string; detail: string }[];
  brokenImages: number;
  nameNodes: number;
  nameMismatches: number;
  fontsFailed: string[];
  ready: boolean;
};

export class BookValidationError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = "BookValidationError";
  }
}

export interface PdfRenderer {
  render(html: string, opts: { expectedName: string; expectedPages: number }): Promise<{ pdf: Uint8Array; layout: LayoutReport }>;
  close(): Promise<void>;
}

export function checkLayout(layout: LayoutReport, expectedPages: number): void {
  if (!layout.ready) throw new BookValidationError("Layout não finalizou (fontes/autoajuste)");
  if (layout.pageCount !== expectedPages) {
    throw new BookValidationError(`Número de páginas no HTML (${layout.pageCount}) difere do esperado (${expectedPages})`);
  }
  if (layout.overflowing.length) {
    throw new BookValidationError(`Texto cortado/transbordando em ${layout.overflowing.length} ponto(s)`, layout.overflowing.slice(0, 10));
  }
  if (layout.brokenImages) throw new BookValidationError(`${layout.brokenImages} imagem(ns) não carregada(s)`);
  if (layout.nameNodes === 0) throw new BookValidationError("O nome da criança não aparece no livro");
  if (layout.nameMismatches) throw new BookValidationError("O nome impresso difere do nome da personalização");
  if (layout.fontsFailed.length) throw new BookValidationError(`Falha ao carregar fontes: ${layout.fontsFailed.join(", ")}`);
}

/** Executado DENTRO da página (JavaScript puro). */
const LAYOUT_CHECK_SOURCE = `function (name) {
  var overflowing = [];
  var pages = Array.prototype.slice.call(document.querySelectorAll("section.page"));
  pages.forEach(function (p, i) {
    function check(el, selector) {
      var dh = el.scrollHeight - el.clientHeight;
      var dw = el.scrollWidth - el.clientWidth;
      if (dh > 1 || dw > 1) overflowing.push({ page: i + 1, selector: selector, detail: "excesso " + dh + "px vertical, " + dw + "px horizontal" });
    }
    check(p, "page");
    p.querySelectorAll(".content, .cover-text").forEach(function (el) { check(el, el.className); });
    p.querySelectorAll("[data-autofit]").forEach(function (el) {
      var inner = el.firstElementChild;
      if (inner.scrollHeight > el.clientHeight + 1 || inner.scrollWidth > el.clientWidth + 1) {
        overflowing.push({ page: i + 1, selector: "autofit", detail: "nome não coube" });
      }
    });
  });
  var imgs = Array.prototype.slice.call(document.images);
  var brokenImages = imgs.filter(function (img) { return !img.complete || img.naturalWidth === 0; }).length;
  var nodes = Array.prototype.slice.call(document.querySelectorAll(".nm"));
  var target = name.normalize("NFC");
  var first = target.split(" ")[0];
  var nameMismatches = nodes.filter(function (n) {
    var txt = (n.textContent || "").normalize("NFC");
    return txt !== target && txt !== first;
  }).length;
  var fontsFailed = [];
  document.fonts.forEach(function (f) { if (f.status === "error") fontsFailed.push(f.family + " " + f.weight); });
  return {
    pageCount: pages.length,
    overflowing: overflowing,
    brokenImages: brokenImages,
    nameNodes: nodes.length,
    nameMismatches: nameMismatches,
    fontsFailed: fontsFailed,
    ready: document.documentElement.getAttribute("data-ready") === "1"
  };
}`;

export class PlaywrightPdfRenderer implements PdfRenderer {
  private browser?: Browser;

  constructor(private readonly executablePath?: string) {}

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    const { chromium } = await import("playwright-core");
    this.browser = await chromium.launch({
      executablePath: this.executablePath,
      args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
    });
    return this.browser;
  }

  async render(html: string, opts: { expectedName: string; expectedPages: number }) {
    const browser = await this.getBrowser();
    const context = await browser.newContext({ javaScriptEnabled: true, offline: true });
    try {
      const page = await context.newPage();
      // Nenhuma requisição externa: tudo (fontes, imagens) está embutido.
      await page.route("**/*", (route) => {
        const url = route.request().url();
        return url.startsWith("data:") || url === "about:blank" ? route.continue() : route.abort();
      });
      await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
      await page.waitForFunction(`document.documentElement.getAttribute("data-ready") === "1"`, null, { timeout: 30_000 });
      await page.emulateMedia({ media: "print" });

      // Passado como string: transpiladores (tsx/esbuild) podem injetar helpers
      // que não existem dentro da página.
      const layout = (await page.evaluate(`(${LAYOUT_CHECK_SOURCE})(${JSON.stringify(opts.expectedName)})`)) as LayoutReport;

      checkLayout(layout, opts.expectedPages);

      const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      return { pdf: new Uint8Array(pdf), layout };
    } finally {
      await context.close();
    }
  }

  async close() {
    await this.browser?.close();
    this.browser = undefined;
  }
}
