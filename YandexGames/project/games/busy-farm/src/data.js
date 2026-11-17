// Данные игры: товары, животные, мастерские, улучшения и 48 уровней.
// Цены, цепочки и цели уровней повторяют первую «Весёлую ферму»; стартовые деньги подобраны ботом (test/calib.mjs).

// товары: цена в городе, место на складе
export const ITEMS = {
  egg: { price: 10, size: 1 },
  powder: { price: 20, size: 1 },
  cake: { price: 80, size: 1 },
  wool: { price: 100, size: 1 },
  thread: { price: 200, size: 1 },
  cloth: { price: 800, size: 1 },
  milk: { price: 1000, size: 1 },
  butter: { price: 2000, size: 1 },
  cheese: { price: 8000, size: 1 },
  bear: { price: 100, size: 5 },
};
export const ITEM_ORDER = ['egg', 'powder', 'cake', 'wool', 'thread', 'cloth', 'milk', 'butter', 'cheese', 'bear'];

// животные: food — сколько секунд сыт, prod — секунд на продукт (пока сыт), starve — сколько секунд терпит голод
export const ANIMALS = {
  goose: { cost: 100, sell: 50, product: 'egg', prod: 9, food: 26, starve: 16, speed: 1.15, r: 0.32 },
  sheep: { cost: 1000, sell: 500, product: 'wool', prod: 12, food: 30, starve: 18, speed: 0.95, r: 0.42 },
  cow: { cost: 10000, sell: 5000, product: 'milk', prod: 17, food: 34, starve: 20, speed: 0.8, r: 0.55 },
  cat: { cost: 2500, sell: 1250, helper: true, speed: 1.6, r: 0.3 },
  dog: { cost: 2600, sell: 1300, helper: true, speed: 2.2, r: 0.35 },
};
export const ANIMAL_ORDER = ['goose', 'sheep', 'cow', 'cat', 'dog'];

// мастерские: вход → выход, цена постройки, время работы (сек) на 0-м уровне
export const BUILDINGS = {
  powder: { in: 'egg', out: 'powder', cost: 200, time: 4, color: '#f6c552' },
  bakery: { in: 'powder', out: 'cake', cost: 400, time: 5, color: '#ef8a6a' },
  spinner: { in: 'wool', out: 'thread', cost: 2000, time: 5, color: '#9ec7ef' },
  loom: { in: 'thread', out: 'cloth', cost: 4000, time: 6, color: '#c69ce8' },
  churn: { in: 'milk', out: 'butter', cost: 20000, time: 6, color: '#f3e08a' },
  creamery: { in: 'butter', out: 'cheese', cost: 40000, time: 8, color: '#f0b04a' },
};
export const BUILDING_ORDER = ['powder', 'bakery', 'spinner', 'loom', 'churn', 'creamery'];
export const MAX_QUEUE = 3; // сколько сырья мастерская берёт в очередь

// улучшения за звёзды (между уровнями), 5 ступеней
export const UPGRADES = ['well', 'store', 'truck', ...BUILDING_ORDER];
export const UP_COST = [1, 2, 3, 4, 5];
export const UP_MAX = 5;
export const WELL_CAP = [6, 8, 10, 13, 16, 20];
export const WELL_TIME = [3.5, 3, 2.6, 2.2, 1.8, 1.4];
export const WELL_PRICE = 10;
export const STORE_CAP = [12, 18, 25, 35, 50, 70];
export const TRUCK_CAP = [8, 12, 18, 25, 35, 50];
export const TRUCK_TIME = [22, 20, 18, 16, 14, 12]; // туда и обратно
export const BUILD_SPEED = [1, 0.85, 0.72, 0.62, 0.53, 0.45]; // множитель времени работы

export const ITEM_LIFE = 18; // сколько лежит продукт на земле
export const CAGE_TIME = 25; // сколько медведь сидит в клетке
export const BEAR_FREE_TIME = 30; // сколько медведь гуляет, потом уходит

