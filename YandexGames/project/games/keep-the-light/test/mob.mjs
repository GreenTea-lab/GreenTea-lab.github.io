import { run, done } from './shot.mjs';
const errs = await run({ w: 412, h: 860, mobile: true, dpr: 1, debug: { shots: 1, god: 1 }, steps: async (page) => {
  await page.waitForTimeout(1000); await page.screenshot({ path: 'shots/menuM.png' });
  await page.evaluate(() => { const g = window.__game; g.startNight(1); const k = g.items[0]; g.player.place(k.s.x + 1.6, k.s.z + 0.3, Math.atan2(1.6, 0.3)); g.player.pitch = -0.4; });
  await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/playM.png' });
  await page.evaluate(() => { const g = window.__game; g.player.place(21, 11.2, 0); });
  await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/playM2.png' });
  await page.evaluate(() => { window.__game.ui.pause(); });
  await page.waitForTimeout(800); await page.screenshot({ path: 'shots/pauseM.png' });
}});
done(errs);
