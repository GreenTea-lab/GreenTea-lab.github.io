// Игровые данные: цвета, классы танков, фигуры, характеристики, магазин

export const COLORS = {
  bg: 0x07031a,
  cyan: 0x31f6ff,
  pink: 0xff2e88,
  yellow: 0xffd23f,
  orange: 0xff7a18,
  green: 0x3dff8c,
  purple: 0xb04bff,
  red: 0xff3355,
  white: 0xffffff,
  blue: 0x4d7cff,
  violet: 0x8a6bff,
  barrel: 0xb9b3ec,
  ink: 0xd8d4ff,
};

export const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// Счёт, нужный для уровня (как в оригинальном жанре: 45 уровней)
export const LEVEL_SCORE = [0, 0, 4, 13, 28, 50, 78, 113, 157, 211, 275, 350, 437, 538, 655, 787, 938, 1109, 1301, 1516, 1757, 2026, 2325, 2658, 3026, 3433, 3883, 4379, 4925, 5525, 6184, 6907, 7698, 8537, 9426, 10368, 11367, 12426, 13549, 14739, 16000, 17337, 18754, 20256, 21849, 23536];
export const MAX_LEVEL = 45;
export function levelOf(score) {
  let l = 1;
  while (l < MAX_LEVEL && score >= LEVEL_SCORE[l + 1]) l++;
  return l;
}
// очки навыков: по одному на уровнях 2–28, дальше на каждом третьем до 45 (всего 33)
export function pointsAt(level) {
  let p = Math.min(level, 28) - 1;
  if (level > 28) p += Math.floor((Math.min(level, 45) - 27) / 3);
  return Math.max(0, p);
}

// 8 характеристик
export const STATS = [
  { id: 'regen', color: 0xff9b6b },
  { id: 'maxhp', color: 0xff4f9a },
  { id: 'body', color: 0xb46bff },
  { id: 'bspd', color: 0x4d9bff },
  { id: 'pen', color: 0xffd23f },
  { id: 'bdmg', color: 0xff3355 },
  { id: 'reload', color: 0x3dff8c },
  { id: 'move', color: 0x31f6ff },
];
export const STAT_MAX = 7;

// ---------- Классы танков ----------
// Ствол: a — угол (град), l — длина от центра (в радиусах корпуса), w — ширина, y — боковой сдвиг,
// x — где начинается ствол, w2 — ширина на конце (раструб), kind: gun | drone | trap,
// d — задержка выстрела (доля перезарядки), r — множитель перезарядки, dmg/pen/spd — множители пули,
// s — размер пули относительно ширины ствола, k — отдача, sp — разброс (град), life — время жизни пули.
const G = (o = {}) => ({ a: 0, l: 1.9, w: 0.84, y: 0, x: 0, kind: 'gun', d: 0, r: 1, dmg: 1, pen: 1, spd: 1, s: 1, k: 1, sp: 0, life: 1, ...o });
const DR = (o = {}) => G({ kind: 'drone', l: 1.55, w: 0.72, w2: 1.2, x: 0, r: 1, k: 0, ...o });
const TR = (o = {}) => G({ kind: 'trap', l: 1.5, w: 0.84, cap: true, spd: 0.75, life: 1, k: 0.6, ...o });
const sym = (n, f) => Array.from({ length: n }, (_, i) => f((360 / n) * i, i));

