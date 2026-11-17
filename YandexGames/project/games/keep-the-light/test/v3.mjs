import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, debug: { shots: 1, god: 1 }, steps: async (page) => {
  await page.evaluate(() => { window.__game.startNight(4); const g = window.__game; g.monster.update = function(dt){ this._animate(dt, 0.3); };
    const h = g.world.hides[3]; g.player.place(h.front.x, h.front.z, 0); g.target={kind:'hide',h,label:'x'}; g.act(); g.monster.pos.set(h.front.x + Math.sin(h.ry)*2.2, 0, h.front.z+Math.cos(h.ry)*2.2); g.monster.yaw = h.ry+Math.PI; });
  await page.waitForTimeout(3000); await page.screenshot({ path: 'shots/hide.png' });
  console.log(await page.evaluate(() => { const g = window.__game; g.target = {kind:'leave'}; g.act(); return [g.player.hidden, document.getElementById('slats').className]; }));
}});
done(errs);
