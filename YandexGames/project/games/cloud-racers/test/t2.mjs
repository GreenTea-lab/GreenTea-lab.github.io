import { run, done } from './shot.mjs';
const errs = await run({
  w: 1280, h: 720, debug: { bot: 1, sub: 6 },
  steps: async (page) => {
    await page.evaluate(() => { const s = window.__save.data; s.unlocked = 12; s.coins = 50000; s.daily.day = new Date().toISOString().slice(0,10); window.__game.ui.menu(); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test/s_menu.png' });
    await page.click('[data-a=play]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test/s_tracks.png' });
    await page.click('[data-a=back]');
    await page.click('[data-a=garage]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test/s_garage.png' });
    for (const idx of [4, 7, 10]) {
      await page.evaluate((i) => window.__game.startRace(i), idx);
      await page.waitForTimeout(9000);
      await page.screenshot({ path: `test/s_theme${idx}.png` });
    }
  },
});
done(errs);
