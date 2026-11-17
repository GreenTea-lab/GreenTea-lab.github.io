import { run, done } from './shot.mjs';
process.env.MOCK_SDK = 1;
const CAT = [
  { id: 'crystals_60', title: '60 кристаллов', description: 'Горсть кристаллов', price: 19 },
  { id: 'crystals_220', title: '220 кристаллов', description: 'Мешок кристаллов', price: 59 },
  { id: 'crystals_650', title: '650 кристаллов', description: 'Сундук кристаллов', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};
if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1); localStorage.setItem('__mock_purchases', JSON.stringify([{ productID: 'crystals_60', purchaseToken: 'tok_pending_1' }])); }`;
const errs = await run({ w: 1280, h: 720, debug: {}, pre, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await page.waitForTimeout(1000);
  console.log('startup', await G(() => JSON.stringify({ cr: window.__game.s.crystals, calls: window.__calls.filter(c => /getPurchases|consume|getCatalog|setData/.test(c)) })));
  await G(() => { window.__game.ui.closeModal(); window.__game.ui.crystalModal(); });
  await page.waitForTimeout(400);
  await G(() => document.querySelector('.iap-buy[data-id="disable_ads"]').click());
  await page.waitForTimeout(900);
  await G(() => document.querySelector('.iap-buy[data-id="crystals_220"]').click());
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'shots/iap.png' });
  console.log('after buys', await G(() => JSON.stringify({ cr: window.__game.s.crystals, noAds: window.__game.s.noAds, pending: JSON.parse(localStorage.getItem('__mock_purchases')).map(p => p.productID) })));
  await G(() => { window.__game.ui.closeModal(); window.__game.interstitial(); });
  await page.waitForTimeout(600);
  console.log('fullscreen calls', await G(() => window.__calls.filter(c => c.startsWith('fullscreen')).length));
  // пауза платформы
  await G(() => { window.__calls.length = 0; });
}});
done(errs);
