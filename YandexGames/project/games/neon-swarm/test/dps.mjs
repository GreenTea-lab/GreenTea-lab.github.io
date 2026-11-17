// Замер урона максимального билда по толпе: node test/dps.mjs
import { run, done } from './shot.mjs';
const errs = await run({
  w: 960, h: 540,
  debug: { god: true, sub: 10, autoPick: true, smartPick: true },
  steps: async (page) => {
    await page.evaluate(() => {
      const s = window.__ns_save;
      for (const id of ['m_hp','m_dmg','m_speed','m_magnet','m_cd','m_xp','m_gold','m_armor']) s.data.shop[id] = 8;
      window.__game.scene.getScene('Menu').scene.start('Game');
    });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async () => {
      const g = window.__game.scene.getScene('Game');
      g.nextBoss = g.nextSwarm = g.nextEvent = 1e9;
      g.spawnAcc = -1e9;
      for (const k of ['blaster','orbit','nova','lightning','missile']) g.weapons[k] = 5;
      for (const k of ['vitality','regen','swift','magnet','power','haste','area','armor','wisdom']) g.passives[k] = 5;
      g.recalc();
      g.hud.hideHint();
      let dealt = 0;
      const orig = g.damage.bind(g);
      g.damage = (e, d, kx, ky) => { if (e.alive) dealt += Math.min(d, e.hp); orig(e, d, kx, ky); };
      const res = {};
      for (const N of [20, 60, 150]) {
        for (const e of g.enemies) g.removeEnemy(e);
        g.enemies = [];
        g.t = 600;
        const t0 = g.t;
        dealt = 0;
        // постоянно поддерживаем толпу из N «манекенов» вокруг игрока
        const fill = () => {
          while (g.enemies.filter((e) => e.alive).length < N) {
            const a = Math.random() * Math.PI * 2, R = 250 + Math.random() * 250;
            const e = g.spawnEnemy('brute', g.p.x + Math.cos(a) * R, g.p.y + Math.sin(a) * R, 20, false);
          }
        };
        const kills0 = g.kills;
        while (g.t - t0 < 20) { fill(); await new Promise((r) => setTimeout(r, 50)); }
        res[N] = { dps: Math.round(dealt / (g.t - t0)), kills: g.kills - kills0 };
      }
      return res;
    });
    console.log(JSON.stringify(r));
  },
});
done(errs);
