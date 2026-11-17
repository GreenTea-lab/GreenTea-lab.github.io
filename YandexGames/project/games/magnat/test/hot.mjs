// игра за человека через интерфейс: нажимаем разумные кнопки, пока партия не закончится
import { run, done } from './shot.mjs';
const [w, h, mobile] = [+(process.argv[2] || 1280), +(process.argv[3] || 720), process.argv[4] === 'm'];
const errs = await run({ w, h, mobile, debug: { turbo: 30 }, steps: async (page) => {
  await page.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.close && m.close()));
  await page.evaluate(() => { window.__save.data.settings.fast = true; window.__game.newGame({ n: 4, diff: 1, limit: 0, h: 3 }); });
  const t0 = Date.now();
  const seen = {};
  let shots = 0;
  while (Date.now() - t0 < 420000) {
    const r = await page.evaluate(() => {
      const vis = (b) => b && !b.disabled && b.offsetParent !== null;
      const q = (s) => [...document.querySelectorAll(s)].filter(vis);
      const M = window.__game.M;
      if (!M) return 'nomatch';
      const modal = [...document.querySelectorAll('#mod .modal')].pop();
      const click = (b, n) => { b.click(); return n; };
      if (modal) {
        const cls = modal.className;
        const by = (a) => q(`#mod .modal:last-child [data-a="${a}"]`)[0];
        if (by('yes')) return click(by('yes'), 'yes');
        if (by('take')) return click(by('take'), 'take');
        if (by('buy')) return click(by('buy'), 'buy');
        if (by('ok')) return click(by('ok'), 'card');
        if (by('roll')) return click(by('roll'), 'jailroll');
        if (cls.includes('aucm')) { const bs = q('#mod .actl button'); if (bs.length) return click(Math.random() < 0.5 ? bs[0] : bs[bs.length - 1], 'auction'); return 'aucwait'; }
        const acts = q('#mod .modal:last-child [data-act="sell"], #mod .modal:last-child [data-act="mortgage"]');
        if (by('pay')) return click(by('pay'), 'pay');
        if (acts.length && by('bk')) return click(acts[0], 'raise');
        if (by('bk')) return click(by('bk'), 'bankrupt');
        if (by('again')) return 'results';
        return 'modal:' + cls;
      }
      const big = q('.bar [data-a="roll"], .bar [data-a="end"]')[0];
      if (big) {
        // иногда строимся
        if (big.dataset.a === 'end' && Math.random() < 0.3) { q('.bar [data-a="manage"]')[0].click(); const b = q('#mod [data-act="build"]')[0]; if (b) b.click(); document.querySelectorAll('#mod .modal').forEach((m) => m.close()); return 'build'; }
        return click(big, big.dataset.a);
      }
      return 'wait';
    });
    seen[r] = (seen[r] || 0) + 1;
    if (r === 'results') break;
    if (r === 'auction' && shots < 1) { shots++; await page.screenshot({ path: 'shots/h_auction.png' }); }
    if (r === 'buy' && !seen.shotbuy) { seen.shotbuy = 1; }
    await page.waitForTimeout(150);
  }
  await page.screenshot({ path: 'shots/h_end.png' });
  console.log(JSON.stringify(seen));
  console.log(await page.evaluate(() => JSON.stringify({ round: window.__game.M.round, over: window.__game.M.over, money: window.__game.M.players.map((p) => p.money) })));
} });
done(errs);
