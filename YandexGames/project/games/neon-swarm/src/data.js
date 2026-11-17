// Игровые данные: оружие, пассивки, враги, магазин

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
};

export const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// Оружие: значения по уровням (индекс 0 = уровень 1)
export const WEAPONS = {
  blaster: {
    color: COLORS.cyan,
    max: 8,
    dmg: [14, 19, 19, 19, 25, 32, 32, 42],
    cd: [0.5, 0.5, 0.5, 0.4, 0.4, 0.36, 0.32, 0.3],
    count: [1, 1, 2, 2, 3, 3, 4, 4],
    pierce: [0, 0, 0, 0, 1, 1, 1, 2],
    speed: 640,
  },
  orbit: {
    color: COLORS.pink,
    max: 8,
    dmg: [12, 12, 17, 17, 24, 30, 30, 38],
    count: [2, 3, 3, 4, 5, 5, 6, 6],
    radius: [72, 72, 82, 88, 98, 104, 110, 118],
    rot: [3.0, 3.0, 3.2, 3.6, 4.0, 4.2, 4.4, 4.8],
    hitCd: 0.35,
  },
  nova: {
    color: COLORS.purple,
    max: 8,
    dmg: [26, 35, 35, 35, 52, 64, 64, 80],
    cd: [3.0, 3.0, 3.0, 2.25, 2.25, 2.0, 1.8, 1.6],
    radius: [140, 140, 180, 180, 205, 215, 230, 245],
    pulses: [1, 1, 1, 1, 2, 2, 2, 3],
  },
  lightning: {
    color: COLORS.yellow,
    max: 8,
    dmg: [24, 24, 34, 34, 44, 54, 54, 66],
    cd: [1.6, 1.6, 1.6, 1.2, 1.2, 1.1, 1.0, 0.9],
    chains: [2, 3, 3, 3, 5, 6, 6, 7],
    strikes: [1, 1, 1, 1, 2, 2, 3, 3],
    range: 430,
    chainRange: 170,
  },
  missile: {
    color: COLORS.orange,
    max: 8,
    dmg: [30, 30, 40, 40, 48, 58, 58, 70],
    cd: [2.4, 2.4, 2.4, 1.8, 1.8, 1.6, 1.5, 1.3],
    count: [1, 2, 2, 2, 4, 4, 5, 6],
    radius: [62, 62, 76, 76, 88, 94, 100, 108],
  },
  laser: {
    color: COLORS.red,
    max: 8,
    dmg: [30, 40, 40, 54, 70, 84, 84, 100],
    cd: [2.2, 2.0, 1.7, 1.45, 1.2, 1.1, 1.0, 0.9],
    beams: [1, 1, 2, 2, 3, 3, 4, 4],
    width: [12, 14, 14, 16, 20, 22, 22, 26],
    len: 560,
  },
  saw: {
    color: COLORS.green,
    max: 8,
    dmg: [16, 22, 22, 30, 38, 46, 46, 56],
    cd: [2.4, 2.2, 2.0, 1.8, 1.5, 1.4, 1.3, 1.1],
    count: [1, 1, 2, 2, 3, 3, 4, 4],
    dist: [240, 260, 280, 300, 330, 340, 350, 370],
    size: [1, 1.1, 1.1, 1.25, 1.4, 1.45, 1.5, 1.6],
    hitCd: 0.3,
  },
  drone: {
    color: COLORS.blue,
    max: 8,
    dmg: [7, 10, 10, 13, 17, 21, 21, 26],
    cd: [0.55, 0.5, 0.45, 0.4, 0.35, 0.32, 0.3, 0.27],
    count: [1, 1, 2, 2, 3, 3, 4, 4],
    speed: 700,
  },
};

export const PASSIVES = {
  vitality: { color: COLORS.red, max: 8 },
  regen: { color: COLORS.green, max: 8 },
  swift: { color: COLORS.cyan, max: 6 },
  magnet: { color: COLORS.blue, max: 6 },
  power: { color: COLORS.orange, max: 8 },
  haste: { color: COLORS.yellow, max: 8 },
  area: { color: COLORS.purple, max: 8 },
  armor: { color: 0x9aa7c7, max: 8 },
  wisdom: { color: COLORS.green, max: 6 },
  multishot: { color: COLORS.cyan, max: 4 },
  crit: { color: COLORS.yellow, max: 8 },
  pierce: { color: COLORS.purple, max: 5 },
};

