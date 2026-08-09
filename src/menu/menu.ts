import { createMenuClient } from "../portal/client";
import { getUsername, setUsername } from "../shared/username";
import { randomRoomId, randomRoomCode } from "../shared/id";
import { crewmateSvg } from "../ui/crewmate";
import { startLobbyMusic } from "../ui/music";
import { playClick } from "../ui/sound";

const CREW_COLORS = ["#ffb4a9", "#2196f3", "#4caf50", "#cdcd00", "#a4ffe8", "#c51111"];

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

function shell(active: string, username: string): string {
  const item = (label: string, icon: string, view: string): string => `
    <button data-view="${view}" class="flex items-center gap-3 p-3 text-left w-full ${active === view ? "bg-secondary text-on-secondary font-bold rounded-full border-4 border-black block-shadow" : "text-on-surface hover:bg-surface-variant rounded-full border-4 border-transparent hover:border-black hover:block-shadow"} transition-transform active:scale-95">
      <span class="material-symbols-outlined text-xl" ${active === view ? 'style="font-variation-settings: \'FILL\' 1;"' : ""}>${icon}</span>
      <span class="text-caption uppercase tracking-wide">${label}</span>
    </button>`;
  const mobileItem = (label: string, icon: string, view: string): string => `
    <button data-view="${view}" class="flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1 ${active === view ? "text-secondary" : "text-on-surface-variant"}">
      <span class="material-symbols-outlined text-2xl" ${active === view ? 'style="font-variation-settings: \'FILL\' 1;"' : ""}>${icon}</span>
      <span class="text-[10px] uppercase tracking-wide">${label}</span>
    </button>`;
  return `
    <div class="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface analog-texture">
      <nav id="side-nav" class="hidden lg:flex flex-col gap-4 p-6 w-64 shrink-0 bg-surface-container border-r-8 border-black block-shadow-md">
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
          ${item("Home", "home", "home")}
          ${item("Join Room", "meeting_room", "join")}
          ${item("Create Room", "add_box", "create")}
          ${item("Leaderboard", "leaderboard", "leaderboard")}
        </div>
        <div class="mt-auto pt-4 border-t-4 border-outline-variant flex justify-between items-center text-caption uppercase">
          <span class="text-on-surface-variant">SYS.STAT</span>
          <span class="text-secondary flex items-center gap-1"><div class="w-2 h-2 bg-secondary rounded-full animate-pulse"></div> ONLINE</span>
        </div>
      </nav>
      <nav id="mobile-nav" class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container border-t-8 border-black block-shadow flex items-stretch justify-around px-2 py-1.5">
        ${mobileItem("Home", "home", "home")}
        ${mobileItem("Join", "meeting_room", "join")}
        ${mobileItem("Create", "add_box", "create")}
        ${mobileItem("Rank", "leaderboard", "leaderboard")}
      </nav>
      <main class="flex-1 h-full overflow-y-auto px-6 lg:px-12 py-8 bg-surface relative pb-32 lg:pb-28">
        <div id="menu-body"></div>
      </main>
      <button id="fab-create" type="button" class="pressed fixed bottom-6 right-6 z-50 bg-primary text-on-primary text-body-lg uppercase px-6 py-4 rounded-full border-4 border-black block-shadow-md hidden lg:flex items-center gap-3">
        <span class="material-symbols-outlined text-2xl font-bold">add_box</span>
        <span class="hidden sm:inline tracking-wide">Create New Operation</span>
      </button>
    </div>
  `;
}

function isFabHidden(view: "home" | "join" | "create" | "leaderboard"): boolean {
  return view === "join" || view === "create";
}

function renderMenu(root: HTMLElement, menu: ReturnType<typeof createMenuClient>): void {
  const username = getUsername() ?? "OPERATOR";
  let current: "home" | "join" | "create" | "leaderboard" = "home";

  root.innerHTML = shell(current, username);
  const body = document.getElementById("menu-body")!;
  const fab = document.getElementById("fab-create");

  const startMusicOnce = () => {
    startLobbyMusic();
    window.removeEventListener("pointerdown", startMusicOnce);
    window.removeEventListener("keydown", startMusicOnce);
  };
  window.addEventListener("pointerdown", startMusicOnce);
  window.addEventListener("keydown", startMusicOnce);

  const views: Record<"home" | "join" | "create" | "leaderboard", () => (() => void) | undefined> = {
    home: () => renderHome(body, menu),
    join: () => renderJoin(body, menu),
    create: () => renderCreate(body),
    leaderboard: () => renderLeaderboard(body, menu),
  };

  let cleanup: (() => void) | undefined;

  function markActive(view: "home" | "join" | "create" | "leaderboard"): void {
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

  function switchView(view: "home" | "join" | "create" | "leaderboard"): void {
    cleanup?.();
    cleanup = undefined;
    current = view;
    markActive(view);
    body.replaceChildren();
    cleanup = views[view]();
    if (fab) fab.classList.toggle("hidden", isFabHidden(view));
  }

  document.querySelectorAll<HTMLButtonElement>("button[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playClick();
      switchView(btn.dataset.view as "home" | "join" | "create" | "leaderboard");
    });
  });
  fab?.addEventListener("click", () => {
    playClick();
    switchView("create");
  });

  markActive(current);
  cleanup = views[current]();
  if (fab) fab.classList.toggle("hidden", isFabHidden(current));
}

