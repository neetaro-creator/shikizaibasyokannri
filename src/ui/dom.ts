type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;
type Child = Node | string | null | undefined | false;

/** 小さな DOM ビルダー。on* 属性はイベントとして登録する。 */
export function h(tag: string, attrs: Attrs = {}, ...children: (Child | Child[])[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c) el.append(c);
  return el;
}

export const itemHref = (id: string) => `#/item/${encodeURIComponent(id)}`;
export const vehicleHref = (id: string, loc?: string) =>
  `#/vehicle/${id}${loc ? `?loc=${encodeURIComponent(loc)}` : ''}`;
