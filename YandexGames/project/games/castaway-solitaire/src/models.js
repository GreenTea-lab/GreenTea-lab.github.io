import {WORLD_PROJECTS} from './world-data.js';
import {worldBuilding} from './world-models.js';
// Воксельные модели острова: пальмы, камни, обломки, постройки по стадиям, жители и звери.
// Один воксель = 1/10 мировой единицы. Модели строятся вокруг (0,0) по X/Z, низ — y=0, «лицом» к +Z.
import { Vox, glowC, hash, jitter } from './vox.js';

export const VS = 1 / 10;

export const C = {
  sand: 0xf3dca0,
  sandD: 0xe2c483,
  sandW: 0xd9bd84,
  grass: 0x86cf62,
  grassD: 0x6cba50,
  grassL: 0xa3dc74,
  rock: 0xb9b2a6,
  rockD: 0x948b80,
  rockL: 0xd3cdc2,
  trunk: 0xa77b52,
  trunkD: 0x8a6240,
  frond: 0x5fbf4a,
  frondD: 0x47a23d,
  frondL: 0x83d65e,
  coco: 0x7a5232,
  wood: 0xc48d5a,
  woodD: 0x97633b,
  woodL: 0xddb07e,
  plank: 0xd09a63,
  bamboo: 0xc9c06a,
  bambooD: 0xa59c4c,
  thatch: 0xe0bd6a,
  thatchD: 0xc49d4e,
  rope: 0xe8d6a8,
  cloth: 0xf4efe2,
  red: 0xe8685a,
  redD: 0xc24f45,
  blue: 0x5aa6e0,
  teal: 0x45bfb0,
  yellow: 0xf7cf4a,
  orange: 0xf29a3e,
  pink: 0xf59ab5,
  white: 0xffffff,
  dark: 0x4a3b36,
  iron: 0x7f8896,
  soil: 0x9a6a45,
  soilD: 0x7f5536,
  water: 0x7fd3ee,
  fire: glowC(0xffa53a),
  fireY: glowC(0xffe07a),
  lamp: glowC(0xfff0b0),
  leafBan: 0x74c94f,
};

const J = (c, a = 0.05) => (x, y, z) => jitter(c, x, y, z, a);
const pick = (arr) => (x, y, z) => arr[Math.floor(hash(x, y, z) * arr.length)];

// ---------- природа ----------
export function palm(seed = 1, h = 26) {
  const v = new Vox();
  const lean = (hash(seed, 1) - 0.5) * 0.5;
  const dirA = hash(seed, 2) * Math.PI * 2;
  const dx = Math.cos(dirA);
  const dz = Math.sin(dirA);
  let x = 0;
  let z = 0;
  for (let y = 0; y < h; y++) {
    const k = (y / h) ** 2 * 6 * (0.6 + Math.abs(lean));
    x = dx * k;
    z = dz * k;
    const c = y % 3 === 0 ? C.trunkD : C.trunk;
    const r = y < 3 ? 1.6 : 1.1;
    v.cyl(x, z, r, y, y, c);
  }
  const tx = Math.round(x);
  const tz = Math.round(z);
  const ty = h;
  v.box(tx - 1, ty - 1, tz - 1, tx + 1, ty, tz + 1, C.frondD);
  // кокосы
  for (const [cx, cz] of [[-1, 1], [1, 1], [0, -1]]) v.set(tx + cx, ty - 2, tz + cz, C.coco);
  // листья: дуги, свисающие вниз
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed, i) * 0.4;
    const len = 11 + Math.floor(hash(seed, i, 3) * 4);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let s = 0; s <= len; s++) {
      const px = tx + ca * s;
      const pz = tz + sa * s;
      const py = ty + 1 + Math.round(2.2 * Math.sin((s / len) * 2.2) - (s / len) ** 2 * 6);
      const col = s % 4 === 0 ? C.frondL : (i + s) % 3 ? C.frond : C.frondD;
      v.set(px, py, pz, col);
      // ширина листа: боковые пёрышки
      const w = s > 1 && s < len - 1 ? 1 + (s % 2) : 0;
      for (let k = 1; k <= w; k++) {
        v.set(px - sa * k, py - (k > 1 ? 1 : 0), pz + ca * k, col);
        v.set(px + sa * k, py - (k > 1 ? 1 : 0), pz - ca * k, col);
      }
    }
  }
  return v;
}

export function bush(seed = 1, big = false) {
  const v = new Vox();
  const n = big ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const x = (hash(seed, i, 1) - 0.5) * (big ? 7 : 5);
    const z = (hash(seed, i, 2) - 0.5) * (big ? 7 : 5);
    v.sphere(x, 2, z, 2.4 + hash(seed, i, 3) * 1.2, (xx, yy, zz) => (yy < 0 ? null : jitter(hash(xx, yy, zz) > 0.7 ? C.grassL : C.grassD, xx, yy, zz, 0.06)));
  }
  // цветы на кусте
  const fc = [C.pink, C.yellow, C.white, C.red][Math.floor(hash(seed, 9) * 4)];
  for (let i = 0; i < 4; i++) v.set(Math.round((hash(seed, i, 5) - 0.5) * 6), 4 + Math.round(hash(seed, i, 6) * 1.5), Math.round((hash(seed, i, 7) - 0.5) * 6), fc);
  return v;
}

export function flowers(seed = 1) {
  const v = new Vox();
  for (let i = 0; i < 6; i++) {
    const x = Math.round((hash(seed, i, 1) - 0.5) * 8);
    const z = Math.round((hash(seed, i, 2) - 0.5) * 8);
    v.set(x, 0, z, C.grassD);
    v.set(x, 1, z, C.grassD);
    v.set(x, 2, z, [C.pink, C.yellow, C.white, C.red, C.orange][Math.floor(hash(seed, i, 3) * 5)]);
  }
  return v;
}

export function rock(seed = 1, s = 1) {
  const v = new Vox();
  const n = 2 + Math.floor(hash(seed, 1) * 2);
  for (let i = 0; i < n; i++) {
    const x = (hash(seed, i, 2) - 0.5) * 5 * s;
    const z = (hash(seed, i, 3) - 0.5) * 5 * s;
    v.sphere(x, 0.5 * s, z, (2 + hash(seed, i, 4) * 1.6) * s, (xx, yy, zz) => (yy < -1 ? null : jitter(yy > 2 * s ? C.rockL : C.rock, xx, yy, zz, 0.05)));
  }
  return v;
}

