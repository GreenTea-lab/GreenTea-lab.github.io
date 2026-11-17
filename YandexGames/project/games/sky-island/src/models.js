// Воксельные модели зданий, декора, жителей и прочего. Клетка = 12 вокселей, рабочая зона 1..10
import { Vox, glowC, hash, jitter } from './vox.js';

export const P = {
  cream: 0xf6e7c8,
  pink: 0xf7c3c4,
  peach: 0xf9d3b0,
  blue: 0xc7ddf3,
  mint: 0xc9ecd6,
  lilac: 0xdcd0f3,
  wood: 0xc58a5a,
  woodD: 0x96643f,
  woodL: 0xdcae7c,
  roofR: 0xe57f6c,
  roofT: 0x63bfb4,
  roofB: 0x78a6e3,
  roofP: 0xa98fdc,
  roofO: 0xf0a65a,
  stone: 0xcfc9c0,
  stoneD: 0xa8a199,
  leaf: 0x7ccc6a,
  leafD: 0x5fb257,
  leafL: 0x9bdc7c,
  soil: 0xa8754e,
  wheat: 0xf3d36b,
  crop: 0x86d36a,
  win: glowC(0xffe6a0),
  door: 0x8a5a3c,
  gold: 0xf6c94a,
  white: 0xffffff,
  water: 0x8fd6f2,
  iron: 0x7e8794,
  ice: 0xcdeffd,
  iceD: 0x9fd9f2,
  lava: glowC(0xff7b2e),
  dark: 0x5a4a48,
  red: 0xe56b6b,
  snow: 0xf7fbff,
  sand: 0xf1d38e,
  cyan: glowC(0x8ff3ff),
};

const tier = (l) => (l <= 3 ? 1 : l <= 6 ? 2 : l <= 9 ? 3 : 4);

// ---------- Общий дом ----------
function house(v, o) {
  const { x0, z0, w, d, floors, wall, roof, base = P.stone, fh = 5 } = o;
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  let y = 0;
  // фундамент
  v.box(x0, 0, z0, x1, 0, z1, base);
  y = 1;
  for (let f = 0; f < floors; f++) {
    const fw = typeof wall === 'function' ? wall(f) : wall;
    v.walls(x0, y, z0, x1, y + fh - 1, z1, fw);
    // угловые балки
    for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) v.box(cx, y, cz, cx, y + fh - 1, cz, P.woodD);
    // окна
    const wy = y + 2;
    for (let x = x0 + 2; x <= x1 - 2; x += 3) {
      v.box(x, wy, z1, x, wy + 1, z1, P.win);
      v.box(x, wy, z0, x, wy + 1, z0, P.win);
    }
    for (let z = z0 + 2; z <= z1 - 2; z += 3) {
      v.box(x0, wy, z, x0, wy + 1, z, P.win);
      v.box(x1, wy, z, x1, wy + 1, z, P.win);
    }
    if (f > 0) v.box(x0 - 0, y - 1, z0, x1, y - 1, z1, P.woodD);
    y += fh;
  }
  // дверь
  const dx = x0 + Math.floor(w / 2);
  v.box(dx, 1, z1, dx, 3, z1, P.door);
  if (w >= 6) v.box(dx - 1, 1, z1, dx - 1, 3, z1, P.door);
  // крыша
  const top = v.roofX(x0 - 1, x1 + 1, z0 - 1, z1 + 1, y, roof);
  return { y, top };
}

function chimney(v, x, z, y0, h) {
  v.box(x, y0, z, x, y0 + h, z, P.stoneD);
}

function flag(v, x, z, y0, h, color) {
  v.box(x, y0, z, x, y0 + h, z, P.woodD);
  v.box(x + 1, y0 + h - 2, z, x + 3, y0 + h - 1, z, color);
}

function flowerBox(v, x0, x1, y, z) {
  for (let x = x0; x <= x1; x++) v.set(x, y, z, [0xf28fb0, 0xffd65c, 0xffffff][(x + y) % 3]);
}

// ---------- Здания ----------
const B = {};

