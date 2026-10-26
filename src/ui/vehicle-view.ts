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
import { icon } from './icons';

/** 車両 3D と場所一覧。戻り値は後片付け。 */
export function render(root: HTMLElement, db: Db, v: Vehicle, focus?: string, align = false): () => void {
  const locs = resolveHotspots(db.locations.filter((l) => l.vehicleId === v.id), v.type);
  const canvas = h('canvas', { 'aria-label': `${v.name}の3D表示` }) as HTMLCanvasElement;
  const note = h('p', { class: 'hud-note' }, 'ドラッグで回転 ・ ピンチで拡大 ・ 箱をタップで中身');
  // 救急車は車内に立って見回すのが標準。外観にも切り替えられる
  const hasInterior = v.type === '救急';
  let mode: 'inside' | 'outside' = hasInterior ? 'inside' : 'outside';
  const toggle = hasInterior
    ? h('button', { type: 'button', class: 'view-toggle', 'data-testid': 'view-toggle', onclick: () => setMode(viewMode() === 'inside' ? 'outside' : 'inside') })
    : null;
  const viewer = h('div', { class: 'viewer', 'data-testid': 'viewer' }, ...[canvas,
    h('div', { class: 'hud' }, h('span', { class: 'kicker' }, v.type), h('h1', {}, v.name)), note, toggle].filter((x): x is HTMLElement => x !== null));
  // 下半分:最初は場所の一覧、場所を選ぶと中身(sheet)に切り替わる
  const sheet = h('section', { class: 'sheet', 'data-testid': 'sheet', 'aria-label': '選んだ場所の積載品', 'aria-live': 'polite', hidden: true });
  const groups = [...new Set(locs.map((l) => l.group))];
  const listView = h('div', { class: 'loc-list' }, groups.map((g) => h('section', {},
    h('h2', { class: 'label' }, g),
    h('ul', { class: 'loclist' }, locs.filter((l) => l.group === g).map((l) =>
      h('li', {}, h('button', { type: 'button', class: 'locrow', 'data-loc': l.id, onclick: () => select(l.id) },
        h('span', { class: 'grow' }, h('span', { class: 'loc-name' }, l.name)),
        h('span', { class: 'muted' }, `${itemsAt(db, l.id).length}品目`),
        icon('chevron', 18))))))));
  const panel = align
    ? createAlignPanel((id, hs) => {
        const i = locs.findIndex((l) => l.id === id);
        locs[i] = { ...locs[i], hotspot: hs };
        hotspots?.setHotspot(id, hs);
      })
    : undefined;
  const pane = h('div', { class: 'pane', 'data-testid': 'pane' }, ...[panel?.el ?? null, listView, sheet].filter((x): x is HTMLElement => x !== null));
  root.append(viewer, pane);
  document.body.classList.add('vehicle-split');

  let three: ReturnType<typeof createScene> | undefined;
  let hotspots: ReturnType<typeof createHotspots> | undefined;
  let vehicleObject: THREE.Object3D | undefined;
  let disposed = false;
  let current: Location | undefined;
  /** 車体の内側にある場所(選ぶと車体を透かし、車体の上からタップでも選べる)。 */
  /** 外からだけ開ける収納(救急車の右スライドドアなど)。車内視点でも、選んだら外から見せる。 */
  const outsideAccess = (l?: Location) => !!l && ((vehicleObject?.userData.outsideAccess as string[] | undefined) ?? []).includes(l.name);
  const isInside = (l?: Location) => !!l && !outsideAccess(l) && (l.group === 'キャビン' || l.group === '車内' || (v.type === '救急' && l.group !== '車外保管'));
  /** 今の見せ方。外から開ける収納を選んでいる間は外観。 */
  const viewMode = () => (outsideAccess(current) ? 'outside' : mode);
  /** 扉の付いた収納(救急車の A):中の場所を選ぶと開く。 */
  const doors: THREE.Object3D[] = [];
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
    const underInterior = (o: THREE.Object3D | null): boolean => !!o && (o.userData.interior || underInterior(o.parent));
    vehicleObject?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!m || underInterior(o)) return;
      m.userData.base ??= { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite };
      const b = m.userData.base;
      m.transparent = on || b.transparent;
      m.opacity = on ? 0.06 : b.opacity;
      m.depthWrite = on ? false : b.depthWrite;
    });
  }

  /** 車内視点:殻(床・壁・天井)を出して外観を隠し、その場で見回すカメラにする。 */
  function applyMode() {
    const mode = viewMode();
    viewer.dataset.view = mode;
    if (toggle) toggle.textContent = mode === 'inside' ? '外観を見る' : '車内を見る';
    note.textContent = mode === 'inside' ? 'ドラッグで見回す ・ 収納をタップで中身' : 'ドラッグで回転 ・ ピンチで拡大 ・ 箱をタップで中身';
    const ext = vehicleObject?.getObjectByName('exterior');
    const shell = vehicleObject?.getObjectByName('shell');
    if (ext) ext.visible = mode === 'outside';
    if (shell) shell.visible = mode === 'inside';
    if (!three) return;
    const { camera, controls } = three;
    const inside = mode === 'inside';
    camera.fov = inside ? 68 : 40;
    camera.near = inside ? 0.02 : 0.1;
    camera.updateProjectionMatrix();
    Object.assign(controls, inside
      ? { minDistance: 0.01, maxDistance: 0.2, enableZoom: false, enablePan: false, rotateSpeed: -0.35, minPolarAngle: 0.25, maxPolarAngle: Math.PI - 0.25 }
      : { minDistance: 3, maxDistance: 20, enableZoom: true, enablePan: true, rotateSpeed: 1, minPolarAngle: 0, maxPolarAngle: Math.PI / 2 - 0.05 });
  }

  function setMode(m: 'inside' | 'outside') {
    mode = m;
    if (m === 'inside' && outsideAccess(current)) current = undefined; // 外から開ける収納のまま車内へは戻れない
    applyMode();
    if (current) select(current.id);
    else overview(false);
  }

  /** 何も選んでいないときの視点。車内は後ろのドアから前を向く。 */
  function overview(instant: boolean) {
    if (!three) return;
    let pos: THREE.Vector3, target: THREE.Vector3;
    if (viewMode() === 'inside') {
      pos = new THREE.Vector3(-2.15, 1.5, 0.05);
      target = pos.clone().add(new THREE.Vector3(0.05, -0.008, 0));
    } else {
      if (!vehicleObject) return;
      const b = new THREE.Box3().setFromObject(vehicleObject);
      const size = b.getSize(new THREE.Vector3());
      const c = b.getCenter(new THREE.Vector3());
      pos = c.clone().add(new THREE.Vector3(1, 0.55, 1.1).normalize().multiplyScalar(size.length() * 1.4));
      target = new THREE.Vector3(c.x, size.y * 0.42, c.z);
    }
    if (instant) {
      three.camera.position.copy(pos);
      three.controls.target.copy(target);
    } else three.flyTo(pos, target);
  }

  /** 車内視点で、その場所の向かいに立ってそちらを向く。 */
  function lookFromInside(center: THREE.Vector3, name: string) {
    const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
    // 車両モデルが決めた視点:[目の x,y,z] または [目の x,y,z, 見る点の x,y,z](何か所かに分かれた場所など)
    const fixed = (vehicleObject?.userData.eyes as Record<string, number[]> | undefined)?.[name];
    let eye: THREE.Vector3;
    if (fixed) {
      eye = new THREE.Vector3(fixed[0], fixed[1], fixed[2]);
      if (fixed.length === 6) center = new THREE.Vector3(fixed[3], fixed[4], fixed[5]);
    }
    else if (center.x > 0.9 && Math.abs(center.z) < 0.86) eye = new THREE.Vector3(center.x - 1.2, 1.45, center.z * 0.5); // 前の仕切り・キャブ
    else if (center.z > 0.5) eye = new THREE.Vector3(center.x, 1.45, center.z - 1.15); // 右壁
    else if (center.z < -0.5) eye = new THREE.Vector3(center.x, 1.45, center.z + 1.15); // 左壁
    else eye = new THREE.Vector3(center.x - 1.2, 1.6, 0); // 天井・中央は後ろから
    if (!fixed) eye.set(clamp(eye.x, -2.2, 0.75), eye.y, clamp(eye.z, -0.45, 0.45));
    three!.flyTo(eye, eye.clone().add(center.clone().sub(eye).normalize().multiplyScalar(0.05)));
  }

  function select(id?: string) {
    const loc = locs.find((l) => l.id === id);
    const before = viewMode();
    current = loc;
    if (viewMode() !== before) {
      applyMode();
      if (!loc) overview(false);
    }
    setXray(viewMode() === 'outside' && isInside(loc));
    history.replaceState(null, '', vehicleHref(v.id, loc?.id) + (align ? `${loc ? '&' : '?'}align=1` : ''));
    panel?.show(loc);
    root.querySelectorAll<HTMLButtonElement>('[data-loc]').forEach((b) => b.classList.toggle('on', b.dataset.loc === loc?.id));
    hotspots?.highlight(loc?.hotspot ? loc.id : undefined);
    if (hotspots?.highlighted()) viewer.dataset.highlight = loc!.id;
    else delete viewer.dataset.highlight;
    viewer.classList.toggle('selected', !!loc); // 選択中は車名・操作ヒントを隠して3Dを広く見せる
    if (!loc) {
      sheet.hidden = true;
      listView.hidden = false;
      return;
    }
    const contents = itemsAt(db, loc.id);
    sheet.replaceChildren(...[
      h('div', { class: 'sheet-head' },
        h('button', { type: 'button', class: 'nav', 'aria-label': '場所の一覧へ', onclick: () => select(undefined) }, '≡'),
        h('button', { type: 'button', class: 'nav', 'aria-label': '前の場所', onclick: () => step(-1) }, '‹'),
        h('div', {}, h('span', { class: 'kicker' }, `${v.name.replace(/^信楽/, '')} ${ordered.indexOf(loc) + 1}/${ordered.length} ・ ${contents.length}品目`), h('strong', {}, loc.name)),
        h('button', { type: 'button', class: 'nav', 'aria-label': '次の場所', onclick: () => step(1) }, '›')),

      loc.hotspot ? null : h('p', { class: 'muted' }, 'この場所は3D上には表示されません(車外保管など)。'),
      h('ul', { class: 'list' }, contents.map((c) => h('li', {}, h('a', { href: itemHref(c.item.id), class: 'row', draggable: 'false' },
        h('span', { class: 'row-main' }, c.item.name),
        h('span', { class: 'badge' }, c.qty !== undefined ? String(c.qty) : c.qtyNote ?? ''))))),
    ].filter((x): x is HTMLElement => x !== null));
    listView.hidden = true;
    sheet.hidden = false;
    pane.scrollTop = 0;
    const center = hotspots?.centerOf(loc.id);
    if (three && center && viewMode() === 'inside') lookFromInside(center, loc.name);
    else if (three && center) {
      // 箱の面の向き(側面なら横、後部なら後ろ)から斜め上に引いて見る
      // キャブ内は透かして斜め上から、それ以外は箱の面の向きから
      // 車内は、その場所がある側の壁の方から斜め上に見る(左壁の棚は左から)
      const dir = isInside(loc) ? new THREE.Vector3(0.5, 0, center.z < -0.1 ? -0.9 : 0.9) : new THREE.Vector3(center.x * 0.3, 0, center.z);
      if (dir.lengthSq() < 0.01) dir.set(1, 0, 1);
      dir.normalize().add(new THREE.Vector3(0, 0.6, 0)).normalize();
      const target = center.clone(); // 一覧は3Dの下にあるので、光る箱を3Dの中央に置く
      three.flyTo(target.clone().add(dir.multiplyScalar(10)), target);
    }
  }

  applyMode();
  try {
    three = createScene(canvas);
  } catch (e) {
    console.warn('WebGL が使えません', e);
    viewer.replaceChildren(h('p', { class: 'empty' }, 'この端末では3D表示ができません。下の一覧から場所を選んでください。'));
  }

  if (three) {
    const s = three;
    applyMode();
    hotspots = createHotspots(locs);
    s.scene.add(hotspots.group);
    s.onFrame((t) => {
      hotspots!.update(t);
      for (const d of doors) {
        const target = (d.userData.opensFor as string[]).includes(current?.name ?? '') ? (d.userData.openAngle as number) : 0;
        d.rotation.y += (target - d.rotation.y) * 0.15;
      }
    });
    loadVehicle(v).then(({ object, fallback }) => {
      // 読み込み中に画面を離れたら捨てる
      if (disposed) return disposeObject(object);
      vehicleObject = object;
      s.scene.add(object);
      object.traverse((o) => { if (o.userData.opensFor) doors.push(o); });
      applyMode();
      setXray(viewMode() === 'outside' && isInside(current));
      // 車両の大きさに合わせて初期カメラを引く(場所を指定して開いたときはその場所へ寄る)
      if (!focus) overview(true);
      if (fallback) note.textContent = '3Dモデルを読み込めなかったため、簡易モデルで表示しています。';
      viewer.dataset.ready = 'true';
    });

    let down: { x: number; y: number } | undefined;
    canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const isCab = (id: string) => isInside(locs.find((l) => l.id === id));
      const occluders = vehicleObject && viewMode() === 'outside' ? [vehicleObject] : [];
      let id = hotspots!.pick(ndc, s.camera, occluders, isCab);
      if (!id && vehicleObject && viewMode() === 'inside') {
        // 車内視点:押した壁や機器に一番近い収納
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, s.camera);
        const hit = ray.intersectObject(vehicleObject.getObjectByName('interior') ?? vehicleObject, true)[0];
        if (hit) id = hotspots!.nearest(hit.point, 0.6, () => true);
      } else if (!id && vehicleObject) {
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
          if (p.z > 1) return []; // カメラの後ろ
          if (hotspots!.pick(new THREE.Vector2(p.x, p.y), s.camera, vehicleObject && viewMode() === 'outside' ? [vehicleObject] : []) !== l.id) return [];
          return [{ id: l.id, x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height }];
        });
      },
    };
  } else {
    viewer.dataset.ready = 'true';
  }

  if (focus) requestAnimationFrame(() => select(focus));
  // 下半分のどこでも左右にスワイプ → 次/前の場所(品目の下の空白も含む。縦の動きは一覧のスクロールに任せる)
  let swipeStart: { x: number; y: number } | undefined;
  let swiped = false;
  pane.addEventListener('pointerdown', (e) => { swipeStart = sheet.hidden || panel?.el.contains(e.target as Node) ? undefined : { x: e.clientX, y: e.clientY }; swiped = false; });
  pane.addEventListener('pointerup', (e) => {
    if (!swipeStart) return;
    const dx = e.clientX - swipeStart.x, dy = e.clientY - swipeStart.y;
    swipeStart = undefined;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    }
  });
  // スワイプの指を離したときに、下の品目リンクが押されたことにしない
  pane.addEventListener('click', (e) => { if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; } }, true);
  // ページ全体は動かさない:下半分の外、または下半分がスクロール不要のときは指の移動を打ち消す(3D の操作は別のイベント)
  const lockScroll = (e: TouchEvent) => {
    const inPane = pane.contains(e.target as Node);
    if (!inPane || pane.scrollHeight <= pane.clientHeight) e.preventDefault();
  };
  document.addEventListener('touchmove', lockScroll, { passive: false });

  return () => {
    document.removeEventListener('touchmove', lockScroll);
    disposed = true;
    document.body.classList.remove('vehicle-split');
    three?.dispose();
    delete (window as unknown as Record<string, unknown>).__shikizai3d;
  };
}
