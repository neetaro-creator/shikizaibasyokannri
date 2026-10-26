import * as THREE from 'three';
import type { Hotspot } from '../../data/types';
import { box, materials, span, wheel } from './kit';

/**
 * 信楽タンク1(中型・ハイルーフキャブの水槽付きポンプ車)を写真から起こした簡易モデル。
 * 座標:前方 +X、右 +Z(運転席側)、上 +Y、地面 y=0、全長の中心が x=0。単位 m。
 */
export const TANK = {
  length: 7.0,
  width: 2.3,
  front: 3.5,
  rear: -3.5,
  cabRear: 0.85,
  bodyFront: 0.5, // キャブとの間に 0.35m のすき間(はしご・サーチライト・歯止め)
  bodyTop: 2.95,
  frontAxle: 2.6,
  rearAxle: -1.25,
  wheelR: 0.48,
};

const HALF = TANK.width / 2;
type Rect = { x0: number; x1: number; y0: number; y1: number };
// 側面(左右同じ位置)
const FRONT_SHUTTER: Rect = { x0: -0.75, x1: 0.42, y0: 0.9, y1: 2.5 };
const DRAWER: Rect = { x0: -0.75, x1: 0.42, y0: 0.42, y1: 0.86 };
const MID_SHUTTER: Rect = { x0: -2.05, x1: -0.8, y0: 1.32, y1: 2.5 };
const REAR_SHUTTER: Rect = { x0: -3.42, x1: -2.1, y0: 1.32, y1: 2.5 };
const REAR_SPLIT = 1.92; // 後部シャッターの上段/下段の境
const LOWER_PANEL: Rect = { x0: -3.42, x1: -2.1, y0: 0.62, y1: 1.26 };
// キャブと荷台のすき間
const GAP = { x0: 0.5, x1: 0.85 };
/** 屋根左端のはしごラックの内側の端(z)。 */
const ROOF_RACK_Z = -0.42;
// 後部(実物は3段:最上段の箱=上段、エンジンカッターの棚と可搬ポンプの床=下段)
const BACK = { z0: -0.75, z1: 0.75, y0: 0.55, y1: 2.6, split: 2.2 };

const T = 0.12;
const side = (r: Rect, sign: 1 | -1): Hotspot => ({
  x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, z: sign * HALF, w: r.x1 - r.x0, h: r.y1 - r.y0, d: T,
});
const sideSpots = (s: '右' | '左', sign: 1 | -1): Record<string, Hotspot> => ({
  [`車両${s}側前部シャッター`]: side(FRONT_SHUTTER, sign),
  [`車両${s}側下部BOX`]: side(DRAWER, sign),
  [`車両${s}側中央シャッター`]: side(MID_SHUTTER, sign),
  [`車両${s}側後部シャッター 上段`]: side({ ...REAR_SHUTTER, y0: REAR_SPLIT + 0.01 }, sign),
  [`車両${s}側後部シャッター 下段`]: side({ ...REAR_SHUTTER, y1: REAR_SPLIT - 0.01 }, sign),
  // 「車両右側」「車両左側」:キャブとのすき間の上にサーチライト、下に歯止め
  [`車両${s}側`]: { x: (GAP.x0 + GAP.x1) / 2, y: 1.75, z: sign * (HALF - 0.2), w: GAP.x1 - GAP.x0 - 0.02, h: 2.4, d: 0.4 },
});
const cab = (x: number, y: number, z: number, w: number, h: number, d: number): Hotspot => ({ x, y, z, w, h, d });

