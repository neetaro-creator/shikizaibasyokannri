import { formatTotal, search, summarize, totals } from '../data/query';
import type { Db } from '../data/types';
import { h, itemHref, vehicleHref } from './dom';
import { icon, silhouette } from './icons';
import { shortName, vehicleTag } from './vehicle-tag';

let lastQuery = '';
/** 検索する車両(空なら全車)。この端末に覚えておく。 */
const KEY = 'search-vehicles';
const chosen = new Set<string>(((): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
})());
const saveChosen = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify([...chosen]));
  } catch {
    /* 保存できなくても動く */
  }
};
/** 選んだ車両に積んでいる品か(未選択なら全部)。 */
const onChosen = (db: Db, itemId: string) => !chosen.size || summarize(db, itemId, chosen).breakdown.length > 0;

/** 何台にも積んでいる品を「よく探す品」として出す。 */
function popular(db: Db) {
  return totals(db)
    .filter((s) => onChosen(db, s.item.id))
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
    grid.replaceChildren(...db.items.filter((i) => i.category === cat && onChosen(db, i.id)).map((i) =>
      h('a', { href: itemHref(i.id), class: 'card' },
        i.photo ? h('img', { src: base + i.photo, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }, i.name.slice(0, 2)),
        h('span', {}, i.name))));
    tiles.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const tiles = h('div', { class: 'tiles' }, categories.map((c) =>
    h('button', { type: 'button', 'data-cat': c, onclick: () => show(c) },
      icon(c, 26), h('span', {}, c), h('small', { class: 'num' }, String(db.items.filter((i) => i.category === c).length)))));
  if (selected && categories.includes(selected)) requestAnimationFrame(() => show(selected));
  const refresh = () => {
    tiles.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.querySelector('small')!.textContent = String(db.items.filter((i) => i.category === b.dataset.cat && onChosen(db, i.id)).length);
    });
    const on = tiles.querySelector<HTMLButtonElement>('button.on');
    if (on) show(on.dataset.cat!);
  };
  return [h('h2', { class: 'label' }, '分類から(名前が出てこないとき)'), tiles, grid, refresh] as const;
}

export function render(root: HTMLElement, db: Db, cat?: string): void {
  const list = h('div', { class: 'results' });
  const [catLabel, catTiles, catGrid, refreshCats] = categoryBrowser(db, cat);
  const popularChips = h('div', { class: 'chips' });
  const renderPopular = () => popularChips.replaceChildren(...popular(db).map((i) => h('a', { href: itemHref(i.id), class: 'chip' }, i.name)));
  renderPopular();
  const idle = h('div', { class: 'idle' },
    h('h2', { class: 'label' }, 'よく探す品'),
    popularChips,
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
    const found = search(db, q, chosen).slice(0, 60);
    list.replaceChildren(...found.map((item) => {
      const s = summarize(db, item.id, chosen);
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
      list.append(h('p', { class: 'empty' }, chosen.size
        ? '選んだ車両には見つかりません。車両のチェックを外すと全車から探します。'
        : '見つかりません。名前があいまいなら、下の分類や車両の場所から探せます。'));
    }
  };
  const input = h('input', {
    type: 'search', placeholder: '品名・よみ・通称で検索', value: lastQuery, autocomplete: 'off', enterkeyhint: 'search',
    'aria-label': '資器材を検索',
    oninput: (e) => update((e.target as HTMLInputElement).value),
  }) as HTMLInputElement;
  // 車両で絞る:チェックした車両に積んでいる品・場所だけ出す(何もチェックしなければ全車)
  const filter = h('fieldset', { class: 'vfilter' },
    h('legend', {}, '車両で絞る'),
    db.vehicles.map((v) => {
      const box = h('input', {
        type: 'checkbox', 'aria-label': v.name,
        onchange: (e) => {
          if ((e.target as HTMLInputElement).checked) chosen.add(v.id);
          else chosen.delete(v.id);
          saveChosen();
          renderPopular();
          refreshCats();
          update(input.value);
        },
      }) as HTMLInputElement;
      box.checked = chosen.has(v.id);
      return h('label', { class: `vcheck v-${v.id}` }, box, h('span', {}, shortName(v)));
    }));
  root.append(
    h('section', { class: 'hero' },
      h('p', { class: 'kicker' }, `${db.vehicles.length}台 ・ ${db.items.length}品目`),
      h('h1', {}, 'どこに積んである?'),
      h('label', { class: 'searchbox' }, icon('search'), input),
      filter),
    idle, list);
  update(lastQuery);
}
