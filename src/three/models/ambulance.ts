import * as THREE from 'three';
import type { Hotspot } from '../../data/types';
import { box, materials, span, wheel } from './kit';

/**
 * 信楽救急1(日産パラメディック:キャラバン系ハイルーフの高規格救急車)の簡易モデル。
 * 寸法は全長5.33×全幅1.88×全高2.49m(横浜市の寄附車両の諸元)。
 * 座標:前方 +X、右 +Z(運転席側)、上 +Y、地面 y=0、全長の中心が x=0。単位 m。
 */
export const AMB = {
  length: 5.33,
  width: 1.88,
  height: 2.49,
  front: 2.665,
  rear: -2.665,
  roof: 2.33,
  cabRear: 1.3, // 運転席と患者室の仕切り
  frontAxle: 1.9,
  rearAxle: -1.05,
  wheelR: 0.33,
};
const HALF = AMB.width / 2;

/** x0..x1, y0..y1, z0..z1 の範囲の箱。 */
const at = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Hotspot => ({
  x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, w: x1 - x0, h: y1 - y0, d: z1 - z0,
});

// 車内の配置は仮(点検表の並びから推測)。車内の写真をもらったら直す。
// 患者室:前の仕切り(A〜D)、右壁(E・F・モニター・除細動器・M・N)、左壁(G〜L・各バッグ)、天井、中央のストレッチャー
const FRONT = { x0: 0.95, x1: 1.24 }; // 前の仕切りの棚
const RW = { z0: 0.6, z1: 0.86 }; // 右壁の棚
const LW = { z0: -0.86, z1: -0.6 }; // 左壁の棚
const UP: [number, number] = [1.75, 2.2];
const MID: [number, number] = [1.3, 1.73];
const LOW: [number, number] = [0.6, 1.25];

const HOTSPOTS: Record<string, Hotspot | null> = {
  // キャブ
  '運転席・助手席付近': at(1.55, 2.3, 0.9, 1.9, -0.85, 0.85),
  助手席後ろ: at(1.27, 1.5, 0.7, 1.6, -0.85, -0.1),
  // 前の仕切り:左半分が A 収納(扉の表・裏、中の段)、右半分が B・C・D
  'A収納扉(表)': at(0.88, 0.94, 0.6, 2.2, -0.84, -0.1),
  'A収納扉(裏)': at(0.95, 1.01, 0.6, 2.2, -0.84, -0.1),
  A収納: at(1.03, FRONT.x1, ...UP, -0.84, -0.1),
  'A収納 黒かばん': at(1.03, FRONT.x1, ...MID, -0.84, -0.1),
  'A収納 外傷バック': at(1.03, FRONT.x1, 0.95, 1.28, -0.84, -0.47),
  'A収納 外傷バック オレンジポ―チ内': at(1.03, FRONT.x1, 0.95, 1.28, -0.45, -0.1),
  'A収納 オレンジポ―チ内': at(1.03, FRONT.x1, 0.6, 0.93, -0.84, -0.1),
  B収納: at(FRONT.x0, FRONT.x1, ...UP, 0.05, 0.84),
  C収納: at(FRONT.x0, FRONT.x1, ...MID, 0.05, 0.84),
  D収納: at(FRONT.x0, FRONT.x1, ...LOW, 0.05, 0.84),
  // 右壁(前から後ろへ)
  E収納: at(0.25, 0.85, ...UP, RW.z0, RW.z1),
  F収納: at(0.25, 0.85, ...MID, RW.z0, RW.z1),
  患者室右側: at(-0.95, 0.2, ...LOW, RW.z0, RW.z1),
  '患者室右側 モニター部': at(-0.35, 0.2, 1.3, 1.9, RW.z0, RW.z1),
  '患者室右側 除細動器': at(-0.95, -0.4, 1.3, 1.9, RW.z0, RW.z1),
  '患者室右側 観察バック': at(-0.95, -0.4, 1.95, 2.2, RW.z0, RW.z1),
  '患者室右側 観察バック 血糖測定器': at(-0.35, 0.2, 1.95, 2.2, RW.z0, RW.z1),
  M収納: at(-2.5, -1.0, ...UP, RW.z0, RW.z1),
  N収納: at(-2.5, -1.0, ...MID, RW.z0, RW.z1),
  メインストレッチャー右側収納: at(-2.5, -1.0, ...LOW, RW.z0, RW.z1),
  // 左壁(スライドドアより後ろ)
  G収納: at(-0.6, 0.2, ...UP, LW.z0, LW.z1),
  J収納: at(-0.6, 0.2, ...MID, LW.z0, LW.z1),
  'K収納 小児バッグ': at(-0.6, 0.2, ...LOW, LW.z0, LW.z1),
  H収納上部棚: at(-1.45, -0.65, ...UP, LW.z0, LW.z1),
  H収納: at(-1.45, -0.65, ...MID, LW.z0, LW.z1),
  L収納: at(-1.45, -0.65, ...LOW, LW.z0, LW.z1),
  I収納: at(-2.5, -1.5, ...UP, LW.z0, LW.z1),
  'I収納 薬剤バッグ': at(-2.5, -1.5, ...MID, LW.z0, LW.z1),
  // 左壁の後ろ下:各バッグ
  特定行為バック: at(-2.5, -2.25, ...LOW, LW.z0, LW.z1),
  分娩新生児バッグ: at(-2.23, -1.98, ...LOW, LW.z0, LW.z1),
  気管挿管バッグ: at(-1.96, -1.71, ...LOW, LW.z0, LW.z1),
  気道管理バッグ: at(-1.69, -1.5, 1.1, 1.25, LW.z0, LW.z1),
  '気道管理バッグ メイン収納': at(-1.69, -1.5, 0.95, 1.08, LW.z0, LW.z1),
  セカンド収納: at(-1.69, -1.5, 0.78, 0.93, LW.z0, LW.z1),
  サード: at(-1.69, -1.5, 0.6, 0.76, LW.z0, LW.z1),
  // 天井・中央・スライドドア
  患者室天井: at(-2.4, 0.8, 2.25, 2.31, -0.4, 0.4),
  患者室中央: at(-2.3, -0.3, 0.7, 1.0, -0.45, 0.25),
  右スライドドア収納: at(0.3, 0.85, 0.6, 2.1, 0.87, 0.94),
  左スライドドア収納: at(0.3, 1.25, 0.6, 2.1, -0.94, -0.87),
  // 救急車の外(3D には置かない)
  '緊急持ち出しバッグ(タンク車内)': null,
  救急資器材庫: null,
};

