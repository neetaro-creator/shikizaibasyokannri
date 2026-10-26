import * as THREE from 'three';
import type { Hotspot } from '../../data/types';
import { box, materials, span, wheel } from './kit';

/**
 * 信楽指揮1(トヨタ ハイエースバン 標準ボディ・標準ルーフ、200系後期)の簡易モデル。
 * 寸法は全長4.695×全幅1.695×全高1.98m、ホイールベース2.57m(カタログ値)。屋根の赤色灯は別。
 * 座標:前方 +X、右 +Z(運転席側)、上 +Y、地面 y=0、全長の中心が x=0。単位 m。
 */
export const CMD = {
  length: 4.695,
  width: 1.695,
  height: 2.12, // 赤色灯込み
  front: 2.3475,
  rear: -2.3475,
  roof: 1.98,
  cabRear: 0.55, // 前席の後ろ
  frontAxle: 1.39,
  rearAxle: -1.18,
  wheelR: 0.34,
};
const HALF = CMD.width / 2;
const B = 0.045; // 車体の角の丸み(押し出しの面取り)

const at = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Hotspot => ({
  x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, w: x1 - x0, h: y1 - y0, d: z1 - z0,
});

// 横から見た輪郭の要所
const COWL_Y = 1.16;
const COWL = { x: CMD.front - 0.36, y: COWL_Y }; // フロントガラスの下端。ボンネットはほとんど無い
// 鼻先:上から見て角が大きく丸く、横から見るとバンパーがいちばん前で、上へ行くほど後ろへ傾いてフロントガラスにつながる。
// 高さごとの断面 [高さ y, 先端の後退量, 角の丸みの半径, 半幅の詰め]
const NOSE_BACK = CMD.front - 0.6;
const NOSE: [number, number, number, number][] = [
  [0.3, 0.05, 0.28, 0.03],
  [0.4, 0.0, 0.28, 0.0], // バンパー(背が高い)
  [0.76, 0.0, 0.3, 0.0],
  [0.8, 0.03, 0.31, 0.0], // ヘッドライト・グリルの段
  [0.98, 0.07, 0.33, 0.005],
  [1.06, 0.14, 0.36, 0.01], // ボンネット(前から見える丸い板)
  [1.12, 0.24, 0.39, 0.015],
  [COWL_Y, 0.36, 0.42, 0.02],
]
const SHIELD_TOP = { x: CMD.front - 1.05, y: 1.9 }; // フロントガラスの上端
const BELT = 1.16; // 窓の下端
const WIN_TOP = 1.86;
const FRONT_DOOR_REAR = 0.78; // 前ドアの後ろの合わせ目(B ピラー)
const SLIDE_REAR = -0.38; // スライドドアの後ろの合わせ目

const HOTSPOTS: Record<string, Hotspot> = {
  // 2列目の後ろの荷室にまとめて積んでいる
  信楽指揮1積載資器材: at(CMD.rear + 0.12, -0.45, 0.42, 1.35, -0.72, 0.72),
};

/** 点検表の場所名 → 3D 上の箱。対応がなければ undefined(車庫などは置かない)。 */
export function commandHotspot(name: string): Hotspot | undefined {
  return HOTSPOTS[name];
}

/** 横から見た輪郭(面取りのぶん内側に寄せる)。タイヤハウスは丸く切り欠く。 */
function profile(): THREE.Shape {
  const { front, rear, roof, frontAxle, rearAxle } = CMD;
  const s = new THREE.Shape();
  const bottom = 0.3 + B;
  const arch = (ax: number) => s.absarc(ax, 0.34, 0.41, Math.PI, 0, true);
  s.moveTo(rear + B, bottom);
  s.lineTo(rearAxle - 0.41, bottom);
  arch(rearAxle);
  s.lineTo(frontAxle - 0.41, bottom);
  arch(frontAxle);
  s.lineTo(COWL.x - B, bottom); // ここから前は鼻先(nose)が覆う
  s.lineTo(COWL.x - B, COWL.y);
  s.lineTo(SHIELD_TOP.x, SHIELD_TOP.y);
  s.quadraticCurveTo(SHIELD_TOP.x - 0.12, roof - B, SHIELD_TOP.x - 0.3, roof - B);
  s.lineTo(rear + 0.1, roof - B);
  s.quadraticCurveTo(rear + B, roof - B, rear + B, roof - 0.12);
  s.lineTo(rear + B, bottom);
  return s;
}

