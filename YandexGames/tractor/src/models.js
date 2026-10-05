// Low-poly модели из простых фигур: каждая деталь получает цвет вершин, детали сливаются в одну геометрию
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _c = new THREE.Color();

// деталь: геометрия, цвет, позиция, поворот (x, y, z), масштаб
export function part(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  _m.compose(new THREE.Vector3(...pos), _q, new THREE.Vector3(...(Array.isArray(scl) ? scl : [scl, scl, scl])));
  g.applyMatrix4(_m);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  _c.set(color);
  // лёгкая вариация оттенка по высоте придаёт объём
  for (let i = 0; i < n; i++) {
    col[i * 3] = _c.r;
    col[i * 3 + 1] = _c.g;
    col[i * 3 + 2] = _c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
export const merge = (parts) => mergeGeometries(parts.filter(Boolean), false);

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
const sph = (r, ws = 10, hs = 8) => new THREE.SphereGeometry(r, ws, hs);
const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);

export const C = {
  grass: 0x7cc35a,
  grassD: 0x5ea845,
  wood: 0xb98352,
  woodD: 0x8a5a36,
  red: 0xc9473b,
  redD: 0x9f3329,
  white: 0xf6f1e6,
  roof: 0x6b4a3a,
  roofG: 0x5d6b78,
  stone: 0xb9b4aa,
  dark: 0x3b3a40,
  tire: 0x2e2c30,
  glass: 0xa9d8f0,
  yellow: 0xf2c94c,
  leaf: 0x5fae4a,
  leafD: 0x468f3a,
  trunk: 0x7a5434,
  water: 0x5fb6e0,
  hay: 0xe6c35c,
  steel: 0x8d96a3,
  orange: 0xf08a2a,
  lamp: 0xfff2b0,
};

// ---------- трактор ----------
// корпус без колёс; колёса — отдельно, чтобы вращать
export function tractorBody(v) {
  const p = [];
  p.push(part(box(1.5, 0.35, 3.2), C.dark, [0, 0.62, 0.15]));
  // капот
  p.push(part(box(1.15, 0.78, 1.75), v.body, [0, 1.12, 0.9]));
  p.push(part(box(1.2, 0.12, 1.8), v.body, [0, 1.56, 0.88]));
  // решётка радиатора и фары
  p.push(part(box(0.95, 0.55, 0.06), C.dark, [0, 1.08, 1.79]));
  for (let k = 0; k < 4; k++) p.push(part(box(0.85, 0.05, 0.08), C.steel, [0, 0.88 + k * 0.13, 1.8]));
  p.push(part(box(0.22, 0.16, 0.08), C.lamp, [-0.4, 1.42, 1.79]));
  p.push(part(box(0.22, 0.16, 0.08), C.lamp, [0.4, 1.42, 1.79]));
  // выхлопная труба
  p.push(part(cyl(0.07, 0.07, 1.0), C.dark, [0.42, 2.0, 1.25]));
  p.push(part(cyl(0.1, 0.07, 0.12), C.dark, [0.42, 2.52, 1.25]));
  // кабина
  p.push(part(box(1.5, 0.3, 1.45), v.body, [0, 1.15, -0.65]));
  const cy = 1.95;
  for (const [x, z] of [[-0.68, -1.32], [0.68, -1.32], [-0.68, 0.02], [0.68, 0.02]]) p.push(part(box(0.1, 1.3, 0.1), v.cab, [x, cy, z]));
  p.push(part(box(1.38, 1.05, 0.04), C.glass, [0, 1.92, 0.02]));
  p.push(part(box(1.38, 1.05, 0.04), C.glass, [0, 1.92, -1.32]));
  p.push(part(box(0.04, 1.05, 1.26), C.glass, [-0.68, 1.92, -0.65]));
  p.push(part(box(0.04, 1.05, 1.26), C.glass, [0.68, 1.92, -0.65]));
  p.push(part(box(1.7, 0.14, 1.7), v.cab, [0, 2.66, -0.65]));
  p.push(part(box(1.5, 0.08, 1.5), v.body, [0, 2.77, -0.65]));
  // сиденье и руль
  p.push(part(box(0.5, 0.4, 0.45), C.dark, [0, 1.5, -0.9]));
  p.push(part(cyl(0.2, 0.2, 0.04, 12), C.dark, [0, 1.75, -0.35], [1.1, 0, 0]));
  // крылья над задними колёсами
  for (const s of [-1, 1]) {
    p.push(part(box(0.55, 0.08, 1.5), v.body, [s * 0.98, 1.62, -0.65]));
    p.push(part(box(0.55, 0.45, 0.08), v.body, [s * 0.98, 1.4, 0.1]));
  }
  // передний противовес
  p.push(part(box(1.0, 0.3, 0.3), C.dark, [0, 0.72, 1.95]));
  return merge(p);
}

export function wheelGeo(r, w, rim) {
  const p = [];
  p.push(part(cyl(r, r, w, 18), C.tire, [0, 0, 0], [0, 0, Math.PI / 2]));
  // протектор
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    p.push(part(box(w * 1.02, r * 0.16, r * 0.22), C.tire, [0, Math.cos(a) * r, Math.sin(a) * r], [a, 0, 0]));
  }
  p.push(part(cyl(r * 0.55, r * 0.55, w * 1.04, 14), rim, [0, 0, 0], [0, 0, Math.PI / 2]));
  p.push(part(cyl(r * 0.2, r * 0.2, w * 1.12, 8), C.dark, [0, 0, 0], [0, 0, Math.PI / 2]));
  return merge(p);
}

