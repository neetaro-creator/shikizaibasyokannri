import * as THREE from 'three';
import type { Hotspot, Location } from '../data/types';

const BASE = { color: 0xffffff, opacity: 0.07 };
const HL = { color: 0xffd400, opacity: 0.6 };

export interface Hotspots {
  group: THREE.Group;
  /** occluders(車体)より奥にある箱は拾わない。 */
  pick(ndc: THREE.Vector2, camera: THREE.Camera, occluders?: THREE.Object3D[], seeThrough?: (id: string) => boolean): string | undefined;
  /** p から radius 以内で、accept を満たす箱のうち中心が最も近いもの。 */
  nearest(p: THREE.Vector3, radius: number, accept: (id: string) => boolean): string | undefined;
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
    // 強調時だけ見せる輪郭線
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: HL.color, transparent: true, depthTest: false }),
    );
    edges.visible = false;
    edges.renderOrder = 11;
    mesh.add(edges);
    boxes.set(l.id, mesh);
    group.add(mesh);
  }
  let current: string | undefined;
  const raycaster = new THREE.Raycaster();

  return {
    group,
    pick(ndc, camera, occluders = [], seeThrough = () => false) {
      group.updateMatrixWorld();
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects([...boxes.values()], false)[0];
      if (!hit) return undefined;
      const id: string = hit.object.userData.locationId;
      if (seeThrough(id)) return id; // キャブ内など、車体を透かして選んでよい場所
      const wall = raycaster.intersectObjects(occluders, true)[0];
      if (wall && wall.distance < hit.distance - 0.05) return undefined;
      return id;
    },
    nearest(p, radius, accept) {
      let best: string | undefined;
      let bestD = radius;
      for (const [id, m] of boxes) {
        if (!accept(id)) continue;
        const d = m.position.distanceTo(p);
        if (d <= bestD) [best, bestD] = [id, d];
      }
      return best;
    },
    highlight(id) {
      for (const m of boxes.values()) {
        m.material.setValues({ ...BASE, depthTest: true });
        m.renderOrder = 1;
        m.children[0].visible = false;
      }
      current = id && boxes.has(id) ? id : undefined;
      if (current) {
        // 車内の場所でも車体を透かして見えるよう、奥行き判定を切って最後に描く
        const m = boxes.get(current)!;
        m.material.setValues({ ...HL, depthTest: false });
        m.renderOrder = 10;
        m.children[0].visible = true;
      }
    },
    highlighted: () => current,
    centerOf: (id) => boxes.get(id)?.position.clone(),
    setHotspot(id, { x, y, z, w, h, d }) {
      const m = boxes.get(id);
      if (!m) return;
      m.geometry.dispose();
      m.geometry = new THREE.BoxGeometry(w, h, d);
      const edges = m.children[0] as THREE.LineSegments;
      edges.geometry.dispose();
      edges.geometry = new THREE.EdgesGeometry(m.geometry);
      m.position.set(x, y, z);
    },
    update(timeMs) {
      if (!current) return;
      const k = 0.5 + 0.5 * Math.sin((timeMs / 1000) * Math.PI * 2);
      boxes.get(current)!.material.opacity = 0.25 + 0.5 * k;
    },
  };
}
