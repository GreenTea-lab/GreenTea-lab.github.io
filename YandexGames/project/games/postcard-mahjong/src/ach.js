// Достижения: цель, прогресс по сохранению, награда монетами (забирается в окне «Награды»)
import { CITIES, PER, ROUND1, ROUTES } from './levels.js';

const postcards = (d, gold) => Object.keys(d.postcards||{}).filter(k=>!gold||k.endsWith(':3')).length;
// пройденные маршруты: последний уровень Рио в маршруте
const routes = (d) => CITIES.filter((_,c)=>d.levels[(c+1)*PER-1]).length;
const stars = (d) => Object.values(d.levels).reduce((a, l) => a + (l.stars || 0), 0);

export const ACH = [
  { id: 'first', goal: 1, coins: 20, v: (d) => Object.keys(d.levels).length },
  { id: 'pc1', goal: 1, coins: 40, v: (d) => postcards(d) },
  { id: 'pc5', goal: 5, coins: 80, v: (d) => postcards(d) },
  { id: 'pc10', goal: 10, coins: 150, v: (d) => postcards(d) },
  { id: 'gold1', goal: 1, coins: 100, v: (d) => postcards(d, true) },
  { id: 'gold10', goal: 10, coins: 400, v: (d) => postcards(d, true) },
  { id: 'stars100', goal: 100, coins: 80, v: stars },
  { id: 'stars300', goal: 300, coins: 200, v: stars },
  { id: 'stars600', goal: 600, coins: 400, v: stars },
  { id: 'stars1500', goal: 1500, coins: 600, v: stars },
  { id: 'stars3000', goal: 3000, coins: 1000, v: stars },
  { id: 'routes3', goal: 3, coins: 300, v: routes },
  { id: 'routes5', goal: 5, coins: 500, v: routes },
  { id: 'routes10', goal: 10, coins: 1000, v: routes },
  { id: 'daily1', goal: 1, coins: 30, v: (d) => d.stats.daily },
  { id: 'daily7', goal: 7, coins: 70, v: (d) => d.stats.daily },
  { id: 'daily30', goal: 30, coins: 200, v: (d) => d.stats.daily },
  { id: 'combo5', goal: 5, coins: 30, v: (d) => d.stats.combo },
  { id: 'combo10', goal: 10, coins: 60, v: (d) => d.stats.combo },
  { id: 'pairs500', goal: 500, coins: 50, v: (d) => d.stats.pairs },
  { id: 'pairs3000', goal: 3000, coins: 150, v: (d) => d.stats.pairs },
  { id: 'pairs10000', goal: 10000, coins: 300, v: (d) => d.stats.pairs },
  { id: 'noHelp10', goal: 10, coins: 60, v: (d) => d.stats.noHelp },
  { id: 'boards5', goal: 5, coins: 80, v: (d) => d.stats.boards },
  { id: 'score', goal: 10000, coins: 100, v: (d) => d.best },
  { id: 'style', goal: 2, coins: 30, v: (d) => d.styles.length },
];

export const achState = (d, a) => {
  const cur = Math.min(a.goal, a.v(d) || 0);
  return { cur, done: cur >= a.goal, claimed: !!d.ach[a.id] };
};
// сколько наград можно забрать
export const achReady = (d) => ACH.filter((a) => { const s = achState(d, a); return s.done && !s.claimed; }).length;
