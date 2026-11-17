// Процедурные 3D-модели: животные, товары, мастерские, колодец, амбар, машина, медведь, клетка
import * as THREE from 'three';
import { B, MAT } from './gfx.js';

const P = Math.PI;
const grp = (...ch) => {
  const g = new THREE.Group();
  for (const c of ch) if (c) g.add(c);
  return g;
};
const at = (o, x = 0, y = 0, z = 0) => {
  o.position.set(x, y, z);
  return o;
};
// глаза с бликом
function eyes(b, x, y, z, r = 0.035, sp = 0.07, look = 1) {
  for (const s of [-1, 1]) {
    b.sph(r, '#2a1d17', { x: x + s * sp, y, z });
    b.sph(r * 0.38, '#ffffff', { x: x + s * sp + r * 0.3, y: y + r * 0.35, z: z + r * 0.75 * look });
  }
}

// ---------------- животные ----------------
// возвращает { group, body, head, legs[] } — для анимации
export function makeAnimal(kind) {
  const f = MAKERS[kind];
  return f();
}

function legsOf(pos, h, r, color) {
  return pos.map(([x, z]) => {
    const b = new B();
    b.cyl(r, r * 0.9, h, color, { y: -h / 2 });
    b.sph(r * 1.15, color, { y: -h, sy: 0.6 });
    const m = b.mesh();
    const g = grp(m);
    g.position.set(x, h, z);
    return g;
  });
}

