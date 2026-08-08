import { connectBomb } from "./portal/client";
import { initScene } from "./scene/setup";
import { mountManual } from "./manual/manual";
import wiresModule from "./modules/wires";
import symbolsModule from "./modules/symbols";
import keypadModule from "./modules/keypad";
import valveModule from "./modules/valve";
import type { BombModule } from "./shared/types";
import type { Role } from "./portal/types";

const MODULES: Record<Role, BombModule> = {
  1: wiresModule,
  2: symbolsModule,
  3: keypadModule,
  4: valveModule,
};

export interface BombBootOptions {
  canvas: HTMLCanvasElement;
  manual: HTMLElement;
}

export function bootBomb(options: BombBootOptions): void {
  const client = connectBomb();
  const scene = initScene(options.canvas);

  let cleanup: (() => void) | null = null;
  let mountedRole: Role | null = null;

  function mountFor(role: Role | null): void {
    if (role === mountedRole) return;
    cleanup?.();
    cleanup = null;
    mountedRole = role;
    if (role === null) {
      mountManual(options.manual, null);
      return;
    }
    const mod = MODULES[role];
    mountManual(options.manual, mod);
    cleanup = mod.create({ scene, client });
  }

  const unsubRole = client.subscribeRole(mountFor);

  window.addEventListener("beforeunload", () => {
    unsubRole();
    cleanup?.();
    scene.dispose();
  });
}
