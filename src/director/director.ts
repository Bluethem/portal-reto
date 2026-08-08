import type { RoomClient } from "../portal/client";

export function mountDirector(container: HTMLElement, client: RoomClient): () => void {
  container.innerHTML = `
    <div class="bg-paper-white rounded-card shadow-pill p-10">
      <div class="flex items-center gap-3 mb-6">
        <span class="w-10 h-10 bg-electric-violet rounded-full flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-paper-white">menu_book</span>
        </span>
        <div>
          <h2 class="text-heading-sm text-carbon font-bold leading-none">Manual de desactivación</h2>
          <p class="text-caption text-slate-gray mt-1">Solo el director ve esta información</p>
        </div>
      </div>
      <div class="bg-sand rounded-[16px] p-6 mb-6 border-l-[6px] border-sunbeam-yellow">
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
        "flex items-start gap-3 bg-surface-container rounded-card px-6 py-2 text-body-sm text-carbon";
      const num = document.createElement("span");
      num.className =
        "w-6 h-6 rounded-full bg-electric-violet text-paper-white text-caption font-bold flex items-center justify-center shrink-0";
      num.textContent = String(steps.children.length + 1);
      const text = document.createElement("span");
      text.textContent = step;
      li.append(num, text);
      steps.appendChild(li);
    }
  });

  return () => unsub();
}
