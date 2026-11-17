import { run, done } from './shot.mjs';
const errs = await run({
  w: 640, h: 360, debug: { bot: 1, quality: 'low' },
  steps: async (page) => {
    await page.click('[data-a="play"]');
    await page.waitForTimeout(500);
    await page.click('[data-open]');
    await page.waitForTimeout(300);
    const res = await page.evaluate(async () => {
      const g = window.__game, s = window.__save.data;
      const World = g.w.constructor, Bot = g.bot.constructor;
      g.state = 'sim';
      const out = [];
      g.w = new World({ phase: 'day', hour: 8 });
      const w = g.w, bot = new Bot(w);
      for (let i = 0; i < 30 * 120; i++) {
        w.step(1 / 30, bot.input(1 / 30));
        w.fx.length = 0;
        if (i % 150 === 0) out.push(`${(i / 30) | 0}s P=${w.P.x.toFixed(1)},${w.P.z.toFixed(1)} atReg=${w.P.atReg} co=${!!w.co} q=${w.queue.length} rep=${s.rep.toFixed(1)} custs=${w.custs.map((c) => c.state + '@' + c.x.toFixed(1) + ',' + c.z.toFixed(1) + (c.path ? 'p' + c.path.length : '') + ' w' + c.wants.join('+') + ' g' + c.got.length + ' pt' + Math.round(c.patience)).join(' | ')}`);
      }
      return out;
    });
    console.log(res.join('\n'));
  },
});
done(errs);
