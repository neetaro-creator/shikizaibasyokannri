import { expect, it } from 'vitest';
import type { Location } from '../data/types';
import { resolveHotspots } from './layout';

const loc = (name: string, group: string, hotspot?: Location['hotspot']): Location =>
  ({ id: name, vehicleId: 'pump1', name, group, ...(hotspot && { hotspot }) });

it('CSV hotspot wins over the vehicle model layout', () => {
  const csv = { x: 9, y: 9, z: 9, w: 1, h: 1, d: 1 };
  expect(resolveHotspots([loc('車両右側前シャッター内', '右側', csv)], 'ポンプ')[0].hotspot).toEqual(csv);
});

it('vehicle model layout is used when CSV has none', () => {
  const [l] = resolveHotspots([loc('車両右側前シャッター内', '右側')], 'ポンプ');
  expect(l.hotspot!.z).toBeGreaterThan(0.9);
  expect(l.hotspot!.w).toBeCloseTo(1.67, 2);
});

it('falls back to the automatic layout for other vehicle types and unknown names', () => {
  expect(resolveHotspots([loc('車両右側', '右側')], '指揮')[0].hotspot).toBeDefined();
  expect(resolveHotspots([loc('どこか', '車外保管')], 'ポンプ')[0].hotspot).toBeUndefined();
});

it('a model may mark a location as off the vehicle (null) so no automatic box is made', () => {
  expect(resolveHotspots([loc('救急資器材庫', '車内')], '救急')[0].hotspot).toBeUndefined();
});
