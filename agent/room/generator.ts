import type { Cable, LevelRules } from "../../src/portal/types.ts";

const COLORS = [0xff4d4d, 0x4dd2ff, 0xffd34d, 0x6bff6b, 0xff8a3d, 0xbf6bff];
const LABELS = ["A", "B", "C", "D", "E", "F"];
const MAX_ATTEMPTS = 60;
const MAX_ITERATIONS = 80;

export type Rule =
  | { kind: "first"; label: string }
  | { kind: "last"; label: string }
  | { kind: "at"; label: string; pos: number }
  | { kind: "before"; a: string; b: string }
  | { kind: "adjacent"; a: string; b: string }
  | { kind: "notFirst"; label: string }
  | { kind: "colorFirst"; color: number }
  | { kind: "colorBefore"; a: number; b: number }
  | { kind: "rowEnd"; end: "top" | "bottom"; pos: "first" | "last" };

export interface GeneratedLevel {
  cables: Cable[];
  order: string[];
  rules: LevelRules;
  structured: Rule[];
  seed: number;
  solutions: number;
}

export function hashSeed(roomSeed: number, level: number): number {
  let h = (roomSeed ^ Math.imul(level, 0x9e3779b9)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function targetCrossings(level: number, count: number): number {
  if (level < 3) return 0;
  const max = (count * (count - 1)) / 2;
  return Math.min(1 + Math.floor((level - 3) / 2), max);
}

function rowPermutation(rng: () => number, count: number, target: number): number[] {
  const p = [...Array(count).keys()];
  let inversions = 0;
  let guard = 0;
  while (inversions < target && guard < 500) {
    guard++;
    const candidates: number[] = [];
    for (let i = 0; i < count - 1; i++) {
      if (p[i] < p[i + 1]) candidates.push(i);
    }
    if (candidates.length === 0) break;
    const i = candidates[Math.floor(rng() * candidates.length)];
    [p[i], p[i + 1]] = [p[i + 1], p[i]];
    inversions++;
  }
  return p;
}

function crossingsOf(rows: number[], toRows: number[]): number {
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if ((rows[i] - rows[j]) * (toRows[i] - toRows[j]) < 0) count++;
    }
  }
  return count;
}

function ruleKey(r: Rule): string {
  switch (r.kind) {
    case "first":
    case "last":
    case "notFirst":
      return `${r.kind}:${r.label}`;
    case "at":
      return `at:${r.label}:${r.pos}`;
    case "before":
    case "adjacent":
      return `${r.kind}:${r.a}:${r.b}`;
    case "colorFirst":
      return `colorFirst:${r.color}`;
    case "colorBefore":
      return `colorBefore:${r.a}:${r.b}`;
    case "rowEnd":
      return `rowEnd:${r.end}:${r.pos}`;
  }
}

export function ruleHolds(rule: Rule, order: Cable[]): boolean {
  const n = order.length;
  const idx = (label: string) => order.findIndex((c) => c.label === label);
  const colorIdx = (color: number) => order.findIndex((c) => c.color === color);
  switch (rule.kind) {
    case "first":
      return order[0]?.label === rule.label;
    case "last":
      return order[n - 1]?.label === rule.label;
    case "at":
      return idx(rule.label) === rule.pos;
    case "before":
      return idx(rule.a) < idx(rule.b);
    case "adjacent":
      return idx(rule.b) === idx(rule.a) + 1;
    case "notFirst":
      return order[0]?.label !== rule.label;
    case "colorFirst":
      return order[0]?.color === rule.color;
    case "colorBefore":
      return colorIdx(rule.a) < colorIdx(rule.b);
    case "rowEnd": {
      const row = rule.end === "top" ? 0 : n - 1;
      const cable = order.find((c) => c.row === row);
      if (!cable) return false;
      return rule.pos === "first" ? order[0] === cable : order[n - 1] === cable;
    }
  }
}