export const TANKS = {
  basic: { tier: 1, barrels: [G()], next: ['twin', 'sniper', 'machinegun', 'flank'], next30: ['smasher'] },

  // уровень 15
  twin: { tier: 2, barrels: [G({ y: -0.5, w: 0.76, dmg: 0.65 }), G({ y: 0.5, w: 0.76, dmg: 0.65, d: 0.5 })], next: ['triple', 'quad', 'twinflank'] },
  sniper: { tier: 2, fov: 1.12, barrels: [G({ l: 2.4, w: 0.84, r: 1.5, dmg: 1.5, pen: 1.3, spd: 1.45, life: 1.3 })], next: ['assassin', 'overseer', 'hunter', 'trapper'] },
  machinegun: { tier: 2, barrels: [G({ l: 1.9, w: 0.84, w2: 1.45, r: 0.5, dmg: 0.7, sp: 16 })], next: ['destroyer', 'gunner', 'sprayer'] },
  flank: { tier: 2, barrels: [G(), G({ a: 180, l: 1.62 })], next: ['triangle', 'quad', 'twinflank', 'auto3'] },

  // уровень 30
  triple: { tier: 3, barrels: [G({ a: -45, dmg: 0.7 }), G({ a: 45, dmg: 0.7 }), G({ dmg: 0.7 })], next: ['triplet', 'penta', 'spread'] },
  quad: { tier: 3, barrels: sym(4, (a) => G({ a, dmg: 0.75 })), next: ['octo', 'auto5'] },
  twinflank: { tier: 3, barrels: [0, 180].flatMap((a) => [G({ a, y: -0.5, w: 0.76, dmg: 0.6 }), G({ a, y: 0.5, w: 0.76, dmg: 0.6, d: 0.5 })]), next: ['tripletwin', 'battleship'] },
  assassin: { tier: 3, fov: 1.25, barrels: [G({ l: 2.75, w: 0.84, r: 2, dmg: 1.65, pen: 1.4, spd: 1.6, life: 1.45 })], next: ['ranger', 'stalker'] },
  overseer: { tier: 3, fov: 1.1, drones: 8, barrels: [DR({ a: 90 }), DR({ a: 270 })], next: ['overlord', 'necromancer', 'manager', 'overtrapper', 'battleship'] },
  hunter: { tier: 3, fov: 1.2, barrels: [G({ l: 2.45, w: 0.56, r: 1.8, dmg: 0.85, pen: 1, spd: 1.4, life: 1.3 }), G({ l: 2.05, w: 0.84, r: 1.8, d: 0.2, dmg: 1.05, spd: 1.35, life: 1.3 })], next: ['predator', 'streamliner'] },
  trapper: { tier: 3, fov: 1.1, barrels: [TR()], next: ['tritrapper', 'megatrapper', 'gunnertrapper', 'overtrapper', 'autotrapper'] },
  destroyer: { tier: 3, barrels: [G({ l: 1.8, w: 1.42, r: 4, dmg: 3.2, pen: 2, spd: 0.72, s: 1, k: 5 })], next: ['annihilator', 'hybrid'] },
  gunner: { tier: 3, barrels: [G({ l: 1.55, w: 0.38, y: -0.56, r: 0.55, dmg: 0.5, pen: 0.6, d: 0 }), G({ l: 1.55, w: 0.38, y: 0.56, r: 0.55, dmg: 0.5, pen: 0.6, d: 0.5 }), G({ l: 1.85, w: 0.38, y: -0.22, r: 0.55, dmg: 0.5, pen: 0.6, d: 0.25 }), G({ l: 1.85, w: 0.38, y: 0.22, r: 0.55, dmg: 0.5, pen: 0.6, d: 0.75 })], next: ['autogunner', 'gunnertrapper', 'streamliner'] },
  triangle: { tier: 3, barrels: [G({ dmg: 1 }), G({ a: 150, l: 1.6, dmg: 0.35, pen: 0.6, r: 0.6, k: 3.2 }), G({ a: 210, l: 1.6, dmg: 0.35, pen: 0.6, r: 0.6, k: 3.2, d: 0.5 })], next: ['booster', 'fighter'] },
  auto3: { tier: 3, autos: sym(3, (a) => ({ a, dist: 0.6 })), barrels: [], next: ['auto5', 'autogunner'] },
  smasher: { tier: 3, smasher: 1, barrels: [], next: ['landmine', 'spike', 'autosmasher'] },

  // уровень 45
  triplet: { tier: 4, barrels: [G({ y: -0.56, l: 1.7, w: 0.66, dmg: 0.6, d: 0.5 }), G({ y: 0.56, l: 1.7, w: 0.66, dmg: 0.6, d: 0.5 }), G({ l: 2, w: 0.7, dmg: 0.6 })] },
  penta: { tier: 4, barrels: [G({ a: -45, l: 1.55, dmg: 0.55, d: 0.66 }), G({ a: 45, l: 1.55, dmg: 0.55, d: 0.66 }), G({ a: -22, l: 1.75, dmg: 0.55, d: 0.33 }), G({ a: 22, l: 1.75, dmg: 0.55, d: 0.33 }), G({ l: 2, dmg: 0.55 })] },
  spread: { tier: 4, barrels: [...[-75, -60, -45, -30, -15, 15, 30, 45, 60, 75].map((a, i) => G({ a, l: 1.25 + (75 - Math.abs(a)) * 0.006, w: 0.42, dmg: 0.42, pen: 0.6, r: 1, d: (Math.abs(a) / 75) * 0.8 })), G({ l: 1.95, w: 0.8, dmg: 0.9 })] },
  octo: { tier: 4, barrels: sym(8, (a, i) => G({ a, dmg: 0.6, d: i % 2 ? 0.5 : 0 })) },
  auto5: { tier: 4, autos: sym(5, (a) => ({ a, dist: 0.65 })), barrels: [] },
  tripletwin: { tier: 4, barrels: [0, 120, 240].flatMap((a) => [G({ a, y: -0.5, w: 0.74, dmg: 0.55 }), G({ a, y: 0.5, w: 0.74, dmg: 0.55, d: 0.5 })]) },
  battleship: { tier: 4, fov: 1.1, drones: 0, barrels: [90, 270].flatMap((a) => [DR({ a, y: -0.48, w: 0.42, w2: 0.62, l: 1.45, mini: 1, r: 0.25 }), DR({ a, y: 0.48, w: 0.42, w2: 0.62, l: 1.45, mini: 1, r: 0.25, d: 0.5 })]) },
  ranger: { tier: 4, fov: 1.42, barrels: [G({ l: 2.85, w: 0.84, x: 0, r: 2.1, dmg: 1.75, pen: 1.5, spd: 1.65, life: 1.55, base: 1 })] },
  stalker: { tier: 4, fov: 1.25, invis: 1, barrels: [G({ l: 2.75, w: 0.84, w2: 1.15, r: 2, dmg: 1.7, pen: 1.4, spd: 1.6, life: 1.45 })] },
  overlord: { tier: 4, fov: 1.1, drones: 8, barrels: sym(4, (a) => DR({ a })) },
  necromancer: { tier: 4, fov: 1.1, drones: 22, necro: 1, body: 'square', barrels: [DR({ a: 90, w: 0.8, w2: 0.95, l: 1.35, r: 9 }), DR({ a: 270, w: 0.8, w2: 0.95, l: 1.35, r: 9 })] },
  manager: { tier: 4, fov: 1.1, drones: 8, invis: 1, barrels: [DR({ a: 0, r: 0.6 })] },
  overtrapper: { tier: 4, fov: 1.1, drones: 2, barrels: [TR(), DR({ a: 120 }), DR({ a: 240 })] },
  predator: { tier: 4, fov: 1.35, barrels: [G({ l: 2.5, w: 0.5, r: 2, dmg: 0.8, spd: 1.45, life: 1.4 }), G({ l: 2.15, w: 0.74, r: 2, d: 0.15, dmg: 0.95, spd: 1.42, life: 1.4 }), G({ l: 1.8, w: 0.98, r: 2, d: 0.3, dmg: 1.1, spd: 1.4, life: 1.4 })] },
  streamliner: { tier: 4, fov: 1.15, barrels: [2.4, 2.2, 2.0, 1.8, 1.6].map((l, i) => G({ l, w: 0.74, r: 0.32, dmg: 0.4, pen: 0.75, spd: 1.2, d: i * 0.2, sp: 4 })) },
  tritrapper: { tier: 4, fov: 1.1, barrels: sym(3, (a) => TR({ a, dmg: 0.8 })) },
  megatrapper: { tier: 4, fov: 1.1, barrels: [TR({ w: 1.12, l: 1.55, r: 2.2, dmg: 2, pen: 2.2, s: 1 })] },
  gunnertrapper: { tier: 4, fov: 1.1, barrels: [G({ l: 1.7, w: 0.38, y: -0.3, r: 0.6, dmg: 0.5, pen: 0.6 }), G({ l: 1.7, w: 0.38, y: 0.3, r: 0.6, dmg: 0.5, pen: 0.6, d: 0.5 }), TR({ a: 180, w: 1, l: 1.4, r: 2, dmg: 1.2 })] },
  autotrapper: { tier: 4, fov: 1.1, autos: [{ a: 0, dist: 0 }], barrels: [TR()] },
  annihilator: { tier: 4, barrels: [G({ l: 1.8, w: 1.9, r: 4, dmg: 4.2, pen: 2.5, spd: 0.68, k: 7.5 })] },
  hybrid: { tier: 4, drones: 2, barrels: [G({ l: 1.8, w: 1.42, r: 4, dmg: 3.2, pen: 2, spd: 0.72, k: 5 }), DR({ a: 180 })] },
  autogunner: { tier: 4, autos: [{ a: 0, dist: 0 }], barrels: [G({ l: 1.55, w: 0.38, y: -0.56, r: 0.55, dmg: 0.5, pen: 0.6 }), G({ l: 1.55, w: 0.38, y: 0.56, r: 0.55, dmg: 0.5, pen: 0.6, d: 0.5 }), G({ l: 1.85, w: 0.38, y: -0.22, r: 0.55, dmg: 0.5, pen: 0.6, d: 0.25 }), G({ l: 1.85, w: 0.38, y: 0.22, r: 0.55, dmg: 0.5, pen: 0.6, d: 0.75 })] },
  sprayer: { tier: 4, barrels: [G({ l: 2.15, w: 0.5, r: 0.3, dmg: 0.32, pen: 0.6, sp: 8 }), G({ l: 1.9, w: 0.84, w2: 1.45, r: 0.5, dmg: 0.7, sp: 16, d: 0.5 })] },
  booster: { tier: 4, barrels: [G(), G({ a: 135, l: 1.45, dmg: 0.3, pen: 0.6, r: 0.6, k: 2.6, d: 0.5 }), G({ a: 225, l: 1.45, dmg: 0.3, pen: 0.6, r: 0.6, k: 2.6, d: 0.5 }), G({ a: 155, l: 1.62, dmg: 0.3, pen: 0.6, r: 0.6, k: 2.6 }), G({ a: 205, l: 1.62, dmg: 0.3, pen: 0.6, r: 0.6, k: 2.6 })] },
  fighter: { tier: 4, barrels: [G(), G({ a: 90, l: 1.6, dmg: 0.8 }), G({ a: 270, l: 1.6, dmg: 0.8 }), G({ a: 150, l: 1.6, dmg: 0.35, pen: 0.6, r: 0.6, k: 3 }), G({ a: 210, l: 1.6, dmg: 0.35, pen: 0.6, r: 0.6, k: 3, d: 0.5 })] },
  landmine: { tier: 4, smasher: 1, invis: 1, barrels: [] },
  spike: { tier: 4, smasher: 1.45, spikes: 1, barrels: [] },
  autosmasher: { tier: 4, smasher: 1, autos: [{ a: 0, dist: 0 }], allStats: 1, barrels: [] },
};
for (const [id, t] of Object.entries(TANKS)) {
  t.id = id;
  t.next = t.next || [];
  t.fov = t.fov || 1;
}
// на каком уровне открывается следующий ярус
export const TIER_LEVEL = { 2: 15, 3: 30, 4: 45 };

