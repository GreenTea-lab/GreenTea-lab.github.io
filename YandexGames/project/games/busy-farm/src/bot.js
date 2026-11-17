// Бот-фермер: играет уровень с ограниченной скоростью «кликов» как внимательный человек.
// Нужен для подбора стартовых денег и проверки, что время на золото достижимо.
import { ITEMS, ANIMALS, BUILDINGS, MAX_QUEUE, WELL_PRICE } from './data.js';

const PRODUCER = { egg: 'goose', wool: 'sheep', milk: 'cow' };
const CHAIN = { egg: 'powder', powder: 'bakery', wool: 'spinner', thread: 'loom', milk: 'churn', butter: 'creamery' }; // вход → мастерская
const OUT_OF = {}; // выход → мастерская
for (const [k, B] of Object.entries(BUILDINGS)) OUT_OF[B.out] = k;
const RAW_OF = (item) => {
  while (OUT_OF[item]) item = BUILDINGS[OUT_OF[item]].in;
  return item;
};

export class Bot {
  constructor(farm, opts = {}) {
    this.f = farm;
    this.aps = opts.aps || 1.6; // действий в секунду
    this.cd = 0.5;
    this.bearCd = 0;
    this.log = [];
  }

  tick(dt) {
    const f = this.f;
    if (f.finished) return;
    this.bearCd -= dt;
    // медведей кликаем быстро, как люди
    if (this.bearCd <= 0) {
      const b = f.bears.find((x) => !x.gone && (x.state === 'free' || x.state === 'fall'));
      const dog = f.count('dog') > 0;
      if (b && (!dog || b.state === 'fall')) {
        f.hitBear(b.id);
        this.bearCd = 0.22;
        this.cd = Math.max(this.cd, 0.2);
        return;
      }
    }
    this.cd -= dt;
    if (this.cd > 0) return;
    const a = this.act();
    this.cd = a ? 1 / this.aps : 0.25;
  }

  // сколько ещё нужно собрать товара k по целям (с учётом того, что уже в работе)
  demand() {
    const f = this.f;
    const G = f.L.goals;
    const dem = {};
    const order = ['cheese', 'butter', 'milk', 'cloth', 'thread', 'wool', 'cake', 'powder', 'egg'];
    for (const k of order) {
      const own = Math.max(0, (G[k] || 0) - (f.made[k] || 0));
      // продукт k нужен ещё и как сырьё для следующего звена
      const b = CHAIN[k];
      let down = 0;
      if (b && dem[BUILDINGS[b].out] > 0) {
        const s = f.slots.find((x) => x.kind === b);
        const inWork = s ? s.queue : 0;
        const onGround = f.items.filter((x) => x.item === BUILDINGS[b].out).length;
        down = Math.max(0, dem[BUILDINGS[b].out] - inWork - onGround);
      }
      dem[k] = Math.max(own, down);
      dem['_down_' + k] = down;
    }
    return dem;
  }

  // какие сырьевые линии нужны по целям
  neededRaw() {
    const f = this.f;
    const set = new Set();
    for (const k of Object.keys(f.L.goals)) {
      if (k === 'coins' || f.L.isAnimalGoal(k)) continue;
      if ((f.made[k] || 0) >= f.L.goals[k]) continue;
      set.add(RAW_OF(k));
    }
    return set;
  }

