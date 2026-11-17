// Телефон: меню, уровни, игра (вертикально)
import { run, done } from './shot.mjs';
const errs = await run({
  w: 414, h: 896, mobile: true, dpr: 2, debug: { bot: 1, fast: 1, quality: 'mid', seed: 3 },
  steps: async (page) => {
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'shots/m_menu.png' });
    await page.evaluate(() => window.__game.ui.levels());
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shots/m_levels.png' });
    await page.evaluate(() => window.__game.ui.intro(2));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/m_intro.png' });
    await page.evaluate(() => { window.__game.ui.closeModal(); window.__game.startLevel(2); });
    await page.evaluate(() => { const g = window.__game; for (let k = 0; k < 40 * 30; k++) { const inp = g.bot.input(1/30); g.w.step(1/30, inp); g.handleFx(); } });
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'shots/m_game.png' });
  },
});
done(errs);
