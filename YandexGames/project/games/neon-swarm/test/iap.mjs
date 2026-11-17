import { run, done } from './shot.mjs';
process.env.MOCK_SDK = 1;
const CAT = [
  { id: 'crystals_500', title: '500 кристаллов', description: 'Горсть неоновых кристаллов', price: 19 },
  { id: 'crystals_1800', title: '1 800 кристаллов', description: 'Мешок кристаллов', price: 59 },
  { id: 'crystals_5000', title: '5 000 кристаллов', description: 'Сундук кристаллов', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};
if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1); localStorage.setItem('__mock_purchases', JSON.stringify([{ productID: 'crystals_500', purchaseToken: 'tok_pending_1' }])); }`;
let all = [];
for (const [w, h, mobile, tag] of [[1280, 720, false, 'd'], [400, 800, true, 'm']]) {
  const errs = await run({ w, h, mobile, debug: {}, pre, steps: async (page) => {
    const G = (f, a) => page.evaluate(f, a);
    await page.waitForTimeout(1500);
    console.log(tag, 'startup', await G(() => JSON.stringify({ calls: window.__calls.filter(c => /getPurchases|consume|getCatalog|setData/.test(c)) })));
    await G(() => { const m = window.__game.scene.getScene('Menu'); m.panel = 'shop'; m.layout(); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `shots/iap_${tag}_shop.png` });
    await G(() => window.__game.scene.getScene('Menu').openStore());
    await page.waitForTimeout(400);
    await G(() => document.querySelector('.iap-buy[data-id="crystals_1800"]').click());
    await page.waitForTimeout(900);
    await page.screenshot({ path: `shots/iap_${tag}_store.png` });
    console.log(tag, 'after', await G(() => JSON.stringify({ pending: JSON.parse(localStorage.getItem('__mock_purchases')).map(p => p.productID), calls: window.__calls.filter(c => /purchase|consume/.test(c)) })));
  }});
  all = all.concat(errs);
}
done(all);
