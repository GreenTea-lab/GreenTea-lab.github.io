// Цели обучения и ежедневные задания
import * as E from './econ.js';

export const GOALS = [
  // первые два шага ведёт обучение (лесопилка и домик)
  { type: 'build', arg: 'sawmill', n: 1, reward: { coins: 20 } },
  { type: 'build', arg: 'hut', n: 1, reward: { coins: 60 } },
  { type: 'build', arg: 'farm', n: 1, reward: { coins: 80 } },
  { type: 'lvl', arg: 'farm', n: 2, reward: { coins: 80 } },
  { type: 'decor', n: 2, reward: { crystals: 3 } },
  { type: 'build', arg: 'hut', n: 2, reward: { coins: 150 } },
  { type: 'level', n: 2, reward: { crystals: 3 } },
  { type: 'build', arg: 'market', n: 1, reward: { coins: 300 } },
  { type: 'plot', n: 1, reward: { crystals: 5 } },
  { type: 'level', n: 3, reward: { coins: 500 } },
  { type: 'build', arg: 'quarry', n: 1, reward: { coins: 600 } },
  { type: 'build', arg: 'cottage', n: 1, reward: { crystals: 5 } },
  { type: 'balloon', n: 1, reward: { crystals: 3 } },
  { type: 'level', n: 5, reward: { crystals: 8 } },
  { type: 'build', arg: 'townhall', n: 1, reward: { crystals: 10 } },
  { type: 'lvl', arg: 'townhall', n: 3, reward: { crystals: 10 } },
  { type: 'level', n: 8, reward: { crystals: 15 } },
];

export function goalProgress(s, g) {
  const st = s.stats || {};
  switch (g.type) {
    case 'build':
      return Math.min(g.n, s.buildings.filter((b) => b.type === g.arg && E.effLvl(b) > 0).length);
    case 'lvl':
      return Math.min(g.n, Math.max(0, ...s.buildings.filter((b) => b.type === g.arg).map((b) => E.effLvl(b))));
    case 'decor':
      return Math.min(g.n, st.decorPlaced || 0);
    case 'level':
      return Math.min(g.n, s.level);
    case 'plot':
      return Math.min(g.n, s.plots.length - 1);
    case 'balloon':
      return Math.min(g.n, st.balloons || 0);
  }
  return 0;
}

// ---------- ежедневные ----------
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const STAT = { upgrade: 'upgrades', decor: 'decorPlaced', balloon: 'balloons', tap: 'taps', earn: 'earnedAll', build: 'builds' };

export function makeDaily(s, income) {
  const L = s.level;
  const pool = [
    { type: 'upgrade', n: 3 + Math.min(4, Math.floor(L / 3)) },
    { type: 'decor', n: 2 + Math.min(4, Math.floor(L / 4)) },
    { type: 'balloon', n: 1 + (L >= 6 ? 1 : 0) },
    { type: 'tap', n: 4 },
    { type: 'earn', n: Math.max(500, Math.round((income * 900) / 100) * 100) },
    { type: 'build', n: 1 + (L >= 5 ? 1 : 0) },
  ];
  // перемешиваем и берём 3
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const st = s.stats;
  return {
    day: dayKey(),
    tasks: pool.slice(0, 3).map((x, i) => ({
      ...x,
      base: st[STAT[x.type]] || 0,
      claimed: false,
      reward: i === 2 ? { crystals: 5 } : { crystals: 2, coins: Math.max(100, Math.round(income * 180)) },
    })),
  };
}

export function dailyProgress(s, tk) {
  return Math.min(tk.n, Math.floor((s.stats[STAT[tk.type]] || 0) - tk.base));
}

// награды за серию входов (m — минуты дохода)
export const STREAK = [
  { coinsMin: 3 },
  { crystals: 3 },
  { coinsMin: 6 },
  { crystals: 5 },
  { coinsMin: 10 },
  { coinsMin: 15, crystals: 3 },
  { crystals: 12 },
];
