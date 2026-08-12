import type { RoomClient } from "../portal/client";
import type { Cable, StateEffect } from "../portal/types";
import { playCut, playWrong, playZap } from "../ui/sound";
import { burst, fadeScale, shake, shock } from "../ui/anim";
import { blindSvg, freezeSvg, lockCutSvg } from "../ui/effect-icons";

const VIEW_W = 800;
const VIEW_H = 540;
const PANEL_W = 90;
const PANEL_X = 46;
const PANEL_Y = 12;
const PANEL_H = VIEW_H - PANEL_Y * 2;
const TERMINAL_X_R = PANEL_X + PANEL_W;
const FLOOR_H = 56;
const HAZARD_H = 16;
const HL_OFF = 1.8;
const CURSOR_THROTTLE_MS = 120;
const CURSOR_MOVE_EPS = 0.004;
const PENDING_CUT_MS = 1500;

interface CableEls {
  g: SVGGElement;
  outline: SVGLineElement;
  line: SVGLineElement;
  highlight: SVGLineElement;
  braid: SVGLineElement;
  energy: SVGLineElement;
  socketA: SVGEllipseElement;
  socketB: SVGEllipseElement;
  ringA: SVGCircleElement;
  ringB: SVGCircleElement;
  plugA: SVGCircleElement;
  plugB: SVGCircleElement;
  pinA: SVGCircleElement;
  pinB: SVGCircleElement;
  hit: SVGLineElement;
  row: number;
  toRow: number;
}

function svgEl<K extends keyof SVGElementTagNameMap>(ns: string, tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el as SVGElementTagNameMap[K];
}

