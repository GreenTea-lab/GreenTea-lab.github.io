// Данные рыбалки: виды рыб, водоёмы, снасти, наживки, экономика

// r — редкость 1..5 (обычная, необычная, редкая, трофейная, легендарная)
// w — вес, кг [мин, макс]; p — цена типичной рыбы; str — сила в борьбе
// time: any | day | dawn (утро и вечер) | night; baits — любимые наживки; pred — хищник
// вид: h — высота тела к длине; c — цвета [спина, бок, брюхо, плавники]; pat — узор;
// head: normal | long | flat | snout | big; tail: fork | round | cut | shark; dors: normal | double | back | sail | long | small
export const SPECIES = {
  crucian: { r: 1, w: [0.1, 1.2], p: 8, str: 1, time: 'any', baits: ['worm', 'maggot', 'corn'], h: 0.5, c: ['#6d7b38', '#cdb456', '#f1e3a6', '#a07c38'], pat: 'scales', tail: 'cut' },
  roach: { r: 1, w: [0.05, 0.6], p: 6, str: 0.9, time: 'day', baits: ['maggot', 'worm'], h: 0.34, c: ['#3c5b6c', '#c6d2d8', '#f2f5f2', '#dc5a3c'], pat: 'scales', eye: 'red' },
  rotan: { r: 1, w: [0.05, 0.4], p: 5, str: 0.8, time: 'any', baits: ['worm'], h: 0.3, c: ['#38372a', '#6e6742', '#aa9f6e', '#4e4a31'], pat: 'mottle', head: 'big', tail: 'round', dors: 'double' },
  perch: { r: 2, w: [0.1, 1.5], p: 14, str: 1.3, time: 'day', baits: ['worm', 'spinner'], pred: 1, h: 0.34, c: ['#3e5c2a', '#aab753', '#ece4b8', '#e5732e'], pat: 'stripes', dors: 'double' },
  tench: { r: 2, w: [0.3, 3], p: 28, str: 1.6, time: 'dawn', baits: ['worm', 'maggot', 'corn'], h: 0.36, c: ['#3c4d1d', '#7e8c2e', '#cbb85c', '#4d5a25'], tail: 'round', eye: 'red', whisk: 1 },
  carp: { r: 3, w: [1, 10], p: 75, str: 2.3, time: 'dawn', baits: ['corn'], h: 0.4, c: ['#5b4a22', '#cc9c3a', '#f2d892', '#a8642a'], pat: 'bigscales', whisk: 2 },
  goldfish: { r: 5, w: [0.3, 1.2], p: 400, str: 1.4, time: 'any', baits: [], h: 0.48, c: ['#e2861b', '#ffcd3a', '#fff2a3', '#ff9a2e'], pat: 'gold', tail: 'fork' },

  bleak: { r: 1, w: [0.02, 0.15], p: 5, str: 0.6, time: 'day', baits: ['maggot'], h: 0.22, c: ['#5d7f8f', '#d7e1e6', '#f6f8f8', '#b9c3c4'], pat: 'scales' },
  chub: { r: 2, w: [0.3, 4], p: 24, str: 1.6, time: 'day', baits: ['worm', 'corn', 'spinner'], h: 0.3, c: ['#3e4b39', '#bcbea4', '#eeede2', '#d3693c'], pat: 'bigscales', head: 'big' },
  ide: { r: 2, w: [0.3, 3.5], p: 26, str: 1.5, time: 'dawn', baits: ['worm', 'maggot', 'corn'], h: 0.34, c: ['#46525b', '#cbc6aa', '#eeeadc', '#cc5741'], pat: 'scales' },
  pike: { r: 3, w: [0.5, 12], p: 80, str: 2.2, time: 'day', baits: ['spinner'], pred: 1, h: 0.19, c: ['#3a4c22', '#7f9443', '#e7e4c2', '#a37b3a'], pat: 'spots', head: 'long', dors: 'back', tail: 'fork' },
  zander: { r: 3, w: [0.5, 9], p: 85, str: 2, time: 'night', baits: ['spinner', 'worm'], pred: 1, h: 0.22, c: ['#4a5651', '#aab3a5', '#edf0e7', '#7b8678'], pat: 'stripes', dors: 'double', eye: 'glass' },
  catfish: { r: 4, w: [2, 60], p: 220, str: 3.5, time: 'night', baits: ['worm', 'spinner'], pred: 1, h: 0.2, c: ['#2f332f', '#5c604f', '#cbc6ad', '#3b3f37'], pat: 'mottle', head: 'flat', tail: 'round', dors: 'small', whisk: 6 },
  giantcat: { r: 5, w: [40, 150], p: 900, str: 5, time: 'night', baits: ['worm'], h: 0.2, c: ['#1f2a22', '#4a5a3c', '#c4be98', '#2d3a2a'], pat: 'mottle', head: 'flat', tail: 'round', dors: 'small', whisk: 6 },

  rudd: { r: 1, w: [0.05, 0.8], p: 8, str: 1, time: 'day', baits: ['maggot', 'corn'], h: 0.4, c: ['#4a5a2d', '#dbc26a', '#f4e8b8', '#e24a2c'], pat: 'scales', eye: 'gold' },
  bream: { r: 2, w: [0.5, 6], p: 30, str: 1.7, time: 'dawn', baits: ['worm', 'maggot', 'corn'], h: 0.5, c: ['#4a4631', '#b9a879', '#e8debe', '#6b6248'], pat: 'scales' },
  burbot: { r: 3, w: [0.3, 6], p: 70, str: 1.8, time: 'night', baits: ['worm'], pred: 1, h: 0.17, c: ['#3b3522', '#7d6d41', '#d6cba0', '#5a4f31'], pat: 'mottle', head: 'flat', tail: 'round', dors: 'long', whisk: 1 },
  whitefish: { r: 3, w: [0.3, 4], p: 60, str: 1.6, time: 'day', baits: ['maggot'], h: 0.27, c: ['#5a6f7f', '#d3dbe1', '#f5f7f8', '#a9b3b9'], pat: 'scales', adip: 1 },
  kingpike: { r: 5, w: [10, 30], p: 950, str: 5, time: 'day', baits: ['spinner'], pred: 1, h: 0.19, c: ['#2f4a2a', '#9aae4a', '#f0ebc4', '#c9932f'], pat: 'spots', head: 'long', dors: 'back', tail: 'fork' },

  asp: { r: 2, w: [1, 8], p: 40, str: 2, time: 'day', baits: ['spinner'], pred: 1, h: 0.26, c: ['#3f5a70', '#c8d3da', '#f2f5f6', '#9aa7ae'], pat: 'scales' },
  silvercarp: { r: 3, w: [2, 25], p: 120, str: 2.6, time: 'day', baits: ['corn'], h: 0.32, c: ['#5b6b72', '#cfd6d8', '#f4f6f6', '#a6b0b1'], pat: 'scales', head: 'big', eye: 'low' },
  sazan: { r: 3, w: [1, 15], p: 110, str: 2.8, time: 'dawn', baits: ['corn', 'worm'], h: 0.36, c: ['#4a3c1e', '#a8782c', '#e6c47a', '#8a4a22'], pat: 'bigscales', whisk: 2 },
  sterlet: { r: 4, w: [0.5, 4], p: 200, str: 2.2, time: 'night', baits: ['worm'], h: 0.15, c: ['#4f4a3c', '#8c8566', '#efe0a8', '#6f6650'], pat: 'scutes', head: 'snout', tail: 'shark', dors: 'back', whisk: 4 },
  sturgeon: { r: 5, w: [10, 80], p: 1200, str: 5, time: 'night', baits: ['worm'], h: 0.16, c: ['#3c4148', '#7c838a', '#e9e6d8', '#565c63'], pat: 'scutes', head: 'snout', tail: 'shark', dors: 'back', whisk: 4 },

  grayling: { r: 1, w: [0.2, 2], p: 20, str: 1.2, time: 'day', baits: ['maggot', 'spinner'], h: 0.27, c: ['#4a5462', '#9da6b5', '#e3e5ea', '#7c4b8e'], pat: 'dots', dors: 'sail', adip: 1 },
  trout: { r: 2, w: [0.3, 5], p: 45, str: 1.8, time: 'dawn', baits: ['worm', 'spinner'], pred: 1, h: 0.27, c: ['#4b5a3a', '#c4b98e', '#f0e9d6', '#9b8c6a'], pat: 'trout', adip: 1 },
  lenok: { r: 2, w: [0.5, 6], p: 50, str: 1.9, time: 'dawn', baits: ['spinner', 'worm'], pred: 1, h: 0.25, c: ['#4d4a32', '#b39b5f', '#ecdcb0', '#8a6f3c'], pat: 'dots', adip: 1 },
  char: { r: 3, w: [0.5, 8], p: 90, str: 2.2, time: 'any', baits: ['spinner', 'worm'], pred: 1, h: 0.25, c: ['#3c5160', '#8aa0a8', '#f08a4a', '#e2683a'], pat: 'light', adip: 1, finEdge: 1 },
  taimen: { r: 5, w: [15, 60], p: 1300, str: 5, time: 'dawn', baits: ['spinner'], pred: 1, h: 0.22, c: ['#3d4532', '#a08c64', '#e8dcc0', '#c0402c'], pat: 'cross', adip: 1, head: 'long' },
};

