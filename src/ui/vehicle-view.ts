import * as THREE from 'three';
import { itemsAt } from '../data/query';
import type { Db, Location, Vehicle } from '../data/types';
import { createHotspots } from '../three/hotspots';
import { loadVehicle } from '../three/load-vehicle';
import { resolveHotspots } from '../three/layout';
import { createScene } from '../three/scene';
import { disposeObject } from '../three/dispose';
import { createAlignPanel } from './align-mode';
import { h, itemHref, vehicleHref } from './dom';

/** 車両 3D と場所一覧。戻り値は後片付け。 */
export function render(root: HTMLElement, db: Db, v: Vehicle, focus?: string, align = false): () => void {
  const locs = resolveHotspots(db.locations.filter((l) => l.vehicleId === v.id), v.type);
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
  let current: Location | undefined;
  // 場所ボタンと同じ並び(左右スワイプ・‹ › で送る順番)
  const ordered = groups.flatMap((g) => locs.filter((l) => l.group === g));
  const step = (d: number) => {
    const i = ordered.findIndex((l) => l.id === current?.id);
    select(ordered[(i + d + ordered.length) % ordered.length].id);
  };

  /** キャブ内の場所を選んだときは車体を透かす(中の座席などは透かさない)。 */
  function setXray(on: boolean) {
    if (on) viewer.dataset.xray = 'true';
    else delete viewer.dataset.xray;
    vehicleObject?.traverse((o) => {
      if (o.userData.interior) return;
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!m || (o.parent && o.parent.userData.interior)) return;
      m.userData.base ??= { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite };
      const b = m.userData.base;
      m.transparent = on || b.transparent;
      m.opacity = on ? 0.1 : b.opacity;
      m.depthWrite = on ? false : b.depthWrite;
    });
  }

  function select(id?: string) {
    const loc = locs.find((l) => l.id === id);
    current = loc;
    setXray(loc?.group === 'キャビン');
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
        h('button', { type: 'button', class: 'nav', 'aria-label': '前の場所', onclick: () => step(-1) }, '‹'),
        h('div', {}, h('span', { class: 'kicker' }, `${v.name.replace(/^信楽/, '')} ${ordered.indexOf(loc) + 1}/${ordered.length} ・ ${contents.length}品目`), h('strong', {}, loc.name)),
        h('button', { type: 'button', class: 'nav', 'aria-label': '次の場所', onclick: () => step(1) }, '›'),
        h('button', { type: 'button', class: 'close', 'aria-label': '閉じる', onclick: () => select(undefined) }, '×')),
      loc.hotspot ? null : h('p', { class: 'muted' }, 'この場所は3D上には表示されません(車外保管など)。'),
      h('ul', { class: 'list' }, contents.map((c) => h('li', {}, h('a', { href: itemHref(c.item.id), class: 'row', draggable: 'false' },
        h('span', { class: 'row-main' }, c.item.name),
        h('span', { class: 'badge' }, c.qty !== undefined ? String(c.qty) : c.qtyNote ?? ''))))),
    ].filter((x): x is HTMLElement => x !== null));
    if (sheet.hidden) window.scrollTo(0, 0); // 開いたときは3Dが見える位置へ
    sheet.hidden = false;
    sheet.scrollTop = 0;
    if (!align) document.body.classList.add('sheet-open'); // 位置合わせモードは下のパネルを使うので背面を止めない
    const center = hotspots?.centerOf(loc.id);
    if (three && center) {
      // 箱の面の向き(側面なら横、後部なら後ろ)から斜め上に引いて見る
      // キャブ内は透かして斜め上から、それ以外は箱の面の向きから
      const dir = loc.group === 'キャビン' ? new THREE.Vector3(0.7, 0, 0.9) : new THREE.Vector3(center.x * 0.3, 0, center.z);
      if (dir.lengthSq() < 0.01) dir.set(1, 0, 1);
      dir.normalize().add(new THREE.Vector3(0, 0.6, 0)).normalize();
      // 下からシートがかぶるので、注視点を下げて箱を画面上寄りに出す
      const target = center.clone(); // 一覧は3Dの下に出るので、光る箱を画面の中央に置く
      three.flyTo(target.clone().add(dir.multiplyScalar(10)), target);
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
      setXray(current?.group === 'キャビン');
      // 車両の大きさに合わせて初期カメラを引く(場所を指定して開いたときはその場所へ寄る)
      if (!focus) {
        const b = new THREE.Box3().setFromObject(object);
        const size = b.getSize(new THREE.Vector3());
        const c = b.getCenter(new THREE.Vector3());
        s.camera.position.copy(c).add(new THREE.Vector3(1, 0.55, 1.1).normalize().multiplyScalar(size.length() * 1.4));
        s.controls.target.set(c.x, size.y * 0.42, c.z);
      }
      if (fallback) note.textContent = '3Dモデルを読み込めなかったため、簡易モデルで表示しています。';
      viewer.dataset.ready = 'true';
    });

    let down: { x: number; y: number } | undefined;
    canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const isCab = (id: string) => locs.find((l) => l.id === id)?.group === 'キャビン';
      const occluders = vehicleObject ? [vehicleObject] : [];
      let id = hotspots!.pick(ndc, s.camera, occluders, isCab);
      if (!id && vehicleObject) {
        // キャブの車体の、箱の無いところを押したら、押した点に一番近いキャブ内の場所を選ぶ
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, s.camera);
        const hit = ray.intersectObject(vehicleObject, true)[0];
        if (hit) id = hotspots!.nearest(hit.point, 1.2, isCab);
      }
      if (id) select(id);
    });

    // E2E 用:画面に見えている場所箱の中心座標(手前のものだけ)
    (window as unknown as Record<string, unknown>).__shikizai3d = {
      project: (id: string) => {
        const c = hotspots!.centerOf(id);
        if (!c) return undefined;
        s.camera.updateMatrixWorld();
        const p = c.project(s.camera);
        const r = canvas.getBoundingClientRect();
        return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
      },
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
  // 一覧を左右にスワイプ → 次/前の場所(縦の動きは一覧のスクロールに任せる)
  let swipeStart: { x: number; y: number } | undefined;
  let swiped = false;
  sheet.addEventListener('pointerdown', (e) => { swipeStart = { x: e.clientX, y: e.clientY }; swiped = false; });
  sheet.addEventListener('pointerup', (e) => {
    if (!swipeStart) return;
    const dx = e.clientX - swipeStart.x, dy = e.clientY - swipeStart.y;
    swipeStart = undefined;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    }
  });
  // スワイプの指を離したときに、下の品目リンクが押されたことにしない
  sheet.addEventListener('click', (e) => { if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; } }, true);
  // 一覧を開いている間は背面を動かさない:一覧の外、または一覧がスクロール不要のときは指の移動を打ち消す
  const lockScroll = (e: TouchEvent) => {
    if (sheet.hidden || align) return;
    const inSheet = sheet.contains(e.target as Node);
    if (!inSheet || sheet.scrollHeight <= sheet.clientHeight) e.preventDefault();
  };
  document.addEventListener('touchmove', lockScroll, { passive: false });

  return () => {
    document.removeEventListener('touchmove', lockScroll);
    disposed = true;
    document.body.classList.remove('sheet-open');
    three?.dispose();
    delete (window as unknown as Record<string, unknown>).__shikizai3d;
  };
}
