// Настройки ночей, прокачка, цвета фонарика
export const NIGHTS = [
  null,
  { keys: 2, bats: 2, chase: 3.25, walk: 1.25, grace: 24, drain: 1 / 1.55, events: 0.6, bias: 0.25 },
  { keys: 3, bats: 3, chase: 3.45, walk: 1.35, grace: 18, drain: 1 / 1.45, events: 0.8, bias: 0.32 },
  { keys: 3, bats: 3, chase: 3.65, walk: 1.45, grace: 14, drain: 1 / 1.35, events: 1, bias: 0.38 },
  { keys: 4, bats: 4, chase: 3.85, walk: 1.55, grace: 12, drain: 1 / 1.3, events: 1.15, bias: 0.44 },
  { keys: 5, bats: 4, chase: 4.05, walk: 1.65, grace: 10, drain: 1 / 1.22, events: 1.3, bias: 0.5 },
];

// кошмар: всё быстрее и темнее, очки ×2
export function nightCfg(n, nightmare) {
  const c = Object.assign({}, NIGHTS[n]);
  if (nightmare) {
    c.chase += 0.35;
    c.walk += 0.25;
    c.grace = Math.max(5, c.grace - 6);
    c.drain *= 1.3;
    c.bats = Math.max(2, c.bats - 1);
    c.bias += 0.12;
    c.events *= 1.25;
  }
  return c;
}

export const UPGRADES = [
  { id: 'battery', max: 4, cost: [120, 260, 480, 800] }, // +20% заряда
  { id: 'stamina', max: 4, cost: [100, 220, 420, 700] }, // +25% бега
  { id: 'quiet', max: 3, cost: [150, 350, 650] }, // шаги тише
  { id: 'beam', max: 3, cost: [140, 320, 600] }, // дальность луча
  { id: 'flash', max: 3, cost: [160, 380, 700] }, // вспышка оглушает дольше
];

export const COLORS = [
  { id: 'warm', c: 0xffe2b0, cost: 0 },
  { id: 'white', c: 0xf2f6ff, cost: 300 },
  { id: 'moon', c: 0xb8d4ff, cost: 500 },
  { id: 'green', c: 0xc8ffb0, cost: 700 },
  { id: 'rose', c: 0xffc0cc, cost: 900 },
  { id: 'gold', c: 0xffd060, cost: 1200 },
];

export const STORE_BONUS = 150; // монет за ролик в магазине
