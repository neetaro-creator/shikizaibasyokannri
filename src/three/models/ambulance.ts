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
// 前の仕切り = 左に I・J(吊り戸棚)と K(床置き)、中央が運転席への通路、右に A、上に B
//   A は仕切りをまたぐ縦長の箱で、扉は車両左側(通路側)の面。その面の左(前寄り)が蝶番。中は3段の棚。
//   扉の表に手袋・ティッシュ・書類ポケット、裏にネット。後ろ向きの面にはフック(LED 安全ベストなど)
// 右スライドドア収納は外からだけ開ける(酸素ボンベ・工具・車止め)
// 右壁(機器の壁)= 前から C(上)・スイッチ盤・D(棚)・吸引器と E/F 引出し・モニター・G(上のマスク箱)・時計・除細動器・観察バック・H(ガラス戸)と上部棚
// 左壁 = 長いすの N(座面の下)、窓の上の M、スライドドアの上の L
// 各バッグ:特定行為・外傷は A の上の段、分娩新生児は A の下の段、気道管理は K の横の床。気管挿管は車から下ろしている。
const RW = { z0: 0.58, z1: 0.86 }; // 右壁の棚
const LW = { z0: -0.86, z1: -0.58 }; // 左壁
const PART = { x0: 1.0, x1: 1.25 }; // 前の仕切りの棚

