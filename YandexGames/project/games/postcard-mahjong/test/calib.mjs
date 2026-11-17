// Проверка уровней ботами: генерация всегда успешна, решатель находит решение, доля тупиков у «случайного» и «внимательного» игрока.
// node test/calib.mjs
import { level, COUNT, endlessBoard } from '../src/levels.js';
import { Game } from '../src/core.js';
const N = +process.env.N || 12;
function play(L, seed, smart) {
  const g = new Game({ pos: L.pos, types: L.types, seed, coins: L.coins, locks: L.locks, hidden: L.hidden });
  let R = seed * 7 + 1;
  const rnd = () => ((R = (R * 1664525 + 1013904223) >>> 0) / 4294967296);
  let shuffles = 0, moves = 0;
  while (g.left) {
    let m = g.movesList();
    if (!m.length) {
      shuffles++;
      if (shuffles > 20) return { ok: false, shuffles };
      g.shuffle();
      continue;
    }
    // «внимательный»: если все 4 одинаковые свободны — берёт их; предпочитает верхние; видимые лица только
    if (smart) {
      m.sort((a, b) => (g.tiles[b[0]].z + g.tiles[b[1]].z) - (g.tiles[a[0]].z + g.tiles[a[1]].z) || rnd() - 0.5);
    } else m = [m[Math.floor(rnd() * m.length)]];
    g.match(m[0][0], m[0][1]);
    moves++;
  }
  return { ok: true, shuffles, moves };
}
let worst = 0;
const rows = [];
for (let i = 0; i < COUNT; i++) {
  const L = level(i);
  let rs = 0, ss = 0, rShuf = 0;
  const t0 = Date.now();
  for (let s = 1; s <= N; s++) {
    const a = play(L, s * 31 + i, false);
    const b = play(L, s * 31 + i, true);
    if (a.shuffles === 0) rs++;
    if (b.shuffles === 0) ss++;
    rShuf += a.shuffles;
  }
  // решатель на свежей раздаче
  const g = new Game({ pos: L.pos, types: L.types, seed: 5 + i, coins: L.coins, locks: L.locks, hidden: L.hidden });
  const ts = Date.now();
  const h = g.solve();
  const solveMs = Date.now() - ts;
  worst = Math.max(worst, solveMs);
  rows.push(`${String(i + 1).padStart(3)} ${L.C.id.padEnd(9)} ${L.lay.padEnd(9)} t${String(L.pos.length).padStart(3)} ty${String(L.types.length).padStart(2)} k${L.locks} h${L.hidden ? 1 : 0} c${L.coins} | random-clean ${Math.round((rs / N) * 100)}% avgShuf ${(rShuf / N).toFixed(1)} | smart-clean ${Math.round((ss / N) * 100)}% | solve ${h ? 'ok' : 'NO'} ${solveMs}ms | par ${L.par.t3}/${L.par.t2}s | ${(Date.now() - t0)}ms`);
}
console.log(rows.join('\n'));
console.log('worst solve ms', worst);
for (let n = 1; n <= 16; n++) {
  const B = endlessBoard(n, 12345);
  const g = new Game({ pos: B.pos, types: B.types, seed: n, coins: B.coins, locks: B.locks, hidden: B.hidden });
  const ts = Date.now();
  const ok = g.solve();
  console.log('endless', n, B.lay, B.pos.length, 'types', B.types.length, 'locks', B.locks, 'hidden', B.hidden, 'solve', !!ok, Date.now() - ts, 'ms');
}
