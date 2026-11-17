// Прогон всей игры ботом (auto): три тройки → полуфинал → суперигра. WIN=1 — герои игрока выигрывают
import { run, done } from './shot.mjs';
let all = await run({ w: 960, h: 540, debug: { nodaily: 1, auto: 1, win: +(process.env.WIN || 0), speed: +(process.env.SPEED || 10) }, pre: 'try{localStorage.clear()}catch(e){}', steps: async (page) => {
  await page.evaluate(() => { window.__game.S.settings.fast = true; window.__game.newGame(); });
  let last = '';
  for (let k = 0; k < +(process.env.N || 150); k++) {
    await page.waitForTimeout(2000);
    const s = await page.evaluate(() => { const g = window.__game, T = g.T, R = g.S.run; return [g.state, R ? 'stage' + R.stage : 'norun', R ? JSON.stringify(R.fin) : '', T && T.stage, T && T.open.map((o, i) => (o ? T.word[i] : '_')).join(''), T && T.P.map((p) => (p.me ? '*' : '') + p.score).join('/'), document.getElementById('stagelbl').textContent, document.querySelector('#modal h2') ? document.querySelector('#modal h2').textContent : ''].join(' | '); });
    if (s !== last) console.log(k, s);
    last = s;
    if (s.startsWith('menu')) break;
  }
} });
done(all);
