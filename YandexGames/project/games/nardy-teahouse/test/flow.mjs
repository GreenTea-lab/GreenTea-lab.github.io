// Поток экранов + партия, где за игрока ходит бот
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/f_';
const [w, h, mobile, mode = 'long', lvl = '1'] = process.argv.slice(2);
const W = +w || 1280, H = +h || 720, M = mobile === 'm';
const errs = await run({ w: W, h: H, mobile: M, dpr: M ? 2 : 1, debug: { speed: +(process.env.SPEED || 4) }, steps: async (p) => {
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + 'home.png' });
  await p.click(`[data-a="${mode}"]`);
  await p.waitForTimeout(500);
  await p.screenshot({ path: out + 'bots.png' });
  await p.click(`.bot[data-lv="${lvl}"]`);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + 'start.png' });
  let shots = 0, t0 = Date.now();
  for (let k = 0; k < 4000; k++) {
    const st = await p.evaluate(() => {
      const g = window.__game, m = g.match;
      if (g.ui.modalOpen) return 'modal';
      if (m.busy) return 'busy';
      if (m.phase === 'opening' || m.phase === 'roll') { m.roll(); return 'roll'; }
      if (m.phase === 'move') {
        const loc = [...m.movable][Math.floor(Math.random() * m.movable.size)];
        m.select(loc);
        const tg = [...m.targets.keys()];
        m.moveTo(tg[Math.floor(Math.random() * tg.length)]);
        return 'move';
      }
      return m.phase;
    });
    if (st === 'move' && shots < 3 && k > 20 * (shots + 1)) { await p.waitForTimeout(300); await p.screenshot({ path: out + 'mid' + shots + '.png' }); shots++; }
    if (st === 'modal') break;
    if (Date.now() - t0 > 400000) { console.log('timeout'); break; }
    await p.waitForTimeout(st === 'busy' || st === 'bot' ? 120 : 60);
  }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + 'end.png' });
  console.log(await p.evaluate(() => JSON.stringify({ games: window.__save.data.games, wins: window.__save.data.wins, coins: window.__save.data.coins })));
}});
done(errs);
