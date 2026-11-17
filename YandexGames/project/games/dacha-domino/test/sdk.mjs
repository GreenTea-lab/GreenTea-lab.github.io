// Проверка интеграции с моком SDK: подарок, покупки, без рекламы, рекорды, партия с рекламой. MOCK_SDK=1 node test/sdk.mjs
import { run, done } from './shot.mjs';
const O = '/tmp/claude-0/-home-claude/f598f527-a7c2-5e7d-86ce-d82e94cc8820/scratchpad/s_';
const K = 'dacha_domino_v1';
const errs = await run({ w: 1280, h: 720, locale: 'en-US', debug: { fastdt: 1, seed: 5 }, pre: () => {
  window.__MOCK_LANG = 'en';
  window.__MOCK_CATALOG = [{ id: 'coins_1000', title: '1000 coins', price: 19 }, { id: 'coins_3500', title: '3500 coins', price: 59 }, { id: 'coins_10000', title: '10000 coins', price: 149 }, { id: 'disable_ads', title: 'No ads', price: 99 }];
}, steps: async (p) => {
  const coins = () => p.evaluate((K) => JSON.parse(localStorage.getItem(K) || '{}').coins, K);
  await p.click('[data-a="daily"]'); await p.waitForTimeout(600);
  await p.screenshot({ path: O + 'daily.png' });
  await p.click('[data-a="take"]'); await p.waitForTimeout(800);
  await p.click('[data-a="shop"]'); await p.waitForTimeout(1500);
  await p.screenshot({ path: O + 'shop.png' });
  const c0 = await coins();
  await p.click('.iap-buy[data-id="coins_1000"]'); await p.waitForTimeout(1500);
  const c1 = await coins();
  await p.click('.iap-buy[data-id="disable_ads"]'); await p.waitForTimeout(1500);
  await p.click('[data-a="ad"]'); await p.waitForTimeout(1500);
  const c2 = await coins();
  console.log('COINS', c0, c1, c2, 'noAds', await p.evaluate((K) => JSON.parse(localStorage.getItem(K)).noAds, K));
  await p.click('[data-tab="tiles"]'); await p.waitForTimeout(800);
  await p.click('[data-buy="ebony"]'); await p.waitForTimeout(800);
  await p.screenshot({ path: O + 'shop2.png' });
  console.log('skin', await p.evaluate(() => window.__save.data.skin), await coins());
  await p.evaluate(() => document.querySelectorAll('[data-x]').forEach((b) => b.click()));
  await p.click('[data-a="lb"]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: O + 'lb.png' });
  await p.evaluate(() => document.querySelectorAll('[data-x]').forEach((b) => b.click()));
  await p.evaluate(() => { window.__save.data.settings.fast = true; window.__game.newMatch({ mode: 'goat', n: 4, target: 51, diff: 2 }); });
  await p.waitForTimeout(15000);
  // выход в меню посреди партии и продолжение
  await p.evaluate(() => window.__game.leaveMatch());
  await p.waitForTimeout(1000);
  await p.screenshot({ path: O + 'cont.png' });
  console.log('cur saved', await p.evaluate(() => !!window.__save.data.cur));
  await p.click('[data-a="cont"]'); await p.waitForTimeout(3000);
  await p.screenshot({ path: O + 'resumed.png' });
  console.log('CALLS', await p.evaluate(() => window.__calls.join(', ')));
}});
done(errs);
