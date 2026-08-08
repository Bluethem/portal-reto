# Cable Rush — Fase 1: Menú + Rooms + Lobby — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pantalla de usuario → lista de rooms públicas (tabla) + crear room (pública o privada con código) → lobby de 4 jugadores con presencia → elección aleatoria del juez (director) anunciada por el host.

**Architecture:** Cliente Astro + Portal. El canal `rooms-index` lo mantienen los **hosts** con heartbeat (sin agente en esta fase); cada room usa un canal `room-<id>` para presencia + eventos. El host, al ver 4 jugadores, elige el juez aleatoriamente y lo publica en el canal de la room; los 4 clientes lo leen. Reutiliza `src/portal/` (client, types), `src/shared/` (timer, colors, pointer, flash) y el patrón de `src/bomb/portal/client.ts`.

**Tech Stack:** Astro, @portalsdk/core (presencia, canales, subscribe/emit, setMetadata), TypeScript estricto.

## Global Constraints

- **NO git commits** — instrucción explícita del usuario. Verificar con `git status --short` que no se stageea nada.
- TypeScript estricto, **sin comentarios** en el código salvo que se pidan.
- Esta fase NO usa agente Node: el `rooms-index` lo mantienen los hosts con heartbeat (~5 s). El agente juez llega en fases 2+.
- Roles por presencia: `{ name, host, role }`; `role: "judge" | "cutter"`. El juez lo elige el host (Math.random sobre los 4 presentes) y lo publica como mensaje en `room-<id>`.
- Rooms privadas: id de canal `room-prv-<CODE>` (código corto). NO se listan en `rooms-index`; se unen por código. Rooms públicas: id `room-pub-<rand>` y sí se listan.
- Verificación por tarea: `npx astro check` 0 errores + prueba manual en `http://localhost:4321`.
- Espec de referencia: `docs/superpowers/specs/2026-08-07-cable-rush-design.md`.

---

### Task 1: Portal client v2 — types + client de menú y room

**Files:**
- Create: `src/portal/types.ts`
- Create: `src/portal/client.ts`

**Interfaces:**
- Produces: `Role`, `PlayerMeta`, `RoomInfo`, `RoomEvent` en `src/portal/types.ts`.
- Produces: `createMenuClient(): MenuClient` y `joinRoom(roomId, meta): RoomClient` en `src/portal/client.ts`.

- [ ] **Step 1: Crear `src/portal/types.ts`**

```ts
export type Role = "judge" | "cutter";

export interface PlayerMeta {
  name: string;
  host: boolean;
  role: Role | null;
}

export interface RoomInfo {
  id: string;
  name: string;
  mode: "public" | "private";
  players: number;
  hostId: string;
  hostName: string;
  updatedAt: number;
}

export type RoomEvent =
  | { type: "judge"; judgeId: string }
  | { type: "start" };
```

- [ ] **Step 2: Crear `src/portal/client.ts`**