export function countSolutions(cables: Cable[], rules: Rule[]): number {
  const n = cables.length;
  let count = 0;
  const visited = new Array<boolean>(n).fill(false);
  const cur: number[] = [];

  function backtrack(): void {
    if (cur.length === n) {
      const order = cur.map((i) => cables[i]);
      if (rules.every((r) => ruleHolds(r, order))) count++;
      return;
    }
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      visited[i] = true;
      cur.push(i);
      backtrack();
      cur.pop();
      visited[i] = false;
    }
  }

  backtrack();
  return count;
}

function kindsForLevel(level: number): Set<Rule["kind"]> {
  const kinds = new Set<Rule["kind"]>(["first", "last", "colorFirst"]);
  if (level >= 2) {
    kinds.add("before");
    kinds.add("at");
    kinds.add("notFirst");
  }
  if (level >= 4) {
    kinds.add("adjacent");
    kinds.add("colorBefore");
  }
  if (level >= 6) kinds.add("rowEnd");
  return kinds;
}

function buildCandidates(cables: Cable[], order: Cable[], kinds: Set<Rule["kind"]>): Rule[] {
  const n = order.length;
  const lastIdx = n - 1;
  const candidates: Rule[] = [];

  if (kinds.has("first")) candidates.push({ kind: "first", label: order[0].label });
  if (kinds.has("last")) candidates.push({ kind: "last", label: order[lastIdx].label });
  if (kinds.has("notFirst")) {
    for (let i = 1; i < n; i++) candidates.push({ kind: "notFirst", label: order[i].label });
  }
  if (kinds.has("at")) {
    for (let i = 0; i < n; i++) candidates.push({ kind: "at", label: order[i].label, pos: i });
  }
  if (kinds.has("before")) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        candidates.push({ kind: "before", a: order[i].label, b: order[j].label });
      }
    }
  }
  if (kinds.has("adjacent")) {
    for (let i = 0; i < lastIdx; i++) {
      candidates.push({ kind: "adjacent", a: order[i].label, b: order[i + 1].label });
    }
  }
  if (kinds.has("colorFirst")) candidates.push({ kind: "colorFirst", color: order[0].color });
  if (kinds.has("colorBefore")) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        candidates.push({ kind: "colorBefore", a: order[i].color, b: order[j].color });
      }
    }
  }
  if (kinds.has("rowEnd")) {
    const top = cables.find((c) => c.row === 0);
    const bottom = cables.find((c) => c.row === n - 1);
    if (top && order[0] === top) candidates.push({ kind: "rowEnd", end: "top", pos: "first" });
    if (top && order[lastIdx] === top) candidates.push({ kind: "rowEnd", end: "top", pos: "last" });
    if (bottom && order[0] === bottom) candidates.push({ kind: "rowEnd", end: "bottom", pos: "first" });
    if (bottom && order[lastIdx] === bottom) candidates.push({ kind: "rowEnd", end: "bottom", pos: "last" });
  }

  return candidates;
}

