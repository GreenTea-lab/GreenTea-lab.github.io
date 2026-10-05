// Интеграция с моком SDK: загрузка, разметка геймплея, рыбалка, продажа, x2, реклама, покупки, копчение, подарки, сохранение
import { run, done } from './shot.mjs';
const CAT = [
  { id: 'coins_1000', title: '1 000 монет', description: 'Монеты на снасти', price: 19 },
  { id: 'coins_5000', title: '5 000 монет', description: 'Мешок монет', price: 59 },
  { id: 'coins_15000', title: '15 000 монет', description: 'Сундук монет', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)}; window.__env = { part: 'day', weather: 'cloud' };`;
process.env.MOCK_SDK = '1';
const res = {};
let all = [];
// один заход на рыбалку от касания воды до садка
const fishOnce = async (page, f) => {
  await page.evaluate((f) => (window.__forceFish = f), f);
  const pt = await page.evaluate(() => { const L = __game.scene.L; return [__game.scene.W * 0.7, L.nearY - 0.5 * (L.nearY - L.farY)]; });
  await page.mouse.click(pt[0], pt[1]);
  await page.waitForTimeout(100);
  await page.waitForFunction(() => __game.phase === 'bite', null, { timeout: 20000 });
  await page.evaluate(() => __game.hook());
  await page.waitForFunction(() => { const g = __game; if (g.phase !== 'fight') return g.phase === 'catch'; g.holding = !(g.fight.T > 0.7 || g.fight.warn > 0 || g.fight.rush > 0); return false; }, null, { timeout: 60000, polling: 40 });
  await page.waitForTimeout(300);
};
all = all.concat(await run({ w: 1280, h: 720, pre, steps: async (page) => {
  const calls = () => page.evaluate(() => window.__calls.slice());
  res.boot = (await calls()).filter((c) => /^(init|ready|getPurchases|getCatalog|getData)/.test(c));
  res.gpInMenu = (await calls()).includes('gp.start');
  await page.click('.m-play'); await page.waitForTimeout(200);
  await page.click('[data-char="m"]'); await page.waitForTimeout(300);
  res.giftOpened = await page.evaluate(() => !!document.querySelector('.gcal'));
  res.gpStopInModal = (await calls()).filter((c) => c.startsWith('gp.')).slice(-1)[0] !== 'gp.start';
  const c0 = await page.evaluate(() => __game.s.coins);
  await page.click('.b-take'); await page.waitForTimeout(300);
  res.giftCoins = (await page.evaluate(() => __game.s.coins)) - c0;
  res.giftAgain = await page.evaluate(() => !!document.querySelector('.b-take'));
  await page.evaluate(() => __game.closeModal()); await page.waitForTimeout(200);
  await page.click('.tut-ok'); await page.waitForTimeout(200);
  res.gpStart = (await calls()).filter((c) => c.startsWith('gp.')).slice(-1)[0] === 'gp.start';
  // три рыбы
  await fishOnce(page, { id: 'perch', w: 0.6 });
  res.catchModal = await page.evaluate(() => !!document.querySelector('.b-keep'));
  await page.click('.b-keep'); await page.waitForTimeout(200);
  await fishOnce(page, { id: 'crucian', w: 0.4 }); await page.click('.b-keep');
  await fishOnce(page, { id: 'tench', w: 1.2 }); await page.click('.b-keep');
  await page.waitForTimeout(200);
  res.keep = await page.evaluate(() => __game.s.keep.map((f) => f.id));
  res.atlas = await page.evaluate(() => Object.keys(__game.s.atlas).length);
  res.questCatch = await page.evaluate(() => __game.s.daily.quests[0].got);
  // копчение одной рыбы
  await page.click('.h-net'); await page.waitForTimeout(300);
  await page.click('[data-smoke="0"]'); await page.waitForTimeout(200);
  res.smoking = await page.evaluate(() => __game.s.smoke.length);
  // продажа ×2 за рекламу
  const sumKeep = await page.evaluate(() => __game.s.keep.reduce((a, f) => a + f.p, 0));
  const c1 = await page.evaluate(() => __game.s.coins);
  await page.click('.b-x2'); await page.waitForTimeout(900);
  res.x2 = (await page.evaluate(() => __game.s.coins)) - c1 === sumKeep * 2;
  res.rewardedCalled = (await calls()).includes('rewarded');
  await page.evaluate(() => __game.closeModal()); await page.waitForTimeout(300);
  // полноэкранная: после второй продажи и паузы 3 мин
  await page.evaluate(() => { const g = __game; g.s.keep.push({ id: 'roach', w: 0.2, p: 5 }); g.lastAd = Date.now() - 200000; });
  await page.click('.h-net'); await page.waitForTimeout(300);
  await page.click('.b-sell'); await page.waitForTimeout(200);
  await page.evaluate(() => __game.closeModal()); await page.waitForTimeout(600);
  res.interstitial = (await calls()).filter((c) => c === 'fullscreen').length;
  // копчение «готово» — забрать
  await page.evaluate(() => { __game.s.smoke[0].end = Date.now() - 1; });
  const c2 = await page.evaluate(() => __game.s.coins);
  await page.evaluate(() => __game.takeSmoked());
  res.smokedPaid = (await page.evaluate(() => __game.s.coins)) - c2 > 0;
  // покупки
  await page.click('.h-shop'); await page.waitForTimeout(300);
  await page.click('[data-tab="coins"]'); await page.waitForTimeout(300);
  res.iapRows = await page.evaluate(() => document.querySelectorAll('[data-iap]').length);
  const c3 = await page.evaluate(() => __game.s.coins);
  await page.click('[data-iap="coins_5000"]'); await page.waitForTimeout(900);
  res.bought = (await page.evaluate(() => __game.s.coins)) - c3;
  await page.click('[data-iap="disable_ads"]'); await page.waitForTimeout(900);
  res.noAds = await page.evaluate(() => __game.s.noAds);
  res.consumed = (await calls()).filter((c) => c.startsWith('consume')).length;
  await page.click('[data-tab="gear"]'); await page.waitForTimeout(200);
  await page.click('[data-gear="rod"]'); await page.waitForTimeout(200);
  res.rod = await page.evaluate(() => __game.s.gear.rod);
  await page.evaluate(() => __game.closeModal());
  // обрыв лески и «вытащить за рекламу»
  await page.evaluate(() => (window.__forceFish = { id: 'carp', w: 9.5 }));
  const pt = await page.evaluate(() => { const L = __game.scene.L; return [__game.scene.W * 0.7, L.nearY - 0.5 * (L.nearY - L.farY)]; });
  await page.mouse.click(pt[0], pt[1]);
  await page.waitForTimeout(100);
  await page.waitForFunction(() => __game.phase === 'bite', null, { timeout: 20000 });
  await page.evaluate(() => { __game.hook(); __game.fight.ratio = 3; __game.holding = true; });
  await page.waitForFunction(() => { __game.holding = true; return !!document.querySelector('.b-ad'); }, null, { timeout: 20000, polling: 50 });
  res.broke = true;
  const n0 = await page.evaluate(() => __game.s.atlas.carp ? 1 : 0);
  await page.click('.b-ad'); await page.waitForTimeout(900);
  res.brokeSaved = (await page.evaluate(() => (__game.s.atlas.carp ? 1 : 0))) - n0 === 1;
  await page.evaluate(() => __game.closeModal()); await page.waitForTimeout(200);
  // кот
  await page.evaluate(() => { __game.scene.cat.on = true; __game.catLife = 99; __game.openCat(); });
  await page.waitForTimeout(200);
  const luck0 = await page.evaluate(() => __game.s.luck);
  await page.click('.b-feed'); await page.waitForTimeout(200);
  res.catLuck = (await page.evaluate(() => __game.s.luck)) - luck0;
  // смена водоёма
  await page.evaluate(() => { __game.s.lvl = 3; __game.s.coins += 500; });
  await page.click('.h-map'); await page.waitForTimeout(300);
  await page.click('[data-buy="1"]'); await page.waitForTimeout(300);
  res.loc = await page.evaluate(() => [__game.s.loc, __game.s.locs.join()]);
  // после «Без рекламы» полноэкранной нет
  const fs0 = (await calls()).filter((c) => c === 'fullscreen').length;
  await page.evaluate(() => { const g = __game; g.s.keep.push({ id: 'roach', w: 0.2, p: 5 }); g.lastAd = 0; });
  await page.click('.h-net'); await page.waitForTimeout(300);
  await page.click('.b-sell'); await page.waitForTimeout(200);
  await page.evaluate(() => __game.closeModal()); await page.waitForTimeout(600);
  res.noInterstitialAfterNoAds = (await calls()).filter((c) => c === 'fullscreen').length === fs0;
  res.setScore = (await calls()).filter((c) => c.startsWith('setScore')).length > 0;
  res.saved = (await calls()).filter((c) => c === 'setData').length > 0;
  // сохранение в облаке: перезагрузка страницы, мок хранит данные в памяти — проверяем localStorage
  res.local = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('cozy_fishing_save_v1')); return [d.loc, d.gear.rod, d.noAds, Object.keys(d.atlas).length]; });
  await page.reload();
  await page.waitForFunction(() => window.__game && !document.getElementById('boot'), null, { timeout: 30000 });
  res.restored = await page.evaluate(() => [__game.s.loc, __game.s.gear.rod, __game.s.noAds, Object.keys(__game.s.atlas).length, __game.s.login.streak]);
  res.noAdsAfterReload = await page.evaluate(() => window.__calls.includes('getPurchases'));
} }));
// английский язык
process.env.MOCK_LANG = 'en';
all = all.concat(await run({ w: 1280, h: 720, pre, steps: async (page) => {
  res.en = await page.evaluate(() => [document.documentElement.lang, document.querySelector('.m-play').textContent, document.title]);
  await page.click('.m-play'); await page.waitForTimeout(200);
  res.enChar = await page.evaluate(() => document.querySelector('.m-title').textContent);
  await page.screenshot({ path: 'test/out/flow_en.png' });
} }));
console.log(JSON.stringify(res, null, 1));
done(all);