export function shell(kind = 0) {
  const v = new Vox();
  if (kind === 0) {
    v.box(-1, 0, -1, 1, 0, 1, C.pink);
    v.set(0, 1, 0, C.pink);
    v.set(0, 0, 2, C.white);
  } else {
    // морская звезда
    const c = C.orange;
    v.set(0, 0, 0, c);
    for (const [x, z] of [[0, 2], [2, 0], [-2, 0], [1, -2], [-1, -2]]) {
      v.set(x, 0, z, c);
      v.set(Math.sign(x), 0, Math.sign(z), c);
    }
  }
  return v;
}

export function driftwood(seed = 1) {
  const v = new Vox();
  const len = 8 + Math.floor(hash(seed, 1) * 6);
  for (let i = 0; i < len; i++) v.box(i - len / 2, 0, Math.round(Math.sin(i * 0.5) * 0.6), i - len / 2, 1, Math.round(Math.sin(i * 0.5) * 0.6), i % 3 ? C.trunk : C.trunkD);
  v.box(len / 2 - 2, 2, 1, len / 2 - 2, 2, 2, C.trunkD);
  return v;
}

export function crate(open = false) {
  const v = new Vox();
  v.box(-3, 0, -3, 3, 5, 3, (x, y, z) => (Math.abs(x) === 3 || Math.abs(z) === 3) && (y === 0 || y === 5 || Math.abs(x) === Math.abs(z)) ? C.woodD : C.wood);
  if (open) v.box(-2, 5, -2, 2, 5, 2, null), v.box(-2, 4, -2, 2, 4, 2, C.yellow);
  return v;
}

export function barrel() {
  const v = new Vox();
  for (let y = 0; y <= 6; y++) v.cyl(0, 0, y === 0 || y === 6 ? 2.2 : 2.7, y, y, y === 1 || y === 5 ? C.iron : C.wood);
  return v;
}

// затонувший корабль на рифе (накренён, без мачты)
export function wreck() {
  const v = new Vox();
  const L = 34;
  for (let x = 0; x < L; x++) {
    const t = x / (L - 1);
    const w = Math.round(6 * Math.sin(Math.PI * (0.15 + 0.85 * t)) + 1);
    const top = 9 + (x > L - 8 ? 2 : 0);
    for (let y = 0; y <= top; y++) {
      const ww = Math.max(1, Math.round(w * (0.55 + 0.45 * (y / top))));
      for (const s of [-1, 1]) v.set(x - L / 2, y, s * ww, (x + y) % 5 === 0 ? C.woodD : y === top ? C.woodL : C.wood);
      if (y === 0) for (let z = -ww; z <= ww; z++) v.set(x - L / 2, y, z, C.woodD);
    }
    // дыра в борту
    if (x > 12 && x < 18) for (let y = 3; y < 7; y++) v.set(x - L / 2, y, w, null);
    if (x % 4 === 0 && x > 2 && x < L - 4) for (let z = -w + 1; z < w; z++) v.set(x - L / 2, top - 1, z, C.woodD);
  }
  // обломок мачты
  v.box(-2, 1, 0, -1, 15, 1, C.woodD);
  v.box(-1, 12, 1, 6, 12, 1, C.woodD);
  v.box(1, 6, 2, 5, 11, 2, C.cloth);
  return v;
}

// ---------- постройки по стадиям (s = 1..3) ----------
function thatchRoof(v, x0, x1, z0, z1, y0, c = C.thatch) {
  // пирамидальная соломенная крыша с бахромой
  let y = y0;
  while (x0 <= x1 && z0 <= z1) {
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) v.set(x, y, z, (x + z + y) % 3 === 0 ? C.thatchD : c);
    x0++;
    x1--;
    z0++;
    z1--;
    y++;
  }
  return y;
}
function fringe(v, x0, x1, z0, z1, y) {
  for (let x = x0; x <= x1; x += 2) {
    v.set(x, y - 1, z0, C.thatchD);
    v.set(x, y - 1, z1, C.thatchD);
  }
  for (let z = z0; z <= z1; z += 2) {
    v.set(x0, y - 1, z, C.thatchD);
    v.set(x1, y - 1, z, C.thatchD);
  }
}
function post(v, x, z, y0, y1, c = C.woodD) {
  v.box(x, y0, z, x, y1, z, c);
}
function lantern(v, x, y, z) {
  v.set(x, y, z, C.dark);
  v.set(x, y - 1, z, C.lamp);
  v.set(x, y - 2, z, C.dark);
}
function flowerPot(v, x, z, y = 0) {
  v.set(x, y, z, C.redD);
  v.set(x, y + 1, z, C.grassD);
  v.set(x, y + 2, z, [C.pink, C.yellow, C.white][Math.floor(hash(x, z) * 3)]);
}
function fish(v, x, y, z) {
  v.box(x, y, z, x, y - 2, z, C.blue);
  v.set(x, y - 3, z, C.teal);
}

const B = {};

