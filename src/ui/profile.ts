import { getUsername, setUsername } from "../shared/username";
import { getProfileColor, setProfileColor } from "../shared/profile";
import { CREW_COLORS, crewColorName } from "./crew-colors";
import { playClick } from "./sound";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export interface ProfileModalOpts {
  onSaved?: () => void;
}

export function openProfileModal(opts?: ProfileModalOpts): void {
  const existing = document.getElementById("profile-modal");
  if (existing) {
    existing.classList.remove("hidden");
    return;
  }
  const overlay = document.createElement("div");
  overlay.id = "profile-modal";
  overlay.className = "fixed inset-0 z-[60] bg-surface/90 backdrop-blur flex items-center justify-center px-6";
  const name = getUsername() ?? "";
  const initial = getProfileColor();
  const swatches = CREW_COLORS.map((c) => {
    const active = c === initial;
    return `<button type="button" data-color="${c}" class="profile-swatch w-10 h-10 rounded-full border-4 border-black transition-transform hover:scale-110 ${active ? "ring-4 ring-secondary" : ""}" style="background:${c}" title="${crewColorName(c)}"></button>`;
  }).join("");
  overlay.innerHTML = `
    <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-8 w-full max-w-md relative">
      <button id="profile-close" type="button" class="absolute top-3 right-3 text-on-surface-variant hover:text-error transition-colors">
        <span class="material-symbols-outlined">close</span>
      </button>
      <h3 class="text-heading-sm font-display text-secondary uppercase mb-6">Tu perfil</h3>
      <form id="profile-form" class="flex flex-col gap-5">
        <input
          id="profile-name"
          maxlength="16"
          value="${escapeHtml(name)}"
          placeholder="Callsign"
          class="bg-surface-high border-4 border-black rounded-lg px-3 py-2 text-body-sm text-carbon placeholder:text-slate-gray focus:outline-none focus:border-secondary"
        />
        <div class="flex flex-wrap gap-3">
          ${swatches}
        </div>
        <button type="submit" class="pressed bg-secondary text-on-secondary text-body-sm font-bold py-2 rounded-full border-4 border-black block-shadow uppercase">
          Guardar
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  const form = document.getElementById("profile-form") as HTMLFormElement;
  const nameInput = document.getElementById("profile-name") as HTMLInputElement;
  let selected = initial;
  const refresh = (): void => {
    overlay.querySelectorAll<HTMLButtonElement>(".profile-swatch").forEach((b) => {
      b.classList.toggle("ring-4", b.dataset.color === selected);
      b.classList.toggle("ring-secondary", b.dataset.color === selected);
    });
  };
  overlay.querySelectorAll<HTMLButtonElement>(".profile-swatch").forEach((b) => {
    b.addEventListener("click", () => {
      playClick();
      selected = b.dataset.color ?? selected;
      refresh();
    });
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = nameInput.value.trim();
    if (!n) return;
    setUsername(n);
    setProfileColor(selected);
    overlay.remove();
    opts?.onSaved?.();
  });
  document.getElementById("profile-close")?.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
