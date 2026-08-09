# Cable Rush — Cierre de salas vacías y reconexión — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** el juez libera salas vacías (no queda vivo para siempre) y un jugador
desconectado puede recargar y volver a su partida con el mismo rol.

**Architecture:** `RoomState.members` derivado de la presencia (rol desde
`directorId`) en el juez (Node + worker DO); el cliente usa `members` en
`subscribeState` para decidir rejoin vs locked-out.

**Tech Stack:** Node agent (TS), Cloudflare DO (JS), Astro/TS cliente.

## Global Constraints

- Sin commits salvo pedido explícito del usuario.
- TypeScript estricto, sin comentarios.
- Mantener sincronizados `agent/room/agent.ts` y `worker/src/index.js`.
- Verificación: `npx astro check` 0 errores.

---

### Task 1: `src/portal/types.ts`

- [x] `RoomState.members?: { id: string; role: Role }[]`.

### Task 2: Juez Node (`agent/room/agent.ts`)

- [x] `roomMembers(j)` — humanos desde presencia, dedupe por `userId`, rol desde
      `directorId`.
- [x] `members` en `publish()` y en el estado `finished`.
- [x] `emptyTicks` en el Judge; si 0 miembros por 3 ticks → `cleanupJudge`
      (stopTimer + release + delete).
- [x] `watchRooms`: limpia jueces no iniciados cuya sala ya no está en
      `rooms-index`.

### Task 3: Juez worker (`worker/src/index.js`)

- [x] Mismas funciones `roomMembers`, `cleanupJudge` y `members` en publish.
- [x] `emptyTicks` + limpieza en `tickGames` y en `watchRooms`.

### Task 4: Cliente (`src/room/lobby.ts`)

- [x] Extraer `switchToGameLayout()` (heading/start ocultos + reorden
      Board|Chat|Squad) reutilizado por `applyStart` y el rejoin.
- [x] `subscribeState`: miembro + playing → rejoin con su rol; miembro +
      finished → gameover; no miembro → locked-out; selfId vacío → espera.

### Task 5: Verificación

- [x] `npx astro check` 0 errores; build OK.
- [ ] Smoke 2 jugadores: recarga con el mismo rol y el juego continúa; todos
      salen → el juez libera la sala.
