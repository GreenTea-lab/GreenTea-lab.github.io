import { run, done } from './shot.mjs';
const mob = process.argv[2] === 'm';
const errs = await run({ w: mob ? 412 : 1280, h: mob ? 860 : 720, mobile: mob, dpr: 1, debug: { shots: 1, god: 1 }, steps: async (page) => {
  const S = async (name, wt = 900) => { await page.waitForTimeout(wt); await page.screenshot({ path: `shots/${name}${mob ? 'M' : ''}.png` }); };
  await page.evaluate(() => { window.__game.startNight(4); const g = window.__game;
    g.player.place(23.5, 4.2, 0); g.monster.pos.set(23.5, 0, 2.0); g.monster.yaw = 0; g.monster.state='wander';
    g.monster.update = function(dt){ this._animate(dt, 0.3); }; document.getElementById('lockhint').remove(); });
  await S('monster');
  await page.evaluate(() => { const g = window.__game; const h = g.world.hides[3]; g.player.place(h.front.x, h.front.z, 0); g.target={kind:'hide',h,label:'x'}; g.act(); g.monster.pos.set(h.front.x + Math.sin(h.ry)*2.2, 0, h.front.z+Math.cos(h.ry)*2.2); g.monster.yaw = h.ry+Math.PI; });
  await S('hide');
  await page.evaluate(() => { const g = window.__game; g.target = {kind:'leave'}; g.act(); g.player.place(14.5, 9, Math.PI/2); window.__KL_DEBUG.god = 0; g.monster.pos.set(13,0,9); g.caught(g.monster); });
  await S('scare', 300);
  await page.waitForTimeout(9000); await S('caught');
  await page.evaluate(() => { const g = window.__game; g.startNight(2); g.nightT = 412; g.keys = 3; g._finish(); });
  await S('win', 2500);
}});
done(errs);