const MAKERS = {
  goose() {
    const body = new B();
    body.sph(0.24, '#fbfbf6', { y: 0.32, sx: 1, sy: 0.85, sz: 1.25 });
    body.sph(0.2, '#ececea', { x: 0.17, y: 0.36, z: -0.02, sx: 0.4, sy: 0.7, sz: 1.05, rz: -0.25 }); // крылья
    body.sph(0.2, '#ececea', { x: -0.17, y: 0.36, z: -0.02, sx: 0.4, sy: 0.7, sz: 1.05, rz: 0.25 });
    body.cone(0.12, 0.2, '#fbfbf6', { y: 0.42, z: -0.3, rx: -2.1 }); // хвостик
    body.cyl(0.075, 0.1, 0.32, '#fbfbf6', { y: 0.55, z: 0.2, rx: 0.25 }); // шея
    const head = new B();
    head.sph(0.12, '#fbfbf6', { y: 0.06 });
    head.cone(0.055, 0.15, '#ff9a2e', { y: 0.03, z: 0.15, rx: P / 2 });
    head.sph(0.035, '#ff9a2e', { y: 0.11, z: 0.07, sx: 1.2, sy: 0.7 }); // шишечка над клювом
    eyes(head, 0, 0.09, 0.08, 0.028, 0.065);
    head.sph(0.03, '#ffb7b7', { x: 0.09, y: 0.02, z: 0.06, sy: 0.6 });
    head.sph(0.03, '#ffb7b7', { x: -0.09, y: 0.02, z: 0.06, sy: 0.6 });
    const hm = head.mesh();
    const hg = at(grp(hm), 0, 0.72, 0.25);
    const legs = legsOf([[-0.08, 0.02], [0.08, 0.02]], 0.12, 0.025, '#ff9a2e');
    for (const l of legs) {
      const f = new B();
      f.box(0.1, 0.02, 0.12, '#ff8a1e', { y: -0.12, z: 0.04 });
      l.add(f.mesh());
    }
    const bm = body.mesh();
    const bg = grp(bm, hg);
    const g = grp(bg, ...legs);
    return { group: g, body: bg, head: hg, legs, h: 0.85 };
  },
  sheep() {
    const body = new B();
    // пушистое облачко
    const fl = '#fbf8f1';
    const pts = [[0, 0.5, 0, 0.33], [0.2, 0.52, 0.18, 0.22], [-0.2, 0.52, 0.18, 0.22], [0.2, 0.52, -0.2, 0.23], [-0.2, 0.52, -0.2, 0.23], [0, 0.68, 0.05, 0.24], [0, 0.66, -0.18, 0.22], [0.24, 0.42, 0, 0.2], [-0.24, 0.42, 0, 0.2], [0, 0.45, -0.32, 0.2], [0.12, 0.7, 0.2, 0.15], [-0.12, 0.7, 0.2, 0.15]];
    for (const [x, y, z, r] of pts) body.sph(r, fl, { x, y, z }, 12);
    body.sph(0.07, '#f1ece2', { y: 0.55, z: -0.42 });
    const head = new B();
    head.sph(0.15, '#4a3a36', { sy: 1.05, sz: 1.15 });
    head.sph(0.1, '#fbf8f1', { y: 0.12, z: -0.02 }, 10); // чубчик
    head.sph(0.07, '#fbf8f1', { x: 0.07, y: 0.1, z: 0.05 }, 8);
    head.sph(0.07, '#fbf8f1', { x: -0.07, y: 0.1, z: 0.05 }, 8);
    head.sph(0.06, '#4a3a36', { x: 0.17, y: 0.02, sx: 1.6, sy: 0.6, rz: -0.4 });
    head.sph(0.06, '#4a3a36', { x: -0.17, y: 0.02, sx: 1.6, sy: 0.6, rz: 0.4 });
    eyes(head, 0, 0.03, 0.13, 0.03, 0.065);
    head.sph(0.025, '#ff9fae', { x: 0.1, y: -0.04, z: 0.11 });
    head.sph(0.025, '#ff9fae', { x: -0.1, y: -0.04, z: 0.11 });
    head.sph(0.04, '#2d221f', { y: -0.07, z: 0.15, sx: 1.3, sy: 0.7 });
    const hg = at(grp(head.mesh()), 0, 0.6, 0.38);
    const legs = legsOf([[-0.15, 0.17], [0.15, 0.17], [-0.15, -0.17], [0.15, -0.17]], 0.3, 0.045, '#4a3a36');
    const bg = grp(body.mesh(), hg);
    return { group: grp(bg, ...legs), body: bg, head: hg, legs, h: 0.95 };
  },
  cow() {
    const body = new B();
    body.rbox(0.62, 0.48, 0.95, 0.2, '#fbfaf5', { y: 0.72 });
    // пятна
    body.sph(0.17, '#3b302c', { x: 0.25, y: 0.82, z: 0.1, sx: 0.4, sz: 1.2 });
    body.sph(0.14, '#3b302c', { x: -0.27, y: 0.74, z: -0.2, sx: 0.4, sz: 1.3 });
    body.sph(0.12, '#3b302c', { x: 0.05, y: 0.97, z: -0.22, sy: 0.3, sx: 1.4 });
    body.sph(0.14, '#ffb3c1', { y: 0.47, z: -0.22, sx: 1.1, sy: 0.6 }); // вымя
    body.cyl(0.025, 0.02, 0.45, '#fbfaf5', { y: 0.72, z: -0.52, rx: 0.5 }); // хвост
    body.sph(0.05, '#3b302c', { y: 0.53, z: -0.62 });
    const head = new B();
    head.rbox(0.36, 0.34, 0.32, 0.13, '#fbfaf5', {});
    head.rbox(0.38, 0.18, 0.2, 0.08, '#ffc3cd', { y: -0.1, z: 0.16 }); // нос
    head.sph(0.025, '#a2525e', { x: 0.08, y: -0.08, z: 0.265 });
    head.sph(0.025, '#a2525e', { x: -0.08, y: -0.08, z: 0.265 });
    head.sph(0.08, '#3b302c', { x: 0.1, y: 0.13, z: 0.1, sz: 0.4 });
    eyes(head, 0, 0.06, 0.16, 0.033, 0.1);
    head.cone(0.04, 0.14, '#f3e6c8', { x: 0.13, y: 0.22, rz: -0.5 });
    head.cone(0.04, 0.14, '#f3e6c8', { x: -0.13, y: 0.22, rz: 0.5 });
    head.sph(0.07, '#fbfaf5', { x: 0.24, y: 0.08, sx: 1.6, sy: 0.6, rz: -0.3 });
    head.sph(0.07, '#fbfaf5', { x: -0.24, y: 0.08, sx: 1.6, sy: 0.6, rz: 0.3 });
    head.torus(0.06, 0.012, '#d7a640', { y: -0.25, z: 0.05, rx: P / 2 }); // колокольчик
    head.cone(0.05, 0.08, '#e6b84a', { y: -0.3, z: 0.05 });
    const hg = at(grp(head.mesh()), 0, 0.98, 0.55);
    const legs = legsOf([[-0.2, 0.32], [0.2, 0.32], [-0.2, -0.32], [0.2, -0.32]], 0.5, 0.065, '#fbfaf5');
    for (const l of legs) {
      const h = new B();
      h.cyl(0.07, 0.075, 0.07, '#4a3a36', { y: -0.48 });
      l.add(h.mesh());
    }
    const bg = grp(body.mesh(), hg);
    return { group: grp(bg, ...legs), body: bg, head: hg, legs, h: 1.3 };
  },
  cat() {
    const body = new B();
    const o = '#ffa95a',
      w = '#fff3e4';
    body.sph(0.17, o, { y: 0.27, sz: 1.35 });
    body.sph(0.11, w, { y: 0.22, z: 0.12, sx: 0.9 });
    body.cyl(0.03, 0.035, 0.32, o, { y: 0.45, z: -0.27, rx: -0.5 });
    body.sph(0.035, w, { y: 0.6, z: -0.35 });
    const head = new B();
    head.sph(0.15, o, { sx: 1.1 });
    head.sph(0.08, w, { y: -0.05, z: 0.1, sx: 1.3, sy: 0.8 });
    head.cone(0.06, 0.1, o, { x: 0.09, y: 0.14, rz: -0.25 });
    head.cone(0.06, 0.1, o, { x: -0.09, y: 0.14, rz: 0.25 });
    head.cone(0.035, 0.06, '#ffc1c1', { x: 0.09, y: 0.13, z: 0.015, rz: -0.25 });
    head.cone(0.035, 0.06, '#ffc1c1', { x: -0.09, y: 0.13, z: 0.015, rz: 0.25 });
    eyes(head, 0, 0.03, 0.13, 0.028, 0.06);
    head.sph(0.018, '#ff7c8a', { y: -0.02, z: 0.16 });
    const hg = at(grp(head.mesh()), 0, 0.45, 0.2);
    const legs = legsOf([[-0.08, 0.12], [0.08, 0.12], [-0.08, -0.12], [0.08, -0.12]], 0.14, 0.035, o);
    const bg = grp(body.mesh(), hg);
    return { group: grp(bg, ...legs), body: bg, head: hg, legs, h: 0.65 };
  },
  dog() {
    const body = new B();
    const c = '#c98b55',
      w = '#fff1de';
    body.sph(0.2, c, { y: 0.36, sz: 1.4 });
    body.sph(0.13, w, { y: 0.3, z: 0.14 });
    body.cyl(0.035, 0.04, 0.25, c, { y: 0.52, z: -0.3, rx: -0.7 });
    body.torus(0.11, 0.025, '#e2483e', { y: 0.5, z: 0.22, rx: P / 2 - 0.4 }); // ошейник
    body.sph(0.035, '#ffd23f', { y: 0.42, z: 0.32 });
    const head = new B();
    head.sph(0.16, c);
    head.sph(0.09, w, { y: -0.04, z: 0.12, sx: 1.1, sz: 1.2 });
    head.sph(0.04, '#2d221f', { y: 0.0, z: 0.22 });
    head.sph(0.08, '#8a5a34', { x: 0.15, y: 0.02, sx: 0.5, sy: 1.3, rz: 0.2 });
    head.sph(0.08, '#8a5a34', { x: -0.15, y: 0.02, sx: 0.5, sy: 1.3, rz: -0.2 });
    eyes(head, 0, 0.06, 0.13, 0.028, 0.065);
    head.sph(0.03, '#ff7c8a', { y: -0.1, z: 0.16, sy: 0.6 });
    const hg = at(grp(head.mesh()), 0, 0.6, 0.27);
    const legs = legsOf([[-0.09, 0.16], [0.09, 0.16], [-0.09, -0.16], [0.09, -0.16]], 0.2, 0.045, c);
    const bg = grp(body.mesh(), hg);
    return { group: grp(bg, ...legs), body: bg, head: hg, legs, h: 0.8 };
  },
  bear() {
    const body = new B();
    const c = '#8a5a3a',
      l = '#d9b38a';
    body.sph(0.38, c, { y: 0.62, sy: 1.05, sz: 1.1 });
    body.sph(0.26, l, { y: 0.58, z: 0.2, sx: 0.95, sy: 1.05 });
    body.sph(0.12, c, { x: 0.33, y: 0.75, z: 0.12, sy: 1.5, rz: 0.4 }); // лапы
    body.sph(0.12, c, { x: -0.33, y: 0.75, z: 0.12, sy: 1.5, rz: -0.4 });
    body.sph(0.07, l, { x: 0.38, y: 0.6, z: 0.18 });
    body.sph(0.07, l, { x: -0.38, y: 0.6, z: 0.18 });
    const head = new B();
    head.sph(0.27, c, { sx: 1.08 });
    head.sph(0.1, c, { x: 0.2, y: 0.2 });
    head.sph(0.1, c, { x: -0.2, y: 0.2 });
    head.sph(0.055, l, { x: 0.2, y: 0.2, z: 0.05 });
    head.sph(0.055, l, { x: -0.2, y: 0.2, z: 0.05 });
    head.sph(0.13, l, { y: -0.06, z: 0.2, sx: 1.2, sy: 0.85 });
    head.sph(0.05, '#2d1d15', { y: -0.01, z: 0.32, sx: 1.3, sy: 0.85 });
    eyes(head, 0, 0.07, 0.22, 0.035, 0.1);
    head.sph(0.04, '#ff9a9a', { x: 0.17, y: -0.06, z: 0.18, sy: 0.6 });
    head.sph(0.04, '#ff9a9a', { x: -0.17, y: -0.06, z: 0.18, sy: 0.6 });
    const hg = at(grp(head.mesh()), 0, 1.15, 0.08);
    const legs = legsOf([[-0.17, 0.05], [0.17, 0.05]], 0.28, 0.1, c);
    const bg = grp(body.mesh(), hg);
    return { group: grp(bg, ...legs), body: bg, head: hg, legs, h: 1.45 };
  },
};

