import { formatTotal, totals } from '../data/query';
import type { Db } from '../data/types';
import { h, itemHref } from './dom';

export function render(root: HTMLElement, db: Db): void {
  const all = totals(db);
  const list = h('ul', { class: 'loclist' });
  const draw = (by: 'name' | 'total') => {
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.by === by));
    const sorted = [...all].sort((a, b) =>
      by === 'total' ? b.total - a.total : a.item.name.localeCompare(b.item.name, 'ja'));
    list.replaceChildren(...sorted.map((s) => h('li', {}, h('a', { href: itemHref(s.item.id), class: 'locrow' },
      h('span', { class: 'grow' }, h('span', { class: 'loc-name' }, s.item.name),
        h('small', { class: 'muted' }, `${new Set(s.breakdown.map((b) => b.vehicle.id)).size}台 ・ ${s.breakdown.length}か所`)),
      h('span', { class: 'num', 'data-testid': 'row-total' }, formatTotal(s))))));
  };
  const seg = h('div', { class: 'segmented' },
    h('button', { type: 'button', 'data-by': 'name', onclick: () => draw('name') }, '品名順'),
    h('button', { type: 'button', 'data-by': 'total', onclick: () => draw('total') }, '合計数順'));
  root.append(h('p', { class: 'kicker' }, `${all.length}品目`), h('h1', {}, '総数一覧'), seg, list);
  draw('name');
}
