import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** 車両モデル共通の部品。座標:前方 +X、右 +Z、上 +Y、地面 y=0。単位 m。 */

/** シャッターの横筋。DOM の無い環境(テスト)では模様なし。 */
function shutterTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 64;
  const g = c.getContext('2d');
  if (!g) return null;
  for (let y = 0; y < 64; y += 8) {
    g.fillStyle = '#d0142c';
    g.fillRect(0, y, 8, 6);
    g.fillStyle = '#8e0c1e';
    g.fillRect(0, y + 6, 8, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, radius = 0) {
  const geo = radius > 0 ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

/** x0..x1, y0..y1, z0..z1 の範囲に箱を置く。 */
export function span(mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, radius = 0) {
  // 左側面などで範囲が逆向きに渡っても、寸法は正にする(負だと面が裏返る)
  return box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, radius);
}

/** 消防車の材質一式。 */
export function materials() {
  const ribs = shutterTexture();
  const lamp = (color: number) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3 });
  return {
    red: new THREE.MeshStandardMaterial({ color: 0xd3122a, roughness: 0.32, metalness: 0.15 }),
    /** 高さ h[m] のシャッター用。縞の間隔がどのシャッターでもそろうよう個別に作る。 */
    shutter(h: number) {
      if (!ribs) return new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.5, metalness: 0.1 });
      const map = ribs.clone();
      map.repeat.set(1, h * 6);
      return new THREE.MeshStandardMaterial({ color: 0xffffff, map, roughness: 0.5, metalness: 0.1 });
    },
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.8 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.08, metalness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.3, metalness: 0.85 }),
    checker: new THREE.MeshStandardMaterial({ color: 0xb7bcc2, roughness: 0.45, metalness: 0.7 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xd9b45a, roughness: 0.7 }),
    redLamp: lamp(0xff2a2a),
    whiteLamp: lamp(0xf2f6ff),
    amber: lamp(0xffb000),
    yellow: lamp(0xffd400),
  };
}

/** 横向きのタイヤとホイール。 */
export function wheel(g: THREE.Group, x: number, z: number, r: number, width: number, tire: THREE.Material, rim: THREE.Material) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 32), tire);
  t.rotation.x = Math.PI / 2;
  t.position.set(x, r, z);
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, width + 0.01, 24), rim);
  w.rotation.x = Math.PI / 2;
  w.position.copy(t.position);
  g.add(t, w);
}
