import { run, done } from './shot.mjs';
const errs = await run({ w: 1920, h: 1080, debug: { manual: 1 }, steps: async (p) => {
  const t0 = Date.now();
  for (let k = 0; k < 5; k++) { await p.evaluate(() => window.__game.frame(1 / 30)); await p.screenshot({ path: '/tmp/claude-0/m.jpg', type: 'jpeg' }); }
  console.log('5 frames ms', Date.now() - t0);
}});
done(errs);
