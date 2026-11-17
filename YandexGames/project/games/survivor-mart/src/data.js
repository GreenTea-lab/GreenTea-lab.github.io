// Данные игры: товары, материалы, рецепты, вылазки, персонал, оружие, постройки, навыки, зомби, раскладка парковки

// ---------- товары (продаются с полок) ----------
// p — базовая цена в зарядах, dem — спрос, day — с какого дня покупатели о нём спрашивают
export const GOODS = {
  can: { p: 6, dem: 1.4, day: 1 },
  water: { p: 5, dem: 1.4, day: 1 },
  candle: { p: 5, dem: 0.9, day: 1 },
  bandage: { p: 7, dem: 1.0, day: 1 },
  seeds: { p: 8, dem: 0.7, day: 2 },
  blanket: { p: 14, dem: 0.7, day: 3 },
  ration: { p: 15, dem: 0.9, day: 2 },
  flashlight: { p: 20, dem: 0.8, day: 4 },
  medkit: { p: 24, dem: 0.8, day: 3 },
  tools: { p: 30, dem: 0.6, day: 5 },
  gasmask: { p: 36, dem: 0.5, day: 7 },
  radio: { p: 45, dem: 0.45, day: 8 },
};
export const GOOD_IDS = Object.keys(GOODS);

// ---------- материалы (для верстака и ремонта) ----------
export const MATS = ['scrap', 'wood', 'cloth', 'chem', 'parts'];
export const DEFENSE = ['trap'];

// ---------- рецепты верстака: lvl — уровень верстака ----------
export const RECIPES = [
  { id: 'ration', in: { can: 1, water: 1 }, out: 1, time: 6, lvl: 0 },
  { id: 'bandage', in: { cloth: 2 }, out: 2, time: 5, lvl: 0 },
  { id: 'candle', in: { chem: 1, scrap: 1 }, out: 3, time: 6, lvl: 0 },
  { id: 'trap', in: { scrap: 3, parts: 1 }, out: 1, time: 7, lvl: 0 },
  { id: 'wood', in: { scrap: 3 }, out: 2, time: 5, lvl: 0 },
  { id: 'blanket', in: { cloth: 3 }, out: 1, time: 7, lvl: 1 },
  { id: 'medkit', in: { bandage: 2, chem: 1 }, out: 1, time: 8, lvl: 1 },
  { id: 'flashlight', in: { parts: 2, scrap: 1 }, out: 1, time: 9, lvl: 2 },
  { id: 'tools', in: { scrap: 2, wood: 1, parts: 1 }, out: 1, time: 10, lvl: 2 },
  { id: 'gasmask', in: { cloth: 2, chem: 1, parts: 1 }, out: 1, time: 11, lvl: 3 },
  { id: 'radio', in: { parts: 3, scrap: 2 }, out: 1, time: 12, lvl: 3 },
];

// ---------- вылазки ----------
export const LOCS = [
  { id: 'market', cost: 0, danger: 0.04, loot: { can: 4, water: 4, candle: 2, seeds: 2, scrap: 2 } },
  { id: 'pharmacy', cost: 150, danger: 0.08, loot: { bandage: 4, chem: 3, cloth: 2, medkit: 1 } },
  { id: 'hardware', cost: 320, danger: 0.1, loot: { wood: 4, scrap: 4, parts: 2, tools: 1 } },
  { id: 'sewing', cost: 500, danger: 0.12, loot: { cloth: 5, blanket: 2, scrap: 1 } },
  { id: 'radiomarket', cost: 800, danger: 0.15, loot: { parts: 4, flashlight: 2, radio: 1, scrap: 2 } },
  { id: 'hospital', cost: 1200, danger: 0.18, loot: { medkit: 2, chem: 3, bandage: 3, gasmask: 1 } },
  { id: 'base', cost: 1800, danger: 0.22, loot: { ration: 3, gasmask: 2, parts: 3, bat: 3 } },
];

// ---------- персонал ----------
export const ROLES = ['scav', 'cashier', 'stocker', 'guard'];
export const WAGE = [0, 8, 13, 19, 26, 34]; // по уровню
export const TRAIN_COST = [0, 0, 90, 200, 380, 650]; // переход на уровень
export const NAMES_RU = ['Степан', 'Люся', 'Гоша', 'Нина', 'Петрович', 'Тома', 'Жора', 'Варя', 'Сеня', 'Зина', 'Михалыч', 'Ася', 'Борис', 'Галя', 'Тимоха', 'Даша', 'Лёва', 'Оля', 'Федя', 'Маруся', 'Кузьма', 'Вера', 'Савва', 'Рита'];
export const NAMES_EN = ['Stan', 'Lucy', 'Gus', 'Nina', 'Pete', 'Tammy', 'Joe', 'Wendy', 'Sam', 'Zoe', 'Mack', 'Amy', 'Bob', 'Gail', 'Tim', 'Dot', 'Leo', 'Olive', 'Fred', 'Mary', 'Kit', 'Vera', 'Sid', 'Rita'];

