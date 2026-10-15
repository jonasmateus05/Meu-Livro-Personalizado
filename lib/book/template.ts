import { asciiLetters, escapeHtml, fillTemplate, firstName } from "../names";
import { AGE_GROUP_LABELS, type AgeGroup, type IllustrationStyle } from "../validation";
import { illustrationSvg, itemSvg, type ArtMode, type ItemId } from "./illustrations";
import { BOOK_TEXTS, STORIES, type Story } from "./stories";
import { buildWordSearch, seedFrom, type WordSearch } from "./wordsearch";

/**
 * Modelo editorial reutilizável do livro (HTML/CSS impresso em A4 pelo Chromium).
 *
 * Função pura: não acessa rede nem disco. O mesmo módulo é usado
 *   - pelo worker, para gerar o PDF (fontes embutidas);
 *   - pela página de vendas, para a prévia da capa em tempo real (fontes por URL).
 *
 * Garantias de layout:
 *   - cada página tem tamanho fixo (.page) e área de conteúdo com overflow oculto;
 *   - textos de tamanho variável (nome na capa) usam autoajuste (data-autofit);
 *   - o renderizador verifica, no navegador, se ALGUM conteúdo transbordou e
 *     recusa o PDF nesse caso (ver pdf.ts).
 */

export const TEMPLATE_VERSION = "v1";

export type BookInput = {
  childName: string;
  ageGroup: AgeGroup;
  style: IllustrationStyle;
};

export type RenderOptions = {
  /** @font-face CSS (embutido para PDF, por URL na web). */
  fontCss: string;
  /** "full" = livro completo; "sample" = amostra com marca d'água; "cover" = só capa; "pages" = páginas escolhidas. */
  variant?: "full" | "sample" | "cover" | "pages";
  /** Com variant "pages": números das páginas (1 = capa). */
  pages?: number[];
  /** Fundo transparente fora da página (vitrine na web). */
  bare?: boolean;
};

type PageHtml = { html: string; kind: string };

const STORY_START_PAGE = 6;
const PAGES_PER_STORY = 3;

const THEMES: Record<IllustrationStyle, Record<string, string>> = {
  colorful: {
    "--primary": "#5b3fb8",
    "--primary-soft": "#efe9ff",
    "--accent": "#ff7a59",
    "--accent-soft": "#fff0e8",
    "--sun": "#ffc93c",
    "--ink": "#2d2340",
    "--muted": "#655c78",
    "--paper": "#fffdf7",
    "--frame": "#2d2340",
  },
  watercolor: {
    "--primary": "#6f5fa3",
    "--primary-soft": "#f3f0fa",
    "--accent": "#d98b6b",
    "--accent-soft": "#fbf1ec",
    "--sun": "#f2cf7d",
    "--ink": "#3f3a52",
    "--muted": "#6f6a80",
    "--paper": "#fffdf9",
    "--frame": "#bdb3d6",
  },
};

const AGE_VARS: Record<AgeGroup, Record<string, string>> = {
  "2-4": { "--story-size": "24pt", "--story-lh": "1.45", "--body-size": "15pt" },
  "5-7": { "--story-size": "14.5pt", "--story-lh": "1.5", "--body-size": "12.5pt" },
  "8-10": { "--story-size": "12.2pt", "--story-lh": "1.48", "--body-size": "11.5pt" },
};

