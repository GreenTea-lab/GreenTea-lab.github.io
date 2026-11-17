// Поток экранов с моком SDK: MOCK_SDK=1 node test/flow.mjs
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/shots/';
const log = [];
const errs = await run({
  w: 1280, h: 720,
  pre: () => { window.__MOCK_CATALOG = [{ id: 'coins_1000', title: '1 000 монет', price: 19 }, { id: 'coins_3500', title: '3 500 монет', price: 59 }, { id: 'coins_10000', title: '10 000 монет', price: 149 }, { id: 'disable_ads', title: 'Без рекламы', price: 99 }]; },
  steps: async (page) => {
    const ev = (f, a) => page.evaluate(f, a);
    const L = (s) => { log.push(s); console.log(s); };
    L('calls at start: ' + (await ev(() => window.__calls.filter((c) => /ready|getPurchases|getCatalog/.test(c)).join(', '))));
    // обучение: первая партия — перетаскиваем мышью i3h в дыру ряда 5
    await page.mouse.click(640, 400);
    await ev(() => window.__game.ui.act('classic'));
    await page.waitForTimeout(500);
    const pos = await ev(() => { const v = window.__game.view, L = v.L; const c = v.slotCenter(1); return { fx: c.x, fy: c.y, tx: L.gx + 4.5 * L.cell, ty: L.gy + 5.5 * L.cell }; });
    await page.mouse.move(pos.fx, pos.fy);
    await page.mouse.down();
    for (let k = 1; k <= 8; k++) await page.mouse.move(pos.fx + (pos.tx - pos.fx) * k / 8, pos.fy + (pos.ty - pos.fy) * k / 8);
    await page.waitForTimeout(100);
    await page.screenshot({ path: out + 'f_drag.png' });
    await page.mouse.up();
    await page.waitForTimeout(600);
    L('after drag: score=' + (await ev(() => window.__game.st.game.score)) + ' tut=' + (await ev(() => window.__game.ui.tutStep)));
    await page.screenshot({ path: out + 'f_tut2.png' });
    // «нажми фигуру — нажми клетку»: квадрат 2×2 в (2,6)
    const p2 = await ev(() => { const v = window.__game.view, L = v.L; const c = v.slotCenter(0); return { fx: c.x, fy: c.y, tx: L.gx + 3 * L.cell, ty: L.gy + 7 * L.cell }; });
    await page.mouse.click(p2.fx, p2.fy);
    await page.waitForTimeout(200);
    L('selected=' + (await ev(() => window.__game.st.selected)));
    await page.mouse.click(p2.tx, p2.ty);
    await page.waitForTimeout(600);
    L('after tap-place: score=' + (await ev(() => window.__game.st.game.score)) + ' lines=' + (await ev(() => window.__game.st.game.lines)) + ' tutDone=' + (await ev(() => window.__save.data.tut.classic)));
    // помощники
    await ev(() => window.__game.useBoost('hint'));
    L('hint: ' + JSON.stringify(await ev(() => window.__game.st.hint)));
    await page.waitForTimeout(200);
    await page.screenshot({ path: out + 'f_hint.png' });
    const before = await ev(() => window.__game.st.game.moves);
    await ev(() => { const g = window.__game, h = g.st.hint; const sh = g.st.game.tray[h.slot]; const i = h.cells[0]; const { SHAPE } = {}; });
    await ev(() => { const g = window.__game; const plan = g.st.hint; const x = Math.min(...plan.cells.map((i) => i % 8)), y = Math.min(...plan.cells.map((i) => (i / 8) | 0)); g.placeAt(plan.slot, x, y); });
    await ev(() => window.__game.useBoost('undo'));
    L('undo: moves ' + before + ' -> ' + (await ev(() => window.__game.st.game.moves)));
    await ev(() => window.__game.useBoost('shuffle'));
    L('shuffle boosts left: ' + JSON.stringify(await ev(() => window.__save.data.boosts)));
    await ev(() => window.__game.useBoost('hammer'));
    const hc = await ev(() => { const g = window.__game, v = g.view; const i = g.st.game.board.findIndex(Boolean); if (i < 0) return null; const r = v.cellRect(i); return { x: r.x + r.s / 2, y: r.y + r.s / 2, n: g.st.game.board.filter(Boolean).length }; });
    if (hc) { await page.mouse.click(hc.x, hc.y); await page.waitForTimeout(300); L('hammer: blocks ' + hc.n + ' -> ' + (await ev(() => window.__game.st.game.board.filter(Boolean).length))); }
    // нет монет на подсказку → окно с рекламой
    await ev(() => { window.__save.data.boosts.hint = 0; window.__save.data.coins = 0; window.__game.useBoost('hint'); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_needcoins.png' });
    await ev(() => document.querySelector('.modal [data-ad]').click());
    await page.waitForTimeout(800);
    L('hint via ad: ' + !!(await ev(() => window.__game.st.hint)) + ' calls: ' + (await ev(() => window.__calls.filter((c) => c === 'rewarded').length)));
    // доигрываем ботом до «нет места»
    await ev(() => {
      const g = window.__game;
      for (let k = 0; k < 400; k++) {
        const st = g.st.game;
        if (!st.canAny()) break;
        let done = false;
        for (let s = 0; s < 3 && !done; s++) { if (!st.tray[s]) continue; for (let y = 0; y < 8 && !done; y++) for (let x = 0; x < 8 && !done; x++) { const m = st.moves; g.placeAt(s, x, y); if (st.moves > m) done = true; } }
      }
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: out + 'f_nospace.png' });
    L('nospace modal: ' + (await ev(() => !!document.querySelector('.modal.nospace'))));
    await ev(() => document.querySelector('.modal [data-ad]').click());
    await page.waitForTimeout(900);
    L('revived: canAny=' + (await ev(() => window.__game.st.game.canAny())) + ' gp=' + (await ev(() => window.__calls.slice(-4).join(','))));
    // снова до конца
    await ev(() => {
      const g = window.__game;
      for (let k = 0; k < 400; k++) {
        const st = g.st.game;
        if (!st.canAny()) break;
        let done = false;
        for (let s = 0; s < 3 && !done; s++) { if (!st.tray[s]) continue; for (let y = 0; y < 8 && !done; y++) for (let x = 0; x < 8 && !done; x++) { const m = st.moves; g.placeAt(s, x, y); if (st.moves > m) done = true; } }
      }
    });
    await page.waitForTimeout(2500);
    L('second nospace has ad btn (should be false): ' + (await ev(() => !!document.querySelector('.modal [data-ad]'))));
    await ev(() => document.querySelector('.modal [data-end]').click());
    await page.waitForTimeout(500);
    await page.screenshot({ path: out + 'f_result.png' });
    L('result: best=' + (await ev(() => window.__save.data.best)) + ' coins=' + (await ev(() => window.__save.data.coins)) + ' setScore=' + (await ev(() => window.__calls.filter((c) => c.startsWith('setScore')).join(';'))));
    await ev(() => window.__game.lastAd = 0);
    await ev(() => document.querySelector('.modal [data-again]').click());
    await page.waitForTimeout(800);
    L('interstitial shown: ' + (await ev(() => window.__calls.filter((c) => c === 'fullscreen').length)) + ' state=' + (await ev(() => window.__game.state)));
    // приключение: уровень 1 ботом
    await ev(() => { window.__game.toMenu(); window.__game.startLevel(0); document.querySelector('.modal [data-go]').click(); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: out + 'f_lv1.png' });
    await ev(async () => {
      const g = window.__game;
      const { planSet } = window.__bot || {};
    });
    await ev(() => {
      const g = window.__game;
      for (let k = 0; k < 200 && !g.finished; k++) {
        const plan = window.__plan(g.st.game);
        if (!plan.length) break;
        g.placeAt(plan[0].slot, plan[0].x, plan[0].y);
      }
    });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: out + 'f_win.png' });
    L('level result: ' + JSON.stringify(await ev(() => window.__save.data.levels)) + ' modal=' + (await ev(() => !!document.querySelector('.modal.result'))));
    // магазин и покупки
    await ev(() => { window.__game.ui.closeModal(); window.__game.toMenu(); window.__game.ui.store(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_store.png' });
    const c0 = await ev(() => window.__save.data.coins);
    await ev(() => document.querySelector('.iap-buy[data-id="coins_1000"]').click());
    await page.waitForTimeout(800);
    await ev(() => document.querySelector('.iap-buy[data-id="disable_ads"]').click());
    await page.waitForTimeout(800);
    L('bought: coins ' + c0 + ' -> ' + (await ev(() => window.__save.data.coins)) + ' noAds=' + (await ev(() => window.__save.data.noAds)) + ' consume=' + (await ev(() => window.__calls.filter((c) => c.startsWith('consume')).length)));
    await ev(() => { window.__game.lastAd = 0; const n = window.__calls.length; window.__game.adBreak(() => {}); window.__n = n; });
    await page.waitForTimeout(400);
    L('interstitial after noAds (should be 0 new): ' + (await ev(() => window.__calls.slice(window.__n).filter((c) => c === 'fullscreen').length)));
    await page.screenshot({ path: out + 'f_store2.png' });
    // подарок, бруски, рекорды, настройки
    await ev(() => window.__game.ui.daily());
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_daily.png' });
    await ev(() => document.querySelector('.modal [data-take]').click());
    await ev(() => { window.__save.data.coins += 5000; window.__game.ui.styles(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_styles.png' });
    await ev(() => document.querySelector('.modal [data-buy="khokhloma"]').click());
    L('style: ' + (await ev(() => window.__save.data.style)));
    await ev(() => window.__game.ui.statistics());
    await page.waitForTimeout(500);
    await page.screenshot({ path: out + 'f_lb.png' });
    await ev(() => { window.__game.startClassic(false); });
    await page.waitForTimeout(300);
    await ev(() => window.__game.ui.pause());
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + 'f_pause.png' });
    L('gameplay calls: ' + (await ev(() => window.__calls.filter((c) => c.startsWith('gp.')).slice(-6).join(','))));
    L('setData count: ' + (await ev(() => window.__calls.filter((c) => c === 'setData').length)));
  },
});
done(errs);
