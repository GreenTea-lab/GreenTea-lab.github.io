import { run, done } from './shot.mjs';
const errs = await run({ w: 844, h: 390, mobile: true, dpr: 2, pre: () => { localStorage.setItem('castaway_solitaire_v1', JSON.stringify({ seen: { wild: 1, coin: 1, lock: 1, sand: 1, keys2: 1 }, levels: { 1: { stars: 3, best: 1 }, 2: { stars: 3, best: 1 } , 3: {stars: 2, best: 1}}, level: 12, plays: 5 })); }, steps: async (p) => {
  await p.screenshot({ path: '/tmp/claude-0/s_home.png' });
  await p.evaluate(() => window.__game.playLevel(12));
  await p.waitForFunction(() => { const t = window.__game.table; return t.g && t.busy === 0 && t.sprites.some((s) => s.face); }, null, { timeout: 60000 });
  await p.screenshot({ path: '/tmp/claude-0/s_lvl.png' });
  // только тянем карты
  for (let k = 0; k < 400; k++) {
    const r = await p.evaluate(() => { const tb = window.__game.table; if (window.__game.ui.modalOpen) return 'm'; if (tb.busy) return 'b'; if (tb.g.stock.length) { tb.draw(); return 'd'; } for (let i = 0; i < tb.g.cards.length; i++) if (tb.g.playable(i)) { tb.play(i); return 'p'; } return 'e'; });
    if (r === 'm') break;
    await p.waitForTimeout(r === 'e' ? 500 : 120);
  }
  await p.waitForTimeout(800);
  await p.screenshot({ path: '/tmp/claude-0/s_stuck.png' });
  console.log('MODAL', await p.evaluate(() => document.querySelector('#ui').innerText.slice(0,200)));
  await p.click('[data-a="ad"]');
  await p.waitForTimeout(3000);
  await p.screenshot({ path: '/tmp/claude-0/s_after.png' });
  // сдаться: снова тянем до конца
  for (let k = 0; k < 300; k++) {
    const r = await p.evaluate(() => { const tb = window.__game.table; if (window.__game.ui.modalOpen) return 'm'; if (tb.busy) return 'b'; if (tb.g.stock.length) { tb.draw(); return 'd'; } for (let i = 0; i < tb.g.cards.length; i++) if (tb.g.playable(i)) { tb.play(i); return 'p'; } return 'e'; });
    if (r === 'm') break;
    await p.waitForTimeout(r === 'e' ? 500 : 120);
  }
  await p.waitForTimeout(800);
  await p.click('[data-a="give"]');
  await p.waitForTimeout(800);
  await p.screenshot({ path: '/tmp/claude-0/s_lose.png' });
  await p.click('[data-a="island"]');
  await p.waitForTimeout(1500);
  await p.click('[data-a="build"]');
  await p.waitForTimeout(800);
  await p.screenshot({ path: '/tmp/claude-0/s_build.png' });
  await p.click('[data-b="hut"]');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/claude-0/s_built.png' });
  console.log(await p.evaluate(() => window.__calls ? window.__calls.join(',') : 'nocalls'));
}});
done(errs);