// парашют-купол с полосками (для животных и медведей, спускающихся с неба)
export function makeChute(r = 0.6, c1 = '#ff6b6b', c2 = '#fff6e8') {
  const b = new B();
  const n = 8;
  for (let i = 0; i < n; i++) {
    const g = new THREE.SphereGeometry(r, 4, 6, (i / n) * P * 2, (P * 2) / n, 0, P / 2);
    b.add(g, i % 2 ? c1 : c2, { sy: 0.7 });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * P * 2 + P / 4;
    const x = Math.cos(a) * r * 0.9,
      z = Math.sin(a) * r * 0.9;
    const len = Math.hypot(x, z, 0.9);
    b.cyl(0.008, 0.008, len, '#7a6a5a', { x: x / 2, y: -0.45, z: z / 2, rz: Math.atan2(x, 0.9) * 1, rx: -Math.atan2(z, 0.9) });
  }
  return b.mesh(MAT, false);
}

// ---------------- товары ----------------
export function itemParts(b, id) {
  switch (id) {
    case 'egg':
      b.sph(0.13, '#fff7ea', { y: 0.15, sy: 1.25 });
      b.sph(0.03, '#ffffff', { x: 0.05, y: 0.22, z: 0.09 });
      break;
    case 'powder':
      // бумажный мешочек с жёлтой полосой и яйцом
      b.rbox(0.26, 0.3, 0.18, 0.05, '#f4e3c3', { y: 0.16 });
      b.box(0.27, 0.07, 0.19, '#f6c552', { y: 0.2 });
      b.rbox(0.22, 0.06, 0.12, 0.03, '#e6cfa4', { y: 0.33, rz: 0.1 });
      b.sph(0.04, '#fffaf0', { y: 0.2, z: 0.1, sy: 1.25 });
      break;
    case 'cake':
      b.cyl(0.15, 0.11, 0.14, '#e9a06b', { y: 0.08 }, 14);
      for (let i = 0; i < 8; i++) b.box(0.012, 0.14, 0.02, '#c97c4c', { x: Math.cos((i * P) / 4) * 0.13, y: 0.08, z: Math.sin((i * P) / 4) * 0.13, ry: -(i * P) / 4 });
      b.sph(0.16, '#ffc4d6', { y: 0.17, sy: 0.55 });
      b.sph(0.11, '#ffd5e2', { y: 0.24, sy: 0.6 });
      b.sph(0.06, '#ffe4ec', { y: 0.3, sy: 0.8 });
      b.sph(0.04, '#e8384f', { y: 0.36 });
      b.cyl(0.005, 0.005, 0.06, '#5a8a3a', { x: 0.015, y: 0.41, rz: -0.3 });
      for (let i = 0; i < 6; i++) b.box(0.03, 0.012, 0.012, ['#7ad0f0', '#ffe066', '#9be37a'][i % 3], { x: Math.cos(i) * 0.09, y: 0.22 + (i % 2) * 0.03, z: Math.sin(i * 1.7) * 0.09, ry: i });
      break;
    case 'wool':
      for (const [x, y, z, r] of [[0, 0.14, 0, 0.13], [0.1, 0.11, 0.05, 0.09], [-0.1, 0.11, 0.04, 0.09], [0.03, 0.22, -0.03, 0.09], [-0.04, 0.1, -0.1, 0.09], [0.07, 0.1, -0.08, 0.08]]) b.sph(r, '#fbf8f1', { x, y, z }, 10);
      break;
    case 'thread':
      b.cyl(0.13, 0.13, 0.04, '#d39a5e', { y: 0.02 });
      b.cyl(0.13, 0.13, 0.04, '#d39a5e', { y: 0.3 });
      b.cyl(0.1, 0.1, 0.24, '#6aa9e8', { y: 0.16 });
      for (let i = 0; i < 4; i++) b.torus(0.1, 0.012, '#8cc0f3', { y: 0.07 + i * 0.06, rx: P / 2 });
      b.cyl(0.03, 0.03, 0.34, '#b07a44', { y: 0.16 });
      break;
    case 'cloth':
      b.rbox(0.36, 0.08, 0.26, 0.03, '#c69ce8', { y: 0.05 });
      b.rbox(0.36, 0.08, 0.26, 0.03, '#f7b2d0', { y: 0.13 });
      b.rbox(0.36, 0.08, 0.26, 0.03, '#9fd4f5', { y: 0.21 });
      for (let i = 0; i < 3; i++) b.box(0.37, 0.012, 0.05, '#ffffff', { y: 0.05 + i * 0.08 + 0.035, z: -0.06 + (i % 2) * 0.08 });
      b.cyl(0.035, 0.035, 0.3, '#f7b2d0', { y: 0.27, z: 0.08, rz: P / 2 });
      break;
    case 'milk':
      // бидон
      b.cyl(0.12, 0.13, 0.26, '#dfe7ef', { y: 0.14 }, 16);
      b.cyl(0.08, 0.12, 0.08, '#dfe7ef', { y: 0.31 }, 16);
      b.cyl(0.07, 0.07, 0.06, '#c8d3de', { y: 0.37 }, 16);
      b.cyl(0.08, 0.08, 0.025, '#4a98dc', { y: 0.405 }, 16);
      b.torus(0.125, 0.012, '#4a98dc', { y: 0.1, rx: P / 2 });
      b.torus(0.125, 0.012, '#4a98dc', { y: 0.2, rx: P / 2 });
      b.torus(0.05, 0.012, '#9aa8b6', { x: 0.13, y: 0.25, ry: P / 2 });
      b.sph(0.045, '#ffffff', { y: 0.16, z: 0.12, sz: 0.3 });
      break;
    case 'butter':
      b.cyl(0.2, 0.17, 0.04, '#9fd4f5', { y: 0.02 }, 18);
      b.rbox(0.24, 0.13, 0.16, 0.03, '#ffe58a', { y: 0.11 });
      b.rbox(0.14, 0.02, 0.12, 0.01, '#fff1b8', { y: 0.18, x: -0.03 });
      b.box(0.02, 0.12, 0.16, '#f7d15a', { x: 0.06, y: 0.11 });
      break;
    case 'cheese': {
      // головка сыра с вырезанным клинышком
      const g = new THREE.CylinderGeometry(0.2, 0.2, 0.16, 20, 1, false, 0.5, P * 2 - 0.9);
      b.add(g, '#ffc94a', { y: 0.09 });
      b.box(0.005, 0.16, 0.2, '#ffd977', { y: 0.09, x: Math.sin(0.5) * 0.1, z: Math.cos(0.5) * 0.1, ry: 0.5 + P / 2 });
      b.box(0.005, 0.16, 0.2, '#ffd977', { y: 0.09, x: Math.sin(P * 2 - 0.4) * 0.1, z: Math.cos(P * 2 - 0.4) * 0.1, ry: P * 2 - 0.4 + P / 2 });
      for (const [x, y, z, r] of [[0.1, 0.17, -0.06, 0.03], [-0.08, 0.17, 0.05, 0.025], [-0.05, 0.17, -0.1, 0.02], [0.19, 0.08, -0.05, 0.025], [-0.12, 0.06, 0.15, 0.02]]) b.sph(r, '#e9a72a', { x, y, z, sy: 0.4 });
      b.cyl(0.2, 0.2, 0.012, '#e8423c', { y: 0.008 });
      break;
    }
    case 'bear':
      b.merge(cageParts(1), {});
      break;
  }
  return b;
}
export function itemMesh(id, s = 1) {
  const b = itemParts(new B(), id);
  const m = b.mesh();
  m.scale.setScalar(s);
  return m;
}

