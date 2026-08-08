# Cable Rush — Tablero 2D de cables (fase 2b)

Fecha: 2026-08-08
Estado: aprobado (diseño validado con el equipo)
Modifica: `2026-08-07-cable-rush-design.md` (sección 9, tablero)

## 1. Motivación

En la demo de la fase 2 los cables aparecen colocados aleatoriamente en un
espacio 3D (three.js), lo que dificulta verlos y reconocerlos. Se cambia el
tablero a **2D** para que la demo sea más visible: cables horizontales que van
de un panel izquierdo a un panel derecho (referencia: minijuego de cables de
Among Us), manteniendo la mecánica actual (cortar en el orden del manual). No se
añade la mecánica de "conectar cables" por ahora (se decide mantener solo cortar).

## 2. Alcance

- Render 2D (SVG) del tablero en lugar de three.js.
- Cables colocados en filas entre panel izquierdo y panel derecho.
- Animación de corte: el cable se secciona y desaparece.
- Eliminación de three.js del proyecto (solo lo usaba el tablero).
- Modelo de datos preparado para la fase 3 (generación procedural).

## 3. Modelo de datos (`src/portal/types.ts`)

Se eliminan `position` y `rotation` (3D). El `Cable` pasa a:

```ts
export interface Cable {
  label: string;
  color: number;
  row: number;   // fila vertical 0..N-1, posición del cable entre paneles
  cut: boolean;  // lo marca el agente juez al validarse el corte
}
```

`RoomState`, `order` y `RoomAction` no cambian. El cliente sigue sin recibir el
orden correcto.

## 4. Agente juez (`agent/room/agent.ts`)

Al validar un corte correcto, marcar el cable como cortado antes de publicar:

```ts
const c = j.cables.find((c) => c.label === label);
if (c) c.cut = true;
```

Sin más cambios de lógica (timer, bonus, penalización, niveles intactos).

## 5. Generador (`agent/room/generator.ts`)

En lugar de la colocación circular actual, asignar `row` a cada cable con las
filas barajadas (para que la disposición física no revele el orden). Color +
label + manual (template) intactos.

## 6. Tablero (`src/board/`)

Se eliminan `board.ts` (three.js) y `setup.ts`. Nuevo tablero SVG generado por
DOM (sin librerías):

- Panel izquierdo y derecho (rectángulos de terminales) y cables horizontales
  de color con etiqueta (badge con la letra).
- Click sobre un cable (área de hit transparente más ancha que el trazo) →
  `sendCut(label)`.
- Animación de corte: al recibir estado con `cut: true`, el cable se secciona
  (chispazo) y desaparece (fade out).
- Feedback de corte malo: flash rojo breve del cable clicado; como el agente no
  confirma cuál fue, el flash se revierte solo.
- Se mantiene la capa de cursores (porcentajes) sobre el contenedor del tablero.

## 7. Director

Sin cambios (sigue viendo el manual por color + etiqueta).

## 8. Limpieza

- Borrar `src/board/setup.ts`.
- Quitar `three` y `@types/three` de `package.json` (solo los usaba el board;
  bundle más liviano).
- Actualizar `2026-08-07-cable-rush-design.md` donde mencione "tablero 3D
  (three.js)".

## 9. Impacto en fase 3

El modelo 2D (`label`, `color`, `row`) es la base del generador procedural: la
solución única sigue garantizada por `order` (el generador crea el orden y
deriva el tablero), y `row` da control de dificultad. La IA (fase 4) no cambia:
sigue redactando el manual desde el JSON de reglas.

## 10. Verificación

- `npx astro check` 0 errores.
- Prueba en dev server: 4 jugadores, cortar en orden (cables se cortan y
  desaparecen), corte malo (flash + -15 s).
