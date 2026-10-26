import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createHotspots } from './hotspots';
import { defaultHotspot, DIMENSIONS } from './placeholder';
import type { Location } from '../data/types';

const loc = (id: string, group: string, hotspot?: Location['hotspot']): Location =>
  ({ id, vehicleId: 'tank1', name: id, group, ...(hotspot && { hotspot }) });

describe('defaultHotspot', () => {
  it('right side 3 sections do not overlap and stay within vehicle length', () => {
    const L = DIMENSIONS['タンク'].length;
    const hs = [0, 1, 2].map((i) => defaultHotspot(loc(`r${i}`, '右側'), i, 3, 'タンク')!);
    for (const h of hs) {
      expect(h.x - h.w / 2).toBeGreaterThanOrEqual(-L / 2 - 1e-9);
      expect(h.x + h.w / 2).toBeLessThanOrEqual(L / 2 + 1e-9);
      expect(h.z).toBeGreaterThan(0); // 右側は +Z
    }
    const sorted = [...hs].sort((a, b) => b.x - a.x);
    expect(sorted.map((h) => h.x)).toEqual(hs.map((h) => h.x)); // 先頭ほど前(+X)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].x + sorted[i].w / 2).toBeLessThanOrEqual(sorted[i - 1].x - sorted[i - 1].w / 2 + 1e-9);
    }
  });

  it('left side is -Z, rear is -X end', () => {
    expect(defaultHotspot(loc('l', '左側'), 0, 1, 'ポンプ')!.z).toBeLessThan(0);
    const r = defaultHotspot(loc('b', '後部'), 0, 2, 'ポンプ')!;
    expect(r.x).toBeCloseTo(-DIMENSIONS['ポンプ'].length / 2, 1);
  });

  it('車外保管 has no hotspot', () => {
    expect(defaultHotspot(loc('o', '車外保管'), 0, 1, '指揮')).toBeUndefined();
  });
});

