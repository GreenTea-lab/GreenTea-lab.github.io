// Боты против ботов: проверка правил и силы уровней. node test/sim.mjs
import { Game, rng } from '../src/core.js';
import { botAction, whoActs } from '../src/bot.js';
function play(opts, lv, seed) {
  const g = new Game({ ...opts, seed });
  const R = rng(seed + 99);
  let steps = 0;
  while (!g.over) {
    if (++steps > 5000) throw new Error('stuck ' + JSON.stringify(g.toJSON()));
    // как контроллер: защитник, затем подкидывающие по порядку
    let p;
    if (!g.table.length) p = g.attacker;
    else if (g.needDefense() && R() < 0.6) p = g.defender;
    else { const th = g.throwers(); p = th.length && (R() < 0.7 || !g.needDefense()) ? th[0] : g.defender; }
    let a = botAction(g, p, lv[p], R);
    if (!a) { if (p !== g.defender && g.table.length) a = { t: 'pass' }; else throw new Error('no action p=' + p + ' ' + JSON.stringify(g.toJSON())); }
    const ev = g.apply(p, a);
    if (!ev) throw new Error('illegal ' + JSON.stringify(a) + ' p=' + p + ' ' + JSON.stringify(g.toJSON()));
  }
  // проверка: все карты на месте
  const total = g.discard.length + g.hands.reduce((s, h) => s + h.length, 0) + g.deck.length;
  if (total !== g.size) throw new Error('cards lost ' + total);
  return g.durak;
}
for (const [name, opts, lv] of [
  ['2p podk 36 easy vs med', { players: 2, deck: 36 }, [0, 1]],
  ['2p podk 36 med vs hard', { players: 2, deck: 36 }, [1, 2]],
  ['2p perev 36 med vs hard', { players: 2, deck: 36, mode: 'perevodnoy' }, [1, 2]],
  ['4p podk 36 e m h h', { players: 4, deck: 36 }, [0, 1, 2, 1]],
  ['6p perev 36', { players: 6, deck: 36, mode: 'perevodnoy' }, [1, 1, 2, 2, 0, 0]],
  ['6p podk 52', { players: 6, deck: 52 }, [1, 2, 1, 2, 1, 2]],
  ['4p perev 24', { players: 4, deck: 24, mode: 'perevodnoy' }, [1, 2, 1, 2]],
]) {
  const N = +process.argv[2] || 400;
  const cnt = {};
  const t0 = Date.now();
  for (let s = 1; s <= N; s++) { const d = play(opts, lv, s * 7919); cnt[d] = (cnt[d] || 0) + 1; }
  console.log(name, 'durak counts', JSON.stringify(cnt), (Date.now() - t0) + 'ms');
}
