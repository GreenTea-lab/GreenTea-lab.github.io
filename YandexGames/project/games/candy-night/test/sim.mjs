// Прогон бота по уровням без графики: node test/sim.mjs [skill] [upLevel] [runs]
import { World } from '../src/world.js';
import { Bot } from '../src/bot.js';
import { LEVELS } from '../src/data.js';

const skill = +(process.argv[2] ?? 1);
const upL = +(process.argv[3] ?? 0);
const runs = +(process.argv[4] ?? 3);
const only = process.argv[5] !== undefined ? +process.argv[5] : null;
const up = { bag: upL, shoes: upL, dash: upL, lantern: upL, magnet: upL };
const res = [];
for (let i = 0; i < LEVELS.length; i++) {
  if (only !== null && i !== only) continue;
  const sc = [];
  let hits = 0,
    won = 0,
    tEnd = 0;
  for (let r = 0; r < runs; r++) {
    const w = new World(i, { up, seed: r + 1 });
    const b = new Bot(w, skill);
    const dt = 1 / 30;
    while (!w.finished && w.t < w.time + 5) w.step(dt, b.input(dt));
    sc.push(w.banked);
    hits += w.hits;
    won += w.won ? 1 : 0;
    tEnd += w.t;
  }
  sc.sort((a, b) => a - b);
  const lv = LEVELS[i];
  const avg = Math.round(sc.reduce((a, b) => a + b, 0) / runs);
  res.push(avg);
  console.log(`L${i + 1} ${lv.boss || ''} map ${new World(i).map.W}x${new World(i).map.H} min ${sc[0]} avg ${avg} max ${sc[sc.length - 1]} goal ${lv.goal.join('/')} won ${won}/${runs} hits ${(hits / runs).toFixed(1)} t ${(tEnd / runs).toFixed(0)}`);
}
console.log(JSON.stringify(res));
