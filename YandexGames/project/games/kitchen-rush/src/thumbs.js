// Картинки-иконки продуктов и блюд: рендер 3D-моделей в маленькие PNG (для заказов и подсказок)
import * as THREE from 'three';
import { B, MAT, disposeTree } from './gfx.js';
import { ingParts, plateParts, makeChef } from './models.js';
import { RECIPES } from './data.js';

const cache = {};
let rt = null,
  scene = null,
  cam = null,
  renderer = null;
const SIZE = 128;

export function initThumbs(r) {
  renderer = r;
  rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a8c0, 1.6));
  const d = new THREE.DirectionalLight(0xffffff, 1.6);
  d.position.set(0.5, 1, 0.8);
  scene.add(d);
  cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
}

// key: 'tomato:chop' | 'dish:burger' | 'soup:tomato'
export function thumb(key) {
  if (cache[key]) return cache[key];
  if (!renderer) return '';
  const b = new B();
  let h = 0.3,
    r = 0.22;
  if (key.startsWith('dish:')) {
    const d = key.slice(5);
    const R = RECIPES[d];
    plateParts(b, R.soup ? { soup: R.soup, parts: [] } : { parts: R.parts.slice() }, d);
    h = 0.3;
    r = 0.3;
  } else {
    const [id, st] = key.split(':');
    ingParts(b, id, st);
    h = st === 'raw' ? 0.28 : 0.12;
    r = 0.24;
  }
  const m = b.mesh(MAT, false);
  scene.add(m);
  // камера сверху-спереди, кадр по размеру модели
  m.geometry.computeBoundingSphere();
  const bs = m.geometry.boundingSphere;
  const dist = (bs.radius / Math.sin((cam.fov * Math.PI) / 360)) * 1.02;
  const dir = new THREE.Vector3(0, 0.75, 1).normalize();
  cam.position.copy(bs.center).addScaledVector(dir, dist);
  cam.lookAt(bs.center);
  const prev = renderer.getRenderTarget();
  const clear = renderer.getClearAlpha();
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(SIZE * SIZE * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, px);
  renderer.setRenderTarget(prev);
  renderer.setClearAlpha(clear);
  scene.remove(m);
  m.geometry.dispose();
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  const img = g.createImageData(SIZE, SIZE);
  // строки в WebGL идут снизу вверх
  for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  g.putImageData(img, 0, 0);
  cache[key] = c.toDataURL();
  return cache[key];
}

// портрет повара для карточек на экране «Кухня»
export function chefThumb(id) {
  const key = 'chef:' + id;
  if (cache[key]) return cache[key];
  if (!renderer) return '';
  const ch = makeChef(id, '#ffffff');
  ch.group.rotation.y = -0.35;
  scene.add(ch.group);
  ch.group.updateMatrixWorld(true);
  const c = new THREE.Vector3(0, 0.98, 0);
  cam.position.set(0, 1.3, 1.75);
  cam.lookAt(c);
  const prev = renderer.getRenderTarget();
  const clear = renderer.getClearAlpha();
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(SIZE * SIZE * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, px);
  renderer.setRenderTarget(prev);
  renderer.setClearAlpha(clear);
  scene.remove(ch.group);
  disposeTree(ch.group);
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const g = cv.getContext('2d');
  const img = g.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  g.putImageData(img, 0, 0);
  cache[key] = cv.toDataURL();
  return cache[key];
}
