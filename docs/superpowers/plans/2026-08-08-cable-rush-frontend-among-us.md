# Cable Rush — Rediseño frontend "Defuse Protocol" (estética Among Us) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestilizar todas las pantallas del juego con la estética "Defuse Protocol / Cartoon Brutalism" de las referencias (`pantallas/rooms.html`, `pantallas/waiting-room.html`), replicando su shell (nav lateral, perfil OPERATOR, FAB), room cards, player cards con crewmates SVG y el tablero/director con paleta oscura espacial.

**Architecture:** Cambio 100% visual del cliente. Se reescribe `theme.css` con la paleta/fuentes/sombras de referencia (manteniendo los NOMBRES de token actuales para no romper utilidades), se añaden utilidades Cartoon Brutalism, se crea `src/ui/crewmate.ts` (crewmate en SVG puro) y se reescriben `menu.ts`, `lobby.ts`, `board.ts`, `director.ts` + las dos páginas `.astro`. **Sin cambios** en `portal/`, `agent/` ni `worker/`.

**Tech Stack:** Astro, Tailwind v4 (`@theme`), TypeScript estricto, SVG + DOM.

## Global Constraints

- **NO git commits** — decisión del repo (AGENTS.md); los cambios quedan en working tree. (El usuario pide commits explícitamente cuando los quiere.)
- TypeScript estricto, **sin comentarios** en el código salvo que se pidan.
- **Solo el cliente**: no tocar `src/portal/*`, `agent/*`, `worker/*`.
- Cero assets: crewmates y fondos se generan por código (SVG/data-URI CSS), como el tablero actual.
- Paleta de referencia (valores exactos): `surface #0b1326`, `surface-container-low #131b2e`, `surface-container #171f33`, `surface-container-high #222a3e`, `surface-variant #2d3449`, `on-surface #dbe2fd`, `outline-variant #5d403c`, `secondary #a4ffe8`, `tertiary #cdcd00`, `primary #ffb4a9`, `primary-container #c51111`, `error #ffb4ab`.
- Tipografías: **Bricolage Grotesque** (headlines) + **Barlow Condensed** (labels/body). Material Symbols Outlined.
- Cartoon Brutalism: `border-4/8 black`, sombras duras `4px 4px 0 black` / `6px 6px 0 black`, efecto pressed, textura noise, `-webkit-text-stroke`.
- Mantener TODAS las funcionalidades actuales (identidad, crear/unir, copiar código, chat con estados, splitter, mic/deafen placeholder, locked-out, gameover, efectos del tablero, cursores).
- Verificación por tarea: `npx astro check` 0 errores.
- Espec de referencia: `docs/superpowers/specs/2026-08-08-cable-rush-frontend-among-us-design.md`.

---

### Task 1: Tema global + fuentes en las páginas

**Files:**
- Rewrite: `src/styles/theme.css`
- Modify: `src/pages/index.astro` (bloque de fuentes)
- Modify: `src/pages/room.astro` (bloque de fuentes)

**Interfaces:**
- Produces: el token set completo (mismos nombres de `--color-*`/`--radius-*`/`--shadow-*`/`--text-*` para que las utilidades existentes sigan resolviendo) + clases de componente `.block-shadow`, `.block-shadow-md`, `.pressed`, `.analog-texture`, `.stroke-heavy`.
- Consumes: nada (base del rediseño; todas las tareas siguientes dependen de estos tokens).

- [ ] **Step 1: Reescribir `src/styles/theme.css`**

Reemplazar TODO el contenido por:

