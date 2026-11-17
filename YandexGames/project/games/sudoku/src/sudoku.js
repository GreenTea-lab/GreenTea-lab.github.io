// Судоку: геометрия (классика 9×9, диагональное, мини 6×6), подсчёт решений, генератор,
// логический решатель с приёмами, которыми решает человек (для оценки сложности и умной подсказки),
// преобразования, сохраняющие сложность (для бесконечной свободной игры и судоку дня).

// ---------- геометрия ----------
const GEOMS = {};
export function geom(kind = 'classic') {
  if (GEOMS[kind]) return GEOMS[kind];
  const N = kind === 'mini' ? 6 : 9;
  const BR = kind === 'mini' ? 2 : 3; // высота квадрата
  const BC = 3; // ширина квадрата
  const size = N * N;
  const row = (i) => (i / N) | 0;
  const col = (i) => i % N;
  const box = (i) => ((row(i) / BR) | 0) * (N / BC) + ((col(i) / BC) | 0);
  const units = [];
  const types = [];
  for (let r = 0; r < N; r++) units.push([...Array(N)].map((_, c) => r * N + c)), types.push('row');
  for (let c = 0; c < N; c++) units.push([...Array(N)].map((_, r) => r * N + c)), types.push('col');
  for (let b = 0; b < N; b++) {
    const cells = [];
    for (let i = 0; i < size; i++) if (box(i) === b) cells.push(i);
    units.push(cells);
    types.push('box');
  }
  if (kind === 'diag') {
    units.push([...Array(N)].map((_, k) => k * N + k));
    types.push('diag');
    units.push([...Array(N)].map((_, k) => k * N + (N - 1 - k)));
    types.push('diag');
  }
  const unitsOf = [...Array(size)].map(() => []);
  units.forEach((u, k) => u.forEach((i) => unitsOf[i].push(k)));
  const peers = [...Array(size)].map((_, i) => {
    const s = new Set();
    for (const u of unitsOf[i]) for (const j of units[u]) if (j !== i) s.add(j);
    return [...s];
  });
  const G = { kind, N, BR, BC, size, ALL: (1 << N) - 1, row, col, box, units, types, unitsOf, peers };
  G.boxUnit = (i) => 2 * N + box(i);
  return (GEOMS[kind] = G);
}

