// Подбор стартовых денег: минимальные деньги, при которых бот укладывается в ~0.72 времени на золото.
import { LEVELS, BUILDINGS } from '../src/data.js';
import { Farm } from '../src/sim.js';
import { runLevel } from '../src/bot.js';
import { makeLayout } from '../src/layout.js';
import { expectedUp } from './calib.mjs';
const lay = makeLayout(false);
const TARGET = +(process.env.TARGET || 0.72);
const nice = (c) => { const p = Math.pow(10, Math.max(2, Math.floor(Math.log10(c)) - 1)); return Math.ceil(c / p) * p; };
const OUT_OF = {}; for (const [k, B] of Object.entries(BUILDINGS)) OUT_OF[B.out] = k;
function chainOf(L) {
  const s = [];
  for (const k of Object.keys(L.goals)) { let it = k; while (OUT_OF[it]) { s.push(OUT_OF[it]); it = BUILDINGS[OUT_OF[it]].in; } }
  return [...new Set(s)].sort((a, b) => BUILDINGS[a].cost - BUILDINGS[b].cost);
}
function ratio(L, coins, start, pre) {
  const L2 = { ...L, coins, start, pre };
  const up = expectedUp(L.n);
  const ts = [1, 2, 3].map((seed) => runLevel(Farm, L2, lay, up, { seed, aps: 1.5, limit: L.gold * 2.5 }).t);
  return ts.reduce((a, b) => a + b, 0) / 3 / L.gold;
}
const from = +(process.argv[2] || 1), to = +(process.argv[3] || 48);
const out = [];
for (let n = from; n <= to; n++) {
  const L = LEVELS[n - 1];
  const start = L.animals.includes('cow') && n >= 36 ? { cow: 1 } : L.animals.includes('sheep') && n >= 22 ? { sheep: 1, goose: 2 } : { goose: 2 };
  const cap = L.goals.coins ? L.goals.coins * 0.7 : 200000;
  let pre = [];
  const chain = chainOf(L);
  let best = null;
  for (let attempt = 0; attempt <= chain.length && !best; attempt++) {
    pre = chain.slice(0, attempt);
    let c = 100;
    while (c <= cap) {
      const r = ratio(L, c, start, pre);
      if (r <= TARGET) { best = { c, r }; break; }
      c = nice(c * 1.18);
    }
  }
  if (!best) best = { c: nice(cap), r: ratio(L, nice(cap), start, pre) };
  console.log(`L${n} coins ${best.c} ratio ${best.r.toFixed(2)} start ${JSON.stringify(start)} pre ${JSON.stringify(pre)}`);
  out.push([best.c, start, pre]);
}
console.log('START_JSON ' + JSON.stringify(out));
