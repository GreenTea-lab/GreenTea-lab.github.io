// прогон партий только ботами: ловим ошибки и смотрим итоги
import { run, done } from './shot.mjs';
const games = +(process.argv[2] || 2);
const errs = await run({ w: 640, h: 400, debug: { allbots: 1, turbo: 40 }, steps: async (page) => {
  await page.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.close && m.close()));
  for (let k = 0; k < games; k++) {
    await page.evaluate((k) => { window.__save.data.settings.speed = 2; window.__game.newGame({ n: 4, diff: k % 3, limit: 1, rules: { pot: k % 2 === 0, go2: true, quick: k > 0 } }); }, k);
    const t0 = Date.now();
    let last = '';
    while (Date.now() - t0 < 240000) {
      await page.waitForTimeout(2000);
      const st = await page.evaluate(() => { const M = window.__game.M; return M ? { over: M.over, round: M.round, alive: M.players.filter((p) => !p.out).length, money: M.players.map((p) => p.money), own: Object.keys(M.own).length, houses: Object.values(M.own).reduce((s, o) => s + o.h, 0) } : null; });
      last = JSON.stringify(st);
      if (!st || st.over) break;
    }
    console.log('game', k, last);
  }
} });
done(errs);
