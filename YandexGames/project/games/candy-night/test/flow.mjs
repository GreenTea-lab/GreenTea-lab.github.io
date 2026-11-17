// Проверка потока экранов и интеграции с SDK: ready, gameplay, реклама, покупки, сохранения, лидерборд
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const catalog = [
  { id: 'coins_1000', title: '1000 конфетных монет', description: 'Мешочек монет', price: 19 },
  { id: 'coins_3500', title: '3500 конфетных монет', description: 'Большой мешок', price: 59 },
  { id: 'coins_10000', title: '10000 конфетных монет', description: 'Целый котёл', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу навсегда', price: 99 },
];
const errs = await run({
  w: 1280, h: 720, debug: { fast: 1, quality: 'mid' },
  pre: `window.__MOCK_CATALOG = ${JSON.stringify(catalog)};`,
  steps: async (page) => {
    const calls = () => page.evaluate(() => window.__calls.slice());
    console.log('старт:', (await calls()).join(' | '));
    // магазин и покупка монет
    await page.evaluate(() => window.__game.ui.store());
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/store.png' });
    await page.click('.iap-buy[data-id="coins_1000"]');
    await page.waitForTimeout(900);
    console.log('после покупки монет:', await page.evaluate(() => window.__save.data.coins), (await calls()).slice(-4).join(' | '));
    console.log('кнопки:', await page.evaluate(() => Array.from(document.querySelectorAll('.iap-buy')).map((b) => b.dataset.id + ':' + b.textContent)));
    await page.click('.iap-buy[data-id="disable_ads"]');
    await page.waitForTimeout(900);
    console.log('без рекламы:', await page.evaluate(() => [window.__save.data.noAds, window.__game.constructor.name]), (await calls()).slice(-3).join(' | '));
    // реклама за награду в магазине
    await page.click('[data-free]');
    await page.waitForTimeout(1200);
    console.log('после ролика:', await page.evaluate(() => window.__save.data.coins), (await calls()).slice(-4).join(' | '));
    await page.evaluate(() => window.__game.ui.closeModal());
    // уровень: старт, пауза, финиш
    await page.evaluate(() => window.__game.startLevel(0));
    await page.waitForTimeout(400);
    console.log('старт уровня:', (await calls()).slice(-2).join(' | '));
    await page.evaluate(() => window.__game.ui.pause());
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/pause.png' });
    console.log('пауза:', (await calls()).slice(-1).join(' | '));
    await page.evaluate(() => { window.__game.ui.closeModal(); window.__game.pause(false); });
    await page.evaluate(() => { const g = window.__game; g.w.banked = 140; g.w.finish(true); });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: 'shots/results.png' });
    console.log('итоги:', await page.evaluate(() => JSON.stringify(window.__save.data.levels)), (await calls()).slice(-4).join(' | '));
    // лидерборд
    await page.evaluate(() => { window.__game.ui.closeModal(); window.__game.ui.menu(); window.__game.ui.leaderboard(); });
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'shots/lb.png' });
    // мастерская
    await page.evaluate(() => { window.__game.ui.closeModal(); window.__game.ui.workshop('up'); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shots/ws_up.png' });
    await page.evaluate(() => window.__game.ui.workshop('cos'));
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'shots/ws_cos.png' });
    console.log('все вызовы:', (await calls()).join(' | '));
  },
});
done(errs);
