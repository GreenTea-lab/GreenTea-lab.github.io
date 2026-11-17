// Интеграция с моком SDK: покупки, без рекламы, реклама за награду, рекорды, сохранение и продолжение партии. MOCK_SDK=1 node test/sdk.mjs
import { run, done } from './shot.mjs';
const K = 'magnat_v1';
const errs = await run({ w: 1280, h: 720, debug: { turbo: 1 }, pre: () => {
  window.__MOCK_CATALOG = [{ id: 'coins_1000', title: '1000', price: 19 }, { id: 'coins_3500', title: '3500', price: 59 }, { id: 'coins_10000', title: '10000', price: 149 }, { id: 'disable_ads', title: 'No ads', price: 99 }];
}, steps: async (p) => {
  const coins = () => p.evaluate(() => window.__save.data.coins);
  const closeAll = () => p.evaluate(() => document.querySelectorAll('#mod .modal').forEach((m) => m.close && m.close()));
  await p.waitForTimeout(1500); await closeAll();
  await p.evaluate(() => window.__game.ui.shop('coins')); await p.waitForTimeout(1200);
  await p.screenshot({ path: 'shots/sdk_shop.png' });
  const c0 = await coins();
  await p.click('.iap-buy[data-id="coins_1000"]'); await p.waitForTimeout(1500);
  const c1 = await coins();
  await p.click('.iap-buy[data-id="disable_ads"]'); await p.waitForTimeout(1500);
  await p.click('[data-a="ad"]'); await p.waitForTimeout(1500);
  const c2 = await coins();
  console.log('COINS', c0, c1, c2, 'noAds', await p.evaluate(() => window.__save.data.noAds));
  await closeAll();
  await p.evaluate(() => window.__game.newGame({ n: 3, diff: 1, limit: 0 }));
  await p.waitForTimeout(8000);
  await p.evaluate(() => window.__game.quitToMenu()); await p.waitForTimeout(1500);
  console.log('cur saved', await p.evaluate(() => !!window.__save.data.cur));
  await p.screenshot({ path: 'shots/sdk_cont.png' });
  await p.evaluate(() => window.__game.continueGame()); await p.waitForTimeout(3000);
  await p.screenshot({ path: 'shots/sdk_resumed.png' });
  console.log('CALLS', await p.evaluate(() => [...new Set(window.__calls)].join(', ')));
}});
done(errs);
