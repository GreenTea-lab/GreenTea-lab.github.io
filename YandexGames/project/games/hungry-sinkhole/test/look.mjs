import { run, done } from './shot.mjs';
const [, , name = 'look', w = 1280, h = 720, mob = '0', wait = '4000'] = process.argv;
const errs = await run({ w: +w, h: +h, mobile: mob === '1', debug: { seed: 3 }, steps: async (page) => {
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `/tmp/claude-0/${name}_menu.png` });
  await page.evaluate(() => window.__game.play());
  await page.waitForTimeout(+wait);
  await page.evaluate(() => { const g = window.__game; g.me.dirX = 1; g.me.dirZ = 0; });
  await page.screenshot({ path: `/tmp/claude-0/${name}_play.png` });
  const info = await page.evaluate(() => { const g = window.__game; return { r: g.me.r, pts: g.me.pts, active: g.sim.active.size, items: g.sim.items.length, fps: 0 }; });
  console.log(JSON.stringify(info));
} });
done(errs);
