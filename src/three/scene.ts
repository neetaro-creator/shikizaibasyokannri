import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { disposeObject } from './dispose';

export interface Scene3D {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  /** カメラを target 注視・position へ 0.6 秒で移す。 */
  flyTo(position: THREE.Vector3, target: THREE.Vector3): void;
  onFrame(fn: (timeMs: number) => void): void;
  dispose(): void;
}

export function createScene(canvas: HTMLCanvasElement): Scene3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(5, 10, 6);
  scene.add(sun);
  // 床:テーマ色の方眼グリッドと、車の下の淡い円
  const css = getComputedStyle(document.documentElement);
  const color = (name: string, fallback: string) => new THREE.Color(css.getPropertyValue(name).trim() || fallback);
  const grid = new THREE.GridHelper(24, 48, color('--grid-strong', '#3a4a5e'), color('--grid', '#1d2733'));
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.8;
  scene.add(grid);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(5.5, 64), new THREE.MeshBasicMaterial({ color: color('--floor', '#16202b'), transparent: true, opacity: 0.6, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.002;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(6.2, 3.4, 6.8);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.3, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 20;

  const frames: ((t: number) => void)[] = [];
  let fly: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number } | undefined;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  };
  renderer.setAnimationLoop((t) => {
    resize();
    if (fly) {
      const k = Math.min(1, (t - fly.start) / 600);
      const e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(fly.from, fly.to, e);
      controls.target.lerpVectors(fly.tFrom, fly.tTo, e);
      if (k === 1) fly = undefined;
    }
    controls.update();
    for (const f of frames) f(t);
    renderer.render(scene, camera);
  });

  return {
    scene, camera, controls, renderer,
    flyTo(position, target) {
      fly = { from: camera.position.clone(), to: position, tFrom: controls.target.clone(), tTo: target, start: performance.now() };
    },
    onFrame: (fn) => void frames.push(fn),
    dispose() {
      renderer.setAnimationLoop(null);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
