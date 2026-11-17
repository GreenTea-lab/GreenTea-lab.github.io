// Данные: клетки поля, группы, карточки «Шанс» и «Казна», магазин, экономика
// Деньги в игре хранятся в «единицах», на экране 1 единица = 1 000 ₽ (Москва — 400 000 ₽).

export const GROUPS = {
  brown: { color: '#8b5a3c', house: 50 },
  sky: { color: '#8fd3f4', house: 50 },
  pink: { color: '#d63c8f', house: 100 },
  orange: { color: '#f39324', house: 100 },
  red: { color: '#e2312d', house: 150 },
  yellow: { color: '#f6d327', house: 150 },
  green: { color: '#1fa35a', house: 200 },
  blue: { color: '#1f5fb4', house: 200 },
};
export const GROUP_ORDER = ['brown', 'sky', 'pink', 'orange', 'red', 'yellow', 'green', 'blue'];

// type: go, city, card (chance/chest), tax, transport, util, jail, park, tojail
const city = (key, group, price, rent) => ({ type: 'city', key, group, price, rent, mortgage: price / 2 });
const tr = (key, icon) => ({ type: 'transport', key, price: 200, mortgage: 100, icon });
const ut = (key, icon) => ({ type: 'util', key, price: 150, mortgage: 75, icon });

