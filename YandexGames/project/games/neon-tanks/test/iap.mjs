// покупки, «без рекламы», реклама, лидерборд через мок SDK
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = 1;
process.env.MOCK_LANG = process.env.MOCK_LANG || 'ru';
const CAT = [
  { id: 'coins_1000', title: '1 000 монет', description: 'Горсть монет', price: 19 },
  { id: 'coins_3500', title: '3 500 монет', description: 'Мешок монет', price: 59 },
  { id: 'coins_10000', title: '10 000 монет', description: 'Сундук монет', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};
if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1); localStorage.setItem('__mock_purchases', JSON.stringify([{ productID: 'coins_1000', purchaseToken: 'tok_pending_1' }])); }`;
const errs = await run({ w: 1280, h: 720, debug: {}, pre, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await page.waitForTimeout(1500);
  console.log('startup coins', await G(() => window.__nt_save.data.coins), await G(() => JSON.stringify(window.__calls.filter(c => /getPurchases|consume|getCatalog/.test(c)))));
  await page.screenshot({ path: 'shots/iap_menu.png' });
  await G(() => window.__game.scene.getScene('Menu').openStore());
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/iap_store.png' });
  await G(() => document.querySelector('.iap-buy[data-id="coins_3500"]').click());
  await page.waitForTimeout(900);
  await G(() => document.querySelector('.iap-buy[data-id="disable_ads"]').click());
  await page.waitForTimeout(900);
  console.log('after coins', await G(() => window.__nt_save.data.coins), 'noAds', await G(() => window.__nt_save.data.noAds), await G(() => JSON.stringify(window.__calls.filter(c => /purchase|consume/.test(c)))));
  // interstitial не показывается при «без рекламы»
  const n0 = await G(() => window.__calls.filter(c => /showFullscreenAdv/.test(c)).length);
  await G(() => new Promise(r => window.__nt_sdk ? r() : r()));
  await G(() => { const m = window.__game.scene.getScene('Menu'); const c = document.getElementById('iap-store'); c && c.remove(); m.play(); });
  await page.waitForTimeout(800);
  await G(() => { const a = window.__arena; a.player.shield = 0; a.world.damage(a.player, 1e6, a.world.tanks.find(t => t !== a.player)); a.player && 0; });
  await page.waitForTimeout(1800);
  await G(() => { const h = window.__game.scene.getScene('Hud'); h.respawn(0); });
  await page.waitForTimeout(600);
  console.log('gameplay calls', await G(() => JSON.stringify(window.__calls.filter(c => /gp\.|setScore|fullscreen|rewarded|ready/i.test(c)))));
  console.log('lb best', await G(() => window.__nt_save.data.best.score));
}});
done(errs);
