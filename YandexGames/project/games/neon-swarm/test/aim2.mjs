import { run, done } from './shot.mjs';
const errs = await run({ debug: {}, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await G(() => window.__game.scene.getScene('Menu').scene.start('Game'));
  await page.waitForTimeout(1500);
  for (const type of ['dart', 'drone', 'brute']) for (const lvl of [1, 3, 5]) {
    const r = await G(async ([lvl, type]) => {
      const g = window.__game.scene.getScene('Game');
      g.weapons = { blaster: lvl };
      g.wstate = {};
      for (const e of g.enemies) { e.alive = false; if (e.spr) e.spr.setVisible(false); }
      g.enemies = g.enemies.filter(e => e.alive);
      g.openingDone = true; g.spawnAcc = -1e9; g.nextBoss = 1e9; g.nextSwarm = 1e9;
      const e = g.spawnEnemy(type, g.p.x + 320, g.p.y + 60, 50, false);
      e.speed = 0;
      let shots = 0, hits = 0;
      const origDamage = g.damage.bind(g);
      g.damage = (en, d, kx, ky) => { if (en === e) hits++; return origDamage(en, d, kx, ky); };
      const n0 = g.bullets.length;
      const before = g.bullets.length;
      let fired = 0; const seen = new Set();
      await new Promise((res) => { const t0 = performance.now(); const iv = setInterval(() => { for (const b of g.bullets) if (!seen.has(b)) { seen.add(b); fired++; } if (performance.now() - t0 > 3000) { clearInterval(iv); res(); } }, 16); });
      g.damage = origDamage;
      e.alive = false;
      return { type, lvl, fired, hits };
    }, [lvl, type]);
    console.log(JSON.stringify(r));
  }
}});
done(errs);