// когда что появляется (номер уровня, с 1)
export const UNLOCK = { goose: 1, powder: 3, bakery: 7, sheep: 9, cat: 10, spinner: 12, dog: 14, loom: 21, cow: 23, churn: 35, creamery: 37 };

// цели уровней из оригинала: [цели, время на золото в секундах]
const G = (s) => s; // для читаемости
const RAW = [
  [{ egg: 4 }, 60],
  [{ egg: 10, goose: 5 }, 180],
  [{ powder: 4, coins: 300 }, 180],
  [{ goose: 2, powder: 10, coins: 500 }, 210],
  [{ egg: 20, powder: 5, goose: 8 }, 180],
  [{ goose: 5, powder: 10 }, 180],
  [{ cake: 3, goose: 6 }, 150],
  [{ goose: 5, powder: 15, cake: 12 }, 270],
  [{ powder: 10, egg: 30, sheep: 1 }, 240],
  [{ cake: 2, goose: 7 }, 170],
  [{ sheep: 1 }, 150],
  [{ cake: 10, thread: 4, coins: 2100 }, 290],
  [{ goose: 3, cake: 15, coins: 2000 }, 255],
  [{ goose: 5, powder: 20, cake: 20 }, 190],
  [{ sheep: 1, thread: 1 }, 120],
  [{ wool: 10, cake: 10, thread: 10, goose: 10 }, 225],
  [{ wool: 10, coins: 3100, thread: 20 }, 380],
  [{ powder: 30, cake: 40, sheep: 3 }, 310],
  [{ sheep: 2, thread: 8, cake: 10 }, 210],
  [{ goose: 5, cake: 30, thread: 30 }, 420],
  [{ cake: 8, cloth: 1, thread: 2 }, 230],
  [{ cloth: 5, thread: 15 }, 250],
  [{ milk: 5, wool: 30 }, 240],
  [{ cake: 10, cloth: 3, sheep: 3 }, 310],
  [{ sheep: 3, cloth: 6, thread: 12 }, 290],
  [{ sheep: 4, thread: 30, coins: 10000 }, 390],
  [{ milk: 1 }, 170],
  [{ sheep: 4, cow: 3, cloth: 20 }, 190],
  [{ cake: 20, sheep: 1, cloth: 2 }, 310],
  [{ milk: 2, cloth: 15, coins: 8000 }, 340],
  [{ sheep: 2, thread: 15, cloth: 10, coins: 10000 }, 300],
  [{ cloth: 30, cow: 2 }, 310],
  [{ sheep: 5, cloth: 40, coins: 20000 }, 300],
  [{ milk: 3, cloth: 35, coins: 20000 }, 580],
  [{ sheep: 5, cloth: 50, butter: 1 }, 260],
  [{ butter: 1 }, 45],
  [{ cheese: 1 }, 240],
  [{ sheep: 5, milk: 20, butter: 12 }, 340],
  [{ butter: 8, cheese: 1 }, 390],
  [{ butter: 30, cheese: 15 }, 300],
  [{ cow: 1, cheese: 10, butter: 15 }, 266],
  [{ cake: 20, cloth: 20, cheese: 10, coins: 120000 }, 490],
  [{ cheese: 1 }, 220],
  [{ sheep: 4, cow: 3, butter: 20, cheese: 30 }, 360],
  [{ cake: 30, cloth: 20, cheese: 32 }, 340],
  [{ sheep: 5, cow: 5, butter: 20, cheese: 40 }, 400],
  [{ cake: 50, cloth: 50, cheese: 15, coins: 100000 }, 570],
  [{ goose: 5, sheep: 5, cow: 2, cheese: 40 }, 2400],
].map(G);

