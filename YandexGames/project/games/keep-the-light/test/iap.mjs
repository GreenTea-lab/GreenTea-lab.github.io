import { run, done } from './shot.mjs';
const errs = await run({ locale: 'en-US', pre: () => { window.__MOCK_LANG = 'en'; window.__MOCK_CATALOG = [{ id: 'coins_1000', title: '1,000 coins', price: 19 }, { id: 'coins_3500', title: '3,500 coins', price: 59 }, { id: 'coins_10000', title: '10,000 coins', price: 149 }, { id: 'disable_ads', title: 'No ads', price: 99 }]; }, debug: { shots: 1 }, steps: async (page) => {
  await page.evaluate(() => window.__game.ui.showShop('coins'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/storeEN.png' });
  await page.click('[data-id="coins_1000"]'); await page.waitForTimeout(800);
  await page.click('[data-id="disable_ads"]'); await page.waitForTimeout(800);
  await page.click('[data-a="free"]'); await page.waitForTimeout(2000);
  console.log(await page.evaluate(() => [window.__save.data.coins, window.__save.data.noAds, document.documentElement.lang, window.__calls.filter(c => /purchase|consume|rewarded|setData/.test(c)).join(' | ')]));
  await page.evaluate(() => { window.__game.toMenu(); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/menuEN.png' });
}});
done(errs);
