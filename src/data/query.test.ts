import { describe, expect, it } from 'vitest';
import { formatTotal, itemsAt, itemsByVehicle, search, summarize, totals, uncountedNotes } from './query';
import { normalize } from './normalize';
import type { Db } from './types';

const db: Db = {
  vehicles: [
    { id: 'tank1', name: '信楽タンク1', type: 'タンク' },
    { id: 'pump1', name: '信楽ポンプ1', type: 'ポンプ' },
  ],
  locations: [
    { id: 't-l', vehicleId: 'tank1', name: '車両左側', group: '左側' },
    { id: 't-r', vehicleId: 'tank1', name: '車両右側', group: '右側' },
    { id: 'p-c', vehicleId: 'pump1', name: 'キャビン前部', group: 'キャビン' },
  ],
  items: [
    { id: 'a', name: 'カラビナ', aliases: [], category: 'ロープ・器具' },
    { id: 'b', name: 'アルミカラビナ(ピンロック)', aliases: [], category: 'ロープ・器具' },
    { id: 'c', name: '65mmホースバッグ', aliases: [], category: '消火' },
    { id: 'd', name: '吸管スパナ', aliases: ['すぱな'], category: '工具' },
    { id: 'e', name: '吸着マット', aliases: [], category: '工具' },
  ],
  stock: [
    { itemId: 'a', locationId: 't-l', qty: 5 },
    { itemId: 'a', locationId: 'p-c', qty: 4 },
    { itemId: 'b', locationId: 't-l', qty: 2 },
    { itemId: 'c', locationId: 't-r', qty: 3 },
    { itemId: 'd', locationId: 't-l', qty: 1 },
    { itemId: 'd', locationId: 't-r', qty: 1 },
    { itemId: 'e', locationId: 't-l', qtyNote: '適量' },
    { itemId: 'e', locationId: 'p-c', qty: 3 },
  ],
};

describe('normalize', () => {
  it('absorbs width, kana, space and ㎜', () => {
    expect(normalize('ｶﾗﾋﾞﾅ')).toBe(normalize('からびな'));
    expect(normalize('65㎜ ホース')).toBe('65mmほーす');
  });
  it('treats dash variants as the long vowel mark', () => {
    expect(normalize('ポ―チ')).toBe(normalize('ポーチ'));
    expect(normalize('ポ－チ')).toBe(normalize('ポーチ'));
    expect(normalize('ポ‐チ')).toBe(normalize('ポーチ'));
  });
});

describe('search', () => {
  it('half-width katakana and hiragana both find カラビナ', () => {
    expect(search(db, 'ｶﾗﾋﾞﾅ').map((i) => i.id)).toContain('a');
    expect(search(db, 'からびな').map((i) => i.id)).toContain('a');
  });
  it('prefix matches come first', () => {
    expect(search(db, 'カラビナ').map((i) => i.id)).toEqual(['a', 'b']);
  });
  it('65mm finds 65㎜ spelled item', () => {
    expect(search(db, '65㎜').map((i) => i.id)).toEqual(['c']);
  });
  it('matches aliases', () => {
    expect(search(db, 'すぱな').map((i) => i.id)).toEqual(['d']);
  });
  it('empty query → empty result', () => {
    expect(search(db, '  ')).toEqual([]);
  });
});

describe('summarize', () => {
  it('sums across vehicles', () => {
    const s = summarize(db, 'a');
    expect(s.total).toBe(9);
    expect(s.breakdown.map((b) => [b.vehicle.id, b.location.id, b.qty])).toEqual([
      ['tank1', 't-l', 5],
      ['pump1', 'p-c', 4],
    ]);
  });
  it('same item at two locations of one vehicle → two rows, summed', () => {
    const s = summarize(db, 'd');
    expect(s.total).toBe(2);
    expect(s.breakdown).toHaveLength(2);
  });
});

describe('formatTotal', () => {
  it('numeric only', () => expect(formatTotal(summarize(db, 'a'))).toBe('9'));
  it('note only → 適量', () => {
    const only = { ...db, stock: db.stock.filter((s) => !(s.itemId === 'e' && s.qty)) };
    expect(formatTotal(summarize(only, 'e'))).toBe('適量');
  });
  it('numeric + 適量 → 3+適量', () => expect(formatTotal(summarize(db, 'e'))).toBe('3+適量'));

  const notes = (...ns: (string | number)[]): Db => ({
    ...db,
    stock: ns.map((n, i) => ({ itemId: 'a', locationId: ['t-l', 't-r', 'p-c'][i], ...(typeof n === 'number' ? { qty: n } : { qtyNote: n }) })),
  });
  it('same non-適量 note everywhere → that note', () => expect(formatTotal(summarize(notes('一式', '一式'), 'a'))).toBe('一式'));
  it('different notes only → first note + ほか', () => expect(formatTotal(summarize(notes('一式', '各1'), 'a'))).toBe('一式ほか'));
  it('inspection note → あり', () => expect(formatTotal(summarize(notes('あり(点検:作動状況)'), 'a'))).toBe('あり'));
  it('numeric + one other note → 5+一式', () => expect(formatTotal(summarize(notes(5, '一式'), 'a'))).toBe('5+一式'));
  it('numeric + several notes → 2+適量ほか', () => expect(formatTotal(summarize(notes(2, '適量', '3以上'), 'a'))).toBe('2+適量ほか'));
  it('uncountedNotes lists the distinct notes in order', () => expect(uncountedNotes(summarize(notes(2, '適量', '3以上'), 'a'))).toEqual(['適量', '3以上']));
});

describe('listing', () => {
  it('itemsAt returns contents of a location', () => {
    expect(itemsAt(db, 't-r').map((x) => x.item.id)).toEqual(['c', 'd']);
  });
  it('itemsByVehicle groups by location in CSV order', () => {
    expect(itemsByVehicle(db, 'tank1').map((g) => g.location.id)).toEqual(['t-l', 't-r']);
  });
  it('totals covers every item', () => {
    expect(totals(db)).toHaveLength(5);
  });
});
