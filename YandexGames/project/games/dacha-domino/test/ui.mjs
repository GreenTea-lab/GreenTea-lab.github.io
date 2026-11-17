// Окна интерфейса и ручной ход человека. node test/ui.mjs <w> <h> <m?> <tag>
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/f598f527-a7c2-5e7d-86ce-d82e94cc8820/scratchpad/';
const [w, h, mobile, tag = 'u_'] = process.argv.slice(2);
const W = +w || 1280, H = +h || 720, M = mobile === 'm';
const S = async (p, n) => p.screenshot({ path: out + tag + n + '.png' });
const errs = await run({ w: W, h: H, mobile: M, dpr: 1, debug: { seed: 777 }, pre: `try{localStorage.clear()}catch(e){}`, steps: async (p) => {
  await p.waitForTimeout(1200);
  await p.click('[data-a="mode"]'); await p.waitForTimeout(400); await S(p, 'setup');
  await p.click('[data-m="classic"]'); await p.waitForTimeout(300); await S(p, 'setup2');
  await p.click('.modal [data-x]');
  await p.click('[data-a="shop2"]'); await p.waitForTimeout(600); await S(p, 'shop');
  await p.click('[data-tab="tables"]'); await p.waitForTimeout(600); await S(p, 'shop2');
  await p.click('[data-tab="places"]'); await p.waitForTimeout(300); await S(p, 'shop3');
  await p.click('.modal [data-x]');
  await p.click('[data-a="settings"]'); await p.waitForTimeout(300); await S(p, 'settings');
  await p.click('.modal [data-x]');
  // партия: человек ходит сам
  await p.evaluate(() => { window.__save.data.settings.fast = true; window.__game.newMatch({ mode: 'classic', n: 2, target: 51, diff: 0 }); });
  for (let k = 0; k < 400; k++) {
    await p.waitForTimeout(500);
    const st = await p.evaluate(() => {
      const g = window.__game, r = g.M.r;
      if (document.querySelector('.roundm')) return 'round';
      if (g.busy || r.turn !== 0 || r.over) return 'wait';
      if (document.querySelector('[data-a="bone"].pulse')) { document.querySelector('[data-a="bone"]').click(); return 'draw'; }
      if (document.querySelector('.mark')) return 'marks';
      const ends = r.first ? [r.left.length ? r.left[r.left.length-1].o : r.first.l, r.right.length ? r.right[r.right.length-1].o : r.first.r] : null;
      const hand = r.hands[0];
      // предпочитаем кость, подходящую к обоим концам — проверка стрелок
      const T = (id) => [Math.floor(0), 0];
      let pick = null;
      for (const id of hand) { const sides = window.__game.M && window.__game.M.r ? null : null; }
      return 'my';
    });
    if (st === 'round') break;
    if (st === 'marks') { await S(p, 'marks'); await p.click('.mark'); continue; }
    if (st === 'my') {
      // нажать на ходовую кость реальным кликом по экрану
      const pt = await p.evaluate(() => {
        const g = window.__game, r = g.M.r;
        const R = window.__rules;
        const ids = r.hands[0];
        const ok = new Set(g._dbgMoves());
        const two = ids.find((id) => ok.has(id) && g._dbgSides(id) === 2);
        const id = two ?? ids.find((id) => ok.has(id));
        if (id === undefined) return null;
        const tl = g.tiles[id];
        const v = tl.getWorldPosition(new tl.position.constructor());
        return g.s3.toScreen(v);
      });
      if (pt) { if (k < 3) await S(p, 'hand'); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(300); }
    }
  }
  await S(p, 'round');
  await p.evaluate(() => { const g = window.__game; g.M.m.scores[0] = 60; g.M.m.done = { win: 0 }; document.querySelector('.roundm [data-a="next"]').click(); });
  await p.waitForTimeout(800); await S(p, 'match');
}});
done(errs);
