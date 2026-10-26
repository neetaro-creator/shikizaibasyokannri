import type { Hotspot, Location } from '../data/types';
import { pumpHotspot } from './models/pump';
import { tankHotspot } from './models/tank';
import { ambulanceHotspot } from './models/ambulance';
import { defaultHotspot } from './placeholder';

/** 車種ごとの作り込みモデルが持つ場所の配置。 */
/** null は「車の外なので3Dに置かない」。配列は「何か所かに分かれている」(先頭が主な箱)。 */
const MODEL_LAYOUTS: Record<string, (name: string) => Hotspot | Hotspot[] | null | undefined> = {
  ポンプ: pumpHotspot,
  タンク: tankHotspot,
  救急: ambulanceHotspot,
};

/** 場所の箱の位置を決める。優先順:CSV の hotspot > 車種モデルの配置 > 自動配置。 */
export function resolveHotspots(locs: Location[], type: string): Location[] {
  const byGroup = new Map<string, Location[]>();
  for (const l of locs) byGroup.set(l.group, [...(byGroup.get(l.group) ?? []), l]);
  return locs.map((l) => {
    if (l.hotspot) return l;
    const g = byGroup.get(l.group)!;
    const m = MODEL_LAYOUTS[type]?.(l.name);
    if (m === null) return l;
    if (Array.isArray(m)) return { ...l, hotspot: m[0], moreHotspots: m.slice(1) };
    const hs = m ?? defaultHotspot(l, g.indexOf(l), g.length, type);
    return hs ? { ...l, hotspot: hs } : l;
  });
}
