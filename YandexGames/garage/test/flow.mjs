// Интеграция с моком SDK: загрузка, разметка геймплея, рынок, торг, покупка, мойка, ремонт, покраска,
// продажа покупателю, опыт и уровень, реклама (обновить рынок, механик, x2), полноэкранная после продажи,
// покупки денег и «Без рекламы», подарок, сохранение и восстановление, английский язык
import { run, done } from './shot.mjs';
const CAT = [
  { id: 'cash_small', title: 'Пачка денег', description: '', price: 19 },
  { id: 'cash_medium', title: 'Чемодан денег', description: '', price: 59 },
  { id: 'cash_large', title: 'Сейф с деньгами', description: '', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};`;
process.env.MOCK_SDK = '1';
const res = {};
let all = [];
all = all.concat(await run({ w: 1280, h: 720, pre, steps: async (page) => {
  const calls = () => page.evaluate(() => window.__calls.slice());
  const count = async (n) => (await calls()).filter((c) => c === n).length;
  const lastGp = async () => (await calls()).filter((c) => c.startsWith('gp.')).slice(-1)[0];
  const ev = (f, a) => page.evaluate(f, a);
  const idle = () => page.waitForFunction(() => !__game.busy && !__game.job, null, { timeout: 60000 });
  res.boot = (await calls()).filter((c) => /^(init|ready|getPurchases|getCatalog|getData)/.test(c));
  res.gpWelcome = await lastGp();
  await page.click('.b-ok', { force: true }); await page.waitForTimeout(300);
  res.gpPlay = await lastGp();
  // рынок и обучающая машина
  await page.click('[data-tab="market"]', { force: true }); await page.waitForTimeout(400);
  res.market = await ev(() => [__game.s.market.list.length, !!__game.s.market.list[0].tutorial]);
  // торг: предложение −20% → ответ продавца
  const id = await ev(() => __game.s.market.list[0].id);
  await ev((id) => __game.openSellerChat(id), id);
  await page.click('[data-pc="20"]', { force: true });
  await page.click('.b-off', { force: true }); await page.waitForTimeout(1600);
  res.chat = await ev(() => document.querySelectorAll('.msg').length);
  const m0 = await ev(() => __game.s.money);
  await page.click('.b-deal', { force: true }); await page.waitForTimeout(800);
  res.bought = await ev((m0) => [!!__game.s.car, m0 - __game.s.money, __game.s.car && __game.s.car.bought, __game.tab], m0);
  // мойка до конца
  await ev(() => { const g = __game; g.setTool('wash'); for (let i = 0; i < 400; i++) g.view.rub({ x: Math.random(), y: Math.random() }, true); g._washDirty = true; });
  await page.waitForTimeout(1500);
  res.washed = await ev(() => __game.s.car.dirt);
  // ремонт кузова: ржавчина на правом крыле
  await ev(() => { __game.setTool('body'); __game.select('fenderR'); });
  const mb = await ev(() => __game.s.money);
  await page.click('[data-job="rust"]', { force: true }); await page.waitForTimeout(200); await idle();
  res.rust = await ev((mb) => [__game.s.car.panels.fenderR.rust, __game.s.car.panels.fenderR.primer, mb - __game.s.money, __game.s.car.spent], mb);
  // покраска детали (без камеры)
  await ev(() => __game.select('fenderR'));
  await page.click('[data-job="paintPanel"]', { force: true }); await page.waitForTimeout(200); await idle();
  res.painted = await ev(() => __game.s.car.panels.fenderR.primer);
  // механика: двигатель
  await ev(() => { __game.s.money += 100000; __game.setTool('mech'); });
  await page.click('[data-job="engine"]', { force: true }); await page.waitForTimeout(200); await idle();
  res.engine = await ev(() => __game.s.car.sys.engine);
  const v = await ev(() => Math.round(__game.q().Q * 100));
  res.quality = v;
  // продажа: выставить и дождаться покупателя (ускоряем таймер)
  await ev(() => __game.setTool('sell'));
  await page.click('.b-list', { force: true });
  await ev(() => { __game.buyerT = 0; __game.update(0.05); });
  await page.waitForTimeout(500);
  res.buyers = await ev(() => __game.buyers.length);
  // торг с покупателем
  const bid = await ev(() => __game.buyers[0] && __game.buyers[0].id);
  if (bid) {
    await ev((b) => __game.openBuyerChat(b), bid);
    await page.click('.b-off', { force: true }); await page.waitForTimeout(1600);
    res.buyerChat = await ev(() => document.querySelectorAll('.msg').length);
    const before = await ev(() => [__game.s.money, __game.s.sold]);
    await page.click('.b-deal', { force: true }); await page.waitForTimeout(1500);
    res.sold = await ev((b) => [__game.s.sold - b[1], __game.s.money - b[0] > 0, !__game.s.car, !!document.querySelector('.xpline')], before);
    // x2 опыта за рекламу
    await page.click('.b-x2', { force: true }); await page.waitForTimeout(900);
    res.rewarded = await count('rewarded');
    const xp0 = await ev(() => [__game.s.lvl, __game.s.xp]);
    await page.click('.b-ok', { force: true }); await page.waitForTimeout(800);
    res.xp = await ev((x) => [x, [__game.s.lvl, __game.s.xp]], xp0);
    res.levelModal = await ev(() => !!document.querySelector('.biglvl'));
    await ev(() => __game.closeModal(true));
  }
  res.setScore = (await calls()).filter((c) => c.startsWith('setScore')).slice(-1)[0];
  // полноэкранная: после второй продажи и паузы
  await ev(() => { const g = __game; g.s.sold = 3; g.lastAd = 0; g.interstitial(() => {}); });
  await page.waitForTimeout(700);
  res.interstitial = await count('fullscreen');
  // реклама: обновить рынок, механик
  await ev(() => __game.setTab('market'));
  const ids0 = await ev(() => __game.s.market.list.map((l) => l.id).join());
  await page.click('.b-refresh', { force: true }); await page.waitForTimeout(900);
  res.refreshed = (await ev(() => __game.s.market.list.map((l) => l.id).join())) !== ids0;
  await page.waitForTimeout(1500);
  const lid = await ev(() => __game.s.market.list[1].id);
  await ev((id) => __game.openLot(id), lid);
  res.mechBtn = await ev(() => !!document.querySelector('.b-mech'));
  await ev(() => document.querySelector('.b-mech').click()); await page.waitForTimeout(1500);
  res.revealed = await ev((id) => [!!(__game._lot(id) && __game._lot(id).revealed), window.__calls.filter((c) => c === 'rewarded').length, !!__game._lot(id), __game.s.market.list.length], lid);
  await ev(() => __game.closeModal(true));
  // улучшение
  await ev(() => { __game.s.money = 500000; __game.setTab('up'); });
  await page.click('[data-up="tools"]', { force: true }); await page.waitForTimeout(200);
  res.upgrade = await ev(() => __game.s.up.tools);
  // покупки
  await ev(() => __game.openShop()); await page.waitForTimeout(400);
  res.iapRows = await ev(() => document.querySelectorAll('[data-iap]').length);
  const c1 = await ev(() => __game.s.money);
  await page.click('[data-iap="cash_medium"]', { force: true }); await page.waitForTimeout(900);
  res.iapCash = await ev((c1) => [__game.s.money - c1, __game.packSize(1)], c1);
  await page.click('[data-iap="disable_ads"]', { force: true }); await page.waitForTimeout(900);
  res.noAds = await ev(() => __game.s.noAds);
  res.consumed = (await calls()).filter((c) => c.startsWith('consume')).length;
  await ev(() => __game.closeModal(true));
  const f0 = await count('fullscreen');
  await ev(() => { __game.lastAd = 0; __game.interstitial(() => {}); });
  await page.waitForTimeout(500);
  res.noInterstitial = (await count('fullscreen')) === f0;
  // подарок
  const g0 = await ev(() => __game.s.money);
  await ev(() => __game.openGift());
  await page.click('.b-take', { force: true }); await page.waitForTimeout(200);
  res.gift = await ev((g0) => __game.s.money - g0, g0);
  await ev(() => __game.persist()); await page.waitForTimeout(1000);
  res.saved = await ev(() => { const s = JSON.parse(localStorage.getItem('garage_flipper_save_v1') || '{}'); return [s.sold, s.up && s.up.tools, s.noAds, s.market && s.market.list.length]; });
  res.gpEnd = await lastGp();
} }));
// перезапуск: машина в гараже из сохранения
all = all.concat(await run({ w: 1280, h: 720, pre: pre + `localStorage.setItem('garage_flipper_save_v1', JSON.stringify({ money: 77777, lvl: 4, xp: 10, tut: { welcome: 1, step: 6, firstCar: 1 }, up: { booth: 1 }, car: ${JSON.stringify({ model: 'kozlik', year: 1988, color: 3100750, orig: 3100750, metallic: false, km: 150000, panels: { hood: { rust: 0.3, dent: 0, fade: 0.3, primer: 0, seed: 5 }, doorL: { rust: 0, dent: 0.6, fade: 0.2, primer: 0, seed: 7 } }, sys: { engine: 0.5, gearbox: 0.6, suspension: 0.5, brakes: 0.5, interior: 0.5, glass: 0.4, lights: 0.4, tires: 0.3 }, dirt: 0.5, look: {}, tuned: {}, bought: 40000, spent: 1000, seed: 1 })} }));`, steps: async (page) => {
  res.restored = await page.evaluate(() => [__game.s.money, __game.s.lvl, __game.s.car && __game.s.car.model, !!__game.view, document.querySelector('.carhead b').textContent]);
} }));
process.env.MOCK_LANG = 'en';
all = all.concat(await run({ w: 1280, h: 720, pre, steps: async (page) => {
  res.en = await page.evaluate(() => [document.documentElement.lang, document.title, document.querySelector('.m-title span').textContent, document.querySelector('[data-tab="market"]').textContent]);
} }));
console.log(JSON.stringify(res));
done(all);
