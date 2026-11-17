import { buildLevel, solveFair, starsFor, rng, levelPlan } from '../src/logic.js';
const N = +process.argv[2] || 60;
let t0 = Date.now();
const rows = [];
for (let n = 1; n <= N; n++) {
  const t = Date.now();
  const d = buildLevel(n);
  const ms = Date.now() - t;
  let w = 0, st = [0, 0, 0, 0];
  const R = rng(n * 31);
  for (let k = 0; k < 200; k++) { const r = solveFair(d, R, +(process.argv[3]||0.6)); if (r.won) { w++; st[starsFor(d, r.left)]++; } else st[0]++; }
  rows.push(`${String(n).padStart(2)} ${d.shape.padEnd(9)} L=${d.cards.length} S=${d.stock.length} S0=${d.target} stars=${d.stars} seed=${d.seed} mid=${(d.mid*100).toFixed(0)} lk=${d.plan.locks}x${d.plan.keys} sd=${d.plan.sand} win=${(w / 2).toFixed(0)}% 3*=${(st[3] / 2).toFixed(0)}% 2*=${(st[2] / 2).toFixed(0)}% 1*=${(st[1]/2).toFixed(0)}% ${ms}ms`);
}
console.log(rows.join('\n'));
console.log('total', Date.now() - t0, 'ms');
