import { crewmateSvg } from "./crewmate";

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
  const icon = `<span class="material-symbols-outlined text-xl" ${active ? 'style="font-variation-settings: \'FILL\' 1;"' : ""}>${it.icon}</span>`;
  const label = `<span class="text-caption uppercase tracking-wide">${escapeHtml(it.label)}</span>`;
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

export function renderSidebar(username: string, items: ShellItem[], active: string): string {
  return `
    <nav id="side-nav" class="hidden lg:flex flex-col gap-4 p-6 w-52 shrink-0 bg-surface-container border-r-8 border-black block-shadow-md">
      <div class="mb-6">
        <h1 class="text-heading-sm font-display text-primary tracking-tighter uppercase stroke-heavy mb-6">cable rush</h1>
        <div class="flex items-center gap-3 p-3 bg-surface-high border-4 border-black rounded-xl block-shadow">
          <div class="w-12 h-12 rounded-full border-2 border-black overflow-hidden flex-shrink-0 bg-surface-highest flex items-center justify-center">${crewmateSvg("#ffb4a9", 44)}</div>
          <div class="overflow-hidden">
            <div class="text-caption text-secondary truncate uppercase font-bold">${escapeHtml(username)}</div>
            <div class="text-[12px] text-on-surface-variant truncate uppercase">Rank: Defuser</div>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        ${items.map((it) => itemHtml(it, itemKey(it) === active)).join("")}
      </div>
      <div class="mt-auto pt-4 border-t-4 border-outline-variant flex justify-between items-center text-caption uppercase">
        <span class="text-on-surface-variant">SYS.STAT</span>
        <span class="text-secondary flex items-center gap-1"><div class="w-2 h-2 bg-secondary rounded-full animate-pulse"></div> ONLINE</span>
      </div>
    </nav>
  `;
}

export function renderMobileNav(items: ShellItem[], active: string): string {
  return `
    <nav id="mobile-nav" class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container border-t-8 border-black block-shadow flex items-stretch justify-around px-2 py-1.5">
      ${items.map((it) => mobileItemHtml(it, itemKey(it) === active)).join("")}
    </nav>
  `;
}
