import { run, done } from './shot.mjs';
const [, , name = 'mid', w = 1280, h = 720, mob = '0', secs = '40', map = 'town', mode = 'battle'] = process.argv;
const errs = await run({ w: +w, h: +h, mobile: mob === '1', debug: { seed: 5, auto: true }, steps: async (page) => {
  await page.evaluate(([m, md]) => { const s = window.__save.data; s.map = m; s.mode = md; s.level = 20; window.__game.play(); }, [map, mode]);
  const t0 = Date.now();
  await page.evaluate((n) => window.__game.ff(n), +secs * 60);
  console.log('ff ms', Date.now() - t0);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `/tmp/claude-0/${name}_a.png` });
  await page.evaluate(() => window.__game.ff(40));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/claude-0/${name}_b.png` });
  const info = await page.evaluate(() => { const g = window.__game; return { t: g.time, r: g.me.r.toFixed(2), pts: g.me.pts, active: g.sim.active.size, prog: g.sim.progress(), rank: g.ranking().map((h) => h.name + ':' + h.pts + ':' + h.r.toFixed(1)).join(' ') }; });
  console.log(JSON.stringify(info));
} });
done(errs);
