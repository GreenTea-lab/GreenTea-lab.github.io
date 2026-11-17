// Бот против бота: node test/sim.mjs <mode> <levelA> <levelB> <games>
import { newGame, startTurn, legalSteps, playStep, endTurn, result, clone, key, maxUse, primeViolation } from '../src/rules.js';
import { choose } from '../src/bot.js';

const [mode = 'short', la = '1', lb = '0', games = '50'] = process.argv.slice(2);
const levels = [+la, +lb];
let wins = [0, 0], pts = [0, 0], turnsTotal = 0, gammons = 0, maxMs = 0, tMs = 0, moves = 0;
const r6 = () => 1 + Math.floor(Math.random() * 6);
for (let g = 0; g < +games; g++) {
  const s = newGame(mode);
  let p = g % 2;
  let turns = 0;
  while (true) {
    const turn = startTurn(s, p, r6(), r6());
    const t0 = performance.now();
    const steps = choose(s, p, turn, levels[p]);
    const ms = performance.now() - t0;
    maxMs = Math.max(maxMs, ms);
    tMs += ms;
    moves++;
    // проверка: шаги бота проходят через legalSteps
    for (const st of steps) {
      const legal = legalSteps(s, p, turn);
      const m = legal.find((x) => x.from === st.from && x.to === st.to && x.d === st.d);
      if (!m) throw new Error('illegal bot step ' + JSON.stringify(st) + ' legal ' + JSON.stringify(legal) + ' ' + key(s));
      playStep(s, turn, m);
    }
    if (legalSteps(s, p, turn).length) throw new Error('bot left moves ' + key(s) + ' dice ' + turn.dice);
    if (primeViolation(s, p)) throw new Error('prime');
    endTurn(s, turn);
    const sum = (q) => s.n[q].reduce((a, b) => a + b, 0) + s.bar[q] + s.off[q];
    if (sum(0) !== 15 || sum(1) !== 15) throw new Error('count ' + key(s));
    const r = result(s, p);
    if (r) {
      wins[p]++;
      pts[p] += r;
      if (r > 1) gammons++;
      break;
    }
    p = 1 - p;
    turns++;
    if (turns > 2000) throw new Error('too long');
  }
  turnsTotal += turns;
}
console.log(mode, 'L' + la, 'vs L' + lb, 'wins', wins, 'pts', pts, 'gammons', gammons, 'avg turns', (turnsTotal / +games).toFixed(1), 'bot ms avg', (tMs / moves).toFixed(1), 'max', maxMs.toFixed(0));
