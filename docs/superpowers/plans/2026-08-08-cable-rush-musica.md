# Cable Rush — Música y efectos estilo Among Us (sintetizados) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir música de fondo ambiental estilo Among Us (inspirada, sintetizada por código) y efectos UI en el menú (rooms) y la sala del juego (waiting room), todo con Web Audio API y cero assets.

**Architecture:** Nuevo `src/ui/music.ts` con un secuenciador Web Audio determinístico (`startLobbyMusic`/`stopMusic`); `src/ui/sound.ts` se amplía con efectos UI cortos (`playClick`/`playJoin`/`playLeave`/`playReady`/`playStart`) manteniendo `playCut`/`playWrong`. Los hooks van en `menu.ts` (primer gesto → música + `playClick` en botones) y `lobby.ts` (primer gesto → música, join/leave/ready/start, `stopMusic` en `applyStart`).

**Tech Stack:** Astro, TypeScript estricto, Web Audio API (sin librerías).

## Global Constraints

- **NO git commits** — decisión del repo (AGENTS.md); los cambios quedan en working tree.
- TypeScript estricto, **sin comentarios** en el código.
- **Solo el cliente**: no tocar `src/portal/*`, `agent/*`, `worker/*`.
- Cero assets: música y efectos 100% generados con Web Audio API.
- Música **inspirada** en Among Us, no el tema literal (copyright).
- Se mantienen `playCut`/`playWrong` del tablero intactos.
- Verificación por tarea: `npx astro check` 0 errores.
- Espec de referencia: `docs/superpowers/specs/2026-08-08-cable-rush-musica-design.md`.

---

### Task 1: Música de fondo — `src/ui/music.ts`

**Files:**
- Create: `src/ui/music.ts`

**Interfaces:**
- Produces: `startLobbyMusic(): void` y `stopMusic(): void`.
- Consumes: nada (self-contained; usa `AudioContext` de forma lazy). Lo usan `menu.ts` y `lobby.ts` en Tasks 3-4.

- [ ] **Step 1: Crear `src/ui/music.ts`**

```ts
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let step = 0;
let playing = false;

function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const STEP_MS = 250;
const PATTERN = [0, 4, 7, 4, 0, 4, 7, 9, 7, 4, 0, 4, 7, 4, 2, 0];
const BASS = [55, 55, 49, 49, 55, 55, 49, 49, 55, 55, 49, 49, 55, 55, 49, 49];

function note(ac: AudioContext, freq: number, when: number, dur: number, gainValue: number, type: OscillatorType = "triangle"): void {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

function scheduleStep(ac: AudioContext): void {
  const t = ac.currentTime + 0.05;
  const semitones = PATTERN[step % PATTERN.length];
  const freq = 440 * Math.pow(2, semitones / 12);
  note(ac, freq, t, 0.18, 0.06);
  note(ac, freq / 2, t, 0.3, 0.05, "sine");
  const bassFreq = BASS[step % BASS.length];
  note(ac, bassFreq, t, 0.5, 0.04, "sine");
  step++;
}

export function startLobbyMusic(): void {
  const ac = audio();
  if (!ac || playing) return;
  playing = true;
  step = 0;
  scheduleStep(ac);
  timer = setInterval(() => scheduleStep(ac), STEP_MS);
}

export function stopMusic(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  playing = false;
  step = 0;
}
```

- [ ] **Step 2: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 2: Efectos UI — `src/ui/sound.ts`

**Files:**
- Modify: `src/ui/sound.ts`

**Interfaces:**
- Consumes: el patrón `audio()` ya existente en el archivo.
- Produces: `playClick(): void`, `playJoin(): void`, `playLeave(): void`, `playReady(): void`, `playStart(): void` (además de los existentes `playCut`/`playWrong`).

- [ ] **Step 1: Añadir los cinco efectos al final de `src/ui/sound.ts`**

Añadir tras `playWrong` (final del archivo):