B.hut = (l) => {
  const v = new Vox();
  const t = tier(l);
  const floors = t === 1 ? 1 : t === 2 ? 2 : 3;
  const w = l === 1 ? 6 : 8;
  const wall = t === 1 ? P.woodL : (f) => (f === 0 ? P.stone : P.cream);
  const r = house(v, { x0: Math.floor((12 - w) / 2), z0: 3, w, d: 6, floors, wall, roof: t >= 3 ? P.roofB : P.roofR });
  if (l >= 2) chimney(v, 4, 4, r.y, 3 + floors);
  if (l >= 3) for (let x = 1; x <= 10; x += 2) v.set(x, 1, 10, P.woodL);
  if (l >= 5) flowerBox(v, 4, 7, 4, 9);
  if (t >= 3) flowerBox(v, 4, 7, 9, 9);
  if (l >= 10) flag(v, 6, 5, r.top, 5, P.gold);
  return v;
};

B.cottage = (l) => {
  const v = new Vox();
  const t = tier(l);
  const floors = 1 + Math.min(3, Math.floor((l + 1) / 3));
  const r = house(v, { x0: 2, z0: 2, w: 8, d: 7, floors, wall: (f) => (f === 0 ? P.stone : P.pink), roof: P.roofT, fh: 4 });
  chimney(v, 8, 3, r.y, 4);
  // балконы
  if (t >= 2) for (let f = 1; f < floors; f++) v.box(3, 1 + f * 4, 9, 8, 1 + f * 4, 9, P.woodD);
  if (t >= 2) flowerBox(v, 3, 8, 2 + 4, 9);
  if (l >= 10) flag(v, 6, 5, r.top, 5, P.gold);
  return v;
};

B.tower = (l) => {
  const v = new Vox();
  const h = 10 + l * 2;
  v.cyl(5.5, 5.5, 4, 0, 0, P.stoneD);
  v.cyl(5.5, 5.5, 3.6, 1, h, (x, y, z) => jitter(y % 6 === 0 ? P.stoneD : P.lilac, x, y, z, 0.03), true);
  for (let y = 3; y < h; y += 4)
    for (const [x, z] of [[5, 9], [9, 6], [2, 5], [6, 2]]) v.set(x, y, z, P.win), v.set(x, y + 1, z, P.win);
  // конусная крыша
  let rr = 4.6;
  let y = h + 1;
  while (rr > 0.3) {
    v.cyl(5.5, 5.5, rr, y, y, l >= 10 ? P.gold : P.roofP);
    rr -= 0.8;
    y++;
  }
  if (l >= 7) flag(v, 5, 5, y, 4, P.roofR);
  v.box(5, 1, 9, 6, 3, 9, P.door);
  return v;
};

B.treehouse = (l) => {
  const v = new Vox();
  const h = 6 + l;
  v.box(5, 0, 5, 6, h, 6, P.woodD);
  v.box(4, 0, 5, 7, 1, 6, P.woodD);
  // крона
  v.sphere(5.5, h + 4, 5.5, 4 + Math.min(l, 6) * 0.25, (x, y, z) => jitter(hash(x, y, z) > 0.75 ? P.leafL : P.leaf, x, y, z, 0.05));
  // домик в кроне
  const y0 = h - 1;
  v.box(2, y0, 2, 9, y0, 9, P.woodD);
  v.walls(3, y0 + 1, 3, 8, y0 + 3, 8, P.woodL);
  v.set(5, y0 + 2, 8, P.win);
  v.set(3, y0 + 2, 5, P.win);
  v.roofX(2, 9, 2, 9, y0 + 4, P.roofO);
  // лестница
  for (let y = 1; y < y0; y++) v.set(7, y, 7 + (y % 2 === 0 ? 0 : 0), P.woodL);
  if (l >= 5) v.box(2, y0, 9, 2, y0 + 2, 9, P.woodD);
  if (l >= 10) flag(v, 9, 3, y0 + 4, 5, P.gold);
  return v;
};

B.farm = (l) => {
  const v = new Vox();
  // поле растёт с уровнем
  const rows = Math.min(10, 2 + l);
  for (let x = 1; x <= 10; x++)
    for (let z = 1; z <= rows; z++) {
      if (x <= 4 && z <= 5) continue;
      v.set(x, 0, z, P.soil);
      if (z % 2 === 1) v.set(x, 1, z, hash(x, z) > 0.4 ? (l >= 4 && x > 7 ? P.wheat : P.crop) : P.leafD);
    }
  // амбар
  const bh = l >= 4 ? 5 : 4;
  v.walls(1, 0, 1, 4, bh, 5, (x, y, z) => jitter(P.red, x, y, z, 0.03));
  v.box(2, 1, 5, 3, 3, 5, P.white);
  v.roofX(0, 5, 0, 6, bh + 1, P.roofO);
  if (l >= 4) {
    v.cyl(9, 9.5, 1.2, 0, 6 + (l >= 7 ? 3 : 0), P.stone);
    v.cyl(9, 9.5, 1.4, 7 + (l >= 7 ? 3 : 0), 7 + (l >= 7 ? 3 : 0), P.roofR);
  }
  if (l >= 7) for (let z = 1; z <= 10; z++) v.set(0, 1, z, P.woodL);
  if (l >= 10) flag(v, 2, 3, bh + 4, 4, P.gold);
  return v;
};

