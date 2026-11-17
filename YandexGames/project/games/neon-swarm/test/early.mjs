import { run, done } from './shot.mjs';
const all = [];
for (const [w, h, mobile, tag] of [[1280, 720, false, 'd'], [400, 800, true, 'm']]) {
  const errs = await run({ w, h, mobile, debug: {}, steps: async (page) => {
    const G = (f) => page.evaluate(f);
    await G(() => window.__game.scene.getScene('Menu').scene.start('Game'));
    for (const sec of [2, 5, 10, 20]) {
      await page.waitForFunction((s) => { const g = window.__game.scene.getScene('Game'); return g && g.t >= s; }, sec, { timeout: 120000 });
      const r = await G(() => { const g = window.__game.scene.getScene('Game'); const v = g.cameras.main.worldView; const vis = g.enemies.filter(e => e.alive && e.x > v.x && e.x < v.right && e.y > v.y && e.y < v.bottom).length; return { t: +g.t.toFixed(1), alive: g.enemies.filter(e => e.alive).length, visible: vis, kills: g.kills, hp: Math.round(g.hp ?? g.p.hp ?? 0) }; });
      console.log(tag, JSON.stringify(r));
      if (sec === 5) await page.screenshot({ path: `shots/early_${tag}.png` });
    }
  }});
  all.push(...errs);
}
done(all);
