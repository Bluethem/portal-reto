import { blindSvg, cableMiniSvg, clockSvg, crewmateRow, freezeSvg, lockCutSvg } from "./effect-icons";

function effectCard(icon: string, name: string, badge: string, desc: string): string {
  return `
    <div class="flex flex-col items-center text-center gap-3 bg-surface-high border-4 border-black rounded-xl block-shadow p-5">
      <div class="flex items-center justify-center">${icon}</div>
      <div class="flex flex-col items-center gap-1.5">
        <span class="text-heading-sm font-display text-carbon uppercase">${name}</span>
        <span class="text-[11px] uppercase tracking-wide text-on-surface-variant font-bold">${badge}</span>
      </div>
      <p class="text-body-sm text-carbon">${desc}</p>
    </div>
  `;
}

export function reglasHtml(): string {
  return `
    <div class="flex flex-col gap-6">
      <div class="border-b-8 border-black pb-4">
        <h2 class="text-display font-display text-primary uppercase tracking-tight stroke-heavy">Reglas del juego</h2>
        <p class="text-body-sm text-on-surface-variant uppercase tracking-wider mt-2">Cable Rush — guía rápida de la operación.</p>
      </div>

      <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6">
        <h3 class="text-heading-sm font-display text-secondary uppercase mb-3">Concepto</h3>
        <div class="mb-5">${crewmateRow()}</div>
        <ul class="flex flex-col gap-2 text-body-sm text-carbon">
          <li><span class="text-secondary font-bold uppercase">3 cortadores</span> ven un tablero compartido con cables de colores.</li>
          <li><span class="text-secondary font-bold uppercase">1 director</span> tiene el manual con las reglas de corte (no ve el tablero).</li>
          <li>El equipo coordina por voz: los cortadores describen los cables y el director dicta el orden.</li>
          <li class="flex items-center gap-2">
            ${cableMiniSvg("#ff4d4d", 30)}
            <span>Objetivo: cortar <span class="font-bold">todos</span> los cables en el orden correcto para superar el nivel.</span>
          </li>
        </ul>
      </div>

      <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6">
        <div class="flex items-center gap-3 mb-3">
          <span class="shrink-0">${clockSvg(40)}</span>
          <h3 class="text-heading-sm font-display text-secondary uppercase">Timer y scoring</h3>
        </div>
        <ul class="flex flex-col gap-2 text-body-sm text-carbon">
          <li>El reloj arranca en <span class="font-bold">3:00</span>.</li>
          <li>Superar un nivel: <span class="text-secondary font-bold">+1:00</span> (se suma al tiempo actual, nunca se reinicia).</li>
          <li>Cortar un cable incorrecto: <span class="text-error font-bold">−15 s</span>.</li>
          <li>Si el reloj llega a 0, la operación termina. Score final = nivel alcanzado.</li>
        </ul>
      </div>

      <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6">
        <h3 class="text-heading-sm font-display text-secondary uppercase mb-4">Efectos de estado</h3>
        <div class="grid grid-cols-3 gap-4">
          ${effectCard(freezeSvg(64), "Freeze", "Nivel 4+ · corte incorrecto", "Congela al culpable unos segundos: no puede cortar ni mover el puntero.")}
          ${effectCard(blindSvg(64), "Blind", "Nivel 5+ · periódico", "Niebla que tapa el tablero por unos segundos.")}
          ${effectCard(lockCutSvg(64), "LockCut", "Nivel 5+ · periódico", "Bloquea temporalmente todos los cortes.")}
        </div>
      </div>
    </div>
  `;
}
