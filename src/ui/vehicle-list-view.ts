import type { Db } from '../data/types';
import { h, vehicleHref } from './dom';

export function renderVehicles(root: HTMLElement, db: Db): void {
  root.append(h('h1', {}, '車両'), h('ul', { class: 'list' },
    db.vehicles.map((v) => h('li', {}, h('a', { href: vehicleHref(v.id), class: 'row' }, h('span', { class: 'row-main' }, v.name, h('small', {}, v.type)))))));
}
