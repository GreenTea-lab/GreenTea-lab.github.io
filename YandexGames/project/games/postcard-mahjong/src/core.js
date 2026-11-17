// Логика маджонга: плитки, свобода, генерация раскладов с гарантией решения, перемешивание, отмена, подсказка.
// Координаты в половинках плитки: плитка занимает квадрат 2×2 половинки.

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const next=() => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  next.state=()=>s;
  next.restore=value=>{s=value>>>0;};
  return next;
}
const pick = (arr, R) => arr[Math.floor(R() * arr.length)];
function shuffleArr(a, R) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// связи между плитками: кто сверху, кто слева/справа на том же слое
export function link(tiles) {
  for (const t of tiles) {
    t.above = [];
    t.left = [];
    t.right = [];
    t.below = [];
  }
  for (let i = 0; i < tiles.length; i++) {
    const a = tiles[i];
    for (let j = 0; j < tiles.length; j++) {
      if (i === j) continue;
      const b = tiles[j];
      const ox = Math.abs(a.x - b.x) < 2, oy = Math.abs(a.y - b.y) < 2;
      if (b.z > a.z && ox && oy) a.above.push(j);
      if (b.z < a.z && ox && oy) a.below.push(j);
      if (b.z === a.z && oy) {
        if (b.x === a.x - 2) a.left.push(j);
        if (b.x === a.x + 2) a.right.push(j);
      }
    }
  }
}

// свободна ли плитка при данном наборе живых (alive — массив флагов)
export function isFree(tiles, alive, i) {
  const t = tiles[i];
  if (!alive[i]) return false;
  for (const j of t.above) if (alive[j]) return false;
  let l = true, r = true;
  for (const j of t.left) if (alive[j]) { l = false; break; }
  if (l) return true;
  for (const j of t.right) if (alive[j]) { r = false; break; }
  return r;
}

// порядок снятия пар от полного поля к пустому (это и есть одно из решений)
// выбор с весом: сначала верхние и «мешающие» плитки, чтобы не оставались одинокие столбики
export function genOrder(tiles, idx, R, tries = 300) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const alive = new Array(tiles.length).fill(false);
    for (const i of idx) alive[i] = true;
    let left = idx.length;
    const order = [];
    let ok = true;
    while (left > 0) {
      const free = idx.filter((i) => isFree(tiles, alive, i));
      if (free.length < 2) {
        ok = false;
        break;
      }
      const w = free.map((i) => {
        const t = tiles[i];
        let below = 0;
        for (const j of t.below) if (alive[j]) below++;
        return 1 + t.z * 1.5 + below * 0.8 + R() * 0.6;
      });
      const take = () => {
        let s = 0;
        for (const x of w) s += x;
        let r = R() * s;
        for (let k = 0; k < free.length; k++) {
          r -= w[k];
          if (r <= 0 || k === free.length - 1) {
            const i = free[k];
            free.splice(k, 1);
            w.splice(k, 1);
            return i;
          }
        }
      };
      const a = take();
      const b = take();
      alive[a] = alive[b] = false;
      left -= 2;
      order.push([a, b]);
    }
    if (ok) return order;
  }
  return null;
}

// Партия
export class Game {
  // opts: { pos:[{x,y,z}], types:[face ids], seed, coins:n пар с монетками, locks:n замков, hidden:доля закрытых }
  constructor(opts) {
    this.opts = opts;
    this.R = rng(opts.seed || 1);
    this.tiles = opts.pos.map((p, id) => ({ id, x: p.x, y: p.y, z: p.z, f: null, coin: false, lock: false, hidden: false, seen: false }));
    link(this.tiles);
    this.alive = new Array(this.tiles.length).fill(true);
    this.history = [];
    this.pairs = 0;
    this.score = 0;
    this.deal();
  }

  get left() {
    let n = 0;
    for (const a of this.alive) if (a) n++;
    return n;
  }

