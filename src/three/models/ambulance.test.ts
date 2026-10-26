import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Hotspot } from '../../data/types';
import { AMB, ambulanceHotspot, buildAmbulance } from './ambulance';

const names = Papa.parse<Record<string, string>>(readFileSync('data/locations.csv', 'utf-8'), { header: true, skipEmptyLines: true })
  .data.filter((r) => r.vehicle_id === 'ambulance1').map((r) => r.name);
const boxesOf = (n: string): Hotspot[] => { const h = ambulanceHotspot(n); return !h ? [] : Array.isArray(h) ? h : [h]; };
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
      for (const h of boxesOf(n)) expect(body.containsBox(box(h)), n).toBe(true);
    }
  });

  it('placed hotspots do not overlap each other', () => {
    const placed = names.flatMap((n) => boxesOf(n).map((h, k) => ({ n: k ? `${n}#${k + 1}` : n, h })));
    for (const a of placed) for (const b of placed) {
      if (a.n >= b.n) continue;
      if (JSON.stringify(a.h) === JSON.stringify(b.h)) continue; // かばんの中の場所はかばんと同じ箱を共有する
      const i = box(a.h).intersect(box(b.h));
      const vol = i.isEmpty() ? 0 : (i.max.x - i.min.x) * (i.max.y - i.min.y) * (i.max.z - i.min.z);
      expect(vol, `${a.n} × ${b.n}`).toBeLessThan(1e-3);
    }
  });

  it('right sliding door is on +Z, left on -Z; 患者室右側 is on the right wall', () => {
    expect(boxesOf('右スライドドア収納')[0].z).toBeGreaterThan(0.8);
    expect(boxesOf('左スライドドア収納')[0].z).toBeLessThan(-0.8);
    // 患者室右側は5か所(座席の下・酸素ボンベ・吸引器・時計のあたり・A のフック)に分かれ、どれも右半分
    expect(boxesOf('患者室右側')).toHaveLength(5);
    for (const h of boxesOf('患者室右側')) expect(h.z).toBeGreaterThan(0.2);
  });

  it('A の扉は中の場所を選んだときに開く(扉の表では閉じたまま)、右スライドドアは外から開ける', () => {
    const g = buildAmbulance();
    const door = g.getObjectByName('door-A')!;
    expect(door.userData.opensFor).toContain('A収納 黒かばん');
    expect(door.userData.opensFor).not.toContain('A収納扉(表)');
    expect(g.userData.outsideAccess).toEqual(['右スライドドア収納']);
    expect(g.getObjectByName('door-K')!.userData.opensFor).toEqual(['K収納 小児バッグ']);
    expect(g.getObjectByName('door-I')!.userData.opensFor).toContain('I収納 薬剤バッグ');
    expect(g.getObjectByName('door-J')!.userData.opensFor).toEqual(['J収納']);
  });

  it('things inside a bag light exactly the bag (same box as the 3D bag)', () => {
    expect(ambulanceHotspot('患者室右側 観察バック 血糖測定器')).toEqual(ambulanceHotspot('患者室右側 観察バック'));
    expect(ambulanceHotspot('A収納 外傷バック オレンジポ―チ内')).toEqual(ambulanceHotspot('A収納 外傷バック'));
    expect(ambulanceHotspot('A収納 オレンジポ―チ内')).toEqual(ambulanceHotspot('A収納 外傷バック'));
    for (const n of ['気道管理バッグ メイン収納', '気道管理バッグ セカンド収納', '気道管理バッグ サード収納']) expect(ambulanceHotspot(n)).toEqual(ambulanceHotspot('気道管理バッグ'));
  });
});
