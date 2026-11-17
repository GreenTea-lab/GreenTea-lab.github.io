// Пересчёт порогов звёзд по прогону бота без улучшений: node test/calib.mjs [runs]
import fs from 'fs';
import { World } from '../src/world.js';
import { Bot } from '../src/bot.js';
import { LEVELS } from '../src/data.js';

const runs = +(process.argv[2] ?? 4);
const avg = [];
for (let i = 0; i < LEVELS.length; i++) {
  let sum = 0;
  for (let r = 0; r < runs; r++) {
    const w = new World(i, { up: {}, seed: r + 1 });
    const b = new Bot(w, 1);
    const dt = 1 / 30;
    while (!w.finished && w.t < w.time + 5) w.step(dt, b.input(dt));
    sum += w.banked;
  }
  avg.push(sum / runs);
}
const r5 = (v) => Math.round(v / 5) * 5;
let src = fs.readFileSync('src/data.js', 'utf8');
let k = 0;
src = src.replace(/goal: \[[^\]]+\]/g, () => {
  const L = LEVELS[k];
  const a = avg[k++];
  if (L.boss) return `goal: [1, ${r5(a * 0.55)}, ${r5(a * 0.95)}]`;
  return `goal: [${r5(a * 0.52)}, ${r5(a * 0.8)}, ${r5(a * 1.12)}]`;
});
fs.writeFileSync('src/data.js', src);
console.log(avg.map((a, i) => `L${i + 1} ${Math.round(a)}`).join(' '));
