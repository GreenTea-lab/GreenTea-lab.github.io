// скриншот арены в разных режимах: node test/look.mjs <mode> <path> <lvl> <file>
import { run, done } from './shot.mjs';
const [mode, path, lvl, file] = [process.argv[2] || 'ffa', process.argv[3], +process.argv[4] || 45, process.argv[5] || 'look'];
const errs = await run({
  w: 1280, h: 720, debug: { sub: 6, autoplay: true, god: true, path: path ? path.split(',') : undefined, world: process.argv[6] ? { bossAt: 5 } : {} },
  steps: async (page) => {
    await page.evaluate((m) => { const a = window.__arena; if (m !== a.mode) a.buildWorld(m); window.__game.scene.getScene('Menu').play(); }, mode);
    for (let i = 0; i < 200; i++) {
      await page.waitForTimeout(1000);
      const lv = await page.evaluate(() => window.__arena.player ? window.__arena.player.level : 0);
      if (lv >= lvl) break;
    }
    await page.evaluate(() => { const a = window.__arena; a.debug.sub = 1; });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `test/${file}.png` });
    console.log(await page.evaluate(() => { const p = window.__arena.player; return p.cls + ' L' + p.level + ' boss:' + !!window.__arena.world.boss; }));
  },
});
done(errs);
