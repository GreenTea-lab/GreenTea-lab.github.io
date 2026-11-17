import { run, done } from './shot.mjs';
const DAY = +(process.argv[2] || 8);
const errs = await run({
  w: 640, h: 360, debug: { bot: 1, quality: 'low' },
  steps: async (page) => {
    await page.click('[data-a="play"]');
    await page.waitForTimeout(500);
    await page.click('[data-open]');
    await page.waitForTimeout(300);
    const res = await page.evaluate(async (DAY) => {
      const g = window.__game, s = window.__save.data;
      const World = g.w.constructor, Bot = g.bot.constructor;
      g.state = 'sim';
      s.day = DAY;
      const out = [];
      for (let rep = 0; rep < 4; rep++) {
        s.barr = {};
        g.w = new World({ phase: 'night', hour: 20 });
        const w = g.w, bot = new Bot(w);
        let i = 0;
        for (; i < 30 * 200 && !w.finished; i++) {
          w.step(1 / 30, bot.input(1 / 30));
          if (w.P.ko) { w.P.ko = false; w.P.hp = w.P.max; }
          w.fx.length = 0;
        }
        out.push(`run${rep} t=${(i / 30) | 0}s finished=${w.finished} plan=${w.spawnPlan.length} P=${w.P.x.toFixed(1)},${w.P.z.toFixed(1)} bars=${w.barr.map((b) => Math.round(b.hp)).join('/')} alive=` + w.zs.filter((z) => !z.dead).map((z) => `${z.type}@${z.x.toFixed(1)},${z.z.toFixed(1)} e${z.entry} goal=${z.goal} path=${z.path ? z.path.length : 'null'}`).join(' | '));
      }
      return out;
    }, DAY);
    console.log(res.join('\n'));
  },
});
done(errs);
