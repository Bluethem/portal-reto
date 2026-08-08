import type { RoomClient } from "../portal/client";

export function mountDirector(container: HTMLElement, client: RoomClient): () => void {
  container.innerHTML = `
    <div class="manual">
      <h2>Manual de desactivación</h2>
      <p id="manual-summary">Esperando nivel...</p>
      <ol id="manual-steps"></ol>
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
      li.textContent = step;
      steps.appendChild(li);
    }
  });

  return () => unsub();
}
