# Cable Rush

Co-op de 4 jugadores con información asimétrica. 3 jugadores cortan cables en
un tablero 2D compartido (SVG); 1 director humano tiene un **manual** (no ve el
tablero) y dicta el orden de corte por voz. Niveles endless con dificultad
creciente: el equipo gana tiempo al superarlos y pierde tiempo al cortar mal.
El timer global decide el final (score = nivel alcanzado).

## Estado

**Fases 1-5 implementadas** (IA Groq, fase 4b, diferida).

**Fase 1:** username → rooms → lobby → juez aleatorio por host. Canales en uso:
`rooms-index` (host-managed, heartbeat ~5s, TTL 10s) y `room-<id>` (presencia +
eventos, p.ej. `judge` y `start`). La V1 (bomba en cadena) fue eliminada junto
con su agente.

**Fase 2 (nivel 1 jugable sin IA):** el agente juez es la fuente de verdad del
orden correcto: genera el nivel (tablero + orden + manual por template), valida
cada corte, lleva el timer (3:00, +1:00 por nivel, -15 s por corte mal) y
publica `RoomState` en `room-<id>`. Tablero **2D SVG** (three.js eliminado en
la 2b) con cables **color + etiqueta** y cursores en vivo con nombre; el
director ve solo el manual. Una sola página `/room` monta la vista por rol al
recibir `start` del host. Los clientes nunca reciben el orden.

**Fase 3 (generación procedural):** todo vive en `agent/room/generator.ts`:
PRNG determinístico por seed (`hashSeed(roomSeed, level)` + `mulberry32`),
cables diagonales que se cruzan (`row`/`toRow`), 9 tipos de regla condicional
referenciadas por color y un solver que garantiza **solución única** antes de
publicar el nivel. `roomSeed` aleatorio por room al bootear el juez. El manual
se renderiza por colores; el `label` queda interno. Además: corte optimista
(`pendingCuts`) y cursores fluidos por `room-<id>-actions`.

**Fase 4 (efectos de estado):** trabas deterministas desde el nivel 4 en
`RoomState.effects` (solo activos, pruneados en cada publish de 1 s): `freeze`
al culpable al cortar mal, y globales `blind`/`lockCut` (periódicos desde el
nivel 5, cada ~25 s). La IA (Groq) se difirió a la fase 4b (hints y
briefing del director): el template español ya es legible.

**Juez — dos implementaciones de la misma lógica:**
- `agent/room/agent.ts` — proceso Node local (TS), un `Judge` por room con
  `setInterval`.
- `worker/src/index.js` — **Durable Object de Cloudflare (experimental)**,
  alarm + cron, comparte `generator.ts`. Riesgo de drift: mantener sincronizada.

**Fase 5 (voz WebRTC con LiveKit):** una sala LiveKit por room, conectada al
entrar al lobby con el mic apagado (escuchar no pide permiso). El worker de
Cloudflare expone `/api/voice-token` (JWT HS256 con WebCrypto); el cliente usa
`livekit-client` desde `src/room/voice.ts`. `mic`/`deafen` controlan audio real
y el squad muestra al hablante activo. Sin credenciales → "Voz no disponible" y
el juego sigue por chat.

Pendiente: fases 4b (IA Groq) y 6 (despliegue + test 4 jugadores). Cada fase es
demo-able por sí sola.

Espec y planes (superpowers):
- `docs/superpowers/specs/*.md` — diseño v2 + fases 2b (board 2D), 3
  (procedural), 4 (efectos) y 5 (voz)
- `docs/superpowers/plans/*.md` — planes por fase con checkboxes de progreso

Próximo paso cuando se retome la implementación: fase 4b (hints/briefing del
director con Groq) o fase 6 (despliegue + test 4 jugadores).

## Development

Servidor de desarrollo en background:

    astro dev --background

Gestión: `astro dev status`, `astro dev logs`, `astro dev stop`.

Agente juez (proceso Node aparte):

    npm run agent:room      # node --env-file-if-exists=.env agent/room/agent.ts

Juez en Cloudflare (experimental): `cd worker && npm run dev` (wrangler).

Typecheck:

    npx astro check

## Env (`.env`, git-ignored)

- `PUBLIC_PORTAL_KEY` — cliente (`import.meta.env.PUBLIC_*` en el bundle Astro)
- `PORTAL_SECRET` — sin uso por ahora (el SDK solo usa la publishable key)
- `GROQ_API_KEY`, `GROQ_MODEL` — agente (hints/briefing del director; fase 4b,
  aun sin uso)
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — voz (secrets del worker / `.dev.vars`)
- `PUBLIC_LIVEKIT_URL`, `PUBLIC_VOICE_TOKEN_URL` — voz (cliente; wss de LiveKit
  Cloud y endpoint `/api/voice-token` del worker)