```css
@import "tailwindcss";

@theme {
  --font-sans: "Barlow Condensed", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;

  --color-electric-violet: #ffb4a9;
  --color-secondary-container: #c51111;
  --color-on-secondary-container: #ffd6d0;
  --color-sunbeam-yellow: #cdcd00;
  --color-primary-fixed-dim: #ffb4a9;
  --color-surface: #0b1326;
  --color-surface-low: #131b2e;
  --color-surface-container: #171f33;
  --color-surface-high: #222a3e;
  --color-surface-highest: #2d3449;
  --color-paper-white: #222a3e;
  --color-sand: #171f33;
  --color-fog: #2d3449;
  --color-carbon: #dbe2fd;
  --color-on-surface: #dbe2fd;
  --color-on-surface-variant: #e6bdb7;
  --color-slate-gray: #9aa4c0;
  --color-ash: #5d403c;
  --color-outline: #5d403c;
  --color-outline-variant: #5d403c;
  --color-error: #ffb4ab;
  --color-error-container: #93000a;
  --color-on-error: #690005;
  --color-on-error-container: #ffdad6;
  --color-secondary: #a4ffe8;
  --color-on-secondary: #00201a;
  --color-tertiary: #cdcd00;
  --color-tertiary-container: #b1b100;
  --color-on-tertiary: #323200;
  --color-on-tertiary-container: #424200;
  --color-primary: #ffb4a9;
  --color-on-primary: #690002;
  --color-primary-container: #c51111;
  --color-on-primary-container: #ffd6d0;

  --radius-card: 1rem;
  --radius-lg: 2rem;
  --radius-xl: 3rem;

  --shadow-pill: 4px 4px 0px 0px rgb(0 0 0 / 1);
  --shadow-pill-lg: 6px 6px 0px 0px rgb(0 0 0 / 1);

  --text-hero: 68px;
  --text-hero--line-height: 68px;
  --text-hero--letter-spacing: -0.02em;
  --text-hero--font-weight: 800;
  --text-display: 51px;
  --text-display--line-height: 56px;
  --text-display--letter-spacing: -0.02em;
  --text-display--font-weight: 800;
  --text-heading: 34px;
  --text-heading--line-height: 41px;
  --text-heading--letter-spacing: -0.02em;
  --text-heading--font-weight: 700;
  --text-heading-sm: 29px;
  --text-heading-sm--line-height: 35px;
  --text-heading-sm--letter-spacing: -0.02em;
  --text-heading-sm--font-weight: 700;
  --text-subheading: 24px;
  --text-subheading--line-height: 29px;
  --text-subheading--letter-spacing: 0.04em;
  --text-subheading--font-weight: 700;
  --text-body: 22px;
  --text-body--line-height: 28.6px;
  --text-body--letter-spacing: 0.03em;
  --text-body--font-weight: 500;
  --text-body-sm: 21px;
  --text-body-sm--line-height: 27px;
  --text-body-sm--letter-spacing: 0.03em;
  --text-body-sm--font-weight: 500;
  --text-caption: 19px;
  --text-caption--line-height: 25px;
  --text-caption--letter-spacing: 0.05em;
  --text-caption--font-weight: 600;
}

@layer base {
  html {
    font-family: var(--font-sans);
  }
  body {
    margin: 0;
    background: var(--color-surface);
    color: var(--color-on-surface);
    -webkit-font-smoothing: antialiased;
  }
  .material-symbols-outlined {
    font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
    vertical-align: middle;
  }
}

@layer components {
  .block-shadow {
    box-shadow: 4px 4px 0px 0px rgb(0 0 0 / 1);
  }
  .block-shadow-md {
    box-shadow: 6px 6px 0px 0px rgb(0 0 0 / 1);
  }
  .pressed {
    transition: transform 100ms ease, box-shadow 100ms ease;
  }
  .pressed:hover {
    transform: translate(4px, 4px);
    box-shadow: 0px 0px 0px 0px rgb(0 0 0 / 1);
  }
  .pressed:active {
    transform: translate(6px, 6px);
    box-shadow: 0px 0px 0px 0px rgb(0 0 0 / 1);
  }
  .stroke-heavy {
    -webkit-text-stroke: 1px #000000;
  }
  .analog-texture {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
  }
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
  .cursor-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .cursor-dot {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    border-radius: 9999px;
    border: 2px solid;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.45);
    transition: left 120ms linear, top 120ms linear;
  }
  .cursor-name {
    position: absolute;
    transform: translate(8px, 8px);
    color: #ffffff;
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1;
    padding: 0.3rem 0.45rem;
    border-radius: 6px;
    white-space: nowrap;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.45);
    transition: left 120ms linear, top 120ms linear;
  }
  .effect-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 16px;
    overflow: hidden;
    z-index: 5;
  }
  .effect-overlay {
    position: absolute;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
  }
  .effect-overlay.visible {
    display: flex;
  }
  .effect-freeze {
    background: rgb(56 130 246 / 0.28);
    color: #bfdbfe;
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-shadow: 0 2px 8px rgb(0 0 0 / 0.5);
  }
  .effect-blind {
    background: rgb(0 0 0 / 0.55);
    backdrop-filter: blur(3px);
  }
  @keyframes cable-flicker {
    0% {
      opacity: 1;
      transform: translateX(0);
    }
    25% {
      opacity: 0.5;
      transform: translateX(-2px);
    }
    50% {
      opacity: 1;
      transform: translateX(2px);
    }
    75% {
      opacity: 0.6;
      transform: translateX(-1px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }
  .effect-scramble {
    animation: cable-flicker 0.25s steps(2) infinite;
  }
}
```

- [ ] **Step 2: Actualizar las fuentes en `src/pages/index.astro`**

Reemplazar el `<link>` de Manrope (líneas 15-18) por:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 3: Actualizar las fuentes en `src/pages/room.astro`**

Mismo reemplazo que Step 2 (el `<link>` de Manrope, líneas 15-18).

- [ ] **Step 4: Verificar**

Run: `npx astro check`
Expected: 0 errors. (`theme.css` no rompe tipos; las páginas siguen válidas.)

---

### Task 2: Componente crewmate (SVG puro)

**Files:**
- Create: `src/ui/crewmate.ts`

**Interfaces:**
- Produces: `crewmateSvg(color: string, size: number): string` — devuelve un SVG crewmate (cuerpo capsula + visera + mochila + pies) con trazo negro, coloreado con `color`.
- Consumes: nada. Lo usan `menu.ts` (player card), `lobby.ts` (player cards), y opcionalmente gameover.

- [ ] **Step 1: Crear `src/ui/crewmate.ts`**

