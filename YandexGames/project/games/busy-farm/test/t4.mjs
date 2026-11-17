// интеграция SDK: покупки, реклама, лидерборд, сохранение, без рекламы
import { run, done } from './shot.mjs';
const pre = () => { window.__MOCK_CATALOG = [{ id: 'coins_1000', title: '1000 монет', price: 19 }, { id: 'coins_3500', title: '3500 монет', price: 59 }, { id: 'coins_10000', title: '10000 монет', price: 149 }, { id: 'disable_ads', title: 'Без рекламы', price: 99 }]; };
const errs = await run({ w: 1280, h: 720, pre, debug: { shots: 1, bot: 1, aps: 3, sub: 10 }, steps: async (p) => {
  const calls = () => p.evaluate(() => window.__calls.join(' | '));
  console.log('start calls:', await calls());
  await p.click('[data-a="shop"]');
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'shots/i-shop.png' });
  await p.click('.iap-buy[data-id="coins_1000"]');
  await p.waitForTimeout(800);
  console.log('bank after buy', await p.evaluate(() => window.__save.data.bank));
  await p.click('.iap-buy[data-id="disable_ads"]');
  await p.waitForTimeout(800);
  console.log('noAds', await p.evaluate(() => window.__save.data.noAds));
  await p.click('.mhead [data-x]');
  await p.click('[data-a="records"]');
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'shots/i-lb.png' });
  await p.click('.mhead [data-x]');
  // уровень 1 ботом до победы
  await p.evaluate(() => { window.__save.data.noAds = false; window.__game.startLevel(1); });
  await p.evaluate(() => (window.__calls.length = 0));
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(2000); if (await p.$('.modal.win')) break; }
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'shots/i-win.png' });
  const b0 = await p.evaluate(() => window.__save.data.bank);
  const x2 = await p.$('[data-x2]');
  if (x2) { await x2.click(); await p.waitForTimeout(1200); }
  console.log('bank before/after x2', b0, await p.evaluate(() => window.__save.data.bank));
  await p.click('[data-nx]');
  await p.waitForTimeout(1500);
  console.log('level calls:', await calls());
  console.log('levels', await p.evaluate(() => JSON.stringify(window.__save.data.levels)), 'stars', await p.evaluate(() => window.__save.starsEarned()));
  await p.screenshot({ path: 'shots/i-next.png' });
}});
done(errs);
