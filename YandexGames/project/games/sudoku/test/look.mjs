// Полный сад и тема «Рассвет»
import { run, done } from './shot.mjs';
const errs = await run({ w: 1366, h: 768, steps: async (page) => {
  await page.evaluate(() => { const A = window.__app; A.save.data.solved = 70; A.save.data.seenItems = 15; A.renderGarden(); A.show('garden'); });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'test/out/garden_full.png' });
  await page.evaluate(() => { const A = window.__app; A.save.data.settings.theme = 'dawn'; document.documentElement.dataset.theme = 'dawn'; A.scene.setTheme('dawn'); A.save.data.tutDone = true; A.openGame('lvl:medium:3'); const b = A.board; for (let i = 0; i < 30; i++) if (!b.vals[i]) { b.select(i); b.input(b.sol[i]); } b.select(44); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test/out/dawn_game.png' });
}});
const e2 = await run({ w: 390, h: 800, mobile: true, dpr: 2, steps: async (page) => {
  await page.evaluate(() => { const A = window.__app; A.save.data.settings.theme = 'dawn'; document.documentElement.dataset.theme = 'dawn'; A.scene.setTheme('dawn'); A.renderMenu(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test/out/dawn_menu.png' });
  await page.evaluate(() => { const A = window.__app; A.save.data.settings.theme = 'contrast'; document.documentElement.dataset.theme = 'contrast'; A.scene.setTheme('contrast'); A.save.data.tutDone = true; A.openGame('lvl:easy:2'); A.board.select(10); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test/out/contrast_game.png' });
}});
done([...errs, ...e2]);
