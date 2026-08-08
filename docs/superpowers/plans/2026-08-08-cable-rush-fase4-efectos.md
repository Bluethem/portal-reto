# Cable Rush — Fase 4: Efectos de estado — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** añadir trabas/efectos de estado deterministas que suban la dificultad a
partir del nivel 4 (congelar puntero, niebla, cortocircuito, bloqueo de corte),
disparados por cortes malos y periódicamente en niveles altos.

**Architecture:** el agente publica `RoomState.effects` (solo activos, pruneados en
cada publish de 1 s). El board lee los efectos y aplica overlays/deshabilitado/
flicker. Sin IA (Groq diferido).

**Tech Stack:** Node agent, TypeScript estricto, SVG/DOM + CSS.

## Global Constraints

- Sin commits salvo pedido explícito del usuario.
- TypeScript estricto, sin comentarios.
- El orden/solución única no cambian: los efectos solo afectan la interacción/visual.
- Verificación: `npx astro check` 0 errores.

---

### Task 1: `src/portal/types.ts` — modelo de efectos

- [x] `StateEffect { kind, userId?, expiresAt }` y `RoomState.effects: StateEffect[]`.

### Task 2: `agent/room/agent.ts` — disparo y publicación

- [x] `Judge` += `effects: StateEffect[]` y `nextEffectAt`.
- [x] `publish` incluye `activeEffects(j)` (prune de expirados).
- [x] `startLevel` limpia efectos y reinicia el periódico.
- [x] Corte malo: nivel ≥ 4 → `freeze` al culpable (~4 s); nivel ≥ 5 → 50% de
      chance de añadir un global.
- [x] Tick del timer: nivel ≥ 5 → efecto global periódico cada ~25 s.

### Task 3: `src/board/board.ts` — aplicar efectos

- [x] Overlays de freeze/blind, clase `effect-scramble` en el svg.
- [x] `applyEffects` deshabilita hits/pointer-events en freeze/lockCut y se llama en
      `subscribeState` (tras renderizar cables).

### Task 4: `src/styles/theme.css`

- [x] `.effect-layer`, `.effect-overlay`, `.effect-freeze`, `.effect-blind` y
      `@keyframes cable-flicker`.

### Task 5: Verificación

- [x] `npx astro check` 0 errores; build OK.
- [ ] Smoke 4 jugadores: niveles 1-3 sin efectos; ≥ 4 freeze al cortar mal;
      ≥ 5 cortocircuito/niebla periódicos; limpieza al expirar y subir de nivel.
