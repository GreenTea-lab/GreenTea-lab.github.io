// Графические помощники: мультяшный материал и сборщик мешей из примитивов с цветами вершин
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// мягкая ступенчатая светотень
const grad = new Uint8Array([90, 160, 215, 255]);
export const GRAD = new THREE.DataTexture(grad, 4, 1, THREE.RedFormat);
GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
GRAD.needsUpdate = true;

export const MAT = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD });
export const MAT_GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const cache = {};

// кэш базовых геометрий
function base(key, make) {
  if (!cache[key]) {
    const g = make();
    g.deleteAttribute('uv');
    if (g.attributes.uv1) g.deleteAttribute('uv1');
    cache[key] = g.index ? g : g;
  }
  return cache[key];
}

export class B {
  constructor() {
    this.parts = [];
  }
  // o: { x,y,z, rx,ry,rz, sx,sy,sz, s }
  add(geo, color, o = {}) {
    const g = geo.clone();
    const s = o.s ?? 1;
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0);
    _q.setFromEuler(_e);
    _m.compose(new THREE.Vector3(o.x || 0, o.y || 0, o.z || 0), _q, new THREE.Vector3((o.sx ?? 1) * s, (o.sy ?? 1) * s, (o.sz ?? 1) * s));
    g.applyMatrix4(_m);
    _c.set(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = _c.r;
      col[i * 3 + 1] = _c.g;
      col[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!g.index) {
      // все части индексированные — так их можно склеить
      const idx = [];
      for (let i = 0; i < n; i++) idx.push(i);
      g.setIndex(idx);
    }
    this.parts.push(g);
    return this;
  }
  box(w, h, d, color, o = {}) {
    return this.add(base('box', () => new THREE.BoxGeometry(1, 1, 1)), color, Object.assign({}, o, { sx: w * (o.sx ?? 1), sy: h * (o.sy ?? 1), sz: d * (o.sz ?? 1) }));
  }
  rbox(w, h, d, r, color, o = {}) {
    const k = `rb${w}_${h}_${d}_${r}`;
    return this.add(base(k, () => new RoundedBoxGeometry(w, h, d, 2, r)), color, o);
  }
  cyl(rt, rb, h, color, o = {}, seg = 16) {
    const k = `cy${rt}_${rb}_${seg}`;
    return this.add(base(k, () => new THREE.CylinderGeometry(rt, rb, 1, seg)), color, Object.assign({}, o, { sy: h * (o.sy ?? 1) }));
  }
  sph(r, color, o = {}, seg = 14) {
    const k = 'sp' + seg;
    return this.add(base(k, () => new THREE.SphereGeometry(1, seg, Math.max(6, (seg * 2) / 3 | 0))), color, Object.assign({}, o, { sx: r * (o.sx ?? 1), sy: r * (o.sy ?? 1), sz: r * (o.sz ?? 1) }));
  }
  hemi(r, color, o = {}) {
    const k = 'hemi';
    return this.add(base(k, () => new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2)), color, Object.assign({}, o, { sx: r * (o.sx ?? 1), sy: r * (o.sy ?? 1), sz: r * (o.sz ?? 1) }));
  }
  cone(r, h, color, o = {}, seg = 12) {
    const k = 'co' + seg;
    return this.add(base(k, () => new THREE.ConeGeometry(1, 1, seg)), color, Object.assign({}, o, { sx: r * (o.sx ?? 1), sy: h * (o.sy ?? 1), sz: r * (o.sz ?? 1) }));
  }
  torus(r, t, color, o = {}) {
    const k = `to${r}_${t}`;
    return this.add(base(k, () => new THREE.TorusGeometry(r, t, 8, 20)), color, o);
  }
  // присоединить другой сборщик со смещением
  merge(b, o = {}) {
    for (const g of b.parts) {
      const c = g.clone();
      _e.set(o.rx || 0, o.ry || 0, o.rz || 0);
      _q.setFromEuler(_e);
      const s = o.s ?? 1;
      _m.compose(new THREE.Vector3(o.x || 0, o.y || 0, o.z || 0), _q, new THREE.Vector3(s, s, s));
      c.applyMatrix4(_m);
      this.parts.push(c);
    }
    return this;
  }
  geometry() {
    if (!this.parts.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.parts, false);
    return g;
  }
  mesh(mat = MAT, shadow = true) {
    const m = new THREE.Mesh(this.geometry(), mat);
    m.castShadow = shadow;
    m.receiveShadow = true;
    return m;
  }
}

export function disposeTree(o) {
  o.traverse((x) => {
    if (x.geometry) x.geometry.dispose();
  });
}

// мягкая круглая тень-«блоб»
let blobTex = null;
export function blobShadow(r = 0.4, op = 0.28) {
  if (!blobTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.6, 'rgba(0,0,0,.6)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: op, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}
