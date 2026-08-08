# Cable Rush — Tablero 2D de cables (board 2b) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir el tablero 3D (three.js) por un tablero 2D en SVG: cables horizontales de color + etiqueta entre paneles izquierdo/derecho, corte con animación (seccionado + desaparición) y modelo de datos 2D (`row`, `cut`) listo para la fase 3.

**Architecture:** El agente juez sigue siendo la fuente de verdad: genera cables 2D, valida cortes contra `order` y marca `cut: true` en el cable correcto antes de publicar `RoomState`. El cliente renderiza un SVG por DOM desde `cables` (sin librerías), con hit-testing por elemento SVG y capa de cursores en porcentajes.

**Tech Stack:** Astro, @portalsdk/core, TypeScript estricto, SVG + DOM (sin three.js), Node agent.

## Global Constraints

- **NO git commits** — instrucción explícita del usuario; los cambios se quedan en working tree.
- TypeScript estricto, **sin comentarios** en el código salvo que se pidan.
- El agente juez es el **único** escritor de `room-<id>` y conoce el orden correcto; los clientes nunca lo reciben.
- `room-<id>-actions`: cortes publicados por los clientes (`{ type: "cut", label }`). El agente los consume.
- Cursores: mensajes **efímeros** en `room-<id>` (`{ type: "cursor", x, y, name }`), sin historial.
- Timer: arranca en 3:00; nivel superado +1:00; corte mal -15 s; timer 0 → fin. (Intacto.)
- Director ve SOLO el manual (2D HTML) — sin cambios.
- Cables con **color + etiqueta** (letra visible). Cualquiera de los 3 cortadores puede cortar; primero gana.
- Verificación por tarea: `npx astro check` 0 errores + prueba en dev server.
- Espec de referencia: `docs/superpowers/specs/2026-08-08-cable-rush-board-2d-design.md`.
- Existe un trabajo sin commitear del usuario (frontend: menu/director/lobby/pages/styles/README/package, etc.). **No tocar esos archivos** salvo los listados en cada tarea; no stagear nada con `git add` sin permiso.

---

### Task 1: Modelo de datos 2D — `Cable` con `row` y `cut`

**Files:**
- Modify: `src/portal/types.ts`

**Interfaces:**
- Produces: `Cable { label: string; color: number; row: number; cut: boolean }`.
- RoomState, RoomAction, RoomEvent, CursorMessage, ChatMessage: sin cambios.

- [ ] **Step 1: Sustituir `Cable` en `src/portal/types.ts`**

Reemplazar el bloque actual (líneas 35-40):

```ts
export interface Cable {
  label: string;
  color: number;
  position: [number, number, number];
  rotation: [number, number, number];
}
```

por:

```ts
export interface Cable {
  label: string;
  color: number;
  row: number;
  cut: boolean;
}
```

- [ ] **Step 2: Verificar**

Run: `npx astro check`
Expected: errores de tipos en `src/board/board.ts`, `src/board/setup.ts` y `agent/room/generator.ts` (usan `position`/`rotation`). Es esperado; se resuelven en las tareas 2-4.

---

### Task 2: Generador 2D — filas barajadas

**Files:**
- Modify: `agent/room/generator.ts`

**Interfaces:**
- Consumes: `Cable` de `src/portal/types.ts` (con `row`, `cut`).
- Produces: `generateLevel(level: number): { cables: Cable[]; order: string[]; rules: LevelRules }` con `cables[i].row` asignado y `cut: false`.

- [ ] **Step 1: Reescribir el bucle de colocación en `agent/room/generator.ts`**

Reemplazar la función completa (líneas 21-47) por:

```ts
export function generateLevel(level: number): GeneratedLevel {
  const count = Math.min(6, 3 + Math.floor(level / 2));
  const colorPool = shuffle(COLORS).slice(0, Math.min(3 + Math.floor(level / 3), COLORS.length));
  const cables: Cable[] = [];
  const order = shuffle(LABELS.slice(0, count));
  const used = new Map<number, number>();
  const rows = shuffle([...Array(count).keys()]);
  for (let i = 0; i < count; i++) {
    const color = colorPool[i % colorPool.length];
    used.set(color, (used.get(color) ?? 0) + 1);
    cables.push({
      label: order[i],
      color,
      row: rows[i],
      cut: false,
    });
  }
  const firstColor = cables.find((c) => c.label === order[0])!.color;
  const rules: LevelRules = {
    summary: `Nivel ${level}: hay ${count} cables. Corta TODOS los cables en el orden correcto.`,
    steps: [
      `El PRIMER cable en cortarse es el ${order[0]} (color ${colorName(firstColor)}).`,
      ...cables.slice(1).map((c) => `Después, corta el cable ${c.label} (color ${colorName(c.color)}).`),
    ],
  };
  return { cables, order, rules };
}
```

- [ ] **Step 2: Verificar**

Run: `npx astro check`
Expected: sin errores en `agent/room/generator.ts`; `agent/room/agent.ts` y `src/board/*` pueden seguir con errores (se resuelven en las tareas 3 y 4).

---

### Task 3: Agente juez — marcar `cut` al validar

**Files:**
- Modify: `agent/room/agent.ts`

**Interfaces:**
- Consumes: `Cable` de `src/portal/types.ts`.
- Produces: en cada corte correcto, el cable correspondiente en `j.cables` queda con `cut: true` antes de publicar; en nivel superado, `startLevel` regenera con `cut: false`.

- [ ] **Step 1: Tipar `cables` del `Judge` con `Cable`**

En `agent/room/agent.ts`, importar `Cable`:

```ts
import type { RoomAction, RoomState, RoomEvent, RoomInfo, LevelRules, Cable } from "../../src/portal/types.ts";
```

Reemplazar el campo `cables` de la interfaz `Judge` (línea 25):

```ts
  cables: { label: string; color: number; position: [number, number, number]; rotation: [number, number, number] }[];
```

por:

```ts
  cables: Cable[];
```

- [ ] **Step 2: Marcar el cable cortado al validar**

En el handler de `actions.on("message")`, dentro de la rama correcta (`label === expected`), antes del `if (j.cutCount === j.order.length)`:

```ts
    if (label === expected) {
      const c = j.cables.find((c) => c.label === label);
      if (c) c.cut = true;
      j.cutCount++;
```

- [ ] **Step 3: Verificar**

Run: `npx astro check`
Expected: 0 errores (si `src/board/*` aún falla, revisar en tarea 4 que quede limpio; el typecheck global se valida al final).

---

### Task 4: Tablero 2D SVG — cables entre paneles, corte con animación

**Files:**
- Create: `src/board/board.ts` (reemplaza el actual)
- Delete: `src/board/setup.ts`

**Interfaces:**
- Consumes: `RoomClient.subscribeState`, `sendCut`, `subscribeCursor`, `sendCursor`, `getSelfId`; `Cable` de `../portal/types`.
- Produces: `mountBoard(container: HTMLElement, client: RoomClient, selfName: string): () => void` (misma firma que hoy; `lobby.ts` no cambia).

- [ ] **Step 1: Borrar `src/board/setup.ts`**

Run: `rm src/board/setup.ts`

- [ ] **Step 2: Escribir `src/board/board.ts`**