B.sawmill = (l) => {
  const v = new Vox();
  const w = l >= 4 ? 7 : 5;
  v.box(1, 0, 1, w, 0, 6, P.woodD);
  for (const [x, z] of [[1, 1], [w, 1], [1, 6], [w, 6]]) v.box(x, 1, z, x, 4, z, P.woodD);
  v.box(1, 5, 1, w, 5, 6, P.wood);
  v.roofX(0, w + 1, 0, 7, 6, P.roofT);
  // пила
  v.box(3, 1, 3, 4, 2, 4, P.iron);
  v.box(3, 3, 3, 3, 3, 4, P.white);
  // поленницы
  const piles = Math.min(6, 1 + Math.floor(l / 2));
  for (let i = 0; i < piles; i++) {
    const x = 2 + (i % 3) * 3;
    const z = 8 + Math.floor(i / 3) * 2;
    const h = 1 + (i % 2);
    v.box(x, 0, z, x + 2, h, z + 1 > 10 ? 10 : z + 1, (xx, yy) => ((xx + yy) % 2 ? P.woodL : P.wood));
  }
  if (l >= 7) {
    // кран
    v.box(10, 0, 2, 10, 9, 2, P.woodD);
    v.box(6, 9, 2, 10, 9, 2, P.woodD);
    v.box(6, 6, 2, 6, 8, 2, P.iron);
  }
  if (l >= 10) flag(v, 1, 1, 9, 4, P.gold);
  return v;
};

B.quarry = (l) => {
  const v = new Vox();
  // ступенчатая скала
  const h = 3 + Math.min(6, l);
  for (let y = 0; y <= h; y++) {
    const r = 5 - y * (4 / h);
    for (let x = 1; x <= 10; x++)
      for (let z = 1; z <= 10; z++) {
        const d = Math.max(Math.abs(x - 6), Math.abs(z - 4));
        if (d <= r && !(z > 6 && y > 1)) v.set(x, y, z, jitter(hash(x, y, z) > 0.8 ? P.stoneD : P.stone, x, y, z, 0.05));
      }
  }
  // выработка
  v.box(4, 1, 6, 8, h, 8, null);
  for (let x = 4; x <= 8; x++) for (let z = 6; z <= 8; z++) v.set(x, 0, z, P.stoneD);
  // блоки и тачка
  v.box(1, 0, 9, 2, 1, 10, P.stone);
  v.box(4, 0, 9, 5, 0, 10, P.stone);
  v.box(8, 1, 9, 10, 2, 10, P.woodD);
  v.set(8, 0, 9, P.iron);
  v.set(10, 0, 10, P.iron);
  if (l >= 4) {
    v.box(10, 0, 4, 10, h + 3, 4, P.woodD);
    v.box(6, h + 3, 4, 10, h + 3, 4, P.woodD);
    v.box(6, h, 4, 6, h + 2, 4, P.iron);
  }
  if (l >= 7) for (let z = 1; z <= 10; z++) v.set(0, 0, z, P.iron);
  if (l >= 10) flag(v, 6, 4, h + 1, 5, P.gold);
  return v;
};

