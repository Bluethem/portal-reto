import { crewmateSvg } from "./crewmate";

export function freezeSvg(size = 64): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="18" fill="#a4ffe8" stroke="#000000" stroke-width="3"/>
  <g stroke="#00201a" stroke-width="2.5" stroke-linecap="round">
    <line x1="24" y1="10" x2="24" y2="38"/>
    <line x1="11.9" y1="17" x2="36.1" y2="31"/>
    <line x1="36.1" y1="17" x2="11.9" y2="31"/>
    <line x1="10" y1="24" x2="38" y2="24"/>
    <line x1="17" y1="11.9" x2="31" y2="36.1"/>
    <line x1="31" y1="11.9" x2="17" y2="36.1"/>
  </g>
</svg>`;
}

export function blindSvg(size = 64): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="18" fill="#ece1d0" stroke="#000000" stroke-width="3"/>
  <path d="M6 24 C14 13, 34 13, 42 24 C34 35, 14 35, 6 24 Z" fill="#ffffff" stroke="#000000" stroke-width="2.5"/>
  <circle cx="24" cy="24" r="6" fill="#000000"/>
  <line x1="10" y1="38" x2="38" y2="10" stroke="#ba1a1a" stroke-width="4.5" stroke-linecap="round"/>
</svg>`;
}

export function lockCutSvg(size = 64): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 22 v-6 a8 8 0 0 1 16 0 v6" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round"/>
  <rect x="10" y="22" width="28" height="19" rx="4" fill="#cdcd00" stroke="#000000" stroke-width="3"/>
  <circle cx="24" cy="31" r="4" fill="#000000"/>
  <rect x="22.5" y="31" width="3" height="6" fill="#000000"/>
</svg>`;
}

export function cableMiniSvg(color = "#ff4d4d", size = 30): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <line x1="8" y1="24" x2="40" y2="24" stroke="#000000" stroke-width="9" stroke-linecap="round"/>
  <line x1="8" y1="24" x2="40" y2="24" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
  <line x1="8" y1="24" x2="40" y2="24" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2 8" opacity="0.7"/>
  <circle cx="8" cy="24" r="6" fill="${color}" stroke="#000000" stroke-width="2.5"/>
  <circle cx="40" cy="24" r="6" fill="${color}" stroke="#000000" stroke-width="2.5"/>
</svg>`;
}

export function clockSvg(size = 40): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="19" fill="#a4ffe8" stroke="#000000" stroke-width="3"/>
  <g stroke="#00201a" stroke-width="2.5" stroke-linecap="round">
    <line x1="24" y1="24" x2="24" y2="14"/>
    <line x1="24" y1="24" x2="32" y2="28"/>
  </g>
  <circle cx="24" cy="24" r="2.5" fill="#000000"/>
</svg>`;
}

export function crewmateRow(): string {
  const cutters = ["#ffb4a9", "#2196f3", "#4caf50"];
  return `
    <div class="flex items-end justify-center gap-3 flex-wrap">
      ${cutters
        .map(
          (c) => `
        <div class="flex flex-col items-center gap-1">
          ${crewmateSvg(c, 44)}
          <span class="text-[10px] uppercase tracking-wide text-on-surface-variant font-bold">Cortador</span>
        </div>`
        )
        .join("")}
      <span class="text-heading-sm text-on-surface-variant font-display px-1 self-center">+</span>
      <div class="flex flex-col items-center gap-1 relative">
        ${crewmateSvg("#cdcd00", 44)}
        <span class="absolute -top-1 -right-1 w-5 h-5 bg-secondary rounded-full border-2 border-black flex items-center justify-center">
          <span class="material-symbols-outlined text-[12px] text-on-secondary">menu_book</span>
        </span>
        <span class="text-[10px] uppercase tracking-wide text-secondary font-bold">Director</span>
      </div>
    </div>
  `;
}
