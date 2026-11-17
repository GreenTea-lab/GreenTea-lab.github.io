import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const [name, w, h, mobile, dpr] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5] === '1', +(process.argv[6] || 1)];
const shot = (page, n) => page.screenshot({ path: out + name + '_' + n + '.png' });
const errs = await run({
  w, h, mobile, dpr,
  debug: {},
  steps: async (page) => {
    await shot(page, '1menu');
    await page.evaluate(() => { const m = window.__game.scene.getScene('Menu'); m.panel = 'shop'; window.__ns_save && 0; m.layout(); });
    await page.waitForTimeout(300);
    await shot(page, '2shop');
    await page.evaluate(() => { const m = window.__game.scene.getScene('Menu'); m.panel = 'lb'; m.layout(); });
    await page.waitForTimeout(800);
    await shot(page, '3lb');
    await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
    await page.waitForTimeout(2500);
    await shot(page, '4game');
    await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.xp = 100; });
    await page.waitForTimeout(1200);
    await shot(page, '5levelup');
    await page.evaluate(() => { const hud = window.__game.scene.getScene('Hud'); hud.closeOverlay(); const g = window.__game.scene.getScene('Game'); g.pendingLevels = 0; g.levelUpOpen = false; g.setPause('levelup', false); g.weapons = {blaster:3, orbit:2, nova:1}; g.passives = {swift:2, magnet:1}; g.openPause(); });
    await page.waitForTimeout(500);
    await shot(page, '6pause');
    await page.evaluate(() => { const hud = window.__game.scene.getScene('Hud'); hud.closeOverlay(); const g = window.__game.scene.getScene('Game'); g.closePause(); g.die(); });
    await page.waitForTimeout(1200);
    await shot(page, '7revive');
    await page.evaluate(() => { const hud = window.__game.scene.getScene('Hud'); hud.closeOverlay(); const g = window.__game.scene.getScene('Game'); g.kills = 432; g.t = 287; g.finishRun(); });
    await page.waitForTimeout(800);
    await shot(page, '8gameover');
  },
});
done(errs);
