// Процедурная карта квартала: улицы сеткой, кварталы с домами, скверы, дом-котёл, тупики закрыты изгородями
export const CS = 2; // размер клетки в единицах мира

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// типы клеток
export const WALK = 0,
  SOLID = 1,
  HEDGE = 2; // закрытый отрезок улицы (изгородь)

export function genMap(lv, seed) {
  const R = rng(seed);
  const lines = (n) => {
    const a = [0];
    let p = 0;
    for (let i = 0; i < n; i++) {
      p += R() < 0.3 ? 5 : 4;
      a.push(p);
    }
    return a;
  };
  const xs = lines(lv.w),
    ys = lines(lv.h);
  const W = xs[xs.length - 1] + 1,
    H = ys[ys.length - 1] + 1;
  const grid = new Uint8Array(W * H).fill(SOLID);
  const id = (i, j) => j * W + i;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (xs.includes(i) || ys.includes(j)) grid[id(i, j)] = WALK;

  // кварталы
  const blocks = [];
  for (let b = 0; b < ys.length - 1; b++)
    for (let a = 0; a < xs.length - 1; a++) blocks.push({ a, b, x0: xs[a] + 1, x1: xs[a + 1] - 1, y0: ys[b] + 1, y1: ys[b + 1] - 1, kind: 'house' });

  // закрыть несколько внутренних отрезков улиц (не создавая тупиков и не разрывая карту)
  const segs = [];
  for (let k = 1; k < xs.length - 1; k++) for (let b = 0; b < ys.length - 1; b++) segs.push({ v: 1, i: xs[k], j0: ys[b] + 1, j1: ys[b + 1] - 1 });
  for (let k = 1; k < ys.length - 1; k++) for (let a = 0; a < xs.length - 1; a++) segs.push({ v: 0, j: ys[k], i0: xs[a] + 1, i1: xs[a + 1] - 1 });
  const segCells = (s) => {
    const c = [];
    if (s.v) for (let j = s.j0; j <= s.j1; j++) c.push([s.i, j]);
    else for (let i = s.i0; i <= s.i1; i++) c.push([i, s.j]);
    return c;
  };
  const walk = (i, j) => i >= 0 && j >= 0 && i < W && j < H && grid[id(i, j)] === WALK;
  const deg = (i, j) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => walk(i + dx, j + dy)).length;
  const connected = () => {
    let start = -1,
      total = 0;
    for (let k = 0; k < grid.length; k++) if (grid[k] === WALK) (total++, start < 0 && (start = k));
    const seen = new Uint8Array(grid.length);
    const q = [start];
    seen[start] = 1;
    let n = 0;
    while (q.length) {
      const k = q.pop();
      n++;
      const i = k % W,
        j = (k / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + dx,
          nj = j + dy;
        if (walk(ni, nj) && !seen[id(ni, nj)]) {
          seen[id(ni, nj)] = 1;
          q.push(id(ni, nj));
        }
      }
    }
    return n === total;
  };
  const nCut = Math.round(segs.length * 0.16);
  const hedges = [];
  for (let tries = 0; tries < 60 && hedges.length < nCut; tries++) {
    const s = segs[Math.floor(R() * segs.length)];
    if (s.cut) continue;
    const cells = segCells(s);
    cells.forEach(([i, j]) => (grid[id(i, j)] = HEDGE));
    // концы отрезка — перекрёстки; у них должно остаться ≥2 выходов
    const ends = s.v ? [[s.i, s.j0 - 1], [s.i, s.j1 + 1]] : [[s.i0 - 1, s.j], [s.i1 + 1, s.j]];
    if (ends.every(([i, j]) => deg(i, j) >= 2) && connected()) {
      s.cut = true;
      hedges.push(s);
    } else cells.forEach(([i, j]) => (grid[id(i, j)] = WALK));
  }

  // дом-котёл: квартал ближе всего к центру
  const cx = W / 2,
    cy = H / 2;
  let home = blocks[0];
  for (const b of blocks) if (Math.hypot((b.x0 + b.x1) / 2 - cx, (b.y0 + b.y1) / 2 - cy) < Math.hypot((home.x0 + home.x1) / 2 - cx, (home.y0 + home.y1) / 2 - cy)) home = b;
  home.kind = 'home';
  // скверы
  const nPark = Math.max(1, Math.round(blocks.length * 0.14));
  for (let k = 0, tries = 0; k < nPark && tries < 40; tries++) {
    const b = blocks[Math.floor(R() * blocks.length)];
    if (b.kind !== 'house') continue;
    b.kind = 'park';
    k++;
  }
  for (const b of blocks) {
    const bw = b.x1 - b.x0 + 1,
      bh = b.y1 - b.y0 + 1;
    b.obst = [];
    if (b.kind === 'house') continue;
    for (let j = b.y0; j <= b.y1; j++) for (let i = b.x0; i <= b.x1; i++) grid[id(i, j)] = WALK;
    // центр квартала — препятствие (котёл, фонтан, дерево)
    const ci = b.x0 + Math.floor((bw - 1) / 2),
      cj = b.y0 + Math.floor((bh - 1) / 2);
    const cc = [[ci, cj]];
    if (bw === 4) cc.push([ci + 1, cj]);
    if (bh === 4) cc.push([ci, cj + 1]);
    if (bw === 4 && bh === 4) cc.push([ci + 1, cj + 1]);
    for (const [i, j] of cc) {
      grid[id(i, j)] = SOLID;
      b.obst.push([i, j]);
    }
    // в сквере ещё препятствия по углам (не у дома)
    if (b.kind === 'park' && R() < 0.6) {
      const corners = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]];
      for (const [i, j] of corners) {
        if (R() < 0.5) continue;
        grid[id(i, j)] = SOLID;
        b.obst.push([i, j]);
      }
    }
    b.cx = (b.x0 + b.x1 + 1) / 2;
    b.cy = (b.y0 + b.y1 + 1) / 2;
  }

  // двери домов: сторона, выходящая на открытую улицу
  for (const b of blocks) {
    if (b.kind !== 'house') continue;
    const sides = [];
    const mi = Math.floor((b.x0 + b.x1) / 2),
      mj = Math.floor((b.y0 + b.y1) / 2);
    if (walk(mi, b.y0 - 1)) sides.push({ s: 'n', i: mi, j: b.y0 - 1 });
    if (walk(mi, b.y1 + 1)) sides.push({ s: 's', i: mi, j: b.y1 + 1 });
    if (walk(b.x0 - 1, mj)) sides.push({ s: 'w', i: b.x0 - 1, j: mj });
    if (walk(b.x1 + 1, mj)) sides.push({ s: 'e', i: b.x1 + 1, j: mj });
    // южная сторона (к камере) чуть чаще — дома видно с фасада
    const pick = sides.find((x) => x.s === 's' && R() < 0.45) || sides[Math.floor(R() * sides.length)];
    b.door = pick;
    // точка у двери (центр клетки улицы, сдвинутый к дому)
    const off = { n: [0, 0.45], s: [0, -0.45], w: [0.45, 0], e: [-0.45, 0] }[pick.s];
    b.doorX = (pick.i + 0.5 + off[0]) * CS;
    b.doorZ = (pick.j + 0.5 + off[1]) * CS;
  }

  const walkCells = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (grid[id(i, j)] === WALK) walkCells.push([i, j]);
  return {
    W,
    H,
    xs,
    ys,
    grid,
    blocks,
    hedges,
    home,
    homeX: home.cx * CS,
    homeZ: home.cy * CS,
    walkCells,
    seedR: R,
  };
}