export const SPECIES_ORDER = Object.keys(SPECIES);

// водоёмы: уровень и цена открытия, виды; sky/water/far — палитра; kind — что рисуется на дальнем берегу
export const LOCATIONS = [
  { id: 'pond', lvl: 1, cost: 0, fish: ['crucian', 'roach', 'rotan', 'perch', 'tench', 'carp', 'goldfish'], kind: 'village', mul: 1, pow: 1 },
  { id: 'river', lvl: 3, cost: 400, fish: ['bleak', 'roach', 'chub', 'ide', 'pike', 'zander', 'catfish', 'giantcat'], kind: 'river', mul: 1.25, pow: 1.4 },
  { id: 'lake', lvl: 6, cost: 1500, fish: ['perch', 'rudd', 'bream', 'tench', 'pike', 'burbot', 'whitefish', 'kingpike'], kind: 'forest', mul: 1.5, pow: 1.95 },
  { id: 'sea', lvl: 10, cost: 5000, fish: ['bream', 'asp', 'zander', 'silvercarp', 'sazan', 'catfish', 'sterlet', 'sturgeon'], kind: 'reservoir', mul: 1.8, pow: 2.7 },
  { id: 'mount', lvl: 15, cost: 12000, fish: ['grayling', 'trout', 'lenok', 'char', 'burbot', 'taimen'], kind: 'mountain', mul: 2.2, pow: 3.5 },
];

