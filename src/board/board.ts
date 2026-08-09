import type { RoomClient } from "../portal/client";
import type { Cable, StateEffect } from "../portal/types";

const VIEW_W = 800;
const VIEW_H = 460;
const PANEL_W = 90;
const PANEL_X = 46;
const PANEL_Y = 26;
const PANEL_H = VIEW_H - PANEL_Y * 2;
const TERMINAL_X_R = PANEL_X + PANEL_W;
const CURSOR_THROTTLE_MS = 120;
const CURSOR_MOVE_EPS = 0.004;
const PENDING_CUT_MS = 1500;

interface CableEls {
  g: SVGGElement;
  line: SVGLineElement;
  stripe: SVGLineElement;
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
  const svg = svgEl(NS, "svg", { viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, width: "100%", height: "100%", style: "display:block;background:#0b0e14;border-radius:16px;border:1px solid #2a2f3a;box-shadow:0 12px 32px rgb(0 0 0 / 0.14);" });

  const panelL = svgEl(NS, "rect", { x: String(PANEL_X), y: String(PANEL_Y), width: String(PANEL_W), height: String(PANEL_H), rx: "12", fill: "#1a1f2b", stroke: "#2a2f3a" });
  const panelR = svgEl(NS, "rect", { x: String(VIEW_W - PANEL_X - PANEL_W), y: String(PANEL_Y), width: String(PANEL_W), height: String(PANEL_H), rx: "12", fill: "#1a1f2b", stroke: "#2a2f3a" });
  svg.append(panelL, panelR);

  const cableEls = new Map<string, CableEls>();
  const pendingCuts = new Set<string>();
  const cursorLayer = document.createElement("div");
  cursorLayer.className = "cursor-layer";
  const freezeOverlay = document.createElement("div");
  freezeOverlay.className = "effect-overlay effect-freeze";
  freezeOverlay.textContent = "CONGELADO";
  const blindOverlay = document.createElement("div");
  blindOverlay.className = "effect-overlay effect-blind";
  const effectLayer = document.createElement("div");
  effectLayer.className = "effect-layer";
  effectLayer.append(freezeOverlay, blindOverlay);
  wrap.append(svg, cursorLayer, effectLayer);
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

  function placeCable(els: CableEls, total: number): void {
    const x1 = TERMINAL_X_R;
    const x2 = VIEW_W - TERMINAL_X_R;
    const y1 = rowY(els.row, total);
    const y2 = rowY(els.toRow, total);
    for (const el of [els.line, els.stripe, els.hit]) {
      el.setAttribute("x1", String(x1));
      el.setAttribute("y1", String(y1));
      el.setAttribute("x2", String(x2));
      el.setAttribute("y2", String(y2));
    }
  }

  function applyCutLook(els: CableEls): void {
    els.line.setAttribute("stroke", "#ff5252");
    els.stripe.setAttribute("stroke", "#ff5252");
    els.line.setAttribute("stroke-dasharray", "10 6");
    els.hit.style.pointerEvents = "none";
    els.g.setAttribute("style", "transition:opacity 600ms ease 300ms;opacity:0;");
  }

  function renderCables(cables: Cable[]): void {
    const total = Math.max(cables.length, 1);
    const byLabel = new Map(cables.map((c) => [c.label, c] as const));
    for (const [label, els] of cableEls) {
      const c = byLabel.get(label);
      const isCut = c ? c.cut || pendingCuts.has(c.label) : true;
      if (!c || isCut) {
        els.line.setAttribute("stroke-dasharray", "10 6");
        els.hit.style.pointerEvents = "none";
        els.g.setAttribute("style", "transition:opacity 600ms ease 250ms;opacity:0;");
        if (!c) els.g.remove();
        if (c && c.cut) pendingCuts.delete(c.label);
        continue;
      }
      els.hit.style.pointerEvents = "stroke";
      els.line.removeAttribute("stroke-dasharray");
      els.line.setAttribute("stroke", hex(c.color));
      els.g.setAttribute("style", "opacity:1;transition:none;");
      els.row = c.row;
      els.toRow = c.toRow;
      placeCable(els, total);
    }
    for (const c of cables) {
      if (c.cut) continue;
      if (cableEls.has(c.label)) continue;
      const g = svgEl(NS, "g", {});
      const line = svgEl(NS, "line", {
        x1: String(TERMINAL_X_R), y1: "0",
        x2: String(VIEW_W - TERMINAL_X_R), y2: "0",
        stroke: hex(c.color), "stroke-width": "10", "stroke-linecap": "round",
      });
      const stripe = svgEl(NS, "line", {
        x1: String(TERMINAL_X_R), y1: "0",
        x2: String(VIEW_W - TERMINAL_X_R), y2: "0",
        stroke: "#ffffff", "stroke-width": "2", "stroke-linecap": "round",
        "stroke-dasharray": "2 14", opacity: "0.35",
      });
      const hit = svgEl(NS, "line", {
        x1: String(TERMINAL_X_R), y1: "0",
        x2: String(VIEW_W - TERMINAL_X_R), y2: "0",
        stroke: "transparent", "stroke-width": "26", "stroke-linecap": "round",
        style: "cursor:pointer;",
      });
      hit.style.pointerEvents = "stroke";
      g.append(line, stripe, hit);

      const els: CableEls = { g, line, stripe, hit, row: c.row, toRow: c.toRow };
      placeCable(els, total);

      hit.addEventListener("pointerdown", () => {
        pendingCuts.add(c.label);
        applyCutLook(els);
        window.setTimeout(() => {
          if (pendingCuts.has(c.label)) pendingCuts.delete(c.label);
        }, PENDING_CUT_MS);
        void client.sendCut(c.label).catch(() => undefined);
      });

      svg.appendChild(g);
      cableEls.set(c.label, els);
    }
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
      const color = `#${nameColor(c.name).toString(16).padStart(6, "0")}`;
      el.dot.style.left = `${c.x * 100}%`;
      el.dot.style.top = `${c.y * 100}%`;
      el.dot.style.borderColor = color;
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

    const interactive = !frozen && !lockCut;
    svg.style.pointerEvents = interactive ? "auto" : "none";
    for (const els of cableEls.values()) {
      els.hit.style.pointerEvents = interactive ? "stroke" : "none";
    }
  }

  const unsubState = client.subscribeState((s) => {
    if (!s) return;
    if (s.cables.length) renderCables(s.cables);
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