```ts
import { Portal } from "@portalsdk/core";
import type { ChannelHandle, ChannelStatus, DetailedPresence } from "@portalsdk/core";
import type { PlayerMeta, RoomEvent, RoomInfo } from "./types";

const apiKey = import.meta.env.PUBLIC_PORTAL_KEY as string;
const portal = new Portal({ apiKey });

const INDEX_ID = "rooms-index";
const INDEX_TTL_MS = 15_000;

export interface MenuClient {
  getChannelStatus(): ChannelStatus;
  subscribeStatus(cb: (s: ChannelStatus) => void): () => void;
  subscribeRooms(cb: (rooms: RoomInfo[]) => void): () => void;
}

export interface RoomClient {
  getChannelStatus(): ChannelStatus;
  getSelfId(): string;
  getPlayers(): { id: string; name: string; host: boolean }[];
  subscribeStatus(cb: (s: ChannelStatus) => void): () => void;
  subscribePresence(cb: (players: { id: string; name: string; host: boolean }[]) => void): () => void;
  subscribeEvents(cb: (e: RoomEvent) => void): () => void;
  setMeta(meta: PlayerMeta): void;
  sendEvent(e: RoomEvent): Promise<void>;
  publishRoom(info: RoomInfo): Promise<void>;
  release(): void;
}

function roomsFromSnapshot(snap: { messages: readonly { content: RoomInfo }[] }): RoomInfo[] {
  const now = Date.now();
  const byId = new Map<string, RoomInfo>();
  for (const m of snap.messages) {
    if (now - m.content.updatedAt <= INDEX_TTL_MS) byId.set(m.content.id, m.content);
  }
  return [...byId.values()];
}

export function createMenuClient(): MenuClient {
  const index: ChannelHandle<RoomInfo> = portal.channel<RoomInfo>(INDEX_ID, { history: 50 });
  index.acquire();
  const statusListeners = new Set<(s: ChannelStatus) => void>();
  const roomsListeners = new Set<(rooms: RoomInfo[]) => void>();

  function emit(): void {
    const snap = index.getSnapshot();
    for (const cb of statusListeners) cb(snap.status);
    for (const cb of roomsListeners) cb(roomsFromSnapshot(snap));
  }

  index.subscribe(emit);
  index.on("status", emit);

  return {
    getChannelStatus: () => index.getSnapshot().status,
    subscribeStatus: (cb) => {
      statusListeners.add(cb);
      cb(index.getSnapshot().status);
      return () => statusListeners.delete(cb);
    },
    subscribeRooms: (cb) => {
      roomsListeners.add(cb);
      cb(roomsFromSnapshot(index.getSnapshot()));
      return () => roomsListeners.delete(cb);
    },
  };
}

export function joinRoom(roomId: string, meta: PlayerMeta): RoomClient {
  const room: ChannelHandle<RoomEvent> = portal.channel<RoomEvent>(`room-${roomId}`, {
    metadata: meta,
  });
  room.acquire();

  let selfId = "";
  const statusListeners = new Set<(s: ChannelStatus) => void>();
  const presenceListeners = new Set<(p: { id: string; name: string; host: boolean }[]) => void>();
  const eventListeners = new Set<(e: RoomEvent) => void>();

  function players(): { id: string; name: string; host: boolean }[] {
    const p = room.getSnapshot().presence as DetailedPresence | undefined;
    if (!p || p.kind !== "detailed") return [];
    return p.participants.map((x) => ({
      id: x.id,
      name: (x.metadata?.name as string | undefined) ?? "?",
      host: (x.metadata?.host as boolean | undefined) ?? false,
    }));
  }

  function emit(): void {
    const snap = room.getSnapshot();
    for (const cb of statusListeners) cb(snap.status);
    for (const cb of presenceListeners) cb(players());
  }

  room.on("status", (s) => {
    if (s === "ready") selfId = room.getSnapshot().me?.id ?? "";
    emit();
  });
  room.on("presence", emit);
  room.on("message", (m) => {
    for (const cb of eventListeners) cb(m.content);
  });
  room.subscribe(emit);

  const index: ChannelHandle<RoomInfo> = portal.channel<RoomInfo>(INDEX_ID, { history: 50 });

  return {
    getChannelStatus: () => room.getSnapshot().status,
    getSelfId: () => selfId,
    getPlayers: players,
    subscribeStatus: (cb) => {
      statusListeners.add(cb);
      cb(room.getSnapshot().status);
      return () => statusListeners.delete(cb);
    },
    subscribePresence: (cb) => {
      presenceListeners.add(cb);
      cb(players());
      return () => presenceListeners.delete(cb);
    },
    subscribeEvents: (cb) => {
      eventListeners.add(cb);
      return () => eventListeners.delete(cb);
    },
    setMeta: (m) => room.setMetadata(m),
    sendEvent: async (e) => {
      await room.send({ content: e });
    },
    publishRoom: async (info) => {
      index.acquire();
      await index.send({ content: info });
    },
    release: () => {
      room.release();
    },
  };
}
```

- [ ] **Step 3: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 2: Menú — username + lista de rooms + crear/unirse

**Files:**
- Create: `src/shared/username.ts`
- Create: `src/shared/id.ts`
- Create: `src/menu/menu.ts`
- Modify: `src/pages/index.astro` (reemplazar contenido por el menú)

**Interfaces:**
- Consumes: `createMenuClient()` (Task 1).
- Produces: `bootMenu(): void` que monta el flujo username → rooms.

- [ ] **Step 1: Crear `src/shared/username.ts`**

```ts
const KEY = "cable-rush-username";

export function getUsername(): string | null {
  return localStorage.getItem(KEY);
}

export function setUsername(name: string): void {
  localStorage.setItem(KEY, name);
}
```

