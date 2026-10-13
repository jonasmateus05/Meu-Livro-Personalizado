/**
 * Caça-palavras determinístico: o mesmo nome/idade gera sempre a mesma grade
 * (importante para regenerar um PDF idêntico em novas tentativas).
 */

export type WordSearch = {
  size: number;
  grid: string[][];
  words: string[];
  placements: { word: string; row: number; col: number; dr: number; dc: number }[];
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const LETTERS = "ABCDEFGHIJLMNOPRSTUVZ";

export function buildWordSearch(words: string[], size: number, seed: number, allowDiagonal: boolean): WordSearch {
  const dirs: [number, number][] = allowDiagonal ? [[0, 1], [1, 0], [1, 1]] : [[0, 1], [1, 0]];
  const sorted = [...new Set(words.filter((w) => /^[A-Z]+$/.test(w) && w.length <= size))].sort((a, b) => b.length - a.length);

  for (let attempt = 0; attempt < 200; attempt++) {
    const rnd = mulberry32(seed + attempt * 7919);
    const grid: string[][] = Array.from({ length: size }, () => Array<string>(size).fill(""));
    const placements: WordSearch["placements"] = [];
    let ok = true;
    for (const word of sorted) {
      let placed = false;
      for (let tries = 0; tries < 300 && !placed; tries++) {
        const [dr, dc] = dirs[Math.floor(rnd() * dirs.length)];
        const maxRow = size - (dr ? word.length : 1);
        const maxCol = size - (dc ? word.length : 1);
        const row = Math.floor(rnd() * (maxRow + 1));
        const col = Math.floor(rnd() * (maxCol + 1));
        let fits = true;
        for (let i = 0; i < word.length; i++) {
          const cell = grid[row + dr * i][col + dc * i];
          if (cell !== "" && cell !== word[i]) {
            fits = false;
            break;
          }
        }
        if (!fits) continue;
        for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i];
        placements.push({ word, row, col, dr, dc });
        placed = true;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const r of grid) for (let c = 0; c < size; c++) if (r[c] === "") r[c] = LETTERS[Math.floor(rnd() * LETTERS.length)];
    return { size, grid, words: sorted, placements };
  }
  throw new Error("Não foi possível montar o caça-palavras");
}
