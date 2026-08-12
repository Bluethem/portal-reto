import { CREW_COLORS } from "./crew-colors";

function hashCode(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((n & 255) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function starfield(rand: () => number): string {
  let out = "";
  const count = 9 + Math.floor(rand() * 4);
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * 196 + 2);
    const y = Math.round(rand() * 96 + 2);
    const r = (rand() * 0.9 + 0.4).toFixed(1);
    const bright = rand() > 0.6;
    const delay = (rand() * 2).toFixed(2);
    out += bright
      ? `<circle class="space-star" style="animation-delay:${delay}s" cx="${x}" cy="${y}" r="${r}" fill="#ffffff"/>`
      : `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="0.55"/>`;
  }
  return out;
}

export function roomThumb(roomId: string, playing: boolean): string {
  const h = hashCode(roomId);
  const id = h.toString(36);
  const rand = mulberry32(h);
  const color = CREW_COLORS[Math.floor(rand() * CREW_COLORS.length)];
  const type = Math.floor(rand() * 4);
  const r = 26 + Math.round(rand() * 14);
  const px = 62 + Math.round(rand() * 70);
  const py = 40 + Math.round(rand() * 28);
  const light = shade(color, 1.45);
  const dark = shade(color, 0.55);

  const ring =
    type === 0
      ? `<ellipse cx="${px}" cy="${py}" rx="${r + 12}" ry="${Math.round((r + 12) * 0.34)}" fill="none" stroke="${light}" stroke-width="5" transform="rotate(-18 ${px} ${py})" opacity="0.85"/>`
      : "";
  const craters =
    type === 1
      ? [0, 1, 2]
          .map(() => {
            const ox = Math.round(rand() * (r * 0.8) - r * 0.4);
            const oy = Math.round(rand() * (r * 0.8) - r * 0.4);
            return `<circle cx="${px + ox}" cy="${py + oy}" r="${2 + Math.round(rand() * 4)}" fill="${dark}" opacity="0.55"/>`;
          })
          .join("")
      : "";
  const band =
    type === 3
      ? `<path d="M ${px - r} ${py - 4} L ${px + r} ${py - 4} L ${px + r} ${py + 4} L ${px - r} ${py + 4} Z" fill="${light}" opacity="0.35"/>`
      : "";
  const shuttle = playing
    ? `<g transform="translate(${px - r - 22}, ${py - 16}) rotate(14)">
         <path d="M0 8 L16 0 L16 16 Z" fill="#cdeaff" stroke="#000000" stroke-width="2"/>
         <rect x="16" y="3" width="10" height="10" rx="3" fill="#eafffb" stroke="#000000" stroke-width="2"/>
       </g>`
    : "";

  return `<svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg-${id}" cx="50%" cy="40%" r="90%">
        <stop offset="0%" stop-color="#141c31"/>
        <stop offset="100%" stop-color="#060a14"/>
      </radialGradient>
      <radialGradient id="pg-${id}" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stop-color="${light}"/>
        <stop offset="60%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${dark}"/>
      </radialGradient>
    </defs>
    <rect width="200" height="100" fill="url(#bg-${id})"/>
    ${starfield(rand)}
    ${ring}
    <circle cx="${px}" cy="${py}" r="${r}" fill="url(#pg-${id})"/>
    ${craters}
    ${band}
    <ellipse cx="${px - r * 0.34}" cy="${py - r * 0.4}" rx="${r * 0.24}" ry="${r * 0.14}" fill="#ffffff" opacity="0.5"/>
    ${shuttle}
  </svg>`;
}
