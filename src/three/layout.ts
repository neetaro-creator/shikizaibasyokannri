import type { Hotspot, Location } from '../data/types';
import { pumpHotspot } from './models/pump';
import { tankHotspot } from './models/tank';
import { defaultHotspot } from './placeholder';

/** 車種ごとの作り込みモデルが持つ場所の配置。 */
const MODEL_LAYOUTS: Record<string, (name: string) => Hotspot | undefined> = {
  ポンプ: pumpHotspot,
  タンク: tankHotspot,
};

/** 場所の箱の位置を決める。優先順:CSV の hotspot > 車種モデルの配置 > 自動配置。 */
export function resolveHotspots(locs: Location[], type: string): Location[] {
  const byGroup = new Map<string, Location[]>();
  for (const l of locs) byGroup.set(l.group, [...(byGroup.get(l.group) ?? []), l]);
  return locs.map((l) => {
    if (l.hotspot) return l;
    const g = byGroup.get(l.group)!;
    const hs = MODEL_LAYOUTS[type]?.(l.name) ?? defaultHotspot(l, g.indexOf(l), g.length, type);
    return hs ? { ...l, hotspot: hs } : l;
  });
}