// Враги
export const ENEMIES = {
  drone: { shape: 'tri', color: COLORS.pink, hp: 10, speed: 72, dmg: 8, xp: 1, r: 15 },
  dart: { shape: 'diamond', color: COLORS.yellow, hp: 6, speed: 145, dmg: 6, xp: 1, r: 11 },
  brute: { shape: 'hex', color: COLORS.orange, hp: 62, speed: 46, dmg: 15, xp: 5, r: 25 },
  shooter: { shape: 'square', color: COLORS.green, hp: 26, speed: 60, dmg: 8, xp: 3, r: 17 },
  splitter: { shape: 'pent', color: COLORS.purple, hp: 42, speed: 62, dmg: 10, xp: 3, r: 20 },
  // поздние враги: рывок, камикадзе, снайпер
  lancer: { shape: 'arrow', color: 0xff5a36, hp: 30, speed: 66, dmg: 12, xp: 3, r: 17 },
  bomber: { shape: 'spike', color: 0xffae00, hp: 30, speed: 96, dmg: 10, xp: 3, r: 16 },
  sniper: { shape: 'cross', color: 0x4d7cff, hp: 40, speed: 70, dmg: 10, xp: 4, r: 18 },
  // стрелки в разные стороны
  spinner: { shape: 'oct', color: 0x00ffd0, hp: 34, speed: 55, dmg: 8, xp: 4, r: 18 },
  gunner: { shape: 'kite', color: 0x9dff3c, hp: 36, speed: 64, dmg: 8, xp: 4, r: 17 },
  burster: { shape: 'ring', color: 0xff66ff, hp: 48, speed: 50, dmg: 9, xp: 5, r: 20 },
  // боссы: Звезда, Пульсар, Улей
  boss: { shape: 'star', color: COLORS.red, hp: 1100, speed: 55, dmg: 25, xp: 40, r: 52, boss: true },
  pulsar: { shape: 'ring', color: COLORS.cyan, hp: 1250, speed: 42, dmg: 25, xp: 50, r: 54, boss: true },
  hive: { shape: 'hex', color: COLORS.yellow, hp: 1450, speed: 50, dmg: 28, xp: 50, r: 56, boss: true },
  // Змей: голова с хвостом из сегментов; Зеркало: телепорт, лучи крестом и двойники
  serpent: { shape: 'serpent', color: COLORS.green, hp: 1500, speed: 120, dmg: 26, xp: 50, r: 40, boss: true },
  mirror: { shape: 'mirror', color: 0xd8e8ff, hp: 1350, speed: 40, dmg: 26, xp: 50, r: 46, boss: true },
  // двойник Зеркала: хрупкий, но больно бьёт касанием
  mirrorling: { shape: 'mirror', color: 0x9ab8ff, hp: 60, speed: 120, dmg: 14, xp: 3, r: 22 },
  // щитоносец: соседи рядом с ним получают вдвое меньше урона; лекарь: подлечивает соседей
  shieldman: { shape: 'shield', color: 0x9ad8ff, hp: 70, speed: 50, dmg: 10, xp: 5, r: 21 },
  medic: { shape: 'heart', color: 0x7dffb0, hp: 36, speed: 62, dmg: 8, xp: 4, r: 17 },
  // Страж лабиринта: ставит вокруг игрока стены с проходами и стреляет в упор
  warden: { shape: 'gear', color: 0xb04bff, hp: 1200, speed: 48, dmg: 26, xp: 50, r: 50, boss: true },
};

// Сверхзаряд: бесконечные улучшения, когда всё оружие и пассивки прокачаны
export const OVERCHARGE = {
  oc_dmg: { color: COLORS.orange, icon: 'power' },
  oc_cd: { color: COLORS.yellow, icon: 'haste' },
  oc_hp: { color: COLORS.red, icon: 'vitality' },
  oc_area: { color: COLORS.purple, icon: 'area' },
};

// Длительность «основной» части забега: после неё — победа, хардкор и бесконечный режим
export const WIN_TIME = 1800;

