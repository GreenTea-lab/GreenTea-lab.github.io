import { run, done } from './shot.mjs';
process.env.MOCK_SDK = 1;
const CAT = [
  { id: 'gems_150', title: '150 самоцветов', description: 'Мешочек самоцветов', price: 19 },
  { id: 'gems_550', title: '550 самоцветов', description: 'Сундучок самоцветов', price: 59 },
  { id: 'gems_1500', title: '1 500 самоцветов', description: 'Королевский сундук', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};
if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1); localStorage.setItem('__mock_purchases', JSON.stringify([{ productID: 'gems_150', purchaseToken: 'tok_pending_1' }])); }`;
let all = [];
for (const [w, h, mobile, tag] of [[1280, 720, false, 'd'], [400, 800, true, 'm']]) {
  const errs = await run({ w, h, mobile, debug: {}, pre, steps: async (page) => {
    const G = (f, a) => page.evaluate(f, a);
    await page.waitForTimeout(1500);
    console.log(tag, 'startup', await G(() => JSON.stringify({ calls: window.__calls.filter(c => /getPurchases|consume|getCatalog|setData/.test(c)) })));
    await G(() => { window.__game.scene.getScene('Menu').scene.start('Shop'); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `shots/iap_${tag}_shop.png` });
    await G(() => window.__game.scene.getScene('Shop').openStore());
    await page.waitForTimeout(400);
    await G(() => document.querySelector('.iap-buy[data-id="gems_550"]').click());
    await page.waitForTimeout(900);
    await page.screenshot({ path: `shots/iap_${tag}_store.png` });
    console.log(tag, 'after', await G(() => JSON.stringify({ pending: JSON.parse(localStorage.getItem('__mock_purchases')).map(p => p.productID), calls: window.__calls.filter(c => /purchase|consume/.test(c)) })));
  }});
  all = all.concat(errs);
}
done(all);
