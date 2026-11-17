// Крабы: шаг за кадр маленький (нет телепортов), стоят на песке; пузырь «Построить» над площадкой
import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, pre: `localStorage.setItem('castaway_solitaire_v1', JSON.stringify({ levels: {1:{stars:3,best:1},2:{stars:3,best:1}}, level: 3 }));`, steps: async (p) => {
  const r = await p.evaluate(() => {
    const isl = window.__game.island;
    let maxStep = 0, maxDy = 0, moved = 0, water = 0;
    let prev = isl.crabs.map((c) => c.position.clone());
    window.__game.frame(1 / 60); prev = isl.crabs.map((c) => c.position.clone());
    for (let f = 0; f < 600; f++) {
      window.__game.frame(1 / 60);
      isl.crabs.forEach((c, i) => {
        const d = Math.hypot(c.position.x - prev[i].x, c.position.z - prev[i].z);
        maxStep = Math.max(maxStep, d); moved += d;
        maxDy = Math.max(maxDy, Math.abs(c.position.y - prev[i].y));
        if (isl.ground(c.position.x, c.position.z) < 0.4) water++;
        prev[i] = c.position.clone();
      });
    }
    // пузырь против площадки
    const ui = window.__game.ui; ui.updateBubble();
    const b = document.querySelector('.bubble').getBoundingClientRect();
    const n = ui.nextProject(); const sp = isl.spots[n.p.id]; const pt = isl.project(sp.x, sp.y, sp.z);
    return { maxStep: +maxStep.toFixed(4), maxDy: +maxDy.toFixed(4), moved: +moved.toFixed(2), water, bubbleCenterX: Math.round(b.left + b.width / 2), bubbleBottom: Math.round(b.bottom), spotX: Math.round(pt.x), spotY: Math.round(pt.y), id: n.p.id };
  });
  console.log(JSON.stringify(r));
  await p.evaluate(() => { const i = window.__game.island; i.camT = null; const c = i.crabs[0].position; Object.assign(i.cam, { tx: c.x, ty: c.y, tz: c.z, dist: 7, pitch: 0.5 }); window.__game.frame(1 / 60); });
  await p.screenshot({ path: '/tmp/claude-0/crab.png' });
  await p.evaluate(() => { const i = window.__game.island; Object.assign(i.cam, { yaw: 0.25, pitch: 0.82, dist: 36, tx: 0, ty: 0.6, tz: 0.5 }); window.__game.frame(1 / 60); window.__game.ui.updateBubble(); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/claude-0/bub.png' });
}});
done(errs);
