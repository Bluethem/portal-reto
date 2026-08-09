# Cable Rush — Despliegue y configuración (handoff)

> Documento de contexto para retomar el proyecto en una sesión nueva: qué está
> desplegado, cómo funciona cada pieza, y cómo arrancar/desplegar de cero.

## 1. Estado actual

| Pieza | Dónde | Estado |
|---|---|---|
| Cliente (Astro estático) | Vercel — `portal-reto.vercel.app` | ✅ desplegado |
| Juez (Durable Object de Cloudflare) | Workers `portal-reto` — `portal-reto.davidlc226.workers.dev` | ✅ desplegado |
| Realtime / estado | Portal (`@portalsdk/core`) | ✅ (key + origins configurados) |
| IA (Groq) — fase 4b | pendiente | ⏳ |
| Voz (LiveKit) — fase 5 | código implementado; falta deploy de secrets + env en Vercel | 🚧 |

**Pendiente de commit** (ver `git status`): fase 5 de voz (`voice.ts`, wiring en
`lobby.ts`, endpoint `/api/voice-token` en el worker, dep `livekit-client`),
docs (spec/plan fase 5, este DEPLOY.md, AGENTS.md) y `pantallas/` (mockups, sin
trackear a propósito).

## 2. Arquitectura

- **3 cortadores** ven un tablero SVG 2D de cables de colores (diagonales que se
  cruzan); **1 director** ve un manual de reglas condicionales (por colores) que no
  está en el tablero.
- El **juez** es la única fuente de verdad: genera el nivel (seed), guarda el orden
  correcto **oculto**, valida cada corte, lleva el timer (3:00, +1:00 por nivel,
  −15 s por corte mal) y aplica efectos de estado (desde nivel 4).
- Los clientes **jamás reciben el orden**.
- **Voz (fase 5):** SFU aparte (LiveKit Cloud), una sala por room. El worker
  firma el token (`/api/voice-token`); el cliente conecta con `livekit-client`
  desde `src/room/voice.ts` (mic off al entrar, permiso al activarlo).

### Canales Portal

| Canal | Rol | Escritor |
|---|---|---|
| `rooms-index` | lista pública de rooms activas (TTL ~10 s) | el host (heartbeat ~5 s) |
| `room-<id>` | estado del juego (`RoomState`/`RoomEvent`) + chat | solo el juez (estado) |
| `room-<id>-actions` | cortes, cursores (persistentes) | clientes |

## 3. Cloudflare (el juez)

### Cómo funciona

- Es un **Durable Object único** (`idFromName("global")`) que mantiene un WebSocket
  cliente a Portal y un **alarm auto-rearmado**:
  - cadencia **1 s** si hay partidas activas, **5 s** si está idle.
  - El alarm evita que el DO se evapóre (los `setInterval` solos no bastan).
- Dentro del DO vive un `Map` de jueces por room (misma lógica que el agente Node).
- El **cron `* * * * *`** (cada minuto) hace bootstrap del DO vía el handler
  `scheduled()`.
- El worker también expone **`/api/voice-token`** (fase 5): firma un JWT HS256
  con `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` (WebCrypto, sin deps) para que el
  cliente se conecte a LiveKit Cloud. Es una ruta aparte del DO: no toca la
  lógica del juez.

### Archivos

- `worker/wrangler.toml` — nombre del worker **`portal-reto`**, `main`,
  `compatibility_date`, cron, binding `JUDGE` (DO) y migración.
- `worker/src/index.js` — clase `JudgeDO` + handlers `fetch`/`scheduled` +
  ruta `/api/voice-token` (JWT HS256, CORS `*`).
- `worker/package.json` — dep `@portalsdk/core` (para que el deploy por Git instale).
- `.node-version` = `22` (raíz y worker; Node ≥ 22.12 requerido).

### Deploy

**Por Git (dashboard, lo que ya está):**
1. dashboard.cloudflare.com → Workers & Pages → Create → Workers → Git repository →
   `Bluethem/portal-reto`.
2. **Root directory**: `worker`. **Build command**: vacío (wrangler bundlea solo).
3. Cada `git push` a `main` redeploya automáticamente.

**Por CLI (alternativa):**
```bash
cd worker
npx wrangler login
npx wrangler secret put PUBLIC_PORTAL_KEY   # secret de RUNTIME (obligatorio)
npx wrangler secret put LIVEKIT_API_KEY     # voz (obligatorio para /api/voice-token)
npx wrangler secret put LIVEKIT_API_SECRET  # voz
npx wrangler deploy
```

> ⚠️ **El secret debe ser de runtime.** En el dashboard, "Build variables" NO llega
> al Worker en runtime (dio `env.PUBLIC_PORTAL_KEY` vacío → `blocked`). Usar
> `wrangler secret put` o Settings → Variables and Secrets (runtime). Vale para
> `PUBLIC_PORTAL_KEY` y las de LiveKit.
>
> Sin `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`, `/api/voice-token` responde **503**
> y el cliente degrada a "Voz no disponible" (el juego sigue por chat).

### Logs

```bash
cd worker && npx wrangler tail portal-reto
```
El nombre del worker es **`portal-reto`** (por eso `wrangler tail portal-reto`; con
otro nombre daba "This Worker does not exist"). También Logs → Real-time en el
dashboard (requiere habilitar **Observability**).

### Fallback local (sin Cloudflare)

```bash
npm run agent:room   # juez Node local (lee .env con --env-file-if-exists)
```

