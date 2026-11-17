// Экран глав и магазин скинов, десктоп и телефон → /tmp/claude-0/ui_*.png
import { run, done } from './shot.mjs';
const all = [];
for (const [kind, w, h, dpr, mobile] of [['d', 1280, 720, 1, false], ['m', 405, 720, 2, true]]) {
  const errs = await run({ w, h, dpr, mobile, steps: async (page) => {
    await page.evaluate(() => {
      const s = window.__save.data;
      s.tut.classic = 1;
      for (let i = 0; i < 70; i++) s.levels[i] = { stars: 3 };
      s.coins = 9000;
      window.__game.ui.season = 4;
      window.__game.ui.levels();
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `/tmp/claude-0/ui_levels_${kind}.png` });
    await page.evaluate(() => { window.__game.toMenu(); window.__game.ui.styles(); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/tmp/claude-0/ui_styles_${kind}.png` });
  } });
  all.push(...errs);
}
done(all);
