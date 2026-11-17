import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, pre: `localStorage.setItem('castaway_solitaire_v1', JSON.stringify({ levels: {1:{stars:3,best:1},2:{stars:3,best:1}}, level: 3 }));`, steps: async (p) => {
  for (let k = 0; k < 4; k++) {
    const info = await p.evaluate((k) => { const i = window.__game.island; i.camT = null; const c = i.crabs[k]; const u = c.userData; Object.assign(i.cam, { tx: c.position.x, ty: c.position.y, tz: c.position.z, dist: 9, pitch: 0.55, yaw: Math.atan2(c.position.x, c.position.z) }); return [c.position.x.toFixed(2), c.position.y.toFixed(2), c.position.z.toFixed(2), u.g0, u.to.toFixed(2)].join(' '); }, k);
    console.log('crab', k, info);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `/tmp/claude-0/cc${k}.png`, clip: { x: 340, y: 160, width: 600, height: 400 } });
  }
}});
done(errs);
