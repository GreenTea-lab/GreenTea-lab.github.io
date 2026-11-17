import { run, done } from './shot.mjs';
const errs = await run({ debug: { god: true }, steps: async (page) => {
  await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    g.spawnBoss(); const b = g.boss; g.buildGrid();
    g.damage(b, 1e9);
    const chest = g.items.find(i => i.type === 'chest');
    g.p.x = chest.x; g.p.y = chest.y;
    g.step(1/60);
    // сплиттер
    const s = g.spawnEnemy('splitter', g.p.x + 300, g.p.y); g.damage(s, 1e9);
    return { bosses: g.bosses, boss: g.boss, chestLeft: g.items.filter(i => i.type==='chest').length, bonus: g.bonusCrystals, pending: g.pendingLevels, darts: g.enemies.filter(e => e.type==='dart').length };
  });
  console.log(JSON.stringify(r));
  await page.waitForTimeout(1500);
  console.log(await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); return 'levelUpOpen=' + g.levelUpOpen; }));
}});
done(errs);
