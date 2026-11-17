import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/si_long_';
const errs = await run({ w: 1280, h: 720, debug: { speed: 1, dayOffset: 30 }, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => window.__game && window.__game.rates && window.__E);
  // бот: много шагов экономики без рендера, решения как в симуляции
  const res = await G(async () => {
    const g = window.__game;

    return 'ok';
  });
  for (let round = 0; round < 12; round++) {
    const info = await G((round) => {
      const g = window.__game;
      const s = g.s;
      g.ui.closeModal && g.ui.modalOpen && g.ui.closeModal();
      const types = ['hut','farm','sawmill','market','quarry','cottage','treehouse','mill','townhall','mine','iceworks','tower','lighthouse','port','observatory','forge'];
      const decor = ['tree','flowers','fence','bench','lantern','well','pine','mushroom','fountain','snowman','bridge','statue','cactus','palm'];
      // дадим ресурсы и сымитируем прогресс
      s.coins += 1e4 * Math.pow(4, round); s.wood += 2e3 * Math.pow(3, round); s.stone += 2e3 * Math.pow(3, round); s.crystals += 50;
      for (let k = 0; k < 6; k++) {
        // строим
        for (const tp of types) {
          if (g.freeBuilders() <= 0) break;
          const d = window.__E.BUILDINGS[tp];
          if (d.unlock > s.level || (d.unique && s.buildings.some(b => b.type === tp))) continue;
          if (Math.random() < 0.5) continue;
          g.startPlace('b', tp);
          if (g.mode) { g.confirmPlace(); g.cancelPlace(); }
        }
        for (const b of s.buildings) if (b.build) b.build = Date.now() - 1;
        g.completeBuilds(true);
        for (const b of s.buildings) { if (b.lvl < 10 && Math.random() < 0.4 && g.freeBuilders() > 0) g.upgrade(b); }
        for (const b of s.buildings) if (b.build) b.build = Date.now() - 1;
        g.completeBuilds(true);
        for (let i = 0; i < 3; i++) { const tp = decor[Math.floor(Math.random() * decor.length)]; if (window.__E.DECOR[tp].unlock <= s.level) { g.startPlace('d', tp); if (g.mode) { g.confirmPlace(); g.cancelPlace(); } } }
        g.checkLevel();
        g.ui.modalOpen && g.ui.closeModal();
        // участок
        const gp = g.ghosts.find(x => !x.locked);
        if (gp && s.coins > window.__E.plotCost(s.plots.length).coins) g.buyPlot(gp);
      }
      g.deselect();
      return { round, lvl: s.level, b: s.buildings.length, d: s.decor.length, plots: s.plots.length, pop: Math.round(g.rates.pop), inc: Math.round(g.rates.coins), people: g.people.length };
    }, round);
    console.log(JSON.stringify(info));
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(6000);
  console.log('chunks', await G(() => window.__game.world.chunks ? window.__game.world.chunks.size : 0));
  const fps = await G(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); }));
  console.log('fps(swiftshader)', fps.toFixed(1), 'tris', await G(() => window.__game.world.renderer.info.render.triangles), 'calls', await G(() => window.__game.world.renderer.info.render.calls));
  await page.screenshot({ path: out + '1.png' });
  await G(() => { const c = window.__game.ctl; c.tPhi = 1.15; c.tDist = 30; c.tTheta += 1.2; });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: out + '2.png' });
  await G(() => { window.__game.world.dayOffset += 180; });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: out + '3.png' });
}});
done(errs);