// ---------------- клетка ----------------
export function cageParts(frac = 1) {
  const b = new B();
  const w = 0.62;
  const wood = '#a8683a';
  b.rbox(w * 2 + 0.12, 0.08, w * 2 + 0.12, 0.03, wood, { y: 0.04 });
  if (frac >= 1) b.rbox(w * 2 + 0.12, 0.08, w * 2 + 0.12, 0.03, wood, { y: 1.42 });
  const bars = [];
  for (let i = 0; i < 5; i++) {
    const t = -w + (i / 4) * w * 2;
    bars.push([t, w], [t, -w]);
    if (i > 0 && i < 4) bars.push([w, t], [-w, t]);
  }
  bars.sort((a, b) => a[0] + a[1] * 0.3 - (b[0] + b[1] * 0.3));
  const n = Math.round(bars.length * Math.min(1, frac));
  for (let i = 0; i < n; i++) b.cyl(0.03, 0.03, 1.38, '#8a8f99', { x: bars[i][0], y: 0.72, z: bars[i][1] }, 8);
  return b;
}

// ---------------- трава ----------------
export function grassTuft() {
  const b = new B();
  const cols = ['#5fb84a', '#71c955', '#4ea83c', '#82d466'];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * P * 2;
    const r = 0.08 + (i % 3) * 0.04;
    b.cone(0.05, 0.28 + (i % 3) * 0.08, cols[i % 4], { x: Math.cos(a) * r, y: 0.14, z: Math.sin(a) * r, rx: Math.sin(a) * 0.35, rz: -Math.cos(a) * 0.35 }, 5);
  }
  b.cone(0.06, 0.36, '#68c24f', { y: 0.18 }, 5);
  return b.geometry();
}
export function flowerGeo() {
  const b = new B();
  b.cyl(0.01, 0.01, 0.2, '#4e9a3c', { y: 0.1 }, 5);
  for (let i = 0; i < 5; i++) b.sph(0.035, '#ffffff', { x: Math.cos((i / 5) * P * 2) * 0.04, y: 0.21, z: Math.sin((i / 5) * P * 2) * 0.04, sy: 0.5 }, 6);
  b.sph(0.03, '#ffd23f', { y: 0.22 }, 6);
  return b.geometry();
}

