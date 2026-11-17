// Данные: наборы костей, столы, места, экономика

// наборы костей: body — цвет кости, pip — цвет точек (или pips — свой цвет для каждого числа),
// pin — заклёпка в центре, edge — рамка вокруг половинок, wood — древесный рисунок
export const TILE_SETS = [
  { id: 'ivory', price: 0, body: '#f3ead6', pip: '#2a2420', line: '#5a4a3c', pin: 'brass' },
  { id: 'rainbow', price: 0, body: '#f6f0e2', pips: ['#000', '#d8383c', '#2f78d4', '#2c9a4c', '#8a44c4', '#e67a1c', '#178f9c'], line: '#7a6a5a', pin: 'brass' },
  { id: 'ebony', price: 600, body: '#262322', pip: '#f6efe0', line: '#8a8178', pin: 'silver', rough: 0.28 },
  { id: 'wood', price: 900, body: '#c99158', wood: true, pip: '#3a2312', line: '#5c3a1e', pin: 'none', rough: 0.55 },
  { id: 'gzhel', price: 1300, body: '#fbfcff', pip: '#1e4ea6', line: '#1e4ea6', edge: '#1e4ea6', pin: 'silver' },
  { id: 'jade', price: 1800, body: '#4aa37f', pip: '#fff8df', line: '#d8f0e2', pin: 'gold', rough: 0.22 },
  { id: 'cherry', price: 2400, body: '#b3222c', pip: '#ffd45a', line: '#ffcf5a', edge: '#e8b23c', pin: 'gold', rough: 0.2 },
  { id: 'pearl', price: 3200, body: '#eef2f5', pips: ['#000', '#c2453f', '#3466b0', '#2f8f5b', '#7f4bb5', '#c97b22', '#2a8594'], line: '#b9a46a', edge: '#c9b071', pin: 'gold', rough: 0.15, pearl: true },
];

// столы: cloth — скатерть поверх дерева
export const TABLES = [
  { id: 'oilcloth', price: 0, cloth: true },
  { id: 'oak', price: 500 },
  { id: 'felt', price: 900 },
  { id: 'lace', price: 1400, cloth: true },
  { id: 'chintz', price: 1900, cloth: true },
  { id: 'walnut', price: 2600 },
];

// места (окружение стола)
export const PLACES = [
  { id: 'summer', price: 0, mood: 'game' },
  { id: 'evening', price: 2500, mood: 'night' },
  { id: 'autumn', price: 3500, mood: 'game' },
  { id: 'winter', price: 5000, mood: 'night' },
];

export const START_COINS = 300;
// монеты за победу в партии по сложности; за каждый выигранный кон — ROUND_COINS
export const WIN_COINS = [60, 100, 150];
export const ROUND_COINS = 10;
export const LOSE_COINS = 15; // утешительные за доигранную партию
// рейтинг (лидерборд): очки за победу в партии
export const RATING = [10, 20, 35];
export const AD_COINS = 100; // монеты за ролик в магазине
export const AD_COOLDOWN = 3 * 60 * 1000;
export const DAILY = [100, 150, 200, 250, 300, 400, 600];
export const TARGETS = [51, 101];
// подсказки ходов (подсветка костей и место, куда ляжет) в режиме «авто» показываются только первые столько конов
export const HINT_ROUNDS = 5;
