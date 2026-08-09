# Cable Rush — Sidebar funcional + pulido del tablero — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir los 4 items del sidebar del menú (Home, Join Room, Create Room, Leaderboard) en vistas navegables SPA, y pulir el tablero de corte: cursor tijera sobre cables, tablero más alto, y sonidos de corte (snip / zumbido).

**Architecture:** Cambio 100% en el cliente. `menu.ts` pasa de pintar una vista única a `renderMenu` con `switchView(view)` que re-renderiza `#menu-body` por vista y marca el item activo. `board.ts` usa un cursor tijera (clase CSS con data-URI SVG) y dos helpers de sonido Web Audio. `src/ui/sound.ts` es nuevo. **Sin cambios** en `portal/`, `types.ts`, `agent/`, `worker/`.

**Tech Stack:** Astro, Tailwind v4, TypeScript estricto, SVG + DOM, Web Audio API.

## Global Constraints

- **NO git commits** — decisión del repo (AGENTS.md); los cambios quedan en working tree.
- TypeScript estricto, **sin comentarios** en el código.
- **Solo el cliente**: no tocar `src/portal/*`, `agent/*`, `worker/*`.
- Cero assets: sonidos generados con Web Audio API; cursor tijera como data-URI SVG en CSS.
- Se mantienen los flujos funcionales actuales (crear/join por código, filtros, room cards, copiar código, chat, corte optimista).
- Verificación por tarea: `npx astro check` 0 errores.
- Espec de referencia: `docs/superpowers/specs/2026-08-08-cable-rush-sidebar-pulido-design.md`.

---

### Task 1: Sonidos de corte — `src/ui/sound.ts` + integración en `board.ts`

**Files:**
- Create: `src/ui/sound.ts`
- Modify: `src/board/board.ts`

**Interfaces:**
- Produces: `playCut(): void` y `playWrong(): void` en `src/ui/sound.ts`.
- Consumes en `board.ts`: `playCut` en el `pointerdown` de cada cable; `playWrong` cuando el agente restaura un cable mal cortado.

- [ ] **Step 1: Crear `src/ui/sound.ts`**

```ts
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playCut(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const noise = ac.createBufferSource();
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  noise.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2500;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  noise.start(t);
  noise.stop(t + 0.06);
}

export function playWrong(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(120, t);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.22);
}
```

- [ ] **Step 2: Integrar en `src/board/board.ts`**

Añadir al import (tras la línea 1):

```ts
import { playCut, playWrong } from "../ui/sound";
```

En el handler `hit.addEventListener("pointerdown", ...)` (líneas 143-150), añadir `playCut();` al inicio del callback, ANTES de `pendingCuts.add(...)`:

```ts
      hit.addEventListener("pointerdown", () => {
        playCut();
        pendingCuts.add(c.label);
        applyCutLook(els);
        window.setTimeout(() => {
          if (pendingCuts.has(c.label)) pendingCuts.delete(c.label);
        }, PENDING_CUT_MS);
        void client.sendCut(c.label).catch(() => undefined);
      });
```

En `renderCables` (líneas 94-115), detectar el corte malo. La rama de restauración es INALCANZABLE para este propósito: mientras el cable está en `pendingCuts`, `isCut` es `true` y entra a la rama de corte; cuando el timeout (1500 ms) lo saca de `pendingCuts`, `pendingCuts.has(c.label)` ya es `false`. Por eso el zumbido se dispara en la **rama de corte**: cuando un publish llega con `c.cut === false` mientras el cable sigue en `pendingCuts` (el agente NO confirmó → rechazo). Insertar dentro de `if (!c || isCut)`, tras la línea `if (c && c.cut) pendingCuts.delete(c.label);`:

```ts
        if (c && !c.cut && pendingCuts.has(c.label)) {
          pendingCuts.delete(c.label);
          playWrong();
        }
```

Contexto exacto del bloque final (líneas 97-115):

```ts
    for (const [label, els] of cableEls) {
      const c = byLabel.get(label);
      const isCut = c ? c.cut || pendingCuts.has(c.label) : true;
      if (!c || isCut) {
        els.line.setAttribute("stroke-dasharray", "10 6");
        els.hit.style.pointerEvents = "none";
        els.g.setAttribute("style", "transition:opacity 600ms ease 250ms;opacity:0;");
        if (!c) els.g.remove();
        if (c && c.cut) pendingCuts.delete(c.label);
        if (c && !c.cut && pendingCuts.has(c.label)) {
          pendingCuts.delete(c.label);
          playWrong();
        }
        continue;
      }
      els.hit.style.pointerEvents = "stroke";
      els.line.removeAttribute("stroke-dasharray");
      els.line.setAttribute("stroke", hex(c.color));
```

