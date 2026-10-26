import Papa from 'papaparse';
import type { Category, Db, Hotspot, Item, Location, Stock, Vehicle, VehicleId } from './types';

export type CsvName = 'vehicles' | 'locations' | 'items' | 'stock' | 'categories';

export class DbError extends Error {
  constructor(public file: string, public line: number, message: string) {
    super(`${file}:${line}: ${message}`);
  }
}

const VEHICLE_IDS: VehicleId[] = ['tank1', 'pump1', 'command1', 'ambulance1'];

/** CSV を読み、ヘッダ行を 1 行目とした行番号つきで返す。 */
function rows(file: string, text: string): { line: number; r: Record<string, string> }[] {
  const res = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true });
  if (res.errors.length) {
    const e = res.errors[0];
    throw new DbError(file, (e.row ?? 0) + 2, e.message);
  }
  return res.data.map((r, i) => ({ line: i + 2, r }));
}

const opt = (s: string | undefined) => (s && s.trim() ? s.trim() : undefined);

function hotspot(file: string, line: number, s: string | undefined): Hotspot | undefined {
  if (!opt(s)) return undefined;
  const n = s!.split(',').map((v) => Number(v.trim()));
  if (n.length !== 6 || n.some((v) => !Number.isFinite(v))) {
    throw new DbError(file, line, `hotspot は "x,y,z,w,h,d" の6つの数値: ${s}`);
  }
  const [x, y, z, w, h, d] = n;
  return { x, y, z, w, h, d };
}

/** categories.csv は省略できる(そのときは品の中分類をそのまま「共通」に入れる)。 */
export function buildDb(files: Record<Exclude<CsvName, 'categories'>, string> & { categories?: string }): Db {
  const vehicles: Vehicle[] = rows('vehicles.csv', files.vehicles).map(({ line, r }) => {
    if (!VEHICLE_IDS.includes(r.vehicle_id as VehicleId)) {
      throw new DbError('vehicles.csv', line, `不明な vehicle_id: ${r.vehicle_id}`);
    }
    return { id: r.vehicle_id as VehicleId, name: r.name, type: r.type, ...(opt(r.model) && { model: opt(r.model) }) };
  });
  const vIds = new Set(vehicles.map((v) => v.id));

  const locations: Location[] = rows('locations.csv', files.locations).map(({ line, r }) => {
    if (!vIds.has(r.vehicle_id as VehicleId)) {
      throw new DbError('locations.csv', line, `不明な vehicle_id: ${r.vehicle_id}`);
    }
    const hs = hotspot('locations.csv', line, r.hotspot);
    return {
      id: r.location_id,
      vehicleId: r.vehicle_id as VehicleId,
      name: r.name,
      group: r.group,
      ...(hs && { hotspot: hs }),
      ...(opt(r.photo) && { photo: opt(r.photo) }),
    };
  });
  const lIds = new Set(locations.map((l) => l.id));

  const categories: Category[] | undefined = files.categories === undefined ? undefined
    : rows('categories.csv', files.categories).map(({ line, r }) => {
      const majors = (r.majors ?? '').split('|').map((m) => m.trim()).filter(Boolean);
      if (!majors.length) throw new DbError('categories.csv', line, `大分類(majors)が空: ${r.category}`);
      return { name: r.category, majors };
    });
  const catNames = new Set(categories?.map((c) => c.name));

  const items: Item[] = rows('items.csv', files.items).map(({ line, r }) => {
    if (categories && !catNames.has(r.category)) throw new DbError('items.csv', line, `categories.csv にない中分類: ${r.category}`);
    return {
      id: r.item_id,
      name: r.name,
      aliases: (r.aliases ?? '').split(';').map((a) => a.trim()).filter(Boolean),
      category: r.category,
      ...(opt(r.photo) && { photo: opt(r.photo) }),
      ...(opt(r.model) && { model: opt(r.model) }),
    };
  });
  const iIds = new Set(items.map((i) => i.id));

  const stock: Stock[] = rows('stock.csv', files.stock).map(({ line, r }) => {
    if (!iIds.has(r.item_id)) throw new DbError('stock.csv', line, `不明な item_id: ${r.item_id}`);
    if (!lIds.has(r.location_id)) throw new DbError('stock.csv', line, `不明な location_id: ${r.location_id}`);
    const s: Stock = { itemId: r.item_id, locationId: r.location_id };
    if (opt(r.qty)) {
      const q = Number(r.qty);
      if (!Number.isInteger(q) || q < 0) throw new DbError('stock.csv', line, `qty は0以上の整数: ${r.qty}`);
      s.qty = q;
    }
    if (opt(r.qty_note)) s.qtyNote = opt(r.qty_note);
    return s;
  });

  return { vehicles, locations, items, stock, categories: categories ?? [...new Set(items.map((i) => i.category))].map((name) => ({ name, majors: ['共通'] })) };
}
