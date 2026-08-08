# Bomba en Cadena

Co-op de 4 jugadores con información asimétrica. Una bomba 3D (three.js) tiene 4
módulos desactivables en cadena; cada módulo solo puede ser desactivado por el
jugador asignado por rol. Todos avanzan en paralelo; el equipo gana si desactiva
los 4 módulos antes de que explote el timer. El agente IA genera puzzles, pistas
y puntúa cada ronda.

## Estado

Setup funcional (Astro + Portal conectado). Cliente Portal en
`src/bomb/portal/` (`connectBomb()` expone `getRole()`, `subscribeBomb()`,
`subscribePresence()`, `sendAttempt()`); agente en `agent/bomb/agent.ts` es el
único escritor del canal `bomb`. Roles asignados por el cliente por orden de
conexión (presence metadata `{ role, host }`); el agente arma la bomba con 4
jugadores. Fundación lista (escena 3D, shared, manual, validador del agente);
los 4 módulos (`modules/`) están scaffold con su `types.ts` y quedan por
implementar (ver "Plan de trabajo"). Cliente público `PUBLIC_PORTAL_KEY`; el
agente solo usa la pública.

## Development

Servidor de desarrollo en background:

    astro dev --background

Gestión: `astro dev status`, `astro dev logs`, `astro dev stop`.

Agente IA de la bomba (proceso Node aparte):

    npm run agent:bomb     # node --env-file=.env agent/bomb/agent.ts

Typecheck:

    npx astro check

## Env (`.env`, git-ignored)

- `PUBLIC_PORTAL_KEY` — cliente (`import.meta.env.PUBLIC_*` en el bundle Astro)
- `PORTAL_SECRET` — sin uso por ahora (el SDK solo usa la publishable key)
- `GROQ_API_KEY`, `GROQ_MODEL` — agente (puzzles, hints, feedback; aun sin usar)

## Stack

- Astro (solo sirve el bundle; el tiempo real no pasa por Astro)
- @portalsdk/core — presencia, canales y estado compartido (WebSocket directo al cliente)
- three.js — bomba 3D y módulos
- Agente Node + Groq — generación de puzzles, pistas y feedback

## Concepto del juego

- Roles por orden de conexión cuando el host arma la bomba (presence metadata).
- Módulos en cadena: M1 -> M2 -> M3 -> M4. Se desbloquean en orden.
- Cada jugador solo ve su módulo + el timer compartido.
- Resultado: ganar (4/4 módulos) o explotar (burst + reset).

## Arquitectura / canales Portal

- Canal `bomb` — estado global (módulos, progreso, timer, status). SOLO el agente
  lo escribe; los clientes solo leen.
- Canal `bomb-attempts` — el cliente publica aquí `{ module, attempt }`; el
  agente lo consume, valida y actualiza `bomb`.
- Presence metadata — `{ role: 1..4, host: bool }`.
- Roles por orden de conexión, asignados por cada cliente (orden del snapshot de
  presencia); el agente arma la bomba al llegar a 4 jugadores.

## Estructura de carpetas

    src/bomb/
    ├── shared/          # utilidades comunes (timer, formateo, colores)
    ├── portal/          # sync: tipos, suscripciones, rol asignado
    ├── scene/           # bomba 3D base (mesh, luces, cámara) + SceneHandle
    ├── modules/
    │   ├── wires/       # M1 — cortar cables en orden (clic 3D)
    │   ├── symbols/     # M2 — repetir secuencia que flashea (Simón)
    │   ├── keypad/      # M3 — tipear código sobre teclado 3D
    │   └── valve/       # M4 — timing: sostener botón en zona segura
    ├── manual/          # overlay por rol (qué ve cada jugador)
    └── index.ts         # boot: connectBomb + initScene + módulo del rol
    agent/bomb/          # agente: juez + validador por módulo

## Plan de trabajo — 4 módulos en paralelo

**Mapa de ownership (asignar nombres):**

