import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildCommandCar, CMD, commandHotspot } from './command';

describe('信楽指揮1 の 3D', () => {
  it('model fits the HiAce standard body (front +X, ground y=0, centred)', () => {
    const b = new THREE.Box3().setFromObject(buildCommandCar());
    expect(b.max.x - b.min.x).toBeCloseTo(CMD.length, 1);
    expect(b.min.y).toBeGreaterThanOrEqual(-0.01);
    expect(b.max.y).toBeCloseTo(CMD.height, 1);
    expect(Math.abs(b.max.z + b.min.z)).toBeLessThan(0.05);
    expect(b.max.z - b.min.z).toBeLessThan(CMD.width + 0.4); // ミラー込み
  });

  it('the load sits inside the body behind the front seats', () => {
    const h = commandHotspot('信楽指揮1積載資器材')!;
    expect(h.x + h.w / 2).toBeLessThan(CMD.cabRear);
    expect(h.x - h.w / 2).toBeGreaterThan(CMD.rear);
    expect(h.y + h.h / 2).toBeLessThan(CMD.roof);
    expect(commandHotspot('車庫西側')).toBeUndefined();
  });

  it('no mesh has inverted (negative-size) geometry', () => {
    buildCommandCar().traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const p = (m.geometry as THREE.BoxGeometry).parameters as { width?: number; height?: number; depth?: number } | undefined;
      if (p?.width !== undefined) expect(Math.min(p.width, p.height!, p.depth!)).toBeGreaterThan(0);
    });
  });
});
