# Cable Rush — Lobby-nave (estética Among Us) + animaciones animejs

Fecha: 2026-08-12
Estado: implementado
Relacionada: `2026-08-08-cable-rush-frontend-among-us-design.md`

## 1. Motivación

El lobby de la sala de espera era una columna de paneles sobre fondo plano. El
objetivo es renovarlo como un **interior de nave** (como el lobby de Among Us),
alinear la estética/terminología con la referencia (Manual of Style + colores
oficiales de crewmates) y sumar animaciones con **animejs** (ambientales,
entrada escalonada, transición a partida, feedback y eventos).

## 2. Alcance

Solo el lobby (`src/room/lobby.ts`). Menú, tablero, director y shell quedan
intactos. Sin cambios en `portal/*`, `agent/*`, `worker/*`.

## 3. Cambios

- **Asset:** `assets/Lobby.webp` movido a `public/assets/Lobby.webp` (la carpeta
  root `assets/` no la sirve Astro). Fondo full-bleed (`object-fit: cover`) con
  `#lobby-vignette` (gradiente radial + lineal inferior) para legibilidad de los
  paneles.
- **Paleta oficial:** `src/ui/crew-colors.ts` con los 10 colores de crewmate
  (Red/Blue/Green/Pink/Orange/Yellow/Black/White/Purple/Lime). `lobby.ts` la usa
  en vez del array local de 6.
- **Animaciones:** `src/ui/anim.ts` (animejs v4): `staggerIn`, `backgroundDrift`
  (Ken Burns), `pop`, `slidePanel`, `chatIn`, `burst` (partículas). Todas son
  no-op con `prefers-reduced-motion`.
- **Lobby:** slots de jugador estilo Among Us (`player-slot` con glow del color
  y crewmate grande; vacíos con crewmate fantasma), stagger al entrar jugadores,
  drift ambiental de la nave, transición animada al iniciar (board/squad se
  deslizan + burst), celebración del juez (pop + burst), chat con `chatIn`,
  burst en gameover.
- **Terminología:** badges `READY`/`CREWMATE`/`DIRECTOR`, estado "Crewmate".

## 4. Estructura de datos

Sin cambios en `src/portal/types.ts` ni en el agente. Cambio puramente visual.

## 5. Fuera de alcance

- Menú/Rooms, tablero, director, shell.
- Cambios de lógica de juego, timer, scoring, voz.

## 6. Verificación

- `npx astro check` 0 errores (4 hints preexistentes ajenos al cambio).
- `npx astro build` OK.
- Smoke test en dev: `/assets/Lobby.webp` 200; lobby con 2 pestañas → imagen de
  nave + viñeta, slots con colores oficiales, stagger al entrar, transición y
  burst al iniciar, chat animado; flujos existentes intactos.
