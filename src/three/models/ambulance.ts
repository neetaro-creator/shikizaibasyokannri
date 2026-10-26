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

// 車内の配置は車内の写真(R8.10)から。後ろから見て:
// 前の仕切り = 左に I・J(吊り戸棚)と K(床置き)、中央が運転席への通路、右に A(扉の表に手袋・ティッシュ)、上に B
// 右壁(機器の壁)= 前から C(上)・スイッチ盤・D(棚)・吸引器と E/F 引出し・モニター・G(上のマスク箱)・時計・除細動器・観察バック・H(ガラス戸)と上部棚
// 左壁 = スライドドア、長いすの N(座面の下)、窓の上の M
// L 収納と各バッグ(特定行為・分娩・挿管・気道管理)は写真で位置を確かめられていないので仮置き。
const RW = { z0: 0.58, z1: 0.86 }; // 右壁の棚
const LW = { z0: -0.86, z1: -0.58 }; // 左壁
const PART = { x0: 1.0, x1: 1.25 }; // 前の仕切りの棚

const HOTSPOTS: Record<string, Hotspot | null> = {
  // キャブ
  '運転席・助手席付近': at(1.55, 2.3, 0.9, 1.9, -0.85, 0.85),
  助手席後ろ: at(1.27, 1.5, 0.7, 1.6, -0.85, -0.1),
  // 前の仕切り(右寄り):A 収納。扉の表(手袋・ティッシュ)、扉の裏、中の段
  'A収納扉(表)': at(0.94, 0.99, 0.75, 1.93, 0.05, 0.55),
  'A収納扉(裏)': at(1.0, 1.05, 0.75, 1.93, 0.05, 0.55),
  A収納: at(1.06, PART.x1, 1.6, 1.93, 0.05, 0.55),
  'A収納 黒かばん': at(1.06, PART.x1, 1.22, 1.58, 0.05, 0.55),
  'A収納 外傷バック': at(1.06, PART.x1, 0.95, 1.2, 0.05, 0.29),
  'A収納 外傷バック オレンジポ―チ内': at(1.06, PART.x1, 0.95, 1.2, 0.31, 0.55),
  'A収納 オレンジポ―チ内': at(1.06, PART.x1, 0.75, 0.93, 0.05, 0.55),
  // 前の仕切りの上(通路の上)
  B収納: at(0.95, PART.x1, 1.95, 2.25, -0.45, 0.45),
  // 前の仕切り(左、スライドドアの前):I・J の吊り戸棚と床置きの K
  I収納: at(PART.x0, PART.x1, 1.73, 1.9, -0.84, -0.47),
  'I収納 薬剤バッグ': at(PART.x0, PART.x1, 1.55, 1.71, -0.84, -0.47),
  J収納: at(PART.x0, PART.x1, 1.18, 1.53, -0.84, -0.47),
  'K収納 小児バッグ': at(0.95, PART.x1, 0.55, 1.05, -0.84, -0.42),
  // 右壁(前から後ろへ)
  C収納: at(0.45, 1.25, 1.88, 2.22, RW.z0, RW.z1),
  D収納: at(0.8, 1.25, 1.12, 1.5, RW.z0, RW.z1),
  E収納: at(0.42, 0.8, 0.97, 1.1, RW.z0, RW.z1),
  F収納: at(0.42, 0.8, 0.83, 0.96, RW.z0, RW.z1),
  G収納: at(-0.5, 0.25, 1.85, 2.05, RW.z0, RW.z1),
  患者室右側: at(-1.15, 0.25, 1.63, 1.83, RW.z0, RW.z1), // 時計・血圧計・レールのあたり
  '患者室右側 モニター部': at(-0.05, 0.42, 1.2, 1.6, RW.z0, RW.z1),
  '患者室右側 除細動器': at(-0.85, -0.42, 1.0, 1.45, RW.z0, RW.z1),
  '患者室右側 観察バック': at(-1.15, -1.0, 1.0, 1.36, RW.z0, RW.z1),
  '患者室右側 観察バック 血糖測定器': at(-0.98, -0.88, 1.0, 1.36, RW.z0, RW.z1),
  H収納上部棚: at(-1.9, -1.25, 1.66, 1.86, RW.z0, RW.z1),
  H収納: at(-1.95, -1.2, 1.0, 1.62, RW.z0, RW.z1),
  メインストレッチャー右側収納: at(-2.05, -0.9, 0.55, 0.95, RW.z0, RW.z1),
  L収納: at(0.0, 0.8, 0.55, 0.8, RW.z0, RW.z1), // 仮:写真で未確認
  // 左壁:長いす(N は座面の下)、窓の上の M
  M収納: at(-1.6, 0.9, 1.95, 2.25, LW.z0, LW.z1),
  N収納: at(-2.35, -0.95, 0.55, 0.9, LW.z0, -0.45),
  // 長いすの上に各バッグ(仮:写真で未確認)
  特定行為バック: at(-2.35, -2.0, 0.92, 1.2, LW.z0, -0.5),
  分娩新生児バッグ: at(-1.98, -1.63, 0.92, 1.2, LW.z0, -0.5),
  気管挿管バッグ: at(-1.61, -1.26, 0.92, 1.2, LW.z0, -0.5),
  気道管理バッグ: at(-1.24, -0.97, 1.16, 1.27, LW.z0, -0.5),
  '気道管理バッグ メイン収納': at(-1.24, -0.97, 1.08, 1.15, LW.z0, -0.5),
  セカンド収納: at(-1.24, -0.97, 1.0, 1.07, LW.z0, -0.5),
  サード: at(-1.24, -0.97, 0.92, 0.99, LW.z0, -0.5),
  // 天井・中央・スライドドア
  患者室天井: at(-2.2, 0.8, 2.25, 2.31, -0.4, 0.4),
  患者室中央: at(-2.3, -0.3, 0.7, 1.0, -0.3, 0.35),
  右スライドドア収納: at(0.3, 0.85, 0.6, 2.1, 0.87, 0.94),
  左スライドドア収納: at(0.15, 0.95, 0.6, 2.1, -0.94, -0.87),
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
  inside.add(span(bed, -2.3, -0.3, 0.75, 0.9, -0.3, 0.35, 0.04)); // メインストレッチャー
  inside.add(span(cabinet, -2.5, 1.25, 0.55, 2.25, RW.z0 - 0.02, RW.z0)); // 右壁(機器の壁)の面
  inside.add(span(cabinet, -2.05, 0.8, 0.95, 1.0, RW.z0 - 0.12, RW.z1)); // 右壁のカウンター
  inside.add(span(screen, -0.05, 0.42, 1.25, 1.55, RW.z0 - 0.04, RW.z0 - 0.02)); // モニター
  inside.add(span(cabinet, -2.4, -0.9, 0.55, 0.9, LW.z0, -0.45)); // 左の長いす
  inside.add(span(cabinet, PART.x1, PART.x1 + 0.02, 0.55, 2.25, -0.86, -0.45)); // 前の仕切り(左)
  inside.add(span(cabinet, PART.x1, PART.x1 + 0.02, 0.55, 2.25, 0.05, 0.86)); // 前の仕切り(右)
  inside.add(span(seat, -0.9, -0.55, 0.55, 0.95, LW.z0, -0.45, 0.04)); // 長いす前の隊員席
  inside.add(span(seat, 1.6, 2.1, 0.7, 1.05, -0.8, -0.15, 0.04)); // 助手席
  inside.add(span(seat, 1.6, 2.1, 0.7, 1.05, 0.15, 0.8, 0.04)); // 運転席
  g.add(inside);

  // ── タイヤ ──
  for (const x of [AMB.frontAxle, AMB.rearAxle]) for (const s of [1, -1]) wheel(g, x, s * (HALF - 0.18), AMB.wheelR, 0.24, rubber, steel);
  return g;
}
