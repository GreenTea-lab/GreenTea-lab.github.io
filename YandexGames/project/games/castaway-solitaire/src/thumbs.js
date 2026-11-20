// Картинки построек для списка «Стройка»: рендер воксельной модели стадии в маленький PNG
import * as THREE from 'three';
import * as M from './models.js';

const cache = {};
let rt = null;
let scene = null;
let cam = null;
let renderer = null;
let mat = null;
let glowMat = null;
const SIZE = 128;

export function initThumbs(r) {
  rt?.dispose();
  renderer = r;
  rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa0c0d0, 1.7));
  const d = new THREE.DirectionalLight(0xffffff, 1.7);
  d.position.set(0.6, 1, 0.9);
  scene.add(d);
  cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
}

export function projThumb(id, stage) {
  return modelThumb(id + stage, () => M.BUILD[id](stage));
}

export function modelThumb(key, model) {
  if (cache[key]) return cache[key];
  if (!renderer) return '';
  const g = model().build(M.VS, 0, 0);
  const grp = new THREE.Group();
  if (g.geo) grp.add(new THREE.Mesh(g.geo, mat));
  if (g.glow) grp.add(new THREE.Mesh(g.glow, glowMat));
  grp.rotation.y = -0.5;
  scene.add(grp);
  grp.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(grp);
  const bs = box.getBoundingSphere(new THREE.Sphere());
  const dist = (bs.radius / Math.sin((cam.fov * Math.PI) / 360)) * 0.95;
  const dir = new THREE.Vector3(0, 0.6, 1).normalize();
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
  scene.remove(grp);
  grp.traverse((c) => c.geometry && c.geometry.dispose());
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  ctx.putImageData(img, 0, 0);
  cache[key] = c.toDataURL();
  return cache[key];
}
