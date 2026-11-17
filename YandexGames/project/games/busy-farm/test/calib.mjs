// Прогон ботом всех уровней: время прохождения против времени на золото.
// node test/calib.mjs [from] [to] [search]  — search: подобрать стартовые деньги
import { LEVELS, UP_COST, UNLOCK, UPGRADES, START } from '../src/data.js';
import { Farm } from '../src/sim.js';
import { runLevel } from '../src/bot.js';
import { makeLayout } from '../src/layout.js';

// какие улучшения у игрока к уровню n (2.2 звезды за уровень, тратит по кругу)
export function expectedUp(n) {
  let stars = Math.floor(2.2 * (n - 1));
  const up = Object.fromEntries(UPGRADES.map((k) => [k, 0]));
  const keys = UPGRADES.filter((k) => !UNLOCK[k] || UNLOCK[k] < n);
  let changed = true;
  while (changed) {
    changed = false;
    // самое дешёвое следующее улучшение
    const k = keys.filter((k) => up[k] < 5).sort((a, b) => up[a] - up[b])[0];
    if (k && stars >= UP_COST[up[k]]) { stars -= UP_COST[up[k]]; up[k]++; changed = true; }
  }
  return up;
}

if (process.argv[1].endsWith("calib.mjs")) main();
function main() {
const from = +(process.argv[2] || 1), to = +(process.argv[3] || 48);
const search = process.argv[4] === 'search';
const portrait = process.env.PORTRAIT === '1';
const lay = makeLayout(portrait);
const res = [];
for (let n = from; n <= to; n++) {
  const L = LEVELS[n - 1];
  const up = expectedUp(n);
  const times = [1, 2, 3].map((seed) => runLevel(Farm, L, lay, up, { seed, aps: 1.5 }).t);
  const avg = times.reduce((a, b) => a + b, 0) / 3;
  const ratio = avg / L.gold;
  console.log(`L${n} gold ${L.gold}s coins ${L.coins} bot ${times.map((t) => t === Infinity ? 'FAIL' : t.toFixed(0)).join('/')} ratio ${ratio.toFixed(2)} ${JSON.stringify(L.goals)}`);
  res.push({ n, ratio });
}
}
