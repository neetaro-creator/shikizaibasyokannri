import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Hotspot } from '../../data/types';

/**
 * 信楽ポンプ1(小型ダブルキャブのポンプ車)を写真から起こした簡易モデル。
 * 座標:前方 +X、右 +Z、上 +Y、地面 y=0、全長の中心が x=0。単位 m。
 */
export const PUMP = {
  length: 5.4,
  width: 1.95,
  front: 2.7,
  rear: -2.7,
  cabRear: 0.35,
  bodyFront: 0.3,
  bodyTop: 2.45,
  frontAxle: 1.85,
  rearAxle: -0.85,
  wheelR: 0.37,
};

const HALF = PUMP.width / 2;
// 側面シャッター(左右同じ位置)
const FRONT_SHUTTER = { x0: -1.42, x1: 0.25, y0: 1.15, y1: 2.35 };
const REAR_SHUTTER = { x0: -2.62, x1: -1.48, y0: 0.58, y1: 2.35 };
const LOWER_BOX = { x0: -0.2, x1: 0.25, y0: 0.5, y1: 1.05 };
// 後部シャッター
const BACK = { z0: -0.55, z1: 0.55, y0: 0.55, y1: 2.3 };
const BACK_LEVELS: [string, number, number][] = [
  ['後部シャッター内最上段', 2.05, 2.3],
  ['後部シャッター内上段', 1.75, 2.05],
  ['後部シャッター内中段', 1.45, 1.75],
  ['後部シャッター内下段', 0.55, 1.45],
];

const T = 0.12; // 面に貼る箱の厚み
const side = (r: { x0: number; x1: number; y0: number; y1: number }, sign: 1 | -1): Hotspot => ({
  x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, z: sign * HALF, w: r.x1 - r.x0, h: r.y1 - r.y0, d: T,
});

const HOTSPOTS: Record<string, Hotspot> = {
  車両右側前シャッター内: side(FRONT_SHUTTER, 1),
  車両右側後シャッター内: side(REAR_SHUTTER, 1),
  車両左側前シャッター内: side(FRONT_SHUTTER, -1),
  車両左側後部シャッター内: side(REAR_SHUTTER, -1),
  車両左側下部BOX: side(LOWER_BOX, -1),
  ...Object.fromEntries(BACK_LEVELS.map(([name, y0, y1]) =>
    [name, { x: PUMP.rear, y: (y0 + y1) / 2, z: 0, w: T, h: y1 - y0 - 0.02, d: BACK.z1 - BACK.z0 }])),
  ホースレイヤー: { x: -2.25, y: 0.95, z: 0, w: 0.7, h: 0.75, d: 0.9 },
  車両上部: { x: (PUMP.rear + PUMP.bodyFront) / 2 + 0.02, y: PUMP.bodyTop, z: 0, w: 2.9, h: T, d: PUMP.width - 0.1 },
  キャビン前部: { x: 2.2, y: 1.55, z: 0, w: 0.8, h: 0.9, d: 1.7 },
  キャビン後部: { x: 1.0, y: 1.65, z: 0, w: 0.9, h: 0.8, d: 1.7 },
  後部座席下: { x: 1.0, y: 0.95, z: 0, w: 0.9, h: 0.35, d: 1.7 },
  'キャビン後ろ室外(左・右)': { x: 0.325, y: 1.4, z: 0, w: 0.12, h: 1.2, d: PUMP.width + 0.05 },
};

/** 点検表の場所名 → 3D 上の箱。対応がなければ undefined。 */
export function pumpHotspot(name: string): Hotspot | undefined {
  return HOTSPOTS[name];
}

// ── 見た目 ──

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

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, radius = 0) {
  const geo = radius > 0 ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

/** x0..x1, y0..y1, z0..z1 の範囲に箱を置く。 */
function span(mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, radius = 0) {
  // 左側面などで範囲が逆向きに渡っても、寸法は正にする(負だと面が裏返る)
  return box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, radius);
}

