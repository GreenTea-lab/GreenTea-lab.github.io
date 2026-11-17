import { run, done } from './shot.mjs';
const [w, h, mobile, tag] = [+(process.argv[2] || 1280), +(process.argv[3] || 720), process.argv[4] === 'm', process.argv[5] || 'pl'];
const errs = await run({ w, h, mobile, debug: {}, steps: async (page) => {
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.querySelectorAll('.modal').forEach((m) => m.close && m.close()); window.__game.newGame({ n: 4, diff: 1, limit: 1 }); });
  await page.waitForTimeout(800);
  const places = ['sunset', 'nights', 'autumn', 'port', 'winter'];
  const houses = ['classic', 'terem', 'modern', 'classic', 'terem'];
  for (let k = 0; k < places.length; k++) {
    await page.evaluate(([p, hs, k]) => {
      const g = window.__game; const M = g.M;
      document.querySelectorAll('.toast').forEach((t) => t.remove());
      g.setPlace(p); g.setHouses(hs);
      const sets = [[1, 2, 0], [3, 2, 0], [6, 3, 1], [8, 3, 1], [9, 4, 1], [16, 1, 2], [18, 1, 2], [19, 2, 2], [37, 5, 3], [39, 4, 3], [5, 0, 0], [12, 0, 2], [26, 0, 3]];
      for (const [i, n, o] of sets) M.own[i] = { o, h: n, m: i === 12 };
      M.players.forEach((pl, j) => (pl.pos = [0, 7, 16, 24][j]));
      g.syncAll(); g.placeTokens();
      if (k === 2 || k === 4) g.s3.focus([0, 9, 19, 39, 0][k]); else g.s3.overview();
    }, [places[k], houses[k], k]);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `shots/${tag}_${places[k]}.png` });
  }
} });
done(errs);
