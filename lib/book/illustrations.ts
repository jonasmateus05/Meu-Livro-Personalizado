/**
 * Ilustrações ORIGINAIS em SVG, desenhadas em código para este projeto.
 * Não dependem de arquivos externos (nada de imagem ausente no PDF) e mudam
 * de paleta conforme o estilo escolhido:
 *   - colorful:   cores vivas com contorno
 *   - watercolor: tons suaves + filtro de "aquarela"
 *   - lineart:    só contornos (páginas de colorir)
 */

export type IllustrationId =
  | "cover"
  | "creation"
  | "ark"
  | "sea"
  | "david"
  | "daniel"
  | "jonah"
  | "nativity"
  | "storm"
  | "loaves"
  | "children";

export type ArtMode = "colorful" | "watercolor" | "lineart";

type Palette = Record<
  | "skyTop" | "skyBottom" | "night" | "nightLow" | "sun" | "cloud" | "grass" | "grassDark" | "water" | "waterLight"
  | "wood" | "woodDark" | "sand" | "stone" | "stoneDark" | "red" | "orange" | "yellow" | "green" | "blue" | "purple"
  | "pink" | "skin1" | "skin2" | "skin3" | "hair" | "hair2" | "white" | "star" | "lion" | "mane" | "fish" | "bigFish"
  | "line" | "leaf" | "bread" | "glow",
  string
>;

const COLORFUL: Palette = {
  skyTop: "#6ec3ff", skyBottom: "#d4f0ff", night: "#24305e", nightLow: "#4b5aa0", sun: "#ffc93c", cloud: "#ffffff",
  grass: "#7bd37b", grassDark: "#4daa5f", water: "#3a9bf0", waterLight: "#8fd0ff", wood: "#c07a3a", woodDark: "#8c5222",
  sand: "#f3d38f", stone: "#b6a99a", stoneDark: "#8d7f72", red: "#ff6b6b", orange: "#ff9f43", yellow: "#ffd93d",
  green: "#3fbf7f", blue: "#4d8dff", purple: "#9b5de5", pink: "#f472b6", skin1: "#c98b5b", skin2: "#a5683f",
  skin3: "#e2b083", hair: "#3b2a1e", hair2: "#6b3f22", white: "#ffffff", star: "#fff3a0", lion: "#f2b24c",
  mane: "#c46a2b", fish: "#ff8c42", bigFish: "#5a8fd6", line: "#2d2340", leaf: "#58b85c", bread: "#e3a857", glow: "#fff7c2",
};

const WATERCOLOR: Palette = {
  skyTop: "#a9d6f2", skyBottom: "#eef7fb", night: "#4a5583", nightLow: "#7d86b5", sun: "#f9d98a", cloud: "#ffffff",
  grass: "#b6dcae", grassDark: "#8cc196", water: "#8cc0e6", waterLight: "#c4e2f5", wood: "#d2a57c", woodDark: "#a77b56",
  sand: "#f4e2b8", stone: "#cbc2b8", stoneDark: "#a99d92", red: "#f2a2a2", orange: "#f5c08f", yellow: "#f6e29a",
  green: "#9fd3b4", blue: "#9db8ef", purple: "#c4a8e8", pink: "#f3b7d3", skin1: "#d7a986", skin2: "#bf8d69",
  skin3: "#ecc7a6", hair: "#6b5444", hair2: "#8f6a4f", white: "#fffdf8", star: "#fff6c8", lion: "#f2cd8c",
  mane: "#d79a6b", fish: "#f6b48a", bigFish: "#9bb8e2", line: "#6d6380", leaf: "#9ccc9a", bread: "#ecc58f", glow: "#fffbe3",
};

type Ctx = {
  mode: ArtMode;
  c: (k: keyof Palette) => string;
  /** atributos de contorno */
  s: string;
  thin: string;
  uid: string;
};

function ctxFor(mode: ArtMode, uid: string): Ctx {
  const pal = mode === "watercolor" ? WATERCOLOR : COLORFUL;
  if (mode === "lineart") {
    return {
      mode,
      uid,
      c: (k) => (k === "line" ? "#2b2b2b" : "#ffffff"),
      s: 'stroke="#2b2b2b" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"',
      thin: 'stroke="#2b2b2b" stroke-width="1.8" stroke-linecap="round"',
    };
  }
  const stroke = mode === "colorful"
    ? 'stroke="#2d2340" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"'
    : 'stroke="#6d6380" stroke-width="1" stroke-opacity=".55" stroke-linejoin="round" stroke-linecap="round"';
  return {
    mode,
    uid,
    c: (k) => pal[k],
    s: stroke,
    thin: mode === "colorful" ? 'stroke="#2d2340" stroke-width="1.5" stroke-linecap="round"' : 'stroke="#6d6380" stroke-width="1" stroke-linecap="round"',
  };
}

// ---------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------