// какие классы можно выбрать на этом уровне (если ярус ещё не взят)
export function upgradeOptions(tankId, level, picked) {
  const t = TANKS[tankId];
  if (!t) return [];
  let out = [];
  const nextTier = t.tier + 1;
  if (TIER_LEVEL[nextTier] && level >= TIER_LEVEL[nextTier]) out = out.concat(t.next);
  if (t.next30 && level >= 30) out = out.concat(t.next30);
  return out.filter((x) => !picked || x !== tankId);
}

// ---------- Фигуры ----------
export const SHAPES = {
  square: { sides: 4, r: 19, hp: 10, dmg: 8, xp: 10, color: 0xffd23f },
  triangle: { sides: 3, r: 18, hp: 30, dmg: 8, xp: 25, color: 0xff5a36 },
  pentagon: { sides: 5, r: 32, hp: 100, dmg: 12, xp: 130, color: 0x8a6bff },
  alpha: { sides: 5, r: 92, hp: 3000, dmg: 20, xp: 3000, color: 0x8a6bff },
  crasher: { sides: 3, r: 14, hp: 10, dmg: 8, xp: 15, color: 0xff3dc8, chase: 1 },
  crasherBig: { sides: 3, r: 21, hp: 20, dmg: 8, xp: 25, color: 0xff3dc8, chase: 1 },
};

