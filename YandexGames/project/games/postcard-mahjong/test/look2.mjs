// Новые экраны: меню, задача дня, награды, плитки, альбом, золотой маршрут, классика, «собрать все»
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/shots/';
const all = [];
const sizes = process.env.ONLY === 'm' ? [['m', 390, 780, true, 2]] : process.env.ONLY === 'd' ? [['d', 1280, 720, false, 1]] : [['d', 1280, 720, false, 1], ['m', 390, 780, true, 2], ['s', 360, 640, true, 2]];
for (const [name, w, h, mobile, dpr] of sizes) {
  const errs = await run({ w, h, mobile, dpr, steps: async (page) => {
    const ev = (f, a) => page.evaluate(f, a);
    const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `${out}${name}_${n}.png` }); };
    await ev(() => { const d = window.__save.data; d.tut = { first: 1, coin: 1, lock: 1, hidden: 1 }; for (let i = 0; i < 104; i++) d.levels[i] = { stars: 3, time: 30 }; d.stats.pairs = 700; window.__game.toMenu(); });
    await shot('menu2');
    await ev(() => window.__game.ui.act('daily'));
    await shot('daily');
    await ev(() => window.__game.ui.act('ach'));
    await shot('ach');
    await ev(() => window.__game.ui.act('styles'));
    await shot('styles');
    await ev(() => window.__game.ui.act('album'));
    await ev(() => document.querySelector('.modal .mbody').scrollTop = 9999);
    await shot('album');
    await ev(() => { window.__game.ui.closeModal(); window.__game.ui.city = 10; window.__game.ui.journey(); });
    await shot('gold_city');
    await ev(() => { window.__game.app?.x; window.__game.setFaces('classic'); window.__game.startLevel(104); });
    await page.waitForTimeout(1800);
    await ev(() => { const g = window.__game; const m = g.game.movesList()[0]; g.tap(...Object.values(g.view.tileCenter(m[0]))); });
    await shot('classic');
    // довести до «собрать все»
    await ev(() => { const A = window.__game; for (let k = 0; k < 200 && !A.canAuto() && !A.finished; k++) { const g = A.game; if (!g.canMove()) { A.applyBoost('shuffle'); continue; } const h = g.hint(); A.pair(h.pair[0], h.pair[1]); } });
    await page.waitForTimeout(900);
    await shot('auto');
    await ev(() => window.__game.setFaces('fruit'));
    await ev(() => window.__game.ui.pause());
    await shot('pause');
  } });
  all.push(...errs);
}
done(all);
