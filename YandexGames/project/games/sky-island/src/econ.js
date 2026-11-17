// Экономика «Небесного островка» — чистый модуль без DOM/Three (используется игрой и симуляцией)

export const GRID = 25; // клеток по стороне
export const PLOT = 5; // клеток в участке
export const PLOTS = GRID / PLOT; // 5x5 участков
export const MAX_LVL = 10;

// ---------- Биомы ----------
// unlock — уровень острова
export const BIOMES = {
  meadow: { unlock: 1, top: 0x8fd16a, side: 0x6fb257, dirt: 0xb58a5e },
  forest: { unlock: 3, top: 0x5fb85a, side: 0x4a9a48, dirt: 0x9c7552 },
  winter: { unlock: 6, top: 0xeef6fb, side: 0xcfe3ef, dirt: 0x9fb3c4 },
  desert: { unlock: 10, top: 0xf1d38e, side: 0xe0bd72, dirt: 0xc99a5a },
  volcano: { unlock: 15, top: 0x6f5a55, side: 0x56443f, dirt: 0x3d302c },
  cloud: { unlock: 20, top: 0xf6f2ff, side: 0xe3dcf7, dirt: 0xc9c0e8 },
};
export const BIOME_ORDER = ['meadow', 'forest', 'winter', 'desert', 'volcano', 'cloud'];

// Биом участка по его координатам (0..4)
export function plotBiome(px, pz) {
  const dx = px - 2;
  const dz = pz - 2;
  const r = Math.max(Math.abs(dx), Math.abs(dz));
  if (r === 0) return 'meadow';
  if (r === 1) return dx === 0 || dz === 0 ? 'meadow' : 'forest';
  if (dz === -2 && dx < 2) return 'winter';
  if (dx === 2 && dz < 2) return 'desert';
  if (dz === 2 && dx > -2) return 'volcano';
  return 'cloud';
}

// ---------- Здания ----------
// kind: house | prod | trade | special
// out: ресурсы в секунду на 1 уровне; pop: жители на 1 уровне; work: нужно рабочих на 1 уровне
// cost: стоимость постройки (уровень 1); unique — не больше одного
export const BUILDINGS = {
  hut: { kind: 'house', unlock: 1, cost: { coins: 40, wood: 8 }, pop: 4, cozy: 0 },
  farm: { kind: 'prod', unlock: 1, cost: { coins: 60 }, out: { coins: 1.2 }, work: 2, rain: true },
  sawmill: { kind: 'prod', unlock: 1, cost: { coins: 80 }, out: { wood: 0.45 }, work: 2 },
  market: { kind: 'trade', unlock: 2, cost: { coins: 250, wood: 40 }, trade: 2.5, work: 2, unique: true },
  quarry: { kind: 'prod', unlock: 3, cost: { coins: 400, wood: 60 }, out: { stone: 0.5 }, work: 3 },
  cottage: { kind: 'house', unlock: 3, cost: { coins: 600, wood: 80, stone: 30 }, pop: 10, cozy: 1 },
  treehouse: { kind: 'house', unlock: 4, cost: { coins: 1500, wood: 200 }, pop: 14, cozy: 6, biome: 'forest' },
  mill: { kind: 'prod', unlock: 4, cost: { coins: 2500, wood: 150, stone: 80 }, out: { coins: 9 }, work: 4, rain: true },
  townhall: { kind: 'special', unlock: 5, cost: { coins: 6000, wood: 300, stone: 300 }, bonus: 'income', unique: true },
  mine: { kind: 'prod', unlock: 6, cost: { coins: 15000, wood: 500, stone: 400 }, out: { stone: 2.5, crystals: 0.0015 }, work: 6 },
  iceworks: { kind: 'prod', unlock: 7, cost: { coins: 40000, stone: 1500 }, out: { coins: 60, crystals: 0.002 }, work: 8, biome: 'winter' },
  tower: { kind: 'house', unlock: 8, cost: { coins: 90000, wood: 2000, stone: 2500 }, pop: 45, cozy: 2 },
  lighthouse: { kind: 'special', unlock: 9, cost: { coins: 150000, stone: 5000 }, bonus: 'offline', unique: true, cozy: 4 },
  port: { kind: 'trade', unlock: 10, cost: { coins: 400000, wood: 8000, stone: 6000 }, trade: 8, work: 12, unique: true, biome: 'desert' },
  observatory: { kind: 'special', unlock: 12, cost: { coins: 1.5e6, stone: 20000 }, bonus: 'cozy', unique: true },
  forge: { kind: 'trade', unlock: 15, cost: { coins: 8e6, stone: 60000 }, trade: 40, work: 25, biome: 'volcano' },
  skytemple: { kind: 'special', unlock: 20, cost: { coins: 6e7, stone: 200000 }, bonus: 'all', unique: true, cozy: 20, biome: 'cloud' },
};
export const BUILD_ORDER = Object.keys(BUILDINGS);
export const KINDS = ['house', 'prod', 'trade', 'special'];

