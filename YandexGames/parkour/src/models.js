// Низкополигональные модели из примитивов: персонаж со скинами, монета, флаг, батут, косилка, декор миров
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// покрасить геометрию вершинным цветом
export function colored(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
export function part(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.scale(sx, sy, sz);
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  if (g.attributes.uv) g.deleteAttribute('uv');
  return colored(g, color);
}
export const merge = (parts) => mergeGeometries(parts, false);
export const VC = () => new THREE.MeshLambertMaterial({ vertexColors: true });

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const sph = (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs);
const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);

// ---------- персонаж ----------
// группа: тело, голова, руки, ноги (отдельные меши для анимации); рост ~1.6
export function makeHero(skin) {
  const g = new THREE.Group();
  const mat = VC();
  const body = new THREE.Mesh(merge([part(cyl(0.3, 0.34, 0.62, 14), skin.body, 0, 0.72, 0), part(sph(0.31, 14, 8), skin.body, 0, 1.02, 0, 0, 0, 0, 1, 0.5, 1), part(sph(0.34, 14, 8), skin.body, 0, 0.42, 0, 0, 0, 0, 1, 0.45, 1), part(box(0.5, 0.08, 0.36), 0xffffff, 0, 0.62, 0, 0, 0, 0, 1, 1, 1)]), mat);
  // пояс
  body.geometry = merge([body.geometry, part(cyl(0.345, 0.345, 0.09, 14), 0x2a2a3a, 0, 0.55, 0)]);
  const head = new THREE.Group();
  head.position.set(0, 1.3, 0);
  head.scale.setScalar(1.14);
  const skinC = 0xffd8b8;
  // большие глаза с бликами, румянец и улыбка
  const smile = new THREE.TorusGeometry(0.06, 0.016, 5, 10, Math.PI);
  const parts = [part(sph(0.3, 16, 12), skinC, 0, 0, 0), part(sph(0.062, 10, 8), 0x1a1a2a, -0.105, 0.03, 0.262, 0, 0, 0, 1, 1.3, 0.6), part(sph(0.062, 10, 8), 0x1a1a2a, 0.105, 0.03, 0.262, 0, 0, 0, 1, 1.3, 0.6), part(sph(0.024, 6, 4), 0xffffff, -0.085, 0.065, 0.3), part(sph(0.024, 6, 4), 0xffffff, 0.125, 0.065, 0.3), part(sph(0.055, 8, 6), 0xff8a9a, -0.19, -0.07, 0.215, 0, 0, 0, 1, 0.6, 0.45), part(sph(0.055, 8, 6), 0xff8a9a, 0.19, -0.07, 0.215, 0, 0, 0, 1, 0.6, 0.45), part(smile, 0x8a3a3a, 0, -0.085, 0.285, 0, 0, Math.PI)];
  const hc = skin.hatC || 0x333333;
  switch (skin.hat) {
    case 'cap':
      parts.push(part(new THREE.SphereGeometry(0.315, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hc, 0, 0.11, 0, 0, 0, 0, 1, 0.92, 1), part(cyl(0.19, 0.19, 0.03, 14), hc, 0, 0.13, 0.25, 0.22, 0, 0, 1, 1, 0.85));
      break;
    case 'leaf':
      parts.push(part(sph(0.12, 8, 6), hc, 0.04, 0.35, 0, 0, 0, 0.6, 1.8, 0.4, 0.9), part(cyl(0.015, 0.015, 0.12, 5), 0x6a4a2a, 0, 0.3, 0));
      break;
    case 'ears':
      parts.push(part(cone(0.1, 0.2, 4), hc, -0.17, 0.27, 0, 0, 0, 0.3), part(cone(0.1, 0.2, 4), hc, 0.17, 0.27, 0, 0, 0, -0.3), part(cone(0.05, 0.1, 4), 0xff9ab0, -0.17, 0.26, 0.04, 0, 0, 0.3), part(cone(0.05, 0.1, 4), 0xff9ab0, 0.17, 0.26, 0.04, 0, 0, -0.3));
      break;
    case 'bow':
      parts.push(part(sph(0.1, 8, 6), hc, -0.1, 0.28, 0, 0, 0, 0, 1, 0.6, 0.5), part(sph(0.1, 8, 6), hc, 0.1, 0.28, 0, 0, 0, 0, 1, 0.6, 0.5), part(sph(0.05, 8, 6), hc, 0, 0.28, 0));
      break;
    case 'band':
      parts.push(part(cyl(0.305, 0.305, 0.08, 16), hc, 0, 0.1, 0), part(box(0.06, 0.18, 0.04), hc, 0.05, 0.02, -0.32, 0.3, 0, 0.4));
      break;
    case 'bunny':
      parts.push(part(sph(0.07, 8, 6), hc, -0.11, 0.4, 0, 0, 0, 0.15, 1, 3, 0.6), part(sph(0.07, 8, 6), hc, 0.11, 0.4, 0, 0, 0, -0.15, 1, 3, 0.6), part(sph(0.04, 8, 6), 0xffb0c8, -0.11, 0.4, 0.03, 0, 0, 0.15, 1, 2.6, 0.4), part(sph(0.04, 8, 6), 0xffb0c8, 0.11, 0.4, 0.03, 0, 0, -0.15, 1, 2.6, 0.4));
      break;
    case 'crown':
      parts.push(part(cyl(0.2, 0.22, 0.14, 8), hc, 0, 0.32, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        parts.push(part(cone(0.05, 0.12, 4), hc, Math.sin(a) * 0.19, 0.44, Math.cos(a) * 0.19));
      }
      parts.push(part(sph(0.035, 6, 4), 0xff3a5a, 0, 0.33, 0.21));
      break;
    case 'helmet':
      parts.push(part(cyl(0.36, 0.36, 0.1, 16), 0xc8d0e0, 0, -0.26, 0));
      break;
    case 'top':
      parts.push(part(cyl(0.2, 0.2, 0.32, 14), hc, 0, 0.42, 0), part(cyl(0.32, 0.32, 0.03, 16), hc, 0, 0.27, 0), part(cyl(0.205, 0.205, 0.06, 14), 0xff3a3a, 0, 0.31, 0));
      break;
  }
  const headM = new THREE.Mesh(merge(parts), mat);
  if (skin.hat === 'helmet') {
    const glass = new THREE.Mesh(sph(0.4, 16, 12), new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.35 }));
    glass.position.y = 0.02;
    head.add(glass);
  }
  head.add(headM);
  const limb = (x, y, len, w, c) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(merge([part(cyl(w, w * 0.9, len, 8), c, 0, -len / 2, 0), part(sph(w * 1.15, 8, 6), c === skin.body ? skinC : 0x3a3a4a, 0, -len, 0)]), mat);
    pivot.add(m);
    return pivot;
  };
  const armL = limb(-0.36, 0.95, 0.38, 0.08, skin.body),
    armR = limb(0.36, 0.95, 0.38, 0.08, skin.body);
  const legL = limb(-0.14, 0.42, 0.36, 0.1, 0x3a4a7a),
    legR = limb(0.14, 0.42, 0.36, 0.1, 0x3a4a7a);
  body.castShadow = true;
  headM.castShadow = true;
  [armL, armR, legL, legR].forEach((l) => (l.children[0].castShadow = true));
  g.add(body, head, armL, armR, legL, legR);
  g.userData = { head, armL, armR, legL, legR, body };
  return g;
}