```ts
export function crewmateSvg(color: string, size: number): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="30" y="16" width="10" height="14" rx="5" fill="#000000"/>
  <rect x="31" y="17" width="9" height="12" rx="4" fill="${color}"/>
  <path d="M10 44h11v4H10z" fill="#000000"/>
  <path d="M27 44h11v4H27z" fill="#000000"/>
  <rect x="8" y="12" width="32" height="34" rx="16" fill="${color}" stroke="#000000" stroke-width="2.5"/>
  <ellipse cx="18" cy="23" rx="9" ry="7" fill="#cdeaff" stroke="#000000" stroke-width="2"/>
  <ellipse cx="15" cy="21" rx="3" ry="2" fill="#ffffff"/>
</svg>`;
}
```

- [ ] **Step 2: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 3: Menú con shell + room cards

**Files:**
- Rewrite: `src/menu/menu.ts`

**Interfaces:**
- Consumes: `createMenuClient` (de `../portal/client`), `getUsername`/`setUsername`, `randomRoomId`/`randomRoomCode`, `crewmateSvg`.
- Produces: `bootMenu()` con identidad + lista de rooms en shell Cartoon Brutalism (nav lateral, perfil OPERATOR, room cards, FAB, unirse por código). Mismos IDs y flujos que hoy: `user-form`, `create-form`, `create-name`, `create-mode`, `join-form`, `join-code`, `rooms-status`, `rooms-body`.

- [ ] **Step 1: Reescribir `src/menu/menu.ts`**

```ts
import { createMenuClient } from "../portal/client";
import { getUsername, setUsername } from "../shared/username";
import { randomRoomId, randomRoomCode } from "../shared/id";
import { crewmateSvg } from "../ui/crewmate";

const CREW_COLORS = ["#ffb4a9", "#2196f3", "#4caf50", "#cdcd00", "#a4ffe8", "#c51111"];

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
  const item = (label: string, icon: string, isActive: boolean): string => `
    <button class="flex items-center gap-3 p-3 text-left w-full ${isActive ? "bg-secondary text-on-secondary font-bold rounded-full border-4 border-black block-shadow" : "text-on-surface hover:bg-surface-variant rounded-full border-4 border-transparent hover:border-black hover:block-shadow"} transition-transform active:scale-95">
      <span class="material-symbols-outlined text-xl" ${isActive ? 'style="font-variation-settings: \'FILL\' 1;"' : ""}>${icon}</span>
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
          ${item("Home", "home", active === "home")}
          ${item("Join Room", "meeting_room", active === "join")}
          ${item("Create Room", "add_box", active === "create")}
          ${item("Leaderboard", "leaderboard", active === "leaderboard")}
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

function renderRooms(root: HTMLElement, menu: ReturnType<typeof createMenuClient>): void {
  const username = getUsername() ?? "OPERATOR";
  root.innerHTML = shell("home", username);
  const body = document.getElementById("menu-body")!;
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
    <aside class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
      <form id="create-form" class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6 flex flex-col gap-5">
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
    </aside>
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

  const fab = document.getElementById("fab-create");
  fab?.addEventListener("click", () => {
    createForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  });

  const joinForm = document.getElementById("join-form") as HTMLFormElement;
  const joinCode = document.getElementById("join-code") as HTMLInputElement;
  joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = joinCode.value.trim().toUpperCase();
    if (!code) return;
    const match = menu.getRooms().find((r) => r.id.toUpperCase().endsWith(`-${code}`));
    window.location.href = `/room?id=${encodeURIComponent(match ? match.id : `prv-${code}`)}`;
  });

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

  menu.subscribeStatus((s) => {
    if (statusEl) statusEl.textContent = s === "ready" ? "Red operativa." : `Estado: ${s}`;
  });
  menu.subscribeRooms(() => applyFilter());
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
      <div class="absolute top-2 left-2 bg-black px-2 py-1 text-[10px] text-secondary uppercase border-2 border-secondary">Sec: ${code}</div>
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
```

- [ ] **Step 2: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 4: Lobby con shell + player cards crewmate

**Files:**
- Rewrite: `src/room/lobby.ts`

**Interfaces:**
- Consumes: `joinRoom` (de `../portal/client`), `ChatEntry`/`Role`, `getUsername`, `mountBoard`, `mountDirector`, `crewmateSvg`.
- Produces: `bootRoom(roomId, isHost, roomName)` con shell Cartoon Brutalism preservando TODO el comportamiento actual (IDs de elementos intactos: `stage`, `players`, `squad-count`, `start-btn`, `start-hint`, `hud`, `level`, `progress`, `timer`, `chat-log`, `chat-form`, `chat-input`, `chat-empty`, `chat-error`, `comms`, `splitter`, `left-col`, `right-col`, `lobby-layout`, `gameover`, `go-level`, `locked-out`, `room-code`, `copy-code`, `mic-btn`, `mic-menu`, `mic-icon`, `mic-toggle`, `mic-state`, `deafen-btn`, `deafen-icon`, `user-name`, `room-id`).

- [ ] **Step 1: Reescribir `src/room/lobby.ts`**

