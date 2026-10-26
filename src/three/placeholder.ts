import * as THREE from 'three';
import type { Hotspot, Location } from '../data/types';
import { buildPumpTruck, PUMP } from './models/pump';

/** 車両の寸法[m]。前方 +X、上 +Y、右 +Z、地面 y=0、全長の中心が x=0。 */
export const DIMENSIONS: Record<string, { length: number; width: number; height: number; cab: number; body: number; color: number }> = {
  タンク: { length: 7.0, width: 2.3, height: 3.0, cab: 2.2, body: 2.6, color: 0xc8102e },
  ポンプ: { length: PUMP.length, width: PUMP.width, height: 2.9, cab: PUMP.front - PUMP.cabRear, body: PUMP.bodyTop, color: 0xc8102e },
  指揮: { length: 4.7, width: 1.8, height: 2.0, cab: 1.6, body: 1.9, color: 0xc8102e },
  救急: { length: 5.6, width: 1.9, height: 2.5, cab: 1.5, body: 2.5, color: 0xf4f4f4 },
};
const dims = (type: string) => DIMENSIONS[type] ?? DIMENSIONS['ポンプ'];
const FLOOR = 0.55; // 荷台の下端(タイヤ上)

/** 仮モデル:キャブ・ボディ・タイヤを箱と円柱で組む。 */
export function buildPlaceholder(type: string): THREE.Group {
  if (type === 'ポンプ') return buildPumpTruck();
  const d = dims(type);
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.45, metalness: 0.1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1d2733, roughness: 0.2 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.4, metalness: 0.6 });

  const front = d.length / 2;
  const cabH = Math.min(d.height, d.body + 0.2);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(d.cab, cabH - FLOOR + 0.2, d.width), paint);
  cab.position.set(front - d.cab / 2, FLOOR - 0.2 + (cabH - FLOOR + 0.2) / 2, 0);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.02, (cabH - FLOOR) * 0.4, d.width * 0.9), glass);
  shield.position.set(front + 0.01, cabH - (cabH - FLOOR) * 0.3, 0);
  const bodyLen = d.length - d.cab - 0.05;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, d.body - FLOOR, d.width), paint);
  body.position.set(-d.length / 2 + bodyLen / 2, FLOOR + (d.body - FLOOR) / 2, 0);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, d.width), metal);
  bumper.position.set(front + 0.05, 0.45, 0);
  g.add(cab, shield, body, bumper);
  if (type === '救急') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(d.length + 0.02, 0.2, d.width + 0.02),
      new THREE.MeshStandardMaterial({ color: 0xc8102e }));
    stripe.position.set(0, FLOOR + 0.5, 0);
    g.add(stripe);
  }
  const r = 0.45;
  for (const x of [front - d.cab * 0.55, -d.length / 2 + 1.2]) {
    for (const z of [-d.width / 2 + 0.2, d.width / 2 - 0.2]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.35, 24), rubber);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, r, z);
      g.add(wheel);
    }
  }
  return g;
}

/**
 * CSV に hotspot がない場所の既定位置。group ごとに車体の面を等分して並べる。
 * 3D に置かない場所(車外保管など)は undefined。
 */
export function defaultHotspot(loc: Location, index: number, count: number, type: string): Hotspot | undefined {
  const d = dims(type);
  const bodyLen = d.length - d.cab - 0.05;
  const bodyFront = -d.length / 2 + bodyLen;
  const t = 0.12; // 箱の厚み
  const along = (x0: number, len: number) => {
    const w = len / count;
    return { x: x0 - w * (index + 0.5), w: w * 0.92 };
  };
  const bodyH = d.body - FLOOR;
  switch (loc.group) {
    case '右側':
    case '左側': {
      const { x, w } = along(bodyFront, bodyLen);
      return { x, y: FLOOR + bodyH / 2, z: (loc.group === '右側' ? 1 : -1) * (d.width / 2), w, h: bodyH * 0.85, d: t };
    }
    case '後部': {
      const h = bodyH / count;
      return { x: -d.length / 2, y: d.body - h * (index + 0.5), z: 0, w: t, h: h * 0.9, d: d.width * 0.85 };
    }
    case '上部': {
      const { x, w } = along(bodyFront, bodyLen);
      return { x, y: d.body, z: 0, w, h: t, d: d.width * 0.85 };
    }
    case 'キャビン': {
      const { x, w } = along(d.length / 2, d.cab);
      const cabH = Math.min(d.height, d.body + 0.2) - FLOOR;
      return { x, y: FLOOR + cabH / 2, z: 0, w, h: cabH * 0.7, d: d.width + 0.04 };
    }
    case '車内': {
      const cols = count > 4 ? 2 : 1;
      const rows = Math.ceil(count / cols);
      const w = bodyLen / rows;
      const r = Math.floor(index / cols), c = index % cols;
      const dz = d.width / cols;
      return { x: bodyFront - w * (r + 0.5), y: FLOOR + bodyH / 2, z: -d.width / 2 + dz * (c + 0.5), w: w * 0.9, h: bodyH * 0.8, d: dz * 0.9 };
    }
    default:
      return undefined;
  }
}