// цены продажи при торговле и покупки недостающего на рынке
export const PRICE = { wood: 3, stone: 5 };
export const EXCHANGE = { wood: 8, stone: 14 };

export const COST_GROWTH = 2.45; // цена уровня
export const COUNT_GROWTH = 1.85; // каждое следующее здание того же типа
export const prodMult = (lvl) => lvl * Math.pow(1.32, lvl - 1);
export const popMult = (lvl) => lvl * Math.pow(1.3, lvl - 1);
export const workNeed = (b, lvl) => Math.ceil(b.work * (1 + (lvl - 1) * 0.55));
export const buildTime = (lvl, s) => Math.max(2, Math.round(4 * Math.pow(1.9, lvl - 1) * (s ? Math.max(0.4, 1 - 0.02 * s.feathers) : 1))); // секунды

// стоимость перехода на уровень lvl (lvl=1 — постройка). n — сколько таких зданий уже есть (для постройки)
export function costOf(type, lvl, n = 0) {
  const b = BUILDINGS[type];
  const k = Math.pow(COST_GROWTH, lvl - 1) * (lvl === 1 ? Math.pow(COUNT_GROWTH, n) : 1) * (lvl > 1 ? 0.9 : 1);
  const c = {};
  for (const r in b.cost) c[r] = Math.round(b.cost[r] * k);
  return c;
}

// ---------- Декор ----------
export const DECOR = {
  tree: { unlock: 1, cost: 15, cozy: 2 },
  flowers: { unlock: 1, cost: 25, cozy: 3 },
  fence: { unlock: 1, cost: 8, cozy: 1 },
  bench: { unlock: 2, cost: 60, cozy: 4 },
  lantern: { unlock: 2, cost: 90, cozy: 5, light: true },
  well: { unlock: 3, cost: 300, cozy: 8 },
  pine: { unlock: 3, cost: 150, cozy: 4, biome: 'forest' },
  mushroom: { unlock: 4, cost: 400, cozy: 7, biome: 'forest' },
  fountain: { unlock: 5, cost: 2500, cozy: 20 },
  snowman: { unlock: 6, cost: 3000, cozy: 14, biome: 'winter' },
  bridge: { unlock: 7, cost: 6000, cozy: 18 },
  statue: { unlock: 9, cost: 30000, cozy: 40 },
  cactus: { unlock: 10, cost: 50000, cozy: 30, biome: 'desert' },
  palm: { unlock: 11, cost: 90000, cozy: 40, biome: 'desert' },
  lavalamp: { unlock: 15, cost: 2e6, cozy: 120, light: true, biome: 'volcano' },
  rainbow: { unlock: 20, cost: 4e7, cozy: 400, biome: 'cloud' },
  crystaltree: { unlock: 4, crystals: 25, cozy: 30, light: true },
};
export const DECOR_ORDER = Object.keys(DECOR);
export const DECOR_GROWTH = 1.12;
export function decorCost(type, n) {
  const d = DECOR[type];
  if (d.crystals) return { crystals: d.crystals + n * 5 };
  return { coins: Math.round(d.cost * Math.pow(DECOR_GROWTH, n)) };
}

// ---------- Участки ----------
export function plotCost(owned) {
  // owned — сколько участков уже есть (>=1)
  return { coins: Math.round(150 * Math.pow(3.2, owned - 1)) };
}

