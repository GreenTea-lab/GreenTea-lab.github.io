// Экран победы на 30:00 и меню с хардкором (RU)
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const W = +(process.argv[2] || 960), H = +(process.argv[3] || 540);
const errs = await run({
  w: W, h: H, mobile: W < H,
  debug: { god: true, sub: 4, autoPick: true, smartPick: true },
  steps: async (page) => {
    await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.t = 1797; g.hud.hideHint(); });
    await page.waitForFunction(() => window.__game.scene.getScene('Game').won, null, { timeout: 60000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: out + `win_${W}.png` });
    await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.hud.closeOverlay(); g.continueEndless(); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out + `endless_${W}.png` });
    await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.scene.start('Menu'); g.scene.stop('Hud'); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: out + `menu_${W}.png` });
  },
});
done(errs);