  act() {
    const f = this.f;
    const dem = this.demand();
    // 1. пойманный медведь — на склад (это 100 монет)
    const caged = f.bears.find((b) => !b.gone && b.state === 'caged');
    if (caged && f.storeFree() >= ITEMS.bear.size + 3) return f.hitBear(caged.id), true;
    // 2. раз в пару секунд — заняться машиной (иначе сбор товара съедает всё внимание)
    this.sellT = (this.sellT || 0) - 1;
    if (this.sellT <= 0 && f.truck.state === 'home') {
      this.sellT = 3;
      if (this.sell(dem)) {
        this.sellT = 1;
        return true;
      }
    }
    // покупки (редкие, но важные — раньше рутины)
    if (this.buy(dem)) return true;
    // загрузить мастерские
    for (const s of f.slots) {
      if (!s.built || s.queue >= MAX_QUEUE) continue;
      const B = BUILDINGS[s.kind];
      if (!f.stock[B.in]) continue;
      const free = this.neededRaw().size === 0 || f.L.goals.coins;
      const keepIn = dem[B.out] > 0 || (free && ITEMS[B.out].price > ITEMS[B.in].price);
      const ownNeed = Math.max(0, (f.L.goals[B.in] || 0) - (f.made[B.in] || 0));
      if (keepIn && !(ownNeed > 0 && dem[B.out] <= 0)) return f.useSlot(s.i), true;
    }
    // 3. колодец
    if (f.well.water === 0 && f.well.refill <= 0 && f.coins >= WELL_PRICE) return f.refillWell(), true;
    // 4. трава для голодных
    const hungry = f.animals.filter((a) => !a.dead && !ANIMALS[a.kind].helper && a.state !== 'drop' && a.food < 0.75);
    if (f.well.water > 0 && f.well.refill <= 0) {
      let bites = 0;
      for (const g of f.grass.values()) bites += g.amt;
      const eaters = f.animals.filter((a) => !a.dead && !ANIMALS[a.kind].helper).length;
      for (const a of hungry.sort((x, y) => x.food - y.food)) {
        let near = false;
        for (const g of f.grass.values())
          if (g.amt > 0 && Math.hypot(g.x - a.x, g.z - a.z) < 1.8) {
            near = true;
            break;
          }
        if (!near || bites < eaters * 2) {
          if (f.plant(a.x, a.z) === 'ok') return true;
        }
      }
    }
    // 3. собрать товар — сначала дорогие и те, что скоро пропадут
    if (f.count('cat') === 0 || f.items.length > 3) {
      const free = f.storeFree();
      const score = (it) => (dem[it.item] > 0 ? 1e5 : 0) + ITEMS[it.item].price * (it.life < 6 ? 3 : 1);
      const list = f.items.filter((it) => !it.gone && !it.carried && it.fall <= 0 && ITEMS[it.item].size <= free).sort((a, b) => score(b) - score(a));
      if (list.length) return f.collect(list[0].id), true;
    }
    if (this.sell(dem)) return true;
    return false;
  }

  // что купить
  buy(dem) {
    const f = this.f;
    const G = f.L.goals;
    const need = this.neededRaw();
    const coinGoal = G.coins || 0;
    const reserve = WELL_PRICE * 3;
    // мастерские на пути к целям
    for (const s of f.slots) {
      if (s.built || !s.kind) continue;
      const B = BUILDINGS[s.kind];
      const useful = dem[B.out] > 0 || (dem['_down_' + B.out] || 0) > 0;
      if (useful) {
        if (f.coins >= B.cost + reserve) return f.buildSlot(s.i) === 'ok';
        // копим на мастерскую, но сначала — нужные цели-животные и минимум кормильцев
        if (this.animalsOk(need)) return false;
      }
    }
    // животные по целям — в конце, когда товары уже собраны (лишние рты раньше времени только мешают)
    const prodLeft = need.size > 0 || (coinGoal && f.coins < coinGoal);
    for (const k of ['goose', 'sheep', 'cow']) {
      if (G[k] && f.count(k) < G[k] && f.L.animals.includes(k) && !prodLeft) {
        if (f.coins >= ANIMALS[k].cost + reserve) return f.buyAnimal(k);
        return false;
      }
    }
    // кормильцы для нужных линий
    const work = (raw) => (need.has(raw) ? 1000 : 0) + (this.wantCount(raw, need, coinGoal) - f.count(PRODUCER[raw])) * 10 + ITEMS[raw].price / 1000;
    for (const raw of ['egg', 'wool', 'milk'].sort((a, b) => work(b) - work(a))) {
      const k = PRODUCER[raw];
      if (!f.L.animals.includes(k)) continue;
      const want = this.wantCount(raw, need, coinGoal);
      // ради денег вкладываемся, только если до цели ещё далеко
      if (!need.has(raw) && coinGoal && coinGoal - f.coins < ANIMALS[k].cost * 5) continue;
      if (f.count(k) < want && f.coins >= ANIMALS[k].cost + reserve) return f.buyAnimal(k);
    }
    // выгодные мастерские для заработка, если цель — деньги
    if (coinGoal) {
      for (const s of f.slots) {
        if (s.built || !s.kind) continue;
        const B = BUILDINGS[s.kind];
        const hasIn = f.count(PRODUCER[RAW_OF(B.in)]) > 0;
        if (hasIn && f.coins >= B.cost * 1.5 && coinGoal - f.coins > B.cost * 3) return f.buildSlot(s.i) === 'ok';
      }
    }
    // собака при медведях
    if (f.L.bears && f.L.animals.includes('dog') && f.count('dog') === 0 && f.coins > ANIMALS.dog.cost * 2.5 && f.t > 20) return f.buyAnimal('dog');
    // кошка, когда товаров много
    const prods = f.animals.filter((a) => !a.dead && !ANIMALS[a.kind].helper).length;
    if (f.L.animals.includes('cat') && f.count('cat') === 0 && (prods >= 5 || f.items.length > 6) && f.coins > ANIMALS.cat.cost + 300) return f.buyAnimal('cat');
    return false;
  }

