// Навигация: сетка проходимости 0.5 м, препятствия из раскладки, A* со сглаживанием пути
import { SHOP, ENTRIES, FRONT_Z, WALL_T, SHELF_SLOTS, SHELF_W, SHELF_D, REG, LOOT_SPOTS, START_SHELVES } from './data.js';

export const CS = 0.5;
export const GX0 = -24,
  GZ0 = -15;
export const GW = 96,
  GH = 80;
export const FREE = 0,
  SOLID = 1,
  ENTRY = 10; // 10 + индекс проёма

// размеры машин и прочего для коллизий (ширина по x, длина по z до поворота)
export const SIZES = {
  sedan: [2.0, 4.3],
  hatch: [1.9, 3.6],
  van: [2.2, 5.0],
  pickup: [2.1, 5.3],
  trolley: [0.75, 1.1],
  dumpster: [2.3, 1.35],
  bins: [2.0, 0.85],
  crates: [1.8, 1.5],
  vending: [1.1, 0.9],
};

// неподвижные предметы декора за пределами лавки (используются и сценой)
export const DECOR = {
  lamps: [
    [-9.5, 2.5],
    [9.5, 3.5],
    [-9, 12.6],
    [9, 12.6],
  ],
  trees: [
    [-19.5, -12], [-15.5, -12.6], [15.8, -12.4], [19.6, -11.5], [-20.2, 2.5], [20.4, 1.0], [-20, 13.2], [20.2, 13.4], [-12.5, -12.4], [12.4, -12.6],
  ],
  bushes: [
    [-10.5, -11.8], [10.8, -11.6], [-18.2, -3], [18.4, 4.2], [-5.5, 13.2], [5.6, 13.1], [-14, 13.3], [14.2, 13.2],
  ],
  cones: [
    [-3.6, 11.2], [3.8, 11.4], [-1.5, 9.6], [14.6, 1.8], [-14.2, -1.6],
  ],
  busStop: [-11, 22.2],
  billboard: [14, 23.4],
  tires: [[-17.8, 4.4], [18.2, -1.2]],
  barrels: [[-9.6, -4.6], [9.7, -10.6], [-16.4, 11.2]],
};

function blank() {
  return new Uint8Array(GW * GH);
}

export const cell = (x, z) => [Math.floor((x - GX0) / CS), Math.floor((z - GZ0) / CS)];
export const cx = (i) => GX0 + (i + 0.5) * CS;
export const cz = (j) => GZ0 + (j + 0.5) * CS;

// прямоугольник (возможно повёрнутый) → отметить клетки
function rect(g, x, z, w, d, ry = 0, val = SOLID, pad = 0) {
  const c = Math.cos(ry),
    s = Math.sin(ry);
  const hw = w / 2 + pad,
    hd = d / 2 + pad;
  const R = Math.hypot(hw, hd);
  const [i0, j0] = cell(x - R, z - R);
  const [i1, j1] = cell(x + R, z + R);
  for (let j = Math.max(0, j0); j <= Math.min(GH - 1, j1); j++)
    for (let i = Math.max(0, i0); i <= Math.min(GW - 1, i1); i++) {
      const dx = cx(i) - x,
        dz = cz(j) - z;
      // в локальные координаты предмета
      const lx = dx * c - dz * s,
        lz = dx * s + dz * c;
      if (Math.abs(lx) <= hw && Math.abs(lz) <= hd) g[j * GW + i] = val;
    }
}
function box(g, x0, z0, x1, z1, val = SOLID) {
  rect(g, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, val);
}

export function shelfCount(build) {
  return Math.min(SHELF_SLOTS.length, START_SHELVES + (build.shelves || 0));
}

export function buildGrid(nShelves) {
  const g = blank();
  const S = SHOP;
  // стены лавки
  box(g, S.x0 - WALL_T, S.z0 - WALL_T, S.x1 + WALL_T, S.z0);
  box(g, S.x0 - WALL_T, S.z0 - WALL_T, S.x0, FRONT_Z + WALL_T);
  box(g, S.x1, S.z0 - WALL_T, S.x1 + WALL_T, FRONT_Z + WALL_T);
  box(g, S.x0 - WALL_T, FRONT_Z, S.x1 + WALL_T, FRONT_Z + WALL_T);
  // проёмы
  ENTRIES.forEach((e, k) => box(g, e.x - e.w / 2, FRONT_Z - 0.05, e.x + e.w / 2, FRONT_Z + WALL_T + 0.05, ENTRY + k));
  // полки
  for (let k = 0; k < nShelves; k++) {
    const [x, z] = SHELF_SLOTS[k];
    rect(g, x, z, SHELF_W, SHELF_D);
  }
  // прилавок, склад, верстак, раскладушка и генератор у задней стены
  rect(g, REG.x, REG.z, REG.w, REG.d);
  box(g, 3.4, S.z0, S.x1, -10.85);
  box(g, -7.9, S.z0, -3.6, -11.0);
  box(g, -2.8, S.z0, 1.9, -11.1);
  // снаружи: места поиска
  for (const L of LOOT_SPOTS) {
    const [w, d] = SIZES[L.kind];
    rect(g, L.x, L.z, w, d, L.ry);
  }
  for (const [x, z] of DECOR.lamps) rect(g, x, z, 0.4, 0.4);
  for (const [x, z] of DECOR.trees) rect(g, x, z, 1.0, 1.0);
  for (const [x, z] of DECOR.bushes) rect(g, x, z, 1.1, 0.9);
  for (const [x, z] of DECOR.tires) rect(g, x, z, 0.9, 0.9);
  for (const [x, z] of DECOR.barrels) rect(g, x, z, 0.7, 0.7);
  // забор за лавкой и низкий парапет вдоль дороги с въездом
  box(g, -24, -14.4, 24, -13.9);
  box(g, -21.6, 13.9, -3.2, 14.3);
  box(g, 3.2, 13.9, 21.6, 14.3);
  return g;
}

