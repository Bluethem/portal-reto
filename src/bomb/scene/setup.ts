import * as THREE from "three";
import type { ModuleId } from "../portal/types";
import { BOMB_COLOR, CORE_COLOR, GLOW_COLOR } from "../shared/colors";

export interface SceneHandle {
  mount(moduleId: ModuleId, group: THREE.Object3D): void;
  unmount(moduleId: ModuleId): void;
  getCanvas(): HTMLCanvasElement;
  getCamera(): THREE.Camera;
  dispose(): void;
}

export function initScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e14);

  const camera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.2, 7.5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.PointLight(0xfff2d9, 2.2, 30);
  key.position.set(3, 5, 6);
  scene.add(key);
  const fill = new THREE.PointLight(0x4466ff, 1.2, 20);
  fill.position.set(-4, -2, 3);
  scene.add(fill);

  const bomb = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 48, 32),
    new THREE.MeshStandardMaterial({ color: BOMB_COLOR, roughness: 0.35, metalness: 0.6 })
  );
  body.castShadow = true;
  bomb.add(body);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(1.42, 1.42, 0.22, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x39404d, metalness: 0.8, roughness: 0.3 })
  );
  band.rotation.z = Math.PI / 2;
  bomb.add(band);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 16),
    new THREE.MeshStandardMaterial({
      color: CORE_COLOR,
      emissive: GLOW_COLOR,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    })
  );
  bomb.add(core);

  scene.add(bomb);

  const moduleGroups = new Map<ModuleId, THREE.Object3D>();

  const handle: SceneHandle = {
    mount(moduleId, group) {
      const existing = moduleGroups.get(moduleId);
      if (existing) scene.remove(existing);
      moduleGroups.set(moduleId, group);
      scene.add(group);
    },
    unmount(moduleId) {
      const group = moduleGroups.get(moduleId);
      if (!group) return;
      scene.remove(group);
      moduleGroups.delete(moduleId);
    },
    getCanvas: () => canvas,
    getCamera: () => camera,
    dispose() {
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material;
        if (mat) {
          (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
        }
      });
    },
  };

  const start = performance.now();
  let raf = 0;

  function animate(): void {
    raf = requestAnimationFrame(animate);
    const t = (performance.now() - start) / 1000;
    core.scale.setScalar(1 + Math.sin(t * 2.5) * 0.06);
    bomb.rotation.y = Math.sin(t * 0.15) * 0.25;
    renderer.render(scene, camera);
  }

  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  animate();

  const originalDispose = handle.dispose.bind(handle);
  handle.dispose = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    originalDispose();
  };

  return handle;
}