- [ ] **Step 2: Crear `src/shared/id.ts`**

```ts
export function randomRoomId(): string {
  return `pub-${Math.random().toString(36).slice(2, 10)}`;
}

export function randomRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
```

- [ ] **Step 3: Crear `src/menu/menu.ts`**

```ts
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
    <h1>Cable Rush</h1>
    <form id="user-form">
      <label>Tu nombre</label>
      <input id="user-name" maxlength="16" autofocus />
      <button type="submit">Entrar</button>
    </form>
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
    <h1>Cable Rush</h1>
    <section>
      <h2>Crear room</h2>
      <form id="create-form">
        <input id="create-name" maxlength="24" placeholder="Nombre (opcional)" />
        <select id="create-mode">
          <option value="public">Pública</option>
          <option value="private">Privada (código)</option>
        </select>
        <button type="submit">Crear</button>
      </form>
    </section>
    <section>
      <h2>Unirse con código</h2>
      <form id="join-form">
        <input id="join-code" maxlength="8" placeholder="Código" />
        <button type="submit">Unirse</button>
      </form>
    </section>
    <section>
      <h2>Rooms públicas</h2>
      <div id="rooms-status">conectando...</div>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Jugadores</th><th>Host</th><th></th></tr>
        </thead>
        <tbody id="rooms-body"></tbody>
      </table>
    </section>
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
    if (code) window.location.href = `/room?id=${encodeURIComponent(`prv-${code}`)}`;
  });

  const statusEl = document.getElementById("rooms-status");
  const body = document.getElementById("rooms-body");
  menu.subscribeStatus((s) => {
    if (statusEl) statusEl.textContent = s;
  });
  menu.subscribeRooms((rooms) => {
    if (!body) return;
    body.replaceChildren();
    const pubs = rooms.filter((r) => r.mode === "public");
    for (const r of pubs) {
      const tr = document.createElement("tr");
      const name = document.createElement("td");
      name.textContent = r.name;
      const players = document.createElement("td");
      players.textContent = `${r.players}/4`;
      const host = document.createElement("td");
      host.textContent = r.hostName;
      const join = document.createElement("td");
      const btn = document.createElement("button");
      btn.textContent = "Unirse";
      btn.addEventListener("click", () => {
        window.location.href = `/room?id=${encodeURIComponent(r.id)}`;
      });
      join.appendChild(btn);
      tr.append(name, players, host, join);
      body.appendChild(tr);
    }
  });
}
```

- [ ] **Step 4: Reemplazar `src/pages/index.astro`**

```astro
---
const title = "Cable Rush";
---

<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: system-ui, sans-serif;
      }
      body {
        margin: 0;
        background: #0b0e14;
        color: #e6e9f0;
      }
      #app {
        max-width: 720px;
        margin: 0 auto;
        padding: 1.5rem 1rem 2rem;
      }
      h1 {
        font-size: 1.5rem;
        margin: 0 0 1rem;
      }
      h2 {
        font-size: 1rem;
        margin: 1.2rem 0 0.5rem;
      }
      form {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      input,
      select {
        background: #12161f;
        color: #e6e9f0;
        border: 1px solid #2a2f3a;
        border-radius: 8px;
        padding: 0.45rem 0.7rem;
      }
      button {
        background: #2f6fed;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.45rem 1rem;
        cursor: pointer;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 0.5rem;
      }
      th,
      td {
        text-align: left;
        border-bottom: 1px solid #2a2f3a;
        padding: 0.5rem 0.4rem;
        font-size: 0.9rem;
      }
      #rooms-status {
        font-size: 0.8rem;
        color: #8b93a7;
      }
      #rooms-status.ready {
        color: #4ade80;
      }
      #rooms-status.blocked {
        color: #f87171;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
      import { bootMenu } from "../menu/menu";
      bootMenu();
    </script>
  </body>
</html>
```

- [ ] **Step 5: Verificar**

Run: `npx astro check` y abrir `http://localhost:4321`
Expected: 0 errors; aparece el formulario de nombre, luego la tabla de rooms vacía y los botones Crear / Unirse con código.

---

### Task 3: Lobby de room — presencia + elección del juez

**Files:**
- Create: `src/room/lobby.ts`
- Create: `src/pages/room.astro`

