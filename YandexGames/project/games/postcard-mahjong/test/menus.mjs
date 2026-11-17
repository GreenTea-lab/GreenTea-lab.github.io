// Меню и задача дня на разных экранах: node test/menus.mjs
import { run, done } from './shot.mjs';
const all = [];
for (const [name, w, h, mobile, dpr, loc] of [['s', 360, 640, true, 2, 'ru-RU'], ['m', 390, 780, true, 2, 'ru-RU'], ['me', 390, 780, true, 2, 'en-US'], ['l', 740, 360, true, 2, 'ru-RU'], ['d', 1280, 720, false, 1, 'ru-RU'], ['de', 1920, 1080, false, 1, 'en-US']]) {
  const errs = await run({ w, h, mobile, dpr, locale: loc, pre: loc === 'en-US' ? 'window.__MOCK_LANG="en"' : '', steps: async (page) => {
    await page.screenshot({ path: `/tmp/claude-0/shots/menu_${name}.png` });
    await page.evaluate(() => window.__game.ui.act('daily'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `/tmp/claude-0/shots/daily_${name}.png` });
  } });
  all.push(...errs);
}
done(all);
