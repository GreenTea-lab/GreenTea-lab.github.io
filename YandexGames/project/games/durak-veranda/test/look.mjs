// Снимки хода игрока: защита с выбором цели, перевод, кнопки. node test/look.mjs w h mob tag
import { run, done } from './shot.mjs';
const [w, h, mob, tag] = [+process.argv[2], +process.argv[3], process.argv[4] === '1', process.argv[5]];
const errors = await run({
  w, h, mobile: mob, locale: process.env.LOC || 'ru-RU',
  steps: async (p) => {
    await p.evaluate(() => { window.__save.data.tut = { first: 1, tipTrump: 1 }; window.__game.newGame({ players: 4, mode: 'perevodnoy', deck: 36 }); });
    await p.waitForTimeout(4000);
    // ставим позицию: игрок защищается от двух восьмёрок, у него есть 8 для перевода и старшие карты
    await p.evaluate(() => {
      const A = window.__game, g = A.game, C = window.__core;
      clearTimeout(A.timer);
      const all = [...g.deck, ...g.hands.flat()];
      const want = [C.card(0, 8), C.card(2, 8), C.card(1, 8), C.card(0, 12), C.card(2, 13), C.card(g.trump, 7), C.card(3, 9), C.card(0, 6)];
      // переложить нужные карты
      const take = (c) => { for (const h of g.hands) { const i = h.indexOf(c); if (i >= 0) h.splice(i, 1); } const j = g.deck.indexOf(c); if (j >= 0) g.deck.splice(j, 1); };
      want.forEach(take);
      while (g.hands[0].length) g.deck.splice(1, 0, g.hands[0].pop());
      g.hands[0] = want.slice(2);
      g.table = [{ a: want[0], d: null }, { a: want[1], d: null }];
      g.attacker = 3; g.defender = 0; g.defStart = 6; g.phase = 'attack'; g.passed.fill(false);
      for (const h of g.hands) while (h.length < 6 && g.deck.length > 1) h.push(g.deck.pop());
      A.view.resetCards(g);
      A.schedule();
    });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `/tmp/l_${tag}_1.png` });
    // нажать на даму червей (бьёт 8♥) — один вариант → сразу
    // нажать на 8♦: перевод — один вариант; нажать на козырь — несколько целей
    await p.evaluate(() => { const A = window.__game, C = window.__core; A.tapCard(C.card(A.game.trump, 7)); });
    await p.waitForTimeout(800);
    await p.screenshot({ path: `/tmp/l_${tag}_2.png` });
    await p.evaluate(() => { const A = window.__game; A.st.sel = null; A.st.targets = null; A.mainButton(); });
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `/tmp/l_${tag}_3.png` });
  },
});
done(errors);
