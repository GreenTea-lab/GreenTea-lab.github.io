import { run, done } from './shot.mjs';
const errs = await run({
  w: 390, h: 844, mobile: true, debug: { bot: 1, sub: 6, quality: 'low' },
  steps: async (page) => {
    await page.evaluate(() => { window.__save.data.daily.day = new Date().toISOString().slice(0,10); window.__game.ui.menu(); });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test/m_menu.png' });
    await page.tap('[data-a=play]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test/m_tracks.png' });
    await page.tap('[data-a=back]');
    await page.tap('[data-a=garage]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test/m_garage.png' });
    await page.evaluate(() => window.__game.startRace(1));
    await page.waitForTimeout(7000);
    await page.screenshot({ path: 'test/m_race.png' });
    await page.evaluate(() => window.__game.ui.pause());
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test/m_pause.png' });
  },
});
done(errs);
