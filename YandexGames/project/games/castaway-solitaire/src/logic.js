import legacyLevels from './legacy-levels.json' with {type:'json'};
import {makeCampaignLevel,campaignPlan} from './campaign.js';
// Правила пасьянса «Три пика» (TriPeaks), генерация уровней и бот для проверки проходимости.
// Чистый JS без DOM: используется игрой и тестами в node.

export const ROW_STEP = 0.38; // шаг ряда по вертикали в долях высоты карты
export const WILD = 0; // ранг джокера

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Раскладки: строка = ряд, позиция символа = половина ширины карты, «o» — левый край карты
export const SHAPES = {
  tri3: ['  o   o   o  ', ' o o o o o o ', 'o o o o o o o'],
  wave: ['o   o   o   o', ' o o o o o o ', 'o o o o o o o'],
  twin: ['   o     o   ', '  o o   o o  ', ' o o o o o o ', 'o o o o o o o'],
  tri3tall: ['  o   o   o  ', '  o   o   o  ', ' o o o o o o ', 'o o o o o o o'],
  pyr: ['      o      ', '     o o     ', '    o o o    ', '   o o o o   ', '  o o o o o  ', ' o o o o o o '],
  fan: ['o o o o o o o', ' o o o o o o ', '  o o o o o  ', '   o o o o   '],
  crown: ['o     o     o', 'o o   o   o o', ' o o o o o o ', 'o o o o o o o'],
  bridge: ['o o       o o', ' o o     o o ', '  o o o o o  ', 'o o o o o o o'],
  diamond: ['      o      ', '     o o     ', '    o o o    ', '   o o o o   ', '  o o o o o  ', '   o o o o   ', '    o o o    '],
  cols: ['o  o  o  o  o', 'o  o  o  o  o', 'o  o  o  o  o', 'o  o  o  o  o'],
  turtle: ['    o o o    ', '  o o o o o  ', ' o o o o o o ', '  o o o o o  ', ' o         o '],
  fish: ['   o o       ', '  o o o o  o ', ' o o o o o o ', '  o o o o  o ', '   o o       '],
  palm: ['  o o   o o  ', 'o o o o o o o', '     o o     ', '      o      ', '      o      ', '     o o     '],
  towers: ['o o       o o', 'o o   o   o o', 'o o  o o  o o', ' o o o o o o '],
  heart: ['  o o   o o  ', ' o o o o o o ', '  o o o o o  ', '   o o o o   ', '    o o o    ', '     o o     ', '      o      '],
  star: ['      o      ', 'o o o o o o o', ' o o o o o o ', '  o o o o o  ', ' o o     o o ', 'o o       o o'],
  big3: ['  o   o   o  ', ' o o o o o o ', 'o o o o o o o', ' o o o o o o ', 'o o o o o o o'],
  boat: ['      o      ', '     oo      ', '    o o      ', 'o o o o o o o', ' o o o o o o ', '  o o o o o  '],
};
// «oo» в boat — мачта с парусом: исправляем на допустимую позицию при разборе (см. parseShape)

export function parseShape(rows, mirror = false) {
  const cells = [];
  rows.forEach((s, r) => {
    let last = -9;
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== 'o') continue;
      if (i - last < 2) continue; // карты в ряду не накладываются
      last = i;
      cells.push({ x: i, row: r });
    }
  });
  if (mirror) {
    const mx = Math.max(...cells.map((c) => c.x));
    cells.forEach((c) => (c.x = mx - c.x));
  }
  return cells;
}

// кто кого накрывает: j накрывает i, если j ниже по ряду и прямоугольники пересекаются
export function computeCovers(cells) {
  const maxDy = Math.floor((1 - 1e-6) / ROW_STEP);
  cells.forEach((c) => (c.covers = []));
  for (let i = 0; i < cells.length; i++)
    for (let j = 0; j < cells.length; j++) {
      if (i === j) continue;
      const a = cells[i];
      const b = cells[j];
      if (b.row > a.row && b.row - a.row <= maxDy && Math.abs(b.x - a.x) < 2) a.covers.push(j);
    }
}

