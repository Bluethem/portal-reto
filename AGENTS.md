# Cable Rush

Co-op de 4 jugadores con información asimétrica. 3 jugadores cortan cables en
un tablero 3D compartido (three.js); 1 director humano tiene un **manual** (no
ve el tablero) y dicta el orden de corte por voz. Niveles endless con
dificultad creciente: el equipo gana tiempo al superarlos y pierde tiempo al
cortar mal. El timer global decide el final (score = nivel alcanzado).

## Estado

**Rediseño aprobado, sin implementación todavía.** La V1 (bomba en cadena) fue
descartada por el equipo y sus docs/plan se limpiaron. El setup base se
reutiliza: Astro + Portal + three.js + agente Node. El juego se construye por
**fases** (vertical slice), cada una demo-able por sí sola; la IA (Groq) y la
voz (LiveKit/Daily) van al final para no bloquear el núcleo jugable.

Espec de la iteración actual:
- `docs/superpowers/specs/2026-08-07-cable-rush-design.md`

Próximo paso cuando se retome la implementación: plan de la fase 1
(menú + rooms + lobby) con la skill writing-plans.

## Development

Servidor de desarrollo en background:

    astro dev --background

Gestión: `astro dev status`, `astro dev logs`, `astro dev stop`.

Agente juez (proceso Node aparte):

    npm run agent:room      # node --env-file=.env agent/room/agent.ts

Typecheck:

    npx astro check

## Env (`.env`, git-ignored)

- `PUBLIC_PORTAL_KEY` — cliente (`import.meta.env.PUBLIC_*` en el bundle Astro)
- `PORTAL_SECRET` — sin uso por ahora (el SDK solo usa la publishable key)
- `GROQ_API_KEY`, `GROQ_MODEL` — agente (redacción del manual; fase 4)
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — voz (fase 5; aun sin uso)

> **Nota de arquitectura (obligatoria):** el agente aloja la IA (Groq) y el
> juez multi-room, ambos procesos de larga duración → se despliega
> **necesariamente en Render** (servicio siempre-activo), no en Vercel ni
> Netlify (serverless, procesos efímeros). La clave `GROQ_API_KEY` nunca va al
> bundle del cliente. Vercel solo aloja el cliente estático.

## Stack

- Astro (solo sirve el bundle; el tiempo real no pasa por Astro)
- @portalsdk/core — presencia, canales y estado compartido (WebSocket directo al cliente); NO trae voz
- three.js — tablero 3D de cables
- Agente Node + Groq — juez multi-room, generación de niveles y redacción del manual
- LiveKit/Daily (WebRTC) — comunicación por voz (fase 5)

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
  host). La mantiene el agente o cada host.
- Canal `room-<id>` — estado del juego por room (nivel, tablero, timer,
  progreso). SOLO el agente juez lo escribe; los clientes solo leen.
- Canal `room-<id>-actions` — cortes e intentos publicados por los clientes; el
  agente los consume y actualiza `room-<id>`.
- Presence metadata por canal de room — `{ role: "director" | "cutter", host: bool }`.

## Estructura de carpetas (objetivo v2)

    src/
    ├── menu/          # lista de rooms, crear/unirse (Portal)
    ├── room/          # lobby + roles + HUD del juego
    ├── board/         # tablero 3D de cables (three.js, reusa base)
    ├── director/      # vista del manual para el director
    ├── portal/        # reuso: client, types, presencia
    ├── shared/        # reuso: flash, timer, colors, attachPick
    └── index.ts       # boot por vista (menu | room)
    agent/room/        # agente juez multi-room + generador de niveles
    agent/ia/          # redacción del manual con Groq (fase 4)

## Fases de construcción (cada una demo-able)

| Fase | Contenido |
|------|-----------|
| 1 | Menú + rooms + lobby (Portal, presencia, arranque a 4) |
| 2 | Nivel 1 sin IA: tablero, corte, orden, timer + bonus, manual por template |
| 3 | Generación procedural: seed por nivel, reglas crecientes, solución única |
| 4 | IA (Groq): manual redactado desde el JSON (+ copiloto opcional) |
| 5 | Voz WebRTC (LiveKit/Daily) |
| 6 | Despliegue Vercel + Render + test 4 jugadores |

**Decisión de IA (fase 4):** la IA redacta el manual en lenguaje natural a
partir del JSON de reglas determinístico. **No decide la lógica** — el
generador garantiza solución única; si Groq falla o tarda, fallback al template
determinístico.

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
