// node test/look.mjs <w> <h> <m|d> <level> [moves] [out]
import { run, done } from './shot.mjs';
const [w, h, mob, lvl, moves = 0, out = '/tmp/claude-0/look.png', locale = 'ru-RU'] = process.argv.slice(2);
const M = mob === 'm';
const errs = await run({ w: +w, h: +h, mobile: M, dpr: M ? 2 : 1, locale, pre: `localStorage.setItem('castaway_solitaire_v1', JSON.stringify({ seen: { wild: 1, coin: 1, lock: 1, sand: 1, keys2: 1 }, levels: ${+lvl === 1 ? '{}' : '{ 1: { stars: 3, best: 1 } }'}, level: 70, plays: 0 }));`, steps: async (p) => {
  await p.evaluate((n) => window.__game.playLevel(n), +lvl);
  await p.waitForFunction(() => { const t = window.__game.table; return t.g && t.busy === 0 && t.sprites.some((s) => s.face); }, null, { timeout: 60000 });
  for (let k = 0; k < +moves; k++) {
    await p.evaluate(() => { const tb = window.__game.table; for (let i = tb.g.cards.length - 1; i >= 0; i--) if (tb.g.playable(i)) return tb.play(i); tb.draw(); });
    await p.waitForFunction(() => window.__game.table.busy === 0, null, { timeout: 20000 });
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: out });
}});
done(errs);
