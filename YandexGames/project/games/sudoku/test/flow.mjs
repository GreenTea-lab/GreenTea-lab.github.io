// Интеграция с моком SDK: запуск, обучение, ошибки, подсказки, сохранение, реклама, покупки, сад, судоку дня, английский.
// MOCK_SDK=1 включается здесь же. node test/flow.mjs
import { run, done } from './shot.mjs';
const O = 'test/out/';
const CAT = [
  { id: 'coins_1000', title: '1 000 монет', description: 'Горсть монет на подсказки', price: 19 },
  { id: 'coins_3500', title: '3 500 монет', description: 'Мешочек монет', price: 59 },
  { id: 'coins_10000', title: '10 000 монет', description: 'Сундук монет', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает рекламу между уровнями навсегда', price: 99 },
  { id: 'premium_pass', title: 'Сад мастера', description: 'Без рекламы, все стили поля, подарок ×2 и подсказка каждый день', price: 199 },
];
const pre = `window.__MOCK_CATALOG = ${JSON.stringify(CAT)};`;
const solveAll = (page) =>
  page.evaluate(() => {
    const b = window.__app.board;
    for (let i = 0; i < b.G.size; i++) if (b.vals[i] !== b.sol[i]) (b.select(i), b.input(b.sol[i]));
  });
const ready = (page) => page.waitForFunction(() => window.__app && !document.getElementById('boot'));
const res = {};
const fail = [];
const expect = (name, ok) => {
  if (!ok) fail.push('FAIL ' + name + ' = ' + JSON.stringify(res[name]));
};
let all = [];
process.env.MOCK_SDK = '1';
all = all.concat(
  await run({
    w: 390, h: 800, mobile: true, dpr: 2, pre,
    steps: async (page) => {
      const calls = () => page.evaluate(() => window.__calls.slice());
      const count = async (re) => (await calls()).filter((c) => re.test(c)).length;
      const D = (f, a) => page.evaluate(f, a);
      res.boot = (await calls()).filter((c) => /^(init|ready|getPurchases|getCatalog|getData)/.test(c));
      expect('boot', ['init', 'getData', 'getPurchases', 'getCatalog', 'ready'].every((k) => res.boot.includes(k)));
      res.gpBeforePlay = await count(/^gp\.start/);
      expect('gpBeforePlay', res.gpBeforePlay === 0);

      // первый уровень с обучением
      await page.click('.m-play');
      await page.waitForTimeout(400);
      res.tutShown = await D(() => !!document.querySelector('.tipbox .tp-skip'));
      expect('tutShown', res.tutShown);
      res.gpStart = (await calls()).includes('gp.start');
      expect('gpStart', res.gpStart);
      // во время подсказки обучения разметка геймплея остановлена? нет: обучение — часть игры
      await page.click('.tp-ok');
      await page.waitForTimeout(200);
      const target = await D(() => window.__app.board.guide?.target);
      await page.click(`.cell[data-i="${target}"]`);
      await page.waitForTimeout(200);
      const sol = await D(() => window.__app.board.sol[window.__app.board.sel]);
      res.tutTarget = target;
      expect('tutTarget', target !== null && target >= 0);
      await page.click(`.num[data-d="${sol}"]`);
      await page.waitForTimeout(300);
      res.tutPlaced = await D(() => window.__app.board.vals[window.__app.board.sel] === window.__app.board.sol[window.__app.board.sel]);
      expect('tutPlaced', res.tutPlaced);
      await page.screenshot({ path: O + 'flow_tut.png' });
      await page.click('.tp-skip');
      res.tutDone = await D(() => window.__app.save.data.tutDone);
      expect('tutDone', res.tutDone);

      // ошибка
      const e1 = await D(() => window.__app.board.vals.findIndex((v) => !v));
      const s1 = await D((i) => window.__app.board.sol[i], e1);
      await page.click(`.cell[data-i="${e1}"]`);
      await page.click(`.num[data-d="${(s1 % 9) + 1}"]`);
      res.mistakes = await D(() => window.__app.board.mistakes);
      res.badShown = await D((i) => document.querySelector(`.cell[data-i="${i}"]`).classList.contains('bad'), e1);
      expect('mistakes', res.mistakes === 1);
      expect('badShown', res.badShown);
      // подсказка находит ошибку
      await page.click('.t-hint');
      await page.waitForTimeout(200);
      res.hintError = await D(() => document.querySelector('.hintpanel')?.textContent || '');
      res.freeHintsAfter1 = await D(() => window.__app.save.data.freeHints);
      expect('freeHintsAfter1', res.freeHintsAfter1 === 2);
      await page.click('.hp-ok');
      res.hintFixed = await D((i) => window.__app.board.vals[i] === window.__app.board.sol[i], e1);
      expect('hintFixed', res.hintFixed);
      // отмена
      const e2 = await D(() => window.__app.board.vals.findIndex((v) => !v));
      const s2 = await D((i) => window.__app.board.sol[i], e2);
      await page.click(`.cell[data-i="${e2}"]`);
      await page.click(`.num[data-d="${s2}"]`);
      await page.click('.t-undo');
      res.undone = await D((i) => window.__app.board.vals[i], e2);
      expect('undone', res.undone === 0);
      // заметки
      await page.click('.t-notes');
      await page.click(`.cell[data-i="${e2}"]`);
      await page.click('.num[data-d="2"]');
      await page.click('.num[data-d="5"]');
      res.notes = await D((i) => window.__app.board.notes[i], e2);
      expect('notes', res.notes === ((1 << 2) | (1 << 5)) || res.notes === ((1 << 1) | (1 << 4)));
      await page.click('.t-notes');
      // платная подсказка: бесплатные кончились
      await D(() => (window.__app.save.data.freeHints = 0));
      const c0 = await D(() => window.__app.save.data.coins);
      await page.click('.t-hint');
      await page.waitForTimeout(200);
      res.hintSpent = c0 - (await D(() => window.__app.save.data.coins));
      expect('hintSpent', res.hintSpent === 50);
      res.hintText = await D(() => document.querySelector('.hintpanel')?.innerText.replace(/\s+/g, ' ').slice(0, 140));
      await page.screenshot({ path: O + 'flow_hint.png' });
      await page.click('.hp-ok');
      // нет монет — окно с рекламой за монеты
      await D(() => ((window.__app.save.data.coins = 10), window.__app.updateCoins && window.__app.updateCoins()));
      await page.click('.t-hint');
      await page.waitForTimeout(200);
      res.notEnough = await D(() => !!document.querySelector('.ne-ad'));
      expect('notEnough', res.notEnough);
      const r0 = await count(/^rewarded/);
      await page.click('.ne-ad');
      await page.waitForTimeout(900);
      res.rewardCoins = await D(() => window.__app.save.data.coins);
      expect('rewardCoins', res.rewardCoins === 60);
      res.rewardedCalls = (await count(/^rewarded/)) - r0;
      expect('rewardedCalls', res.rewardedCalls === 1);
      await D(() => window.__app.closeModal(true));

      // пауза от платформы
      await D(() => window.__mockPause());
      res.gpStoppedOnPause = (await calls()).slice(-1)[0];
      expect('gpStoppedOnPause', res.gpStoppedOnPause === 'gp.stop');
      await D(() => window.__mockResume());
      res.gpResumed = (await calls()).slice(-1)[0];
      expect('gpResumed', res.gpResumed === 'gp.start');
      // пауза кнопкой таймера
      await page.click('.g-time');
      res.pausedStop = (await calls()).slice(-1)[0];
      expect('pausedStop', res.pausedStop === 'gp.stop');
      await page.click('.g-resume');

      // выход и восстановление
      const filled = await D(() => window.__app.board.vals.filter((v) => v).length);
      await page.click('.g-back');
      await page.waitForTimeout(300);
      res.ipSaved = await D(() => !!window.__app.save.data.ip['p:0']);
      expect('ipSaved', res.ipSaved);
      res.gpStopOnBack = (await calls()).filter((c) => /^gp/.test(c)).slice(-1)[0];
      expect('gpStopOnBack', res.gpStopOnBack === 'gp.stop');
      await page.waitForTimeout(4200); // облачное сохранение не чаще раза в 4 с
      await page.reload();
      await ready(page);
      await page.click('.m-play');
      await page.waitForTimeout(300);
      res.restoredFilled = (await D(() => window.__app.board.vals.filter((v) => v).length)) === filled;
      expect('restoredFilled', res.restoredFilled);
      res.restoredMistakes = await D(() => window.__app.board.mistakes);
      expect('restoredMistakes', res.restoredMistakes === 1);
      res.noTutAgain = await D(() => !document.querySelector('.tipbox'));
      expect('noTutAgain', res.noTutAgain);

      // победа
      await solveAll(page);
      await page.waitForTimeout(2000);
      res.winShown = await D(() => !!document.querySelector('.sheet.win'));
      expect('winShown', res.winShown);
      res.gpStopOnWin = (await calls()).filter((c) => /^gp/.test(c)).slice(-1)[0];
      expect('gpStopOnWin', res.gpStopOnWin === 'gp.stop');
      res.newItem = await D(() => document.querySelector('.newitem b')?.textContent);
      expect('newItem', !!res.newItem);
      res.setScore = (await calls()).filter((c) => c.startsWith('setScore')).slice(-1)[0];
      expect('setScore', /"score",\d+/.test(res.setScore || ''));
      await page.screenshot({ path: O + 'flow_win.png' });
      const c1 = await D(() => window.__app.save.data.coins);
      await page.click('.w-x2');
      await page.waitForTimeout(900);
      res.doubled = (await D(() => window.__app.save.data.coins)) - c1;
      expect('doubled', res.doubled > 0);

      // межстраничная реклама: не раньше 3 решённых и не чаще раза в 150 с
      await D(() => (window.__app.S.lastAd = 0));
      const fs0 = await count(/^fullscreen/);
      await page.click('.w-next');
      await page.waitForTimeout(500);
      res.fsAfter1 = (await count(/^fullscreen/)) - fs0;
      expect('fsAfter1', res.fsAfter1 === 0);
      await solveAll(page);
      await page.waitForTimeout(2000);
      await page.click('.w-next');
      await page.waitForTimeout(500);
      await solveAll(page);
      await page.waitForTimeout(2000);
      await page.click('.w-next');
      await page.waitForTimeout(900);
      res.fsAfter3 = (await count(/^fullscreen/)) - fs0;
      expect('fsAfter3', res.fsAfter3 === 1);
      res.gpAfterAd = (await calls()).filter((c) => /^gp/.test(c)).slice(-1)[0];
      expect('gpAfterAd', res.gpAfterAd === 'gp.start');
      await solveAll(page);
      await page.waitForTimeout(2000);
      await page.click('.w-next');
      await page.waitForTimeout(700);
      res.fsGapRespected = (await count(/^fullscreen/)) - fs0;
      expect('fsGapRespected', res.fsGapRespected === 1);
      res.cur = await D(() => window.__app.S.cur.key);
      expect('cur', res.cur === 'p:4');

      // магазин
      await page.click('.g-coins');
      await page.waitForTimeout(300);
      await page.screenshot({ path: O + 'flow_store.png' });
      res.storeItems = await D(() => document.querySelectorAll('.s-buy').length);
      expect('storeItems', res.storeItems === 5);
      const c2 = await D(() => window.__app.save.data.coins);
      const set0 = await count(/^setData/);
      await page.click('.s-buy[data-id="coins_3500"]');
      await page.waitForTimeout(800);
      res.bought = (await D(() => window.__app.save.data.coins)) - c2;
      expect('bought', res.bought === 3500);
      res.flushBeforeConsume = await D(() => {
        const c = window.__calls;
        return c.lastIndexOf('setData') < c.findLastIndex((x) => x.startsWith('consume'));
      });
      expect('flushBeforeConsume', res.flushBeforeConsume && (await count(/^setData/)) > set0);
      await page.click('.s-buy[data-id="disable_ads"]');
      await page.waitForTimeout(800);
      res.noAds = await D(() => window.__app.save.data.noAds);
      expect('noAds', res.noAds === true);
      res.consumed = await count(/^consume/);
      expect('consumed', res.consumed === 1);
      res.ownedShown = await D(() => document.querySelectorAll('.s-buy').length);
      expect('ownedShown', res.ownedShown === 4);
      // стили поля за монеты
      await page.click('.shoptabs [data-tab="skins"]');
      await page.waitForTimeout(200);
      await page.screenshot({ path: O + 'flow_skins.png' });
      const c5 = await D(() => window.__app.save.data.coins);
      await page.click('.k-buy[data-k="ink"]');
      await page.waitForTimeout(200);
      res.skinBought = { spent: c5 - (await D(() => window.__app.save.data.coins)), skin: await D(() => document.querySelector('#game .board').dataset.skin) };
      expect('skinBought', res.skinBought.spent === 1800 && res.skinBought.skin === 'ink');
      res.goldLocked = await D(() => !!document.querySelector('.k-prem'));
      expect('goldLocked', res.goldLocked);
      // «Сад мастера»
      await page.click('.shoptabs [data-tab="coins"]');
      await page.waitForTimeout(200);
      await page.click('.s-buy[data-id="premium_pass"]');
      await page.waitForTimeout(800);
      res.premium = await D(() => ({ p: window.__app.save.data.premium, consumed: window.__calls.filter((c) => c.startsWith('consume')).length }));
      expect('premium', res.premium.p === true && res.premium.consumed === 1);
      await page.click('.shoptabs [data-tab="skins"]');
      await page.waitForTimeout(200);
      await page.click('.k-use[data-k="gold"]');
      res.gold = await D(() => document.querySelector('#game .board').dataset.skin);
      expect('gold', res.gold === 'gold');
      await D(() => window.__app.closeModal(true));
      await page.screenshot({ path: O + 'flow_gold.png' });
      await D(() => { window.__app.save.data.settings.skin = 'paper'; window.__app.applySettings(); });
      // подарок дня: ×3 за рекламу, премиум — ×2 и подсказка
      await D(() => (window.__app.renderMenu(), window.__app.show('menu')));
      res.giftDot = await D(() => !!document.querySelector('.m-gift .dot'));
      expect('giftDot', res.giftDot);
      await page.click('.m-gift');
      await page.waitForTimeout(200);
      await page.screenshot({ path: O + 'flow_gift.png' });
      const c6 = await D(() => window.__app.save.data.coins);
      const h6 = await D(() => window.__app.save.data.freeHints);
      await page.click('.g-x3');
      await page.waitForTimeout(900);
      res.gift = { coins: (await D(() => window.__app.save.data.coins)) - c6, hints: (await D(() => window.__app.save.data.freeHints)) - h6 };
      expect('gift', res.gift.coins === 150 && res.gift.hints === 1);
      await D(() => (window.__app.renderMenu(), window.__app.show('menu')));
      await page.click('.m-gift');
      await page.waitForTimeout(200);
      res.giftAgain = await D(() => !document.querySelector('.g-take'));
      expect('giftAgain', res.giftAgain);
      await D(() => window.__app.closeModal(true));
      // спасение серии судоку дня
      await D(() => {
        const A = window.__app, d = new Date();
        d.setDate(d.getDate() - 2);
        A.save.data.daily.streak = 5;
        A.save.data.daily.last = A.dateKey(d);
      });
      await D(() => window.__app.openDaily());
      await page.waitForTimeout(200);
      await page.screenshot({ path: O + 'flow_streak.png' });
      await page.click('.d-save');
      await page.waitForTimeout(900);
      res.streakSaved = await D(() => { const d = new Date(); d.setDate(d.getDate() - 1); return window.__app.save.data.daily.last === window.__app.dateKey(d); });
      expect('streakSaved', res.streakSaved);
      await D(() => window.__app.closeModal(true));

      // судоку дня
      await D(() => (window.__app.renderMenu(), window.__app.show('menu')));
      await page.click('.m-daily');
      await page.waitForTimeout(300);
      await page.screenshot({ path: O + 'flow_daily.png' });
      await page.click('.d-play');
      await page.waitForTimeout(300);
      const c3 = await D(() => window.__app.save.data.coins);
      await solveAll(page);
      await page.waitForTimeout(2000);
      res.dailyCoins = (await D(() => window.__app.save.data.coins)) - c3;
      expect('dailyCoins', res.dailyCoins >= 60);
      res.streak = await D(() => window.__app.save.data.daily.streak);
      expect('streak', res.streak === 6);

      // без рекламы — межстраничной нет
      const nFs = await count(/^fullscreen/);
      await page.click('.w-list');
      await D(() => ((window.__app.S.lastAd = 0), window.__app.openGame('f:classic:3:0')));
      await solveAll(page);
      await page.waitForTimeout(2000);
      await page.click('.w-next');
      await page.waitForTimeout(600);
      res.noFsAfterNoAds = (await count(/^fullscreen/)) === nFs;
      expect('noFsAfterNoAds', res.noFsAfterNoAds);
      res.freeNext = await D(() => window.__app.S.cur.key);
      expect('freeNext', res.freeNext === 'f:classic:3:1');
      res.solved = await D(() => window.__app.save.data.solved);
      expect('solved', res.solved === 6);

      // скрытие вкладки: звук и разметка
      await D(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      res.gpHidden = (await calls()).filter((c) => /^gp/.test(c)).slice(-1)[0];
      expect('gpHidden', res.gpHidden === 'gp.stop');
      await D(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // обычные облачные сохранения не чаще раза в 4 с
      res.minSaveGap = await D(() => { const a = window.__sets || []; let m = 1e9; for (let i = 1; i < a.length; i++) m = Math.min(m, a[i] - a[i - 1]); return a.length + ' сохр., мин. интервал ' + m + ' мс'; });
      expect('minSaveGap', +res.minSaveGap.split('интервал ')[1].split(' ')[0] >= 3990);
      // перезапуск: «Без рекламы» восстанавливается из getPurchases, прогресс из облака
      await D(() => window.__app.save.flush && window.__app.save.flush());
      await page.waitForTimeout(300);
      await page.evaluate(() => localStorage.removeItem('sudoku_zen_save_v2'));
      await page.reload();
      await ready(page);
      res.noAdsRestored = await D(() => window.__app.save.data.noAds);
      expect('noAdsRestored', res.noAdsRestored === true);
      res.cloudSolved = await D(() => window.__app.save.data.solved);
      expect('cloudSolved', res.cloudSolved === 6);
      await page.click('.m-lb');
      await page.waitForTimeout(500);
      res.lbRows = await D(() => document.querySelectorAll('.lbr').length);
      expect('lbRows', res.lbRows === 3);
      await page.screenshot({ path: O + 'flow_lb.png' });
    },
  }),
);
process.env.MOCK_LANG = 'en';
all = all.concat(
  await run({
    w: 1280, h: 720, locale: 'en-US', pre,
    steps: async (page) => {
      await page.screenshot({ path: O + 'en_menu.png' });
      res.enTitle = await page.evaluate(() => document.querySelector('.mt')?.textContent);
      expect('enTitle', /Sudoku/i.test(res.enTitle || ''));
      res.enStore = await page.evaluate(() => document.querySelector('.m-store')?.textContent);
      await page.evaluate(() => {
        window.__app.save.data.tutDone = true;
        window.__app.openGame('p:120');
      });
      await page.waitForTimeout(300);
      const target = await page.evaluate(() => {
        const b = window.__app.board;
        const i = b.vals.findIndex((v) => !v);
        b.select(i);
        return [i, b.sol[i]];
      });
      await page.keyboard.press(String(target[1]));
      res.keyInput = await page.evaluate((i) => window.__app.board.vals[i[0]] === i[1], target);
      expect('keyInput', res.keyInput);
      await page.keyboard.press('ArrowRight');
      res.arrowMoved = await page.evaluate((i) => window.__app.board.sel === (i[0] % 9 === 8 ? i[0] - 8 : i[0] + 1), target);
      expect('arrowMoved', res.arrowMoved);
      await page.keyboard.press('h');
      await page.waitForTimeout(200);
      res.enHint = await page.evaluate(() => document.querySelector('.hintpanel')?.innerText.replace(/\s+/g, ' ').slice(0, 140));
      expect('enHint', /[a-z]/.test(res.enHint || '') && !/[а-я]/i.test(res.enHint || ''));
      await page.screenshot({ path: O + 'en_game.png' });
      res.enCyr = await page.evaluate(() => (document.body.innerText.match(/[а-яё]+/gi) || []).slice(0, 5));
      expect('enCyr', !res.enCyr.length);
    },
  }),
);
console.log(JSON.stringify(res, null, 1));
done(all.concat(fail));
