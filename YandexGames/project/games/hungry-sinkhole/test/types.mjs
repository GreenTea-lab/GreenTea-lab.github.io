import { run, done } from './shot.mjs';
const errs = await run({ w: 640, h: 360, debug: { seed: 5, auto: true, quality: 'mid' }, steps: async (page) => {
  for (const lvl of [1, 20]) {
    const r = await page.evaluate((lvl) => { const g = window.__game; const s = window.__save.data; s.level = lvl; s.map = 'town'; s.mode = 'battle'; g.play(); g.ff(120 * 60 - 5); return g.sim.holes.filter((h) => h.bot).map((h) => h.type + ':' + h.r.toFixed(1) + ':' + h.kills).sort().join(' '); }, lvl);
    console.log('lvl', lvl, r);
  }
} });
done(errs);
