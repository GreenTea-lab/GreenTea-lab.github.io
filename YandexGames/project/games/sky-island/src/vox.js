// Воксельный конструктор: заполняем сетку цветными кубиками, затем строим цельную геометрию
// с отсечением скрытых граней и мягким затенением в углах (ambient occlusion)
import * as THREE from 'three';

export const LIGHT_FLAG = 0x1000000; // цвет «светится ночью»

export class Vox {
  constructor() {
    this.m = new Map();
    this.minX = Infinity;
    this.minY = Infinity;
    this.minZ = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
    this.maxZ = -Infinity;
  }
  key(x, y, z) {
    return ((x + 512) << 20) | ((y + 512) << 10) | (z + 512);
  }
  set(x, y, z, c) {
    x = Math.round(x);
    y = Math.round(y);
    z = Math.round(z);
    if (c === null || c === undefined) {
      this.m.delete(this.key(x, y, z));
      return this;
    }
    this.m.set(this.key(x, y, z), c);
    if (x < this.minX) this.minX = x;
    if (y < this.minY) this.minY = y;
    if (z < this.minZ) this.minZ = z;
    if (x > this.maxX) this.maxX = x;
    if (y > this.maxY) this.maxY = y;
    if (z > this.maxZ) this.maxZ = z;
    return this;
  }
  get(x, y, z) {
    return this.m.get(this.key(x, y, z));
  }
  has(x, y, z) {
    return this.m.has(this.key(x, y, z));
  }
  // прямоугольный блок включительно
  box(x0, y0, z0, x1, y1, z1, c) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
    return this;
  }
  // полая коробка (стены)
  walls(x0, y0, z0, x1, y1, z1, c) {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
    return this;
  }
  // цилиндр по оси Y
  cyl(cx, cz, r, y0, y1, c, hollow = false) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        const d = Math.hypot(x - cx, z - cz);
        if (d <= r + 0.01 && (!hollow || d > r - 1.1)) for (let y = y0; y <= y1; y++) this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
      }
    return this;
  }
  sphere(cx, cy, cz, r, c) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
        for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
          if ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 <= r * r + 0.3) this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
    return this;
  }
  // двускатная крыша вдоль оси X: от z0 до z1, начиная с высоты y0
  roofX(x0, x1, z0, z1, y0, c, edge) {
    let a = z0;
    let b = z1;
    let y = y0;
    while (a <= b) {
      for (let x = x0; x <= x1; x++) {
        this.set(x, y, a, edge && (x === x0 || x === x1) ? edge : c);
        this.set(x, y, b, edge && (x === x0 || x === x1) ? edge : c);
      }
      // фронтоны
      for (let z = a + 1; z < b; z++) {
        this.set(x0 + 1, y, z, edge || c);
        this.set(x1 - 1, y, z, edge || c);
      }
      a++;
      b--;
      y++;
    }
    return y;
  }
  // пирамидальная крыша
  roofPyr(x0, x1, z0, z1, y0, c) {
    let y = y0;
    while (x0 <= x1 && z0 <= z1) {
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) this.set(x, y, z, c);
      x0++;
      x1--;
      z0++;
      z1--;
      y++;
    }
    return y;
  }
  merge(o, dx = 0, dy = 0, dz = 0) {
    for (const [k, c] of o.m) {
      const x = (k >> 20) - 512;
      const y = ((k >> 10) & 1023) - 512;
      const z = (k & 1023) - 512;
      this.set(x + dx, y + dy, z + dz, c);
    }
    return this;
  }

  /**
   * Построение геометрии. size — размер вокселя; origin — какой воксель окажется в (0,0,0):
   * по X/Z центрируем по центру ячейки (cx, cz), по Y низ в 0.
   * Возвращает { geo, glow } (glow — светящиеся грани или null).
   */
  build(size, cx = 0, cz = 0, opts = {}) {
    const out = [mk(), mk()];
    function mk() {
      return { pos: [], nor: [], col: [], idx: [] };
    }
    const shade = opts.shade ?? [1, 0.8, 0.9, 0.86, 0.72, 0.92]; // +y,-y,+x,-x,+z,-z
    const FACES = [
      { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: shade[0] },
      { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: shade[1] },
      { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], s: shade[2] },
      { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], s: shade[3] },
      { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], s: shade[4] },
      { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], s: shade[5] },
    ];
    const tmp = new THREE.Color();
    const solid = (x, y, z) => this.m.has(this.key(x, y, z));
    const emit = (o, f, corners, c, aos, glow) => {
      const base = o.pos.length / 3;
      tmp.setHex(c);
      for (let i = 0; i < 4; i++) {
        const [px, py, pz] = corners[i];
        o.pos.push((px - cx) * size, py * size, (pz - cz) * size);
        o.nor.push(f.n[0], f.n[1], f.n[2]);
        const k2 = glow ? 1 : f.s * (0.62 + 0.38 * (aos[i] / 3));
        o.col.push(tmp.r * k2, tmp.g * k2, tmp.b * k2);
      }
      if (aos[0] + aos[2] > aos[1] + aos[3]) o.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else o.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    };
    // собираем видимые грани по направлениям и слоям
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi];
      const [nx, ny, nz] = f.n;
      const a = nx ? 0 : ny ? 1 : 2;
      const ua = (a + 1) % 3;
      const va = (a + 2) % 3;
      const layers = new Map(); // слой -> Map(u,v -> face)
      for (const [k, cRaw] of this.m) {
        const x = (k >> 20) - 512;
        const y = ((k >> 10) & 1023) - 512;
        const z = (k & 1023) - 512;
        if (solid(x + nx, y + ny, z + nz)) continue;
        const p = [x, y, z];
        // AO для 4 вершин
        const aos = [];
        for (const [vx, vy, vz] of f.c) {
          const px = x + nx;
          const py = y + ny;
          const pz = z + nz;
          const ox = vx * 2 - 1;
          const oy = vy * 2 - 1;
          const oz = vz * 2 - 1;
          let s1, s2, cr;
          if (nx !== 0) {
            s1 = solid(px, py + oy, pz);
            s2 = solid(px, py, pz + oz);
            cr = solid(px, py + oy, pz + oz);
          } else if (ny !== 0) {
            s1 = solid(px + ox, py, pz);
            s2 = solid(px, py, pz + oz);
            cr = solid(px + ox, py, pz + oz);
          } else {
            s1 = solid(px + ox, py, pz);
            s2 = solid(px, py + oy, pz);
            cr = solid(px + ox, py + oy, pz);
          }
          aos.push(s1 && s2 ? 0 : 3 - (s1 + s2 + cr));
        }
        const glow = cRaw >= LIGHT_FLAG;
        const c = glow ? cRaw - LIGHT_FLAG : cRaw;
        const flat = aos[0] === 3 && aos[1] === 3 && aos[2] === 3 && aos[3] === 3;
        if (!flat) {
          const corners = f.c.map(([vx, vy, vz]) => [x + vx, y + vy, z + vz]);
          emit(out[glow ? 1 : 0], f, corners, c, aos, glow);
          continue;
        }
        let L = layers.get(p[a]);
        if (!L) layers.set(p[a], (L = new Map()));
        L.set(p[ua] * 4096 + p[va], { u: p[ua], v: p[va], key: cRaw, done: false });
      }
      // жадное объединение плоских граней одного цвета
      for (const [layer, L] of layers) {
        const cells = [...L.values()].sort((A, B) => A.v - B.v || A.u - B.u);
        for (const cell of cells) {
          if (cell.done) continue;
          const get = (u, v) => L.get(u * 4096 + v);
          let w = 1;
          while (true) {
            const nb = get(cell.u + w, cell.v);
            if (!nb || nb.done || nb.key !== cell.key) break;
            w++;
          }
          let h = 1;
          outer: while (true) {
            for (let i = 0; i < w; i++) {
              const nb = get(cell.u + i, cell.v + h);
              if (!nb || nb.done || nb.key !== cell.key) break outer;
            }
            h++;
          }
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) get(cell.u + i, cell.v + j).done = true;
          const corners = f.c.map((cc) => {
            const r = [0, 0, 0];
            r[a] = layer + cc[a];
            r[ua] = cell.u + cc[ua] * w;
            r[va] = cell.v + cc[va] * h;
            return r;
          });
          const glow = cell.key >= LIGHT_FLAG;
          emit(out[glow ? 1 : 0], f, corners, glow ? cell.key - LIGHT_FLAG : cell.key, [3, 3, 3, 3], glow);
        }
      }
    }
    const toGeo = (o) => {
      if (!o.idx.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(o.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3));
      g.setIndex(o.idx);
      g.computeBoundingSphere();
      g.computeBoundingBox();
      return g;
    };
    return { geo: toGeo(out[0]), glow: toGeo(out[1]) };
  }
}

// Небольшой детерминированный шум для оттенков
export function hash(x, y, z = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function jitter(c, x, y, z, amt = 0.06) {
  const t = (hash(x, y, z) - 0.5) * 2 * amt;
  const col = new THREE.Color(c);
  col.offsetHSL(0, 0, t);
  return col.getHex();
}

export const glowC = (c) => c + LIGHT_FLAG;