B.hut = (s) => {
  const v = new Vox();
  if (s === 1) {
    // навес из пальмовых листьев на двух жердях и подстилка
    post(v, -8, -4, 0, 9);
    post(v, 8, -4, 0, 9);
    post(v, -8, 5, 0, 4);
    post(v, 8, 5, 0, 4);
    for (let z = -6; z <= 7; z++) {
      const y = Math.round(10 - (z + 6) * 0.45);
      for (let x = -10; x <= 10; x++) v.set(x, y, z, (x + z) % 4 === 0 ? C.frondD : (x * 3 + z) % 5 === 0 ? C.frondL : C.frond);
    }
    v.box(-5, 0, -2, 4, 0, 3, C.cloth);
    v.box(-5, 1, -2, -3, 1, 3, C.red);
    v.box(5, 0, 0, 6, 2, 1, C.woodD);
    return v;
  }
  // хижина на сваях
  const w = s === 3 ? 10 : 8;
  const d = s === 3 ? 8 : 7;
  for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d], [0, -d], [0, d]]) post(v, x, z, 0, 4, C.trunkD);
  v.box(-w - 1, 4, -d - 1, w + 1, 4, d + (s === 3 ? 6 : 1), (x, y, z) => ((x + 20) % 3 === 0 ? C.woodD : C.plank));
  // бамбуковые стены
  v.walls(-w, 5, -d, w, 11, d, (x, y, z) => ((Math.abs(x) + Math.abs(z)) % 2 ? C.bamboo : C.bambooD));
  // дверь и окна
  v.box(-2, 5, d, 2, 9, d, null);
  v.box(-2, 5, d, 2, 5, d, C.woodD);
  for (const sx of [-1, 1]) {
    v.box(sx * w, 7, -3, sx * w, 9, 2, null);
    v.box(sx * w, 6, -3, sx * w, 6, 2, C.woodD);
  }
  v.box(w - 5, 7, d, w - 2, 9, d, null);
  v.set(w - 5, 10, d, C.cloth), v.set(w - 4, 10, d, C.red), v.set(w - 3, 10, d, C.cloth), v.set(w - 2, 10, d, C.red);
  const top = thatchRoof(v, -w - 3, w + 3, -d - 3, d + 3, 12);
  fringe(v, -w - 3, w + 3, -d - 3, d + 3, 12);
  v.set(0, top, 0, C.thatchD);
  // лестница
  for (let y = 0; y < 4; y++) v.box(-1, y, d + 2 + (s === 3 ? 5 : 0) - y + 3, 1, y, d + 2 + (s === 3 ? 5 : 0) - y + 3, C.woodL);
  if (s === 3) {
    // крыльцо с перилами, гамак, фонарь и цветы
    for (let x = -w - 1; x <= w + 1; x += 2) post(v, x, d + 6, 5, 7, C.woodL);
    v.box(-w - 1, 7, d + 6, -3, 7, d + 6, C.woodL);
    v.box(3, 7, d + 6, w + 1, 7, d + 6, C.woodL);
    for (let z = d + 1; z <= d + 6; z += 5) post(v, -w - 1, z, 5, 11, C.woodD);
    lantern(v, w - 1, 11, d + 1);
    flowerPot(v, -w + 1, d + 3, 5);
    flowerPot(v, w - 1, d + 4, 5);
    // гамак между двумя столбами сбоку
    post(v, w + 6, -6, 0, 8, C.trunkD);
    post(v, w + 6, 6, 0, 8, C.trunkD);
    for (let z = -5; z <= 5; z++) {
      const y = 7 - Math.round(3 * Math.cos(((z + 5) / 10 - 0.5) * Math.PI));
      v.set(w + 6, y, z, (z + 20) % 2 ? C.red : C.yellow);
      v.set(w + 5, y, z, (z + 21) % 2 ? C.red : C.yellow);
    }
  }
  return v;
};

B.fire = (s) => {
  const v = new Vox();
  // кольцо камней
  for (let a = 0; a < 10; a++) {
    const x = Math.round(Math.cos((a / 10) * Math.PI * 2) * 3.5);
    const z = Math.round(Math.sin((a / 10) * Math.PI * 2) * 3.5);
    v.box(x, 0, z, x, a % 2, z, a % 3 ? C.rock : C.rockD);
  }
  v.box(-2, 0, 0, 2, 0, 0, C.trunkD);
  v.box(0, 0, -2, 0, 1, 2, C.trunk);
  v.set(0, 1, 0, C.fire);
  v.set(0, 2, 0, C.fire);
  v.set(1, 1, 0, C.fire);
  v.set(-1, 1, 1, C.fireY);
  v.set(0, 3, 0, C.fireY);
  if (s >= 2) {
    // вертел с рыбой и брёвна-скамейки
    post(v, -4, 0, 0, 5);
    post(v, 4, 0, 0, 5);
    v.box(-4, 5, 0, 4, 5, 0, C.woodL);
    fish(v, -1, 4, 0);
    fish(v, 1, 4, 0);
    v.box(-4, 0, 7, 4, 1, 8, C.trunk);
    v.box(-9, 0, -4, -8, 1, 4, C.trunk);
    v.box(8, 0, -4, 9, 1, 4, C.trunk);
  }
  if (s >= 3) {
    // кухня под навесом: стол, горшки, сушёная рыба
    for (const [x, z] of [[-14, -11], [-1, -11], [-14, -5], [-1, -5]]) post(v, x, z, 0, 10);
    v.box(-15, 10, -12, 0, 10, -4, (x, y, z) => ((x + z) % 3 ? C.frond : C.frondD));
    v.box(-15, 11, -10, 0, 11, -6, C.frondD);
    v.box(-12, 4, -10, -3, 4, -7, C.woodL);
    post(v, -12, -10, 0, 3, C.woodD);
    post(v, -3, -10, 0, 3, C.woodD);
    post(v, -12, -7, 0, 3, C.woodD);
    post(v, -3, -7, 0, 3, C.woodD);
    v.box(-11, 5, -9, -10, 6, -8, C.redD);
    v.box(-7, 5, -9, -6, 5, -8, C.yellow);
    v.set(-5, 5, -8, C.orange);
    v.box(-12, 9, -11, -3, 9, -11, C.rope);
    fish(v, -10, 8, -11);
    fish(v, -7, 8, -11);
    fish(v, -4, 8, -11);
    // бочка и связка бананов
    v.merge(barrel(), -17, 0, -6);
  }
  return v;
};

B.water = (s) => {
  const v = new Vox();
  if (s === 1) {
    v.merge(barrel(), 0, 0, 0);
    // воронка из листа
    for (let y = 7; y <= 9; y++) v.cyl(0, 0, 1.5 + (y - 7), y, y, C.frond, true);
    v.cyl(0, 0, 1.5, 7, 7, C.water);
    v.merge(barrel(), 6, 0, 3);
    v.set(-4, 0, 3, C.coco), v.set(-4, 0, 4, C.coco);
    return v;
  }
  if (s === 2) {
    // бамбуковый жёлоб со склона и корыто
    v.merge(barrel(), 7, 0, 4);
    v.box(-4, 0, -2, 4, 2, 2, C.woodD);
    v.box(-3, 2, -1, 3, 2, 1, C.water);
    for (let i = 0; i < 16; i++) {
      const z = -3 - i;
      const y = 5 + Math.round(i * 0.35);
      v.set(0, y, z, i % 3 ? C.bamboo : C.bambooD);
      if (i % 5 === 0) post(v, 0, z, 0, y - 1, C.trunkD);
    }
    v.box(0, 3, -2, 0, 5, -2, C.water);
    return v;
  }
  // каменный колодец с крышей и ведром
  v.cyl(0, 0, 4.5, 0, 4, (x, y, z) => jitter(y === 4 ? C.rockL : C.rock, x, y, z, 0.06), true);
  v.cyl(0, 0, 3.5, 0, 3, C.water);
  post(v, -4, 0, 0, 11);
  post(v, 4, 0, 0, 11);
  v.box(-4, 9, 0, 4, 9, 0, C.woodL);
  v.box(0, 5, 0, 0, 8, 0, C.rope);
  v.box(-1, 4, -1, 1, 5, 1, C.woodD);
  v.roofX(-6, 6, -4, 4, 12, C.thatch);
  // ручка
  v.set(5, 9, 0, C.woodD), v.set(6, 9, 0, C.woodD), v.set(6, 8, 0, C.woodD);
  v.merge(barrel(), 8, 0, 5);
  flowerPot(v, -6, 4);
  flowerPot(v, -7, 2);
  return v;
};