```ts
import { joinRoom } from "../portal/client";
import type { ChatEntry, Role } from "../portal/types";
import { getUsername } from "../shared/username";
import { mountBoard } from "../board/board";
import { mountDirector } from "../director/director";
import { crewmateSvg } from "../ui/crewmate";

const REQUIRED_PLAYERS = 4;
const ALIVE_INTERVAL_MS = 1000;
const ALIVE_TIMEOUT_MS = 3000;
const CREW_COLORS = ["#ffb4a9", "#2196f3", "#4caf50", "#cdcd00", "#a4ffe8", "#c51111"];

export function bootRoom(roomId: string, isHost: boolean, roomName: string): void {
  const root = document.getElementById("app");
  if (!root) return;

  const username = getUsername() ?? "anon";
  const client = joinRoom(roomId, { name: username, host: isHost, role: null });

  root.innerHTML = `
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
          <button type="button" class="flex items-center gap-3 p-3 text-on-surface hover:bg-surface-variant rounded-full border-4 border-transparent hover:border-black transition-transform active:scale-95">
            <span class="material-symbols-outlined text-xl">home</span>
            <span class="text-caption uppercase tracking-wide">Home</span>
          </button>
          <button type="button" class="flex items-center gap-3 p-3 bg-secondary text-on-secondary font-bold rounded-full border-4 border-black block-shadow">
            <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">meeting_room</span>
            <span class="text-caption uppercase tracking-wide">Room</span>
          </button>
        </div>
        <div class="mt-auto pt-4 border-t-4 border-outline-variant flex justify-between items-center text-caption uppercase">
          <span class="text-on-surface-variant">SYS.STAT</span>
          <span class="text-secondary flex items-center gap-1"><div class="w-2 h-2 bg-secondary rounded-full animate-pulse"></div> ONLINE</span>
        </div>
      </nav>
      <main class="flex-1 h-screen flex flex-col overflow-hidden">
        <header class="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-surface-container border-b-8 border-black block-shadow">
          <div class="flex items-center gap-3 min-w-0">
            <span id="room-id" class="text-body-sm text-on-surface truncate">Operación: ${escapeHtml(roomName)}</span>
            <span class="flex items-center gap-1 bg-surface-high border-2 border-black rounded-full px-3 py-1 shrink-0">
              <span class="material-symbols-outlined text-[16px] text-secondary">key</span>
              <span id="room-code" class="text-body-sm font-bold text-secondary tracking-widest">--</span>
              <button id="copy-code" type="button" title="Copiar código" class="text-on-surface hover:text-secondary transition-colors">
                <span class="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
            </span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span id="user-name" class="text-body-sm text-on-surface hidden sm:inline uppercase">${escapeHtml(username)}</span>
            <button id="mic-btn" type="button" title="Micro" class="w-10 h-10 flex items-center justify-center bg-surface-high rounded-full border-4 border-black hover:bg-surface-variant transition-colors">
              <span id="mic-icon" class="material-symbols-outlined text-[20px] text-on-surface">mic</span>
            </button>
            <button id="deafen-btn" type="button" title="Ensordecer" class="w-10 h-10 flex items-center justify-center bg-surface-high rounded-full border-4 border-black hover:bg-surface-variant transition-colors">
              <span id="deafen-icon" class="material-symbols-outlined text-[20px] text-on-surface">headphones</span>
            </button>
            <a id="leave-btn" href="/" class="pressed text-body-sm text-on-surface hover:text-secondary transition-colors flex items-center gap-2 shrink-0 bg-surface-high px-3 py-2 rounded-full border-4 border-black">
              <span class="material-symbols-outlined text-[18px]">logout</span> Salir
            </a>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
          <div class="max-w-[1200px] mx-auto">
            <div class="flex flex-col md:flex-row justify-between items-end gap-4 mb-6 border-b-4 border-outline-variant pb-4">
              <div>
                <h2 class="text-display font-display text-secondary uppercase stroke-heavy">Sala de Espera</h2>
                <p class="text-body-sm text-on-surface-variant uppercase mt-1">Código: <span class="bg-surface-high px-2 py-1 rounded border-2 border-black font-mono tracking-widest text-tertiary">${escapeHtml(roomId.slice(roomId.indexOf("-") + 1))}</span></p>
              </div>
              <div id="lobby-state" class="text-right text-heading-sm text-primary font-bold uppercase animate-pulse">
                Esperando jugadores...
              </div>
            </div>
            <div id="hud" class="hidden mb-6 bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6 flex items-center justify-between gap-5">
              <span id="level" class="text-heading-sm font-display text-secondary uppercase">Nivel 1</span>
              <span id="progress" class="text-body-sm text-on-surface-variant uppercase">Cortes 0/0</span>
              <span id="timer" class="text-heading-sm font-display font-bold text-primary uppercase">--:--</span>
            </div>
            <div id="lobby-layout" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <section id="left-col" class="lg:col-span-8 flex flex-col gap-6">
                <div id="stage"></div>
                <div id="comms" class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6 relative">
                  <h3 class="text-heading-sm font-display text-secondary uppercase mb-2">Comms tácticas</h3>
                  <p id="chat-error" class="hidden text-body-sm text-error font-bold mb-2"></p>
                  <div id="chat-log" class="space-y-3 max-h-72 overflow-y-auto font-mono text-sm"></div>
                  <p id="chat-empty" class="text-caption text-on-surface-variant uppercase mt-1">Sin mensajes aún. Coordiná el corte por voz.</p>
                  <form id="chat-form" class="mt-6 relative">
                    <input
                      id="chat-input"
                      maxlength="200"
                      placeholder="Envía un mensaje..."
                      autocomplete="off"
                      class="w-full bg-surface-high border-4 border-black rounded-lg py-1 pl-6 pr-12 text-body-sm text-carbon placeholder:text-slate-gray focus:outline-none focus:border-secondary"
                    />
                    <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 text-secondary">
                      <span class="material-symbols-outlined">send</span>
                    </button>
                  </form>
                </div>
              </section>
              <div id="splitter" class="hidden lg:block w-1.5 shrink-0 cursor-col-resize bg-outline-variant rounded-full hover:bg-secondary transition-colors self-stretch"></div>
              <aside id="right-col" class="lg:col-span-4 flex flex-col gap-6">
                <div class="flex justify-between items-end">
                  <h2 class="text-heading font-display text-primary uppercase">Squad</h2>
                  <span id="squad-count" class="text-subheading text-secondary">0 / 4</span>
                </div>
                <div id="players" class="flex flex-col gap-4"></div>
                <div id="start-area" class="mt-auto pt-6">
                  <button
                    id="start-btn"
                    disabled
                    class="pressed w-full bg-secondary text-on-secondary text-heading-sm font-bold py-6 rounded-2xl border-8 border-black block-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Iniciar partida
                  </button>
                  <p id="start-hint" class="text-center text-caption text-on-surface-variant uppercase mt-4">Esperando al equipo completo.</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
      <div id="gameover" class="hidden fixed inset-0 z-50 bg-surface/90 backdrop-blur flex items-center justify-center px-6">
        <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-10 max-w-md w-full text-center">
          <span class="material-symbols-outlined text-[56px] text-error">bolt</span>
          <h2 class="text-display font-display text-on-surface uppercase">Operación terminada</h2>
          <p class="text-body-sm text-on-surface-variant uppercase mt-2">El equipo llegó hasta el</p>
          <div class="mt-6 bg-surface-high border-4 border-black rounded-xl p-6">
            <p class="text-caption text-on-surface-variant uppercase">Nivel alcanzado</p>
            <p id="go-level" class="text-display font-display text-primary font-extrabold">1</p>
          </div>
          <a href="/" class="pressed block mt-7 w-full bg-primary text-on-primary text-body font-bold py-3 rounded-full border-4 border-black block-shadow transition-colors uppercase">
            Volver al menú
          </a>
        </div>
      </div>
      <div id="locked-out" class="hidden fixed inset-0 z-50 bg-surface/90 backdrop-blur flex items-center justify-center px-6">
        <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-10 max-w-md w-full text-center">
          <span class="material-symbols-outlined text-[56px] text-tertiary">lock</span>
          <h2 class="text-display font-display text-on-surface uppercase">Partida en curso</h2>
          <p class="text-body-sm text-on-surface-variant uppercase mt-2">La sala ya comenzó y no acepta más jugadores.</p>
          <a href="/" class="pressed block mt-7 w-full bg-primary text-on-primary text-body font-bold py-3 rounded-full border-4 border-black block-shadow transition-colors uppercase">
            Volver al menú
          </a>
        </div>
      </div>
    </div>
  `;

  const statusEl = document.getElementById("lobby-state");
  const playersEl = document.getElementById("players");
  const squadCountEl = document.getElementById("squad-count");
  const timerEl = document.getElementById("timer");
  const levelEl = document.getElementById("level");
  const progressEl = document.getElementById("progress");
  const hudEl = document.getElementById("hud");
  const startBtn = document.getElementById("start-btn") as HTMLButtonElement | null;
  const startHintEl = document.getElementById("start-hint");
  const chatLogEl = document.getElementById("chat-log");
  const chatEmptyEl = document.getElementById("chat-empty");
  const chatErrorEl = document.getElementById("chat-error");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input") as HTMLInputElement | null;
  const gameoverEl = document.getElementById("gameover");
  const goLevelEl = document.getElementById("go-level");
  const lockedOutEl = document.getElementById("locked-out");
  const leftCol = document.getElementById("left-col");
  const rightCol = document.getElementById("right-col");
  const stageEl = document.getElementById("stage");
  const lobbyLayoutEl = document.getElementById("lobby-layout");
  const splitter = document.getElementById("splitter");
  const roomCodeEl = document.getElementById("room-code");
  const copyBtn = document.getElementById("copy-code");
  const micBtn = document.getElementById("mic-btn");
  const micIconEl = document.getElementById("mic-icon");
  const deafenBtn = document.getElementById("deafen-btn");
  const deafenIconEl = document.getElementById("deafen-icon");

  const code = roomId.slice(roomId.indexOf("-") + 1);
  if (roomCodeEl) roomCodeEl.textContent = code;

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      void copyRoomCode(copyBtn, code);
    });
  }

  let micMuted = false;
  let deafened = false;

  function refreshAudio(): void {
    if (!micIconEl || !deafenIconEl) return;
    const muted = micMuted || deafened;
    micIconEl.textContent = muted ? "mic_off" : "mic";
    micIconEl.classList.toggle("text-error", muted);
    micIconEl.classList.toggle("text-on-surface", !muted);
    deafenIconEl.textContent = deafened ? "hearing_disabled" : "headphones";
    deafenIconEl.classList.toggle("text-error", deafened);
    deafenIconEl.classList.toggle("text-on-surface", !deafened);
  }

  if (micBtn) {
    micBtn.addEventListener("click", () => {
      micMuted = !micMuted;
      refreshAudio();
    });
  }
  if (deafenBtn) {
    deafenBtn.addEventListener("click", () => {
      deafened = !deafened;
      refreshAudio();
    });
  }

  let announced = false;
  let judgeAnnounced = false;
  let started = false;
  let judgeId: string | null = null;
  let selfRole: Role | null = null;
  let cleanup: (() => void) | null = null;
  const lastSeen = new Map<string, number>();

  function activePlayers(): { id: string; name: string; host: boolean }[] {
    return client.getPlayers().filter((p) => lastSeen.has(p.id));
  }

  function mountByRole(role: Role): void {
    const stage = document.getElementById("stage");
    if (!stage) return;
    stage.replaceChildren();
    cleanup?.();
    cleanup = role === "judge" ? mountDirector(stage, client) : mountBoard(stage, client, username);
  }

  function statusBadge(player: { id: string; host: boolean }): string {
    if (player.id === judgeId) return "Director";
    if (started) return "Cortador";
    if (player.host) return "Host de operación";
    return "Operativo";
  }

  function renderPlayers(list: { id: string; name: string; host: boolean }[]): void {
    if (!playersEl) return;
    playersEl.replaceChildren();
    for (const [i, p] of list.slice(0, REQUIRED_PLAYERS).entries()) {
      const color = CREW_COLORS[i % CREW_COLORS.length];
      const card = document.createElement("div");
      card.className =
        "bg-surface-container-high border-8 border-black rounded-xl p-4 block-shadow flex items-center gap-4 relative overflow-hidden";
      const ready = p.id !== judgeId && !started;
      const badge = p.id === judgeId ? "DIRECTOR" : started ? "EN CAMPO" : "LISTO";
      const badgeColor = p.id === judgeId
        ? "bg-tertiary text-on-tertiary"
        : started
          ? "bg-secondary text-on-secondary"
          : "bg-surface-variant text-on-surface border-dashed opacity-80";
      card.innerHTML = `
        <div class="absolute inset-0" style="background: ${color}; opacity: 0.08;"></div>
        <div class="w-16 h-20 shrink-0 flex items-center justify-center">${crewmateSvg(color, 56)}</div>
        <div class="flex-1 z-10 min-w-0">
          <p class="font-bold text-body text-on-surface leading-none truncate">${escapeHtml(p.name)}</p>
          <p class="text-caption text-on-surface-variant mt-1 uppercase">${statusBadge(p)}</p>
        </div>
        <span class="z-10 ${badgeColor} px-3 py-1 border-4 border-black rounded text-caption uppercase shrink-0">${badge}</span>
      `;
      playersEl.appendChild(card);
    }
    for (let i = list.length; i < REQUIRED_PLAYERS; i++) {
      const color = CREW_COLORS[i % CREW_COLORS.length];
      const empty = document.createElement("div");
      empty.className =
        "bg-surface-high border-8 border-black rounded-xl p-4 flex items-center justify-center border-dashed h-[88px] opacity-60";
      empty.innerHTML = `
        <div class="w-16 h-20 shrink-0 flex items-center justify-center">${crewmateSvg(color, 48)}</div>
        <p class="text-caption text-on-surface-variant uppercase flex items-center gap-2 ml-3">
          <span class="material-symbols-outlined">person_add</span>
          Esperando jugador...
        </p>
      `;
      playersEl.appendChild(empty);
    }
    if (squadCountEl) squadCountEl.textContent = `${list.length} / 4`;
  }

  let chatErrorTimer: ReturnType<typeof setTimeout> | null = null;

  function renderChat(entries: ChatEntry[]): void {
    if (!chatLogEl) return;
    if (chatEmptyEl) chatEmptyEl.classList.toggle("hidden", entries.length > 0);
    chatLogEl.replaceChildren();
    for (const { name, text, self, status } of entries) {
      const pending = status === "pending";
      const failed = status === "failed";
      const row = document.createElement("div");
      row.className = `flex gap-4 items-start ${self ? "justify-end" : ""} ${pending || failed ? "opacity-60" : ""}`;
      const who = document.createElement("span");
      who.className = `font-bold shrink-0 ${self ? "text-tertiary" : "text-secondary"}`;
      who.textContent = self ? "Tú:" : `${name}:`;
      const msg = document.createElement("p");
      msg.className = self
        ? "text-body-sm text-carbon bg-surface-high border-2 border-black rounded-lg px-3 py-1"
        : "text-body-sm text-carbon";
      if (failed) msg.classList.add("text-error");
      msg.textContent = text;
      row.append(who, msg);
      chatLogEl.appendChild(row);
    }
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  }

  function showChatError(message: string): void {
    if (!chatErrorEl) return;
    chatErrorEl.textContent = message;
    chatErrorEl.classList.remove("hidden");
    if (chatErrorTimer) clearTimeout(chatErrorTimer);
    chatErrorTimer = setTimeout(() => {
      chatErrorEl?.classList.add("hidden");
    }, 3000);
  }

  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = "";
      void client.sendChat(text, username).catch(() => {
        chatInput.value = text;
        showChatError("Mensaje no enviado. Inténtalo de nuevo.");
      });
    });
  }

  function updateLobbyBanner(): void {
    if (!statusEl) return;
    if (started) {
      statusEl.textContent = "¡Partida en curso!";
      statusEl.classList.remove("animate-pulse");
      return;
    }
    statusEl.classList.add("animate-pulse");
    const count = activePlayers().length;
    if (count >= REQUIRED_PLAYERS && judgeId) {
      statusEl.textContent = "Juez elegido. Esperando que el host inicie...";
    } else if (count >= REQUIRED_PLAYERS) {
      statusEl.textContent = "¡4 jugadores! Designando juez...";
    } else {
      statusEl.textContent = `Esperando jugadores (${count}/4)...`;
    }
  }

  function updateStartArea(): void {
    const count = activePlayers().length;
    const full = count >= REQUIRED_PLAYERS;
    if (!startBtn) return;
    if (!isHost) {
      startBtn.disabled = true;
      if (startHintEl) {
        startHintEl.textContent = judgeId
          ? "El host iniciará la operación."
          : "Esperando la designación del juez...";
      }
      return;
    }
    startBtn.disabled = !(judgeId && full);
    if (startHintEl) {
      startHintEl.textContent = judgeId && full
        ? "Equipo completo. ¡Inicia la operación!"
        : full
          ? "Designando juez..."
          : "Esperando al equipo completo.";
    }
  }

  function applyJudge(id: string): void {
    judgeId = id;
    judgeAnnounced = true;
    selfRole = id === client.getSelfId() ? "judge" : "cutter";
    client.setMeta({ name: username, host: isHost, role: selfRole });
    updateLobbyBanner();
    updateStartArea();
  }

  function applyStart(): void {
    started = true;
    mountByRole(selfRole ?? "cutter");
    updateLobbyBanner();
    const comms = document.getElementById("comms");
    const startArea = document.getElementById("start-area");
    if (comms && startArea) startArea.before(comms);
    lobbyLayoutEl?.classList.add("lg:flex", "lg:flex-row", "lg:items-stretch");
    lobbyLayoutEl?.classList.remove("lg:grid-cols-12", "lg:gap-6");
    leftCol?.classList.add("lg:flex-1", "lg:min-w-0");
    leftCol?.classList.remove("lg:col-span-8");
    rightCol?.classList.add("lg:shrink-0", "lg:min-w-0", "lg:w-[var(--panel-w)]");
    rightCol?.classList.remove("lg:col-span-4");
    rightCol?.style.setProperty("--panel-w", "360px");
    splitter?.classList.remove("hidden");
    stageEl?.classList.add("board-lg");
  }

  let dragging = false;
  if (splitter && rightCol && lobbyLayoutEl) {
    splitter.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      dragging = true;
      splitter.setPointerCapture(e.pointerId);
    });
    splitter.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const rect = lobbyLayoutEl.getBoundingClientRect();
      const width = rect.right - e.clientX;
      rightCol.style.setProperty("--panel-w", `${Math.min(480, Math.max(260, width))}px`);
    });
    splitter.addEventListener("pointerup", () => {
      dragging = false;
    });
    splitter.addEventListener("pointercancel", () => {
      dragging = false;
    });
  }

  function maybeAnnounceJudge(): void {
    if (!isHost || announced) return;
    const players = activePlayers();
    if (players.length !== REQUIRED_PLAYERS) return;
    announced = true;
    const judge = players[Math.floor(Math.random() * players.length)];
    applyJudge(judge.id);
    void client.sendEvent({ type: "judge", judgeId: judge.id });
  }

  client.subscribeStatus((s) => {
    if (s === "ready") updateStartArea();
  });

  client.subscribePresence((list) => {
    for (const p of list) lastSeen.set(p.id, Date.now());
    renderPlayers(list);
    updateLobbyBanner();
    updateStartArea();
    maybeAnnounceJudge();
    if (isHost) publish();
  });

  function publish(): void {
    const list = activePlayers();
    void client.publishRoom({
      id: roomId,
      name: roomName,
      mode: roomId.startsWith("prv-") ? "private" : "public",
      players: list.length,
      hostId: client.getSelfId(),
      hostName: username,
      playing: started,
      updatedAt: Date.now(),
    });
  }

  if (isHost) {
    publish();
    const interval = setInterval(publish, 5000);
    window.addEventListener("beforeunload", () => clearInterval(interval));
  }

  let lastChatKey = "";
  client.subscribeChat((entries) => {
    const key = entries.map((e) => e.id).join("\0");
    if (key === lastChatKey) return;
    lastChatKey = key;
    renderChat(entries);
  });

  client.subscribeEvents((e) => {
    if (e.type === "judge") {
      applyJudge(e.judgeId);
      renderPlayers(activePlayers());
    }
    if (e.type === "start") applyStart();
  });

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (judgeAnnounced) {
        applyStart();
        void client.sendEvent({ type: "start" });
      }
    });
  }

  let lockedOut = false;

  client.subscribeState((s) => {
    if (!s) return;
    if (!started && (s.status === "playing" || s.status === "finished")) {
      if (!lockedOut) {
        lockedOut = true;
        if (lockedOutEl) lockedOutEl.classList.remove("hidden");
        client.release();
      }
      return;
    }
    if (hudEl) hudEl.classList.remove("hidden");
    if (timerEl) {
      const secs = Math.max(0, Math.round(s.timerMs / 1000));
      const text = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
      timerEl.textContent = text;
      timerEl.classList.toggle("text-error", secs <= 30);
    }
    if (s.status === "finished") {
      if (timerEl) timerEl.textContent = "00:00";
      if (gameoverEl && goLevelEl) {
        goLevelEl.textContent = String(s.level);
        gameoverEl.classList.remove("hidden");
      }
      return;
    }
    if (levelEl) levelEl.textContent = `Nivel ${s.level}`;
    if (progressEl) progressEl.textContent = `Cortes ${s.cutCount}/${s.cables.length}`;
  });

  const aliveInterval = setInterval(() => client.sendAlive(), ALIVE_INTERVAL_MS);

  const pruneInterval = setInterval(() => {
    const now = Date.now();
    const stale = [...lastSeen.entries()].filter(([, t]) => now - t > ALIVE_TIMEOUT_MS).map(([id]) => id);
    if (stale.length === 0) return;
    for (const id of stale) lastSeen.delete(id);
    renderPlayers(activePlayers());
    updateLobbyBanner();
    updateStartArea();
    if (isHost) publish();
  }, 1000);

  client.subscribeActivity((users) => {
    const now = Date.now();
    for (const id of users) lastSeen.set(id, now);
  });

  window.addEventListener("beforeunload", () => {
    clearInterval(aliveInterval);
    clearInterval(pruneInterval);
    client.release();
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function copyRoomCode(btn: HTMLElement, code: string): Promise<void> {
  const icon = btn.firstElementChild as HTMLElement | null;
  const prev = icon?.innerHTML ?? "";
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    const input = document.createElement("input");
    input.value = code;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  if (icon) icon.innerHTML = "check";
  setTimeout(() => {
    if (icon) icon.innerHTML = prev;
  }, 1500);
}
```

