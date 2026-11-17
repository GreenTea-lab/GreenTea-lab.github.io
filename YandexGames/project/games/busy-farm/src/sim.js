// Логика фермы без графики: трава, колодец, животные, продукты, мастерские, склад, машина, медведи.
// Работает и в браузере, и в node (бот для проверки баланса).
import { ITEMS, ANIMALS, BUILDINGS, MAX_QUEUE, WELL_CAP, WELL_TIME, WELL_PRICE, STORE_CAP, TRUCK_CAP, TRUCK_TIME, BUILD_SPEED, ITEM_LIFE, CAGE_TIME, BEAR_FREE_TIME } from './data.js';

export const CELL = 0.55; // клетка травы
const BITE = 0.26; // сытость за один укус
const EAT_TIME = 1.1;
const HUNGRY = 0.62; // ниже — идёт искать траву

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export class Farm {
  // L — уровень из LEVELS, lay — раскладка, up — уровни улучшений {well, store, truck, powder…}
  constructor(L, lay, up = {}, seed = 1) {
    this.L = L;
    this.lay = lay;
    this.up = up;
    this.rnd = rng(seed);
    this.t = 0;
    this.coins = L.coins;
    this.events = [];
    this.nextId = 1;
    this.grass = new Map(); // "ix,iz" → {ix,iz,x,z,amt,grow}
    this.animals = [];
    this.items = []; // на земле
    this.bears = [];
    this.made = {}; // сколько собрано за уровень (для целей)
    this.stock = {}; // склад
    this.finished = false;
    this.finishT = 0;
    const F = lay.field;
    this.gx0 = Math.ceil(F.x0 / CELL + 0.5);
    this.gx1 = Math.floor(F.x1 / CELL - 0.5);
    this.gz0 = Math.ceil(F.z0 / CELL + 0.5);
    this.gz1 = Math.floor(F.z1 / CELL - 0.5);
    this.well = { water: this.wellCap(), refill: 0 };
    this.truck = { state: 'home', t: 0, cargo: {}, sold: false, value: 0 };
    this.slots = lay.slots.map((s, i) => ({ i, ...s, kind: null, built: false, queue: 0, prog: 0 }));
    // какие мастерские доступны на уровне — по местам слева направо
    L.buildings.forEach((b, i) => {
      if (this.slots[i]) this.slots[i].kind = b;
    });
    for (const b of L.pre || []) {
      const s = this.slots.find((x) => x.kind === b);
      if (s) s.built = true;
    }
    for (const [k, n] of Object.entries(L.start || {})) for (let i = 0; i < n; i++) this.spawnAnimal(k, true);
    // медведи
    this.bearAt = L.bears ? L.bears.first : Infinity;
  }

  // ---------- характеристики с учётом улучшений ----------
  lv(k) {
    return Math.min(5, this.up[k] || 0);
  }
  wellCap() {
    return WELL_CAP[this.lv('well')];
  }
  storeCap() {
    return STORE_CAP[this.lv('store')];
  }
  truckCap() {
    return TRUCK_CAP[this.lv('truck')];
  }
  wellTime() {
    return WELL_TIME[this.lv('well')];
  }
  truckTime() {
    return TRUCK_TIME[this.lv('truck')];
  }
  buildTime(kind) {
    return BUILDINGS[kind].time * BUILD_SPEED[this.lv(kind)];
  }
  storeUsed() {
    let n = 0;
    for (const [k, c] of Object.entries(this.stock)) n += c * ITEMS[k].size;
    return n;
  }
  storeFree() {
    return this.storeCap() - this.storeUsed();
  }
  truckUsed() {
    let n = 0;
    for (const [k, c] of Object.entries(this.truck.cargo)) n += c * ITEMS[k].size;
    return n;
  }
  count(kind) {
    let n = 0;
    for (const a of this.animals) if (a.kind === kind && !a.dead) n++;
    return n;
  }

  ev(t, o = {}) {
    o.t = t;
    this.events.push(o);
  }

  inField(x, z, pad = 0) {
    const F = this.lay.field;
    return x >= F.x0 + pad && x <= F.x1 - pad && z >= F.z0 + pad && z <= F.z1 - pad;
  }
  randField(pad = 0.6) {
    const F = this.lay.field;
    return { x: F.x0 + pad + this.rnd() * (F.x1 - F.x0 - 2 * pad), z: F.z0 + pad + this.rnd() * (F.z1 - F.z0 - 2 * pad) };
  }

  // ---------- действия игрока ----------
  // посадить траву в точке поля
  plant(x, z) {
    if (this.finished) return 'done';
    if (!this.inField(x, z)) return 'out';
    if (this.well.refill > 0) return 'refill';
    if (this.well.water <= 0) return 'nowater';
    const ix = Math.round(x / CELL),
      iz = Math.round(z / CELL);
    // пятнышко: центр и соседи
    const cells = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    let any = false;
    for (const [dx, dz] of cells) {
      const cx = ix + dx,
        cz = iz + dz;
      if (cx < this.gx0 || cx > this.gx1 || cz < this.gz0 || cz > this.gz1) continue;
      const key = cx + ',' + cz;
      let g = this.grass.get(key);
      const amt = dx === 0 && dz === 0 ? 3 : 2;
      if (!g) {
        g = { key, ix: cx, iz: cz, x: cx * CELL, z: cz * CELL, amt: 0, grow: 0, seed: this.rnd() };
        this.grass.set(key, g);
      }
      if (g.amt < amt) {
        g.amt = amt;
        g.grow = 0;
        any = true;
      }
    }
    if (!any) return 'full';
    this.well.water--;
    this.ev('plant', { x: ix * CELL, z: iz * CELL });
    if (this.well.water === 0) this.ev('wellEmpty');
    return 'ok';
  }

  refillWell() {
    if (this.well.refill > 0 || this.well.water >= this.wellCap()) return 'full';
    if (this.coins < WELL_PRICE) return 'money';
    this.coins -= WELL_PRICE;
    this.well.refill = WELL_TIME[this.lv('well')];
    this.ev('wellStart');
    return 'ok';
  }

  canBuy(kind) {
    return this.L.animals.includes(kind) && this.coins >= ANIMALS[kind].cost;
  }
  buyAnimal(kind) {
    if (this.finished || !this.canBuy(kind)) return false;
    this.coins -= ANIMALS[kind].cost;
    this.spawnAnimal(kind, false);
    this.ev('buy', { kind });
    return true;
  }
  sellAnimal(kind) {
    const a = this.animals.find((x) => x.kind === kind && !x.dead && x.state !== 'drop');
    if (!a) return false;
    a.dead = true;
    a.gone = 'sold';
    this.coins += ANIMALS[kind].sell;
    this.ev('sellAnimal', { kind, x: a.x, z: a.z });
    return true;
  }

  spawnAnimal(kind, instant) {
    const p = this.randField(0.8);
    const D = ANIMALS[kind];
    const a = {
      id: this.nextId++,
      kind,
      x: p.x,
      z: p.z,
      tx: p.x,
      tz: p.z,
      dir: this.rnd() * Math.PI * 2,
      state: instant ? 'idle' : 'drop',
      st: instant ? this.rnd() * 2 : 1.4,
      food: D.helper ? 1 : 1,
      prod: D.helper ? 0 : this.rnd() * 0.4,
      starve: 0,
      moving: false,
      carry: null,
      target: null,
      eatT: 0,
    };
    this.animals.push(a);
    return a;
  }

  buildSlot(i) {
    const s = this.slots[i];
    if (!s || !s.kind || s.built || this.finished) return 'no';
    const c = BUILDINGS[s.kind].cost;
    if (this.coins < c) return 'money';
    this.coins -= c;
    s.built = true;
    this.ev('build', { i });
    return 'ok';
  }

  // нажали на мастерскую: взять сырьё со склада в очередь (сколько влезет)
  useSlot(i) {
    const s = this.slots[i];
    if (!s || !s.built) return 'no';
    const B = BUILDINGS[s.kind];
    if (s.queue >= MAX_QUEUE) return 'busy';
    if (!this.stock[B.in]) return 'empty';
    let n = 0;
    while (s.queue < MAX_QUEUE && this.stock[B.in] > 0) {
      this.stock[B.in]--;
      s.queue++;
      n++;
    }
    this.ev('load', { i, item: B.in, n });
    return 'ok';
  }

  // собрать товар с земли (по клику) — летит на склад
  collect(id) {
    const it = this.items.find((x) => x.id === id);
    if (!it || it.gone) return 'no';
    if (this.storeFree() < ITEMS[it.item].size) {
      this.ev('storeFull', { x: it.x, z: it.z });
      return 'full';
    }
    this.toStore(it);
    return 'ok';
  }
  toStore(it) {
    it.gone = 'store';
    this.stock[it.item] = (this.stock[it.item] || 0) + 1;
    this.made[it.item] = (this.made[it.item] || 0) + 1;
    this.ev('collect', { id: it.id, item: it.item, x: it.x, z: it.z });
  }

  // медведь: клик по свободному — строим клетку; по пойманному — на склад
  hitBear(id) {
    const b = this.bears.find((x) => x.id === id);
    if (!b || b.gone) return 'no';
    if (b.state === 'free' || b.state === 'fall') {
      b.clicks++;
      this.ev('cageHit', { id, n: b.clicks, need: b.need });
      if (b.clicks >= b.need) this.cage(b);
      return 'hit';
    }
    if (b.state === 'caged') {
      if (this.storeFree() < ITEMS.bear.size) {
        this.ev('storeFull', { x: b.x, z: b.z });
        return 'full';
      }
      b.gone = 'store';
      this.stock.bear = (this.stock.bear || 0) + 1;
      this.ev('bearStore', { id, x: b.x, z: b.z });
      return 'store';
    }
    return 'no';
  }
  cage(b) {
    b.state = 'caged';
    b.cageT = CAGE_TIME;
    this.ev('caged', { id: b.id, x: b.x, z: b.z });
  }

  // машина: погрузить со склада
  load(item, n = 1) {
    if (this.truck.state !== 'home') return 0;
    let k = 0;
    while (k < n && (this.stock[item] || 0) > 0 && this.truckUsed() + ITEMS[item].size <= this.truckCap()) {
      this.stock[item]--;
      this.truck.cargo[item] = (this.truck.cargo[item] || 0) + 1;
      k++;
    }
    return k;
  }
  unload(item, n = 1) {
    if (this.truck.state !== 'home') return 0;
    let k = 0;
    while (k < n && (this.truck.cargo[item] || 0) > 0 && this.storeFree() >= ITEMS[item].size) {
      this.truck.cargo[item]--;
      this.stock[item] = (this.stock[item] || 0) + 1;
      k++;
    }
    return k;
  }
  cargoValue() {
    let v = 0;
    for (const [k, c] of Object.entries(this.truck.cargo)) v += c * ITEMS[k].price;
    return v;
  }
  sendTruck() {
    if (this.truck.state !== 'home' || this.truckUsed() === 0) return false;
    this.truck.state = 'away';
    this.truck.t = 0;
    this.truck.sold = false;
    this.truck.value = this.cargoValue();
    this.ev('truckGo');
    return true;
  }

  // ---------- шаг симуляции ----------
  update(dt) {
    if (this.finished) return;
    this.t += dt;
    const W = this.well;
    if (W.refill > 0) {
      W.refill -= dt;
      if (W.refill <= 0) {
        W.refill = 0;
        W.water = this.wellCap();
        this.ev('wellDone');
      }
    }
    // трава подрастает (для красоты)
    for (const g of this.grass.values()) if (g.grow < 1) g.grow = Math.min(1, g.grow + dt * 1.6);
    this.updItems(dt);
    for (const a of this.animals) if (!a.dead) this.updAnimal(a, dt);
    this.animals = this.animals.filter((a) => !a.dead || (a.deadT = (a.deadT || 0) + dt) < 2);
    this.updSlots(dt);
    this.updTruck(dt);
    this.updBears(dt);
    this.checkGoals();
  }

  updItems(dt) {
    for (const it of this.items) {
      if (it.gone) continue;
      if (it.fall > 0) it.fall = Math.max(0, it.fall - dt);
      if (it.carried) continue;
      it.life -= dt;
      if (it.life <= 0) {
        it.gone = 'spoil';
        this.ev('spoil', { id: it.id, item: it.item, x: it.x, z: it.z });
      }
    }
    this.items = this.items.filter((it) => !it.gone);
  }

  dropItem(item, x, z, from) {
    const it = { id: this.nextId++, item, x, z, life: ITEM_LIFE, fall: 0.5, from };
    this.items.push(it);
    this.ev('drop', { id: it.id, item, x, z, from });
    return it;
  }

  nearestGrass(a) {
    let best = null,
      bd = 1e9;
    for (const g of this.grass.values()) {
      if (g.amt <= 0 || g.grow < 0.5) continue;
      // другие животные уже едят эту клетку — чуть дальше по «стоимости»
      let d = Math.hypot(g.x - a.x, g.z - a.z);
      if (g.claim && g.claim !== a.id) d += 1.2;
      if (d < bd) {
        bd = d;
        best = g;
      }
    }
    return best;
  }

  walk(a, tx, tz, speed, dt) {
    const dx = tx - a.x,
      dz = tz - a.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) {
      a.moving = false;
      return true;
    }
    const s = Math.min(d, speed * dt);
    a.x += (dx / d) * s;
    a.z += (dz / d) * s;
    // плавный поворот
    const want = Math.atan2(dx, dz);
    let da = want - a.dir;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    a.dir += da * Math.min(1, dt * 8);
    a.moving = true;
    return d - s < 0.05;
  }

  // бесцельная прогулка по полю (свой флажок ws, чтобы не мешать основному состоянию)
  wander(a, dt, speed) {
    a.st -= dt;
    if (a.ws !== 'walk' && a.st <= 0) {
      const p = this.rnd() < 0.7 ? { x: a.x + (this.rnd() - 0.5) * 4, z: a.z + (this.rnd() - 0.5) * 3 } : this.randField(0.7);
      const F = this.lay.field;
      a.tx = Math.max(F.x0 + 0.5, Math.min(F.x1 - 0.5, p.x));
      a.tz = Math.max(F.z0 + 0.5, Math.min(F.z1 - 0.5, p.z));
      a.ws = 'walk';
    }
    if (a.ws === 'walk') {
      if (this.walk(a, a.tx, a.tz, speed * 0.55, dt)) {
        a.ws = 'idle';
        a.st = 1 + this.rnd() * 2.5;
      }
    } else a.moving = false;
  }

  updAnimal(a, dt) {
    const D = ANIMALS[a.kind];
    if (a.state === 'drop') {
      a.st -= dt;
      a.moving = false;
      if (a.st <= 0) {
        a.state = 'idle';
        a.st = 0.5;
        this.ev('land', { kind: a.kind, x: a.x, z: a.z });
      }
      return;
    }
    if (a.scared > 0) {
      a.scared -= dt;
      if (a.kx || a.kz) {
        const F = this.lay.field;
        a.x = Math.max(F.x0 + 0.3, Math.min(F.x1 - 0.3, a.x + a.kx * dt));
        a.z = Math.max(F.z0 + 0.3, Math.min(F.z1 - 0.3, a.z + a.kz * dt));
        a.kx *= 1 - Math.min(1, dt * 2.5);
        a.kz *= 1 - Math.min(1, dt * 2.5);
        a.moving = true;
        if (a.scared <= 0) a.kx = a.kz = 0;
      }
    }
    if (D.helper) return a.kind === 'cat' ? this.updCat(a, dt) : this.updDog(a, dt);
    // голод
    a.food = Math.max(0, a.food - dt / D.food);
    if (a.food > 0) {
      a.starve = 0;
      a.prod += dt / D.prod;
      if (a.prod >= 1) {
        a.prod = 0;
        const off = 0.25;
        this.dropItem(D.product, a.x - Math.sin(a.dir) * off, a.z - Math.cos(a.dir) * off, 'animal');
        this.ev('lay', { id: a.id, kind: a.kind });
      }
    } else {
      a.starve += dt;
      if (a.starve === dt) this.ev('hungry', { id: a.id, kind: a.kind });
      if (a.starve >= D.starve) {
        a.dead = true;
        a.gone = 'starved';
        this.ev('starved', { id: a.id, kind: a.kind, x: a.x, z: a.z });
        return;
      }
    }
    // поиск травы
    if (a.state === 'eat') {
      a.eatT -= dt;
      a.moving = false;
      if (a.eatT <= 0) {
        const g = this.grass.get(a.target);
        if (g && g.amt > 0) {
          g.amt--;
          a.food = Math.min(1, a.food + BITE);
          this.ev('bite', { id: a.id, key: g.key, kind: a.kind });
          if (g.amt <= 0) this.grass.delete(g.key);
        }
        if (g) g.claim = null;
        a.state = 'idle';
        a.st = 0;
        a.target = null;
      }
      return;
    }
    if (a.food < HUNGRY || (a.state === 'seek' && a.food < 0.97)) {
      const g = this.nearestGrass(a);
      if (g) {
        if (a.target && a.target !== g.key) {
          const old = this.grass.get(a.target);
          if (old && old.claim === a.id) old.claim = null;
        }
        a.target = g.key;
        g.claim = a.id;
        a.state = 'seek';
        const speed = D.speed * (a.food <= 0 ? 1.15 : 1);
        if (this.walk(a, g.x, g.z, speed, dt)) {
          a.state = 'eat';
          a.eatT = EAT_TIME;
        }
        return;
      }
      if (a.state === 'seek') {
        a.state = 'idle';
        a.st = 0.3;
      }
    }
    this.wander(a, dt, D.speed);
  }

  updCat(a, dt) {
    const D = ANIMALS.cat;
    const door = this.lay.store.door;
    if (a.carry) {
      if (this.walk(a, door.x, door.z, D.speed, dt)) {
        const it = a.carry;
        a.carry = null;
        if (this.storeFree() >= ITEMS[it.item].size) {
          it.carried = false;
          this.toStore(it);
        } else {
          it.carried = false;
          it.x = door.x + 0.5;
          it.z = door.z;
          it.life = ITEM_LIFE;
        }
      }
      return;
    }
    // ищем ближайший товар, за которым ещё никто не идёт
    let best = null,
      bd = 1e9;
    if (this.storeFree() > 0)
      for (const it of this.items) {
        if (it.gone || it.carried || it.fall > 0 || (it.claim && it.claim !== a.id)) continue;
        if (ITEMS[it.item].size > this.storeFree()) continue;
        const d = Math.hypot(it.x - a.x, it.z - a.z) - it.life * 0.05;
        if (d < bd) {
          bd = d;
          best = it;
        }
      }
    if (best) {
      for (const it of this.items) if (it.claim === a.id && it !== best) it.claim = null;
      best.claim = a.id;
      a.state = 'fetch';
      if (this.walk(a, best.x, best.z, D.speed, dt)) {
        best.carried = true;
        a.carry = best;
        this.ev('catPick', { id: best.id });
      }
      return;
    }
    if (a.state === 'fetch') a.state = 'idle';
    this.wander(a, dt, D.speed * 0.6);
  }

  updDog(a, dt) {
    const D = ANIMALS.dog;
    let best = null,
      bd = 1e9;
    for (const b of this.bears) {
      if (b.gone || b.state !== 'free') continue;
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    if (best) {
      a.state = 'chase';
      if (this.walk(a, best.x, best.z, D.speed, dt) || bd < 0.7) {
        this.cage(best);
        this.ev('dogCatch', { id: best.id });
        a.state = 'idle';
        a.st = 1;
      }
      return;
    }
    if (a.state === 'chase') a.state = 'idle';
    this.wander(a, dt, D.speed * 0.45);
  }

  updSlots(dt) {
    for (const s of this.slots) {
      if (!s.built || s.queue <= 0) continue;
      s.prog += dt / this.buildTime(s.kind);
      if (s.prog >= 1) {
        s.prog = 0;
        s.queue--;
        const o = s.out;
        const k = this.items.filter((x) => x.from === 'slot' + s.i).length;
        const ang = k * 1.3;
        this.dropItem(BUILDINGS[s.kind].out, o.x + Math.cos(ang) * 0.35 * Math.min(k, 1), o.z + Math.sin(ang) * 0.3 * Math.min(k, 1), 'slot' + s.i);
        this.ev('made', { i: s.i, item: BUILDINGS[s.kind].out });
      }
    }
  }

  updTruck(dt) {
    const T = this.truck;
    if (T.state !== 'away') return;
    T.t += dt;
    const total = this.truckTime();
    if (!T.sold && T.t >= total / 2) {
      T.sold = true;
      this.coins += T.value;
      this.ev('sold', { value: T.value, cargo: { ...T.cargo } });
      T.cargo = {};
    }
    if (T.t >= total) {
      T.state = 'home';
      T.t = 0;
      this.ev('truckBack');
    }
  }

  updBears(dt) {
    const B = this.L.bears;
    if (B && this.t >= this.bearAt) {
      const lim = this.L.n >= 30 ? 2 : 1;
      const live = this.bears.filter((b) => !b.gone && b.state !== 'caged').length;
      if (live < lim) this.spawnBear();
      this.bearAt = this.t + B.gap[0] + this.rnd() * (B.gap[1] - B.gap[0]);
    }
    for (const b of this.bears) {
      if (b.gone) continue;
      if (b.state === 'fall') {
        b.st -= dt;
        if (b.st <= 0) {
          b.state = 'free';
          b.st = 0;
          b.free = BEAR_FREE_TIME;
          this.ev('bearLand', { id: b.id, x: b.x, z: b.z });
        }
        continue;
      }
      if (b.state === 'caged') {
        b.cageT -= dt;
        if (b.cageT <= 0) {
          b.state = 'free';
          b.clicks = 0;
          b.free = BEAR_FREE_TIME * 0.6;
          this.ev('bearOut', { id: b.id });
        }
        continue;
      }
      if (b.state === 'leave') {
        if (this.walk(b, b.tx, b.tz, 2.2, dt)) {
          b.gone = 'left';
          this.ev('bearLeft', { id: b.id });
        }
        continue;
      }
      // гуляет по полю
      b.free -= dt;
      if (b.free <= 0) {
        b.state = 'leave';
        const F = this.lay.field;
        b.tx = b.x < 0 ? F.x0 - 6 : F.x1 + 6;
        b.tz = b.z;
        continue;
      }
      this.wander(b, dt, 1.5);
      // ломает товары и разгоняет животных
      for (const it of this.items) {
        if (it.gone || it.carried) continue;
        if (Math.hypot(it.x - b.x, it.z - b.z) < 0.45) {
          it.gone = 'crush';
          this.ev('crush', { id: it.id, item: it.item, x: it.x, z: it.z });
        }
      }
      for (const a of this.animals) {
        if (a.dead || a.state === 'drop' || ANIMALS[a.kind].helper) continue;
        if (!(a.scared > 0) && Math.hypot(a.x - b.x, a.z - b.z) < 0.55 + ANIMALS[a.kind].r * 0.5) {
          // медведь пугает: животное отскакивает, теряет сытость и начатый продукт
          a.scared = 2.5;
          a.food = Math.max(0, a.food - 0.45);
          a.prod = 0;
          const d = Math.hypot(a.x - b.x, a.z - b.z) || 1;
          a.kx = ((a.x - b.x) / d) * 2.2;
          a.kz = ((a.z - b.z) / d) * 2.2;
          this.ev('bearHit', { id: a.id, kind: a.kind, x: a.x, z: a.z, bear: b.id });
        }
      }
    }
    this.bears = this.bears.filter((b) => !b.gone || (b.goneT = (b.goneT || 0) + dt) < 1.5);
  }

  spawnBear() {
    const p = this.randField(1);
    const b = { id: this.nextId++, x: p.x, z: p.z, tx: p.x, tz: p.z, dir: 0, state: 'fall', st: 1.3, clicks: 0, need: this.L.bears.clicks, cageT: 0, free: 0 };
    this.bears.push(b);
    this.ev('bearDrop', { id: b.id, x: b.x, z: b.z });
  }

  // ---------- цели ----------
  goalProgress(k) {
    if (k === 'coins') return this.coins;
    if (this.L.isAnimalGoal(k)) return this.count(k);
    return this.made[k] || 0;
  }
  checkGoals() {
    for (const [k, n] of Object.entries(this.L.goals)) if (this.goalProgress(k) < n) return;
    this.finished = true;
    this.finishT = this.t;
    this.ev('win', { t: this.t });
  }
}
