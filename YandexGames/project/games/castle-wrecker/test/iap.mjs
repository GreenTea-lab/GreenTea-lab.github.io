// Покупки с мок-SDK: необработанные при запуске, покупка, отмена, «Без рекламы»
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = 1;
const CAT = [
  { id: 'gold_1000', title: '1 000 золота', description: 'Мешочек золота', price: 19 },
  { id: 'gold_3500', title: '3 500 золота', description: 'Сундук золота', price: 59 },
  { id: 'gold_10000', title: '10 000 золота', description: 'Королевская казна', price: 149 },
  { id: 'cannonballs_5', title: '5 тяжёлых ядер', description: 'Пять ядер в запас', price: 29 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает рекламу между уровнями', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};
if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1); localStorage.setItem('__mock_purchases', JSON.stringify([{ productID: 'gold_1000', purchaseToken: 'tok_pending_1' }, { productID: 'disable_ads', purchaseToken: 'tok_perm_1' }])); }`;
const errs = await run({ w: 1280, h: 720, debug: {}, pre, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await page.waitForTimeout(800);
  console.log('startup', await G(() => JSON.stringify({ gold: window.__game.s.gold, noAds: window.__game.s.noAds, calls: window.__calls.filter(c => /getPurchases|consume|getCatalog|setData/.test(c)) })));
  await G(() => window.__game.ui.shopModal());
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/iap_shop.png' });
  await G(() => document.querySelector('.iap-buy[data-id="gold_3500"]').click());
  await page.waitForTimeout(1200);
  console.log('after buy', await G(() => JSON.stringify({ gold: window.__game.s.gold, pending: JSON.parse(localStorage.getItem('__mock_purchases')).map(p => p.productID), calls: window.__calls.filter(c => /purchase|consume/.test(c)) })));
  await G(() => { window.__MOCK_CANCEL = true; document.querySelector('.iap-buy[data-id="cannonballs_5"]').click(); });
  await page.waitForTimeout(800);
  console.log('after cancel', await G(() => JSON.stringify({ boost: window.__game.s.boost, enabled: !document.querySelector('.iap-buy[data-id="cannonballs_5"]').disabled })));
  await G(() => { window.__MOCK_CANCEL = false; document.querySelector('.iap-buy[data-id="cannonballs_5"]').click(); });
  await page.waitForTimeout(1200);
  console.log('boost after buy', await G(() => window.__game.s.boost));
  await page.screenshot({ path: 'shots/iap_shop2.png' });
  await G(() => { const g = window.__game; g.ui.closeModal(); g.li = 5; g.sinceAd = 5; g.lastAd = 0; g.after(() => (window.__ran = 1)); });
  await page.waitForTimeout(600);
  console.log('noAds interstitial', await G(() => JSON.stringify({ ran: window.__ran, fullscreen: window.__calls.filter(c => c.startsWith('fullscreen')).length })));
  await page.reload();
  await page.waitForFunction(() => window.__game && window.__game.ui && !document.getElementById('loader'));
  await page.waitForTimeout(800);
  console.log('after reload', await G(() => JSON.stringify({ gold: window.__game.s.gold, noAds: window.__game.s.noAds, sdkNoAds: true, pending: JSON.parse(localStorage.getItem('__mock_purchases')).map(p => p.productID) })));
}});
done(errs);
