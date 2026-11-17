import { run, done } from './shot.mjs';
const errs = await run({
  w: 1280, h: 720, debug: { sub: 1 },
  steps: async (page) => {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test/s_menu.png' });
    await page.evaluate(() => window.__game.scene.getScene('Menu').play());
    await page.waitForTimeout(2500);
    await page.mouse.move(900, 300);
    await page.mouse.down();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test/s_play.png' });
    await page.mouse.up();
    const info = await page.evaluate(() => { const a = window.__arena; return { st: a.state, ents: a.world.ents.length, fps: window.__game.loop.actualFps, t: a.world.t }; });
    console.log(JSON.stringify(info));
  },
});
done(errs);
