# Cable Rush — Cierre de salas vacías y reconexión

Fecha: 2026-08-09
Estado: aprobado
Modifica: `2026-08-07-cable-rush-design.md` (ciclo de vida de la sala)

## 1. Objetivo

- **Cierre automático:** si una sala (especialmente en curso) se queda sin
  jugadores, el juez la libera (deja de publicar estado y libera canales) en vez
  de quedar vivo para siempre.
- **Reconexión:** un jugador que se desconecta y recarga la página vuelve a su
  partida con **el mismo rol** (director → manual, cortador → tablero) en lugar
  de quedar atrapado en el overlay "Partida en curso".

## 2. Modelo

```ts
// src/portal/types.ts
RoomState.members?: { id: string; role: Role }[];
```

- El juez deriva `members` desde la **presencia** del canal de room
  (`room.getSnapshot().presence`), excluyendo al agente (`metadata.kind ===
  "agent"`) y deduplicando por `userId`.
- El **rol** NO sale de la metadata de presencia (que en una recarga vuelve a
  `null`): se deriva de `directorId` (el juez conoce al director por el evento
  `judge`). Así el rol sobrevive a la reconexión.

## 3. Cierre automático

- En cada tick (agente Node: `setInterval` de `startTimer`; worker: `tickGames`),
  si `members.length === 0` durante **3 ticks** (~3 s, tolera la gracia de
  presencia) → `cleanupJudge`: `stopTimer` + `room.release()` +
  `actions.release()` + `judges.delete(roomId)`.
- `watchRooms` también limpia jueces **nunca iniciados** cuya sala ya no está en
  `rooms-index` (host se fue sin iniciar).
- La sala desaparece del menú por el TTL de `rooms-index` (lo mantiene el host).

## 4. Reconexión

- El juez publica `members` en cada `RoomState` (y en el estado `finished`).
- Cliente (`lobby.ts` `subscribeState`), con sala `playing`/`finished` y
  `selfId` conocido:
  - **Miembro + playing** → rejoin: `started`, `selfRole = member.role`,
    `judgeId` si es director, `setMeta`, `mountByRole`, `switchToGameLayout()` y
    continúa al HUD (el tablero/manual renderizan el estado actual).
  - **Miembro + finished** → muestra el gameover (no locked-out).
  - **No miembro** → locked-out (como antes).
  - **`selfId` aún vacío** (estado antes del ready) → no decide; el juez
    republica cada 1 s y se re-evalúa solo.

## 5. Fuera de alcance

- Persistencia de la partida entre recargas (el estado de nivel/progreso sigue en
  el juez, pero no hay "volver a jugar el mismo nivel").
- Reglas disyuntivas, briefing por IA, etc.

## 6. Verificación

- `npx astro check` 0 errores; build OK.
- Smoke 2 jugadores: inician → el director recarga → vuelve como director y el
  juego continúa; un cortador recarga → vuelve al tablero; si todos salen → el
  juez libera la sala (~3 s, log "sala vacía").
