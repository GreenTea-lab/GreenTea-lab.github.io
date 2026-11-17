// Точность бластера: доля снарядов, попавших в неподвижную цель, по уровням и размерам врагов
import { run, done } from './shot.mjs';
const errs = await run({ debug: { god: true, sub: 3 }, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await G(() => window.__game.scene.getScene('Menu').scene.start('Game'));
  await page.waitForTimeout(1500);
  for (const type of ['dart', 'drone', 'brute']) for (const lvl of [1, 2, 3, 4, 5]) {
    const r = await G(async ([lvl, type]) => {
      const g = window.__game.scene.getScene('Game');
      g.hud.hideHint();
      g.weapons = { blaster: lvl }; g.wstate = {};
      for (const e of g.enemies) g.removeEnemy(e);
      g.enemies = []; g.bullets.forEach((b) => (b.life = 0));
      g.openingDone = true; g.spawnAcc = -1e9; g.nextBoss = g.nextSwarm = g.nextEvent = 1e9; g.xp = -1e9;
      const px = g.p.x + 300, py = g.p.y + 90;
      const e = g.spawnEnemy(type, px, py, 1e6, false);
      e.speed = 0;
      let hits = 0; const seen = new Set();
      const od = g.damage.bind(g);
      g.damage = (en, d, kx, ky) => { if (en === e) hits++; return od(en, d, 0, 0); };
      await new Promise((res) => {
        const iv = setInterval(() => {
          e.x = px; e.y = py; e.kx = e.ky = 0;
          for (const b of g.bullets) if (b.life > 0) seen.add(b);
          if (seen.size >= 24) { g.weapons = {}; if (![...seen].some((b) => b.life > 0 && g.bullets.includes(b))) { clearInterval(iv); res(); } }
        }, 10);
      });
      g.damage = od; g.removeEnemy(e); g.enemies = [];
      return { type, lvl, fired: seen.size, hits, pct: Math.round((100 * hits) / seen.size) };
    }, [lvl, type]);
    console.log(JSON.stringify(r));
  }
}});
done(errs);
