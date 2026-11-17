// Проверка интеграции с моком SDK: обучение, сохранение, реклама, покупки, кроссворд дня, английский
import { run, done } from './shot.mjs';
const O = 'test/out/';
const CAT = [
  { id: 'coins_300', title: '300 монет', description: 'Монеты для подсказок', price: 19 },
  { id: 'coins_1000', title: '1 000 монет', description: 'Мешочек монет', price: 59 },
  { id: 'coins_3000', title: '3 000 монет', description: 'Сундучок монет', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает рекламу между кроссвордами', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};`;
const solveAll = (page) => page.evaluate(() => {
  const g = window.__app.game; const pz = g.pz;
  for (const e of pz.entries) { if (pz.solved.has(e.id)) continue; g.selectEntry(e.id, true); for (const i of e.cells) if (!pz.locked(i)) { g.sel = i; g.type(pz.cells[i].ch); } }
});
const res = {};
let all = [];
process.env.MOCK_SDK = '1';
all = all.concat(await run({ w: 390, h: 800, mobile: true, dpr: 2, pre, steps: async (page) => {
  const calls = () => page.evaluate(() => window.__calls.slice());
  res.boot = (await calls()).filter((c) => /init|ready|getPurchases|getCatalog|getData/.test(c));
  // обучение
  await page.click('.m-play'); await page.waitForTimeout(400);
  res.pulse = await page.evaluate(() => !!document.querySelector('.cluebar.pulse'));
  res.gpStartAfterPlay = (await calls()).includes('gp.start');
  await page.click('.cell'); await page.waitForTimeout(300);
  await page.screenshot({ path: O + 'tut2.png' });
  res.tip2 = await page.evaluate(() => document.querySelector('.tipbox')?.textContent);
  // вводим первое слово экранной клавиатурой
  const word = await page.evaluate(() => window.__app.game.cur().word);
  for (const ch of word) await page.click(`.key[data-k="${ch}"]`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: O + 'tut3.png' });
  res.tip3 = await page.evaluate(() => document.querySelector('.tipbox')?.textContent);
  res.solvedAfterTyping = await page.evaluate(() => window.__app.game.pz.solved.size);
  // подсказки
  const c0 = await page.evaluate(() => window.__app.save.data.coins);
  await page.click('.t-letter'); await page.waitForTimeout(200);
  await page.click('.t-word'); await page.waitForTimeout(200);
  res.coinsSpent = c0 - (await page.evaluate(() => window.__app.save.data.coins));
  // физическая клавиатура: русская буква при английской раскладке (KeyF -> А)
  // возврат в меню и восстановление прогресса
  await page.click('.g-back'); await page.waitForTimeout(300);
  res.ipSaved = await page.evaluate(() => !!window.__app.save.data.p.ru.ip);
  res.gpStopAfterBack = (await calls()).slice(-3).includes('gp.stop');
  await page.reload(); await page.waitForFunction(() => window.__app && !document.getElementById('boot'));
  await page.evaluate(() => window.__app.openLevel(0)); await page.waitForTimeout(300);
  res.restored = await page.evaluate(() => window.__app.game.pz.solved.size);
  await solveAll(page); await page.waitForTimeout(1500);
  res.winShown = await page.evaluate(() => !!document.querySelector('.sheet.win'));
  // удвоение за рекламу
  const c1 = await page.evaluate(() => window.__app.save.data.coins);
  await page.click('.w-x2'); await page.waitForTimeout(900);
  res.doubled = (await page.evaluate(() => window.__app.save.data.coins)) - c1;
  res.rewardedCalled = (await calls()).includes('rewarded');
  // три кроссворда подряд -> полноэкранная реклама после третьего
  await page.evaluate(() => { window.__app.S.lastAd = 0; });
  await page.click('.w-next'); await page.waitForTimeout(400);
  await solveAll(page); await page.waitForTimeout(1500); await page.click('.w-next'); await page.waitForTimeout(400);
  res.fullscreenEarly = (await calls()).includes('fullscreen');
  await solveAll(page); await page.waitForTimeout(1500); await page.click('.w-next'); await page.waitForTimeout(800);
  res.fullscreenAfter3 = (await calls()).includes('fullscreen');
  res.cur = await page.evaluate(() => window.__app.save.data.p.ru.cur);
  res.setScore = (await calls()).filter((c) => c.startsWith('setScore')).slice(-1)[0];
  // магазин и покупки
  await page.click('.g-coins'); await page.waitForTimeout(400);
  await page.screenshot({ path: O + 'store.png' });
  res.storeItems = await page.evaluate(() => document.querySelectorAll('.s-buy').length);
  const c2 = await page.evaluate(() => window.__app.save.data.coins);
  await page.click('.s-buy[data-id="coins_1000"]'); await page.waitForTimeout(800);
  res.bought = (await page.evaluate(() => window.__app.save.data.coins)) - c2;
  await page.click('.s-buy[data-id="disable_ads"]'); await page.waitForTimeout(800);
  res.noAds = await page.evaluate(() => window.__app.save.data.noAds);
  res.consumed = (await calls()).filter((c) => c.startsWith('consume')).length;
  await page.evaluate(() => window.__app.closeModal(true));
  // кроссворд дня
  await page.evaluate(() => { window.__app.show('menu'); window.__app.renderMenu(); });
  await page.click('.m-daily'); await page.waitForTimeout(500);
  res.dailyWords = await page.evaluate(() => window.__app.game.pz.entries.length);
  await page.screenshot({ path: O + 'daily.png' });
  const c3 = await page.evaluate(() => window.__app.save.data.coins);
  await solveAll(page); await page.waitForTimeout(1500);
  res.dailyCoins = (await page.evaluate(() => window.__app.save.data.coins)) - c3;
  res.streak = await page.evaluate(() => window.__app.save.data.daily.streak);
  await page.click('.w-list'); await page.waitForTimeout(400);
  res.dailyDoneLabel = await page.evaluate(() => document.querySelector('.m-daily').textContent);
  // реклама не показывается после «Без рекламы»
  const nFs = (await calls()).filter((c) => c === 'fullscreen').length;
  await page.evaluate(() => { window.__app.S.lastAd = 0; window.__app.openLevel(window.__app.save.data.p.ru.cur); });
  await solveAll(page); await page.waitForTimeout(1500); await page.click('.w-next'); await page.waitForTimeout(600);
  res.noFsAfterNoAds = (await calls()).filter((c) => c === 'fullscreen').length === nFs;
  // перезапуск: покупка «без рекламы» восстанавливается
  await page.reload(); await page.waitForFunction(() => window.__app && !document.getElementById('boot'));
  res.noAdsRestored = await page.evaluate(() => window.__app.save.data.noAds);
  // лидерборд
  await page.click('.m-lb'); await page.waitForTimeout(500);
  await page.screenshot({ path: O + 'lb.png' });
  res.lbRows = await page.evaluate(() => document.querySelectorAll('.lbr').length);
} }));
process.env.MOCK_LANG = 'en';
all = all.concat(await run({ w: 1280, h: 720, locale: 'en-US', pre, steps: async (page) => {
  await page.screenshot({ path: O + 'en_menu.png' });
  await page.evaluate(() => { window.__app.save.data.tutDone = true; window.__app.openLevel(30); }); await page.waitForTimeout(400);
  // ввод с физической клавиатуры
  const e = await page.evaluate(() => window.__app.game.cur().word);
  for (const ch of e) await page.keyboard.press('Key' + ch);
  await page.waitForTimeout(300);
  res.enKeyboardSolved = await page.evaluate(() => window.__app.game.pz.solved.size);
  await page.screenshot({ path: O + 'en_game.png' });
  res.enTitle = await page.title();
} }));
process.env.MOCK_LANG = 'ru';
// русские буквы с английской раскладки и темы
all = all.concat(await run({ w: 1280, h: 720, pre, steps: async (page) => {
  await page.evaluate(() => { window.__app.save.data.tutDone = true; window.__app.openLevel(0); }); await page.waitForTimeout(300);
  const w = await page.evaluate(() => window.__app.game.cur().word);
  const map = { Й:'KeyQ',Ц:'KeyW',У:'KeyE',К:'KeyR',Е:'KeyT',Н:'KeyY',Г:'KeyU',Ш:'KeyI',Щ:'KeyO',З:'KeyP',Х:'BracketLeft',Ъ:'BracketRight',Ф:'KeyA',Ы:'KeyS',В:'KeyD',А:'KeyF',П:'KeyG',Р:'KeyH',О:'KeyJ',Л:'KeyK',Д:'KeyL',Ж:'Semicolon',Э:'Quote',Я:'KeyZ',Ч:'KeyX',С:'KeyC',М:'KeyV',И:'KeyB',Т:'KeyN',Ь:'KeyM',Б:'Comma',Ю:'Period' };
  for (const ch of w) await page.keyboard.press(map[ch]);
  await page.waitForTimeout(300);
  res.ruFromLatin = await page.evaluate(() => window.__app.game.pz.solved.size);
  for (const th of ['contrast', 'dark']) {
    await page.evaluate((th) => { window.__app.save.data.settings.theme = th; document.documentElement.dataset.theme = th; }, th);
    await page.waitForTimeout(200);
    await page.screenshot({ path: O + 'theme_' + th + '.png' });
  }
} }));
console.log(JSON.stringify(res, null, 1));
done(all);
