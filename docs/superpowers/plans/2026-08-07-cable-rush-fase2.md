# Cable Rush — Fase 2: Nivel 1 jugable sin IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partida jugable de punta a punta sin IA: el agente juez genera el nivel (tablero + orden correcto + manual por template), los 3 cortadores cortan cables en un tablero 3D compartido con cursores en vivo, el director ve solo el manual y dicta el orden, el timer aplica +1:00 por nivel / -15 s por corte mal.

**Architecture:** El agente juez (`agent/room/agent.ts`) es la fuente de verdad del orden: genera el nivel, valida cada corte contra su orden interno y publica estado en `room-<id>`. Los clientes publican cortes en `room-<id>-actions` y cursores como mensajes efímeros en `room-<id>`. Una sola página `/room` cambia de vista según el rol (lobby → director/cortador).

**Tech Stack:** Astro, @portalsdk/core, three.js, TypeScript estricto, Node agent.

## Global Constraints

- **NO git commits** — instrucción explícita del usuario.
- TypeScript estricto, **sin comentarios** en el código salvo que se pidan.
- El agente juez es el **único** escritor de `room-<id>` y conoce el orden correcto; los clientes nunca lo reciben.
- `room-<id>`: estado del juego (nivel, tablero, manual, progreso, timer). Solo el agente lo escribe.
- `room-<id>-actions`: cortes publicados por los clientes (`{ type: "cut", label }`). El agente los consume.
- Cursores: mensajes **efímeros** en `room-<id>` (`{ type: "cursor", x, y, name }`), sin historial.
- Timer: arranca en 3:00; nivel superado +1:00; corte mal -15 s; timer 0 → fin.
- Director ve SOLO el manual (2D HTML). Cortadores ven el tablero 3D. Tablero = three.js; manual = HTML.
- Cables con **color + etiqueta** (letra visible). Cualquiera de los 3 cortadores puede cortar cualquier cable; primero gana.
- Verificación por tarea: `npx astro check` 0 errores + prueba en dev server.
- Espec de referencia: `docs/superpowers/specs/2026-08-07-cable-rush-design.md`.

---

### Task 1: Tipos + Portal client v2 — estado, cortes y cursores

**Files:**
- Modify: `src/portal/types.ts`
- Modify: `src/portal/client.ts`

**Interfaces:**
- Produces en `types.ts`: `Cable`, `LevelRules`, `RoomState`, `RoomAction`, `CursorMessage`, y el union `RoomContent` ampliado.
- Produces en `client.ts`: en `RoomClient` — `subscribeState(cb)`, `sendCut(label)`, `subscribeCursor(cb)`, `sendCursor(x, y)`, `getState()`.

- [ ] **Step 1: Ampliar `src/portal/types.ts`**

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

export interface ChatMessage {
  type: "chat";
  text: string;
  name: string;
}

export interface ChatEntry {
  id: string;
  name: string;
  text: string;
}

