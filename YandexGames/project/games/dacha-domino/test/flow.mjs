import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/f_';
const [w, h, mobile] = process.argv.slice(2);
const W = +w || 1280, H = +h || 720, M = mobile === 'm';
const errs = await run({ w: W, h: H, mobile: M, dpr: M ? 2 : 1, steps: async (p) => {
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + 'home.png' });
  await p.click('[data-a="play"]');
  await p.waitForTimeout(2600);
  await p.screenshot({ path: out + 'lvl.png' });
  // играем ботом: ход за ходом
  for (let k = 0; k < 400; k++) {
    const st = await p.evaluate(() => {
      const g = window.__game; const tb = g.table;
      if (g.ui.modalOpen) { const m = document.querySelector('.modal [data-a="ok"]'); if (m) { m.click(); return 'ok'; } return 'modal'; }
      if (!tb.g || tb.busy) return 'busy';
      if (tb.over) return 'over';
      for (let i = tb.g.cards.length - 1; i >= 0; i--) if (tb.g.playable(i)) { tb.play(i); return 'play'; }
      if (tb.g.stock.length) { tb.draw(); return 'draw'; }
      return 'stuck';
    });
    if (k === 6) await p.screenshot({ path: out + 'mid.png' });
    if (st === 'over' || st === 'modal') break;
    await p.waitForTimeout(st === 'busy' ? 150 : 380);
  }
  await p.waitForTimeout(3500);
  await p.screenshot({ path: out + 'end.png' });
}});
done(errs);
