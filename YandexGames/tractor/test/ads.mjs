// Полноэкранная реклама: после окна нового уровня (при 3+ продажах) и при возврате из меню
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const res = {};
const errs = await run({ w: 1280, h: 720, steps: async (page) => {
  const calls = () => page.evaluate(() => window.__calls.filter((c) => c === 'fullscreen').length);
  await page.click('#menu .play'); await page.click('.tut-ok');
  await page.evaluate(() => { const g = window.__game; g.s.sales = 0; g.lastAd = 0; g.s.xp = 999; g.checkLevel(); });
  await page.click('.lv-ok'); await page.waitForTimeout(500);
  res.noAdBefore3Sales = (await calls()) === 0;
  await page.evaluate(() => { const g = window.__game; g.s.sales = 5; g.lastAd = 0; g.s.xp = 9999; g.checkLevel(); });
  await page.click('.lv-ok'); await page.waitForTimeout(800);
  res.adAfterLevel = (await calls()) === 1;
  await page.evaluate(() => { const g = window.__game; g.showMenu(); g.lastAd = 0; });
  await page.click('#menu .play'); await page.waitForTimeout(800);
  res.adOnReturn = (await calls()) === 2;
  res.gameAfterAd = await page.evaluate(() => !window.__game.menu);
} });
console.log(JSON.stringify(res));
done(errs);
