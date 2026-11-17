// без улучшений: проходим ли уровни вообще
import { LEVELS, UPGRADES } from '../src/data.js';
import { Farm } from '../src/sim.js';
import { runLevel } from '../src/bot.js';
import { makeLayout } from '../src/layout.js';
const lay = makeLayout(process.env.PORTRAIT === '1');
const up = Object.fromEntries(UPGRADES.map((k) => [k, 0]));
for (const n of [10, 15, 20, 23, 30, 35, 40, 45, 47, 48]) {
  const L = LEVELS[n - 1];
  const r = runLevel(Farm, L, lay, up, { seed: 1, aps: 1.5 });
  console.log(`L${n} gold ${L.gold} silver ${L.silver} noup ${r.t === Infinity ? 'FAIL' : r.t.toFixed(0)} ratio ${(r.t / L.gold).toFixed(2)}`);
}
