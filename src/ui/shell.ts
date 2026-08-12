import { crewmateSvg } from "./crewmate";
import { crewColorName } from "./crew-colors";
import { getProfileColor } from "../shared/profile";
import { openProfileModal } from "./profile";
import { playClick } from "./sound";

export interface ShellItem {
  label: string;
  icon: string;
  view?: string;
  href?: string;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function itemKey(it: ShellItem): string {
  return it.view ?? it.href ?? "";
}

function itemHtml(it: ShellItem, active: boolean): string {
  const classes = `flex items-center gap-3 p-3 text-left w-full ${active ? "bg-secondary text-on-secondary font-bold rounded-full border-4 border-black block-shadow" : "text-on-surface hover:bg-surface-variant rounded-full border-4 border-transparent hover:border-black hover:block-shadow"} transition-transform active:scale-95`;
  const icon = `<span class="material-symbols-outlined text-xl shrink-0" ${active ? 'style="font-variation-settings: \'FILL\' 1;"' : ""}>${it.icon}</span>`;
  const label = `<span class="text-caption uppercase tracking-wide truncate">${escapeHtml(it.label)}</span>`;
  if (it.href) {
    return `<a href="${it.href}" class="${classes}">${icon}${label}</a>`;
  }
  return `<button type="button" data-view="${it.view ?? ""}" class="${classes}">${icon}${label}</button>`;
}

function mobileItemHtml(it: ShellItem, active: boolean): string {
  const classes = `flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1 ${active ? "text-secondary" : "text-on-surface-variant"}`;
  const icon = `<span class="material-symbols-outlined text-2xl" ${active ? 'style="font-variation-settings: \'FILL\' 1;"' : ""}>${it.icon}</span>`;
  const label = `<span class="text-[10px] uppercase tracking-wide">${escapeHtml(it.label)}</span>`;
  if (it.href) {
    return `<a href="${it.href}" class="${classes}">${icon}${label}</a>`;
  }
  return `<button type="button" data-view="${it.view ?? ""}" class="${classes}">${icon}${label}</button>`;
}

export interface RenderSidebarOpts {
  footerSlot?: string;
}

export function renderSidebar(username: string, items: ShellItem[], active: string, opts?: RenderSidebarOpts): string {
  return `
    <nav id="side-nav" class="hidden lg:flex flex-col gap-4 px-4 py-6 w-52 shrink-0 bg-black border-r-8 border-black block-shadow-md relative overflow-hidden">
      <div class="mb-4">
        <h1 class="text-heading-sm font-display text-primary tracking-tighter uppercase stroke-heavy mb-5">wirebreak</h1>
        <button type="button" id="profile-btn" class="profile-btn flex items-center gap-3 p-3 bg-surface-high border-4 border-black rounded-xl block-shadow w-full text-left" title="Editar perfil">
          <span class="w-11 h-11 rounded-full border-2 border-black overflow-hidden flex-shrink-0 bg-surface-highest flex items-center justify-center"><span class="profile-avatar">${crewmateSvg(getProfileColor(), 40)}</span></span>
          <span class="overflow-hidden min-w-0">
            <span class="block text-caption text-secondary truncate uppercase font-bold"><span class="profile-name">${escapeHtml(username)}</span></span>
            <span class="block text-[12px] text-on-surface-variant truncate uppercase"><span class="profile-color">Crewmate · ${crewColorName(getProfileColor())}</span></span>
          </span>
        </button>
      </div>
      <div class="flex flex-col gap-2">
        ${items.map((it) => itemHtml(it, itemKey(it) === active)).join("")}
      </div>
      <div class="mt-auto flex flex-col gap-3 relative">
        <div class="space-planet space-planet-sm absolute -bottom-20 -left-20 opacity-40 pointer-events-none"></div>
        ${opts?.footerSlot ?? ""}
        <div class="pt-3 border-t-4 border-outline-variant flex justify-between items-center text-caption uppercase">
          <span class="text-on-surface-variant">SYS.STAT</span>
          <span class="text-secondary flex items-center gap-1"><div class="w-2 h-2 bg-secondary rounded-full animate-pulse"></div> ONLINE</span>
        </div>
      </div>
    </nav>
  `;
}

export function renderMobileNav(items: ShellItem[], active: string): string {
  return `
    <nav id="mobile-nav" class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t-8 border-black block-shadow flex items-stretch justify-around px-2 py-1.5">
      ${items.map((it) => mobileItemHtml(it, itemKey(it) === active)).join("")}
      <button type="button" class="music-toggle flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1 text-on-surface-variant" title="Música">
        <span class="material-symbols-outlined text-2xl">music_note</span>
        <span class="text-[10px] uppercase tracking-wide">Música</span>
      </button>
    </nav>
  `;
}

export function mountSidebarProfile(onSaved?: () => void): void {
  const btn = document.getElementById("profile-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    playClick();
    openProfileModal({ onSaved });
  });
}

export function updateSidebarProfile(name: string, color: string): void {
  const avatar = document.querySelector("#side-nav .profile-avatar");
  const nameEl = document.querySelector("#side-nav .profile-name");
  const colorEl = document.querySelector("#side-nav .profile-color");
  if (avatar) avatar.innerHTML = crewmateSvg(color, 40);
  if (nameEl) nameEl.textContent = name;
  if (colorEl) colorEl.textContent = `Crewmate · ${crewColorName(color)}`;
}
