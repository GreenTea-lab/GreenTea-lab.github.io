// Крупный текст на телефоне
import { run, done } from './shot.mjs';
const errs = await run({ w: 390, h: 800, mobile: true, dpr: 2, steps: async (page) => {
  await page.evaluate(() => { const A = window.__app; A.save.data.settings.text = 2; document.documentElement.dataset.text = '2'; A.save.data.tutDone = true; A.renderMenu(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test/out/big_menu.png' });
  await page.evaluate(() => window.__app.openLevel(90)); await page.waitForTimeout(400);
  await page.screenshot({ path: 'test/out/big_game.png' });
  const m = await page.evaluate(() => { const b = document.querySelector('.board').getBoundingClientRect(); const cs = getComputedStyle(document.querySelector('.board')).getPropertyValue('--cs'); return { cs, bw: b.width, scrollW: document.documentElement.scrollWidth }; });
  console.log(m);
  await page.click('.t-list'); await page.waitForTimeout(300);
  await page.screenshot({ path: 'test/out/big_clues.png' });
}});
done(errs);