function renderHome(body: HTMLElement, menu: ReturnType<typeof createMenuClient>): () => void {
  body.innerHTML = `
    <div class="flex flex-col md:flex-row justify-between items-end gap-4 mb-8 border-b-8 border-black pb-4">
      <div>
        <h2 class="text-display font-display text-primary uppercase tracking-tight stroke-heavy">Operaciones activas</h2>
        <p class="text-body-sm text-on-surface-variant uppercase tracking-wider mt-2">Selecciona un sector para desplegar.</p>
      </div>
      <div class="hidden sm:flex gap-2">
        <button id="filter-public" type="button" class="px-4 py-2 bg-surface-container border-4 border-black text-caption text-on-surface uppercase block-shadow">Public</button>
        <button id="filter-private" type="button" class="px-4 py-2 bg-surface border-4 border-outline-variant text-caption text-on-surface-variant uppercase">Private</button>
      </div>
    </div>
    <div id="rooms-status" class="text-caption text-on-surface-variant uppercase mb-5">conectando...</div>
    <div id="rooms-body" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
  `;
  const statusEl = document.getElementById("rooms-status");
  const roomsBody = document.getElementById("rooms-body");
  let filter: "public" | "private" | "all" = "public";
  const applyFilter = () => {
    if (!roomsBody) return;
    const rooms = menu.getRooms();
    const visible = filter === "all" ? rooms : rooms.filter((r) => r.mode === filter);
    roomsBody.replaceChildren();
    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "col-span-full text-center text-body-sm text-on-surface-variant uppercase py-10";
      empty.innerHTML = `<span class="material-symbols-outlined text-[48px] text-ash block mx-auto mb-2">group_off</span>No hay operaciones activas. Creá una para empezar.`;
      roomsBody.appendChild(empty);
      return;
    }
    for (const r of visible) roomsBody.appendChild(roomCard(r.name, r.players, r.hostName, r.id, r.playing ?? false));
  };
  document.getElementById("filter-public")?.addEventListener("click", () => { filter = "public"; applyFilter(); });
  document.getElementById("filter-private")?.addEventListener("click", () => { filter = "private"; applyFilter(); });
  const unsubStatus = menu.subscribeStatus((s) => {
    if (statusEl) statusEl.textContent = s === "ready" ? "Red operativa." : `Estado: ${s}`;
  });
  const unsubRooms = menu.subscribeRooms(applyFilter);
  applyFilter();
  return () => {
    unsubStatus();
    unsubRooms();
  };
}

function renderJoin(body: HTMLElement, menu: ReturnType<typeof createMenuClient>): undefined {
  body.innerHTML = `
    <div class="flex flex-col md:flex-row justify-between items-end gap-4 mb-8 border-b-8 border-black pb-4">
      <div>
        <h2 class="text-display font-display text-primary uppercase tracking-tight stroke-heavy">Unirse a una operación</h2>
        <p class="text-body-sm text-on-surface-variant uppercase tracking-wider mt-2">Ingresa el código de la sala.</p>
      </div>
    </div>
    <form id="join-form" class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6 flex flex-col gap-5 max-w-md">
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
  `;
  const joinForm = document.getElementById("join-form") as HTMLFormElement;
  const joinCode = document.getElementById("join-code") as HTMLInputElement;
  joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    playClick();
    const code = joinCode.value.trim().toUpperCase();
    if (!code) return;
    const match = menu.getRooms().find((r) => r.id.toUpperCase().endsWith(`-${code}`));
    window.location.href = `/room?id=${encodeURIComponent(match ? match.id : `prv-${code}`)}`;
  });
  return undefined;
}

function renderCreate(body: HTMLElement): undefined {
  body.innerHTML = `
    <div class="flex flex-col md:flex-row justify-between items-end gap-4 mb-8 border-b-8 border-black pb-4">
      <div>
        <h2 class="text-display font-display text-primary uppercase tracking-tight stroke-heavy">Nueva operación</h2>
        <p class="text-body-sm text-on-surface-variant uppercase tracking-wider mt-2">Despliega un nuevo sector.</p>
      </div>
    </div>
    <form id="create-form" class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6 flex flex-col gap-5 max-w-md">
      <h3 class="text-heading-sm font-display text-secondary uppercase">Nueva operación</h3>
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
      <button type="submit" class="pressed bg-secondary text-on-secondary text-body-sm font-bold py-2 rounded-full border-4 border-black block-shadow">
        Crear operación
      </button>
    </form>
  `;
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
  return undefined;
}

