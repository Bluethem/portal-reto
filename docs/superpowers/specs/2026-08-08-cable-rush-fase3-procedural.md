# Cable Rush — Fase 3: Generación procedural

Fecha: 2026-08-08
Estado: aprobado
Modifica: `2026-08-07-cable-rush-design.md` (sección 5)

## 1. Objetivo

Reemplazar el manual que "revela el orden" (lista ordenada de etiquetas) por
reglas **condicionales** que el director debe aplicar con la descripción de los
cortadores. Generación **determinística por seed** y **solución única garantizada**
por un solver antes de publicar el nivel.

## 2. Seed por nivel

- PRNG determinístico (mulberry32) en el generador (reemplaza `Math.random`).
- `seed = hash(roomSeed, level)`: el agente genera un `roomSeed` aleatorio por room
  al bootear el juez → puzzles distintos por room, reproducibles dentro de la
  partida.
- El seed se loguea en el agente por nivel (debug/replay). No se publica al cliente.

## 3. Vocabulario de reglas (estructuradas + solver)

Cada regla es una restricción sobre el orden de corte. Las referencias siempre
resuelven a UN cable: labels únicos, colores únicos por nivel (sin repetidos),
filas únicas.

| Regla | Significado | Ejemplo (manual, por colores) |
|---|---|---|
| `first(l)` | l primero | "El cable rojo se corta PRIMERO." |
| `last(l)` | l último | "El cable azul se corta al FINAL." |
| `at(l, k)` | l en posición k | "El cable verde va en SEGUNDO lugar." |
| `before(a, b)` | a antes que b | "El cable amarillo se corta ANTES que el morado." |
| `adjacent(a, b)` | b justo después de a | "Justo después de cortar el rojo, corta el naranja." |
| `notFirst(l)` | l no es el primero | "El cable verde NO es el primero." |
| `colorFirst(c)` | el cable de color c primero | "El cable rojo se corta PRIMERO." |
| `colorBefore(c1, c2)` | c1 antes que c2 | "El rojo se corta ANTES que el azul." |
| `rowEnd(top/bottom, first/last)` | fila arriba/abajo | "El cable de ARRIBA se corta al FINAL." |

Los cables se identifican **solo por color** (únicos por nivel): no hay letras en el
tablero. Las reglas de etiqueta se renderizan con el color del cable; `label` queda
interno (solver/orden del agente).

Todas las reglas son **conjunción** (se cumplen TODAS). Las disyuntivas tipo
"si no" quedan para una iteración posterior.

## 4. Solver y solución única

- Se enumeran todas las permutaciones (≤ 720 para 6 cables) y se evalúan las
  restricciones. El orden conocido SIEMPRE es solución (las reglas se generan
  verdaderas para él) → soluciones ≥ 1.
- Generación: orden conocido → se añaden reglas verdaderas hasta que el solver
  devuelva **exactamente 1** solución (con un mínimo de reglas por nivel). Si tras
  un tope no es único, se regenera con el siguiente seed (intentos acotados).
- Fallback de seguridad: si no se logra unicidad, se usa el template de fase 2
  (lista ordenada) para no bloquear la partida.

## 5. Dificultad creciente

| Nivel | Cables | Reglas (target) | Tipos disponibles |
|---|---|---|---|
| 1 | 3 | 1 | first, last, colorFirst |
| 2-3 | 3-4 | 1-2 | + before, at, notFirst |
| 4-5 | 4-5 | 2-3 | + adjacent, colorBefore |
| 6+ | 5-6 | 3-5 | + rowEnd |

Colores únicos por nivel (pool crece hasta 6, siempre ≥ nº de cables). El
generador puede añadir más reglas de las target si hacen falta para la unicidad.

## 6. Cliente / director

- `LevelRules` no cambia (`summary` + `steps`). El director sigue mostrándolo.
- En `director.ts`, las steps pasan de `<ol>` a `<ul>`: las reglas son
  restricciones, no una secuencia.
- Board, timer, scoring y resto del cliente sin cambios.

## 7. Fuera de alcance

- Reglas disyuntivas ("si no") — futura iteración.
- IA (fase 4): el generador expone las reglas estructuradas (JSON) para que Groq
  las redacte; fase 3 solo las renderiza con template español.
- Cambios de tablero, timer o scoring.

## 8. Cables diagonales

- `Cable` += `toRow: number` — fila del terminal derecho; `row` = terminal
  izquierdo. Horizontal si `toRow === row`, diagonal si difieren.
- Los terminales izquierdos y derechos son **permutaciones** de `0..n-1` (nunca se
  comparten terminales ni se superponen por completo); los cruces salen de las
  inversiones de la permutación derecha.
- Rampa suave: `targetCrossings = min(1 + floor((level-3)/2), n(n-1)/2)` para
  `level >= 3` (niveles 1-2 horizontales, +1 cruce cada ~2 niveles).
- El tablero dibuja la diagonal (sin letra central; los cables se identifican por
  color); en un cruce el cable dibujado después queda encima (clic al segmento
  visible = la complicación).

## 9. Corte optimista (feedback al instante)

- Los cortes son mensajes persistentes (HTTP) → hay latencia de round-trip. En
  `pointerdown` el tablero aplica **inmediatamente** el look de corte (dasharray +
  fade) con un set `pendingCuts` (timeout ~1.5 s).
- El agente reconcilia: corte correcto → queda cortado; incorrecto → el siguiente
  estado lo restaura (y aplica -15 s).

## 9b. Cursores fluidos

- Los cursores viajan por `room-<id>-actions` (no por la room) → el canal de estado
  queda limpio, sin escaneos O(n) ni re-renders cruzados.
- Throttle ~120 ms + umbral de movimiento (~0.004) → el mouse quieto no publica.
- **Smoothing del receptor**: transición `left/top 120ms linear` en
  `.cursor-dot`/`.cursor-name` con render **in-place** (los elementos no se recrean)
  → el cursor glisse entre posiciones.
- `setMetadata` (vía del guide live-cursors) **no propaga en SDK 0.1.5** → descartado.

## 10. Verificación

- `npx astro check` 0 errores.
- Script de validación headless: niveles 1..30 con varios seeds → solver = 1,
  reglas verdaderas para el orden conocido, `row`/`toRow` permutaciones,
  cruces ≥ target por nivel y frases del manual **sin letras A-F** (color-only).
- Test 4 jugadores en dev: manual con reglas condicionales por colores, deducción,
  corte instantáneo, cables diagonales que se cruzan, cursores fluidos.