const HOTSPOTS: Record<string, Hotspot | Hotspot[] | null> = {
  // キャブ
  '運転席・助手席付近': at(1.55, 2.2, 0.75, 1.42, -0.22, 0.22), // 前席の間のセンターコンソールとタブレット
  助手席後ろ: at(1.27, 1.5, 0.7, 1.6, -0.85, -0.45),
  // 前の仕切り(右寄り):A 収納。扉は通路側(-Z)の面。扉の表、扉の裏(90°開いた扉の位置)、中の3段
  'A収納扉(表)': at(1.0, 1.48, 0.75, 1.93, 0.0, 0.05),
  'A収納扉(裏)': at(1.44, 1.52, 0.75, 1.93, -0.43, 0.0),
  // 上の段:向かって左(前寄り)が特定行為バック、右(後ろ寄り)が外傷バック(中にオレンジポーチ2つ)
  特定行為バック: at(1.25, 1.47, 1.42, 1.85, 0.06, 0.54),
  'A収納 外傷バック': at(1.01, 1.24, 1.42, 1.85, 0.06, 0.4),
  'A収納 外傷バック オレンジポ―チ内': at(1.01, 1.24, 1.42, 1.63, 0.41, 0.54),
  'A収納 オレンジポ―チ内': at(1.01, 1.24, 1.64, 1.85, 0.41, 0.54),
  // 中の段:左(前寄り)に黒かばん、右に青いかばん(ボディーフィックス・トリアージタッグ = A収納)
  'A収納 黒かばん': at(1.29, 1.47, 1.02, 1.38, 0.06, 0.54),
  A収納: at(1.01, 1.28, 1.02, 1.38, 0.06, 0.54),
  // 下の段
  分娩新生児バッグ: at(1.01, 1.47, 0.6, 0.98, 0.06, 0.54),
  // K の横の床の赤いバッグ(上から、バッグ外側・メイン・セカンド・サード)
  気道管理バッグ: at(0.6, 0.93, 0.81, 0.9, -0.42, -0.01),
  '気道管理バッグ メイン収納': at(0.6, 0.93, 0.72, 0.8, -0.42, -0.01),
  セカンド収納: at(0.6, 0.93, 0.63, 0.71, -0.42, -0.01),
  サード: at(0.6, 0.93, 0.53, 0.62, -0.42, -0.01),
  // 前の仕切りの上(通路の上)
  B収納: at(0.95, PART.x1, 1.95, 2.25, -0.45, 0.45),
  // 前の仕切り(左、スライドドアの前):I・J の吊り戸棚と床置きの K
  I収納: at(PART.x0, PART.x1, 1.73, 1.9, -0.84, -0.47),
  'I収納 薬剤バッグ': at(PART.x0, PART.x1, 1.55, 1.71, -0.84, -0.47),
  J収納: at(PART.x0, PART.x1, 1.18, 1.53, -0.84, -0.47),
  'K収納 小児バッグ': at(0.97, 1.23, 0.56, 1.02, -0.83, -0.51), // K の中(2段。上に小児バッグと膿盆、下に尿器・アルサワーなど)
  // 右壁(前から後ろへ)
  C収納: at(0.45, 1.25, 1.88, 2.22, RW.z0, RW.z1),
  D収納: at(0.8, 1.25, 1.12, 1.5, RW.z0, RW.z1),
  E収納: at(0.42, 0.8, 0.97, 1.1, RW.z0, RW.z1),
  F収納: at(0.42, 0.8, 0.83, 0.96, RW.z0, RW.z1),
  G収納: at(-0.5, 0.25, 1.85, 2.05, RW.z0, RW.z1),
  // 患者室右側は何か所かに分かれている:頭側の座席の下(まくら・セイフキープ)、D の下の酸素ボンベ10L×2、
  // 吸引器、時計・レールのあたり
  患者室右側: [
    at(0.42, 0.93, 0.52, 0.82, 0.2, RW.z1),
    at(0.8, 1.25, 0.83, 1.1, RW.z0, RW.z1),
    at(0.44, 0.76, 1.12, 1.45, RW.z0 + 0.04, RW.z1),
    at(-1.15, 0.25, 1.63, 1.83, RW.z0, RW.z1),
    at(0.9, 0.97, 1.0, 1.75, 0.1, 0.5), // A の後ろ向きの面のフック(LED 安全ベスト)
  ],
  '患者室右側 モニター部': at(-0.05, 0.42, 1.2, 1.6, RW.z0, RW.z1),
  '患者室右側 除細動器': at(-0.85, -0.42, 1.0, 1.45, RW.z0, RW.z1),
  '患者室右側 観察バック': at(-1.15, -1.0, 1.0, 1.36, RW.z0, RW.z1),
  '患者室右側 観察バック 血糖測定器': at(-0.98, -0.88, 1.0, 1.36, RW.z0, RW.z1),
  H収納上部棚: at(-1.9, -1.25, 1.66, 1.86, RW.z0, RW.z1),
  H収納: at(-1.95, -1.2, 1.0, 1.62, RW.z0, RW.z1),
  メインストレッチャー右側収納: at(-2.05, -0.9, 0.55, 0.95, RW.z0, RW.z1),
  // 左壁:長いす(N は座面の下)、窓の上の M、スライドドアの上の L
  M収納: at(-1.6, 0.1, 1.95, 2.25, LW.z0, LW.z1),
  L収納: at(0.15, 0.95, 1.95, 2.25, LW.z0, LW.z1), // スライドドアの上
  N収納: at(-2.35, -0.95, 0.55, 0.9, LW.z0, -0.45),
  // 天井・中央・スライドドア
  患者室天井: at(-2.2, 0.8, 2.25, 2.31, -0.4, 0.4),
  リアハッチ上部収納: at(-2.58, -2.45, 2.0, 2.3, 0.05, 0.75), // 後ろのドアの上、右寄りのネット(点検表に無いので取り込み設定の extra)
  患者室中央: at(-2.3, -0.3, 0.7, 1.0, -0.3, 0.35),
  右スライドドア収納: at(0.2, 1.0, 0.55, 2.0, 0.87, 0.95), // 外から開ける
  左スライドドア収納: at(0.8, 0.95, 0.3, 0.5, -0.93, -0.72), // ステップの前の端の「車載工具」の蓋
  '左スライドドアジャッキ収納': at(0.15, 0.3, 0.3, 0.5, -0.93, -0.72), // ステップの後ろの端
  // 救急車の外(3D には置かない)
  '緊急持ち出しバッグ(タンク車内)': null,
  気管挿管バッグ: null, // 今は車から下ろしている
  救急資器材庫: null,
};

