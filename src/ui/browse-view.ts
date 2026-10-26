import type { Db } from '../data/types';
import { h, itemHref, vehicleHref } from './dom';

export function render(root: HTMLElement, db: Db, selected?: string): void {
  const categories = [...new Set(db.items.map((i) => i.category))];
  const grid = h('div', { class: 'grid' });
  const show = (cat: string) => {
    history.replaceState(null, '', `#/browse?cat=${encodeURIComponent(cat)}`);
    chips.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.textContent === cat));
    const base = import.meta.env.BASE_URL;
    grid.replaceChildren(...db.items.filter((i) => i.category === cat).map((i) =>
      h('a', { href: itemHref(i.id), class: 'card' },
        i.photo ? h('img', { src: base + i.photo, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }, i.name.slice(0, 2)),
        h('span', {}, i.name))));
  };
  const chips = h('div', { class: 'chips' }, categories.map((c) => h('button', { type: 'button', onclick: () => show(c) }, c)));
  root.append(
    h('h1', {}, '探す'),
    h('p', { class: 'muted' }, '名前が出てこないときは、分類で絞るか、車両の場所から中身を見てください。'),
    h('div', { class: 'chips' }, db.vehicles.map((v) => h('a', { href: vehicleHref(v.id), class: 'chip' }, `${v.name}の場所から`))),
    h('h2', {}, '分類から'),
    chips,
    grid,
  );
  if (selected && categories.includes(selected)) show(selected);
}
