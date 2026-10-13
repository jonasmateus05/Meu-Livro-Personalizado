import { existsSync } from "node:fs";

/**
 * Chromium usado nos testes: CHROMIUM_EXECUTABLE_PATH, ou o do ambiente de
 * desenvolvimento, ou (undefined) o navegador instalado por
 * `npx playwright@1.56.1 install chromium`. Os testes de PDF NUNCA são pulados:
 * sem Chromium eles falham, para não esconder falta de cobertura.
 */
export const CHROMIUM: string | undefined =
  process.env.CHROMIUM_EXECUTABLE_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