/** 鼻先:NOSE の断面(上から見た角丸の形)を下から順につないだ面。上下はふさぐ。 */
function noseGeometry(): THREE.BufferGeometry {
  const ring = ([y, back, r, inset]: [number, number, number, number]) => {
    const x1 = CMD.front - back, h = HALF - inset, pts: THREE.Vector3[] = [];
    pts.push(new THREE.Vector3(NOSE_BACK, y, -h));
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); pts.push(new THREE.Vector3(x1 - r + Math.cos(a) * r, y, -h + r + Math.sin(a) * r)); }
    for (let i = 1; i < 6; i++) { const t = i / 6, z = -h + r + t * (2 * h - 2 * r); pts.push(new THREE.Vector3(x1 + 0.025 * Math.sin(Math.PI * t), y, z)); } // 正面はわずかにふくらむ
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); pts.push(new THREE.Vector3(x1 - r + Math.cos(a) * r, y, h - r + Math.sin(a) * r)); }
    pts.push(new THREE.Vector3(NOSE_BACK, y, h));
    return pts;
  };
  const rings = NOSE.map(ring);
  const n = rings[0].length;
  const pos: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let k = 0; k + 1 < rings.length; k++) {
    const lo = rings[k], hi = rings[k + 1];
    for (let i = 0; i + 1 < n; i++) { tri(lo[i], lo[i + 1], hi[i + 1]); tri(lo[i], hi[i + 1], hi[i]); }
  }
  for (const [r, up] of [[rings[0], false], [rings[rings.length - 1], true]] as const) {
    const c = new THREE.Vector3(NOSE_BACK, r[0].y, 0);
    for (let i = 0; i + 1 < n; i++) up ? tri(c, r[i + 1], r[i]) : tri(c, r[i], r[i + 1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/** 側面に貼る板(窓など)。pts は (x, y) の多角形。 */
function sidePlate(pts: [number, number][], mat: THREE.Material, side: 1 | -1, out = 0.004) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.008, bevelEnabled: false });
  const m = new THREE.Mesh(geo, mat);
  m.position.z = side > 0 ? HALF - 0.004 + out : -HALF - 0.004 - out;
  return m;
}

