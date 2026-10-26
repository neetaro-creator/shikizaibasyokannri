import type { Db } from '../data/types';
import { h, itemHref, vehicleHref } from './dom';
import { icon, silhouette } from './icons';

export function render(root: HTMLElement, db: Db, selected?: string): void {
  const categories = [...new Set(db.items.map((i) => i.category))];
  const grid = h('div', { class: 'grid' });
  const head = h('h2', { class: 'label' });
  const show = (cat: string) => {
    history.replaceState(null, '', `#/browse?cat=${encodeURIComponent(cat)}`);
    tiles.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.cat === cat));
    const items = db.items.filter((i) => i.category === cat);
    head.textContent = `${cat} ${items.length}品目`;
    const base = import.meta.env.BASE_URL;
    grid.replaceChildren(...items.map((i) =>
      h('a', { href: itemHref(i.id), class: 'card' },
        i.photo ? h('img', { src: base + i.photo, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }, i.name.slice(0, 2)),
        h('span', {}, i.name))));
    head.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const tiles = h('div', { class: 'tiles' }, categories.map((c) =>
    h('button', { type: 'button', 'data-cat': c, onclick: () => show(c) },
      icon(c, 26), h('span', {}, c), h('small', { class: 'num' }, String(db.items.filter((i) => i.category === c).length)))));
  root.append(
    h('p', { class: 'kicker' }, '名前が出てこないとき'),
    h('h1', {}, '探す'),
    h('h2', { class: 'label' }, '車両の場所から'),
    h('div', { class: 'vgrid' }, db.vehicles.map((v) => h('a', { href: vehicleHref(v.id), class: `vcard mini v-${v.id}` },
      silhouette(v.type), h('span', {}, v.name)))),
    h('h2', { class: 'label' }, '分類から'),
    tiles, head, grid,
  );
  if (selected && categories.includes(selected)) show(selected);
}
