// Перевод настоящими нажатиями: игра 3 игрока, переводной, ищем момент, когда у игрока есть перевод
import { run, done } from './shot.mjs';
const mob = process.argv[2] === '1';
const errors = await run({
  w: mob ? 405 : 1280, h: mob ? 720 : 720, mobile: mob, locale: 'ru-RU',
  steps: async (p) => {
    await p.evaluate(() => { window.__save.data.tut = { first: 1, tipTrump: 1, tipChoose: 1, tipTaking: 1 }; });
    let tries = 0, found = false;
    for (let seed = 1; seed < 60 && !found; seed++) {
      await p.evaluate((s) => { const A = window.__game; A.dbg.seed = s; A.newGame({ players: 3, mode: 'perevodnoy', deck: 36, level: 1 }); }, seed);
      // реальное время: ждём, пока игрок станет защитником с переводом
      for (let i = 0; i < 80; i++) {
        await p.waitForTimeout(250);
        const st = await p.evaluate(() => { const A = window.__game, g = A.game; A.frame && A.frame(1 / 30); A.refreshHuman(); return { over: g.over, tr: (A.st.acts || []).filter((a) => a.t === 'transfer').map((a) => a.c), def: g.defender, table: g.table.length, mode: g.mode, busy: A.busy() }; });
        if (st.over) break;
        if (st.tr.length && !st.busy) {
          console.log('state', JSON.stringify(st));
          // координаты карты
          const xy = await p.evaluate((c) => { const v = window.__game.view, s = v.sp.get(c); const x = s.x - v.L.cw / 2 + 12, y = s.y; return { x, y, hit: v.handAt(window.__game, x, y), c, opts: window.__game.optionsFor(c) }; }, st.tr[0]);
          console.log('xy', JSON.stringify(xy));
          if (process.env.BTN) {
            await p.evaluate(() => { window.__game.thinkP = 2; window.__game.thinkFrom = 0; window.__game.frame(1 / 30); });
            await p.screenshot({ path: '/tmp/trb_' + (mob ? 'm' : 'd') + '.png' });
            const vis = await p.evaluate(() => getComputedStyle(document.querySelector('.actbtn.transfer')).display);
            console.log('btn', vis);
            await p.click('.actbtn.transfer');
          } else if (process.env.DRAG) {
            const tg = await p.evaluate(() => { const v = window.__game.view, s = v.L.slotsFor(1)[0]; return { x: s.x, y: s.y }; });
            await p.mouse.move(xy.x, xy.y); await p.mouse.down();
            for (let k = 1; k <= 10; k++) { await p.mouse.move(xy.x + (tg.x - xy.x) * k / 10, xy.y + (tg.y - xy.y) * k / 10); await p.evaluate(() => window.__game.frame(1 / 30)); }
            console.log('drop', JSON.stringify(await p.evaluate(() => window.__game.st.dropTarget)), JSON.stringify(tg), JSON.stringify(await p.evaluate(() => { const v = window.__game.view; return { z: v.L.zone, slots: v.L.slotsFor(2), d: window.__game.st.drag }; })));
            await p.mouse.up();
          } else await p.mouse.click(xy.x, xy.y);
          await p.waitForTimeout(600);
          const after = await p.evaluate(() => { const A = window.__game, g = A.game; return { def: g.defender, table: g.table.map((x) => x.a), sel: A.st.sel, targets: A.st.targets }; });
          console.log('after tap', JSON.stringify(after));
          await p.screenshot({ path: '/tmp/tr_' + (mob ? 'm' : 'd') + '.png' });
          found = true;
          break;
        }
        // если игрок должен ходить сам — сходить первой картой
        await p.evaluate(() => { const A = window.__game; if (A.actor === 0 && !A.busy()) { const a = A.st.acts.find((x) => x.t === 'attack') || A.st.acts.find((x) => x.t === 'defend') || A.st.acts.find((x) => x.t === 'take') || A.st.acts.find((x) => x.t === 'pass'); if (a) A.humanAct(a); } });
      }
    }
    console.log('found', found);
  },
});
done(errors);
