// Машинки: характеристики, прокачка и процедурные модели (милые «игрушечные» формы)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// stats: скорость, разгон, управление, нитро (шкала 1..10)
export const CARS = [
  { id: 'bug', price: 0, stats: [4, 5, 6, 4], paint: 0 },
  { id: 'buggy', price: 1500, stats: [5, 7, 5, 5], paint: 2 },
  { id: 'mini', price: 4000, stats: [6, 6, 8, 5], paint: 4 },
  { id: 'pickup', price: 9000, stats: [7, 6, 6, 7], paint: 6 },
  { id: 'sport', price: 18000, stats: [8, 7, 7, 7], paint: 1 },
  { id: 'rocket', price: 35000, stats: [9, 8, 8, 8], paint: 7 },
];
export const MAX_UP = 5;
export const UP_STEP = 0.4;

export const PAINTS = ['#ff6b6b', '#ffb347', '#ffe066', '#7ed957', '#4ecdc4', '#5aa9ff', '#a78bfa', '#ff8fd0', '#f5f5f5', '#4a4f63'];

export function upgradeCost(car, stat, lvl) {
  const tier = CARS.findIndex((c) => c.id === car);
  return Math.round((160 * Math.pow(1.65, lvl) * (1 + tier * 0.45)) / 10) * 10;
}

// итоговые характеристики с учётом прокачки
export function carStats(id, ups = [0, 0, 0, 0]) {
  const c = CARS.find((x) => x.id === id) || CARS[0];
  const s = c.stats.map((v, i) => v + (ups[i] || 0) * UP_STEP);
  return {
    s,
    vmax: 26 + 1.2 * s[0],
    accel: 7 + 1.1 * s[1],
    turn: 1.55 + 0.07 * s[2],
    nitroTime: 1.3 + 0.13 * s[3],
    nitroFill: 0.06 + 0.008 * s[3],
    power: Math.round(s.reduce((a, b) => a + b, 0) * 10),
  };
}

// ---------- модели ----------
const geoCache = {};
const G = (key, f) => geoCache[key] || (geoCache[key] = f());

