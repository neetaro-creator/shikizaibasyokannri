import { isOutside, itemsAt } from '../data/query';
import type { Db } from '../data/types';
import { h, itemHref } from './dom';
import { shortName } from './vehicle-tag';

/** 車外品:車庫・書庫・資器材庫などに置いている品。車両とは別に、場所ごとに並べる。 */
export function render(root: HTMLElement, db: Db, loc?: string): void {
  const locs = db.locations.filter(isOutside);
  root.append(
    h('p', { class: 'kicker' }, `${locs.length}か所 ・ 車両の合計には入りません`),
    h('h1', {}, '車外(車庫・書庫など)'),
    ...locs.map((l) => {
      const v = db.vehicles.find((x) => x.id === l.vehicleId)!;
      const items = itemsAt(db, l.id);
      return h('section', { class: `outside-loc${l.id === loc ? ' on' : ''}`, id: `loc-${l.id}`, 'data-loc': l.id },
        h('h2', { class: 'label' }, l.name, ' ', h('small', { class: 'muted' }, `(${shortName(v)}の点検表)`)),
        h('ul', { class: 'loclist' }, items.map((c) => h('li', {}, h('a', { href: itemHref(c.item.id), class: 'locrow' },
          h('span', { class: 'grow' }, h('span', { class: 'loc-name' }, c.item.name)),
          h('span', { class: 'num' }, c.qty !== undefined ? `${c.qty}${c.qtyNote ? ` ${c.qtyNote}` : ''}` : c.qtyNote ?? ''))))));
    }));
  if (loc) requestAnimationFrame(() => document.getElementById(`loc-${loc}`)?.scrollIntoView({ block: 'start' }));
}
