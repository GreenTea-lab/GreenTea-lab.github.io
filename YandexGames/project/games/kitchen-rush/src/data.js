// Данные игры: продукты, рецепты, уровни, миры, улучшения, повара

// продукты: chop — режется на доске; pot — нарезанный варится в кастрюле (суп);
// potRaw — сырой кладётся в кастрюлю (рис); pan — нарезанный жарится на сковороде
export const ING = {
  tomato: { chop: true, pot: true, col: '#ff5a4a' },
  onion: { chop: true, pot: true, col: '#d9a3e0' },
  mushroom: { chop: true, pot: true, col: '#c8956a' },
  lettuce: { chop: true, col: '#7bd65a' },
  bun: { col: '#f2b25c' },
  meat: { chop: true, pan: true, col: '#f07a7a' },
  cheese: { chop: true, col: '#ffd34a' },
  fish: { chop: true, pan: true, col: '#7fb8e8' },
  potato: { chop: true, pan: true, col: '#d8b070' },
  rice: { potRaw: true, col: '#f4f1e6' },
  nori: { col: '#2f5a3a' },
};

// буква на карте → ящик с продуктом
export const CRATE = { T: 'tomato', O: 'onion', M: 'mushroom', L: 'lettuce', B: 'bun', Y: 'meat', H: 'cheese', F: 'fish', P: 'potato', R: 'rice', N: 'nori' };

// рецепты: parts — что лежит на тарелке («продукт:состояние»), soup — суп из трёх нарезанных
// value — очки за блюдо, pat — терпение гостя (с)
export const RECIPES = {
  soup_t: { soup: 'tomato', value: 30, pat: 85 },
  soup_o: { soup: 'onion', value: 30, pat: 85 },
  soup_m: { soup: 'mushroom', value: 30, pat: 85 },
  salad: { parts: ['lettuce:chop', 'tomato:chop'], value: 25, pat: 65 },
  burger: { parts: ['bun:raw', 'meat:cook'], value: 30, pat: 75 },
  burger_c: { parts: ['bun:raw', 'meat:cook', 'cheese:chop'], value: 40, pat: 90 },
  burger_d: { parts: ['bun:raw', 'meat:cook', 'lettuce:chop', 'tomato:chop'], value: 50, pat: 100 },
  fries: { parts: ['potato:cook'], value: 20, pat: 60 },
  fishchips: { parts: ['fish:cook', 'potato:cook'], value: 45, pat: 95 },
  onigiri: { parts: ['nori:raw', 'rice:cook'], value: 25, pat: 75 },
  sushi: { parts: ['nori:raw', 'rice:cook', 'fish:chop'], value: 45, pat: 95 },
};

export const SOUP_N = 3;

export const THEMES = ['home', 'beach', 'snow', 'night'];
export const THEME_COL = { home: ['#ffcf8a', '#f08a4a'], beach: ['#8fe0ff', '#3aa6e0'], snow: ['#d9ecff', '#7ea6e8'], night: ['#a58cf0', '#4a3a9a'] };

