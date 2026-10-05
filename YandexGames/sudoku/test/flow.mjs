// Интеграция с моком SDK: обучение, сохранение, ошибки, подсказка, отмена, реклама, покупки, сад, судоку дня, английский
import { run, done } from './shot.mjs';
const O = 'test/out/';
const CAT = [
  { id: 'coins_300', title: '300 монет', description: 'Монеты для подсказок', price: 19 },
  { id: 'coins_1000', title: '1 000 монет', description: 'Мешочек монет', price: 59 },
  { id: 'coins_3000', title: '3 000 монет', description: 'Сундучок монет', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает рекламу между судоку', price: 99 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};`;
const solveAll = (page) => page.evaluate(() => { const b = window.__app.board; for (let i = 0; i < 81; i++) if (b.vals[i] !== b.sol[i]) { b.select(i); b.input(b.sol[i]); } });
const res = {};
let all = [];
process.env.MOCK_SDK = '1';
all = all.concat(await run({ w: 390, h: 800, mobile: true, dpr: 2, pre, steps: async (page) => {
  const calls = () => page.evaluate(() => window.__calls.slice());
  res.boot = (await calls()).filter((c) => /init|ready|getPurchases|getCatalog|getData/.test(c));
  await page.click('.m-play'); await page.waitForTimeout(400);
  res.tip1 = await page.evaluate(() => document.querySelector('.tipbox')?.textContent);
  res.gpStart = (await calls()).includes('gp.start');
  const empty = await page.evaluate(() => window.__app.board.vals.findIndex((v) => !v));
  await page.click(`.cell[data-i="${empty}"]`); await page.waitForTimeout(200);
  res.tip2 = (await page.evaluate(() => document.querySelector('.tipbox')?.textContent || '')).slice(0, 30);
  // неверная цифра, затем верная
  const sol = await page.evaluate((i) => window.__app.board.sol[i], empty);
  await page.click(`.num[data-d="${(sol % 9) + 1}"]`);
  res.mistakes = await page.evaluate(() => window.__app.board.mistakes);
  res.badShown = await page.evaluate((i) => document.querySelector(`.cell[data-i="${i}"]`).classList.contains('bad'), empty);
  await page.click(`.num[data-d="${sol}"]`); await page.waitForTimeout(300);
  res.tip3 = !!(await page.evaluate(() => document.querySelector('.tipbox button')));
  await page.screenshot({ path: O + 'flow_tut3.png' });
  await page.click('.tipbox button');
  // отмена
  await page.click('.t-undo');
  res.undone = await page.evaluate((i) => window.__app.board.vals[i], empty);
  await page.click(`.num[data-d="${sol}"]`);
  // заметки
  await page.click('.t-notes');
  const e2 = await page.evaluate(() => window.__app.board.vals.findIndex((v) => !v));
  await page.click(`.cell[data-i="${e2}"]`); await page.click('.num[data-d="2"]'); await page.click('.num[data-d="5"]');
  res.notes = await page.evaluate((i) => window.__app.board.notes[i], e2);
  await page.click('.t-notes');
  // подсказка
  const c0 = await page.evaluate(() => window.__app.save.data.coins);
  await page.click('.t-hint'); await page.waitForTimeout(200);
  res.hintSpent = c0 - (await page.evaluate(() => window.__app.save.data.coins));
  res.hintFilled = await page.evaluate((i) => window.__app.board.vals[i] === window.__app.board.sol[i], e2);
  // выход и восстановление
  await page.click('.g-back'); await page.waitForTimeout(300);
  res.ipSaved = await page.evaluate(() => !!window.__app.save.data.ip['lvl:easy:0']);
  await page.reload(); await page.waitForFunction(() => window.__app && !document.getElementById('boot'));
  await page.click('.m-play'); await page.waitForTimeout(300);
  res.restoredFilled = await page.evaluate((i) => window.__app.board.vals[i], empty) === sol;
  res.restoredMistakes = await page.evaluate(() => window.__app.board.mistakes);
  await solveAll(page); await page.waitForTimeout(1800);
  res.winShown = await page.evaluate(() => !!document.querySelector('.sheet.win'));
  res.newItem = await page.evaluate(() => document.querySelector('.newitem b')?.textContent);
  res.stars = await page.evaluate(() => document.querySelectorAll('.stars .ic.on').length);
  await page.screenshot({ path: O + 'flow_win.png' });
  const c1 = await page.evaluate(() => window.__app.save.data.coins);
  await page.click('.w-x2'); await page.waitForTimeout(900);
  res.doubled = (await page.evaluate(() => window.__app.save.data.coins)) - c1;
  await page.evaluate(() => (window.__app.S.lastAd = 0));
  await page.click('.w-next'); await page.waitForTimeout(400);
  await solveAll(page); await page.waitForTimeout(1800); await page.click('.w-next'); await page.waitForTimeout(400);
  res.fullscreenEarly = (await calls()).includes('fullscreen');
  await solveAll(page); await page.waitForTimeout(1800); await page.click('.w-next'); await page.waitForTimeout(800);
  res.fullscreenAfter3 = (await calls()).includes('fullscreen');
  res.cur = await page.evaluate(() => window.__app.save.data.ch.easy.cur);
  res.setScore = (await calls()).filter((c) => c.startsWith('setScore')).slice(-1)[0];
  // магазин
  await page.click('.g-coins'); await page.waitForTimeout(300);
  await page.screenshot({ path: O + 'flow_store.png' });
  res.storeItems = await page.evaluate(() => document.querySelectorAll('.s-buy').length);
  const c2 = await page.evaluate(() => window.__app.save.data.coins);
  await page.click('.s-buy[data-id="coins_1000"]'); await page.waitForTimeout(800);
  res.bought = (await page.evaluate(() => window.__app.save.data.coins)) - c2;
  await page.click('.s-buy[data-id="disable_ads"]'); await page.waitForTimeout(800);
  res.noAds = await page.evaluate(() => window.__app.save.data.noAds);
  res.consumed = (await calls()).filter((c) => c.startsWith('consume')).length;
  await page.evaluate(() => window.__app.closeModal(true));
  // судоку дня
  await page.evaluate(() => { window.__app.renderMenu(); window.__app.show('menu'); });
  await page.click('.m-daily'); await page.waitForTimeout(300);
  const c3 = await page.evaluate(() => window.__app.save.data.coins);
  await solveAll(page); await page.waitForTimeout(1800);
  res.dailyCoins = (await page.evaluate(() => window.__app.save.data.coins)) - c3;
  res.streak = await page.evaluate(() => window.__app.save.data.daily.streak);
  await page.click('.w-list'); await page.waitForTimeout(400);
  res.dailyLabel = await page.evaluate(() => document.querySelector('.m-daily small').textContent);
  // без рекламы — полноэкранной нет
  const nFs = (await calls()).filter((c) => c === 'fullscreen').length;
  await page.evaluate(() => { window.__app.S.lastAd = 0; window.__app.openGame('free:hard:0'); });
  await solveAll(page); await page.waitForTimeout(1800); await page.click('.w-next'); await page.waitForTimeout(600);
  res.noFsAfterNoAds = (await calls()).filter((c) => c === 'fullscreen').length === nFs;
  res.freeNext = await page.evaluate(() => window.__app.S.cur.key);
  res.solved = await page.evaluate(() => window.__app.save.data.solved);
  await page.reload(); await page.waitForFunction(() => window.__app && !document.getElementById('boot'));
  res.noAdsRestored = await page.evaluate(() => window.__app.save.data.noAds);
  await page.click('.m-lb'); await page.waitForTimeout(500);
  res.lbRows = await page.evaluate(() => document.querySelectorAll('.lbr').length);
} }));
process.env.MOCK_LANG = 'en';
all = all.concat(await run({ w: 1280, h: 720, locale: 'en-US', pre, steps: async (page) => {
  await page.screenshot({ path: O + 'en_menu.png' });
  res.enTitle = await page.title();
  await page.evaluate(() => { window.__app.save.data.tutDone = true; window.__app.openGame('lvl:medium:0'); }); await page.waitForTimeout(300);
  // клавиатура: стрелки и цифры
  const target = await page.evaluate(() => { const b = window.__app.board; b.select(0); const i = b.vals.findIndex((v) => !v); return [i, b.sol[i]]; });
  await page.evaluate((i) => window.__app.board.select(i), target[0]);
  await page.keyboard.press(String(target[1]));
  res.keyInput = await page.evaluate((i) => window.__app.board.vals[i[0]] === i[1], target);
  await page.keyboard.press('ArrowRight');
  res.arrowMoved = await page.evaluate((i) => window.__app.board.sel === (i[0] % 9 === 8 ? i[0] - 8 : i[0] + 1), target);
  await page.screenshot({ path: O + 'en_game.png' });
} }));
console.log(JSON.stringify(res, null, 1));
done(all);