// Магазин постоянных улучшений
export const SHOP = [
  { id: 'm_hp', max: 8, cost: 40, color: COLORS.red, icon: 'vitality' },
  { id: 'm_dmg', max: 8, cost: 50, color: COLORS.orange, icon: 'power' },
  { id: 'm_speed', max: 5, cost: 40, color: COLORS.cyan, icon: 'swift' },
  { id: 'm_magnet', max: 5, cost: 30, color: COLORS.blue, icon: 'magnet' },
  { id: 'm_cd', max: 5, cost: 60, color: COLORS.yellow, icon: 'haste' },
  { id: 'm_xp', max: 5, cost: 50, color: COLORS.green, icon: 'wisdom' },
  { id: 'm_gold', max: 8, cost: 40, color: COLORS.purple, icon: 'crystal' },
  { id: 'm_armor', max: 5, cost: 60, color: 0x9aa7c7, icon: 'armor' },
  { id: 'm_reroll', max: 3, cost: 120, color: COLORS.cyan, icon: 'reroll' },
  { id: 'm_revive', max: 1, cost: 400, color: COLORS.pink, icon: 'revive' },
];

export function shopCost(item, lvl) {
  return Math.round(item.cost * Math.pow(1 + lvl * 0.75, 1.25) / 5) * 5;
}

// Требуемый опыт для перехода на следующий уровень
export function xpNeed(level) {
  // плавный рост: квадратичная кривая до 46-го уровня, дальше линейная.
  // Полная прокачка (около 130 уровней) получается ближе к 28-й минуте, а не к 10-й.
  const k = level - 1;
  if (k <= 45) return Math.floor(5 + 3.2 * k + 0.42 * k * k);
  return Math.floor(5 + 3.2 * 45 + 0.42 * 45 * 45 + 40 * (k - 45));
}


// ---------- Эволюции: оружие 8 ур. + нужная пассивка → эволюция из сундука босса ----------
export const EVOLVE = {
  blaster: { pass: 'multishot', id: 'ev_storm', color: COLORS.pink },
  orbit: { pass: 'area', id: 'ev_saturn', color: COLORS.yellow },
  nova: { pass: 'power', id: 'ev_supernova', color: COLORS.orange },
  lightning: { pass: 'crit', id: 'ev_thunder', color: COLORS.white },
  missile: { pass: 'haste', id: 'ev_salvo', color: COLORS.red },
  laser: { pass: 'pierce', id: 'ev_prism', color: COLORS.purple },
  saw: { pass: 'armor', id: 'ev_mill', color: COLORS.cyan },
  drone: { pass: 'magnet', id: 'ev_guard', color: COLORS.green },
};

// ---------- Герои: стартовое оружие и бонус ----------
// unlock: достижение, которое открывает героя бесплатно; cost — купить раньше за кристаллы
export const HEROES = [
  { id: 'h_neon', weapon: 'blaster', color: COLORS.cyan, cost: 0 },
  { id: 'h_guard', weapon: 'orbit', color: COLORS.pink, cost: 400, ach: 'boss1', mod: { hp: 0.3, armor: 0.1 } },
  { id: 'h_storm', weapon: 'lightning', color: COLORS.yellow, cost: 600, ach: 'kills1k', mod: { area: 0.15, cd: 0.08 } },
  { id: 'h_mech', weapon: 'drone', color: COLORS.green, cost: 800, ach: 'evo1', mod: { magnet: 0.3, xp: 0.1 } },
  { id: 'h_wreck', weapon: 'missile', color: COLORS.orange, cost: 1200, ach: 'win', mod: { dmg: 0.15, hp: -0.15 } },
  { id: 'h_pulse', weapon: 'nova', color: COLORS.purple, cost: 700, ach: 'chest10', mod: { hp: 0.15, regen: 0.6 } },
  { id: 'h_prism', weapon: 'laser', color: COLORS.red, cost: 900, ach: 'evo3', mod: { dmg: 0.1, cd: 0.05 } },
  { id: 'h_reaper', weapon: 'saw', color: COLORS.green, cost: 1000, ach: 'lvl50', mod: { speed: 0.12, area: 0.1 } },
];