**Nota de cambio deliberado:** el menú de mic (`mic-menu`, `mic-toggle`, `mic-state`) se elimina del HTML del lobby (era placeholder de fase 5 y ya no cabe en el header compacto); `mic-btn`/`deafen-btn` siguen funcionando como toggle visual local. Si esto rompe `astro check` por selectores no usados, eliminar también sus `getElementById` (no hay: ya no se referencian en este código).

- [ ] **Step 2: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 5: Tablero y director con paleta oscura espacial

**Files:**
- Modify: `src/board/board.ts`
- Modify: `src/director/director.ts`

**Interfaces:**
- Consumes: `Cable`/`StateEffect` de `../portal/types`, `RoomClient`.
- Produces: mismo `mountBoard`/`mountDirector` (firmas sin cambios). Solo cambian colores/clases.

- [ ] **Step 1: Actualizar colores en `src/board/board.ts`**

Ediciones puntuales (no reescribir el archivo):

1. En `mountBoard`, el `<svg>` (línea ~34) cambia el fondo y bordes:
   `background:#0b0e14;border-radius:16px;border:1px solid #2a2f3a;` →
   `background:#0b1326;border-radius:16px;border:4px solid #000000;`

2. Los paneles (líneas 36-37): `fill: "#1a1f2b", stroke: "#2a2f3a"` →
   `fill: "#171f33", stroke: "#000000"`.

