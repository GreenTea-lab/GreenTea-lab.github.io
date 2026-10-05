// Экономика фермы: культуры, поля, улучшения, тракторы, заказы, уровни

// grow — секунды роста, yield — сколько единиц урожая даёт всё поле, price — монет за единицу
export const CROPS = {
  wheat: { lvl: 1, grow: 40, yield: 60, price: 3, color: 0xf1cf5c },
  corn: { lvl: 2, grow: 70, yield: 70, price: 4, color: 0xf6d743 },
  sunflower: { lvl: 4, grow: 100, yield: 60, price: 6, color: 0xffc531 },
  carrot: { lvl: 6, grow: 80, yield: 80, price: 5, color: 0xf2843a },
  pumpkin: { lvl: 8, grow: 140, yield: 50, price: 10, color: 0xf08a2a },
};
export const CROP_IDS = Object.keys(CROPS);

// поля: центр (x, z), размер 20×14 м, цена покупки
export const FIELD_W = 20,
  FIELD_D = 14,
  CELL = 0.5,
  FCX = FIELD_W / CELL,
  FCZ = FIELD_D / CELL;
export const FIELDS = [
  { x: 0, z: 16, cost: 0 },
  { x: 25, z: 16, cost: 0 },
  { x: -25, z: 16, cost: 400 },
  { x: 0, z: 36, cost: 1200 },
  { x: 25, z: 36, cost: 3000 },
  { x: -25, z: 36, cost: 7000 },
];

// стадии поля
export const ST = { WILD: 0, PLOWED: 1, GROWING: 2, RIPE: 3, STUBBLE: 4 };

export const UPGRADES = {
  speed: { max: 5, base: 150, mul: 2.2, val: (l) => 4.2 + 0.65 * l },
  width: { max: 5, base: 200, mul: 2.3, val: (l) => 2.4 + 0.55 * l },
  cap: { max: 5, base: 180, mul: 2.2, val: (l) => 60 + 40 * l },
  grow: { max: 5, base: 300, mul: 2.4, val: (l) => 1 - 0.08 * l },
};
export const upCost = (id, l) => Math.round((UPGRADES[id].base * Math.pow(UPGRADES[id].mul, l)) / 10) * 10;

// тракторы: цвет кузова, колёс, бонусы скорости и ширины захвата
export const TRACTORS = [
  { id: 'red', cost: 0, body: 0xe2453c, rim: 0xf2d04a, cab: 0xf3efe6, speed: 0, width: 0 },
  { id: 'green', cost: 1500, body: 0x3f9d4a, rim: 0xf0d24c, cab: 0xf0eedf, speed: 0.5, width: 0 },
  { id: 'blue', cost: 5000, body: 0x2f6fd0, rim: 0xe9eef5, cab: 0xe6eef7, speed: 1, width: 0.4 },
  { id: 'gold', cost: 15000, body: 0xe9b329, rim: 0x3a3a44, cab: 0xfff6dc, speed: 1.5, width: 0.8 },
];

export const xpNeed = (lvl) => Math.round(50 * Math.pow(lvl, 1.6));

export const CLIENTS = ['bakery', 'cafe', 'neighbor', 'school', 'shop'];

// новый заказ: культура из открытых, количество растёт с уровнем
export function makeOrder(lvl, rnd = Math.random, avoid = []) {
  const open = CROP_IDS.filter((c) => CROPS[c].lvl <= lvl);
  const pool = open.filter((c) => !avoid.includes(c));
  const crop = (pool.length ? pool : open)[Math.floor(rnd() * (pool.length ? pool : open).length)];
  const qty = Math.round((15 + rnd() * 25 + lvl * 4) / 5) * 5;
  const reward = Math.round((qty * CROPS[crop].price * 1.8) / 5) * 5;
  return { crop, qty, got: 0, reward, xp: Math.round(qty * 0.6), client: CLIENTS[Math.floor(rnd() * CLIENTS.length)] };
}
