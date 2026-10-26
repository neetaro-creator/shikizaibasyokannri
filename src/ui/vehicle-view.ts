import * as THREE from 'three';
import { itemsAt } from '../data/query';
import type { Db, Location, Vehicle } from '../data/types';
import { createHotspots } from '../three/hotspots';
import { loadVehicle } from '../three/load-vehicle';
import { defaultHotspot } from '../three/placeholder';
import { createScene } from '../three/scene';
import { disposeObject } from '../three/dispose';
import { createAlignPanel } from './align-mode';
import { h, itemHref, vehicleHref } from './dom';

/** CSV の hotspot が無い場所に既定位置を補う。 */
function withHotspots(locs: Location[], type: string): Location[] {
  const byGroup = new Map<string, Location[]>();
  for (const l of locs) byGroup.set(l.group, [...(byGroup.get(l.group) ?? []), l]);
  return locs.map((l) => {
    if (l.hotspot) return l;
    const g = byGroup.get(l.group)!;
    const hs = defaultHotspot(l, g.indexOf(l), g.length, type);
    return hs ? { ...l, hotspot: hs } : l;
  });
}

/** 車両 3D と場所一覧。戻り値は後片付け。 */
export function render(root: HTMLElement, db: Db, v: Vehicle, focus?: string, align = false): () => void {
  const locs = withHotspots(db.locations.filter((l) => l.vehicleId === v.id), v.type);
  const canvas = h('canvas', { 'aria-label': `${v.name}の3D表示` }) as HTMLCanvasElement;
  const note = h('p', { class: 'hud-note' }, 'ドラッグで回転 ・ ピンチで拡大 ・ 箱をタップで中身');
  const viewer = h('div', { class: 'viewer', 'data-testid': 'viewer' }, canvas,
    h('div', { class: 'hud' }, h('span', { class: 'kicker' }, v.type), h('h1', {}, v.name)), note);
  const sheet = h('aside', { class: 'sheet', 'data-testid': 'sheet', 'aria-label': '選んだ場所の積載品', 'aria-live': 'polite', hidden: true });
  const groups = [...new Set(locs.map((l) => l.group))];
  const chips = groups.map((g) => h('div', {},
    h('h2', { class: 'label' }, g),
    h('div', { class: 'chips' }, locs.filter((l) => l.group === g).map((l) =>
      h('button', { type: 'button', 'data-loc': l.id, onclick: () => select(l.id) }, l.name)))));
  const panel = align
    ? createAlignPanel((id, hs) => {
        const i = locs.findIndex((l) => l.id === id);
        locs[i] = { ...locs[i], hotspot: hs };
        hotspots?.setHotspot(id, hs);
      })
    : undefined;
  root.append(...[viewer, panel?.el ?? null, ...chips, sheet].filter((x): x is HTMLElement => x !== null));

  let three: ReturnType<typeof createScene> | undefined;
  let hotspots: ReturnType<typeof createHotspots> | undefined;
  let vehicleObject: THREE.Object3D | undefined;
  let disposed = false;

  function select(id?: string) {
    const loc = locs.find((l) => l.id === id);
    history.replaceState(null, '', vehicleHref(v.id, loc?.id) + (align ? `${loc ? '&' : '?'}align=1` : ''));
    panel?.show(loc);
    root.querySelectorAll<HTMLButtonElement>('[data-loc]').forEach((b) => b.classList.toggle('on', b.dataset.loc === loc?.id));
    hotspots?.highlight(loc?.hotspot ? loc.id : undefined);
    if (hotspots?.highlighted()) viewer.dataset.highlight = loc!.id;
    else delete viewer.dataset.highlight;
    if (!loc) {
      sheet.hidden = true;
      document.body.classList.remove('sheet-open');
      return;
    }
    const contents = itemsAt(db, loc.id);
    sheet.replaceChildren(...[
      h('div', { class: 'sheet-head' },
        h('div', {}, h('span', { class: 'kicker' }, `${v.name} ・ ${contents.length}品目`), h('strong', {}, loc.name)),
        h('button', { type: 'button', class: 'close', 'aria-label': '閉じる', onclick: () => select(undefined) }, '×')),
      loc.hotspot ? null : h('p', { class: 'muted' }, 'この場所は3D上には表示されません(車外保管など)。'),
      h('ul', { class: 'list' }, contents.map((c) => h('li', {}, h('a', { href: itemHref(c.item.id), class: 'row' },
        h('span', { class: 'row-main' }, c.item.name),
        h('span', { class: 'badge' }, c.qty !== undefined ? String(c.qty) : c.qtyNote ?? ''))))),
    ].filter((x): x is HTMLElement => x !== null));
    sheet.hidden = false;
    document.body.classList.add('sheet-open');
    const center = hotspots?.centerOf(loc.id);
    if (three && center) {
      // 箱の面の向き(側面なら横、後部なら後ろ)から斜め上に引いて見る
      const dir = new THREE.Vector3(center.x * 0.3, 0, center.z);
      if (dir.lengthSq() < 0.01) dir.set(1, 0, 1);
      dir.normalize().add(new THREE.Vector3(0, 0.6, 0)).normalize();
      // 下からシートがかぶるので、注視点を下げて箱を画面上寄りに出す
      const target = center.clone().add(new THREE.Vector3(0, -1.2, 0));
      three.flyTo(target.clone().add(dir.multiplyScalar(12.5)), target);
    }
  }

  try {
    three = createScene(canvas);
  } catch (e) {
    console.warn('WebGL が使えません', e);
    viewer.replaceChildren(h('p', { class: 'empty' }, 'この端末では3D表示ができません。下の一覧から場所を選んでください。'));
  }

  if (three) {
    const s = three;
    hotspots = createHotspots(locs);
    s.scene.add(hotspots.group);
    s.onFrame((t) => hotspots!.update(t));
    loadVehicle(v).then(({ object, fallback }) => {
      // 読み込み中に画面を離れたら捨てる
      if (disposed) return disposeObject(object);
      vehicleObject = object;
      s.scene.add(object);
      if (fallback) note.textContent = '3Dモデルを読み込めなかったため、簡易モデルで表示しています。';
      viewer.dataset.ready = 'true';
    });

    let down: { x: number; y: number } | undefined;
    canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const id = hotspots!.pick(ndc, s.camera, vehicleObject ? [vehicleObject] : []);
      if (id) select(id);
    });

    // E2E 用:画面に見えている場所箱の中心座標(手前のものだけ)
    (window as unknown as Record<string, unknown>).__shikizai3d = {
      visible: () => {
        const r = canvas.getBoundingClientRect();
        s.camera.updateMatrixWorld();
        return locs.flatMap((l) => {
          const c = hotspots!.centerOf(l.id);
          if (!c) return [];
          const p = c.project(s.camera);
          if (Math.abs(p.x) > 0.9 || Math.abs(p.y) > 0.9) return [];
          if (hotspots!.pick(new THREE.Vector2(p.x, p.y), s.camera, vehicleObject ? [vehicleObject] : []) !== l.id) return [];
          return [{ id: l.id, x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height }];
        });
      },
    };
  } else {
    viewer.dataset.ready = 'true';
  }

  if (focus) requestAnimationFrame(() => select(focus));
  return () => {
    disposed = true;
    document.body.classList.remove('sheet-open');
    three?.dispose();
    delete (window as unknown as Record<string, unknown>).__shikizai3d;
  };
}
