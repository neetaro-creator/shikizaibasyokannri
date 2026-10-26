import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Document, NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { describe, expect, it } from 'vitest';
import { optimizeGlb } from './optimize-glb';

/** 幅 sx, 高さ sy, 奥行 sz の箱を、中心 (cx, cy, cz) に置いた GLB を作る。 */
async function boxGlb(path: string, [sx, sy, sz]: number[], [cx, cy, cz]: number[]) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const p: number[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) p.push(cx + (x * sx) / 2, cy + (y * sy) / 2, cz + (z * sz) / 2);
  const idx = [0, 1, 2, 1, 3, 2, 4, 6, 5, 5, 6, 7, 0, 4, 1, 1, 4, 5, 2, 3, 6, 3, 7, 6, 0, 2, 4, 2, 6, 4, 1, 5, 3, 3, 5, 7];
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(p)).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buf));
  const node = doc.createNode().setMesh(doc.createMesh().addPrimitive(prim));
  doc.createScene().addChild(node);
  await new NodeIO().write(path, doc);
}

async function bounds(path: string) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
  const doc = await io.read(path);
  return getBounds(doc.getRoot().listScenes()[0]);
}

describe('optimizeGlb', () => {
  const dir = mkdtempSync(join(tmpdir(), 'glb-'));

  it('scales to the given length along X, centers X/Z and puts the bottom on y=0', async () => {
    await boxGlb(join(dir, 'a.glb'), [2, 1, 0.8], [5, 3, -2]);
    await optimizeGlb(join(dir, 'a.glb'), join(dir, 'a-out.glb'), { length: 6.2 });
    const { min, max } = await bounds(join(dir, 'a-out.glb'));
    expect(max[0] - min[0]).toBeCloseTo(6.2, 1);
    expect((max[0] - min[0]) / 6.2).toBeGreaterThan(0.99);
    expect((max[0] + min[0]) / 2).toBeCloseTo(0, 3);
    expect((max[2] + min[2]) / 2).toBeCloseTo(0, 3);
    expect(min[1]).toBeCloseTo(0, 3);
  });

  it('rotateY turns a Z-long scan so its length runs along X', async () => {
    await boxGlb(join(dir, 'b.glb'), [0.8, 1, 2], [0, 0, 0]);
    await optimizeGlb(join(dir, 'b.glb'), join(dir, 'b-out.glb'), { length: 7, rotateY: 90 });
    const { min, max } = await bounds(join(dir, 'b-out.glb'));
    expect(max[0] - min[0]).toBeCloseTo(7, 1);
    expect(max[2] - min[2]).toBeCloseTo(2.8, 1);
  });
});