// ---------- A* ----------
class Heap {
  constructor() {
    this.a = [];
    this.f = [];
  }
  push(v, f) {
    const a = this.a,
      F = this.f;
    a.push(v);
    F.push(f);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (F[p] <= F[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      [F[p], F[i]] = [F[i], F[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a,
      F = this.f;
    const top = a[0];
    const lv = a.pop(),
      lf = F.pop();
    if (a.length) {
      a[0] = lv;
      F[0] = lf;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1,
          r = l + 1;
        let m = i;
        if (l < a.length && F[l] < F[m]) m = l;
        if (r < a.length && F[r] < F[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        [F[m], F[i]] = [F[i], F[m]];
        i = m;
      }
    }
    return top;
  }
  get size() {
    return this.a.length;
  }
}

export class Nav {
  constructor(grid) {
    this.g = grid;
    this.open = null; // fn(entryIdx, mode) → проходим ли проём
    this.cost = new Float32Array(GW * GH);
    this.from = new Int32Array(GW * GH);
    this.stamp = new Uint32Array(GW * GH);
    this.closed = new Uint32Array(GW * GH);
    this.cur = 1;
  }
  ok(i, j, mode) {
    if (i < 0 || j < 0 || i >= GW || j >= GH) return false;
    const v = this.g[j * GW + i];
    if (v === FREE) return true;
    if (v === SOLID) return false;
    return this.open ? this.open(v - ENTRY, mode) : false;
  }
  okXZ(x, z, mode) {
    const [i, j] = cell(x, z);
    return this.ok(i, j, mode);
  }
  // проём под точкой (или -1)
  entryAt(x, z) {
    const [i, j] = cell(x, z);
    if (i < 0 || j < 0 || i >= GW || j >= GH) return -1;
    const v = this.g[j * GW + i];
    return v >= ENTRY ? v - ENTRY : -1;
  }
  // круг радиуса r свободен?
  free(x, z, r, mode) {
    return this.okXZ(x - r, z - r, mode) && this.okXZ(x + r, z - r, mode) && this.okXZ(x - r, z + r, mode) && this.okXZ(x + r, z + r, mode) && this.okXZ(x, z, mode);
  }
  // прямая видимость по сетке
  los(x0, z0, x1, z1, mode, r = 0.24) {
    const d = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.ceil(d / (CS * 0.5));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const x = x0 + (x1 - x0) * t,
        z = z0 + (z1 - z0) * t;
      if (!this.free(x, z, r, mode)) return false;
    }
    return true;
  }
  nearestOk(i, j, mode) {
    if (this.ok(i, j, mode)) return [i, j];
    for (let r = 1; r < 8; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          if (this.ok(i + di, j + dj, mode)) return [i + di, j + dj];
        }
    return null;
  }
  path(x0, z0, x1, z1, mode) {
    let [si, sj] = cell(x0, z0);
    let [ti, tj] = cell(x1, z1);
    const s = this.nearestOk(si, sj, mode);
    const tt = this.nearestOk(ti, tj, mode);
    if (!s || !tt) return null;
    [si, sj] = s;
    [ti, tj] = tt;
    const st = ++this.cur;
    const start = sj * GW + si,
      goal = tj * GW + ti;
    const h = new Heap();
    this.stamp[start] = st;
    this.cost[start] = 0;
    this.from[start] = -1;
    h.push(start, 0);
    let found = false,
      iter = 0;
    while (h.size && iter++ < 30000) {
      const c = h.pop();
      if (this.closed[c] === st) continue;
      this.closed[c] = st;
      if (c === goal) {
        found = true;
        break;
      }
      const ci = c % GW,
        cj = (c / GW) | 0;
      const cc = this.cost[c];
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di,
            nj = cj + dj;
          if (!this.ok(ni, nj, mode)) continue;
          if (di && dj && (!this.ok(ci + di, cj, mode) || !this.ok(ci, cj + dj, mode))) continue;
          const n = nj * GW + ni;
          const nc = cc + (di && dj ? 1.414 : 1);
          if (this.stamp[n] === st && this.cost[n] <= nc) continue;
          this.stamp[n] = st;
          this.cost[n] = nc;
          this.from[n] = c;
          h.push(n, nc + Math.hypot(ni - ti, nj - tj));
        }
    }
    if (!found) return null;
    const pts = [];
    for (let c = goal; c !== -1; c = this.from[c]) pts.push([cx(c % GW), cz((c / GW) | 0)]);
    pts.reverse();
    pts[pts.length - 1] = this.okXZ(x1, z1, mode) ? [x1, z1] : pts[pts.length - 1];
    // сглаживание: выкидываем точки, если видно следующую
    const out = [];
    let a = [x0, z0];
    let k = 0;
    while (k < pts.length) {
      let far = k;
      for (let m = pts.length - 1; m > k; m--)
        if (this.los(a[0], a[1], pts[m][0], pts[m][1], mode)) {
          far = m;
          break;
        }
      out.push(pts[far]);
      a = pts[far];
      k = far + 1;
    }
    return out;
  }
}
