import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, debug: { speed: 1 }, steps: async (page) => {
  const G = (f) => page.evaluate(f);
  await page.waitForTimeout(2500);
  console.log(await G(() => { const g = window.__game; return JSON.stringify({ rates: !!g.rates, acc: g.econAcc, lastEcon: g.lastEcon, now: Date.now(), chunks: g.world.chunks ? g.world.chunks.size : 0 }); }));
}});
console.log(errs.join('\n').slice(0, 1500));
done([]);
