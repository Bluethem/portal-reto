import * as THREE from "three";
import type { BombModule } from "../../shared/types";
import { roleColor } from "../../shared/colors";
import { attachPick } from "../../shared/pointer";
import { flash } from "../../shared/flash";
import type { ValveAttempt } from "./types";

const SAFE_WINDOW = 0.18;
const SWEEP_TIME = 1800;

const valveModule: BombModule = {
  id: 4,
  title: "Válvula",
  instructions: "Sostén el botón y suelta cuando el indicador esté en la zona segura para desactivar el módulo.",
  create(ctx) {
    const group = new THREE.Group();
    const color = roleColor(ctx.client.getRole());
    const base = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });

    const track = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.06, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x39404d })
    );
    track.position.set(0, 0.9, 1.5);
    group.add(track);

    const safeOffset = Math.random() * 1.4 - 0.7;
    const safe = new THREE.Mesh(
      new THREE.BoxGeometry(SAFE_WINDOW * 2.4, 0.12, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x4ade80, emissiveIntensity: 0.5 })
    );
    safe.position.set(safeOffset, 0.9, 1.55);
    group.add(safe);

    const indicator = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.24, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 })
    );
    indicator.position.set(0, 0.9, 1.6);
    group.add(indicator);

    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.3, 24), base.clone());
    button.position.set(0, -0.6, 1.5);
    group.add(button);

    ctx.scene.mount(4, group);

    let t = 0;
    let holding = false;
    let heldStart = 0;
    let defused = false;
    let raf = 0;
    let animating = true;

    function sweep(): void {
      const progress = (t / SWEEP_TIME) % 1;
      indicator.position.x = Math.cos(progress * Math.PI * 2);
      t += 16;
      if (animating) raf = requestAnimationFrame(sweep);
    }
    raf = requestAnimationFrame(sweep);

    function inSafe(): boolean {
      return Math.abs(indicator.position.x - safeOffset) < (SAFE_WINDOW * 2.4) / 2;
    }

    const detach = attachPick({
      canvas: ctx.scene.getCanvas(),
      camera: ctx.scene.getCamera(),
      targets: [button],
      onHit: () => {
        if (defused) return;
        holding = true;
        heldStart = performance.now();
        button.position.y = -0.68;
      },
    });

    function onUp(): void {
      if (!holding) return;
      holding = false;
      button.position.y = -0.6;
      const heldMs = performance.now() - heldStart;
      if (inSafe()) {
        defused = true;
        void ctx.client.sendAttempt(4, { heldMs, solved: true } satisfies ValveAttempt);
      } else {
        flash(indicator);
        void ctx.client.sendAttempt(4, { heldMs, solved: false } satisfies ValveAttempt);
      }
    }
    window.addEventListener("pointerup", onUp);

    const unsub = ctx.client.subscribeBomb((state) => {
      const mod = state?.modules.find((m) => m.id === 4);
      group.visible = mod?.unlocked ?? false;
      if (mod?.defused) defused = true;
    });

    return () => {
      unsub();
      detach();
      animating = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerup", onUp);
      ctx.scene.unmount(4);
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      });
    };
  },
};

export default valveModule;
