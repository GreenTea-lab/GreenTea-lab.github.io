// Данные игры: миры, уровни, враги, костюмы, улучшения
export const WORLDS = ['lane', 'grave', 'forest', 'castle'];
export const PER_WORLD = 5;
// цвета вкладок миров (основной, тёмный)
export const WORLD_COL = {
  lane: ['#ff9a3c', '#c2571a'],
  grave: ['#9ad07a', '#4f7a3c'],
  forest: ['#5fc7b8', '#2b6f68'],
  castle: ['#c58bff', '#6b3fa6'],
};

// уровень: размер в кварталах, время, враги, события, цели (банк конфет для 1/2/3 звёзд)
// en: ghost, bat (стаи — событие), skel, jack, spider, witch; boss — уровень с боссом
const L = (o) => Object.assign({ lanterns: 2, trick: 0, events: [], evEvery: 26, relight: 30, streetP: 0.5 }, o);
export const LEVELS = [
  // Тыквенная улица
  L({ w: 3, h: 3, time: 90, en: { ghost: 1 }, lanterns: 1, tut: 1, goal: [70, 105, 145] }),
  L({ w: 3, h: 3, time: 100, en: { ghost: 2 }, tutLantern: 1, goal: [80, 120, 165] }),
  L({ w: 4, h: 3, time: 110, en: { ghost: 2 }, events: ['bats', 'rain'], tutBats: 1, goal: [85, 130, 185] }),
  L({ w: 4, h: 4, time: 120, en: { ghost: 3 }, trick: 0.2, events: ['bats', 'rain'], tutTrick: 1, goal: [75, 120, 165] }),
  L({ w: 4, h: 4, time: 180, en: { ghost: 1 }, boss: 'bigboo', lanterns: 3, goal: [1, 60, 110] }),
  // Старое кладбище
  L({ w: 4, h: 4, time: 120, en: { ghost: 2, skel: 1 }, events: ['bats', 'rain'], tutSkel: 1, goal: [110, 170, 240] }),
  L({ w: 5, h: 4, time: 130, en: { ghost: 3, skel: 1 }, events: ['bats', 'rain', 'party'], trick: 0.2, goal: [90, 140, 195] }),
  L({ w: 5, h: 4, time: 130, en: { ghost: 2, skel: 2 }, events: ['bats', 'rain', 'party'], trick: 0.25, goal: [95, 150, 210] }),
  L({ w: 5, h: 5, time: 140, en: { ghost: 3, skel: 2 }, events: ['bats', 'party', 'rain', 'bats'], evEvery: 22, trick: 0.25, goal: [85, 135, 190] }),
  L({ w: 5, h: 4, time: 180, en: { ghost: 2 }, boss: 'skelking', lanterns: 3, goal: [1, 40, 70] }),
  // Туманный лес
  L({ w: 5, h: 4, time: 130, en: { ghost: 2, skel: 1, spider: 3 }, events: ['bats', 'rain'], tutSpider: 1, goal: [100, 155, 220] }),
  L({ w: 5, h: 5, time: 140, en: { ghost: 2, jack: 1, spider: 3 }, events: ['bats', 'rain', 'party'], tutJack: 1, trick: 0.2, goal: [85, 135, 190] }),
  L({ w: 5, h: 5, time: 140, en: { ghost: 3, jack: 2, spider: 4 }, events: ['bats', 'party', 'rain'], evEvery: 22, trick: 0.25, goal: [105, 160, 225] }),
  L({ w: 6, h: 5, time: 150, en: { ghost: 3, skel: 1, jack: 2, spider: 4 }, events: ['bats', 'party', 'rain', 'bats'], evEvery: 20, trick: 0.25, goal: [95, 150, 210] }),
  L({ w: 5, h: 5, time: 180, en: { ghost: 2, spider: 2 }, boss: 'witchqueen', lanterns: 3, goal: [1, 35, 65] }),
  // Замок вампира
  L({ w: 6, h: 5, time: 150, en: { ghost: 3, skel: 2, witch: 1 }, events: ['bats', 'rain', 'party'], tutWitch: 1, trick: 0.25, goal: [85, 135, 185] }),
  L({ w: 6, h: 5, time: 150, en: { ghost: 3, jack: 2, witch: 1, spider: 3 }, events: ['bats', 'party', 'rain'], evEvery: 22, trick: 0.3, goal: [120, 180, 255] }),
  L({ w: 6, h: 5, time: 160, en: { ghost: 4, skel: 2, jack: 1, witch: 1 }, events: ['bats', 'party', 'rain', 'bats'], evEvery: 20, trick: 0.3, goal: [100, 155, 220] }),
  L({ w: 6, h: 6, time: 160, en: { ghost: 4, skel: 2, jack: 2, witch: 2, spider: 4 }, events: ['bats', 'party', 'bats', 'rain'], evEvery: 18, trick: 0.3, goal: [85, 135, 185] }),
  L({ w: 6, h: 5, time: 200, en: { ghost: 2, witch: 1 }, boss: 'pumpking', lanterns: 4, goal: [1, 60, 110] }),
];
LEVELS.forEach((l, i) => {
  l.idx = i;
  l.world = WORLDS[Math.floor(i / PER_WORLD)];
  l.wi = Math.floor(i / PER_WORLD);
});

// враги: скорость (клетки/с ≈ единицы/2), радиус касания
export const ENEMY = {
  ghost: { speed: 2.3, r: 0.55, sense: 7 },
  skel: { speed: 2.0, r: 0.55, sense: 10, charge: 6.2 },
  jack: { hop: 1.15, r: 0.6, wave: 1.7 },
  bat: { speed: 6.0, r: 0.5 },
  spider: { up: 2.4, warn: 0.9, down: 1.2, r: 0.85 },
  witch: { speed: 3.2, every: 3.2 },
};
export const BOSS = {
  bigboo: { hp: 3, speed: 1.75, r: 1.2 },
  skelking: { hp: 4, speed: 2.3, r: 1.1 },
  witchqueen: { hp: 4, speed: 3.6, r: 1.1 },
  pumpking: { hp: 5, hop: 1.35, r: 1.3, wave: 2.8 },
};

// игрок
export const PLAYER = { speed: 4.6, r: 0.42, bag: 20, dashCd: 2.6, dashT: 0.22, dashMul: 3.0, lantern: 6, magnet: 0.9, hurtT: 1.4 };

// улучшения: ключ → эффект на уровень
export const UPGRADES = ['bag', 'shoes', 'dash', 'lantern', 'magnet'];
export const UP_MAX = 5;
export const UP_COST = [120, 300, 600, 1000, 1600];
export function stats(up) {
  return {
    speed: PLAYER.speed * (1 + 0.05 * (up.shoes || 0)),
    bag: PLAYER.bag + 6 * (up.bag || 0),
    dashCd: PLAYER.dashCd - 0.3 * (up.dash || 0),
    lantern: PLAYER.lantern + 1 * (up.lantern || 0),
    magnet: PLAYER.magnet + 0.3 * (up.magnet || 0),
  };
}

// костюмы (косметика)
export const COSTUMES = [
  { id: 'pumpkin', price: 0 },
  { id: 'ghost', price: 400 },
  { id: 'witch', price: 700 },
  { id: 'cat', price: 1000 },
  { id: 'vampire', price: 1400 },
  { id: 'mummy', price: 1800 },
  { id: 'skeleton', price: 2300 },
  { id: 'bat', price: 2900 },
];

export const STAR_COINS = 25; // за каждую новую звезду
export const COIN_PACKS = { coins_1000: 1000, coins_3500: 3500, coins_10000: 10000 };
