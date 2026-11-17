// Крупный план ящиков с продуктами: подстилка не должна мерцать
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const errs = await run({
  w: 1280, h: 720, debug: { seed: 5, fast: 1, freeCam: 1 },
  pre: `localStorage.setItem('kitchen_rush_save_v1', JSON.stringify({coins:5000,daily:{day:new Date().toISOString().slice(0,10)}}))`,
  steps: async (page) => {
    for (const [lvl, i] of [[2, 0], [8, 1]]) {
      await page.evaluate((lvl) => window.__game.startLevel(lvl), lvl);
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        const g = window.__game;
        g.renderer.setAnimationLoop(null);
        const v = g.view, k = g.k;
        const cr = k.tiles.find((t) => t.type === 'crate');
        const x = v.wx(cr.x), z = v.wz(cr.z);
        g.camera.clearViewOffset();
        g.camera.position.set(x + 0.6, 2.6, z + 2.4);
        g.camera.lookAt(x + 0.6, 0.7, z);
        g.camera.updateProjectionMatrix();
        g.renderer.render(v.scene, g.camera);
      });
      await page.screenshot({ path: `shots/crate${i}.png` });
    }
  },
});
done(errs);
