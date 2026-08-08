import * as THREE from "three";
import type { BombModule } from "../../shared/types";
import { attachPick } from "../../shared/pointer";
import { flash } from "../../shared/flash";
import type { SymbolsAttempt } from "./types";

const PAD_COLORS = [0xff4d4d, 0x4dd2ff, 0xffd34d, 0x6bff6b];

const symbolsModule: BombModule = {
  id: 2,
  title: "Símbolos",
  instructions: "Repite la secuencia de símbolos que flashea para desactivar el módulo.",
  create(ctx) {
    const group = new THREE.Group();

    const pads: THREE.Mesh[] = [];
    const mats: THREE.MeshStandardMaterial[] = [];
    const positions: [number, number, number][] = [
      [-0.9, 0.9, 1.6],
      [0.9, 0.9, 1.6],
      [-0.9, -0.3, 1.6],
      [0.9, -0.3, 1.6],
    ];
    for (let i = 0; i < positions.length; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: PAD_COLORS[i],
        emissive: PAD_COLORS[i],
        emissiveIntensity: 0.25,
      });
      mats.push(mat);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), mat);
      mesh.position.set(...positions[i]);
      mesh.userData.pad = i;
      pads.push(mesh);
      group.add(mesh);
    }
    ctx.scene.mount(2, group);

    const sequence = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4));
    const labels = ["A", "B", "C", "D"];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let step = 0;
    let playing = false;
    let defused = false;
    let unlocked = false;

    function light(index: number, on: boolean): void {
      mats[index].emissiveIntensity = on ? 1.2 : 0.25;
    }

    function playSequence(): void {
      if (playing || defused || !unlocked) return;
      playing = true;
      sequence.forEach((idx, i) => {
        timers.push(setTimeout(() => {
          light(idx, true);
          timers.push(setTimeout(() => {
            light(idx, false);
            if (i === sequence.length - 1) {
              playing = false;
              step = 0;
            }
          }, 300));
        }, i * 500));
      });
    }

    const detach = attachPick({
      canvas: ctx.scene.getCanvas(),
      camera: ctx.scene.getCamera(),
      targets: pads,
      onHit: (target) => {
        if (playing || defused || !unlocked) return;
        const i = target.userData.pad as number;
        light(i, true);
        setTimeout(() => light(i, false), 250);
        if (i !== sequence[step]) {
          flash(pads[i]);
          void ctx.client.sendAttempt(2, { sequence: [], solved: false } satisfies SymbolsAttempt);
          step = 0;
          timers.push(setTimeout(() => playSequence(), 800));
          return;
        }
        step++;
        if (step === sequence.length) {
          defused = true;
          void ctx.client.sendAttempt(2, { sequence: sequence.map((n) => labels[n]), solved: true } satisfies SymbolsAttempt);
        }
      },
    });

    const unsub = ctx.client.subscribeBomb((state) => {
      const mod = state?.modules.find((m) => m.id === 2);
      const isUnlocked = mod?.unlocked ?? false;
      const wasLocked = !unlocked;
      unlocked = isUnlocked;
      if (isUnlocked && wasLocked) playSequence();
      group.visible = isUnlocked;
      if (mod?.defused) defused = true;
    });

    return () => {
      timers.forEach(clearTimeout);
      unsub();
      detach();
      ctx.scene.unmount(2);
      pads.forEach((p) => {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      });
    };
  },
};

export default symbolsModule;
