import type { Db } from '../data/types';
import { h, vehicleHref } from './dom';
import { silhouette } from './icons';

export function renderVehicles(root: HTMLElement, db: Db): void {
  root.append(h('p', { class: 'kicker' }, '信楽分署'), h('h1', {}, '車両'), h('div', { class: 'vlist' },
    db.vehicles.map((v) => {
      const locs = db.locations.filter((l) => l.vehicleId === v.id);
      const ids = new Set(locs.map((l) => l.id));
      const items = new Set(db.stock.filter((s) => ids.has(s.locationId)).map((s) => s.itemId));
      return h('a', { href: vehicleHref(v.id), class: `vcard v-${v.id}` },
        silhouette(v.type),
        h('div', {}, h('strong', {}, v.name), h('small', { class: 'muted' }, `${locs.length}か所 ・ ${items.size}品目`)));
    })));
}
