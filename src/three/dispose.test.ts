import { expect, it } from 'vitest';
import * as THREE from 'three';
import { disposeObject } from './dispose';

it('disposeObject releases geometry, material and textures of every descendant', () => {
  const tex = new THREE.Texture();
  const mat = new THREE.MeshStandardMaterial({ map: tex });
  const geo = new THREE.BoxGeometry();
  const root = new THREE.Group();
  root.add(new THREE.Group().add(new THREE.Mesh(geo, mat)));
  const disposed: string[] = [];
  geo.addEventListener('dispose', () => disposed.push('geometry'));
  mat.addEventListener('dispose', () => disposed.push('material'));
  tex.addEventListener('dispose', () => disposed.push('texture'));
  disposeObject(root);
  expect(disposed.sort()).toEqual(['geometry', 'material', 'texture']);
});