describe('createHotspots', () => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.5, 10);
  camera.lookAt(0, 1.5, 0);
  camera.updateMatrixWorld();

  const hs = createHotspots([
    loc('front', '右側', { x: 0, y: 1.5, z: 1.1, w: 1, h: 1, d: 0.1 }),
    loc('far', '右側', { x: 3, y: 1.5, z: 1.1, w: 1, h: 1, d: 0.1 }),
    loc('nohs', '車外保管'),
  ]);

  it('pick returns the location under the pointer', () => {
    expect(hs.pick(new THREE.Vector2(0, 0), camera)).toBe('front');
  });

  it('pick returns undefined on empty space', () => {
    expect(hs.pick(new THREE.Vector2(-0.9, 0.9), camera)).toBeUndefined();
  });

  it('highlight of a location without hotspot does not throw and clears', () => {
    hs.highlight('front');
    expect(hs.highlighted()).toBe('front');
    expect(() => hs.highlight('nohs')).not.toThrow();
    expect(hs.highlighted()).toBeUndefined();
  });

  it('only locations with hotspot get a box', () => {
    expect(hs.group.children).toHaveLength(2);
  });

  it('setHotspot moves the box so pick follows it', () => {
    const moved = createHotspots([loc('m', '右側', { x: 5, y: 1.5, z: 1.1, w: 1, h: 1, d: 0.1 })]);
    expect(moved.pick(new THREE.Vector2(0, 0), camera)).toBeUndefined();
    moved.setHotspot('m', { x: 0, y: 1.5, z: 1.1, w: 1, h: 1, d: 0.1 });
    expect(moved.pick(new THREE.Vector2(0, 0), camera)).toBe('m');
  });

  it('highlighted box draws through the vehicle body (depthTest off, drawn last)', () => {
    const x = createHotspots([loc('in', '車内', { x: 0, y: 1.5, z: 0, w: 1, h: 1, d: 1 })]);
    x.highlight('in');
    const box = x.group.children[0] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
    expect(box.material.depthTest).toBe(false);
    expect(box.renderOrder).toBeGreaterThan(1);
    x.highlight(undefined);
    expect(box.material.depthTest).toBe(true);
  });

  it('pick ignores boxes hidden behind the vehicle body', () => {
    const inner = createHotspots([loc('in', '車内', { x: 0, y: 1.5, z: 0, w: 1, h: 1, d: 1 })]);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.2), new THREE.MeshBasicMaterial());
    wall.position.set(0, 1.5, 1.5);
    wall.updateMatrixWorld();
    expect(inner.pick(new THREE.Vector2(0, 0), camera)).toBe('in');
    expect(inner.pick(new THREE.Vector2(0, 0), camera, [wall])).toBeUndefined();
  });

  it('see-through ids (cab interior) are picked even behind the vehicle body', () => {
    const inner = createHotspots([loc('in', 'キャビン', { x: 0, y: 1.5, z: 0, w: 1, h: 1, d: 1 })]);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.2), new THREE.MeshBasicMaterial());
    wall.position.set(0, 1.5, 1.5);
    wall.updateMatrixWorld();
    expect(inner.pick(new THREE.Vector2(0, 0), camera, [wall])).toBeUndefined();
    expect(inner.pick(new THREE.Vector2(0, 0), camera, [wall], (id) => id === 'in')).toBe('in');
  });

  it('nearest() finds the closest box among candidates within a radius', () => {
    const hs2 = createHotspots([
      loc('a', 'キャビン', { x: 0, y: 1, z: 0, w: 0.2, h: 0.2, d: 0.2 }),
      loc('b', 'キャビン', { x: 2, y: 1, z: 0, w: 0.2, h: 0.2, d: 0.2 }),
    ]);
    expect(hs2.nearest(new THREE.Vector3(1.6, 1, 0), 1.0, () => true)).toBe('b');
    expect(hs2.nearest(new THREE.Vector3(5, 1, 0), 1.0, () => true)).toBeUndefined();
  });

  it('a location split into several boxes is picked from any of them and lights them all', () => {
    const l = { ...loc('m', '車内', { x: 0, y: 1.5, z: 0, w: 0.5, h: 0.5, d: 0.5 }), moreHotspots: [{ x: 3, y: 1.5, z: 0, w: 0.5, h: 0.5, d: 0.5 }] };
    const hs3 = createHotspots([l]);
    expect(hs3.group.children).toHaveLength(2);
    expect(hs3.nearest(new THREE.Vector3(3, 1.5, 0), 0.2, () => true)).toBe('m');
    expect(hs3.centerOf('m')!.x).toBe(0);
    hs3.highlight('m');
    for (const c of hs3.group.children) expect(c.children[0].visible).toBe(true);
  });

  it('a location with exactly the same box as an earlier one (a pouch inside a bag) shares the bag box', () => {
    const b = { x: 0, y: 1.5, z: 0, w: 0.5, h: 0.5, d: 0.5 };
    const hs4 = createHotspots([loc('bag', '車内', b), loc('pouch', '車内', { ...b })]);
    expect(hs4.group.children).toHaveLength(1);
    expect(hs4.pick(new THREE.Vector2(0, 0), camera)).toBe('bag');
    hs4.highlight('pouch');
    expect(hs4.highlighted()).toBe('pouch');
    expect(hs4.group.children[0].children[0].visible).toBe(true);
    expect(hs4.centerOf('pouch')!.y).toBe(1.5);
  });

  it('skip() lets a tap pass through a box (a closed door\'s back) to the box behind it', () => {
    const hs5 = createHotspots([
      loc('front', '車内', { x: 0, y: 1.5, z: 1, w: 0.5, h: 0.5, d: 0.1 }),
      loc('back', '車内', { x: 0, y: 1.5, z: 0, w: 0.5, h: 0.5, d: 0.5 }),
    ]);
    expect(hs5.pick(new THREE.Vector2(0, 0), camera)).toBe('front');
    expect(hs5.pick(new THREE.Vector2(0, 0), camera, [], () => false, (id) => id === 'front')).toBe('back');
  });
});