export interface Cable {
  label: string;
  color: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface LevelRules {
  summary: string;
  steps: string[];
}

export interface RoomState {
  status: "lobby" | "playing" | "finished";
  level: number;
  cables: Cable[];
  rules: LevelRules;
  cutCount: number;
  timerMs: number;
  updatedAt: number;
}

export type RoomAction =
  | { type: "cut"; label: string };

export interface CursorMessage {
  type: "cursor";
  x: number;
  y: number;
  name: string;
}

export type RoomContent =
  | RoomEvent
  | ChatMessage
  | CursorMessage;
```

- [ ] **Step 2: Ampliar `src/portal/client.ts`**

Añadir a `RoomClient`:

```ts
  subscribeState(cb: (s: RoomState | null) => void): () => void;
  getState(): RoomState | null;
  sendCut(label: string): Promise<void>;
  subscribeCursor(cb: (c: CursorMessage) => void): () => void;
  sendCursor(x: number, y: number, name: string): void;
```

En `joinRoom`:
- El canal de la room se tipa `RoomContent | RoomState` (el agente publica estado ahí):

```ts
  const room: ChannelHandle<RoomContent | RoomState> = portal.channel<RoomContent | RoomState>(
    `room-${roomId}`,
    { history: 500, metadata: meta as unknown as Record<string, unknown> }
  );
  const actions: ChannelHandle<RoomAction> = portal.channel<RoomAction>(`room-${roomId}-actions`, {
    history: 20,
  });
  room.acquire();
  actions.acquire();
```

- `const cursorListeners = new Set<(c: CursorMessage) => void>();`
- `const stateListeners = new Set<(s: RoomState | null) => void>();`

Actualizar el type guard de `chatHistory()` (heredado de fase 1), porque el canal ahora es `RoomContent | RoomState` y `RoomState` no tiene `type`:

```ts
  function chatHistory(): ChatEntry[] {
    return room
      .getSnapshot()
      .messages.filter(
        (m): m is typeof m & { content: ChatMessage } =>
          "type" in m.content && m.content.type === "chat" && m.status !== "pending"
      )
      .map((m) => ({ id: m.id, name: m.content.name, text: m.content.text }));
  }
```

`emit()` ampliado (el estado se detecta por `"status" in content`, no por `.type`):

```ts
  function emit(): void {
    const snap = room.getSnapshot();
    for (const cb of statusListeners) cb(snap.status);
    for (const cb of presenceListeners) cb(players());
    for (const cb of chatListeners) {
      for (const m of chatHistory()) cb(m);
    }
    const last = [...snap.messages].reverse().find((m) => "status" in m.content) as
      | { content: RoomState }
      | undefined;
    for (const cb of stateListeners) cb(last?.content ?? null);
  }
```

`room.on("message")` ampliado con guards `in`:

```ts
  room.on("message", (m) => {
    const content = m.content;
    if ("type" in content && content.type === "chat") {
      for (const cb of chatListeners) cb({ id: m.id, name: content.name, text: content.text });
      return;
    }
    if ("type" in content && content.type === "cursor") {
      for (const cb of cursorListeners) cb(content);
      return;
    }
    if ("type" in content) {
      for (const cb of eventListeners) cb(content as RoomEvent);
    }
  });
```

Nuevos métodos en el objeto devuelto:

```ts
    subscribeState: (cb) => {
      stateListeners.add(cb);
      const last = [...room.getSnapshot().messages]
        .reverse()
        .find((m) => "status" in m.content) as { content: RoomState } | undefined;
      cb(last?.content ?? null);
      return () => stateListeners.delete(cb);
    },
    getState: () => {
      const last = [...room.getSnapshot().messages]
        .reverse()
        .find((m) => "status" in m.content) as { content: RoomState } | undefined;
      return last?.content ?? null;
    },
    sendCut: async (label) => {
      await actions.send({ content: { type: "cut", label } as RoomAction, ephemeral: true });
    },
    subscribeCursor: (cb) => {
      cursorListeners.add(cb);
      return () => cursorListeners.delete(cb);
    },
    sendCursor: (x, y, name) => {
      void room.send({ content: { type: "cursor", x, y, name } as CursorMessage, ephemeral: true });
    },
```

En el `release()`, también liberar `actions`:

```ts
    release: () => {
      room.release();
      actions.release();
    },
```

- [ ] **Step 3: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 2: Agente juez multi-room — nivel, validación, timer

**Files:**
- Create: `agent/room/generator.ts`
- Create: `agent/room/agent.ts`

**Interfaces:**
- Produces: `generateLevel(level: number): { cables: Cable[]; order: string[]; rules: LevelRules }` en `generator.ts`.
- Produces: `agent.ts` que por cada room arranca un `RoomJudge` (escucha `room-<id>-actions`, valida cortes, publica `RoomState` en `room-<id>`, timer).

- [ ] **Step 1: Crear `agent/room/generator.ts`**

```ts
import type { Cable, LevelRules } from "../../src/portal/types.ts";

const COLORS = [0xff4d4d, 0x4dd2ff, 0xffd34d, 0x6bff6b, 0xff8a3d, 0xbf6bff];
const LABELS = ["A", "B", "C", "D", "E", "F"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface GeneratedLevel {
  cables: Cable[];
  order: string[];
  rules: LevelRules;
}

export function generateLevel(level: number): GeneratedLevel {
  const count = Math.min(6, 3 + Math.floor(level / 2));
  const colorPool = shuffle(COLORS).slice(0, Math.min(3 + Math.floor(level / 3), COLORS.length));
  const cables: Cable[] = [];
  const order = shuffle(LABELS.slice(0, count));
  const used = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const color = colorPool[i % colorPool.length];
    used.set(color, (used.get(color) ?? 0) + 1);
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    cables.push({
      label: order[i],
      color,
      position: [Math.cos(angle) * 1.6, Math.sin(angle) * 0.6 + 0.4, 0.9],
      rotation: [0, 0, angle + Math.PI / 2],
    });
  }
  const firstColor = cables.find((c) => c.label === order[0])!.color;
  const rules: LevelRules = {
    summary: `Nivel ${level}: hay ${count} cables. Corta TODOS los cables en el orden correcto.`,
    steps: [
      `El PRIMER cable en cortarse es el de color ${colorName(firstColor)}.`,
      ...cables.slice(1).map((c, i) => `Después, corta el cable de color ${colorName(c.color)}.`),
    ],
  };
  return { cables, order, rules };
}

export function colorName(color: number): string {
  const names: Record<number, string> = {
    0xff4d4d: "rojo",
    0x4dd2ff: "azul",
    0xffd34d: "amarillo",
    0x6bff6b: "verde",
    0xff8a3d: "naranja",
    0xbf6bff: "morado",
  };
  return names[color] ?? "desconocido";
}
```

- [ ] **Step 2: Crear `agent/room/agent.ts`**

```ts
import { Portal } from "@portalsdk/core";
import type { ChannelHandle, ChannelStatus, DetailedPresence } from "@portalsdk/core";
import type { RoomAction, RoomState, RoomInfo } from "../../src/portal/types.ts";
import { generateLevel } from "./generator.ts";

const PUBLIC_PORTAL_KEY = process.env.PUBLIC_PORTAL_KEY ?? "";

if (!PUBLIC_PORTAL_KEY) {
  console.error("[agent] Falta PUBLIC_PORTAL_KEY en .env");
  process.exit(1);
}

const portal = new Portal({ apiKey: PUBLIC_PORTAL_KEY });
const index: ChannelHandle<RoomInfo> = portal.channel<RoomInfo>("rooms-index", { history: 50 });

const START_TIMER_MS = 180_000;
const LEVEL_BONUS_MS = 60_000;
const CUT_PENALTY_MS = 15_000;

interface Judge {
  roomId: string;
  room: ChannelHandle<RoomState>;
  actions: ChannelHandle<RoomAction>;
  level: number;
  cables: { label: string; color: number; position: [number, number, number]; rotation: [number, number, number] }[];
  order: string[];
  cutCount: number;
  timerMs: number;
  timer: ReturnType<typeof setInterval> | null;
  tick: ReturnType<typeof setInterval> | null;
  started: boolean;
}

const judges = new Map<string, Judge>();

function isHuman(count: number, room: ChannelHandle<RoomState>): boolean {
  const p = room.getSnapshot().presence as DetailedPresence | undefined;
  if (!p || p.kind !== "detailed") return false;
  return p.participants.filter((x) => x.metadata?.kind !== "agent").length === count;
}

function publish(j: Judge): void {
  void j.room.send({
    content: {
      status: "playing",
      level: j.level,
      cables: j.cables,
      rules: generateLevel(j.level).rules,
      cutCount: j.cutCount,
      timerMs: j.timerMs,
      updatedAt: Date.now(),
    },
  });
}

function startLevel(j: Judge): void {
  const gen = generateLevel(j.level);
  j.cables = gen.cables;
  j.order = gen.order;
  j.cutCount = 0;
  publish(j);
}

function startTimer(j: Judge): void {
  j.timerMs = START_TIMER_MS;
  j.tick = setInterval(() => {
    j.timerMs = Math.max(0, j.timerMs - 1000);
    if (j.timerMs === 0) {
      void j.room.send({ content: { status: "finished", level: j.level, cables: j.cables, rules: generateLevel(j.level).rules, cutCount: j.cutCount, timerMs: 0, updatedAt: Date.now() } });
      stopTimer(j);
      return;
    }
    publish(j);
  }, 1000);
}

function stopTimer(j: Judge): void {
  if (j.tick) clearInterval(j.tick);
  j.tick = null;
}

function bootJudge(roomId: string): void {
  if (judges.has(roomId)) return;
  const room: ChannelHandle<RoomState> = portal.channel<RoomState>(`room-${roomId}`, {
    history: 20,
    metadata: { kind: "agent" },
  });
  const actions: ChannelHandle<RoomAction> = portal.channel<RoomAction>(`room-${roomId}-actions`, {
    history: 20,
  });
  room.acquire();
  actions.acquire();

  const j: Judge = {
    roomId,
    room,
    actions,
    level: 1,
    cables: [],
    order: [],
    cutCount: 0,
    timerMs: START_TIMER_MS,
    timer: null,
    tick: null,
    started: false,
  };
  judges.set(roomId, j);

  room.on("message", (m) => {
    const content = m.content;
    if (content.type === "start" && !j.started) {
      j.started = true;
      startLevel(j);
      startTimer(j);
      console.log(`[agent] ${roomId} partida iniciada`);
    }
  });

  actions.on("message", (m) => {
    if (!j.started) return;
    if (m.content.type !== "cut") return;
    const label = m.content.label;
    const expected = j.order[j.cutCount];
    if (label === expected) {
      j.cutCount++;
      if (j.cutCount === j.order.length) {
        j.level++;
        j.timerMs = Math.min(j.timerMs + LEVEL_BONUS_MS, START_TIMER_MS + LEVEL_BONUS_MS * 10);
        startLevel(j);
        console.log(`[agent] ${roomId} nivel ${j.level - 1} superado`);
      } else {
        publish(j);
      }
    } else {
      j.timerMs = Math.max(0, j.timerMs - CUT_PENALTY_MS);
      publish(j);
      console.log(`[agent] ${roomId} corte mal (-15s): ${label} esperado ${expected}`);
    }
  });

  console.log(`[agent] juez activo para ${roomId}`);
}

function watchRooms(): void {
  const rooms = index
    .getSnapshot()
    .messages.map((m) => m.content)
    .filter((r) => Date.now() - r.updatedAt <= 10_000)
    .map((r) => r.id);
  for (const id of rooms) bootJudge(id);
}

index.acquire();
index.on("presence", watchRooms);
index.on("status", () => watchRooms());
setInterval(watchRooms, 5000);
console.log("[agent] agente juez listo, observando rooms-index...");

process.on("SIGINT", () => {
  index.release();
  process.exit(0);
});
```

- [ ] **Step 3: Verificar**

Run: `npx astro check`
Expected: 0 errors (el agente está bajo `agent/` y se incluye en el typecheck). Si el tipo `RoomAction` importa mal el path, ajustar el import con extensión `.ts`.

---

### Task 3: Tablero 3D de cables + corte + cursores

**Files:**
- Create: `src/board/setup.ts`
- Create: `src/board/board.ts`

**Interfaces:**
- Consumes: `subscribeState`, `sendCut`, `subscribeCursor`, `sendCursor`, `getState`, `getSelfId`, `getPlayers`.
- Produces: `mountBoard(container: HTMLElement, client: RoomClient, selfName: string): () => void`.

- [ ] **Step 1: Crear `src/board/setup.ts` (escena three.js base reutilizable)**

```ts
import * as THREE from "three";

export interface SceneHandle {
  getCanvas(): HTMLCanvasElement;
  getCamera(): THREE.Camera;
  add(obj: THREE.Object3D): void;
  remove(obj: THREE.Object3D): void;
  raycast(ndc: { x: number; y: number }): THREE.Object3D | null;
  dispose(): void;
}

export function initScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e14);

  const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 1.6, 6.5);
  camera.lookAt(0, 0.4, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.PointLight(0xfff2d9, 2.2, 30);
  key.position.set(3, 5, 6);
  scene.add(key);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2.4, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.6 })
  );
  panel.position.set(0, 0.4, 0.6);
  scene.add(panel);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets = new Set<THREE.Object3D>();

  const handle: SceneHandle = {
    getCanvas: () => canvas,
    getCamera: () => camera,
    add: (obj) => {
      scene.add(obj);
      obj.traverse((o) => targets.add(o));
    },
    remove: (obj) => {
      scene.remove(obj);
      obj.traverse((o) => targets.delete(o));
    },
    raycast: (ndc) => {
      pointer.set(ndc.x, ndc.y);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...targets], false);
      return hits[0]?.object ?? null;
    },
    dispose: () => {
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
      });
    },
  };

  const start = performance.now();
  let raf = 0;
  function animate(): void {
    raf = requestAnimationFrame(animate);
    const t = (performance.now() - start) / 1000;
    panel.rotation.y = Math.sin(t * 0.2) * 0.12;
    renderer.render(scene, camera);
  }
  animate();

  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const origDispose = handle.dispose.bind(handle);
  handle.dispose = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    origDispose();
  };
  return handle;
}
```

- [ ] **Step 2: Crear `src/board/board.ts`**

```ts
import * as THREE from "three";
import type { RoomClient } from "../portal/client";
import type { Cable } from "../portal/types";
import { initScene } from "./setup";

