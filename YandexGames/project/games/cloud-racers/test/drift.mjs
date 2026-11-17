import { run, done } from './shot.mjs';
const errs = await run({
  w: 960, h: 540, debug: { bot: 1, drift: 1, sub: 12, quality: 'low' },
  steps: async (page) => {
    await page.evaluate(() => window.__game.startRace(2));
    let shot = false, maxHit = 0, drifts = 0, turbos = 0;
    for (let i = 0; i < 90; i++) {
      await page.waitForTimeout(1500);
      const st = await page.evaluate(() => { const r = window.__game.race; return { t: r.t, fin: r.finished, drift: r.player.drift, dT: r.player.driftT, place: r.place }; });
      if (st.drift && st.dT > 0.8 && !shot) { await page.screenshot({ path: 'test/s_drift.png' }); shot = true; }
      if (st.fin) { console.log('time', await page.evaluate(() => window.__game.race.time.toFixed(2)), 'place', st.place); break; }
    }
  },
});
done(errs);