/** 点検表の場所名 → 3D 上の箱。null は「車の外なので置かない」、undefined は未対応。 */
export function ambulanceHotspot(name: string): Hotspot | Hotspot[] | null | undefined {
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

  // ── タイヤ ──
  for (const x of [AMB.frontAxle, AMB.rearAxle]) for (const s of [1, -1]) wheel(g, x, s * (HALF - 0.18), AMB.wheelR, 0.24, rubber, steel);

  // ここまでが外観。車内視点ではまとめて隠す
  const exterior = new THREE.Group();
  exterior.name = 'exterior';
  exterior.add(...[...g.children]);
  g.add(exterior, buildInterior());
  // 画面側への手がかり:外から開ける収納、車内で特定の位置から見る収納
  g.userData.outsideAccess = ['右スライドドア収納'];
  g.userData.eyes = {
    // A は通路側の面が開くので、通路の左後ろから見る。開いた扉の裏(ネット)は後ろから
    'A収納扉(表)': [0.5, 1.45, -0.55],
    'A収納扉(裏)': [0.55, 1.4, -0.25],
    A収納: [0.5, 1.45, -0.55],
    特定行為バック: [0.5, 1.45, -0.55],
    'A収納 外傷バック': [0.5, 1.45, -0.55],
    'A収納 外傷バック オレンジポ―チ内': [0.5, 1.45, -0.55],
    'A収納 オレンジポ―チ内': [0.5, 1.45, -0.55],
    'A収納 黒かばん': [0.5, 1.45, -0.55],
    分娩新生児バッグ: [0.5, 1.45, -0.55],
    リアハッチ上部収納: [-1.3, 1.5, -0.15],
    'K収納 小児バッグ': [0.05, 1.35, -0.72],
    患者室右側: [-0.75, 1.55, -0.35],
    // キャブは患者室の通路から前を見る。助手席の後ろは前席の間から振り返る
    '運転席・助手席付近': [0.3, 1.5, -0.18],
    助手席後ろ: [2.25, 1.5, 0.4],
    // ステップの蓋は、反対側の端から斜めに見下ろす
    左スライドドア収納: [0.05, 1.15, -0.1],
    左スライドドアジャッキ収納: [0.5, 1.2, 0.0],
  };
  return g;
}