// навесные орудия. ширина w — ширина захвата в метрах
export function plowGeo(w) {
  const p = [];
  p.push(part(box(w, 0.14, 0.14), C.steel, [0, 0.55, 0]));
  p.push(part(box(0.14, 0.14, 0.9), C.steel, [0, 0.55, 0.45]));
  const n = Math.max(3, Math.round(w / 0.6));
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (w / n) * (k + 0.5);
    p.push(part(box(0.08, 0.5, 0.08), C.dark, [x, 0.3, -0.1]));
    p.push(part(box(0.32, 0.16, 0.42), C.red, [x, 0.08, -0.2], [0.4, 0.5, 0]));
  }
  return merge(p);
}

export function seederGeo(w) {
  const p = [];
  p.push(part(box(w, 0.55, 0.8), C.yellow, [0, 0.85, -0.2]));
  p.push(part(box(w + 0.1, 0.08, 0.9), C.leafD, [0, 1.16, -0.2]));
  p.push(part(box(0.14, 0.14, 0.9), C.steel, [0, 0.6, 0.4]));
  const n = Math.max(4, Math.round(w / 0.4));
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (w / n) * (k + 0.5);
    p.push(part(cyl(0.035, 0.035, 0.6, 6), C.dark, [x, 0.35, -0.35]));
  }
  for (const s of [-1, 1]) p.push(part(cyl(0.22, 0.22, 0.12, 12), C.tire, [s * (w / 2 - 0.05), 0.22, -0.55], [0, 0, Math.PI / 2]));
  return merge(p);
}

export function headerGeo(w) {
  const p = [];
  p.push(part(box(w, 0.12, 1.0), C.red, [0, 0.25, 0.3]));
  p.push(part(box(w, 0.7, 0.1), C.red, [0, 0.55, -0.15]));
  for (const s of [-1, 1]) p.push(part(box(0.1, 0.7, 1.0), C.red, [s * w / 2, 0.5, 0.3]));
  const n = Math.max(6, Math.round(w / 0.25));
  for (let k = 0; k <= n; k++) p.push(part(cone(0.04, 0.3, 4), C.steel, [-w / 2 + (w / n) * k, 0.25, 0.9], [Math.PI / 2, 0, 0]));
  p.push(part(box(0.5, 0.3, 0.9), C.redD, [0, 0.6, -0.6]));
  return merge(p);
}
export function reelGeo(w) {
  const p = [];
  p.push(part(cyl(0.05, 0.05, w, 6), C.dark, [0, 0, 0], [0, 0, Math.PI / 2]));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    p.push(part(box(w * 0.96, 0.05, 0.05), C.yellow, [0, Math.cos(a) * 0.35, Math.sin(a) * 0.35]));
  }
  for (const x of [-w / 2 + 0.1, 0, w / 2 - 0.1]) p.push(part(cyl(0.36, 0.36, 0.04, 10), C.dark, [x, 0, 0], [0, 0, Math.PI / 2]));
  return merge(p);
}
export function trailerGeo() {
  const p = [];
  p.push(part(box(1.7, 0.12, 2.2), C.woodD, [0, 0.95, 0]));
  for (const s of [-1, 1]) p.push(part(box(0.08, 0.6, 2.2), C.red, [s * 0.85, 1.3, 0]));
  p.push(part(box(1.7, 0.6, 0.08), C.red, [0, 1.3, 1.1]));
  p.push(part(box(1.7, 0.6, 0.08), C.red, [0, 1.3, -1.1]));
  p.push(part(box(0.1, 0.1, 1.2), C.dark, [0, 0.85, 1.6]));
  for (const s of [-1, 1]) p.push(part(cyl(0.42, 0.42, 0.3, 14), C.tire, [s * 0.95, 0.42, 0], [0, 0, Math.PI / 2]));
  for (const s of [-1, 1]) p.push(part(cyl(0.2, 0.2, 0.32, 10), C.yellow, [s * 0.95, 0.42, 0], [0, 0, Math.PI / 2]));
  return merge(p);
}