export const bit = (d) => 1 << (d - 1);
export const popc = (m) => {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
};
export const digitsOf = (m) => {
  const out = [];
  for (let d = 1; m; d++, m >>= 1) if (m & 1) out.push(d);
  return out;
};
const firstDigit = (m) => 31 - Math.clz32(m & -m) + 1;

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
const shuffle = (a, R) => {
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(R() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
};

export const parse = (str) => [...str].map((c) => (c >= '1' && c <= '9' ? +c : 0));
export const stringify = (g) => g.map((v) => (v ? String(v) : '.')).join('');
export const kindOf = (str) => (str.length === 36 ? 'mini' : str[81] === 'x' ? 'diag' : 'classic');

// ---------- подсчёт решений (до limit); out — первое найденное решение ----------
export function countSolutions(G, grid, limit = 2, out = null, R = null) {
  const g = grid.slice();
  const um = new Array(G.units.length).fill(0);
  for (let i = 0; i < G.size; i++)
    if (g[i]) {
      const b = bit(g[i]);
      for (const u of G.unitsOf[i]) {
        if (um[u] & b) return 0;
        um[u] |= b;
      }
    }
  let count = 0;
  const UO = G.unitsOf;
  const rec = () => {
    let best = -1,
      bestM = 0,
      bestN = 99;
    for (let i = 0; i < G.size; i++) {
      if (g[i]) continue;
      let used = 0;
      for (const u of UO[i]) used |= um[u];
      const m = G.ALL & ~used;
      const n = popc(m);
      if (n < bestN) {
        best = i;
        bestM = m;
        bestN = n;
        if (n <= 1) break;
      }
    }
    if (best < 0) {
      count++;
      if (out && count === 1) for (let i = 0; i < G.size; i++) out[i] = g[i];
      return count >= limit;
    }
    if (!bestM) return false;
    const ds = digitsOf(bestM);
    if (R) shuffle(ds, R);
    for (const d of ds) {
      const b = bit(d);
      g[best] = d;
      for (const u of UO[best]) um[u] |= b;
      if (rec()) return true;
      for (const u of UO[best]) um[u] &= ~b;
      g[best] = 0;
    }
    return false;
  };
  rec();
  return count;
}

export function solve(G, grid) {
  const out = new Array(G.size).fill(0);
  return countSolutions(G, grid, 1, out) ? out : null;
}

// ---------- логический решатель ----------
// Приёмы по уровням: 1 — одиночки; 2 — пересечения и пары; 3 — тройки и крестокрыл; 4 — рыба-меч, XY-крыло, XYZ-крыло, четвёрки.
export const TECH = {
  full: 1,
  hiddenBox: 1,
  hidden: 1,
  naked: 1,
  pointing: 2,
  claiming: 2,
  nakedPair: 2,
  hiddenPair: 2,
  nakedTriple: 3,
  hiddenTriple: 3,
  xwing: 3,
  swordfish: 4,
  xywing: 4,
  xyzwing: 4,
  nakedQuad: 4,
  hiddenQuad: 4,
};

function combos(arr, k) {
  const res = [];
  const acc = [];
  const go = (start) => {
    if (acc.length === k) return void res.push(acc.slice());
    for (let s = start; s < arr.length; s++) {
      acc.push(arr[s]);
      go(s + 1);
      acc.pop();
    }
  };
  go(0);
  return res;
}

export class Solver {
  // grid — значения (0 — пусто). Кандидаты считаются по поставленным цифрам.
  constructor(G, grid) {
    this.G = G;
    this.g = grid.slice();
    this.cand = new Array(G.size).fill(0);
    for (let i = 0; i < G.size; i++) {
      if (this.g[i]) continue;
      let m = G.ALL;
      for (const p of G.peers[i]) if (this.g[p]) m &= ~bit(this.g[p]);
      this.cand[i] = m;
    }
  }

  filled() {
    return this.g.every((v) => v);
  }

  place(i, d) {
    this.g[i] = d;
    this.cand[i] = 0;
    for (const p of this.G.peers[i]) this.cand[p] &= ~bit(d);
  }

  apply(st) {
    if (st.place) this.place(st.place[0], st.place[1]);
    if (st.elim) for (const [i, m] of st.elim) this.cand[i] &= ~m;
  }

  // ближайший шаг: { tech, place?: [i, d], elim?: [[i, mask]], unit?, cells: [], digits: [], focus: [] }
  // maxLevel ограничивает набор приёмов
  next(maxLevel = 4) {
    const fns = [
      ['full', this._full],
      ['hiddenBox', this._hiddenBox],
      ['hidden', this._hidden],
      ['naked', this._naked],
      ['pointing', this._pointing],
      ['claiming', this._claiming],
      ['nakedPair', (s) => s._naked_n(2)],
      ['hiddenPair', (s) => s._hidden_n(2)],
      ['nakedTriple', (s) => s._naked_n(3)],
      ['hiddenTriple', (s) => s._hidden_n(3)],
      ['xwing', (s) => s._fish(2)],
      ['xywing', this._xywing],
      ['xyzwing', this._xyzwing],
      ['swordfish', (s) => s._fish(3)],
      ['nakedQuad', (s) => s._naked_n(4)],
      ['hiddenQuad', (s) => s._hidden_n(4)],
    ];
    for (const [name, fn] of fns) {
      if (TECH[name] > maxLevel) continue;
      const st = fn.call(this, this);
      if (st) {
        st.tech = name;
        return st;
      }
    }
    return null;
  }

  // противоречие: пустая клетка без кандидатов
  broken() {
    for (let i = 0; i < this.G.size; i++) if (!this.g[i] && !this.cand[i]) return true;
    return false;
  }

  _full() {
    const { units } = this.G;
    for (let u = 0; u < units.length; u++) {
      const empty = units[u].filter((i) => !this.g[i]);
      if (empty.length === 1 && popc(this.cand[empty[0]]) === 1) return { place: [empty[0], firstDigit(this.cand[empty[0]])], unit: u, cells: units[u] };
    }
    return null;
  }

  _hiddenIn(u) {
    const cells = this.G.units[u];
    for (let d = 1; d <= this.G.N; d++) {
      const b = bit(d);
      let pos = -1,
        n = 0;
      for (const i of cells) if (this.cand[i] & b) (n++, (pos = i));
      if (n === 1) return { place: [pos, d], unit: u, cells };
    }
    return null;
  }

  _hiddenBox() {
    const N = this.G.N;
    for (let u = 2 * N; u < 3 * N; u++) {
      const st = this._hiddenIn(u);
      if (st) return st;
    }
    return null;
  }

  _hidden() {
    const N = this.G.N;
    for (let u = 0; u < this.G.units.length; u++) {
      if (u >= 2 * N && u < 3 * N) continue;
      const st = this._hiddenIn(u);
      if (st) return st;
    }
    return null;
  }

  _naked() {
    for (let i = 0; i < this.G.size; i++) if (!this.g[i] && popc(this.cand[i]) === 1) return { place: [i, firstDigit(this.cand[i])], cells: [i, ...this.G.peers[i].filter((p) => this.g[p])] };
    return null;
  }

  // пересечение: в квадрате цифра только в одной строке/столбце → убрать из остальной линии
  _pointing() {
    const G = this.G;
    for (let b = 0; b < G.N; b++) {
      const bu = 2 * G.N + b;
      for (let d = 1; d <= G.N; d++) {
        const m = bit(d);
        const cells = G.units[bu].filter((i) => this.cand[i] & m);
        if (cells.length < 2) continue;
        for (const [fn, off] of [[G.row, 0], [G.col, G.N]]) {
          const k = fn(cells[0]);
          if (!cells.every((i) => fn(i) === k)) continue;
          const elim = G.units[off + k].filter((i) => G.box(i) !== b && this.cand[i] & m).map((i) => [i, m]);
          if (elim.length) return { elim, unit: off + k, box: bu, digits: [d], cells: G.units[bu], focus: cells };
        }
      }
    }
    return null;
  }

  // в линии цифра только внутри одного квадрата → убрать из остального квадрата
  _claiming() {
    const G = this.G;
    for (let u = 0; u < 2 * G.N; u++)
      for (let d = 1; d <= G.N; d++) {
        const m = bit(d);
        const cells = G.units[u].filter((i) => this.cand[i] & m);
        if (cells.length < 2) continue;
        const b = G.box(cells[0]);
        if (!cells.every((i) => G.box(i) === b)) continue;
        const bu = 2 * G.N + b;
        const set = new Set(G.units[u]);
        const elim = G.units[bu].filter((i) => !set.has(i) && this.cand[i] & m).map((i) => [i, m]);
        if (elim.length) return { elim, unit: u, box: bu, digits: [d], cells: G.units[u], focus: cells };
      }
    return null;
  }

  _naked_n(n) {
    const G = this.G;
    for (let u = 0; u < G.units.length; u++) {
      const empty = G.units[u].filter((i) => !this.g[i]);
      if (empty.length <= n) continue;
      const pool = empty.filter((i) => popc(this.cand[i]) <= n);
      if (pool.length < n) continue;
      for (const cmb of combos(pool, n)) {
        const m = cmb.reduce((a, i) => a | this.cand[i], 0);
        if (popc(m) !== n) continue;
        const elim = empty.filter((i) => !cmb.includes(i) && this.cand[i] & m).map((i) => [i, m]);
        if (elim.length) return { elim, unit: u, cells: G.units[u], focus: cmb, digits: digitsOf(m) };
      }
    }
    return null;
  }

  _hidden_n(n) {
    const G = this.G;
    for (let u = 0; u < G.units.length; u++) {
      const empty = G.units[u].filter((i) => !this.g[i]);
      if (empty.length <= n) continue;
      const ds = [];
      for (let d = 1; d <= G.N; d++) {
        const c = empty.filter((i) => this.cand[i] & bit(d)).length;
        if (c >= 2 && c <= n) ds.push(d);
      }
      if (ds.length < n) continue;
      for (const cmb of combos(ds, n)) {
        const m = cmb.reduce((a, d) => a | bit(d), 0);
        const cells = empty.filter((i) => this.cand[i] & m);
        if (cells.length !== n) continue;
        const elim = cells.filter((i) => this.cand[i] & ~m).map((i) => [i, this.cand[i] & ~m]);
        if (elim.length) return { elim, unit: u, cells: G.units[u], focus: cells, digits: cmb };
      }
    }
    return null;
  }

  // крестокрыл (n=2) и рыба-меч (n=3) по строкам и столбцам
  _fish(n) {
    const G = this.G;
    for (const [base, cross, pos] of [[0, G.N, G.col], [G.N, 0, G.row]]) {
      for (let d = 1; d <= G.N; d++) {
        const m = bit(d);
        const lines = [];
        for (let k = 0; k < G.N; k++) {
          const cells = G.units[base + k].filter((i) => this.cand[i] & m);
          if (cells.length >= 2 && cells.length <= n) lines.push([k, cells, cells.reduce((a, i) => a | (1 << pos(i)), 0)]);
        }
        if (lines.length < n) continue;
        for (const cmb of combos(lines, n)) {
          const cover = cmb.reduce((a, l) => a | l[2], 0);
          if (popc(cover) !== n) continue;
          const rows = new Set(cmb.map((l) => l[0]));
          const elim = [];
          for (let p = 0; p < G.N; p++) {
            if (!(cover & (1 << p))) continue;
            for (const i of G.units[cross + p]) {
              const k = base === 0 ? G.row(i) : G.col(i);
              if (!rows.has(k) && this.cand[i] & m) elim.push([i, m]);
            }
          }
          if (elim.length) return { elim, digits: [d], cells: cmb.flatMap((l) => G.units[base + l[0]]), focus: cmb.flatMap((l) => l[1]) };
        }
      }
    }
    return null;
  }

  _sees(a, b) {
    return a !== b && this.G.peers[a].includes(b);
  }

  _xywing() {
    const G = this.G;
    const bi = [];
    for (let i = 0; i < G.size; i++) if (!this.g[i] && popc(this.cand[i]) === 2) bi.push(i);
    for (const p of bi) {
      const [x, y] = digitsOf(this.cand[p]);
      const wings = bi.filter((w) => w !== p && this._sees(p, w));
      for (const a of wings)
        for (const b of wings) {
          if (a >= b) continue;
          const ma = this.cand[a],
            mb = this.cand[b];
          // a = xz, b = yz
          for (const [u, v] of [[x, y], [y, x]]) {
            if (!(ma & bit(u)) || !(mb & bit(v))) continue;
            const za = ma & ~bit(u),
              zb = mb & ~bit(v);
            if (za !== zb || popc(za) !== 1 || za & this.cand[p]) continue;
            const elim = [];
            for (let i = 0; i < G.size; i++) if (!this.g[i] && i !== a && i !== b && i !== p && this.cand[i] & za && this._sees(i, a) && this._sees(i, b)) elim.push([i, za]);
            if (elim.length) return { elim, digits: digitsOf(za), cells: [], focus: [p, a, b] };
          }
        }
    }
    return null;
  }

  _xyzwing() {
    const G = this.G;
    for (let p = 0; p < G.size; p++) {
      if (this.g[p] || popc(this.cand[p]) !== 3) continue;
      const mp = this.cand[p];
      const wings = this.G.peers[p].filter((w) => !this.g[w] && popc(this.cand[w]) === 2 && (this.cand[w] & mp) === this.cand[w]);
      for (const a of wings)
        for (const b of wings) {
          if (a >= b || this.cand[a] === this.cand[b]) continue;
          const z = this.cand[a] & this.cand[b];
          if (popc(z) !== 1 || (this.cand[a] | this.cand[b]) !== mp) continue;
          const elim = [];
          for (let i = 0; i < G.size; i++) if (!this.g[i] && i !== a && i !== b && i !== p && this.cand[i] & z && this._sees(i, a) && this._sees(i, b) && this._sees(i, p)) elim.push([i, z]);
          if (elim.length) return { elim, digits: digitsOf(z), cells: [], focus: [p, a, b] };
        }
    }
    return null;
  }
}

// оценка: решаем логикой; { level: 1..4 (9 — не решается), steps, counts, score }
export function rate(G, grid, maxLevel = 4) {
  const S = new Solver(G, grid);
  let level = 0,
    steps = 0,
    score = 0;
  const counts = {};
  while (!S.filled()) {
    if (steps++ > 2000 || S.broken()) return { level: 9, steps, counts, score };
    const st = S.next(maxLevel);
    if (!st) return { level: 9, steps, counts, score };
    const lv = TECH[st.tech];
    level = Math.max(level, lv);
    counts[st.tech] = (counts[st.tech] || 0) + 1;
    score += [0, 1, 6, 14, 30][lv] + (st.tech === 'naked' ? 1 : 0) + (st.tech === 'hidden' ? 0.5 : 0);
    S.apply(st);
  }
  return { level, steps, counts, score: Math.round(score) };
}

// ---------- генератор ----------
export function fullGrid(G, R) {
  const out = new Array(G.size).fill(0);
  countSolutions(G, new Array(G.size).fill(0), 1, out, R);
  return out;
}

// spec: { givens: [min, max], level: [min, max], test?: (rating, givens) => bool }
export function makePuzzle(G, R, spec, maxTries = 60) {
  const half = Math.ceil(G.size / 2);
  for (let t = 0; t < maxTries; t++) {
    const sol = fullGrid(G, R);
    const g = sol.slice();
    const lo = spec.givens[0],
      hi = spec.givens[1];
    const target = lo + Math.floor(R() * (hi - lo + 1));
    // удаляем симметричными парами (центральная симметрия)
    const order = shuffle([...Array(half).keys()], R);
    let givens = G.size;
    for (const i of order) {
      if (givens <= target) break;
      const j = G.size - 1 - i;
      const a = g[i],
        b = g[j];
      g[i] = 0;
      g[j] = 0;
      if (countSolutions(G, g, 2) !== 1) {
        g[i] = a;
        g[j] = b;
      } else givens -= i === j ? 1 : 2;
    }
    if (givens > hi) continue;
    const r = rate(G, g);
    if (r.level >= spec.level[0] && r.level <= spec.level[1] && (!spec.test || spec.test(r, givens))) return { puzzle: stringify(g), givens, ...r };
  }
  return null;
}

// ---------- преобразования, сохраняющие единственность и сложность ----------
// seed → новая головоломка того же вида
export function transform(str, seed) {
  const kind = kindOf(str);
  const G = geom(kind);
  const N = G.N;
  const R = rng(seed * 7919 + 13);
  const g = parse(str.slice(0, G.size));
  const dmap = [0, ...shuffle([...Array(N)].map((_, k) => k + 1), R)];
  let rows, cols;
  if (kind === 'diag') {
    // для диагонального — только симметрии квадрата (диагонали остаются диагоналями)
    // и согласованная перестановка «зеркальных» пар строк и столбцов
    // перестановка внутри внешних полос (0..2 и 6..8) согласованно для зеркальных строк, центр на месте
    const outer = shuffle([0, 1, 2], R);
    const swapBands = R() < 0.5;
    rows = [...Array(9)];
    for (let k = 0; k < 3; k++) {
      const a = outer[k];
      rows[k] = swapBands ? 8 - a : a;
      rows[8 - k] = swapBands ? a : 8 - a;
    }
    const mid = R() < 0.5;
    rows[3] = mid ? 5 : 3;
    rows[5] = mid ? 3 : 5;
    rows[4] = 4;
    cols = rows.slice();
  } else {
    const perm = (bands, size) => {
      const out = [];
      for (const b of shuffle([...Array(bands).keys()], R)) for (const k of shuffle([...Array(size).keys()], R)) out.push(b * size + k);
      return out;
    };
    rows = perm(N / G.BR, G.BR);
    cols = perm(N / G.BC, G.BC);
  }
  const transpose = kind !== 'mini' && R() < 0.5;
  const out = new Array(G.size).fill(0);
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      let v = g[rows[r] * N + cols[c]];
      if (v) v = dmap[v];
      if (transpose) out[c * N + r] = v;
      else out[r * N + c] = v;
    }
  return stringify(out) + (kind === 'diag' ? 'x' : '');
}
