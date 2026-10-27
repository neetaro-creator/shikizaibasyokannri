import { isOutside } from '../data/query';
import type { Db } from '../data/types';
import { h, outsideHref, vehicleHref } from './dom';
import { icon, silhouette } from './icons';

export function renderVehicles(root: HTMLElement, db: Db): void {
  root.append(h('p', { class: 'kicker' }, '信楽分署'), h('h1', {}, '車両'), h('div', { class: 'vlist' },
    db.vehicles.map((v) => {
      const locs = db.locations.filter((l) => l.vehicleId === v.id && !isOutside(l));
      const ids = new Set(locs.map((l) => l.id));
      const items = new Set(db.stock.filter((s) => ids.has(s.locationId)).map((s) => s.itemId));
      return h('a', { href: vehicleHref(v.id), class: `vcard v-${v.id}` },
        silhouette(v.type),
        h('div', {}, h('strong', {}, v.name), h('small', { class: 'muted' }, `${locs.length}か所 ・ ${items.size}品目`)));
    }),
    outsideCard(db)));
}

/** 車両とは別の「車外(車庫・書庫など)」。 */
function outsideCard(db: Db) {
  const locs = db.locations.filter(isOutside);
  const ids = new Set(locs.map((l) => l.id));
  const items = new Set(db.stock.filter((s) => ids.has(s.locationId)).map((s) => s.itemId));
  return h('a', { href: outsideHref(), class: 'vcard v-outside' },
    h('span', { class: 'ph-icon' }, icon('box', 40)),
    h('div', {}, h('strong', {}, '車外(車庫・書庫など)'), h('small', { class: 'muted' }, `${locs.length}か所 ・ ${items.size}品目`)));
}