```ts
function blip(ac: AudioContext, freq: number, when: number, dur: number, gainValue: number, type: OscillatorType = "sine"): void {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

export function playClick(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 700, t, 0.06, 0.08);
}

export function playJoin(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 523.25, t, 0.09, 0.07);
  blip(ac, 659.25, t + 0.08, 0.09, 0.07);
  blip(ac, 783.99, t + 0.16, 0.12, 0.07);
}

export function playLeave(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 783.99, t, 0.09, 0.07);
  blip(ac, 659.25, t + 0.08, 0.09, 0.07);
  blip(ac, 523.25, t + 0.16, 0.12, 0.07);
}

export function playReady(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 880, t, 0.08, 0.08);
  blip(ac, 1174.66, t + 0.09, 0.14, 0.08);
}

export function playStart(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 392, t, 0.1, 0.09, "square");
  blip(ac, 523.25, t + 0.12, 0.1, 0.09, "square");
  blip(ac, 659.25, t + 0.24, 0.1, 0.09, "square");
  blip(ac, 783.99, t + 0.36, 0.18, 0.09, "square");
}
```

- [ ] **Step 2: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 3: Hooks en el menú — `src/menu/menu.ts`

**Files:**
- Modify: `src/menu/menu.ts`

**Interfaces:**
- Consumes: `startLobbyMusic` de `../ui/music`, `playClick` de `../ui/sound`.
- Produces: música del menú tras el primer gesto + `playClick` en los botones del sidebar, FAB y forms.

- [ ] **Step 1: Importar los módulos**

Tras el import de `crewmateSvg` (línea 4):

```ts
import { startLobbyMusic } from "../ui/music";
import { playClick } from "../ui/sound";
```

- [ ] **Step 2: Arrancar la música al primer gesto en `renderMenu`**

En `renderMenu`, tras las líneas que obtienen `body` y `fab` (después de `const fab = document.getElementById("fab-create");`, línea ~112), añadir:

```ts
  const startMusicOnce = () => {
    startLobbyMusic();
    window.removeEventListener("pointerdown", startMusicOnce);
    window.removeEventListener("keydown", startMusicOnce);
  };
  window.addEventListener("pointerdown", startMusicOnce);
  window.addEventListener("keydown", startMusicOnce);
```

- [ ] **Step 3: `playClick` en los botones del menú**

Añadir `playClick()` en los handlers de click del sidebar, el FAB y los forms:

1. En el binding del sidebar (línea ~169, `document.querySelectorAll<HTMLButtonElement>("button[data-view]")...`), dentro del callback antes de `switchView(...)`:

```ts
  document.querySelectorAll<HTMLButtonElement>("button[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playClick();
      switchView(btn.dataset.view as "home" | "join" | "create" | "leaderboard");
    });
  });
```

2. En el FAB (línea ~170, `fab?.addEventListener("click", () => switchView("create"));`):

```ts
  fab?.addEventListener("click", () => {
    playClick();
    switchView("create");
  });
```

3. En `renderJoin` (submit del form, línea ~236) y `renderCreate` (submit, línea ~278), añadir `playClick();` al inicio del callback de submit:

```ts
  joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    playClick();
    const code = joinCode.value.trim().toUpperCase();
    if (!code) return;
```

```ts
  createForm.addEventListener("submit", (e) => {
    e.preventDefault();
    playClick();
    const mode = createMode.value as "public" | "private";
    const id = mode === "public" ? randomRoomId() : `prv-${randomRoomCode()}`;
    const name = createName.value.trim() || "Room";
    window.location.href = `/room?id=${encodeURIComponent(id)}&host=1&name=${encodeURIComponent(name)}`;
  });
```

- [ ] **Step 4: Verificar**

Run: `npx astro check`
Expected: 0 errors.

---

### Task 4: Hooks en la sala — `src/room/lobby.ts`

**Files:**
- Modify: `src/room/lobby.ts`

