/**
 * Gera um PDF de exemplo localmente (sem banco, sem pagamento).
 *
 *   npm run book:sample -- --name "Miguel" --age 5-7 --style colorful --out ./tmp/miguel.pdf
 *   npm run book:sample -- --screenshots public/amostras   (gera imagens das páginas de exemplo)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkChildName } from "../lib/names";
import { fontFaceCssEmbedded } from "../lib/book/fonts-embedded";
import { PlaywrightPdfRenderer } from "../lib/book/pdf";
import { expectedPageCount, renderBookHtml, type BookInput } from "../lib/book/template";
import { validatePdf } from "../lib/book/validate-pdf";
import { AGE_GROUPS, ILLUSTRATION_STYLES, type AgeGroup, type IllustrationStyle } from "../lib/validation";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function screenshots(outDir: string, executablePath?: string) {
  const { chromium } = await import("playwright-core");
  const fontCss = await fontFaceCssEmbedded();
  const browser = await chromium.launch({ executablePath });
  await mkdir(outDir, { recursive: true });
  const shots: { input: BookInput; pages: number[]; prefix: string }[] = [
    { input: { childName: "Miguel", ageGroup: "5-7", style: "colorful" }, pages: [1, 3, 9, 10, 11, 36], prefix: "miguel-colorido" },
    { input: { childName: "Ana Lívia", ageGroup: "2-4", style: "watercolor" }, pages: [1, 7], prefix: "ana-livia-aquarela" },
  ];
  for (const s of shots) {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });
    await page.setContent(renderBookHtml(s.input, { fontCss, variant: "full" }), { waitUntil: "load" });
    await page.waitForFunction(`document.documentElement.getAttribute("data-ready") === "1"`);
    await page.emulateMedia({ media: "print" });
    const sections = await page.$$("section.page");
    for (const n of s.pages) {
      const file = path.join(outDir, `${s.prefix}-p${String(n).padStart(2, "0")}.jpg`);
      await sections[n - 1].screenshot({ path: file, type: "jpeg", quality: 82 });
      console.log("ok", file);
    }
    await page.close();
  }
  await browser.close();
}

async function main() {
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  const shotDir = arg("screenshots");
  if (shotDir) return screenshots(shotDir, executablePath);

  const check = checkChildName(arg("name", "Miguel")!);
  if (!check.ok) throw new Error(check.reason);
  const age = arg("age", "5-7") as AgeGroup;
  const style = arg("style", "colorful") as IllustrationStyle;
  if (!AGE_GROUPS.includes(age)) throw new Error("--age deve ser 2-4, 5-7 ou 8-10");
  if (!ILLUSTRATION_STYLES.includes(style)) throw new Error("--style deve ser colorful ou watercolor");
  const out = arg("out", `./tmp/livro-${age}-${style}.pdf`)!;

  const input: BookInput = { childName: check.name, ageGroup: age, style };
  const renderer = new PlaywrightPdfRenderer(executablePath);
  const t0 = Date.now();
  try {
    const html = renderBookHtml(input, { fontCss: await fontFaceCssEmbedded() });
    const pages = expectedPageCount(input);
    const { pdf } = await renderer.render(html, { expectedName: input.childName, expectedPages: pages });
    const result = await validatePdf(pdf, { pages, childName: input.childName });
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, pdf);
    console.log(JSON.stringify({ out, ms: Date.now() - t0, ...result, namePages: result.namePages.length }, null, 2));
  } finally {
    await renderer.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
