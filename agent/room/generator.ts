import type { Cable, LevelRules } from "../../src/portal/types.ts";

const COLORS = [0xff4d4d, 0x4dd2ff, 0xffd34d, 0x6bff6b, 0xff8a3d, 0xbf6bff];
const LABELS = ["A", "B", "C", "D", "E", "F"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface GeneratedLevel {
  cables: Cable[];
  order: string[];
  rules: LevelRules;
}

export function generateLevel(level: number): GeneratedLevel {
  const count = Math.min(6, 3 + Math.floor(level / 2));
  const colorPool = shuffle(COLORS).slice(0, Math.min(3 + Math.floor(level / 3), COLORS.length));
  const cables: Cable[] = [];
  const order = shuffle(LABELS.slice(0, count));
  const used = new Map<number, number>();
  const rows = shuffle([...Array(count).keys()]);
  for (let i = 0; i < count; i++) {
    const color = colorPool[i % colorPool.length];
    used.set(color, (used.get(color) ?? 0) + 1);
    cables.push({
      label: order[i],
      color,
      row: rows[i],
      cut: false,
    });
  }
  const firstColor = cables.find((c) => c.label === order[0])!.color;
  const rules: LevelRules = {
    summary: `Nivel ${level}: hay ${count} cables. Corta TODOS los cables en el orden correcto.`,
    steps: [
      `El PRIMER cable en cortarse es el ${order[0]} (color ${colorName(firstColor)}).`,
      ...cables.slice(1).map((c) => `Después, corta el cable ${c.label} (color ${colorName(c.color)}).`),
    ],
  };
  return { cables, order, rules };
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
