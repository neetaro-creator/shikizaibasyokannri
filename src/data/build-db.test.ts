import { describe, expect, it } from 'vitest';
import { buildDb, DbError } from './build-db';

const base = {
  vehicles: 'vehicle_id,name,type,model\ntank1,信楽タンク1,タンク,\n',
  locations:
    'location_id,vehicle_id,name,group,hotspot,photo\n' +
    'tank1-l01,tank1,右側,右側,"1,2,3,4,5,6",\n' +
    'tank1-l02,tank1,左側,左側,,\n',
  items: 'item_id,name,aliases,category,photo,model\ni0001,カラビナ,からびな;karabiner,ロープ・器具,,\n',
  stock: 'item_id,location_id,qty,qty_note\ni0001,tank1-l01,5,\ni0001,tank1-l02,,適量\n',
};

describe('buildDb', () => {
  it('parses hotspot "1,2,3,4,5,6"', () => {
    expect(buildDb(base).locations[0].hotspot).toEqual({ x: 1, y: 2, z: 3, w: 4, h: 5, d: 6 });
  });

  it('empty hotspot → undefined', () => {
    expect(buildDb(base).locations[1].hotspot).toBeUndefined();
  });

  it('aliases split by ";"', () => {
    expect(buildDb(base).items[0].aliases).toEqual(['からびな', 'karabiner']);
  });

  it('qty "5" → 5 / qty "" with note → qtyNote only', () => {
    const { stock } = buildDb(base);
    expect(stock[0]).toEqual({ itemId: 'i0001', locationId: 'tank1-l01', qty: 5 });
    expect(stock[1]).toEqual({ itemId: 'i0001', locationId: 'tank1-l02', qtyNote: '適量' });
  });

  it('unknown locationId in stock → DbError with file "stock.csv" and line 3', () => {
    const bad = { ...base, stock: base.stock.replace('tank1-l02', 'nope') };
    try {
      buildDb(bad);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DbError);
      expect((e as DbError).file).toBe('stock.csv');
      expect((e as DbError).line).toBe(3);
    }
  });

  it('bad hotspot → DbError on locations.csv', () => {
    const bad = { ...base, locations: base.locations.replace('"1,2,3,4,5,6"', '"1,2,x"') };
    expect(() => buildDb(bad)).toThrow(DbError);
  });
});

describe('categories.csv', () => {
  it('majors を "|" で分け、品の中分類が無ければ行番号つきのエラー', () => {
    const cats = 'category,majors\nロープ・器具,救助|火災\n';
    expect(buildDb({ ...base, categories: cats }).categories).toEqual([{ name: 'ロープ・器具', majors: ['救助', '火災'] }]);
    try {
      buildDb({ ...base, categories: 'category,majors\n消火,火災\n' });
      expect.unreachable();
    } catch (e) {
      expect((e as DbError).file).toBe('items.csv');
      expect((e as DbError).line).toBe(2);
    }
  });
});