export function mountBoard(container: HTMLElement, client: RoomClient, selfName: string): () => void {
  const canvas = document.createElement("canvas");
  canvas.width = 700;
  canvas.height = 420;
  container.appendChild(canvas);

  const scene = initScene(canvas);
  const cableMeshes = new Map<string, THREE.Mesh>();
  const cursorLayer = document.createElement("div");
  cursorLayer.className = "cursor-layer";
  container.appendChild(cursorLayer);

  const nameColors = new Map<string, number>();
  const palette = [0x22c55e, 0xf97316, 0x8b5cf6, 0x14b8a6];

  function nameColor(id: string): number {
    if (!nameColors.has(id)) {
      nameColors.set(id, palette[nameColors.size % palette.length]);
    }
    return nameColors.get(id)!;
  }

  function renderCables(cables: Cable[]): void {
    for (const mesh of cableMeshes.values()) scene.remove(mesh);
    cableMeshes.clear();
    for (const c of cables) {
      const mat = new THREE.MeshStandardMaterial({
        color: c.color,
        emissive: c.color,
        emissiveIntensity: 0.35,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.6, 10), mat);
      mesh.position.set(...c.position);
      mesh.rotation.set(...c.rotation);
      mesh.userData.label = c.label;
      scene.add(mesh);
      cableMeshes.set(c.label, mesh);
    }
  }

  const players = new Map<string, { x: number; y: number; name: string }>();

  function renderCursors(): void {
    cursorLayer.replaceChildren();
    for (const p of players.values()) {
      const el = document.createElement("div");
      el.className = "cursor";
      el.style.left = `${p.x * 100}%`;
      el.style.top = `${p.y * 100}%`;
      el.style.borderColor = `#${nameColor(p.name).toString(16).padStart(6, "0")}`;
      el.textContent = p.name;
      cursorLayer.appendChild(el);
    }
  }

  const selfId = client.getSelfId();

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    client.sendCursor(x, y, selfName);
  });

  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const ndc = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    };
    const hit = scene.raycast(ndc);
    const label = hit?.userData.label as string | undefined;
    if (label) void client.sendCut(label);
  });

  client.subscribeState((s) => {
    if (s && s.cables.length) renderCables(s.cables);
  });

  client.subscribeCursor((c) => {
    if (c.name === selfName) return;
    players.set(c.name, { x: c.x, y: c.y, name: c.name });
    renderCursors();
  });

  return () => {
    canvas.remove();
    cursorLayer.remove();
    scene.dispose();
  };
}
```

- [ ] **Step 3: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 4: Vista del director — manual

**Files:**
- Create: `src/director/director.ts`

**Interfaces:**
- Consumes: `subscribeState`.
- Produces: `mountDirector(container: HTMLElement, client: RoomClient): () => void`.

- [ ] **Step 1: Crear `src/director/director.ts`**

```ts
import type { RoomClient } from "../portal/client";

