// Логика блок-пазла 8×8: фигуры, поле, установка, сбор линий, очки, генератор фигур.
// Чистый модуль без DOM: им пользуются игра, бот-подсказка и тесты в Node.

export const N = 8;
export const COLORS = 7; // число цветов блоков (0..6); 7 — «старое дерево» предзаполненных уровней
export const OLD = 7;

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const next = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  next.state = () => s;
  next.restore = value => { s = value >>> 0; };
  return next;
}

// ---------- фигуры (без поворотов: каждая ориентация — отдельная фигура) ----------
const P = (rows) => {
  const cells = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && cells.push([x, y])));
  return { cells, w: Math.max(...rows.map((r) => r.length)), h: rows.length };
};
// w — вес в генераторе, d — «неудобство» (большие и кривые фигуры появляются чаще по ходу игры)
const DEFS = [
  ['dot', 4, 0, ['#']],
  ['i2h', 6, 0, ['##']], ['i2v', 6, 0, ['#', '#']],
  ['i3h', 6, 0, ['###']], ['i3v', 6, 0, ['#', '#', '#']],
  ['i4h', 4, 1, ['####']], ['i4v', 4, 1, ['#', '#', '#', '#']],
  ['i5h', 2, 2, ['#####']], ['i5v', 2, 2, ['#', '#', '#', '#', '#']],
  ['o2', 7, 0, ['##', '##']],
  ['o3', 2, 2, ['###', '###', '###']],
  ['r23', 3, 1, ['##', '##', '##']], ['r32', 3, 1, ['###', '###']],
  ['c1', 4, 0, ['##', '#.']], ['c2', 4, 0, ['##', '.#']], ['c3', 4, 0, ['#.', '##']], ['c4', 4, 0, ['.#', '##']],
  ['l1', 2, 1, ['#.', '#.', '##']], ['l2', 2, 1, ['.#', '.#', '##']], ['l3', 2, 1, ['##', '#.', '#.']], ['l4', 2, 1, ['##', '.#', '.#']],
  ['l5', 2, 1, ['###', '#..']], ['l6', 2, 1, ['###', '..#']], ['l7', 2, 1, ['#..', '###']], ['l8', 2, 1, ['..#', '###']],
  ['t1', 2, 1, ['###', '.#.']], ['t2', 2, 1, ['.#.', '###']], ['t3', 2, 1, ['#.', '##', '#.']], ['t4', 2, 1, ['.#', '##', '.#']],
  ['s1', 1, 2, ['.##', '##.']], ['s2', 1, 2, ['##.', '.##']], ['s3', 1, 2, ['#.', '##', '.#']], ['s4', 1, 2, ['.#', '##', '#.']],
  ['b1', 1, 2, ['###', '#..', '#..']], ['b2', 1, 2, ['###', '..#', '..#']], ['b3', 1, 2, ['#..', '#..', '###']], ['b4', 1, 2, ['..#', '..#', '###']],
];
export const SHAPES = DEFS.map(([id, w, d, rows]) => ({ id, w8: w, d, ...P(rows) }));
export const SHAPE = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

// ---------- поле ----------
// клетка: null или { c: цвет, it: предмет (строка) | undefined }
export const emptyBoard = () => Array.from({ length: N * N }, () => null);
export const cloneBoard = (b) => b.map((c) => (c ? { ...c } : null));

export function canPlace(board, shape, x, y) {
  for (const [dx, dy] of shape.cells) {
    const cx = x + dx, cy = y + dy;
    if (cx < 0 || cy < 0 || cx >= N || cy >= N) return false;
    if (board[cy * N + cx]) return false;
  }
  return true;
}

export function fits(board, shape) {
  for (let y = 0; y <= N - shape.h; y++) for (let x = 0; x <= N - shape.w; x++) if (canPlace(board, shape, x, y)) return true;
  return false;
}

export function placements(board, shape) {
  const out = [];
  for (let y = 0; y <= N - shape.h; y++) for (let x = 0; x <= N - shape.w; x++) if (canPlace(board, shape, x, y)) out.push([x, y]);
  return out;
}

// какие ряды и столбцы заполнятся, если поставить фигуру (без изменения поля)
export function wouldClear(board, shape, x, y) {
  const filled = new Set(shape.cells.map(([dx, dy]) => (y + dy) * N + x + dx));
  const has = (i) => !!board[i] || filled.has(i);
  const rows = [], cols = [];
  for (let r = 0; r < N; r++) {
    let ok = true;
    for (let c = 0; c < N && ok; c++) ok = has(r * N + c);
    if (ok) rows.push(r);
  }
  for (let c = 0; c < N; c++) {
    let ok = true;
    for (let r = 0; r < N && ok; r++) ok = has(r * N + c);
    if (ok) cols.push(c);
  }
  return { rows, cols };
}

