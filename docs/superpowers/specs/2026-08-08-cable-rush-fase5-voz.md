# Cable Rush — Fase 5: Voz WebRTC (LiveKit)

Fecha: 2026-08-08
Estado: aprobado
Modifica: `2026-08-07-cable-rush-design.md` (sección 11)

## 1. Objetivo

Añadir comunicación por voz a las rooms con **LiveKit Cloud** (SFU aparte de
Portal): una sala LiveKit por room. El director y los 3 cortadores hablan entre
sí; si la voz falla o no hay credenciales, el juego sigue jugable por chat
(fallback del design doc).

## 2. Arquitectura

- **SFU:** LiveKit Cloud. Nombre de sala = `roomId` de Portal; `identity` =
  userId de Portal (`anon_...`); display name = username.
- **Tokens:** JWT HS256 firmados server-side con `LIVEKIT_API_SECRET`
  (`kid = LIVEKIT_API_KEY`). El secreto nunca va al bundle del cliente.
- **Endpoint:** ruta `/api/voice-token` en el worker de Cloudflare (reusa el
  deploy; la lógica del Judge DO no cambia).
- **Cliente:** `livekit-client` (2.x) en un módulo nuevo `src/room/voice.ts`.

## 3. Token endpoint (worker)

- `GET /api/voice-token?room&identity&name` → `{ token }`. CORS `*` + `OPTIONS`.
- Claims: `{ iss, sub, name, video: { room, roomJoin, canPublish,
  canSubscribe, canPublishData }, nbf, exp, jti }` (HS256, firmado con
  WebCrypto, sin deps nuevas).
- Sin `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` → **503** (el cliente degrada a
  chat). Validaciones: `identity` con patrón `anon_[A-Za-z0-9]+`, `name` ≤ 16,
  `room` ≤ 40.

## 4. Cliente (`src/room/voice.ts`)

- Conexión al entrar a la room (**lobby**), con el micrófono **apagado**
  (escuchar no pide permiso de micrófono).
- `setMicEnabled(on)` → `localParticipant.setMicrophoneEnabled(on)` (permiso al
  prender; si falla, se revierte el estado de la UI).
- `setDeafen(on)` → `RemoteTrackPublication.setEnabled(!on)` sobre los tracks
  de audio remotos; cubre participantes que entran después vía
  `TrackSubscribed`/`ParticipantConnected`.
- `ActiveSpeakersChanged` → notifica los ids de hablantes.
- Status: `offline | connecting | connected | error`; `dispose()` al salir de la
  room.

## 5. UI (`src/room/lobby.ts`)

- Los botones de micro/ensordecer (ya existentes) controlan voz real.
- El menú de micro muestra el estado: "Voz no disponible" / "Conectando..." /
  "Conectado" / "Error de conexión".
- Indicador de hablante en la card del squad (dot verde pulsante,
  `.squad-speaking`).

## 6. Configuración / env

- Worker secrets: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (`wrangler secret
  put`); en dev, `.dev.vars` (git-ignored).
- Cliente: `PUBLIC_LIVEKIT_URL` (wss:// de LiveKit Cloud, seguro) y
  `PUBLIC_VOICE_TOKEN_URL` (endpoint del worker, dev `http://localhost:8787`).

## 7. Degradación

Sin credenciales en el worker o sin env en el cliente → la voz queda "no
disponible" y el juego continúa por chat/texto. Ningún error de voz rompe la
partida.

## 8. Fuera de alcance

- Video, screenshare, grabación, transcripción.
- Voz del lado del agente juez (nada server-side en la lógica de la partida).
- Efectos de audio (filtros, supresión de ruido).

## 9. Verificación

- `npx astro check` 0 errores; build OK.
- Smoke 4 jugadores con `wrangler dev` + LiveKit: escuchar sin pedir permiso,
  mic on/off (permiso), deafen, speaker activo, degradación sin credenciales.
