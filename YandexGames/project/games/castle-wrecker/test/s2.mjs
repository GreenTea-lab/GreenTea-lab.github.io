import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, debug: { unlockAll: true }, steps: async (page) => {
  await page.evaluate(() => { const g = window.__game; g.s.hints = { aim: 1 }; g.startLevel(0); g.introT = 99; });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = window.__game; const e = [...g.P.objs.values()].find(o => o.kind === 'enemy'); g.P.damageOn = true; g.P._kill(e, 'hit'); });
  await page.waitForTimeout(3000);
  console.log(await page.evaluate(() => { const g = window.__game; return JSON.stringify({ state: g.state, modal: !!document.querySelector('.modal-bg'), res: g.result, lw: g.lastWin }); }));
}});
done(errs);