B.mill = (l) => {
  const v = new Vox();
  const h = 10 + Math.min(l, 8);
  for (let y = 0; y <= h; y++) {
    const r = 4 - (y / h) * 1.6;
    v.cyl(5.5, 5.5, r, y, y, (x, yy, z) => jitter(P.cream, x, yy, z, 0.03), y > 0);
  }
  v.cyl(5.5, 5.5, 4, 0, 0, P.stone);
  let r = 3;
  let y = h + 1;
  while (r > 0) {
    v.cyl(5.5, 5.5, r, y, y, l >= 10 ? P.gold : P.roofR);
    r -= 0.9;
    y++;
  }
  v.box(5, 1, 9, 6, 3, 9, P.door);
  v.set(5, 7, 9, P.win);
  v.set(2, 6, 5, P.win);
  // ось лопастей
  v.box(5, h - 2, 9, 6, h - 1, 10, P.woodD);
  if (l >= 4) for (let x = 1; x <= 10; x++) v.set(x, 0, 11, P.wheat);
  return v;
};
// вращающиеся части мельницы
export function millBlades(l) {
  const v = new Vox();
  const L = 6 + Math.min(4, Math.floor(l / 2));
  for (let i = -L; i <= L; i++) {
    v.set(i, 0, 0, P.woodD);
    v.set(0, i, 0, P.woodD);
    if (Math.abs(i) > 1) {
      const s = Math.sign(i);
      v.set(i, s, 0, P.white);
      v.set(i, 2 * s, 0, P.white);
      v.set(-s, i, 0, P.white);
      v.set(-2 * s, i, 0, P.white);
    }
  }
  return v;
}
export const millAxle = (l) => [0.5 / 12, (10 + Math.min(l, 8) - 1.5) / 12, (11 - 6 + 0.5) / 12];

B.market = (l) => {
  const v = new Vox();
  const stalls = Math.min(4, 1 + Math.floor(l / 3));
  const colors = [P.roofR, P.roofT, P.roofO, P.roofB];
  const spots = [[1, 1], [6, 1], [1, 6], [6, 6]];
  for (let i = 0; i < stalls; i++) {
    const [x, z] = spots[i];
    v.box(x, 0, z, x + 4, 1, z + 3, P.woodL);
    v.box(x, 2, z + 1, x, 4, z + 1, P.woodD);
    v.box(x + 4, 2, z + 1, x + 4, 4, z + 1, P.woodD);
    for (let xx = x; xx <= x + 4; xx++) for (let zz = z; zz <= z + 3; zz++) v.set(xx, 5, zz, xx % 2 ? colors[i] : P.white);
    // товары
    v.set(x + 1, 2, z + 2, [P.red, P.wheat, P.crop, P.roofP][i]);
    v.set(x + 3, 2, z + 2, [P.wheat, P.red, P.roofO, P.crop][i]);
  }
  if (l >= 5) {
    v.cyl(5.5, 5.5, 1, 0, 0, P.stone);
    v.set(5, 1, 5, P.water);
  }
  if (l >= 10) flag(v, 5, 5, 1, 9, P.gold);
  return v;
};

B.townhall = (l) => {
  const v = new Vox();
  const floors = 1 + Math.min(2, Math.floor(l / 4));
  const r = house(v, { x0: 1, z0: 2, w: 10, d: 7, floors, wall: P.cream, roof: P.roofB, fh: 5 });
  // колонны
  for (const x of [2, 4, 7, 9]) v.box(x, 1, 9, x, 4, 9, P.white);
  v.box(1, 5, 9, 10, 5, 9, P.white);
  // часовая башня
  const ty = r.y;
  v.box(4, ty, 4, 7, ty + 4 + Math.min(l, 6), 7, P.cream);
  const cy = ty + 2 + Math.min(l, 6);
  v.box(5, cy, 7, 6, cy + 1, 7, P.white);
  v.set(5, cy + 1, 7, P.dark);
  v.roofPyr(3, 8, 3, 8, ty + 5 + Math.min(l, 6), l >= 10 ? P.gold : P.roofB);
  flag(v, 5, 5, ty + 8 + Math.min(l, 6), 4, P.roofR);
  return v;
};

B.mine = (l) => {
  const v = new Vox();
  // холм
  v.sphere(5.5, 0, 4.5, 6, (x, y, z) => (y < 0 ? null : jitter(hash(x, y, z) > 0.85 ? P.stoneD : P.stone, x, y, z, 0.05)));
  for (const [k] of [...v.m]) {
    const y = ((k >> 10) & 1023) - 512;
    if (y < 0) v.m.delete(k);
  }
  // вход
  v.box(4, 0, 9, 7, 3, 10, null);
  v.box(3, 0, 9, 3, 4, 9, P.woodD);
  v.box(8, 0, 9, 8, 4, 9, P.woodD);
  v.box(3, 4, 9, 8, 4, 9, P.woodD);
  v.box(4, 0, 6, 7, 2, 8, null);
  for (let z = 5; z <= 11; z++) {
    v.set(4, 0, z, P.iron);
    v.set(7, 0, z, P.iron);
  }
  v.box(5, 0, 10, 6, 1, 11, P.woodD);
  // кристаллы растут с уровнем
  const n = Math.min(6, Math.floor(l / 2) + 1);
  const spots = [[2, 4, 2], [8, 3, 2], [5, 5, 1], [2, 2, 6], [9, 2, 6], [6, 6, 3]];
  for (let i = 0; i < n; i++) {
    const [x, y, z] = spots[i];
    v.box(x, y, z, x, y + 1, z, P.cyan);
  }
  if (l >= 10) flag(v, 5, 4, 6, 4, P.gold);
  return v;
};

