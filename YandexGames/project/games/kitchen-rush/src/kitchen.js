// Логика кухни: клетки, повара, предметы, готовка, заказы, пожар, очки. Без графики.
import { ING, CRATE, RECIPES, SOUP_N, parseLevel, upEffect } from './data.js';

export const CHOP_TIME = 2.2; // с на один продукт
export const SOUP_TIME = 11;
export const RICE_TIME = 7;
export const FRY_TIME = 7;
export const BURN_TIME = 9; // после готовности до подгорания
export const WARN_TIME = 4; // с какого момента мигает «!»
export const WASH_TIME = 2;
export const BELT_TIME = 1.0; // с на клетку конвейера
export const PLATE_BACK = 5; // через сколько тарелка возвращается
export const MISS_PENALTY = 10;
export const BASE_SPEED = 4.2;
const R = 0.32; // радиус повара

const WALK = { '.': 'floor', i: 'ice', 1: 'floor', 2: 'floor' };
const TYPES = { c: 'counter', x: 'board', s: 'stove', f: 'stove', p: 'plates', w: 'serve', d: 'dirty', k: 'sink', g: 'trash', e: 'counter', '>': 'belt', '<': 'belt', '^': 'belt', v: 'belt' };
const BELT_DIR = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], v: [0, 1] };

let UID = 1;
export const newIng = (id, st = 'raw') => ({ k: 'ing', id, st, chop: 0, uid: UID++, v: 0 });
const newPlate = () => ({ k: 'plate', parts: [], soup: null, uid: UID++, v: 0 });
const newPot = () => ({ k: 'pot', ing: null, kind: null, n: 0, p: 0, burn: 0, done: false, burnt: false, uid: UID++, v: 0 });
const newPan = () => ({ k: 'pan', item: null, p: 0, burn: 0, uid: UID++, v: 0 });

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (it) => it.id + ':' + it.st;

// подходит ли набор частей хоть к одному рецепту (мультимножество — подмножество рецепта)
export function partsValid(parts, menu) {
  for (const r of menu || Object.keys(RECIPES)) {
    const rp = RECIPES[r].parts;
    if (!rp) continue;
    const left = rp.slice();
    let ok = true;
    for (const p of parts) {
      const i = left.indexOf(p);
      if (i < 0) {
        ok = false;
        break;
      }
      left.splice(i, 1);
    }
    if (ok) return true;
  }
  return false;
}

// какое блюдо на тарелке (или null)
export function dishOf(plate, menu) {
  if (!plate || plate.k !== 'plate') return null;
  for (const r of menu || Object.keys(RECIPES)) {
    const R = RECIPES[r];
    if (R.soup) {
      if (plate.soup === R.soup && !plate.parts.length) return r;
      continue;
    }
    if (plate.soup || plate.parts.length !== R.parts.length) continue;
    const a = plate.parts.slice().sort().join();
    if (a === R.parts.slice().sort().join()) return r;
  }
  return null;
}

export class Kitchen {
  constructor(idx, opts = {}) {
    const P = parseLevel(idx);
    this.idx = idx;
    this.L = P.L;
    this.W = P.W;
    this.H = P.H;
    this.fx = upEffect(opts.up);
    this.rand = mulberry(opts.seed ?? (Date.now() & 0xffffff));
    this.tiles = [];
    this.chefs = [];
    this.events = [];
    for (let z = 0; z < P.H; z++)
      for (let x = 0; x < P.W; x++) {
        const ch = P.at(x, z);
        const t = { x, z, ch, type: WALK[ch] || TYPES[ch] || (CRATE[ch] ? 'crate' : 'void'), item: null, fire: 0 };
        t.walk = !!WALK[ch];
        if (t.type === 'crate') t.crate = CRATE[ch];
        if (ch === 's') t.item = newPot();
        if (ch === 'f') t.item = newPan();
        if (ch === 'e') t.item = { k: 'ext', uid: UID++, v: 0 };
        if (t.type === 'plates') t.count = this.L.plates || 3;
        if (t.type === 'dirty') t.count = 0;
        if (t.type === 'sink') {
          t.dirty = 0;
          t.clean = 0;
          t.prog = 0;
        }
        if (t.type === 'belt') {
          t.dir = BELT_DIR[ch];
          t.beltT = 0;
        }
        if (ch === '1' || ch === '2') this.chefs[+ch - 1] = this.mkChef(x, z, +ch - 1);
        this.tiles.push(t);
      }
    this.active = 0;
    this.t = 0;
    this.timeLeft = this.L.time;
    this.started = false;
    this.finished = false;
    this.orders = [];
    this.orderT = 0.6; // первый заказ почти сразу
    this.orderN = 0;
    this.score = 0;
    this.served = 0;
    this.missed = 0;
    this.tips = 0;
    this.combo = 1;
    this.returns = []; // тарелки, которые вернутся
    this.fireT = 0;
    this.lastPick = null;
  }