function sky(x: Ctx, top: keyof Palette = "skyTop", bottom: keyof Palette = "skyBottom", h = 300) {
  if (x.mode === "lineart") return "";
  const id = `${x.uid}-sky-${top}`;
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${x.c(top)}"/><stop offset="1" stop-color="${x.c(bottom)}"/></linearGradient></defs><rect x="0" y="0" width="400" height="${h}" fill="url(#${id})"/>`;
}

function sun(x: Ctx, cx: number, cy: number, r: number) {
  const rays = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI * 2) / 10;
    const x1 = cx + Math.cos(a) * (r + 6), y1 = cy + Math.sin(a) * (r + 6);
    const x2 = cx + Math.cos(a) * (r + 16), y2 = cy + Math.sin(a) * (r + 16);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${x.mode === "lineart" ? "#2b2b2b" : x.c("sun")}" stroke-width="4" stroke-linecap="round"/>`;
  }).join("");
  return `<g>${rays}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${x.c("sun")}" ${x.s}/></g>`;
}

function cloud(x: Ctx, cx: number, cy: number, k = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${k})"><path d="M-34 10 Q-40 -8 -20 -10 Q-16 -28 4 -24 Q18 -36 30 -18 Q46 -16 40 4 Q42 14 30 14 L-26 14 Q-36 14 -34 10Z" fill="${x.c("cloud")}" ${x.s}/></g>`;
}

function star(x: Ctx, cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }).join(" ");
  return `<polygon points="${pts}" fill="${x.c("star")}" ${x.thin}/>`;
}

function hills(x: Ctx, y = 220) {
  return `<path d="M0 ${y} Q80 ${y - 40} 170 ${y - 6} T400 ${y - 18} L400 300 L0 300Z" fill="${x.c("grassDark")}" ${x.s}/>` +
    `<path d="M0 ${y + 22} Q110 ${y - 4} 220 ${y + 18} T400 ${y + 12} L400 300 L0 300Z" fill="${x.c("grass")}" ${x.s}/>`;
}

function waves(x: Ctx, y: number, color: keyof Palette = "water", amp = 8) {
  let d = `M0 ${y}`;
  for (let i = 0; i < 400; i += 40) d += ` q10 ${-amp} 20 0 t20 0`;
  return `<path d="${d} L400 300 L0 300Z" fill="${x.c(color)}" ${x.s}/>`;
}

function flower(x: Ctx, cx: number, cy: number, color: keyof Palette) {
  const petals = [0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="${cx}" cy="${cy - 6}" rx="4" ry="6" transform="rotate(${a} ${cx} ${cy})" fill="${x.c(color)}" ${x.thin}/>`)
    .join("");
  return `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy + 16}" stroke="${x.mode === "lineart" ? "#2b2b2b" : x.c("grassDark")}" stroke-width="2.5"/>${petals}<circle cx="${cx}" cy="${cy}" r="3.5" fill="${x.c("yellow")}" ${x.thin}/>`;
}

function tree(x: Ctx, cx: number, base: number, k = 1) {
  return `<g transform="translate(${cx} ${base}) scale(${k})"><rect x="-7" y="-46" width="14" height="46" rx="4" fill="${x.c("wood")}" ${x.s}/><circle cx="0" cy="-62" r="28" fill="${x.c("leaf")}" ${x.s}/><circle cx="-20" cy="-48" r="18" fill="${x.c("leaf")}" ${x.s}/><circle cx="20" cy="-48" r="18" fill="${x.c("leaf")}" ${x.s}/><circle cx="-8" cy="-66" r="4" fill="${x.c("red")}" ${x.thin}/><circle cx="10" cy="-54" r="4" fill="${x.c("red")}" ${x.thin}/><circle cx="-14" cy="-44" r="4" fill="${x.c("red")}" ${x.thin}/></g>`;
}

type PersonOpts = {
  robe: keyof Palette;
  skin?: keyof Palette;
  hair?: keyof Palette;
  arms?: "down" | "up" | "out" | "pray" | "hold";
  veil?: keyof Palette;
  beard?: boolean;
  closedEyes?: boolean;
  kneel?: boolean;
};

