// Подбор раскладок: для каждого уровня из диапазона берём первый salt, на котором внимательный бот выигрывает почти всегда
// node test/salt.mjs 60-139
import { Game } from '../src/core.js';
import { playOut } from '../src/bot.js';
import { make, level } from '../src/levels.js';
import { SALT } from '../src/salt.js';
import fs from 'fs';
const RUNS = +(process.env.RUNS || 16);
const [a, b] = process.argv[2].split('-').map(Number);
const out = { ...SALT };
const score = (L, i, q) => {
  let w = 0;
  for (let s = 0; s < RUNS; s++) {
    const g = new Game({ seed: 77 + s * 101 + i, board: L.board, level: L, mode: 'adv' });
    g.refill();
    const z0 = s * 999 + 5;
    let z = z0;
    if (playOut(g, { maxMoves: 150, quality: q, R: () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296) }).win) w++;
  }
  return w / RUNS;
};
for (let i = a; i <= b; i++) {
  let best = [-1, 0];
  for (let salt = 0; salt < +(process.env.SALTS || 14); salt++) {
    const L = make(i, salt);
    const g = score(L, i, 1), sl = g >= 0.88 ? score(L, i, 0.8) : 0;
    const v = g + sl * 0.3;
    if (v > best[0]) best = [v, salt, g, sl];
    if (g >= 0.88 && sl >= 0.5) break;
  }
  if (best[1]) out[i] = best[1]; else delete out[i];
  console.log(i + 1, 'salt', best[1], 'good', (best[2] * 100).toFixed(0), 'sloppy', (best[3] * 100).toFixed(0));
}
fs.writeFileSync('src/salt.js', '// Запасные сиды раскладок для тугих уровней (подобраны ботом: test/salt.mjs)\nexport const SALT = ' + JSON.stringify(out) + ';\n');
