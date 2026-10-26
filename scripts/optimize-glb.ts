/**
 * スキャンした GLB をアプリ用に整える。
 *   npm run optimize-glb -- 入力.glb public/models/tank1.glb --length 7.0 [--rotate-y 90]
 * 向き(前方 +X)・実寸(全長)・原点(全長の中心、地面 y=0)を合わせ、
 * 頂点の結合 → ポリゴン削減 → テクスチャ縮小(WebP) → Draco 圧縮を行う。
 */
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

export interface OptimizeOptions {
  /** 実車の全長[m]。X 方向の長さをこれに合わせる。 */
  length: number;
  /** 前方を +X に向けるための Y 軸回転[度]。 */
  rotateY?: number;
  /** ポリゴンを残す割合(既定 0.25)。 */
  ratio?: number;
  /** テクスチャの最大辺[px](既定 2048)。 */
  textureSize?: number;
}

export async function optimizeGlb(input: string, output: string, o: OptimizeOptions): Promise<void> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });
  const doc = await io.read(input);
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];

  // 全ノードを 1 つの親にまとめ、その親の回転・拡大・移動で揃える
  const root = doc.createNode('vehicle');
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    root.addChild(child);
  }
  scene.addChild(root);
  const a = ((o.rotateY ?? 0) * Math.PI) / 180;
  root.setRotation([0, Math.sin(a / 2), 0, Math.cos(a / 2)]);
  const b = getBounds(scene);
  const s = o.length / (b.max[0] - b.min[0]);
  root.setScale([s, s, s]);
  root.setTranslation([-s * (b.min[0] + b.max[0]) / 2, -s * b.min[1], -s * (b.min[2] + b.max[2]) / 2]);

  await MeshoptSimplifier.ready;
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: o.ratio ?? 0.25, error: 0.001 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [o.textureSize ?? 2048, o.textureSize ?? 2048] }),
    prune(),
    draco(),
  );
  await io.write(output, doc);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, output, ...rest] = process.argv.slice(2);
  const flag = (name: string) => {
    const i = rest.indexOf(name);
    return i >= 0 ? Number(rest[i + 1]) : undefined;
  };
  const length = flag('--length');
  if (!input || !output || !length) {
    console.error('使い方: npm run optimize-glb -- 入力.glb 出力.glb --length 全長[m] [--rotate-y 度]');
    process.exit(1);
  }
  await optimizeGlb(input, output, { length, rotateY: flag('--rotate-y') });
  console.log(`書き出し: ${output}`);
}
