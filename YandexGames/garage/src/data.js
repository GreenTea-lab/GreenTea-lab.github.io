// Данные игры: модели (цена, уровень, годы), цвета, улучшения гаража, тюнинг, продавцы, покупатели, уровни.
export const CARS = [
  { id: 'lastochka', base: 60000, lvl: 1, years: [1972, 1988] },
  { id: 'klin', base: 76000, lvl: 1, years: [1984, 1999] },
  { id: 'puzyr', base: 92000, lvl: 2, years: [1962, 1975] },
  { id: 'kozlik', base: 140000, lvl: 3, years: [1979, 1996] },
  { id: 'karavai', base: 130000, lvl: 4, years: [1975, 1994] },
  { id: 'fermer', base: 190000, lvl: 5, years: [1986, 2002] },
  { id: 'baron', base: 310000, lvl: 7, years: [1988, 1996] },
  { id: 'shustrik', base: 380000, lvl: 9, years: [2002, 2010] },
  { id: 'samurai', base: 720000, lvl: 11, years: [1991, 1999] },
  { id: 'bizon', base: 1150000, lvl: 14, years: [1968, 1972] },
  { id: 'molniya', base: 3200000, lvl: 17, years: [1985, 1992] },
];
export const CAR = Object.fromEntries(CARS.map((c) => [c.id, c]));
// классика ценится коллекционерами
export const CLASSIC = new Set(['lastochka', 'puzyr', 'karavai', 'bizon', 'molniya']);

// цвета кузова: обычные, металлик (покрасочная камера 2), перламутр (камера 3)
export const PAINTS = [
  { c: 0xc0392b, k: 'red' }, { c: 0x2a6ad0, k: 'blue' }, { c: 0xf2f2ee, k: 'white' }, { c: 0x18181c, k: 'black' },
  { c: 0x2f8f4e, k: 'green' }, { c: 0xf0b020, k: 'yellow' }, { c: 0xe86a1a, k: 'orange' }, { c: 0xd8c8a8, k: 'beige' },
  { c: 0x8a8e94, k: 'silver', m: 1 }, { c: 0x1f5a6a, k: 'teal', m: 1 }, { c: 0x7a1f6a, k: 'plum', m: 1 }, { c: 0x8a1a1a, k: 'cherry', m: 1 },
  { c: 0x2a3a8a, k: 'navy', m: 1 }, { c: 0x4a6a2a, k: 'olive', m: 1 },
  { c: 0xff3a8a, k: 'pink', m: 2 }, { c: 0x3affc8, k: 'mint', m: 2 }, { c: 0xffd23a, k: 'gold', m: 2 }, { c: 0x9a5aff, k: 'violet', m: 2 },
];

// улучшения гаража: цены по уровням
export const UPGRADES = [
  { id: 'tools', max: 5, cost: [40000, 120000, 300000, 700000, 1500000], lvl: 1 }, // −8% к цене работ за уровень
  { id: 'booth', max: 3, cost: [60000, 250000, 900000], lvl: 2 }, // 1: полная покраска, 2: металлик, 3: перламутр
  { id: 'scanner', max: 1, cost: [90000], lvl: 3 }, // видно скрытое состояние в объявлениях
  { id: 'washer', max: 2, cost: [30000, 160000], lvl: 1 }, // 1: керхер (большая кисть), 2: автомойка
  { id: 'contacts', max: 3, cost: [70000, 260000, 800000], lvl: 2 }, // больше объявлений, выгоднее продавцы
  { id: 'adverts', max: 3, cost: [50000, 200000, 650000], lvl: 3 }, // покупатели приходят чаще и щедрее
  { id: 'tuning', max: 1, cost: [150000], lvl: 5 }, // открывает тюнинг
];
export const UP = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

// тюнинг: доля базовой цены за установку; ценность для разных покупателей
export const TUNING = [
  { id: 'rims', cost: 0.05, val: 0.05, opts: ['spoke5', 'multi', 'star', 'turbine', 'deep'] },
  { id: 'spoiler', cost: 0.035, val: 0.03, opts: [1, 2] },
  { id: 'stripes', cost: 0.025, val: 0.025, opts: [0xffffff, 0x18181c, 0xffd23a, 0xc0392b] },
  { id: 'stance', cost: 0.03, val: 0.03, opts: [1] },
  { id: 'caliper', cost: 0.012, val: 0.01, opts: [0xd02020, 0xf0c020, 0x2a6ad0] },
  { id: 'rimColor', cost: 0.01, val: 0.008, opts: ['black', 'gold'] },
];

// продавцы: насколько завышают цену, честность, терпение, уступчивость
export const SELLERS = [
  { id: 'granddad', ask: [0.95, 1.15], min: [0.72, 0.85], honest: 1, pat: [4, 6], give: 0.35 },
  { id: 'granny', ask: [0.75, 0.95], min: [0.6, 0.75], honest: 1, pat: [3, 5], give: 0.3 },
  { id: 'flipper', ask: [1.2, 1.5], min: [0.92, 1.05], honest: 0, pat: [2, 3], give: 0.25 },
  { id: 'student', ask: [0.9, 1.15], min: [0.68, 0.82], honest: 0.5, pat: [3, 4], give: 0.45 },
  { id: 'boss', ask: [1.05, 1.25], min: [0.9, 1.0], honest: 0.7, pat: [1, 2], give: 0.2 },
  { id: 'farmer', ask: [0.9, 1.2], min: [0.74, 0.88], honest: 0.8, pat: [3, 5], give: 0.35 },
];
// покупатели: что ценят
export const BUYERS = [
  { id: 'student', k: [0.78, 0.95], w: { price: 1 } },
  { id: 'taxi', k: [0.85, 1.05], w: { mech: 1 } },
  { id: 'family', k: [0.88, 1.06], w: { comfort: 1 } },
  { id: 'tuner', k: [0.85, 1.05], w: { tuning: 1 } },
  { id: 'collector', k: [0.95, 1.25], w: { classic: 1 } },
  { id: 'dealer', k: [0.72, 0.8], w: {} },
];

// опыт до следующего уровня
export const xpNeed = (lvl) => Math.round(40 * Math.pow(lvl, 1.3));
export const MAX_LVL = 30;

// детали кузова и их «вес» в состоянии
export const PANEL_W = { hood: 1.1, trunk: 0.8, roof: 1.2, doorL: 1, doorR: 1, fenderL: 0.8, fenderR: 0.8, quarterL: 0.9, quarterR: 0.9, bumperF: 0.5, bumperR: 0.5 };
export const SYSTEMS = ['engine', 'gearbox', 'suspension', 'brakes', 'interior', 'glass', 'lights', 'tires'];
export const HIDDEN = new Set(['engine', 'gearbox', 'suspension', 'brakes']);
// вклад систем в общее состояние
export const QW = { body: 0.2, paint: 0.15, engine: 0.2, gearbox: 0.08, suspension: 0.09, brakes: 0.05, interior: 0.09, glass: 0.05, lights: 0.03, tires: 0.06 };