export function buildCommandCar(): THREE.Group {
  const g = new THREE.Group();
  g.name = '信楽指揮1';
  const { red, dark, glass, steel, rubber, redLamp, whiteLamp, amber } = materials();
  const tint = new THREE.MeshStandardMaterial({ color: 0x0c1016, roughness: 0.1, metalness: 0.4 }); // 後ろの窓(濃いスモーク)
  const black = new THREE.MeshStandardMaterial({ color: 0x202224, roughness: 0.7 });
  const { front, rear, roof } = CMD;

  // ── 車体(横の輪郭を左右に押し出す) ──
  const depth = CMD.width - 2 * B;
  const bodyGeo = new THREE.ExtrudeGeometry(profile(), { depth, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 3, curveSegments: 16 });
  bodyGeo.translate(0, 0, -depth / 2);
  const body = new THREE.Mesh(bodyGeo, red);
  body.name = 'body';
  g.add(body);

  // ── フロントガラス(輪郭の斜めの線に沿わせる) ──
  {
    const dx = SHIELD_TOP.x - COWL.x, dy = SHIELD_TOP.y - COWL.y;
    const len = Math.hypot(dx, dy) - 0.08;
    const ang = Math.atan2(dy, dx);
    const n = new THREE.Vector2(dy, -dx).normalize().multiplyScalar(B + 0.01); // 外向き(前上)。押し出しの面取りで輪郭が B 膨らむぶん外へ
    const sh = box(len, 0.012, CMD.width - 0.22, glass, (COWL.x + SHIELD_TOP.x) / 2 + n.x, (COWL.y + SHIELD_TOP.y) / 2 + n.y, 0);
    sh.rotation.z = ang;
    g.add(sh);
    // ワイパー
    for (const z of [-0.35, 0.3]) {
      const w = box(0.02, 0.02, 0.55, black, COWL.x + 0.02, COWL.y + 0.08, z);
      w.rotation.y = 0.15;
      g.add(w);
    }
  }

  // ── 側面 ──
  for (const s of [1, -1] as const) {
    const shieldX = (y: number) => COWL.x + ((SHIELD_TOP.x - COWL.x) * (y - COWL.y)) / (SHIELD_TOP.y - COWL.y);
    // 前ドアの窓(前の縁は A ピラーに沿って斜め)
    g.add(sidePlate([[FRONT_DOOR_REAR + 0.05, BELT], [shieldX(BELT) - 0.1, BELT], [shieldX(WIN_TOP) - 0.12, WIN_TOP], [FRONT_DOOR_REAR + 0.05, WIN_TOP]], glass, s));
    // 後ろの窓(スモーク):B ピラーから後ろまで、途中に柱
    g.add(sidePlate([[rear + 0.16, BELT], [FRONT_DOOR_REAR - 0.07, BELT], [FRONT_DOOR_REAR - 0.07, WIN_TOP], [rear + 0.22, WIN_TOP]], tint, s));
    g.add(sidePlate([[SLIDE_REAR - 0.04, BELT - 0.01], [SLIDE_REAR + 0.04, BELT - 0.01], [SLIDE_REAR + 0.04, WIN_TOP + 0.01], [SLIDE_REAR - 0.04, WIN_TOP + 0.01]], red, s, 0.007));
    // ドアの合わせ目
    const seam = (x: number, y0: number, y1: number) => sidePlate([[x - 0.006, y0], [x + 0.006, y0], [x + 0.006, y1], [x - 0.006, y1]], black, s, 0.006);
    g.add(seam(FRONT_DOOR_REAR, 0.42, 1.92));
    g.add(seam(COWL.x - 0.06, 0.78, COWL.y + 0.02)); // 前ドアの前
    g.add(seam(SLIDE_REAR, 0.42, 1.92)); // スライドドアは左右両側
    g.add(sidePlate([[FRONT_DOOR_REAR - 0.02, 1.885], [rear + 0.25, 1.885], [rear + 0.25, 1.9], [FRONT_DOOR_REAR - 0.02, 1.9]], black, s, 0.006)); // スライドドアのレール(屋根下)
    // 取っ手
    const zf = s * (HALF + 0.012);
    g.add(span(black, FRONT_DOOR_REAR + 0.1, FRONT_DOOR_REAR + 0.24, 1.04, 1.08, zf - 0.01, zf + 0.01));
    g.add(span(black, FRONT_DOOR_REAR - 0.25, FRONT_DOOR_REAR - 0.11, 1.04, 1.08, zf - 0.01, zf + 0.01));
    // ドアミラー
    g.add(box(0.1, 0.05, 0.1, black, COWL.x - 0.1, 1.22, s * (HALF + 0.05)));
    g.add(box(0.08, 0.2, 0.15, black, COWL.x - 0.12, 1.3, s * (HALF + 0.11), 0.025));
  }

  // ── 前(200系後期:角の丸い鼻先、横長のヘッドライトが角まで回り込み、間にメッキのグリル) ──
  const nose = new THREE.Mesh(noseGeometry(), red);
  nose.name = 'nose';
  g.add(nose);
  const fx = front;
  // ヘッドライトの段は上へ行くほど後ろへ傾く(断面 0.8→0.98 で 0.03→0.07 後退)
  const lean = Math.atan2(0.04, 0.18);
  const faceX = (y: number) => fx - 0.03 - ((y - 0.8) / 0.18) * 0.04;
  const lamp = (m: THREE.Material, y: number, h: number, z0: number, z1: number) => {
    const l = span(m, faceX(y) - 0.02, faceX(y) + 0.012, y - h / 2, y + h / 2, z0, z1);
    l.rotation.z = lean;
    return l;
  };
  for (const s of [1, -1]) {
    g.add(lamp(whiteLamp, 0.89, 0.17, s * 0.45, s * 0.53)); // ヘッドライト(正面、外の角へ回り込む)
    const cr = 0.32, cxx = faceX(0.89) - cr;
    for (const [a, m] of [[0.25, whiteLamp], [0.65, whiteLamp], [1.05, amber]] as const) {
      const l = box(0.03, a > 1 ? 0.12 : 0.17, 0.13, m, cxx + Math.cos(a) * cr, 0.89, s * (HALF - cr + Math.sin(a) * cr));
      l.rotation.y = -s * a;
      g.add(l);
    }
  }
  // グリル(写真:上の縁のメッキは中央だけ一段持ち上がってエンブレムの下に回る。中は黒い格子で中央は黒い板。
  // 下の縁にもう1本、ライトの下端の高さで横いっぱいのメッキ)
  const plate = (pts: [number, number][], m: THREE.Material, out = 0.012) => {
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))), { depth: 0.012, bevelEnabled: false });
    geo.rotateY(Math.PI / 2); // 形の (z, y) を正面の面に。押し出しは +X
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.x = faceX(0.89) + out - 0.012;
    return mesh;
  };
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe6eaee, roughness: 0.25, metalness: 0.35 }); // 環境マップが無いので金属感は控えめにして明るく見せる
  const sym = (half: [number, number][]) => [...half, ...[...half].reverse().map(([z, y]) => [-z, y] as [number, number])];
  g.add(plate(sym([[-0.45, 0.83], [-0.45, 0.955], [-0.19, 0.955], [-0.13, 0.99]]), black, 0)); // 黒い地
  // グリルはバンパーの中央まで食い込む(バンパーは凹の形:両端だけライトの下まで上がり、真ん中はグリルの黒が下の開口までつながる)
  g.add(span(black, fx - 0.03, fx + 0.004, 0.69, 0.84, -0.44, 0.44));
  for (const y of [0.73, 0.77]) g.add(span(dark, fx + 0.002, fx + 0.008, y, y + 0.01, -0.42, 0.42)); // 食い込んだ部分の横桟
  for (const y of [0.865, 0.9, 0.93]) g.add(lamp(dark, y, 0.01, -0.43, 0.43)); // 格子の横桟
  g.add(lamp(black, 0.885, 0.07, -0.13, 0.13)); // 中央の黒い板
  g.add(plate(sym([[-0.45, 0.95], [-0.2, 0.95], [-0.14, 0.983], [-0.14, 1.0], [-0.2, 0.968], [-0.45, 0.968]]), chrome, 0.018)); // 上のメッキ
  g.add(span(chrome, fx + 0.004, fx + 0.016, 0.815, 0.835, -0.44, 0.44)); // 下のメッキ(食い込んだ黒の上に載る)
  // エンブレム:持ち上がったメッキのすぐ上、ボンネットの下の縁の中央
  { const e = box(0.02, 0.065, 0.11, chrome, fx - 0.088, 1.035, 0); e.rotation.z = 0.7; g.add(e); }
  // バンパー:ボディ色で背が高い。中央に横長の大きな黒い開口(中に横桟)、ナンバーはその下の縁にかかる。
  // 外の角にフォグの凹み(ここでは赤色灯)、いちばん下に細い黒いスリット
  g.add(span(black, fx - 0.03, fx + 0.02, 0.5, 0.69, -0.5, 0.5));
  for (const y of [0.56, 0.62]) g.add(span(dark, fx + 0.015, fx + 0.025, y, y + 0.014, -0.48, 0.48));
  g.add(span(new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.6 }), fx + 0.02, fx + 0.03, 0.42, 0.55, -0.18, 0.18)); // ナンバー(白)
  for (const s of [1, -1]) {
    g.add(span(black, fx - 0.03, fx + 0.016, 0.4, 0.53, s * 0.57, s * 0.74)); // フォグの凹み
    g.add(span(redLamp, fx - 0.03, fx + 0.022, 0.42, 0.51, s * 0.6, s * 0.71)); // 前面の赤色灯(フォグの位置)
  }
  g.add(span(black, fx - 0.03, fx + 0.012, 0.35, 0.37, -0.42, 0.42)); // 下の細いスリット
  g.add(span(dark, fx - 0.3, fx - 0.03, 0.27, 0.31, -HALF + 0.1, HALF - 0.1)); // バンパー下のスポイラー

  // ── 屋根の赤色灯(前寄りに横長) ──
  const lx0 = SHIELD_TOP.x - 0.5, lx1 = SHIELD_TOP.x - 0.2;
  for (const z of [-0.55, 0.55]) g.add(span(steel, lx0 + 0.05, lx1 - 0.05, roof, roof + 0.03, z - 0.04, z + 0.04));
  g.add(span(dark, lx0, lx1, roof + 0.03, roof + 0.06, -0.72, 0.72));
  g.add(span(redLamp, lx0 + 0.01, lx1 - 0.01, roof + 0.06, CMD.height, -0.7, 0.7, 0.04));

  // ── 後ろ ──
  const rx = rear;
  g.add(span(tint, rx - 0.008, rx + 0.004, 1.2, 1.84, -0.62, 0.62)); // バックドアの窓
  g.add(span(dark, rx - 0.02, rx + 0.06, 0.3, 0.52, -HALF + 0.02, HALF - 0.02, 0.03)); // バンパー
  g.add(span(steel, rx - 0.012, rx, 0.62, 0.74, -0.17, 0.17)); // ナンバー
  g.add(span(black, rx - 0.012, rx, 0.98, 1.02, -0.12, 0.12)); // 取っ手
  for (const s of [1, -1]) {
    g.add(span(redLamp, rx - 0.012, rx + 0.004, 0.72, 1.14, s * 0.7, s * 0.82)); // テールランプ(縦長)
    g.add(span(amber, rx - 0.014, rx + 0.004, 0.62, 0.7, s * 0.7, s * 0.82));
  }

  // ── 下回り・タイヤ ──
  g.add(span(dark, rear + 0.35, front - 0.35, 0.22, 0.34, -0.7, 0.7));
  for (const x of [CMD.frontAxle, CMD.rearAxle]) for (const s of [1, -1]) {
    const z = s * (HALF - 0.14);
    wheel(g, x, z, CMD.wheelR, 0.2, rubber, steel);
    g.add(box(0.12, 0.12, 0.215, dark, x, CMD.wheelR, z)); // ハブ
  }
  return g;
}