// очки за одновременно собранные линии: 1 → 10, 2 → 30, 3 → 60, 4 → 100 …
export const lineScore = (n) => (10 * n * (n + 1)) / 2;

// ---------- состояние партии ----------
export class Game {
  constructor(opts = {}) {
    this.seed = opts.seed ?? ((Math.random() * 1e9) | 0);
    this.R = rng(this.seed);
    this.board = opts.board ? cloneBoard(opts.board) : emptyBoard();
    this.score = 0;
    this.combo = 0; // серия: растёт, если линии собираются не реже раза в 3 хода
    this.bestCombo = 0;
    this.sinceClear = 0;
    this.moves = 0;
    this.lines = 0;
    this.tray = [null, null, null]; // { s: id фигуры, c: цвет, it?: [индекс клетки, предмет] }
    this.collected = {};
    this.level = opts.level || null; // { goal, itemsOnPieces, items }
    this.history = [];
    this.genCount = 0;
    this.mode = opts.mode || 'classic';
  }

  // ---------- генератор фигур ----------
  // Мягкий: старается дать набор, который целиком помещается, а при тесном поле подбрасывает «спасительные» фигуры.
  refill() {
    if(this.genCount === 0 && this.level?.startingTray) {
      this.tray=this.level.startingTray.map(p=>({...p}));
      this.genCount++;
      return;
    }
    const fill = this.board.filter(Boolean).length / (N * N);
    const hard = Math.min(1, this.mode === 'classic' ? this.score / 6000 : 0.3 + (this.level ? this.level.diff * 0.5 : 0));
    let best = null, bestQ = -1;
    for (let attempt = 0; attempt < 14; attempt++) {
      const set = [0, 1, 2].map(() => this._pick(hard, fill));
      const q = this._quality(set, fill);
      if (q > bestQ) {
        best = set;
        bestQ = q;
      }
      if (q >= 3) break;
    }
    // иногда кладём фигуру, которая сразу собирает линию (приятно и снижает тесноту)
    if (fill > 0.3 && this.R() < 0.35 + fill * 0.4) {
      const helper = this._helper();
      if (helper) best[(this.R() * 3) | 0] = helper;
    }
    this.genCount++;
    this.tray = best.map((s, i) => ({ s, c: this._color(i) }));
    this._dropItems();
    return this.tray;
  }

  _color(i) {
    // три фигуры набора — разных цветов
    if (i === 0) this._cols = [];
    let c;
    do c = (this.R() * COLORS) | 0;
    while (this._cols.includes(c));
    this._cols.push(c);
    return c;
  }

  _pick(hard, fill) {
    let tot = 0;
    const ws = SHAPES.map((s) => {
      let w = s.w8;
      if(this.level?.modifier==='small'&&s.cells.length>4)return 0;
      if(this.level?.modifier==='long'&&s.w>1&&s.h>1)return 0;
      w *= s.d === 0 ? 1.2 - hard * 0.4 : s.d === 1 ? 0.8 + hard * 0.4 : 0.5 + hard * 0.9;
      if (fill > 0.55) w *= s.cells.length <= 3 ? 1.8 : s.cells.length >= 5 ? 0.45 : 1;
      tot += w;
      return w;
    });
    let r = this.R() * tot;
    for (let i = 0; i < SHAPES.length; i++) if ((r -= ws[i]) <= 0) return SHAPES[i].id;
    return 'dot';
  }

  // 3 — набор ставится целиком в каком-то порядке, 2 — каждая фигура помещается по отдельности, 1 — хоть одна, 0 — ни одной
  _quality(set, fill) {
    const sh = set.map((id) => SHAPE[id]);
    const each = sh.filter((s) => fits(this.board, s)).length;
    if (each === 0) return 0;
    if (each < 3) return each === 1 ? 1 : 1.5;
    if (fill < 0.35) return 3;
    return canPlaceAll(this.board, sh, 4000) ? 3 : 2;
  }

  // фигура, которая собирает хотя бы одну линию
  _helper() {
    const cands = [];
    for (const s of SHAPES) {
      if(this.level?.modifier==='small'&&s.cells.length>4)continue;
      if(this.level?.modifier==='long'&&s.w>1&&s.h>1)continue;
      for (const [x, y] of placements(this.board, s)) {
        const w = wouldClear(this.board, s, x, y);
        const n = w.rows.length + w.cols.length;
        if (n) cands.push([s.id, n + s.cells.length * 0.1]);
      }
    }
    if (!cands.length) return null;
    cands.sort((a, b) => b[1] - a[1]);
    const top = cands.slice(0, 6);
    return top[(this.R() * top.length) | 0][0];
  }

