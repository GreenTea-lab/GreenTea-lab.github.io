import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const errs = await run({
  w: 1280,
  h: 720,
  debug: { bot: true, god: true, autoPick: true, smartPick: true },
  steps: async (page) => {
    await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
    await page.waitForTimeout(1500);
    // прокачиваем всё и переносим время на 8-ю минуту
    const r = await page.evaluate(() => {
      const g = window.__game.scene.getScene('Game');
      g.weapons = { blaster: 5, orbit: 5, nova: 5, lightning: 5, missile: 5 };
      g.t = 480;
      g.nextBoss = 9999;
      g.nextSwarm = 9999;
      for (let i = 0; i < 400; i++) g.step(1 / 30);
      const t0 = performance.now();
      for (let i = 0; i < 300; i++) g.step(1 / 60);
      const ms = (performance.now() - t0) / 300;
      return { ms, en: g.enemies.length, gems: g.gems.length, bullets: g.bullets.length, kills: g.kills };
    });
    console.log(JSON.stringify(r));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out + 'perf.png' });
  },
});
done(errs);
