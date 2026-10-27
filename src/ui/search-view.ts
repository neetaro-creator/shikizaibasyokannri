import { categoriesIn, formatTotal, isOutside, majors, majorsOf, search, summarize, type Where } from '../data/query';
import type { Db, Item } from '../data/types';
import { h, itemHref } from './dom';
import { icon } from './icons';
import { outsideTag, shortName, vehicleTag } from './vehicle-tag';

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
/** 車外品(車庫・書庫など)も探すか。端末には覚えず、アプリを開き直すと外れる。 */
let withOutside = false;
const where = (): Where => (withOutside ? 'both' : 'vehicle');
/** 選んだ車両(未選択なら全車)に積んでいる品か。車外品は withOutside のときだけ数える。 */
const onChosen = (db: Db, itemId: string) => summarize(db, itemId, chosen, where()).breakdown.length > 0;

/** 大分類のタイルと、選んだ大分類の中分類チップ・品カード(名前が出てこないとき用)。
 *  中分類は大分類をまたぐことがあり(例:破壊器具は救助にも火災にも出る)、同じ品がいくつもの大分類に出る。 */
function categoryBrowser(db: Db, selected?: string, selectedSub?: string) {
  const all = majors(db);
  const body = h('div', { class: 'browse' });
  const base = import.meta.env.BASE_URL;
  const itemsOf = (cat: string) => db.items.filter((i) => i.category === cat && onChosen(db, i.id));
  const inMajor = (m: string) => db.items.filter((i) => majorsOf(db, i).includes(m) && onChosen(db, i.id));
  const card = (i: Item) => h('a', { href: itemHref(i.id), class: 'card' },
    i.photo ? h('img', { src: base + i.photo, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }, i.name.slice(0, 2)),
    h('span', {}, i.name));
  const show = (m: string, sub?: string, scroll = true) => {
    history.replaceState(null, '', `#/?cat=${encodeURIComponent(m)}${sub ? `&sub=${encodeURIComponent(sub)}` : ''}`);
    tiles.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.cat === m));
    const cats = categoriesIn(db, m).filter((c) => itemsOf(c.name).length);
    const chip = (label: string, value: string | undefined, n: number) =>
      h('button', { type: 'button', class: value === sub ? 'on' : '', 'data-sub': value ?? '', onclick: () => show(m, value, false) },
        label, h('small', { class: 'num' }, String(n)));
    body.replaceChildren(
      h('div', { class: 'chips subcats', role: 'group', 'aria-label': '中分類' },
        chip('すべて', undefined, inMajor(m).length), cats.map((c) => chip(c.name, c.name, itemsOf(c.name).length))),
      ...(sub ? [h('div', { class: 'grid' }, itemsOf(sub).map(card))]
        : cats.map((c) => h('section', { class: 'subcat' }, h('h3', { class: 'label' }, c.name), h('div', { class: 'grid' }, itemsOf(c.name).map(card))))));
    if (scroll) tiles.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const tiles = h('div', { class: 'tiles' }, all.map((m) =>
    h('button', { type: 'button', 'data-cat': m, onclick: () => show(m) },
      icon(m, 26), h('span', {}, m), h('small', { class: 'num' }, String(inMajor(m).length)))));
  if (selected && all.includes(selected)) {
    const sub = selectedSub && categoriesIn(db, selected).some((c) => c.name === selectedSub) ? selectedSub : undefined;
    requestAnimationFrame(() => show(selected, sub));
  }
  const refresh = () => {
    tiles.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.querySelector('small')!.textContent = String(inMajor(b.dataset.cat!).length);
    });
    const on = tiles.querySelector<HTMLButtonElement>('button.on');
    const sub = body.querySelector<HTMLButtonElement>('.subcats button.on')?.dataset.sub;
    if (on) show(on.dataset.cat!, sub || undefined, false);
  };
  return [h('h2', { class: 'label' }, '分類から'), tiles, body, refresh] as const;
}

export function render(root: HTMLElement, db: Db, cat?: string, sub?: string): void {
  const list = h('div', { class: 'results' });
  const [catLabel, catTiles, catGrid, refreshCats] = categoryBrowser(db, cat, sub);
  const idle = h('div', { class: 'idle' }, catLabel, catTiles, catGrid);

  const update = (q: string) => {
    lastQuery = q;
    idle.hidden = !!q.trim();
    if (q.trim()) {
      // 入力を始めたら分類の選択は解除する
      catGrid.replaceChildren();
      catTiles.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
    }
    const found = search(db, q, chosen, withOutside).slice(0, 60);
    list.replaceChildren(...found.map((item) => {
      const s = summarize(db, item.id, chosen, where());
      const shown = s.breakdown.slice(0, 3);
      return h('a', { href: itemHref(item.id), class: 'result', 'data-testid': 'result' },
        h('div', { class: 'result-head' },
          h('strong', {}, item.name),
          h('span', { class: 'num' }, formatTotal(s))),
        h('ul', { class: 'mini-loc' }, shown.map((b) => h('li', {},
          isOutside(b.location) ? outsideTag() : vehicleTag(b.vehicle),
          h('span', { class: 'loc-name' }, b.location.name),
          h('span', { class: 'num' }, b.qty !== undefined ? String(b.qty) : b.qtyNote ?? '')))),
        s.breakdown.length > shown.length ? h('p', { class: 'more' }, `ほか ${s.breakdown.length - shown.length} か所`) : null);
    }));
    if (q.trim() && !found.length) {
      list.append(h('p', { class: 'empty' }, chosen.size
        ? '選んだ車両には見つかりません。車両のチェックを外すと全車から探します。'
        : withOutside ? '見つかりません。名前があいまいなら、分類から探せます。' : '車両には見つかりません。車庫・書庫なども探すなら「車外品」にチェックを入れてください。'));
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
          refreshCats();
          update(input.value);
        },
      }) as HTMLInputElement;
      box.checked = chosen.has(v.id);
      return h('label', { class: `vcheck v-${v.id}` }, box, h('span', {}, shortName(v)));
    }),
    // 車外品(車庫・書庫など)は普段は出さない。現場で探すときだけチェックして加える
    h('label', { class: 'vcheck v-outside' },
      h('input', {
        type: 'checkbox', 'aria-label': '車外品(車庫・書庫など)も探す',
        onchange: (e) => {
          withOutside = (e.target as HTMLInputElement).checked;
          refreshCats();
          update(input.value);
        },
        ...(withOutside && { checked: true }),
      }),
      h('span', {}, '車外品')));
  root.append(
    h('section', { class: 'hero' },
      h('p', { class: 'kicker' }, `${db.vehicles.length}台 ・ ${db.items.length}品目`),
      h('h1', {}, 'どこに積んである?'),
      h('label', { class: 'searchbox' }, icon('search'), input),
      filter),
    idle, list);
  update(lastQuery);
}