// ---------- культуры (одна «кочка» на 1×1 м) ----------
export function cropGeo(id) {
  const p = [];
  const R = (s) => {
    let x = Math.sin(s * 99.13) * 43758.5;
    return x - Math.floor(x);
  };
  if (id === 'wheat') {
    for (let k = 0; k < 9; k++) {
      const x = (R(k) - 0.5) * 0.8,
        z = (R(k + 20) - 0.5) * 0.8,
        h = 0.65 + R(k + 40) * 0.2;
      p.push(part(box(0.03, h, 0.03), 0xd9b64c, [x, h / 2, z]));
      p.push(part(box(0.07, 0.18, 0.07), 0xf3d36b, [x, h + 0.06, z]));
    }
  } else if (id === 'corn') {
    for (let k = 0; k < 2; k++) {
      const x = k ? 0.22 : -0.2,
        z = k ? -0.15 : 0.18;
      p.push(part(cyl(0.035, 0.05, 1.5, 6), 0x6fae3e, [x, 0.75, z]));
      p.push(part(box(0.5, 0.03, 0.12), 0x7fbf48, [x + 0.2, 0.7, z], [0, 0.4, -0.5]));
      p.push(part(box(0.5, 0.03, 0.12), 0x7fbf48, [x - 0.2, 1.0, z], [0, -0.3, 0.5]));
      p.push(part(cyl(0.06, 0.07, 0.28, 6), 0xf6d743, [x + 0.07, 1.0, z], [0, 0, -0.35]));
      p.push(part(cone(0.06, 0.2, 5), 0xd9b64c, [x, 1.55, z]));
    }
  } else if (id === 'sunflower') {
    p.push(part(cyl(0.035, 0.045, 1.3, 6), 0x5fa83e, [0, 0.65, 0]));
    p.push(part(box(0.32, 0.03, 0.14), 0x6fb84a, [0.14, 0.6, 0], [0, 0, -0.4]));
    p.push(part(cyl(0.3, 0.3, 0.05, 12), 0xffc531, [0, 1.35, 0.05], [Math.PI / 2 - 0.3, 0, 0]));
    p.push(part(cyl(0.16, 0.16, 0.08, 10), 0x6b4425, [0, 1.36, 0.09], [Math.PI / 2 - 0.3, 0, 0]));
  } else if (id === 'carrot') {
    for (let k = 0; k < 4; k++) {
      const x = (k % 2 ? 0.2 : -0.2) + (R(k) - 0.5) * 0.1,
        z = (k < 2 ? 0.2 : -0.2) + (R(k + 9) - 0.5) * 0.1;
      p.push(part(cone(0.08, 0.16, 6), 0xf2843a, [x, 0.04, z], [Math.PI, 0, 0]));
      for (let j = 0; j < 3; j++) p.push(part(cone(0.05, 0.38, 4), 0x5fb24a, [x + (j - 1) * 0.05, 0.3, z], [0, 0, (j - 1) * 0.35]));
    }
  } else if (id === 'pumpkin') {
    p.push(part(sph(0.34, 12, 8), 0xf08a2a, [0, 0.28, 0], [0, 0, 0], [1.15, 0.8, 1.15]));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      p.push(part(box(0.04, 0.42, 0.06), 0xd9701e, [Math.cos(a) * 0.36, 0.28, Math.sin(a) * 0.36], [0, -a, 0]));
    }
    p.push(part(cyl(0.04, 0.05, 0.16, 6), 0x5a7a2e, [0, 0.6, 0]));
    p.push(part(box(0.42, 0.03, 0.3), 0x5fae4a, [0.3, 0.1, -0.25], [0, 0.6, 0.15]));
    p.push(part(box(0.38, 0.03, 0.28), 0x5fae4a, [-0.3, 0.1, 0.25], [0, -0.4, -0.15]));
  }
  return merge(p);
}

