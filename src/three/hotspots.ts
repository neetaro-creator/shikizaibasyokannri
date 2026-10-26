import * as THREE from 'three';
import type { Hotspot, Location } from '../data/types';

const BASE = { color: 0xffffff, opacity: 0.15 };
const HL = { color: 0xffd400, opacity: 0.6 };

export interface Hotspots {
  group: THREE.Group;
  pick(ndc: THREE.Vector2, camera: THREE.Camera): string | undefined;
  highlight(id?: string): void;
  highlighted(): string | undefined;
  centerOf(id: string): THREE.Vector3 | undefined;
  /** 位置合わせモード用:箱の位置・大きさを差し替える。 */
  setHotspot(id: string, hs: Hotspot): void;
  /** 毎フレーム呼ぶ。強調中の箱を 1 秒周期で点滅させる。 */
  update(timeMs: number): void;
}

export function createHotspots(locations: Location[]): Hotspots {
  const group = new THREE.Group();
  const boxes = new Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>>();
  for (const l of locations) {
    if (!l.hotspot) continue;
    const { x, y, z, w, h, d } = l.hotspot;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ ...BASE, transparent: true, depthWrite: false }),
    );
    mesh.position.set(x, y, z);
    mesh.userData.locationId = l.id;
    mesh.renderOrder = 1;
    boxes.set(l.id, mesh);
    group.add(mesh);
  }
  let current: string | undefined;
  const raycaster = new THREE.Raycaster();

  return {
    group,
    pick(ndc, camera) {
      group.updateMatrixWorld();
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects([...boxes.values()], false)[0];
      return hit?.object.userData.locationId;
    },
    highlight(id) {
      for (const m of boxes.values()) m.material.setValues(BASE);
      current = id && boxes.has(id) ? id : undefined;
      if (current) boxes.get(current)!.material.setValues(HL);
    },
    highlighted: () => current,
    centerOf: (id) => boxes.get(id)?.position.clone(),
    setHotspot(id, { x, y, z, w, h, d }) {
      const m = boxes.get(id);
      if (!m) return;
      m.geometry.dispose();
      m.geometry = new THREE.BoxGeometry(w, h, d);
      m.position.set(x, y, z);
    },
    update(timeMs) {
      if (!current) return;
      const k = 0.5 + 0.5 * Math.sin((timeMs / 1000) * Math.PI * 2);
      boxes.get(current)!.material.opacity = 0.25 + 0.5 * k;
    },
  };
}