- [ ] **Step 3: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 2: Cursor tijera + altura del tablero — `theme.css`

**Files:**
- Modify: `src/styles/theme.css`

**Interfaces:**
- Produces: clase `.cursor-scissors` (cursor data-URI SVG) y las alturas nuevas de `#stage svg` / `#stage.board-lg svg`.
- Consume en Task 3: `board.ts` aplica la clase `.cursor-scissors` a los `hit`.

- [ ] **Step 1: Añadir `.cursor-scissors` al bloque `@layer components`**

En `src/styles/theme.css`, dentro de `@layer components`, justo después del bloque `.analog-texture` (línea ~123), insertar:

```css
  .cursor-scissors {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.8))'%3E%3Ccircle cx='6' cy='6' r='3'/%3E%3Ccircle cx='6' cy='18' r='3'/%3E%3Cline x1='20' y1='4' x2='8.12' y2='15.88'/%3E%3Cline x1='14.47' y1='14.48' x2='20' y2='20'/%3E%3Cline x1='8.12' y1='8.12' x2='12' y2='12'/%3E%3C/svg%3E") 18 6, auto;
  }
```

- [ ] **Step 2: Subir la altura del tablero**

En el mismo archivo, el bloque `#stage` (líneas ~125-135):

```css
  #stage {
    position: relative;
  }
  #stage svg {
    display: block;
    width: 100%;
    height: 420px;
  }
  #stage.board-lg svg {
    height: 560px;
  }
```

Cambiar `height: 420px;` → `height: 520px;` y `height: 560px;` → `height: 640px;`.

- [ ] **Step 3: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 3: Aplicar el cursor tijera a los cables — `board.ts`

**Files:**
- Modify: `src/board/board.ts`

**Interfaces:**
- Consumes: `.cursor-scissors` de Task 2.
- Produces: los `hit` de los cables usan el cursor tijera.

- [ ] **Step 1: Aplicar la clase al `hit`**

En `renderCables`, el `hit` se crea con `style: "cursor:pointer;"` (línea 135). Reemplazar ese atributo `style` por `style: "cursor:pointer;"` → quitarlo y añadir la clase:

```ts
      const hit = svgEl(NS, "line", {
        x1: String(TERMINAL_X_R), y1: "0",
        x2: String(VIEW_W - TERMINAL_X_R), y2: "0",
        stroke: "transparent", "stroke-width": "26", "stroke-linecap": "round",
      });
      hit.classList.add("cursor-scissors");
      hit.style.pointerEvents = "stroke";
```

La línea `hit.style.pointerEvents = "stroke";` ya existe justo después (línea 137); mantenerla. El `cursor:pointer` inline desaparece (la clase CSS lo reemplaza).

- [ ] **Step 2: Verificar**

Run: `npx astro check`
Expected: 0 errors. (El cursor se ve al pasar sobre un cable en el dev server.)

---

### Task 4: Sidebar SPA — vistas Home / Join / Create / Leaderboard — `menu.ts`

**Files:**
- Modify: `src/menu/menu.ts`

**Interfaces:**
- Consumes: `createMenuClient` (con `getRooms`, `subscribeRooms`, `subscribeStatus`), `getUsername`, `randomRoomId`, `randomRoomCode`, `crewmateSvg`.
- Produces: `bootMenu()` con `renderMenu(root, menu)` y `switchView(view)` para `"home" | "join" | "create" | "leaderboard"`; el sidebar marca el item activo; el FAB navega a create.

- [ ] **Step 1: Refactor de `shell` para items con `data-view` y `id`**

Reemplazar la función `shell` completa (líneas 61-100) por:

```ts
function shell(active: string, username: string): string {
  const item = (label: string, icon: string, view: string): string => `
    <button data-view="${view}" class="flex items-center gap-3 p-3 text-left w-full ${active === view ? "bg-secondary text-on-secondary font-bold rounded-full border-4 border-black block-shadow" : "text-on-surface hover:bg-surface-variant rounded-full border-4 border-transparent hover:border-black hover:block-shadow"} transition-transform active:scale-95">
      <span class="material-symbols-outlined text-xl" ${active === view ? 'style="font-variation-settings: \'FILL\' 1;"' : ""}>${icon}</span>
      <span class="text-caption uppercase tracking-wide">${label}</span>
    </button>`;
  return `
    <div class="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface analog-texture">
      <nav class="hidden lg:flex flex-col gap-4 p-6 w-64 shrink-0 bg-surface-container border-r-8 border-black block-shadow-md">
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
      <main class="flex-1 h-full overflow-y-auto px-6 lg:px-12 py-8 bg-surface relative pb-28">
        <div id="menu-body"></div>
      </main>
      <button id="fab-create" type="button" class="pressed fixed bottom-6 right-6 z-50 bg-primary text-on-primary text-body-lg uppercase px-6 py-4 rounded-full border-4 border-black block-shadow-md flex items-center gap-3">
        <span class="material-symbols-outlined text-2xl font-bold">add_box</span>
        <span class="hidden sm:inline tracking-wide">Create New Operation</span>
      </button>
    </div>
  `;
}
```

