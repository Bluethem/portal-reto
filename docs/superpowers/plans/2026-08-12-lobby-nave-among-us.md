# Cable Rush — Lobby-nave (estética Among Us) + animaciones animejs — Implementation Plan

**Goal:** Renovar el lobby como interior de nave (imagen `Lobby.webp` full-bleed
+ viñeta), usar la paleta oficial de crewmates, y animar con animejs (ambiental,
stagger, transición, feedback, eventos).

**Architecture:** Cambio 100% visual del cliente. Se agrega `animejs`, se crean
`src/ui/crew-colors.ts` y `src/ui/anim.ts`, se mueve `Lobby.webp` a `public/assets/`,
se editan `src/room/lobby.ts` y `src/styles/theme.css`. **Sin cambios** en
`portal/`, `agent/`, `worker/`.

## Global Constraints

- NO git commits (decisión del repo; solo cuando el usuario lo pide).
- TypeScript estricto, sin comentarios salvo que se pidan.
- `npx astro check` 0 errores por tarea.
- Spec: `docs/superpowers/specs/2026-08-12-lobby-nave-among-us.md`.

---

### Task 1: Asset + dependencia

- [x] **Step 1:** Mover `assets/Lobby.webp` → `public/assets/Lobby.webp` y borrar la carpeta root `assets/`.
- [x] **Step 2:** `npm i animejs` (v4).

### Task 2: Paleta oficial

- [x] **Step 1:** Crear `src/ui/crew-colors.ts` con los 10 colores oficiales de crewmate.

### Task 3: Helpers de animación

- [x] **Step 1:** Crear `src/ui/anim.ts` (animejs v4) con `staggerIn`, `backgroundDrift`,
  `pop`, `slidePanel`, `chatIn`, `burst`; guard `prefers-reduced-motion`.

### Task 4: Lobby (HTML + slots + wiring)

- [x] **Step 1:** Capa de escena `#lobby-scene` (imagen + viñeta) tras el contenido (`z-0`/`z-10`).
- [x] **Step 2:** Slots `player-slot` (llenos con glow/color, vacíos fantasma) + colores oficiales.
- [x] **Step 3:** Ambiental `backgroundDrift`, stagger en `renderPlayers`, transición en
  `switchToGameLayout`, `pop` en start/juez, `burst` en juez/start/gameover, `chatIn`.
- [x] **Step 4:** Terminología READY/CREWMATE/DIRECTOR.

### Task 5: CSS

- [x] **Step 1:** `#lobby-vignette` y `.player-slot` en `theme.css`.

### Task 6: Verificación

- [x] **Step 1:** `npx astro check` → 0 errores.
- [x] **Step 2:** `npx astro build` → OK.
- [x] **Step 3:** Smoke test en dev (`astro dev`): `/assets/Lobby.webp` 200, room 200, sin errores en logs.
