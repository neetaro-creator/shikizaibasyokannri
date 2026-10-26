import type * as THREE from 'three';
import type { Vehicle } from '../data/types';
import { buildPlaceholder } from './placeholder';

/** スキャン GLB を読む。無い・読めないときは仮モデル(fallback=true)。 */
export async function loadVehicle(v: Vehicle): Promise<{ object: THREE.Object3D; fallback: boolean }> {
  if (!v.model) return { object: buildPlaceholder(v.type), fallback: false };
  try {
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
    ]);
    const draco = new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(import.meta.env.BASE_URL + v.model);
    draco.dispose();
    return { object: gltf.scene, fallback: false };
  } catch (e) {
    console.warn('3Dモデルを読めませんでした', e);
    return { object: buildPlaceholder(v.type), fallback: true };
  }
}