```ts
import type { RoomClient } from "../portal/client";
import type { Cable } from "../portal/types";

const VIEW_W = 800;
const VIEW_H = 460;
const PANEL_W = 90;
const PANEL_X = 46;
const PANEL_Y = 26;
const PANEL_H = VIEW_H - PANEL_Y * 2;
const TERMINAL_X_R = PANEL_X + PANEL_W;

interface CableEls {
  g: SVGGElement;
  line: SVGLineElement;
  stripe: SVGLineElement;
  hit: SVGLineElement;
  badge: SVGCircleElement;
  text: SVGTextElement;
}

function svgEl<K extends keyof SVGElementTagNameMap>(ns: string, tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function mountBoard(container: HTMLElement, client: RoomClient, selfName: string): () => void {
  const NS = "http://www.w3.org/2000/svg";
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  const svg = svgEl(NS, "svg", { viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, width: "100%", height: "100%", style: "display:block;background:#0b0e14;border-radius:16px;border:1px solid #2a2f3a;box-shadow:0 12px 32px rgb(0 0 0 / 0.14);" });

  const panelL = svgEl(NS, "rect", { x: String(PANEL_X), y: String(PANEL_Y), width: String(PANEL_W), height: String(PANEL_H), rx: "12", fill: "#1a1f2b", stroke: "#2a2f3a" });
  const panelR = svgEl(NS, "rect", { x: String(VIEW_W - PANEL_X - PANEL_W), y: String(PANEL_Y), width: String(PANEL_W), height: String(PANEL_H), rx: "12", fill: "#1a1f2b", stroke: "#2a2f3a" });
  svg.append(panelL, panelR);

  const cableEls = new Map<string, CableEls>();
  const cursorLayer = document.createElement("div");
  cursorLayer.className = "cursor-layer";
  wrap.append(svg, cursorLayer);
  container.appendChild(wrap);

  const nameColors = new Map<string, number>();
  const palette = [0x22c55e, 0xf97316, 0x8b5cf6, 0x14b8a6];

  function nameColor(id: string): number {
    if (!nameColors.has(id)) nameColors.set(id, palette[nameColors.size % palette.length]);
    return nameColors.get(id)!;
  }

  function hex(c: number): string {
    return `#${c.toString(16).padStart(6, "0")}`;
  }

  function rowY(row: number, total: number): number {
    const inner = PANEL_H - 40;
    const spacing = total > 1 ? inner / (total - 1) : 0;
    return PANEL_Y + 20 + row * spacing;
  }

  function renderCables(cables: Cable[]): void {
    const total = Math.max(cables.length, 1);
    const byLabel = new Map(cables.map((c) => [c.label, c] as const));
    for (const [label, els] of cableEls) {
      const c = byLabel.get(label);
      if (!c || c.cut) {
        els.line.setAttribute("stroke-dasharray", "10 6");
        els.g.setAttribute("style", "transition:opacity 600ms ease 250ms;opacity:0;");
        if (!c) els.g.remove();
        continue;
      }
      const y = rowY(c.row, total);
      els.line.removeAttribute("stroke-dasharray");
      els.line.setAttribute("stroke", hex(c.color));
      els.badge.setAttribute("stroke", hex(c.color));
      els.g.setAttribute("style", "opacity:1;transition:none;");
      setLineY(els, y);
    }
    for (const c of cables) {
      if (c.cut) continue;
      if (cableEls.has(c.label)) continue;
      const y = rowY(c.row, total);
      const g = svgEl(NS, "g", {});
      const line = svgEl(NS, "line", {
        x1: String(TERMINAL_X_R), y1: String(y),
        x2: String(VIEW_W - TERMINAL_X_R), y2: String(y),
        stroke: hex(c.color), "stroke-width": "10", "stroke-linecap": "round",
      });
      const stripe = svgEl(NS, "line", {
        x1: String(TERMINAL_X_R), y1: String(y),
        x2: String(VIEW_W - TERMINAL_X_R), y2: String(y),
        stroke: "#ffffff", "stroke-width": "2", "stroke-linecap": "round",
        "stroke-dasharray": "2 14", opacity: "0.35",
      });
      const hit = svgEl(NS, "line", {
        x1: String(TERMINAL_X_R), y1: String(y),
        x2: String(VIEW_W - TERMINAL_X_R), y2: String(y),
        stroke: "transparent", "stroke-width": "26", "stroke-linecap": "round",
        style: "cursor:pointer;pointer-events:stroke;",
      });
      const badge = svgEl(NS, "circle", { cx: String(VIEW_W / 2), cy: String(y), r: "16", fill: "#0b0e14", stroke: hex(c.color), "stroke-width": "3" });
      const text = svgEl(NS, "text", { x: String(VIEW_W / 2), y: String(y + 6), "text-anchor": "middle", "font-size": "18", "font-weight": "700", fill: "#e6e9f0", "font-family": "system-ui, sans-serif" });
      text.textContent = c.label;
      g.append(line, stripe, hit, badge, text);

      hit.addEventListener("pointerdown", () => {
        void client.sendCut(c.label);
        line.setAttribute("stroke", "#ff5252");
        stripe.setAttribute("stroke", "#ff5252");
        window.setTimeout(() => {
          line.setAttribute("stroke", hex(c.color));
          stripe.setAttribute("stroke", "#ffffff");
        }, 350);
      });

      svg.appendChild(g);
      cableEls.set(c.label, { g, line, stripe, hit, badge, text });
    }
  }

  function setLineY(els: CableEls, y: number): void {
    for (const el of [els.line, els.stripe, els.hit]) {
      el.setAttribute("y1", String(y));
      el.setAttribute("y2", String(y));
    }
    els.badge.setAttribute("cy", String(y));
    els.text.setAttribute("y", String(y + 6));
  }

  const players = new Map<string, { x: number; y: number; name: string }>();

  function renderCursors(): void {
    cursorLayer.replaceChildren();
    for (const p of players.values()) {
      const el = document.createElement("div");
      el.className = "cursor";
      el.style.left = `${p.x * 100}%`;
      el.style.top = `${p.y * 100}%`;
      el.style.borderColor = `#${nameColor(p.name).toString(16).padStart(6, "0")}`;
      el.textContent = p.name;
      cursorLayer.appendChild(el);
    }
  }

  svg.addEventListener("pointermove", (e) => {
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    players.set(selfName, { x, y, name: selfName });
    renderCursors();
    client.sendCursor(x, y, selfName);
  });

  client.subscribeState((s) => {
    if (s && s.cables.length) renderCables(s.cables);
  });

  client.subscribeCursor((c) => {
    if (c.name === selfName) return;
    players.set(c.name, { x: c.x, y: c.y, name: c.name });
    renderCursors();
  });

  return () => {
    wrap.remove();
  };
}
```

- [ ] **Step 3: Adaptar el CSS de `#stage` en `src/styles/theme.css`**

