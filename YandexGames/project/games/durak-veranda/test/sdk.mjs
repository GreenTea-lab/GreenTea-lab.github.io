// Интеграция с SDK (мок): ready, gameplay, сохранения, покупки, реклама. MOCK_SDK=1 node test/sdk.mjs
import { run, done } from './shot.mjs';
const errors = await run({ w: 1280, h: 720, pre: () => { window.__MOCK_CATALOG = [{ id: 'coins_1000', title: '1000 монет', price: 19 }, { id: 'coins_3500', title: '3500', price: 59 }, { id: 'coins_10000', title: '10000', price: 149 }, { id: 'disable_ads', title: 'Без рекламы', price: 99 }]; },
  steps: async (p) => {
    await p.evaluate(() => window.__game.ui.store());
    await p.waitForTimeout(500);
    await p.screenshot({ path: '/tmp/s_store.png' });
    const c0 = await p.evaluate(() => window.__save.data.coins);
    await p.click('.iap-buy[data-id="coins_1000"]');
    await p.waitForTimeout(1200);
    await p.click('.iap-buy[data-id="disable_ads"]');
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({ coins: window.__save.data.coins, noAds: window.__save.data.noAds }));
    console.log('coins', c0, '->', r.coins, 'noAds', r.noAds);
    await p.evaluate(() => { window.__game.ui.closeModal(); window.__game.lastAd = 0; window.__game.newGame({ players: 2 }); });
    await p.waitForTimeout(2000);
    await p.evaluate(() => window.__game.ui.pause());
    await p.waitForTimeout(300);
    await p.evaluate(() => window.__game.ui.closeModal());
    await p.waitForTimeout(6000);
    console.log((await p.evaluate(() => window.__calls)).filter((c) => !c.startsWith('setData') && !c.startsWith('getData')).join(' | '));
    console.log('saved game present:', await p.evaluate(() => !!window.__save.data.cur));
  } });
done(errors);