// Легенда карт:
// . пол  i лёд  1 2 старт поваров  (пробел) пусто
// c стол  x разделочная доска  s плита с кастрюлей  f плита со сковородой
// p тарелки  w окно выдачи  d возврат грязной посуды  k мойка  g мусорка  e стол с огнетушителем
// > < ^ v конвейер (стол, который везёт предметы)
// заглавные — ящики с продуктами (см. CRATE)
export const LEVELS = [
  // ---------- Мир 1: Домашняя кухня ----------
  {
    theme: 'home', time: 150, menu: ['soup_t'], stars: [90, 180, 280], maxOrders: 3, plates: 3, tut: 'basic',
    map: ['cTcxcxcsscc', 'c.........c', 'c.........w', 'p..1...2..c', 'c.........c', 'c.........g', 'ccccccccccc'],
  },
  {
    theme: 'home', time: 165, menu: ['soup_t', 'soup_o'], stars: [70, 130, 210], maxOrders: 3, plates: 3,
    map: ['cTcOcxcxcssc', 'c..........c', 'c..........w', 'p..1cc..2..c', 'c...cc.....c', 'c..........g', 'cccccccccccc'],
  },
  {
    theme: 'home', time: 165, menu: ['salad', 'soup_t'], stars: [90, 180, 260], maxOrders: 3, plates: 4,
    map: ['ccLcTcxcxcccc', 'c...........s', 'p...........s', 'c...ccccc...c', 'c..1.....2..c', 'c...........g', 'ccccccwcccccc'],
  },
  {
    theme: 'home', time: 180, menu: ['soup_t', 'soup_o'], stars: [150, 290, 420], maxOrders: 3, plates: 3, tut: 'split',
    map: ['cTcOcxccsscpc', 'c.....c.....c', 'x..1..c..2..w', 'c.....c.....c', 'c.....c.....c', 'c.....c.....g', 'ccccccccccccc'],
  },
  {
    theme: 'home', time: 180, menu: ['soup_m', 'soup_o', 'salad'], stars: [80, 150, 210], maxOrders: 4, plates: 4,
    map: ['ccMcOcxcxcssc', 'c...........s', 'L...........c', 'c...cc.cc...w', 'c..1.....2..c', 'T...........c', 'c...........g', 'ccpcccccccccc'],
  },
  // ---------- Мир 2: Пляжное кафе ----------
  {
    theme: 'beach', time: 165, menu: ['burger'], stars: [140, 270, 390], maxOrders: 3, plates: 3, tut: 'pan',
    map: ['cYcxcxcffcc', 'c.........c', 'B.........w', 'c...cc....c', 'p.1....2..c', 'c.........g', 'ccccccccccc'],
  },
  {
    theme: 'beach', time: 180, menu: ['burger', 'fries'], stars: [90, 170, 240], maxOrders: 4, plates: 3, dirty: true, tut: 'sink',
    map: ['cYcPcxcxcffcc', 'c...........c', 'B...........w', 'c....ccc....d', 'k..1.....2..c', 'c...........g', 'cpccccccccccc'],
  },
  {
    theme: 'beach', time: 180, menu: ['burger_c', 'burger'], stars: [150, 300, 430], maxOrders: 3, plates: 3, dirty: true,
    map: ['cYcHcxcccffcc', 'c......c....c', 'B..1...c..2.w', 'c......c....d', 'x......c....k', 'c......c....g', 'ccccccccpcccc'],
  },
  {
    theme: 'beach', time: 180, menu: ['fishchips', 'fries'], stars: [90, 190, 270], maxOrders: 4, plates: 3, dirty: true,
    map: ['cFcPcxcxcffcc', 'c...........f', 'c...........c', 'p...cc.cc...w', 'c..1.....2..d', 'c...........k', 'c...........g', 'ccccccccccccc'],
  },
  {
    theme: 'beach', time: 195, menu: ['burger_d', 'burger_c'], stars: [70, 140, 210], maxOrders: 4, plates: 4, dirty: true, fire: true, tut: 'fire',
    map: ['cYcHcLcTcxcxcc', 'c............f', 'B............f', 'c....cccc....w', 'e..1......2..d', 'c............k', 'c............g', 'ccpccccccccccc'],
  },
  // ---------- Мир 3: Горное шале (лёд) ----------
  {
    theme: 'snow', time: 180, menu: ['onigiri', 'soup_m'], stars: [100, 190, 270], maxOrders: 4, plates: 4, tut: 'ice',
    map: ['cRcNcMcxcxssc', 'c...........s', 'c...iiiii...w', 'p..1iiiii2..c', 'c...iiiii...c', 'c...........g', 'ccccccccccccc'],
  },
  {
    theme: 'snow', time: 180, menu: ['sushi', 'onigiri'], stars: [80, 160, 230], maxOrders: 4, plates: 3, dirty: true,
    map: ['cFcRcNcxcxcsc', 'c...........s', 'c..iii.iii..c', 'c..iii.iii..w', 'p.1.......2.d', 'c...........k', 'cccccccccccgc'],
  },
  {
    theme: 'snow', time: 195, menu: ['soup_t', 'soup_o', 'soup_m'], stars: [110, 210, 300], maxOrders: 4, plates: 4,
    map: ['cTcOcMccsscsc', 'ciiiiic.....c', 'x.1..ic..2..w', 'ciiiiic.....c', 'x....ic.....p', 'ciiiiic.....g', 'ccccccccccccc'],
  },
  {
    theme: 'snow', time: 195, menu: ['sushi', 'soup_t'], stars: [100, 190, 280], maxOrders: 4, plates: 3, dirty: true, fire: true,
    map: ['cFcRcNcTcxcxc', 'c...........s', 'e...i...i...s', 'c..iii.iii..w', 'c...i...i...d', 'p.1.......2.k', 'ccccccccccgcc'],
  },
  {
    theme: 'snow', time: 210, menu: ['sushi', 'onigiri', 'soup_m', 'soup_o'], stars: [70, 130, 190], maxOrders: 4, plates: 4, dirty: true, fire: true,
    map: ['cFcRcNcMcOcxcxc', 'c.............s', 'c...iii.iii...s', 'e...iii.iii...s', 'c.............w', 'p..1.cccc..2..d', 'c.............k', 'cccccccccccccgc'],
  },
  // ---------- Мир 4: Ночная ярмарка (конвейеры) ----------
  {
    theme: 'night', time: 180, menu: ['burger', 'burger_c'], stars: [190, 370, 540], maxOrders: 3, plates: 4, tut: 'belt',
    map: ['cYcB>>>>>>cffcc', 'x.....c.......c', 'H..1..c...2...w', 'x.....c.......c', 'c.....c.......p', 'c.....c.......g', 'ccccccccccccccc'],
  },
  {
    theme: 'night', time: 195, menu: ['sushi', 'fishchips'], stars: [90, 170, 250], maxOrders: 4, plates: 3, dirty: true,
    map: ['cFcRcNcPcxcxsfc', 'c.............f', 'c...v.....v...w', 'p...v.....v...d', 'c...v.....v...k', 'c..1......2...g', 'ccccccccccccccc'],
  },
  {
    theme: 'night', time: 195, menu: ['burger_d', 'burger_c'], stars: [80, 150, 220], maxOrders: 4, plates: 3, dirty: true, fire: true,
    map: ['cYcHc>>>>>>>ffc', 'x......c......c', 'L..1...c...2..w', 'T......c......d', 'x......c......k', 'B......c......e', 'ccccccccccpcgcc'],
  },
  {
    theme: 'night', time: 210, menu: ['sushi', 'soup_m', 'soup_o'], stars: [60, 120, 170], maxOrders: 4, plates: 4, dirty: true, fire: true,
    map: ['cFcRcNcxcxcsssc', 'c.............c', 'M..iiii.iiii..w', 'O..i>>>>>>>i..d', 'e..iiii.iiii..k', 'c..1.......2..c', 'p.............g', 'ccccccccccccccc'],
  },
  {
    theme: 'night', time: 210, menu: ['burger_c', 'sushi', 'soup_t'], stars: [140, 280, 410], maxOrders: 4, plates: 4, dirty: true, fire: true,
    map: ['cYcFcR>>>>>>ffc', 'x......c......s', 'N......c......s', 'T..1...c...2..w', 'B......c......d', 'x......c......k', 'H......c......g', 'cccccccccpccecc'],
  },
];