// ---------------- мастерские ----------------
// общий домик: фундамент, стены, крыша, дверь, окна
function house(b, o) {
  const { w = 2.1, d = 1.6, h = 1.15, wall = '#fff1d6', roof = '#e2574c', trim = '#ffffff' } = o;
  b.rbox(w + 0.2, 0.18, d + 0.2, 0.06, '#b9ada0', { y: 0.09 });
  for (let i = 0; i < 9; i++) b.sph(0.08, i % 2 ? '#a99d90' : '#c8bcae', { x: -w / 2 + (i / 8) * w, y: 0.1, z: d / 2 + 0.1, sy: 0.6, sz: 0.4 });
  b.rbox(w, h, d, 0.06, wall, { y: 0.18 + h / 2 });
  // доски на стенах
  for (let i = 1; i < 5; i++) b.box(w + 0.01, 0.02, d + 0.01, shadeHex(wall, -0.05), { y: 0.18 + (i * h) / 5 });
  // крыша-домик
  const rh = 0.7;
  const roofGeo = new THREE.CylinderGeometry(0.0001, 1, 1, 4, 1);
  roofGeo.rotateY(P / 4);
  b.add(roofGeo, roof, { y: 0.18 + h + rh / 2, sx: w * 0.82, sy: rh, sz: d * 0.82 });
  b.rbox(w + 0.26, 0.08, d + 0.26, 0.04, shadeHex(roof, -0.15), { y: 0.18 + h + 0.02 });
  // дверь и окна на фасаде (+z)
  b.rbox(0.42, 0.66, 0.06, 0.05, '#9c6640', { y: 0.18 + 0.33, z: d / 2 + 0.02 });
  b.box(0.36, 0.02, 0.07, '#7a4c2c', { y: 0.18 + 0.36, z: d / 2 + 0.02 });
  b.sph(0.03, '#ffd23f', { x: 0.12, y: 0.18 + 0.32, z: d / 2 + 0.06 });
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.38);
    b.rbox(0.36, 0.34, 0.05, 0.04, trim, { x, y: 0.18 + h * 0.6, z: d / 2 + 0.01 });
    b.box(0.28, 0.26, 0.06, '#9fd8f5', { x, y: 0.18 + h * 0.6, z: d / 2 + 0.01 });
    b.box(0.02, 0.26, 0.07, trim, { x, y: 0.18 + h * 0.6, z: d / 2 + 0.01 });
    b.box(0.4, 0.06, 0.12, '#a8683a', { x, y: 0.18 + h * 0.6 - 0.2, z: d / 2 + 0.06 }); // ящик с цветами
    for (let k = 0; k < 3; k++) b.sph(0.045, ['#ff6f91', '#ffd23f', '#ff9a4a'][k], { x: x - 0.12 + k * 0.12, y: 0.18 + h * 0.6 - 0.15, z: d / 2 + 0.08 });
  }
  return 0.18 + h;
}
function shadeHex(hex, k) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + k)));
  return '#' + c.getHexString();
}
export { shadeHex };

// вывеска с товаром над дверью
function signWith(b, item, y, z) {
  b.rbox(0.7, 0.46, 0.06, 0.05, '#fffaf0', { y, z });
  b.rbox(0.76, 0.52, 0.04, 0.05, '#a8683a', { y, z: z - 0.03 });
  const ib = itemParts(new B(), item);
  b.merge(ib, { y: y - 0.2, z: z + 0.1, s: 1.15 });
}