// ---------- постройки и декор ----------
export function barnGeo() {
  const p = [];
  p.push(part(box(9, 5, 7), C.red, [0, 2.5, 0]));
  // крыша двускатная
  const roof = new THREE.CylinderGeometry(4.9, 4.9, 7.4, 3, 1);
  p.push(part(roof, C.roof, [0, 5.0, 0], [Math.PI / 2, 0, 0], [1, 1, 0.42 / 1]));
  p.push(part(box(9.4, 0.3, 7.6), C.white, [0, 0.15, 0]));
  // ворота с белым крестом
  p.push(part(box(4.2, 3.8, 0.12), C.redD, [0, 1.9, 3.52]));
  p.push(part(box(4.4, 0.25, 0.16), C.white, [0, 3.85, 3.55]));
  for (const s of [-1, 1]) p.push(part(box(0.25, 3.8, 0.16), C.white, [s * 2.1, 1.9, 3.55]));
  p.push(part(box(5.6, 0.22, 0.16), C.white, [0, 1.9, 3.58], [0, 0, 0.72]));
  p.push(part(box(5.6, 0.22, 0.16), C.white, [0, 1.9, 3.58], [0, 0, -0.72]));
  p.push(part(box(1.4, 1.2, 0.12), C.white, [0, 6.0, 3.52]));
  p.push(part(box(1.1, 0.9, 0.14), C.dark, [0, 6.0, 3.54]));
  return merge(p);
}

export function houseGeo() {
  const p = [];
  p.push(part(box(7, 3.6, 6), C.white, [0, 1.8, 0]));
  p.push(part(box(7.4, 0.4, 6.4), C.stone, [0, 0.2, 0]));
  const roof = new THREE.CylinderGeometry(4.3, 4.3, 7.8, 3, 1);
  p.push(part(roof, 0x4f7fb0, [0, 4.6, 0], [0, 0, Math.PI / 2], [0.55, 1, 1]));
  p.push(part(box(1.2, 2.1, 0.12), C.woodD, [0, 1.2, 3.02]));
  for (const x of [-2.2, 2.2]) {
    p.push(part(box(1.2, 1.1, 0.1), C.lamp, [x, 2.0, 3.02]));
    p.push(part(box(1.4, 0.12, 0.16), C.wood, [x, 1.4, 3.05]));
  }
  p.push(part(box(0.7, 1.6, 0.7), C.stone, [2.3, 5.2, -1]));
  p.push(part(box(3, 0.15, 1.4), C.wood, [0, 2.6, 3.7]));
  for (const x of [-1.4, 1.4]) p.push(part(box(0.15, 2.6, 0.15), C.wood, [x, 1.3, 4.3]));
  return merge(p);
}

export function siloGeo() {
  const p = [];
  p.push(part(cyl(1.8, 1.8, 9, 16), 0xd8dde3, [0, 4.5, 0]));
  for (let k = 1; k < 5; k++) p.push(part(cyl(1.84, 1.84, 0.15, 16), C.steel, [0, k * 1.8, 0]));
  p.push(part(sph(1.85, 16, 8), C.steel, [0, 9, 0], [0, 0, 0], [1, 0.6, 1]));
  return merge(p);
}

export function millTowerGeo() {
  const p = [];
  p.push(part(cyl(1.3, 2.2, 8, 8), C.white, [0, 4, 0]));
  p.push(part(cone(1.8, 2.2, 8), C.roof, [0, 9.1, 0]));
  p.push(part(box(1, 1.8, 0.1), C.woodD, [0, 0.9, 2.05]));
  return merge(p);
}
export function millBladesGeo() {
  const p = [];
  p.push(part(cyl(0.25, 0.25, 0.6, 8), C.dark, [0, 0, 0], [Math.PI / 2, 0, 0]));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    p.push(part(box(0.18, 4.4, 0.08), C.woodD, [Math.sin(a) * 2.2, Math.cos(a) * 2.2, 0.3], [0, 0, -a]));
    p.push(part(box(0.9, 3.4, 0.04), C.white, [Math.sin(a) * 2.4 + Math.cos(a) * 0.5, Math.cos(a) * 2.4 - Math.sin(a) * 0.5, 0.32], [0, 0, -a]));
  }
  return merge(p);
}

export function treeGeo(kind, s = 1) {
  const p = [];
  if (kind === 0) {
    p.push(part(cyl(0.18 * s, 0.26 * s, 2 * s, 7), C.trunk, [0, 1 * s, 0]));
    p.push(part(sph(1.4 * s, 8, 6), C.leaf, [0, 2.6 * s, 0]));
    p.push(part(sph(1.0 * s, 8, 6), C.leafD, [0.8 * s, 2.2 * s, 0.3 * s]));
    p.push(part(sph(0.9 * s, 8, 6), 0x72c25a, [-0.6 * s, 3.1 * s, -0.2 * s]));
  } else {
    p.push(part(cyl(0.15 * s, 0.2 * s, 1.2 * s, 6), C.trunk, [0, 0.6 * s, 0]));
    p.push(part(cone(1.3 * s, 2.2 * s, 7), 0x3f8f4a, [0, 2 * s, 0]));
    p.push(part(cone(1.0 * s, 1.8 * s, 7), 0x4fa356, [0, 3 * s, 0]));
  }
  return merge(p);
}