// улучшения кухни: 5 уровней
export const UPGRADES = ['knife', 'shoes', 'stove', 'patience', 'tips'];
export const UP_MAX = 5;
export const UP_COST = [120, 300, 600, 1000, 1600];

export function upEffect(up) {
  const u = (k) => (up && up[k]) || 0;
  return {
    chop: 1 - 0.09 * u('knife'), // время нарезки ×
    speed: 1 + 0.06 * u('shoes'), // скорость бега ×
    cook: 1 + 0.1 * u('stove'), // скорость готовки ×
    patience: 1 + 0.08 * u('patience'), // терпение гостей ×
    tips: 1 + 0.2 * u('tips'), // чаевые ×
  };
}

// повара-зверята: цена в монетах (0 — есть сразу)
export const CHEFS = [
  { id: 'cat', price: 0, body: '#ffb35c', belly: '#fff1dc', ear: 'cat', inner: '#ff9db0' },
  { id: 'dog', price: 0, body: '#d9a66e', belly: '#fff3e2', ear: 'dog', inner: '#9a6a44' },
  { id: 'bunny', price: 600, body: '#f4f0f6', belly: '#ffffff', ear: 'bunny', inner: '#ffb0c4' },
  { id: 'bear', price: 900, body: '#a8754e', belly: '#e9c9a4', ear: 'bear', inner: '#e9c9a4' },
  { id: 'panda', price: 1300, body: '#f7f7f7', belly: '#ffffff', ear: 'panda', inner: '#333a44', patch: '#333a44' },
  { id: 'fox', price: 1800, body: '#ff8a3c', belly: '#fff4ea', ear: 'fox', inner: '#3a2a2a' },
  { id: 'penguin', price: 2400, body: '#39465e', belly: '#fffaf0', ear: 'none', inner: '#ffb43a', beak: '#ffb43a' },
  { id: 'frog', price: 3000, body: '#7ed36a', belly: '#e9fbd6', ear: 'frog', inner: '#ff9db0' },
];

// фартуки двух поваров (цвет-метка, кем сейчас управляешь)
export const APRON = ['#4aa3ff', '#ff6b8a'];

// разобрать карту уровня
export function parseLevel(i) {
  const L = LEVELS[i];
  const rows = L.map;
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  return { L, W, H, at: (x, z) => (z >= 0 && z < H && x >= 0 && x < W ? rows[z][x] || ' ' : ' ') };
}

export const STAR_COINS = 40;
