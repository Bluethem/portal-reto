import * as THREE from "three";
import type { BombModule } from "../../shared/types";
import { attachPick } from "../../shared/pointer";
import { flash } from "../../shared/flash";
import type { WiresAttempt } from "./types";

const WIRE_COLORS = [0xff4d4d, 0x4dd2ff, 0xffd34d, 0x6bff6b, 0xcccccc];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const wiresModule: BombModule = {
  id: 1,
  title: "Cables",
  instructions: "Corta los cables en el orden correcto para desactivar el módulo.",
  create(ctx) {
    const group = new THREE.Group();

    const count = 5;
    const order = shuffle(Array.from({ length: count }, (_, i) => i));
    const cables: THREE.Mesh[] = [];
    const mats: THREE.MeshStandardMaterial[] = [];
    const rafs: number[] = [];

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: WIRE_COLORS[i % WIRE_COLORS.length],
        emissive: WIRE_COLORS[i % WIRE_COLORS.length],
        emissiveIntensity: 0.25,
      });
      mats.push(mat);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), mat);
      const x = (i - (count - 1) / 2) * 0.6;
      mesh.position.set(x, 0.2, 0.6);
      mesh.rotation.z = Math.PI / 2;
      mesh.userData.cable = i;
      cables.push(mesh);
      group.add(mesh);
    }
    ctx.scene.mount(1, group);

    let next = 0;
    let defused = false;

    function cutCable(mesh: THREE.Mesh, mat: THREE.MeshStandardMaterial): void {
      const start = performance.now();
      const dur = 220;
      const orig = mesh.scale.y;
      const step = (now: number): void => {
        const t = Math.min(1, (now - start) / dur);
        mesh.scale.y = orig * (1 - t);
        if (t < 1) rafs.push(requestAnimationFrame(step));
      };
      mat.emissiveIntensity = 0;
      rafs.push(requestAnimationFrame(step));
    }

    const detach = attachPick({
      canvas: ctx.scene.getCanvas(),
      camera: ctx.scene.getCamera(),
      targets: cables,
      onHit: (target) => {
        if (defused) return;
        const i = target.userData.cable as number;
        if (i !== order[next]) {
          flash(cables[i]);
          void ctx.client.sendAttempt(1, { order: [], solved: false } satisfies WiresAttempt);
          return;
        }
        cutCable(cables[i], mats[i]);
        next++;
        if (next === count) {
          defused = true;
          void ctx.client.sendAttempt(1, { order, solved: true } satisfies WiresAttempt);
        }
      },
    });

    const unsub = ctx.client.subscribeBomb((state) => {
      const mod = state?.modules.find((m) => m.id === 1);
      group.visible = mod?.unlocked ?? false;
      if (mod?.defused) defused = true;
    });

    return () => {
      unsub();
      detach();
      rafs.forEach(cancelAnimationFrame);
      ctx.scene.unmount(1);
      cables.forEach((c) => {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      });
    };
  },
};

export default wiresModule;