export const BAITS = {
  worm: { lvl: 1, pack: 0, cost: 0, bite: 1 },
  maggot: { lvl: 1, pack: 10, cost: 60, bite: 0.85 },
  corn: { lvl: 2, pack: 10, cost: 70, bite: 0.95 },
  spinner: { lvl: 3, pack: 5, cost: 120, bite: 0.9 },
  jig: { lvl: 1, pack: 1, cost: 450, bite: 0.8 },
};
export const BAIT_ORDER = ['worm', 'maggot', 'corn', 'spinner', 'jig'];

// снасти: 6 ступеней удочки, катушки и лески, 5 — садка, 4 — коптильни
export const GEAR = {
  rod: { cost: [0, 150, 600, 2000, 6000, 16000], val: [1, 1.4, 1.95, 2.7, 3.7, 5], reach: [0.62, 0.74, 0.85, 0.94, 1, 1] },
  reel: { cost: [0, 120, 500, 1600, 5000, 14000], val: [0.27, 0.3, 0.33, 0.36, 0.39, 0.43] },
  line: { cost: [0, 100, 400, 1400, 4500, 12000], val: [1, 0.9, 0.81, 0.73, 0.66, 0.6] },
  net: { cost: [0, 200, 800, 2500, 7000], val: [8, 12, 16, 22, 30] },
  smoker: { cost: [0, 300, 1500, 5000], val: [2, 3, 4, 5] },
};
export const GEAR_ORDER = ['rod', 'reel', 'line', 'net', 'smoker'];

// частота по редкости, опыт, время копчения (мин)
export const RARITY_W = [0, 100, 38, 12, 4, 1.2];
export const RARITY_XP = [0, 4, 9, 22, 55, 200];
export const SMOKE_MIN = [0, 10, 20, 45, 90, 180];
export const SMOKE_MUL = 2.5;

export const xpNeed = (lvl) => Math.round(50 * Math.pow(lvl, 1.6));

// время суток по часам игрока
export function dayPart(h) {
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 18) return 'day';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

// множитель клёва вида в это время суток
export function timeMul(pref, part) {
  const dawn = part === 'morning' || part === 'evening';
  if (pref === 'day') return part === 'day' ? 1.4 : dawn ? 1 : 0.25;
  if (pref === 'dawn') return dawn ? 2 : part === 'day' ? 0.7 : 0.8;
  if (pref === 'night') return part === 'night' ? 3 : dawn ? 1.2 : 0.2;
  return 1;
}

// погода: влияние на ожидание поклёвки, хищников и редких
export const WEATHER = {
  sun: { wait: 1, pred: 1, rare: 1, carp: 1.3 },
  cloud: { wait: 0.85, pred: 1.2, rare: 1.1, carp: 1 },
  rain: { wait: 0.75, pred: 1.6, rare: 1.15, carp: 0.9 },
  fog: { wait: 0.9, pred: 1, rare: 1.7, carp: 1 },
};
const CARPS = ['crucian', 'carp', 'sazan', 'tench', 'bream', 'silvercarp'];