3. La paleta de cursores (línea 56): `[0x22c55e, 0xf97316, 0x8b5cf6, 0x14b8a6]` →
   `[0xffb4a9, 0x2196f3, 0x4caf50, 0xcdcd00]`.

4. Los colores de cable se mantienen (vienen del generador: rojo/azul/amarillo/verde/naranja/morado) — vibrantes, coherentes con la paleta.

5. El `stripe` blanco (línea ~120) se mantiene (`stroke:"#ffffff"`).

6. El overlay `freeze`/`blind` (líneas 45-52) y las clases CSS ya están en `theme.css`; no cambian.

7. El badge del director (`director.ts`) usa clases del tema — ver Step 2.

- [ ] **Step 2: Reestilar `src/director/director.ts`**

Reemplazar TODO el contenido por:

```ts
import type { RoomClient } from "../portal/client";

export function mountDirector(container: HTMLElement, client: RoomClient): () => void {
  container.innerHTML = `
    <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6">
      <div class="flex items-center gap-3 mb-6">
        <span class="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shrink-0 border-4 border-black">
          <span class="material-symbols-outlined text-on-secondary">menu_book</span>
        </span>
        <div>
          <h2 class="text-heading-sm font-display text-secondary uppercase">Manual de desactivación</h2>
          <p class="text-caption text-on-surface-variant uppercase mt-1">Solo el director ve esta información</p>
        </div>
      </div>
      <div class="bg-surface-high border-4 border-black rounded-xl p-6 mb-6 border-l-8 border-l-tertiary">
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
        "flex items-start gap-3 bg-surface-high border-4 border-black rounded-lg px-4 py-2 text-body-sm text-carbon";
      const num = document.createElement("span");
      num.className =
        "w-6 h-6 rounded-full bg-secondary text-on-secondary text-caption font-bold flex items-center justify-center shrink-0 border-2 border-black";
      num.textContent = String(steps.children.length + 1);
      const text = document.createElement("span");
      text.textContent = step;
      li.append(num, text);
      steps.appendChild(li);
    }
  });

  return () => unsub();
}
```

- [ ] **Step 3: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 6: Integración y verificación del loop completo

**Files:**
- Ninguno (verificación).

- [ ] **Step 1: Typecheck global**

Run: `npx astro check`
Expected: 0 errors, 0 warnings (los hints preexistentes de `agent/room/agent.ts` — `isHuman`, `ChannelStatus` — son aceptables).

- [ ] **Step 2: Build de producción**

Run: `npx astro build`
Expected: build OK (output de `.astro/` generado sin errores).

- [ ] **Step 3: Smoke test en dev**

Run en dos terminales:
- `npm run agent:room`
- `astro dev`

Expected (test manual con pestañas):
- Identidad: pantalla con paleta navy + crewmate.
- Menú: nav lateral + perfil OPERATOR + room cards (badge "Sec", contador, host, tiras de cables, botón Join/Locked) + FAB + unirse por código.
- Lobby: shell, Room Code copiable, player cards con crewmates de colores y badges, "Sala de Espera" pulsante, comms reestilizado.
- Iniciar (host): tablero SVG con fondo `#0b1326` y paneles `#171f33`; director con manual en tarjetas Cartoon Brutalism.
- Cortes, efectos (freeze/blind/scramble), gameover y locked-out funcionan igual que antes.

- [ ] **Step 4: Confirmar working tree**

Run: `git status --short`
Expected: `src/styles/theme.css`, `src/pages/index.astro`, `src/pages/room.astro`, `src/menu/menu.ts`, `src/room/lobby.ts`, `src/board/board.ts`, `src/director/director.ts` modificados, `src/ui/crewmate.ts` nuevo; sin commits.