  deal() {
    const R = this.R, T = this.tiles, o = this.opts;
    const idx = T.map((t) => t.id);
    const order = genOrder(T, idx, R);
    if (!order) throw new Error('layout not solvable');
    const P = order.length;
    // замки: пара ключей в первой трети решения, замки — на плитках из пар позже
    let keyAt = -1;
    if (o.locks) keyAt = Math.min(P - 3, Math.floor(R() * Math.max(1, P * 0.3)));
    // лица: каждый тип по 2 пары (4 плитки), если пар меньше — часть типов по одной паре
    const faces = [];
    const types = shuffleArr(o.types.slice(), R);
    const need = keyAt >= 0 ? P - 1 : P;
    let k = 0;
    if(Number.isInteger(o.pairCopies)&&o.pairCopies>=1&&o.pairCopies<=3){
      while(faces.length<need){const f=types[k++%types.length];for(let n=0;n<o.pairCopies&&faces.length<need;n++)faces.push(f);}
    }else while (faces.length < need) {
      const f = types[k % types.length];
      faces.push(f);
      if (faces.length < need && k < types.length * 8) faces.push(f);
      k++;
    }
    shuffleArr(faces, R);
    let fi = 0;
    order.forEach(([a, b], n) => {
      const f = n === keyAt ? 'key' : faces[fi++];
      T[a].f = T[b].f = f;
    });
    if (keyAt >= 0) {
      const later = [];
      order.slice(keyAt + 2).forEach(([a, b]) => later.push(a, b));
      shuffleArr(later, R)
        .slice(0, o.locks)
        .forEach((i) => (T[i].lock = true));
    }
    if (o.coins) {
      const cand = shuffleArr(order.filter((p, n) => n !== keyAt).slice(), R);
      cand.slice(0, o.coins).forEach(([a, b]) => (T[a].coin = T[b].coin = true));
    }
    if(Number.isInteger(o.hiddenCount)){
      shuffleArr(T.filter(t=>t.above.length&&t.f!=='key'),R).slice(0,Math.max(0,o.hiddenCount)).forEach(t=>{t.hidden=true;});
    }else if (o.hidden) {
      // закрываем часть нижних плиток: сверху всегда видно
      for (const t of T) if (t.above.length && R() < o.hidden) t.hidden = true;
    }
    this.order = order;
    this.refreshSeen();
  }

  keysAlive() {
    return this.tiles.some((t) => t.f === 'key' && this.alive[t.id]);
  }
  locked(i) {
    return this.tiles[i].lock && this.keysAlive();
  }
  free(i) {
    return isFree(this.tiles, this.alive, i);
  }
  // можно ли выбрать
  selectable(i) {
    return this.free(i) && !this.locked(i);
  }
  // закрытые плитки открываются, когда становятся свободными
  refreshSeen() {
    const opened = [];
    for (const t of this.tiles) {
      if (this.alive[t.id] && !t.seen && (!t.hidden || this.free(t.id))) {
        t.seen = true;
        if (t.hidden) opened.push(t.id);
      }
    }
    return opened;
  }
  faceOf(i) {
    const t = this.tiles[i];
    return t.hidden && !t.seen ? null : t.f;
  }