/** Pessoa estilizada; (cx, base) = centro dos pés. Altura ~90 * k. */
function person(x: Ctx, cx: number, base: number, k: number, o: PersonOpts) {
  const skin = x.c(o.skin ?? "skin1");
  const robe = x.c(o.robe);
  const hair = x.c(o.hair ?? "hair");
  const bodyH = o.kneel ? 34 : 52;
  const bodyTop = -bodyH - 4;
  const headY = bodyTop - 16;
  const robePath = `M-16 -4 Q-18 ${bodyTop + 10} -10 ${bodyTop} L10 ${bodyTop} Q18 ${bodyTop + 10} 16 -4Z`;
  let arms = "";
  const armStroke = (d: string) =>
    `<path d="${d}" fill="none" stroke="${x.mode === "lineart" ? "#2b2b2b" : x.c("line")}" stroke-width="${x.mode === "lineart" ? 11.5 : 10.5}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${robe}" stroke-width="8" stroke-linecap="round"/>`;
  const hand = (hx: number, hy: number) => `<circle cx="${hx}" cy="${hy}" r="4.2" fill="${skin}" ${x.thin}/>`;
  const sh = bodyTop + 8;
  switch (o.arms ?? "down") {
    case "up":
      arms = armStroke(`M-9 ${sh} L-22 ${sh - 26}`) + armStroke(`M9 ${sh} L22 ${sh - 26}`) + hand(-22, sh - 28) + hand(22, sh - 28);
      break;
    case "out":
      arms = armStroke(`M-9 ${sh} L-30 ${sh + 2}`) + armStroke(`M9 ${sh} L30 ${sh - 14}`) + hand(-31, sh + 2) + hand(31, sh - 16);
      break;
    case "pray":
      arms = armStroke(`M-9 ${sh} L-2 ${sh + 10}`) + armStroke(`M9 ${sh} L2 ${sh + 10}`) + `<ellipse cx="0" cy="${sh + 7}" rx="4" ry="7" fill="${skin}" ${x.thin}/>`;
      break;
    case "hold":
      arms = armStroke(`M-9 ${sh} L-12 ${sh + 16}`) + armStroke(`M9 ${sh} L12 ${sh + 16}`) + hand(-12, sh + 18) + hand(12, sh + 18);
      break;
    default:
      arms = armStroke(`M-10 ${sh} L-16 ${sh + 22}`) + armStroke(`M10 ${sh} L16 ${sh + 22}`) + hand(-16, sh + 24) + hand(16, sh + 24);
  }
  const eyes = o.closedEyes
    ? `<path d="M-6 ${headY - 1} q2.5 2 5 0 M1 ${headY - 1} q2.5 2 5 0" fill="none" ${x.thin}/>`
    : `<circle cx="-4" cy="${headY - 1}" r="1.7" fill="${x.c("line")}"/><circle cx="4" cy="${headY - 1}" r="1.7" fill="${x.c("line")}"/>`;
  const smile = `<path d="M-4 ${headY + 5} q4 3.5 8 0" fill="none" ${x.thin}/>`;
  const hairShape = o.veil
    ? `<path d="M-15 ${headY + 14} Q-17 ${headY - 16} 0 ${headY - 17} Q17 ${headY - 16} 15 ${headY + 14} L11 ${headY + 14} Q12 ${headY - 8} 0 ${headY - 9} Q-12 ${headY - 8} -11 ${headY + 14}Z" fill="${x.c(o.veil)}" ${x.s}/>`
    : `<path d="M-12 ${headY - 2} Q-12 ${headY - 15} 0 ${headY - 15} Q12 ${headY - 15} 12 ${headY - 2} Q6 ${headY - 9} 0 ${headY - 8} Q-6 ${headY - 9} -12 ${headY - 2}Z" fill="${hair}" ${x.s}/>`;
  const beard = o.beard
    ? `<path d="M-10 ${headY + 2} Q-9 ${headY + 15} 0 ${headY + 15} Q9 ${headY + 15} 10 ${headY + 2} Q5 ${headY + 9} 0 ${headY + 8} Q-5 ${headY + 9} -10 ${headY + 2}Z" fill="${hair}" ${x.thin}/>`
    : "";
  const feet = o.kneel
    ? `<ellipse cx="-12" cy="-2" rx="9" ry="4" fill="${x.c("hair2")}" ${x.thin}/>`
    : `<ellipse cx="-7" cy="-2" rx="6" ry="3.5" fill="${x.c("hair2")}" ${x.thin}/><ellipse cx="7" cy="-2" rx="6" ry="3.5" fill="${x.c("hair2")}" ${x.thin}/>`;
  return `<g transform="translate(${cx} ${base}) scale(${k})">${feet}<path d="${robePath}" fill="${robe}" ${x.s}/><path d="M-8 ${bodyTop + 2} L8 ${bodyTop + 2}" ${x.thin}/>${arms}<circle cx="0" cy="${headY}" r="13" fill="${skin}" ${x.s}/>${hairShape}${beard}${eyes}${o.beard ? "" : smile}</g>`;
}

function sheep(x: Ctx, cx: number, cy: number, k = 1, flip = false) {
  const wool = [-14, -4, 6, 16].map((dx, i) => `<circle cx="${dx}" cy="${i % 2 ? -6 : -2}" r="11" fill="${x.c("white")}" ${x.s}/>`).join("");
  return `<g transform="translate(${cx} ${cy}) scale(${flip ? -k : k} ${k})"><rect x="-12" y="4" width="5" height="14" rx="2" fill="${x.c("hair")}"/><rect x="8" y="4" width="5" height="14" rx="2" fill="${x.c("hair")}"/><ellipse cx="0" cy="0" rx="24" ry="13" fill="${x.c("white")}" ${x.s}/>${wool}<ellipse cx="26" cy="-6" rx="9" ry="8" fill="${x.c("hair2")}" ${x.s}/><circle cx="29" cy="-8" r="1.6" fill="${x.c("white")}"/><ellipse cx="21" cy="-11" rx="4" ry="2.5" fill="${x.c("hair2")}" ${x.thin}/></g>`;
}