**Interfaces:**
- Consumes: `joinRoom()` (Task 1), `getUsername()` (Task 2).
- Produces: `bootRoom(roomId: string, isHost: boolean): void`.

- [ ] **Step 1: Crear `src/room/lobby.ts`**

```ts
import { joinRoom } from "../portal/client";
import type { Role } from "../portal/types";
import { getUsername } from "../shared/username";

const REQUIRED_PLAYERS = 4;

export function bootRoom(roomId: string, isHost: boolean, roomName: string): void {
  const root = document.getElementById("app");
  if (!root) return;

  const username = getUsername() ?? "anon";
  const client = joinRoom(roomId, { name: username, host: isHost, role: null });

  root.innerHTML = `
    <h1>Cable Rush</h1>
    <p id="room-id">Room: ${roomName}</p>
    <p id="status">conectando...</p>
    <div id="players"></div>
    <p id="lobby-state">Esperando jugadores...</p>
    <a href="/">← Volver al menú</a>
  `;

  const statusEl = document.getElementById("status");
  const playersEl = document.getElementById("players");
  const stateEl = document.getElementById("lobby-state");

  let announced = false;

  function renderPlayers(list: { id: string; name: string; host: boolean }[]): void {
    if (!playersEl) return;
    playersEl.replaceChildren();
    for (const p of list) {
      const div = document.createElement("div");
      div.textContent = `${p.host ? "[host] " : ""}${p.name}`;
      playersEl.appendChild(div);
    }
  }

  function maybeAnnounceJudge(list: { id: string; name: string; host: boolean }[]): void {
    if (!isHost || announced) return;
    if (list.length !== REQUIRED_PLAYERS) return;
    announced = true;
    const judge = list[Math.floor(Math.random() * list.length)];
    void client.sendEvent({ type: "judge", judgeId: judge.id });
  }

  client.subscribeStatus((s) => {
    if (statusEl) statusEl.textContent = s;
  });

  client.subscribePresence((list) => {
    renderPlayers(list);
    if (stateEl) {
      stateEl.textContent =
        list.length >= REQUIRED_PLAYERS ? "¡4 jugadores! Esperando al juez..." : `Esperando jugadores (${list.length}/4)`;
    }
    maybeAnnounceJudge(list);
  });

  client.subscribeEvents((e) => {
    if (e.type !== "judge") return;
    const role: Role = e.judgeId === client.getSelfId() ? "judge" : "cutter";
    client.setMeta({ name: username, host: isHost, role });
    if (role === "judge" && stateEl) {
      stateEl.textContent = "¡Tú eres el juez (manual)!";
    } else if (stateEl) {
      stateEl.textContent = "Juez elegido. Esperando inicio de la partida...";
    }
  });

  window.addEventListener("beforeunload", () => client.release());
}
```

- [ ] **Step 2: Crear `src/pages/room.astro`**

```astro
---
const title = "Cable Rush — Room";
const id = (Astro.url.searchParams.get("id") ?? "").trim();
const isHost = Astro.url.searchParams.get("host") === "1";
---

<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: system-ui, sans-serif;
      }
      body {
        margin: 0;
        background: #0b0e14;
        color: #e6e9f0;
      }
      #app {
        max-width: 720px;
        margin: 0 auto;
        padding: 1.5rem 1rem 2rem;
      }
      h1 {
        font-size: 1.5rem;
        margin: 0 0 0.5rem;
      }
      #room-id {
        color: #8b93a7;
        font-size: 0.85rem;
        margin: 0 0 1rem;
      }
      #status {
        font-size: 0.8rem;
        color: #facc15;
      }
      #status.ready {
        color: #4ade80;
      }
      #status.blocked {
        color: #f87171;
      }
      #players div {
        border: 1px solid #2a2f3a;
        border-radius: 8px;
        padding: 0.5rem 0.8rem;
        margin-top: 0.4rem;
        background: #12161f;
        font-size: 0.9rem;
      }
      #lobby-state {
        margin-top: 1rem;
        font-weight: 600;
      }
      a {
        color: #8b93a7;
        font-size: 0.85rem;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
      import { bootRoom } from "../room/lobby";
      const params = new URLSearchParams(window.location.search);
      bootRoom(
        params.get("id") ?? "",
        params.get("host") === "1",
        params.get("name") ?? params.get("id") ?? ""
      );
    </script>
  </body>
</html>
```

