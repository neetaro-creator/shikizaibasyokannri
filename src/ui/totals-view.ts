import { formatTotal, summarize, totals } from '../data/query';
import type { Db } from '../data/types';
import { h, itemHref } from './dom';

export function render(root: HTMLElement, db: Db): void {
  const all = totals(db); // 車載だけの合計。車外品(車庫・書庫など)は入れず、横に「車外 ○」と書く
  const outside = new Map(all.map((s) => {
    const o = summarize(db, s.item.id, undefined, 'outside');
    return [s.item.id, o.breakdown.length ? `車外 ${formatTotal(o)}(合計外)` : ''];
  }));
  const list = h('ul', { class: 'loclist' });
  const draw = (by: 'name' | 'total') => {
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.by === by));
    const sorted = [...all].sort((a, b) =>
      by === 'total' ? b.total - a.total : a.item.name.localeCompare(b.item.name, 'ja'));
    list.replaceChildren(...sorted.map((s) => h('li', {}, h('a', { href: itemHref(s.item.id), class: 'locrow' },
      h('span', { class: 'grow' }, h('span', { class: 'loc-name' }, s.item.name),
        h('small', { class: 'muted' }, [
          s.breakdown.length ? `${new Set(s.breakdown.map((b) => b.vehicle.id)).size}台 ・ ${s.breakdown.length}か所` : '車両には積んでいない',
          outside.get(s.item.id),
        ].filter(Boolean).join(' ・ '))),
      h('span', { class: 'num', 'data-testid': 'row-total' }, formatTotal(s))))));
  };
  const seg = h('div', { class: 'segmented' },
    h('button', { type: 'button', 'data-by': 'name', onclick: () => draw('name') }, '品名順'),
    h('button', { type: 'button', 'data-by': 'total', onclick: () => draw('total') }, '合計数順'));
  root.append(h('p', { class: 'kicker' }, `${all.length}品目`), h('h1', {}, '総数一覧'), seg, list);
  draw('name');
}
