import { createMenuClient } from "../portal/client";
import { getUsername, setUsername } from "../shared/username";
import { randomRoomId, randomRoomCode } from "../shared/id";

export function bootMenu(): void {
  const root = document.getElementById("app");
  if (!root) return;

  const menu = createMenuClient();

  const username = getUsername();
  if (!username) {
    renderUsername(root, (name) => {
      setUsername(name);
      renderRooms(root, menu);
    });
    return;
  }
  renderRooms(root, menu);
}

function renderUsername(root: HTMLElement, onDone: (name: string) => void): void {
  root.innerHTML = `
    <div class="min-h-screen bg-slate-gray flex flex-col items-center justify-center px-10 relative overflow-hidden">
      <div class="text-center mb-10">
        <h1 class="text-hero text-sunbeam-yellow lowercase tracking-tight mb-1">cable rush</h1>
        <p class="text-heading-sm text-paper-white font-bold opacity-90">Identidad para continuar</p>
      </div>
      <form id="user-form" class="bg-sand rounded-[24px] p-10 w-full max-w-md relative text-center">
        <div class="text-left mb-6">
          <label class="sr-only" for="user-name">Callsign</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">person</span>
            <input
              id="user-name"
              maxlength="16"
              autofocus
              placeholder="Ingresa tu callsign"
              class="block w-full pl-12 pr-4 py-4 bg-fog border border-outline-variant rounded-[6px] text-body text-carbon placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-electric-violet focus:border-transparent transition-all"
            />
          </div>
        </div>
        <button type="submit" class="w-full bg-electric-violet text-paper-white text-subheading py-4 rounded-[34px] shadow-pill hover:bg-secondary-container transition-colors">
          Conectar a la red
        </button>
        <span class="absolute left-1/2 -bottom-[15px] -translate-x-1/2 w-0 h-0 border-l-[15px] border-r-[15px] border-t-[15px] border-l-transparent border-r-transparent border-t-sand"></span>
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

function renderRooms(root: HTMLElement, menu: ReturnType<typeof createMenuClient>): void {
  root.innerHTML = `
    <div class="min-h-screen flex flex-col">
      <header class="bg-slate-gray w-full flex-none">
        <div class="flex items-center justify-between w-full px-10 py-2 max-w-[1200px] mx-auto h-20">
          <span class="text-heading-sm font-extrabold text-sunbeam-yellow lowercase">cable rush</span>
        </div>
      </header>
      <main class="flex-1 w-full max-w-[1200px] mx-auto px-10 py-15">
        <div class="mb-10">
          <h1 class="text-display text-carbon mb-5">Operaciones activas</h1>
          <p class="text-body-sm text-on-surface-variant">Selecciona una operación o crea la tuya.</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-7">
          <section class="lg:col-span-2">
            <div id="rooms-status" class="text-caption text-slate-gray mb-5">conectando...</div>
            <div id="rooms-body" class="grid grid-cols-1 md:grid-cols-2 gap-0"></div>
          </section>
          <aside class="flex flex-col gap-6">
            <form id="create-form" class="bg-paper-white rounded-card p-6 shadow-pill flex flex-col gap-5">
              <h3 class="text-heading-sm text-carbon">Nueva operación</h3>
              <input
                id="create-name"
                maxlength="24"
                placeholder="Nombre (opcional)"
                class="bg-fog border border-outline-variant rounded-[6px] px-3 py-2 text-body-sm text-carbon placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-electric-violet"
              />
              <select
                id="create-mode"
                class="bg-fog border border-outline-variant rounded-[6px] px-3 py-2 text-body-sm text-carbon focus:outline-none focus:ring-2 focus:ring-electric-violet"
              >
                <option value="public">Pública</option>
                <option value="private">Privada (código)</option>
              </select>
              <button type="submit" class="bg-electric-violet text-paper-white text-body-sm font-bold py-2 rounded-full shadow-pill hover:bg-secondary-container transition-colors">
                Crear operación
              </button>
            </form>
            <form id="join-form" class="bg-paper-white rounded-card p-6 shadow-pill flex flex-col gap-5">
              <h3 class="text-heading-sm text-carbon">Unirse con código</h3>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">key</span>
                <input
                  id="join-code"
                  maxlength="8"
                  placeholder="Código"
                  class="w-full pl-10 pr-3 py-2 bg-fog border border-outline-variant rounded-[6px] text-body-sm text-carbon uppercase placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-electric-violet"
                />
              </div>
              <button type="submit" class="bg-electric-violet text-paper-white text-body-sm font-bold py-2 rounded-full shadow-pill hover:bg-secondary-container transition-colors">
                Unirse
              </button>
            </form>
          </aside>
        </div>
      </main>
    </div>
  `;

  const createForm = document.getElementById("create-form") as HTMLFormElement;
  const createName = document.getElementById("create-name") as HTMLInputElement;
  const createMode = document.getElementById("create-mode") as HTMLSelectElement;
  createForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const mode = createMode.value as "public" | "private";
    const id = mode === "public" ? randomRoomId() : `prv-${randomRoomCode()}`;
    const name = createName.value.trim() || "Room";
    window.location.href = `/room?id=${encodeURIComponent(id)}&host=1&name=${encodeURIComponent(name)}`;
  });

  const joinForm = document.getElementById("join-form") as HTMLFormElement;
  const joinCode = document.getElementById("join-code") as HTMLInputElement;
  joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = joinCode.value.trim().toUpperCase();
    if (!code) return;
    const match = menu.getRooms().find((r) => r.id.toUpperCase().endsWith(`-${code}`));
    const name = match ? `&name=${encodeURIComponent(match.name)}` : "";
    window.location.href = `/room?id=${encodeURIComponent(match ? match.id : `prv-${code}`)}${name}`;
  });

  const statusEl = document.getElementById("rooms-status");
  const body = document.getElementById("rooms-body");
  menu.subscribeStatus((s) => {
    if (statusEl) statusEl.textContent = s === "ready" ? "Red operativa." : `Estado: ${s}`;
  });
  let lastRoomsSig: string | null = null;
  menu.subscribeRooms((rooms) => {
    if (!body) return;
    const pubs = rooms.filter((r) => r.mode === "public");
    const sig = pubs
      .map((r) => `${r.id}|${r.name}|${r.hostName}|${r.players}|${r.playing ?? false}`)
      .join("\u0000");
    if (sig === lastRoomsSig) return;
    lastRoomsSig = sig;
    body.replaceChildren();
    if (pubs.length === 0) {
      const empty = document.createElement("div");
      empty.className = "col-span-full text-center text-body-sm text-slate-gray py-10";
      empty.innerHTML = `
        <span class="material-symbols-outlined text-[48px] text-ash block mx-auto mb-2">group_off</span>
        No hay operaciones activas. Creá una para empezar.
      `;
      body.appendChild(empty);
      return;
    }
    for (const r of pubs) {
      body.appendChild(roomCard(r.name, r.players, r.hostName, r.id, r.playing ?? false));
    }
  });
}

function roomCard(name: string, players: number, hostName: string, id: string, playing: boolean): HTMLElement {
  const card = document.createElement("div");
  card.className =
    "bg-paper-white rounded-card overflow-hidden flex flex-col group hover:-translate-y-1 transition-transform duration-200 shadow-pill m-5";
  const locked = playing || players >= 4;
  const label = playing ? "En curso" : players >= 4 ? "Llena" : "Unirse";
  card.innerHTML = `
    <div class="bg-sunbeam-yellow aspect-video w-full relative flex items-center justify-center">
      <span class="material-symbols-outlined text-[56px] text-carbon">cable</span>
      ${playing ? '<span class="absolute top-2 right-2 bg-carbon text-paper-white text-caption font-bold px-2 py-0.5 rounded-full">EN CURSO</span>' : ""}
    </div>
    <div class="p-6 flex flex-col flex-1">
      <h3 class="text-heading text-carbon mb-1">${escapeHtml(name)}</h3>
      <div class="flex items-center gap-5 mb-6 text-carbon text-body-sm">
        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[20px]">group</span> ${players}/4</span>
        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[20px]">bolt</span> ${escapeHtml(hostName)}</span>
      </div>
      <div class="mt-auto">
        <button class="join-btn w-full bg-electric-violet text-paper-white text-body-sm font-bold py-1 rounded-full shadow-pill hover:bg-secondary-container transition-all group-hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:group-hover:scale-100" ${locked ? "disabled" : ""}>${label}</button>
      </div>
    </div>
  `;
  card.querySelector<HTMLButtonElement>(".join-btn")!.addEventListener("click", () => {
    if (locked) return;
    window.location.href = `/room?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;
  });
  return card;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
