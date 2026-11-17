import { run, done } from './shot.mjs';
const errs = await run({ debug: {}, steps: async (page) => {
  await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
  await page.waitForTimeout(1500);
  const a = await page.evaluate(() => { const h = window.__game.scene.getScene('Hud'); window.__fired = 0; h.time.delayedCall(100, () => window.__fired++); return { now: h.time.now, paused: h.time.paused, ts: h.time.timeScale, ev: h.time._active.length + h.time._pendingInsertion.length, hint: !!h.hint }; });
  await page.waitForTimeout(1500);
  const b = await page.evaluate(() => { const h = window.__game.scene.getScene('Hud'); return { now: h.time.now, fired: window.__fired, evs: h.time._active.map(e => ({el: e.elapsed, d: e.delay, p: e.paused, ts: e.timeScale})), gnow: window.__game.scene.getScene("Game").time.now, upd: typeof h.sys.events.listeners("update"), n: h.sys.events.listenerCount("update"), pre: h.sys.events.listenerCount("preupdate") }; });
  console.log(JSON.stringify(a), JSON.stringify(b));
}});
done(errs);
