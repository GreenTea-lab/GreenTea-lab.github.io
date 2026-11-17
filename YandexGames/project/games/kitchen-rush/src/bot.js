// Бот-повар: играет за обоих поваров с переключением (для тестов, баланса и промо-скриншотов).
// Управляет только активным поваром, как игрок; когда тот занят (режет, моет, ждёт) — переключается.
import { ING, RECIPES, SOUP_N } from './data.js';
import { dishOf, partsValid } from './kitchen.js';

const D4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export class Bot {
  constructor(k) {
    this.k = k;
    this.intent = [null, null];
    this.swCool = 0;
    this.decT = 0;
    this.stuck = [0, 0];
    this.regions();
  }

  // ---------- регионы пола ----------
  regions() {
    const k = this.k;
    this.reg = new Array(k.W * k.H).fill(-1);
    let id = 0;
    for (const t of k.tiles) {
      if (!t.walk || this.reg[t.z * k.W + t.x] >= 0) continue;
      const q = [t];
      this.reg[t.z * k.W + t.x] = id;
      while (q.length) {
        const a = q.pop();
        for (const [dx, dz] of D4) {
          const b = k.tile(a.x + dx, a.z + dz);
          if (b && b.walk && this.reg[b.z * k.W + b.x] < 0) {
            this.reg[b.z * k.W + b.x] = id;
            q.push(b);
          }
        }
      }
      id++;
    }
    // к каким регионам примыкает каждая клетка-станция
    this.adj = new Map();
    for (const t of k.tiles) {
      if (t.walk) continue;
      const s = new Set();
      for (const [dx, dz] of D4) {
        const b = k.tile(t.x + dx, t.z + dz);
        if (b && b.walk) s.add(this.reg[b.z * k.W + b.x]);
      }
      this.adj.set(t, s);
    }
    // конвейеры: куда в итоге доезжает предмет
    this.beltEnd = new Map();
    for (const t of k.tiles) {
      if (t.type !== 'belt') continue;
      let e = t,
        n = 0;
      for (;;) {
        const nx = k.tile(e.x + e.dir[0], e.z + e.dir[1]);
        if (!nx || n > 40 || (nx.type !== 'belt' && nx.type !== 'counter')) break;
        e = nx;
        n++;
        if (nx.type !== 'belt') break;
      }
      this.beltEnd.set(t, e);
    }
  }

  dish(p) {
    return dishOf(p, this.k.L.menu);
  }

  regOf(c) {
    return this.reg[Math.floor(c.z) * this.k.W + Math.floor(c.x)];
  }
  can(i, t) {
    const s = this.adj.get(t);
    return !!s && s.has(this.regOf(this.k.chefs[i]));
  }
  // ближайшая подходящая клетка для повара i
  near(i, pred) {
    const c = this.k.chefs[i];
    let best = null,
      bd = 1e9;
    for (const t of this.k.tiles) {
      if (t.walk || t.fire > 0 || !this.can(i, t) || !pred(t)) continue;
      const d = Math.hypot(t.x + 0.5 - c.x, t.z + 0.5 - c.z);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }
  claimed(i, t) {
    const o = this.intent[1 - i];
    return o && o.t === t;
  }

  // ---------- что нужно для заказов ----------
  demand() {
    const k = this.k;
    const orders = k.orders.slice();
    // все тарелки и предметы на кухне
    const plates = [],
      items = [],
      pots = [],
      pans = [];
    const seen = (it, where) => {
      if (!it) return;
      if (it.k === 'plate') plates.push(it);
      else if (it.k === 'ing') items.push(it);
      else if (it.k === 'pot') pots.push({ it, where });
      else if (it.k === 'pan') {
        pans.push({ it, where });
        if (it.item) items.push(it.item);
      }
    };
    for (const t of k.tiles) seen(t.item, t);
    for (const c of k.chefs) seen(c.hold, null);
    // тарелки закрепляем за заказами
    const soupNeed = {};
    const partNeed = {};
    const free = orders.map((o) => o.r);
    for (const p of plates) {
      const d = this.dish(p);
      if (d) {
        const j = free.indexOf(d);
        if (j >= 0) free.splice(j, 1);
        continue;
      }
      if (p.soup) continue;
      if (!p.parts.length) continue;
      // частично собранная — к первому подходящему заказу
      for (let j = 0; j < free.length; j++) {
        const R = RECIPES[free[j]];
        if (!R.parts) continue;
        const left = R.parts.slice();
        if (!p.parts.every((x) => (left.indexOf(x) >= 0 ? (left.splice(left.indexOf(x), 1), true) : false))) continue;
        for (const x of left) partNeed[x] = (partNeed[x] || 0) + 1;
        free.splice(j, 1);
        break;
      }
    }
    for (const r of free) {
      const R = RECIPES[r];
      if (R.soup) soupNeed[R.soup] = (soupNeed[R.soup] || 0) + 1;
      else for (const x of R.parts) partNeed[x] = (partNeed[x] || 0) + 1;
    }
    // супы: кастрюли уже покрывают часть заказов
    const soupIng = {};
    for (const { it } of pots) {
      if (it.burnt || it.kind !== 'soup') continue;
      if (soupNeed[it.ing] > 0) {
        soupNeed[it.ing]--;
        soupIng[it.ing] = (soupIng[it.ing] || 0) + (SOUP_N - it.n);
      }
    }
    const emptyPots = pots.filter((p) => !p.it.n && !p.it.burnt).length;
    let ep = emptyPots;
    const soupWant = {}; // супы, под которые можно занять пустую кастрюлю
    for (const id in soupNeed)
      while (soupNeed[id] > 0 && ep > 0) {
        soupNeed[id]--;
        ep--;
        soupWant[id] = (soupWant[id] || 0) + 1;
        soupIng[id] = (soupIng[id] || 0) + SOUP_N;
      }
    // рис в кастрюлях покрывает rice:cook
    for (const { it } of pots) if (!it.burnt && it.kind === 'rice' && partNeed['rice:cook'] > 0) partNeed['rice:cook']--;
    // сколько продуктов каждого вида нужно
    const want = {};
    for (const x in partNeed) {
      const id = x.split(':')[0];
      want[id] = (want[id] || 0) + partNeed[x];
    }
    for (const id in soupIng) want[id] = (want[id] || 0) + soupIng[id];
    const have = {};
    for (const it of items) if (it.st !== 'burnt') have[it.id] = (have[it.id] || 0) + 1;
    return { partNeed, soupWant, soupIng, want, have, emptyPots };
  }

  // ---------- решение для повара i ----------
  decide(i) {
    const k = this.k;
    const c = k.chefs[i];
    const H = c.hold;
    const D = this.demand();
    // пожар
    if (k.fireCount > 0) {
      const f = this.near(i, () => true) && k.tiles.find((t) => t.fire > 0 && this.adj.get(t) && this.adj.get(t).has(this.regOf(c)));
      if (f) {
        if (H && H.k === 'ext') return { t: f, op: 'spray', fire: true };
        const ext = this.extTile(i);
        if (ext) {
          if (H) {
            const put = this.near(i, (t) => t.type === 'counter' && !t.item);
            if (put) return { t: put, op: 'pick' };
          } else return { t: ext, op: 'pick' };
        }
      }
    }
    return H ? this.decideHold(i, H, D) : this.decideEmpty(i, D);
  }

  extTile(i) {
    // огнетушитель лежит на столе или его держит другой повар
    return this.near(i, (t) => t.item && t.item.k === 'ext');
  }

  freeCounter(i, nearT) {
    const c = this.k.chefs[i];
    let best = null,
      bd = 1e9;
    for (const t of this.k.tiles) {
      if (t.type !== 'counter' || t.item || t.fire > 0 || !this.can(i, t) || this.claimed(i, t)) continue;
      const ref = nearT || { x: c.x - 0.5, z: c.z - 0.5 };
      const d = Math.hypot(t.x - ref.x, t.z - ref.z);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  // передать предмет в другой регион: стол, доступный обоим, или конвейер
  handoff(i) {
    const k = this.k;
    const my = this.regOf(k.chefs[i]);
    return this.near(i, (t) => {
      if (t.item || this.claimed(i, t)) return false;
      if (t.type === 'counter') {
        const s = this.adj.get(t);
        return s.size > 1;
      }
      if (t.type === 'belt') {
        const e = this.beltEnd.get(t);
        const s = this.adj.get(e);
        return s && [...s].some((r) => r !== my);
      }
      return false;
    });
  }

  // есть ли где-то (не в моём регионе) нужная станция
  elsewhere(i, pred) {
    return this.k.tiles.some((t) => !t.walk && pred(t) && !this.can(i, t));
  }

  plateAccepts(p, it) {
    if (!p || p.k !== 'plate' || p.soup) return false;
    return partsValid(p.parts.concat(it.id + ':' + it.st), this.k.L.menu);
  }

  potFor(i, id, D, onlyMine = true) {
    const ok = (t) => t.type === 'stove' && t.item && t.item.k === 'pot' && !t.item.burnt && !t.item.done;
    const same = (t) => ok(t) && t.item.kind === 'soup' && t.item.ing === id && t.item.n < SOUP_N;
    const empty = (t) => ok(t) && t.item.n === 0 && (D.soupWant[id] || 0) > 0;
    if (!onlyMine) return this.k.tiles.find((t) => same(t) || empty(t));
    return this.near(i, same) || this.near(i, empty);
  }

  // куда нести продукт: {t, op} — у меня, 'handoff' — на ту сторону, 'park' — положить и ждать тарелку
  ingDest(i, H, D, from) {
    const k = this.k;
    const I = ING[H.id];
    const ex = (pred) => k.tiles.some((t) => !t.walk && t !== from && pred(t));
    const go = (pred, extra) => {
      const t = this.near(i, (q) => q !== from && pred(q) && !this.claimed(i, q));
      if (t) return Object.assign({ t, op: 'pick' }, extra);
      if (ex(pred)) return 'handoff';
      return null;
    };
    if (H.st === 'raw' && I.chop) return go((t) => t.type === 'board' && !t.item, { chopAfter: true }) || 'park';
    if (I.potRaw) return go((t) => t.type === 'stove' && t.item && t.item.k === 'pot' && t.item.n === 0 && !t.item.burnt) || 'park';
    if (H.st === 'chop' && I.pot && (D.soupIng[H.id] || 0) > 0) {
      const p = this.potFor(i, H.id, D);
      if (p && p !== from) return { t: p, op: 'pick' };
      if (this.potFor(i, H.id, D, false)) return 'handoff';
    }
    if (H.st === 'chop' && I.pan) {
      const cookNeed = D.partNeed[H.id + ':cook'] || 0;
      const rawNeed = D.partNeed[H.id + ':chop'] || 0;
      const cooking = k.tiles.filter((t) => t.item && t.item.k === 'pan' && t.item.item && t.item.item.id === H.id && t.item.item.st !== 'burnt').length;
      if (cookNeed > cooking || !rawNeed) return go((t) => t.type === 'stove' && t.item && t.item.k === 'pan' && !t.item.item) || 'park';
    }
    const pl = go((t) => t.item && this.plateAccepts(t.item, H));
    if (pl) return pl;
    // тарелки и окно выдачи только на той стороне
    const mine = k.tiles.some((t) => (t.type === 'plates' || t.type === 'serve') && this.can(i, t));
    if (!mine) return 'handoff';
    return 'park';
  }

  decideHold(i, H, D) {
    const k = this.k;
    const counter = () => {
      const t = this.freeCounter(i);
      return t ? { t, op: 'pick', park: true } : null;
    };
    const handoff = () => {
      const t = this.handoff(i);
      return t ? { t, op: 'pick', handoff: true } : null;
    };
    const trash = () => {
      const t = this.near(i, (q) => q.type === 'trash');
      return t ? { t, op: 'pick' } : handoff();
    };
    if (H.k === 'ing') {
      if (H.st === 'burnt') return trash();
      const d = this.ingDest(i, H, D);
      if (d === 'handoff') return handoff() || counter();
      if (d === 'park') {
        const pt = k.tiles.find((t) => t.type === 'plates' && this.can(i, t)) || k.tiles.find((t) => t.type === 'sink' && this.can(i, t));
        const t = this.freeCounter(i, pt);
        return t ? { t, op: 'pick', park: true } : null;
      }
      return d;
    }
    if (H.k === 'plate') {
      const d = this.dish(H);
      if (d) {
        if (k.orders.some((o) => o.r === d)) {
          const s = this.near(i, (t) => t.type === 'serve');
          if (s) return { t: s, op: 'pick' };
          return handoff();
        }
        return counter();
      }
      // суп из кастрюли
      if (!H.parts.length && !H.soup) {
        const p = this.near(i, (t) => t.item && t.item.k === 'pot' && t.item.done && !t.item.burnt && t.item.kind === 'soup');
        if (p) return { t: p, op: 'pick' };
      }
      // жареное со сковороды / рис из кастрюли
      const pan = this.near(i, (t) => t.item && t.item.k === 'pan' && t.item.item && t.item.item.st === 'cook' && this.plateAccepts(H, t.item.item));
      if (pan) return { t: pan, op: 'pick' };
      const rice = this.near(i, (t) => t.item && t.item.k === 'pot' && t.item.done && !t.item.burnt && t.item.kind === 'rice' && this.plateAccepts(H, { id: 'rice', st: 'cook' }));
      if (rice) return { t: rice, op: 'pick' };
      // готовые продукты, лежащие на столах
      const lying = this.near(i, (t) => t.item && t.item.k === 'ing' && t.type !== 'stove' && this.plateAccepts(H, t.item) && this.finalState(t.item));
      if (lying) return { t: lying, op: 'pick' };
      // пустая тарелка: если что-то варится — ждём рядом, иначе ставим на стол
      const empty = !H.parts.length && !H.soup;
      const cooking = this.near(i, (t) => {
        const it = t.item;
        if (!it || t.type !== 'stove') return false;
        if (it.k === 'pot' && it.n > 0 && !it.burnt) return it.kind === 'soup' ? empty : this.plateAccepts(H, { id: 'rice', st: 'cook' });
        if (it.k === 'pan' && it.item && it.item.st === 'chop') return this.plateAccepts(H, { id: it.item.id, st: 'cook' });
        return false;
      });
      if (cooking) return { t: cooking, op: 'wait' };
      if (this.elsewhere(i, (t) => t.item && (t.item.k === 'pot' || t.item.k === 'pan'))) {
        const h = handoff();
        if (h) return h;
      }
      const st = k.tiles.find((t) => t.type === 'stove' && this.can(i, t));
      const t = this.freeCounter(i, st);
      return t ? { t, op: 'pick', park: true } : null;
    }
    if (H.k === 'pot' || H.k === 'pan') {
      const bad = H.k === 'pot' ? H.burnt : H.item && H.item.st === 'burnt';
      if (bad) return trash();
      const s = this.near(i, (t) => t.type === 'stove' && !t.item);
      return s ? { t: s, op: 'pick' } : counter();
    }
    if (H.k === 'dirty') {
      const s = this.near(i, (t) => t.type === 'sink');
      return s ? { t: s, op: 'pick' } : handoff();
    }
    if (H.k === 'ext') return counter();
    return counter();
  }

  // продукт в конечном для тарелки состоянии
  finalState(it) {
    const I = ING[it.id];
    if (it.st === 'burnt') return false;
    if (it.st === 'raw') return !I.chop;
    if (it.st === 'chop') return !I.pan || (this._D && (this._D.partNeed[it.id + ':chop'] || 0) > 0);
    return true;
  }

  decideEmpty(i, D) {
    const k = this.k;
    this._D = D;
    const other = k.chefs[1 - i];
    const pick = (t, extra = {}) => (t ? Object.assign({ t, op: 'pick' }, extra) : null);
    // 1. готовое блюдо, которое ждут
    const canServe = !!this.near(i, (q) => q.type === 'serve');
    let t = this.near(i, (q) => q.item && q.item.k === 'plate' && this.dish(q.item) && k.orders.some((o) => o.r === this.dish(q.item)) && !this.claimed(i, q) && (canServe || this.adj.get(q).size === 1));
    if (t) return pick(t);
    // 2. подгоревшее — в мусор
    t = this.near(i, (q) => q.item && ((q.item.k === 'pot' && q.item.burnt) || (q.item.k === 'pan' && q.item.item && q.item.item.st === 'burnt') || (q.item.k === 'ing' && q.item.st === 'burnt')));
    if (t) return pick(t);
    // 3. продукт на доске ждёт нарезки
    t = this.near(i, (q) => q.type === 'board' && q.item && q.item.k === 'ing' && q.item.st === 'raw' && ING[q.item.id].chop && !(other.work && other.work.t === q) && !this.claimed(i, q));
    if (t) return { t, op: 'act' };
    // 4. готовая еда на плите — несём тарелку
    const ready = this.near(i, (q) => q.item && ((q.item.k === 'pot' && q.item.done && !q.item.burnt) || (q.item.k === 'pan' && q.item.item && q.item.item.st === 'cook')));
    const soon = ready || this.near(i, (q) => q.item && q.item.k === 'pot' && q.item.n === (q.item.kind === 'soup' ? SOUP_N : 1) && !q.item.burnt);
    if (soon) {
      const it = soon.item;
      const food = it.k === 'pan' ? it.item : it.kind === 'rice' ? { id: 'rice', st: 'cook' } : null;
      // частичная тарелка, которой это подходит
      if (food) {
        const p = this.near(i, (q) => q.item && q.item.k === 'plate' && q.item.parts.length && this.plateAccepts(q.item, food) && !this.claimed(i, q));
        if (p) return pick(p);
      }
      const ep = this.near(i, (q) => q.item && q.item.k === 'plate' && !q.item.parts.length && !q.item.soup && !this.claimed(i, q));
      if (ep) return pick(ep);
      const holding = other.hold && other.hold.k === 'plate' && !this.dish(other.hold);
      if (!holding || ready) {
        const st = this.near(i, (q) => (q.type === 'plates' && q.count > 0) || (q.type === 'sink' && q.clean > 0));
        if (st) return pick(st);
      }
    }
    // 5. продукт лежит без дела — несём дальше (или передаём на ту сторону)
    t = this.near(i, (q) => {
      if (!q.item || q.item.k !== 'ing' || q.type === 'stove' || this.claimed(i, q)) return false;
      const it = q.item;
      if (it.st === 'burnt') return false;
      if (it.st === 'raw' && ING[it.id].chop && q.type === 'board') return false;
      const d = this.ingDest(i, it, D, q);
      if (d && typeof d === 'object') return true;
      // передать: только если лежит не на общем столе
      if (d === 'handoff') {
        const s = this.adj.get(q);
        if (q.type === 'belt') return false;
        return s.size === 1 && !!this.handoff(i);
      }
      return false;
    });
    if (t) return pick(t);
    // 6. тарелка с частичным набором: несём к нужному
    t = this.near(i, (q) => q.item && q.item.k === 'plate' && !this.dish(q.item) && this.plateHasWork(i, q.item, q));
    if (t) return pick(t);
    // 6b. продукты ждут тарелку — несём чистую
    const waiting = this.near(i, (q) => q.item && q.item.k === 'ing' && q.type !== 'stove' && this.finalState(q.item) && this.plateAccepts({ k: 'plate', parts: [] }, q.item));
    if (waiting && !this.near(i, (q) => q.item && q.item.k === 'plate' && this.plateAccepts(q.item, waiting.item)) && !(other.hold && other.hold.k === 'plate')) {
      const ep = this.near(i, (q) => q.item && q.item.k === 'plate' && !q.item.parts.length && !q.item.soup && !this.claimed(i, q));
      const st = ep || this.near(i, (q) => (q.type === 'plates' && q.count > 0) || (q.type === 'sink' && q.clean > 0));
      if (st) return pick(st);
    }
    // 7. посуда
    const clean = k.tiles.reduce((s, q) => s + (q.type === 'plates' ? q.count : 0) + (q.type === 'sink' ? q.clean : 0), 0);
    const sink = this.near(i, (q) => q.type === 'sink' && q.dirty > 0 && !(other.work && other.work.t === q));
    if (sink && clean < 2) return { t: sink, op: 'act' };
    const dirty = this.near(i, (q) => q.type === 'dirty' && q.count > 0);
    if (dirty && clean < 3) return pick(dirty);
    // 8. заготовка: недостающие продукты из ящиков
    const freeBoard = k.tiles.some((q) => q.type === 'board' && (!q.item || q.item.st !== 'raw'));
    const rank = (id) => {
      const j = k.orders.findIndex((o) => {
        const R = RECIPES[o.r];
        return R.soup === id || (R.parts && R.parts.some((x) => x.startsWith(id + ':')));
      });
      return j < 0 ? 99 : j;
    };
    const need = Object.keys(D.want)
      .filter((id) => (D.want[id] || 0) > (D.have[id] || 0) && (!ING[id].chop || freeBoard))
      .map((id) => this.near(i, (q) => q.type === 'crate' && q.crate === id && !q.item))
      .filter(Boolean);
    // доска занята ненужным — освобождаем
    {
      const wantChop = Object.keys(D.want).some((id) => ING[id].chop && (D.want[id] || 0) > (D.have[id] || 0));
      const fb = k.tiles.some((q) => q.type === 'board' && !q.item);
      const rawWaiting = k.tiles.some((q) => q.item && q.item.k === 'ing' && q.item.st === 'raw' && ING[q.item.id].chop && q.type !== 'board');
      const jb = !fb && (wantChop || rawWaiting) && this.near(i, (q) => q.type === 'board' && q.item && q.item.k === 'ing' && q.item.st !== 'raw' && !this.claimed(i, q));
      if (jb && this.freeCounter(i)) return pick(jb);
    }
    if (need.length) {
      const c = k.chefs[i];
      need.sort((a, b) => rank(a.crate) - rank(b.crate) || Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z));
      return pick(need[0], { fetch: need[0].crate });
    }
    if (sink) return { t: sink, op: 'act' };
    if (dirty) return pick(dirty);
    return null;
  }

  // полезен ли лежащий продукт и есть ли у меня куда его отнести
  useful(i, it, D, from) {
    const fake = { k: 'ing', id: it.id, st: it.st };
    const I = ING[it.id];
    if (it.st === 'chop' && I.pot && (D.soupIng[it.id] || 0) > 0 && this.potFor(i, it.id, D)) return true;
    if (it.st === 'chop' && I.pan && this.near(i, (t) => t.type === 'stove' && t.item && t.item.k === 'pan' && !t.item.item)) {
      if ((D.partNeed[it.id + ':cook'] || 0) > 0) return true;
    }
    if (I.potRaw && this.near(i, (t) => t.type === 'stove' && t.item && t.item.k === 'pot' && t.item.n === 0)) return true;
    if (this.near(i, (t) => t !== from && t.item && this.plateAccepts(t.item, fake))) return true;
    // плиты/тарелки здесь, а продукт пришёл с той стороны
    const mine = this.near(i, (t) => t.type === 'plates' || (t.type === 'stove' && t.item));
    const fromOther = from && this.adj.get(from) && this.adj.get(from).size > 1;
    if (from && from.type === 'belt') return mine && this.finalState(it);
    if (fromOther && mine) return this.finalState(it) || (it.st === 'chop' && (I.pan || I.pot));
    return false;
  }

  plateHasWork(i, p, from) {
    const k = this.k;
    if (p.soup) return false;
    const pan = this.near(i, (t) => t.item && t.item.k === 'pan' && t.item.item && t.item.item.st === 'cook' && this.plateAccepts(p, t.item.item));
    if (pan) return true;
    const rice = this.near(i, (t) => t.item && t.item.k === 'pot' && t.item.done && t.item.kind === 'rice' && this.plateAccepts(p, { id: 'rice', st: 'cook' }));
    if (rice) return true;
    if (!p.parts.length) {
      const soup = this.near(i, (t) => t.item && t.item.k === 'pot' && t.item.done && !t.item.burnt && t.item.kind === 'soup');
      if (soup) return true;
    }
    return false;
  }

  // ---------- путь ----------
  path(i, t) {
    const k = this.k;
    const c = k.chefs[i];
    const sx = Math.floor(c.x),
      sz = Math.floor(c.z);
    const goal = new Set();
    for (const [dx, dz] of D4) {
      const b = k.tile(t.x + dx, t.z + dz);
      if (b && b.walk) goal.add(b.z * k.W + b.x);
    }
    const W = k.W;
    const prev = new Map();
    const start = sz * W + sx;
    prev.set(start, -1);
    const q = [start];
    let end = -1;
    while (q.length) {
      const a = q.shift();
      if (goal.has(a)) {
        end = a;
        break;
      }
      const ax = a % W,
        az = (a / W) | 0;
      for (const [dx, dz] of D4) {
        const b = k.tile(ax + dx, az + dz);
        if (!b || !b.walk) continue;
        const id = b.z * W + b.x;
        if (prev.has(id)) continue;
        prev.set(id, a);
        q.push(id);
      }
    }
    if (end < 0) return null;
    const p = [];
    for (let n = end; n !== -1; n = prev.get(n)) p.unshift(n);
    return p.map((n) => ({ x: (n % W) + 0.5, z: ((n / W) | 0) + 0.5 }));
  }

  // ---------- кадр ----------
  step(dt) {
    const k = this.k;
    const inp = { mx: 0, mz: 0, pick: false, act: false, actHeld: false, sw: false };
    if (!k.started || k.finished) return inp;
    this.swCool -= dt;
    this.decT -= dt;
    if (this.decT <= 0) {
      this.decT = 0.15;
      for (let i = 0; i < k.chefs.length; i++) {
        const c = k.chefs[i];
        if (c.work) {
          this.intent[i] = { t: c.work.t, op: 'working' };
          continue;
        }
        this.intent[i] = this.decide(i);
      }
    }
    const a = k.active;
    const c = k.chefs[a];
    const it = this.intent[a];
    const busy = (j) => {
      const x = this.intent[j];
      return !!x && x.op !== 'working' && x.op !== 'wait';
    };
    // переключение: активный занят/ждёт, у другого есть дело
    if (k.chefs.length > 1 && this.swCool <= 0 && !busy(a) && busy(1 - a)) {
      this.swCool = 0.35;
      inp.sw = true;
      return inp;
    }
    if (!it || it.op === 'working') return inp;
    const t = it.t;
    // уже стоим перед целью
    if (c.target === t && Math.hypot(c.vx, c.vz) < 2.5) {
      if (it.op === 'pick') {
        inp.pick = true;
        this.decT = 0;
        if (it.chopAfter) this.pendingChop = t;
      } else if (it.op === 'act') {
        inp.act = true;
        this.decT = 0;
      } else if (it.op === 'spray') {
        inp.actHeld = true;
      }
      return inp;
    }
    if (it.op === 'spray') {
      // огнетушитель бьёт на 2.8 клетки — достаточно подойти и смотреть на огонь
      const ox = t.x + 0.5 - c.x,
        oz = t.z + 0.5 - c.z;
      const d = Math.hypot(ox, oz);
      if (d < 2.2) {
        const fx = Math.sin(c.dir),
          fz = Math.cos(c.dir);
        if ((ox * fx + oz * fz) / d > 0.8) {
          inp.actHeld = true;
          return inp;
        }
        inp.mx = (ox / d) * 0.2;
        inp.mz = (oz / d) * 0.2;
        inp.actHeld = true;
        return inp;
      }
    }
    if (this.pendingChop && c.target === this.pendingChop && !c.hold) {
      inp.act = true;
      this.pendingChop = null;
      return inp;
    }
    const p = this.path(a, t);
    if (!p) return inp;
    let wp = p[Math.min(1, p.length - 1)];
    const last = p[p.length - 1];
    if (p.length <= 1 || Math.hypot(last.x - c.x, last.z - c.z) < 0.45) {
      // в нужной клетке — разворачиваемся к цели
      const dx = last.x - c.x,
        dz = last.z - c.z;
      const dl = Math.hypot(dx, dz);
      if (dl > 0.3 && it.op !== 'wait') {
        inp.mx = (dx / dl) * Math.min(1, dl * 3);
        inp.mz = (dz / dl) * Math.min(1, dl * 3);
        return inp;
      }
      if (it.op === 'wait' && c.target === t) return inp;
      const ox = t.x + 0.5 - c.x,
        oz = t.z + 0.5 - c.z;
      const d = Math.hypot(ox, oz);
      inp.mx = (ox / d) * 0.3;
      inp.mz = (oz / d) * 0.3;
      return inp;
    }
    // срезаем: если следующая точка видна напрямую, идём к ней
    if (p.length > 2) {
      const n2 = p[2];
      if (this.clear(c.x, c.z, n2.x, n2.z)) wp = n2;
    }
    let dx = wp.x - c.x,
      dz = wp.z - c.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d;
    dz /= d;
    // на льду гасим боковой занос
    const tl = k.tile(Math.floor(c.x), Math.floor(c.z));
    if (tl && tl.type === 'ice') {
      dx -= c.vx * 0.12;
      dz -= c.vz * 0.12;
    }
    inp.mx = dx;
    inp.mz = dz;
    // застряли — пробуем пересчитать
    if (Math.hypot(c.vx, c.vz) < 0.3) {
      this.stuck[a] += dt;
      if (this.stuck[a] > 1.2) {
        this.stuck[a] = 0;
        this.decT = 0;
        inp.mx += Math.random() - 0.5;
        inp.mz += Math.random() - 0.5;
      }
    } else this.stuck[a] = 0;
    return inp;
  }

  clear(x0, z0, x1, z1) {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 4);
    for (let s = 0; s <= n; s++) {
      const x = x0 + ((x1 - x0) * s) / n,
        z = z0 + ((z1 - z0) * s) / n;
      for (const [ox, oz] of [
        [0.33, 0.33],
        [-0.33, 0.33],
        [0.33, -0.33],
        [-0.33, -0.33],
      ])
        if (this.k.blocked(Math.floor(x + ox), Math.floor(z + oz))) return false;
    }
    return true;
  }
}
