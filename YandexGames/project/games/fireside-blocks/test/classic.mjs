import { Game } from '../src/core.js';
import { playOut } from '../src/bot.js';
const q = +(process.argv[2] || 1);
const res = [];
const t0 = Date.now();
for (let s = 1; s <= 12; s++) {
  const g = new Game({ seed: s });
  g.refill();
  const r = playOut(g, { maxMoves: 600, quality: q });
  res.push(r.score + '/' + r.moves);
}
console.log(res.join(' '), (Date.now() - t0) + 'ms');