export function mountDirector(container: HTMLElement, client: RoomClient): () => void {
  container.innerHTML = `
    <div class="manual">
      <h2>Manual de desactivación</h2>
      <p id="manual-summary">Esperando nivel...</p>
      <ol id="manual-steps"></ol>
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
      li.textContent = step;
      steps.appendChild(li);
    }
  });

  return () => unsub();
}
```

- [ ] **Step 2: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 5: Lobby → partida por rol (single page)

**Files:**
- Modify: `src/room/lobby.ts`
- Modify: `src/pages/room.astro` (estilos del tablero/manual/cursor)

**Interfaces:**
- Consumes: `mountBoard`, `mountDirector`, `subscribeEvents`, `subscribePresence`.
- Produces: al llegar 4 jugadores + juez, el host envía `{ type: "start" }`; cada cliente monta su vista por rol (cortador → tablero, director → manual) y muestra el timer/estado.

- [ ] **Step 1: Modificar `src/room/lobby.ts`**

Importar los mounts:

```ts
import { mountBoard } from "../board/board";
import { mountDirector } from "../director/director";
```

En el HTML del root, envolver la escena y añadir el botón de inicio (solo host):

```ts
  root.innerHTML = `
    <h1>Cable Rush</h1>
    <p id="room-id">Room: ${roomName}</p>
    <p id="status">conectando...</p>
    <div id="players"></div>
    <p id="lobby-state">Esperando jugadores...</p>
    ${isHost ? '<button id="start-btn" disabled>Iniciar partida</button>' : ""}
    <div id="stage"></div>
    <p id="timer">Timer: --:--</p>
    <div id="chat">
      <div id="chat-log"></div>
      <form id="chat-form">
        <input id="chat-input" maxlength="200" placeholder="Escribe un mensaje..." autocomplete="off" />
        <button type="submit">Enviar</button>
      </form>
    </div>
    <a href="/">← Volver al menú</a>
  `;
```

Añadir tras `const stateEl = ...`:

```ts
  const timerEl = document.getElementById("timer");
  const startBtn = document.getElementById("start-btn");
```

Añadir tras `let announced = false;`:

```ts
  let started = false;
  let judgeAnnounced = false;
  let cleanup: (() => void) | null = null;

  function mountByRole(role: Role): void {
    const stage = document.getElementById("stage");
    if (!stage) return;
    stage.replaceChildren();
    cleanup?.();
    cleanup = role === "judge" ? mountDirector(stage, client) : mountBoard(stage, client, username);
  }
```

Suscripciones de eventos y start (el rol ya quedó fijado en la metadata por el evento `judge`):

```ts
  client.subscribeEvents((e) => {
    if (e.type === "judge") {
      judgeAnnounced = true;
      const role: Role = e.judgeId === client.getSelfId() ? "judge" : "cutter";
      client.setMeta({ name: username, host: isHost, role });
      if (stateEl) stateEl.textContent = "Juez elegido. Esperando que el host inicie...";
      if (startBtn) startBtn.disabled = client.getPlayers().length < REQUIRED_PLAYERS;
    }
    if (e.type === "start") {
      started = true;
      const self = client.getPlayers().find((p) => p.id === client.getSelfId());
      mountByRole((self?.role ?? "cutter") as Role);
      if (stateEl) stateEl.textContent = "¡Partida en curso!";
    }
  });
```

En `subscribePresence`, habilitar el botón del host cuando haya 4 jugadores y juez anunciado:

```ts
  client.subscribePresence((list) => {
    renderPlayers(list);
    if (stateEl) {
      stateEl.textContent =
        started
          ? "¡Partida en curso!"
          : list.length >= REQUIRED_PLAYERS
            ? "¡4 jugadores! Esperando al juez..."
            : `Esperando jugadores (${list.length}/4)`;
    }
    if (startBtn) startBtn.disabled = !(judgeAnnounced && list.length >= REQUIRED_PLAYERS);
    maybeAnnounceJudge(list);
    if (isHost) publish();
  });
```

Botón "Iniciar" para el host (solo visible para él):

```ts
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (judgeAnnounced) void client.sendEvent({ type: "start" });
    });
  }
```

`subscribeState` para el timer:

```ts
  client.subscribeState((s) => {
    if (!timerEl) return;
    if (!s) return;
    const secs = Math.max(0, Math.round(s.timerMs / 1000));
    timerEl.textContent = `Timer: ${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  });