B.garden = (s) => {
  const v = new Vox();
  const bed = (x0, z0, plant) => {
    v.box(x0, 0, z0, x0 + 9, 0, z0 + 3, (x, y, z) => (x === x0 || x === x0 + 9 || z === z0 || z === z0 + 3 ? C.woodD : C.soil));
    for (let x = x0 + 1; x < x0 + 9; x += 2) {
      for (let z = z0 + 1; z <= z0 + 2; z++) {
        if (plant === 'sprout') v.set(x, 1, z, C.grassL);
        if (plant === 'carrot') v.set(x, 1, z, C.grassD), v.set(x, 2, z, C.grassL), z === z0 + 1 && v.set(x, 0, z, C.orange);
        if (plant === 'melon') z === z0 + 1 && (v.box(x, 1, z, x + 1, 2, z + 1, C.grassD), v.set(x, 3, z, C.grassL));
        if (plant === 'pine') z === z0 + 1 && (v.box(x, 1, z, x, 2, z, C.yellow), v.set(x, 3, z, C.grassD), v.set(x, 4, z, C.grassL));
      }
    }
  };
  bed(-10, -6, 'sprout');
  v.set(-12, 0, -4, C.iron), v.set(-12, 1, -4, C.blue);
  if (s >= 2) {
    bed(1, -6, 'carrot');
    bed(-10, 1, 'pine');
    // банановое дерево
    const bx = 7;
    const bz = 3;
    for (let y = 0; y < 12; y++) v.cyl(bx, bz, 1, y, y, y % 3 ? C.leafBan : C.grassD);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      for (let k = 1; k < 7; k++) v.set(bx + Math.cos(a) * k, 12 + Math.round(Math.sin((k / 7) * 2.5) * 2) - (k > 4 ? 1 : 0), bz + Math.sin(a) * k, k % 2 ? C.leafBan : C.frondL);
    }
    v.box(bx + 1, 9, bz, bx + 2, 10, bz + 1, C.yellow);
  }
  if (s >= 3) {
    bed(1, 1, 'melon');
    // забор и пугало
    for (let x = -13; x <= 13; x++) {
      if (Math.abs(x) <= 1) continue;
      v.set(x, 1, -9, C.woodL), v.set(x, 1, 7, C.woodL);
      if (x % 3 === 0) post(v, x, -9, 0, 3, C.woodD), post(v, x, 7, 0, 3, C.woodD);
    }
    for (let z = -9; z <= 7; z++) {
      v.set(-13, 1, z, C.woodL), v.set(13, 1, z, C.woodL);
      if (z % 3 === 0) post(v, -13, z, 0, 3, C.woodD), post(v, 13, z, 0, 3, C.woodD);
    }
    post(v, -2, -1, 0, 12, C.woodD);
    v.box(-5, 9, -1, 1, 9, -1, C.woodD);
    v.box(-3, 7, -1, -1, 10, -1, C.red);
    v.box(-3, 11, -2, -1, 13, 0, C.rope);
    v.box(-4, 14, -3, 0, 14, 1, C.thatch);
    v.box(-3, 15, -2, -1, 15, 0, C.thatch);
    v.set(-3, 12, 1, C.dark), v.set(-1, 12, 1, C.dark);
  }
  return v;
};

B.pier = (s) => {
  // строится от берега (z=0) в сторону моря (+z); y=0 — уровень песка, вода ниже
  const v = new Vox();
  const len = [0, 43, 61, 73][s];
  for (let z = 0; z < len; z++) {
    for (let x = -3; x <= 3; x++) v.set(x, 0, z, (z % 3 === 0 ? C.woodD : (x + z) % 5 === 0 ? C.woodL : C.plank));
    if (z % 6 === 0) {
      post(v, -4, z, -16, 2, C.trunkD);
      post(v, 4, z, -16, 2, C.trunkD);
    }
  }
  if (s >= 2) {
    v.box(-6, 0, len - 8, 6, 0, len - 1, (x, y, z) => ((x + z) % 3 ? C.plank : C.woodD));
    // удочка, ведро, ящик
    v.box(5, 1, len - 4, 5, 1, len - 3, C.woodD);
    for (let i = 0; i < 10; i++) v.set(5 + Math.round(i * 0.4), 2 + i, len - 3 + Math.round(i * 0.6), C.woodD);
    for (let y = 2; y < 11; y++) v.set(9, y, len + 3, y === 2 ? C.red : C.white);
    v.box(-5, 1, len - 6, -3, 3, len - 4, C.iron);
    v.set(-4, 3, len - 5, C.blue);
    v.merge(crate(), -3, 1, len - 11);
  }
  if (s >= 3) {
    // каноэ у причала и фонарный столб
    for (let z = 0; z < 22; z++) {
      const w = Math.round(2.4 * Math.sin((Math.PI * (z + 0.5)) / 22));
      for (let x = -w; x <= w; x++) v.set(x + 10, -2, z + len - 26, C.red);
      v.set(-w + 10, -1, z + len - 26, C.redD);
      v.set(w + 10, -1, z + len - 26, C.redD);
    }
    v.box(10, -1, len - 18, 10, -1, len - 10, C.woodL);
    v.box(8, 0, len - 14, 12, 0, len - 14, C.woodD);
    post(v, -4, len - 1, 0, 14, C.woodD);
    v.box(-4, 14, len - 1, -2, 14, len - 1, C.woodD);
    lantern(v, -2, 13, len - 1);
  }
  return v;
};