function lion(x: Ctx, cx: number, cy: number, k = 1, calm = true) {
  const mane = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI * 2) / 12;
    return `<circle cx="${(Math.cos(a) * 20).toFixed(1)}" cy="${(Math.sin(a) * 20).toFixed(1)}" r="10" fill="${x.c("mane")}" ${x.s}/>`;
  }).join("");
  const eyes = calm
    ? `<path d="M-9 -4 q3.5 3 7 0 M2 -4 q3.5 3 7 0" fill="none" ${x.thin}/>`
    : `<circle cx="-6" cy="-4" r="2" fill="${x.c("line")}"/><circle cx="6" cy="-4" r="2" fill="${x.c("line")}"/>`;
  return `<g transform="translate(${cx} ${cy}) scale(${k})">${mane}<circle cx="0" cy="0" r="19" fill="${x.c("lion")}" ${x.s}/><circle cx="-13" cy="-15" r="5" fill="${x.c("lion")}" ${x.thin}/><circle cx="13" cy="-15" r="5" fill="${x.c("lion")}" ${x.thin}/>${eyes}<path d="M-4 3 L4 3 L0 8Z" fill="${x.c("hair2")}" ${x.thin}/><path d="M0 8 q-4 5 -8 2 M0 8 q4 5 8 2" fill="none" ${x.thin}/></g>`;
}

function lionBody(x: Ctx, cx: number, cy: number, k = 1, flip = false) {
  return `<g transform="translate(${cx} ${cy}) scale(${flip ? -k : k} ${k})"><path d="M-10 10 Q-60 14 -62 -6 Q-62 -22 -40 -22 L0 -18Z" fill="${x.c("lion")}" ${x.s}/><path d="M-62 -6 q-14 -4 -12 -18" fill="none" ${x.s}/><circle cx="-76" cy="-25" r="4" fill="${x.c("mane")}" ${x.thin}/><ellipse cx="-50" cy="10" rx="10" ry="5" fill="${x.c("lion")}" ${x.thin}/><ellipse cx="-14" cy="12" rx="10" ry="5" fill="${x.c("lion")}" ${x.thin}/></g>${lion(x, cx + (flip ? -6 : 6) * k, cy - 14 * k, k * 0.95, true)}`;
}

function dove(x: Ctx, cx: number, cy: number, k = 1, leaf = false) {
  const l = leaf ? `<path d="M20 0 q10 -8 16 -2 q-8 6 -16 2Z" fill="${x.c("leaf")}" ${x.thin}/>` : "";
  return `<g transform="translate(${cx} ${cy}) scale(${k})"><path d="M-22 4 Q-4 -2 14 2 Q22 2 20 -4 Q14 -8 8 -4 Q-6 -2 -22 4Z" fill="${x.c("white")}" ${x.s}/><path d="M-6 0 Q-2 -24 14 -26 Q8 -10 4 2Z" fill="${x.c("white")}" ${x.s}/><circle cx="14" cy="-3" r="1.3" fill="${x.c("line")}"/>${l}<path d="M20 -2 l5 1 -5 2" fill="${x.c("orange")}" ${x.thin}/></g>`;
}

function fish(x: Ctx, cx: number, cy: number, k = 1, color: keyof Palette = "fish", flip = false) {
  return `<g transform="translate(${cx} ${cy}) scale(${flip ? -k : k} ${k})"><path d="M-16 0 Q-4 -12 12 0 Q-4 12 -16 0Z" fill="${x.c(color)}" ${x.s}/><path d="M-16 0 L-26 -8 L-26 8Z" fill="${x.c(color)}" ${x.s}/><circle cx="5" cy="-2" r="1.6" fill="${x.c("line")}"/></g>`;
}

function boat(x: Ctx, cx: number, cy: number, k = 1, sail = true) {
  const s = sail
    ? `<line x1="0" y1="-8" x2="0" y2="-78" ${x.s}/><path d="M2 -74 L40 -18 L2 -18Z" fill="${x.c("white")}" ${x.s}/>`
    : "";
  return `<g transform="translate(${cx} ${cy}) scale(${k})">${s}<path d="M-70 -10 L70 -10 L50 18 L-50 18Z" fill="${x.c("wood")}" ${x.s}/><path d="M-62 0 L62 0" ${x.thin}/></g>`;
}

function basket(x: Ctx, cx: number, cy: number, k = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${k})"><path d="M-18 -4 L18 -4 L13 12 L-13 12Z" fill="${x.c("wood")}" ${x.s}/><path d="M-15 2 L15 2 M-14 7 L14 7" ${x.thin}/></g>`;
}

function loaf(x: Ctx, cx: number, cy: number, k = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${k})"><ellipse cx="0" cy="0" rx="9" ry="6" fill="${x.c("bread")}" ${x.s}/><path d="M-4 -3 l2 4 M1 -4 l2 4" ${x.thin}/></g>`;
}

function rainbow(x: Ctx, cx: number, cy: number, r: number) {
  const bands: (keyof Palette)[] = ["red", "orange", "yellow", "green", "blue", "purple"];
  return bands
    .map((b, i) => {
      const rr = r - i * 9;
      return `<path d="M${cx - rr} ${cy} A${rr} ${rr} 0 0 1 ${cx + rr} ${cy}" fill="none" stroke="${x.c(b)}" stroke-width="9"/>` +
        (x.mode === "lineart" ? `<path d="M${cx - rr - 4.5} ${cy} A${rr + 4.5} ${rr + 4.5} 0 0 1 ${cx + rr + 4.5} ${cy}" fill="none" stroke="#2b2b2b" stroke-width="1.5"/>` : "");
    })
    .join("") + (x.mode === "lineart" ? `<path d="M${cx - r + 45 + 4.5} ${cy} A${r - 49.5} ${r - 49.5} 0 0 1 ${cx + r - 49.5} ${cy}" fill="none" stroke="#2b2b2b" stroke-width="1.5"/>` : "");
}

