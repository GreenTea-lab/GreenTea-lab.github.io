// Судоку: решатель (подсчёт решений), генератор с единственным решением и оценка сложности
// по логическим приёмам, которыми решает человек.

export const ROW = (i) => (i / 9) | 0;
export const COL = (i) => i % 9;
export const BOX = (i) => ((ROW(i) / 3) | 0) * 3 + ((COL(i) / 3) | 0);

// группы: 9 строк, 9 столбцов, 9 квадратов
export const UNITS = [];
for (let r = 0; r < 9; r++) UNITS.push([...Array(9)].map((_, c) => r * 9 + c));
for (let c = 0; c < 9; c++) UNITS.push([...Array(9)].map((_, r) => r * 9 + c));
for (let b = 0; b < 9; b++) {
  const r0 = ((b / 3) | 0) * 3,
    c0 = (b % 3) * 3;
  UNITS.push([...Array(9)].map((_, k) => (r0 + ((k / 3) | 0)) * 9 + c0 + (k % 3)));
}
export const PEERS = [...Array(81)].map((_, i) => {
  const s = new Set();
  for (const u of [UNITS[ROW(i)], UNITS[9 + COL(i)], UNITS[18 + BOX(i)]]) for (const j of u) if (j !== i) s.add(j);
  return [...s];
});
const ALL = 0x1ff;
const bit = (d) => 1 << (d - 1);
const popc = (m) => {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
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

export const parse = (str) => [...str].map((c) => (c >= '1' && c <= '9' ? +c : 0));
export const stringify = (g) => g.map((v) => (v ? String(v) : '.')).join('');

// подсчёт решений (до limit); out — первое найденное решение
export function countSolutions(grid, limit = 2, out = null, R = null) {
  const g = grid.slice();
  const rows = new Array(9).fill(0),
    cols = new Array(9).fill(0),
    boxs = new Array(9).fill(0);
  for (let i = 0; i < 81; i++)
    if (g[i]) {
      const b = bit(g[i]);
      if (rows[ROW(i)] & b || cols[COL(i)] & b || boxs[BOX(i)] & b) return 0;
      rows[ROW(i)] |= b;
      cols[COL(i)] |= b;
      boxs[BOX(i)] |= b;
    }
  let count = 0;
  const rec = () => {
    let best = -1,
      bestM = 0,
      bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ALL & ~(rows[ROW(i)] | cols[COL(i)] | boxs[BOX(i)]);
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
      if (out && count === 1) for (let i = 0; i < 81; i++) out[i] = g[i];
      return count >= limit;
    }
    if (!bestM) return false;
    const ds = [];
    for (let d = 1; d <= 9; d++) if (bestM & bit(d)) ds.push(d);
    if (R)
      for (let k = ds.length - 1; k > 0; k--) {
        const j = Math.floor(R() * (k + 1));
        [ds[k], ds[j]] = [ds[j], ds[k]];
      }
    const r = ROW(best),
      c = COL(best),
      bx = BOX(best);
    for (const d of ds) {
      const b = bit(d);
      g[best] = d;
      rows[r] |= b;
      cols[c] |= b;
      boxs[bx] |= b;
      if (rec()) return true;
      rows[r] &= ~b;
      cols[c] &= ~b;
      boxs[bx] &= ~b;
      g[best] = 0;
    }
    return false;
  };
  rec();
  return count;
}

export function solve(grid) {
  const out = new Array(81).fill(0);
  return countSolutions(grid, 1, out) ? out : null;
}