// ---------- оружие ----------
// ranged: стреляет с дистанции; arc: бьёт всех в секторе
export const WEAPONS = [
  { id: 'pin', dmg: 10, range: 1.5, cd: 0.55, cost: 0, mats: {} },
  { id: 'bat', dmg: 17, range: 1.7, cd: 0.6, cost: 140, mats: { wood: 3 } },
  { id: 'sling', dmg: 11, range: 7, cd: 0.5, cost: 260, mats: { cloth: 2, wood: 2 }, ranged: true },
  { id: 'shovel', dmg: 26, range: 1.95, cd: 0.75, cost: 420, mats: { scrap: 4, wood: 2 }, arc: true },
  { id: 'nailgun', dmg: 13, range: 8, cd: 0.24, cost: 950, mats: { parts: 5, scrap: 4 }, ranged: true },
  { id: 'axe', dmg: 48, range: 2.0, cd: 0.8, cost: 1500, mats: { scrap: 5, wood: 3, parts: 2 }, arc: true },
];

// ---------- постройки ----------
export const BUILD = {
  shelves: { cost: [90, 170, 280, 430, 640, 900], max: 6 }, // +1 полка за уровень (старт 4)
  sign: { cost: [110, 260, 520, 900], max: 4 },
  walls: { cost: [120, 270, 500, 820, 1250], max: 5 },
  beds: { cost: [80, 200, 400, 700], max: 4 }, // мест для персонала = 1 + уровень
  bench: { cost: [160, 420, 900], max: 3 },
  register: { cost: [120, 300, 620], max: 3 },
  radio: { cost: [1000, 1600, 2300, 3200, 4200], mats: [{ parts: 4, scrap: 6 }, { parts: 6, wood: 6 }, { parts: 8, scrap: 8 }, { parts: 10, chem: 4 }, { parts: 12, cloth: 6 }], max: 5 },
};
export const BUILD_IDS = Object.keys(BUILD);
export const START_SHELVES = 4;

// ---------- навыки: 4 ветки по 4 ступени ----------
export const SKILLS = { serv: 4, surv: 4, mgmt: 4, craft: 4 };
export const xpNeed = (lvl) => Math.round(60 * Math.pow(lvl, 1.35));

// ---------- зомби ----------
// from — с какого дня появляется, w — вес в случайном выборе, bar — урон баррикаде за удар
// armor — множитель входящего урона (ближний бой / издалека)
export const ZOMBIES = {
  walker: { hp: 30, sp: 1.05, dmg: 7, bar: 6, r: 0.34, from: 1, w: 1 },
  crawler: { hp: 16, sp: 1.2, dmg: 5, bar: 3, r: 0.3, from: 2, w: 0.45 },
  runner: { hp: 18, sp: 2.15, dmg: 5, bar: 4, r: 0.3, from: 3, w: 0.4 },
  screamer: { hp: 22, sp: 1.1, dmg: 4, bar: 3, r: 0.32, from: 4, w: 0.22 },
  thief: { hp: 24, sp: 1.55, dmg: 3, bar: 5, r: 0.32, from: 5, w: 0.25 },
  brute: { hp: 115, sp: 0.68, dmg: 15, bar: 18, r: 0.5, from: 5, w: 0.18 },
  spitter: { hp: 26, sp: 0.95, dmg: 8, bar: 4, r: 0.34, from: 6, w: 0.24 },
  bloater: { hp: 26, sp: 0.9, dmg: 28, bar: 45, r: 0.42, from: 7, w: 0.2 },
  hardhat: { hp: 60, sp: 0.95, dmg: 9, bar: 10, r: 0.36, from: 8, w: 0.28, armor: [0.65, 0.35] },
  boss: { hp: 620, sp: 0.75, dmg: 22, bar: 30, r: 0.7, from: 99, w: 0 },
};
export const Z_IDS = Object.keys(ZOMBIES);
export const isHorde = (d) => d % 3 === 0 || d % 10 === 0;
export const isBoss = (d) => d % 10 === 0;
// сколько зомби придёт ночью
export const nightCount = (d) => Math.round((4 + d * 1.1) * (isHorde(d) ? 1.7 : 1));
// сколько забредёт днём: с 2-го дня, с каждым днём чаще
export const dayZCount = (d) => (d < 2 ? 0 : Math.min(7, 0.35 + (d - 1) * 0.42));
// новые виды по дням
export const newZombiesOn = (d) => Z_IDS.filter((k) => ZOMBIES[k].from === d);

// ночь: 20:00 → 6:00 следующего дня (часы 20..30)
export const NIGHT_H0 = 20,
  NIGHT_H1 = 30;
// ночью места поиска наполняются снова: добыча реже, но ценнее
export const NIGHT_LOOT = { parts: 2, chem: 2, scrap: 2, wood: 2, bat: 3, bandage: 1, medkit: 0.4 };
// раскладушка продавца
export const COT = { x: -1.6, z: -10.55 };
// лечение: бинт и аптечка со склада
export const HEAL = { bandage: 30, medkit: 75 };