  // предметы уровня приезжают и на новых фигурах, если на поле их не хватает до цели
  _dropItems() {
    const L = this.level;
    if (!L || L.goal.type !== 'items' || L.goal.onlyBoard) return;
    for (const [it, need] of Object.entries(L.goal.items)) {
      const have = (this.collected[it] || 0) + this.board.filter((c) => c && c.it === it).length + this.tray.filter((t) => t && t.it && t.it[1] === it).length;
      if (have >= need + 1) continue;
      if (this.R() > (L.itemsOnPieces ?? 0.35) + (have < need ? 0.25 : 0)) continue;
      const free = this.tray.filter((t) => t && !t.it);
      if (!free.length) return;
      const t = free[(this.R() * free.length) | 0];
      const sh = SHAPE[t.s];
      t.it = [(this.R() * sh.cells.length) | 0, it];
    }
  }

  canAny() {
    return this.tray.some((t) => t && fits(this.board, SHAPE[t.s]));
  }

  // ---------- ход ----------
  // возвращает событие с подробностями для анимации, или null, если нельзя
  place(slot, x, y) {
    const t = this.tray[slot];
    if (!t) return null;
    const sh = SHAPE[t.s];
    if (!canPlace(this.board, sh, x, y)) return null;
    this.history.push(this.snapshot());
    if (this.history.length > 5) this.history.shift();
    const cells = [];
    sh.cells.forEach(([dx, dy], k) => {
      const i = (y + dy) * N + x + dx;
      this.board[i] = { c: t.c };
      if (t.it && t.it[0] === k) this.board[i].it = t.it[1];
      cells.push(i);
    });
    this.tray[slot] = null;
    this.moves++;
    let gained = sh.cells.length;
    const { rows, cols } = wouldClear(this.board, { cells: [] }, 0, 0);
    const n = rows.length + cols.length;
    const cleared = [];
    const items = [];
    let linePts = 0;
    if (n) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.sinceClear = 0;
      linePts = lineScore(n) * Math.max(1, this.combo);
      gained += linePts;
      this.lines += n;
      const set = new Set();
      rows.forEach((r) => { for (let c = 0; c < N; c++) set.add(r * N + c); });
      cols.forEach((c) => { for (let r = 0; r < N; r++) set.add(r * N + c); });
      for (const i of set) {
        const b = this.board[i];
        if (b && b.it) {
          items.push([i, b.it]);
          this.collected[b.it] = (this.collected[b.it] || 0) + 1;
        }
        cleared.push([i, b ? b.c : t.c]);
        this.board[i] = null;
      }
    } else {
      this.sinceClear++;
      if (this.sinceClear >= 3) this.combo = 0;
    }
    let allClear = false;
    if (n && this.board.every((c) => !c)) {
      allClear = true;
      gained += 300;
    }
    this.score += gained;
    let refilled = false;
    if (this.tray.every((s) => !s)) {
      this.refill();
      refilled = true;
    }
    return { slot, x, y, shape: sh, color: t.c, cells, rows, cols, n, cleared, items, gained, linePts, combo: this.combo, allClear, refilled };
  }

  // ---------- цели приключения ----------
  goalLeft() {
    const L = this.level;
    if (!L) return null;
    if (L.goal.type === 'score') return Math.max(0, L.goal.target - this.score);
    if (L.goal.type === 'lines') return Math.max(0, L.goal.target - this.lines);
    if (L.goal.type === 'combo') return Math.max(0, L.goal.target - this.bestCombo);
    let s = 0;
    for (const [it, need] of Object.entries(L.goal.items)) s += Math.max(0, need - (this.collected[it] || 0));
    return s;
  }
  won() {
    return this.level ? this.goalLeft() === 0 : false;
  }

  goalValue() { return this.level?.goal.type==='lines'?this.lines:this.level?.goal.type==='combo'?this.bestCombo:this.score; }

  // ---------- помощники ----------
  snapshot() {
    return JSON.stringify({ b: this.board, t: this.tray, s: this.score, c: this.combo, bc:this.bestCombo, sc: this.sinceClear, m: this.moves, l: this.lines, col: this.collected });
  }
  restore(str) {
    const d = JSON.parse(str);
    this.board = d.b;
    this.tray = d.t;
    this.score = d.s;
    this.combo = d.c;
    this.bestCombo = d.bc ?? d.c;
    this.sinceClear = d.sc;
    this.moves = d.m;
    this.lines = d.l;
    this.collected = d.col || {};
  }
  undo() {
    const h = this.history.pop();
    if (!h) return false;
    this.restore(h);
    return true;
  }
  // молоток: убрать один блок
  smash(i) {
    if (!this.board[i]) return false;
    this.history.push(this.snapshot());
    const b = this.board[i];
    if (b.it) this.collected[b.it] = (this.collected[b.it] || 0) + 1;
    this.board[i] = null;
    return b;
  }
  // новые фигуры: только те, что помещаются
  reroll() {
    this.history.push(this.snapshot());
    for (let k = 0; k < 30; k++) {
      this.refill();
      if (this.tray.every((t) => fits(this.board, SHAPE[t.s]))) return true;
    }
    return true;
  }
  // продолжение после «нет места»: очистить центр 4×4 и дать подходящие фигуры
  revive() {
    const removed = [];
    for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) {
      const i = y * N + x;
      if (this.board[i]) {
        removed.push([i, this.board[i].c]);
        if (this.board[i].it) this.collected[this.board[i].it] = (this.collected[this.board[i].it] || 0) + 1;
        this.board[i] = null;
      }
    }
    this.combo = 0;
    this.sinceClear = 0;
    this.reroll();
    this.history.length = 0;
    return removed;
  }

  // сериализация незаконченной партии
  toJSON() {
    return { seed: this.seed, rng: this.R.state(), b: cloneBoard(this.board), t: this.tray.map(p=>p?{...p,it:p.it?[...p.it]:undefined}:null), s: this.score, c: this.combo, bc:this.bestCombo, sc: this.sinceClear, m: this.moves, l: this.lines, col: {...this.collected}, g: this.genCount, mode: this.mode };
  }
  static fromJSON(d, level) {
    if (!d || !Number.isFinite(d.seed) || !Array.isArray(d.b) || d.b.length !== N*N || !Array.isArray(d.t) || d.t.length !== 3 || d.t.some(p=>p&&!SHAPE[p.s]) || d.b.some(c=>c&&(!Number.isInteger(c.c)||c.c<0||c.c>7))) throw new Error('Invalid saved board');
    for(const key of ['s','c','sc','m','l'])if(!Number.isFinite(d[key])||d[key]<0)throw new Error('Invalid saved counters');
    const g = new Game({ seed: Number.isInteger(d.rng) ? d.seed : d.seed + (d.g || 0) * 7919, mode: d.mode, level });
    if (Number.isInteger(d.rng)) g.R.restore(d.rng);
    g.board = cloneBoard(d.b);
    g.tray = d.t.map(p=>p?{...p,it:p.it?[...p.it]:undefined}:null);
    g.score = d.s;
    g.combo = d.c;
    g.bestCombo = d.bc ?? d.c;
    g.sinceClear = d.sc;
    g.moves = d.m;
    g.lines = d.l;
    g.collected = {...d.col};
    g.genCount = d.g || 0;
    return g;
  }
}

