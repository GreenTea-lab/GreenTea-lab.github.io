// Портреты для интерфейса: товары, персонал и зомби, отрендеренные из 3D-моделей в маленькие картинки
import * as THREE from 'three';
import { disposeTree } from './gfx.js';
import { makeItem, makeStaff, makeZombie, makeHero, makeCustomer } from './models.js';

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
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x8a8aa0, 2.2));
  const d = new THREE.DirectionalLight(0xffffff, 1.6);
  d.position.set(0.6, 1, 1);
  scene.add(d);
  cam = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
}

function shoot(obj, center, dist, h = 0.25) {
  scene.add(obj);
  obj.updateMatrixWorld(true);
  cam.position.set(center.x, center.y + dist * h, center.z + dist);
  cam.lookAt(center);
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
  scene.remove(obj);
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const g = cv.getContext('2d');
  const img = g.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  g.putImageData(img, 0, 0);
  return cv;
}

function done(key, cv) {
  cache[key] = { cv, url: cv.toDataURL() };
  return cache[key];
}

// товар/материал: canvas и dataURL
export function itemIcon(id) {
  const key = 'i:' + id;
  if (cache[key]) return cache[key];
  if (!renderer) return { cv: null, url: '' };
  const m = makeItem(id);
  m.rotation.y = id === 'flashlight' || id === 'bat' ? -0.5 : -0.35;
  m.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m);
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const R = Math.max(s.x, s.y, s.z);
  return done(key, shoot(m, c, R * 2.6, 0.45));
}
export const itemThumb = (id) => itemIcon(id).url;

export function staffThumb(role, seed) {
  const key = 's:' + role + ':' + seed;
  if (cache[key]) return cache[key].url;
  if (!renderer) return '';
  const p = role === 'hero' ? makeHero() : role === 'cust' ? makeCustomer(seed) : makeStaff(role, seed);
  p.rotation.y = -0.35;
  const sc = p.scale.x;
  const r = done(key, shoot(p, new THREE.Vector3(0, 0.95 * sc, 0), 2.5 * sc, 0.12));
  disposeTree(p);
  return r.url;
}

export function zombieThumb(type) {
  const key = 'z:' + type;
  if (cache[key]) return cache[key].url;
  if (!renderer) return '';
  const z = makeZombie(type, 7);
  const low = type === 'crawler';
  z.rotation.y = low ? -0.9 : -0.35;
  const s = z.scale.x;
  const r = done(key, shoot(z, new THREE.Vector3(0, (low ? 0.35 : 0.9) * s, low ? 0.15 : 0), (low ? 2.2 : 2.7) * s, 0.12));
  disposeTree(z);
  return r.url;
}