const HOTSPOTS: Record<string, Hotspot> = {
  ...sideSpots('右', 1),
  ...sideSpots('左', -1),
  '車両後部シャッター 上段': { x: TANK.rear, y: (BACK.split + BACK.y1) / 2, z: 0, w: T, h: BACK.y1 - BACK.split - 0.02, d: BACK.z1 - BACK.z0 },
  '車両後部シャッター 下段': { x: TANK.rear, y: (BACK.y0 + BACK.split) / 2, z: 0, w: T, h: BACK.split - BACK.y0 - 0.02, d: BACK.z1 - BACK.z0 },
  // 屋根(後ろから撮った写真より):左端にはしごラック(三連はしご・鍵付きはしご・とび口)、
  // 残り(左寄り前方にバスケット担架、中央後ろにナイトスキャンチーフ、右端に吸管)は車両上部
  '車両上部 左側': { x: (TANK.rear + TANK.bodyFront) / 2, y: TANK.bodyTop + 0.12, z: (-HALF + 0.03 + ROOF_RACK_Z) / 2, w: TANK.bodyFront - TANK.rear - 0.1, h: 0.36, d: ROOF_RACK_Z - (-HALF + 0.03) },
  車両上部: { x: (TANK.rear + TANK.bodyFront) / 2, y: TANK.bodyTop, z: (ROOF_RACK_Z + 0.03 + HALF - 0.03) / 2, w: TANK.bodyFront - TANK.rear - 0.1, h: T, d: HALF - 0.03 - (ROOF_RACK_Z + 0.03) },
  // キャブ内(運転席は右 +Z、助手席は左 -Z)。車内の写真より:
  // 前席の間に無線機と書類入れ、前席のすぐ後ろの天井の手すりにカメラBOX・現調用BOX、
  // 左壁上の網棚(前寄り)、後ろの壁に空気呼吸器4基とその上の網棚、座席の下に予備ボンベ
  運転席上部: cab(3.05, 2.35, 0.55, 0.5, 0.25, 0.8),
  運転席下部: cab(2.55, 0.95, 0.55, 0.5, 0.3, 0.7),
  '運転席下部 工具(筒)': cab(3.05, 0.95, 0.55, 0.4, 0.3, 0.7),
  中央コンソールボックス: cab(2.45, 1.15, 0, 0.75, 0.35, 0.36), // 無線機などの台
  前席中央: cab(2.4, 1.65, 0, 0.6, 0.6, 0.36), // その上の書類入れ・地図・ハンドメガホン
  後席前方: cab(1.87, 1.55, 0, 0.3, 0.9, 1.6), // 1列目と2列目の間(夜行チョッキの手すりなど)
  '助手席 上部': cab(3.05, 2.35, -0.55, 0.5, 0.25, 0.8),
  '助手席 前': cab(3.25, 1.55, -0.6, 0.3, 0.4, 0.7),
  '後部座席上部(前) カメラBOX': cab(1.95, 2.38, 0.32, 0.24, 0.22, 0.24),
  '後部座席上部(前) 現調用BOX': cab(1.95, 2.38, 0.05, 0.24, 0.22, 0.24),
  '後部座席上部(前)': cab(1.7, 2.4, -0.68, 0.55, 0.25, 0.5),
  '後部座席上部(後)': cab(1.02, 2.42, 0, 0.3, 0.25, 2.0),
  キャビン後部: cab(1.12, 1.65, 0, 0.32, 0.8, 2.0),
  空気呼吸器下: cab(1.2, 0.95, 0, 0.5, 0.3, 2.0),
};

/** 点検表の場所名 → 3D 上の箱。対応がなければ undefined。 */
export function tankHotspot(name: string): Hotspot | undefined {
  return HOTSPOTS[name];
}

