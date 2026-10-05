// Интеграция с моком SDK: обучение, покупка поля, улучшения, трактор, заказ, уровень, реклама, покупки, сохранение
import { run, done } from './shot.mjs';
const O = 'test/out/';
const CAT = [
  { id: 'coins_2000', title: '2 000 монет', description: 'Монеты на улучшения', price: 19 },
  { id: 'coins_8000', title: '8 000 монет', description: 'Мешок монет', price: 59 },
  { id: 'coins_25000', title: '25 000 монет', description: 'Сундук монет', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};`;
const res = {};
process.env.MOCK_SDK = '1';
let all = await run({ w: 1280, h: 720, pre, steps: async (page) => {
  const calls = () => page.evaluate(() => window.__calls.slice());
  res.boot = (await calls()).filter((c) => /init|ready|getPurchases|getCatalog|getData/.test(c));
  await page.click('#menu .play'); await page.waitForTimeout(500);
  res.tut = await page.evaluate(() => !!document.querySelector('.tut-ok'));
  await page.click('.tut-ok');
  res.gpStart = (await calls()).includes('gp.start');
  // открыть магазин — геймплей на паузе
  await page.click('.h-shop'); await page.waitForTimeout(200);
  res.gpStopInShop = (await calls()).slice(-1)[0] === 'gp.stop';
  await page.click('[data-up="speed"]'); await page.waitForTimeout(200);
  res.speedLvl = await page.evaluate(() => window.__game.s.upg.speed);
  res.maxSpeed = await page.evaluate(() => window.__game.tractor.maxSpeed);
  await page.click('[data-tab="coins"]'); await page.waitForTimeout(200);
  res.iapRows = await page.evaluate(() => document.querySelectorAll('[data-iap]').length);
  const c0 = await page.evaluate(() => window.__game.s.coins);
  await page.click('[data-iap="coins_8000"]'); await page.waitForTimeout(800);
  res.bought = (await page.evaluate(() => window.__game.s.coins)) - c0;
  await page.click('[data-iap="disable_ads"]'); await page.waitForTimeout(800);
  res.noAds = await page.evaluate(() => window.__game.s.noAds);
  res.consumed = (await calls()).filter((c) => c.startsWith('consume')).length;
  // бесплатные монеты за рекламу
  const c1 = await page.evaluate(() => window.__game.s.coins);
  await page.click('.s-ad'); await page.waitForTimeout(900);
  res.freeCoins = (await page.evaluate(() => window.__game.s.coins)) - c1;
  await page.click('[data-tab="tr"]'); await page.waitForTimeout(200);
  await page.click('[data-buytr="blue"]'); await page.waitForTimeout(300);
  res.tractor = await page.evaluate(() => [window.__game.s.tr, window.__game.tractor.width.toFixed(2)]);
  await page.screenshot({ path: O + 'flow_shop_tr.png' });
  await page.evaluate(() => window.__game.closeModal());
  // покупка поля через метку
  await page.evaluate(() => window.__game.buyField(2));
  res.field2 = await page.evaluate(() => window.__game.fields[2].owned);
  // ускорить рост за рекламу
  await page.evaluate(() => { const g = window.__game, f = g.fields[1]; f.stage = 1; f.doneN = 0; f.advance(Date.now(), g.growMul); });
  await page.evaluate(() => window.__game.growNow(1)); await page.waitForTimeout(900);
  res.instantRipe = await page.evaluate(() => window.__game.fields[1].stage === 3);
  // заказ: загрузить прицеп урожаем заказа и продать
  const ord = await page.evaluate(() => { const g = window.__game, o = g.s.orders[0]; g.s.load = { [o.crop]: o.qty }; g.tractor.load = o.qty; return o; });
  const c2 = await page.evaluate(() => window.__game.s.coins);
  await page.evaluate(() => window.__game.sell());
  res.orderPaid = (await page.evaluate(() => window.__game.s.coins)) - c2 === ord.reward;
  res.orderReplaced = await page.evaluate((r) => window.__game.s.orders[0].reward !== r || window.__game.s.orders[0].got === 0, ord.reward);
  res.setScore = (await calls()).filter((c) => c.startsWith('setScore')).slice(-1)[0];
  // уровень
  await page.evaluate(() => { window.__game.s.xp += 500; window.__game.checkLevel(); });
  await page.waitForTimeout(300);
  res.levelModal = await page.evaluate(() => !!document.querySelector('.lv-ok'));
  await page.screenshot({ path: O + 'flow_level.png' });
  await page.click('.lv-ok'); await page.waitForTimeout(300);
  res.lvl = await page.evaluate(() => window.__game.s.lvl);
  res.noFullscreen = !(await calls()).includes('fullscreen');
  // сохранение и восстановление
  await page.evaluate(() => { const g = window.__game; g.tractor.x = 5; g.tractor.z = 10; g.persist(); });
  await page.reload(); await page.waitForFunction(() => window.__game && !document.getElementById('boot'));
  res.restored = await page.evaluate(() => { const g = window.__game; return { x: g.tractor.x, field2: g.fields[2].owned, tr: g.s.tr, lvl: g.s.lvl, ripe1: g.fields[1].stage, noAds: g.s.noAds }; });
  await page.click('#menu .m-lb'); await page.waitForTimeout(500);
  res.lbRows = await page.evaluate(() => document.querySelectorAll('.lbr').length);
} });
process.env.MOCK_LANG = 'en';
all = all.concat(await run({ w: 390, h: 800, mobile: true, dpr: 2, locale: 'en-US', pre, steps: async (page) => {
  await page.waitForTimeout(800);
  await page.screenshot({ path: O + 'en_menu.png' });
  res.enTitle = await page.title();
  await page.click('#menu .play'); await page.waitForTimeout(400);
  await page.click('.tut-ok');
  // палец: тянем вниз — трактор должен поехать
  const x0 = await page.evaluate(() => [window.__game.tractor.x, window.__game.tractor.z]);
  await page.mouse.move(200, 500); await page.mouse.down(); await page.mouse.move(200, 600, { steps: 5 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: O + 'en_drive.png' });
  await page.mouse.up();
  const x1 = await page.evaluate(() => [window.__game.tractor.x, window.__game.tractor.z]);
  res.joystickMoved = Math.hypot(x1[0] - x0[0], x1[1] - x0[1]) > 0.5;
} }));
console.log(JSON.stringify(res, null, 1));
done(all);
