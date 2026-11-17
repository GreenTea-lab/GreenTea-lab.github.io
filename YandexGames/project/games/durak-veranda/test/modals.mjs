import { run, done } from './shot.mjs';
const [w, h, mob, tag] = [+process.argv[2], +process.argv[3], process.argv[4] === '1', process.argv[5]];
const errors = await run({ w, h, mobile: mob, locale: process.env.LOC || 'ru-RU', steps: async (p) => {
  for (const [n, f] of [['menu', 'menu'], ['setup', 'setup'], ['looks', 'looks'], ['cloth', 'looksC'], ['lb', 'leaderboard'], ['rules', 'rules'], ['settings', 'settings']]) {
    await p.evaluate((f) => { const u = window.__game.ui; f === 'looksC' ? u.looks('cloth') : u[f](); }, f);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `/tmp/mo_${tag}_${n}.png` });
  }
} });
done(errors);
