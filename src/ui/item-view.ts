import { formatTotal, summarize } from '../data/query';
import type { Db } from '../data/types';
import { h, vehicleHref } from './dom';

export function render(root: HTMLElement, db: Db, id: string): void {
  if (!db.items.some((i) => i.id === id)) {
    root.append(h('p', { class: 'empty' }, 'この資器材は見つかりません。'));
    return;
  }
  const s = summarize(db, id);
  const base = import.meta.env.BASE_URL;
  root.append(...[
    h('h1', {}, s.item.name),
    s.item.aliases.length ? h('p', { class: 'muted' }, `通称:${s.item.aliases.join('、')}`) : null,
    s.item.photo ? h('img', { class: 'photo', src: base + s.item.photo, alt: s.item.name }) : null,
    h('div', { class: 'total' }, '全車合計 ', h('strong', { 'data-testid': 'total' }, formatTotal(s))),
    h('h2', {}, '積載場所'),
    h('ul', { class: 'list' },
      s.breakdown.map((b) => h('li', {}, h('a', { href: vehicleHref(b.vehicle.id, b.location.id), class: 'row' },
        h('span', { class: 'row-main' }, b.location.name, h('small', {}, b.vehicle.name)),
        h('span', { class: 'badge' }, b.qty !== undefined ? `${b.qty}${b.qtyNote ? ` ${b.qtyNote}` : ''}` : b.qtyNote ?? ''))))),
    h('p', { class: 'muted' }, '場所を押すと車両のページへ移ります。'),
  ].filter((x): x is HTMLElement => x !== null));
}