function arkHouse(x: Ctx, cx: number, cy: number, k = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${k})"><rect x="-56" y="-62" width="112" height="44" rx="6" fill="${x.c("woodDark")}" ${x.s}/><path d="M-66 -66 L0 -96 L66 -66Z" fill="${x.c("red")}" ${x.s}/><rect x="-40" y="-52" width="16" height="16" rx="3" fill="${x.c("skyBottom")}" ${x.s}/><rect x="24" y="-52" width="16" height="16" rx="3" fill="${x.c("skyBottom")}" ${x.s}/></g>`;
}

function arkHull(x: Ctx, cx: number, cy: number, k = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${k})"><path d="M-110 -20 L110 -20 L84 26 L-84 26Z" fill="${x.c("wood")}" ${x.s}/><path d="M-100 -4 L100 -4 M-92 10 L92 10" ${x.thin}/></g>`;
}

function giraffe(x: Ctx, cx: number, base: number, k = 1) {
  return `<g transform="translate(${cx} ${base}) scale(${k})"><path d="M-6 0 L-6 -70 Q-6 -82 6 -84 L14 -84 Q20 -82 18 -76 L6 -72 L6 0Z" fill="${x.c("yellow")}" ${x.s}/><circle cx="0" cy="-50" r="3" fill="${x.c("orange")}"/><circle cx="2" cy="-30" r="3" fill="${x.c("orange")}"/><circle cx="-1" cy="-14" r="3" fill="${x.c("orange")}"/><circle cx="10" cy="-80" r="1.6" fill="${x.c("line")}"/><line x1="2" y1="-84" x2="0" y2="-92" ${x.thin}/><line x1="8" y1="-84" x2="8" y2="-92" ${x.thin}/></g>`;
}

function stable(x: Ctx) {
  return `<path d="M60 230 L60 120 L200 70 L340 120 L340 230" fill="${x.c("woodDark")}" opacity="${x.mode === "lineart" ? 1 : 0.35}" ${x.s}/><path d="M40 128 L200 60 L360 128" fill="none" stroke="${x.mode === "lineart" ? "#2b2b2b" : x.c("wood")}" stroke-width="12" stroke-linecap="round"/><rect x="62" y="120" width="10" height="110" fill="${x.c("wood")}" ${x.s}/><rect x="328" y="120" width="10" height="110" fill="${x.c("wood")}" ${x.s}/>`;
}

function manger(x: Ctx, cx: number, cy: number) {
  return `<g transform="translate(${cx} ${cy})"><path d="M-36 -10 L36 -10 L26 14 L-26 14Z" fill="${x.c("wood")}" ${x.s}/><path d="M-26 14 L-34 30 M26 14 L34 30" ${x.s}/><path d="M-34 -10 Q-20 -22 0 -16 Q20 -24 34 -10Z" fill="${x.c("yellow")}" ${x.s}/><ellipse cx="0" cy="-16" rx="18" ry="8" fill="${x.c("white")}" ${x.s}/><circle cx="-12" cy="-20" r="8" fill="${x.c("skin3")}" ${x.s}/><path d="M-15 -21 q2 1.6 4 0" fill="none" ${x.thin}/></g>`;
}

function goliath(x: Ctx, cx: number, base: number, k = 1) {
  return `<g>${person(x, cx, base, k, { robe: "stoneDark", skin: "skin2", hair: "hair", beard: true, arms: "down" })}<g transform="translate(${cx} ${base}) scale(${k})"><path d="M-14 -88 Q0 -106 14 -88 L14 -84 L-14 -84Z" fill="${x.c("stone")}" ${x.s}/><ellipse cx="-24" cy="-40" rx="12" ry="20" fill="${x.c("stone")}" ${x.s}/><circle cx="-24" cy="-40" r="4" fill="${x.c("yellow")}" ${x.thin}/></g></g>`;
}

function bigFishShape(x: Ctx, cx: number, cy: number, k = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${k})"><path d="M-80 0 Q-60 -48 10 -44 Q70 -40 80 0 Q70 30 10 30 Q-60 32 -80 0Z" fill="${x.c("bigFish")}" ${x.s}/><path d="M-80 0 L-112 -26 Q-104 0 -112 26Z" fill="${x.c("bigFish")}" ${x.s}/><path d="M-30 14 Q10 26 60 10" fill="none" ${x.thin}/><circle cx="48" cy="-14" r="5" fill="${x.c("white")}" ${x.thin}/><circle cx="49" cy="-14" r="2.4" fill="${x.c("line")}"/><path d="M62 6 q8 2 14 -4" fill="none" ${x.thin}/><path d="M0 -44 q4 -14 -6 -22 M8 -44 q8 -12 2 -24" fill="none" stroke="${x.mode === "lineart" ? "#2b2b2b" : x.c("waterLight")}" stroke-width="3" stroke-linecap="round"/></g>`;
}