/** 患者室とキャブの中。外観と材質を共有しない(外観を透かしても中は透けない)。 */
function buildInterior(): THREE.Group {
  const inside = new THREE.Group();
  inside.name = 'interior';
  inside.userData.interior = true;
  const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  const wall = mat(0xeceee9, { side: THREE.DoubleSide });
  const white = mat(0xf3f3ef, { roughness: 0.4 });
  const beige = mat(0xd8d2c4, { roughness: 0.8 });
  const dark = mat(0x23272d, { roughness: 0.5 });
  const smoke = mat(0x1d2830, { roughness: 0.1, metalness: 0.3 });
  const frosted = mat(0xb9c7bc, { roughness: 0.3, emissive: 0x6f7f74, emissiveIntensity: 0.25 });
  const steel = mat(0xc9ced4, { roughness: 0.3, metalness: 0.8 });
  const screen = mat(0x1e2a36, { emissive: 0x2a8f6a, emissiveIntensity: 0.35 });
  const orange = mat(0xf0561e);
  const yellow = mat(0xe3d92a);
  const green = mat(0x8fd39a);
  const red = mat(0xc8142c);
  const lamp = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 });
  const mattress = mat(0x9fbdd3, { roughness: 0.9 });
  const add = (m: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0) => inside.add(span(m, x0, x1, y0, y1, z0, z1, r));

  const IN = { rear: -2.58, front: 1.26, floor: 0.52, ceil: 2.32, z: 0.88 };
  // 殻(床・天井・壁)。外観で見るときは隠す
  const shell = new THREE.Group();
  shell.name = 'shell';
  shell.userData.shell = true;
  for (const m of [
    // 床(左スライドドアの所はステップで一段下がる)
    span(mat(0x8d9399), IN.rear, IN.front, IN.floor - 0.02, IN.floor, -0.7, IN.z),
    span(mat(0x8d9399), IN.rear, 0.15, IN.floor - 0.02, IN.floor, -IN.z, -0.7),
    span(mat(0x8d9399), 0.95, IN.front, IN.floor - 0.02, IN.floor, -IN.z, -0.7),
    span(mat(0xdcd9d2, { side: THREE.DoubleSide }), IN.rear, IN.front, IN.ceil, IN.ceil + 0.02, -IN.z, IN.z), // 天井
    span(wall, IN.rear, IN.front, IN.floor, IN.ceil, IN.z, IN.z + 0.02), // 右壁
    span(wall, IN.rear, IN.front, IN.floor, IN.ceil, -IN.z - 0.02, -IN.z), // 左壁
    span(wall, IN.rear - 0.02, IN.rear, IN.floor, IN.ceil, -IN.z, IN.z), // 後ろのドア
    // 前の仕切り(運転席への通路と A の棚の口を空ける)
    span(wall, IN.front, IN.front + 0.02, IN.floor, IN.ceil, -IN.z, -0.42),
    span(wall, IN.front, IN.front + 0.02, IN.floor, 0.75, -0.42, 0.05),
    span(wall, IN.front, IN.front + 0.02, 1.9, IN.ceil, -0.42, 0.05),
    span(wall, IN.front, IN.front + 0.02, IN.floor, IN.ceil, 0.55, IN.z),
    span(wall, IN.front, IN.front + 0.02, IN.floor, 0.6, 0.05, 0.55),
    span(wall, IN.front, IN.front + 0.02, 1.9, IN.ceil, 0.05, 0.55),
  ]) shell.add(m);
  // キャブの殻:床・天井・横の壁(窓)・フロントガラス
  const CAB = { x0: IN.front + 0.02, x1: 2.45, floor: 0.45, ceil: 2.0 };
  const cabWall = mat(0x3a3f46, { side: THREE.DoubleSide });
  const cabGlass = mat(0x9fb4c4, { transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  for (const m of [
    span(mat(0x2a2d31), CAB.x0, CAB.x1, CAB.floor - 0.02, CAB.floor, -IN.z, IN.z),
    span(mat(0x55595f, { side: THREE.DoubleSide }), CAB.x0, 1.95, CAB.ceil, CAB.ceil + 0.02, -IN.z, IN.z),
  ]) shell.add(m);
  for (const sgn of [1, -1]) {
    const z0 = sgn * IN.z, z1 = sgn * (IN.z + 0.02);
    shell.add(span(cabWall, CAB.x0, CAB.x1, CAB.floor, 1.3, z0, z1));
    shell.add(span(cabWall, CAB.x0, 1.12, 1.3, CAB.ceil, z0, z1));
    shell.add(span(cabGlass, 1.12, 1.95, 1.3, 1.92, z0, z1));
  }
  const wsGlass = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.01, 2 * IN.z), cabGlass);
  wsGlass.position.set(2.15, 1.55, 0);
  wsGlass.rotation.z = -Math.atan2(0.9, 0.6);
  shell.add(wsGlass);
  inside.add(shell);
  // 窓(すりガラス)、後ろの窓、運転席への通路
  add(frosted, -2.2, -1.0, 1.3, 1.9, -IN.z + 0.001, -IN.z + 0.006);
  add(frosted, IN.rear + 0.001, IN.rear + 0.006, 1.38, 2.0, -0.6, 0.6);
  // 左のスライドドア(内張りと窓、取っ手)
  add(mat(0xe1e2dc), 0.15, 0.95, 0.55, 1.95, -IN.z + 0.001, -IN.z + 0.006);
  add(frosted, 0.25, 0.9, 1.32, 1.88, -IN.z + 0.006, -IN.z + 0.01);
  add(dark, 0.2, 0.24, 1.0, 1.25, -IN.z + 0.006, -IN.z + 0.04);

  // 左スライドドアのステップ(縞鋼板)と、前後の端の蓋(車載工具・ジャッキ)
  const grey = mat(0x5f646b);
  add(steel, 0.15, 0.95, 0.3, 0.32, -IN.z, -0.7);
  add(grey, 0.15, 0.95, 0.32, IN.floor, -0.72, -0.7);
  add(grey, 0.8, 0.95, 0.32, IN.floor, -IN.z, -0.72);
  add(grey, 0.15, 0.3, 0.32, IN.floor, -IN.z, -0.72);
  // 前の仕切り:左に I・J と床置きの K(中は2段)、右に A、上に B、床に気道管理バッグ
  add(white, 1.0, 1.25, 1.18, 1.9, -0.84, -0.47);
  add(dark, 0.995, 1.0, 1.535, 1.545, -0.84, -0.47);
  // K:箱(前が開く)と中の棚・品、通路側の隙間の青い板
  add(white, 0.96, 1.25, 1.03, 1.06, -0.84, -0.5); // 天板(上にバインダー)
  add(dark, 0.98, 1.2, 1.06, 1.08, -0.8, -0.55);
  add(white, 1.23, 1.25, 0.55, 1.03, -0.84, -0.5); // 奥
  for (const z of [-0.84, -0.51]) add(white, 0.96, 1.25, 0.55, 1.03, z, z + 0.01);
  add(white, 0.96, 1.23, 0.79, 0.81, -0.83, -0.51); // 中の棚
  add(mat(0x1f2a4a), 1.0, 1.21, 0.81, 0.97, -0.82, -0.53, 0.03); // 小児バッグ(紺)
  add(steel, 1.02, 1.18, 0.97, 0.99, -0.78, -0.58); // 膿盆
  add(white, 1.0, 1.21, 0.56, 0.74, -0.82, -0.66, 0.02); // 尿器など
  add(mat(0xffffff, { transparent: true, opacity: 0.6 }), 1.0, 1.15, 0.56, 0.7, -0.65, -0.57, 0.02); // ビニール袋
  add(red, 1.05, 1.1, 0.56, 0.76, -0.56, -0.52); // アルサワー
  add(mat(0x3d7fd0), 1.0, 1.22, 0.6, 1.0, -0.48, -0.43, 0.02);
  const kDoor = new THREE.Group();
  kDoor.name = 'door-K';
  kDoor.position.set(0.955, 0, -0.5); // 通路側の縁が蝶番
  kDoor.userData.opensFor = ['K収納 小児バッグ'];
  kDoor.userData.openAngle = 1.65;
  kDoor.add(span(white, -0.015, 0.0, 0.55, 1.03, -0.34, 0));
  kDoor.add(span(mat(0x2f6fd0), -0.02, -0.015, 0.62, 0.95, -0.27, -0.06)); // ホワイトボードの枠
  kDoor.add(span(white, -0.022, -0.02, 0.64, 0.93, -0.25, -0.08));
  const kl = letter('K');
  if (kl) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), kl);
    p.position.set(-0.025, 0.98, -0.06);
    p.rotation.y = -Math.PI / 2;
    kDoor.add(p);
  }
  inside.add(kDoor);
  // 頭側の隊員席(ストレッチャーの頭の前、後ろ向き)
  add(steel, 0.66, 0.72, IN.floor, 0.85, 0.3, 0.36);
  add(beige, 0.5, 0.88, 0.85, 0.95, 0.14, 0.52, 0.04);
  // A:仕切りをまたぐ縦長の箱。通路側(-Z)が開き、中は3段の棚とかばん
  add(white, 1.0, 1.48, 0.6, 1.93, 0.54, 0.56); // 奥(右壁側)
  add(white, 0.98, 1.0, 0.6, 1.93, 0.05, 0.56); // 後ろ向きの面(フック側)
  add(white, 1.48, 1.5, 0.6, 1.93, 0.05, 0.56); // 前の面
  for (const y of [0.98, 1.38, 1.91]) add(white, 1.0, 1.48, y, y + 0.02, 0.05, 0.55);
  add(red, 1.26, 1.46, 1.4, 1.78, 0.08, 0.52, 0.04); // 特定行為バック
  add(red, 1.02, 1.23, 1.4, 1.78, 0.08, 0.52, 0.04); // 外傷バック
  add(dark, 1.3, 1.45, 1.0, 1.28, 0.1, 0.5, 0.03); // 黒かばん
  add(mat(0x2f78c4), 1.02, 1.28, 1.0, 1.35, 0.08, 0.52, 0.04); // ボディーフィックス
  add(mat(0xe8452a), 1.05, 1.45, 0.6, 0.94, 0.1, 0.5, 0.04); // 分娩新生児バッグ
  // 後ろ向きの面のフックと、掛けてある LED 安全ベスト
  for (const z of [0.2, 0.35]) add(steel, 0.95, 0.98, 1.8, 1.84, z, z + 0.03);
  add(mat(0xb8bec4, { metalness: 0.6, roughness: 0.3 }), 0.92, 0.97, 1.05, 1.78, 0.12, 0.48, 0.02);
  // A の扉:通路側の面の、前寄りの縁が蝶番。表に手袋・ティッシュ・書類ポケット・誘導灯、裏にネット
  const door = new THREE.Group();
  door.name = 'door-A';
  door.position.set(1.48, 0, 0.05);
  door.userData.opensFor = ['A収納扉(裏)', 'A収納', '特定行為バック', '分娩新生児バッグ', 'A収納 黒かばん', 'A収納 外傷バック', 'A収納 外傷バック オレンジポ―チ内', 'A収納 オレンジポ―チ内'];
  door.userData.openAngle = -Math.PI / 2;
  for (const m of [
    span(white, -0.48, 0, 0.6, 1.93, -0.015, 0.015),
    span(green, -0.24, -0.04, 1.5, 1.85, -0.07, -0.015),
    span(green, -0.45, -0.26, 1.5, 1.85, -0.07, -0.015),
    span(mat(0xf2a6c4), -0.36, -0.12, 1.3, 1.45, -0.06, -0.015), // ティッシュ
    span(mat(0xdde3e8), -0.42, -0.08, 0.85, 1.15, -0.05, -0.015), // 書類ポケット
    span(red, -0.06, -0.03, 1.05, 1.3, -0.05, -0.02), // 誘導灯
    span(steel, -0.47, -0.45, 1.25, 1.35, -0.03, -0.015), // 取っ手
    span(mat(0x5d6670), -0.43, -0.05, 0.8, 1.8, 0.015, 0.03), // 裏のネット
  ]) door.add(m);
  const a = letter('A');
  if (a) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), a);
    p.position.set(-0.43, 1.88, -0.02);
    p.rotation.y = Math.PI;
    door.add(p);
  }
  inside.add(door);
  add(white, 0.95, 1.25, 1.95, 2.25, -0.45, 0.45);
  add(red, 0.62, 0.91, 0.53, 0.88, -0.4, -0.03, 0.04); // 気道管理バッグ(長い辺を通路に向けて立てて置く)

  // 右壁(機器の壁)
  add(white, -2.05, 0.8, 0.95, 1.0, 0.5, IN.z); // カウンター
  add(steel, -2.05, -0.9, 0.56, 0.94, 0.6, 0.62); // メインストレッチャー右側収納(スクープ・バックボード)
  add(white, -0.9, 0.8, 0.56, 0.94, 0.62, 0.64);
  add(white, -1.95, -1.2, 1.0, 1.62, 0.62, IN.z); // H(ガラス戸)
  add(smoke, -1.9, -1.25, 1.05, 1.57, 0.6, 0.62);
  add(white, -1.9, -1.25, 1.66, 1.86, 0.62, IN.z); // H の上の引出し
  add(yellow, -1.13, -1.0, 1.0, 1.33, 0.62, 0.86, 0.02); // 観察バック
  add(orange, -0.83, -0.45, 1.0, 1.42, 0.64, 0.86, 0.02); // 除細動器
  add(screen, -0.75, -0.53, 1.18, 1.36, 0.635, 0.64);
  add(white, -0.03, 0.4, 1.0, 1.2, 0.66, 0.86); // 人工呼吸器
  add(white, -0.03, 0.4, 1.22, 1.58, 0.64, 0.86, 0.02); // モニター
  add(screen, 0.0, 0.3, 1.27, 1.53, 0.635, 0.64);
  add(white, -0.22, -0.06, 1.66, 1.82, 0.84, 0.86); // 時計
  add(white, -0.62, -0.47, 1.64, 1.8, 0.78, 0.86); // 血圧計
  for (const y of [1.6, 1.84]) add(steel, -1.15, 0.25, y, y + 0.02, 0.84, 0.86); // レール
  add(white, -0.5, 0.25, 1.86, 2.04, 0.7, IN.z); // G(マスク)
  add(mat(0x2a46a8), 0.28, 0.55, 1.72, 2.0, 0.78, 0.86); // 酸素流量計(C の下、G の前)
  add(dark, -0.95, -0.65, 1.86, 2.08, 0.82, 0.86); // 聴診器のフック
  add(white, -0.98, -0.72, 1.62, 1.84, 0.7, 0.86, 0.02); // オゾン発生器(血圧計の後ろ隣)
  add(white, 0.45, 1.25, 1.88, 2.22, 0.6, IN.z); // C
  add(dark, 0.6, 1.2, 1.55, 1.75, 0.84, 0.86); // スイッチ盤
  add(white, 0.8, 1.25, 1.1, 1.12, 0.6, IN.z); // D の棚
  add(dark, 0.8, 1.25, 0.83, 1.1, 0.86, 0.87);
  // D の下から見える酸素ボンベ(10L)2本と、頭側の座席の下のまくら・セイフキープ・ケース・ゴミ箱
  for (const x of [0.92, 1.12]) {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.27, 16), dark);
    cyl.position.set(x, 0.965, 0.79);
    inside.add(cyl);
    add(steel, x - 0.02, x + 0.02, 1.0, 1.08, 0.7, 0.74);
  }
  add(mat(0x1d1f22), 0.62, 0.88, 0.52, 0.78, 0.76, 0.86, 0.03); // まくら
  add(white, 0.48, 0.72, 0.52, 0.76, 0.22, 0.46, 0.04); // セイフキープ
  add(mat(0x2e4a5a), 0.6, 0.98, 0.52, 0.78, 0.6, 0.75, 0.02); // ケース
  add(mat(0x4a3f36), 0.25, 0.55, 0.52, 0.82, 0.6, 0.86, 0.02); // ゴミ箱
  add(white, 0.86, 1.06, 1.12, 1.3, 0.64, 0.86); // D:プリンター
  add(mat(0xcfd8de, { transparent: true, opacity: 0.7 }), 0.84, 1.22, 1.32, 1.48, 0.62, 0.86); // D:透明のケース
  add(yellow, 0.44, 0.76, 1.12, 1.45, 0.66, 0.86, 0.03); // 吸引器(D の後ろ隣)
  add(white, 0.42, 0.8, 0.97, 1.1, 0.6, IN.z); // E
  add(white, 0.42, 0.8, 0.83, 0.96, 0.6, IN.z); // F

  // 左壁:長いす(N は座面の下)、前の隊員席、窓の上の M、スライドドアの上の L
  add(white, -2.35, -0.95, 0.52, 0.82, -IN.z, -0.5);
  add(beige, -2.35, -0.95, 0.82, 0.9, -IN.z, -0.48, 0.03);
  add(beige, -2.35, -0.95, 0.95, 1.25, -IN.z, -0.82, 0.03);
  add(beige, -0.9, -0.5, 0.55, 0.9, -IN.z, -0.45, 0.04);
  add(beige, -0.9, -0.5, 0.9, 1.45, -IN.z, -0.78, 0.04);
  add(white, -1.6, 0.1, 1.95, 2.25, -IN.z, -0.6);
  add(dark, -1.55, 0.05, 1.98, 2.2, -0.6, -0.595);
  add(white, 0.15, 0.95, 1.95, 2.25, -IN.z, -0.6);
  add(dark, 0.2, 0.9, 1.98, 2.2, -0.6, -0.595);

  // 後ろのドアの上のネット(ストレッチャーメインカバー)
  add(mat(0x2f78c4), -2.57, -2.5, 2.05, 2.25, 0.1, 0.7, 0.02);
  add(mat(0x5d6670, { transparent: true, opacity: 0.55 }), -2.5, -2.49, 2.02, 2.28, 0.05, 0.75);
  // 天井:ネット、照明、点滴のレール
  add(mat(0x5d6670), -1.6, -0.6, 2.27, 2.3, -0.35, 0.35);
  add(mat(0x5d6670), 0.0, 0.8, 2.27, 2.3, -0.35, 0.2);
  for (const x of [-2.0, -0.3]) add(lamp, x - 0.25, x + 0.25, 2.29, 2.32, -0.7, -0.5);
  for (const x of [-1.2, 0.5]) add(lamp, x - 0.2, x + 0.2, 2.29, 2.32, 0.4, 0.55);
  add(steel, -2.2, 0.6, 2.18, 2.2, -0.05, -0.03);

  // メインストレッチャー
  add(steel, -2.3, -0.3, 0.6, 0.74, -0.3, 0.35);
  add(mattress, -2.25, -0.35, 0.74, 0.86, -0.27, 0.32, 0.04);

  // キャブ:座席(間にセンターコンソール)、ダッシュボード、タブレット、天井の計器盤、ハンドル(右ハンドル)
  const seat = mat(0xcfc9bc, { roughness: 0.8 });
  for (const [z0, z1] of [[-0.8, -0.25], [0.25, 0.8]]) {
    add(seat, 1.6, 2.05, 0.75, 0.95, z0, z1, 0.05);
    add(seat, 1.5, 1.62, 0.95, 1.65, z0 + 0.03, z1 - 0.03, 0.05);
    add(seat, 1.52, 1.6, 1.68, 1.85, z0 + 0.12, z1 - 0.12, 0.03); // ヘッドレスト
  }
  add(dark, 1.55, 2.15, 0.45, 1.0, -0.2, 0.2, 0.02); // センターコンソール(小物入れ)
  add(dark, 2.12, 2.18, 1.05, 1.4, -0.17, 0.15, 0.01); // タブレット
  add(screen, 2.115, 2.12, 1.09, 1.36, -0.14, 0.12);
  add(dark, 2.2, 2.45, 0.9, 1.2, -0.85, 0.85); // ダッシュボード
  add(dark, 1.85, 2.15, 1.94, 2.0, -0.22, 0.22); // 天井の計器盤
  add(white, 1.36, 1.44, 1.45, 1.75, 0.5, 0.75, 0.08); // 運転席の後ろのヘルメット
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), dark);
  wheelRing.position.set(2.1, 1.25, 0.5);
  wheelRing.rotation.y = Math.PI / 2;
  wheelRing.rotation.x = 0.4;
  inside.add(wheelRing);

  // 収納の記号(写真の扉に貼ってある A〜N)
  const labels: [string, number, number, number, 'x' | 'z+' | 'z-'][] = [
    ['B', 0.94, 2.1, 0.35, 'x'], ['I', 0.99, 1.83, -0.52, 'x'], ['J', 0.99, 1.46, -0.52, 'x'],
    ['C', 1.15, 2.12, 0.595, 'z-'], ['D', 1.18, 1.18, 0.855, 'z-'], ['E', 0.75, 1.03, 0.595, 'z-'], ['F', 0.75, 0.89, 0.595, 'z-'],
    ['G', 0.2, 1.95, 0.695, 'z-'], ['H', -1.85, 1.52, 0.595, 'z-'],
    ['M', -1.45, 2.09, -0.59, 'z+'], ['L', 0.3, 2.09, -0.59, 'z+'], ['N', -1.65, 0.68, -0.495, 'z+'],
  ];
  for (const [ch, x, y, z, face] of labels) {
    const m = letter(ch);
    if (!m) break;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), m);
    p.position.set(x, y, z);
    p.rotation.y = face === 'x' ? -Math.PI / 2 : face === 'z-' ? Math.PI : 0;
    inside.add(p);
  }
  return inside;
}

/** 扉に貼る記号(白地に黒文字)。DOM の無いテストでは null。 */
function letter(ch: string): THREE.Material | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  if (!x) return null;
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#111';
  x.lineWidth = 4;
  x.strokeRect(2, 2, 60, 60);
  x.fillStyle = '#111';
  x.font = 'bold 46px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(ch, 32, 35);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t });
}
