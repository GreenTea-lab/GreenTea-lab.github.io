// Картинки-иконки товаров и животных: рендер 3D-моделей в маленькие PNG для интерфейса
import * as THREE from 'three';
import { B, MAT, disposeTree } from './gfx.js';
import { itemParts, makeAnimal } from './models.js';

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
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a8a0, 1.7));
  const d = new THREE.DirectionalLight(0xffffff, 1.5);
  d.position.set(0.6, 1, 0.9);
  scene.add(d);
  cam = new THREE.PerspectiveCamera(28, 1, 0.05, 30);
}

function snap(obj, fit = 1.02, dir = new THREE.Vector3(0.35, 0.6, 1)) {
  scene.add(obj);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const bs = box.getBoundingSphere(new THREE.Sphere());
  let dist = (bs.radius / Math.sin((cam.fov * Math.PI) / 360)) * fit;
  dir.normalize();
  const ctr = bs.center.clone();
  // подгоняем кадр по реальным углам коробки, чтобы предмет занимал почти всю картинку
  const corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const v = new THREE.Vector3();
  for (let it = 0; it < 4; it++) {
    cam.position.copy(ctr).addScaledVector(dir, dist);
    cam.lookAt(ctr);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const c of corners) {
      v.copy(c).project(cam);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
    const m = Math.max(x1 - x0, y1 - y0) / 2;
    // сдвиг центра к центру проекции
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const wpu = dist * Math.tan((cam.fov * Math.PI) / 360);
    ctr.addScaledVector(right, ((x0 + x1) / 2) * wpu).addScaledVector(up, ((y0 + y1) / 2) * wpu);
    dist *= m / (0.9 / fit);
  }
  cam.position.copy(ctr).addScaledVector(dir, dist);
  cam.lookAt(ctr);
  const prev = renderer.getRenderTarget();
  const clear = renderer.getClearAlpha();
  const sh = renderer.shadowMap.enabled;
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(SIZE * SIZE * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, px);
  renderer.setRenderTarget(prev);
  renderer.setClearAlpha(clear);
  renderer.shadowMap.enabled = sh;
  scene.remove(obj);
  disposeTree(obj);
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  const img = g.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

// key: 'egg' | 'cake' | 'goose' | 'cow' …
export function thumb(key) {
  if (cache[key]) return cache[key];
  if (!renderer) return '';
  let obj;
  if (['goose', 'sheep', 'cow', 'cat', 'dog', 'bear'].includes(key)) {
    obj = makeAnimal(key).group;
    obj.rotation.y = -0.5;
    cache[key] = snap(obj, 0.95, new THREE.Vector3(0.1, 0.35, 1));
  } else {
    const b = itemParts(new B(), key);
    obj = b.mesh(MAT, false);
    cache[key] = snap(obj, 1.0);
  }
  return cache[key];
}
export const img = (key, cls = '') => `<img class="${cls}" src="${thumb(key)}" alt="" draggable="false">`;