// ---------------------------------------------------------------------------
// Cenas
// ---------------------------------------------------------------------------

const SCENES: Record<IllustrationId, { alt: string; draw: (x: Ctx) => string }> = {
  cover: {
    alt: "Arco-íris sobre colinas, com um leão, uma ovelha e uma pomba",
    draw: (x) =>
      sky(x) + sun(x, 330, 60, 22) + cloud(x, 80, 60, 1) + cloud(x, 250, 40, 0.8) + rainbow(x, 200, 230, 150) + hills(x, 215) +
      lion(x, 150, 236, 1.05, true) + sheep(x, 250, 242, 1.1, true) + dove(x, 200, 120, 1.2, true) +
      flower(x, 60, 262, "pink") + flower(x, 92, 274, "yellow") + flower(x, 330, 266, "purple") + flower(x, 360, 276, "red"),
  },
  creation: {
    alt: "O mundo recém-criado: sol, lua e estrelas, árvore, flores, aves, peixes e uma ovelha",
    draw: (x) =>
      sky(x, "skyTop", "skyBottom") +
      (x.mode === "lineart" ? `<line x1="200" y1="0" x2="200" y2="200" stroke="#2b2b2b" stroke-width="2" stroke-dasharray="6 6"/>` : `<rect x="200" y="0" width="200" height="220" fill="${x.c("night")}"/>`) +
      sun(x, 90, 70, 26) + `<path d="M320 52 a24 24 0 1 0 22 30 a18 18 0 1 1 -22 -30Z" fill="${x.c("star")}" ${x.s}/>` +
      star(x, 250, 40, 8) + star(x, 370, 120, 7) + star(x, 270, 120, 6) + star(x, 360, 30, 5) +
      hills(x, 205) + tree(x, 70, 250, 1) + `<path d="M230 300 Q240 240 320 246 Q400 250 400 300Z" fill="${x.c("water")}" ${x.s}/>` +
      fish(x, 300, 272, 0.9, "fish") + fish(x, 360, 284, 0.7, "yellow", true) + sheep(x, 170, 254, 0.9) +
      dove(x, 150, 70, 0.8) + dove(x, 190, 100, 0.6) + flower(x, 120, 270, "pink") + flower(x, 210, 278, "yellow"),
  },
  ark: {
    alt: "A arca de Noé sobre as águas, com animais, uma pomba com folha de oliveira e o arco-íris",
    draw: (x) =>
      sky(x) + rainbow(x, 200, 200, 170) + cloud(x, 70, 50, 0.9) + cloud(x, 330, 70, 1) +
      giraffe(x, 128, 206, 0.95) + arkHouse(x, 200, 220, 1.15) +
      lion(x, 82, 186, 0.62, true) + sheep(x, 300, 192, 0.6, true) + sheep(x, 268, 196, 0.55) +
      arkHull(x, 200, 220, 1.15) + waves(x, 248, "water", 8) + waves(x, 270, "waterLight", 6) + dove(x, 320, 120, 1.1, true),
  },
  sea: {
    alt: "Moisés com a mão levantada e o povo atravessando o mar por um caminho seco entre paredes de água",
    draw: (x) =>
      sky(x) + cloud(x, 200, 50, 1.2) +
      `<path d="M0 60 Q20 50 40 60 T80 60 T120 64 L140 300 L0 300Z" fill="${x.c("water")}" ${x.s}/><path d="M400 60 Q380 50 360 60 T320 60 T280 64 L260 300 L400 300Z" fill="${x.c("water")}" ${x.s}/>` +
      `<path d="M20 100 q20 -10 40 0 M30 160 q20 -10 40 0 M340 120 q20 -10 40 0 M320 190 q20 -10 40 0" fill="none" stroke="${x.mode === "lineart" ? "#2b2b2b" : x.c("waterLight")}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M140 300 L120 64 Q200 74 280 64 L260 300Z" fill="${x.c("sand")}" ${x.s}/>` +
      person(x, 175, 150, 0.45, { robe: "orange", skin: "skin2" }) + person(x, 222, 150, 0.45, { robe: "green", skin: "skin1", veil: "pink" }) +
      person(x, 160, 210, 0.6, { robe: "purple", skin: "skin1", veil: "yellow" }) + person(x, 240, 205, 0.6, { robe: "red", skin: "skin2" }) +
      person(x, 200, 290, 0.95, { robe: "blue", skin: "skin1", hair: "hair2", beard: true, arms: "up" }) +
      `<line x1="219" y1="194" x2="232" y2="290" stroke="${x.mode === "lineart" ? "#2b2b2b" : x.c("woodDark")}" stroke-width="5" stroke-linecap="round"/>`,
  },
  david: {
    alt: "O jovem pastor Davi com sua funda, ovelhas e, ao longe, o gigante Golias",
    draw: (x) =>
      sky(x) + sun(x, 70, 60, 22) + cloud(x, 300, 50, 0.9) + hills(x, 200) +
      goliath(x, 310, 246, 1.55) + sheep(x, 70, 252, 0.9) + sheep(x, 150, 268, 0.8, true) +
      person(x, 190, 286, 0.95, { robe: "orange", skin: "skin3", hair: "hair2", arms: "out" }) +
      `<path d="M219 204 q10 -22 -4 -36" fill="none" stroke="${x.mode === "lineart" ? "#2b2b2b" : x.c("woodDark")}" stroke-width="2.5"/><circle cx="214" cy="167" r="4" fill="${x.c("stone")}" ${x.thin}/>` +
      `<circle cx="120" cy="290" r="4" fill="${x.c("stone")}" ${x.thin}/><circle cx="132" cy="292" r="4" fill="${x.c("stone")}" ${x.thin}/><circle cx="110" cy="294" r="3.5" fill="${x.c("stone")}" ${x.thin}/><circle cx="142" cy="288" r="3.5" fill="${x.c("stone")}" ${x.thin}/><circle cx="125" cy="282" r="3.5" fill="${x.c("stone")}" ${x.thin}/>`,
  },
  daniel: {
    alt: "Daniel ajoelhado orando na cova, com dois leões calmos deitados e uma luz vinda do alto",
    draw: (x) =>
      `<rect x="0" y="0" width="400" height="300" fill="${x.c("stoneDark")}" ${x.s}/>` +
      `<path d="M0 0 L400 0 L400 40 Q300 70 200 50 Q100 70 0 40Z" fill="${x.c("stone")}" ${x.s}/>` +
      `<path d="M150 0 L250 0 L320 300 L80 300Z" fill="${x.c("glow")}" opacity="${x.mode === "lineart" ? 1 : 0.5}" ${x.mode === "lineart" ? 'stroke="#2b2b2b" stroke-width="1.5" stroke-dasharray="5 6" fill-opacity="0"' : ""}/>` +
      `<path d="M0 250 Q200 230 400 250 L400 300 L0 300Z" fill="${x.c("sand")}" ${x.s}/>` +
      `<path d="M20 120 l30 -6 M330 90 l40 8 M40 190 l26 4 M350 180 l30 -4" ${x.thin}/>` +
      lionBody(x, 120, 262, 0.9) + lionBody(x, 290, 262, 0.9, true) +
      person(x, 200, 276, 1.05, { robe: "purple", skin: "skin2", hair: "hair", beard: true, arms: "pray", kneel: true, closedEyes: true }) +
      star(x, 200, 30, 6),
  },
  jonah: {
    alt: "Um grande peixe no mar perto da praia, onde Jonas está de pé sob o sol",
    draw: (x) =>
      sky(x) + sun(x, 330, 60, 24) + cloud(x, 90, 50, 1) + waves(x, 170, "water", 7) +
      bigFishShape(x, 170, 220, 1.05) + waves(x, 250, "waterLight", 5) +
      `<path d="M280 300 Q300 236 400 228 L400 300Z" fill="${x.c("sand")}" ${x.s}/>` +
      person(x, 340, 268, 0.9, { robe: "green", skin: "skin1", hair: "hair", beard: true, arms: "out" }) +
      boat(x, 60, 165, 0.35),
  },
  nativity: {
    alt: "Noite estrelada em Belém: Maria e José ao lado do bebê Jesus na manjedoura, com ovelhas e um pastor",
    draw: (x) =>
      sky(x, "night", "nightLow") + star(x, 40, 40, 6) + star(x, 120, 24, 5) + star(x, 300, 30, 6) + star(x, 360, 70, 5) + star(x, 200, 22, 7) +
      `<path d="M0 230 Q200 210 400 230 L400 300 L0 300Z" fill="${x.c("grassDark")}" ${x.s}/>` + stable(x) +
      manger(x, 200, 236) +
      person(x, 130, 262, 0.95, { robe: "blue", skin: "skin1", veil: "white", arms: "pray" }) +
      person(x, 272, 262, 1, { robe: "orange", skin: "skin2", hair: "hair", beard: true, arms: "down" }) +
      sheep(x, 60, 270, 0.8) + sheep(x, 340, 278, 0.75, true) +
      person(x, 372, 250, 0.7, { robe: "green", skin: "skin2", hair: "hair2", arms: "down" }),
  },
  storm: {
    alt: "Jesus de pé num barco no meio da tempestade, com a mão estendida, e dois discípulos",
    draw: (x) =>
      sky(x, "nightLow", "skyTop") + cloud(x, 80, 40, 1.2) + cloud(x, 200, 30, 1.3) + cloud(x, 320, 45, 1.2) +
      `<path d="M40 80 l-8 30 M120 76 l-8 30 M240 70 l-8 30 M330 84 l-8 30 M180 100 l-6 22 M290 110 l-6 22" fill="none" stroke="${x.mode === "lineart" ? "#2b2b2b" : x.c("waterLight")}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M300 60 l-14 26 h12 l-12 26" fill="none" stroke="${x.c("yellow")}" stroke-width="4" stroke-linejoin="round"/>` +
      person(x, 165, 222, 0.75, { robe: "green", skin: "skin2", hair: "hair", arms: "up" }) +
      person(x, 245, 222, 0.75, { robe: "red", skin: "skin1", hair: "hair2", beard: true, arms: "hold" }) +
      person(x, 205, 214, 0.95, { robe: "white", skin: "skin1", hair: "hair", beard: true, arms: "out" }) +
      boat(x, 200, 230, 1.2, false) +
      `<path d="M0 250 Q40 214 80 246 T160 240 T240 250 T320 236 T400 248 L400 300 L0 300Z" fill="${x.c("water")}" ${x.s}/>` +
      `<path d="M0 274 Q50 252 100 272 T200 268 T300 274 T400 266 L400 300 L0 300Z" fill="${x.c("waterLight")}" ${x.s}/>`,
  },
  loaves: {
    alt: "Jesus e um menino com uma cesta de cinco pães e dois peixes, numa colina gramada com cestos",
    draw: (x) =>
      sky(x) + sun(x, 60, 56, 22) + cloud(x, 300, 50, 1) + hills(x, 190) +
      person(x, 150, 270, 1.15, { robe: "white", skin: "skin1", hair: "hair", beard: true, arms: "out" }) +
      person(x, 248, 276, 0.8, { robe: "yellow", skin: "skin3", hair: "hair2", arms: "hold" }) +
      `<g transform="translate(248 262)"><path d="M-30 -8 L30 -8 L22 18 L-22 18Z" fill="${x.c("wood")}" ${x.s}/>` +
      loaf(x, -18, -12, 0.9) + loaf(x, -4, -14, 0.9) + loaf(x, 10, -12, 0.9) + loaf(x, -11, -20, 0.9) + loaf(x, 4, -22, 0.9) +
      fish(x, 22, -16, 0.55, "fish") + fish(x, 22, -26, 0.55, "orange") + `</g>` +
      basket(x, 320, 276, 1) + basket(x, 356, 286, 1) + basket(x, 340, 254, 0.9) + basket(x, 60, 280, 1) +
      flower(x, 30, 262, "pink") + flower(x, 380, 240, "yellow"),
  },
  children: {
    alt: "Jesus sentado com os braços abertos, abraçando e abençoando crianças sorridentes",
    draw: (x) =>
      sky(x) + sun(x, 340, 54, 22) + cloud(x, 90, 50, 0.9) + hills(x, 200) + tree(x, 60, 236, 1.1) +
      `<rect x="160" y="230" width="80" height="22" rx="8" fill="${x.c("stone")}" ${x.s}/>` +
      person(x, 200, 240, 1.15, { robe: "white", skin: "skin1", hair: "hair", beard: true, arms: "up" }) +
      person(x, 140, 284, 0.62, { robe: "pink", skin: "skin3", hair: "hair2", arms: "up" }) +
      person(x, 262, 284, 0.62, { robe: "blue", skin: "skin2", hair: "hair", arms: "up" }) +
      person(x, 200, 296, 0.55, { robe: "yellow", skin: "skin1", hair: "hair", arms: "up" }) +
      person(x, 320, 290, 0.6, { robe: "green", skin: "skin2", hair: "hair2", veil: "purple", arms: "down" }) +
      flower(x, 110, 270, "red") + flower(x, 370, 262, "pink") + flower(x, 30, 276, "yellow"),
  },
};

