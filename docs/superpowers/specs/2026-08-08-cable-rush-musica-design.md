# Cable Rush — Música y efectos estilo Among Us (sintetizados por código)

Fecha: 2026-08-08
Estado: aprobado (diseño validado con el equipo)
Modifica: `2026-08-08-cable-rush-sidebar-pulido-design.md`

## 1. Motivación

El juego ya tiene efectos de corte (`src/ui/sound.ts`: `playCut`, `playWrong`)
pero ninguna ambientación sonora en el menú ni en la sala. Se añade música de
fondo estilo Among Us (inspirada, no el tema literal por copyright) y efectos
UI en el menú (rooms) y la sala del juego (waiting room). Todo **sintetizado
por código** con Web Audio — cero assets, consistente con el proyecto.

## 2. Nota de fidelidad

La melodía exacta de Among Us está protegida por copyright; sintetizar por
código no la exime. El resultado es música **inspirada** (ambient espacial
chill), no el tema literal.

## 3. Nuevo `src/ui/music.ts` — música de fondo

- Reutiliza el patrón de `sound.ts` (singleton `AudioContext`, `resume()` si
  está suspended, guardia `typeof AudioContext`).
- `startLobbyMusic(): void` — secuenciador Web Audio con scheduling por
  lookahead (`setTimeout` ~25ms): toca un patrón fijo de notas sobre acordes
  ambient (pad de fondo + arpegio suave), loop determinista de ~8-16s,
  volumen bajo (~0.08).
- `stopMusic(): void` — detiene el scheduler, libera el loop y el contexto de
  la música.
- El patrón musical vive en memoria (arrays de notas/acordes, semitonos como
  frecuencias), sin assets.

## 4. `src/ui/sound.ts` (modificar) — efectos UI

- `playClick(): void` — blip corto (oscilador sine ~700Hz, ~60ms).
- `playJoin(): void` — arpegio ascendente (2-3 notas) al entrar un jugador.
- `playLeave(): void` — arpegio descendente al salir un jugador.
- `playReady(): void` — doble tono de confirmación (squad completo / juez
  designado).
- `playStart(): void` — arranque de partida.
- Se mantienen `playCut` y `playWrong` (uso en el tablero).

## 5. Hooks en `src/menu/menu.ts`

- Al montar el menú, un listener de **primer gesto** (`pointerdown`/`keydown`,
  una sola vez) arranca `startLobbyMusic()` — respeta la autoplay policy del
  navegador (el AudioContext requiere interacción del usuario).
- `playClick()` en los botones del sidebar, el FAB y los forms
  (crear/unirse).

## 6. Hooks en `src/room/lobby.ts`

- Al montar la sala, primer gesto → `startLobbyMusic()`.
- `playJoin()` / `playLeave()` al renderizar players, detectando entradas y
  salidas (comparando el set de ids entre renders).
- `playReady()` al llegar a 4 jugadores / designar juez.
- `playStart()` + `stopMusic()` en `applyStart()` — la música de sala para al
  pasar a partida (arranca el tablero, que ya tiene sus propios sonidos de
  corte).
- `playClick()` en botones del lobby (copiar código, mic/deafen, salir).

## 7. Comportamiento de navegación

- Menú → sala: la página recarga (`window.location`), el `AudioContext` se
  crea de cero en la sala. Sin fugas entre páginas.
- En la sala, la música para en `applyStart()`; el tablero usa
  `playCut`/`playWrong` (ya existentes).

## 8. Alcance / fuera de alcance

- Files: `src/ui/music.ts` (nuevo), `src/ui/sound.ts`, `src/menu/menu.ts`,
  `src/room/lobby.ts`.
- **Sin cambios** en `portal/`, `types.ts`, `agent/`, `worker/`, ni en el
  tablero (`board.ts` ya usa `playCut`/`playWrong`).
- Fuera de alcance: el tema literal de Among Us (copyright), voz (fase 5),
  control de volumen/configuración de sonido persistente.

## 9. Verificación

- `npx astro check` 0 errores.
- Smoke test en dev: el menú suena tras el primer gesto (música de fondo +
  blips en botones); la sala suena (música + join/leave/ready/start); al
  iniciar la partida la música para y el tablero conserva sus efectos de
  corte. Sin errores de consola de audio.
