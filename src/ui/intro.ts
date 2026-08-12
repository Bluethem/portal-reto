import { spaceBackdrop } from "./space";

const INTRO_MS = 2200;
const FADE_MS = 350;

const INTRO_CABLE_COLORS = ["#ff4d4d", "#4dd2ff", "#ffd34d"];

function cableRowSvg(color: string, delay: number): string {
  return `<svg viewBox="0 0 60 24" width="64" height="26" class="intro-cable" style="animation-delay:${delay}s">
  <line x1="4" y1="12" x2="56" y2="12" stroke="#000000" stroke-width="7" stroke-linecap="round"/>
  <line x1="4" y1="12" x2="56" y2="12" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
  <line x1="4" y1="12" x2="56" y2="12" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="3 6" opacity="0.8"/>
</svg>`;
}

function cablesHtml(): string {
  return `
    <div class="intro-cables-row">
      ${INTRO_CABLE_COLORS.map((c, i) => cableRowSvg(c, i * 0.12)).join("")}
      <span class="intro-scissors material-symbols-outlined" style="animation-delay:1.15s">content_cut</span>
    </div>
  `;
}

export function playIntro(): void {
  if (document.getElementById("intro-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "intro-overlay";
  overlay.className = "intro-overlay analog-texture";
  overlay.innerHTML = `
    ${spaceBackdrop()}
    <div class="intro-content relative z-10">
      <h1 class="intro-title font-display text-hero text-primary tracking-tighter uppercase stroke-heavy" aria-label="Wirebreak">
        ${"WIREBREAK"
          .split("")
          .map(
            (ch, i) =>
              `<span class="intro-letter" style="animation-delay:${i * 0.09}s">${ch === " " ? "\u00A0" : ch}</span>`
          )
          .join("")}
      </h1>
      ${cablesHtml()}
      <p class="intro-tagline text-subheading text-secondary font-bold uppercase tracking-wide">3 cortadores · 1 director</p>
    </div>
  `;
  document.body.appendChild(overlay);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    overlay.classList.add("intro-fadeout");
    window.setTimeout(() => overlay.remove(), FADE_MS);
  };
  overlay.addEventListener("pointerdown", finish);
  window.setTimeout(finish, INTRO_MS);
}
