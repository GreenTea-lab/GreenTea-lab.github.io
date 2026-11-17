// Подбор порогов звёзд по прогону бота: база = среднее без лучшего заезда, звёзды = доли базы
import fs from 'fs';
import { Kitchen } from '../src/kitchen.js';
import { Bot } from '../src/bot.js';
import { LEVELS } from '../src/data.js';
const seeds = 8;
const out = [];
for (let i = 0; i < LEVELS.length; i++) {
  const sc = [];
  for (let s = 0; s < seeds; s++) {
    const k = new Kitchen(i, { seed: 2000 + s });
    k.started = true;
    const bot = new Bot(k);
    while (!k.finished) {
      const inp = bot.step(1 / 30);
      k.update(1 / 30, inp);
      k.events.length = 0;
    }
    sc.push(k.score);
  }
  sc.sort((a, b) => a - b);
  const base = sc.slice(0, -1).reduce((a, b) => a + b, 0) / (sc.length - 1);
  const f = i < 2 ? [0.22, 0.45, 0.7] : [0.28, 0.55, 0.8];
  const st = f.map((x) => Math.max(20, Math.round((base * x) / 10) * 10));
  out.push(st);
  console.log(`L${i + 1} scores ${sc.join('/')} base ${base.toFixed(0)} → stars ${st}`);
}
let src = fs.readFileSync('src/data.js', 'utf8');
let n = 0;
src = src.replace(/stars: \[\d+, \d+, \d+\]/g, () => `stars: [${out[n++].join(', ')}]`);
if (n !== LEVELS.length) throw new Error('replaced ' + n);
fs.writeFileSync('src/data.js', src);
console.log('written', n);
