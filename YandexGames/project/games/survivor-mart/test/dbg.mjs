import { run, done } from './shot.mjs';
const errs = await run({
  w: 960, h: 540, debug: { bot: 1, quality: 'low', sub: 4 },
  steps: async (page) => {
    await page.click('[data-a="play"]');
    await page.waitForTimeout(800);
    await page.click('[data-open]');
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(2000);
      console.log(await page.evaluate(() => {
        const g = window.__game, w = g.w, P = w.P, b = g.bot;
        return JSON.stringify({ x: P.x.toFixed(2), z: P.z.toFixed(2), near: P.near && P.near.kind + ':' + (typeof P.near.ref === 'number' ? P.near.ref : ''), goal: b && b.goal, path: b && b.path && b.path.slice(0, 3), okT: w.nav.okXZ ? w.nav.okXZ(-2.2, -8.24, 'p') : null, sh: w.shelves.slice(0, 4).map((s) => s.type + s.n) });
      }));
    }
  },
});
done(errs);
