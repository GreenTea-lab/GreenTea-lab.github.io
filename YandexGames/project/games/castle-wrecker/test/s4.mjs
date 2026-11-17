import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, debug: { unlockAll: true, maxSteps: 12 }, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await G(() => { const g = window.__game; g.s.hints = { aim: 1 }; g.startLevel(1); g.introT = 99; });
  await page.waitForTimeout(1000);
  const pt = await G(() => { const g = window.__game; const b = g.box; const p = { x: b.cx - b.w / 2 - 2.5, y: 0, z: b.z0 - 1 }; const v = g.scene.camera.position.clone().set(p.x, p.y, p.z).project(g.scene.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
  console.log(JSON.stringify(pt));
  await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.move(pt.x + 1, pt.y); await page.mouse.up();
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(1500);
    console.log(await G(() => { const g = window.__game; return JSON.stringify({ st: g.state, sT: g.settleT && g.settleT.toFixed(1), cT: g.calmT && g.calmT.toFixed(2), act: g.P.activity().toFixed(2), paused: g.paused, ft: g.flightT && g.flightT.toFixed(2) }); }));
  }
  await page.screenshot({ path: 'shots/s4.png' });
}});
done(errs);