```

- [ ] **Step 2: Añadir estilos en `src/pages/room.astro`**

Añadir al `<style>`:

```css
      #stage {
        position: relative;
        margin-top: 0.75rem;
      }
      #stage canvas {
        width: 100%;
        height: 420px;
        display: block;
        border: 1px solid #2a2f3a;
        border-radius: 12px;
        background: #0b0e14;
      }
      .cursor-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .cursor {
        position: absolute;
        transform: translate(-50%, -50%);
        border: 2px solid;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        background: rgba(255, 255, 255, 0.15);
        font-size: 0.7rem;
        padding: 0.2rem 0.35rem;
        color: #e6e9f0;
        white-space: nowrap;
      }
      .manual {
        border: 1px solid #2a2f3a;
        border-radius: 12px;
        padding: 1rem 1.2rem;
        background: #12161f;
      }
      .manual ol {
        padding-left: 1.2rem;
        line-height: 1.6;
      }
      #timer {
        font-weight: 700;
        font-size: 1.1rem;
        margin-top: 0.5rem;
      }
      #start-btn {
        margin-top: 0.75rem;
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
Expected: 0 errors.

- [ ] **Step 2: Levantar agente y dev server**

Run en dos terminales:
- `npm run agent:room`
- `astro dev --background`

Expected: el agente loguea `agente juez listo, observando rooms-index...`.

- [ ] **Step 3: Test manual con 4 pestañas**

Abrir `http://localhost:4321` en 4 pestañas, unirse a la misma room. El host inicia la partida.

Expected:
- Los 3 cortadores ven el tablero 3D con cables color+etiqueta; sus cursores se ven con nombre en tiempo real.
- El director ve el manual (resumen + pasos en orden de colores).
- Cortar el cable correcto avanza; cortar mal resta 15 s al timer visible.
- Completar el nivel suma +1:00 y genera el siguiente (más cables/colores).
- Timer a 0 → estado `finished` y se muestra en el HUD.

- [ ] **Step 4: Confirmar que no se commitió nada**

Run: `git status --short`
Expected: solo archivos nuevos/modificados, sin commits.
