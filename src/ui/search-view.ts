import { formatTotal, search, summarize } from '../data/query';
import type { Db } from '../data/types';
import { h, itemHref } from './dom';

let lastQuery = '';

export function render(root: HTMLElement, db: Db): void {
  const list = h('ul', { class: 'list' });
  const update = (q: string) => {
    lastQuery = q;
    const found = search(db, q).slice(0, 100);
    list.replaceChildren(
      ...found.map((item) => {
        const s = summarize(db, item.id);
        const vehicles = [...new Set(s.breakdown.map((b) => b.vehicle.name))].join('・');
        return h('li', {}, h('a', { href: itemHref(item.id), class: 'row' },
          h('span', { class: 'row-main' }, item.name, h('small', {}, vehicles)),
          h('span', { class: 'badge' }, formatTotal(s))));
      }),
    );
    if (q.trim() && !found.length) list.append(h('li', { class: 'empty' }, '見つかりません。「探す」から分類や車両で探せます。'));
  };
  const input = h('input', {
    type: 'search', placeholder: '品名・通称で検索(例:カラビナ)', value: lastQuery, autocomplete: 'off',
    oninput: (e) => update((e.target as HTMLInputElement).value),
  }) as HTMLInputElement;
  root.append(h('div', { class: 'search' }, input), list);
  update(lastQuery);
  if (!lastQuery) input.focus();
}