// ---------- План уровней ----------
const ORDER1 = ['tri3', 'wave', 'twin', 'tri3tall', 'pyr', 'fan', 'crown', 'bridge', 'diamond', 'heart'];
const ORDER2 = ['cols', 'turtle', 'fish', 'towers', 'palm', 'twin', 'star', 'pyr', 'boat', 'heart'];
const ORDER3 = ['crown', 'fan', 'diamond', 'big3', 'turtle', 'bridge', 'fish', 'star', 'towers', 'heart'];
const ORDER_ALL = Object.keys(SHAPES);
export const MAIN_LEVELS = 1000;

export function levelPlan(n) {
  if(n>60)return campaignPlan(n);
  // n — номер уровня с 1
  const ch = Math.floor((n - 1) / 10); // глава 0..
  const i = (n - 1) % 10;
  let shape;
  if (ch === 0) shape = ORDER1[i];
  else if (ch === 1) shape = ORDER2[i];
  else if (ch <= 5) shape = ORDER3[(i + ch * 3) % 10];
  else shape = ORDER_ALL[(n * 7) % ORDER_ALL.length];
  const mirror = ch >= 1 && n % 2 === 0;
  // механики
  const coins = n >= 4 ? 2 + (n % 3) : 0;
  let locks = 0;
  let keys = 0;
  let sand = 0;
  if (n >= 11 && (n % 2 === 1 || n >= 31)) {
    keys = n >= 41 && n % 3 === 0 ? 2 : 1;
    locks = n < 20 ? 2 : 3;
  }
  if (n >= 21 && (n % 2 === 0 || n >= 36)) sand = n < 30 ? 2 : n < 45 ? 3 : 4;
  if (n === 11) locks = 1;
  // запас карт у бота на финише: чем меньше, тем сложнее
  let target = Math.round(9 - (n - 1) * 0.14);
  if (i === 0 && n > 1) target += 2; // начало главы — передышка
  if (i === 9) target -= 1; // финал главы
  target = Math.max(2, target);
  if (n > MAIN_LEVELS) target = 2 + (n % 3 === 0 ? 1 : 0);
  // джокер в колоде на первых уровнях
  const wilds = n <= 3 ? 1 : 0;
  return { n, shape, mirror, coins, locks, keys, sand, target, wilds };
}

