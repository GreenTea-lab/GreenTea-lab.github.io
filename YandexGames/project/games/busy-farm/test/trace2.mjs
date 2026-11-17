import { LEVELS } from '../src/data.js';
import { Farm } from '../src/sim.js';
import { Bot } from '../src/bot.js';
import { makeLayout } from '../src/layout.js';
import { expectedUp } from './calib.mjs';
const [n, coins, tl, pre] = [+process.argv[2], +process.argv[3], +process.argv[4] || 600, process.argv[5] ? process.argv[5].split(',') : []];
const L = { ...LEVELS[n - 1], coins, pre, start: JSON.parse(process.env.START || '{"cow":1}') };
const f = new Farm(L, makeLayout(false), expectedUp(n), 1);
console.log('up', JSON.stringify(expectedUp(n)));
const bot = new Bot(f, { aps: 1.5 });
let next = 0; const evc = {};
while (!f.finished && f.t < tl) {
  bot.tick(0.1); f.update(0.1);
  for (const e of f.events) evc[e.t] = (evc[e.t] || 0) + 1;
  f.events.length = 0;
  if (f.t >= next) { next += 30; const an = {}; for (const a of f.animals) if (!a.dead) an[a.kind] = (an[a.kind] || 0) + 1;
    console.log(f.t.toFixed(0), 'c', f.coins, JSON.stringify(an), 'st', JSON.stringify(f.stock), 'made', JSON.stringify(f.made), 'tr', f.truck.state, JSON.stringify(f.truck.cargo), f.slots.filter(s=>s.kind).map(s=>s.kind+(s.built?'+'+s.queue:'-')).join(','), 'gr', f.items.length); }
}
console.log('done', f.finished, f.finishT.toFixed(0), JSON.stringify(evc));