// ---------- Арены ----------
// rule — особое правило: wind (ветер сносит всех), dark (видно только у фонаря), shrink (сужающаяся зона);
// reward — множитель кристаллов за сложное правило
export const ARENAS = [
  { id: 'a_grid', grid: 0x7846ff, stars: 0xa0a0ff, bg: 0x07031a, pillars: 0, order: ['boss', 'pulsar', 'hive', 'serpent', 'mirror', 'warden'] },
  { id: 'a_reef', grid: 0xff2e88, stars: 0xffa0d0, bg: 0x12031a, pillars: 0.55, pillarColor: 0xff66cc, ach: 't10', order: ['hive', 'serpent', 'boss', 'mirror', 'pulsar', 'warden'] },
  { id: 'a_core', grid: 0xff7a18, stars: 0xffc890, bg: 0x140705, pillars: 0.35, pillarColor: 0xffae00, ach: 't20', earlyStrikes: true, order: ['mirror', 'boss', 'serpent', 'pulsar', 'hive', 'warden'] },
  { id: 'a_wind', grid: 0x3dffd0, stars: 0xb0fff0, bg: 0x021412, pillars: 0, ach: 'kills1k', rule: 'wind', reward: 1.1, order: ['serpent', 'boss', 'warden', 'pulsar', 'hive', 'mirror'] },
  { id: 'a_dark', grid: 0x4d7cff, stars: 0x8090ff, bg: 0x020210, pillars: 0.3, pillarColor: 0x4d7cff, ach: 'evo1', rule: 'dark', reward: 1.2, order: ['hive', 'mirror', 'warden', 'boss', 'serpent', 'pulsar'] },
  { id: 'a_shrink', grid: 0xff3355, stars: 0xffa0b0, bg: 0x140208, pillars: 0, ach: 'win_calm', rule: 'shrink', reward: 1.15, order: ['pulsar', 'serpent', 'warden', 'hive', 'mirror', 'boss'] },
];

// ---------- Режимы и уровни угрозы ----------
// teMul/teAdd — как быстро растёт «время угрозы», hp/dmg — множители врагов, reward — множитель очков и кристаллов
export const MODES = {
  // быстрый забег для новичков: 5 минут, слабые враги, победа даёт награду и открывает следующий режим
  quick: { win: 300, teMul: 0.7, teAdd: 0, hp: 0.55, dmg: 0.5, rate: 0.7, reward: 0.4, stars: [100, 200, 300] },
  calm: { win: 900, teMul: 0.85, teAdd: 0, hp: 0.75, dmg: 0.6, rate: 0.85, reward: 0.6, stars: [300, 600, 900] },
  normal: { win: 1800, teMul: 1, teAdd: 0, hp: 1, dmg: 1, rate: 1, reward: 1, stars: [300, 600, 900, 1200, 1500, 1800] },
};
export const MAX_THREAT = 5;

