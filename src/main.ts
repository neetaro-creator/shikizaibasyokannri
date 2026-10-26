import dbJson from './generated/db.json';
import type { Db } from './data/types';
import { h } from './ui/dom';
import { icon } from './ui/icons';
import { parseHash } from './ui/router';
import * as searchView from './ui/search-view';
import * as itemView from './ui/item-view';
import * as totalsView from './ui/totals-view';
import { renderVehicles } from './ui/vehicle-list-view';
import * as vehicleView from './ui/vehicle-view';
import '@fontsource/jetbrains-mono/700.css';
import './ui/style.css';

const db = dbJson as Db;
const app = document.querySelector<HTMLElement>('#app')!;
const main = h('main');
const tabs = [
  ['search', '#/', '検索', 'search'],
  ['vehicles', '#/vehicle', '車両', 'truck'],
  ['totals', '#/totals', '総数', 'sigma'],
] as const;
const nav = h('nav', { class: 'tabs' }, tabs.map(([name, href, label, ic]) =>
  h('a', { href, 'data-tab': name }, icon(ic, 24), h('span', {}, label))));
app.append(
  h('header', {}, h('a', { href: '#/', class: 'brand' }, icon('logo', 26), h('span', {}, '積載資器材'), h('small', {}, '甲賀消防 信楽'))),
  main, nav);

// 戻ったときに一覧の位置を戻すため、画面ごとのスクロール位置を覚える
const scrollPos = new Map<string, number>();
let currentKey = location.hash;
let cleanup: (() => void) | void;

function route(): void {
  scrollPos.set(currentKey, window.scrollY);
  currentKey = location.hash;
  const r = parseHash(location.hash);
  cleanup?.();
  cleanup = undefined;
  main.replaceChildren();
  const tab = r.name === 'item' ? '' : r.name === 'vehicle' ? 'vehicles' : r.name === 'browse' ? 'search' : r.name;
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  document.body.dataset.route = r.name;
  switch (r.name) {
    case 'item': itemView.render(main, db, r.id!); break;
    case 'browse': searchView.render(main, db, r.query.get('cat') ?? undefined, r.query.get('sub') ?? undefined); break; // 以前の「探す」画面は検索画面に統合
    case 'totals': totalsView.render(main, db); break;
    case 'vehicles': renderVehicles(main, db); break;
    case 'vehicle': {
      const v = db.vehicles.find((x) => x.id === r.id);
      if (!v) main.append(h('p', { class: 'empty' }, 'この車両は見つかりません。'));
      else cleanup = vehicleView.render(main, db, v, r.query.get('loc') ?? undefined, r.query.get('align') === '1');
      break;
    }
    default: searchView.render(main, db, r.query.get('cat') ?? undefined, r.query.get('sub') ?? undefined);
  }
  window.scrollTo(0, scrollPos.get(currentKey) ?? 0);
}

window.addEventListener('hashchange', route);
route();
