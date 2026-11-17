import { run, done } from './shot.mjs';
const W = +process.argv[2] || 1280, H = +process.argv[3] || 720, mobile = process.argv[4] === 'm';
const tag = W + 'x' + H;
const errs = await run({
  w: W, h: H, mobile, dpr: mobile ? 2 : 1, debug: {},
  steps: async (page) => {
    await page.waitForTimeout(800);
    await page.screenshot({ path: `test/u_menu_${tag}.png` });
    await page.evaluate(() => { const m = window.__game.scene.getScene('Menu'); m.panel = 'garage'; m.layout(); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test/u_garage_${tag}.png` });
    await page.evaluate(() => { const m = window.__game.scene.getScene('Menu'); m.panel = null; m.layout(); m.play(16000); });
    if (mobile) await page.touchscreen.tap(W * 0.3, H * 0.6);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test/u_play_${tag}.png` });
    await page.evaluate(() => window.__game.scene.getScene('Hud').openPause());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `test/u_pause_${tag}.png` });
    await page.evaluate(() => { const h = window.__game.scene.getScene('Hud'); h.resume(); const a = window.__arena; const k = a.world.tanks.find(t => t !== a.player); a.player.shield = 0; a.world.damage(a.player, 99999, k); });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `test/u_dead_${tag}.png` });
  },
});
done(errs);