// ---------- магазин монет ----------
export const COIN_PACKS = { coins_1000: 1000, coins_3500: 3500, coins_10000: 10000 };

// ---------- раскладка (метры; x вправо, z к камере) ----------
export const SHOP = { x0: -8, x1: 8, z0: -12, z1: -3 }; // внутренность лавки
export const LOT = { x0: -21, x1: 21, z0: -14, z1: 14 };
export const ROAD = { z0: 15, z1: 21 };
// проёмы в передней стене: дверь и два окна
export const ENTRIES = [
  { id: 'door', x: 0, w: 2.0, door: true },
  { id: 'winL', x: -4.6, w: 2.0 },
  { id: 'winR', x: 4.6, w: 2.0 },
];
export const FRONT_Z = -3; // внутренняя грань передней стены
export const WALL_T = 0.3;
// полки: 10 мест, открываются по порядку
export const SHELF_SLOTS = [
  [-6.4, -9.0], [-4.3, -9.0], [-2.2, -9.0], [-6.4, -6.3], [-4.3, -6.3], [-2.2, -6.3], [-0.1, -9.0], [-0.1, -6.3], [2.0, -9.0], [2.0, -6.3],
];
export const SHELF_W = 1.7, SHELF_D = 0.62, SHELF_CAP = 8;
export const REG = { x: 5.6, z: -6.6, w: 2.8, d: 0.8 }; // прилавок с кассой
export const REG_SPOT = { x: 5.6, z: -7.65 }; // где стоит продавец
export const QUEUE = [[5.6, -5.55], [5.6, -4.6], [5.6, -3.7], [4.4, -3.6], [3.3, -3.6], [2.2, -3.65]];
export const STORAGE = { x: 5.6, z: -10.2 }; // точка у склада
export const BENCH = { x: -5.6, z: -10.35 };
export const GUARD_NIGHT = { x: 0, z: -1.5 }; // ночью охранник стоит снаружи у двери
export const GUARD_DAY = { x: 1.9, z: -1.5 };
export const DRIVE = { x0: -3.2, x1: 3.2 }; // въезд на парковку с дороги
// места поиска: машины, тележки, баки, ящики
export const LOOT_SPOTS = [
  { id: 'car1', kind: 'sedan', x: -12.5, z: 3.5, ry: 0.25, col: '#e8705a', ix: -12.1, iz: 6.0 },
  { id: 'car2', kind: 'hatch', x: 11.5, z: 6.5, ry: -0.35, col: '#5aa8e0', ix: 10.6, iz: 8.6 },
  { id: 'van', kind: 'van', x: -15.5, z: -6.5, ry: Math.PI / 2, col: '#f2e6c8', ix: -12.6, iz: -6.5 },
  { id: 'pickup', kind: 'pickup', x: 15.2, z: -5.0, ry: -Math.PI / 2 + 0.15, col: '#7cc06a', ix: 12.3, iz: -4.6 },
  { id: 'trolley1', kind: 'trolley', x: -6.5, z: 8.0, ry: 0.6, ix: -6.5, iz: 8.9 },
  { id: 'trolley2', kind: 'trolley', x: 7.2, z: 1.6, ry: -0.9, ix: 7.2, iz: 2.6 },
  { id: 'dump1', kind: 'dumpster', x: -17.5, z: 9.5, ry: 0.2, ix: -17.3, iz: 11.0 },
  { id: 'bins', kind: 'bins', x: -10.0, z: -1.7, ry: 0, ix: -10.0, iz: -0.5 },
  { id: 'crates', kind: 'crates', x: 10.2, z: -1.2, ry: 0.1, ix: 10.0, iz: 0.2 },
  { id: 'vend', kind: 'vending', x: 9.2, z: -7.5, ry: -Math.PI / 2, ix: 10.2, iz: -7.5 },
  { id: 'dump2', kind: 'dumpster', x: 17.5, z: 10.5, ry: -0.3, ix: 17.0, iz: 12.0 },
];
// лут в местах поиска
export const SPOT_LOOT = {
  sedan: { can: 2, water: 2, cloth: 1, parts: 1, bat: 2 },
  hatch: { water: 2, candle: 1, bandage: 1, cloth: 1, bat: 2 },
  van: { can: 2, wood: 2, scrap: 2, tools: 0.3, bat: 1 },
  pickup: { wood: 2, scrap: 2, parts: 1, bat: 1 },
  trolley: { can: 2, water: 2, seeds: 1, candle: 1 },
  dumpster: { scrap: 2, wood: 1, cloth: 1, chem: 1 },
  bins: { scrap: 1, cloth: 1, can: 1, water: 1 },
  crates: { wood: 3, scrap: 1, can: 1 },
  vending: { water: 3, can: 1, bat: 2 },
};
// капканы перед проёмами
export const TRAP_SLOTS = [
  [-1.2, -1.3], [1.2, -1.3], [-4.6, -1.4], [4.6, -1.4], [-2.6, 0.4], [2.6, 0.4],
];
