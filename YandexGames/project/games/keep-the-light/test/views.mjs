import { run, done } from './shot.mjs';
const mob = process.argv[2] === 'm';
const errs = await run({ w: mob ? 412 : 1280, h: mob ? 860 : 720, mobile: mob, dpr: 1, debug: { shots: 1, god: 1 }, steps: async (page) => {
  const S = async (name) => { await page.waitForTimeout(900); await page.screenshot({ path: `shots/${name}${mob ? 'M' : ''}.png` }); };
  await page.evaluate(() => { window.__game.ui.showNights(); }); await S('nights');
  await page.evaluate(() => { window.__game.ui.showIntro(3, false); }); await S('intro');
  await page.evaluate(() => { window.__game.ui.closeModal(); window.__game.ui.showShop('up'); }); await S('shop');
  await page.evaluate(() => { window.__game.startNight(4); const g = window.__game; g.monster.state='idle'; g.monster.timer=1e9;
    // поставить игрока в детской лицом к Жильцу
    g.player.place(23.5, 5.5, 0); g.monster.pos.set(23.5, 0, 2.2); g.monster.yaw = 0; g.monster.state='chase'; g.monster.timer = 1e9; });
  await page.evaluate(() => { const g = window.__game; g.monster.update = function(dt){ this._animate(dt, 1); }; });
  await S('monster');
  await page.evaluate(() => { const g = window.__game; g.player.place(14.5, 12, Math.PI); g.monster.pos.set(14.5,0,1); }); await S('living');
  await page.evaluate(() => { const g = window.__game; g.player.place(33.5, 12, Math.PI); }); await S('kitchen');
  await page.evaluate(() => { const g = window.__game; g.player.place(5, 13, Math.PI/2); }); await S('bedroom');
  await page.evaluate(() => { const g = window.__game; const h = g.world.hides[2]; g.player.place(h.front.x, h.front.z, 0); g.target={kind:'hide',h,label:'x'}; g.act(); g.monster.pos.set(h.front.x + 1.2, 0, h.front.z + 0.6); }); await S('hide');
  await page.evaluate(() => { const g = window.__game; g.target = {kind:'leave'}; g.act(); g.player.place(14.5, 9, Math.PI/2); g.caught(g.monster); }); await S('scare');
  await page.waitForTimeout(6000); await S('caught');
}});
done(errs);
