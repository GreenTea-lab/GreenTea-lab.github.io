// Открывает в игре все 1000 уровней пути, все пулы быстрой игры и 60 дней ежедневных: решение есть, подсказки совпадают с решением
import { run, done } from './shot.mjs';
const res = {};
const errs = await run({
  w: 390, h: 800, mobile: true,
  steps: async (page) => {
    Object.assign(res, await page.evaluate(() => {
      const A = window.__app, out = { opened: 0, bad: [] };
      A.save.data.tutDone = true;
      const check = (key) => {
        A.openGame(key);
        const b = A.board;
        out.opened++;
        const ok = b.sol.length === b.G.size && b.sol.every((v) => v >= 1 && v <= b.G.N) && b.vals.every((v, i) => !v || v === b.sol[i]);
        if (!ok) out.bad.push(key);
        A.save.data.ip = {};
      };
      for (let i = 0; i < A.PLAN.length; i++) check('p:' + i);
      for (const [kind, n] of [['classic', 6], ['diag', 4], ['mini', 2]]) for (let t = 0; t < n; t++) for (const k of [0, 37, 120]) check(`f:${kind}:${t}:${k}`);
      const d = new Date(2026, 0, 1);
      for (let k = 0; k < 60; k++, d.setDate(d.getDate() + 1)) check('d:' + A.dateKey(d));
      // бот решает каждый 10-й уровень только подсказками: каждая подсказка ставит верную цифру и объяснена логикой
      out.botSolved = 0; out.botHints = 0; out.fallback = 0; out.botFail = [];
      A.closeModal && A.closeModal(true);
      for (let i = 0; i < A.PLAN.length; i += 10) {
        A.openGame('p:' + i);
        const b = A.board;
        A.save.data.freeHints = 1e6;
        let guard = 0;
        while (!b.done && guard++ < 100) {
          b.closeHint(true);
          b._lastHint = null;
          b.hint();
          const h = b.hintShown;
          if (!h) break;
          out.botHints++;
          if (/h_open|не нашлось|no simple/i.test(h.text) || !h.area.length && !h.focus.length) out.fallback++;
          b.applyHint();
        }
        if (b.done) out.botSolved++; else out.botFail.push(i);
        A.closeModal(true);
        A.save.data.ip = {};
      }
      return out;
    }));
  },
});
console.log(JSON.stringify(res));
done(errs.concat(res.bad && res.bad.length ? ['BAD ' + res.bad.join(',')] : [], res.botFail && res.botFail.length ? ['BOT FAIL ' + res.botFail.join(',')] : []));
