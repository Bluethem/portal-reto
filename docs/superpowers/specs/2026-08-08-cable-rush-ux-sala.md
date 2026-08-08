# Cable Rush — UX de sala: chat instantáneo, salidas y códigos

Fecha: 2026-08-08
Estado: propuesto
Relacionada: `2026-08-07-cable-rush-design.md`

## 1. Contexto

Fases 1 y 2 completas; frontend portado al tema "Defuse Protocol" (Tailwind v4,
commit `f9315d4`). Esta iteración ataca 3 fricciones de la sala: latencia del chat,
actualización de salidas de jugadores y códigos de sala para compartir.

## 2. Problema

1. **Chat lento:** el propio mensaje aparece tras el round-trip. El SDK agrega el
   mensaje propio al store de forma optimista con `status: "pending"` (ack después),
   pero `chatHistory()` en `client.ts` filtra `status !== "pending"` → el mensaje
   propio queda oculto hasta el ack.
2. **Salidas no reflejadas:** el squad se actualiza con `lastSeen`/prune, pero el
   banner, el gating de start y `rooms-index` usan `getPlayers()` crudo → cuentan al
   jugador que se fue durante la gracia del server (hasta 8 s).
3. **Códigos:** solo las privadas tienen código (`prv-XXXXXX`) y no se muestra en el
   lobby → el host no puede compartirlo sin mirar la URL.

## 3. Solución

### 3.1 Chat instantáneo + marcado de propios

- Incluir mensajes `pending` (propios y optimistas) en el render del chat.
- `ChatEntry` gana `self: boolean` (calculado con `m.sender.id === selfId`) para
  marcar visualmente los mensajes propios ("Tú", acento violeta).
- El chat sigue siendo **persistente** (historia para late joiners).

### 3.2 Salidas consistentes en toda la UI

- Nueva fuente de verdad `activePlayers()` = `getPlayers()` ∩ `lastSeen`.
  Usada en: banner, start, elección de juez, publish del host y prune.
- El prune (1 s) además re-publica `rooms-index` si es host y refresca banner/start.
- Timeout de latencia: **8 s → 5 s**.

### 3.3 Códigos para todas las salas

- `id = pub-<CÓDIGO>` / `prv-<CÓDIGO>`, código de 6 chars (`randomRoomCode()`).
- "Unirse con código": busca la sala en `rooms-index` por `id.endsWith(-CÓDIGO)`;
  si no existe, cae a `prv-<CÓDIGO>`.
- El lobby muestra chip **"Código: XXXX"** + botón copiar (clipboard, feedback
  "¡Copiado!"). Visible en ambos modos.

## 4. Fuera de alcance

- IA (fase 4), voz (fase 5), despliegue (fase 6).
- Chat efímero (se mantiene persistente).
- Validación de que la sala exista de verdad al unirse (fallback aceptable).
- Cambios en el agente juez.

## 5. Verificación

`npx astro check` 0 errores / 0 warnings; `npx astro build` OK; smoke test en dev
con el agente (chat instantáneo, salida ≤5 s, códigos + copiar).
