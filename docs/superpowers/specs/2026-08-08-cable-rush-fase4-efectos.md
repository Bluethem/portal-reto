# Cable Rush — Fase 4: Efectos de estado (trabas)

Fecha: 2026-08-08
Estado: aprobado
Modifica: `2026-08-07-cable-rush-design.md` (fase 4 pasa de IA a efectos de estado;
IA con Groq diferida)

## 1. Motivación

El manual determinístico ya es claro y legible; la IA para reescribirlo aportaba
poco. En su lugar, la fase 4 añade **trabas y efectos de estado** deterministas que
suben la dificultad y la diversión sin latencia ni fallos (el agente es la fuente de
verdad). La IA (Groq) se difiere a una fase posterior (hints/briefing).

## 2. Modelo

```ts
export interface StateEffect {
  kind: "freeze" | "blind" | "scramble" | "lockCut";
  userId?: string;   // efectos por jugador
  expiresAt: number; // timestamp de expiración
}
// RoomState += effects: StateEffect[]
```

El agente publica **solo los efectos activos** (prunea los expirados en cada
publish, que ya ocurre cada 1 s).

## 3. Efectos

| Efecto | Qué hace | Visual |
|---|---|---|
| `freeze` (por jugador) | Congela el puntero del culpable (no corta ni mueve) | Overlay "CONGELADO" + `pointer-events: none` en el svg |
| `blind` (global) | Niebla que tapa el tablero | Overlay translúcido + blur |
| `scramble` (global) | Cortocircuito: el tablero parpadea (los colores no cambian de identidad) | Animación CSS flicker |
| `lockCut` (global) | Se desactiva el corte por unos segundos | `pointer-events: none` en todos los hit |

## 4. Triggers

- **Niveles 1-3**: sin efectos de estado. Corte malo = solo -15 s.
- **Nivel ≥ 4**: corte malo → `freeze` al culpable (`m.sender.id`, ~4 s) + -15 s.
- **Nivel ≥ 5**: corte malo → 50% de chance de añadir un global (`lockCut` 1.5 s o
  `scramble` 2 s). Y **periódico**: cada ~25 s un global aleatorio (`blind` 3 s /
  `scramble` 2 s / `lockCut` 1.5 s).
- `startLevel` limpia los efectos y reinicia el contador periódico.

## 5. Cliente

- El board lee `RoomState.effects` en `subscribeState` y aplica: overlays
  (freeze/blind), clase de flicker (scramble) y deshabilitado de hits
  (freeze/lockCut). Los efectos se auto-limplan con el siguiente publish al expirar.
- `theme.css`: `.effect-layer`, `.effect-overlay`, `.effect-freeze`,
  `.effect-blind` y `@keyframes cable-flicker`.

## 6. Fuera de alcance

- IA (Groq): hints del director y briefing de misión — fase posterior.
- Cambios de timer, scoring, generación o tablero.

## 7. Verificación

- `npx astro check` 0 errores; build OK.
- Smoke 4 jugadores: niveles 1-3 sin efectos; nivel ≥ 4 corte malo congela al
  culpable; nivel ≥ 5 cortocircuito/niebla periódicos; limpieza al expirar y al
  subir de nivel.