// возвращает { group, moving: Object3D|null, kind }
export function makeBuilding(kind) {
  const b = new B();
  const g = new THREE.Group();
  let moving = null;
  let smoke = null;
  const D = {
    powder: { wall: '#fff3c4', roof: '#f0a23a' },
    bakery: { wall: '#ffe4d6', roof: '#e2574c' },
    spinner: { wall: '#e4f1ff', roof: '#4a8fd8' },
    loom: { wall: '#f1e6ff', roof: '#9a6ad8' },
    churn: { wall: '#fffbe8', roof: '#58b047' },
    creamery: { wall: '#fff0d8', roof: '#e07a2a' },
  }[kind];
  const top = house(b, D);
  const OUT = { powder: 'powder', bakery: 'cake', spinner: 'thread', loom: 'cloth', churn: 'butter', creamery: 'cheese' };
  signWith(b, OUT[kind], top - 0.05 + 0.32, 0.85);
  const mv = new B();
  if (kind === 'powder') {
    // сушильный барабан сбоку
    b.box(0.12, 0.7, 0.12, '#a8683a', { x: 1.3, y: 0.55, z: 0.35 });
    b.box(0.12, 0.7, 0.12, '#a8683a', { x: 1.3, y: 0.55, z: -0.35 });
    mv.cyl(0.32, 0.32, 0.7, '#f6c552', { rx: P / 2 });
    mv.torus(0.32, 0.03, '#c98a2a', { z: 0.2 });
    mv.torus(0.32, 0.03, '#c98a2a', { z: -0.2 });
    for (let i = 0; i < 4; i++) mv.box(0.06, 0.06, 0.72, '#e2a93a', { x: Math.cos((i * P) / 2) * 0.3, y: Math.sin((i * P) / 2) * 0.3 });
    moving = at(mv.mesh(), 1.3, 0.95, 0);
    moving.userData.spin = 'z';
    b.cyl(0.12, 0.14, 0.7, '#c4b8aa', { x: -0.6, y: top + 0.55, z: -0.3 });
    smoke = { x: -0.6, y: top + 0.95, z: -0.3 };
  } else if (kind === 'bakery') {
    // печь-купол сбоку и труба
    b.hemi(0.5, '#d97a4e', { x: 1.25, y: 0.2, z: 0 });
    b.rbox(0.36, 0.3, 0.1, 0.06, '#5a3a2a', { x: 1.25, y: 0.38, z: 0.45 });
    b.box(0.3, 0.12, 0.08, '#ff9a3a', { x: 1.25, y: 0.3, z: 0.47 });
    b.cyl(0.14, 0.16, 0.9, '#c96a4a', { x: 0.55, y: top + 0.55, z: -0.3 });
    b.cyl(0.18, 0.18, 0.1, '#a85a3a', { x: 0.55, y: top + 1.0, z: -0.3 });
    // полосатый навес
    for (let i = 0; i < 6; i++) b.box(0.18, 0.04, 0.4, i % 2 ? '#ffffff' : '#ff8fa8', { x: -0.45 + i * 0.18, y: 0.95, z: 1.0, rx: 0.4 });
    smoke = { x: 0.55, y: top + 1.1, z: -0.3 };
    mv.sph(0.12, '#ffcf6a', { y: 0 });
    moving = at(mv.mesh(MAT, false), 1.25, 0.32, 0.43);
    moving.userData.glow = true;
  } else if (kind === 'spinner') {
    // большое прялочное колесо
    b.box(0.1, 0.9, 0.1, '#a8683a', { x: 1.3, y: 0.5, z: 0.1 });
    b.box(0.5, 0.08, 0.5, '#a8683a', { x: 1.3, y: 0.08, z: 0.1 });
    mv.torus(0.42, 0.04, '#c98a52');
    for (let i = 0; i < 8; i++) mv.box(0.03, 0.84, 0.03, '#b07a44', { rz: (i * P) / 8 });
    mv.cyl(0.07, 0.07, 0.12, '#8a5a34', { rx: P / 2 });
    moving = at(mv.mesh(), 1.3, 0.95, 0.18);
    moving.userData.spin = 'z';
    b.cyl(0.1, 0.1, 0.24, '#6aa9e8', { x: -1.25, y: 0.3, z: 0.4 });
    b.cyl(0.1, 0.1, 0.24, '#ff8fa8', { x: -1.25, y: 0.3, z: 0.1 });
  } else if (kind === 'loom') {
    // ткацкий станок перед домом
    for (const s of [-1, 1]) b.box(0.08, 0.9, 0.08, '#a8683a', { x: 1.3 + s * 0.35, y: 0.45, z: 0.2 });
    b.box(0.8, 0.07, 0.07, '#a8683a', { x: 1.3, y: 0.88, z: 0.2 });
    b.box(0.66, 0.5, 0.02, '#c69ce8', { x: 1.3, y: 0.5, z: 0.2 });
    for (let i = 0; i < 6; i++) b.box(0.66, 0.02, 0.03, i % 2 ? '#ffffff' : '#f7b2d0', { x: 1.3, y: 0.32 + i * 0.07, z: 0.21 });
    mv.box(0.74, 0.06, 0.12, '#8a5a34');
    moving = at(mv.mesh(), 1.3, 0.6, 0.32);
    moving.userData.slide = 'y';
  } else if (kind === 'churn') {
    // деревянная маслобойка с толкушкой
    b.cyl(0.26, 0.3, 0.7, '#c98a52', { x: 1.3, y: 0.35, z: 0.1 });
    b.torus(0.28, 0.025, '#7a5a3a', { x: 1.3, y: 0.18, z: 0.1, rx: P / 2 });
    b.torus(0.26, 0.025, '#7a5a3a', { x: 1.3, y: 0.55, z: 0.1, rx: P / 2 });
    mv.cyl(0.025, 0.025, 0.7, '#b07a44', {});
    mv.cyl(0.07, 0.07, 0.05, '#b07a44', { y: 0.35 });
    moving = at(mv.mesh(), 1.3, 0.9, 0.1);
    moving.userData.slide = 'y';
    b.cyl(0.13, 0.14, 0.7, '#c4b8aa', { x: -0.6, y: top + 0.45, z: -0.3 });
    smoke = { x: -0.6, y: top + 0.85, z: -0.3 };
  } else if (kind === 'creamery') {
    // сырные головки на полке и круглое окошко
    b.box(0.7, 0.06, 0.4, '#a8683a', { x: 1.3, y: 0.5, z: 0.1 });
    b.box(0.06, 0.5, 0.4, '#a8683a', { x: 1.0, y: 0.25, z: 0.1 });
    b.box(0.06, 0.5, 0.4, '#a8683a', { x: 1.6, y: 0.25, z: 0.1 });
    b.merge(itemParts(new B(), 'cheese'), { x: 1.15, y: 0.53, z: 0.1, s: 0.8 });
    b.merge(itemParts(new B(), 'cheese'), { x: 1.45, y: 0.53, z: 0.1, s: 0.8, ry: 1 });
    mv.torus(0.18, 0.03, '#a8683a');
    for (let i = 0; i < 3; i++) mv.box(0.03, 0.34, 0.03, '#a8683a', { rz: (i * P) / 3 });
    moving = at(mv.mesh(), -1.15, 1.25, 0.2);
    moving.userData.spin = 'z';
    b.cyl(0.12, 0.14, 0.8, '#c4b8aa', { x: 0.6, y: top + 0.5, z: -0.3 });
    smoke = { x: 0.6, y: top + 0.9, z: -0.3 };
  }
  const m = b.mesh();
  g.add(m);
  if (moving) g.add(moving);
  return { group: g, moving, smoke };
}