// анимация: phase — фаза шага, run 0..1, air — в воздухе, vy — вертикальная скорость
export function animHero(g, t, run, air, vy, land) {
  const u = g.userData;
  if (air) {
    // руки в стороны и вверх, одна нога поджата
    const k = vy > 0 ? 1 : 0.7;
    u.armL.rotation.x = -0.25;
    u.armR.rotation.x = -0.25;
    u.armL.rotation.z = -2.2 * k;
    u.armR.rotation.z = 2.2 * k;
    u.legL.rotation.x = -0.95;
    u.legR.rotation.x = 0.35;
    u.body.scale.set(1, 1, 1);
    u.body.position.y = 0;
    u.head.position.y = 1.3;
  } else {
    const s = Math.sin(t * 13) * run;
    u.armL.rotation.x = s * 1.1;
    u.armR.rotation.x = -s * 1.1;
    u.armL.rotation.z = -0.14;
    u.armR.rotation.z = 0.14;
    u.legL.rotation.x = -s * 1.0;
    u.legR.rotation.x = s * 1.0;
    const bob = run > 0.1 ? Math.abs(Math.cos(t * 13)) * 0.06 * run : Math.sin(t * 2.5) * 0.015;
    const sq = land > 0 ? land * 0.15 : 0;
    u.body.position.y = bob - sq * 0.3;
    u.head.position.y = 1.3 + bob - sq * 0.4;
    u.body.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4);
  }
}

