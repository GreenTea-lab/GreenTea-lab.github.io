// Поток SDK на моке: подарок, покупки, без рекламы, бесплатные монеты, лидерборд, уровень ботом до итогов, x2, реклама между уровнями
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const cat = [
  { id: 'coins_1000', title: '1000 монет', price: 19 },
  { id: 'coins_3500', title: '3500 монет', price: 59 },
  { id: 'coins_10000', title: '10000 монет', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', price: 99 },
];
const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 720);
const errs = await run({
  w: W, h: H, debug: { bot: 1, sub: 40, seed: 3, quality: 'low' },
  pre: `window.__MOCK_CATALOG = ${JSON.stringify(cat)};`,
  steps: async (page) => {
    const calls = () => page.evaluate(() => window.__calls.slice());
    const coins = () => page.evaluate(() => window.__save.data.coins);
    await page.waitForTimeout(1200);
    console.log('gift modal opened:', await page.evaluate(() => !!document.querySelector('.modal [data-take]')));
    await page.click('[data-x3]');
    await page.waitForTimeout(1200);
    console.log('coins after x3 gift:', await coins());
    await page.click('[data-a=store]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'shots/f_store.png' });
    await page.click('.iap-buy[data-id=coins_3500]');
    await page.waitForTimeout(1200);
    console.log('coins after buy 3500:', await coins());
    await page.click('.iap-buy[data-id=disable_ads]');
    await page.waitForTimeout(1200);
    console.log('noAds:', await page.evaluate(() => window.__save.data.noAds));
    await page.click('[data-free]');
    await page.waitForTimeout(1200);
    console.log('coins after free:', await coins());
    await page.click('.modal .mx');
    await page.click('[data-a=lb]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shots/f_lb.png' });
    await page.click('.modal .mx');
    // улучшение и покупка повара
    await page.click('[data-a=kitchen]');
    await page.waitForTimeout(300);
    await page.click('[data-up=knife]');
    await page.click('[data-tab=chefs]');
    await page.waitForTimeout(300);
    await page.click('[data-chef=bunny]');
    await page.waitForTimeout(300);
    console.log('up/chefs/pick:', JSON.stringify(await page.evaluate(() => [__save.data.up.knife, __save.data.chefs, __save.data.pick])));
    // уровень 1 ботом
    await page.evaluate(() => window.__game.ui.menu());
    await page.evaluate(() => window.__game.startLevel(0));
    await page.waitForTimeout(2500);
    // пауза и продолжение
    await page.click('#hpause');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/f_pause.png' });
    console.log('paused:', await page.evaluate(() => __game.paused), 'gp calls:', (await calls()).filter((c) => c.startsWith('gp.')).join(','));
    await page.click('[data-r=resume]');
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(1000);
      if (await page.evaluate(() => window.__game.ui.screen === 'results')) break;
    }
    await page.waitForTimeout(1800);
    await page.screenshot({ path: 'shots/f_results.png' });
    const before = await coins();
    const res = await page.evaluate(() => __game.lastResult);
    console.log('result:', JSON.stringify(res));
    await page.click('#rx2');
    await page.waitForTimeout(1000);
    console.log('x2 added:', (await coins()) - before);
    await page.click('[data-r=again]');
    await page.waitForTimeout(1000);
    const c = await calls();
    console.log('setScore:', c.filter((x) => x.startsWith('setScore')).join(' | '));
    console.log('fullscreen shown (noAds → none):', c.filter((x) => x === 'fullscreen').length, 'rewarded:', c.filter((x) => x === 'rewarded').length);
    console.log('consume:', c.filter((x) => x.startsWith('consume')).length, 'ready:', c.includes('ready'));
    console.log('state now:', await page.evaluate(() => __game.state + '/' + __game.ui.screen));
  },
});
done(errs);