B.lookout = (s) => {
  const v = new Vox();
  // высокая пальма-основа
  const h = 38;
  for (let y = 0; y < h; y++) v.cyl(0, 0, y < 3 ? 1.8 : 1.3, y, y, y % 3 === 0 ? C.trunkD : C.trunk);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    for (let k = 0; k < 12; k++) v.set(Math.cos(a) * k, h + 1 + Math.round(2 * Math.sin(k / 5) - (k / 12) ** 2 * 5), Math.sin(a) * k, k % 3 ? C.frond : C.frondD);
  }
  // верёвочная лестница
  for (let y = 0; y < (s === 1 ? 24 : 30); y++) {
    v.set(-1, y, 2, C.rope);
    v.set(1, y, 2, C.rope);
    if (y % 3 === 0) v.set(0, y, 2, C.woodL);
  }
  if (s >= 2) {
    const py = 30;
    v.box(-6, py, -6, 6, py, 6, (x, y, z) => ((x + z) % 3 ? C.plank : C.woodD));
    for (let x = -6; x <= 6; x += 3) post(v, x, -6, py + 1, py + 3, C.woodL), post(v, x, 6, py + 1, py + 3, C.woodL);
    for (let z = -6; z <= 6; z += 3) post(v, -6, z, py + 1, py + 3, C.woodL), post(v, 6, z, py + 1, py + 3, C.woodL);
    v.box(-6, py + 3, -6, 6, py + 3, -6, C.woodL), v.box(-6, py + 3, 6, 6, py + 3, 6, C.woodL);
    v.box(-6, py + 3, -6, -6, py + 3, 6, C.woodL), v.box(6, py + 3, -6, 6, py + 3, 6, C.woodL);
    // подпорки
    for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) for (let k = 0; k < 5; k++) v.set(x * (k / 5), py - 1 - k, z * (k / 5), C.woodD);
  }
  if (s >= 3) {
    // флаг, подзорная труба и сундук
    post(v, 5, 5, 31, 48, C.woodD);
    v.box(6, 43, 5, 12, 47, 5, (x, y) => (y === 45 ? C.white : C.red));
    v.box(-4, 31, -2, -4, 33, -2, C.woodD);
    v.box(-4, 34, -4, -4, 34, 0, C.yellow);
    v.box(-3, 31, 3, -1, 32, 4, C.woodD);
    v.set(-2, 33, 3, C.yellow);
  }
  return v;
};

B.workshop = (s) => {
  const v = new Vox();
  // верстак, пила, брёвна
  v.box(-5, 4, -2, 5, 4, 2, C.woodL);
  for (const [x, z] of [[-5, -2], [5, -2], [-5, 2], [5, 2]]) post(v, x, z, 0, 3);
  v.box(-2, 5, 0, 3, 5, 0, C.iron);
  v.box(3, 5, 0, 4, 5, 0, C.woodD);
  v.box(-9, 0, 4, 9, 1, 6, (x) => (x % 4 === 0 ? C.trunkD : C.trunk));
  v.box(-7, 2, 5, 7, 3, 5, C.trunk);
  if (s >= 2) {
    // навес и стойка с инструментами
    for (const [x, z] of [[-10, -7], [10, -7], [-10, 8], [10, 8]]) post(v, x, z, 0, 11);
    v.box(-12, 12, -9, 12, 12, 10, (x, y, z) => ((x + z) % 3 ? C.frond : C.frondD));
    v.box(-12, 13, -5, 12, 13, 6, C.frondD);
    v.box(-8, 0, -7, 8, 9, -7, C.plank);
    for (let x = -6; x <= 6; x += 3) {
      v.box(x, 4, -6, x, 7, -6, C.woodD);
      v.set(x, 7, -5, C.iron);
    }
    v.set(7, 5, -6, C.red), v.set(7, 6, -6, C.red);
  }
  if (s >= 3) {
    // точильный круг, бочка, ящики и дверца-склад
    v.cyl(-14, 3, 2.5, 0, 0, C.rock);
    v.box(-14, 1, 3, -14, 5, 3, C.woodD);
    v.box(-15, 3, 1, -13, 6, 1, C.rockL);
    v.box(-15, 3, 0, -15, 6, 0, C.rockD);
    v.merge(crate(), 14, 0, 4);
    v.merge(crate(true), 14, 0, -3);
    v.merge(barrel(), 14, 6, 4);
    lantern(v, 0, 11, 8);
  }
  return v;
};

B.farm = (s) => {
  const v = new Vox();
  // загон
  for (let x = -12; x <= 12; x++) {
    v.set(x, 2, -9, C.woodL);
    v.set(x, 2, 9, C.woodL);
    if (x % 4 === 0) post(v, x, -9, 0, 3), post(v, x, 9, 0, 3);
  }
  for (let z = -9; z <= 9; z++) {
    v.set(-12, 2, z, C.woodL);
    if (Math.abs(z) > 2) v.set(12, 2, z, C.woodL);
    if (z % 3 === 0) post(v, -12, z, 0, 3), Math.abs(z) > 2 && post(v, 12, z, 0, 3);
  }
  // кормушка и сено
  v.box(-9, 0, -6, -4, 2, -5, C.woodD);
  v.box(-8, 2, -6, -5, 2, -5, C.thatch);
  v.box(6, 0, -7, 9, 3, -4, C.thatch);
  if (s >= 2) {
    // поилка
    v.box(-9, 0, 4, -5, 1, 6, C.woodD);
    v.box(-8, 1, 5, -6, 1, 5, C.water);
  }
  if (s >= 3) {
    // курятник на ножках
    for (const [x, z] of [[2, 2], [9, 2], [2, 7], [9, 7]]) post(v, x, z, 0, 3);
    v.box(2, 4, 2, 9, 9, 7, (x, y, z) => ((x + y) % 2 ? C.woodL : C.wood));
    v.box(5, 4, 7, 6, 6, 7, C.dark);
    v.roofX(1, 10, 1, 8, 10, C.red);
    for (let k = 0; k < 4; k++) v.set(5 + (k % 2), 3 - k, 8 + k, C.woodD);
  }
  return v;
};

