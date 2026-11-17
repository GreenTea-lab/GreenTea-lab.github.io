import { run, done } from './shot.mjs';
const errs = await run({
  w: 1280, h: 720, debug: { bot: 1, sub: 8 },
  steps: async (page) => {
    await page.screenshot({ path: 'test/s_menu.png' });
    await page.evaluate(() => window.__game.startRace(0));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test/s_count.png' });
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(3000);
      const st = await page.evaluate(() => { const r = window.__game.race; return r ? { t: +r.t.toFixed(1), s: Math.round(r.player.sTotal), sp: +r.player.speed.toFixed(1), place: r.place, fin: r.finished, d: +r.player.d.toFixed(1) } : null; });
      console.log(JSON.stringify(st));
      if (i === 2) await page.screenshot({ path: 'test/s_race1.png' });
      if (st && st.fin) break;
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test/s_results.png' });
  },
});
done(errs);