// стартовые условия: деньги и уже стоящие на ферме животные/мастерские (подобраны test/calib.mjs)
// формат: [деньги, {животные}, [мастерские]]
export const START = [
  [100, {goose: 2}, []], // 1
  [100, {goose: 2}, []], // 2
  [200, {goose: 2}, []], // 3
  [300, {goose: 2}, []], // 4
  [500, {goose: 2}, []], // 5
  [300, {goose: 2}, []], // 6
  [800, {goose: 2}, []], // 7
  [300, {goose: 2}, []], // 8
  [800, {goose: 2}, []], // 9
  [800, {goose: 2}, []], // 10
  [900, {goose: 2}, []], // 11
  [1200, {goose: 2}, ['powder', 'bakery']], // 12
  [600, {goose: 2}, []], // 13
  [800, {goose: 2}, []], // 14
  [2800, {goose: 2}, []], // 15
  [4400, {goose: 2}, []], // 16
  [1000, {goose: 2}, ['spinner']], // 17
  [800, {goose: 2}, []], // 18
  [4400, {goose: 2}, []], // 19
  [2200, {goose: 2}, []], // 20
  [5200, {goose: 2}, []], // 21
  [4400, {sheep: 1, goose: 2}, []], // 22
  [11000, {sheep: 1, goose: 2}, []], // 23
  [4400, {sheep: 1, goose: 2}, []], // 24
  [5200, {sheep: 1, goose: 2}, []], // 25
  [7000, {sheep: 1, goose: 2}, ['spinner']], // 26
  [9500, {sheep: 1, goose: 2}, []], // 27
  [49000, {sheep: 1, goose: 2}, []], // 28
  [2200, {sheep: 1, goose: 2}, []], // 29
  [1800, {sheep: 1, goose: 2}, ['spinner', 'loom']], // 30
  [6200, {sheep: 1, goose: 2}, []], // 31
  [7400, {sheep: 1, goose: 2}, []], // 32
  [13000, {sheep: 1, goose: 2}, ['spinner']], // 33
  [6200, {sheep: 1, goose: 2}, []], // 34
  [200000, {sheep: 1, goose: 2}, ['spinner', 'loom', 'churn']], // 35
  [23000, {cow: 1}, []], // 36
  [60500, {cow: 1}, []], // 37
  [41000, {cow: 1}, []], // 38
  [69000, {cow: 1}, []], // 39
  [150000, {cow: 1}, []], // 40
  [82000, {cow: 1}, []], // 41
  [41000, {cow: 1}, []], // 42
  [60500, {cow: 1}, []], // 43
  [150000, {cow: 1}, []], // 44
  [200000, {cow: 2, sheep: 2, goose: 3}, ['powder', 'bakery', 'spinner', 'loom', 'churn', 'creamery']], // 45
  [150000, {cow: 1}, []], // 46
  [70000, {cow: 2, sheep: 2, goose: 3}, ['powder', 'bakery', 'spinner', 'loom', 'churn', 'creamery']], // 47
  [100, {cow: 1}, []], // 48
];

const ANIMAL_GOALS = ['goose', 'sheep', 'cow'];

// первый медведь и промежутки между медведями
function bearsFor(n) {
  if (n < 6) return null;
  return { first: Math.max(25, 60 - n), gap: [Math.max(28, 75 - n), Math.max(45, 110 - n)], clicks: 5 + Math.floor(n / 12) };
}

export const LEVELS = RAW.map(([goals, gold], i) => {
  const n = i + 1;
  const st = START[i] || [500, { goose: 2 }];
  const animals = ANIMAL_ORDER.filter((a) => UNLOCK[a] <= n);
  const buildings = BUILDING_ORDER.filter((b) => UNLOCK[b] <= n);
  return {
    n,
    goals,
    gold,
    silver: Math.round((gold * 1.6) / 10) * 10,
    coins: st[0],
    start: st[1] || {},
    pre: st[2] || [],
    animals,
    buildings,
    bears: bearsFor(n),
    isAnimalGoal: (k) => ANIMAL_GOALS.includes(k),
  };
});

// звёзды за медаль
export const MEDAL_STARS = { gold: 3, silver: 2, done: 1 };
export const medalOf = (L, t) => (t <= L.gold ? 'gold' : t <= L.silver ? 'silver' : 'done');
