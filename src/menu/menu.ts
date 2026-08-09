import { createMenuClient } from "../portal/client";
import { getUsername, setUsername } from "../shared/username";
import { randomRoomId, randomRoomCode } from "../shared/id";
import { startLobbyMusic } from "../ui/music";
import { playClick } from "../ui/sound";
import { renderMobileNav, renderSidebar } from "../ui/shell";
import type { ShellItem } from "../ui/shell";
import { reglasHtml } from "../ui/reglas";

type MenuView = "rooms" | "reglas";

const ROOM_ITEMS: ShellItem[] = [
  { label: "Rooms", icon: "meeting_room", view: "rooms" },
  { label: "Reglas", icon: "menu_book", view: "reglas" },
];

export function bootMenu(): void {
  const root = document.getElementById("app");
  if (!root) return;

  const menu = createMenuClient();

  const username = getUsername();
  if (!username) {
    renderUsername(root, (name) => {
      setUsername(name);
      renderMenu(root, menu);
    });
    return;
  }
  renderMenu(root, menu);
}

function renderUsername(root: HTMLElement, onDone: (name: string) => void): void {
  root.innerHTML = `
    <div class="min-h-screen bg-surface text-on-surface analog-texture flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div class="text-center mb-10">
        <h1 class="text-hero font-display text-primary tracking-tighter uppercase stroke-heavy mb-1">cable rush</h1>
        <p class="text-subheading text-secondary font-bold uppercase tracking-wide">Identidad para continuar</p>
      </div>
      <form id="user-form" class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-10 w-full max-w-md relative text-center">
        <div class="text-left mb-6">
          <label class="sr-only" for="user-name">Callsign</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">person</span>
            <input
              id="user-name"
              maxlength="16"
              autofocus
              placeholder="Ingresa tu callsign"
              class="block w-full pl-12 pr-4 py-4 bg-surface-high border-4 border-black rounded-lg text-body text-carbon placeholder:text-slate-gray focus:outline-none focus:border-secondary"
            />
          </div>
        </div>
        <button type="submit" class="pressed w-full bg-secondary text-on-secondary text-subheading py-4 rounded-full border-4 border-black block-shadow hover:bg-secondary-container transition-colors">
          Conectar a la red
        </button>
      </form>
    </div>
  `;
  const form = document.getElementById("user-form") as HTMLFormElement;
  const input = document.getElementById("user-name") as HTMLInputElement;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (name) onDone(name);
  });
}

function shell(active: MenuView, username: string): string {
  return `
    <div class="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface analog-texture">
      ${renderSidebar(username, ROOM_ITEMS, active)}
      <main class="flex-1 h-full overflow-y-auto px-6 lg:px-12 py-8 bg-surface relative pb-32 lg:pb-28">
        <div id="menu-body"></div>
      </main>
      ${renderMobileNav(ROOM_ITEMS, active)}
    </div>
  `;
}