  animalsOk(need) {
    const f = this.f;
    for (const raw of need) {
      const k = PRODUCER[raw];
      if (f.count(k) < Math.min(2, this.wantCount(raw, need, 0))) return false;
    }
    return true;
  }

  wantCount(raw, need, coinGoal) {
    const f = this.f;
    const G = f.L.goals;
    if (need.has(raw)) {
      const direct = Math.max(0, (G[raw] || 0) - (f.made[raw] || 0));
      // сырьё только для мастерской: столько, сколько она успевает переработать
      const base = raw === 'egg' ? 3 : 2;
      const extra = direct > 0 ? (raw === 'egg' ? 4 : 2) : 0;
      // при больших деньгах — ещё кормильцы, чтобы цепочка не простаивала
      const rich = f.coins > ANIMALS[PRODUCER[raw]].cost * 6 ? 1 : 0;
      return base + extra + rich;
    }
    if (coinGoal || need.size === 0) {
      // для денег — самые выгодные доступные
      if (raw === 'milk') return 3;
      if (raw === 'wool') return f.L.animals.includes('cow') ? 2 : 4;
      return f.L.animals.includes('sheep') ? 3 : 6;
    }
    return 0;
  }

  // продать лишнее
  sell(dem) {
    const f = this.f;
    if (f.truck.state !== 'home') return false;
    const G = f.L.goals;
    // что можно продать: всё сверх нужного
    const spare = {};
    let spareVal = 0;
    for (const [k, c] of Object.entries(f.stock)) {
      if (!c) continue;
      let keep = k === 'bear' ? 0 : dem[k] || 0;
      // сырьё, которое мастерская превратит в более дорогой товар, держим, если мастерская есть
      const b = CHAIN[k];
      if (b) {
        const s = f.slots.find((x) => x.kind === b && x.built);
        if (s) keep = Math.max(keep, Math.min(c, 4));
      }
      // амбар забит — цели считаются по собранному, так что лишнее везём продавать
      if (f.storeUsed() >= f.storeCap() - 1) keep = Math.min(keep, b && f.slots.some((x) => x.kind === b && x.built) ? 2 : 0);
      const sp = Math.max(0, c - keep);
      if (sp > 0) {
        spare[k] = sp;
        spareVal += sp * ITEMS[k].price;
      }
    }
    const cap = f.truckCap();
    const used = f.truckUsed();
    const fullish = f.storeUsed() > f.storeCap() * 0.7;
    const target = this.nextCost();
    const short = target > f.coins;
    const coinGoalLeft = G.coins ? G.coins - f.coins : 0;
    let canLoad = false;
    if (used < cap && Object.keys(spare).length && (fullish || short || coinGoalLeft > 0)) {
      // грузим самое дорогое из того, что влезает
      for (const k of Object.keys(spare).sort((a, b) => ITEMS[b].price - ITEMS[a].price)) {
        if (used + ITEMS[k].size > cap) continue;
        canLoad = true;
        if (f.load(k, spare[k]) > 0) return true;
      }
    }
    const cargo = f.cargoValue();
    if (used > 0 && (used >= cap * 0.75 || (short && f.coins + cargo >= target) || fullish || (coinGoalLeft > 0 && f.coins + cargo >= G.coins) || (!canLoad && (fullish || short || coinGoalLeft > 0)) || (spareVal === 0 && f.t > 5))) return f.sendTruck();
    return false;
  }

  nextCost() {
    const f = this.f;
    let c = 1e12;
    for (const s of f.slots) if (!s.built && s.kind) c = Math.min(c, BUILDINGS[s.kind].cost);
    for (const k of ['goose', 'sheep', 'cow']) if (f.L.animals.includes(k)) c = Math.min(c, ANIMALS[k].cost);
    return c === 1e12 ? 0 : c;
  }
}

// прогон уровня целиком, возвращает время или Infinity
export function runLevel(Farm, L, lay, up, opts = {}) {
  const f = new Farm(L, lay, up, opts.seed || 7);
  const bot = new Bot(f, opts);
  const dt = 0.1;
  const limit = opts.limit || L.gold * 3 + 120;
  while (!f.finished && f.t < limit) {
    bot.tick(dt);
    f.update(dt);
    f.events.length = 0;
  }
  return { t: f.finished ? f.finishT : Infinity, f };
}
