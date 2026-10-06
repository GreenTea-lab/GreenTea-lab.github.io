// Состояния для промо: город среднего уровня и поздний, разные океаны
export const MID = {
  ts: 1, tut: 5, shells: 2.48e7, run: 3e7, all: 3e7, stage: 4, island: 6, islandsAll: 6, miles: 0,
  b: { lemon: 52, fish: 48, light: 31, bakery: 27, mill: 18, carousel: 11, bank: 6, garden: 2 },
  up: { tap: 6, wind: 4, gull: 3, night: 1, fount: 3 }, cards: [{ k: 'all', v: 0.15 }, { k: 'tap', v: 0.5 }, { k: 'bld', v: 0.5, id: 'light' }],
  taps: 4200, gulls: 9, login: { last: 99999, streak: 3 },
};
export const LATE = {
  ...MID, stage: 6, island: 9, islandsAll: 31, migr: 3, pearls: 42, pearlsEver: 42, shells: 4.7e13, all: 9e14,
  b: { lemon: 160, fish: 152, light: 140, bakery: 128, mill: 112, carousel: 104, bank: 96, garden: 81, observ: 62, castle: 51, airship: 30, rainbow: 12 },
};