/** 点検表の場所名 → 3D 上の箱。null は「車の外なので置かない」、undefined は未対応。 */
export function ambulanceHotspot(name: string): Hotspot | null | undefined {
  return HOTSPOTS[name];
}

export function buildAmbulance(): THREE.Group {
  const g = new THREE.Group();
  g.name = '信楽救急1';
  const { dark, glass, steel, rubber, redLamp, whiteLamp, amber } = materials();
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f5f6, roughness: 0.35, metalness: 0.1 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xd3122a, roughness: 0.4 });
  const frosted = new THREE.MeshStandardMaterial({ color: 0xc9d3dc, roughness: 0.6, metalness: 0.1 });
  const { front, rear, roof } = AMB;
  const shellFront = 1.95;

  // ── 車体(ワンボックス・ハイルーフ) ──
  g.add(span(white, rear, shellFront, 0.42, roof, -HALF, HALF, 0.1));
  g.add(span(white, shellFront - 0.1, front - 0.05, 0.42, 1.2, -HALF + 0.03, HALF - 0.03, 0.12)); // ボンネット
  // フロントガラスまわりの傾斜(三角柱)
  const slope = new THREE.Shape([new THREE.Vector2(shellFront - 0.02, roof - 0.05), new THREE.Vector2(shellFront - 0.02, 1.15), new THREE.Vector2(front - 0.3, 1.15)]);
  const wedge = new THREE.Mesh(new THREE.ExtrudeGeometry(slope, { depth: AMB.width - 0.1, bevelEnabled: false }), white);
  wedge.position.z = -(AMB.width - 0.1) / 2;
  g.add(wedge);
  const wsLen = Math.hypot(front - 0.3 - shellFront, roof - 0.05 - 1.15);
  const ws = box(wsLen * 0.92, 0.02, AMB.width - 0.24, glass, (shellFront + front - 0.3) / 2 + 0.01, (roof - 0.05 + 1.15) / 2 + 0.01, 0);
  ws.rotation.z = -Math.atan2(roof - 0.05 - 1.15, front - 0.3 - shellFront);
  g.add(ws);
  // 前まわり
  g.add(span(dark, front - 0.06, front + 0.005, 0.78, 1.0, -0.6, 0.6)); // グリル
  for (const s of [1, -1]) g.add(span(whiteLamp, front - 0.08, front + 0.005, 0.82, 1.0, s * 0.62, s * 0.86)); // ヘッドライト
  g.add(span(white, front - 0.15, front + 0.06, 0.35, 0.62, -HALF + 0.02, HALF - 0.02, 0.05)); // バンパー
  g.add(span(steel, front + 0.05, front + 0.065, 0.42, 0.56, -0.25, 0.25)); // ナンバー台

  for (const s of [1, -1] as const) {
    const zf = s * HALF;
    // 赤い帯と側面の窓
    g.add(span(stripe, rear + 0.05, front - 0.2, 1.0, 1.12, zf - s * 0.005, zf + s * 0.008));
    g.add(span(stripe, rear + 0.05, shellFront, 2.05, 2.12, zf - s * 0.005, zf + s * 0.008));
    g.add(span(glass, 1.4, 2.05, 1.35, 1.95, zf - s * 0.005, zf + s * 0.01)); // 前ドアの窓
    g.add(span(dark, 1.36, 1.38, 0.5, 2.0, zf, zf + s * 0.012)); // 前ドアの合わせ目
    // スライドドア(すりガラスの窓)
    g.add(span(dark, 0.27, 0.29, 0.5, 2.2, zf, zf + s * 0.012));
    g.add(span(frosted, 0.4, 1.2, 1.4, 1.95, zf - s * 0.005, zf + s * 0.01));
    g.add(span(dark, 0.4, 0.6, 1.2, 1.25, zf, zf + s * 0.02)); // 取っ手
    // ミラー
    g.add(box(0.05, 0.05, 0.25, dark, 1.95, 1.75, s * (HALF + 0.12)));
    g.add(box(0.06, 0.3, 0.16, dark, 1.97, 1.7, s * (HALF + 0.24), 0.03));
    // 屋根の後ろ角の赤色灯
    g.add(span(redLamp, rear + 0.05, rear + 0.3, roof, roof + 0.1, zf - s * 0.3, zf - s * 0.05, 0.02));
  }
  // 屋根前の赤色灯バー
  g.add(span(redLamp, 1.45, 1.92, roof, AMB.height, -0.82, 0.82, 0.04));
  // 後部:観音開きの扉、すりガラス、灯火
  g.add(span(dark, rear - 0.012, rear, 0.5, 2.15, -0.01, 0.01));
  for (const s of [1, -1]) {
    g.add(span(frosted, rear - 0.012, rear, 1.5, 2.0, s * 0.1, s * 0.75));
    g.add(span(redLamp, rear - 0.02, rear, 1.0, 1.4, s * 0.8, s * 0.92));
    g.add(span(amber, rear - 0.02, rear, 0.85, 0.98, s * 0.8, s * 0.92));
  }
  g.add(span(steel, rear - 0.1, rear + 0.05, 0.4, 0.5, -0.8, 0.8)); // 後ろのステップ

  // ── 患者室の中(透かしたときの目印。車体と材質を共有しない) ──
  const inside = new THREE.Group();
  inside.userData.interior = true;
  const cabinet = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.5 });
  const seat = new THREE.MeshStandardMaterial({ color: 0x2b3340, roughness: 0.7 });
  const bed = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.6 });
  const screen = new THREE.MeshStandardMaterial({ color: 0x1e2a36, emissive: 0x2a8f6a, emissiveIntensity: 0.4 });
  inside.add(span(bed, -2.3, -0.3, 0.75, 0.9, -0.42, 0.22, 0.04)); // メインストレッチャー
  inside.add(span(cabinet, -2.55, 0.85, 0.55, 2.25, RW.z0 - 0.02, RW.z0)); // 右壁の棚の面
  inside.add(span(cabinet, -2.55, 0.25, 0.55, 2.25, LW.z1, LW.z1 + 0.02)); // 左壁の棚の面
  inside.add(span(cabinet, FRONT.x0 - 0.02, FRONT.x0, 0.55, 2.25, 0.03, 0.86)); // 前の仕切り(右)
  inside.add(span(screen, -0.3, 0.15, 1.4, 1.8, RW.z0 - 0.04, RW.z0 - 0.02)); // モニター
  inside.add(span(seat, 0.45, 0.85, 0.55, 0.95, -0.2, 0.3, 0.04)); // 隊長席
  inside.add(span(seat, -1.4, -0.7, 0.55, 0.9, -0.58, -0.38, 0.04)); // 左の隊員席
  inside.add(span(seat, 1.6, 2.1, 0.7, 1.05, -0.8, -0.15, 0.04)); // 助手席
  inside.add(span(seat, 1.6, 2.1, 0.7, 1.05, 0.15, 0.8, 0.04)); // 運転席
  g.add(inside);

  // ── タイヤ ──
  for (const x of [AMB.frontAxle, AMB.rearAxle]) for (const s of [1, -1]) wheel(g, x, s * (HALF - 0.18), AMB.wheelR, 0.24, rubber, steel);
  return g;
}