- [ ] **Step 2: Reemplazar `renderRooms` por `renderMenu` + `switchView`**

Reemplazar `function renderRooms(...)` (líneas 102-207) por:

```ts
function renderMenu(root: HTMLElement, menu: ReturnType<typeof createMenuClient>): void {
  const username = getUsername() ?? "OPERATOR";
  let current: "home" | "join" | "create" | "leaderboard" = "home";

  root.innerHTML = shell(current, username);
  const body = document.getElementById("menu-body")!;
  const fab = document.getElementById("fab-create");

  const views: Record<"home" | "join" | "create" | "leaderboard", () => (() => void) | undefined> = {
    home: () => renderHome(body, menu),
    join: () => renderJoin(body, menu),
    create: () => renderCreate(body),
    leaderboard: () => renderLeaderboard(body, menu),
  };

  let cleanup: (() => void) | undefined;

  function markActive(view: "home" | "join" | "create" | "leaderboard"): void {
    document.querySelectorAll<HTMLButtonElement>("nav button[data-view]").forEach((btn) => {
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
  }

  function switchView(view: "home" | "join" | "create" | "leaderboard"): void {
    cleanup?.();
    cleanup = undefined;
    current = view;
    markActive(view);
    body.replaceChildren();
    cleanup = views[view]();
    if (fab) fab.classList.toggle("hidden", view === "join" || view === "create");
  }

  document.querySelectorAll<HTMLButtonElement>("nav button[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view as "home" | "join" | "create" | "leaderboard"));
  });
  fab?.addEventListener("click", () => switchView("create"));

  markActive(current);
  cleanup = views[current]();
  if (fab) fab.classList.toggle("hidden", current === "join" || current === "create");
}
```

**Nota de diseño:** el `shell` se renderiza UNA vez; `switchView` re-renderiza solo `#menu-body`, re-marca el item activo (`markActive`) y ejecuta el `cleanup` de la vista anterior (para que `renderHome`/`renderLeaderboard` no acumulen suscripciones ni cierren sobre nodos viejos). El FAB se oculta en join/create.

Cada función de vista devuelve `() => void` (cleanup; `undefined` si no suscribe): `renderHome`/`renderLeaderboard` devuelven una función que cancela sus suscripciones; `renderJoin`/`renderCreate` devuelven `undefined` (ver Step 3).

- [ ] **Step 3: Añadir `renderHome`, `renderJoin`, `renderCreate`, `renderLeaderboard`**

Insertar antes de `function roomCard` (línea 209):

```ts
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
```

- [ ] **Step 4: Actualizar `bootMenu`**

El `renderMenu` ya gestiona la visibilidad inicial del FAB dentro de sí mismo. Solo hay que cambiar `bootMenu` (líneas 13-19) para que el callback de identidad y el render final usen `renderMenu`:

```ts
  const username = getUsername();
  if (!username) {
    renderUsername(root, (name) => {
      setUsername(name);
      renderMenu(root, menu);
    });
    return;
  }
  renderMenu(root, menu);
```

- [ ] **Step 5: Verificar**

Run: `npx astro check`
Expected: 0 errors. Revisar que no queden referencias a `renderRooms` (debe eliminarse la función vieja por completo). Si `astro check` reporta `renderRooms` o `renderUsername` sin uso, confirmar que el flujo de `bootMenu` las llama.

---

### Task 5: Integración y verificación del loop completo

**Files:**
- Ninguno (verificación).

- [ ] **Step 1: Typecheck global**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 2: Build de producción**

Run: `npx astro build`
Expected: build OK.

- [ ] **Step 3: Smoke test en dev**

Run en dos terminales:
- `npm run agent:room`
- `astro dev`

Expected (test manual):
- Menú: los 4 items del sidebar navegan sin recargar; el item activo se marca; FAB visible en Home/Leaderboard y oculto en Join/Create; FAB lleva a Create.
- Home: lista + filtros; Join: unirse por código; Create: crear (pública/privada → room); Leaderboard: rooms ordenadas (en curso primero, luego por jugadores).
- Partida: cursor tijera sobre los cables, tablero más alto, snip al cortar y zumbido al cortar mal (una vez que el agente restaura).

- [ ] **Step 4: Confirmar working tree**

Run: `git status --short`
Expected: `src/menu/menu.ts`, `src/board/board.ts`, `src/styles/theme.css` modificados, `src/ui/sound.ts` nuevo; sin commits.