// ---------- предметы ----------
export function coinGeo() {
  return merge([part(cyl(0.32, 0.32, 0.08, 18), 0xffc82a, 0, 0, 0, Math.PI / 2), part(cyl(0.22, 0.22, 0.1, 18), 0xffe27a, 0, 0, 0, Math.PI / 2), part(box(0.07, 0.24, 0.11), 0xd89a10, 0, 0, 0)]);
}
export function flagGeo(color) {
  return merge([part(cyl(0.05, 0.05, 2.4, 6), 0xeeeeee, 0, 1.2, 0), part(sph(0.08, 8, 6), 0xffd23a, 0, 2.44, 0), part(box(0.9, 0.55, 0.04), color, 0.47, 2.0, 0)]);
}
export function springGeo() {
  return merge([part(cyl(0.9, 0.95, 0.14, 20), 0xff4a5a, 0, 0.07, 0), part(cyl(0.6, 0.6, 0.15, 20), 0xffffff, 0, 0.1, 0), part(cyl(0.35, 0.35, 0.16, 20), 0xff4a5a, 0, 0.12, 0)]);
}
export function barGeo(len) {
  const p = [part(cyl(0.2, 0.26, 1.2, 12), 0x5a5a6a, 0, -0.3, 0), part(sph(0.26, 12, 8), 0xffd23a, 0, 0.3, 0)];
  // полосатая планка вдоль +z
  const n = 6;
  for (let i = 0; i < n; i++) p.push(part(box(0.3, 0.3, len / n), i % 2 ? 0xffffff : 0xff3a3a, 0, 0, ((i + 0.5) * len) / n));
  return merge(p);
}
export function portalGeo() {
  const p = [];
  const cols = [0xff5a6a, 0xffa03a, 0xffe03a, 0x5ad06a, 0x4aa8ff, 0x9a6aff];
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (i / 13);
    p.push(part(box(0.5, 0.5, 0.5), cols[i % cols.length], Math.cos(a) * 2.4, Math.sin(a) * 2.4 + 0.25, 0, 0, 0, a));
  }
  return merge(p);
}
export function trophyGeo() {
  return merge([part(cyl(0.3, 0.4, 0.2, 12), 0xd8a020, 0, 0.1, 0), part(cyl(0.08, 0.12, 0.5, 8), 0xffc82a, 0, 0.45, 0), part(cyl(0.45, 0.15, 0.6, 14), 0xffd84a, 0, 0.95, 0), part(sph(0.12, 8, 6), 0xffe27a, 0, 1.3, 0)]);
}