export function fenceGeo(len) {
  const p = [];
  const n = Math.max(2, Math.round(len / 2));
  for (let k = 0; k <= n; k++) p.push(part(box(0.14, 1.1, 0.14), C.white, [-len / 2 + (len / n) * k, 0.55, 0]));
  p.push(part(box(len, 0.12, 0.07), C.white, [0, 0.8, 0]));
  p.push(part(box(len, 0.12, 0.07), C.white, [0, 0.45, 0]));
  return merge(p);
}

export function cowGeo() {
  const p = [];
  p.push(part(box(0.9, 0.75, 1.6), C.white, [0, 1.0, 0]));
  p.push(part(box(0.5, 0.4, 0.6), C.dark, [0.2, 1.2, 0.3]));
  p.push(part(box(0.4, 0.35, 0.5), C.dark, [-0.25, 0.95, -0.4]));
  for (const [x, z] of [[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.6], [0.3, -0.6]]) p.push(part(box(0.18, 0.6, 0.18), C.white, [x, 0.3, z]));
  p.push(part(box(0.25, 0.2, 0.25), 0xf3b6b6, [0, 0.6, -0.3]));
  return merge(p);
}
export function cowHeadGeo() {
  const p = [];
  p.push(part(box(0.5, 0.5, 0.55), C.white, [0, 0, 0.25]));
  p.push(part(box(0.45, 0.25, 0.2), 0xf3b6b6, [0, -0.1, 0.55]));
  p.push(part(box(0.12, 0.12, 0.05), C.dark, [-0.12, 0.08, 0.53]));
  p.push(part(box(0.12, 0.12, 0.05), C.dark, [0.12, 0.08, 0.53]));
  for (const s of [-1, 1]) {
    p.push(part(box(0.25, 0.08, 0.12), C.white, [s * 0.35, 0.15, 0.15]));
    p.push(part(cone(0.05, 0.2, 5), 0xeee4c8, [s * 0.18, 0.33, 0.2]));
  }
  return merge(p);
}

export function chickenGeo() {
  const p = [];
  p.push(part(sph(0.22, 8, 6), C.white, [0, 0.3, 0], [0, 0, 0], [1, 0.9, 1.25]));
  p.push(part(sph(0.13, 8, 6), C.white, [0, 0.52, 0.2]));
  p.push(part(cone(0.04, 0.1, 4), C.yellow, [0, 0.5, 0.35], [Math.PI / 2, 0, 0]));
  p.push(part(box(0.04, 0.08, 0.1), 0xe0453a, [0, 0.66, 0.2]));
  p.push(part(box(0.03, 0.18, 0.03), C.yellow, [-0.07, 0.09, 0]));
  p.push(part(box(0.03, 0.18, 0.03), C.yellow, [0.07, 0.09, 0]));
  return merge(p);
}

export function hayGeo() {
  return merge([part(cyl(0.6, 0.6, 1.0, 14), C.hay, [0, 0.6, 0], [0, 0, Math.PI / 2]), part(cyl(0.45, 0.45, 1.02, 14), 0xd9b04a, [0, 0.6, 0], [0, 0, Math.PI / 2])]);
}

export function rockGeo(s) {
  return merge([part(new THREE.DodecahedronGeometry(0.6 * s, 0), C.stone, [0, 0.25 * s, 0], [0.3, 0.5, 0], [1.3, 0.7, 1])]);
}

export function signGeo() {
  const p = [];
  for (const x of [-0.9, 0.9]) p.push(part(box(0.14, 1.8, 0.14), C.woodD, [x, 0.9, 0]));
  p.push(part(box(2.4, 1.0, 0.1), C.wood, [0, 1.7, 0]));
  return merge(p);
}

export function cloudGeo() {
  const p = [];
  for (const [x, y, z, r] of [[0, 0, 0, 2.2], [2.2, -0.3, 0.4, 1.6], [-2.1, -0.4, -0.3, 1.5], [0.8, 0.8, -0.6, 1.4]]) p.push(part(sph(r, 9, 7), C.white, [x, y, z], [0, 0, 0], [1, 0.7, 1]));
  return merge(p);
}
