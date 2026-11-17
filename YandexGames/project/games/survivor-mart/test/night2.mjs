// Ночи на стоянке с ботом: сколько длится, убийства, нокауты, сон, кражи, типы зомби
import { run, done } from './shot.mjs';
const DAYS = (process.argv[2] || '1,3,5,7,9,10,13').split(',').map(Number);
const errs = await run({
  w: 640, h: 360, debug: { bot: 1, quality: 'low' },
  steps: async (page) => {
    await page.click('[data-a="play"]');
    await page.waitForTimeout(500);
    await page.click('[data-open]');
    await page.waitForTimeout(300);
    const res = await page.evaluate(async (DAYS) => {
      const g = window.__game, s = window.__save.data;
      const World = g.w.constructor, Bot = g.bot.constructor;
      g.state = 'sim';
      s.tut.skip = 1;
      const out = [];
      for (const D of DAYS) {
        s.day = D;
        s.barr = {};
        s.stock.wood = 12;
        s.stock.bandage = 3;
        g.w = new World({ phase: 'night', hour: 20 });
        const w = g.w, bot = new Bot(w);
        let i = 0, ko = 0, maxAlive = 0, ms = 0, sleptAt = '';
        const types = {};
        for (; i < 30 * 400 && !w.finished; i++) {
          const k = w.sleeping ? 8 : 1;
          if (w.sleeping && !sleptAt) sleptAt = w.hour.toFixed(1);
          for (let q = 0; q < k && !w.finished; q++) {
            const t0 = performance.now();
            w.step(1 / 30, bot.input(1 / 30));
            ms = Math.max(ms, performance.now() - t0);
          }
          if (w.P.ko) { ko++; w.revive(); }
          for (const z of w.zs) types[z.type] = 1;
          maxAlive = Math.max(maxAlive, w.zs.filter((z) => !z.dead).length);
          w.fx.length = 0;
        }
        const S = w.sum;
        out.push(`day${D}: real=${(i / 30) | 0}s fin=${w.finished} hour=${w.hour.toFixed(1)} kills=${S.kills} ko=${ko} maxAlive=${maxAlive} slept@${sleptAt || '-'} stolen=${S.stolen} nloot=${S.nightLoot} bars=${w.barr.map((b) => Math.round(b.hp)).join('/')} types=${Object.keys(types).join(',')} maxStepMs=${ms.toFixed(1)}`);
      }
      return out;
    }, DAYS);
    console.log(res.join('\n'));
  },
});
done(errs);
