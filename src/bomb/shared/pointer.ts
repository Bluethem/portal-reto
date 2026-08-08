import * as THREE from "three";

export interface PickOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  targets: THREE.Object3D[];
  onHit: (target: THREE.Object3D) => void;
}

export function attachPick(options: PickOptions): () => void {
  const { canvas, camera, targets, onHit } = options;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function onPointerDown(e: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(targets, true)[0]?.object;
    if (hit) onHit(hit);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  return () => canvas.removeEventListener("pointerdown", onPointerDown);
}