function renderMenu(root: HTMLElement, menu: ReturnType<typeof createMenuClient>): void {
  const username = getUsername() ?? "OPERATOR";
  let current: MenuView = "rooms";

  root.innerHTML = shell(current, username);
  const body = document.getElementById("menu-body")!;

  const startMusicOnce = () => {
    startLobbyMusic();
    window.removeEventListener("pointerdown", startMusicOnce);
    window.removeEventListener("keydown", startMusicOnce);
  };
  window.addEventListener("pointerdown", startMusicOnce);
  window.addEventListener("keydown", startMusicOnce);

  const views: Record<MenuView, () => (() => void) | undefined> = {
    rooms: () => renderRooms(body, menu),
    reglas: () => renderReglas(body),
  };

  let cleanup: (() => void) | undefined;

  function markActive(view: MenuView): void {
    document.querySelectorAll<HTMLButtonElement>("#side-nav button[data-view]").forEach((btn) => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle("bg-secondary", isActive);
      btn.classList.toggle("text-on-secondary", isActive);
      btn.classList.toggle("font-bold", isActive);
      btn.classList.toggle("border-black", isActive);
      btn.classList.toggle("block-shadow", isActive);
      btn.classList.toggle("text-on-surface", !isActive);
      btn.classList.toggle("border-transparent", !isActive);
      btn.classList.toggle("hover:bg-surface-variant", !isActive);
      btn.classList.toggle("hover:border-black", !isActive);
      btn.classList.toggle("hover:block-shadow", !isActive);
      const icon = btn.querySelector(".material-symbols-outlined");
      if (icon) icon.setAttribute("style", isActive ? "font-variation-settings: 'FILL' 1;" : "");
    });
    document.querySelectorAll<HTMLButtonElement>("#mobile-nav button[data-view]").forEach((btn) => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle("text-secondary", isActive);
      btn.classList.toggle("text-on-surface-variant", !isActive);
      const icon = btn.querySelector(".material-symbols-outlined");
      if (icon) icon.setAttribute("style", isActive ? "font-variation-settings: 'FILL' 1;" : "");
    });
  }

  function switchView(view: MenuView): void {
    cleanup?.();
    cleanup = undefined;
    current = view;
    markActive(view);
    body.replaceChildren();
    cleanup = views[view]();
  }

  document.querySelectorAll<HTMLButtonElement>("button[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playClick();
      const v = btn.dataset.view as MenuView;
      if (v === "rooms" || v === "reglas") switchView(v);
    });
  });

  markActive(current);
  cleanup = views[current]();
}

function renderRooms(body: HTMLElement, menu: ReturnType<typeof createMenuClient>): () => void {
  body.innerHTML = `
    <div class="flex flex-col md:flex-row justify-between items-end gap-4 mb-8 border-b-8 border-black pb-4">
      <div>
        <h2 class="text-display font-display text-primary uppercase tracking-tight stroke-heavy">Rooms</h2>
        <p class="text-body-sm text-on-surface-variant uppercase tracking-wider mt-2">Todas las operaciones activas en la red.</p>
      </div>
      <div id="room-filters" class="hidden sm:flex gap-2">
        <button type="button" data-filter="all" class="room-filter px-4 py-2 bg-secondary text-on-secondary border-4 border-black text-caption uppercase block-shadow">All</button>
        <button type="button" data-filter="public" class="room-filter px-4 py-2 bg-surface-container border-4 border-black text-caption text-on-surface uppercase block-shadow">Public</button>
        <button type="button" data-filter="private" class="room-filter px-4 py-2 bg-surface-container border-4 border-black text-caption text-on-surface uppercase block-shadow">Private</button>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2">
        <div id="rooms-status" class="text-caption text-on-surface-variant uppercase mb-5">conectando...</div>
        <div id="rooms-body" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
      </section>
      <aside class="flex flex-col gap-6">
        <form id="join-form" class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6 flex flex-col gap-5">
          <h3 class="text-heading-sm font-display text-secondary uppercase">Unirse con código</h3>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">key</span>
            <input
              id="join-code"
              maxlength="8"
              placeholder="Código"
              class="w-full pl-10 pr-3 py-2 bg-surface-high border-4 border-black rounded-lg text-body-sm text-carbon uppercase placeholder:text-slate-gray focus:outline-none focus:border-secondary"
            />
          </div>
          <button type="submit" class="pressed bg-secondary text-on-secondary text-body-sm font-bold py-2 rounded-full border-4 border-black block-shadow">
            Unirse
          </button>
        </form>
        <button id="create-btn" type="button" class="pressed bg-primary text-on-primary text-body-sm font-bold py-2 rounded-full border-4 border-black block-shadow uppercase">
          Crear operación
        </button>
      </aside>
    </div>
  `;

  const statusEl = document.getElementById("rooms-status");
  const roomsBody = document.getElementById("rooms-body");
  let filter: "all" | "public" | "private" = "all";
  let lastRoomsSig: string | null = null;

  function setFilterButton(f: "all" | "public" | "private"): void {
    document.querySelectorAll<HTMLButtonElement>("#room-filters button[data-filter]").forEach((b) => {
      const active = b.dataset.filter === f;
      b.className = `room-filter px-4 py-2 border-4 border-black text-caption uppercase ${active ? "bg-secondary text-on-secondary block-shadow" : "bg-surface-container text-on-surface"}`;
    });
  }

  const applyFilter = () => {
    if (!roomsBody) return;
    const rooms = menu.getRooms();
    const visible = filter === "all" ? rooms : rooms.filter((r) => r.mode === filter);
    const sig = visible.map((r) => `${r.id}|${r.name}|${r.hostName}|${r.players}|${r.playing ?? false}|${r.mode}`).join("\u0000");
    if (sig === lastRoomsSig) return;
    lastRoomsSig = sig;
    roomsBody.replaceChildren();
    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "col-span-full text-center text-body-sm text-on-surface-variant uppercase py-10";
      empty.innerHTML = `<span class="material-symbols-outlined text-[48px] text-ash block mx-auto mb-2">group_off</span>No hay operaciones activas. Creá una para empezar.`;
      roomsBody.appendChild(empty);
      return;
    }
    for (const r of visible) roomsBody.appendChild(roomCard(r.name, r.players, r.hostName, r.id, r.playing ?? false, r.mode));
  };

  document.querySelectorAll<HTMLButtonElement>("#room-filters button[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playClick();
      const f = btn.dataset.filter as "all" | "public" | "private";
      filter = f;
      setFilterButton(f);
      applyFilter();
    });
  });

  const unsubStatus = menu.subscribeStatus((s) => {
    if (statusEl) statusEl.textContent = s === "ready" ? "Red operativa." : `Estado: ${s}`;
  });
  const unsubRooms = menu.subscribeRooms(applyFilter);

  const joinForm = document.getElementById("join-form") as HTMLFormElement;
  const joinCode = document.getElementById("join-code") as HTMLInputElement;
  joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    playClick();
    const code = joinCode.value.trim().toUpperCase();
    if (!code) return;
    const match = menu.getRooms().find((r) => r.id.toUpperCase().endsWith(`-${code}`));
    const name = match ? `&name=${encodeURIComponent(match.name)}` : "";
    window.location.href = `/room?id=${encodeURIComponent(match ? match.id : `prv-${code}`)}${name}`;
  });
  document.getElementById("create-btn")?.addEventListener("click", () => {
    playClick();
    openCreateModal();
  });

  setFilterButton("all");
  applyFilter();
  return () => {
    unsubStatus();
    unsubRooms();
  };
}

