import { summarize, uncountedNotes } from '../data/query';
import type { Db } from '../data/types';
import { h, vehicleHref } from './dom';
import { icon } from './icons';
import { vehicleTag } from './vehicle-tag';

export function render(root: HTMLElement, db: Db, id: string): void {
  if (!db.items.some((i) => i.id === id)) {
    root.append(h('p', { class: 'empty' }, 'この資器材は見つかりません。'));
    return;
  }
  const s = summarize(db, id);
  const base = import.meta.env.BASE_URL;
  // 車両ごとの数(数字の合計と、数で書かれていない注記を並べる)
  const perVehicle = db.vehicles.map((v) => {
    const rows = s.breakdown.filter((b) => b.vehicle.id === v.id);
    const n = rows.reduce((a, b) => a + (b.qty ?? 0), 0);
    const notes = [...new Set(rows.filter((b) => b.qty === undefined && b.qtyNote).map((b) => b.qtyNote!.replace(/^あり\(.*/, 'あり')))];
    return { v, rows, text: [n ? String(n) : '', ...notes].filter(Boolean).join(' + ') };
  }).filter((x) => x.rows.length);
  const extra = uncountedNotes(s);
  const parts = [
    h('p', { class: 'kicker' }, s.item.category),
    h('h1', {}, s.item.name),
    s.item.photo ? h('img', { class: 'photo', src: base + s.item.photo, alt: s.item.name }) : null,
    h('section', { class: 'panel total' },
      h('span', { class: 'label' }, '全車合計'),
      h('div', { class: 'total-line' },
        s.total || !extra.length ? h('strong', { class: 'big num', 'data-testid': 'total' }, String(s.total)) : null,
        extra.length ? h('span', { class: 'total-extra', 'data-testid': 'total-extra' }, `${s.total ? '+ ' : ''}${extra.join('・')}`) : null),
      extra.length ? h('p', { class: 'muted small' }, `「${extra.join('」「')}」のように数で書かれていない分は、合計の数字に入れていません。`) : null,
      h('table', { class: 'per-vehicle', 'data-testid': 'per-vehicle' },
        h('tbody', {}, perVehicle.map((x) => h('tr', {}, h('td', {}, vehicleTag(x.v)), h('td', { class: 'num' }, x.text)))))),
    h('h2', { class: 'label' }, `積載場所 ${s.breakdown.length}か所`),
    h('ul', { class: 'loclist' }, s.breakdown.map((b) => h('li', {}, h('a', { href: vehicleHref(b.vehicle.id, b.location.id), class: 'locrow' },
      icon('pin', 20),
      h('span', { class: 'grow' }, h('span', { class: 'loc-name' }, b.location.name), vehicleTag(b.vehicle)),
      h('span', { class: 'num' }, b.qty !== undefined ? `${b.qty}${b.qtyNote ? ` ${b.qtyNote}` : ''}` : b.qtyNote ?? ''),
      icon('chevron', 18))))),
    h('p', { class: 'muted' }, '場所を押すと、3Dで積載場所が光ります。'),
  ];
  root.append(...parts.filter((x): x is HTMLElement => x !== null));
}
