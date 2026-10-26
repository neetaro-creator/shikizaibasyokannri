import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Hotspot } from '../../data/types';
import { buildPumpTruck, PUMP, pumpHotspot } from './pump';

const names = Papa.parse<Record<string, string>>(readFileSync('data/locations.csv', 'utf-8'), { header: true, skipEmptyLines: true })
  .data.filter((r) => r.vehicle_id === 'pump1').map((r) => r.name);
const hs = (name: string) => pumpHotspot(name)!;
const box = (h: Hotspot) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(h.x, h.y, h.z), new THREE.Vector3(h.w, h.h, h.d));

describe('信楽ポンプ1 の 3D', () => {
  it('every pump1 location in data/locations.csv has a model hotspot', () => {
    expect(names.length).toBeGreaterThan(10);
    expect(names.filter((n) => !pumpHotspot(n))).toEqual([]);
  });

  it('model fits the stated dimensions (front +X, ground y=0, centred)', () => {
    const b = new THREE.Box3().setFromObject(buildPumpTruck());
    expect(b.max.x - b.min.x).toBeCloseTo(PUMP.length, 0);
    expect(b.min.y).toBeGreaterThanOrEqual(-0.01);
    expect(Math.abs(b.max.z + b.min.z)).toBeLessThan(0.3); // ミラーぶんの左右差は許容
  });

  it('side shutters sit on the correct face, front shutter ahead of rear', () => {
    expect(hs('車両右側前シャッター内').z).toBeGreaterThan(PUMP.width / 2 - 0.1);
    expect(hs('車両左側前シャッター内').z).toBeLessThan(-PUMP.width / 2 + 0.1);
    expect(hs('車両右側前シャッター内').x).toBeGreaterThan(hs('車両右側後シャッター内').x);
    expect(hs('車両左側前シャッター内').x).toBeGreaterThan(hs('車両左側後部シャッター内').x);
    expect(hs('車両左側下部BOX').y).toBeLessThan(hs('車両左側前シャッター内').y);
  });

  it('rear shutter levels stack top to bottom at the rear face', () => {
    const lv = ['後部シャッター内最上段', '後部シャッター内上段', '後部シャッター内中段', '後部シャッター内下段'].map(hs);
    for (const h of lv) expect(h.x).toBeCloseTo(-PUMP.length / 2, 1);
    for (let i = 1; i < lv.length; i++) expect(lv[i].y).toBeLessThan(lv[i - 1].y);
  });

  it('roof and cab hotspots are where they belong', () => {
    expect(hs('車両上部').y).toBeGreaterThan(PUMP.bodyTop - 0.1);
    for (const n of ['キャビン前部', 'キャビン後部', '後部座席下']) expect(hs(n).x).toBeGreaterThan(PUMP.cabRear);
  });

  it('surface hotspots do not overlap each other', () => {
    const surface = names.filter((n) => n !== 'ホースレイヤー' && !n.startsWith('キャビン') && n !== '後部座席下');
    for (const a of surface) for (const b of surface) {
      if (a >= b) continue;
      const i = box(hs(a)).intersect(box(hs(b)));
      const vol = i.isEmpty() ? 0 : (i.max.x - i.min.x) * (i.max.y - i.min.y) * (i.max.z - i.min.z);
      expect(vol, `${a} × ${b}`).toBeLessThan(1e-3);
    }
  });

  it('unknown location names return undefined', () => {
    expect(pumpHotspot('存在しない場所')).toBeUndefined();
  });
});

it('no mesh has inverted (negative-size) geometry', () => {
  buildPumpTruck().traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.computeBoundingBox();
    const s = m.geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(Math.min(s.x, s.y, s.z)).toBeGreaterThanOrEqual(0);
    const p = (m.geometry as THREE.BoxGeometry).parameters as { width?: number; height?: number; depth?: number } | undefined;
    if (p?.width !== undefined) expect(Math.min(p.width, p.height!, p.depth!)).toBeGreaterThan(0);
  });
});
