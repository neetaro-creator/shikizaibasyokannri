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
  bodyFront: 0.8,
  bodyTop: 2.95,
  frontAxle: 2.6,
  rearAxle: -1.25,
  wheelR: 0.48,
};

const HALF = TANK.width / 2;
type Rect = { x0: number; x1: number; y0: number; y1: number };
// 側面(左右同じ位置)
const FRONT_SHUTTER: Rect = { x0: -0.55, x1: 0.7, y0: 0.9, y1: 2.5 };
const DRAWER: Rect = { x0: -0.55, x1: 0.7, y0: 0.42, y1: 0.86 };
const MID_SHUTTER: Rect = { x0: -1.95, x1: -0.6, y0: 1.32, y1: 2.5 };
const REAR_SHUTTER: Rect = { x0: -3.42, x1: -2.0, y0: 1.32, y1: 2.5 };
const REAR_SPLIT = 1.92; // 後部シャッターの上段/下段の境
const LOWER_PANEL: Rect = { x0: -3.42, x1: -2.0, y0: 0.62, y1: 1.26 };
// 後部
const BACK = { z0: -0.75, z1: 0.75, y0: 0.55, y1: 2.6, split: 1.6 };

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
  // 「車両右側」「車両左側」(サーチライト・車輪止め):後部シャッター下の収納とみなす
  [`車両${s}側`]: side(LOWER_PANEL, sign),
});
const cab = (x: number, y: number, z: number, w: number, h: number, d: number): Hotspot => ({ x, y, z, w, h, d });

const HOTSPOTS: Record<string, Hotspot> = {
  ...sideSpots('右', 1),
  ...sideSpots('左', -1),
  '車両後部シャッター 上段': { x: TANK.rear, y: (BACK.split + BACK.y1) / 2, z: 0, w: T, h: BACK.y1 - BACK.split - 0.02, d: BACK.z1 - BACK.z0 },
  '車両後部シャッター 下段': { x: TANK.rear, y: (BACK.y0 + BACK.split) / 2, z: 0, w: T, h: BACK.split - BACK.y0 - 0.02, d: BACK.z1 - BACK.z0 },
  車両上部: { x: (TANK.rear + TANK.bodyFront) / 2, y: TANK.bodyTop, z: 0, w: TANK.bodyFront - TANK.rear - 0.1, h: T, d: TANK.width - 0.1 },
  // キャブ内(運転席は右 +Z、助手席は左 -Z)
  運転席上部: cab(2.9, 2.35, 0.55, 0.6, 0.3, 0.9),
  運転席下部: cab(2.95, 0.95, 0.55, 0.5, 0.3, 0.9),
  '運転席下部 工具(筒)': cab(2.45, 0.95, 0.55, 0.4, 0.3, 0.9),
  中央コンソールボックス: cab(2.7, 1.35, 0, 0.6, 0.35, 0.35),
  '助手席 上部': cab(2.9, 2.35, -0.55, 0.6, 0.3, 0.9),
  '助手席 前': cab(3.2, 1.6, -0.55, 0.35, 0.4, 0.9),
  助手席: cab(2.55, 1.4, -0.55, 0.6, 0.6, 0.9),
  '後部座席上部(前) デジカメBOX': cab(1.75, 2.35, 0.6, 0.5, 0.3, 0.8),
  '後部座席上部(前) 現調用BOX': cab(1.75, 2.35, -0.6, 0.5, 0.3, 0.8),
  '後部座席上部(前)': cab(1.75, 2.35, 0, 0.5, 0.3, 0.3),
  '後部座席上部(後)': cab(1.2, 2.35, 0, 0.4, 0.3, 2.0),
  キャビン後部: cab(1.4, 1.55, 0, 0.8, 0.8, 2.0),
  空気呼吸器下: cab(1.4, 0.95, 0, 0.8, 0.3, 2.0),
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
    // 車体前端のはしご
    g.add(box(0.035, 1.95, 0.035, steel, bodyFront + 0.02, 1.95, zf + s * 0.04));
    g.add(box(0.035, 1.95, 0.035, steel, bodyFront - 0.28, 1.95, zf + s * 0.04));
    for (let y = 1.2; y <= 2.9; y += 0.3) g.add(box(0.3, 0.03, 0.03, steel, bodyFront - 0.13, y, zf + s * 0.04));
  }

  // 屋根:手すりと積載はしご
  for (const s of [1, -1]) {
    const z = s * (HALF - 0.08);
    g.add(box(4.2, 0.035, 0.035, steel, (rear + bodyFront) / 2, bodyTop + 0.22, z));
    for (let x = rear + 0.15; x <= bodyFront; x += 0.8) g.add(box(0.035, 0.22, 0.035, steel, x, bodyTop + 0.11, z));
  }
  for (const [z, m] of [[0.35, yellow], [-0.15, wood]] as const) {
    for (const dz of [-0.17, 0.17]) g.add(box(3.9, 0.05, 0.05, m, (rear + bodyFront) / 2 - 0.1, bodyTop + 0.12, z + dz));
    for (let x = rear + 0.35; x <= bodyFront - 0.3; x += 0.3) g.add(box(0.03, 0.03, 0.34, m, x, bodyTop + 0.12, z));
  }

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
