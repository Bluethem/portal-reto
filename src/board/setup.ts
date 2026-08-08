import * as THREE from "three";

export interface SceneHandle {
  getCanvas(): HTMLCanvasElement;
  getCamera(): THREE.Camera;
  add(obj: THREE.Object3D, pickable?: boolean): void;
  remove(obj: THREE.Object3D): void;
  raycast(ndc: { x: number; y: number }): THREE.Object3D | null;
  dispose(): void;
}

export function initScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e14);

  const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 1.6, 6.5);
  camera.lookAt(0, 0.4, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.PointLight(0xfff2d9, 2.2, 30);
  key.position.set(3, 5, 6);
  scene.add(key);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2.4, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.6 })
  );
  panel.position.set(0, 0.4, 0.6);
  scene.add(panel);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets = new Set<THREE.Object3D>();

  const handle: SceneHandle = {
    getCanvas: () => canvas,
    getCamera: () => camera,
    add: (obj, pickable = true) => {
      scene.add(obj);
      if (pickable) obj.traverse((o) => targets.add(o));
    },
    remove: (obj) => {
      scene.remove(obj);
      obj.traverse((o) => targets.delete(o));
    },
    raycast: (ndc) => {
      pointer.set(ndc.x, ndc.y);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...targets], false);
      return hits[0]?.object ?? null;
    },
    dispose: () => {
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
      });
    },
  };

  const start = performance.now();
  let raf = 0;
  function animate(): void {
    raf = requestAnimationFrame(animate);
    const t = (performance.now() - start) / 1000;
    panel.rotation.y = Math.sin(t * 0.2) * 0.12;
    renderer.render(scene, camera);
  }
  animate();

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
  resize();

  const origDispose = handle.dispose.bind(handle);
  handle.dispose = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    origDispose();
  };
  return handle;
}
