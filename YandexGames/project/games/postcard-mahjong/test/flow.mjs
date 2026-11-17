// Поток экранов с моком SDK: MOCK_SDK=1 node test/flow.mjs
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/shots/';
const errs = await run({
  w: 1280, h: 720,
  pre: () => { window.__MOCK_CATALOG = [{ id: 'coins_1000', title: '1 000 монет', price: 19 }, { id: 'coins_3500', title: '3 500 монет', price: 59 }, { id: 'coins_10000', title: '10 000 монет', price: 149 }, { id: 'disable_ads', title: 'Без рекламы', price: 99 }]; },
  steps: async (page) => {
    const ev = (f, a) => page.evaluate(f, a);
    const L = (s) => console.log(s);
    const solveAll = () => ev(() => {
      const A = window.__game;
      // бот играет касаниями: тап по первой плитке пары, тап по второй
      for (let k = 0; k < 300 && !A.finished; k++) {
        const g = A.game;
        if (!g.canMove()) { A.applyBoost('shuffle'); continue; }
        const h = g.hint();
        const c1 = A.view.tileCenter(h.pair[0]), c2 = A.view.tileCenter(h.pair[1]);
        A.tap(c1.x, c1.y);
        A.tap(c2.x, c2.y);
      }
      return { left: A.game.left, finished: A.finished };
    });
    L('calls at start: ' + (await ev(() => window.__calls.filter((c) => /ready|getPurchases|getCatalog/.test(c)).join(', '))));
    await page.mouse.click(640, 400);
    await ev(() => window.__game.startLevel(0));
    await page.waitForTimeout(300);
    await ev(() => document.querySelector('.modal [data-go]').click());
    await page.waitForTimeout(2500);
    // реальный клик мышью по первой паре из обучения
    const p = await ev(() => { const A = window.__game; const m = A.ui.tutPair; return [A.view.tileCenter(m[0]), A.view.tileCenter(m[1])]; });
    await page.mouse.click(p[0].x, p[0].y);
    await page.waitForTimeout(150);
    L('tut after first tap: ' + (await ev(() => window.__game.ui.tutStep)) + ' sel=' + (await ev(() => window.__game.st.sel)));
    await page.mouse.click(p[1].x, p[1].y);
    await page.waitForTimeout(400);
    L('after pair: left=' + (await ev(() => window.__game.game.left)) + ' tut=' + (await ev(() => window.__game.ui.tutStep)));
    // клик по зажатой плитке
    const blocked = await ev(() => { const A = window.__game, g = A.game; const t = g.tiles.find((t) => g.alive[t.id] && !g.free(t.id)); return t ? A.view.tileCenter(t.id) : null; });
    if (blocked) { await page.mouse.click(blocked.x, blocked.y); await page.waitForTimeout(200); L('blocked tap sel=' + (await ev(() => window.__game.st.sel))); }
    await page.screenshot({ path: out + 'f_l1.png' });
    L('solve: ' + JSON.stringify(await solveAll()));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out + 'f_win.png' });
    L('levels: ' + JSON.stringify(await ev(() => window.__save.data.levels)) + ' coins=' + (await ev(() => window.__save.data.coins)));
    // уровень 10 → открытка
    await ev(() => { const d = window.__save.data; for (let i = 0; i < 9; i++) d.levels[i] = { stars: 3, time: 30 }; window.__game.ui.closeModal(); window.__game.startLevel(9); });
    await page.waitForTimeout(500);
    L('solve 10: ' + JSON.stringify(await solveAll()));
    await page.waitForTimeout(3500);
    await page.screenshot({ path: out + 'f_postcard.png' });
    L('postcard modal: ' + (await ev(() => !!document.querySelector('.modal.pcm'))));
    await ev(() => document.querySelector('.modal [data-x]').click());
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_win10.png' });
    // ключи/замки: уровень 24
    await ev(() => { window.__game.ui.closeModal(); window.__save.data.tut.lock = 0; window.__game.startLevel(23); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: out + 'f_lockintro.png' });
    await ev(() => document.querySelector('.modal [data-go]').click());
    await page.waitForTimeout(2500);
    await page.screenshot({ path: out + 'f_lock.png' });
    const lockedTap = await ev(() => { const A = window.__game, g = A.game; const t = g.tiles.find((t) => g.alive[t.id] && g.locked(t.id) && g.free(t.id)); return t ? A.view.tileCenter(t.id) : null; });
    L('locked free tile exists: ' + !!lockedTap);
    L('solve 24: ' + JSON.stringify(await solveAll()));
    await page.waitForTimeout(1500);
    // помощники
    await ev(() => { window.__game.ui.closeModal(); window.__game.startLevel(5); });
    await page.waitForTimeout(2000);
    await ev(() => window.__game.useBoost('hint'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_hint.png' });
    L('hint: ' + JSON.stringify(await ev(() => window.__game.st.hint)));
    await ev(() => { const A = window.__game; const h = A.st.hint.pair; A.pair(h[0], h[1]); });
    await ev(() => window.__game.useBoost('undo'));
    L('undo left=' + (await ev(() => window.__game.game.left)) + ' of ' + (await ev(() => window.__game.game.tiles.length)));
    await ev(() => window.__game.useBoost('shuffle'));
    L('boosts: ' + JSON.stringify(await ev(() => window.__save.data.boosts)));
    // нет монет → окно с роликом
    await ev(() => { window.__save.data.boosts.hint = 0; window.__save.data.coins = 0; window.__game.useBoost('hint'); });
    await page.waitForTimeout(300);
    await ev(() => document.querySelector('.modal [data-ad]').click());
    await page.waitForTimeout(800);
    L('hint via ad: ' + !!(await ev(() => window.__game.st.hint)) + ' rewarded=' + (await ev(() => window.__calls.filter((c) => c === 'rewarded').length)));
    // тупик: оставляем на поле две плитки друг на друге
    await ev(() => {
      const A = window.__game, g = A.game;
      const stack = g.tiles.find((t) => t.above.length);
      const top = g.tiles[stack.above[0]];
      g.alive = g.alive.map(() => false);
      g.alive[stack.id] = g.alive[top.id] = true;
      stack.f = top.f = 'apple'; stack.lock = top.lock = false;
      g.alive.forEach(() => 0);
      // ещё пара разных, чтобы ходов не было
      A.checkStuck();
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: out + 'f_stuck.png' });
    L('stuck modal: ' + (await ev(() => !!document.querySelector('.modal.stuckm'))));
    await ev(() => { window.__save.data.boosts.shuffle = 1; document.querySelector('.modal [data-sh]').click(); });
    await page.waitForTimeout(800);
    L('after shuffle canMove=' + (await ev(() => window.__game.game.canMove())) + ' left=' + (await ev(() => window.__game.game.left)));
    await page.screenshot({ path: out + 'f_flat.png' });
    // бесконечный режим
    await ev(() => { window.__game.toMenu(); window.__game.startEndless(false); });
    await page.waitForTimeout(800);
    L('endless 1: ' + JSON.stringify(await solveAll()));
    await page.waitForTimeout(2600);
    L('endless board=' + (await ev(() => window.__game.E.n)) + ' score=' + (await ev(() => window.__game.E.score)) + ' saved=' + (await ev(() => !!window.__save.data.endless)));
    await page.screenshot({ path: out + 'f_endless2.png' });
    // выход и продолжение
    await ev(() => window.__game.toMenu());
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_menu_resume.png' });
    await ev(() => window.__game.ui.act('endless'));
    await page.waitForTimeout(500);
    L('resumed board=' + (await ev(() => window.__game.E.n)) + ' score=' + (await ev(() => window.__game.E.score)));
    await ev(() => window.__game.endEndless());
    await page.waitForTimeout(500);
    await page.screenshot({ path: out + 'f_endres.png' });
    L('best=' + (await ev(() => window.__save.data.best)) + ' setScore=' + (await ev(() => window.__calls.filter((c) => c.startsWith('setScore')).join(';'))));
    await ev(() => { window.__game.lastAd = 0; document.querySelector('.modal [data-again]').click(); });
    await page.waitForTimeout(600);
    L('interstitial: ' + (await ev(() => window.__calls.filter((c) => c === 'fullscreen').length)));
    // магазин
    await ev(() => { window.__game.toMenu(); window.__game.ui.store(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_store.png' });
    const c0 = await ev(() => window.__save.data.coins);
    await ev(() => document.querySelector('.iap-buy[data-id="coins_1000"]').click());
    await page.waitForTimeout(800);
    await ev(() => document.querySelector('.iap-buy[data-id="disable_ads"]').click());
    await page.waitForTimeout(800);
    L('bought: coins ' + c0 + ' -> ' + (await ev(() => window.__save.data.coins)) + ' noAds=' + (await ev(() => window.__save.data.noAds)) + ' consume=' + (await ev(() => window.__calls.filter((c) => c.startsWith('consume')).length)));
    await ev(() => { window.__game.lastAd = 0; window.__n = window.__calls.length; window.__game.adBreak(() => {}); });
    await page.waitForTimeout(300);
    L('interstitial after noAds (0): ' + (await ev(() => window.__calls.slice(window.__n).filter((c) => c === 'fullscreen').length)));
    for (const [n, f] of [['album', () => window.__game.ui.album()], ['styles', () => { window.__save.data.coins += 5000; window.__game.ui.styles(); }], ['daily', () => window.__game.ui.daily()], ['settings', () => window.__game.ui.settings()], ['lb', () => window.__game.ui.leaderboard()]]) {
      await ev(f);
      await page.waitForTimeout(400);
      await page.screenshot({ path: out + 'f_' + n + '.png' });
    }
    await ev(() => window.__game.ui.howTo());
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_how.png' });
    L('gameplay calls: ' + (await ev(() => window.__calls.filter((c) => c.startsWith('gp.')).slice(-6).join(','))));
    L('setData count: ' + (await ev(() => window.__calls.filter((c) => c === 'setData').length)));
  },
});
done(errs);