let counter = 0;

/** SVG completo e autocontido de uma cena. */
export function illustrationSvg(id: IllustrationId, mode: ArtMode, opts: { uid?: string; className?: string } = {}): string {
  const scene = SCENES[id];
  const uid = opts.uid ?? `il${(counter = (counter + 1) % 1_000_000)}`;
  const x = ctxFor(mode, uid);
  const filterId = `${uid}-wc`;
  const defs =
    mode === "watercolor"
      ? `<defs><filter id="${filterId}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.5"/><feGaussianBlur stdDeviation="0.35"/></filter></defs>`
      : "";
  const body = mode === "watercolor" ? `<g filter="url(#${filterId})">${scene.draw(x)}</g>` : scene.draw(x);
  const cls = opts.className ? ` class="${opts.className}"` : "";
  return `<svg${cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="${scene.alt}" preserveAspectRatio="xMidYMid slice">${defs}<rect width="400" height="300" fill="#fff"/>${body}</svg>`;
}

export function illustrationAlt(id: IllustrationId): string {
  return SCENES[id].alt;
}

export type ItemId = "sheep" | "fish" | "loaf" | "dove" | "star" | "lion";

/** Pequenos desenhos para a atividade de contar (sempre em contorno + cor clara). */
export function itemSvg(item: ItemId, mode: ArtMode): string {
  const x = ctxFor(mode, "it");
  const draw: Record<ItemId, string> = {
    sheep: sheep(x, 46, 40, 1.1),
    fish: fish(x, 50, 34, 1.9),
    loaf: loaf(x, 40, 34, 2.4),
    dove: dove(x, 42, 40, 1.4),
    star: star(x, 40, 34, 24),
    lion: lion(x, 40, 36, 0.95),
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 70" aria-hidden="true">${draw[item]}</svg>`;
}

export const ILLUSTRATION_IDS = Object.keys(SCENES) as IllustrationId[];