// ---------- Уровень острова ----------
export function islandXP(s) {
  let xp = 0;
  for (const b of s.buildings) xp += b.lvl * 10;
  xp += (s.plots.length - 1) * 25;
  xp += Math.min(s.decor.length, 200) * 0.5;
  return xp;
}
export const xpFor = (L) => Math.round(30 * Math.pow(L - 1, 2.0));
export function islandLevel(s) {
  const xp = islandXP(s);
  let L = 1;
  while (L < 30 && xp >= xpFor(L + 1)) L++;
  return L;
}

// ---------- Состояние ----------
export function newState() {
  return {
    v: 2,
    ts: Date.now(),
    coins: 140,
    wood: 10,
    stone: 0,
    crystals: 10,
    feathers: 0,
    migrations: 0,
    earned: 0, // монет заработано на этом острове
    spent: 0, // монет вложено в этот остров (ценность)
    best: 0, // лучшая ценность острова
    plots: ['2,2'],
    // остров начинается пустым — первые здания строятся в обучении
    buildings: [],
    decor: [],
    nextId: 1,
    builders: 2,
    level: 1,
    stats: {},
    daily: null,
    streak: { day: 0, last: '' },
    rainUntil: 0,
    settings: { music: true, sfx: true, quality: 'auto' },
    tut: {},
  };
}

export const countType = (s, type) => s.buildings.filter((b) => b.type === type).length;
export const decorCount = (s, type) => s.decor.filter((d) => d.type === type).length;
export const feathersMult = (s) => 1 + 0.12 * s.feathers;
export const builderCost = (n) => (n <= 2 ? 60 : n === 3 ? 150 : 400); // кристаллы за следующего строителя (n — текущее число)

// Уют
export function cozyOf(s) {
  let cozy = 0;
  const kinds = new Set();
  for (const d of s.decor) {
    cozy += DECOR[d.type].cozy;
    kinds.add(d.type);
  }
  cozy += kinds.size * 3; // бонус за разнообразие
  for (const b of s.buildings) cozy += (BUILDINGS[b.type].cozy || 0) * effLvl(b);
  return cozy;
}

export function bonusLvl(s, bonus) {
  let l = 0;
  for (const b of s.buildings) if (BUILDINGS[b.type].bonus === bonus) l = Math.max(l, effLvl(b));
  return l;
}

// здание в стройке работает на предыдущем уровне
export const effLvl = (b) => (b.build ? b.lvl - 1 : b.lvl);

export function cozyMult(s) {
  const cozy = cozyOf(s);
  const obs = bonusLvl(s, 'cozy');
  return 1 + 0.3 * Math.log(1 + cozy / 25) * (1 + 0.08 * obs);
}

export function globalMult(s) {
  return cozyMult(s) * (1 + 0.08 * bonusLvl(s, 'income')) * (1 + 0.15 * bonusLvl(s, 'all')) * feathersMult(s);
}

export const offlineHours = (s) => 2 + bonusLvl(s, 'offline');

// Расчёт скоростей. env: { rain }
export function rates(s, env = {}) {
  let pop = 0;
  let need = 0;
  for (const b of s.buildings) {
    const d = BUILDINGS[b.type];
    const L = effLvl(b);
    if (L <= 0) continue;
    if (d.pop) pop += Math.round(d.pop * popMult(L));
    if (d.work) need += workNeed(d, L);
  }
  const workK = need > 0 ? Math.min(1, pop / need) : 1;
  const g = globalMult(s);
  const r = { coins: 0, wood: 0, stone: 0, crystals: 0 };
  let trade = 0;
  for (const b of s.buildings) {
    const d = BUILDINGS[b.type];
    const L = effLvl(b);
    if (L <= 0) continue;
    if (d.out) {
      const rain = env.rain && d.rain ? 1.5 : 1;
      for (const k in d.out) {
        const base = d.out[k] * prodMult(L) * workK * rain;
        r[k] += k === 'crystals' ? base : base * g;
      }
    }
    if (d.trade) trade += d.trade * prodMult(L) * workK;
  }
  // налог с жителей
  r.coins += pop * 0.12 * g;
  return { ...r, pop, need, workK, trade: trade * g, mult: g };
}