| Módulo | Carpeta | Dueño |
|--------|---------|-------|
| M0 Fundación | `scene/`, `shared/`, `manual/`, `validate.ts` | *(ya scaffold, ver abajo)* |
| M1 wires | `modules/wires/` | ______ |
| M2 symbols | `modules/symbols/` | ______ |
| M3 keypad | `modules/keypad/` | ______ |
| M4 valve | `modules/valve/` | ______ |

**1 dueño = 1 módulo.** Nadie edita archivos en `modules/<otro>/` sin decirlo
antes. `index.ts` es el único archivo que importa desde los 4 módulos; los demás
cambios en él se coordinan.

**Contrato de integración (fijo para los 4):**
- Imports solo desde `shared/`, `portal/` y el tipo `SceneHandle` de `scene/setup.ts`;
  NUNCA desde otro módulo.
- El módulo genera su propio puzzle y su respuesta localmente.
- Monta su 3D con `scene.mount(moduleId, group)` (API aditiva de `SceneHandle`);
  no toca el interior de `scene/`.
- Envía la respuesta con `sendAttempt(module, payload)`; el payload es lo que
  define su `types.ts`.
- Lee `unlocked`/`defused`/`strikes` de `subscribeBomb`.
- Nunca escribe en el canal `bomb` (solo el agente).
- Cada módulo exporta un `BombModule { id, title, instructions, create() }`.

**M0 — Fundación (transversal, ya scaffold para desbloquear):**
- `scene/setup.ts` — `initScene(canvas)` → renderer, cámara, luces, mesh base de
  la bomba, render loop y `SceneHandle { mount, unmount }`. Ya construido.
- `shared/timer.ts`, `shared/colors.ts` — utilidades comunes. Ya construido.
- `manual/manual.ts` — overlay por rol que muestra `title`/`instructions` del
  módulo montado. Ya construido.
- `agent/bomb/validate.ts` — hook `validate(module, attempt)` con registro por
  módulo en `agent/bomb/validators/<mod>.ts` (default: acepta cualquier intento).
  Cada dueño agrega ahí su validador real.

**M1 — wires** (`modules/wires/`, dueño ______). Pendiente:
- N cables 3D sobre la bomba (clic con raycast sobre cada cable).
- Orden de corte correcto (puzzle generado localmente).
- Animación de corte/desconexión del cable.
- Feedback de strike y estado listo vía `subscribeBomb`.
- Done: se completa en el dev server y `npx astro check` pasa.

**M2 — symbols** (`modules/symbols/`, dueño ______). Pendiente:
- Secuencia que flashea (Simón): reproducción animada de símbolos 3D.
- Input para repetir la secuencia (clic con raycast o teclado).
- Comparación local y envío de `sendAttempt(2, payload)`.
- Feedback de strike/avance.
- Done: se completa en el dev server y `npx astro check` pasa.

**M3 — keypad** (`modules/keypad/`, dueño ______). Pendiente:
- Teclado 3D (dígitos/símbolos) con clic.
- Código objetivo (puzzle local) y línea de tipeo con feedback.
- Borrar y confirmar; envío de `sendAttempt(3, payload)`.
- Done: se completa en el dev server y `npx astro check` pasa.

**M4 — valve** (`modules/valve/`, dueño ______). Pendiente:
- Botón 3D para sostener y una zona segura que se mueve.
- Medir tiempo sostenido y detectar release en la ventana correcta.
- Envío de `sendAttempt(4, payload)`.
- Done: se completa en el dev server y `npx astro check` pasa.

## Reglas de convivencia

- Cada módulo tiene su `types.ts`, su render y su interacción local.
- El estado del canal `bomb` lo muta solo el agente.
- Interfaz estable en `portal/`: `getRole()`, `subscribeBomb()`, `sendAttempt()`.
- El agente valida con `validate(module, attempt)`; default acepta-any hasta que
  cada módulo registre su validador.
- No tocar el módulo de otro jugador sin decirlo antes.

## Conventions

- TypeScript estricto, sin comentarios salvo que se pidan.
- Revisar el mapa de roles antes de publicar un cambio de `portal/` o `scene/`.
