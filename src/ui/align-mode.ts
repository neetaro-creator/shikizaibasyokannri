import type { Hotspot, Location } from '../data/types';
import { h } from './dom';

const KEYS = ['x', 'y', 'z', 'w', 'h', 'd'] as const;
const LABEL: Record<(typeof KEYS)[number], string> = { x: '前後', y: '高さ', z: '左右', w: '長さ', h: '縦幅', d: '厚み' };
const STEP = 0.1;
const round = (n: number) => Math.round(n * 1000) / 1000;

export const hotspotText = (hs: Hotspot) => KEYS.map((k) => round(hs[k])).join(',');

/**
 * 位置合わせパネル(#/vehicle/:id?align=1)。選んだ場所の箱を動かし、
 * locations.csv の hotspot 欄に貼る文字列を出す。
 */
export function createAlignPanel(onChange: (id: string, hs: Hotspot) => void) {
  const el = h('section', { class: 'align' });
  let current: { id: string; hs: Hotspot } | undefined;

  function draw() {
    if (!current) return void el.replaceChildren(h('p', { class: 'muted' }, '位置合わせ:場所を選んでください。'));
    const { id, hs } = current;
    const text = h('input', { readonly: true, value: hotspotText(hs), 'data-testid': 'hotspot-text', class: 'hs-text' }) as HTMLInputElement;
    const set = (k: (typeof KEYS)[number], v: number) => {
      current = { id, hs: { ...hs, [k]: round(v) } };
      onChange(id, current.hs);
      draw();
    };
    el.replaceChildren(
      h('h2', {}, '位置合わせ'),
      ...KEYS.map((k) => h('div', { class: 'align-row' },
        h('span', {}, `${k}(${LABEL[k]})`),
        h('button', { type: 'button', 'aria-label': `${k} を減らす`, onclick: () => set(k, hs[k] - STEP) }, '−'),
        h('input', { type: 'number', step: STEP, value: round(hs[k]), onchange: (e) => set(k, Number((e.target as HTMLInputElement).value)) }),
        h('button', { type: 'button', 'aria-label': `${k} を増やす`, onclick: () => set(k, hs[k] + STEP) }, '+'))),
      h('div', { class: 'align-row' }, text,
        h('button', {
          type: 'button',
          onclick: async (e) => {
            const b = e.currentTarget as HTMLButtonElement;
            try {
              await navigator.clipboard.writeText(text.value);
              b.textContent = 'コピーしました';
            } catch {
              text.select();
              b.textContent = '選択しました';
            }
          },
        }, 'コピー')),
      h('p', { class: 'muted' }, 'この文字列を data/locations.csv の hotspot 欄に貼り付けてください。'),
    );
  }

  draw();
  return {
    el,
    show(loc: Location | undefined) {
      current = loc?.hotspot ? { id: loc.id, hs: loc.hotspot } : undefined;
      draw();
    },
  };
}
