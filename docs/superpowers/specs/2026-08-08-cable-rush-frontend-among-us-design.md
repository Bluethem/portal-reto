# Cable Rush — Rediseño frontend "Defuse Protocol" (estética Among Us)

Fecha: 2026-08-08
Estado: aprobado (diseño validado con el equipo)
Relacionada: `2026-08-07-cable-rush-design.md`

## 1. Motivación

El frontend actual usa el tema "Defuse Protocol" claro (papel/arena/amarillo). El
mentor recomendó la estética de Among Us. Hay dos pantallas de referencia en
`pantallas/rooms.html` y `pantallas/waiting-room.html` (mockups "Defuse Protocol"
en **Cartoon Brutalism**). Esta iteración reestiliza TODAS las pantallas del
juego replicando el shell y los componentes de esas referencias.

## 2. Estilo de referencia (extraído)

- **Paleta navy oscuro:** `surface #0b1326`, `surface-container-low #131b2e`,
  `surface-container #171f33`, `surface-container-high #222a3e`,
  `surface-variant #2d3449`, `on-surface #dbe2fd`, `outline-variant #5d403c`.
- **Acentos:** `secondary #a4ffe8` (menta), `tertiary #cdcd00` (amarillo),
  `primary #ffb4a9` (salmón), `primary-container #c51111` (rojo),
  `error #ffb4ab`.
- **Cartoon Brutalism:** bordes negros gruesos (`border-4`/`border-8 black`),
  sombras duras `4px 4px 0 black` / `6px 6px 0 black` (sin blur), efecto
  "pressed" (hover: `translate(4px,4px)` + `shadow: none`), textura noise SVG
  (`analog-texture`), `-webkit-text-stroke` para headlines (`stroke-heavy`).
- **Tipografías:** **Bricolage Grotesque** (headlines/display, 700–800) +
  **Barlow Condensed** (labels/body, uppercase con `letter-spacing`).
  Material Symbols Outlined para iconos.
- **Radius:** `1rem` default, `2rem` lg, `3rem` xl, `9999px` full.
- **Shell:** nav lateral (Home, Join Room, Create Room, Leaderboard) + header de
  perfil `OPERATOR_<name>` (avatar + rank) + `SYS.STAT ... ONLINE` pulsante.
- **Componentes:** room cards (mapa placeholder con grid de puntos, badge "Sec",
  contador `X/Y`, host, tiras de cables de colores, botón Join/Locked/FULL),
  player cards (avatar crewmate de color + nombre + badge READY/WAITING),
  FAB "Create New Operation", botón "Initiate Sequence".

## 3. Alcance

- **Tema global** (`src/styles/theme.css`): reescritura con la paleta/fuentes/
  radius/sombras de referencia + utilidades (`block-shadow`, `pressed`,
  `analog-texture`, `stroke-heavy`).
- **Menú** (`src/menu/menu.ts`): shell con nav lateral + perfil + FAB; room
  cards estilo referencia; pantalla de identidad reestilizada.
- **Lobby** (`src/room/lobby.ts`): shell + header de sala (Room Code, copiar,
  "Awaiting Operatives...") + player cards con crewmates + "Target Location" +
  "Tactical Comms" + botón "Initiate Sequence" (host) + HUD/gameover/locked-out
  reestilizados.
- **Tablero** (`src/board/board.ts`): paleta oscura espacial, cables con colores
  crewmate vibrantes; se mantiene el layout de wires y la lógica de corte.
- **Director** (`src/director/director.ts`): manual en tarjetas estilo
  referencia; mismo contenido.
- **Páginas** (`src/pages/index.astro`, `src/pages/room.astro`): agregar fuentes
  Google (Bricolage Grotesque + Barlow Condensed + Material Symbols).

## 4. Componentes reutilizables (`src/ui/` — nueva carpeta)

- `crewmate.ts` → `crewmateSvg(color: string, size: number): string` — crewmate
  en SVG puro (cuerpo con visera + mochila) coloreado por jugador. Sin assets.
- Helpers DOM para room card y player card (opcional; pueden vivir en
  menu/lobby si no justifican archivo aparte).

## 5. Estructura de datos

- **Sin cambios** en `src/portal/types.ts` ni en el agente. Es un rediseño
  puramente visual del cliente.

## 6. Fuera de alcance

- IA (fase 4), voz (fase 5), despliegue (fase 6).
- Cambios de lógica de juego, tablero (layout), timer, scoring.
- El contenido del manual (solo su presentación).

## 7. Verificación

- `npx astro check` 0 errores.
- `npx astro build` OK.
- Smoke test en dev: identidad → menú (nav + room cards + FAB) → lobby (player
  cards crewmate, copiar código, iniciar) → partida (tablero y director
  reestilizados) → gameover.
