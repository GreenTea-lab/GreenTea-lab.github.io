// Прогон партий ботов: проверка правил и силы уровней. node test/sim.mjs
import * as R from '../src/rules.js';
function runMatch(mode, n, levels, seed, target = 101) {
  const m = R.newMatch({ mode, n, target, diff: 1, seed });
  const rand = R.rng(seed * 31 + 7);
  let rounds = 0, fish = 0;
  while (!m.done) {
    const r = R.startRound(m);
    let guard = 0;
    while (!r.over) {
      if (guard++ > 500) throw new Error('loop');
      const p = r.turn;
      const mv = R.botMove(r, p, levels[p], rand);
      if (mv) R.play(r, p, mv.id, mv.side);
      else if (r.bone.length) R.draw(r, p);
      else R.pass(r, p);
    }
    // проверка: все 28 костей на месте
    const cnt = r.hands.flat().length + r.bone.length + (r.first ? 1 : 0) + r.left.length + r.right.length;
    if (cnt !== 28) throw new Error('count ' + cnt);
    const res = R.applyRound(m, r);
    if (res.fish) fish++;
    rounds++;
  }
  return { m, rounds, fish };
}
const N = 400;
for (const [name, mode, n, lv] of [
  ['goat hard+hard vs easy', 'goat', 4, [2, 0, 2, 0]],
  ['goat med vs easy', 'goat', 4, [1, 0, 1, 0]],
  ['goat hard vs med', 'goat', 4, [2, 1, 2, 1]],
  ['goat equal med', 'goat', 4, [1, 1, 1, 1]],
  ['classic2 hard vs easy', 'classic', 2, [2, 0]],
  ['classic2 med vs easy', 'classic', 2, [1, 0]],
  ['classic2 hard vs med', 'classic', 2, [2, 1]],
  ['classic3 hard vs med,med', 'classic', 3, [2, 1, 1]],
  ['classic4 med vs easy x3', 'classic', 4, [1, 0, 0, 0]],
]) {
  let w = 0, rounds = 0, fish = 0;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const o = runMatch(mode, n, lv, i + 1);
    if (o.m.done.win === 0) w++;
    rounds += o.rounds; fish += o.fish;
  }
  console.log(name.padEnd(28), 'win0', (w / N * 100).toFixed(0) + '%', 'rounds/match', (rounds / N).toFixed(1), 'fish', (fish / rounds * 100).toFixed(0) + '%', (Date.now() - t0) + 'ms');
}
