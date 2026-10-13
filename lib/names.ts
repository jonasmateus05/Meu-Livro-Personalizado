/**
 * Tratamento seguro do nome da criança.
 *
 * - Normaliza para NFC (acentos compostos, ex.: "é" e "e"+"´" viram o mesmo texto).
 * - Remove espaços extras e caracteres de controle/invisíveis.
 * - Aceita letras de qualquer alfabeto latino com acentos, espaço, hífen,
 *   apóstrofo e ponto (ex.: "Ana-Lívia", "D'Ávila", "João P.").
 * - Escapa HTML na hora de inserir no template (nunca concatenar sem escapar).
 */

export const CHILD_NAME_MAX = 40;

// Letras (com marcas combinantes), espaço, hífen, apóstrofos e ponto.
const ALLOWED = /^[\p{L}\p{M}][\p{L}\p{M} '’.\-]*$/u;

export function normalizeChildName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\u2019/g, "'")
    .trim();
}

export type NameCheck = { ok: true; name: string } | { ok: false; reason: string };

export function checkChildName(raw: string): NameCheck {
  const name = normalizeChildName(raw);
  if (name.length === 0) return { ok: false, reason: "Informe o nome da criança." };
  if ([...name].length > CHILD_NAME_MAX) {
    return { ok: false, reason: `Use no máximo ${CHILD_NAME_MAX} caracteres.` };
  }
  if (!ALLOWED.test(name)) {
    return { ok: false, reason: "Use apenas letras, espaços, hífen, apóstrofo ou ponto." };
  }
  if (/[ '.\-]{2,}/.test(name.replace(/\. /g, "."))) {
    return { ok: false, reason: "Revise a pontuação do nome." };
  }
  return { ok: true, name };
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * Substitui {nome} (e outros marcadores conhecidos) em um texto do modelo
 * editorial. O texto do modelo é escapado e o valor também — o resultado é
 * HTML seguro. Marcadores desconhecidos geram erro (evita "{nmoe}" impresso).
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  const parts = template.split(/(\{[a-zA-Z_]+\})/g);
  return parts
    .map((part) => {
      const m = /^\{([a-zA-Z_]+)\}$/.exec(part);
      if (!m) return escapeHtml(part);
      const value = values[m[1]];
      if (value === undefined) throw new Error(`Marcador desconhecido no modelo: ${part}`);
      return `<span class="nm">${escapeHtml(value)}</span>`;
    })
    .join("");
}

/** Versão em texto puro (e-mail em texto, nomes de arquivo etc.). */
export function fillTemplateText(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z_]+)\}/g, (all, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Marcador desconhecido no modelo: ${all}`);
    return value;
  });
}

/** Primeiro nome, para frases curtas ("Boa noite, Ana!"). */
export function firstName(name: string): string {
  return normalizeChildName(name).split(" ")[0] ?? name;
}

/** Remove acentos e mantém só A-Z (usado no caça-palavras e no nome do arquivo). */
export function asciiLetters(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export function fileSlug(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "crianca";
}
