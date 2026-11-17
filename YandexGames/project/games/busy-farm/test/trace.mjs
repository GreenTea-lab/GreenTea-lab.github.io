import { LEVELS } from '../src/data.js';
import { Farm } from '../src/sim.js';
import { Bot } from '../src/bot.js';
import { makeLayout } from '../src/layout.js';
import { expectedUp } from './calib.mjs';
const n = +process.argv[2];
const L = LEVELS[n - 1];
const f = new Farm(L, makeLayout(false), expectedUp(n), 1);
const bot = new Bot(f, { aps: 1.5 });
let next = 0;
const evc = {};
while (!f.finished && f.t < (+process.argv[3] || 300)) {
  bot.tick(0.1); f.update(0.1);
  for (const e of f.events) evc[e.t] = (evc[e.t] || 0) + 1;
  f.events.length = 0;
  if (f.t >= next) {
    next += 10;
    const an = {}; for (const a of f.animals) if (!a.dead) an[a.kind] = (an[a.kind] || 0) + 1;
    console.log(f.t.toFixed(0), 'coins', f.coins, 'an', JSON.stringify(an), 'stock', JSON.stringify(f.stock), 'made', JSON.stringify(f.made), 'truck', f.truck.state, JSON.stringify(f.truck.cargo), 'slots', f.slots.filter(s=>s.kind).map(s=>s.kind+(s.built?'+'+s.queue:'-')).join(','), 'water', f.well.water, 'grass', f.grass.size, 'ground', f.items.length);
  }
}
console.log('done', f.finished, f.finishT, JSON.stringify(evc));