B.iceworks = (l) => {
  const v = new Vox();
  const h = 5 + Math.min(l, 6);
  v.box(1, 0, 1, 10, 0, 10, P.iceD);
  v.walls(2, 1, 2, 9, h, 8, (x, y, z) => jitter(P.ice, x, y, z, 0.04));
  v.box(5, 1, 8, 6, 3, 8, P.iceD);
  for (let x = 3; x <= 8; x += 2) v.set(x, h - 2, 8, P.cyan);
  v.roofPyr(1, 10, 1, 9, h + 1, P.snow);
  // ледяные кристаллы
  const n = Math.min(4, 1 + Math.floor(l / 3));
  for (let i = 0; i < n; i++) v.box(2 + i * 2, 0, 10, 2 + i * 2, 1 + (i % 2) + Math.floor(l / 4), 10, P.cyan);
  if (l >= 10) flag(v, 6, 5, h + 5, 4, P.gold);
  return v;
};

B.lighthouse = (l) => {
  const v = new Vox();
  const h = 14 + l * 2;
  v.cyl(5.5, 5.5, 4, 0, 1, P.stone);
  for (let y = 2; y <= h; y++) {
    const r = 3.2 - (y / h) * 1;
    v.cyl(5.5, 5.5, r, y, y, Math.floor(y / 4) % 2 ? P.red : P.white, true);
  }
  v.cyl(5.5, 5.5, 3, h + 1, h + 1, P.dark);
  v.cyl(5.5, 5.5, 1.6, h + 2, h + 4, P.cyan);
  v.cyl(5.5, 5.5, 2.2, h + 5, h + 5, P.red);
  v.cyl(5.5, 5.5, 1.2, h + 6, h + 6, l >= 10 ? P.gold : P.red);
  v.box(5, 2, 8, 6, 4, 8, P.door);
  return v;
};

B.port = (l) => {
  const v = new Vox();
  // причал
  v.box(0, 0, 3, 11, 1, 8, (x, y, z) => ((x + z) % 2 ? P.wood : P.woodL));
  for (const x of [0, 11]) for (const z of [3, 8]) v.box(x, 2, z, x, 3, z, P.woodD);
  // мачта
  const mh = 12 + Math.min(l, 8);
  v.box(9, 2, 5, 9, mh, 6, P.woodD);
  v.box(8, mh, 5, 10, mh, 6, P.gold);
  // склад
  v.walls(1, 2, 4, 5, 5, 7, P.peach);
  v.set(3, 3, 7, P.win);
  v.roofX(0, 6, 3, 8, 6, P.roofT);
  // ящики
  const crates = Math.min(5, 1 + Math.floor(l / 2));
  for (let i = 0; i < crates; i++) v.box(6 + (i % 2) * 2, 2 + Math.floor(i / 2), 2 + 6 * (i % 2), 7 + (i % 2) * 2, 2 + Math.floor(i / 2), 2 + 6 * (i % 2), P.woodL);
  return v;
};

export function airship(l) {
  const v = new Vox();
  for (let x = -7; x <= 7; x++) {
    const r = 3.2 * Math.sqrt(1 - (x / 7.6) ** 2);
    for (let y = -4; y <= 4; y++)
      for (let z = -4; z <= 4; z++) if (y * y + z * z <= r * r) v.set(x, y + 9, z, Math.abs(x) % 4 === 0 ? P.roofR : P.cream);
  }
  v.box(-2, 4, -1, 2, 5, 1, P.wood);
  v.set(0, 5, 1, P.win);
  v.box(-8, 9, 0, -9, 12, 0, P.roofR);
  return v;
}