export function buildTankTruck(): THREE.Group {
  const g = new THREE.Group();
  g.name = '信楽タンク1';
  const { red, shutter, dark, glass, steel, checker, rubber, wood, redLamp, whiteLamp, amber, yellow } = materials();
  const { front, cabRear, bodyFront, bodyTop, rear } = TANK;

  // ── キャブ(ハイルーフ・ダブルキャブ) ──
  g.add(span(red, cabRear, front, 0.75, 2.62, -HALF + 0.05, HALF - 0.05, 0.16));
  g.add(span(red, cabRear + 0.05, front - 0.25, 2.5, 3.02, -HALF + 0.08, HALF - 0.08, 0.2)); // 屋根の張り出し
  g.add(span(redLamp, front - 0.5, front - 0.18, 2.78, 2.96, -0.95, 0.95, 0.05)); // 屋根前の赤色灯
  g.add(span(whiteLamp, front - 0.45, front - 0.3, 2.62, 2.7, -0.55, 0.55)); // 前向き作業灯
  g.add(span(glass, front - 0.03, front + 0.008, 1.7, 2.5, -1.0, 1.0)); // フロントガラス
  for (const s of [1, -1] as const) {
    const zf = s * (HALF - 0.05);
    g.add(span(glass, 2.35, 3.25, 1.75, 2.45, zf - 0.008, zf + 0.008)); // 前ドア窓
    g.add(span(glass, 1.1, 2.2, 1.85, 2.45, zf - 0.008, zf + 0.008)); // 後ドア窓
    for (const x of [2.28, 0.98]) g.add(span(dark, x - 0.01, x + 0.01, 0.85, 2.5, zf - 0.01, zf + 0.01)); // ドアの合わせ目
    for (const x of [2.42, 1.15]) g.add(span(dark, x, x + 0.16, 1.48, 1.53, zf, zf + s * 0.02)); // 取っ手
    g.add(span(whiteLamp, 1.2, 2.6, 2.86, 2.92, zf - s * 0.02, zf + s * 0.005)); // 屋根横の白色灯
    // 大きなメッキのミラー
    g.add(box(0.05, 0.05, 0.42, steel, 3.35, 2.15, s * 1.28));
    g.add(box(0.08, 0.5, 0.24, steel, 3.38, 2.05, s * 1.48, 0.04));
    // 前輪の後ろ・後席ドア下のアルミステップ
    g.add(span(checker, 1.0, 2.0, 0.42, 0.9, zf - s * 0.02, zf + s * 0.02));
    for (const y of [0.55, 0.75]) g.add(span(dark, 1.05, 1.95, y, y + 0.03, zf + s * 0.02, zf + s * 0.03));
  }
  g.add(span(dark, front - 0.01, front + 0.012, 1.3, 1.42, -0.85, 0.85)); // グリル
  g.add(box(0.04, 0.2, 0.2, steel, front + 0.02, 1.36, 0, 0.05)); // 消防章
  for (const s of [1, -1]) g.add(span(whiteLamp, front - 0.02, front + 0.012, 1.0, 1.2, s * 0.6, s * 1.0)); // ヘッドライト
  g.add(span(red, front - 0.15, front + 0.1, 0.42, 0.78, -HALF + 0.02, HALF - 0.02, 0.05)); // バンパー
  g.add(span(checker, front + 0.08, front + 0.16, 0.6, 0.78, -1.0, 1.0)); // バンパー上の縞鋼板
  g.add(span(steel, front + 0.1, front + 0.11, 0.44, 0.58, -0.28, 0.28)); // ナンバー台

  // ── キャブ内(車体を透かしたときに見える。interior は透かさない) ──
  const inside = new THREE.Group();
  inside.userData.interior = true;
  const seat = new THREE.MeshStandardMaterial({ color: 0x2b3340, roughness: 0.7 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8c939b, roughness: 0.6 });
  // 車体の材質と共有すると一緒に透けるので、キャブ内は専用の材質を使う
  const black = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.8 });
  const rail = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.3, metalness: 0.85 });
  for (const z of [0.6, -0.62]) {
    inside.add(span(seat, 2.3, 2.85, 1.05, 1.25, z - 0.3, z + 0.3, 0.05)); // 前席の座面
    inside.add(span(seat, 2.25, 2.4, 1.25, 2.1, z - 0.28, z + 0.28, 0.05)); // 背もたれ
  }
  inside.add(span(grey, 2.1, 2.8, 1.0, 1.75, -0.17, 0.17, 0.03)); // コンソールと書類入れ
  inside.add(span(seat, 1.0, 1.5, 0.8, 1.15, -1.0, 1.0, 0.05)); // 後席(下に予備ボンベ)
  for (const z of [-0.75, -0.25, 0.25, 0.75]) inside.add(box(0.18, 0.62, 0.32, black, 1.03, 1.6, z, 0.04)); // 空気呼吸器
  inside.add(span(grey, 0.88, 1.18, 2.3, 2.55, -1.0, 1.0)); // 後ろの網棚
  inside.add(span(grey, 1.45, 2.0, 2.3, 2.55, -1.0, -0.4)); // 左の網棚
  inside.add(box(0.04, 0.04, 1.8, rail, 1.95, 2.28, 0)); // 前席後ろの手すり
  for (const z of [0.32, 0.05]) inside.add(box(0.2, 0.2, 0.2, grey, 1.95, 2.38, z)); // デジカメBOX・現調用BOX
  g.add(inside);

  // ── 荷台 ──
  g.add(span(red, rear, bodyFront, MID_SHUTTER.y0 - 0.05, bodyTop, -HALF, HALF, 0.03)); // 上部の箱
  g.add(span(red, DRAWER.x0 - 0.05, bodyFront, DRAWER.y0, MID_SHUTTER.y0, -HALF, HALF)); // 前シャッターの下まで
  g.add(span(red, rear, REAR_SHUTTER.x1 + 0.05, LOWER_PANEL.y0 - 0.02, MID_SHUTTER.y0, -HALF, HALF)); // 後輪の後ろ
  g.add(span(dark, rear + 0.4, front - 0.6, 0.5, 0.7, -0.5, 0.5)); // フレーム
  g.add(span(dark, DRAWER.x0 - 0.06, REAR_SHUTTER.x1 + 0.06, 0.6, MID_SHUTTER.y0 - 0.04, -0.8, 0.8)); // 後輪まわりのシャシー

  for (const s of [1, -1] as const) {
    const zf = s * HALF;
    for (const r of [FRONT_SHUTTER, MID_SHUTTER, REAR_SHUTTER]) {
      g.add(span(shutter(r.y1 - r.y0), r.x0, r.x1, r.y0, r.y1, zf - 0.01, zf + s * 0.012));
      g.add(span(dark, r.x0 - 0.02, r.x1 + 0.02, r.y1, r.y1 + 0.06, zf, zf + s * 0.03)); // 巻き取り部
      g.add(box(r.x1 - r.x0 - 0.1, 0.035, 0.035, steel, (r.x0 + r.x1) / 2, r.y1 - 0.12, zf + s * 0.04)); // 上の取っ手バー
    }
    // 前シャッター下の引き出し(縞鋼板の前板と黄色の縁)
    g.add(span(checker, DRAWER.x0, DRAWER.x1, DRAWER.y0, DRAWER.y1, zf - 0.01, zf + s * 0.015));
    g.add(span(yellow, DRAWER.x0, DRAWER.x1, DRAWER.y0, DRAWER.y0 + 0.03, zf, zf + s * 0.02));
    // 後部シャッター下の収納扉
    g.add(span(red, LOWER_PANEL.x0, LOWER_PANEL.x1, LOWER_PANEL.y0, LOWER_PANEL.y1, zf - 0.01, zf + s * 0.012));
    g.add(span(steel, -2.85, -2.55, 1.0, 1.08, zf, zf + s * 0.03));
    // 上部の帯:白い作業灯・赤い警告灯
    for (const [x0, x1] of [[-1.85, -0.4], [-3.0, -2.15]]) g.add(span(whiteLamp, x0, x1, 2.7, 2.8, zf, zf + s * 0.02));
    for (const x of [0.45, -3.3]) g.add(span(redLamp, x - 0.12, x + 0.12, 2.68, 2.84, zf, zf + s * 0.03));
    // すき間:はしご(外向き)、上にサーチライト、下に歯止め
    for (const x of [GAP.x0 + 0.04, GAP.x1 - 0.04]) g.add(box(0.035, 2.3, 0.035, steel, x, 1.85, zf + s * 0.02));
    for (let y = 0.85; y <= 2.9; y += 0.32) g.add(box(GAP.x1 - GAP.x0 - 0.08, 0.03, 0.03, steel, (GAP.x0 + GAP.x1) / 2, y, zf + s * 0.02));
    g.add(box(0.04, 0.6, 0.04, steel, (GAP.x0 + GAP.x1) / 2, 2.55, zf - s * 0.2)); // ライトの支柱
    g.add(box(0.14, 0.2, 0.1, whiteLamp, (GAP.x0 + GAP.x1) / 2, 2.85, zf - s * 0.2, 0.02)); // サーチライト
    g.add(span(wood, GAP.x0 + 0.06, GAP.x1 - 0.06, 0.55, 0.8, zf - s * 0.35, zf - s * 0.05)); // 歯止め
    g.add(span(red, GAP.x0 + 0.05, GAP.x1 - 0.05, 0.55, 0.62, zf - s * 0.36, zf - s * 0.04)); // 歯止めの金具
  }

  // 屋根:手すりと積載はしご
  for (const s of [1, -1]) {
    const z = s * (HALF - 0.08);
    g.add(box(4.2, 0.035, 0.035, steel, (rear + bodyFront) / 2, bodyTop + 0.22, z));
    for (let x = rear + 0.15; x <= bodyFront; x += 0.8) g.add(box(0.035, 0.22, 0.035, steel, x, bodyTop + 0.11, z));
  }
  const roofX = (rear + bodyFront) / 2;
  const roofLen = bodyFront - rear - 0.2;
  g.add(span(checker, rear + 0.05, bodyFront - 0.05, bodyTop, bodyTop + 0.01, -HALF + 0.05, HALF - 0.05)); // 縞鋼板の床
  // 左端:はしごラック(金属の枠に、はしごを重ね積み。とび口もこの中)
  const rackZ0 = -HALF + 0.05, rackZ1 = ROOF_RACK_Z;
  for (const z of [rackZ0, rackZ1]) {
    g.add(box(roofLen, 0.04, 0.04, steel, roofX, bodyTop + 0.3, z));
    for (let x = rear + 0.2; x <= bodyFront - 0.1; x += 0.9) g.add(box(0.04, 0.3, 0.04, steel, x, bodyTop + 0.15, z));
  }
  const ladderLayer = (m: THREE.Material, y: number, len: number, x0: number) => {
    for (const z of [rackZ0 + 0.08, rackZ1 - 0.08]) g.add(box(len, 0.05, 0.04, m, x0, y, z));
    for (let x = x0 - len / 2 + 0.15; x <= x0 + len / 2 - 0.1; x += 0.3) g.add(box(0.03, 0.03, rackZ1 - rackZ0 - 0.16, m, x, y, (rackZ0 + rackZ1) / 2));
  };
  ladderLayer(steel, bodyTop + 0.08, roofLen - 0.1, roofX); // 三連はしご
  ladderLayer(steel, bodyTop + 0.16, roofLen - 0.3, roofX - 0.1);
  ladderLayer(yellow, bodyTop + 0.24, roofLen - 0.8, roofX + 0.1); // 鍵付きはしご
  for (const z of [rackZ0 + 0.2, rackZ0 + 0.3]) g.add(box(roofLen - 0.6, 0.03, 0.03, wood, roofX, bodyTop + 0.2, z)); // とび口
  // 左寄り前方:バスケット担架(網の箱を立てて置く)
  g.add(span(steel, bodyFront - 1.3, bodyFront - 0.7, bodyTop, bodyTop + 0.5, ROOF_RACK_Z + 0.05, ROOF_RACK_Z + 0.4));
  g.add(span(dark, bodyFront - 1.25, bodyFront - 0.75, bodyTop + 0.05, bodyTop + 0.45, ROOF_RACK_Z + 0.06, ROOF_RACK_Z + 0.39));
  // 中央後ろ:ナイトスキャンチーフ(白い本体を寝かせ、前側に T 字のライト)
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 });
  g.add(span(white, rear + 0.15, rear + 1.25, bodyTop, bodyTop + 0.14, -0.22, 0.22, 0.04));
  g.add(box(0.5, 0.1, 0.1, steel, rear + 1.5, bodyTop + 0.1, 0));
  g.add(span(whiteLamp, rear + 1.72, rear + 1.86, bodyTop + 0.04, bodyTop + 0.18, -0.5, 0.5));
  // 右端:吸管2本(黒地に白の縞、後ろ端に金具)
  const suction = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
  for (const z of [HALF - 0.17, HALF - 0.32]) {
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, roofLen - 0.3, 16), suction);
    hose.rotation.z = Math.PI / 2;
    hose.position.set(roofX + 0.1, bodyTop + 0.075, z);
    const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 16), steel);
    coupling.rotation.z = Math.PI / 2;
    coupling.position.set(rear + 0.35, bodyTop + 0.075, z);
    g.add(hose, coupling);
  }
  // キャブ屋根の後ろの作業灯2つ
  for (const z of [-0.6, 0.6]) g.add(box(0.08, 0.14, 0.32, whiteLamp, TANK.cabRear + 0.05, 3.0, z));

  // ── 後部 ──
  g.add(span(shutter(BACK.y1 - BACK.y0), rear - 0.012, rear + 0.01, BACK.y0, BACK.y1, BACK.z0, BACK.z1));
  g.add(span(dark, rear - 0.03, rear, BACK.y1, BACK.y1 + 0.08, BACK.z0 - 0.02, BACK.z1 + 0.02));
  for (const s of [1, -1]) {
    g.add(span(amber, rear - 0.02, rear, 0.6, 0.75, s * 0.8, s * 0.92));
    g.add(span(redLamp, rear - 0.02, rear, 0.6, 0.75, s * 0.93, s * 1.05));
    g.add(span(redLamp, rear - 0.02, rear, 2.45, 2.65, s * 0.85, s * 1.08));
  }
  g.add(span(steel, rear - 0.015, rear, 1.5, 1.75, -1.08, -0.82)); // ナンバー(左)
  // はしご(右、屋根の上まで)
  for (const z of [0.82, 1.1]) g.add(box(0.035, 2.75, 0.035, steel, rear - 0.07, 2.0, z));
  for (let y = 0.8; y <= 3.2; y += 0.3) g.add(box(0.03, 0.03, 0.28, steel, rear - 0.07, y, 0.96));

  // ── タイヤ ──
  for (const x of [TANK.frontAxle, TANK.rearAxle]) for (const s of [1, -1]) wheel(g, x, s * (HALF - 0.25), TANK.wheelR, 0.36, rubber, steel);
  for (const s of [1, -1]) g.add(span(dark, REAR_SHUTTER.x1 + 0.03, REAR_SHUTTER.x1 + 0.07, 0.12, 0.62, s * 0.8, s * (HALF - 0.02))); // 泥よけ
  return g;
}