// ---------- декор миров ----------
export function decor(theme, R) {
  const p = [];
  const id = theme.id;
  const kind = R();
  if (id === 'meadow' || id === 'jungle') {
    const c = id === 'jungle' ? [0x2f8a3a, 0x3fa04a] : [0x4cb04a, 0x6cc85a];
    if (kind < 0.6) {
      p.push(part(cyl(0.12, 0.18, 1.2, 6), 0x8a5a3a, 0, 0.6, 0), part(sph(0.7, 8, 6), c[0], 0, 1.6, 0), part(sph(0.5, 8, 6), c[1], 0.3, 2.0, 0.1));
    } else p.push(part(sph(0.5, 7, 5), c[1], 0, 0.25, 0, 0, 0, 0, 1.4, 0.7, 1.2), part(sph(0.12, 6, 4), 0xff6a8a, 0.3, 0.55, 0.2), part(sph(0.12, 6, 4), 0xffd23a, -0.3, 0.5, 0.1));
  } else if (id === 'candy') {
    if (kind < 0.5) p.push(part(cyl(0.06, 0.06, 1.6, 6), 0xffffff, 0, 0.8, 0), part(cyl(0.6, 0.6, 0.18, 16), 0xff6ab0, 0, 1.8, 0, Math.PI / 2), part(cyl(0.4, 0.4, 0.2, 16), 0xffffff, 0, 1.8, 0, Math.PI / 2), part(cyl(0.2, 0.2, 0.22, 16), 0x7ad0ff, 0, 1.8, 0, Math.PI / 2));
    else p.push(part(sph(0.6, 10, 8), 0xffd0e6, 0, 0.4, 0, 0, 0, 0, 1, 0.7, 1), part(sph(0.2, 8, 6), 0xff3a6a, 0, 0.9, 0));
  } else if (id === 'desert') {
    if (kind < 0.6) p.push(part(cyl(0.22, 0.25, 1.8, 8), 0x4aa05a, 0, 0.9, 0), part(cyl(0.13, 0.13, 0.7, 8), 0x4aa05a, 0.35, 1.1, 0, 0, 0, -0.9), part(cyl(0.12, 0.12, 0.6, 8), 0x4aa05a, 0.55, 1.5, 0), part(sph(0.12, 6, 4), 0xff6a8a, 0, 1.85, 0));
    else p.push(part(sph(0.6, 6, 4), 0xd8a060, 0, 0.3, 0, 0, 0, 0, 1.3, 0.6, 1));
  } else if (id === 'ice') {
    p.push(part(cone(0.35, 1.6, 5), 0xbfe8ff, 0, 0.8, 0), part(cone(0.25, 1.1, 5), 0x9ad8ff, 0.4, 0.55, 0.1, 0, 0, -0.3), part(cone(0.2, 0.9, 5), 0xe6f6ff, -0.35, 0.45, 0, 0, 0, 0.35));
  } else if (id === 'volcano') {
    p.push(part(cone(0.6, 1.2, 6), 0x4a3a40, 0, 0.6, 0), part(sph(0.15, 6, 4), 0xff8a2a, 0.2, 0.5, 0.3));
  } else if (id === 'neon') {
    const c = [0x3affe0, 0xff3ad0, 0xffe03a][Math.floor(kind * 3)];
    p.push(part(box(0.5, 2.4, 0.5), 0x1a1a3a, 0, 1.2, 0), part(box(0.52, 0.08, 0.52), c, 0, 0.9, 0), part(box(0.52, 0.08, 0.52), c, 0, 1.7, 0), part(box(0.52, 0.08, 0.52), c, 0, 2.4, 0));
  } else if (id === 'space') {
    p.push(part(sph(0.5, 6, 5), 0x8a8aa8, 0, 0.3, 0, 0, 0, 0, 1.2, 0.8, 1), part(box(0.15, 0.6, 0.15), 0xc86aff, 0.4, 0.5, 0, 0, 0, 0.3));
  }
  return merge(p);
}

// летающий островок под трассой (для красоты)
export function islandGeo(theme, R) {
  const top = theme.top[0],
    side = theme.side[0];
  const r = 2 + R() * 3;
  return merge([part(cyl(r, r * 0.92, 0.6, 9), top, 0, 0, 0), part(cone(r * 0.92, r * 1.4, 9), side, 0, -r * 0.7 - 0.3, 0, Math.PI)]);
}
export function cloudGeo(R, color = 0xffffff) {
  const p = [];
  const n = 4 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) p.push(part(sph(1 + R() * 0.8, 8, 6), color, (i - n / 2) * 1.2, R() * 0.5, R() * 0.8, 0, 0, 0, 1, 0.7, 1));
  return merge(p);
}
