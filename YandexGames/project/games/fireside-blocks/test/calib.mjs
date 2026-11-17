// Подбор уровней ботом: процент побед «внимательного» и «рассеянного» бота, медиана ходов → норма для 3 звёзд (src/par.js)
import { Game } from '../src/core.js';
import { playOut } from '../src/bot.js';
import { level, COUNT } from '../src/levels.js';
import fs from 'fs';
import { PAR } from '../src/par.js';
const RUNS = +(process.env.RUNS || 16);
const only = process.argv[2] ? process.argv[2].split('-').map(Number) : [0, COUNT - 1];
const par = PAR.slice();
const rows = [];
for (let i = only[0]; i <= (only[1] ?? only[0]); i++) {
  const L = level(i);
  const res = (q) => {
    const out = [];
    for (let s = 0; s < RUNS; s++) {
      const g = new Game({ seed: 77 + s * 101 + i, board: L.board, level: L, mode: 'adv' });
      g.refill();
      out.push(playOut(g, { maxMoves: 150, quality: q, R: (() => { let z = s * 999 + 5; return () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296); })() }));
    }
    return out;
  };
  const good = res(1), sloppy = res(0.8);
  const wins = (a) => a.filter((r) => r.win).length / a.length;
  const mv = good.filter((r) => r.win).map((r) => r.moves).sort((a, b) => a - b);
  const med = mv.length ? mv[Math.floor(mv.length * 0.5)] : 40;
  par[i] = Math.ceil(med * 1.15) + 1;
  const goal = L.goal.type === 'score' ? 'score ' + L.goal.target : Object.entries(L.goal.items).map(([k, v]) => k + ':' + v).join(',');
  rows.push(`${String(i + 1).padStart(2)} good ${(wins(good) * 100).toFixed(0).padStart(3)}% sloppy ${(wins(sloppy) * 100).toFixed(0).padStart(3)}% med ${med} par ${par[i]}  ${goal}`);
  console.log(rows[rows.length - 1]);
}
// без аргументов — все уровни, с диапазоном (например 60-139) — дописываем только его, остальные нормы не трогаем
fs.writeFileSync('src/par.js', '// Норма ходов на 3 звезды по уровням (подобрана ботом: test/calib.mjs)\nexport const PAR = ' + JSON.stringify(par) + ';\n');