B.observatory = (l) => {
  const v = new Vox();
  const h = 6 + Math.min(l, 6);
  v.box(1, 0, 1, 10, 0, 10, P.stoneD);
  v.cyl(5.5, 5.5, 4, 1, h, (x, y, z) => jitter(P.cream, x, y, z, 0.03), true);
  for (let y = 3; y < h; y += 3) v.set(5, y, 9, P.win);
  v.sphere(5.5, h, 5.5, 4.2, (x, y, z) => (y < h ? null : jitter(P.roofB, x, y, z, 0.03)));
  for (const [k] of [...v.m]) {
    const y = ((k >> 10) & 1023) - 512;
    const x = (k >> 20) - 512;
    const z = (k & 1023) - 512;
    if (y > h && x >= 5 && x <= 6 && z >= 6) v.m.delete(k);
  }
  // телескоп
  for (let i = 0; i < 6; i++) v.set(5.5 + 0, h + 1 + i, 6 + i * 0.7, P.iron);
  v.set(6, h + 6, 10, l >= 10 ? P.gold : P.iron);
  v.box(5, 1, 9, 6, 3, 9, P.door);
  return v;
};

B.forge = (l) => {
  const v = new Vox();
  const h = 5 + Math.min(l, 6);
  v.box(1, 0, 1, 10, 0, 10, P.dark);
  v.walls(1, 1, 2, 9, h, 8, (x, y, z) => jitter(P.stoneD, x, y, z, 0.05));
  v.box(4, 1, 8, 6, 3, 8, P.lava);
  v.roofX(0, 10, 1, 9, h + 1, P.dark);
  // труба с огнём
  v.box(8, h, 3, 9, h + 5 + Math.floor(l / 3), 4, P.dark);
  v.box(8, h + 6 + Math.floor(l / 3), 3, 9, h + 6 + Math.floor(l / 3), 4, P.lava);
  // наковальня
  v.box(1, 1, 10, 3, 1, 10, P.iron);
  v.set(2, 2, 10, P.iron);
  if (l >= 10) flag(v, 2, 3, h + 5, 4, P.gold);
  return v;
};

B.skytemple = (l) => {
  const v = new Vox();
  v.box(0, 0, 0, 11, 1, 11, P.white);
  const h = 8 + Math.min(l, 8);
  for (const x of [1, 4, 7, 10]) for (const z of [1, 10]) v.box(x, 2, z, x, h, z, P.white);
  for (const z of [4, 7]) for (const x of [1, 10]) v.box(x, 2, z, x, h, z, P.white);
  v.box(0, h + 1, 0, 11, h + 1, 11, P.gold);
  v.roofPyr(0, 11, 0, 11, h + 2, P.lilac);
  v.box(4, 2, 4, 7, 3 + Math.floor(l / 2), 7, P.cyan);
  return v;
};

export const BUILD_MODELS = B;

// ---------- Строительные леса ----------
export function scaffold(h) {
  const v = new Vox();
  for (const [x, z] of [[1, 1], [10, 1], [1, 10], [10, 10]]) v.box(x, 0, z, x, h, z, P.woodL);
  for (let y = 3; y <= h; y += 3) {
    v.box(1, y, 1, 10, y, 1, P.wood);
    v.box(1, y, 10, 10, y, 10, P.wood);
    v.box(1, y, 1, 1, y, 10, P.wood);
    v.box(10, y, 1, 10, y, 10, P.wood);
  }
  v.box(4, 0, 4, 7, 1, 7, P.stone);
  return v;
}

