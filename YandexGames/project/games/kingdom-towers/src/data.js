// Игровые данные: башни, враги, регионы, уровни, волны, улучшения

export const COLS = 16;
export const ROWS = 9;

export const C = {
  gold: 0xffc93c,
  goldDark: 0xb7791f,
  wood: 0x8b5a2b,
  woodDark: 0x5a3518,
  ink: 0x2b1a0e,
  cream: 0xfff3d6,
  red: 0xe5483f,
  green: 0x5cc451,
  blue: 0x4aa3ff,
  purple: 0x9b5de5,
  ice: 0x8fe3ff,
  grey: 0x8a8f99,
  white: 0xffffff,
};
export const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// ---------- Башни ----------
// dmgType: phys — режется бронёй, magic — игнорирует броню
export const TOWERS = {
  archer: {
    unlock: 1,
    cost: [70, 60, 110, 180],
    dmg: [7, 11, 17, 27],
    rate: [1.4, 1.6, 1.8, 2.2],
    range: [2.6, 2.8, 3.0, 3.3],
    dmgType: 'phys',
    air: true,
    color: C.green,
  },
  cannon: {
    unlock: 1,
    cost: [110, 90, 160, 250],
    dmg: [16, 28, 46, 75],
    rate: [0.55, 0.6, 0.65, 0.7],
    range: [2.4, 2.5, 2.6, 2.8],
    splash: [0.9, 1.0, 1.1, 1.3],
    dmgType: 'phys',
    air: false,
    color: C.red,
  },
  mage: {
    unlock: 2,
    cost: [100, 90, 150, 240],
    dmg: [14, 24, 40, 66],
    rate: [0.8, 0.85, 0.9, 1.0],
    range: [2.5, 2.7, 2.9, 3.1],
    dmgType: 'magic',
    air: true,
    color: C.purple,
  },
  frost: {
    unlock: 4,
    cost: [90, 80, 130, 200],
    dmg: [3, 5, 8, 12],
    rate: [1.0, 1.0, 1.1, 1.2],
    range: [2.4, 2.6, 2.8, 3.0],
    slow: [0.35, 0.4, 0.48, 0.55],
    splash: [0, 0, 0.6, 0.8],
    dmgType: 'magic',
    air: true,
    color: C.ice,
  },
  ballista: {
    unlock: 7,
    cost: [140, 120, 200, 300],
    dmg: [40, 65, 105, 170],
    rate: [0.4, 0.45, 0.5, 0.55],
    range: [3.6, 4.0, 4.4, 4.8],
    pierceArmor: 0.5,
    dmgType: 'phys',
    air: true,
    color: C.gold,
  },
};
export const TOWER_ORDER = ['archer', 'cannon', 'mage', 'frost', 'ballista'];

// ---------- Враги ----------
export const ENEMIES = {
  goblin: { hp: 30, speed: 1.25, armor: 0, bounty: 6, lives: 1, size: 0.55 },
  orc: { hp: 70, speed: 0.9, armor: 0.15, bounty: 10, lives: 2, size: 0.68 },
  wolf: { hp: 45, speed: 1.9, armor: 0, bounty: 8, lives: 1, size: 0.62 },
  bat: { hp: 40, speed: 1.4, armor: 0, bounty: 8, lives: 1, size: 0.55, fly: true },
  skeleton: { hp: 90, speed: 0.8, armor: 0.5, bounty: 13, lives: 2, size: 0.66 },
  shaman: { hp: 80, speed: 0.85, armor: 0.1, bounty: 16, lives: 2, size: 0.66, heal: true },
  troll: { hp: 320, speed: 0.6, armor: 0.25, bounty: 35, lives: 3, size: 0.95 },
  ogre: { hp: 2500, speed: 0.45, armor: 0.3, bounty: 200, lives: 10, size: 1.35, boss: true },
  dragon: { hp: 3200, speed: 0.55, armor: 0.2, bounty: 300, lives: 10, size: 1.5, boss: true, fly: true },
};

