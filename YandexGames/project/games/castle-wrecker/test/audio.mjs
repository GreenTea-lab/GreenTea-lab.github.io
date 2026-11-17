import { run, done } from './shot.mjs';
const errs = await run({ w: 800, h: 600, debug: {}, steps: async (page) => {
  await page.mouse.click(400, 300);
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    const a = window.__audio;
    a.unlock(); a.startMusic(); a.setIntensity(1);
    const names = ['click','select','launch','whoosh','hitWood','hitStone','hitIce','hitMetal','thud','breakWood','breakStone','breakIce','breakMetal','boom','goblin','ouch','king','fire','split','star','win','lose','coin','error','buy'];
    for (const n of names) { a.last = {}; a.play(n, 0.5); await new Promise(r => setTimeout(r, 30)); }
    a.setFire(true); await new Promise(r => setTimeout(r, 400)); a.setFire(false);
    await new Promise(r => setTimeout(r, 2500));
    return JSON.stringify({ state: a.ctx && a.ctx.state, playing: a.musicPlaying, step: a.step });
  });
  console.log(r);
}});
done(errs);