function renderLeaderboard(body: HTMLElement, menu: ReturnType<typeof createMenuClient>): () => void {
  body.innerHTML = `
    <div class="flex flex-col md:flex-row justify-between items-end gap-4 mb-8 border-b-8 border-black pb-4">
      <div>
        <h2 class="text-display font-display text-primary uppercase tracking-tight stroke-heavy">Leaderboard</h2>
        <p class="text-body-sm text-on-surface-variant uppercase tracking-wider mt-2">Operaciones activas en la red.</p>
      </div>
    </div>
    <div id="lb-body" class="flex flex-col gap-3"></div>
  `;
  const lbBody = document.getElementById("lb-body");
  const render = () => {
    if (!lbBody) return;
    const rooms = menu.getRooms();
    const sorted = [...rooms].sort((a, b) => {
      if ((b.playing ?? false) !== (a.playing ?? false)) return (b.playing ? 1 : 0) - (a.playing ? 1 : 0);
      return b.players - a.players;
    });
    lbBody.replaceChildren();
    if (sorted.length === 0) {
      const empty = document.createElement("div");
      empty.className = "text-center text-body-sm text-on-surface-variant uppercase py-10";
      empty.innerHTML = `<span class="material-symbols-outlined text-[48px] text-ash block mx-auto mb-2">leaderboard</span>Sin operaciones activas.`;
      lbBody.appendChild(empty);
      return;
    }
    for (const r of sorted) {
      const row = document.createElement("div");
      row.className = "bg-surface-container border-8 border-black rounded-xl block-shadow-md p-4 flex items-center justify-between gap-4";
      row.innerHTML = `
        <div class="min-w-0">
          <p class="text-heading-sm font-display text-on-surface uppercase truncate">${escapeHtml(r.name)}</p>
          <p class="text-caption text-on-surface-variant uppercase">Host: ${escapeHtml(r.hostName)}</p>
        </div>
        <div class="flex items-center gap-4 shrink-0">
          <span class="flex items-center gap-1 text-body-sm text-on-surface"><span class="material-symbols-outlined text-[18px]">group</span> ${r.players}/4</span>
          <span class="${r.playing ? "bg-secondary text-on-secondary" : "bg-surface-variant text-on-surface border-dashed"} px-3 py-1 border-4 border-black rounded text-caption uppercase">${r.playing ? "EN CURSO" : "ESPERA"}</span>
        </div>
      `;
      lbBody.appendChild(row);
    }
  };
  const unsubRooms = menu.subscribeRooms(render);
  render();
  return () => {
    unsubRooms();
  };
}

function roomCard(name: string, players: number, hostName: string, id: string, playing: boolean): HTMLElement {
  const card = document.createElement("div");
  card.className =
    "bg-surface-container border-8 border-black p-4 rounded-xl block-shadow-md flex flex-col group relative overflow-hidden transition-transform hover:-translate-y-1";
  const locked = playing || players >= 4;
  const label = playing ? "En curso" : players >= 4 ? "Llena" : "Unirse";
  const code = id.slice(id.indexOf("-") + 1);
  card.innerHTML = `
    <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
    <div class="h-32 bg-surface-high border-4 border-black rounded-lg mb-4 p-2 relative overflow-hidden flex items-center justify-center">
      <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(circle at 2px 2px, #a4ffe8 1px, transparent 0); background-size: 16px 16px;"></div>
      <span class="material-symbols-outlined text-6xl text-secondary z-10" style="font-variation-settings: 'wght' 200;">cable</span>
      <div class="absolute top-2 left-2 bg-black px-2 py-1 text-[10px] text-secondary uppercase border-2 border-secondary">Sec: ${escapeHtml(code)}</div>
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
      <button class="join-btn px-6 py-2 ${locked ? "bg-surface-container text-on-surface-variant border-4 border-black cursor-not-allowed" : "bg-secondary text-on-secondary border-4 border-black block-shadow pressed"} text-caption uppercase rounded-full">${label}</button>
    </div>
  `;
  card.querySelector<HTMLButtonElement>(".join-btn")!.addEventListener("click", () => {
    if (locked) return;
    window.location.href = `/room?id=${encodeURIComponent(id)}`;
  });
  return card;
}

function cableStrip(players: number): string {
  const colors = ["#ffb4a9", "#2196f3", "#4caf50", "#cdcd00"];
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