export function mountBoard(container: HTMLElement, client: RoomClient, selfName: string): () => void {
  const NS = "http://www.w3.org/2000/svg";
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  const svg = svgEl(NS, "svg", { viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, width: "100%", height: "100%", class: "board-svg analog-texture" });

  function buildDefs(): SVGDefsElement {
    const defs = svgEl(NS, "defs", {});
    const wallGrad = svgEl(NS, "linearGradient", { id: "wall-grad", x1: "0", y1: "0", x2: "0", y2: "1" });
    wallGrad.append(
      svgEl(NS, "stop", { offset: "0%", "stop-color": "#1c2438" }),
      svgEl(NS, "stop", { offset: "100%", "stop-color": "#0a1120" })
    );
    const panelGrad = svgEl(NS, "linearGradient", { id: "panel-grad", x1: "0", y1: "0", x2: "0", y2: "1" });
    panelGrad.append(
      svgEl(NS, "stop", { offset: "0%", "stop-color": "#2d3449" }),
      svgEl(NS, "stop", { offset: "100%", "stop-color": "#191f33" })
    );
    const dot = svgEl(NS, "pattern", { id: "dot-grid", width: "18", height: "18", patternUnits: "userSpaceOnUse" });
    dot.append(svgEl(NS, "circle", { cx: "2", cy: "2", r: "1.2", fill: "#9aa4c0", opacity: "0.35" }));
    const hazard = svgEl(NS, "pattern", { id: "hazard", width: "22", height: "22", patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    hazard.append(
      svgEl(NS, "rect", { width: "22", height: "22", fill: "#f2ed56" }),
      svgEl(NS, "rect", { width: "11", height: "22", fill: "#111111" })
    );
    const planetGrad = svgEl(NS, "radialGradient", { id: "space-planet-grad", cx: "35%", cy: "30%", r: "75%" });
    planetGrad.append(
      svgEl(NS, "stop", { offset: "0%", "stop-color": "#cdeaff" }),
      svgEl(NS, "stop", { offset: "100%", "stop-color": "#3f6396" })
    );
    defs.append(wallGrad, panelGrad, dot, hazard, planetGrad);
    return defs;
  }

  function buildEnvironment(): SVGGElement {
    const env = svgEl(NS, "g", { "pointer-events": "none" });
    const wall = svgEl(NS, "rect", { x: "0", y: "0", width: String(VIEW_W), height: String(VIEW_H), fill: "url(#wall-grad)" });
    const grid = svgEl(NS, "rect", { x: "0", y: "0", width: String(VIEW_W), height: String(VIEW_H), fill: "url(#dot-grid)", opacity: "0.5" });
    const ceiling = svgEl(NS, "rect", { x: "0", y: "8", width: String(VIEW_W), height: "3", fill: "#a4ffe8", opacity: "0.28" });
    ceiling.classList.add("term-led");
    const floor = svgEl(NS, "rect", { x: "0", y: String(VIEW_H - FLOOR_H), width: String(VIEW_W), height: String(FLOOR_H), fill: "#070d1a", opacity: "0.92" });
    const floorEdge = svgEl(NS, "line", { x1: "0", y1: String(VIEW_H - FLOOR_H), x2: String(VIEW_W), y2: String(VIEW_H - FLOOR_H), stroke: "#000000", "stroke-width": "2", opacity: "0.6" });
    const hazard = svgEl(NS, "rect", { x: "0", y: String(VIEW_H - HAZARD_H), width: String(VIEW_W), height: String(HAZARD_H), fill: "url(#hazard)", opacity: "0.85" });
    const win = svgEl(NS, "g", { "pointer-events": "none" });
    win.append(
      svgEl(NS, "circle", { cx: "400", cy: "64", r: "34", fill: "#0a1320", stroke: "#2d3449", "stroke-width": "6" }),
      svgEl(NS, "circle", { cx: "400", cy: "64", r: "27", fill: "#070c18" })
    );
    const winStars: [number, number, number, number][] = [
      [388, 56, 1.3, 0],
      [410, 70, 1, 0.6],
      [402, 50, 1.6, 1.2],
      [416, 58, 1, 0.3],
      [394, 74, 1.2, 0.9],
    ];
    for (const [sx, sy, sr, delay] of winStars) {
      const st = svgEl(NS, "circle", { cx: String(sx), cy: String(sy), r: String(sr), fill: "#ffffff" });
      st.classList.add("space-star");
      st.setAttribute("style", `animation-delay:${delay}s`);
      win.append(st);
    }
    win.append(svgEl(NS, "circle", { cx: "408", cy: "72", r: "8", fill: "url(#space-planet-grad)" }));
    env.append(wall, grid, ceiling, floor, floorEdge, hazard, win);
    return env;
  }

  function buildPanel(x: number, label: string): SVGGElement {
    const grp = svgEl(NS, "g", {});
    const base = svgEl(NS, "rect", { x: String(x), y: String(PANEL_Y), width: String(PANEL_W), height: String(PANEL_H), rx: "12", fill: "var(--color-surface-high)", stroke: "#000000", "stroke-width": "3" });
    const bevel = svgEl(NS, "rect", { x: String(x + 5), y: String(PANEL_Y + 5), width: String(PANEL_W - 10), height: String(PANEL_H - 10), rx: "9", fill: "url(#panel-grad)", stroke: "#000000", "stroke-width": "1.5", opacity: "0.9" });
    grp.append(base, bevel);
    const corners = [
      [x + 13, PANEL_Y + 14],
      [x + PANEL_W - 13, PANEL_Y + 14],
      [x + 13, PANEL_Y + PANEL_H - 14],
      [x + PANEL_W - 13, PANEL_Y + PANEL_H - 14],
    ] as const;
    for (const [sx, sy] of corners) {
      grp.append(
        svgEl(NS, "circle", { cx: String(sx), cy: String(sy), r: "3.2", fill: "#3f474e", stroke: "#000000", "stroke-width": "1.5" }),
        svgEl(NS, "line", { x1: String(sx - 2.6), y1: String(sy), x2: String(sx + 2.6), y2: String(sy), stroke: "#0a0a0a", "stroke-width": "1" })
      );
    }
    const cx = x + PANEL_W / 2;
    const lbl = svgEl(NS, "text", { x: String(cx), y: String(PANEL_Y + 26), "text-anchor": "middle", fill: "#cdcd00", "font-size": "13", "font-weight": "800", "font-family": "'Barlow Condensed', ui-sans-serif, sans-serif", "letter-spacing": "3" });
    lbl.textContent = label;
    grp.append(lbl);
    for (let i = 0; i < 3; i++) {
      const led = svgEl(NS, "circle", { cx: String(cx - 10 + i * 10), cy: String(PANEL_Y + 40), r: "2.6", fill: "#a4ffe8" });
      led.classList.add("term-led");
      led.setAttribute("style", `animation-delay:${i * 0.33}s`);
      grp.append(led);
    }
    return grp;
  }

  svg.append(buildDefs(), buildEnvironment(), buildPanel(PANEL_X, "IN"), buildPanel(VIEW_W - PANEL_X - PANEL_W, "OUT"));

  const cableEls = new Map<string, CableEls>();
  const pendingCuts = new Map<string, { id: string; at: number }>();
  const newGs: SVGGElement[] = [];
  const cursorLayer = document.createElement("div");
  cursorLayer.className = "cursor-layer";
  const freezeOverlay = document.createElement("div");
  freezeOverlay.className = "effect-overlay effect-freeze";
  freezeOverlay.innerHTML = `<div class="effect-inner">${freezeSvg(56)}<span class="effect-label">CONGELADO</span></div>`;
  const blindOverlay = document.createElement("div");
  blindOverlay.className = "effect-overlay effect-blind";
  blindOverlay.innerHTML = `<div class="effect-inner">${blindSvg(56)}<span class="effect-label">SEÑAL PERDIDA</span></div>`;
  const lockCutOverlay = document.createElement("div");
  lockCutOverlay.className = "effect-overlay effect-lockcut";
  lockCutOverlay.innerHTML = `<div class="effect-inner">${lockCutSvg(56)}<span class="effect-label">CORTES BLOQUEADOS</span></div>`;
  const effectLayer = document.createElement("div");
  effectLayer.className = "effect-layer";
  effectLayer.append(freezeOverlay, blindOverlay, lockCutOverlay);
  wrap.append(svg, cursorLayer, effectLayer);
  container.appendChild(wrap);

  const nameColors = new Map<string, number>();
  const palette = [0xffb4a9, 0x2196f3, 0x4caf50, 0xcdcd00];

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

  function placeCable(els: CableEls, total: number): void {
    const x1 = TERMINAL_X_R;
    const x2 = VIEW_W - TERMINAL_X_R;
    const y1 = rowY(els.row, total);
    const y2 = rowY(els.toRow, total);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const hx = (dy / len) * HL_OFF;
    const hy = -(dx / len) * HL_OFF;
    for (const el of [els.outline, els.line, els.braid, els.energy, els.hit]) {
      el.setAttribute("x1", String(x1));
      el.setAttribute("y1", String(y1));
      el.setAttribute("x2", String(x2));
      el.setAttribute("y2", String(y2));
    }
    els.highlight.setAttribute("x1", String(x1 + hx));
    els.highlight.setAttribute("y1", String(y1 + hy));
    els.highlight.setAttribute("x2", String(x2 + hx));
    els.highlight.setAttribute("y2", String(y2 + hy));
    for (const el of [els.socketA, els.ringA, els.plugA, els.pinA]) {
      el.setAttribute("cx", String(x1));
      el.setAttribute("cy", String(y1));
    }
    for (const el of [els.socketB, els.ringB, els.plugB, els.pinB]) {
      el.setAttribute("cx", String(x2));
      el.setAttribute("cy", String(y2));
    }
  }

  function applyZapPending(els: CableEls): void {
    els.line.setAttribute("stroke", "#a4ffe8");
    els.outline.setAttribute("stroke", "#2d3449");
    els.highlight.setAttribute("stroke", "#ffffff");
    els.plugA.setAttribute("fill", "#a4ffe8");
    els.plugB.setAttribute("fill", "#a4ffe8");
    els.ringA.setAttribute("stroke", "#a4ffe8");
    els.ringB.setAttribute("stroke", "#a4ffe8");
    els.line.setAttribute("stroke-dasharray", "10 6");
    els.outline.setAttribute("stroke-dasharray", "10 6");
    els.highlight.setAttribute("stroke-dasharray", "4 8");
    els.braid.setAttribute("stroke-dasharray", "4 8");
    els.energy.classList.remove("cable-energy");
    els.hit.style.pointerEvents = "none";
  }

  function spark(els: CableEls): void {
    const s = svgEl(NS, "line", {
      x1: els.line.getAttribute("x1")!, y1: els.line.getAttribute("y1")!,
      x2: els.line.getAttribute("x2")!, y2: els.line.getAttribute("y2")!,
      stroke: "#ffffff", "stroke-width": "12", "stroke-linecap": "round", opacity: "1",
    });
    s.style.transition = "opacity 220ms ease";
    svg.appendChild(s);
    requestAnimationFrame(() => s.setAttribute("opacity", "0"));
    window.setTimeout(() => s.remove(), 260);
  }

  function flashRed(els: CableEls): void {
    const f = svgEl(NS, "line", {
      x1: els.line.getAttribute("x1")!, y1: els.line.getAttribute("y1")!,
      x2: els.line.getAttribute("x2")!, y2: els.line.getAttribute("y2")!,
      stroke: "#ff5252", "stroke-width": "16", "stroke-linecap": "round", opacity: "1",
    });
    f.style.transition = "opacity 300ms ease";
    svg.appendChild(f);
    requestAnimationFrame(() => f.setAttribute("opacity", "0"));
    window.setTimeout(() => f.remove(), 340);
  }

  function renderCables(cables: Cable[], lastCut: { id: string; ok: boolean } | null): void {
    const total = Math.max(cables.length, 1);
    const byLabel = new Map(cables.map((c) => [c.label, c] as const));
    newGs.length = 0;
    for (const [label, els] of cableEls) {
      const c = byLabel.get(label);
      if (!c || c.cut) {
        const wasPending = pendingCuts.delete(label);
        if (c && c.cut && wasPending) playZap();
        els.g.remove();
        cableEls.delete(label);
        continue;
      }
      const pending = pendingCuts.get(label);
      if (pending) {
        if (lastCut && lastCut.id === pending.id && !lastCut.ok) {
          pendingCuts.delete(label);
          playWrong();
          flashRed(els);
          shake(els.g);
        } else {
          continue;
        }
      }
      els.hit.style.pointerEvents = "stroke";
      els.line.removeAttribute("stroke-dasharray");
      els.outline.removeAttribute("stroke-dasharray");
      els.highlight.removeAttribute("stroke-dasharray");
      els.braid.removeAttribute("stroke-dasharray");
      els.line.setAttribute("stroke", hex(c.color));
      els.outline.setAttribute("stroke", "#000000");
      els.highlight.setAttribute("stroke", "#ffffff");
      els.plugA.setAttribute("fill", hex(c.color));
      els.plugB.setAttribute("fill", hex(c.color));
      els.ringA.setAttribute("stroke", "#9aa4c0");
      els.ringB.setAttribute("stroke", "#9aa4c0");
      els.line.setAttribute("stroke-width", "11");
      els.outline.setAttribute("stroke-width", "15");
      els.energy.classList.add("cable-energy");
      els.g.setAttribute("style", "opacity:1;transition:none;");
      els.g.classList.remove("cable-glow");
      els.row = c.row;
      els.toRow = c.toRow;
      placeCable(els, total);
    }
    for (const c of cables) {
      if (c.cut) continue;
      if (cableEls.has(c.label)) continue;
      const g = svgEl(NS, "g", {});
      const x1 = TERMINAL_X_R;
      const x2 = VIEW_W - TERMINAL_X_R;
      const col = hex(c.color);

      const socketA = svgEl(NS, "ellipse", { cx: "0", cy: "0", rx: "15", ry: "22", fill: "#0a1320", stroke: "#000000", "stroke-width": "3" });
      const socketB = svgEl(NS, "ellipse", { cx: "0", cy: "0", rx: "15", ry: "22", fill: "#0a1320", stroke: "#000000", "stroke-width": "3" });
      const outline = svgEl(NS, "line", { x1: String(x1), y1: "0", x2: String(x2), y2: "0", stroke: "#000000", "stroke-width": "15", "stroke-linecap": "round" });
      const line = svgEl(NS, "line", { x1: String(x1), y1: "0", x2: String(x2), y2: "0", stroke: col, "stroke-width": "11", "stroke-linecap": "round" });
      const highlight = svgEl(NS, "line", { x1: String(x1), y1: "0", x2: String(x2), y2: "0", stroke: "#ffffff", "stroke-width": "2.5", "stroke-linecap": "round", opacity: "0.5" });
      const braid = svgEl(NS, "line", { x1: String(x1), y1: "0", x2: String(x2), y2: "0", stroke: "#ffffff", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-dasharray": "3 10", opacity: "0.3" });
      const energy = svgEl(NS, "line", { x1: String(x1), y1: "0", x2: String(x2), y2: "0", stroke: "#eafffb", "stroke-width": "4", "stroke-linecap": "round", "stroke-dasharray": "18 44", opacity: "0.6" });
      energy.classList.add("cable-energy");
      const ringA = svgEl(NS, "circle", { cx: "0", cy: "0", r: "16", fill: "none", stroke: "#9aa4c0", "stroke-width": "3" });
      const plugA = svgEl(NS, "circle", { cx: "0", cy: "0", r: "12.5", fill: col, stroke: "#000000", "stroke-width": "3" });
      const pinA = svgEl(NS, "circle", { cx: "0", cy: "0", r: "4", fill: "#e5e5e5", stroke: "#000000", "stroke-width": "2" });
      const ringB = svgEl(NS, "circle", { cx: "0", cy: "0", r: "16", fill: "none", stroke: "#9aa4c0", "stroke-width": "3" });
      const plugB = svgEl(NS, "circle", { cx: "0", cy: "0", r: "12.5", fill: col, stroke: "#000000", "stroke-width": "3" });
      const pinB = svgEl(NS, "circle", { cx: "0", cy: "0", r: "4", fill: "#e5e5e5", stroke: "#000000", "stroke-width": "2" });
      const hit = svgEl(NS, "line", { x1: String(x1), y1: "0", x2: String(x2), y2: "0", stroke: "transparent", "stroke-width": "26", "stroke-linecap": "round" });

      line.classList.add("cable-line");
      outline.classList.add("cable-line");
      hit.classList.add("cursor-scissors");
      hit.style.pointerEvents = "stroke";
      g.append(socketA, socketB, outline, line, highlight, braid, energy, ringA, plugA, pinA, ringB, plugB, pinB, hit);

      const els: CableEls = {
        g, outline, line, highlight, braid, energy,
        socketA, socketB, ringA, ringB, plugA, plugB, pinA, pinB, hit,
        row: c.row, toRow: c.toRow,
      };
      placeCable(els, total);

      hit.addEventListener("pointerenter", () => {
        els.line.setAttribute("stroke-width", "13");
        els.outline.setAttribute("stroke-width", "17");
        g.classList.add("cable-glow");
      });
      hit.addEventListener("pointerleave", () => {
        els.line.setAttribute("stroke-width", "11");
        els.outline.setAttribute("stroke-width", "15");
        g.classList.remove("cable-glow");
      });
      hit.addEventListener("pointerdown", () => {
        playCut();
        const cutId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        pendingCuts.set(c.label, { id: cutId, at: Date.now() });
        applyZapPending(els);
        spark(els);
        shock(els.g);
        burst(els.line, "#eafffb", 8);
        window.setTimeout(() => {
          if (pendingCuts.has(c.label)) pendingCuts.delete(c.label);
        }, PENDING_CUT_MS);
        void client.sendCut(c.label, cutId).catch(() => undefined);
      });

      svg.appendChild(g);
      cableEls.set(c.label, els);
      newGs.push(g);
    }
    fadeScale(newGs);
  }

  const cursors = new Map<string, { x: number; y: number; name: string }>();
  const cursorEls = new Map<string, { dot: HTMLElement; label: HTMLElement }>();

  function renderCursors(): void {
    for (const [userId, c] of cursors) {
      let el = cursorEls.get(userId);
      if (!el) {
        const dot = document.createElement("div");
        dot.className = "cursor-dot";
        const label = document.createElement("div");
        label.className = "cursor-name";
        cursorLayer.append(dot, label);
        el = { dot, label };
        cursorEls.set(userId, el);
      }
      const member = client.getPlayers().find((p) => p.id === userId);
      const color = member?.color ?? `#${nameColor(c.name).toString(16).padStart(6, "0")}`;
      el.dot.style.left = `${c.x * 100}%`;
      el.dot.style.top = `${c.y * 100}%`;
      el.dot.style.background = color;
      el.label.style.left = `${c.x * 100}%`;
      el.label.style.top = `${c.y * 100}%`;
      el.label.style.background = color;
      el.label.textContent = c.name;
    }
    for (const [userId, el] of cursorEls) {
      if (cursors.has(userId)) continue;
      el.dot.remove();
      el.label.remove();
      cursorEls.delete(userId);
    }
  }

  const selfId = client.getSelfId();
  let lastCursorSend = 0;
  let lastCursorX = -1;
  let lastCursorY = -1;
  svg.addEventListener("pointermove", (e) => {
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const moved =
      Math.abs(x - lastCursorX) > CURSOR_MOVE_EPS || Math.abs(y - lastCursorY) > CURSOR_MOVE_EPS;
    const now = performance.now();
    if (moved && now - lastCursorSend >= CURSOR_THROTTLE_MS) {
      lastCursorSend = now;
      lastCursorX = x;
      lastCursorY = y;
      client.sendCursor(x, y, selfName, selfId);
    }
  });

  function applyEffects(effects: StateEffect[]): void {
    const now = Date.now();
    const active = effects.filter((e) => e.expiresAt > now);
    const frozen = active.some((e) => e.kind === "freeze" && e.userId === selfId);
    const blind = active.some((e) => e.kind === "blind");
    const lockCut = active.some((e) => e.kind === "lockCut");

    freezeOverlay.classList.toggle("visible", frozen);
    blindOverlay.classList.toggle("visible", blind);
    lockCutOverlay.classList.toggle("visible", lockCut);

    const interactive = !frozen && !lockCut;
    svg.style.pointerEvents = interactive ? "auto" : "none";
    for (const els of cableEls.values()) {
      els.hit.style.pointerEvents = interactive ? "stroke" : "none";
    }
  }

  const unsubState = client.subscribeState((s) => {
    if (!s) return;
    if (s.cables.length) renderCables(s.cables, s.lastCut ?? null);
    applyEffects(s.effects ?? []);
  });

  const unsubCursor = client.subscribeCursor((c) => {
    if (c.userId === selfId) return;
    cursors.set(c.userId, { x: c.x, y: c.y, name: c.name });
    renderCursors();
  });

  return () => {
    unsubState();
    unsubCursor();
    wrap.remove();
  };
}
