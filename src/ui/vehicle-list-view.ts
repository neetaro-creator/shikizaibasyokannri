import { itemsByVehicle } from '../data/query';
import type { Db, VehicleId } from '../data/types';
import { h, itemHref, vehicleHref } from './dom';

export function renderVehicles(root: HTMLElement, db: Db): void {
  root.append(h('h1', {}, '車両'), h('ul', { class: 'list' },
    db.vehicles.map((v) => h('li', {}, h('a', { href: vehicleHref(v.id), class: 'row' }, h('span', { class: 'row-main' }, v.name, h('small', {}, v.type)))))));
}

/** 車両の場所別一覧。focus の場所を強調してスクロールする。 */
export function renderLocations(root: HTMLElement, db: Db, id: VehicleId, focus?: string): void {
  const groups = itemsByVehicle(db, id);
  const sections = groups.map(({ location, items }) =>
    h('section', { class: `loc${location.id === focus ? ' focus' : ''}`, id: `loc-${location.id}` },
      h('h2', {}, location.name),
      h('ul', { class: 'list' }, items.map((c) => h('li', {}, h('a', { href: itemHref(c.item.id), class: 'row' },
        h('span', { class: 'row-main' }, c.item.name),
        h('span', { class: 'badge' }, c.qty !== undefined ? String(c.qty) : c.qtyNote ?? '')))))));
  root.append(...sections);
  if (focus) requestAnimationFrame(() => document.getElementById(`loc-${focus}`)?.scrollIntoView({ block: 'center' }));
}