B.beacon = (s) => {
  const v = new Vox();
  if (s === 1) {
    // каменная пирамида и сигнальный костёр
    for (let y = 0; y < 6; y++) v.cyl(0, 0, 5 - y * 0.7, y, y, J(y % 2 ? C.rock : C.rockD, 0.06));
    v.box(-1, 6, -1, 1, 7, 1, C.trunk);
    v.set(0, 8, 0, C.fire), v.set(0, 9, 0, C.fireY);
    v.box(4, 0, 4, 7, 2, 7, C.trunk);
    return v;
  }
  const h = s === 2 ? 22 : 36;
  for (let y = 0; y <= h; y++) {
    const r = 6 - (y / h) * 2;
    const band = s === 3 && Math.floor(y / 6) % 2 === 1;
    v.cyl(0, 0, r, y, y, J(band ? C.red : C.white, 0.03), true);
  }
  v.cyl(0, 0, 6.5, 0, 0, C.rockD);
  v.box(-1, 1, 5, 1, 4, 6, C.woodD);
  for (let y = 8; y < h - 2; y += 9) v.set(0, y, 5 - Math.round(y / h * 2), C.lamp);
  if (s === 2) {
    // строительные леса
    for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) post(v, x, z, 0, h + 3, C.woodL);
    for (let y = 6; y < h; y += 7) v.box(-7, y, 7, 7, y, 7, C.woodL), v.box(-7, y, -7, 7, y, -7, C.woodL);
    return v;
  }
  // фонарь маяка
  v.cyl(0, 0, 5.5, h + 1, h + 1, C.dark);
  for (let y = h + 2; y <= h + 5; y++) v.cyl(0, 0, 3.5, y, y, (x, yy, z) => (Math.abs(x) === Math.abs(z) ? C.dark : C.lamp), true);
  v.cyl(0, 0, 2.5, h + 2, h + 5, C.lamp);
  for (let k = 0; k < 4; k++) v.cyl(0, 0, 4.5 - k * 1.2, h + 6 + k, h + 6 + k, C.redD);
  v.set(0, h + 10, 0, C.yellow);
  // балкон
  v.cyl(0, 0, 5.5, h - 2, h - 2, C.dark);
  return v;
};

B.ship = (s) => {
  const v = new Vox();
  const L = 44;
  // стапель
  for (let x = -L / 2 - 2; x <= L / 2 + 2; x += 6) v.box(x, 0, -5, x + 1, 1, 5, C.woodD);
  const y0 = 2;
  for (let x = 0; x < L; x++) {
    const t = x / (L - 1);
    const w = Math.round(7 * Math.sin(Math.PI * (0.12 + 0.88 * t)) ** 0.8 + 0.5);
    const X = x - L / 2;
    // киль
    v.set(X, y0, 0, C.woodD);
    const hgt = 9 + (x < 5 ? 2 : 0) + (x > L - 7 ? 3 : 0);
    if (s === 1) {
      // шпангоуты
      if (x % 5 === 2)
        for (let y = 0; y <= hgt; y++) {
          const ww = Math.round(w * Math.sqrt(y / hgt));
          v.set(X, y0 + y, ww, C.woodL);
          v.set(X, y0 + y, -ww, C.woodL);
        }
      continue;
    }
    for (let y = 0; y <= hgt; y++) {
      const ww = Math.round(w * Math.sqrt(y / hgt));
      const col = y === hgt ? C.woodD : s === 3 && y > hgt - 3 ? C.white : s === 3 && y < 3 ? C.red : (x + y) % 6 === 0 ? C.woodD : C.wood;
      if (s === 2 && x > L - 14 && y > 4) continue; // недостроенная корма
      v.set(X, y0 + y, ww, col);
      v.set(X, y0 + y, -ww, col);
      if (y === 0) for (let z = -ww; z <= ww; z++) v.set(X, y0, z, C.woodD);
    }
    if (s === 3) for (let z = -w + 1; z < w; z++) v.set(X, y0 + hgt - 1, z, C.plank);
  }
  if (s === 3) {
    // мачта, парус, флажок, руль
    v.box(-2, y0 + 8, 0, -1, y0 + 46, 1, C.woodD);
    for (let y = 0; y < 30; y++) {
      const w = Math.round(14 * (1 - y / 34));
      for (let x = 0; x < w; x++) v.set(-1 + x - Math.round(w / 2) + 6, y0 + 14 + y, 2, (y + Math.floor(x / 5)) % 9 === 0 ? C.cloth : C.white);
    }
    v.box(-4, y0 + 44, 0, 4, y0 + 44, 0, C.woodD);
    v.box(0, y0 + 46, 1, 6, y0 + 48, 1, C.red);
    v.box(L / 2 - 4, y0 + 12, -1, L / 2 - 4, y0 + 16, 1, C.woodD);
    v.box(L / 2 - 5, y0 + 15, 0, L / 2 - 3, y0 + 15, 0, C.woodL);
    lantern(v, L / 2 - 2, y0 + 17, 0);
  } else if (s === 2) {
    v.box(-2, y0 + 8, 0, -1, y0 + 20, 1, C.woodD);
  }
  return v;
};

for(const p of WORLD_PROJECTS)B[p.id]=s=>worldBuilding(p.kind,s,C);
export const BUILD = B;

// ---------- жители и звери ----------
export function person(look) {
  const v = new Vox();
  const { shirt, hair, skin = 0xf3c9a1, pants = 0x5a6e9a, hat = null, beard = false } = look;
  const shoe = 0x6b4a32;
  v.box(1, 0, 2, 1, 0, 3, shoe);
  v.box(3, 0, 2, 3, 0, 3, shoe);
  v.box(1, 1, 2, 1, 2, 2, pants);
  v.box(3, 1, 2, 3, 2, 2, pants);
  v.box(1, 3, 1, 3, 5, 3, shirt);
  v.set(2, 3, 3, pants);
  v.box(0, 4, 2, 0, 5, 2, shirt);
  v.box(4, 4, 2, 4, 5, 2, shirt);
  v.set(0, 3, 2, skin);
  v.set(4, 3, 2, skin);
  v.box(0, 6, 0, 4, 10, 4, skin);
  v.box(0, 11, 0, 4, 11, 4, hair);
  v.box(0, 7, 0, 4, 10, 0, hair);
  v.box(0, 9, 1, 0, 10, 4, hair);
  v.box(4, 9, 1, 4, 10, 4, hair);
  v.box(1, 10, 4, 3, 10, 4, hair);
  v.set(1, 7, 4, 0x2a2430);
  v.set(1, 8, 4, 0x2a2430);
  v.set(3, 7, 4, 0x2a2430);
  v.set(3, 8, 4, 0x2a2430);
  v.set(0, 7, 4, 0xf6b8b0);
  v.set(4, 7, 4, 0xf6b8b0);
  if (beard) {
    v.box(1, 6, 4, 3, 6, 4, hair);
    v.box(0, 6, 3, 0, 7, 3, hair);
    v.box(4, 6, 3, 4, 7, 3, hair);
  }
  if (hat === 'straw') {
    v.box(-1, 12, -1, 5, 12, 5, C.thatch);
    v.box(0, 13, 0, 4, 13, 4, C.thatchD);
    v.box(1, 14, 1, 3, 14, 3, C.thatch);
  } else if (hat === 'captain') {
    v.box(0, 12, 0, 4, 13, 4, 0x2f3e66);
    v.box(0, 12, 4, 4, 12, 5, 0x222a44);
    v.set(2, 13, 4, C.yellow);
  } else if (hat === 'flower') {
    v.set(4, 11, 3, C.pink);
    v.set(4, 11, 4, C.yellow);
  }
  return v;
}

