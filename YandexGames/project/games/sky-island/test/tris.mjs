import { run, done } from './shot.mjs';
const errs = await run({ w: 800, h: 450, debug: {}, steps: async (page) => {
  await page.waitForTimeout(1500);
  console.log(await page.evaluate(() => {
    const w = window.__game.world;
    const tri = (o) => { let n = 0; o.traverse((c) => { if (c.isMesh && c.geometry && c.geometry.index) n += (c.geometry.index.count / 3) * (c.isInstancedMesh ? c.count : 1); }); return n; };
    const out = {};
    out.island = tri(w.islandGroup);
    out.objs = tri(w.objGroup);
    out.deco = tri(w.deco.group);
    out.seaOnly = w.deco.sea.reduce((a, m) => a + (m.geometry.index.count / 3) * m.count, 0);
    out.islets = w.deco.islets.reduce((a, s) => a + tri(s.grp), 0);
    out.midClouds = w.clouds.reduce((a, c) => a + c.m.geometry.index.count / 3, 0);
    const per = {}; for (const [k, v] of w.geoCache) per[k] = v.geo ? v.geo.index.count / 3 : 0;
    out.sample = Object.fromEntries(Object.entries(per).filter(([k]) => /b_|cloud1$|seacloud1|d_tree/.test(k)).slice(0, 12));
    return JSON.stringify(out, null, 0);
  }));
}});
done(errs);
