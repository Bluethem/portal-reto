import { createMenuClient } from "../portal/client";
import { getUsername, setUsername } from "../shared/username";
import { randomRoomId, randomRoomCode } from "../shared/id";
import { startLobbyMusic, mountMusicToggle, MUSIC_TOGGLE_HTML } from "../ui/music";
import { playClick } from "../ui/sound";
import { renderMobileNav, renderSidebar, mountSidebarProfile, updateSidebarProfile } from "../ui/shell";
import type { ShellItem } from "../ui/shell";
import { reglasHtml } from "../ui/reglas";
import { playIntro } from "../ui/intro";
import { shipSvg } from "../ui/ship";
import { spaceBackdrop } from "../ui/space";
import { crewmateSvg } from "../ui/crewmate";
import { CREW_COLORS, crewColorName } from "../ui/crew-colors";
import { getProfileColor, setProfileColor } from "../shared/profile";

type MenuView = "rooms" | "reglas";

const ROOM_ITEMS: ShellItem[] = [
  { label: "Rooms", icon: "meeting_room", view: "rooms" },
  { label: "Reglas", icon: "menu_book", view: "reglas" },
];

export function bootMenu(): void {
  const root = document.getElementById("app");
  if (!root) return;

  playIntro();
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
  let selectedColor = getProfileColor();
  root.innerHTML = `
    <div class="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center px-6 relative overflow-hidden">
      ${spaceBackdrop()}
      <div class="relative z-10 text-center mb-10">
        <h1 class="text-hero font-display text-primary tracking-tighter uppercase stroke-heavy mb-1">wirebreak</h1>
        <p class="text-subheading text-secondary font-bold uppercase tracking-wide">Identidad para continuar</p>
      </div>
      <form id="user-form" class="relative z-10 bg-surface-container border-8 border-black rounded-xl block-shadow-md p-10 w-full max-w-md text-center">
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
        <div class="text-left mb-6">
          <label class="text-caption text-on-surface-variant uppercase mb-2 block">Color de crewmate</label>
          <div id="identity-colors" class="flex flex-wrap gap-3">
            ${CREW_COLORS.map((c) => {
              const active = c === selectedColor;
              return `<button type="button" data-color="${c}" class="ident-swatch w-10 h-10 rounded-full border-4 border-black transition-transform hover:scale-110 ${active ? "ring-4 ring-secondary" : ""}" style="background:${c}" title="${crewColorName(c)}"></button>`;
            }).join("")}
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
  document.querySelectorAll<HTMLButtonElement>("#identity-colors .ident-swatch").forEach((b) => {
    b.addEventListener("click", () => {
      playClick();
      selectedColor = b.dataset.color ?? selectedColor;
      document.querySelectorAll<HTMLButtonElement>("#identity-colors .ident-swatch").forEach((x) => {
        x.classList.toggle("ring-4", x.dataset.color === selectedColor);
        x.classList.toggle("ring-secondary", x.dataset.color === selectedColor);
      });
    });
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    setProfileColor(selectedColor);
    onDone(name);
  });
}

function shell(active: MenuView, username: string): string {
  return `
    <div class="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface relative overflow-hidden">
      ${spaceBackdrop()}
      ${renderSidebar(username, ROOM_ITEMS, active, { footerSlot: MUSIC_TOGGLE_HTML })}
      <main class="relative z-10 flex-1 h-full overflow-y-auto px-6 lg:px-12 py-8 pb-32 lg:pb-28">
        <div id="menu-body" class="relative z-10"></div>
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
  mountMusicToggle();
  mountSidebarProfile(() => {
    updateSidebarProfile(getUsername() ?? "", getProfileColor());
  });

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
    <div class="relative">
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
        ${shipSvg("#a4ffe8", 380)}
      </div>
      <div class="relative z-10">
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 border-b-8 border-black pb-5">
          <div>
            <h2 class="text-display font-display text-primary uppercase tracking-tight stroke-heavy">Operaciones activas</h2>
            <p class="text-body-sm text-on-surface-variant uppercase tracking-wider mt-2">Sectores disponibles en la red.</p>
          </div>
          <button id="create-btn" type="button" class="pressed bg-primary text-on-primary text-body-sm font-bold py-3 px-6 rounded-full border-4 border-black block-shadow uppercase flex items-center gap-2 justify-center">
            <span class="material-symbols-outlined text-lg">add_box</span> Crear operación
          </button>
        </div>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div id="room-filters" class="hidden sm:flex gap-2">
            <button type="button" data-filter="all" class="room-filter px-4 py-2 bg-secondary text-on-secondary border-4 border-black text-caption uppercase block-shadow">All</button>
            <button type="button" data-filter="public" class="room-filter px-4 py-2 bg-surface-container border-4 border-black text-caption text-on-surface uppercase block-shadow">Public</button>
            <button type="button" data-filter="private" class="room-filter px-4 py-2 bg-surface-container border-4 border-black text-caption text-on-surface uppercase block-shadow">Private</button>
          </div>
          <form id="join-form" class="flex items-center gap-2 bg-surface-container border-8 border-black rounded-full block-shadow-md pl-4 pr-2 py-2 w-full md:w-auto">
            <span class="material-symbols-outlined text-on-surface-variant">key</span>
            <input
              id="join-code"
              maxlength="8"
              placeholder="Código"
              class="w-28 bg-transparent text-body-sm text-carbon uppercase placeholder:text-slate-gray focus:outline-none"
            />
            <button type="submit" class="pressed bg-secondary text-on-secondary text-body-sm font-bold py-2 px-5 rounded-full border-4 border-black block-shadow">
              Unirse
            </button>
          </form>
        </div>
        <p id="join-error" class="hidden text-body-sm text-error font-bold uppercase mb-5"></p>
        <div id="rooms-status" class="text-caption text-on-surface-variant uppercase mb-5">conectando...</div>
        <div id="rooms-body" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div>
      </div>
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
      empty.className = "col-span-full flex flex-col items-center justify-center gap-4 text-center text-body-sm text-on-surface-variant uppercase py-10";
      empty.innerHTML = `${shipSvg("#cdcd00", 150)}<span>No hay operaciones activas. Creá una para empezar.</span>`;
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
  const joinErrorEl = document.getElementById("join-error");
  joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    playClick();
    const code = joinCode.value.trim().toUpperCase();
    if (!code) return;
    const match = menu.getRooms().find((r) => r.id.toUpperCase().endsWith(`-${code}`));
    if (!match) {
      if (joinErrorEl) {
        joinErrorEl.textContent = "Sala no encontrada con ese código.";
        joinErrorEl.classList.remove("hidden");
      }
      return;
    }
    const name = `&name=${encodeURIComponent(match.name)}`;
    window.location.href = `/room?id=${encodeURIComponent(match.id)}${name}`;
  });
  joinCode.addEventListener("input", () => {
    joinErrorEl?.classList.add("hidden");
  });
  document.getElementById("create-btn")?.addEventListener("click", () => {
    playClick();
    openCreateModal(menu);
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

function openCreateModal(menu: ReturnType<typeof createMenuClient>): void {
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
    let id = "";
    for (let i = 0; i < 8; i++) {
      const candidate = mode === "public" ? randomRoomId() : `prv-${randomRoomCode()}`;
      if (!menu.getRooms().some((r) => r.id === candidate)) {
        id = candidate;
        break;
      }
    }
    if (!id) id = mode === "public" ? randomRoomId() : `prv-${randomRoomCode()}`;
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
    "bg-surface-container border-8 border-black p-4 rounded-xl block-shadow-md flex flex-col group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_0_28px_rgba(164,255,232,0.25)]";
  const privateRoom = mode === "private";
  const locked = players >= 4 || privateRoom;
  const label = privateRoom ? "Privada" : players >= 4 ? "Llena" : playing ? "Entrar" : "Unirse";
  const code = id.slice(id.indexOf("-") + 1);
  card.innerHTML = `
    <div class="h-28 rounded-lg mb-4 relative overflow-hidden border-4 border-black bg-black/40 flex items-center justify-center">
      <div class="space-stars absolute inset-0 opacity-40"></div>
      <div class="space-planet space-planet-sm absolute -bottom-14 -left-10 opacity-30"></div>
      <span class="material-symbols-outlined text-5xl text-secondary z-10" style="font-variation-settings: 'wght' 200;">cable</span>
      ${playing ? '<div class="absolute top-2 right-2 z-10 bg-secondary text-on-secondary px-2 py-0.5 text-[10px] uppercase border-2 border-black font-bold">EN CURSO</div>' : ""}
      ${privateRoom
        ? `<div class="absolute top-2 left-2 z-10 bg-black px-2 py-0.5 text-[10px] text-tertiary uppercase border-2 border-tertiary flex items-center gap-1">PRIV <span class="material-symbols-outlined text-[11px]">lock</span></div>`
        : `<div class="absolute top-2 left-2 z-10 bg-black px-2 py-0.5 text-[10px] text-secondary uppercase border-2 border-secondary">Sec: ${escapeHtml(code)}</div>`}
    </div>
    <div class="flex justify-between items-start mb-2 gap-2">
      <h3 class="text-heading-sm font-display text-on-surface uppercase truncate pr-2">${escapeHtml(name)}</h3>
      <div class="flex items-center gap-1 bg-surface-highest border-2 border-black px-2 py-1 rounded shrink-0">
        <span class="material-symbols-outlined text-sm text-secondary">group</span>
        <span class="text-caption text-on-surface">${players}/4</span>
      </div>
    </div>
    <p class="text-body-sm text-on-surface-variant mb-4 uppercase">Host: ${escapeHtml(hostName)}</p>
    <div class="flex items-end justify-between gap-3 mt-auto">
      <div class="flex items-end gap-1">
        ${crewHeads(players)}
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

function crewHeads(players: number): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    const color = CREW_COLORS[i % CREW_COLORS.length];
    out += i < players
      ? `<span class="inline-block -ml-1 first:ml-0">${crewmateSvg(color, 24)}</span>`
      : `<span class="inline-block w-6 h-6 rounded-full border-2 border-dashed border-on-surface-variant/50 bg-surface-high -ml-1 first:ml-0"></span>`;
  }
  return out;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