- [ ] **Step 3: Verificar**

Run: `npx astro check` y abrir `http://localhost:4321/room?id=pub-test&host=1`
Expected: 0 errors; el lobby muestra la room y "Esperando jugadores (1/4)".

---

### Task 4: Heartbeat del host + prueba multi-pestaña

**Files:**
- Modify: `src/room/lobby.ts`

**Interfaces:**
- Consumes: `client.publishRoom()` (Task 1), `client.subscribePresence()` (Task 3).
- Produces: el host publica `RoomInfo` actualizada en `rooms-index` cada 5 s mientras está en la room.

- [ ] **Step 1: Añadir heartbeat en `src/room/lobby.ts`**

Insertar tras el bloque de `subscribePresence` (solo si `isHost`):

```ts
  let lastPublish = 0;

  function publish(): void {
    const list = client.getPlayers();
    void client.publishRoom({
      id: roomId,
      name: roomName,
      mode: roomId.startsWith("prv-") ? "private" : "public",
      players: list.length,
      hostId: client.getSelfId(),
      hostName: username,
      updatedAt: Date.now(),
    });
  }

  if (isHost) {
    publish();
    const interval = setInterval(publish, 5000);
    window.addEventListener("beforeunload", () => clearInterval(interval));
  }
```

Ajustar la suscripción de presencia para re-publicar el conteo en cada cambio (host):

```ts
  client.subscribePresence((list) => {
    renderPlayers(list);
    if (stateEl) {
      stateEl.textContent =
        list.length >= REQUIRED_PLAYERS ? "¡4 jugadores! Esperando al juez..." : `Esperando jugadores (${list.length}/4)`;
    }
    maybeAnnounceJudge(list);
    if (isHost) publish();
  });
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 3: Prueba manual multi-pestaña**

Pasos:
1. `npm run dev` (o `astro dev --background`) y abrir `http://localhost:4321`.
2. Pestaña A: poner nombre "Ana" → Crear room pública → queda en el lobby (1/4).
3. Pestaña B: nombre "Beto" → la room de Ana aparece en la tabla → Unirse (2/4).
4. Pestañas C y D: "Caro", "Dani" → Unirse a la misma room → 4/4.
5. Verificar: en el lobby aparece "¡4 jugadores! Esperando al juez..." y al poco el host publica el juez; cada pestaña muestra su rol (una dice "Tú eres el juez", las demás "Juez elegido").
6. Probar room privada: crear con modo "Privada", anotar el código de la URL, y en otra pestaña unirse con el código.
7. Volver al menú en una pestaña distinta y confirmar que la room pública sigue listada con su conteo (heartbeat) y desaparece ~15 s después de cerrarla.

Expected: todo el flujo funciona; la room pública aparece/desaparece según el heartbeat.

---

### Task 5: Limpieza de la V1 + AGENTS.md

**Files:**
- Delete: `src/bomb/` (módulos y portal de la V1)
- Delete: `agent/bomb/`
- Modify: `package.json` (script `agent:bomb` → `agent:room`)
- Modify: `AGENTS.md` (estado de fase 1)

**Interfaces:**
- Consumes: nada (los archivos de la V1 ya no son importados por las páginas nuevas).

- [ ] **Step 1: Eliminar la V1**

Run:
```bash
rm -rf src/bomb agent/bomb
```
Expected: `src/bomb` y `agent/bomb` ya no existen. Confirmar que `src/pages/index.astro` y `src/pages/room.astro` no los importan.

- [ ] **Step 2: Actualizar `package.json`**

Reemplazar el script:

```json
"agent:bomb": "node --env-file=.env agent/bomb/agent.ts",
```

por:

```json
"agent:room": "node --env-file=.env agent/room/agent.ts",
```

(El archivo `agent/room/agent.ts` llega en fases 2+; el script apunta ahí.)

- [ ] **Step 3: Actualizar `AGENTS.md`**

Cambiar la sección `## Estado` para reflejar: fase 1 implementada (username → rooms → lobby → juez aleatorio por host), canales usados (`rooms-index` host-managed con heartbeat, `room-<id>` presencia/eventos), y que las fases 2-6 quedan pendientes.

- [ ] **Step 4: Verificar**

Run: `npx astro check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Confirmar que no se commitió nada**

Run: `git status --short`
Expected: solo archivos nuevos/modificados, sin commits.