// ---------- Боссы ----------
export const BOSSES = {
  guardian: { sides: 3, r: 78, hp: 3000, dmg: 40, xp: 3000, color: 0xff3dc8, speed: 70, drones: 14, barrels: sym(3, (a) => DR({ a: a + 60, l: 0.9, w: 0.6, w2: 0.9, x: 0.25, r: 0.25, guardian: 1 })) },
  summoner: { sides: 4, r: 80, hp: 3000, dmg: 40, xp: 3000, color: 0xffd23f, speed: 60, drones: 16, barrels: sym(4, (a) => DR({ a: a + 45, l: 1.15, w: 0.6, w2: 0.82, r: 0.25, square: 1 })) },
  defender: { sides: 3, r: 84, hp: 6000, dmg: 40, xp: 5000, color: 0xff7a18, speed: 50, autos: sym(3, (a) => ({ a: a, dist: 0.5 })), barrels: sym(3, (a) => TR({ a: a + 60, l: 1.25, w: 0.4, r: 0.55, dmg: 2.5, pen: 3 })) },
};

// ---------- Внешний вид и магазин ----------
export const SKINS = [
  { id: 'cyan', color: 0x31f6ff, cost: 0 },
  { id: 'mint', color: 0x3dff8c, cost: 300 },
  { id: 'blue', color: 0x4d7cff, cost: 300 },
  { id: 'violet', color: 0xb04bff, cost: 500 },
  { id: 'lime', color: 0xc6ff3d, cost: 500 },
  { id: 'gold', color: 0xffd23f, cost: 800 },
  { id: 'ice', color: 0xe8f6ff, cost: 1200 },
  { id: 'rainbow', color: 0x31f6ff, cost: 2500, rainbow: 1 },
];
export const TRAILS = [
  { id: 'none', cost: 0 },
  { id: 'sparks', cost: 400 },
  { id: 'comet', cost: 900 },
  { id: 'stars', cost: 1500 },
];
export const BOOSTS = { lvl15: { level: 15, cost: 150 }, lvl30: { level: 30, cost: 500 } };

export const TEAM_COLORS = [0x31f6ff, 0xff2e88];
export const ENEMY_COLOR = 0xff2e88;

// монеты за забег
export function coinsFor(score, kills) {
  return Math.floor(Math.sqrt(Math.max(0, score)) * 0.55 + kills * 4);
}