// ---------- Регионы ----------
export const REGIONS = [
  { id: 'meadow', grass: 0x7ccf4f, grass2: 0x6bbd42, path: 0xe0b57a, pathEdge: 0xb98a52, deco: 'tree', accent: 0x5cc451 },
  { id: 'forest', grass: 0x4f9a46, grass2: 0x438a3c, path: 0xb48a5e, pathEdge: 0x7f5a36, deco: 'pine', accent: 0x2f7d3a },
  { id: 'waste', grass: 0xd9a75b, grass2: 0xc9954c, path: 0x9c6b45, pathEdge: 0x6e4429, deco: 'rock', accent: 0xe5683f },
  { id: 'ice', grass: 0xe6f3fb, grass2: 0xd3e8f5, path: 0xa9c3d6, pathEdge: 0x7d9bb3, deco: 'snowpine', accent: 0x4aa3ff },
];

// ---------- Карты (пути по клеткам 16x9) ----------
const L = {
  A: [[[-1, 2], [5, 2], [5, 6], [10, 6], [10, 2], [16, 2]]],
  B: [[[-1, 6], [3, 6], [3, 2], [8, 2], [8, 6], [12, 6], [12, 3], [16, 3]]],
  C: [[[-1, 4], [2, 4], [2, 1], [6, 1], [6, 7], [10, 7], [10, 1], [13, 1], [13, 5], [16, 5]]],
  D: [
    [[-1, 1], [7, 1], [7, 4], [16, 4]],
    [[-1, 7], [7, 7], [7, 4], [16, 4]],
  ],
  E: [[[3, -1], [3, 5], [8, 5], [8, 2], [12, 2], [12, 7], [16, 7]]],
  F: [[[-1, 1], [13, 1], [13, 4], [2, 4], [2, 7], [16, 7]]],
  G: [
    [[-1, 4], [4, 4], [4, 1], [11, 1], [11, 4], [16, 4]],
    [[-1, 4], [4, 4], [4, 7], [11, 7], [11, 4], [16, 4]],
  ],
  H: [[[-1, 7], [4, 7], [4, 3], [1, 3], [1, 1], [9, 1], [9, 5], [13, 5], [13, 2], [16, 2]]],
  I: [[[8, -1], [8, 2], [3, 2], [3, 6], [13, 6], [13, 3], [16, 3]]],
  J: [
    [[3, -1], [3, 3], [9, 3], [9, 6], [16, 6]],
    [[6, 9], [6, 6], [16, 6]],
  ],
  K: [[[-1, 1], [3, 1], [3, 7], [6, 7], [6, 1], [9, 1], [9, 7], [12, 7], [12, 1], [16, 1]]],
};
const flip = (paths) => paths.map((p) => p.map(([x, y]) => [x, ROWS - 1 - y]));

const LAYOUT = ['A', 'B', 'E', 'F', 'C', 'H', 'D', 'I', 'G', "C'", "B'", 'J', "F'", "D'", "H'", "E'", "G'", "I'", "J'", 'K'];

export function levelPaths(l) {
  const key = LAYOUT[l - 1];
  const base = L[key[0]];
  return key.length > 1 ? flip(base) : base;
}

// Клетки, через которые проходит путь
export function pathCells(paths) {
  const set = new Set();
  for (const p of paths) {
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1];
      const [x1, y1] = p[i];
      const dx = Math.sign(x1 - x0);
      const dy = Math.sign(y1 - y0);
      let x = x0;
      let y = y0;
      for (;;) {
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) set.add(x + ',' + y);
        if (x === x1 && y === y1) break;
        x += dx;
        y += dy;
      }
    }
  }
  return set;
}

export const LEVEL_COUNT = 20;
export const regionOf = (l) => Math.floor((l - 1) / 5);

// Детерминированный ГСЧ
export function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const UNLOCK = { goblin: 1, orc: 2, wolf: 3, bat: 4, skeleton: 6, shaman: 8, troll: 11 };
const WAVES = [6, 7, 8, 8, 10, 9, 10, 10, 11, 12, 11, 12, 12, 13, 14, 13, 14, 14, 15, 16];

