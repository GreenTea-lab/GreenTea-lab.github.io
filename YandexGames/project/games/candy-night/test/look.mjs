// Скриншоты: меню, уровни, мастерская, игра. node test/look.mjs [level] [t]
import { run, done } from './shot.mjs';
const lvl = +(process.argv[2] ?? 0);
const T = +(process.argv[3] ?? 20);
const w = +(process.argv[4] ?? 1280), h = +(process.argv[5] ?? 720);
const mobile = process.argv[6] === 'm';
const errs = await run({
  w, h, mobile, debug: { bot: 1, fast: 1, quality: 'high', seed: 3 },
  steps: async (page) => {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'shots/menu.png' });
    await page.evaluate(() => window.__game.ui.levels());
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'shots/levels.png' });
    await page.evaluate((i) => window.__game.ui.intro(i), lvl);
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shots/intro.png' });
    await page.evaluate((i) => { window.__game.ui.closeModal(); window.__game.startLevel(i); }, lvl);
    await page.evaluate((T) => { const g = window.__game; for (let k = 0; k < T * 30; k++) { const inp = g.bot.input(1/30); g.w.step(1/30, inp); g.handleFx(); } }, T);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'shots/game.png' });
    const info = await page.evaluate(() => { const w = window.__game.w; return { banked: w.banked, bag: w.p.bag, t: w.t, en: w.enemies.length, calls: (window.__calls||[]).slice(-5) }; });
    console.log(JSON.stringify(info));
  },
});
done(errs);
