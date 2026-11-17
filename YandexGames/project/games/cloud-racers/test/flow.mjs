// Поток SDK на моке: покупки, реклама, лидерборд, мультиплеер (запись и загрузка чужого заезда)
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const cat = [
  { id: 'coins_1000', title: '1000 монет', price: 19 },
  { id: 'coins_3500', title: '3500 монет', price: 59 },
  { id: 'coins_10000', title: '10000 монет', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', price: 99 },
];
const errs = await run({
  w: 1280, h: 720, debug: { bot: 1, sub: 12, pushBot: 1, quality: 'low' },
  pre: `window.__MOCK_CATALOG = ${JSON.stringify(cat)};`,
  steps: async (page) => {
    const calls = () => page.evaluate(() => window.__calls.slice());
    // подарок дня открывается сам
    await page.waitForTimeout(1200);
    console.log('gift modal:', await page.evaluate(() => !!document.querySelector('.modal [data-take]')));
    await page.click('[data-x3]');
    await page.waitForTimeout(1200);
    console.log('coins after x3 gift:', await page.evaluate(() => window.__save.data.coins));
    // магазин
    await page.click('[data-a=store]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test/s_store.png' });
    await page.click('.iap-buy[data-id=coins_3500]');
    await page.waitForTimeout(1200);
    console.log('coins after buy:', await page.evaluate(() => window.__save.data.coins));
    await page.click('.iap-buy[data-id=disable_ads]');
    await page.waitForTimeout(1200);
    console.log('noAds:', await page.evaluate(() => window.__save.data.noAds));
    await page.click('[data-free]');
    await page.waitForTimeout(1200);
    console.log('coins after free:', await page.evaluate(() => window.__save.data.coins));
    await page.click('.modal .mx');
    // лидерборд
    await page.click('[data-a=lb]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test/s_lb.png' });
    await page.click('.modal .mx');
    // заезд
    await page.evaluate(() => window.__game.startRace(0));
    for (let i = 0; i < 80; i++) {
      await page.waitForTimeout(2000);
      if (await page.evaluate(() => window.__game.race && window.__game.race.finished)) break;
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test/s_results.png' });
    await page.click('#rx2');
    await page.waitForTimeout(1000);
    await page.click('[data-r=again]');
    await page.waitForTimeout(3000);
    console.log('opps 2nd race:', JSON.stringify(await page.evaluate(() => window.__game.race.opps.filter(o => o.kind === 'ghost').map(o => o.name + ' ' + o.src.time.toFixed(1)))));
    const c = await calls();
    console.log('calls:', c.filter(x => !x.startsWith('getData') && !x.startsWith('setData')).join(' | '));
    console.log('setData count:', c.filter(x => x.startsWith('setData')).length);
  },
});
done(errs);
