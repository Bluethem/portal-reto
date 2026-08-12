import { animate, stagger } from "animejs";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function staggerIn(targets: HTMLElement[], opts?: { duration?: number; delay?: number }): void {
  if (reducedMotion) return;
  animate(targets, {
    opacity: [0, 1],
    translateY: [28, 0],
    scale: [0.96, 1],
    duration: opts?.duration ?? 520,
    delay: stagger(opts?.delay ?? 90),
    ease: "outExpo",
  });
}

export function pop(el: HTMLElement, scale = 1.12): void {
  if (reducedMotion) return;
  animate(el, {
    scale: [1, scale, 1],
    duration: 400,
    ease: "outQuart",
  });
}

export function slidePanel(el: HTMLElement, fromX: number): void {
  if (reducedMotion) return;
  animate(el, {
    translateX: [fromX, 0],
    opacity: [0, 1],
    duration: 540,
    ease: "outExpo",
  });
}

export function chatIn(rows: HTMLElement[]): void {
  if (reducedMotion || rows.length === 0) return;
  animate(rows, {
    opacity: [0, 1],
    translateY: [6, 0],
    duration: 240,
    delay: stagger(24),
    ease: "outExpo",
  });
}

export function fadeScale(els: Element[], opts?: { duration?: number; delay?: number }): void {
  if (reducedMotion || els.length === 0) return;
  animate(els, {
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: opts?.duration ?? 460,
    delay: stagger(opts?.delay ?? 45),
    ease: "outExpo",
  });
}

export function shock(el: Element, scale = 1.07): void {
  if (reducedMotion) return;
  animate(el, {
    scale: [1, scale, 1],
    duration: 240,
    ease: "outQuart",
  });
}

export function shake(el: Element): void {
  if (reducedMotion) return;
  animate(el, {
    translateX: [-4, 4, -3, 3, 0],
    duration: 260,
    ease: "outQuart",
  });
}

export function burst(el: Element, color: string, count = 10): void {
  if (reducedMotion) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:120;";
  document.body.appendChild(host);
  const parts: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const size = 6 + Math.random() * 8;
    p.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${color};border:2px solid #000000;left:${cx}px;top:${cy}px;`;
    parts.push(p);
    host.appendChild(p);
  }
  animate(parts, {
    translateX: () => (Math.random() - 0.5) * 160,
    translateY: () => (Math.random() - 0.5) * 160,
    opacity: [1, 0],
    scale: [1, 0.2],
    duration: 720,
    ease: "outExpo",
    delay: stagger(18),
  });
  window.setTimeout(() => host.remove(), 920);
}
