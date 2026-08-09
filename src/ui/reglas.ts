export function reglasHtml(): string {
  return `
    <div class="flex flex-col gap-6">
      <div class="border-b-8 border-black pb-4">
        <h2 class="text-display font-display text-primary uppercase tracking-tight stroke-heavy">Reglas del juego</h2>
        <p class="text-body-sm text-on-surface-variant uppercase tracking-wider mt-2">Cable Rush — guía rápida de la operación.</p>
      </div>

      <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6">
        <h3 class="text-heading-sm font-display text-secondary uppercase mb-3">Concepto</h3>
        <ul class="flex flex-col gap-2 text-body-sm text-carbon">
          <li><span class="text-secondary font-bold uppercase">3 cortadores</span> ven un tablero compartido con cables de colores.</li>
          <li><span class="text-secondary font-bold uppercase">1 director</span> tiene el manual con las reglas de corte (no ve el tablero).</li>
          <li>El equipo coordina por voz: los cortadores describen los cables y el director dicta el orden.</li>
          <li>Objetivo: cortar <span class="font-bold">todos</span> los cables en el orden correcto para superar el nivel.</li>
        </ul>
      </div>

      <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6">
        <h3 class="text-heading-sm font-display text-secondary uppercase mb-3">Timer y scoring</h3>
        <ul class="flex flex-col gap-2 text-body-sm text-carbon">
          <li>El reloj arranca en <span class="font-bold">3:00</span>.</li>
          <li>Superar un nivel: <span class="text-secondary font-bold">+1:00</span> (se suma al tiempo actual, nunca se reinicia).</li>
          <li>Cortar un cable incorrecto: <span class="text-error font-bold">−15 s</span>.</li>
          <li>Si el reloj llega a 0, la operación termina. Score final = nivel alcanzado.</li>
        </ul>
      </div>

      <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6">
        <h3 class="text-heading-sm font-display text-secondary uppercase mb-3">Efectos de estado</h3>
        <ul class="flex flex-col gap-3 text-body-sm text-carbon">
          <li>
            <span class="font-bold uppercase">Freeze</span> <span class="text-on-surface-variant">(nivel 4+, corte incorrecto)</span> —
            congela al culpable unos segundos: no puede cortar ni mover el puntero.
          </li>
          <li>
            <span class="font-bold uppercase">Blind</span> <span class="text-on-surface-variant">(nivel 5+, periódico)</span> —
            niebla que tapa el tablero por unos segundos.
          </li>
          <li>
            <span class="font-bold uppercase">LockCut</span> <span class="text-on-surface-variant">(nivel 5+, periódico)</span> —
            bloquea temporalmente todos los cortes.
          </li>
        </ul>
      </div>
    </div>
  `;
}
