// Интеграция с моком SDK: загрузка, разметка геймплея, управление и физика в браузере, падение и чекпоинт,
// финиш (звёзды, открытие уровня, лидерборд), x2 за рекламу, пропуск уровня, скин за рекламу, покупки,
// «Без рекламы», полноэкранная реклама, подарок, сохранение, английский язык
import { run, done } from './shot.mjs';
const CAT = [
  { id: 'coins_500', title: 'Горсть монет', description: '500 монет', price: 19 },
  { id: 'coins_2000', title: 'Мешок монет', description: '2000 монет', price: 59 },
  { id: 'coins_6000', title: 'Сундук монет', description: '6000 монет', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};`;
process.env.MOCK_SDK = '1';
const res = {};
let all = [];
all = all.concat(await run({ w: 1280, h: 720, pre, steps: async (page) => {
  const calls = () => page.evaluate(() => window.__calls.slice());
  const lastGp = async () => (await calls()).filter((c) => c.startsWith('gp.')).slice(-1)[0];
  const count = async (n) => (await calls()).filter((c) => c === n).length;
  res.fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => (++n, performance.now() - t0 < 1000 ? requestAnimationFrame(f) : r(n)); requestAnimationFrame(f); }));
  res.boot = (await calls()).filter((c) => /^(init|ready|getPurchases|getCatalog|getData)/.test(c));
  res.gpMenu = (await lastGp()) || 'none';
  await page.click('.m-play', { force: true }); await page.waitForTimeout(500);
  res.gpPlay = await lastGp();
  // бег вперёд
  const p0 = await page.evaluate(() => [__game.P.x, __game.P.z]);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW');
  const p1 = await page.evaluate(() => [__game.P.x, __game.P.z, __game.time]);
  res.moved = +Math.hypot(p1[0] - p0[0], p1[1] - p0[1]).toFixed(2);
  res.timerRuns = p1[2] > 0;
  // прыжок
  const y0 = await page.evaluate(() => __game.P.y);
  await page.keyboard.press('Space');
  const ymax = await page.evaluate(() => new Promise((r) => { let m = -1e9; const t0 = performance.now(); const f = () => { m = Math.max(m, __game.P.y); performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(m); }; f(); }));
  res.jumped = +(ymax - y0).toFixed(2);
  // поворот камеры мышью
  const yw = await page.evaluate(() => __game.view.yaw);
  await page.mouse.move(640, 400); await page.mouse.down(); await page.mouse.move(760, 400, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(100);
  res.camTurn = Math.abs((await page.evaluate(() => __game.view.yaw)) - yw) > 0.2;
  // падение: телепорт в пропасть → возврат на старт, счётчик падений
  await page.evaluate(() => { const P = __game.P; P.y = -40; P.vy = -10; P.ground = null; });
  await page.waitForTimeout(500);
  res.fall = await page.evaluate(() => [__game.P.deaths, __game.P.y > -5]);
  // чекпоинт: поставить игрока на платформу-чекпоинт
  res.cp = await page.evaluate(async () => {
    const g = __game, lv = g.lv, cp = lv.plats.find((p) => p.cp);
    if (!cp) return 'no-cp';
    Object.assign(g.P, { x: cp.x, y: cp.y + 0.6, z: cp.z, vx: 0, vy: 0, vz: 0, ground: null });
    await new Promise((r) => setTimeout(r, 2500));
    const got = g.P.cp;
    g.P.y = -40; g.P.ground = null;
    await new Promise((r) => setTimeout(r, 1200));
    return [got === cp.id, Math.hypot(g.P.x - cp.x, g.P.z - cp.z) < 3];
  });
  // финиш: поставить на финишную платформу
  await page.evaluate(() => { const g = __game, f = g.lv.plats.find((p) => p.finish); g.time = 20; Object.assign(g.P, { x: f.x, y: f.y + 0.6, z: f.z, vx: 0, vy: 0, vz: 0, ground: null }); });
  await page.waitForFunction(() => !!document.querySelector('.b-x2'), null, { timeout: 15000 }).catch(() => {});
  res.finish = await page.evaluate(() => [!!document.querySelector('.b-x2'), __game.s.max, __game.s.stars[1], __game.s.last]);
  res.gpFinish = await lastGp();
  res.setScore = (await calls()).filter((c) => c.startsWith('setScore')).slice(-1)[0];
  const c0 = await page.evaluate(() => __game.s.coins);
  await page.click('.b-x2', { force: true }); await page.waitForTimeout(900);
  res.x2 = (await page.evaluate(() => __game.s.coins)) - c0;
  res.rewarded = await count('rewarded');
  // дальше: уровень 2, на уровне < 3 полноэкранной нет
  await page.click('.b-next', { force: true }); await page.waitForTimeout(500);
  res.next = await page.evaluate(() => [__game.L, __game.state]);
  res.noAdEarly = (await count('fullscreen')) === 0;
  // пропуск уровня за рекламу (после 8 падений)
  await page.evaluate(() => (__game.P.deaths = 8));
  await page.waitForTimeout(800);
  res.skipVisible = await page.evaluate(() => !document.querySelector('.skipb').classList.contains('hidden'));
  await page.click('.skipb', { force: true }); await page.waitForTimeout(900);
  res.skip = await page.evaluate(() => [__game.L, __game.s.max]);
  // полноэкранная: уровень ≥3 и прошло 150 с
  await page.evaluate(() => { __game.lastAd = Date.now() - 200000; __game.finish(); });
  await page.waitForTimeout(1300);
  await page.click('.b-next', { force: true }); await page.waitForTimeout(800);
  res.interstitial = await count('fullscreen');
  res.afterAd = await page.evaluate(() => __game.L);
  // скин за рекламу
  await page.evaluate(() => { __game.toMenu(); __game.openSkins(); }); await page.waitForTimeout(200);
  await page.click('[data-ad="cat"]', { force: true }); await page.waitForTimeout(900);
  res.adSkin = await page.evaluate(() => [__game.s.skins.includes('cat'), __game.s.skin]);
  // покупка скина за монеты
  await page.evaluate(() => { __game.s.coins = 1000; __game.closeModal(true); __game.openSkins(); }); await page.waitForTimeout(150);
  await page.click('[data-buy="pink"]', { force: true }); await page.waitForTimeout(200);
  res.buySkin = await page.evaluate(() => [__game.s.skins.includes('pink'), __game.s.coins]);
  await page.evaluate(() => __game.closeModal(true));
  // покупки
  await page.click('.m-sh', { force: true }); await page.waitForTimeout(400);
  res.iapRows = await page.evaluate(() => document.querySelectorAll('[data-iap]').length);
  const k1 = await page.evaluate(() => __game.s.coins);
  await page.click('[data-iap="coins_2000"]', { force: true }); await page.waitForTimeout(900);
  res.iapCoins = (await page.evaluate(() => __game.s.coins)) - k1;
  await page.click('[data-iap="disable_ads"]', { force: true }); await page.waitForTimeout(900);
  res.noAds = await page.evaluate(() => __game.s.noAds);
  res.consumed = (await calls()).filter((c) => c.startsWith('consume')).length;
  res.ownedShown = await page.evaluate(() => !document.querySelector('[data-iap="disable_ads"]'));
  await page.evaluate(() => __game.closeModal());
  const f0 = await count('fullscreen');
  await page.evaluate(() => { __game.lastAd = 0; __game.startLevel(5); __game.finish(); });
  await page.waitForTimeout(1300);
  await page.click('.b-next', { force: true }); await page.waitForTimeout(500);
  res.noInterstitial = (await count('fullscreen')) === f0;
  // подарок дня
  await page.evaluate(() => __game.toMenu());
  const g0 = await page.evaluate(() => __game.s.coins);
  await page.click('.m-gift', { force: true }); await page.waitForTimeout(200);
  await page.click('.b-take', { force: true }); await page.waitForTimeout(200);
  res.gift = [(await page.evaluate(() => __game.s.coins)) - g0, await page.evaluate(() => document.querySelector('.m-gift').classList.contains('hidden'))];
  // лидерборд
  await page.click('.m-lb', { force: true }); await page.waitForTimeout(500);
  res.lb = await page.evaluate(() => document.querySelectorAll('.lbr').length);
  await page.evaluate(() => __game.closeModal(true));
  await page.evaluate(() => __game.persist());
  await page.waitForTimeout(1200);
  res.saved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('sky_parkour_save_v1') || '{}'); return [s.max, s.skins && s.skins.length, s.noAds]; });
  res.setData = await count('setData');
} }));
// перезапуск: прогресс из сохранения
all = all.concat(await run({ w: 1280, h: 720, pre: pre + `localStorage.setItem('sky_parkour_save_v1', JSON.stringify({ max: 12, last: 12, coins: 777, stars: { 1: 3, 2: 2 }, skins: ['red', 'ninja'], skin: 'ninja', noAds: true }));`, steps: async (page) => {
  res.restored = await page.evaluate(() => [__game.s.max, __game.s.coins, __game.s.skin, __game.L, document.querySelector('.m-pl').textContent, __game.s.settings.sens]);
} }));
process.env.MOCK_LANG = 'en';
all = all.concat(await run({ w: 1280, h: 720, pre, steps: async (page) => {
  res.en = await page.evaluate(() => [document.documentElement.lang, document.title, document.querySelector('.m-play').textContent, document.querySelector('.mn h1').textContent]);
  await page.click('.m-play', { force: true }); await page.waitForTimeout(600);
  res.enHud = await page.evaluate(() => document.querySelector('.h-lvl').textContent);
  await page.screenshot({ path: 'test/out/flow_en.png' });
} }));
console.log(JSON.stringify(res, null, 0));
done(all);
