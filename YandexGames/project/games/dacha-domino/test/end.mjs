import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/f598f527-a7c2-5e7d-86ce-d82e94cc8820/scratchpad/';
const [w, h, mobile, tag = 'e_'] = process.argv.slice(2);
const errs = await run({ w: +w, h: +h, mobile: mobile === 'm', dpr: 1, debug: { seed: 99 }, pre: `try{localStorage.clear()}catch(e){}`, steps: async (p) => {
  await p.evaluate(() => window.__game.newMatch({ mode: 'goat', n: 4, target: 51, diff: 1 }));
  await p.waitForTimeout(25000);
  await p.screenshot({ path: out + tag + 'game.png' });
  await p.evaluate(() => { const g = window.__game; g.flow++; g.M.m.done = { win: 1, lost: 0 }; g.matchOver(); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + tag + 'match.png' });
}});
done(errs);