// ---------- Партия ----------
export class Tri {
  constructor(def) {
    this.def = def;
    this.cards = def.cards.map((c) => ({ ...c, gone: false, sandLeft: c.sand || 0 }));
    this.stock = def.stock.map((c) => ({ ...c })); // последний элемент — верх колоды
    this.waste = [{ ...def.waste }];
    this.keysUsed = new Set();
    this.streak = 0;
    this.best = 0;
    this.score = 0;
    this.coins = 0;
    this.hist = [];
    this.moves = 0;
  }
  top() {
    return this.waste[this.waste.length - 1];
  }
  covered(i) {
    const c = this.cards[i];
    for (const j of c.covers) if (!this.cards[j].gone) return true;
    return false;
  }
  faceUp(i) {
    return !this.cards[i].gone && !this.covered(i);
  }
  locked(i) {
    const c = this.cards[i];
    return !!c.lock && !this.keysUsed.has(c.lock);
  }
  // свободна и не заблокирована (замок, песок)
  free(i) {
    const c = this.cards[i];
    return this.faceUp(i) && !this.locked(i) && !(c.sandLeft > 0);
  }
  fits(c) {
    const t = this.top();
    if (!t) return false;
    if (t.rank === WILD || c.rank === WILD) return true;
    const d = Math.abs(t.rank - c.rank);
    return d === 1 || d === 12;
  }
  playable(i) {
    return this.free(i) && this.fits(this.cards[i]);
  }
  anyPlayable() {
    for (let i = 0; i < this.cards.length; i++) if (this.playable(i)) return true;
    return false;
  }
  remaining() {
    let n = 0;
    for (const c of this.cards) if (!c.gone) n++;
    return n;
  }
  won() {
    return this.remaining() === 0;
  }
  stuck() {
    return !this.won() && this.stock.length === 0 && !this.anyPlayable();
  }
  // сыграть карту из раскладки; возвращает информацию для анимаций
  play(i) {
    if (!this.playable(i)) return null;
    const c = this.cards[i];
    const before = this.cards.map((x, j) => (x.gone ? -1 : this.faceUp(j) ? 1 : 0));
    const sandSnap = this.cards.map((x) => x.sandLeft);
    c.gone = true;
    this.waste.push({ rank: c.rank, suit: c.suit, from: i });
    this.streak++;
    this.best = Math.max(this.best, this.streak);
    const pts = 50 + 25 * (this.streak - 1) + (c.row === 0 ? 150 : 0);
    this.score += pts;
    let coin = 0;
    if (c.coin) {
      coin = 5;
      this.coins += coin;
    }
    let unlocked = null;
    if (c.key && !this.keysUsed.has(c.key)) {
      this.keysUsed.add(c.key);
      unlocked = c.key;
    }
    // песок: каждая сыгранная карта смывает слой с открытых карт
    const washed = [];
    for (let j = 0; j < this.cards.length; j++) {
      const o = this.cards[j];
      if (!o.gone && o.sandLeft > 0 && before[j] === 1) {
        o.sandLeft--;
        washed.push(j);
      }
    }
    const flipped = [];
    for (let j = 0; j < this.cards.length; j++) if (before[j] === 0 && this.faceUp(j)) flipped.push(j);
    this.moves++;
    this.hist.push({ t: 'play', i, pts, coin, unlocked, sandSnap, streak: this.streak - 1 });
    let bonus = 0;
    if (this.won()) {
      bonus = 500 + 250 * this.stock.length;
      this.score += bonus;
    }
    return { i, pts, coin, unlocked, flipped, washed, streak: this.streak, bonus };
  }
  draw() {
    if (!this.stock.length) return null;
    const c = this.stock.pop();
    this.waste.push(c);
    this.hist.push({ t: 'draw', streak: this.streak });
    this.streak = 0;
    this.moves++;
    return c;
  }
  joker() {
    this.waste.push({ rank: WILD, suit: -1, joker: true });
    this.hist.push({ t: 'joker', streak: this.streak });
    return true;
  }
  addCards(list) {
    for (const c of list) this.stock.push(c);
    this.hist.push({ t: 'add', n: list.length });
  }
  canUndo() {
    const h = this.hist[this.hist.length - 1];
    return !!h && h.t !== 'add';
  }
  undo() {
    const h = this.hist[this.hist.length - 1];
    if (!h || h.t === 'add') return null;
    this.hist.pop();
    if (h.t === 'play') {
      const w = this.waste.pop();
      const c = this.cards[h.i];
      c.gone = false;
      this.score -= h.pts;
      this.coins -= h.coin;
      if (h.unlocked) this.keysUsed.delete(h.unlocked);
      h.sandSnap.forEach((v, j) => (this.cards[j].sandLeft = v));
      this.streak = h.streak;
      this.moves--;
      return { t: 'play', i: h.i, w };
    }
    if (h.t === 'draw') {
      const c = this.waste.pop();
      this.stock.push(c);
      this.streak = h.streak;
      this.moves--;
      return { t: 'draw', c };
    }
    if (h.t === 'joker') {
      this.waste.pop();
      this.streak = h.streak;
      return { t: 'joker' };
    }
    return null;
  }
}

// ---------- Генерация ----------
function shuffle(a, r) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function under(cells, roots) {
  // все карты, которые лежат (транзитивно) под картами roots
  const res = new Set();
  const stack = [...roots];
  while (stack.length) {
    const j = stack.pop();
    cells.forEach((c, i) => {
      if (c.covers.includes(j) && !res.has(i)) {
        res.add(i);
        stack.push(i);
      }
    });
  }
  return res;
}

