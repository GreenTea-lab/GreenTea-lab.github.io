// Сохранение «середины игры» для промо: открыто 4 водоёма, атлас наполовину заполнен
export const PROMO_SAVE = {
  ts: 1, char: 'm', tutDone: true, coins: 3460, xp: 120, lvl: 11, loc: 1, locs: [0, 1, 2, 3],
  gear: { rod: 3, reel: 3, line: 2, net: 2, smoker: 1 },
  bait: { worm: 1, maggot: 14, corn: 8, spinner: 6, jig: 2 }, cur: 'spinner',
  keep: [{ id: 'perch', w: 0.62, p: 21 }, { id: 'roach', w: 0.31, p: 9 }, { id: 'chub', w: 1.4, p: 52 }, { id: 'ide', w: 1.1, p: 40 }, { id: 'bream', w: 2.2, p: 70 }],
  smoke: [], sales: 9, luck: 6,
  atlas: { crucian: { n: 31, best: 1.04 }, roach: { n: 40, best: 0.52 }, rotan: { n: 12, best: 0.33 }, perch: { n: 22, best: 1.31 }, tench: { n: 9, best: 2.4 }, carp: { n: 3, best: 7.2 },
    bleak: { n: 18, best: 0.13 }, chub: { n: 11, best: 3.1 }, ide: { n: 8, best: 2.7 }, pike: { n: 5, best: 8.6 }, zander: { n: 4, best: 5.2 }, rudd: { n: 10, best: 0.7 }, bream: { n: 7, best: 4.4 }, burbot: { n: 2, best: 3.9 } },
  stats: { caught: 182, grams: 214300, sold: 9, earned: 9000, legends: 0, casts: 220 },
  login: { last: 99999, streak: 4 },
};
