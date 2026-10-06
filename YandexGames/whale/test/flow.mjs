// Интеграция с моком SDK: загрузка, разметка геймплея, тапы, покупки зданий, остров и карточки,
// реклама (ветер, перевыбор, полноэкранная), покупки, миграция, офлайн-доход, сохранение, английский
import { run, done } from './shot.mjs';
const CAT = [
  { id: 'shells_2h', title: 'Мешочек ракушек', description: 'Доход за 2 часа', price: 19 },
  { id: 'shells_8h', title: 'Сундук ракушек', description: 'Доход за 8 часов', price: 59 },
  { id: 'shells_24h', title: 'Сокровищница', description: 'Доход за 24 часа', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};`;
process.env.MOCK_SDK = '1';
const res = {};
let all = [];
all = all.concat(await run({ w: 1280, h: 720, pre, steps: async (page) => {
  const calls = () => page.evaluate(() => window.__calls.slice());
  const lastGp = async () => (await calls()).filter((c) => c.startsWith('gp.')).slice(-1)[0];
  res.boot = (await calls()).filter((c) => /^(init|ready|getPurchases|getCatalog|getData)/.test(c));
  res.gpMenu = (await lastGp()) || 'none';
  await page.click('.m-play'); await page.waitForTimeout(300);
  res.gpPlay = await lastGp();
  // тапы
  const S = await page.evaluate(() => { const s = __game.scene; return [s.cx, s.cy - s.Hb * 0.4]; });
  for (let i = 0; i < 20; i++) await page.mouse.click(S[0], S[1]);
  res.tapShells = await page.evaluate(() => Math.round(__game.s.shells));
  res.taps = await page.evaluate(() => __game.s.taps);
  await page.click('[data-b="lemon"]'); await page.waitForTimeout(200);
  res.lemon = await page.evaluate(() => __game.s.b.lemon);
  // массовая покупка ×10 и «Макс»
  await page.evaluate(() => (__game.s.shells = 1e5));
  await page.click('[data-m="10"]'); await page.click('[data-b="fish"]'); await page.waitForTimeout(150);
  res.fish10 = await page.evaluate(() => __game.s.b.fish);
  await page.click('[data-m="max"]'); await page.click('[data-b="lemon"]'); await page.waitForTimeout(150);
  res.lemonMax = await page.evaluate(() => [__game.s.b.lemon, Math.round(__game.s.shells)]);
  // доход идёт сам
  const s0 = await page.evaluate(() => __game.s.shells);
  await page.waitForTimeout(1000);
  res.idleIncome = (await page.evaluate(() => __game.s.shells)) > s0;
  // рост кита
  await page.evaluate(() => (__game.s.shells = 1e4));
  await page.click('[data-tab="whale"]'); await page.waitForTimeout(150);
  await page.click('[data-grow="1"]'); await page.waitForTimeout(200);
  res.stage = await page.evaluate(() => [__game.s.stage, __game.scene.slots.length]);
  // попутный ветер за рекламу
  await page.click('.h-wind'); await page.waitForTimeout(1600);
  res.wind = await page.evaluate(() => __game.windEnd > Date.now() && __game.boost() >= 2);
  res.rewarded = (await calls()).filter((c) => c === 'rewarded').length;
  // остров: карточки, перевыбор за рекламу, выбор
  await page.evaluate(() => (__game.s.miles = 1e9));
  await page.waitForTimeout(300);
  res.islandModal = await page.evaluate(() => document.querySelectorAll('[data-card]').length);
  res.gpIsland = await lastGp();
  await page.click('.b-reroll'); await page.waitForTimeout(1600);
  res.rerolled = await page.evaluate(() => document.querySelectorAll('[data-card]').length === 3);
  const cards0 = await page.evaluate(() => __game.s.cards.length);
  await page.click('[data-card="1"]'); await page.waitForTimeout(400);
  res.island = await page.evaluate((c0) => [__game.s.island, __game.s.islandsAll, __game.s.cards.length >= c0], cards0);
  // полноэкранная: после второго острова и паузы 3 минуты
  await page.evaluate(() => { __game.lastAd = Date.now() - 200000; __game.s.miles = 1e9; });
  await page.waitForTimeout(300);
  await page.click('[data-card="0"]'); await page.waitForTimeout(700);
  res.interstitial = (await calls()).filter((c) => c === 'fullscreen').length;
  res.setScore = (await calls()).filter((c) => c.startsWith('setScore')).slice(-1)[0];
  // чайка
  const g0 = await page.evaluate(() => __game.s.gulls);
  await page.evaluate(() => (__game.scene.gull = { p: 0.4, dur: 11 }));
  await page.waitForTimeout(150);
  const gp = await page.evaluate(() => { const G = __game.scene.gull, s = Math.max(0.8, __game.scene.Lw / 700) * 1.1; return [G.x, G.y + 14 * s]; });
  await page.mouse.click(gp[0], gp[1]); await page.waitForTimeout(150);
  res.gull = (await page.evaluate(() => __game.s.gulls)) - g0;
  // покупки
  await page.click('.h-shop'); await page.waitForTimeout(300);
  res.iapRows = await page.evaluate(() => document.querySelectorAll('[data-iap]').length);
  const c1 = await page.evaluate(() => __game.s.shells);
  await page.click('[data-iap="shells_8h"]'); await page.waitForTimeout(900);
  res.chest = Math.round((await page.evaluate(() => __game.s.shells)) - c1);
  await page.click('[data-iap="disable_ads"]'); await page.waitForTimeout(900);
  res.noAds = await page.evaluate(() => __game.s.noAds);
  res.consumed = (await calls()).filter((c) => c.startsWith('consume')).length;
  await page.evaluate(() => __game.closeModal());
  // после «Без рекламы» полноэкранной нет
  const f0 = (await calls()).filter((c) => c === 'fullscreen').length;
  await page.evaluate(() => { __game.lastAd = 0; __game.s.miles = 1e9; });
  await page.waitForTimeout(300);
  await page.click('[data-card="0"]'); await page.waitForTimeout(600);
  res.noInterstitial = (await calls()).filter((c) => c === 'fullscreen').length === f0;
  // миграция
  await page.evaluate(() => { const s = __game.s; s.island = 10; s.all = 5e10; __game.renderPanel(true); });
  await page.click('[data-tab="whale"]'); await page.waitForTimeout(200);
  await page.click('.b-mig'); await page.waitForTimeout(200);
  await page.click('.b-go'); await page.waitForTimeout(400);
  res.migr = await page.evaluate(() => { const s = __game.s; return [s.migr, s.pearls, s.stage, Object.keys(s.b).length, s.island, __game.biome()]; });
  res.goals = await page.evaluate(() => Object.keys(__game.s.goals).length);
  // сохранение и офлайн-доход: откатываем время сохранения на час назад
  await page.evaluate(() => { const g = __game; g.s.b = { lemon: 50 }; g.s.ts = Date.now(); localStorage.setItem('whale_town_save_v1', JSON.stringify({ ...g.s, ts: Date.now() - 3600e3 })); });
  await page.evaluate(() => (window.__noCloud = true));
} }));
// перезапуск с сохранением часовой давности — окно офлайн-дохода
all = all.concat(await run({ w: 1280, h: 720, pre: pre + `localStorage.setItem('whale_town_save_v1', JSON.stringify({ ts: Date.now() - 3600e3, b: { lemon: 50 }, migr: 1, pearls: 17, pearlsEver: 17, stage: 1, login: { last: 1, streak: 3 } }));`, steps: async (page) => {
  await page.click('.m-play'); await page.waitForTimeout(400);
  res.offlineModal = await page.evaluate(() => !!document.querySelector('.b-x2'));
  const v = await page.evaluate(() => __game.s.shells);
  await page.click('.b-x2'); await page.waitForTimeout(1600);
  res.offlineX2 = (await page.evaluate(() => __game.s.shells)) > v;
  res.restored = await page.evaluate(() => [__game.s.b.lemon, __game.s.pearls, __game.biome()]);
  res.giftAfterOffline = await page.evaluate(() => !!document.querySelector('.gcal'));
} }));
process.env.MOCK_LANG = 'en';
all = all.concat(await run({ w: 1280, h: 720, pre, steps: async (page) => {
  res.en = await page.evaluate(() => [document.documentElement.lang, document.title, document.querySelector('.m-play').textContent]);
  await page.click('.m-play'); await page.waitForTimeout(300);
  res.enTab = await page.evaluate(() => document.querySelector('.ptab').textContent);
  await page.screenshot({ path: 'test/out/flow_en.png' });
} }));
console.log(JSON.stringify(res));
done(all);
