import { run, done } from './shot.mjs';
const [w, h, m, out] = process.argv.slice(2);
const L = {}; for (let i = 1; i <= 6; i++) L[i] = { stars: 3, best: 1 };
const errs = await run({ w: +w, h: +h, mobile: m === 'm', dpr: m === 'm' ? 2 : 1, pre: `localStorage.setItem('castaway_solitaire_v1', ${JSON.stringify(JSON.stringify({ levels: L, level: 7, daily: { day: new Date().toISOString().slice(0, 10), streak: 1 } }))});`, steps: async (p) => {
  await p.evaluate(() => window.__game.toIsland(false));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out });
}});
done(errs);