// пустой участок под стройку: колышки, верёвка, табличка
export function makePlot() {
  const b = new B();
  b.rbox(2.3, 0.05, 1.8, 0.1, '#c8a46e', { y: 0.025 });
  for (let i = 0; i < 6; i++) b.sph(0.12, '#b8925a', { x: -0.8 + (i % 3) * 0.8, y: 0.04, z: -0.4 + Math.floor(i / 3) * 0.8, sy: 0.3 });
  for (const [x, z] of [[-1.1, -0.85], [1.1, -0.85], [-1.1, 0.85], [1.1, 0.85]]) b.cyl(0.04, 0.04, 0.4, '#a8683a', { x, y: 0.2, z });
  for (const [x, z, w, d] of [[0, -0.85, 2.2, 0.02], [0, 0.85, 2.2, 0.02], [-1.1, 0, 0.02, 1.7], [1.1, 0, 0.02, 1.7]]) b.box(w, 0.02, d, '#e8d5ba', { x, y: 0.33, z });
  b.box(0.08, 0.8, 0.08, '#a8683a', { y: 0.4, z: 0.6 });
  b.rbox(0.9, 0.5, 0.06, 0.05, '#ffe9b8', { y: 0.95, z: 0.62 });
  b.rbox(0.96, 0.56, 0.04, 0.05, '#a8683a', { y: 0.95, z: 0.58 });
  // молоток на табличке
  b.box(0.06, 0.26, 0.04, '#8a5a34', { x: -0.2, y: 0.95, z: 0.67, rz: 0.6 });
  b.box(0.16, 0.08, 0.06, '#8a8f99', { x: -0.27, y: 1.06, z: 0.67, rz: 0.6 });
  return b.mesh();
}

// ---------------- колодец ----------------
export function makeWell() {
  const b = new B();
  b.cyl(0.62, 0.66, 0.6, '#b8b0a6', { y: 0.3 }, 18);
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * P * 2 + r * 0.3;
      b.rbox(0.3, 0.17, 0.12, 0.04, ['#c9c1b6', '#a9a196', '#d6cfc5'][(i + r) % 3], { x: Math.cos(a) * 0.65, y: 0.1 + r * 0.19, z: Math.sin(a) * 0.65, ry: -a + P / 2 });
    }
  b.cyl(0.68, 0.68, 0.08, '#d6cfc5', { y: 0.62 }, 18);
  b.cyl(0.5, 0.5, 0.05, '#3c2e28', { y: 0.6 }, 18);
  for (const s of [-1, 1]) b.box(0.1, 1.3, 0.1, '#a8683a', { x: s * 0.6, y: 1.1 });
  b.cyl(0.06, 0.06, 1.4, '#8a5a34', { y: 1.35, rz: P / 2 });
  b.cyl(0.03, 0.03, 0.2, '#8a5a34', { x: 0.75, y: 1.35, rz: P / 2 });
  b.box(0.04, 0.2, 0.04, '#8a5a34', { x: 0.85, y: 1.27 });
  const roofGeo = new THREE.CylinderGeometry(0.001, 1, 1, 4, 1);
  roofGeo.rotateY(P / 4);
  b.add(roofGeo, '#e2574c', { y: 1.95, sx: 0.95, sy: 0.55, sz: 0.65 });
  b.rbox(1.45, 0.06, 1.0, 0.03, '#b44a3e', { y: 1.67 });
  b.cyl(0.01, 0.01, 0.5, '#7a6a5a', { y: 1.07 });
  const water = new B();
  water.cyl(0.48, 0.48, 0.02, '#5ab4ec', {}, 18);
  const wm = at(water.mesh(MAT, false), 0, 0.61, 0);
  const bucket = new B();
  bucket.cyl(0.13, 0.1, 0.18, '#8a8f99', {}, 10);
  bucket.torus(0.13, 0.015, '#6a6f79', { y: 0.09, rx: P / 2 });
  bucket.torus(0.1, 0.01, '#6a6f79', { y: 0.12, rx: 0 });
  const bm = at(bucket.mesh(), 0, 0.82, 0);
  return { group: grp(b.mesh(), wm, bm), water: wm, bucket: bm };
}

