import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/f598f527-a7c2-5e7d-86ce-d82e94cc8820/scratchpad/';
const errs = await run({ w: 1280, h: 720, dpr: 1, debug: { seed: 4242, fastdt: 1 }, pre: `try{localStorage.clear()}catch(e){}`, steps: async (p) => {
  await p.evaluate(() => { window.__save.data.settings.fast = true; window.__game.newMatch({ mode: 'classic', n: 2, target: 51, diff: 0 }); });
  let shot = false;
  for (let k = 0; k < 240 && !shot; k++) {
    await p.waitForTimeout(400);
    const st = await p.evaluate(() => {
      const g = window.__game, r = g.M.r;
      if (document.querySelector('.roundm')) return 'round';
      if (g.busy || r.turn !== 0 || r.over) return 'wait';
      if (document.querySelector('[data-a="bone"].pulse')) { document.querySelector('[data-a="bone"]').click(); return 'draw'; }
      const ok = new Set(g._dbgMoves());
      const ids = r.hands[0];
      const two = ids.find((id) => ok.has(id) && g._dbgSides(id) === 2);
      const id = two ?? ids.find((id) => ok.has(id));
      if (id === undefined) return 'none';
      const tl = g.tiles[id];
      const v = tl.getWorldPosition(new tl.position.constructor());
      const s = g.s3.toScreen(v);
      return JSON.stringify({ two: two !== undefined, x: s.x, y: s.y });
    });
    if (st === 'round') { document; break; }
    if (st.startsWith('{')) {
      const o = JSON.parse(st);
      await p.mouse.click(o.x, o.y);
      await p.waitForTimeout(1200);
      if (o.two) { await p.screenshot({ path: out + 'marks.png' }); shot = true; console.log('marks', await p.evaluate(() => document.querySelectorAll('.mark').length)); await p.click('.mark'); await p.waitForTimeout(1500); await p.screenshot({ path: out + 'marks2.png' }); }
    }
  }
}});
done(errs);
