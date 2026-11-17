import { run, done } from './shot.mjs';
const [w, h, mobile] = process.argv[2] === 'm' ? [400, 800, true] : [1280, 720, false];
const tag = process.argv[2] === 'm' ? 'm' : 'd';
const lvl = +(process.argv[3] || 1) - 1;
const errs = await run({ w, h, mobile, debug: { unlockAll: true }, steps: async (page) => {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/${tag}_menu.png` });
  await page.evaluate(() => window.__game.toMap());
  await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/${tag}_map.png` });
  await page.evaluate((l) => { const g = window.__game; g.ui.closeModal(); g.s.hints = { aim: 1, arc: 1, bomb: 1, tnt: 1, helmet: 1, iron: 1, cliff: 1, split: 1, metal: 1, fire: 1 }; g.startLevel(l); g.introT = 99; }, lvl);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.ui.closeModal());
  await page.waitForTimeout(500);
  await page.screenshot({ path: `shots/${tag}_aim.png` });
  // прицел на первого врага
  const pt = await page.evaluate(() => {
    const g = window.__game; const e = [...g.P.objs.values()].find(o => o.kind === 'enemy');
    const p = e.body.translation(); const THREE_V = g.scene.camera.position.clone().set(p.x, p.y, p.z).project(g.scene.camera);
    return { x: (THREE_V.x + 1) / 2 * innerWidth, y: (1 - THREE_V.y) / 2 * innerHeight };
  });
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  await page.mouse.move(pt.x + 2, pt.y + 1);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `shots/${tag}_aiming.png` });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `shots/${tag}_flight.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/${tag}_impact.png` });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `shots/${tag}_after.png` });
  console.log(await page.evaluate(() => { const g = window.__game; return JSON.stringify({ state: g.state, enemies: g.P && g.P.enemiesLeft(), score: g.P && g.P.score, calls: g.scene.renderer.info.render.calls, tris: g.scene.renderer.info.render.triangles }); }));
}});
done(errs);