function lam(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

export function makeCar(id, paint) {
  const group = new THREE.Group();
  const mats = [];
  const M = (color, extra) => {
    const m = lam(color, extra);
    mats.push(m);
    return m;
  };
  const col = new THREE.Color(paint);
  const dark = col.clone().multiplyScalar(0.72);
  const body = M(col);
  const bodyD = M(dark);
  const glass = M(0x5f86c4, { emissive: 0x1a2a50, emissiveIntensity: 0.6 });
  const white = M(0xf7f3ea);
  const black = M(0x2d2f38);
  const tire = M(0x30323c);
  const hub = M(0xdfe3ea);
  const lightF = M(0xfff4b8, { emissive: 0xfff0a0, emissiveIntensity: 0.6 });
  const lightR = M(0xff5a5a, { emissive: 0xff3030, emissiveIntensity: 0.5 });
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    group.add(m);
    return m;
  };
  const rbox = (w, h, d, r) => G(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
  const sph = G('sph', () => new THREE.SphereGeometry(1, 32, 22));
  const cyl = G('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 18));
  const wheels = [];
  // колёса: шина + диск, ось вдоль X
  const wheel = (x, y, z, r, w) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const t = new THREE.Mesh(G('tire', () => new THREE.CylinderGeometry(1, 1, 1, 20).rotateZ(Math.PI / 2)), tire);
    t.scale.set(w, r, r);
    g.add(t);
    const h = new THREE.Mesh(G('rim', rimGeo), hub);
    h.scale.set(w * 1.06, r, r);
    g.add(h);
    const cap = new THREE.Mesh(G('hubcap', () => new THREE.CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2)), bodyD);
    cap.scale.set(w * 1.14, r * 0.2, r * 0.2);
    g.add(cap);
    group.add(g);
    wheels.push({ g, front: z > 0, r });
    return g;
  };
  const headlights = (y, z, x = 0.55, r = 0.17) => {
    add(sph, lightF, -x, y, z, r, r, r * 0.6);
    add(sph, lightF, x, y, z, r, r, r * 0.6);
  };
  const tail = (y, z, x = 0.6) => {
    add(G('tl', () => new THREE.BoxGeometry(1, 1, 1)), lightR, -x, y, z, 0.32, 0.14, 0.06);
    add(G('tl', () => new THREE.BoxGeometry(1, 1, 1)), lightR, x, y, z, 0.32, 0.14, 0.06);
  };

  const chrome = M(0xc9d2de);
  const plateM = M(0xfdfaf0);
  const box = G('box', () => new THREE.BoxGeometry(1, 1, 1));
  // мелкие детали: зеркала, бампер, номер, выхлоп, кружок с номером, фары в ободке
  const mirrors = (x, y, z) =>
    [-1, 1].forEach((sx) => {
      add(rbox(0.26, 0.16, 0.1, 0.04), body, sx * x, y, z);
      add(box, black, sx * (x - 0.1), y - 0.06, z, 0.14, 0.04, 0.05);
      add(box, glass, sx * x, y, z - 0.055, 0.2, 0.1, 0.01);
    });
  const bumper = (y, z, w, mat = chrome) => add(rbox(w, 0.16, 0.22, 0.07), mat, 0, y, z);
  const plate = (y, z) => {
    add(box, plateM, 0, y, z, 0.5, 0.15, 0.03);
    add(box, black, 0, y, z - Math.sign(z) * 0.005, 0.34, 0.04, 0.03);
  };
  const exhaust = (x, y, z) => {
    add(cyl, chrome, x, y, z, 0.085, 0.3, 0.085, Math.PI / 2, 0, 0);
    add(cyl, black, x, y, z - 0.151, 0.055, 0.01, 0.055, Math.PI / 2, 0, 0);
  };
  const disc = (x, y, z, r = 0.28) =>
    [-1, 1].forEach((sx) => {
      add(cyl, white, sx * x, y, z, r, 0.02, r, 0, 0, Math.PI / 2);
      add(G('star', starGeo), bodyD, sx * (x + 0.012), y, z, r * 0.62, r * 0.62, r * 0.62, 0, sx * Math.PI / 2, 0);
    });
  const rings = (y, z, x, r) =>
    [-1, 1].forEach((sx) => add(G('ring', () => new THREE.TorusGeometry(1, 0.18, 6, 18)), chrome, sx * x, y, z - 0.02, r * 1.05, r * 1.05, r));
  const grille = (y, z, w, h) => {
    add(rbox(w, h, 0.08, 0.03), black, 0, y, z);
    for (let i = -1; i <= 1; i++) add(box, chrome, 0, y + i * h * 0.28, z + 0.045, w * 0.9, h * 0.08, 0.02);
  };
  const driver = (y, z, helmet = body) => {
    add(rbox(0.5, 0.42, 0.34, 0.12), M(0x5a6a8a), 0, y, z);
    add(sph, helmet, 0, y + 0.42, z + 0.02, 0.27, 0.27, 0.27);
    add(sph, glass, 0, y + 0.42, z + 0.15, 0.2, 0.13, 0.15);
    add(box, white, 0, y + 0.6, z + 0.02, 0.06, 0.06, 0.4);
  };

  switch (id) {
    case 'bug': {
      add(sph, body, 0, 0.78, 0, 0.98, 0.62, 1.55);
      add(sph, glass, 0, 1.12, -0.12, 0.74, 0.5, 0.86);
      add(sph, body, 0, 1.2, -0.2, 0.7, 0.45, 0.7);
      add(rbox(1.9, 0.3, 3.0, 0.12), bodyD, 0, 0.5, 0);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => add(sph, body, sx * 0.86, 0.62, sz * 0.95, 0.32, 0.36, 0.55)));
      headlights(0.82, 1.42, 0.5, 0.19);
      tail(0.7, -1.52, 0.5);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => wheel(sx * 0.9, 0.42, sz * 0.95, 0.42, 0.34)));
      bumper(0.5, 1.5, 1.4);
      bumper(0.5, -1.5, 1.4);
      rings(0.82, 1.42, 0.5, 0.19);
      mirrors(0.86, 1.05, 0.55);
      plate(0.55, -1.62);
      exhaust(0.45, 0.42, -1.45);
      disc(0.96, 0.82, 0.05, 0.26);
      add(rbox(0.9, 0.06, 0.5, 0.03), chrome, 0, 1.45, -0.55); // багажник на крыше
      break;
    }
    case 'buggy': {
      add(rbox(1.5, 0.36, 3.1, 0.14), body, 0, 0.66, 0);
      add(rbox(1.2, 0.5, 1.0, 0.18), bodyD, 0, 0.95, -0.9);
      add(rbox(0.72, 0.62, 0.2, 0.08), white, 0, 1.12, -0.42); // спинка сиденья
      // каркас
      const bar = G('bar', () => new THREE.TorusGeometry(0.62, 0.07, 8, 20, Math.PI));
      add(bar, white, 0, 1.08, -0.35, 1, 1, 1, 0, 0, 0);
      add(G('bar2', () => new THREE.CylinderGeometry(0.06, 0.06, 1, 8)), white, -0.4, 1.3, -0.78, 1, 1, 1, -0.88, 0, 0);
      add(G('bar2', () => new THREE.CylinderGeometry(0.06, 0.06, 1, 8)), white, 0.4, 1.3, -0.78, 1, 1, 1, -0.88, 0, 0);
      add(rbox(1.3, 0.2, 0.7, 0.08), body, 0, 0.85, 1.25);
      headlights(0.9, 1.6, 0.45, 0.16);
      tail(0.8, -1.56, 0.45);
      wheel(-0.98, 0.5, 1.05, 0.46, 0.42);
      wheel(0.98, 0.5, 1.05, 0.46, 0.42);
      wheel(-1.02, 0.6, -1.0, 0.58, 0.52);
      wheel(1.02, 0.6, -1.0, 0.58, 0.52);
      driver(1.02, -0.12);
      add(cyl, white, 0, 0.62, 1.66, 0.07, 1.5, 0.07, 0, 0, Math.PI / 2); // передняя дуга
      [-1, 1].forEach((sx) => add(cyl, white, sx * 0.5, 0.72, 1.55, 0.06, 0.3, 0.06, 0.6, 0, 0));
      rings(0.9, 1.6, 0.45, 0.16);
      exhaust(-0.35, 0.85, -1.5);
      exhaust(0.35, 0.85, -1.5);
      // запаска сзади
      add(G('tire', () => new THREE.CylinderGeometry(1, 1, 1, 20).rotateZ(Math.PI / 2)), tire, 0, 1.25, -1.5, 0.3, 0.42, 0.42, 0, Math.PI / 2, 0);
      add(cyl, hub, 0, 1.25, -1.66, 0.2, 0.04, 0.2, Math.PI / 2, 0, 0);
      add(box, black, 0, 0.5, 0, 1.3, 0.12, 2.6); // днище
      add(sph, M(0xffb347, { emissive: 0xff9020, emissiveIntensity: 0.5 }), 0, 1.76, -0.35, 0.1, 0.1, 0.1); // маячок
      break;
    }
    case 'mini': {
      add(rbox(1.85, 0.72, 3.0, 0.3), body, 0, 0.82, 0);
      add(rbox(1.66, 0.7, 1.75, 0.26), glass, 0, 1.42, -0.2);
      add(rbox(1.72, 0.14, 1.85, 0.07), white, 0, 1.8, -0.2);
      add(rbox(0.5, 0.06, 2.0, 0.03), body, 0, 1.88, -0.2);
      add(rbox(1.9, 0.22, 0.3, 0.1), white, 0, 0.6, 1.47);
      add(rbox(1.9, 0.22, 0.3, 0.1), white, 0, 0.6, -1.47);
      headlights(0.98, 1.48, 0.58, 0.2);
      tail(0.98, -1.5, 0.62);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => wheel(sx * 0.9, 0.42, sz * 0.98, 0.42, 0.34)));
      bumper(0.6, 1.62, 1.7, white);
      grille(0.9, 1.51, 0.8, 0.26);
      rings(0.98, 1.48, 0.58, 0.2);
      mirrors(1.0, 1.25, 0.6);
      plate(0.88, -1.52);
      exhaust(-0.55, 0.5, -1.45);
      [-1, 1].forEach((sx) => {
        add(box, white, sx * 0.93, 0.95, 0, 0.02, 0.14, 2.4); // полоса по борту
        add(box, chrome, sx * 0.93, 1.1, 0.35, 0.03, 0.05, 0.22); // ручка двери
      });
      add(cyl, black, 0.6, 2.2, -0.9, 0.025, 0.7, 0.025); // антенна
      add(sph, M(0xff6b6b), 0.6, 2.56, -0.9, 0.08, 0.08, 0.08);
      break;
    }
    case 'pickup': {
      add(rbox(1.95, 0.7, 3.6, 0.22), body, 0, 0.95, 0);
      add(rbox(1.8, 0.75, 1.3, 0.24), body, 0, 1.6, 0.35);
      add(rbox(1.84, 0.46, 1.0, 0.16), glass, 0, 1.62, 0.42);
      add(rbox(1.6, 0.12, 1.5, 0.05), black, 0, 1.31, -1.05);
      add(rbox(2.0, 0.3, 0.35, 0.12), white, 0, 0.72, 1.75);
      add(rbox(1.6, 0.18, 0.12, 0.05), black, 0, 2.02, 0.3);
      headlights(1.08, 1.8, 0.62, 0.2);
      tail(1.0, -1.81, 0.68);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => wheel(sx * 0.98, 0.52, sz * 1.15, 0.52, 0.4)));
      grille(1.02, 1.81, 1.0, 0.36);
      rings(1.08, 1.8, 0.62, 0.2);
      mirrors(1.0, 1.55, 0.95);
      bumper(0.62, -1.82, 1.9);
      plate(0.9, -1.83);
      exhaust(0.7, 0.55, -1.7);
      [-1, 1].forEach((sx) => {
        add(rbox(0.12, 0.12, 1.6, 0.04), chrome, sx * 0.9, 1.36, -1.05); // борта кузова
        add(rbox(0.28, 0.08, 1.4, 0.03), black, sx * 1.02, 0.6, 0.0); // подножка
        add(box, chrome, sx * 0.91, 1.42, 0.6, 0.03, 0.05, 0.22); // ручка
      });
      for (let i = -1; i <= 1; i++) add(sph, M(0xffb347, { emissive: 0xff9020, emissiveIntensity: 0.6 }), i * 0.35, 2.02, 0.95, 0.09, 0.07, 0.07);
      break;
    }
    case 'sport': {
      add(rbox(1.95, 0.5, 3.9, 0.22), body, 0, 0.66, 0);
      add(sph, glass, 0, 1.0, -0.25, 0.72, 0.38, 1.1);
      add(rbox(1.7, 0.08, 1.4, 0.04), body, 0, 0.92, 1.1, 1, 1, 1, 0.12, 0, 0);
      add(rbox(1.9, 0.08, 0.5, 0.04), bodyD, 0, 1.25, -1.75);
      add(rbox(0.1, 0.4, 0.3, 0.04), bodyD, -0.75, 1.05, -1.72);
      add(rbox(0.1, 0.4, 0.3, 0.04), bodyD, 0.75, 1.05, -1.72);
      add(rbox(0.3, 0.04, 3.6, 0.02), white, 0, 0.92, 0);
      headlights(0.7, 1.9, 0.62, 0.16);
      tail(0.75, -1.95, 0.65);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => wheel(sx * 0.95, 0.4, sz * 1.22, 0.4, 0.38)));
      add(rbox(1.9, 0.08, 0.4, 0.03), black, 0, 0.45, 1.95); // губа
      add(rbox(1.0, 0.16, 0.06, 0.04), black, 0, 0.55, 1.97); // воздухозаборник
      rings(0.7, 1.9, 0.62, 0.16);
      mirrors(0.95, 1.02, 0.55);
      plate(0.6, -1.98);
      exhaust(-0.25, 0.48, -1.9);
      exhaust(0.25, 0.48, -1.9);
      disc(0.98, 0.7, 0.1, 0.24);
      [-1, 1].forEach((sx) => add(rbox(0.08, 0.2, 0.6, 0.04), black, sx * 0.97, 0.7, -0.75)); // боковые заборники
      break;
    }
    case 'rocket': {
      add(G('cap', () => new THREE.CapsuleGeometry(0.62, 2.5, 8, 18).rotateX(Math.PI / 2)), body, 0, 0.85, 0, 1.1, 0.95, 1);
      add(sph, glass, 0, 1.18, 0.78, 0.4, 0.24, 0.3); // ветровое стекло
      add(rbox(2.3, 0.1, 0.9, 0.04), bodyD, 0, 0.65, -1.0);
      add(rbox(0.1, 0.8, 0.8, 0.05), bodyD, 0, 1.55, -1.25, 1, 1, 1, -0.3, 0, 0);
      add(cyl, black, 0, 0.85, -1.95, 0.42, 0.3, 0.42, Math.PI / 2, 0, 0);
      add(cyl, M(0x9fe8ff, { emissive: 0x58c8ff, emissiveIntensity: 0.9 }), 0, 0.85, -2.08, 0.3, 0.06, 0.3, Math.PI / 2, 0, 0);
      add(rbox(1.2, 0.08, 0.3, 0.03), white, 0, 1.38, 1.4);
      headlights(0.8, 1.85, 0.32, 0.14);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => wheel(sx * 0.95, 0.42, sz * 1.1, 0.42, 0.34)));
      driver(0.9, 0.2, white);
      [-1, 1].forEach((sx) => {
        add(rbox(0.08, 0.7, 0.7, 0.04), bodyD, sx * 0.62, 1.05, -1.3, 1, 1, 1, 0, 0, sx * 0.5); // боковые плавники
        add(box, white, sx * 0.67, 0.95, 0.2, 0.02, 0.12, 1.8); // полоса
      });
      add(G('ring', () => new THREE.TorusGeometry(1, 0.18, 6, 18)), chrome, 0, 0.85, -1.82, 0.44, 0.44, 0.44);
      disc(0.68, 0.85, -0.5, 0.24);
      break;
    }
  }
  // статичные детали сливаем по материалу: деталей много, а вызовов отрисовки мало
  const byMat = new Map();
  for (const o of [...group.children]) {
    if (!o.isMesh) continue;
    o.updateMatrix();
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrix);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(g);
    group.remove(o);
  }
  for (const [mat, list] of byMat) {
    const merged = mergeGeometries(list);
    list.forEach((g) => g.dispose());
    if (merged) group.add(new THREE.Mesh(merged, mat));
  }
  // мягкая тень-блоб
  const shadow = new THREE.Mesh(G('blob', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), blobMat());
  shadow.scale.set(2.6, 1, 4.2);
  shadow.position.y = 0.04;
  shadow.renderOrder = 1;
  group.add(shadow);
  group.traverse((o) => (o.isMesh && o !== shadow ? (o.castShadow = false) : 0));
  const car = {
    id,
    group,
    wheels,
    mats,
    shadow,
    opacity: 1,
    setOpacity(a) {
      if (Math.abs(a - this.opacity) < 0.01) return;
      this.opacity = a;
      for (const m of mats) {
        // смена transparent меняет шейдер (OPAQUE), без needsUpdate альфа не применится
        if (m.transparent !== a < 0.99) m.needsUpdate = true;
        m.transparent = a < 0.99;
        m.opacity = a;
        // depthWrite оставляем: у полупрозрачной машинки не просвечивают колёса сквозь кузов
        m.depthWrite = true;
      }
      shadow.material.opacity = 0.32 * a;
    },
    spin(dist) {
      for (const w of wheels) w.g.children.forEach((c) => (c.rotation.x += dist / w.r));
    },
    steer(a) {
      for (const w of wheels) if (w.front) w.g.rotation.y = a;
    },
  };
  return car;
}

// обод со спицами по обе стороны колеса (ось X)
function rimGeo() {
  const parts = [];
  for (const sx of [-1, 1]) {
    parts.push(new THREE.TorusGeometry(0.56, 0.07, 6, 20).rotateY(Math.PI / 2).translate(sx * 0.5, 0, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      parts.push(new THREE.BoxGeometry(0.08, 0.52, 0.1).translate(0, 0.28, 0).rotateX(a).translate(sx * 0.5, 0, 0));
    }
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}
// звёздочка в кружке на борту (в плоскости XY, повернём при установке)
function starGeo() {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.42 : 1;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }).translate(0, 0, -0.01);
}

let blobTex = null;
function blobMat() {
  if (!blobTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 31);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.6, 'rgba(0,0,0,.6)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(c);
  }
  return new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.32, depthWrite: false, color: 0x203040 });
}
