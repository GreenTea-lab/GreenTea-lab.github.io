// После раздачи ни одна карта на поле не должна оставаться невидимой
import { run, done } from './shot.mjs';
const errs = await run({ w: 412, h: 860, mobile: true, pre: `localStorage.setItem('castaway_solitaire_v1', JSON.stringify({ seen: { wild: 1, coin: 1, lock: 1, sand: 1, keys2: 1 }, levels: {1:{stars:3,best:1}}, level: 70 }));`, steps: async (p) => {
  const bad = [];
  for (const n of [1, 2, 5, 13, 22, 31, 45, 60]) {
    await p.evaluate((n) => window.__game.playLevel(n), n);
    await p.waitForFunction(() => { const t = window.__game.table; return t.g && t.busy === 0 && t.sprites.some((s) => s.face); }, null, { timeout: 60000 });
    const h = await p.evaluate(() => window.__game.table.sprites.filter((s) => s.hidden).length);
    if (h) bad.push(n + ':' + h);
  }
  console.log('HIDDEN', bad.length ? bad.join(' ') : 'none');
}});
done(errs);