  mkChef(x, z, i) {
    return { i, x: x + 0.5, z: z + 0.5, vx: 0, vz: 0, dir: Math.PI, hold: null, work: null, moving: 0, walkPh: 0, act: 0, target: null };
  }

  tile(x, z) {
    if (x < 0 || z < 0 || x >= this.W || z >= this.H) return null;
    return this.tiles[z * this.W + x];
  }

  ev(type, o = {}) {
    o.type = type;
    this.events.push(o);
  }

  // ---------- кадр ----------
  // inp: { mx, mz (мир), pick, act, actHeld, sw }
  update(dt, inp, inp2) {
    if (this.finished) return;
    if (this.started) {
      this.t += dt;
      const before = this.timeLeft;
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (before > 30 && this.timeLeft <= 30) this.ev('rush');
      if (Math.ceil(before) !== Math.ceil(this.timeLeft) && this.timeLeft <= 10 && this.timeLeft > 0) this.ev('tick');
    }
    // inp2 — второй игрок за тем же компьютером (режим «Вдвоём»): управляет вторым поваром
    const drive = (c, q) => {
      this.moveInput(c, q.mx || 0, q.mz || 0, dt);
      if (q.pick) this.interact(c);
      if (q.act) this.action(c);
      c.spray = !!(q.actHeld && c.hold && c.hold.k === 'ext');
    };
    const c2 = inp2 ? this.chefs[1 - this.active] : null;
    if (inp && this.started) {
      if (inp.sw && !inp2) this.switchChef();
      drive(this.chefs[this.active], inp);
    }
    if (c2 && this.started) drive(c2, inp2);
    for (const c of this.chefs) {
      if ((c !== this.chefs[this.active] && c !== c2) || !this.started) {
        this.moveInput(c, 0, 0, dt);
        if (c !== this.chefs[this.active]) c.spray = false;
      }
      this.work(c, dt);
      c.target = this.targetTile(c);
    }
    this.separate();
    if (!this.started) return;
    this.cook(dt);
    this.belts(dt);
    this.fires(dt);
    this.updOrders(dt);
    this.updReturns(dt);
    if (this.timeLeft <= 0) {
      this.finished = true;
      for (const c of this.chefs) c.spray = false;
      this.ev('end');
    }
  }

  switchChef() {
    if (this.chefs.length < 2) return;
    this.active = 1 - this.active;
    this.ev('switch', { i: this.active });
  }

  // ---------- движение ----------
  moveInput(c, mx, mz, dt) {
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const sp = BASE_SPEED * this.fx.speed;
    const t = this.tile(Math.floor(c.x), Math.floor(c.z));
    const ice = t && t.type === 'ice';
    const k = ice ? 2.2 : 16;
    const a = Math.min(1, k * dt);
    c.vx += (mx * sp - c.vx) * a;
    c.vz += (mz * sp - c.vz) * a;
    if (len > 0.15) {
      // работа прерывается, если повар пошёл
      if (c.work) {
        c.work = null;
      }
      const target = Math.atan2(mx, mz);
      let d = target - c.dir;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      c.dir += d * Math.min(1, 18 * dt);
    }
    this.moveCollide(c, c.vx * dt, c.vz * dt);
    const sp2 = Math.hypot(c.vx, c.vz);
    c.moving = sp2;
    c.walkPh += sp2 * dt * 3.2;
  }

