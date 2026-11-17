import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const meta = process.argv[2] || 'none';
const errs = await run({
  w: 960,
  h: 540,
  debug: { bot: true, sub: 30, autoPick: true, autoEnd: true, smartPick: process.argv[3] === 'smart' },
  steps: async (page) => {
    if (meta === 'max') {
      await page.evaluate(() => {
        const s = window.__game; // прокачанный игрок
      });
    }
    await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
    let last = -1;
    const t0 = Date.now();
    while (Date.now() - t0 < 240000) {
      await page.waitForTimeout(2000);
      const info = await page.evaluate(() => {
        const g = window.__game.scene.getScene('Game');
        return {
          t: Math.round(g.t),
          lvl: g.level,
          kills: g.kills,
          en: g.enemies.length,
          gems: g.gems.length,
          hp: Math.round(g.p.hp),
          ended: g.ended,
          w: Object.entries(g.weapons).map(([k,v])=>k[0]+v).join('')+'|'+Object.entries(g.passives).map(([k,v])=>k.slice(0,2)+v).join(''),
          res: g.result,
          fps: Math.round(window.__game.loop.actualFps),
          bosses: g.bosses,
          bossHp: g.boss ? Math.round(g.boss.hp) : null,
        };
      });
      const minute = info.t > 150 ? Math.floor(info.t / 10) : Math.floor(info.t / 60);
      if (minute !== last || info.ended) {
        last = minute;
        console.log(JSON.stringify(info));
      }
      if (info.t > 125 && info.t < 140) await page.screenshot({ path: out + 'bal_mid.png' });
      if (info.ended || info.t > 720) break;
    }
    await page.screenshot({ path: out + 'bal_end.png' });
  },
});
done(errs);
