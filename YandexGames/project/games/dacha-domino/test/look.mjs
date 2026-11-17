// Скриншоты: главный экран, партия ботом. node test/look.mjs <w> <h> <m?> <mode> <n>
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/f598f527-a7c2-5e7d-86ce-d82e94cc8820/scratchpad/';
const [w, h, mobile, mode = 'goat', n = '4', tag = ''] = process.argv.slice(2);
const W = +w || 1280, H = +h || 720, M = mobile === 'm';
const pre = `try{localStorage.clear()}catch(e){}`;
const errs = await run({ w: W, h: H, mobile: M, dpr: 1, debug: { bot: process.env.BOT !== '0', seed: 12345, fast: 1 }, pre, steps: async (p) => {
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + tag + 'home.png' });
  await p.evaluate(([mode, n]) => { window.__save.data.settings.fast = true; window.__game.newMatch({ mode, n: +n, target: 51, diff: 1 }); }, [mode, n]);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: out + tag + 'deal.png' });
  await p.waitForTimeout(9000);
  await p.screenshot({ path: out + tag + 'mid.png' });
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(1000); if (await p.evaluate(() => !!document.querySelector('.roundm'))) break; }
  await p.screenshot({ path: out + tag + 'round.png' });
  console.log(await p.evaluate(() => JSON.stringify({ moves: window.__game.M.r.moves, scores: window.__game.M.m.scores })));
}});
done(errs);
