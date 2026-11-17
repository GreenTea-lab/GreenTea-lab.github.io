import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const errs = await run({ w: 390, h: 844, mobile: true, dpr: 3, debug: {}, steps: async (page) => {
  const G = (f) => page.evaluate(f);
  const cdp = await page.context().newCDPSession(page);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const tap = async (x, y) => { await touch('touchStart', x, y); await page.waitForTimeout(80); await touch('touchEnd'); };
  const info0 = await G(() => ({ w: window.__game.scale.width, h: window.__game.scale.height, canvas: window.__game.canvas.style.width }));
  console.log('size', JSON.stringify(info0));
  await tap(195, 844 * 0.55); // ИГРАТЬ
  await page.waitForTimeout(1500);
  console.log('started', await G(() => window.__game.scene.isActive('Game')));
  await touch('touchStart', 200, 600);
  for (let i = 1; i <= 6; i++) { await touch('touchMove', 200, 600 - i * 15); await page.waitForTimeout(50); }
  await page.waitForTimeout(1200);
  const mv = await G(() => { const g = window.__game.scene.getScene('Game'); return { y: g.p.y, joy: window.__game.scene.getScene('Hud').joy }; });
  console.log('move', JSON.stringify(mv));
  await page.screenshot({ path: out + 'm_joy.png' });
  await touch('touchEnd');
  // босс
  await G(() => { const g = window.__game.scene.getScene('Game'); g.weapons = { blaster: 3, orbit: 3, lightning: 2 }; g.nextBoss = g.t + 0.2; window.__NS_DEBUG.god = true; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out + 'm_boss.png' });
  // уровень + поворот экрана
  await G(() => { window.__game.scene.getScene('Game').xp = 50; });
  await page.waitForTimeout(1200);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out + 'm_land.png' });
  const sz = await G(() => ({ w: window.__game.scale.width, h: window.__game.scale.height }));
  console.log('landscape', JSON.stringify(sz));
  await tap(422, 200);
  await page.waitForTimeout(800);
  console.log('picked', await G(() => JSON.stringify(window.__game.scene.getScene('Game').weapons) + JSON.stringify(window.__game.scene.getScene('Game').passives)));
}});
done(errs);
