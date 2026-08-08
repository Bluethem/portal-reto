# Cable Rush — Fase 3: Generación procedural — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** manual por reglas condicionales deducibles (no el orden revelado),
generación determinística por seed con solución única garantizada por solver,
y dificultad creciente.

**Architecture:** todo vive en `agent/room/generator.ts` (+ `agent.ts` para el
`roomSeed`/log). El cliente solo cambia el render del manual en `director.ts`.
`order` sigue siendo interno del agente; `LevelRules` no cambia de forma.

**Tech Stack:** Node agent, TypeScript estricto, sin librerías nuevas.

## Global Constraints

- Sin commits salvo pedido explícito del usuario.
- TypeScript estricto, sin comentarios.
- El cliente sigue sin recibir el orden ni las reglas estructuradas (solo el
  texto del manual).
- Verificación: `npx astro check` 0 errores.

---

### Task 1: PRNG con seed (`generator.ts`)

- [x] `mulberry32(seed)` + `hashSeed(roomSeed, level)` → reemplazan `Math.random`
      en `shuffle` y toda selección.
- [x] `generateLevel(level, roomSeed)` deriva el seed y lo devuelve.

### Task 2: Modelo de reglas + solver (`generator.ts`)

- [x] Tipo `Rule` (9 variantes: first, last, at, before, adjacent, notFirst,
      colorFirst, colorBefore, rowEnd) + `ruleHolds(rule, order)`.
- [x] `countSolutions(cables, rules)` — permutaciones que cumplen todas las reglas
      (≤720), con corte temprano al superar 1.

### Task 3: Generación con unicidad (`generator.ts`)

- [x] Orden conocido → `pickTrueRule` añade reglas verdaderas (pool filtrado por
      nivel) hasta `countSolutions === 1` y un mínimo de reglas; regenera con el
      siguiente seed si se agota el tope (intentos acotados).
- [x] Colores únicos por nivel; reglas de color siempre sobre color único.
- [x] Fallback al template fase 2 si no se logra unicidad.

### Task 4: Render del manual en español (`generator.ts`)

- [x] `summary`: "Nivel X: hay N cables. Aplica TODAS las reglas para deducir el
      orden de corte."
- [x] `steps`: frases por regla (tabla de la spec), sin revelar el orden completo.
- [x] `GeneratedLevel` expone `seed`, `structured: Rule[]` (para fase 4) y
      `solutions`.

### Task 5: Agente (`agent/room/agent.ts`)

- [x] `roomSeed` aleatorio por room al bootear el juez.
- [x] `startLevel` pasa `roomSeed` y loguea `seed` + soluciones + nº de reglas.

### Task 6: Director (`src/director/director.ts`)

- [x] `<ol>` → `<ul>` (reglas = restricciones, no secuencia).

### Task 7: Verificación

- [x] Script headless: niveles 1..30 × varios seeds → `countSolutions === 1` +
      `ruleHolds` true para el orden conocido.
- [x] `npx astro check` 0 errores; `npx astro build` OK.
- [x] Smoke 4 jugadores (manual condicional, deducción, corte correcto).

### Task 8: Cables diagonales + corte optimista

- [x] `src/portal/types.ts`: `Cable` += `toRow`.
- [x] `generator.ts`: permutación derecha (`rowPermutation`), `targetCrossings`
      suave y `toRow` por cable (sin terminales compartidos).
- [x] `board.ts`: dibujo diagonal + badge en el punto medio; `pendingCuts` con
      corte optimista al hacer clic (el agente reconcilia); throttle de cursores
      ~300 ms + umbral de movimiento; `sendCut` con `.catch()`.
- [x] `npx astro check` 0 errores; build OK.
- [x] Validación extendida: `row`/`toRow` permutaciones, cruces ≥ target,
      solver === 1.

### Task 9: Cursores fluidos + manual por colores

- [x] `client.ts`: cursores al canal `room-<id>-actions` (envío y recepción);
      el canal de la room queda limpio.
- [x] `board.ts`: `renderCursors` in-place (sin recrear elementos), throttle
      120 ms, umbral 0.004; se eliminan el badge/letra central (solo colores).
- [x] `theme.css`: transición `left/top 120ms linear` en cursor-dot/name.
- [x] `generator.ts`: manual renderizado por color del cable (`colorOf(label)`),
      incluyendo el fallback; `label` interno intacto.
- [x] `npx astro check` 0 errores; build OK.
- [x] Validación: frases del manual sin letras A-F; solver === 1; cruces ≥ target.
