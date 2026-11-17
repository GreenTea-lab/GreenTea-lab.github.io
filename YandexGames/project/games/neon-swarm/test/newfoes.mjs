// Новые враги-стрелки и боссы Пульсар/Улей, финальная минута
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const errs = await run({ w: 1280, h: 720, debug: { god: true, sub: 2, autoPick: true, smartPick: true }, steps: async (page) => {
  await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    g.hud.hideHint(); g.t = 700; g.nextBoss = g.nextSwarm = g.nextEvent = 1e9;
    for (const t of ['spinner', 'gunner', 'burster']) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28; g.spawnEnemy(t, g.p.x + Math.cos(a) * 250, g.p.y + Math.sin(a) * 250, 3, i === 0); }
    Object.assign(g.weapons, { saw: 6 }); g.recalc();
  });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: out + 'nf1.png' });
  await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.spawnBoss('pulsar'); });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: out + 'nf2.png' });
  await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); if (g.boss) g.kill(g.boss); g.spawnBoss('hive'); });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: out + 'nf3.png' });
  await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); if (g.boss) g.kill(g.boss); g.t = 1741; });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: out + 'nf4.png' });
  console.log(await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); return JSON.stringify({ t: Math.round(g.t), finale: g.finale, en: g.enemies.length, eb: g.ebullets.length, bosses: g.enemies.filter((e) => e.boss).map((e) => e.type) }); }));
}});
done(errs);
