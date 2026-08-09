# Cable Rush — Sidebar funcional + pulido del tablero (tijera, altura, sonidos)

Fecha: 2026-08-08
Estado: aprobado (diseño validado con el equipo)
Modifica: `2026-08-08-cable-rush-frontend-among-us-design.md`

## 1. Motivación

El sidebar del menú (Home, Join Room, Create Room, Leaderboard) se renderiza con
botones **sin funcionalidad** (`menu.ts:81-84`, helper `item()` sin handlers). Se
convierten en vistas navegables SPA. De paso, se pulen tres detalles del tablero
de corte: cursor **tijera** sobre los cables, tablero **más alto**, y **sonidos**
de corte (snip al cortar, zumbido al cortar mal).

## 2. Sidebar SPA (`src/menu/menu.ts`)

- `renderRooms` pasa a `renderMenu(root, menu)` que pinta el `shell` una vez y
  gestiona `switchView(view)` con `view: "home" | "join" | "create" | "leaderboard"`.
- Estado local `current`; el sidebar re-marca el item activo (`bg-secondary
  text-on-secondary ... block-shadow`). `#menu-body` se re-renderiza por vista.
- **Home**: header "Operaciones activas" + filtros Public/Private + grilla de
  room cards (solo lista).
- **Join Room**: tarjeta "Unirse con código" (flujo actual: busca
  `getRooms().find(id.endsWith(-code))`, fallback `prv-<code>`).
- **Create Room**: tarjeta "Nueva operación" (nombre + pública/privada + crear →
  `/room?...&host=1`).
- **Leaderboard**: ranking local de rooms desde `rooms-index` — en curso primero,
  luego por nº de jugadores. Filas: nombre, host, `X/4`, estado EN CURSO/ESPERA.
- **FAB**: visible solo en Home y Leaderboard; click → `switchView("create")`;
  oculto en Join/Create.
- Los 4 items del sidebar son botones con `data-view`; click → `switchView`.

## 3. Cursor tijera (`src/board/board.ts` + `src/styles/theme.css`)

- El `hit` de cada cable usa `style: "cursor:pointer;"` hoy (`board.ts:135`). Se
  reemplaza por un cursor SVG tijera **inline** (data-URI) definido como clase
  `.cursor-scissors` en `theme.css` (consistente con el proyecto: cero assets).
- Se aplica a los `hit` de los cables; el cursor es tijera al pasar sobre un cable.

## 4. Tablero más alto (`src/styles/theme.css`)

- `#stage svg`: `420px` → `520px`.
- `#stage.board-lg svg`: `560px` → `640px`.
- El viewBox SVG escala con `width:100%`; el tablero se ve más alto sin cambiar
  la lógica de coordenadas.

## 5. Sonidos de corte (Web Audio, sin assets)

- Nuevo `src/ui/sound.ts` con Web Audio API:
  - `playCut()` — "snip" corto (~40ms de ruido blanco + filtro paso alto +
    envolvente rápida de ganancia).
  - `playWrong()` — zumbido grave (~200ms de oscilador bajo + envolvente).
- `playCut()` en `pointerdown` de cada cable (junto al corte optimista,
  `board.ts:143-150`).
- `playWrong()` cuando el agente restaura un cable mal cortado: en `renderCables`,
  cuando un label de `pendingCuts` deja de estar en `cut` (el restore tras el
  -15 s), se dispara `playWrong()` y se quita del set.

## 6. Alcance / fuera de alcance

- Files: `src/menu/menu.ts`, `src/board/board.ts`, `src/ui/sound.ts` (nuevo),
  `src/styles/theme.css`.
- **Sin cambios** en `portal/`, `types.ts`, `agent/`, `worker/`.
- Fuera de alcance: IA (fase 4), voz (fase 5), leaderboard persistente/global
  (solo ranking local de rooms-index).

## 7. Verificación

- `npx astro check` 0 errores.
- `npx astro build` OK.
- Smoke test en dev: navegar los 4 items sin recargar; crear/unirse desde sus
  vistas; FAB lleva a Create; Leaderboard lista rooms ordenadas; cursor tijera
  sobre cables; tablero más alto; snip al cortar y zumbido al cortar mal.