// ---------- логическое решение и оценка сложности ----------
// уровни: 1 — одиночки, 3 — пересечения и пары, 4 — тройки и «крестокрыл», 9 — логикой не решается
export function rate(grid) {
  const g = grid.slice();
  const cand = new Array(81).fill(0);
  const init = () => {
    for (let i = 0; i < 81; i++) {
      if (g[i]) {
        cand[i] = 0;
        continue;
      }
      let m = ALL;
      for (const p of PEERS[i]) if (g[p]) m &= ~bit(g[p]);
      cand[i] = m;
    }
  };
  init();
  const place = (i, d) => {
    g[i] = d;
    cand[i] = 0;
    for (const p of PEERS[i]) cand[p] &= ~bit(d);
  };
  let level = 0;
  let steps = 0;
  const filled = () => g.every((v) => v);
  const singles = () => {
    for (let i = 0; i < 81; i++)
      if (!g[i] && popc(cand[i]) === 1) {
        place(i, firstDigit(cand[i]));
        return true;
      }
    for (const u of UNITS)
      for (let d = 1; d <= 9; d++) {
        const b = bit(d);
        let pos = -1,
          n = 0;
        for (const i of u) if (cand[i] & b) (n++, (pos = i));
        if (n === 1) {
          place(pos, d);
          return true;
        }
      }
    return false;
  };
  // пересечения: цифра в квадрате только в одной строке/столбце и наоборот
  const locked = () => {
    let ch = false;
    for (let bx = 0; bx < 9; bx++) {
      const box = UNITS[18 + bx];
      for (let d = 1; d <= 9; d++) {
        const b = bit(d);
        const cells = box.filter((i) => cand[i] & b);
        if (cells.length < 2) continue;
        for (const [fn, off] of [[ROW, 0], [COL, 9]]) {
          const k = fn(cells[0]);
          if (cells.every((i) => fn(i) === k))
            for (const i of UNITS[off + k]) if (BOX(i) !== bx && cand[i] & b) ((cand[i] &= ~b), (ch = true));
        }
      }
    }
    for (let u = 0; u < 18; u++) {
      for (let d = 1; d <= 9; d++) {
        const b = bit(d);
        const cells = UNITS[u].filter((i) => cand[i] & b);
        if (cells.length < 2) continue;
        const bx = BOX(cells[0]);
        if (cells.every((i) => BOX(i) === bx)) for (const i of UNITS[18 + bx]) if (!UNITS[u].includes(i) && cand[i] & b) ((cand[i] &= ~b), (ch = true));
      }
    }
    return ch;
  };
  // голые и скрытые подмножества размера n
  const subsets = (n) => {
    let ch = false;
    for (const u of UNITS) {
      const empty = u.filter((i) => !g[i]);
      // голые
      const pool = empty.filter((i) => popc(cand[i]) <= n);
      const combos = (arr, k, start = 0, acc = [], res = []) => {
        if (acc.length === k) res.push(acc.slice());
        else for (let s = start; s < arr.length; s++) (acc.push(arr[s]), combos(arr, k, s + 1, acc, res), acc.pop());
        return res;
      };
      for (const cmb of combos(pool, n)) {
        const m = cmb.reduce((a, i) => a | cand[i], 0);
        if (popc(m) !== n) continue;
        for (const i of empty) if (!cmb.includes(i) && cand[i] & m) ((cand[i] &= ~m), (ch = true));
      }
      // скрытые
      const digits = [];
      for (let d = 1; d <= 9; d++) {
        const cnt = empty.filter((i) => cand[i] & bit(d)).length;
        if (cnt >= 1 && cnt <= n) digits.push(d);
      }
      for (const cmb of combos(digits, n)) {
        const m = cmb.reduce((a, d) => a | bit(d), 0);
        const cells = empty.filter((i) => cand[i] & m);
        if (cells.length !== n) continue;
        for (const i of cells) if (cand[i] & ~m) ((cand[i] &= m), (ch = true));
      }
    }
    return ch;
  };
  // крестокрыл (X-wing) по строкам и столбцам
  const xwing = () => {
    let ch = false;
    for (const [base, cross] of [[0, 9], [9, 0]]) {
      for (let d = 1; d <= 9; d++) {
        const b = bit(d);
        const lines = [];
        for (let k = 0; k < 9; k++) {
          const pos = UNITS[base + k].filter((i) => cand[i] & b).map((i) => (base === 0 ? COL(i) : ROW(i)));
          if (pos.length === 2) lines.push([k, pos]);
        }
        for (let a = 0; a < lines.length; a++)
          for (let c = a + 1; c < lines.length; c++) {
            const [ka, pa] = lines[a],
              [kc, pc] = lines[c];
            if (pa[0] !== pc[0] || pa[1] !== pc[1]) continue;
            for (const p of pa)
              for (const i of UNITS[cross + p]) {
                const k = base === 0 ? ROW(i) : COL(i);
                if (k !== ka && k !== kc && cand[i] & b) ((cand[i] &= ~b), (ch = true));
              }
          }
      }
    }
    return ch;
  };
  while (!filled()) {
    if (steps++ > 400) break;
    if (singles()) {
      level = Math.max(level, 1);
      continue;
    }
    if (locked() || subsets(2)) {
      level = Math.max(level, 3);
      continue;
    }
    if (subsets(3) || xwing()) {
      level = Math.max(level, 4);
      continue;
    }
    return 9;
  }
  return filled() ? level : 9;
}

// полная решённая сетка
export function fullGrid(R) {
  const out = new Array(81).fill(0);
  countSolutions(new Array(81).fill(0), 1, out, R);
  return out;
}

// головоломка заданной сложности: { givens: [min, max], level: [min, max] }
export function makePuzzle(R, spec, maxTries = 60) {
  for (let t = 0; t < maxTries; t++) {
    const sol = fullGrid(R);
    const g = sol.slice();
    const target = spec.givens[0] + Math.floor(R() * (spec.givens[1] - spec.givens[0] + 1));
    // удаляем симметричными парами
    const order = [...Array(41).keys()];
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(R() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }
    let givens = 81;
    for (const i of order) {
      if (givens <= target) break;
      const j = 80 - i;
      const a = g[i],
        b = g[j];
      g[i] = 0;
      g[j] = 0;
      if (countSolutions(g, 2) !== 1) {
        g[i] = a;
        g[j] = b;
      } else givens -= i === j ? 1 : 2;
    }
    if (givens > spec.givens[1]) continue;
    const lv = rate(g);
    if (lv >= spec.level[0] && lv <= spec.level[1]) return { puzzle: stringify(g), solution: stringify(sol), givens, level: lv };
  }
  return null;
}

export const SPECS = {
  easy: { givens: [36, 40], level: [1, 1] },
  medium: { givens: [29, 32], level: [1, 1] },
  hard: { givens: [25, 29], level: [3, 3] },
  expert: { givens: [22, 27], level: [4, 4] },
};