`#stage canvas` ya no aplica (no hay canvas). Reemplazar el bloque de `#stage canvas` (líneas 89-97) por el tamaño del SVG:

```css
  #stage svg {
    display: block;
    width: 100%;
    height: 420px;
  }
```

- [ ] **Step 4: Verificar**

Run: `npx astro check`
Expected: 0 errores.

---

### Task 5: Quitar three.js del proyecto

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (se regenera con npm)

**Interfaces:**
- Ninguna dependencia de otras tareas; tres solo lo usaba `src/board/`.

- [ ] **Step 1: Eliminar las dependencias de three**

Run: `npm uninstall three @types/three`
Expected: salida sin errores; `three` y `@types/three` desaparecen de `package.json` y `package-lock.json`.

- [ ] **Step 2: Verificar que nada importa three**

Run: `rg -n "three|THREE" src agent`
Expected: sin resultados.

- [ ] **Step 3: Typecheck global**

Run: `npx astro check`
Expected: 0 errores.

---

### Task 6: Verificación manual del loop completo

**Files:**
- Ninguno (verificación).

- [ ] **Step 1: Typecheck global**

Run: `npx astro check`
Expected: 0 errores.

- [ ] **Step 2: Levantar agente y dev server**

Run en dos terminales:
- `npm run agent:room`
- `astro dev --background`

Expected: el agente loguea `[agent] agente juez listo, observando rooms-index...`.

- [ ] **Step 3: Test manual con 4 pestañas**

Abrir `http://localhost:4321` en 4 pestañas y unirse a la misma room. El host inicia la partida.

Expected:
- Los 3 cortadores ven el tablero 2D: dos paneles (izquierdo/derecho) con cables horizontales de color + etiqueta en el medio; cada cable en una fila distinta.
- Cursores con nombre se ven en tiempo real sobre el tablero.
- Click sobre un cable envía el corte; si es correcto, el agente lo marca y el cable se secciona (dasharray) y desaparece (fade) en las 3 vistas.
- Si es incorrecto, flash rojo breve del cable clicado y el timer baja 15 s (sin desaparecer ningún cable).
- El director ve el manual (resumen + pasos por color/etiqueta) — sin cambios.
- Completar nivel: +1:00 y se genera el siguiente con filas barajadas distintas.
- Timer a 0 → estado `finished` y pantalla de score.

- [ ] **Step 4: Confirmar working tree**

Run: `git status --short`
Expected: `src/board/setup.ts` eliminado, `src/board/board.ts`, `src/portal/types.ts`, `agent/room/generator.ts`, `agent/room/agent.ts`, `src/styles/theme.css`, `package.json`, `package-lock.json` modificados; sin commits.
