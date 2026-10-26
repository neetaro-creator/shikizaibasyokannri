import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Hotspot } from '../../data/types';
import { AMB, ambulanceHotspot, buildAmbulance } from './ambulance';

const names = Papa.parse<Record<string, string>>(readFileSync('data/locations.csv', 'utf-8'), { header: true, skipEmptyLines: true })
  .data.filter((r) => r.vehicle_id === 'ambulance1').map((r) => r.name);
const box = (h: Hotspot) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(h.x, h.y, h.z), new THREE.Vector3(h.w, h.h, h.d));

describe('信楽救急1(日産パラメディック)の 3D', () => {
  it('every ambulance1 location is either placed or explicitly off the vehicle (null)', () => {
    expect(names.length).toBeGreaterThan(35);
    expect(names.filter((n) => ambulanceHotspot(n) === undefined)).toEqual([]);
    expect(ambulanceHotspot('救急資器材庫')).toBeNull();
    expect(ambulanceHotspot('緊急持ち出しバッグ(タンク車内)')).toBeNull();
  });

  it('model matches the Paramedic size 5.33 × 1.88 × 2.49 m (front +X, ground y=0)', () => {
    const b = new THREE.Box3().setFromObject(buildAmbulance());
    expect(b.max.x - b.min.x).toBeCloseTo(AMB.length, 0);
    expect(b.max.y).toBeCloseTo(AMB.height, 1);
    expect(b.min.y).toBeGreaterThanOrEqual(-0.01);
  });

  it('wheel positions follow the Paramedic photos: front wheel right under the short nose, long wheelbase', () => {
    expect(AMB.front - AMB.frontAxle).toBeLessThan(1.0);
    expect(AMB.frontAxle - AMB.rearAxle).toBeGreaterThan(3.2);
    expect(AMB.frontAxle - AMB.rearAxle).toBeLessThan(3.5);
  });

  it('every placed hotspot is inside the vehicle body', () => {
    const body = new THREE.Box3(new THREE.Vector3(-AMB.length / 2 - 0.05, 0, -AMB.width / 2 - 0.08), new THREE.Vector3(AMB.length / 2, AMB.height, AMB.width / 2 + 0.08));
    for (const n of names) {
      const h = ambulanceHotspot(n);
      if (h) expect(body.containsBox(box(h)), n).toBe(true);
    }
  });

  it('placed hotspots do not overlap each other', () => {
    const placed = names.filter((n) => ambulanceHotspot(n));
    for (const a of placed) for (const b of placed) {
      if (a >= b) continue;
      const i = box(ambulanceHotspot(a)!).intersect(box(ambulanceHotspot(b)!));
      const vol = i.isEmpty() ? 0 : (i.max.x - i.min.x) * (i.max.y - i.min.y) * (i.max.z - i.min.z);
      expect(vol, `${a} × ${b}`).toBeLessThan(1e-3);
    }
  });

  it('right sliding door is on +Z, left on -Z; 患者室右側 is on the right wall', () => {
    expect(ambulanceHotspot('右スライドドア収納')!.z).toBeGreaterThan(0.8);
    expect(ambulanceHotspot('左スライドドア収納')!.z).toBeLessThan(-0.8);
    expect(ambulanceHotspot('患者室右側')!.z).toBeGreaterThan(0.5);
  });
});