> ⚠️ **No correr juez Node y `wrangler dev` a la vez**: ambos observan
> `rooms-index` y bootean jueces de las mismas rooms → estado duplicado. Para
> probar voz (que necesita `/api/voice-token`), usá **solo** `wrangler dev`
> (da juez DO + token).

## 4. Portal

### Orígenes permitidos (crítico)

El mint de tokens anónimos del browser (`/v1/tokens/anonymous`) devuelve
**`403 origin_not_allowed`** si el dominio no está registrado en el entorno
(loopback siempre permitido). Al deployar en un dominio nuevo:

- **Dashboard**: app.useportal.co → entorno → allowed origins → agregar el dominio.
- **CLI**: `npx @portalsdk/cli origins add <origin> --env <envId>`.

CLI de Portal: `npx @portalsdk/cli login` (OAuth). Ojo: el `.env` tiene
`PORTALSECRET` (sin guion); el CLI espera `PORTAL_SECRET`.

### Keys

- `PUBLIC_PORTAL_KEY` (`pk_...`) — publishable, va al bundle del cliente y al juez.
- `PORTAL_SECRET`/`PORTALSECRET` (`sk_...`) — secret, solo server/CLI, nunca al
  browser.

## 5. Vercel (cliente)

- Importar repo, preset **Astro**, build `npm run build`, salida `dist`.
- **Env vars de build** (se inlinean en el bundle; sin ellas el cliente no
  conecta): `PUBLIC_PORTAL_KEY`, y para voz `PUBLIC_LIVEKIT_URL` (wss de LiveKit
  Cloud, p.ej. `wss://my-app-xxxx.livekit.cloud`) y
  `PUBLIC_VOICE_TOKEN_URL` (endpoint del worker, p.ej.
  `https://portal-reto.davidlc226.workers.dev`).
- Tras el deploy: registrar `https://portal-reto.vercel.app` en los allowed origins
  de Portal (sección anterior).

## 6. Variables de entorno (`.env`)

| Variable | Uso |
|---|---|
| `PUBLIC_PORTAL_KEY` | cliente + juez (publishable) |
| `PORTAL_SECRET` (o `PORTALSECRET`) | secret de Portal (CLI/admin) |
| `GROQ_API_KEY`, `GROQ_MODEL` | IA fase 4b (aún sin uso) |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | voz — secrets del worker (`.dev.vars` / `wrangler secret put`), **nunca** al bundle |
| `PUBLIC_LIVEKIT_URL` | voz — wss de LiveKit Cloud (cliente) |
| `PUBLIC_VOICE_TOKEN_URL` | voz — endpoint `/api/voice-token` del worker (cliente; en local `http://localhost:8787`, en prod el dominio del worker) |

## 7. Setup local

```bash
npm install
cp .env.example .env        # completar PUBLIC_PORTAL_KEY + LIVEKIT_* del cliente
# .env: PUBLIC_LIVEKIT_URL=wss://...  y  PUBLIC_VOICE_TOKEN_URL=http://localhost:8787
# worker/.dev.vars: PUBLIC_PORTAL_KEY + LIVEKIT_API_KEY + LIVEKIT_API_SECRET
cd worker && npx wrangler dev --port 8787   # juez DO + /api/voice-token (NO correr agent:room a la vez)
npm run dev                  # http://localhost:4321
```
Probar con 4 pestañas de nombres distintos.

> ⚠️ En local `PUBLIC_VOICE_TOKEN_URL` debe ser **`http://`** (no `https://`):
> `wrangler dev` sirve HTTP. Un `https://localhost:8787` da
> `ERR_CONNECTION_CLOSED` / `Failed to fetch` en el cliente.

## 8. Gotchas del SDK `@portalsdk/core@0.1.5`

- **Los mensajes efímeros entrantes se descartan** (`ingest()` los salta) → cortes y
  cursores se envían **persistentes** (HTTP publish).
- **`setMetadata` no propaga** a otros clientes → los cursores usan mensajes
  persistentes en `room-<id>-actions` (no metadata).
- **`sendActivity` tiene throttle de 3 s por kind** → solo se usa para el heartbeat
  "alive" (detección de salida).
- **Persistente = HTTP** (`POST /v1/channels/<id>/messages`), no WebSocket. Por eso
  el corte usa feedback optimista en el tablero (`pendingCuts`) y los cursores
  llevan smoothing (transición CSS) + throttle ~120 ms.

## 9. Comandos útiles

```bash
npx astro check              # typecheck del cliente (0 errores)
npx astro build
cd worker && npx wrangler dev --port 8787   # juez DO local + /api/voice-token (usa .dev.vars)
cd worker && npx wrangler tail portal-reto  # logs del juez desplegado
cd worker && npx wrangler secret put PUBLIC_PORTAL_KEY
cd worker && npx wrangler secret put LIVEKIT_API_KEY
cd worker && npx wrangler secret put LIVEKIT_API_SECRET
npx @portalsdk/cli origins list --env <envId>
```

## 10. Roadmap / siguiente

- **Fase 4b (IA Groq)**: hints del director + briefing (diferido; la IA no decide
  lógica, el generador ya expone `structured: Rule[]`).
- **Fase 5 (voz)**: ✅ implementado con LiveKit (ver secciones 3, 5, 6 y 7). Falta:
  `wrangler secret put` de LiveKit + redeploy del worker, y env de voz en Vercel.
- **Fase 6**: test 4 jugadores en producción (Vercel + worker desplegados).