  // все доступные пары
  movesList() {
    const by = {};
    for (const t of this.tiles) {
      if (!this.selectable(t.id)) continue;
      (by[t.f] = by[t.f] || []).push(t.id);
    }
    const out = [];
    for (const f in by) {
      const a = by[f];
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) out.push([a[i], a[j]]);
    }
    return out;
  }
  canMove() {
    const seen = {};
    for (const t of this.tiles) {
      if (!this.selectable(t.id)) continue;
      if (seen[t.f]) return true;
      seen[t.f] = 1;
    }
    return false;
  }

  match(a, b) {
    if (a === b || !this.selectable(a) || !this.selectable(b)) return null;
    const A = this.tiles[a], B = this.tiles[b];
    if (A.f !== B.f) return null;
    this.alive[a] = this.alive[b] = false;
    const coin = A.coin || B.coin;
    const ev = { a, b, f: A.f, coin, key: A.f === 'key' };
    A.coin = B.coin = false;
    this.history.push({ a, b, coin });
    this.pairs++;
    ev.opened = this.refreshSeen();
    ev.done = this.left === 0;
    return ev;
  }

  undo() {
    const h = this.history.pop();
    if (!h) return null;
    this.alive[h.a] = this.alive[h.b] = true;
    this.pairs--;
    return h;
  }

  // перемешать оставшиеся: новый порядок решения на тех же местах; если места не позволяют — разложить в ряды
  shuffle() {
    const R = this.R, T = this.tiles;
    const idx = T.filter((t) => this.alive[t.id]).map((t) => t.id);
    if (!idx.length) return { moved: [] };
    const faces = idx.map((i) => T[i].f);
    const coins = idx.filter((i) => T[i].coin).length;
    const locks = this.keysAlive() ? idx.filter((i) => T[i].lock) : [];
    let order = genOrder(T, idx, R, 200);
    let moved = [];
    if (!order) {
      moved = this.flatten(idx);
      link(T);
      order = genOrder(T, idx, R, 200);
    }
    // пары лиц
    const cnt = {};
    for (const f of faces) cnt[f] = (cnt[f] || 0) + 1;
    const pairs = [];
    for (const f in cnt) for (let k = 0; k < Math.floor(cnt[f] / 2); k++) pairs.push(f);
    shuffleArr(pairs, R);
    // ключи должны сниматься раньше всех замков
    const hasKey = pairs.includes('key');
    if (hasKey) {
      pairs.splice(pairs.indexOf('key'), 1);
      const lockSet = new Set(locks);
      let at = order.findIndex(([a, b]) => !lockSet.has(a) && !lockSet.has(b));
      // замки переносим на плитки, которые снимаются позже ключей
      for (const i of idx) T[i].lock = false;
      const later = [];
      order.slice(at + 1).forEach(([a, b]) => later.push(a, b));
      shuffleArr(later, R).slice(0, locks.length).forEach((i) => (T[i].lock = true));
      pairs.splice(at, 0, 'key');
    }
    order.forEach(([a, b], n) => (T[a].f = T[b].f = pairs[n]));
    for (const i of idx) T[i].coin = false;
    shuffleArr(order.slice(), R)
      .filter(([a, b]) => T[a].f !== 'key')
      .slice(0, Math.ceil(coins / 2))
      .forEach(([a, b]) => (T[a].coin = T[b].coin = true));
    for (const i of idx) T[i].seen = !T[i].hidden || this.free(i);
    this.history = [];
    this.order = order;
    return { moved };
  }

  // разложить оставшиеся плитки плоскими рядами в центре поля
  flatten(idx) {
    const T = this.tiles;
    const xs = T.map((t) => t.x), ys = T.map((t) => t.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const n = idx.length;
    const cols = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(n * 1.6))));
    const rows = Math.ceil(n / cols);
    const moved = [];
    idx.forEach((i, k) => {
      const r = Math.floor(k / cols), c = k % cols;
      const inRow = Math.min(cols, n - r * cols);
      const t = T[i];
      const from = { x: t.x, y: t.y, z: t.z };
      t.x = Math.round(cx - inRow + 1 + c * 2);
      t.y = Math.round(cy - rows + 1 + r * 2);
      t.z = 0;
      moved.push({ i, from });
    });
    return moved;
  }

  // решатель: поиск в глубину с запоминанием, ограничение по узлам. Возвращает первый ход решения или null
  solve(limit = 60000) {
    const T = this.tiles;
    const alive = this.alive.slice();
    const keyIds = T.filter((t) => t.f === 'key').map((t) => t.id);
    const seen = new Set();
    let nodes = 0;
    const keyOf = () => {
      let s = '';
      for (let i = 0; i < alive.length; i += 30) {
        let v = 0;
        for (let k = 0; k < 30 && i + k < alive.length; k++) if (alive[i + k]) v |= 1 << k;
        s += v.toString(36) + ',';
      }
      return s;
    };
    const moves = () => {
      const keys = keyIds.some((i) => alive[i]);
      const by = {};
      for (const t of T) {
        if (!isFree(T, alive, t.id)) continue;
        if (keys && t.lock) continue;
        (by[t.f] = by[t.f] || []).push(t.id);
      }
      const out = [];
      for (const f in by) {
        const a = by[f];
        // все четыре свободны — снимаем любые две, порядок не важен
        if (a.length === 4) {
          out.push([a[0], a[1], 3]);
          continue;
        }
        for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) out.push([a[i], a[j], a.length === 2 ? 2 : 1]);
      }
      // сначала «безопасные» и открывающие больше
      out.sort((p, q) => q[2] - p[2] || T[q[0]].z + T[q[1]].z - T[p[0]].z - T[p[1]].z);
      return out;
    };
    let first = null;
    const dfs = (depth) => {
      let any = false;
      for (let i = 0; i < alive.length; i++) if (alive[i]) { any = true; break; }
      if (!any) return true;
      if (++nodes > limit) return false;
      const k = keyOf();
      if (seen.has(k)) return false;
      seen.add(k);
      for (const [a, b] of moves()) {
        alive[a] = alive[b] = false;
        const ok = dfs(depth + 1);
        alive[a] = alive[b] = true;
        if (ok) {
          if (depth === 0) first = [a, b];
          return true;
        }
        if (nodes > limit) return false;
      }
      return false;
    };
    const ok = dfs(0);
    return ok ? first : null;
  }

  // подсказка: ход из решения, если оно находится; иначе любая доступная пара
  hint() {
    const s = this.solve();
    if (s) return { pair: s, safe: true };
    const m = this.movesList();
    return m.length ? { pair: m[0], safe: false } : null;
  }

  toJSON() {
    return {
      opts: { ...this.opts, pos: undefined },
      tiles: this.tiles.map((t) => [t.x, t.y, t.z, t.f, +t.coin, +t.lock, +t.hidden, +t.seen]),
      alive: this.alive.map((a) => +a).join(''),
      pairs: this.pairs,
      score: this.score,
      history: this.history,
      randomState: this.R.state?.(),
    };
  }
  static fromJSON(j) {
    if(!j || !j.opts || !Array.isArray(j.tiles) || j.tiles.length<2 || j.tiles.length>200 || j.tiles.length%2 || typeof j.alive!=='string' || !/^[01]+$/.test(j.alive) || j.alive.length!==j.tiles.length)throw new Error('Invalid board snapshot');
    if(j.tiles.some(t=>!Array.isArray(t)||t.length<8||!t.slice(0,3).every(Number.isFinite)||Math.abs(t[0])>100||Math.abs(t[1])>100||t[2]<0||t[2]>10||typeof t[3]!=='string'))throw new Error('Invalid tile snapshot');
    if(!Number.isFinite(j.pairs)||j.pairs<0||j.pairs>j.tiles.length/2)throw new Error('Invalid pair count');
    const counts={};j.tiles.forEach((t,i)=>{if(j.alive[i]==='1')counts[t[3]]=(counts[t[3]]||0)+1;});
    if(Object.values(counts).some(n=>n%2))throw new Error('Invalid remaining pairs');
    const g = Object.create(Game.prototype);
    g.opts = j.opts;
    g.R = rng((j.opts.seed || 1) + j.pairs * 31 + 7);
    if(Number.isInteger(j.randomState))g.R.restore(j.randomState);
    g.tiles = j.tiles.map((a, id) => ({ id, x: a[0], y: a[1], z: a[2], f: a[3], coin: !!a[4], lock: !!a[5], hidden: !!a[6], seen: !!a[7] }));
    link(g.tiles);
    g.alive = [...j.alive].map((c) => c === '1');
    g.history = Array.isArray(j.history) ? j.history.filter(h=>h&&[h.a,h.b].every(i=>Number.isInteger(i)&&i>=0&&i<j.tiles.length)) : [];
    g.pairs = j.pairs;
    g.score = j.score || 0;
    return g;
  }
}
