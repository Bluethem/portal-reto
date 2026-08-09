import type { RoomClient } from "../portal/client";

export function mountDirector(container: HTMLElement, client: RoomClient): () => void {
  container.innerHTML = `
    <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6">
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
    </div>
  `;

  const summary = document.getElementById("manual-summary");
  const steps = document.getElementById("manual-steps");

  const unsub = client.subscribeState((s) => {
    if (!s || !summary || !steps) return;
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

  return () => unsub();
}
