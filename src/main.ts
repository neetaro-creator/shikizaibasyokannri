import dbJson from './generated/db.json';
import type { Db } from './data/types';
import { h } from './ui/dom';
import { parseHash } from './ui/router';
import * as searchView from './ui/search-view';
import * as itemView from './ui/item-view';
import * as browseView from './ui/browse-view';
import * as totalsView from './ui/totals-view';
import { renderVehicles } from './ui/vehicle-list-view';
import * as vehicleView from './ui/vehicle-view';
import './ui/style.css';

const db = dbJson as Db;
const app = document.querySelector<HTMLElement>('#app')!;
const main = h('main');
const tabs = [
  ['search', '#/', '検索'],
  ['browse', '#/browse', '探す'],
  ['vehicles', '#/vehicle', '車両'],
  ['totals', '#/totals', '総数'],
] as const;
const nav = h('nav', { class: 'tabs' }, tabs.map(([name, href, label]) => h('a', { href, 'data-tab': name }, label)));
app.append(h('header', {}, h('a', { href: '#/', class: 'title' }, '積載資器材')), main, nav);

let cleanup: (() => void) | void;

function route(): void {
  const r = parseHash(location.hash);
  cleanup?.();
  cleanup = undefined;
  main.replaceChildren();
  window.scrollTo(0, 0);
  const tab = r.name === 'item' ? '' : r.name === 'vehicle' ? 'vehicles' : r.name;
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  switch (r.name) {
    case 'item': return itemView.render(main, db, r.id!);
    case 'browse': return browseView.render(main, db, r.query.get('cat') ?? undefined);
    case 'totals': return totalsView.render(main, db);
    case 'vehicles': return renderVehicles(main, db);
    case 'vehicle': {
      const v = db.vehicles.find((x) => x.id === r.id);
      if (!v) return void main.append(h('p', { class: 'empty' }, 'この車両は見つかりません。'));
      cleanup = vehicleView.render(main, db, v, r.query.get('loc') ?? undefined, r.query.get('align') === '1');
      return;
    }
    default: return searchView.render(main, db);
  }
}

window.addEventListener('hashchange', route);
route();
