// Бот кликает мышью по картам (как игрок) на разных уровнях; проверяем, что после последней карты всегда приходит окно
import { run, done } from './shot.mjs';
const [w = 1280, h = 720, mob = 'd'] = process.argv.slice(2);
const LV = (process.env.LV || '1,2,4,7,11,16,22,27,33,41,45,52,58').split(',').map(Number);
const errs = await run({ w: +w, h: +h, mobile: mob === 'm', dpr: 1, pre: (process.env.X ? 'window.__X=1;' : '') + `localStorage.setItem('castaway_solitaire_v1', JSON.stringify({ coins: 99999, seen: { coin: 1, lock: 1, sand: 1, keys2: 1 }, levels: {1:{stars:3,best:1}}, level: 70 }));`, steps: async (p) => {
  for (const n of LV) {
    await p.evaluate((n) => window.__game.playLevel(n), n);
    await p.waitForTimeout(1600);
    let res = '?';
    for (let k = 0; k < 600; k++) {
      const st = await p.evaluate(() => {
        const g = window.__game, tb = g.table, ui = g.ui;
        const okBtn = document.querySelector('[data-a="ok"]'); if (okBtn) { okBtn.click(); return { t: 'ok' }; }
        if (ui.modalOpen) { const m = document.querySelector('.ribbon, .ph h2'); return { t: 'modal', txt: m ? m.textContent : '', left: tb.g.remaining(), info: JSON.stringify(tb.g.cards.map((c, i) => [i, c, tb.sprites[i].hidden, tb.sprites[i].face, tb.g.faceUp(i), tb.g.locked(i), tb.g.covered(i)]).filter((x) => !x[1].gone)) + ' keys=' + JSON.stringify([...tb.g.keysUsed]) }; }
        if (tb.busy) return { t: 'busy' };
        const r = tb.cv.getBoundingClientRect();
        const pl = []; for (let i = 0; i < tb.g.cards.length; i++) if (tb.g.playable(i)) pl.push(i);
        if (tb.g.remaining() === 0) return { t: 'won-wait' };
        const rr = Math.random(); if (window.__X && rr < 0.12 && tb.g.canUndo()) { window.__game.undo(); return { t: 'undo' }; } if (window.__X && rr < 0.17) { window.__game.joker(); return { t: 'joker' }; }
        if (pl.length) { const i = pl[Math.floor(Math.random() * pl.length)]; const s = tb.sprites[i]; return { t: 'click', x: r.left + s.x, y: r.top + s.y }; }
        if (tb.g.stock.length) return { t: 'click', x: r.left + tb.stockPos.x, y: r.top + tb.stockPos.y };
        return { t: 'none' };
      });
      if (st.t === 'modal') { res = st.txt + ' left=' + st.left + (st.left ? ' ' + st.info : ''); if (st.txt.match(/ход|move/i)) { await p.evaluate(() => document.querySelector('[data-a="buy"]').click()); await p.waitForTimeout(400); continue; } break; }
      if (st.t === 'click') await p.mouse.click(st.x, st.y);
      if (st.t === 'won-wait' && k > 0) { res = 'WON-WAIT'; }
      await p.waitForTimeout(st.t === 'won-wait' ? 400 : 140);
      if (st.t === 'won-wait') { const c = (p.__ww = (p.__ww || 0) + 1); if (c > 25) { res = 'BUG: all gone, no window'; break; } } else p.__ww = 0;
    }
    console.log('level', n, res);
    await p.evaluate(() => window.__game.ui.closeModals());
  }
}});
done(errs);
