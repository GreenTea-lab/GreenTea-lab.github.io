import { run, done } from './shot.mjs';
const errs = await run({
  w: 960, h: 540, debug: { bot: 1, sub: 6, quality: 'low' },
  steps: async (page) => {
    await page.evaluate(() => window.__game.startRace(0));
    await page.waitForFunction(() => window.__game.race && window.__game.race.t > 7, null, { timeout: 120000, polling: 200 });
    await page.evaluate(() => { window.__game.paused = true; });
    const r = await page.evaluate(() => { const g = window.__game, r = g.race, c = g.camera.position; return r.opps.map((o, k) => ({ n: o.name, dc: Math.hypot(o._x - c.x, o._z - c.z).toFixed(1), d: o._dist.toFixed(1), op: r.oModels[k].opacity, mo: r.oModels[k].mats[0].opacity, tr: r.oModels[k].mats[0].transparent })); });
    console.log(JSON.stringify(r));
    await page.screenshot({ path: 'test/s_op.png' });
  },
});
done(errs);
