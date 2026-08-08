# Cable Rush — Refactor del chat: dirigido por el store (patrón slack-xp)

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** eliminar el optimistic manual y el mapa `chatById` del chat; renderizar
directamente desde el store del SDK (mensaje optimista `pending` → reemplazo atómico
por el acked `sent`), eliminando de raíz la clase de bugs de duplicados. Patrón
tomado de `slack-xp` (Next.js + `@portalsdk/react`): `live.messages.filter(...)` +
`chat-message-${status}` + restauración de draft al fallar.

**Architecture:** cambios solo en `src/`. `client.ts` entrega la lista completa de
mensajes del store (incluyendo `pending`) con `status`; `lobby.ts` renderiza por
`status` sin mapa ni reemplazo manual.

**Tech Stack:** Astro, @portalsdk/core v0.1.5, TypeScript estricto.

## Global Constraints

- NO commits salvo pedido explícito del usuario.
- TypeScript estricto, sin comentarios.
- `src/portal/*`: cambio aditivo de interfaz (`subscribeChat` lista completa,
  `ChatEntry.status`, `sendChat: Promise<void>`).
- Verificación: `npx astro check` 0 errores.

---

### Task 1: `src/portal/types.ts` — ChatEntry con status

- [x] `ChatEntry` += `status: "pending" | "sent" | "failed"`.

### Task 2: `src/portal/client.ts` — chat desde el store

- [x] `chatHistory()` incluye `pending` y mapea `status: m.status`.
- [x] `subscribeChat` entrega la lista completa: `cb(entries: ChatEntry[])` (inicial y
      cada snapshot vía `emit()`).
- [x] Se elimina la entrega incremental de chat en `room.on("message")` (cursor y
      eventos se mantienen).
- [x] `sendChat` vuelve a `Promise<void>` (el optimistic lo maneja el SDK).

### Task 3: `src/room/lobby.ts` — render por lista y status

- [x] Se elimina `chatById` y el optimistic local con reemplazo por ack.
- [x] `subscribeChat(list)` con guard de key (`ids.join("\0")`) para no reconstruir el
      DOM en snapshots irrelevantes.
- [x] `renderChat(list)` marca propios ("Tú", burbuja) y estilo por `status`
      (`pending`/`failed` atenuados).
- [x] Submit: limpia input; al fallar el envío se restaura el texto y se muestra
      "Mensaje no enviado. Inténtalo de nuevo." (transitorio, 3 s).

### Task 4: Verificación

- [x] `npx astro check` 0 errores / 0 warnings.
- [x] `npx astro build` OK.
- [ ] Smoke test 4 pestañas: dos mensajes idénticos seguidos → 1 línea cada uno,
      aparición instantánea, sin duplicados.