// ---------- Декор ----------
const D = {};
D.tree = (s = 0) => {
  const v = new Vox();
  const h = 4 + (s % 3);
  v.box(5, 0, 5, 6, h, 6, P.woodD);
  v.sphere(5.5, h + 3, 5.5, 3.6, (x, y, z) => jitter(hash(x, y, z) > 0.7 ? P.leafL : P.leaf, x, y, z, 0.05));
  return v;
};
D.pine = (s = 0) => {
  const v = new Vox();
  v.box(5, 0, 5, 6, 2, 6, P.woodD);
  for (let i = 0; i < 4; i++) v.cyl(5.5, 5.5, 4 - i, 3 + i * 2, 4 + i * 2, (x, y, z) => jitter(P.leafD, x, y, z, 0.05));
  v.box(5, 11, 5, 6, 12, 6, P.leafD);
  return v;
};
D.flowers = (s = 0) => {
  const v = new Vox();
  v.box(2, 0, 2, 9, 0, 9, P.soil);
  v.walls(1, 0, 1, 10, 1, 10, P.woodL);
  const cols = [0xf28fb0, 0xffd65c, 0xffffff, 0xb89cff, 0xff8a65];
  for (let x = 2; x <= 9; x++) for (let z = 2; z <= 9; z++) if ((x + z + s) % 2 === 0) v.set(x, 1, z, hash(x, z, s) > 0.5 ? cols[(x * 3 + z + s) % cols.length] : P.leafD);
  return v;
};
D.fence = () => {
  const v = new Vox();
  for (const x of [0, 4, 7, 11]) v.box(x, 0, 6, x, 3, 6, P.woodL);
  v.box(0, 2, 6, 11, 2, 6, P.wood);
  v.box(0, 1, 6, 11, 1, 6, P.wood);
  return v;
};
D.bench = () => {
  const v = new Vox();
  v.box(2, 2, 5, 9, 2, 7, P.wood);
  v.box(2, 3, 7, 9, 4, 7, P.wood);
  for (const x of [2, 9]) v.box(x, 0, 5, x, 1, 7, P.woodD);
  return v;
};
D.lantern = () => {
  const v = new Vox();
  v.box(5, 0, 5, 6, 0, 6, P.dark);
  v.box(5, 1, 5, 5, 8, 5, P.dark);
  v.box(4, 9, 4, 6, 10, 6, P.win);
  v.box(4, 11, 4, 6, 11, 6, P.dark);
  return v;
};
D.well = () => {
  const v = new Vox();
  v.cyl(5.5, 5.5, 3.5, 0, 3, P.stone, true);
  v.cyl(5.5, 5.5, 2.5, 1, 1, P.water);
  for (const x of [2, 9]) v.box(x, 4, 5, x, 7, 5, P.woodD);
  v.roofX(1, 10, 3, 8, 8, P.roofR);
  return v;
};
D.mushroom = () => {
  const v = new Vox();
  v.box(5, 0, 5, 6, 4, 6, P.cream);
  v.sphere(5.5, 5, 5.5, 4, (x, y, z) => (y < 5 ? null : (x + z + y) % 4 === 0 ? P.white : P.red));
  for (const [k] of [...v.m]) if ((((k >> 10) & 1023) - 512) < 5 && v.m.get(k) === P.red) v.m.delete(k);
  return v;
};
D.fountain = () => {
  const v = new Vox();
  v.cyl(5.5, 5.5, 5, 0, 1, P.stone, true);
  v.cyl(5.5, 5.5, 4, 1, 1, P.water);
  v.box(5, 1, 5, 6, 5, 6, P.stone);
  v.cyl(5.5, 5.5, 2, 5, 5, P.stone);
  v.box(5, 6, 5, 6, 8, 6, P.water);
  v.cyl(5.5, 5.5, 1.5, 6, 6, P.water);
  return v;
};
D.snowman = () => {
  const v = new Vox();
  v.sphere(5.5, 2.5, 5.5, 3, P.snow);
  v.sphere(5.5, 6.5, 5.5, 2.2, P.snow);
  v.sphere(5.5, 9.5, 5.5, 1.6, P.snow);
  v.set(6, 9, 8, P.roofO);
  v.set(5, 10, 7, P.dark);
  v.set(7, 10, 7, P.dark);
  v.box(4, 11, 4, 7, 11, 7, P.dark);
  v.box(5, 12, 5, 6, 13, 6, P.dark);
  return v;
};
D.bridge = () => {
  const v = new Vox();
  for (let x = 0; x <= 11; x++) {
    const y = Math.round(3 - Math.abs(x - 5.5) * 0.45);
    v.box(x, y, 3, x, y, 8, P.wood);
    v.set(x, y + 1, 3, P.woodD);
    v.set(x, y + 1, 8, P.woodD);
  }
  v.box(0, 0, 4, 0, 1, 7, P.stone);
  v.box(11, 0, 4, 11, 1, 7, P.stone);
  v.box(3, 0, 5, 8, 0, 6, P.water);
  return v;
};
D.statue = () => {
  const v = new Vox();
  v.box(3, 0, 3, 8, 2, 8, P.stoneD);
  v.box(4, 3, 4, 7, 3, 7, P.stone);
  v.box(5, 4, 5, 6, 9, 6, P.gold);
  v.box(4, 7, 5, 7, 7, 6, P.gold);
  v.box(5, 10, 5, 6, 11, 6, P.gold);
  return v;
};
D.cactus = () => {
  const v = new Vox();
  v.box(5, 0, 5, 6, 9, 6, 0x6cb35a);
  v.box(2, 4, 5, 4, 4, 6, 0x6cb35a);
  v.box(2, 5, 5, 2, 7, 6, 0x6cb35a);
  v.box(7, 6, 5, 9, 6, 6, 0x6cb35a);
  v.box(9, 7, 5, 9, 8, 6, 0x6cb35a);
  v.set(5, 10, 5, 0xf28fb0);
  return v;
};
D.palm = () => {
  const v = new Vox();
  for (let y = 0; y <= 11; y++) v.set(5 + Math.round(y * 0.15), y, 5, y % 2 ? P.woodL : P.wood);
  const tx = 7;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 1; i <= 4; i++) v.set(tx + dx * i, 12 - Math.floor(i / 2), 5 + dz * i, P.leaf);
  v.set(tx, 12, 5, P.leafD);
  v.set(tx, 11, 6, P.woodD);
  return v;
};
D.lavalamp = () => {
  const v = new Vox();
  v.box(3, 0, 3, 8, 1, 8, P.dark);
  v.box(4, 2, 4, 7, 6, 7, P.lava);
  v.box(5, 7, 5, 6, 9, 6, P.lava);
  return v;
};
D.rainbow = () => {
  const v = new Vox();
  const cols = [0xff8a8a, 0xffc06b, 0xffe66b, 0x9be27b, 0x7bc8f2, 0xb69cf0];
  cols.forEach((c, i) => {
    const R = 6 - i * 0.7;
    for (let a = 0; a <= Math.PI; a += 0.08) v.set(5.5 + Math.cos(a) * R, Math.sin(a) * R, 5, c);
  });
  v.sphere(0, 0, 5, 1.5, P.snow);
  v.sphere(11, 0, 5, 1.5, P.snow);
  return v;
};
D.crystaltree = () => {
  const v = new Vox();
  v.box(5, 0, 5, 6, 4, 6, P.iceD);
  v.sphere(5.5, 7, 5.5, 3.2, (x, y, z) => (hash(x, y, z) > 0.5 ? P.cyan : P.ice));
  return v;
};
export const DECOR_MODELS = D;

