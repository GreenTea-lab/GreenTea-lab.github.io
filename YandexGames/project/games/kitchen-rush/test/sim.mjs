// Прогон бота по уровням в node (без графики): очки, выдано, пропущено
import { Kitchen } from '../src/kitchen.js';
import { Bot } from '../src/bot.js';
import { LEVELS } from '../src/data.js';
const only = process.argv[2] ? process.argv[2].split(',').map((x) => +x - 1) : LEVELS.map((_, i) => i);
const seeds = +(process.argv[3] || 3);
const up = process.argv[4] ? JSON.parse(process.argv[4]) : {};
for (const i of only) {
  const res = [];
  for (let s = 0; s < seeds; s++) {
    const k = new Kitchen(i, { seed: 1000 + s, up });
    k.started = true;
    const bot = new Bot(k);
    const dt = 1 / 30;
    let fires = 0, burnt = 0, wrong = 0, sw = 0;
    while (!k.finished) {
      const inp = bot.step(dt);
      if (inp.sw) sw++;
      k.update(dt, inp);
      for (const e of k.events) { if (e.type === 'fire') fires++; if (e.type === 'burnt') burnt++; if (e.type === 'wrong') wrong++; }
      k.events.length = 0;
    }
    res.push({ score: k.score, served: k.served, missed: k.missed, fires, burnt, wrong, sw });
  }
  const avg = (f) => (res.reduce((a, r) => a + r[f], 0) / res.length).toFixed(0);
  const L = LEVELS[i];
  console.log(`L${i + 1} score ${res.map((r) => r.score).join('/')} avg ${avg('score')} | served ${avg('served')} missed ${avg('missed')} burnt ${avg('burnt')} fires ${avg('fires')} sw ${avg('sw')} | stars ${L.stars}`);
}
