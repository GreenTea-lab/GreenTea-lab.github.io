// Скриншоты фонов: сцены глав без интерфейса и с ним, светлая и ночная темы
import { run, done } from './shot.mjs';
const O = 'test/out/bg_';
const only = process.env.ONLY;
let all = [];
for (const [name, w, h, mobile] of [['phone', 390, 844, true], ['desk', 1366, 768, false]]) {
  if (only && only !== name) continue;
  all = all.concat(await run({ w, h, mobile, dpr: mobile ? 2 : 1, steps: async (page) => {
    for (const theme of ['light', 'dark']) {
      await page.evaluate((th) => { const a = window.__app; a.save.data.settings.theme = th; a.save.data.tutDone = true; document.documentElement.dataset.theme = th; a.show('menu'); }, theme);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${O}${name}_${theme}_menu.png` });
      await page.click('.m-levels'); await page.waitForTimeout(700);
      await page.screenshot({ path: `${O}${name}_${theme}_levels.png` });
      for (let c = 0; c < 12; c++) {
        await page.evaluate((i) => window.__app.openLevel(i), c * 15 + 2);
        await page.waitForTimeout(650);
        if (theme === 'light' || name === 'phone') await page.screenshot({ path: `${O}${name}_${theme}_game${c}.png` });
        await page.evaluate(() => (document.getElementById('app').style.visibility = 'hidden'));
        await page.screenshot({ path: `${O}${name}_${theme}_scene${c}.png` });
        await page.evaluate(() => (document.getElementById('app').style.visibility = ''));
      }
      await page.evaluate(() => window.__app.show('menu'));
    }
  } }));
}
done(all);