// Шаг симуляции экономики
export function tick(s, dt, env = {}) {
  const r = rates(s, env);
  s.coins += r.coins * dt;
  s.wood += r.wood * dt;
  s.stone += r.stone * dt;
  s.crystals += r.crystals * dt;
  let earned = r.coins * dt;
  // торговля: продаём только излишки — запас, нужный для следующих покупок, не трогаем
  if (r.trade > 0) {
    let cap = (r.trade / r.mult) * dt; // единиц товара за шаг
    if (!s._res || s._resT === undefined || s._resT <= 0) {
      s._res = reserves(s);
      s._resT = 5;
    }
    s._resT -= dt;
    const keepW = s._res.wood + 30;
    const keepS = s._res.stone + 30;
    const sellW = Math.max(0, Math.min(cap * 0.5, s.wood - keepW));
    cap -= sellW;
    const sellS = Math.max(0, Math.min(cap, s.stone - keepS));
    s.wood -= sellW;
    s.stone -= sellS;
    const c = (sellW * PRICE.wood + sellS * PRICE.stone) * r.mult;
    s.coins += c;
    earned += c;
  }
  s.earned += earned;
  return r;
}

// запас материалов: максимум, нужный на любое ближайшее улучшение или постройку
export function reserves(s) {
  const L = s.level || 1;
  const res = { wood: 0, stone: 0 };
  const take = (c) => {
    res.wood = Math.max(res.wood, c.wood || 0);
    res.stone = Math.max(res.stone, c.stone || 0);
  };
  for (const b of s.buildings) if (b.lvl < MAX_LVL) take(costOf(b.type, b.lvl + 1));
  for (const t of BUILD_ORDER) {
    const d = BUILDINGS[t];
    if (d.unlock > L + 1 || (d.unique && countType(s, t))) continue;
    take(costOf(t, 1, countType(s, t)));
  }
  return res;
}

export const hasMarket = (s) => s.buildings.some((b) => BUILDINGS[b.type].kind === 'trade' && effLvl(b) > 0);

// сколько монет нужно, чтобы докупить недостающие материалы на рынке
export function shortfall(s, cost) {
  let c = 0;
  for (const r of ['wood', 'stone']) if ((cost[r] || 0) > s[r]) c += Math.ceil((cost[r] - s[r]) * EXCHANGE[r]);
  return c;
}

// Можно ли купить с докупкой материалов на рынке
export function canAffordEx(s, cost) {
  if (canAfford(s, cost)) return true;
  if (!hasMarket(s) || (cost.crystals || 0) > s.crystals) return false;
  return s.coins >= (cost.coins || 0) + shortfall(s, cost);
}
export function payEx(s, cost) {
  if (!canAfford(s, cost)) {
    const extra = shortfall(s, cost);
    s.coins -= extra;
    for (const r of ['wood', 'stone']) if ((cost[r] || 0) > s[r]) s[r] = cost[r];
  }
  pay(s, cost);
  s._resT = 0;
}

export function canAfford(s, cost) {
  for (const k in cost) if ((s[k] || 0) < cost[k] - 1e-9) return false;
  return true;
}
export function pay(s, cost) {
  for (const k in cost) s[k] -= cost[k];
  s.spent += (cost.coins || 0) + (cost.wood || 0) * PRICE.wood + (cost.stone || 0) * PRICE.stone;
  s.best = Math.max(s.best, s.spent);
}

// Сколько строителей занято
export const busyBuilders = (s, now) => s.buildings.filter((b) => b.build && b.build > now).length;

// Переселение (престиж)
export const featherGain = (s) => Math.floor(Math.pow(s.earned / 2e5, 0.45));
export function migrate(s) {
  const fresh = newState();
  const gain = featherGain(s);
  fresh.feathers = s.feathers + gain;
  fresh.migrations = s.migrations + 1;
  fresh.crystals = s.crystals;
  fresh.best = s.best;
  fresh.settings = s.settings;
  fresh.tut = s.tut;
  fresh.streak = s.streak;
  fresh.daily = s.daily;
  fresh.stats = s.stats;
  fresh.coins = 160 + gain * 50;
  return fresh;
}
