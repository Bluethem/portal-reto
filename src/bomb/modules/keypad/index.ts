import * as THREE from "three";
import type { BombModule } from "../../shared/types";
import { roleColor } from "../../shared/colors";
import { attachPick } from "../../shared/pointer";
import { flash } from "../../shared/flash";
import type { KeypadAttempt } from "./types";

const CODE_LENGTH = 4;
const LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "OK"];

const keypadModule: BombModule = {
  id: 3,
  title: "Teclado",
  instructions: "Ingresa el código de 4 dígitos en el teclado para desactivar el módulo.",
  create(ctx) {
    const group = new THREE.Group();
    const color = roleColor(ctx.client.getRole());
    const base = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.2, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.5 })
    );
    panel.position.set(0, 0.3, 1.3);
    group.add(panel);

    const keys: THREE.Mesh[] = [];
    const keyMats: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < 12; i++) {
      const x = -0.85 + (i % 3) * 0.85;
      const y = 0.75 - Math.floor(i / 3) * 0.7;
      const mat = base.clone();
      keyMats.push(mat);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.1), mat);
      mesh.position.set(x, y, 1.42);
      mesh.userData.key = i;
      keys.push(mesh);
      group.add(mesh);
    }

    const cells: THREE.Mesh[] = [];
    for (let i = 0; i < CODE_LENGTH; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0d1117,
        emissive: 0x4ade80,
        emissiveIntensity: 0,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.08), mat);
      mesh.position.set(-0.6 + i * 0.4, 1.05, 1.45);
      cells.push(mesh);
      group.add(mesh);
    }
    ctx.scene.mount(3, group);

    const code = Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * 10)).join("");
    let typed = "";
    let defused = false;

    function setCells(): void {
      cells.forEach((cell, i) => {
        (cell.material as THREE.MeshStandardMaterial).emissiveIntensity = i < typed.length ? 0.8 : 0;
      });
    }

    const detach = attachPick({
      canvas: ctx.scene.getCanvas(),
      camera: ctx.scene.getCamera(),
      targets: keys,
      onHit: (target) => {
        if (defused) return;
        const i = target.userData.key as number;
        const label = LABELS[i];
        if (label === "CLR") {
          typed = "";
          setCells();
          return;
        }
        if (label === "OK") {
          if (typed === code) {
            defused = true;
            void ctx.client.sendAttempt(3, { code, solved: true } satisfies KeypadAttempt);
          } else {
            flash(group);
            void ctx.client.sendAttempt(3, { code: typed, solved: false } satisfies KeypadAttempt);
            typed = "";
            setCells();
          }
          return;
        }
        if (typed.length < CODE_LENGTH) {
          typed += label;
          setCells();
        }
      },
    });

    const unsub = ctx.client.subscribeBomb((state) => {
      const mod = state?.modules.find((m) => m.id === 3);
      group.visible = mod?.unlocked ?? false;
      if (mod?.defused) defused = true;
    });

    return () => {
      unsub();
      detach();
      ctx.scene.unmount(3);
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      });
    };
  },
};

export default keypadModule;