function cssVars(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

export const BOOK_CSS = `
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'Nunito',sans-serif;color:var(--ink);background:#e9e6ef;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:var(--body-size);line-height:1.45}
@media print{body{background:none}}
body.bare{background:transparent}
body.bare .page{margin:0;box-shadow:none}
h1,h2,h3,.display{font-family:'Fredoka',sans-serif;font-weight:600;margin:0;line-height:1.12}
p{margin:0 0 .7em}
.nm{font-weight:800;color:var(--primary)}
.page{position:relative;width:210mm;height:297mm;overflow:hidden;background:var(--paper);page-break-after:always;break-after:page;margin:0 auto}
.page:last-child{page-break-after:auto;break-after:auto}
@media screen{.page{margin:0 auto 8mm;box-shadow:0 4px 18px rgba(0,0,0,.12)}}
.content{position:absolute;top:16mm;left:17mm;right:17mm;bottom:22mm;overflow:hidden;overflow-wrap:break-word}
.folio{position:absolute;bottom:9mm;left:0;right:0;text-align:center;font-family:'Fredoka',sans-serif;font-weight:500;font-size:10pt;color:var(--muted)}
.folio span{display:inline-block;min-width:9mm;padding:1mm 3mm;border-radius:99px;background:var(--primary-soft)}
.frame{position:absolute;inset:7mm;border:1.2mm solid var(--primary-soft);border-radius:8mm;pointer-events:none}
.chip{display:inline-block;font-family:'Fredoka',sans-serif;font-weight:600;font-size:10.5pt;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--accent);border-radius:99px;padding:1.3mm 4mm}
.ref{font-family:'Fredoka',sans-serif;font-weight:500;color:var(--muted);font-size:11.5pt}
.art{border-radius:6mm;overflow:hidden;border:.7mm solid var(--frame)}
.art svg{display:block;width:100%;height:100%}
/* capa */
.cover{background:var(--primary-soft)}
.cover .cover-art{position:absolute;top:14mm;left:14mm;right:14mm;height:150mm;border-radius:9mm;overflow:hidden;border:1mm solid var(--frame)}
.cover .cover-art svg{width:100%;height:100%;display:block}
.cover .cover-text{position:absolute;top:172mm;left:14mm;right:14mm;bottom:14mm;background:var(--paper);border-radius:9mm;border:1mm solid var(--frame);padding:8mm 10mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden}
.cover-kicker{font-family:'Fredoka',sans-serif;font-weight:500;font-size:22pt;color:var(--muted)}
.autofit{width:100%;overflow:hidden;display:flex;align-items:center;justify-content:center}
.autofit>.fit-inner{width:100%;text-align:center;overflow-wrap:normal;word-break:normal}
.autofit.break>.fit-inner{overflow-wrap:anywhere}
.cover-name{height:44mm;font-family:'Fredoka',sans-serif;font-weight:700;line-height:1.05;color:var(--primary)}
.cover-name .nm{font-weight:700}
.cover-sub{font-size:13.5pt;font-weight:700;color:var(--ink);margin-top:3mm}
.cover-age{margin-top:3mm;font-family:'Fredoka',sans-serif;font-weight:500;font-size:11pt;color:#fff;background:var(--primary);border-radius:99px;padding:1.2mm 5mm}
/* páginas de texto */
.title-xl{font-size:30pt;color:var(--primary)}
.title-l{font-size:22pt;color:var(--primary)}
.lead{font-size:calc(var(--body-size) * 1.15)}
.owner{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;gap:6mm}
.owner .owner-name{height:36mm;font-family:'Fredoka',sans-serif;font-weight:700;color:var(--primary)}
.photo-box{width:120mm;height:120mm;border:1mm dashed var(--frame);border-radius:8mm;display:flex;align-items:center;justify-content:center;color:var(--muted);font-weight:700;font-size:12pt;padding:8mm;text-align:center}
.letter p{font-size:calc(var(--body-size) * 1.12);line-height:1.6}
.letter .hello{font-family:'Fredoka',sans-serif;font-size:26pt;color:var(--primary);margin-bottom:6mm}
.letter-art{height:85mm;margin-top:8mm}
.family p{font-size:var(--body-size);line-height:1.6}
.box{background:var(--primary-soft);border-radius:5mm;padding:5mm 6mm;margin:0 0 5mm}
.box.accent{background:var(--accent-soft)}
.box h3{font-size:14pt;color:var(--primary);margin-bottom:2mm}
.toc ol{list-style:none;padding:0;margin:6mm 0 0}
.toc li{display:flex;align-items:baseline;gap:3mm;padding:2.6mm 0;border-bottom:.3mm dashed var(--frame);font-size:13pt}
.toc li .t{font-weight:700}
.toc li .r{color:var(--muted);font-size:10.5pt}
.toc li .p{margin-left:auto;font-family:'Fredoka',sans-serif;font-weight:600;color:var(--primary)}
/* histórias */
.story-open{display:flex;flex-direction:column}
.story-open .head{text-align:center;margin-bottom:6mm}
.story-open h2{font-size:28pt;color:var(--primary);margin:4mm 0 2mm}
.story-open .art{aspect-ratio:4/3;width:100%}
.story-open .before{margin-top:8mm;text-align:center;background:var(--primary-soft);border-radius:6mm;padding:6mm 8mm}
.story-open .before h3{font-size:14pt;color:var(--primary);margin-bottom:2mm}
.story-open .before p{margin:0;font-size:calc(var(--body-size) * 1.1)}
.story-text h2{font-size:18pt;color:var(--primary);margin-bottom:5mm}
.story-text p{font-size:var(--story-size);line-height:var(--story-lh);margin-bottom:.75em}
.age-2-4 .story-text p{margin-bottom:.9em}
.vignette{position:absolute;bottom:0;right:0;width:62mm;height:46.5mm;border-radius:5mm;overflow:hidden;border:.6mm solid var(--frame);opacity:.95}
.age-8-10 .vignette{display:none}
.age-2-4 .vignette{width:120mm;height:90mm;right:28mm}
.reflect h2{font-size:20pt;color:var(--primary);margin-bottom:5mm}
.reflect .box p{margin:0;font-size:var(--body-size);line-height:1.55}
.prayer{background:var(--accent-soft);border:.7mm solid var(--accent);border-radius:6mm;padding:6mm 7mm;margin-bottom:5mm;position:relative}
.prayer h3{font-size:15pt;color:var(--accent);margin-bottom:2mm}
.prayer p{margin:0;font-size:calc(var(--body-size) * 1.08);line-height:1.6;font-weight:700}
.questions ul{margin:2mm 0 0;padding-left:6mm}
.questions li{margin-bottom:1.5mm;font-size:var(--body-size)}
/* atividades */
.activity h2{font-size:22pt;color:var(--primary);margin-bottom:2mm}
.activity .hint{color:var(--muted);margin-bottom:5mm}
.coloring .art{height:190mm;border-width:.5mm;border-color:#2b2b2b}
.count-row{display:flex;align-items:center;gap:4mm;padding:3mm 0;border-bottom:.3mm dashed var(--frame)}
.count-items{display:flex;flex-wrap:wrap;gap:1mm;flex:1}
.count-items svg{width:20mm;height:17.5mm}
.count-nums{display:flex;gap:2.5mm}
.count-nums span{width:10mm;height:10mm;border-radius:50%;border:.5mm solid var(--frame);display:flex;align-items:center;justify-content:center;font-family:'Fredoka',sans-serif;font-weight:600;font-size:13pt}
.ws{border-collapse:collapse;margin:0 auto}
.ws td{border:.3mm solid var(--frame);text-align:center;font-family:'Fredoka',sans-serif;font-weight:600;color:var(--ink)}
.ws td.hit{background:var(--sun)}
.ws-words{display:flex;flex-wrap:wrap;gap:2mm 3mm;justify-content:center;margin-top:6mm}
.ws-words span{border:.4mm solid var(--frame);border-radius:99px;padding:1mm 3.5mm;font-weight:800;font-size:11pt}
.match{display:grid;grid-template-columns:1fr 24mm 1fr;row-gap:7mm;margin-top:8mm;align-items:center}
.match .l,.match .r{border:.5mm solid var(--frame);border-radius:4mm;padding:3.5mm 4mm;font-weight:800;font-size:13pt;background:var(--primary-soft)}
.match .r{background:var(--accent-soft)}
.match .dot{display:flex;justify-content:space-between}
.match .dot i{width:3.5mm;height:3.5mm;border-radius:50%;background:var(--ink);display:block}
.draw-box{border:.8mm dashed var(--frame);border-radius:6mm;height:200mm}
.lines div{height:12mm;border-bottom:.4mm solid var(--frame)}
.answers{display:grid;grid-template-columns:1fr 1fr;gap:8mm;align-items:start}
.answers .ws td{font-size:8pt;width:5.5mm;height:5.5mm}
.bedtime{background:var(--night,#2b335f)}
.bedtime .content{color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.bedtime h2{font-size:28pt;color:var(--sun);margin-bottom:8mm}
.bedtime p{font-size:calc(var(--body-size) * 1.25);line-height:1.7;max-width:150mm}
.bedtime .moon{width:30mm;height:30mm;border-radius:50%;box-shadow:-7mm 2mm 0 0 var(--sun);margin:0 0 10mm 10mm}
.bedtime .nm{color:var(--sun)}
.bedtime .folio span{background:rgba(255,255,255,.15);color:#fff}
.stars i{position:absolute;width:2mm;height:2mm;border-radius:50%;background:#fff6c8}
.closing{text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:6mm}
.closing .art{width:150mm;height:112.5mm}
.credits{font-size:9pt;color:var(--muted);line-height:1.5;margin-top:auto}
.refs{font-size:10pt;color:var(--muted);columns:2;column-gap:8mm;text-align:left;width:100%}
/* amostra */
.watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5}
.watermark span{transform:rotate(-30deg);font-family:'Fredoka',sans-serif;font-weight:700;font-size:70pt;color:rgba(91,63,184,.13);letter-spacing:.1em}
`;

const AUTOFIT_SCRIPT = `
(function(){
  function overflows(el){var i=el.firstElementChild;return i.scrollHeight>el.clientHeight+1||i.scrollWidth>el.clientWidth+1||el.scrollWidth>el.clientWidth+1}
  function fit(el){
    var max=parseFloat(el.getAttribute('data-max')),min=parseFloat(el.getAttribute('data-min')),s=max;
    el.classList.remove('break');el.style.fontSize=s+'pt';
    while(s>min&&overflows(el)){s-=1;el.style.fontSize=s+'pt';}
    if(overflows(el)){el.classList.add('break');}
  }
  function run(){document.querySelectorAll('[data-autofit]').forEach(fit);document.documentElement.setAttribute('data-ready','1');}
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(run);}else{run();}
})();`;

// ---------------------------------------------------------------------------

function t(text: string, name: string): string {
  return fillTemplate(text, { nome: name });
}

function folio(n: number): string {
  return `<div class="folio"><span>${n}</span></div>`;
}

function page(kind: string, inner: string, n: number | null, extra = ""): PageHtml {
  return {
    kind,
    html: `<section class="page ${kind}" data-kind="${kind}"${extra}>${inner}${n === null ? "" : folio(n)}</section>`,
  };
}

function autofit(cls: string, html: string, max: number, min: number): string {
  return `<div class="autofit ${cls}" data-autofit data-max="${max}" data-min="${min}" style="font-size:${max}pt"><div class="fit-inner">${html}</div></div>`;
}

function artMode(style: IllustrationStyle): ArtMode {
  return style;
}

export function coverPage(input: BookInput): PageHtml {
  const name = escapeHtml(input.childName);
  return page(
    "cover",
    `<div class="cover-art">${illustrationSvg("cover", artMode(input.style), { uid: "cov" })}</div>
     <div class="cover-text content-like">
       <div class="cover-kicker">A Bíblia de</div>
       ${autofit("cover-name", `<span class="nm">${name}</span>`, 60, 18)}
       <div class="cover-sub">${escapeHtml(BOOK_TEXTS.coverSubtitle)}</div>
       <div class="cover-age">Edição para ${escapeHtml(AGE_GROUP_LABELS[input.ageGroup])}</div>
     </div>`,
    null,
  );
}

function ownerPage(input: BookInput, n: number): PageHtml {
  return page(
    "owner-page",
    `<div class="frame"></div><div class="content"><div class="owner">
       <div class="title-l">${escapeHtml(BOOK_TEXTS.ownerTitle)}</div>
       ${autofit("owner-name", `<span class="nm">${escapeHtml(input.childName)}</span>`, 40, 16)}
       <div class="photo-box">Cole aqui uma foto ou faça um desenho de você</div>
     </div></div>`,
    n,
  );
}

function welcomePage(input: BookInput, n: number): PageHtml {
  const [hello, ...rest] = BOOK_TEXTS.welcome[input.ageGroup];
  return page(
    "welcome",
    `<div class="content letter">
       <div class="hello">${t(hello, input.childName)}</div>
       ${rest.map((p) => `<p>${t(p, input.childName)}</p>`).join("")}
       <div class="art letter-art">${illustrationSvg("children", artMode(input.style), { uid: "wel" })}</div>
     </div>`,
    n,
  );
}

function familyPage(input: BookInput, n: number): PageHtml {
  return page(
    "family",
    `<div class="content family">
       <h2 class="title-l" style="margin-bottom:6mm">Para a família</h2>
       ${BOOK_TEXTS.forFamily.map((p, i) => `<div class="box${i % 2 ? " accent" : ""}"><p style="margin:0">${t(p, input.childName)}</p></div>`).join("")}
       <p style="color:var(--muted)">Faixa etária desta edição: ${escapeHtml(AGE_GROUP_LABELS[input.ageGroup])}.</p>
     </div>`,
    n,
  );
}

function tocPage(entries: { title: string; ref?: string; page: number }[], n: number): PageHtml {
  return page(
    "toc",
    `<div class="content toc">
       <h2 class="title-l">Sumário</h2>
       <ol>${entries
         .map((e) => `<li><span class="t">${escapeHtml(e.title)}</span>${e.ref ? `<span class="r">${escapeHtml(e.ref)}</span>` : ""}<span class="p">${e.page}</span></li>`)
         .join("")}</ol>
     </div>`,
    n,
  );
}

function storyPages(input: BookInput, story: Story, index: number, startPage: number): PageHtml[] {
  const mode = artMode(input.style);
  const name = input.childName;
  const open = page(
    "story-open",
    `<div class="content story-open">
       <div class="head"><span class="chip">História ${index + 1}</span><h2>${escapeHtml(story.title)}</h2><div class="ref">Recontada a partir de ${escapeHtml(story.reference)}</div></div>
       <div class="art">${illustrationSvg(story.illustration, mode, { uid: `s${index}a` })}</div>
       <div class="before"><h3>Antes de ler, <span class="nm">${escapeHtml(name)}</span></h3><p>Observe a ilustração. ${t(story.questions[input.ageGroup][0], name)}</p></div>
     </div>`,
    startPage,
  );
  const text = page(
    "story-text",
    `<div class="content story-text">
       <h2>${escapeHtml(story.title)}</h2>
       ${story.paragraphs[input.ageGroup].map((p) => `<p>${t(p, name)}</p>`).join("")}
       <div class="vignette">${illustrationSvg(story.illustration, mode, { uid: `s${index}b` })}</div>
     </div>`,
    startPage + 1,
  );
  const prayer = input.ageGroup === "2-4" ? story.prayer.short : story.prayer.full;
  const qTitle = input.ageGroup === "2-4" ? "Aponte e responda" : "Vamos conversar";
  const reflect = page(
    "reflect",
    `<div class="content reflect">
       <h2>${escapeHtml(story.title)}: para pensar e orar</h2>
       <div class="box"><h3>O que aprendemos</h3><p>${t(story.lesson[input.ageGroup], name)}</p></div>
       <div class="box accent"><h3>Para praticar</h3><p>${t(story.practice[input.ageGroup], name)}</p></div>
       <div class="prayer"><h3>Vamos orar</h3><p>${t(prayer, name)}</p></div>
       <div class="box questions"><h3>${qTitle}</h3><ul>${story.questions[input.ageGroup].map((q) => `<li>${t(q, name)}</li>`).join("")}</ul></div>
     </div>`,
    startPage + 2,
  );
  return [open, text, reflect];
}

function coloringPage(input: BookInput, id: "ark" | "nativity" | "creation", title: string, n: number): PageHtml {
  return page(
    "activity coloring",
    `<div class="content activity">
       <h2>Hora de colorir!</h2>
       <p class="hint">${escapeHtml(title)} Pinte com as cores que <span class="nm">${escapeHtml(input.childName)}</span> quiser.</p>
       <div class="art">${illustrationSvg(id, "lineart", { uid: `col-${id}` })}</div>
     </div>`,
    n,
  );
}

function countingPage(input: BookInput, n: number): PageHtml {
  const rows: { item: ItemId; count: number; label: string }[] = [
    { item: "sheep", count: 3, label: "ovelhas" },
    { item: "fish", count: 2, label: "peixes" },
    { item: "loaf", count: 5, label: "pães" },
    { item: "lion", count: 1, label: "leão" },
    { item: "star", count: 4, label: "estrelas" },
    { item: "dove", count: 2, label: "pombas" },
  ];
  const mode = artMode(input.style);
  return page(
    "activity counting",
    `<div class="content activity">
       <h2>Conte e circule</h2>
       <p class="hint">Conte os desenhos de cada linha e circule o número certo. Um adulto pode ajudar!</p>
       ${rows
         .map(
           (r) =>
             `<div class="count-row" aria-label="${r.label}"><div class="count-items">${Array.from({ length: r.count }, () => itemSvg(r.item, mode)).join("")}</div><div class="count-nums">${[1, 2, 3, 4, 5].map((k) => `<span>${k}</span>`).join("")}</div></div>`,
         )
         .join("")}
     </div>`,
    n,
  );
}

export function wordSearchFor(input: BookInput): WordSearch {
  const big = input.ageGroup === "8-10";
  const base = big
    ? ["CRIACAO", "ARCA", "NOE", "MOISES", "DAVI", "DANIEL", "JONAS", "JESUS", "PASTORES", "PAES", "ORACAO"]
    : ["ARCA", "LUZ", "DAVI", "LEAO", "PEIXE", "BARCO", "PAES", "JESUS"];
  const size = big ? 12 : 9;
  const nameWord = asciiLetters(firstName(input.childName));
  const words = nameWord.length >= 3 && nameWord.length <= size ? [nameWord, ...base] : base;
  return buildWordSearch(words, size, seedFrom(`${input.childName}|${input.ageGroup}`), big);
}

function wsTable(ws: WordSearch, cellMm: number, highlight: boolean): string {
  const hits = new Set<string>();
  if (highlight) for (const p of ws.placements) for (let i = 0; i < p.word.length; i++) hits.add(`${p.row + p.dr * i}:${p.col + p.dc * i}`);
  return `<table class="ws" aria-label="Caça-palavras">${ws.grid
    .map(
      (row, r) =>
        `<tr>${row.map((ch, c) => `<td class="${hits.has(`${r}:${c}`) ? "hit" : ""}" style="width:${cellMm}mm;height:${cellMm}mm;font-size:${(cellMm * 1.45).toFixed(1)}pt">${ch}</td>`).join("")}</tr>`,
    )
    .join("")}</table>`;
}

function wordSearchPage(input: BookInput, ws: WordSearch, n: number): PageHtml {
  const cell = ws.size >= 12 ? 13 : 16;
  const dirs = input.ageGroup === "8-10" ? "na horizontal, na vertical e na diagonal" : "na horizontal e na vertical";
  return page(
    "activity wordsearch",
    `<div class="content activity">
       <h2>Caça-palavras</h2>
       <p class="hint">Encontre as palavras escondidas ${dirs}. As palavras estão sem acento.</p>
       ${wsTable(ws, cell, false)}
       <div class="ws-words">${ws.words.map((w) => `<span>${w}</span>`).join("")}</div>
     </div>`,
    n,
  );
}

const MATCH_PAIRS: [string, string][] = [
  ["Noé", "a grande arca"],
  ["Moisés", "o caminho no mar"],
  ["Davi", "a funda e as pedras"],
  ["Daniel", "os leões"],
  ["Jonas", "o grande peixe"],
];
const MATCH_ORDER = [3, 0, 4, 1, 2];

function matchPage(n: number): PageHtml {
  const right = MATCH_ORDER.map((i) => MATCH_PAIRS[i][1]);
  return page(
    "activity match",
    `<div class="content activity">
       <h2>Ligue os pares</h2>
       <p class="hint">Trace uma linha ligando cada personagem ao que aparece na sua história.</p>
       <div class="match">${MATCH_PAIRS.map(
         ([l], i) => `<div class="l">${escapeHtml(l)}</div><div class="dot"><i></i><i></i></div><div class="r">${escapeHtml(right[i])}</div>`,
       ).join("")}</div>
     </div>`,
    n,
  );
}

function drawPage(input: BookInput, n: number): PageHtml {
  return page(
    "activity draw",
    `<div class="content activity">
       <h2>Meu desenho</h2>
       <p class="hint">Desenhe <span class="nm">${escapeHtml(input.childName)}</span> com a família fazendo uma oração juntos.</p>
       <div class="draw-box"></div>
     </div>`,
    n,
  );
}

function gratitudePage(input: BookInput, n: number): PageHtml {
  return page(
    "activity gratitude",
    `<div class="content activity">
       <h2>Meu caderno de gratidão</h2>
       <p class="hint">Escreva (ou peça ajuda para escrever) coisas pelas quais você quer agradecer a Deus esta semana.</p>
       <div class="lines">${Array.from({ length: input.ageGroup === "8-10" ? 15 : 12 }, () => "<div></div>").join("")}</div>
     </div>`,
    n,
  );
}

function answersPage(ws: WordSearch, n: number): PageHtml {
  return page(
    "activity answers",
    `<div class="content activity">
       <h2>Respostas</h2>
       <p class="hint">Para conferir depois de brincar.</p>
       <div class="answers">
         <div><h3 style="margin-bottom:3mm">Caça-palavras</h3>${wsTable(ws, 6.5, true)}</div>
         <div><h3 style="margin-bottom:3mm">Ligue os pares</h3><ul>${MATCH_PAIRS.map(([l, r]) => `<li><b>${escapeHtml(l)}</b> — ${escapeHtml(r)}</li>`).join("")}</ul></div>
       </div>
     </div>`,
    n,
  );
}

function bedtimePage(input: BookInput, n: number): PageHtml {
  const stars = [
    [20, 30], [60, 18], [150, 26], [185, 50], [30, 120], [190, 140], [15, 230], [180, 250], [100, 270], [45, 75],
  ]
    .map(([x, y]) => `<i style="left:${x}mm;top:${y}mm"></i>`)
    .join("");
  return page(
    "bedtime",
    `<div class="stars">${stars}</div><div class="content"><div class="moon"></div><h2>${escapeHtml(BOOK_TEXTS.bedtime.title)}</h2><p>${t(BOOK_TEXTS.bedtime[input.ageGroup], input.childName)}</p></div>`,
    n,
  );
}

function closingPage(input: BookInput, n: number): PageHtml {
  return page(
    "closing-page",
    `<div class="frame"></div><div class="content"><div class="closing">
       <h2 class="title-xl">${escapeHtml(BOOK_TEXTS.closing.title)}</h2>
       <p class="lead">${t(BOOK_TEXTS.closing.text, input.childName)}</p>
       <div class="art">${illustrationSvg("cover", artMode(input.style), { uid: "end" })}</div>
       <div class="refs"><b>Para ler na Bíblia:</b><br>${STORIES.map((s) => `${escapeHtml(s.title)} — ${escapeHtml(s.reference)}`).join("<br>")}</div>
       <p class="credits">${escapeHtml(BOOK_TEXTS.credits)}<br>Modelo editorial ${TEMPLATE_VERSION}.</p>
     </div></div>`,
    n,
  );
}

/** Monta a lista de páginas do livro completo. */
export function buildPages(input: BookInput): PageHtml[] {
  const pages: PageHtml[] = [];
  pages.push(coverPage(input));
  pages.push(ownerPage(input, 2));
  pages.push(welcomePage(input, 3));
  pages.push(familyPage(input, 4));
  // Sumário é inserido na posição 5 depois de conhecer as páginas.
  const storyPagesAll: PageHtml[] = [];
  const toc: { title: string; ref?: string; page: number }[] = [];
  STORIES.forEach((story, i) => {
    const start = STORY_START_PAGE + i * PAGES_PER_STORY;
    toc.push({ title: `${i + 1}. ${story.title}`, ref: story.reference, page: start });
    storyPagesAll.push(...storyPages(input, story, i, start));
  });
  let n = STORY_START_PAGE + STORIES.length * PAGES_PER_STORY;
  const activities: PageHtml[] = [];
  const activitiesStart = n;
  activities.push(coloringPage(input, "ark", "A arca de Noé.", n++));
  activities.push(coloringPage(input, "nativity", "O nascimento de Jesus.", n++));
  if (input.ageGroup === "2-4") {
    activities.push(countingPage(input, n++));
    activities.push(drawPage(input, n++));
  } else {
    const ws = wordSearchFor(input);
    activities.push(wordSearchPage(input, ws, n++));
    activities.push(matchPage(n++));
    activities.push(drawPage(input, n++));
    activities.push(gratitudePage(input, n++));
    activities.push(answersPage(ws, n++));
  }
  toc.push({ title: "Atividades", page: activitiesStart });
  const bedtimeAt = n;
  toc.push({ title: BOOK_TEXTS.bedtime.title, page: bedtimeAt });
  const bedtime = bedtimePage(input, n++);
  const closing = closingPage(input, n++);
  pages.push(tocPage(toc, 5));
  pages.push(...storyPagesAll, ...activities, bedtime, closing);
  return pages;
}

function documentHtml(input: BookInput, opts: RenderOptions, pages: PageHtml[]): string {
  const theme = cssVars({ ...THEMES[input.style], ...AGE_VARS[input.ageGroup], "--night": input.style === "colorful" ? "#26305f" : "#4a5583" });
  const watermark = opts.variant === "sample" ? `<div class="watermark"><span>AMOSTRA</span></div>` : "";
  const body = pages.map((p) => (watermark ? p.html.replace("</section>", `${watermark}</section>`) : p.html)).join("\n");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>A Bíblia de ${escapeHtml(input.childName)}</title><style>${opts.fontCss}</style><style>:root{${theme}}${BOOK_CSS}</style></head><body class="age-${input.ageGroup} style-${input.style}${opts.bare ? " bare" : ""}">${body}<script>${AUTOFIT_SCRIPT}</script></body></html>`;
}

/** HTML completo do livro (ou amostra/capa). */
export function renderBookHtml(input: BookInput, opts: RenderOptions): string {
  const variant = opts.variant ?? "full";
  let pages: PageHtml[];
  if (variant === "cover") pages = [coverPage(input)];
  else if (variant === "pages") {
    const all = buildPages(input);
    pages = (opts.pages ?? [1]).map((n) => all[n - 1]).filter(Boolean);
  }
  else if (variant === "sample") {
    const all = buildPages(input);
    // capa, carta de boas-vindas e a primeira história completa
    pages = [all[0], all[2], ...all.slice(STORY_START_PAGE - 1, STORY_START_PAGE - 1 + PAGES_PER_STORY)];
  } else pages = buildPages(input);
  return documentHtml(input, opts, pages);
}

export function expectedPageCount(input: BookInput): number {
  return buildPages(input).length;
}
