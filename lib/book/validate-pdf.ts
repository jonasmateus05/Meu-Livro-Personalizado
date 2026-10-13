import { BookValidationError } from "./pdf";

/**
 * Validação do ARQUIVO PDF gerado (independente do navegador):
 * - assinatura %PDF e tamanho razoável;
 * - número de páginas igual ao esperado;
 * - texto extraível em todas as páginas;
 * - nome da criança presente (com acentos) na capa e no texto do livro.
 */

export type PdfCheck = { pageCount: number; byteSize: number; namePages: number[] };

const MAX_BYTES = 45 * 1024 * 1024;

function squash(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, "");
}

export async function validatePdf(pdf: Uint8Array, expected: { pages: number; childName: string }): Promise<PdfCheck> {
  if (pdf.byteLength < 1024) throw new BookValidationError("PDF vazio ou muito pequeno");
  if (pdf.byteLength > MAX_BYTES) throw new BookValidationError(`PDF grande demais (${pdf.byteLength} bytes)`);
  const header = Buffer.from(pdf.subarray(0, 5)).toString("latin1");
  if (header !== "%PDF-") throw new BookValidationError("Arquivo não é um PDF");

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: false, disableFontFace: true });
  const doc = await task.promise;
  try {
    if (doc.numPages !== expected.pages) {
      throw new BookValidationError(`PDF tem ${doc.numPages} páginas; esperado ${expected.pages}`);
    }
    const target = squash(expected.childName);
    const namePages: number[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((it) => ("str" in it ? it.str : "")).join("");
      if (squash(text).length === 0) throw new BookValidationError(`Página ${i} sem texto`);
      if (squash(text).includes(target)) namePages.push(i);
      page.cleanup();
    }
    if (!namePages.includes(1)) throw new BookValidationError("Nome da criança não encontrado na capa do PDF");
    if (namePages.length < 3) throw new BookValidationError("Nome da criança aparece em poucas páginas do PDF");
    return { pageCount: doc.numPages, byteSize: pdf.byteLength, namePages };
  } finally {
    await task.destroy();
  }
}