// ---------------- амбар-склад ----------------
export function makeBarn() {
  const b = new B();
  const w = 2.0,
    d = 1.9,
    h = 1.4;
  b.rbox(w + 0.2, 0.15, d + 0.2, 0.05, '#b9ada0', { y: 0.075 });
  b.rbox(w, h, d, 0.05, '#d9493e', { y: 0.15 + h / 2 });
  for (let i = 0; i < 8; i++) b.box(0.015, h, d + 0.01, '#c03c33', { x: -w / 2 + 0.12 + i * 0.25, y: 0.15 + h / 2 });
  // двускатная крыша: красный фронтон с белой окантовкой и тёмная черепица
  const top = 0.15 + h;
  const rise = 0.8,
    half = w / 2 + 0.14;
  const tri = new THREE.Shape();
  tri.moveTo(-w / 2, 0);
  tri.lineTo(w / 2, 0);
  tri.lineTo(0, rise - 0.04);
  tri.lineTo(-w / 2, 0);
  const gable = new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false });
  gable.translate(0, 0, -d / 2);
  b.add(gable, '#d9493e', { y: top });
  const ang = Math.atan2(rise, half);
  const len = Math.hypot(rise, half) + 0.06;
  for (const sgn of [-1, 1]) {
    const o = { x: (sgn * half) / 2, y: top + rise / 2 + 0.05, rz: -sgn * ang };
    b.rbox(len, 0.1, d + 0.36, 0.04, '#7b3a2e', o);
    // ряды черепицы
    for (let i = 1; i < 4; i++) {
      const k = i / 4 - 0.5;
      b.box(0.035, 0.035, d + 0.3, '#62291f', { x: o.x + Math.cos(ang) * k * len * sgn, y: o.y + 0.06 - Math.sin(ang) * k * len, z: 0, rz: o.rz });
    }
  }
  b.box(0.12, 0.12, d + 0.4, '#ffffff', { y: top + rise + 0.06, rx: 0, rz: P / 4 });
  // белая окантовка фронтона
  for (const sgn of [-1, 1]) b.box(Math.hypot(rise, w / 2) + 0.05, 0.07, 0.06, '#ffffff', { x: (sgn * w) / 4, y: top + rise / 2, z: d / 2 + 0.03, rz: -sgn * Math.atan2(rise, w / 2) });
  b.rbox(w + 0.1, 0.08, d + 0.1, 0.03, '#ffffff', { y: top + 0.02 });
  // ворота с белым крестом
  b.rbox(1.1, 1.05, 0.06, 0.04, '#b8392f', { y: 0.68, z: d / 2 + 0.02 });
  b.box(1.16, 0.08, 0.08, '#ffffff', { y: 1.2, z: d / 2 + 0.03 });
  b.box(1.16, 0.08, 0.08, '#ffffff', { y: 0.16, z: d / 2 + 0.03 });
  b.box(0.08, 1.05, 0.08, '#ffffff', { x: 0.55, y: 0.68, z: d / 2 + 0.03 });
  b.box(0.08, 1.05, 0.08, '#ffffff', { x: -0.55, y: 0.68, z: d / 2 + 0.03 });
  b.box(0.06, 1.05, 0.08, '#ffffff', { y: 0.68, z: d / 2 + 0.03 });
  b.box(0.06, 1.38, 0.07, '#ffffff', { y: 0.68, z: d / 2 + 0.03, rz: 0.82 });
  b.box(0.06, 1.38, 0.07, '#ffffff', { y: 0.68, z: d / 2 + 0.03, rz: -0.82 });
  // сеновал
  b.rbox(0.5, 0.4, 0.06, 0.04, '#ffffff', { y: top + 0.28, z: d / 2 + 0.02 });
  b.box(0.4, 0.3, 0.07, '#5a3a2a', { y: top + 0.28, z: d / 2 + 0.02 });
  b.box(0.36, 0.1, 0.1, '#ffd86a', { y: top + 0.19, z: d / 2 + 0.05 });
  // флюгер-петушок
  b.cyl(0.02, 0.02, 0.4, '#5a5a6a', { y: top + rise + 0.3 });
  b.cone(0.07, 0.1, '#ffd23f', { y: top + rise + 0.52 });
  b.box(0.22, 0.1, 0.02, '#5a5a6a', { y: top + rise + 0.43 });
  // мешки и бочки у стены
  b.cyl(0.18, 0.18, 0.4, '#b07a44', { x: 0.85, y: 0.35, z: d / 2 + 0.3 });
  b.torus(0.18, 0.02, '#6a4a2a', { x: 0.85, y: 0.25, z: d / 2 + 0.3, rx: P / 2 });
  b.rbox(0.3, 0.32, 0.22, 0.08, '#f4e3c3', { x: -0.85, y: 0.31, z: d / 2 + 0.25 });
  return b.mesh();
}

// ---------------- машина ----------------
export function makeTruck() {
  const b = new B();
  const body = '#4a98dc';
  b.rbox(0.95, 0.35, 1.9, 0.1, body, { y: 0.45 });
  b.rbox(0.9, 0.5, 0.75, 0.14, body, { y: 0.85, z: 0.45 });
  b.rbox(0.82, 0.3, 0.05, 0.05, '#bfe9ff', { y: 0.92, z: 0.83 });
  b.rbox(0.05, 0.28, 0.5, 0.04, '#bfe9ff', { x: 0.45, y: 0.92, z: 0.45 });
  b.rbox(0.05, 0.28, 0.5, 0.04, '#bfe9ff', { x: -0.45, y: 0.92, z: 0.45 });
  b.rbox(0.92, 0.12, 0.2, 0.05, '#dfe7ef', { y: 0.36, z: 0.97 });
  b.sph(0.08, '#fff6c8', { x: 0.32, y: 0.55, z: 0.95, sz: 0.4 });
  b.sph(0.08, '#fff6c8', { x: -0.32, y: 0.55, z: 0.95, sz: 0.4 });
  // кузов с деревянными бортами
  for (const s of [-1, 1]) b.box(0.05, 0.25, 1.0, '#c98a52', { x: s * 0.45, y: 0.75, z: -0.45 });
  b.box(0.9, 0.25, 0.05, '#c98a52', { y: 0.75, z: -0.95 });
  for (const [x, z] of [[0.42, 0.55], [-0.42, 0.55], [0.42, -0.55], [-0.42, -0.55]]) {
    b.cyl(0.21, 0.21, 0.16, '#3a3440', { x, y: 0.21, z, rz: P / 2 }, 14);
    b.cyl(0.1, 0.1, 0.17, '#dfe7ef', { x, y: 0.21, z, rz: P / 2 }, 10);
  }
  b.box(0.06, 0.06, 0.06, '#ff6f6f', { x: 0.4, y: 0.6, z: -0.97 });
  b.box(0.06, 0.06, 0.06, '#ff6f6f', { x: -0.4, y: 0.6, z: -0.97 });
  const g = new THREE.Group();
  g.add(b.mesh());
  // ящики в кузове (видны при погрузке)
  const crates = new B();
  crates.rbox(0.36, 0.3, 0.36, 0.03, '#d7a36a', { x: -0.2, y: 0.78, z: -0.25 });
  crates.rbox(0.36, 0.3, 0.36, 0.03, '#c99358', { x: 0.2, y: 0.78, z: -0.7 });
  crates.rbox(0.3, 0.26, 0.3, 0.03, '#e4b47c', { x: 0.18, y: 0.76, z: -0.26 });
  crates.sph(0.15, '#fbf8f1', { x: -0.2, y: 0.75, z: -0.7 });
  const cm = crates.mesh();
  g.add(cm);
  return { group: g, cargo: cm };
}
