import { run, done } from './shot.mjs';
const W = +process.argv[2] || 1280, H = +process.argv[3] || 720, mobile = process.argv[4] === 'm';
const target = +process.argv[5] || 30;
const errs = await run({
  w: W, h: H, mobile, debug: { sub: 6, autoplay: true, god: true, path: process.argv[6] ? process.argv[6].split(',') : undefined },
  steps: async (page) => {
    await page.evaluate(() => window.__game.scene.getScene('Menu').play());
    for (let i = 0; i < 200; i++) {
      await page.waitForTimeout(1000);
      const lv = await page.evaluate(() => window.__arena.player ? window.__arena.player.level : 0);
      if (lv >= target) break;
    }
    await page.evaluate(() => { const a = window.__arena; a.debug.sub = 1; });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test/s_late_${W}.png` });
    const info = await page.evaluate(() => { const a = window.__arena, p = a.player; return { t: a.world.t.toFixed(0), lvl: p.level, cls: p.cls, stats: p.stats.join(''), score: Math.round(p.score), fps: window.__game.loop.actualFps.toFixed(1) }; });
    console.log(JSON.stringify(info));
  },
});
done(errs);