export const CELLS = [
  { type: 'go', key: 'go' },
  city('ivanovo', 'brown', 60, [2, 10, 30, 90, 160, 250]),
  { type: 'card', deck: 'chest', key: 'chest' },
  city('kostroma', 'brown', 60, [4, 20, 60, 180, 320, 450]),
  { type: 'tax', key: 'tax1', amount: 200 },
  tr('rail', 'train'),
  city('pskov', 'sky', 100, [6, 30, 90, 270, 400, 550]),
  { type: 'card', deck: 'chance', key: 'chance' },
  city('vologda', 'sky', 100, [6, 30, 90, 270, 400, 550]),
  city('tver', 'sky', 120, [8, 40, 100, 300, 450, 600]),
  { type: 'jail', key: 'jail' },
  city('tula', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  ut('power', 'bolt'),
  city('ryazan', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  city('yaroslavl', 'pink', 160, [12, 60, 180, 500, 700, 900]),
  tr('river', 'ship'),
  city('samara', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  { type: 'card', deck: 'chest', key: 'chest' },
  city('saratov', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  city('volgograd', 'orange', 200, [16, 80, 220, 600, 800, 1000]),
  { type: 'park', key: 'park' },
  city('nnovgorod', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  { type: 'card', deck: 'chance', key: 'chance' },
  city('kazan', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  city('ufa', 'red', 240, [20, 100, 300, 750, 925, 1100]),
  tr('air', 'plane'),
  city('ekb', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  city('nsk', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  ut('water', 'drop'),
  city('krsk', 'yellow', 280, [24, 120, 360, 850, 1025, 1200]),
  { type: 'tojail', key: 'tojail' },
  city('vladivostok', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  city('kaliningrad', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  { type: 'card', deck: 'chest', key: 'chest' },
  city('sochi', 'green', 320, [28, 150, 450, 1000, 1200, 1400]),
  tr('sea', 'anchor'),
  { type: 'card', deck: 'chance', key: 'chance' },
  city('spb', 'blue', 350, [35, 175, 500, 1100, 1300, 1500]),
  { type: 'tax', key: 'tax2', amount: 100 },
  city('moscow', 'blue', 400, [50, 200, 600, 1400, 1700, 2000]),
];
CELLS.forEach((c, i) => (c.i = i));
export const JAIL = 10;
export const GROUP_CELLS = {};
CELLS.forEach((c) => {
  if (c.group) (GROUP_CELLS[c.group] = GROUP_CELLS[c.group] || []).push(c.i);
});
export const TRANSPORT = CELLS.filter((c) => c.type === 'transport').map((c) => c.i);
export const UTILS = CELLS.filter((c) => c.type === 'util').map((c) => c.i);
export const OWNABLE = CELLS.filter((c) => c.price).map((c) => c.i);
export const TRANSPORT_RENT = [25, 50, 100, 200];

// карточки: k — ключ текста, a — действие
export const CHANCE = [
  { k: 'c_go', a: 'move', to: 0 },
  { k: 'c_moscow', a: 'move', to: 39 },
  { k: 'c_kazan', a: 'move', to: 23 },
  { k: 'c_tula', a: 'move', to: 11 },
  { k: 'c_rail', a: 'move', to: 5 },
  { k: 'c_neartr', a: 'nearest', kind: 'transport' },
  { k: 'c_neartr2', a: 'nearest', kind: 'transport' },
  { k: 'c_nearut', a: 'nearest', kind: 'util' },
  { k: 'c_div', a: 'gain', n: 50 },
  { k: 'c_free', a: 'free' },
  { k: 'c_back', a: 'back', n: 3 },
  { k: 'c_jail', a: 'jail' },
  { k: 'c_repair', a: 'repair', house: 25, hotel: 100 },
  { k: 'c_speed', a: 'pay', n: 15 },
  { k: 'c_chair', a: 'payeach', n: 50 },
  { k: 'c_loan', a: 'gain', n: 150 },
];
export const CHEST = [
  { k: 'h_go', a: 'move', to: 0 },
  { k: 'h_bank', a: 'gain', n: 200 },
  { k: 'h_doctor', a: 'pay', n: 50 },
  { k: 'h_stock', a: 'gain', n: 50 },
  { k: 'h_free', a: 'free' },
  { k: 'h_jail', a: 'jail' },
  { k: 'h_holiday', a: 'gain', n: 100 },
  { k: 'h_taxback', a: 'gain', n: 20 },
  { k: 'h_bday', a: 'collect', n: 10 },
  { k: 'h_insur', a: 'gain', n: 100 },
  { k: 'h_hosp', a: 'pay', n: 100 },
  { k: 'h_school', a: 'pay', n: 50 },
  { k: 'h_consult', a: 'gain', n: 25 },
  { k: 'h_roads', a: 'repair', house: 40, hotel: 115 },
  { k: 'h_contest', a: 'gain', n: 10 },
  { k: 'h_inherit', a: 'gain', n: 100 },
];

export const START_MONEY = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;

// цвета игроков (кольцо под фишкой, табличка, флажки владения)
export const PCOLORS = ['#e2453c', '#2f7fd8', '#2eaa5c', '#f0a52a'];

// ---------- магазин ----------
// фишки: free — доступна сразу
export const TOKENS = [
  { id: 'car', price: 0 },
  { id: 'doll', price: 0 },
  { id: 'boat', price: 0 },
  { id: 'plane', price: 0 },
  { id: 'rocket', price: 800 },
  { id: 'samovar', price: 1200 },
  { id: 'train', price: 1600 },
  { id: 'balalaika', price: 2000 },
  { id: 'crown', price: 3000 },
];
// фоны (место, где лежит поле)
export const PLACES = [
  { id: 'sunset', price: 0, mood: 'game' },
  { id: 'nights', price: 1500, mood: 'night' },
  { id: 'autumn', price: 2500, mood: 'game' },
  { id: 'port', price: 3500, mood: 'night' },
  { id: 'winter', price: 4500, mood: 'night' },
];
// стиль домов и отелей
export const HOUSES = [
  { id: 'classic', price: 0 },
  { id: 'terem', price: 1500 },
  { id: 'modern', price: 2500 },
];

export const START_COINS = 300;
export const WIN_COINS = [80, 130, 200]; // по сложности соперников
export const PLACE_COINS = [0, 40, 25, 15]; // за 2-е, 3-е, 4-е место
export const RATING = [10, 20, 35];
export const AD_COINS = 100;
export const AD_COOLDOWN = 3 * 60 * 1000;
export const DAILY = [100, 150, 200, 250, 300, 400, 600];
export const ROUND_LIMITS = [10, 15, 30, 0]; // 0 — до банкротства
export const AD_START_BONUS = 300; // стартовый капитал за ролик (один раз за партию)

// свои правила партии (по умолчанию классика)
export const HOUSE_RULES = ['pot', 'go2', 'quick'];
export const SPEEDS = [1.8, 0.9, 0.45]; // множитель длительности ходов ботов

// задания дня: ev — событие, n — цель, c — награда в монетах
export const QUESTS = [
  { id: 'q_buy', ev: 'buy', n: 5, c: 60 },
  { id: 'q_house', ev: 'house', n: 6, c: 80 },
  { id: 'q_hotel', ev: 'hotel', n: 1, c: 100 },
  { id: 'q_rent', ev: 'rent', n: 1000, c: 80 },
  { id: 'q_auction', ev: 'auction', n: 1, c: 60 },
  { id: 'q_trade', ev: 'trade', n: 1, c: 60 },
  { id: 'q_set', ev: 'set', n: 1, c: 70 },
  { id: 'q_game', ev: 'game', n: 1, c: 50 },
  { id: 'q_win', ev: 'win', n: 1, c: 100 },
  { id: 'q_go', ev: 'go', n: 8, c: 50 },
];
export const QUESTS_PER_DAY = 3;
// достижения: считаются по счётчикам за всё время
export const ACHIEVEMENTS = [
  { id: 'a_first', ev: 'win', n: 1, c: 150 },
  { id: 'a_win10', ev: 'win', n: 10, c: 400 },
  { id: 'a_hard', ev: 'winHard', n: 1, c: 300 },
  { id: 'a_games25', ev: 'game', n: 25, c: 300 },
  { id: 'a_hotel', ev: 'hotel', n: 1, c: 100 },
  { id: 'a_hotels20', ev: 'hotel', n: 20, c: 300 },
  { id: 'a_sets', ev: 'set', n: 10, c: 200 },
  { id: 'a_blue', ev: 'blue', n: 1, c: 150 },
  { id: 'a_tr4', ev: 'tr4', n: 1, c: 200 },
  { id: 'a_auction10', ev: 'auction', n: 10, c: 200 },
  { id: 'a_trade10', ev: 'trade', n: 10, c: 200 },
  { id: 'a_rent', ev: 'rent', n: 20000, c: 300 },
  { id: 'a_bigrent', ev: 'bigrent', n: 1, c: 200 },
];
