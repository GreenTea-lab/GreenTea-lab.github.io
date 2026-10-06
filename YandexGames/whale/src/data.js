// Экономика «Городка на ките»: здания, рост кита, улучшения, острова и карточки, цели, миграция

// здания: цена первого, доход в секунду за штуку, на какой стадии кита открывается
export const BUILDINGS = [
  { id: 'lemon', cost: 15, inc: 0.4, stage: 1 },
  { id: 'fish', cost: 110, inc: 3, stage: 1 },
  { id: 'light', cost: 1200, inc: 22, stage: 1 },
  { id: 'bakery', cost: 13000, inc: 160, stage: 2 },
  { id: 'mill', cost: 150000, inc: 1200, stage: 2 },
  { id: 'carousel', cost: 1.7e6, inc: 9000, stage: 3 },
  { id: 'bank', cost: 2e7, inc: 70000, stage: 3 },
  { id: 'garden', cost: 3.3e8, inc: 560000, stage: 4 },
  { id: 'observ', cost: 5.1e9, inc: 4.4e6, stage: 4 },
  { id: 'castle', cost: 7.5e10, inc: 3.6e7, stage: 5 },
  { id: 'airship', cost: 1e12, inc: 2.9e8, stage: 5 },
  { id: 'rainbow', cost: 1.4e13, inc: 2.4e9, stage: 6 },
];
export const B = Object.fromEntries(BUILDINGS.map((b, i) => [b.id, { ...b, i }]));
export const GROWTH = 1.15;
// пороги количества, каждый удваивает доход здания
export const MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500];

// стадии кита: цена роста и множитель дохода
export const STAGES = [
  { cost: 0, mul: 1 },
  { cost: 600, mul: 1.25 },
  { cost: 4e4, mul: 1.5 },
  { cost: 4e6, mul: 1.8 },
  { cost: 5e8, mul: 2.2 },
  { cost: 8e10, mul: 2.7 },
];

// улучшения: цена первого уровня, рост цены, максимум
export const UPGRADES = {
  tap: { cost: 60, k: 6, max: 25 },
  wind: { cost: 250, k: 5, max: 15 },
  gull: { cost: 900, k: 6, max: 10 },
  night: { cost: 4000, k: 8, max: 6 },
  fount: { cost: 1500, k: 6, max: 10 },
};
export const UP_ORDER = ['tap', 'fount', 'wind', 'gull', 'night'];

// карточки островов (выбор 1 из 3, действуют до миграции)
export const CARDS = [
  { k: 'all', v: 0.15, w: 10 },
  { k: 'bld', v: 0.5, w: 12 },
  { k: 'tap', v: 0.5, w: 7 },
  { k: 'gull', v: 0.35, w: 5 },
  { k: 'speed', v: 0.2, w: 7 },
  { k: 'cheap', v: 0.05, w: 6 },
  { k: 'night', v: 0.25, w: 4 },
  { k: 'chest', v: 15, w: 6 },
];

export const BIOMES = ['warm', 'north', 'tropic', 'night', 'sky'];

// ---------- вычисления ----------
export function milestonesOf(n) {
  let m = 0;
  for (const t of MILESTONES) if (n >= t) m++;
  return m;
}
export function nextMilestone(n) {
  return MILESTONES.find((t) => n < t) || null;
}

const sumCards = (s, k, id) => (s.cards || []).filter((c) => c.k === k && (!id || c.id === id)).reduce((a, c) => a + c.v, 0);

export function discount(s) {
  return Math.max(0.5, 1 - sumCards(s, 'cheap'));
}
export function bCost(s, id, n) {
  return B[id].cost * Math.pow(GROWTH, n) * discount(s);
}
// цена покупки k штук подряд
export function bulkCost(s, id, k) {
  const n = s.b[id] || 0;
  const r = GROWTH;
  return bCost(s, id, n) * ((Math.pow(r, k) - 1) / (r - 1));
}
// сколько штук по карману (до lim)
export function maxAfford(s, id, lim = 1e4) {
  const c0 = bCost(s, id, s.b[id] || 0);
  if (s.shells < c0) return 0;
  const k = Math.floor(Math.log((s.shells * (GROWTH - 1)) / c0 + 1) / Math.log(GROWTH));
  return Math.max(0, Math.min(lim, k));
}

