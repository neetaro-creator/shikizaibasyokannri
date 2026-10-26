import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Hotspot } from '../../data/types';
import { buildTankTruck, TANK, tankHotspot } from './tank';

const names = Papa.parse<Record<string, string>>(readFileSync('data/locations.csv', 'utf-8'), { header: true, skipEmptyLines: true })
  .data.filter((r) => r.vehicle_id === 'tank1').map((r) => r.name);
const hs = (name: string) => tankHotspot(name)!;
const box = (h: Hotspot) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(h.x, h.y, h.z), new THREE.Vector3(h.w, h.h, h.d));

describe('信楽タンク1 の 3D', () => {
  it('every tank1 location in data/locations.csv has a model hotspot', () => {
    expect(names.length).toBeGreaterThan(20);
    expect(names.filter((n) => !tankHotspot(n))).toEqual([]);
  });

  it('model fits the stated dimensions (front +X, ground y=0, centred)', () => {
    const b = new THREE.Box3().setFromObject(buildTankTruck());
    expect(b.max.x - b.min.x).toBeCloseTo(TANK.length, 0);
    expect(b.min.y).toBeGreaterThanOrEqual(-0.01);
    expect(Math.abs(b.max.z + b.min.z)).toBeLessThan(0.3);
  });

  it('three side shutters run front → middle → rear on both sides', () => {
    for (const [s, sign] of [['右', 1], ['左', -1]] as const) {
      const f = hs(`車両${s}側前部シャッター`), m = hs(`車両${s}側中央シャッター`), r = hs(`車両${s}側後部シャッター 上段`);
      expect(sign * f.z).toBeGreaterThan(TANK.width / 2 - 0.1);
      expect(f.x).toBeGreaterThan(m.x);
      expect(m.x).toBeGreaterThan(r.x);
      expect(hs(`車両${s}側後部シャッター 下段`).y).toBeLessThan(r.y);
      expect(hs(`車両${s}側下部BOX`).y).toBeLessThan(f.y);
    }
  });

  it('rear shutter: 上段 is only the top shelf, 下段 covers the cutter shelf and the floor', () => {
    const u = hs('車両後部シャッター 上段'), l = hs('車両後部シャッター 下段');
    for (const h of [u, l]) expect(h.x).toBeCloseTo(-TANK.length / 2, 1);
    expect(u.y - u.h / 2).toBeGreaterThan(2.0); // 最上段の箱だけ
    expect(l.h).toBeGreaterThan(u.h * 2);
  });

  it('ladders and tobiguchi sit on the left half of the roof, other roof gear on the right', () => {
    const l = hs('車両上部 左側'), r = hs('車両上部');
    for (const h of [l, r]) expect(h.y).toBeGreaterThan(TANK.bodyTop - 0.1);
    expect(l.z + l.d / 2).toBeLessThanOrEqual(0.01);
    expect(r.z - r.d / 2).toBeGreaterThanOrEqual(-0.01);
  });

  it('searchlight and wheel chocks (車両右側/左側) sit in the gap between cab and body', () => {
    expect(TANK.cabRear - TANK.bodyFront).toBeGreaterThan(0.2);
    for (const [n, sign] of [['車両右側', 1], ['車両左側', -1]] as const) {
      const h = hs(n);
      expect(h.x - h.w / 2).toBeGreaterThanOrEqual(TANK.bodyFront - 0.01);
      expect(h.x + h.w / 2).toBeLessThanOrEqual(TANK.cabRear + 0.01);
      expect(sign * h.z).toBeGreaterThan(0.5);
      expect(h.y - h.h / 2).toBeLessThan(0.8); // 下の歯止めから
      expect(h.y + h.h / 2).toBeGreaterThan(2.6); // 上のライトまで
    }
  });

  it('driver side is right (+Z), passenger side left (-Z), all cab spots inside the cab', () => {
    expect(hs('運転席上部').z).toBeGreaterThan(0);
    expect(hs('助手席').z).toBeLessThan(0);
    for (const n of names.filter((x) => /運転席|助手席|後部座席|コンソール|キャビン|空気呼吸器/.test(x))) {
      expect(hs(n).x, n).toBeGreaterThan(TANK.cabRear);
      expect(hs(n).x, n).toBeLessThan(TANK.front);
    }
  });

  it('body-surface hotspots do not overlap each other', () => {
    const surface = names.filter((n) => /^車両/.test(n));
    for (const a of surface) for (const b of surface) {
      if (a >= b) continue;
      const i = box(hs(a)).intersect(box(hs(b)));
      const vol = i.isEmpty() ? 0 : (i.max.x - i.min.x) * (i.max.y - i.min.y) * (i.max.z - i.min.z);
      expect(vol, `${a} × ${b}`).toBeLessThan(1e-3);
    }
  });

  it('no mesh has inverted geometry', () => {
    buildTankTruck().traverse((o) => {
      const p = ((o as THREE.Mesh).geometry as THREE.BoxGeometry | undefined)?.parameters as { width?: number; height?: number; depth?: number } | undefined;
      if (p?.width !== undefined) expect(Math.min(p.width, p.height!, p.depth!)).toBeGreaterThan(0);
    });
  });
});
