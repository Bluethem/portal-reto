# Cable Rush — Design Doc (hackathon, v2)

Fecha: 2026-08-07
Estado: aprobado (diseño validado con el equipo)
Reemplaza: `2026-08-07-bomba-en-cadena-design.md` (V1 descartada)

## 1. Visión y alcance

Co-op de 4 jugadores con información asimétrica. 3 jugadores cortan cables en un
tablero 3D compartido; 1 director humano tiene un **manual** (no ve el tablero)
y dicta el orden por voz. Niveles endless con dificultad creciente; el equipo
gana tiempo al superarlos y pierde tiempo al cortar mal. El timer global decide
el final (score = nivel alcanzado).

Se construye por **fases** (vertical slice): cada fase es un hito demo-able por
solo. La IA y la voz van al final para no bloquear el núcleo jugable.

## 2. Arquitectura

- **Cliente:** Astro estático en **Vercel**. Menú, rooms y tablero 2D (SVG)
  de cables. (Ver `2026-08-08-cable-rush-board-2d-design.md`.)
- **Portal (`@portalsdk/core`):** conexión, presencia, canales de rooms y
  estado. El SDK **no trae voz** (media kinds rechazados en v1).
- **Agente juez central (Node):** un proceso maneja todas las rooms — estado por
  room, timer global + bonus, validación de cortes, generación de niveles.
  Corre en **Render** (obligatorio porque aloja la IA).
- **Voz:** WebRTC real con **LiveKit/Daily** (SFU aparte de Portal).
- **IA (Groq):** redacta el manual en lenguaje natural a partir del JSON de
  reglas determinístico. **No decide la lógica** — solo la explica.

**Reuso de la V1:** `portal/` (client, types, presencia), `shared/` (flash,
timer, colors, attachPick), escena three.js base, patrón del agente Node.

## 3. Concepto del juego

- Menú con lista de rooms; crear (host) o unirse; 4 jugadores por room.
- Roles: 3 **cortadores** (tablero compartido, cualquiera puede cortar) + 1
  **director** (manual, no ve el tablero).
- Comunicación: el director y los cortadores hablan por voz (LiveKit/Daily);
  los cortadores describen los cables, el director aplica el manual y dicta.
- Niveles: cortar TODOS los cables del tablero en el orden correcto = superar.
- Endless: cada nivel genera un tablero + manual nuevo, más difícil.

## 4. Timer y scoring

- Arranca en **3:00**. Pasar nivel: **+1:00**. Cortar mal: **-15 s**.
- Timer llega a 0 → fin de partida → pantalla de score (nivel alcanzado).
- El bonus se SUMA al timer global en curso (nunca se reinicia).

## 5. Generación procedural (fase 3)

- **Seed por nivel** → colores disponibles, nº de cables, reglas condicionales.
- **Solución única garantizada:** el generador crea primero el orden correcto y
  deriva tablero + reglas desde ahí; si hay reglas, un solver valida que solo
  exista un orden válido antes de publicar el nivel.
- Dificultad creciente: más colores posibles + reglas anidadas (de 1 condición
  a múltiples con "y"/"si no").

## 6. IA (fase 4)

- Input: JSON de reglas + nivel. Output: manual legible para el director.
- La IA **no decide la lógica** — la redacta (estilo manual de bombas).
- **Fallback:** si Groq falla o tarda, se muestra el template determinístico.
- Bonus (si sobra tiempo): copiloto de hints para el director.

## 7. Fases de construcción (cada una demo-able)

| Fase | Contenido | Demo-able sola |
|------|-----------|----------------|
| 1 | Menú + rooms + lobby (Portal, presencia, arranque a 4) | Sí |
| 2 | Nivel 1 sin IA: tablero, corte, orden, timer + bonus, manual por template | Sí |
| 3 | Generación procedural: seed por nivel, reglas crecientes, solución única | Sí |
| 4 | IA (Groq): manual redactado desde el JSON (+ copiloto opcional) | Sí |
| 5 | Voz WebRTC (LiveKit/Daily) | Sí |
| 6 | Despliegue Vercel + Render + test 4 jugadores | Sí |

## 8. Flujo de datos (por room)

1. Jugador abre el menú → crea/une a room → 4 jugadores → arranca.
2. El agente genera el nivel: tablero + reglas (mismo seed) + manual (fase 2:
   template; fase 4: redactado por Groq).
3. El director lee el manual; los 3 cortadores describen/cortan por voz.
4. Corte enviado → el agente valida contra el orden del seed → correcto avanza,
   incorrecto penaliza tiempo.
5. Todos los cables cortados en orden → nivel superado, +1 min, nivel siguiente.
6. Timer a 0 → fin, score final.

## 9. Componentes (estructura de archivos)

```
src/
├── menu/          # lista de rooms, crear/unirse (Portal)
├── room/          # lobby + roles + HUD del juego
├── board/         # tablero 2D de cables (SVG, reusa base)
├── director/      # vista del manual para el director
├── portal/        # reuso: client, types, presencia
├── shared/        # reuso: flash, timer, colors, attachPick
└── index.ts       # boot por vista (menu | room)
agent/room/        # agente juez multi-room + generador de niveles
agent/ia/          # redacción del manual con Groq (fase 4)
```

## 10. Canales Portal (v2)

- `rooms-index` — canal público: lista de rooms activas (id, nombre, jugadores,
  host). El agente o cada host la mantiene.
- `room-<id>` — canal por room: estado del juego (nivel, tablero, timer,
  progreso). Solo el agente juez lo escribe.
- `room-<id>-actions` — cortes e intentos publicados por los clientes; el agente
  los consume y actualiza `room-<id>`.
- Presencia por canal de room: `{ role: "director" | "cutter", host: bool }`.

## 11. Voz (fase 5)

- LiveKit/Daily: una sala por room. El director entra con micrófono; los 3
  cortadores con audio.
- Si la voz falla en la demo, el juego sigue jugable describiendo por texto.

## 12. Manejo de errores

- Room llena → no se une (mensaje claro).
- Room eliminada / host se va → los miembros vuelven al menú.
- Agente caído → HUD muestra estado del canal, sin conexión falsa.
- IA falla o tarda → fallback a manual template determinístico.

## 13. Verificación por fase

- Cada fase: `npx astro check` 0 errores + prueba en dev server.
- Fase 6: demo completa en Vercel + Render, test con 4 jugadores.
- Sin commits automáticos (decisión del equipo).

## 14. Decisiones registradas

- Vercel solo aloja el cliente; el agente + IA van en Render (obligatorio).
- La clave `GROQ_API_KEY` nunca va al bundle del cliente.
- Voz = LiveKit/Daily (WebRTC), no parte del SDK de Portal.
- La IA redacta el manual, no decide la lógica (solución única determinística).
- Timer: 3 min inicial, +1 min por nivel, -15 s por corte mal.
- Endless con score = nivel alcanzado (sin condición de victoria fija).