// ---------- Кампания: короткие уровни с целями ----------
// win — сколько продержаться (секунды), arena, mut — особое правило, goals — две цели на 2-ю и 3-ю звезду.
// Типы целей: kills, bosses, level, chests, evo, hp (здоровье в конце не меньше n%).
export const CAMPAIGN = [
  { win: 180, arena: 'a_grid', goals: [['kills', 150], ['level', 8]] },
  { win: 180, arena: 'a_grid', goals: [['kills', 250], ['hp', 50]] },
  { win: 240, arena: 'a_reef', goals: [['bosses', 1], ['kills', 400]] },
  { win: 240, arena: 'a_reef', goals: [['chests', 2], ['level', 12]] },
  { win: 300, arena: 'a_core', goals: [['bosses', 1], ['hp', 50]] },
  { win: 300, arena: 'a_wind', goals: [['kills', 600], ['level', 15]] },
  { win: 360, arena: 'a_reef', goals: [['chests', 2], ['bosses', 2]] },
  { win: 360, arena: 'a_core', mut: 'mu_swarm', goals: [['kills', 1000], ['hp', 50]] },
  { win: 420, arena: 'a_grid', mut: 'mu_glass', goals: [['bosses', 2], ['level', 20]] },
  { win: 420, arena: 'a_reef', mut: 'mu_bosses', goals: [['bosses', 3], ['chests', 4]] },
  { win: 480, arena: 'a_dark', goals: [['bosses', 2], ['kills', 1500]] },
  { win: 600, arena: 'a_shrink', goals: [['bosses', 3], ['evo', 1]] },
];
export function campaignMode(i) {
  const c = CAMPAIGN[i] || CAMPAIGN[0];
  const k = i / (CAMPAIGN.length - 1); // 0 → 1 от первого уровня к последнему
  return {
    win: c.win,
    teMul: 0.72 + 0.33 * k,
    teAdd: 0,
    hp: 0.55 + 0.5 * k,
    dmg: 0.5 + 0.5 * k,
    rate: 0.72 + 0.3 * k,
    reward: 0.5 + 0.5 * k,
    stars: [],
    camp: true,
    level: i,
    // первый босс — к середине уровня; на первых двух уровнях нет «последней минуты» с боссами
    firstBoss: Math.min(180, Math.round(c.win * 0.45)),
    noFinale: i < 2,
  };
}
export function threatMode(k) {
  return { win: 1800, teMul: 1 + 0.04 * k, teAdd: 45 * k, hp: 1 + 0.08 * k, dmg: 1 + 0.1 * k, rate: 1 + 0.03 * k, reward: 1 + 0.5 * k, stars: [300, 600, 900, 1200, 1500, 1800], threat: k };
}
// испытание дня: 10 минут, герой, арена и особое правило выбираются по дате
export const DAILY_MODE = { win: 600, teMul: 1.25, teAdd: 60, hp: 1, dmg: 1, rate: 1.1, reward: 1, stars: [180, 360, 600], daily: true };
export const RUSH_MODE = { win: 0, teMul: 1, teAdd: 300, hp: 1, dmg: 1, rate: 0.5, reward: 1, stars: [], rush: true };
export const RUSH_BOSSES = 10;
// праздничный забег: 7 минут, средняя сложность, победа сразу завершает забег
export const EVENT_MODE = { win: 420, teMul: 0.85, teAdd: 0, hp: 0.75, dmg: 0.65, rate: 0.85, reward: 0.7, stars: [], event: true, firstBoss: 150, noFinale: true };
export const MUTATORS = ['mu_fast', 'mu_glass', 'mu_swarm', 'mu_bosses', 'mu_magnet'];

// ---------- Достижения ----------
export const ACHIEVEMENTS = [
  { id: 'first', r: 20, icon: 'play' },
  { id: 't5', r: 30, icon: 'clock' },
  { id: 't10', r: 50, icon: 'clock' },
  { id: 't20', r: 80, icon: 'clock' },
  { id: 'win_calm', r: 60, icon: 'star' },
  { id: 'win', r: 150, icon: 'trophy' },
  { id: 'boss1', r: 30, icon: 'skull' },
  { id: 'boss_all', r: 100, icon: 'skull' },
  { id: 'kills1k', r: 40, icon: 'skull' },
  { id: 'kills5k', r: 80, icon: 'skull' },
  { id: 'total50k', r: 100, icon: 'skull' },
  { id: 'evo1', r: 50, icon: 'evo' },
  { id: 'evo3', r: 100, icon: 'evo' },
  { id: 'evo_all', r: 150, icon: 'evo' },
  { id: 'lvl50', r: 60, icon: 'wisdom' },
  { id: 'six', r: 40, icon: 'blaster' },
  { id: 'chest10', r: 40, icon: 'chest' },
  { id: 'heroes', r: 100, icon: 'hero' },
  { id: 'arenas', r: 60, icon: 'arena' },
  { id: 'threat1', r: 150, icon: 'threat' },
  { id: 'threat5', r: 300, icon: 'threat' },
  { id: 'rush', r: 200, icon: 'rush' },
  { id: 'daily1', r: 50, icon: 'calendar' },
  { id: 'daily7', r: 150, icon: 'calendar' },
];

// ---------- Ежедневные задания ----------
// k — счётчик за день, n — цель, r — награда
export const QUESTS = [
  { id: 'q_kills', k: 'kills', n: [400, 800, 1500], r: [30, 50, 80] },
  { id: 'q_boss', k: 'bosses', n: [1, 2, 4], r: [30, 50, 80] },
  { id: 'q_time', k: 'maxTime', n: [300, 480, 720], r: [30, 50, 80] },
  { id: 'q_evo', k: 'evos', n: [1, 1, 2], r: [50, 50, 90] },
  { id: 'q_runs', k: 'runs', n: [2, 3, 4], r: [25, 35, 45] },
  { id: 'q_level', k: 'maxLevel', n: [20, 35, 50], r: [30, 50, 80] },
  { id: 'q_chest', k: 'chests', n: [1, 2, 3], r: [30, 45, 70] },
];
