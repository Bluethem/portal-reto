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
        els.hit.setAttribute("pointer-events", "none");
        els.g.setAttribute("style", "transition:opacity 600ms ease 250ms;opacity:0;");
        if (!c) els.g.remove();
        continue;
      }
      const y = rowY(c.row, total);
      els.hit.setAttribute("pointer-events", "stroke");
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
      const badge = svgEl(NS, "circle", { cx: String(VIEW_W / 2), cy: String(y), r: "16", fill: "#0b0e14", stroke: hex(c.color), "stroke-width": "3", style: "pointer-events:none;" });
      const text = svgEl(NS, "text", { x: String(VIEW_W / 2), y: String(y + 6), "text-anchor": "middle", "font-size": "18", "font-weight": "700", fill: "#e6e9f0", "font-family": "system-ui, sans-serif", style: "pointer-events:none;" });
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