// поставить все фигуры по очереди в каком-нибудь порядке (поиск с ограничением числа узлов)
export function canPlaceAll(board, shapes, budget = 4000) {
  let nodes = 0;
  const b = board.map((c) => !!c);
  const rec = (left) => {
    if (!left.length) return true;
    if (++nodes > budget) return true; // слишком долго — считаем, что можно
    for (let k = 0; k < left.length; k++) {
      const s = left[k];
      const rest = left.slice(0, k).concat(left.slice(k + 1));
      for (let y = 0; y <= N - s.h; y++) for (let x = 0; x <= N - s.w; x++) {
        let ok = true;
        for (const [dx, dy] of s.cells) if (b[(y + dy) * N + x + dx]) { ok = false; break; }
        if (!ok) continue;
        const idx = s.cells.map(([dx, dy]) => (y + dy) * N + x + dx);
        idx.forEach((i) => (b[i] = true));
        // сбор линий освобождает место
        const freed = [];
        for (let r = 0; r < N; r++) { let f = true; for (let c = 0; c < N && f; c++) f = b[r * N + c]; if (f) for (let c = 0; c < N; c++) freed.push(r * N + c); }
        for (let c = 0; c < N; c++) { let f = true; for (let r = 0; r < N && f; r++) f = b[r * N + c]; if (f) for (let r = 0; r < N; r++) freed.push(r * N + c); }
        const saved = freed.map((i) => b[i]);
        freed.forEach((i) => (b[i] = false));
        const ok2 = rec(rest);
        freed.forEach((i, j) => (b[i] = saved[j]));
        idx.forEach((i) => (b[i] = false));
        if (ok2) return true;
        if (nodes > budget) return true;
      }
    }
    return false;
  };
  return rec(shapes);
}
