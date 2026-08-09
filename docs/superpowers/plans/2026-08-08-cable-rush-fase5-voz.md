# Cable Rush — Fase 5: Voz WebRTC — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** comunicación por voz en las rooms con LiveKit Cloud (una sala por
room). Voz en el lobby, mic off por defecto; mic/deafen controlan audio real; si
no hay credenciales, el juego sigue por chat.

**Architecture:** el worker de Cloudflare expone `/api/voice-token` (JWT HS256
con WebCrypto, sin tocar la lógica del Judge DO); el cliente conecta con
`livekit-client` desde un módulo nuevo `src/room/voice.ts`, orquestado por
`lobby.ts` con los botones ya existentes.

**Tech Stack:** Cloudflare Workers (JS), Astro + TypeScript estricto,
`livekit-client` 2.x, WebCrypto.

## Global Constraints

- Sin commits salvo pedido explícito del usuario.
- TypeScript estricto, sin comentarios.
- El secreto `LIVEKIT_API_SECRET` nunca va al bundle del cliente.
- No romper la lógica del juez en el worker (cambio aditivo).
- Verificación: `npx astro check` 0 errores.

---

### Task 1: `worker/src/index.js` — endpoint de token

- [x] Rama `/api/voice-token` en el `fetch` raíz (antes de reenviar al DO);
      CORS `*` + `OPTIONS`.
- [x] JWT HS256 con WebCrypto: `kid` = API key; claims `iss`, `sub` (identity),
      `name`, `video` (room, roomJoin, canPublish, canSubscribe,
      canPublishData), `nbf`, `exp`, `jti`.
- [x] Sin `LIVEKIT_API_KEY`/`SECRET` → 503; validaciones de `identity`
      (`anon_[A-Za-z0-9]+`), `name` ≤ 16, `room` ≤ 40; 400 en inválido.

### Task 2: `src/room/voice.ts` — módulo cliente

- [x] `VoiceChannel`: `connect(roomId, identity, name)` con fetch de token +
      `Room({adaptiveStream,dynacast})` + `room.connect(LIVEKIT_URL, token,
      {autoSubscribe:true})`, mic apagado.
- [x] `setMicEnabled(on)` → `localParticipant.setMicrophoneEnabled` (bool ok,
      revierte UI si falla el permiso).
- [x] `setDeafen(on)` → `setEnabled(!on)` en tracks de audio remotos (cubre
      joiners vía `TrackSubscribed`/`ParticipantConnected`).
- [x] `subscribeSpeakers` desde `ActiveSpeakersChanged` (ids de identidad).
- [x] `getStatus`/`subscribeStatus` (`offline|connecting|connected|error`) y
      `dispose()` (removeAllListeners + disconnect).
- [x] `VoiceChannel.isAvailable()` false sin `PUBLIC_LIVEKIT_URL`/
      `PUBLIC_VOICE_TOKEN_URL`.

### Task 3: `src/room/lobby.ts` — wiring de voz

- [x] Instanciar `VoiceChannel`; conectar al `ready` del cliente con
      `client.getSelfId()`.
- [x] `mic-toggle` → `voice.setMicEnabled(!micMuted)` (revertir si falla);
      `deafen-btn` → `voice.setDeafen(deafened)`.
- [x] Menú de micro con estado real (`#voice-status`): Voz no disponible /
      Conectando... / Conectado / Error.
- [x] Indicador de hablante en el squad (`speakingIds` → dot en la card).
- [x] `voice.dispose()` en `beforeunload` y en el overlay locked-out.

### Task 4: `src/styles/theme.css`

- [x] `.squad-speaking` + `@keyframes squad-speaking-pulse`.

### Task 5: Env y deps

- [x] `package.json` += `livekit-client`.
- [x] `.env.example` += `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`,
      `PUBLIC_LIVEKIT_URL`, `PUBLIC_VOICE_TOKEN_URL`.

### Task 6: Docs

- [x] Spec `2026-08-08-cable-rush-fase5-voz.md` + este plan.
- [x] AGENTS.md: fase 5 a "hecho"; env LIVEKIT "configuradas".

### Task 7: Verificación

- [x] `npx astro check` 0 errores; `npm run build` OK.
- [ ] Smoke 4 pestañas con `wrangler dev` + LiveKit: escuchar sin permiso,
      mic on/off, deafen, speaker activo, degradación sin credenciales.