export function globalMul(s) {
  const st = STAGES[s.stage - 1].mul;
  const pearls = 1 + 0.1 * (s.pearls || 0);
  const goals = 1 + 0.02 * Object.keys(s.goals || {}).length;
  const cards = 1 + sumCards(s, 'all');
  return st * pearls * goals * cards;
}
export function bIncome(s, id) {
  const n = s.b[id] || 0;
  if (!n) return 0;
  return B[id].inc * n * Math.pow(2, milestonesOf(n)) * (1 + sumCards(s, 'bld', id));
}
export function baseIncome(s) {
  let sum = 0;
  for (const b of BUILDINGS) sum += bIncome(s, b.id);
  return sum * globalMul(s);
}
// boost — временные множители (попутный ветер, мега-фонтан)
export function income(s, boost = 1) {
  return baseIncome(s) * boost;
}
export function tapValue(s, inc) {
  const l = s.up.tap || 0;
  const base = (1 + 2 * l) * (1 + sumCards(s, 'tap')) * STAGES[s.stage - 1].mul;
  return base + inc * (0.02 + 0.012 * l) * (1 + sumCards(s, 'tap'));
}
export function upCost(id, lvl) {
  const U = UPGRADES[id];
  return U.cost * Math.pow(U.k, lvl);
}
// мили в секунду
export function speed(s) {
  return (1.2 + 0.25 * (s.stage - 1)) * (1 + 0.15 * (s.up.wind || 0)) * (1 + sumCards(s, 'speed'));
}
// расстояние до n-го острова от предыдущего (n с 1)
export function islandDist(n) {
  return Math.round(90 * Math.pow(1.33, n - 1));
}
// интервал чаек, с
export function gullGap(s) {
  return 75 / ((1 + 0.1 * (s.up.gull || 0)) * (1 + sumCards(s, 'gull')));
}
// офлайн: часов и доля дохода
export function offlineCap(s) {
  return { hours: 2 + (s.up.night || 0), rate: 0.5 + 0.05 * (s.up.night || 0) + sumCards(s, 'night') };
}
// мега-фонтан: длительность
export function fountDur(s) {
  return 8 + (s.up.fount || 0);
}
// для миграции нужно доплыть до острова: 10, потом каждый раз на 2 дальше (до 30)
export const migrateIsland = (s) => Math.min(30, 10 + 2 * (s.migr || 0));
// жемчуг считается от всего заработанного за игру (кубический корень), выдаётся разница с уже полученным
export function pearlsTotal(all) {
  return Math.floor(Math.cbrt(Math.max(0, all) / 1e7));
}
export function pearlsGain(s) {
  return Math.max(0, pearlsTotal(s.all || 0) - (s.pearlsEver || 0));
}

// ---------- цели (каждая +2% к доходу навсегда) ----------
export const GOALS = (() => {
  const g = [];
  for (const b of BUILDINGS) for (const n of [1, 25, 100]) g.push({ id: `b_${b.id}_${n}`, k: 'b', b: b.id, n });
  for (const n of [100, 1000, 10000, 100000]) g.push({ id: `tap_${n}`, k: 'taps', n });
  for (const n of [1, 5, 10, 25, 50]) g.push({ id: `isl_${n}`, k: 'isl', n });
  for (const n of [2, 3, 4, 5, 6]) g.push({ id: `st_${n}`, k: 'stage', n });
  for (const n of [1, 3, 5]) g.push({ id: `mig_${n}`, k: 'migr', n });
  for (const n of [1, 10, 50]) g.push({ id: `gull_${n}`, k: 'gulls', n });
  for (const n of [1e6, 1e9, 1e12, 1e15]) g.push({ id: `earn_${n}`, k: 'all', n });
  return g;
})();
export function goalDone(s, g) {
  switch (g.k) {
    case 'b':
      return (s.b[g.b] || 0) >= g.n;
    case 'taps':
      return (s.taps || 0) >= g.n;
    case 'isl':
      return (s.islandsAll || 0) >= g.n;
    case 'stage':
      return s.stage >= g.n;
    case 'migr':
      return (s.migr || 0) >= g.n;
    case 'gulls':
      return (s.gulls || 0) >= g.n;
    case 'all':
      return (s.all || 0) >= g.n;
  }
  return false;
}

export function rng(seed) {
  let x = (seed * 2654435761) >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// новое состояние забега (после миграции сохраняются жемчуг, цели, рекорды)
export function freshRun(s) {
  s.shells = 0;
  s.run = 0;
  s.b = {};
  s.up = { tap: 0, wind: 0, gull: 0, night: 0, fount: 0 };
  s.stage = 1;
  s.miles = 0;
  s.island = 0;
  s.cards = [];
}

// ---------- ежедневный подарок: минуты дохода, на 7-й день ещё жемчужина ----------
export const GIFTS = [{ m: 10 }, { m: 20 }, { m: 30 }, { m: 45 }, { m: 60 }, { m: 90 }, { m: 180, pearl: 1 }];
export function dayNum(ts = Date.now()) {
  const d = new Date(ts);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
export function giftState(login, today = dayNum()) {
  if (!login || login.last == null) return { can: true, idx: 0 };
  if (login.last === today) return { can: false, idx: (login.streak - 1) % 7 };
  if (login.last === today - 1) return { can: true, idx: login.streak % 7 };
  return { can: true, idx: 0 };
}
// подарок в ракушках: минуты дохода, но не меньше разумного минимума для новичка
export function giftShells(s, m) {
  return Math.max(baseIncome(s) * 60 * m, 50 * m);
}

// три разные карточки острова; «в моде» — одно из открытых зданий
export function rollCards(s, R = Math.random) {
  const pool = CARDS.slice();
  const out = [];
  const open = BUILDINGS.filter((b) => b.stage <= s.stage);
  while (out.length < 3 && pool.length) {
    const sum = pool.reduce((a, c) => a + c.w, 0);
    let x = R() * sum;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      x -= pool[i].w;
      if (x <= 0) break;
    }
    const c = pool.splice(i, 1)[0];
    const card = { k: c.k, v: c.v };
    if (c.k === 'bld') {
      const owned = open.filter((b) => (s.b[b.id] || 0) > 0);
      const list = owned.length ? owned : open;
      card.id = list[Math.floor(R() * list.length)].id;
    }
    out.push(card);
  }
  return out;
}