export function dealFrom(plan, seed) {
  const r = rng(seed * 7919 + plan.n * 104729);
  const cells = parseShape(SHAPES[plan.shape], plan.mirror).map((c) => ({ ...c }));
  computeCovers(cells);
  const deck = [];
  for (let s = 0; s < 4; s++) for (let k = 1; k <= 13; k++) deck.push({ rank: k, suit: s });
  shuffle(deck, r);
  cells.forEach((c, i) => Object.assign(c, deck[i]));
  const waste = deck[cells.length];
  const stock = deck.slice(cells.length + 1);
  // механики
  const idx = cells.map((_, i) => i);
  if (plan.locks) {
    for (let g = 1; g <= plan.keys; g++) {
      const cand = shuffle(idx.filter((i) => !cells[i].lock && !cells[i].key && cells[i].row <= 2), r);
      const locked = cand.slice(0, plan.locks);
      locked.forEach((i) => (cells[i].lock = g));
      const bad = under(cells, idx.filter((i) => cells[i].lock));
      const kc = shuffle(idx.filter((i) => !cells[i].lock && !cells[i].key && !bad.has(i)), r).sort((a, b) => cells[a].row - cells[b].row);
      // ключ — не на самом верху и не сразу открыт
      const mid = kc.filter((i) => cells[i].covers.length > 0);
      const k = (mid.length ? mid : kc)[Math.floor(r() * Math.min(3, (mid.length ? mid : kc).length))];
      if (k !== undefined) cells[k].key = g;
    }
  }
  if (plan.sand) {
    const cand = shuffle(idx.filter((i) => !cells[i].lock && !cells[i].key && cells[i].covers.length > 0), r);
    cand.slice(0, plan.sand).forEach((i) => (cells[i].sand = 2 + Math.floor(r() * 2)));
  }
  if (plan.coins) {
    const cand = shuffle(idx.filter((i) => !cells[i].key), r);
    cand.slice(0, plan.coins).forEach((i) => (cells[i].coin = true));
  }
  for (let w = 0; w < plan.wilds; w++) {
    const pos = Math.max(0, stock.length - 3 - Math.floor(r() * 6));
    stock.splice(pos, 0, { rank: WILD, suit: -1 });
  }
  return { n: plan.n, shape: plan.shape, cards: cells, stock, waste };
}

// ---------- Бот ----------
// «Зрячий» бот (видит закрытые карты): ищет самую длинную цепочку ходов перед каждым добором.
function bestChain(g, budget) {
  let best = { len: 0, seq: [], val: 0 };
  let nodes = 0;
  const seq = [];
  const rec = () => {
    if (++nodes > budget) return;
    let any = false;
    for (let i = 0; i < g.cards.length; i++) {
      if (!g.playable(i)) continue;
      any = true;
      g.play(i);
      seq.push(i);
      rec();
      seq.pop();
      g.undo();
      if (nodes > budget) return;
    }
    if (!any) {
      // оценка: длина цепочки + открытые карты + бонус, если следующая карта колоды подходит
      let val = seq.length * 10;
      if (g.won()) val += 1000;
      const nxt = g.stock[g.stock.length - 1];
      if (nxt) {
        for (let i = 0; i < g.cards.length; i++)
          if (g.free(i)) {
            const d = Math.abs(nxt.rank - g.cards[i].rank);
            if (nxt.rank === WILD || d === 1 || d === 12) {
              val += 3;
              break;
            }
          }
      }
      if (val > best.val) best = { len: seq.length, seq: seq.slice(), val };
    }
  };
  rec();
  return best;
}

export function solveSeeing(def, budget = 3000) {
  const g = new Tri(def);
  let guard = 0;
  while (!g.won() && guard++ < 200) {
    const ch = bestChain(g, budget);
    for (const i of ch.seq) g.play(i);
    if (g.won()) break;
    if (!g.draw()) break;
  }
  return { won: g.won(), left: g.stock.length, score: g.score, best: g.best };
}

