import { run, done } from './shot.mjs';
const shop = JSON.parse(process.argv[2] || '{}');
const levels = (process.argv[3] || '1-20').split('-').map(Number);
const errs = await run({ w: 960, h: 540, debug: { bot: true, botEarly: process.argv[4] === 'early' }, steps: async (page) => {
  await page.evaluate((shop) => { const s = JSON.parse(localStorage.getItem('kingdom_towers_save_v1') || '{}'); }, shop);
  const res = [];
  for (let l = levels[0]; l <= levels[1]; l++) {
    await page.evaluate(({ l, shop }) => {
      const sc = window.__game.scene;
      const cur = sc.getScenes(true).map(s => s.sys.settings.key);
      // применяем улучшения в сохранение
      window.__setShop(shop);
      window.__wantL = l;
      for (const k of cur) if (k !== 'Hud') sc.getScene(k).scene.start('Game', { level: l });
    }, { l, shop });
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); return JSON.stringify({ l: g.lvl, want: window.__wantL, ready: g.hud && g.hud.ready, act: window.__game.scene.isActive('Game'), ended: g.ended, lives: g.lives, max: g.maxLives, st: window.__game.scene.scenes.map(s => s.sys.settings.key + s.sys.settings.status).join(',') }); });
    if (process.env.DBG) console.log(st);
    await page.waitForFunction(() => { const g = window.__game.scene.getScene('Game'); return g && g.lvl === window.__wantL && g.hud && g.hud.ready && window.__game.scene.isActive('Game') && !g.ended && g.lives === g.maxLives; }, null, { timeout: 20000 });
    const r = await page.evaluate(() => {
      const g = window.__game.scene.getScene('Game');
      let i = 0;
      while (!g.ended && i < 60 * 30 * 20) {
        if (g.lives <= 0) break;
        g.step(1 / 30);
        i++;
      }
      return { lvl: g.lvl, win: g.ended && g.lives > 0, lives: g.lives, max: g.maxLives, gold: g.gold, towers: [...g.towers.values()].map(t => t.type[0] + t.lvl).join(' '), time: Math.round(i / 30), wave: g.waveIdx + 1 + '/' + g.waves.length };
    });
    console.log(JSON.stringify(r));
    res.push(r);
  }
}});
done(errs);
