import { run, done } from './shot.mjs';
const errs = await run({ w: 960, h: 540, debug: { speed: 30 }, steps: async (p) => {
  await p.click('[data-a="short"]');
  await p.waitForTimeout(300);
  await p.click('.bot[data-lv="0"]');
  for (let i = 0; i < 40; i++) {
    const r = await p.evaluate(() => { const m = window.__game.match; const b = document.querySelector('#bRoll'); return m.phase + ' cur=' + m.cur + ' dis=' + b.disabled + ' st=' + document.querySelector('#st span').textContent; });
    console.log(r);
    if (r.startsWith('roll ') || r.startsWith('opening ')) await p.evaluate(() => window.__game.match.roll());
    if (r.startsWith('move')) await p.evaluate(() => { const m = window.__game.match; m.select([...m.movable][0]); m.moveTo([...m.targets.keys()][0]); });
    await p.waitForTimeout(400);
  }
}});
done(errs);
