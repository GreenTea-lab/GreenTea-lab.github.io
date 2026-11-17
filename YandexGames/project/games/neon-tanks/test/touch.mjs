import { run, done } from './shot.mjs';
const errs = await run({ w: 390, h: 844, mobile: true, dpr: 2, debug: {}, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await G(() => window.__game.scene.getScene('Menu').play());
  await page.waitForTimeout(600);
  const cdp = await page.context().newCDPSession(page);
  const tp = (pts) => pts.map(([x, y, id]) => ({ x, y, id }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp([[100, 600, 1]]) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp([[100, 600, 1], [290, 600, 2]]) });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp([[100 + i * 6, 600 - i * 4, 1], [290, 600 - i * 6, 2]]) }); await page.waitForTimeout(30); }
  const p0 = await G(() => { const p = window.__arena.player; return [p.x, p.y]; });
  await page.waitForTimeout(1500);
  const st = await G(() => { const a = window.__arena, p = a.player; return { x: p.x, y: p.y, ang: p.angle.toFixed(2), fire: p.input.fire, touch: a.touch, bullets: a.world.ents.filter(e => e.kind === 'bullet' && e.owner === p).length }; });
  console.log(JSON.stringify(p0), JSON.stringify(st));
  await page.screenshot({ path: 'test/t_touch.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}});
done(errs);
