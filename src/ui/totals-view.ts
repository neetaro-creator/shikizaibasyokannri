import { formatTotal, totals } from '../data/query';
import type { Db } from '../data/types';
import { h, itemHref } from './dom';

export function render(root: HTMLElement, db: Db): void {
  const all = totals(db);
  const list = h('ul', { class: 'list' });
  const draw = (by: 'name' | 'total') => {
    const sorted = [...all].sort((a, b) =>
      by === 'total' ? b.total - a.total : a.item.name.localeCompare(b.item.name, 'ja'));
    list.replaceChildren(...sorted.map((s) => h('li', {}, h('a', { href: itemHref(s.item.id), class: 'row' },
      h('span', { class: 'row-main' }, s.item.name, h('small', {}, `${new Set(s.breakdown.map((b) => b.vehicle.id)).size}台`)),
      h('span', { class: 'badge', 'data-testid': 'row-total' }, formatTotal(s))))));
  };
  root.append(
    h('h1', {}, '総数一覧'),
    h('div', { class: 'chips' },
      h('button', { type: 'button', onclick: () => draw('name') }, '品名順'),
      h('button', { type: 'button', onclick: () => draw('total') }, '合計数順')),
    list,
  );
  draw('name');
}