export function buildPumpTruck(): THREE.Group {
  const g = new THREE.Group();
  g.name = '信楽ポンプ1';
  const red = new THREE.MeshStandardMaterial({ color: 0xd3122a, roughness: 0.32, metalness: 0.15 });
  const ribs = shutterTexture();
  /** 高さ h[m] のシャッター用。縞の間隔がどのシャッターでもそろうよう個別に作る。 */
  const shutterMat = (h: number) => {
    if (!ribs) return new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.5, metalness: 0.1 });
    const map = ribs.clone();
    map.repeat.set(1, h * 6);
    return new THREE.MeshStandardMaterial({ color: 0xffffff, map, roughness: 0.5, metalness: 0.1 });
  };
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.8 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.08, metalness: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.3, metalness: 0.85 });
  const checker = new THREE.MeshStandardMaterial({ color: 0xb7bcc2, roughness: 0.45, metalness: 0.7 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 });
  const lamp = (color: number) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3 });
  const redLamp = lamp(0xff2a2a);
  const whiteLamp = lamp(0xf2f6ff);
  const amber = lamp(0xffb000);
  const yellow = lamp(0xffd400);

  // ── キャブ(ダブルキャブ) ──
  const { front, cabRear } = PUMP;
  g.add(span(red, cabRear, front, 0.55, 2.25, -0.95, 0.95, 0.14));
  g.add(span(glass, front - 0.03, front + 0.006, 1.45, 2.12, -0.86, 0.86)); // フロントガラス
  for (const s of [1, -1] as const) {
    const zf = s * 0.951;
    g.add(span(glass, 1.55, 2.4, 1.48, 2.06, zf - 0.006, zf + 0.006)); // 前ドア窓
    g.add(span(glass, 0.6, 1.42, 1.48, 2.06, zf - 0.006, zf + 0.006)); // 後ドア窓
    for (const x of [1.47, 0.5]) g.add(span(dark, x - 0.008, x + 0.008, 0.65, 2.12, zf - 0.008, zf + 0.008)); // ドアの合わせ目
    for (const x of [1.62, 0.66]) g.add(span(dark, x, x + 0.14, 1.22, 1.27, zf, zf + s * 0.02)); // 取っ手
    // ミラー
    g.add(box(0.05, 0.05, 0.32, steel, 2.58, 1.75, s * 1.1));
    g.add(box(0.07, 0.44, 0.2, dark, 2.6, 1.72, s * 1.27, 0.03));
  }
  g.add(span(dark, front - 0.01, front + 0.01, 1.04, 1.12, -0.8, 0.8)); // グリルの黒帯
  for (const s of [1, -1]) {
    g.add(span(whiteLamp, front - 0.02, front + 0.012, 0.86, 1.02, s * 0.5, s * 0.9)); // ヘッドライト
    g.add(span(redLamp, front - 0.02, front + 0.012, 1.3, 1.36, s * 0.12, s * 0.4)); // 前面赤色灯
  }
  g.add(span(red, front - 0.12, front + 0.08, 0.36, 0.62, -0.97, 0.97, 0.05)); // バンパー
  g.add(span(steel, front + 0.075, front + 0.085, 0.42, 0.56, -0.25, 0.25)); // ナンバー台
  // 赤色灯バー(中央が黄色)
  g.add(span(steel, 1.95, 2.45, 2.25, 2.3, -0.7, 0.7));
  g.add(span(redLamp, 2.0, 2.4, 2.3, 2.44, -0.78, -0.2, 0.03));
  g.add(span(redLamp, 2.0, 2.4, 2.3, 2.44, 0.2, 0.78, 0.03));
  g.add(span(yellow, 2.02, 2.38, 2.3, 2.46, -0.2, 0.2, 0.03));
  // キャブ下のアルミステップ
  for (const s of [1, -1]) g.add(span(checker, 0.4, 1.45, 0.34, 0.52, s * 0.62, s * 0.98));

  // ── 荷台 ──
  const { bodyFront, bodyTop, rear } = PUMP;
  g.add(span(red, rear, bodyFront, 1.1, bodyTop, -HALF, HALF, 0.03)); // 上部の箱
  g.add(span(red, rear, REAR_SHUTTER.x1 + 0.03, 0.5, 1.12, -HALF, HALF)); // 後輪の後ろ(下まで伸びる)
  g.add(span(red, LOWER_BOX.x0 - 0.04, bodyFront, 0.45, 1.12, -HALF, HALF)); // 前の下部BOX
  g.add(span(dark, LOWER_BOX.x0 - 0.05, REAR_SHUTTER.x1 + 0.04, 0.45, 1.1, -0.62, 0.62)); // シャシー
  g.add(span(dark, rear + 0.3, front - 0.5, 0.42, 0.58, -0.45, 0.45)); // フレーム

  for (const s of [1, -1] as const) {
    const zf = s * HALF;
    for (const r of [FRONT_SHUTTER, REAR_SHUTTER]) {
      g.add(span(shutterMat(r.y1 - r.y0), r.x0, r.x1, r.y0, r.y1, zf - 0.01, zf + s * 0.012));
      g.add(span(dark, r.x0 - 0.02, r.x1 + 0.02, r.y1, r.y1 + 0.07, zf, zf + s * 0.03)); // 巻き取り部
      g.add(box(r.x1 - r.x0 - 0.12, 0.03, 0.03, steel, (r.x0 + r.x1) / 2, r.y0 + 0.07, zf + s * 0.035)); // 取っ手バー
    }
    g.add(span(red, LOWER_BOX.x0, LOWER_BOX.x1, LOWER_BOX.y0, LOWER_BOX.y1, zf - 0.01, zf + s * 0.012));
    g.add(span(steel, LOWER_BOX.x0 + 0.12, LOWER_BOX.x1 - 0.12, LOWER_BOX.y1 - 0.14, LOWER_BOX.y1 - 0.08, zf, zf + s * 0.03));
    g.add(span(checker, LOWER_BOX.x0 - 0.02, REAR_SHUTTER.x1 + 0.02, 0.98, 1.12, zf, zf + s * 0.05)); // シャッター下の縁
    // 屋根の警告灯(赤・白)
    for (const [x, m] of [[0.12, redLamp], [-0.2, whiteLamp], [-2.2, whiteLamp], [-2.5, redLamp]] as const) {
      g.add(span(m, x - 0.12, x + 0.12, bodyTop + 0.02, bodyTop + 0.1, zf - s * 0.12, zf));
    }
  }

  // 屋根の手すり(前後左右)
  for (const s of [1, -1]) {
    const z = s * (HALF - 0.06);
    g.add(box(2.85, 0.035, 0.035, steel, (rear + bodyFront) / 2, bodyTop + 0.2, z));
    for (let x = rear + 0.1; x <= bodyFront; x += 0.7) g.add(box(0.035, 0.2, 0.035, steel, x, bodyTop + 0.1, z));
  }
  // 照明の支柱(右前の角)
  g.add(box(0.06, 1.95, 0.06, steel, bodyFront - 0.06, 1.95, HALF + 0.04));
  g.add(box(0.16, 0.12, 0.2, dark, bodyFront - 0.06, 2.95, HALF + 0.04, 0.02));

  // ── 後部 ──
  g.add(span(shutterMat(BACK.y1 - BACK.y0), rear - 0.012, rear + 0.01, BACK.y0, BACK.y1, BACK.z0, BACK.z1));
  g.add(span(dark, rear - 0.03, rear, BACK.y1, BACK.y1 + 0.08, BACK.z0 - 0.02, BACK.z1 + 0.02));
  for (const s of [1, -1]) {
    g.add(span(amber, rear - 0.02, rear, 0.6, 0.72, s * 0.62, s * 0.74));
    g.add(span(redLamp, rear - 0.02, rear, 0.6, 0.72, s * 0.75, s * 0.87));
    g.add(span(redLamp, rear - 0.02, rear, 2.0, 2.12, s * 0.65, s * 0.9));
  }
  // はしご(右)
  for (const z of [0.66, 0.92]) g.add(box(0.035, 1.9, 0.035, steel, rear - 0.06, 1.5, z));
  for (let y = 0.7; y <= 2.4; y += 0.3) g.add(box(0.03, 0.03, 0.26, steel, rear - 0.06, y, 0.79));

  // ── タイヤ ──
  for (const x of [PUMP.frontAxle, PUMP.rearAxle]) {
    for (const s of [1, -1]) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(PUMP.wheelR, PUMP.wheelR, 0.28, 32), rubber);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, PUMP.wheelR, s * (HALF - 0.2));
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(PUMP.wheelR * 0.6, PUMP.wheelR * 0.6, 0.29, 24), steel);
      rim.rotation.x = Math.PI / 2;
      rim.position.copy(tire.position);
      g.add(tire, rim);
    }
  }
  // 泥よけ
  for (const s of [1, -1]) g.add(span(dark, REAR_SHUTTER.x1 - 0.02, REAR_SHUTTER.x1 + 0.02, 0.15, 0.6, s * 0.7, s * 0.95));
  return g;
}
