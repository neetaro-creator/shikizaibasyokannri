import { formatTotal, search, summarize, totals } from '../data/query';
import type { Db } from '../data/types';
import { h, itemHref, vehicleHref } from './dom';
import { icon, silhouette } from './icons';
import { vehicleTag } from './vehicle-tag';

let lastQuery = '';

/** 何台にも積んでいる品を「よく探す品」として出す。 */
function popular(db: Db) {
  return totals(db)
    .map((s) => ({ s, n: new Set(s.breakdown.map((b) => b.vehicle.id)).size }))
    .filter((x) => x.n >= 3)
    .sort((a, b) => b.n - a.n || b.s.total - a.s.total)
    .slice(0, 10)
    .map((x) => x.s.item);
}

/** 分類タイルと、選んだ分類の品カード(名前が出てこないとき用)。 */
function categoryBrowser(db: Db, selected?: string) {
  const categories = [...new Set(db.items.map((i) => i.category))];
  const grid = h('div', { class: 'grid' });
  const base = import.meta.env.BASE_URL;
  const show = (cat: string) => {
    history.replaceState(null, '', `#/?cat=${encodeURIComponent(cat)}`);
    tiles.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.cat === cat));
    grid.replaceChildren(...db.items.filter((i) => i.category === cat).map((i) =>
      h('a', { href: itemHref(i.id), class: 'card' },
        i.photo ? h('img', { src: base + i.photo, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }, i.name.slice(0, 2)),
        h('span', {}, i.name))));
    tiles.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const tiles = h('div', { class: 'tiles' }, categories.map((c) =>
    h('button', { type: 'button', 'data-cat': c, onclick: () => show(c) },
      icon(c, 26), h('span', {}, c), h('small', { class: 'num' }, String(db.items.filter((i) => i.category === c).length)))));
  if (selected && categories.includes(selected)) requestAnimationFrame(() => show(selected));
  return [h('h2', { class: 'label' }, '分類から(名前が出てこないとき)'), tiles, grid] as const;
}

export function render(root: HTMLElement, db: Db, cat?: string): void {
  const list = h('div', { class: 'results' });
  const [catLabel, catTiles, catGrid] = categoryBrowser(db, cat);
  const idle = h('div', { class: 'idle' },
    h('h2', { class: 'label' }, 'よく探す品'),
    h('div', { class: 'chips' }, popular(db).map((i) => h('a', { href: itemHref(i.id), class: 'chip' }, i.name))),
    catLabel, catTiles, catGrid,
    h('h2', { class: 'label' }, '車両の場所から'),
    h('div', { class: 'vgrid' }, db.vehicles.map((v) => h('a', { href: vehicleHref(v.id), class: `vcard mini v-${v.id}` },
      silhouette(v.type), h('span', {}, v.name)))));

  const update = (q: string) => {
    lastQuery = q;
    idle.hidden = !!q.trim();
    if (q.trim()) {
      // 入力を始めたら分類の選択は解除する
      catGrid.replaceChildren();
      catTiles.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
    }
    const found = search(db, q).slice(0, 60);
    list.replaceChildren(...found.map((item) => {
      const s = summarize(db, item.id);
      const shown = s.breakdown.slice(0, 3);
      return h('a', { href: itemHref(item.id), class: 'result', 'data-testid': 'result' },
        h('div', { class: 'result-head' },
          h('strong', {}, item.name),
          h('span', { class: 'num' }, formatTotal(s))),
        h('ul', { class: 'mini-loc' }, shown.map((b) => h('li', {},
          vehicleTag(b.vehicle),
          h('span', { class: 'loc-name' }, b.location.name),
          h('span', { class: 'num' }, b.qty !== undefined ? String(b.qty) : b.qtyNote ?? '')))),
        s.breakdown.length > shown.length ? h('p', { class: 'more' }, `ほか ${s.breakdown.length - shown.length} か所`) : null);
    }));
    if (q.trim() && !found.length) {
      list.append(h('p', { class: 'empty' }, '見つかりません。名前があいまいなら「探す」から分類や車両の場所で探せます。'));
    }
  };
  const input = h('input', {
    type: 'search', placeholder: '品名・よみ・通称で検索', value: lastQuery, autocomplete: 'off', enterkeyhint: 'search',
    'aria-label': '資器材を検索',
    oninput: (e) => update((e.target as HTMLInputElement).value),
  }) as HTMLInputElement;
  root.append(
    h('section', { class: 'hero' },
      h('p', { class: 'kicker' }, `${db.vehicles.length}台 ・ ${db.items.length}品目`),
      h('h1', {}, 'どこに積んである?'),
      h('label', { class: 'searchbox' }, icon('search'), input)),
    idle, list);
  update(lastQuery);
}
