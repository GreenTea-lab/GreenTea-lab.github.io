import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, pre: () => { localStorage.setItem('castaway_solitaire_v1', JSON.stringify({ seen: { wild: 1, coin: 1, lock: 1, sand: 1, keys2: 1 }, level: 70 })); }, steps: async (p) => {
  await p.evaluate(() => window.__game.playLevel(22));
  await p.waitForFunction(() => { const t = window.__game.table; return t.g && t.busy === 0 && t.sprites.some((s) => s.face); }, null, { timeout: 60000 });
  console.log(await p.evaluate(() => { const g = window.__game.table.g; const o = []; g.cards.forEach((c, i) => { if (c.sand) o.push(i + ':' + c.sand + (g.faceUp(i) ? 'U' : 'D')); }); let k = 0; g.cards.forEach((c, i) => { if (g.faceUp(i) && k < 2) { c.sandLeft = 2 - k; k++; } }); return o.join(' '); }));
  await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/claude-0/sandv.png' });
}});
done(errs);
