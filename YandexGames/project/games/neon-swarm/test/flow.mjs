import { run, done } from './shot.mjs';
const out = process.env.OUT || '/tmp/claude-0/shots/';
const errs = await run({ w: 1280, h: 720, debug: {}, steps: async (page) => {
  const G = (f) => page.evaluate(f);
  await page.mouse.click(640, 360); // ИГРАТЬ → подготовка
  await page.waitForTimeout(800);
  await page.mouse.click(640, 570); // СТАРТ
  await page.waitForTimeout(1500);
  // джойстик мышью
  await page.mouse.move(640, 500); await page.mouse.down(); await page.mouse.move(740, 500, { steps: 5 });
  await page.waitForTimeout(1500);
  const moved = await G(() => { const g = window.__game.scene.getScene('Game'); const h = window.__game.scene.getScene('Hud'); return { x: g.p.x, joy: h.joy }; });
  await page.screenshot({ path: out + 'f_joy.png' });
  await page.mouse.up();
  console.log('moved', JSON.stringify(moved));
  // уровень
  await G(() => { window.__game.scene.getScene('Game').xp = 10; });
  await page.waitForTimeout(2500);
  const before = await G(() => JSON.stringify(window.__game.scene.getScene('Game').weapons) + JSON.stringify(window.__game.scene.getScene('Game').passives));
  await page.mouse.click(640, 380); // средняя карточка
  await page.waitForTimeout(800);
  const after = await G(() => { const g = window.__game.scene.getScene('Game'); return JSON.stringify(g.weapons) + JSON.stringify(g.passives) + ' open=' + g.levelUpOpen + ' paused=' + g.scene.isPaused(); });
  console.log('levelup', before, '->', after);
  // смерть -> воскрешение за рекламу (заглушка)
  await G(() => window.__game.scene.getScene('Game').die());
  await page.waitForTimeout(3000);
  await page.screenshot({ path: out + 'f_revive.png' });
  await page.mouse.click(640, 720 * 0.56);
  await page.waitForTimeout(3500);
  const rv = await G(() => { const g = window.__game.scene.getScene('Game'); return { dead: g.dead, hp: g.p.hp, paused: g.scene.isPaused(), adUsed: g.adReviveUsed }; });
  console.log('revive', JSON.stringify(rv));
  // снова смерть -> сразу конец
  await G(() => window.__game.scene.getScene('Game').die());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + 'f_over.png' });
  const res = await G(() => window.__game.scene.getScene('Game').result);
  console.log('result', JSON.stringify(res));
  // ЕЩЁ РАЗ
  const y = await G(() => { const h = window.__game.scene.getScene('Hud'); const b = h.ovL.items.filter(o => o.label && o.label.text); return b.map(o => [o.label.text, o.c.y, o.c.x]); });
  console.log('buttons', JSON.stringify(y));
  const again = y.find(b => b[0].includes('ЕЩЁ'));
  await page.mouse.click(again[2], again[1]);
  await page.waitForTimeout(2500);
  const st = await G(() => { const g = window.__game.scene.getScene('Game'); return { t: g.t, ended: g.ended, active: g.scene.isActive(), hud: window.__game.scene.isActive('Hud') }; });
  console.log('restart', JSON.stringify(st));
  await G(() => window.__game.scene.getScene('Game').openPause());
  await page.waitForTimeout(800);
  const y2 = await G(() => { const h = window.__game.scene.getScene('Hud'); return h.ovL.items.filter(o => o.label && o.label.text).map(o => [o.label.text, o.c.y]); });
  const menu = y2.find(b => b[0].includes('МЕНЮ'));
  await page.mouse.click(640, menu[1]);
  await page.waitForTimeout(1500);
  const y3 = await G(() => { const h = window.__game.scene.getScene('Hud'); return h.ovL.items.filter(o => o.label && o.label.text).map(o => [o.label.text, o.c.y]); });
  const menu2 = y3.find(b => b[0] === 'В МЕНЮ');
  await page.mouse.click(640, menu2[1]);
  await page.waitForTimeout(2000);
  const m = await G(() => ({ menu: window.__game.scene.isActive('Menu'), game: window.__game.scene.isActive('Game'), hud: window.__game.scene.isActive('Hud'), crystals: JSON.parse(localStorage.getItem('neon_swarm_save_v1')).crystals }));
  console.log('menu', JSON.stringify(m));
  await page.screenshot({ path: out + 'f_menu.png' });
}});
done(errs);