> **Nota de arquitectura:** el juez puede correr como proceso Node de larga
> duración (p. ej. Render) o como Durable Object de Cloudflare (`worker/`),
> ambos viables hoy. Cuando llegue la IA (Groq, fase 4b) irá en el proceso
> siempre-activo (Render), nunca en serverless efímero. La clave
> `GROQ_API_KEY` nunca va al bundle del cliente. Vercel solo aloja el cliente
> estático.

## Stack

- Astro (solo sirve el bundle; el tiempo real no pasa por Astro)
- @portalsdk/core — presencia, canales y estado compartido (WebSocket directo al cliente); NO trae voz
- SVG + DOM — tablero 2D de cables (three.js eliminado)
- Agente Node o Cloudflare Workers DO — juez multi-room + generación de niveles
- LiveKit (WebRTC) — comunicación por voz (fase 5)

## Concepto del juego

- Menú con lista de rooms; crear (host) o unirse; 4 jugadores por room.
- Roles: 3 **cortadores** (tablero compartido, cualquiera puede cortar) + 1
  **director** (manual, no ve el tablero).
- Comunicación: el director y los cortadores hablan por voz; los cortadores
  describen los cables, el director aplica el manual y dicta.
- Niveles: cortar TODOS los cables del tablero en el orden correcto = superar.
- Endless: cada nivel genera un tablero + manual nuevo, más difícil.

## Timer y scoring

- Arranca en **3:00**. Pasar nivel: **+1:00**. Cortar mal: **-15 s**.
- El bonus se SUMA al timer global en curso (nunca se reinicia).
- Timer a 0 → fin de partida → pantalla de score (nivel alcanzado).

## Arquitectura / canales Portal (v2)

- Canal `rooms-index` — lista pública de rooms activas (id, nombre, jugadores,
  host). La mantiene el host (heartbeat ~5s); el juez la lee para vigilar rooms.
- Canal `room-<id>` — estado del juego (nivel, tablero, timer, progreso,
  efectos) + eventos (`judge`, `start`) + chat. SOLO el agente juez escribe el
  estado; los clientes leen y envían eventos/chat.
- Canal `room-<id>-actions` — cortes (`cut`) y cursores (`cursor`) publicados
  por los clientes; el agente consume los cortes y actualiza `room-<id>`.
- Presence metadata por canal de room — `{ name, host, role }`, con `role:
  "judge" | "cutter"`. Nota de naming: el **director humano** tiene
  `role: "judge"` en el cliente; el proceso servidor autoritativo es el "agente
  juez". El director lo elige el host al azar al llegar 4 jugadores; el host
  inicia la partida con "Iniciar partida" (`{ type: "start" }`).
- El agente publica presencia con `{ kind: "agent" }` (el cliente lo filtra).

## Estructura de carpetas

    src/
    ├── menu/          # lista de rooms, crear/unirse (Portal)
    ├── room/          # lobby + roles + HUD del juego
    ├── board/         # tablero 2D de cables (SVG)
    ├── director/      # vista del manual para el director
    ├── portal/        # reuso: client, types, presencia
    ├── shared/        # reuso: identity, username, id
    ├── pages/         # index.astro (menú) y room.astro (sala)
    └── styles/        # theme.css (tema Defuse Protocol, Tailwind v4)
    agent/room/        # agente juez (Node) + generador de niveles
    worker/            # juez como Durable Object de Cloudflare (experimental)
    agent/ia/          # hints/briefing con Groq (fase 4b, diferida)

## Fases de construcción (cada una demo-able)

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Menú + rooms + lobby (Portal, presencia, arranque a 4) | hecho |
| 2 | Nivel 1 sin IA: tablero 2D, corte, orden, timer + bonus, manual por template | hecho |
| 2b | Tablero 2D SVG (reemplaza three.js), corte animado | hecho |
| 3 | Generación procedural: seed por nivel, reglas crecientes, solución única | hecho |
| 4 | Efectos de estado: trabas deterministas (freeze, blind, lockCut) | hecho |
| 4b | IA (Groq): hints/briefing del director (diferida) | pendiente |
| 5 | Voz WebRTC (LiveKit) | hecho |
| 6 | Despliegue Vercel + juez (Render o CF Workers) + test 4 jugadores | pendiente |

**Decisión de IA (fase 4b):** la IA redacta el manual en lenguaje natural a
partir del JSON de reglas determinístico (`GeneratedLevel.structured`). **No
decide la lógica** — el generador garantiza solución única; si Groq falla o
tarda, fallback al template determinístico.

## Reglas de convivencia

- El estado del canal `room-<id>` lo muta solo el agente juez.
- Interfaz estable en `portal/`; cualquier cambio se coordina antes.
- No tocar una vista/carpeta de otra persona sin decirlo antes.
- Sin commits automáticos: se versiona solo cuando el usuario lo solicita.

## Conventions

- TypeScript estricto, sin comentarios salvo que se pidan.
- Cada fase termina con `npx astro check` 0 errores + prueba en dev server.
- **Sin commits automáticos** en este repo sin pedirlos: se versiona solo cuando
  el usuario lo solicita explícitamente.
