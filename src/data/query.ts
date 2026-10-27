import { normalize } from './normalize';
import type { Category, Db, Item, Location, Vehicle, VehicleId } from './types';

export interface Breakdown { vehicle: Vehicle; location: Location; qty?: number; qtyNote?: string }
export interface ItemSummary { item: Item; total: number; hasUncounted: boolean; breakdown: Breakdown[] }
export interface Content { item: Item; qty?: number; qtyNote?: string }

/** 車外品:車両に積まず、車庫・書庫・資器材庫などに置いている品の場所。点検表の上ではどれかの車両に属する。 */
export const isOutside = (l: Location) => l.group === '車外保管';

/** どの場所を数えるか。vehicle=車載だけ(既定)、outside=車外だけ、both=両方。 */
export type Where = 'vehicle' | 'outside' | 'both';
const inWhere = (l: Location, where: Where) => where === 'both' || (where === 'outside') === isOutside(l);

/** vehicles を渡すと、その車両(の点検表)の品だけ(空・未指定なら全車)。車外品は withOutside のときだけ含める。 */
export function search(db: Db, q: string, vehicles?: Set<string>, withOutside = false): Item[] {
  const nq = normalize(q);
  if (!nq) return [];
  const where: Where = withOutside ? 'both' : 'vehicle';
  const onVehicles = (itemId: string) => db.stock.some((s) => {
    if (s.itemId !== itemId) return false;
    const l = db.locations.find((x) => x.id === s.locationId)!;
    return inWhere(l, where) && (!vehicles?.size || vehicles.has(l.vehicleId));
  });
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

/** vehicles を渡すと、その車両の場所だけで集計する(空・未指定なら全車)。where で車外品を入れるか決める(既定は車載だけ)。 */
export function summarize(db: Db, itemId: string, vehicles?: Set<string>, where: Where = 'vehicle'): ItemSummary {
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
    .filter((b) => inWhere(b.location, where) && (!vehicles?.size || vehicles.has(b.vehicle.id)))
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

/** 大分類の一覧(categories.csv に出てくる順)。 */
export function majors(db: Db): string[] {
  return [...new Set(db.categories.flatMap((c) => c.majors))];
}

/** 大分類に入る中分類。その大分類を先頭に挙げた中分類(本来の持ち場)を先に、あとは categories.csv の順。 */
export function categoriesIn(db: Db, major: string): Category[] {
  return db.categories.filter((c) => c.majors.includes(major))
    .map((c, i) => ({ c, i, rank: c.majors.indexOf(major) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.c);
}

/** 品が入る大分類(中分類が複数の大分類にまたがれば複数)。 */
export function majorsOf(db: Db, item: Item): string[] {
  return db.categories.find((c) => c.name === item.category)?.majors ?? [];
}
