// Ближний осмотр: герой, враги, дома. node test/close.mjs [level] [t] [dist]
import { run, done } from './shot.mjs';
const lvl = +(process.argv[2] ?? 0), T = +(process.argv[3] ?? 20), D = +(process.argv[4] ?? 9);
const errs = await run({
  w: 1280, h: 720, debug: { bot: 1, fast: 1, quality: 'high', seed: 3 },
  steps: async (page) => {
    await page.evaluate((i) => { window.__game.ui.closeModal(); window.__game.startLevel(i); }, lvl);
    await page.evaluate((T) => { const g = window.__game; for (let k = 0; k < T * 30; k++) { const inp = g.bot.input(1/30); g.w.step(1/30, inp); g.handleFx(); } }, T);
    // камера вплотную к герою
    await page.evaluate((D) => {
      const g = window.__game;
      g.view.camera = function (cam) { const P = g.w.p; cam.position.set(P.x + 1, D, P.z + D * 0.75); cam.lookAt(P.x, 0.8, P.z); };
    }, D);
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'shots/close.png' });
    const info = await page.evaluate(() => { const w = window.__game.w; return { banked: w.banked, bag: w.p.bag, hits: w.hits, caught: w.caught, en: w.enemies.map(e=>e.type) }; });
    console.log(JSON.stringify(info));
  },
});
done(errs);