  blocked(x, z) {
    const t = this.tile(x, z);
    return !t || !t.walk;
  }

  moveCollide(c, dx, dz) {
    // по осям отдельно, с выталкиванием из клеток-препятствий
    c.x += dx;
    this.pushOut(c, true);
    c.z += dz;
    this.pushOut(c, false);
  }

  pushOut(c) {
    const x0 = Math.floor(c.x - R),
      x1 = Math.floor(c.x + R),
      z0 = Math.floor(c.z - R),
      z1 = Math.floor(c.z + R);
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        if (!this.blocked(x, z)) continue;
        // ближайшая точка квадрата к центру повара
        const px = Math.max(x, Math.min(x + 1, c.x));
        const pz = Math.max(z, Math.min(z + 1, c.z));
        let ddx = c.x - px,
          ddz = c.z - pz;
        const d = Math.hypot(ddx, ddz);
        if (d >= R) continue;
        if (d < 1e-6) {
          // центр внутри клетки — выталкиваем по кратчайшей оси
          const l = c.x - x,
            r = x + 1 - c.x,
            u = c.z - z,
            b = z + 1 - c.z;
          const m = Math.min(l, r, u, b);
          if (m === l) c.x = x - R;
          else if (m === r) c.x = x + 1 + R;
          else if (m === u) c.z = z - R;
          else c.z = z + 1 + R;
          continue;
        }
        const push = R - d;
        c.x += (ddx / d) * push;
        c.z += (ddz / d) * push;
        // гасим скорость в сторону стены (важно на льду)
        const nx = ddx / d,
          nz = ddz / d;
        const vn = c.vx * nx + c.vz * nz;
        if (vn < 0) {
          c.vx -= vn * nx;
          c.vz -= vn * nz;
        }
      }
  }

  separate() {
    if (this.chefs.length < 2) return;
    const [a, b] = this.chefs;
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    const min = R * 2;
    if (d < min && d > 1e-6) {
      const p = (min - d) / 2;
      a.x -= (dx / d) * p;
      a.z -= (dz / d) * p;
      b.x += (dx / d) * p;
      b.z += (dz / d) * p;
      this.pushOut(a);
      this.pushOut(b);
    }
  }

  // клетка, с которой повар взаимодействует: перед ним, среди соседних не-пола
  targetTile(c) {
    const fx = Math.sin(c.dir),
      fz = Math.cos(c.dir);
    let best = null,
      bs = -1e9;
    const cx = Math.floor(c.x),
      cz = Math.floor(c.z);
    for (let z = cz - 1; z <= cz + 1; z++)
      for (let x = cx - 1; x <= cx + 1; x++) {
        const t = this.tile(x, z);
        if (!t || t.walk || t.type === 'void') continue;
        // ближайшая точка клетки
        const px = Math.max(x, Math.min(x + 1, c.x)),
          pz = Math.max(z, Math.min(z + 1, c.z));
        const dist = Math.hypot(px - c.x, pz - c.z);
        if (dist > 0.75) continue;
        const ox = x + 0.5 - c.x,
          oz = z + 0.5 - c.z;
        const ol = Math.hypot(ox, oz) || 1;
        const dot = (ox * fx + oz * fz) / ol;
        if (dot < 0.35) continue;
        const s = dot * 2 - dist;
        if (s > bs) {
          bs = s;
          best = t;
        }
      }
    return best;
  }

  // ---------- взять / положить ----------
  interact(c) {
    const t = c.target;
    if (!t) return;
    c.work = null;
    if (t.fire > 0) {
      this.ev('deny', { x: t.x, z: t.z });
      return;
    }
    const H = c.hold;
    const did = H ? this.put(c, t, H) : this.take(c, t);
    if (did) c.act = 0.25;
  }

  take(c, t) {
    if (t.item) {
      // плита: снимаем кастрюлю или сковороду
      c.hold = t.item;
      t.item = null;
      if (t.type === 'belt') t.beltT = 0;
      this.ev('pick', { x: t.x, z: t.z, k: c.hold.k });
      return true;
    }
    if (t.type === 'crate') {
      c.hold = newIng(t.crate);
      this.ev('pick', { x: t.x, z: t.z, k: 'ing', crate: true });
      return true;
    }
    if (t.type === 'plates' && t.count > 0) {
      t.count--;
      c.hold = newPlate();
      this.ev('pick', { x: t.x, z: t.z, k: 'plate' });
      return true;
    }
    if (t.type === 'dirty' && t.count > 0) {
      c.hold = { k: 'dirty', n: t.count, uid: UID++, v: 0 };
      t.count = 0;
      this.ev('pick', { x: t.x, z: t.z, k: 'dirty' });
      return true;
    }
    if (t.type === 'sink' && t.clean > 0) {
      t.clean--;
      c.hold = newPlate();
      this.ev('pick', { x: t.x, z: t.z, k: 'plate' });
      return true;
    }
    return false;
  }

  put(c, t, H) {
    const T = t.type;
    if (T === 'trash') return this.trash(c, H, t);
    if (T === 'serve') return this.serve(c, H, t);
    if (T === 'sink') {
      if (H.k === 'dirty') {
        t.dirty += H.n;
        c.hold = null;
        this.ev('drop', { x: t.x, z: t.z, k: 'dirty' });
        return true;
      }
      return this.deny(t);
    }
    if (T === 'dirty') {
      if (H.k === 'dirty') {
        t.count += H.n;
        c.hold = null;
        this.ev('drop', { x: t.x, z: t.z, k: 'dirty' });
        return true;
      }
      return this.deny(t);
    }
    if (T === 'plates') {
      // пустую чистую тарелку можно вернуть в стопку
      if (H.k === 'plate' && !H.parts.length && !H.soup) {
        t.count++;
        c.hold = null;
        this.ev('drop', { x: t.x, z: t.z, k: 'plate' });
        return true;
      }
      return this.deny(t);
    }
    if (t.item) {
      if (this.combine(c, t, H)) return true;
      return this.deny(t);
    }
    if (T === 'stove' && H.k !== 'pot' && H.k !== 'pan') return this.deny(t);
    if (T === 'counter' || T === 'board' || T === 'stove' || T === 'belt' || T === 'crate') {
      t.item = H;
      c.hold = null;
      if (T === 'belt') t.beltT = 0;
      this.ev('drop', { x: t.x, z: t.z, k: H.k });
      return true;
    }
    return this.deny(t);
  }

  deny(t) {
    this.ev('deny', { x: t.x, z: t.z });
    return false;
  }

  // соединить то, что в руках, с тем, что на столе
  combine(c, t, H) {
    const I = t.item;
    const done = (hold, tileItem, sfx = 'combine') => {
      c.hold = hold;
      t.item = tileItem;
      this.ev(sfx, { x: t.x, z: t.z });
      return true;
    };
    if (H.k === 'ing') {
      if (I.k === 'plate' && this.plateAdd(I, H)) return done(null, I);
      if (I.k === 'pot' && this.potAdd(I, H)) return done(null, I, 'plop');
      if (I.k === 'pan' && this.panAdd(I, H)) return done(null, I, 'plop');
      return false;
    }
    if (H.k === 'plate') {
      if (I.k === 'ing' && this.plateAdd(H, I)) return done(H, null);
      if (I.k === 'pot' && this.plateFromPot(H, I)) return done(H, I, 'pour');
      if (I.k === 'pan' && this.plateFromPan(H, I)) return done(H, I, 'pour');
      return false;
    }
    if (H.k === 'pot' && I.k === 'plate' && this.plateFromPot(I, H)) return done(H, I, 'pour');
    if (H.k === 'pan' && I.k === 'plate' && this.plateFromPan(I, H)) return done(H, I, 'pour');
    if (H.k === 'dirty' && I.k === 'dirty') {
      I.n += H.n;
      I.v++;
      return done(null, I);
    }
    return false;
  }

  plateAdd(plate, ing) {
    if (plate.soup || ing.k !== 'ing') return false;
    const parts = plate.parts.concat(key(ing));
    if (!partsValid(parts, this.L.menu)) return false;
    plate.parts = parts;
    plate.v++;
    return true;
  }

  potAdd(pot, ing) {
    if (pot.burnt) return false;
    const I = ING[ing.id];
    if (I.pot && ing.st === 'chop') {
      if (pot.n > 0 && (pot.kind !== 'soup' || pot.ing !== ing.id)) return false;
      if (pot.n >= SOUP_N) return false;
      pot.kind = 'soup';
      pot.ing = ing.id;
      pot.p = (pot.p * pot.n) / (pot.n + 1);
      pot.n++;
      pot.done = false;
      pot.burn = 0;
      pot.v++;
      return true;
    }
    if (I.potRaw && ing.st === 'raw' && pot.n === 0) {
      pot.kind = 'rice';
      pot.ing = ing.id;
      pot.n = 1;
      pot.p = 0;
      pot.done = false;
      pot.burn = 0;
      pot.v++;
      return true;
    }
    return false;
  }

  panAdd(pan, ing) {
    if (pan.item || !ING[ing.id].pan || ing.st !== 'chop') return false;
    pan.item = ing;
    pan.p = 0;
    pan.burn = 0;
    pan.v++;
    return true;
  }

  plateFromPot(plate, pot) {
    if (!pot.done || pot.burnt) return false;
    if (pot.kind === 'soup') {
      if (plate.parts.length || plate.soup) return false;
      plate.soup = pot.ing;
    } else {
      const parts = plate.parts.concat('rice:cook');
      if (plate.soup || !partsValid(parts, this.L.menu)) return false;
      plate.parts = parts;
    }
    plate.v++;
    this.resetPot(pot);
    return true;
  }

  plateFromPan(plate, pan) {
    const it = pan.item;
    if (!it || it.st !== 'cook') return false;
    if (!this.plateAdd(plate, it)) return false;
    pan.item = null;
    pan.p = 0;
    pan.burn = 0;
    pan.v++;
    return true;
  }

  resetPot(pot) {
    pot.ing = null;
    pot.kind = null;
    pot.n = 0;
    pot.p = 0;
    pot.burn = 0;
    pot.done = false;
    pot.burnt = false;
    pot.v++;
  }

  trash(c, H, t) {
    if (H.k === 'ing') c.hold = null;
    else if (H.k === 'plate') {
      if (!H.parts.length && !H.soup) return this.deny(t);
      H.parts = [];
      H.soup = null;
      H.v++;
    } else if (H.k === 'pot') {
      if (!H.n) return this.deny(t);
      this.resetPot(H);
    } else if (H.k === 'pan') {
      if (!H.item) return this.deny(t);
      H.item = null;
      H.p = 0;
      H.burn = 0;
      H.v++;
    } else return this.deny(t);
    this.ev('trash', { x: t.x, z: t.z });
    return true;
  }

  serve(c, H, t) {
    const dish = dishOf(H, this.L.menu);
    if (!dish) return this.deny(t);
    const oi = this.orders.findIndex((o) => o.r === dish);
    if (oi < 0) {
      this.ev('wrong', { x: t.x, z: t.z });
      return false;
    }
    const o = this.orders[oi];
    this.orders.splice(oi, 1);
    const R = RECIPES[dish];
    // комбо: подряд выдаём самые старые заказы
    if (oi === 0) this.combo = Math.min(4, this.combo + (this.served ? 1 : 0));
    else this.combo = 1;
    const frac = Math.max(0, o.left / o.pat);
    const tip = Math.round(10 * frac * this.fx.tips) * this.combo;
    this.score += R.value + tip;
    this.tips += tip;
    this.served++;
    c.hold = null;
    this.returns.push(PLATE_BACK + (this.L.dirty ? 1 : 0));
    this.ev('serve', { x: t.x, z: t.z, value: R.value, tip, combo: this.combo, r: dish, oid: o.id });
    return true;
  }

  // ---------- действие: резать, мыть ----------
  action(c) {
    const t = c.target;
    if (!t || t.fire > 0) return;
    if (t.type === 'board' && t.item && t.item.k === 'ing' && t.item.st === 'raw' && ING[t.item.id].chop) {
      c.work = { type: 'chop', t };
      return;
    }
    if (t.type === 'sink' && t.dirty > 0) {
      c.work = { type: 'wash', t };
      return;
    }
  }

  work(c, dt) {
    const w = c.work;
    if (!w) return;
    const t = w.t;
    if (c.target !== t || t.fire > 0 || !this.started) {
      c.work = null;
      return;
    }
    if (w.type === 'chop') {
      const it = t.item;
      if (!it || it.k !== 'ing' || it.st !== 'raw') {
        c.work = null;
        return;
      }
      const prev = it.chop;
      it.chop += dt / (CHOP_TIME * this.fx.chop);
      if (Math.floor(prev * 5) !== Math.floor(it.chop * 5)) this.ev('chop', { x: t.x, z: t.z });
      if (it.chop >= 1) {
        it.st = 'chop';
        it.chop = 0;
        it.v++;
        c.work = null;
        this.ev('chopped', { x: t.x, z: t.z });
      }
    } else if (w.type === 'wash') {
      if (t.dirty <= 0) {
        c.work = null;
        return;
      }
      const prev = t.prog;
      t.prog += dt / WASH_TIME;
      if (Math.floor(prev * 3) !== Math.floor(t.prog * 3)) this.ev('wash', { x: t.x, z: t.z });
      if (t.prog >= 1) {
        t.prog = 0;
        t.dirty--;
        t.clean++;
        this.ev('washed', { x: t.x, z: t.z });
        if (t.dirty <= 0) c.work = null;
      }
    }
  }

  // ---------- готовка на плитах ----------
  cook(dt) {
    const k = this.fx.cook;
    for (const t of this.tiles) {
      if (t.type !== 'stove' || !t.item) continue;
      const it = t.item;
      if (it.k === 'pot' && it.n > 0 && !it.burnt) {
        const need = it.kind === 'soup' ? SOUP_N : 1;
        const time = it.kind === 'soup' ? SOUP_TIME : RICE_TIME;
        if (!it.done) {
          it.p = Math.min(1, it.p + (dt * k) / time);
          if (it.p >= 1 && it.n >= need) {
            it.done = true;
            it.burn = 0;
            it.v++;
            this.ev('cooked', { x: t.x, z: t.z });
          }
        } else this.burnStep(t, it, dt);
      } else if (it.k === 'pan' && it.item && it.item.st !== 'burnt') {
        const ing = it.item;
        if (ing.st === 'chop') {
          it.p = Math.min(1, it.p + (dt * k) / FRY_TIME);
          if (it.p >= 1) {
            ing.st = 'cook';
            ing.v++;
            it.burn = 0;
            it.v++;
            this.ev('cooked', { x: t.x, z: t.z });
          }
        } else if (ing.st === 'cook') this.burnStep(t, it, dt);
      }
    }
  }

  burnStep(t, it, dt) {
    const prev = it.burn;
    it.burn += dt;
    // пищит всё чаще, пока не снимешь с плиты
    if (it.burn >= WARN_TIME) {
      const step = it.burn > (WARN_TIME + BURN_TIME) / 2 ? 0.45 : 0.8;
      if (prev < WARN_TIME || Math.floor((it.burn - WARN_TIME) / step) !== Math.floor((prev - WARN_TIME) / step)) this.ev('warn', { x: t.x, z: t.z });
    }
    if (it.burn >= BURN_TIME) {
      if (it.k === 'pot') it.burnt = true;
      else {
        it.item.st = 'burnt';
        it.item.v++;
      }
      it.v++;
      this.ev('burnt', { x: t.x, z: t.z });
      if (this.L.fire) this.ignite(t);
    }
  }

  // ---------- пожар ----------
  ignite(t) {
    if (t.fire > 0 || t.walk || t.type === 'void') return;
    t.fire = 0.05;
    t.fireT = 0;
    this.ev('fire', { x: t.x, z: t.z });
  }

  fires(dt) {
    let any = 0;
    for (const t of this.tiles) {
      if (t.fire <= 0) continue;
      any++;
      t.fire = Math.min(1, t.fire + dt * 0.6);
      t.fireT += dt;
      // огонь перекидывается на соседние столы
      if (t.fire >= 1 && t.fireT > 6) {
        t.fireT = 0;
        const n = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]
          .map(([dx, dz]) => this.tile(t.x + dx, t.z + dz))
          .filter((q) => q && !q.walk && q.type !== 'void' && q.fire <= 0 && q.type !== 'sink' && q.type !== 'serve');
        if (n.length) this.ignite(n[Math.floor(this.rand() * n.length)]);
      }
      // огонь портит продукт на столе
      if (t.item && t.item.k === 'ing' && t.item.st !== 'burnt' && t.fire >= 1) {
        t.item.st = 'burnt';
        t.item.v++;
      }
    }
    this.fireCount = any;
    // огнетушитель
    for (const c of this.chefs) {
      if (!c.spray) continue;
      const fx = Math.sin(c.dir),
        fz = Math.cos(c.dir);
      for (const t of this.tiles) {
        if (t.fire <= 0) continue;
        const ox = t.x + 0.5 - c.x,
          oz = t.z + 0.5 - c.z;
        const d = Math.hypot(ox, oz);
        if (d > 2.8) continue;
        if ((ox * fx + oz * fz) / (d || 1) < 0.55 && d > 0.9) continue;
        t.fire -= dt * 1.5;
        if (t.fire <= 0) {
          t.fire = 0;
          this.ev('extinguished', { x: t.x, z: t.z });
        }
      }
    }
  }

  // ---------- конвейеры ----------
  belts(dt) {
    // двигаем с конца, чтобы цепочка не перескакивала за кадр
    const moved = new Set();
    for (const t of this.tiles) {
      if (t.type !== 'belt' || !t.item || moved.has(t.item) || t.fire > 0) continue;
      t.beltT += dt;
      if (t.beltT < BELT_TIME) continue;
      const n = this.tile(t.x + t.dir[0], t.z + t.dir[1]);
      if (n && !n.item && n.fire <= 0 && (n.type === 'belt' || n.type === 'counter')) {
        n.item = t.item;
        n.beltT = 0;
        t.item = null;
        t.beltT = 0;
        moved.add(n.item);
      } else t.beltT = BELT_TIME;
    }
  }

  // ---------- заказы ----------
  updOrders(dt) {
    const L = this.L;
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const o = this.orders[i];
      o.left -= dt;
      if (o.left <= 0) {
        this.orders.splice(i, 1);
        this.missed++;
        this.combo = 1;
        this.score = Math.max(0, this.score - MISS_PENALTY);
        this.ev('miss', { r: o.r, oid: o.id });
      }
    }
    this.orderT -= dt;
    const max = L.maxOrders || 3;
    if (this.orders.length === 0 && this.orderT > 1.5) this.orderT = 1.5;
    if (this.orderT <= 0 && this.orders.length < max && this.timeLeft > 8) {
      this.addOrder();
      this.orderT = this.orderN < 2 ? 9 : L.gap || 17;
    }
  }

  addOrder() {
    const menu = this.L.menu;
    let r = menu[Math.floor(this.rand() * menu.length)];
    // не больше двух одинаковых подряд
    const last = this.orders.slice(-2).map((o) => o.r);
    if (menu.length > 1 && last.length === 2 && last[0] === r && last[1] === r) r = menu[(menu.indexOf(r) + 1) % menu.length];
    // первым заказом на уровне идёт первое блюдо меню (оно и в подсказках)
    if (this.orderN === 0) r = menu[0];
    const pat = RECIPES[r].pat * this.fx.patience * (this.L.patience || 1);
    const o = { id: ++this.orderN, r, pat, left: pat };
    this.orders.push(o);
    this.ev('order', { r, oid: o.id });
  }

  updReturns(dt) {
    for (let i = this.returns.length - 1; i >= 0; i--) {
      this.returns[i] -= dt;
      if (this.returns[i] > 0) continue;
      this.returns.splice(i, 1);
      const type = this.L.dirty ? 'dirty' : 'plates';
      const t = this.tiles.find((q) => q.type === type);
      if (t) {
        t.count++;
        this.ev('plateBack', { x: t.x, z: t.z });
      }
    }
  }

  stars() {
    const s = this.L.stars;
    return s.filter((v) => this.score >= v).length;
  }
}
