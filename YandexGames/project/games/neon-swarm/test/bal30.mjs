// Прогон до 30+ минут с максимальной прокачкой магазина: node test/bal30.mjs <bot|afk> [maxT] [hard]
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const mode = process.argv[2] || 'bot';
const maxT = +(process.argv[3] || 1900);
const hard = process.argv[4] === 'hard';
const errs = await run({
  w: 960,
  h: 540,
  debug: { bot: mode !== 'afk', afkAfter: mode === 'late' ? 600 : 0, afk: mode === 'afk', sub: +(process.env.SUB || 30), autoPick: true, autoEnd: true, smartPick: true, noWin: false, hard },
  steps: async (page) => {
    await page.evaluate(([hard, shopLvl]) => {
      const M = window.__save || null;
      const g = window.__game;
      const save = window.__ns_save;
      if (save) {
        for (const id of ['m_hp','m_dmg','m_speed','m_magnet','m_cd','m_xp','m_gold','m_armor','m_reroll','m_revive']) save.data.shop[id] = shopLvl;
        if (hard) save.data.hardUnlocked = true;
      }
      g.registry.set('hard', hard);
      g.scene.getScene('Menu').scene.start('Game');
    }, [hard, +(process.env.SHOP ?? 8)]);
    let last = -1;
    const t0 = Date.now();
    let minFps = 999;
    while (Date.now() - t0 < 1500000) {
      await page.waitForTimeout(2000);
      const info = await page.evaluate(() => {
        const g = window.__game.scene.getScene('Game');
        return {
          t: Math.round(g.t), lvl: g.level, kills: g.kills, en: g.enemies.length, eb: g.ebullets.length,
          hp: Math.round(g.p.hp), max: Math.round(g.st.maxHp), ended: g.ended, won: !!g.won,
          thr: g.threat ? g.threat() : 0, hpm: +(g.hpMul().toFixed(1)), od: g.overcharge || 0,
          fps: Math.round(window.__game.loop.actualFps), bosses: g.bosses, dmgTaken: Math.round(g.dmgTaken || 0),
          xp: Math.round(g.xpTotal || 0), el: (() => { const a = g.eliteLife || []; g.eliteLife = []; return a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null; })(),
          maxed: Object.values(g.weapons).filter((v) => v >= 8).length + '/' + Object.keys(g.weapons).length,
        };
      });
      const bucket = Math.floor(info.t / 60);
      if (info.ended) info.res = await page.evaluate(() => window.__game.scene.getScene('Game').result);
      if (bucket !== last || info.ended) { last = bucket; console.log(JSON.stringify(info)); }
      if (info.t > 1200 && info.t < 1240) await page.screenshot({ path: out + 'b30_20m.png' });
      if (info.ended || info.t > maxT) break;
    }
    await page.screenshot({ path: out + 'b30_end_' + mode + '.png' });
  },
});
done(errs);