// ---------- Жители ----------
// житель: объёмная воксельная фигурка с большой головой (5x5) — лицом к +Z
export function person(look) {
  const v = new Vox();
  const { shirt, hair, skin = 0xf3c9a1, pants = 0x4a5578 } = typeof look === 'number' ? { shirt: look, hair: 0x6b4a32 } : look;
  const shoe = 0x3a2a22;
  // ноги
  v.box(1, 0, 2, 1, 0, 3, shoe);
  v.box(3, 0, 2, 3, 0, 3, shoe);
  v.box(1, 1, 2, 1, 2, 2, pants);
  v.box(3, 1, 2, 3, 2, 2, pants);
  // туловище
  v.box(1, 3, 1, 3, 5, 3, shirt);
  v.set(2, 3, 3, pants);
  // руки
  v.box(0, 4, 2, 0, 5, 2, shirt);
  v.box(4, 4, 2, 4, 5, 2, shirt);
  v.set(0, 3, 2, skin);
  v.set(4, 3, 2, skin);
  // большая голова
  v.box(0, 6, 0, 4, 10, 4, skin);
  // волосы: макушка, затылок, виски и чёлка
  v.box(0, 11, 0, 4, 11, 4, hair);
  v.box(0, 7, 0, 4, 10, 0, hair);
  v.box(0, 9, 1, 0, 10, 4, hair);
  v.box(4, 9, 1, 4, 10, 4, hair);
  v.box(1, 10, 4, 3, 10, 4, hair);
  // лицо: вытянутые глазки и лёгкий румянец по бокам, без рта
  v.set(1, 7, 4, 0x2a2430);
  v.set(1, 8, 4, 0x2a2430);
  v.set(3, 7, 4, 0x2a2430);
  v.set(3, 8, 4, 0x2a2430);
  v.set(0, 7, 4, 0xf6b8b0);
  v.set(4, 7, 4, 0xf6b8b0);
  return v;
}

// ---------- Воздушный шар ----------
export function balloon() {
  const v = new Vox();
  const cols = [P.roofR, P.white, P.roofT, P.white];
  v.sphere(0, 10, 0, 5.2, (x, y, z) => cols[(Math.floor(Math.atan2(z, x) * 2 + 8)) % 4]);
  for (let y = 3; y <= 5; y++) for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) v.set(x * (0.6 + (y - 3) * 0.2), y, z * (0.6 + (y - 3) * 0.2), P.woodD);
  v.box(-2, 0, -2, 2, 2, 2, P.woodL);
  v.box(-1, 3, -1, 1, 3, 1, P.gold);
  return v;
}

// ---------- Облако ----------
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
