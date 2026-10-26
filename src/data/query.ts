import { normalize } from './normalize';
import type { Db, Item, Location, Vehicle, VehicleId } from './types';

export interface Breakdown { vehicle: Vehicle; location: Location; qty?: number; qtyNote?: string }
export interface ItemSummary { item: Item; total: number; hasUncounted: boolean; breakdown: Breakdown[] }
export interface Content { item: Item; qty?: number; qtyNote?: string }

export function search(db: Db, q: string): Item[] {
  const nq = normalize(q);
  if (!nq) return [];
  const rank = (item: Item) => {
    const keys = [item.name, ...item.aliases].map(normalize);
    if (keys.some((k) => k.startsWith(nq))) return 0;
    if (keys.some((k) => k.includes(nq))) return 1;
    return -1;
  };
  return db.items
    .map((item, i) => ({ item, r: rank(item), i }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.item);
}

export function summarize(db: Db, itemId: string): ItemSummary {
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

export function formatTotal(s: ItemSummary): string {
  if (s.total === 0 && s.hasUncounted) return '適量';
  return s.hasUncounted ? `${s.total}(ほか適量あり)` : String(s.total);
}