export const PEOPLE = [
  { id: 'robin', nameRU:'Робинзон',nameEN:'Robinson',look: { shirt: 0xf2efe6, hair: 0x7a5232, pants: 0x5a7fb0, hat: 'straw', beard: true }, from: 0, lines:{ru:['Привет! Осваиваюсь на острове.','Тут ещё столько дел!'],en:['Hello! I’m settling in.','So much to do on this island!']} },
  { id: 'mila', nameRU:'Мила',nameEN:'Mila',look: { shirt: 0xf59ab5, hair: 0x3d2b22, pants: 0x46b3a6, hat: 'flower', skin: 0xe8b48a }, from: 0, lines:{ru:['Как тихо у берега.','Хочу посадить здесь цветы.'],en:['It’s so quiet on the shore.','I’d love to plant flowers here.']} },
  { id: 'cap', look: { shirt: 0x5a8fd6, hair: 0xdedede, pants: 0x3c4660, hat: 'captain', beard: true }, from: 9 },
  { id: 'kid', nameRU:'Тим',nameEN:'Tim',child:true,look: { shirt: 0xf7cf4a, hair: 0xb06a3a, pants: 0x6aaa58 }, from: 5, lines:{ru:['Я нашёл ракушку!','Давай посмотрим на попугая!'],en:['I found a shell!','Let’s go see the parrot!']} },
  { id: 'kid2', nameRU:'Лея',nameEN:'Leah',child:true,look: { shirt: 0x98a6f5, hair: 0x594335, pants: 0xe28261, hat:'flower' }, from: 12, lines:{ru:['А ты видел обезьянок?','Можно я побегаю у моря?'],en:['Have you seen the monkeys?','Can I run by the sea?']} },
  { id: 'lina', look: { shirt: 0xf0b475, hair: 0x402c25, pants: 0x376b87, hat:'flower',skin:0xc68c60 }, from: 27 },
  { id: 'omar', look: { shirt: 0x64a6a4, hair: 0x352c28, pants: 0xd2b17b, hat:'straw',skin:0xb47b50 }, from: 42 },
  { id: 'iris', look: { shirt: 0x998bc6, hair: 0xede1c9, pants: 0x416c87, hat:'flower' }, from: 57 },
  { id:'fisher',nameRU:'Рыбак Ян',nameEN:'Fisher Jan',requires:['boathouse',2],from:0,look:{shirt:0x68a9b6,hair:0x5d4435,pants:0xb18a58,hat:'straw',beard:true}},
  { id:'cook',nameRU:'Повар Роза',nameEN:'Cook Rosa',requires:['smokehouse',2],from:0,look:{shirt:0xffdfb9,hair:0x633a2b,pants:0x8d5979,hat:'flower'}},
  { id:'reader',nameRU:'Библиотекарь Нина',nameEN:'Librarian Nina',requires:['library',2],from:0,look:{shirt:0x9995d1,hair:0xd1c2a4,pants:0x456d71}},
  { id:'ranger',nameRU:'Следопыт Эрик',nameEN:'Ranger Eric',requires:['aviary',2],from:0,look:{shirt:0x7f9c56,hair:0x654730,pants:0xc59465,hat:'straw'}},
  { id: 'leo', look: { shirt: 0xe39775, hair: 0x66503b, pants: 0x536f62, hat:'captain',beard:true }, from: 72 },
];

export function parrot() {
  const v = new Vox();
  v.box(0, 0, 0, 1, 2, 1, C.red);
  v.box(0, 3, 0, 1, 4, 2, C.red);
  v.set(0, 4, 3, C.yellow);
  v.set(1, 4, 3, C.yellow);
  v.set(0, 3, 3, C.dark);
  v.box(-1, 1, 0, -1, 2, 1, C.blue);
  v.box(2, 1, 0, 2, 2, 1, C.blue);
  v.box(0, -2, -1, 1, -1, -1, C.teal);
  v.set(0, 4, 2, C.white);
  v.set(1, 4, 2, C.white);
  return v;
}

export function wingBird() {
  // чайка: тело + крылья (крылья машут через масштаб по Y)
  const v = new Vox();
  v.box(-1, 0, -2, 1, 1, 2, C.white);
  v.set(0, 1, 3, C.white);
  v.set(0, 1, 4, C.orange);
  v.box(-1, 0, -3, 1, 0, -3, 0xb0b8c4);
  return v;
}
export function wing(side) {
  const v = new Vox();
  for (let i = 1; i <= 5; i++) v.box(side * i, 0, -1, side * i, 0, i < 4 ? 1 : 0, i === 5 ? 0x8f99a8 : C.white);
  return v;
}

export function crab() {
  const v = new Vox();
  v.box(-2, 0, -1, 2, 1, 1, C.red);
  v.set(-1, 2, 1, C.dark), v.set(1, 2, 1, C.dark);
  v.set(-3, 1, 2, C.redD), v.set(3, 1, 2, C.redD);
  v.set(-3, 0, 0, C.redD), v.set(3, 0, 0, C.redD), v.set(-3, 0, -1, C.redD), v.set(3, 0, -1, C.redD);
  return v;
}

export function goat() {
  const v = new Vox();
  v.box(-1, 2, -3, 1, 4, 2, C.white);
  for (const [x, z] of [[-1, -3], [1, -3], [-1, 2], [1, 2]]) v.box(x, 0, z, x, 1, z, 0xd9d2c4);
  v.box(-1, 4, 3, 1, 6, 5, C.white);
  v.set(-1, 7, 3, 0x9a8a78), v.set(1, 7, 3, 0x9a8a78);
  v.set(-1, 5, 6, C.dark), v.set(1, 5, 6, C.dark);
  v.set(0, 3, 5, 0xd9d2c4);
  v.set(0, 3, -4, 0xd9d2c4);
  return v;
}

export function chicken() {
  const v = new Vox();
  v.box(-1, 1, -1, 1, 3, 1, C.white);
  v.box(0, 3, 1, 0, 4, 2, C.white);
  v.set(0, 5, 2, C.red);
  v.set(0, 4, 3, C.orange);
  v.set(0, 0, 0, C.orange);
  return v;
}