function renderReglas(body: HTMLElement): undefined {
  body.innerHTML = reglasHtml();
  return undefined;
}

function openCreateModal(): void {
  const existing = document.getElementById("create-modal");
  if (existing) {
    existing.classList.remove("hidden");
    return;
  }
  const overlay = document.createElement("div");
  overlay.id = "create-modal";
  overlay.className = "fixed inset-0 z-[60] bg-surface/90 backdrop-blur flex items-center justify-center px-6";
  overlay.innerHTML = `
    <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-8 w-full max-w-md relative">
      <button id="create-close" type="button" class="absolute top-3 right-3 text-on-surface-variant hover:text-error transition-colors">
        <span class="material-symbols-outlined">close</span>
      </button>
      <h3 class="text-heading-sm font-display text-secondary uppercase mb-6">Nueva operación</h3>
      <form id="create-form" class="flex flex-col gap-5">
        <input
          id="create-name"
          maxlength="24"
          placeholder="Nombre (opcional)"
          class="bg-surface-high border-4 border-black rounded-lg px-3 py-2 text-body-sm text-carbon placeholder:text-slate-gray focus:outline-none focus:border-secondary"
        />
        <select
          id="create-mode"
          class="bg-surface-high border-4 border-black rounded-lg px-3 py-2 text-body-sm text-carbon focus:outline-none focus:border-secondary"
        >
          <option value="public">Pública</option>
          <option value="private">Privada (código)</option>
        </select>
        <button type="submit" class="pressed bg-secondary text-on-secondary text-body-sm font-bold py-2 rounded-full border-4 border-black block-shadow uppercase">
          Crear operación
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  const createForm = document.getElementById("create-form") as HTMLFormElement;
  const createName = document.getElementById("create-name") as HTMLInputElement;
  const createMode = document.getElementById("create-mode") as HTMLSelectElement;
  createForm.addEventListener("submit", (e) => {
    e.preventDefault();
    playClick();
    const mode = createMode.value as "public" | "private";
    const id = mode === "public" ? randomRoomId() : `prv-${randomRoomCode()}`;
    const name = createName.value.trim() || "Room";
    window.location.href = `/room?id=${encodeURIComponent(id)}&host=1&name=${encodeURIComponent(name)}`;
  });
  document.getElementById("create-close")?.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function roomCard(name: string, players: number, hostName: string, id: string, playing: boolean, mode: "public" | "private"): HTMLElement {
  const card = document.createElement("div");
  card.className =
    "bg-surface-container border-8 border-black p-4 rounded-xl block-shadow-md flex flex-col group relative overflow-hidden transition-transform hover:-translate-y-1";
  const privateRoom = mode === "private";
  const locked = playing || players >= 4 || privateRoom;
  const label = playing ? "En curso" : players >= 4 ? "Llena" : privateRoom ? "Privada" : "Unirse";
  const code = id.slice(id.indexOf("-") + 1);
  card.innerHTML = `
    <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
    <div class="h-32 bg-surface-high border-4 border-black rounded-lg mb-4 p-2 relative overflow-hidden flex items-center justify-center">
      <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(circle at 2px 2px, #a4ffe8 1px, transparent 0); background-size: 16px 16px;"></div>
      <span class="material-symbols-outlined text-6xl text-secondary z-10" style="font-variation-settings: 'wght' 200;">cable</span>
      ${privateRoom
        ? `<div class="absolute top-2 left-2 bg-black px-2 py-1 text-[10px] text-tertiary uppercase border-2 border-tertiary">PRIV</div>
           <div class="absolute top-2 right-2 bg-black px-2 py-1 text-[10px] text-tertiary uppercase border-2 border-tertiary"><span class="material-symbols-outlined text-[12px]">lock</span></div>`
        : `<div class="absolute top-2 left-2 bg-black px-2 py-1 text-[10px] text-secondary uppercase border-2 border-secondary">Sec: ${escapeHtml(code)}</div>
           <div class="absolute top-2 right-2 bg-black px-2 py-1 text-[10px] text-tertiary uppercase border-2 border-tertiary">PUB</div>`}
    </div>
    <div class="flex justify-between items-start mb-2">
      <h3 class="text-heading-sm font-display text-on-surface uppercase truncate pr-2">${escapeHtml(name)}</h3>
      <div class="bg-surface-highest border-2 border-black px-2 py-1 flex items-center gap-1 rounded">
        <span class="material-symbols-outlined text-sm text-secondary">group</span>
        <span class="text-caption text-on-surface">${players}/4</span>
      </div>
    </div>
    <p class="text-body-sm text-on-surface-variant mb-6 uppercase">Host: ${escapeHtml(hostName)}</p>
    <div class="mt-auto pt-4 border-t-4 border-black border-dashed flex justify-between items-center">
      <div class="flex gap-1">
        ${cableStrip(players)}
      </div>
      <div class="flex flex-col items-end gap-1">
        <button class="join-btn px-6 py-2 ${locked ? "bg-surface-container text-on-surface-variant border-4 border-black cursor-not-allowed" : "bg-secondary text-on-secondary border-4 border-black block-shadow pressed"} text-caption uppercase rounded-full">${label}</button>
        ${privateRoom ? '<span class="text-caption text-on-surface-variant uppercase text-[10px]">Usá el código para unirte</span>' : ""}
      </div>
    </div>
  `;
  card.querySelector<HTMLButtonElement>(".join-btn")!.addEventListener("click", () => {
    if (locked) return;
    window.location.href = `/room?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;
  });
  return card;
}

function cableStrip(players: number): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    const on = i < players;
    out += `<span class="w-2 h-8 ${on ? "bg-error" : "bg-surface-highest"} border-2 border-black inline-block"></span>`;
  }
  return out;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
