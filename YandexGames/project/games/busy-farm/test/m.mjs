import { run, done } from '/home/claude/busy-farm/test/shot.mjs';
const errs = await run({ w: 1280, h: 720, dpr: 1.5, locale: process.env.L || 'en-US', debug: { manual: 1, shots: 1, bot: 1 }, steps: async (p) => {
  await p.evaluate(() => { window.__game.startLevel(3); for (let i=0;i<30;i++) window.__game.step(1/30); });
  const t0=Date.now();
  await p.evaluate(() => { const g = window.__game; g.showMenu(); g.ui.showMenu(); for (let i = 0; i < 20; i++) g.frame(1/30); });
  console.log('menu eval', Date.now()-t0);
  await p.screenshot({ path: '/home/claude/busy-farm/shots/mm.png', timeout: 60000 });
  console.log('shot', Date.now()-t0);
}});
done(errs);
