// 4 кадра игры в разные моменты: node test/shots4.mjs lvl t1 t2 t3 t4
import { run, done } from './shot.mjs';
const lvl = +(process.argv[2] ?? 0);
const ts = process.argv.slice(3).map(Number);
const errs = await run({
  w: 1280, h: 720, debug: { bot: 1, fast: 1, quality: 'high', seed: 3 },
  steps: async (page) => {
    await page.evaluate((i) => { window.__game.ui.closeModal(); window.__game.startLevel(i); }, lvl);
    let prev = 0;
    for (let k = 0; k < ts.length; k++) {
      await page.evaluate((T) => { const g = window.__game; for (let q = 0; q < T * 30; q++) { const inp = g.bot.input(1/30); g.w.step(1/30, inp); g.handleFx(); } }, ts[k] - prev);
      prev = ts[k];
      await page.waitForTimeout(700);
      await page.screenshot({ path: `shots/s${k + 1}.png` });
    }
    console.log(JSON.stringify(await page.evaluate(() => { const w = window.__game.w; return { banked: w.banked, hits: w.hits, caught: w.caught }; })));
  },
});
done(errs);
