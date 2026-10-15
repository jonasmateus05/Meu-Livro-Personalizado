import { buildPages, type BookInput } from "./book/template";

/** Dados compartilhados do funil (textos de FAQ, preço, depoimentos). */

export const FAQ = [
  {
    q: "É um livro impresso?",
    a: "Não. É um produto digital: um arquivo PDF em tamanho A4, enviado por e-mail. Você pode ler no celular, tablet ou computador e imprimir em casa ou numa gráfica, para uso pessoal e familiar.",
  },
  {
    q: "Quando recebo o livro?",
    a: "O PDF é produzido depois que a Cakto confirma o pagamento. Em seguida, enviamos um link seguro para o e-mail usado na compra. O tempo de confirmação depende do meio de pagamento escolhido no checkout.",
  },
  {
    q: "As histórias são fiéis à Bíblia?",
    a: "As dez histórias seguem os acontecimentos dos textos bíblicos indicados e são recontadas com palavras simples para a idade escolhida. Elas não são citações literais: ao lado de cada título há a referência bíblica para a família ler o texto completo.",
  },
  {
    q: "Posso usar nomes com acento ou nomes compostos?",
    a: "Sim. Acentos, cedilha, hífen e apóstrofo são preservados (ex.: “Ana Lívia”, “João Pedro”, “D'Ávila”). Use até 40 caracteres e confira a prévia da capa antes de pagar.",
  },
  {
    q: "Posso comprar livros para mais de uma criança?",
    a: "Sim. Faça uma personalização e uma compra para cada criança, mesmo usando o mesmo e-mail. Cada compra gera um livro separado.",
  },
  {
    q: "As ilustrações são de quem?",
    a: "Todas as ilustrações e textos foram criados especialmente para este livro. As fontes usadas têm licença aberta (SIL Open Font License).",
  },
  {
    q: "E se eu precisar de reembolso?",
    a: "Você pode desistir em até 7 dias após a compra (direito de arrependimento, art. 49 do Código de Defesa do Consumidor). Quando um pagamento é reembolsado ou contestado, o link de download daquele pedido é desativado.",
  },
  {
    q: "Quais dados vocês guardam?",
    a: "Apenas o necessário para produzir e entregar o livro: nome da criança, faixa etária e estilo escolhidos, e o e-mail do comprador informado pela Cakto. Dados de pagamento ficam com a Cakto.",
  },
];

/**
 * Depoimentos REAIS de clientes. Vazio de propósito: a seção só aparece
 * quando houver depoimentos verdadeiros (com autorização de quem escreveu).
 */
export const TESTIMONIALS: { text: string; author: string; detail?: string }[] = [];

export type Price = { current?: string; original?: string };

/** Converte "29.9", "29,90" ou "1.299,90" em número; inválido => undefined. */
export function parsePrice(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const t = raw.trim().replace(/^R\$\s*/i, "");
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  const n = Number(normalized);
  return n > 0 ? n : undefined;
}

export const formatBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Preço vem de variáveis de ambiente; o "de" só aparece se for maior que o atual. */
export function priceFromEnv(current?: string, original?: string): Price {
  const c = parsePrice(current);
  const o = parsePrice(original);
  return { current: c ? formatBRL(c) : undefined, original: c && o && o > c ? formatBRL(o) : undefined };
}

/** Números de página (1 = capa) das páginas mostradas no carrossel. */
export function showcasePages(input: BookInput): { page: number; caption: string }[] {
  const kinds = buildPages(input).map((p) => p.kind);
  const nth = (kind: string, n = 0) => {
    let seen = -1;
    for (let i = 0; i < kinds.length; i++) if (kinds[i] === kind && ++seen === n) return i + 1;
    return 1;
  };
  const coloring = kinds.findIndex((k) => k.includes("coloring")) + 1;
  return [
    { page: 1, caption: "Capa com o nome" },
    { page: nth("welcome"), caption: "Carta de boas-vindas" },
    { page: nth("story-open", 1), caption: "Abertura de cada história" },
    { page: nth("story-text", 1), caption: "A história, para a idade certa" },
    { page: nth("reflect", 1), caption: "Lição, prática e oração" },
    { page: coloring || 1, caption: "Páginas para colorir" },
    { page: nth("bedtime"), caption: "Oração antes de dormir" },
  ];
}
