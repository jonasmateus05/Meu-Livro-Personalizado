import { readFile } from "node:fs/promises";
import path from "node:path";
import { FONT_FILES, FONT_RANGES } from "./fonts";

/** CSS com fontes embutidas em base64 (PDF: nada depende de rede). Somente servidor. */
export async function fontFaceCssEmbedded(fontsDir = process.env.FONTS_DIR ?? path.join(process.cwd(), "public", "fonts")): Promise<string> {
  const parts = await Promise.all(
    FONT_FILES.map(async (f) => {
      const data = await readFile(path.join(fontsDir, f.file));
      return `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:block;src:url(data:font/woff2;base64,${data.toString("base64")}) format('woff2');unicode-range:${FONT_RANGES[f.subset]}}`;
    }),
  );
  return parts.join("");
}
