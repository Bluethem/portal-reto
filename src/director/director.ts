import type { RoomClient } from "../portal/client";
import { spaceBackdrop } from "../ui/space";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function mountDirector(container: HTMLElement, client: RoomClient): () => void {
  container.innerHTML = `
    <div class="relative h-full">
      ${spaceBackdrop()}
      <div class="relative z-10 bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6">
      <div class="flex items-center gap-3 mb-6">
        <span class="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shrink-0 border-4 border-black">
          <span class="material-symbols-outlined text-on-secondary">menu_book</span>
        </span>
        <div>
          <h2 class="text-heading-sm font-display text-secondary uppercase">Manual de desactivación</h2>
          <p class="text-caption text-on-surface-variant uppercase mt-1">Solo el director ve esta información</p>
        </div>
      </div>
      <div class="bg-surface-high border-4 border-black rounded-xl p-6 mb-6 border-l-8 border-l-tertiary">
        <p id="manual-summary" class="text-body-sm text-carbon">Esperando nivel...</p>
      </div>
      <ul id="manual-steps" class="flex flex-col gap-2"></ul>
      <div class="mt-6 border-t-8 border-black pt-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-heading-sm font-display text-secondary uppercase">Asistente IA</h3>
          <span id="hint-remaining" class="text-caption text-on-surface-variant uppercase">Comodines: 5/5</span>
        </div>
        <div id="hint-log" class="flex flex-col gap-2 mb-3 max-h-56 overflow-y-auto"></div>
        <button id="hint-btn" type="button" class="w-full flex items-center justify-center gap-2 bg-secondary text-on-secondary font-bold rounded-full border-4 border-black block-shadow hover:bg-tertiary hover:text-on-tertiary transition-transform active:scale-95 py-2 text-caption uppercase disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-outlined text-lg">tips_and_updates</span> Pedir pista
        </button>
      </div>
      </div>
    </div>
  `;

  const summary = document.getElementById("manual-summary");
  const steps = document.getElementById("manual-steps");
  const hintBtn = document.getElementById("hint-btn") as HTMLButtonElement | null;
  const hintRemainingEl = document.getElementById("hint-remaining");
  const hintLog = document.getElementById("hint-log");

  let hintRemaining = 5;

  function renderHintRemaining(): void {
    if (hintRemainingEl) hintRemainingEl.textContent = `Comodines: ${hintRemaining}/5`;
    if (hintBtn) hintBtn.disabled = hintRemaining <= 0;
  }

  function appendHint(text: string): void {
    if (!hintLog) return;
    const bubble = document.createElement("div");
    bubble.className =
      "flex items-start gap-3 bg-surface-high border-4 border-black rounded-xl px-4 py-3";
    bubble.innerHTML = `
      <span class="w-8 h-8 rounded-full bg-tertiary text-on-tertiary border-2 border-black flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-base">smart_toy</span>
      </span>
      <p class="text-body-sm text-carbon">${escapeHtml(text)}</p>
    `;
    hintLog.appendChild(bubble);
    hintLog.scrollTop = hintLog.scrollHeight;
  }

  const selfId = client.getSelfId();

  const unsubState = client.subscribeState((s) => {
    if (!s || !summary || !steps) return;
    if (typeof s.hintRemaining === "number") {
      hintRemaining = s.hintRemaining;
      renderHintRemaining();
    }
    summary.textContent = s.rules.summary;
    steps.replaceChildren();
    for (const step of s.rules.steps) {
      const li = document.createElement("li");
      li.className =
        "flex items-start gap-3 bg-surface-high border-4 border-black rounded-lg px-4 py-2 text-body-sm text-carbon";
      const num = document.createElement("span");
      num.className =
        "w-6 h-6 rounded-full bg-secondary text-on-secondary text-caption font-bold flex items-center justify-center shrink-0 border-2 border-black";
      num.textContent = String(steps.children.length + 1);
      const text = document.createElement("span");
      text.textContent = step;
      li.append(num, text);
      steps.appendChild(li);
    }
  });

  const unsubEvents = client.subscribeEvents((e) => {
    if (e.type !== "hint") return;
    if (selfId && e.target && e.target !== selfId) return;
    hintRemaining = e.remaining;
    renderHintRemaining();
    appendHint(e.text);
  });

  hintBtn?.addEventListener("click", () => {
    if (hintBtn.disabled) return;
    hintBtn.disabled = true;
    void client.sendHintRequest();
  });

  renderHintRemaining();

  return () => {
    unsubState();
    unsubEvents();
  };
}
