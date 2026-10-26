import { formatTotal, summarize } from '../data/query';
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
  // 車両ごとの数(横棒)
  const perVehicle = db.vehicles.map((v) => {
    const rows = s.breakdown.filter((b) => b.vehicle.id === v.id);
    return { v, rows, n: rows.reduce((a, b) => a + (b.qty ?? 0), 0), noted: rows.some((b) => b.qty === undefined) };
  }).filter((x) => x.rows.length);
  const max = Math.max(1, ...perVehicle.map((x) => x.n));

  const parts = [
    h('p', { class: 'kicker' }, s.item.category),
    h('h1', {}, s.item.name),
    s.item.photo ? h('img', { class: 'photo', src: base + s.item.photo, alt: s.item.name }) : null,
    h('section', { class: 'panel total' },
      h('div', {}, h('span', { class: 'label' }, '全車合計'), h('strong', { class: 'big num', 'data-testid': 'total' }, formatTotal(s))),
      h('ul', { class: 'bars' }, perVehicle.map((x) => h('li', {},
        vehicleTag(x.v),
        h('span', { class: 'bar' }, h('i', { style: `width:${Math.max(6, (x.n / max) * 100)}%` })),
        h('span', { class: 'num' }, x.n ? `${x.n}${x.noted ? '+' : ''}` : '—'))))),
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