// «Честный» бот: не видит закрытых карт, играет жадно (как аккуратный человек)
export function solveFair(def, r = Math.random, skill = 1) {
  const g = new Tri(def);
  let guard = 0;
  while (!g.won() && guard++ < 400) {
    const moves = [];
    for (let i = 0; i < g.cards.length; i++) if (g.playable(i)) moves.push(i);
    if (moves.length) {
      if (r() > skill) {
        g.play(moves[Math.floor(r() * moves.length)]);
        continue;
      }
      // приоритет: что откроет больше карт; затем карта, у которой есть продолжение среди открытых
      let bi = moves[0];
      let bv = -1e9;
      for (const i of moves) {
        let v = 0;
        for (let j = 0; j < g.cards.length; j++) if (g.cards[j].covers.includes(i) && !g.cards[j].gone) v += g.cards[j].covers.filter((k) => !g.cards[k].gone).length === 1 ? 4 : 1;
        const rk = g.cards[i].rank;
        for (let j = 0; j < g.cards.length; j++)
          if (j !== i && g.free(j)) {
            const d = Math.abs(g.cards[j].rank - rk);
            if (d === 1 || d === 12) v += 2;
          }
        if (g.cards[i].key) v += 3;
        v += r() * 0.5;
        if (v > bv) {
          bv = v;
          bi = i;
        }
      }
      g.play(bi);
    } else if (!g.draw()) break;
  }
  return { won: g.won(), left: g.stock.length, score: g.score };
}

// ---------- Уровень: подбор расклада под нужную сложность ----------
// Исход «Трёх пиков» во многом задан раскладом. «Честный» бот (не видит закрытых карт) играет
// расклад несколько раз; лучший результат — сколько карт колоды нужно аккуратному игроку.
// Колоду обрезаем снизу (до этих карт бот не дошёл, на игру они не влияют) так, чтобы у
// аккуратного игрока осталось EXTRA карт: это запас на ошибки и путь к трём звёздам.
export function extraCards(n) {
  if (n <= 10) return 5;
  if (n <= 30) return 4;
  return 3;
}
// доля побед у «среднего» игрока (бот, который в половине случаев ходит наугад)
export function winTarget(n) {
  if (n <= 3) return 0.97;
  if (n > MAIN_LEVELS) return 0.6;
  const i = (n - 1) % 10;
  let w = 0.94 - (n - 1) * 0.0058;
  if (i === 0) w += 0.06;
  if (i === 9) w -= 0.05;
  return Math.min(0.97, Math.max(0.55, w));
}
const cache = new Map();
function tryPlan(plan, n) {
  const E = extraCards(n);
  const W = winTarget(n);
  let best = null;
  for (let seed = 1; seed < 220; seed++) {
    const def = dealFrom(plan, seed);
    const R = rng(seed * 131 + n);
    let need = Infinity;
    let wins = 0;
    for (let k = 0; k < 6; k++) {
      const r = solveFair(def, R, 1);
      if (r.won) {
        wins++;
        need = Math.min(need, def.stock.length - r.left);
      }
    }
    if (wins < 4) continue;
    const S = need + E;
    if (S > def.stock.length || S < 8) continue;
    def.stock = def.stock.slice(def.stock.length - S);
    let w = 0;
    const R2 = rng(seed * 977 + n * 13);
    for (let k = 0; k < 40; k++) if (solveFair(def, R2, 0.5).won) w++;
    w /= 40;
    const err = w < W - 0.1 ? W - 0.1 - w : w > W + 0.08 ? w - W - 0.08 : 0;
    if (!best || err < best.err) best = { def: { ...def, seed, stars: [1, E - 1], target: S, mid: w }, err };
    if (err === 0) break;
  }
  return best;
}
export function buildLevel(n) {
  n=Math.max(1,Math.floor(Number(n)||1));
  if (cache.has(n)) return cache.get(n);
  if(n<=60){const def=legacyLevels[n-1];cache.set(n,def);return def;}
  let generated,best=-1;
  for(let attempt=0;attempt<10;attempt++){
    const candidate=makeCampaignLevel(n,attempt),R=rng(n*5107+attempt*97);let wins=0;
    for(let k=0;k<16;k++)if(solveFair(candidate,R,.5).won)wins++;
    const target=candidate.plan.difficulty==='calm'?13:candidate.plan.difficulty==='challenge'?7:10;
    if(wins>best){best=wins;generated=candidate;}
    if(wins>=target){generated=candidate;break;}
  }
  cache.set(n,generated);return generated;

}

export function starsFor(def, left) {
  return left >= def.stars[1] ? 3 : left >= def.stars[0] ? 2 : 1;
}