// детерминированный ГСЧ
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// цена и опыт за рыбу
export function fishPrice(id, w, loc) {
  const S = SPECIES[id];
  const typ = S.w[0] + 0.2 * (S.w[1] - S.w[0]);
  return Math.max(2, Math.round(S.p * Math.pow(w / typ, 0.8) * (loc ? loc.mul : 1)));
}
export function fishXp(id, w) {
  const S = SPECIES[id];
  return RARITY_XP[S.r] + Math.round(Math.min(40, w * 1.5));
}

// выбор рыбы при поклёвке. ctx: { loc, bait, part, weather, d (дальность 0..1), bubbles, luck, fishDay }
export function rollFish(ctx, R = Math.random) {
  const W = WEATHER[ctx.weather] || WEATHER.sun;
  const list = ctx.loc.fish.map((id) => {
    const S = SPECIES[id];
    let k = RARITY_W[S.r] * timeMul(S.time, ctx.part);
    // наживка
    if (ctx.bait === 'jig') k *= S.r >= 5 ? 8 : S.r >= 3 ? 3 : 1;
    else if (S.baits.includes(ctx.bait)) k *= 2.2;
    else if (ctx.bait === 'spinner') k *= S.pred ? 0.6 : 0.1;
    else if (ctx.bait === 'worm') k *= 0.8;
    else k *= 0.45;
    if (S.r === 5 && ctx.bait !== 'jig') k *= 0.7;
    // дальность: у берега мелочь, вдали крупные
    k *= Math.max(0.3, 1 + (S.r - 2) * 0.6 * (ctx.d - 0.4));
    if (S.pred) k *= W.pred;
    if (S.r >= 3) k *= W.rare;
    if (CARPS.includes(id)) k *= W.carp;
    if (ctx.bubbles && S.r >= 2) k *= 1.7;
    if (ctx.luck && S.r >= 2) k *= 1.6;
    if (ctx.fishDay === id) k *= 1.6;
    return [id, k];
  });
  const sum = list.reduce((a, x) => a + x[1], 0);
  let x = R() * sum;
  let id = list[0][0];
  for (const [i, k] of list) {
    x -= k;
    if (x <= 0) {
      id = i;
      break;
    }
  }
  const S = SPECIES[id];
  // вес: чаще небольшие, вдали и на «пузырях» — крупнее
  const exp = 2.6 - 1.1 * ctx.d - (ctx.bubbles ? 0.4 : 0) - (ctx.luck ? 0.3 : 0);
  const u = Math.pow(R(), Math.max(1.1, exp));
  const w = Math.round((S.w[0] + (S.w[1] - S.w[0]) * u) * 1000) / 1000;
  return { id, w };
}

// сила рыбы относительно удочки
export function fightRatio(id, w, rodLvl, pow = 1) {
  const S = SPECIES[id];
  const rel = (w - S.w[0]) / (S.w[1] - S.w[0]);
  const fp = Math.max(0.4, S.str * (0.55 + 0.9 * rel)) * pow;
  return fp / GEAR.rod.val[rodLvl];
}

// шаг вываживания: F { p, T, ratio, rush, warn, next, side }; hold — тянет ли игрок
// возвращает 'rush' в момент рывка
export function fightStep(F, hold, dt, gear, R = Math.random) {
  const reel = GEAR.reel.val[gear.reel];
  const lr = GEAR.line.val[gear.line];
  const r = F.ratio;
  let ev = null;
  if (F.rush > 0) F.rush -= dt;
  else if (F.warn > 0) {
    F.warn -= dt;
    if (F.warn <= 0) {
      F.rush = 0.6 + R() * 0.5;
      F.side = -F.side;
      ev = 'rush';
    }
  } else {
    F.next -= dt;
    if (F.next <= 0) {
      F.warn = 0.45;
      F.next = ((1.6 + R() * 2) / Math.max(0.5, Math.min(1.6, r))) * (r < 0.35 ? 2.2 : 1);
    }
  }
  const rush = F.rush > 0;
  if (hold) {
    F.p += ((reel * dt) / (0.55 + 0.45 * r)) * (rush ? 0.25 : 1);
    F.T += 0.24 * r * lr * dt * (rush ? 3.6 : 1) - (r < 0.5 ? 0.1 * dt : 0);
  } else {
    F.T -= 0.65 * dt;
    F.p -= (rush ? 0.09 * Math.min(2, r) : 0.012) * dt;
  }
  F.p = Math.max(0, Math.min(1, F.p));
  F.T = Math.max(0, Math.min(1, F.T));
  return ev;
}