**Interfaces:**
- Consumes: `startLobbyMusic`/`stopMusic` de `../ui/music`, `playClick`/`playJoin`/`playLeave`/`playReady`/`playStart` de `../ui/sound`.
- Produces: música de sala al primer gesto; join/leave al renderizar players; ready al completar squad/designar juez; start + stop de música en `applyStart`.

- [ ] **Step 1: Importar los módulos**

Tras el import de `crewmateSvg` (línea 6):

```ts
import { startLobbyMusic, stopMusic } from "../ui/music";
import { playClick, playJoin, playLeave, playReady, playStart } from "../ui/sound";
```

- [ ] **Step 2: Arrancar la música al primer gesto en `bootRoom`**

Tras el bloque de `refreshAudio`/handlers de mic/deafen (después de la línea ~223, el cierre de `if (deafenBtn)`), añadir:

```ts
  const startMusicOnce = () => {
    startLobbyMusic();
    window.removeEventListener("pointerdown", startMusicOnce);
    window.removeEventListener("keydown", startMusicOnce);
  };
  window.addEventListener("pointerdown", startMusicOnce);
  window.addEventListener("keydown", startMusicOnce);
```

- [ ] **Step 3: `playClick` en botones del lobby**

Añadir `playClick();` al inicio del callback de cada uno de estos handlers existentes:
1. `copyBtn` click handler (línea ~193): antes de `void copyRoomCode(...)`.
2. `micBtn` click handler (línea ~213): al inicio del callback.
3. `deafenBtn` click handler (línea ~219): al inicio del callback.
4. El botón `start-btn` click handler (línea ~493): al inicio del callback.

- [ ] **Step 4: `playJoin`/`playLeave`/`playReady` al renderizar players**

Declarar un set de ids visto **una sola vez en el scope de `bootRoom`**, justo antes de `function renderPlayers` (línea ~252):

```ts
  const seenPlayerIds = new Set<string>();

  function renderPlayers(list: { id: string; name: string; host: boolean }[]): void {
    if (!playersEl) return;
    const ids = new Set(list.map((p) => p.id));
    if (seenPlayerIds.size > 0) {
      for (const id of ids) if (!seenPlayerIds.has(id)) playJoin();
      for (const id of seenPlayerIds) if (!ids.has(id)) playLeave();
    }
    if (!started && list.length === REQUIRED_PLAYERS && seenPlayerIds.size < REQUIRED_PLAYERS) playReady();
    seenPlayerIds.clear();
    for (const id of ids) seenPlayerIds.add(id);
    playersEl.replaceChildren();
```

(El resto de `renderPlayers` se mantiene igual. `seenPlayerIds` se declara FUERA de la función, en el scope de `bootRoom`.)

- [ ] **Step 5: `playStart` + `stopMusic` en `applyStart`**

En `applyStart` (línea ~394), al inicio:

```ts
  function applyStart(): void {
    stopMusic();
    playStart();
    started = true;
    mountByRole(selfRole ?? "cutter");
```

- [ ] **Step 6: Verificar**

Run: `npx astro check`
Expected: 0 errors. Revisar que `seenIds` se declara una sola vez y no rompe el `prune`/`renderPlayers` existente.

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
- Menú: tras el primer gesto suena la música de fondo; los botones (sidebar, FAB, crear/unirse) emiten `playClick`.
- Sala: tras el primer gesto suena la música; al entrar/salir jugadores suenan join/leave; al completar el squad suena ready; al iniciar la partida suena start y la música se detiene; el tablero conserva playCut/playWrong.
- Sin errores de consola de audio (autoplay policy respetada por el primer gesto).

- [ ] **Step 4: Confirmar working tree**

Run: `git status --short`
Expected: `src/ui/music.ts` nuevo, `src/ui/sound.ts`, `src/menu/menu.ts`, `src/room/lobby.ts` modificados; sin commits.
