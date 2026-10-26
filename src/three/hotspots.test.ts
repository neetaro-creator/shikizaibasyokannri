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
});
