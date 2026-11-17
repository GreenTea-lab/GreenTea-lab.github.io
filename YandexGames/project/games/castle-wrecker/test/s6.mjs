import { run, done } from './shot.mjs';
process.env.MOCK_SDK = 1;
const errs = await run({ w: 1280, h: 720, debug: { unlockAll: true, maxSteps: 14, speed: 2 }, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await G(() => { const g = window.__game; g.setQuality('low'); g.s.hints = {}; g.startLevel(2); });
  await page.mouse.click(600, 300);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/s6_arc_hint.png' });
  await G(() => document.querySelector('.hint .btn').click());
  await G(() => window.__game.toggleLook());
  await page.mouse.move(600, 300); await page.mouse.down(); await page.mouse.move(400, 260, { steps: 5 }); await page.mouse.up();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/s6_look.png' });
  await G(() => window.__game.toggleLook());
  console.log('boost before', await G(() => JSON.stringify({ b: window.__game.s.boost, ammo: window.__game.ammo })));
  await G(() => document.querySelector('.am.boost').click());
  console.log('boost after', await G(() => JSON.stringify({ b: window.__game.s.boost, ammo: window.__game.ammo, sel: window.__game.sel })));
  await G(() => document.querySelector('.am.boost').click());
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/s6_boostmodal.png' });
  console.log('booster modal', await G(() => !!document.querySelector('.panel.boostm')));
  await G(() => window.__game.ui.closeModal());
  // межуровневая реклама
  await G(() => { const g = window.__game; g.li = 5; g.sinceAd = 3; g.lastAd = 0; g.after(() => { window.__afterRan = true; }); });
  await page.waitForTimeout(1200);
  console.log('interstitial', await G(() => JSON.stringify({ ran: window.__afterRan, calls: window.__calls.filter(c => c.startsWith('fullscreen')).length })));
  // смена размера посреди уровня
  await page.setViewportSize({ width: 600, height: 900 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/s6_resize.png' });
}});
done(errs);