export function levelInfo(l) {
  return {
    gold: 250 + 20 * l,
    lives: 25, // запас под разный урон врагов при прорыве
    hpMul: 1 + 0.05 * (l - 1),
    waves: WAVES[l - 1],
  };
}

// Генерация волн уровня: [{groups:[{type,count,gap,path,delay}]}]
export function genWaves(l) {
  const r = rng(l * 7919 + 13);
  const info = levelInfo(l);
  const types = Object.keys(UNLOCK).filter((t) => UNLOCK[t] <= l);
  const paths = levelPaths(l).length;
  const waves = [];
  const base = 90 * (1 + 0.15 * (l - 1));
  for (let w = 0; w < info.waves; w++) {
    let budget = base * (1 + 0.28 * w + 0.02 * w * w);
    const groups = [];
    const last = w === info.waves - 1;
    // босс
    if (last && l % 5 === 0) {
      const boss = l === 5 || l === 15 ? 'ogre' : 'dragon';
      const hpBoost = l === 15 ? 1.3 : l === 20 ? 1.15 : 1;
      groups.push({ type: boss, count: 1, gap: 1, path: 0, delay: 2, hpBoost });
      if (l === 20) groups.push({ type: 'ogre', count: 1, gap: 1, path: paths - 1, delay: 8, hpBoost: 1.2 });
      budget *= 0.45;
    }
    const nGroups = 1 + Math.floor(r() * Math.min(3, 1 + w / 3));
    let delay = 0;
    for (let g = 0; g < nGroups; g++) {
      // новый тип врага в уровне, где он появился, встречается чаще
      const weights = types.map((t) => (UNLOCK[t] === l ? 3 : 1) * (t === 'troll' && w < 3 ? 0.2 : 1));
      let sum = weights.reduce((a, b) => a + b, 0);
      let x = r() * sum;
      let ti = 0;
      for (; ti < types.length; ti++) {
        x -= weights[ti];
        if (x <= 0) break;
      }
      const type = types[Math.min(ti, types.length - 1)];
      const e = ENEMIES[type];
      const share = budget / (nGroups - g);
      const count = Math.max(1, Math.round(share / (e.hp * info.hpMul)));
      budget -= count * e.hp * info.hpMul;
      const gap = Math.max(0.35, 0.9 / e.speed);
      groups.push({ type, count, gap, path: (w + g) % paths, delay });
      delay += Math.min(count * gap * 0.6, 6);
      if (budget <= 0) break;
    }
    waves.push({ groups });
  }
  return waves;
}

// ---------- Постоянные улучшения ----------
export const SHOP = [
  { id: 'u_archer', max: 5, cost: 15, icon: 'archer' },
  { id: 'u_cannon', max: 5, cost: 15, icon: 'cannon' },
  { id: 'u_mage', max: 5, cost: 15, icon: 'mage' },
  { id: 'u_frost', max: 5, cost: 15, icon: 'frost' },
  { id: 'u_ballista', max: 5, cost: 20, icon: 'ballista' },
  { id: 'u_range', max: 5, cost: 25, icon: 'range' },
  { id: 'u_discount', max: 5, cost: 25, icon: 'coin' },
  { id: 'u_gold', max: 5, cost: 20, icon: 'chest' },
  { id: 'u_bounty', max: 5, cost: 20, icon: 'bag' },
  { id: 'u_lives', max: 3, cost: 30, icon: 'heart' },
  { id: 'u_meteor', max: 3, cost: 35, icon: 'meteor' },
  { id: 'u_freeze', max: 3, cost: 35, icon: 'freeze' },
];
export const shopCost = (it, lvl) => Math.round((it.cost * Math.pow(1.6, lvl)) / 5) * 5;

export const SPELLS = {
  meteor: { cd: 40, dmg: 140, radius: 1.4, unlock: 3 },
  freeze: { cd: 50, dur: 3, unlock: 6 },
};
