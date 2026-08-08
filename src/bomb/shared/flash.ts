import * as THREE from "three";

export function flash(object: THREE.Object3D, color = 0xff2222, ms = 250): void {
  const mats: THREE.MeshStandardMaterial[] = [];
  object.traverse((obj) => {
    const m = (obj as THREE.Mesh).material;
    const list = Array.isArray(m) ? m : [m];
    list.forEach((mm) => {
      if (mm instanceof THREE.MeshStandardMaterial) mats.push(mm);
    });
  });
  const original = mats.map((mm) => ({
    mat: mm,
    emissive: mm.emissive.getHex(),
    intensity: mm.emissiveIntensity,
  }));
  mats.forEach((mm) => {
    mm.emissive.setHex(color);
    mm.emissiveIntensity = 1.2;
  });
  setTimeout(() => {
    original.forEach(({ mat, emissive, intensity }) => {
      mat.emissive.setHex(emissive);
      mat.emissiveIntensity = intensity;
    });
  }, ms);
}
