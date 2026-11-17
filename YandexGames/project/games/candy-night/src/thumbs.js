// Портреты для интерфейса: 3D-модели костюмов и врагов, отрендеренные в маленькие PNG
import * as THREE from 'three';
import { disposeTree } from './gfx.js';
import { makeKid, makeGhost, makeBat, makeSkel, makePumpkin, makeSpider, makeWitch, makeBigBoo } from './models.js';

const cache = {};
let rt = null,
  scene = null,
  cam = null,
  renderer = null;
const SIZE = 160;

export function initThumbs(r) {
  renderer = r;
  rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x8a7ab0, 2.0));
  const d = new THREE.DirectionalLight(0xffffff, 1.5);
  d.position.set(0.6, 1, 1);
  scene.add(d);
  cam = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
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
  disposeTree(obj);
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const g = cv.getContext('2d');
  const img = g.createImageData(SIZE, SIZE);
  // строки в WebGL идут снизу вверх
  for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  g.putImageData(img, 0, 0);
  return cv.toDataURL();
}

export function kidThumb(id) {
  const key = 'kid:' + id;
  if (cache[key]) return cache[key];
  if (!renderer) return '';
  const k = makeKid(id);
  k.rotation.y = -0.4;
  k.userData.fill.visible = true;
  cache[key] = shoot(k, new THREE.Vector3(0, 0.62, 0), 3.3, 0.2);
  return cache[key];
}

export function enemyThumb(type) {
  const key = 'en:' + type;
  if (cache[key]) return cache[key];
  if (!renderer) return '';
  let o,
    c = new THREE.Vector3(0, 0.7, 0),
    d = 3.6;
  switch (type) {
    case 'ghost':
      o = makeGhost();
      break;
    case 'bat':
      o = makeBat();
      c.set(0, 0, 0);
      d = 2.2;
      break;
    case 'skel':
      o = makeSkel(1);
      c.y = 0.75;
      break;
    case 'jack':
      o = makePumpkin(1);
      c.y = 0.6;
      d = 3.2;
      break;
    case 'spider':
      o = makeSpider();
      o.userData.thread.visible = false;
      c.set(0, 0, 0);
      d = 2.6;
      break;
    case 'witch':
      o = makeWitch(1);
      c.set(0, 0.5, 0);
      d = 3.6;
      break;
    case 'bigboo':
      o = makeBigBoo();
      c.y = 1.6;
      d = 7;
      break;
    case 'skelking':
      o = makeSkel(1, true);
      c.y = 0.8;
      d = 3.8;
      break;
    case 'witchqueen':
      o = makeWitch(1, true);
      c.set(0, 0.55, 0);
      d = 3.8;
      break;
    case 'pumpking':
      o = makePumpkin(1, true);
      c.y = 0.7;
      d = 3.6;
      break;
  }
  o.rotation.y = type === 'witch' || type === 'witchqueen' ? -0.9 : -0.35;
  cache[key] = shoot(o, c, d, 0.18);
  return cache[key];
}
