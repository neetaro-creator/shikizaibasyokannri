import { normalize } from './normalize';
import type { Db, Item, Location, Vehicle, VehicleId } from './types';

export interface Breakdown { vehicle: Vehicle; location: Location; qty?: number; qtyNote?: string }
export interface ItemSummary { item: Item; total: number; hasUncounted: boolean; breakdown: Breakdown[] }
export interface Content { item: Item; qty?: number; qtyNote?: string }

/** vehicles を渡すと、その車両に積んでいる品だけ(空・未指定なら全車)。 */
export function search(db: Db, q: string, vehicles?: Set<string>): Item[] {
  const nq = normalize(q);
  if (!nq) return [];
  const onVehicles = (itemId: string) => !vehicles?.size || db.stock.some((s) => s.itemId === itemId && vehicles.has(db.locations.find((l) => l.id === s.locationId)!.vehicleId));
  const rank = (item: Item) => {
    const keys = [item.name, ...item.aliases].map(normalize);
    if (keys.some((k) => k.startsWith(nq))) return 0;
    if (keys.some((k) => k.includes(nq))) return 1;
    return -1;
  };
  return db.items
    .map((item, i) => ({ item, r: rank(item), i }))
    .filter((x) => x.r >= 0 && onVehicles(x.item.id))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.item);
}

/** vehicles を渡すと、その車両の場所だけで集計する(空・未指定なら全車)。 */
export function summarize(db: Db, itemId: string, vehicles?: Set<string>): ItemSummary {
  const item = db.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`unknown item ${itemId}`);
  const vOrder = db.vehicles.map((v) => v.id);
  const breakdown: Breakdown[] = db.stock
    .filter((s) => s.itemId === itemId)
    .map((s) => {
      const location = db.locations.find((l) => l.id === s.locationId)!;
      const vehicle = db.vehicles.find((v) => v.id === location.vehicleId)!;
      return { vehicle, location, qty: s.qty, qtyNote: s.qtyNote };
    })
    .filter((b) => !vehicles?.size || vehicles.has(b.vehicle.id))
    .sort((a, b) => vOrder.indexOf(a.vehicle.id) - vOrder.indexOf(b.vehicle.id));
  return {
    item,
    total: breakdown.reduce((n, b) => n + (b.qty ?? 0), 0),
    hasUncounted: breakdown.some((b) => b.qty === undefined && b.qtyNote !== undefined),
    breakdown,
  };
}

export function itemsAt(db: Db, locationId: string): Content[] {
  return db.stock
    .filter((s) => s.locationId === locationId)
    .map((s) => ({ item: db.items.find((i) => i.id === s.itemId)!, qty: s.qty, qtyNote: s.qtyNote }));
}

export function itemsByVehicle(db: Db, vehicleId: VehicleId): { location: Location; items: Content[] }[] {
  return db.locations
    .filter((l) => l.vehicleId === vehicleId)
    .map((location) => ({ location, items: itemsAt(db, location.id) }));
}

export function totals(db: Db): ItemSummary[] {
  return db.items.map((i) => summarize(db, i.id));
}

/** 「あり(点検:作動状況)」のような点検由来の注記は「あり」と読む。 */
const noteLabel = (n: string) => (n.startsWith('あり(') ? 'あり' : n);

/** 数で書かれていない分(適量・一式・3以上など)の注記。重複を除き、出てきた順。 */
export function uncountedNotes(s: ItemSummary): string[] {
  return [...new Set(s.breakdown.filter((b) => b.qty === undefined && b.qtyNote).map((b) => noteLabel(b.qtyNote!)))];
}

/** 一覧用の短い表記:「9」「適量」「一式ほか」「3+適量」「2+適量ほか」。 */
export function formatTotal(s: ItemSummary): string {
  const notes = uncountedNotes(s);
  if (!notes.length) return String(s.total);
  const extra = notes[0] + (notes.length > 1 ? 'ほか' : '');
  return s.total === 0 ? extra : `${s.total}+${extra}`;
}