// поиск пути по клеткам (BFS), возвращает карту расстояний от цели
export class Nav {
  constructor(map) {
    this.m = map;
    this.dist = new Int16Array(map.W * map.H);
  }
  walk(i, j) {
    const m = this.m;
    return i >= 0 && j >= 0 && i < m.W && j < m.H && m.grid[j * m.W + i] === WALK;
  }
  // поле расстояний до клетки (ti,tj)
  field(ti, tj, out) {
    const m = this.m;
    const d = out || new Int16Array(m.W * m.H);
    d.fill(-1);
    if (!this.walk(ti, tj)) return d;
    const q = new Int32Array(m.W * m.H);
    let h = 0,
      t = 0;
    q[t++] = tj * m.W + ti;
    d[tj * m.W + ti] = 0;
    while (h < t) {
      const k = q[h++];
      const i = k % m.W,
        j = (k / m.W) | 0;
      const nd = d[k] + 1;
      if (i > 0 && m.grid[k - 1] === WALK && d[k - 1] < 0) (d[k - 1] = nd), (q[t++] = k - 1);
      if (i < m.W - 1 && m.grid[k + 1] === WALK && d[k + 1] < 0) (d[k + 1] = nd), (q[t++] = k + 1);
      if (j > 0 && m.grid[k - m.W] === WALK && d[k - m.W] < 0) (d[k - m.W] = nd), (q[t++] = k - m.W);
      if (j < m.H - 1 && m.grid[k + m.W] === WALK && d[k + m.W] < 0) (d[k + m.W] = nd), (q[t++] = k + m.W);
    }
    return d;
  }
  // следующий шаг от (i,j) по полю d (к уменьшению); flee — к увеличению
  next(d, i, j, flee = false, R = Math.random) {
    const m = this.m;
    let best = null,
      bv = flee ? -1 : 1e9;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // случайный порядок, чтобы враги не ходили одинаково
    for (let k = 3; k > 0; k--) {
      const r = Math.floor(R() * (k + 1));
      [dirs[k], dirs[r]] = [dirs[r], dirs[k]];
    }
    for (const [dx, dy] of dirs) {
      const ni = i + dx,
        nj = j + dy;
      if (!this.walk(ni, nj)) continue;
      const v = d[nj * m.W + ni];
      if (v < 0) continue;
      if (flee ? v > bv : v < bv) {
        bv = v;
        best = [ni, nj];
      }
    }
    return best;
  }
}