export function turtle() {
  const v = new Vox();
  v.box(-3, 0, -3, 3, 1, 3, 0x749754);
  v.box(-3, 2, -2, 3, 2, 2, 0x588647);
  v.box(-2, 3, -2, 2, 3, 2, (x,y,z)=>(x+z)%2===0?0x88b85a:0x709e51);
  v.box(-1, 4, -1, 1, 4, 1, 0x7ea747);
  v.set(0,0,-4,0xa5c77a);
  return v;
}
export function turtleHead() {
  const v=new Vox();
  v.box(-1,0,0,1,1,2,0xa5c77a);
  v.set(-1,1,2,C.dark);
  v.set(1,1,2,C.dark);
  v.set(0,0,3,0x88ac63);
  return v;
}
export function turtleFlipper(side, rear) {
  const v=new Vox();
  const span=rear?2:3;
  for(let x=0;x<=span;x++){
    v.set(x*side,0,-Math.floor(x/2),x===span?0x7da85e:0xa5c77a);
    if(x<span)v.set(x*side,0,1-Math.floor(x/2),0x8eb870);
  }
  return v;
}
export function monkey() {
  const v=new Vox(),brown=0x895738,skin=0xdcb287;
  v.box(-2,2,-1,2,5,1,brown);
  v.box(-1,3,2,1,5,2,skin);
  v.box(-2,6,-1,2,9,2,0x996744);
  v.box(-1,6,3,1,8,3,skin);
  for(const side of [-1,1]){
    v.box(side*3,7,0,side*3,8,1,skin);
    v.box(side*3,2,0,side*3,5,1,brown);
    v.set(side*3,2,1,skin);
    v.box(side,0,0,side,1,1,brown);
    v.set(side,8,3,C.dark);
  }
  v.set(0,6,3,0x673e2a);
  v.box(0,2,-4,0,2,-2,brown);
  v.box(0,3,-5,0,5,-5,brown);
  v.set(0,5,-4,brown);
  return v;
}

export function scaffold(r = 10, h = 12) {
  const v = new Vox();
  for (const [x, z] of [[-r, -r], [r, -r], [-r, r], [r, r]]) post(v, x, z, 0, h, C.woodL);
  for (let y = 4; y <= h; y += 4) {
    v.box(-r, y, -r, r, y, -r, C.woodL);
    v.box(-r, y, r, r, y, r, C.woodL);
    v.box(-r, y, -r, -r, y, r, C.woodL);
    v.box(r, y, -r, r, y, r, C.woodL);
  }
  return v;
}

export function cloud(seed) {
  const v = new Vox();
  const n = 3 + Math.floor(hash(seed, 1) * 4);
  for (let i = 0; i < n; i++) {
    const x = (hash(seed, i, 2) - 0.5) * 10;
    const z = (hash(seed, i, 3) - 0.5) * 6;
    const r = 2 + hash(seed, i, 4) * 2.5;
    v.sphere(x, 0, z, r, (xx, yy) => (yy < -1 ? null : yy > 1 ? 0xffffff : 0xf1f4fb));
  }
  return v;
}

// New island companions, in the same voxel scale as the original animals.
export function hedgehog(){
 const v=new Vox();v.box(-2,1,-3,2,3,1,0x795a43);v.box(-1,4,-2,1,4,0,0x92735a);
 // Alternating light-tipped spines, pale face and small dark paws.
 for(let z=-3;z<=1;z++)for(let x=-2;x<=2;x++)if((x+z)%2===0)v.set(x,Math.abs(x)<2?4:3,z,0xc5ad86);
 v.box(-1,1,2,1,2,3,0xe3c79f);v.set(0,1,4,C.dark);v.set(-1,2,3,C.dark);v.set(1,2,3,C.dark);
 for(const x of[-1,1])for(const z of[-2,1])v.set(x,0,z,0x594232);return v;
}
export function squirrel(){
 const v=new Vox();v.box(-1,1,-1,1,4,1,0xb96932);v.box(0,2,2,0,4,2,0xf0cf99);v.box(-1,4,1,1,6,3,0xd7843e);
 for(const x of[-1,1]){v.set(x,7,1,0xb96932);v.set(x,5,3,C.dark);v.box(x,0,0,x,0,2,0x8f4c2c);}v.set(0,4,4,0x51392c);
 v.box(-1,2,-3,1,5,-2,0xa9592d);v.box(-2,5,-4,1,8,-3,0xd7843e);v.box(-1,8,-3,1,9,-2,0xe5a15d);return v;
}
export function dog(){
 const v=new Vox();v.box(-2,3,-3,2,5,3,0xbc8b51);for(const x of [-2,2])for(const z of [-2,2])v.box(x,0,z,x,2,z,0x8c623b);
 v.box(-2,5,3,2,7,5,0xc99d66);v.box(-1,5,6,1,6,7,0xe6c899);v.set(0,6,8,C.dark);for(const x of [-2,2]){v.set(x,7,6,C.dark);v.box(x,5,3,x,7,4,0x795137);}v.box(0,5,-5,0,7,-4,0xbc8b51);return v;
}
export function rabbit(){
 const v=new Vox();v.box(-2,1,-2,2,3,2,0xd6bba4);v.box(-1,3,2,1,5,4,0xe3cdb9);
 for(const x of [-1,1]){v.box(x,6,2,x,9,3,0xe3cdb9);v.set(x,7,3,0xd99f9f);v.set(x,4,5,C.dark);v.box(x,0,1,x,0,3,0xe3cdb9);}v.set(0,3,5,0xd99999);v.set(0,2,-3,C.white);return v;
}
export function deer(){
 const v=new Vox();v.box(-2,4,-3,2,6,3,0xc69766);for(const x of[-2,2])for(const z of[-2,2])v.box(x,0,z,x,3,z,0x8d633d);
 v.box(-1,6,3,1,10,4,0xc69766);v.box(-1,9,4,1,11,6,0xd5aa7c);v.set(0,9,7,C.dark);v.set(-1,10,7,C.dark);v.set(1,10,7,C.dark);
 for(const x of[-2,2]){v.set(x,11,4,0xb88652);v.box(x,12,3,x,15,3,0x936a40);v.set(x*2,14,3,0x936a40);}v.set(0,5,-4,0xe9d5b6);return v;
}
export function duck(){const v=new Vox();v.box(-2,1,-2,2,3,2,0xe4d0a1);v.box(-1,3,2,1,5,3,0x4e8f64);v.box(-1,3,4,1,3,5,0xeeb15b);v.set(-1,4,4,C.dark);v.set(1,4,4,C.dark);v.box(-1,0,1,1,0,2,0xeeb15b);v.set(0,3,-3,0xb6a17d);return v;}
