# Cable Rush — UX de sala — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** chat instantáneo con mensajes propios marcados, salidas reflejadas en toda
la UI en ≤5 s, y códigos de sala para todas las rooms (id embebido, join por código
y copiar en el lobby).

**Architecture:** cambios solo en cliente (`src/`); el agente juez no se toca.
`client.ts` gana `getRooms()` (aditivo) y un fix del filtro `pending`;
`ChatEntry.self`. El lobby centraliza "jugadores activos" vía `lastSeen`.

**Tech Stack:** Astro, @portalsdk/core v0.1.5, TypeScript estricto.

## Global Constraints

- NO commits salvo pedido explícito del usuario.
- TypeScript estricto, sin comentarios.
- `src/portal/*` es interfaz "estable": solo cambios aditivos + fix de filtro.
- Verificación por tarea: `npx astro check` 0 errores.

---

### Task 1: `src/shared/id.ts` — códigos para todas las salas

- [x] `randomRoomId()` → `` `pub-${randomRoomCode()}` ``.

### Task 2: `src/portal/types.ts` — ChatEntry con self

- [x] `ChatEntry` += `self: boolean`.

### Task 3: `src/portal/client.ts` — chat instantáneo + getRooms

- [x] `chatHistory()`: quitar `&& m.status !== "pending"`; mapear `self: m.sender.id === selfId`.
- [x] Rama chat de `room.on("message")`: incluir `self`.
- [x] `MenuClient` += `getRooms(): RoomInfo[]` (filtro TTL, sin filtrar por modo).

### Task 4: `src/menu/menu.ts` — unirse por código

- [x] Crear: `id = mode === "public" ? randomRoomId() : `prv-${randomRoomCode()}` `.
- [x] Join por código: lookup `menu.getRooms()` por `id.endsWith("-" + code)` →
      navegar a ese id; si no, `prv-${code}`.

### Task 5: `src/room/lobby.ts` — salidas + código copiar + mensajes propios

- [x] `ALIVE_TIMEOUT_MS = 8000 → 5000`.
- [x] `activePlayers()` y usarlo en `updateLobbyBanner`, `updateStartArea`,
      `maybeAnnounceJudge`, `publish` y el prune.
- [x] Prune: además `if (isHost) publish()`, `updateLobbyBanner()`, `updateStartArea()`.
- [x] Header: chip `Código: XXXX` (derivado del roomId) + botón copiar
      (`navigator.clipboard`, feedback "¡Copiado!" ~1.5 s).
- [x] `renderChat`: marcar propios (`m.self`) con estilo "Tú" / acento violeta.

### Task 6: Verificación

- [x] `npx astro check` 0 errores / 0 warnings.
- [x] `npx astro build` OK.
- [x] Smoke test dev + agente: chat instantáneo + marcado; cerrar una pestaña →
      squad/banner/menú actualizan ≤5 s; crear pública y privada → código + copiar.