function bestReducingRule(
  rng: () => number,
  cables: Cable[],
  rules: Rule[],
  kinds: Set<Rule["kind"]>,
  rejected: Set<string>,
): { rule: Rule; count: number } | null {
  const seen = new Set(rules.map(ruleKey));
  const candidates = buildCandidates(cables, cables, kinds).filter(
    (r) => !seen.has(ruleKey(r)) && !rejected.has(ruleKey(r))
  );
  if (candidates.length === 0) return null;
  const sample = shuffle(rng, candidates).slice(0, 12);
  let best: Rule | null = null;
  let bestCount = Infinity;
  for (const candidate of sample) {
    const count = countSolutions(cables, [...rules, candidate]);
    if (count < bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best ? { rule: best, count: bestCount } : null;
}

function tryGenerate(level: number, seed: number): GeneratedLevel | null {
  const rng = mulberry32(seed);
  const count = Math.min(6, 3 + Math.floor(level / 2));
  const colorPool = shuffle(rng, COLORS).slice(0, count);
  const order = shuffle(rng, LABELS.slice(0, count));
  const rows = shuffle(rng, [...Array(count).keys()]);
  const pi = rowPermutation(rng, count, targetCrossings(level, count));
  const cables: Cable[] = order.map((label, i) => ({
    label,
    color: colorPool[i],
    row: rows[i],
    toRow: pi[rows[i]],
    cut: false,
  }));

  const kinds = kindsForLevel(level);
  const rules: Rule[] = [];
  const rejected = new Set<string>();
  let solutions = countSolutions(cables, []);
  let iterations = 0;

  while (solutions > 1 && iterations < MAX_ITERATIONS) {
    iterations++;
    const picked = bestReducingRule(rng, cables, rules, kinds, rejected);
    if (!picked) break;
    if (picked.count >= solutions) {
      rejected.add(ruleKey(picked.rule));
      continue;
    }
    rules.push(picked.rule);
    solutions = picked.count;
  }

  if (solutions !== 1) return null;

  return {
    cables,
    order,
    rules: renderRules(level, cables, rules),
    structured: rules,
    seed,
    solutions,
  };
}

const ORDINALS = ["primer", "segundo", "tercer", "cuarto", "quinto", "sexto"];

function ruleSentence(rule: Rule): string {
  switch (rule.kind) {
    case "first":
      return `El cable ${rule.label} se corta PRIMERO.`;
    case "last":
      return `El cable ${rule.label} se corta al FINAL.`;
    case "at":
      return `El cable ${rule.label} va en ${ORDINALS[rule.pos] ?? "siguiente"} lugar.`;
    case "before":
      return `El cable ${rule.a} se corta ANTES que el ${rule.b}.`;
    case "adjacent":
      return `Justo después de cortar el ${rule.a}, corta el ${rule.b}.`;
    case "notFirst":
      return `El cable ${rule.label} NO es el primero en cortarse.`;
    case "colorFirst":
      return `El cable ${colorName(rule.color)} se corta PRIMERO.`;
    case "colorBefore":
      return `El cable ${colorName(rule.a)} se corta ANTES que el ${colorName(rule.b)}.`;
    case "rowEnd": {
      const end = rule.end === "top" ? "ARRIBA" : "ABAJO";
      const place = rule.pos === "first" ? "PRIMERO" : "al FINAL";
      return `El cable de ${end} se corta ${place}.`;
    }
    default:
      return "Aplica la regla del manual.";
  }
}

function renderRules(level: number, cables: Cable[], rules: Rule[]): LevelRules {
  return {
    summary: `Nivel ${level}: hay ${cables.length} cables. Aplica TODAS las reglas para deducir el orden de corte.`,
    steps: rules.map((r) => ruleSentence(r)),
  };
}

export function generateLevel(level: number, roomSeed: number): GeneratedLevel {
  const base = hashSeed(roomSeed, level);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const seed = (base + Math.imul(attempt, 0x9e3779b9)) >>> 0;
    const out = tryGenerate(level, seed);
    if (out) return out;
  }
  return fallbackLevel(level, base);
}

function fallbackLevel(level: number, seed: number): GeneratedLevel {
  const rng = mulberry32(seed);
  const count = Math.min(6, 3 + Math.floor(level / 2));
  const colorPool = shuffle(rng, COLORS).slice(0, count);
  const order = shuffle(rng, LABELS.slice(0, count));
  const rows = shuffle(rng, [...Array(count).keys()]);
  const pi = rowPermutation(rng, count, 0);
  const cables: Cable[] = order.map((label, i) => ({
    label,
    color: colorPool[i],
    row: rows[i],
    toRow: pi[rows[i]],
    cut: false,
  }));
  return {
    cables,
    order,
    rules: {
      summary: `Nivel ${level}: hay ${count} cables. Corta TODOS los cables en el orden correcto.`,
      steps: [
        `El PRIMER cable en cortarse es el ${order[0]} (color ${colorName(colorPool[0])}).`,
        ...cables.slice(1).map((c) => `Después, corta el cable ${c.label} (color ${colorName(c.color)}).`),
      ],
    },
    structured: [],
    seed,
    solutions: 1,
  };
}

export function colorName(color: number): string {
  const names: Record<number, string> = {
    0xff4d4d: "rojo",
    0x4dd2ff: "azul",
    0xffd34d: "amarillo",
    0x6bff6b: "verde",
    0xff8a3d: "naranja",
    0xbf6bff: "morado",
  };
  return names[color] ?? "desconocido";
}
