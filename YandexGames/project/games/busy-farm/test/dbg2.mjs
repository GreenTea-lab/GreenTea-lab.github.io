import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, debug: { shots: 1, sub: 4 }, steps: async (p) => {
  await p.evaluate(() => window.__game.startLevel(1));
  await p.waitForTimeout(600);
  await p.click('.tut .tok'); await p.waitForTimeout(300);
  const fc = await p.evaluate(() => { const g = window.__game, F = g.lay.field; return g.view.project((F.x0 + F.x1) / 2 + 1, 0, (F.z0 + F.z1) / 2); });
  console.log(JSON.stringify(await p.evaluate(() => ({ paused: window.__game.paused, modal: window.__game.ui.modalOpen, water: window.__game.farm.well.water }))));
  const el = await p.evaluate(([x,y]) => { const e = document.elementFromPoint(x,y); return e.tagName + '.' + e.className; }, [fc.x, fc.y]);
  console.log('el at point', el, fc.x, fc.y);
  await p.mouse.click(fc.x, fc.y); await p.waitForTimeout(500);
  console.log(JSON.stringify(await p.evaluate(() => ({ water: window.__game.farm.well.water, step: window.__game.tutor.step.k }))));
}});
done(errs);
