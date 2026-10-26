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
  frontAxle: 1.8, // 写真:前輪は短いボンネットのすぐ下
  rearAxle: -1.58, // ホイールベース約3.38m(スーパーロング)
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
  const { dark, glass, steel, rubber, redLamp, whiteLamp } = materials();
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f5f6, roughness: 0.35, metalness: 0.1 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xd3122a, roughness: 0.4 });
  const { front, rear, roof } = AMB;

  // ── 車体(ワンボックス・ハイルーフ。日産の写真に寄せる) ──
  const top = 1.75; // 屋根(ハイルーフ)の前端。この下からフロントガラスが前へ傾いて下りる
  const hood = { x: front - 0.28, y: 1.12 }; // フロントガラスの下端
  g.add(span(white, rear, top, 0.42, roof, -HALF, HALF, 0.1)); // 箱の部分
  g.add(span(white, top - 0.1, front - 0.08, 0.42, hood.y, -HALF + 0.02, HALF - 0.02, 0.14)); // 鼻先とドアの下半分
  // フロントガラスの傾斜(三角柱)とガラス
  const slope = new THREE.Shape([new THREE.Vector2(top - 0.02, 2.06), new THREE.Vector2(top - 0.02, hood.y - 0.02), new THREE.Vector2(hood.x, hood.y - 0.02)]);
  const wedge = new THREE.Mesh(new THREE.ExtrudeGeometry(slope, { depth: AMB.width - 0.08, bevelEnabled: false }), white);
  wedge.position.z = -(AMB.width - 0.08) / 2;
  g.add(wedge);
  const wsLen = Math.hypot(hood.x - top, 2.06 - hood.y);
  const ws = box(wsLen * 0.95, 0.02, AMB.width - 0.2, glass, (top + hood.x) / 2 + 0.012, (2.06 + hood.y) / 2 + 0.012, 0);
  ws.rotation.z = -Math.atan2(2.06 - hood.y, hood.x - top);
  g.add(ws);
  // 屋根の前の張り出し(ガラスの上)
  g.add(span(white, top - 0.05, top + 0.12, 2.0, roof, -HALF + 0.04, HALF - 0.04, 0.08));
  // 顔:メッキのグリルとエンブレム、流れたヘッドライト、フォグ
  g.add(span(steel, front - 0.1, front - 0.05, 0.78, 1.02, -0.5, 0.5, 0.03));
  g.add(span(dark, front - 0.09, front - 0.04, 0.82, 0.98, -0.42, 0.42));
  g.add(box(0.03, 0.14, 0.14, steel, front - 0.035, 0.9, 0, 0.05)); // エンブレム
  for (const s of [1, -1]) {
    const hl = box(0.3, 0.13, 0.32, whiteLamp, front - 0.18, 0.95, s * 0.72, 0.04);
    hl.rotation.y = s * 0.35;
    g.add(hl);
    g.add(box(0.03, 0.07, 0.1, whiteLamp, front - 0.02, 0.55, s * 0.62, 0.02)); // フォグ
  }
  g.add(span(white, front - 0.2, front, 0.36, 0.72, -HALF + 0.03, HALF - 0.03, 0.08)); // バンパー
  g.add(span(dark, front - 0.03, front + 0.005, 0.4, 0.5, -0.7, 0.7)); // 下の開口
  g.add(span(steel, front - 0.01, front + 0.005, 0.5, 0.64, -0.24, 0.24)); // ナンバー台

  // 側面:「PARAMEDIC」の文字(DOM の無いテストでは省略)
  const label = (() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 64;
    const x = c.getContext('2d');
    if (!x) return null;
    x.fillStyle = '#d3122a';
    x.font = 'bold 48px sans-serif';
    x.textBaseline = 'middle';
    x.fillText('PARAMEDIC', 8, 34);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: t, transparent: true });
  })();

  for (const s of [1, -1] as const) {
    const zf = s * HALF;
    g.add(span(stripe, rear + 0.02, front - 0.12, 0.98, 1.09, zf - s * 0.005, zf + s * 0.008)); // 赤い帯(腰の高さに1本)
    // 窓はスモーク:前ドア、スライドドア、後ろの2枚
    g.add(span(glass, 1.12, top - 0.08, 1.3, 1.95, zf - s * 0.005, zf + s * 0.01));
    g.add(span(glass, 0.15, 1.0, 1.32, 1.98, zf - s * 0.005, zf + s * 0.01));
    g.add(span(glass, -0.95, 0.05, 1.32, 1.98, zf - s * 0.005, zf + s * 0.01));
    g.add(span(glass, -2.2, -1.02, 1.32, 1.98, zf - s * 0.005, zf + s * 0.01));
    for (const x of [1.08, 0.08]) g.add(span(dark, x - 0.01, x + 0.01, 0.45, 2.08, zf, zf + s * 0.012)); // ドアの合わせ目
    g.add(span(dark, 0.62, 0.85, 1.17, 1.21, zf, zf + s * 0.02)); // スライドドアの取っ手
    g.add(span(dark, 1.2, 1.35, 1.17, 1.21, zf, zf + s * 0.02)); // 前ドアの取っ手
    // ミラー(ドアに付いた黒いミラー)
    g.add(box(0.04, 0.04, 0.18, dark, top - 0.02, 1.72, s * (HALF + 0.08)));
    g.add(box(0.05, 0.26, 0.13, dark, top - 0.02, 1.7, s * (HALF + 0.17), 0.03));
    if (label) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), label);
      p.position.set(-0.2, 2.17, zf + s * 0.012);
      p.rotation.y = s > 0 ? 0 : Math.PI;
      g.add(p);
    }
    g.add(span(whiteLamp, 0.35, 0.5, 2.14, 2.2, zf, zf + s * 0.01)); // 屋根横の小さな灯火
  }
  // 屋根の赤色灯:前の縁と後ろの縁
  g.add(span(redLamp, top - 0.06, top + 0.14, roof - 0.03, roof + 0.1, -0.84, 0.84, 0.05)); // 前:屋根の縁に沿った細めの灯
  g.add(span(redLamp, rear + 0.04, rear + 0.32, roof - 0.03, AMB.height, -0.9, 0.9, 0.05)); // 後ろ:横長の灯
  // 後ろ:大きな1枚ドア、スモークの窓、縦長のテールランプ、縞鋼板のステップ
  g.add(span(glass, rear - 0.012, rear, 1.38, 2.08, -0.72, 0.72));
  g.add(span(dark, rear - 0.012, rear, 0.62, 0.64, -0.75, 0.75));
  g.add(span(steel, rear - 0.015, rear, 0.95, 1.08, -0.18, 0.18)); // エンブレム・ナンバーまわり
  for (const s of [1, -1]) {
    g.add(span(redLamp, rear - 0.03, rear + 0.01, 0.95, 1.5, s * 0.8, s * 0.93));
    g.add(span(whiteLamp, rear - 0.03, rear + 0.01, 0.85, 0.94, s * 0.8, s * 0.93));
  }
  g.add(span(white, rear - 0.12, rear + 0.1, 0.36, 0.6, -HALF + 0.02, HALF - 0.02, 0.05)); // 後ろのバンパー
  g.add(span(steel, rear - 0.25, rear - 0.05, 0.42, 0.46, -0.75, 0.75)); // ステップ

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
