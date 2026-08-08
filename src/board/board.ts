import * as THREE from "three";
import type { RoomClient } from "../portal/client";
import type { Cable } from "../portal/types";
import { initScene } from "./setup";

export function mountBoard(container: HTMLElement, client: RoomClient, selfName: string): () => void {
  const canvas = document.createElement("canvas");
  canvas.width = 700;
  canvas.height = 420;
  container.appendChild(canvas);

  const scene = initScene(canvas);
  const cableMeshes = new Map<string, THREE.Mesh>();
  const labelSprites = new Map<string, THREE.Sprite>();
  const cursorLayer = document.createElement("div");
  cursorLayer.className = "cursor-layer";
  container.appendChild(cursorLayer);

  const nameColors = new Map<string, number>();
  const palette = [0x22c55e, 0xf97316, 0x8b5cf6, 0x14b8a6];

  function nameColor(id: string): number {
    if (!nameColors.has(id)) {
      nameColors.set(id, palette[nameColors.size % palette.length]);
    }
    return nameColors.get(id)!;
  }

  function makeLabelSprite(label: string): THREE.Sprite {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.font = "bold 40px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#0b0e14";
      ctx.beginPath();
      ctx.arc(32, 32, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e6e9f0";
      ctx.fillText(label, 32, 34);
    }
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(0.28, 0.28, 1);
    return sprite;
  }

  function renderCables(cables: Cable[]): void {
    for (const mesh of cableMeshes.values()) scene.remove(mesh);
    for (const sprite of labelSprites.values()) scene.remove(sprite);
    cableMeshes.clear();
    labelSprites.clear();
    for (const c of cables) {
      const mat = new THREE.MeshStandardMaterial({
        color: c.color,
        emissive: c.color,
        emissiveIntensity: 0.35,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.6, 10), mat);
      mesh.position.set(...c.position);
      mesh.rotation.set(...c.rotation);
      mesh.userData.label = c.label;
      scene.add(mesh);
      cableMeshes.set(c.label, mesh);
      const sprite = makeLabelSprite(c.label);
      sprite.position.set(...c.position);
      sprite.position.y += 0.95;
      scene.add(sprite, false);
      labelSprites.set(c.label, sprite);
    }
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

  const selfId = client.getSelfId();

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    players.set(selfName, { x, y, name: selfName });
    renderCursors();
    client.sendCursor(x, y, selfName);
  });

  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const ndc = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    };
    const hit = scene.raycast(ndc);
    const label = hit?.userData.label as string | undefined;
    if (label) void client.sendCut(label);
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
    canvas.remove();
    cursorLayer.remove();
    scene.dispose();
  };
}
