// Звания и медали месяца: повышение звания на экране победы, медаль за 7-й день месяца. node test/ranks.mjs
import { run, done } from './shot.mjs';
const res = {};
const fail = [];
const solveAll = (page) => page.evaluate(() => { const b = window.__app.board; for (let i = 0; i < b.G.size; i++) if (b.vals[i] !== b.sol[i]) (b.select(i), b.input(b.sol[i])); });
done((await run({ w: 390, h: 800, mobile: true, dpr: 2, steps: async (page) => {
  // звание: 1450 очков + победа на уровне → «Садовник»
  await page.evaluate(() => { const A = window.__app; A.save.data.tutDone = true; A.save.data.score = 1450; A.openGame('p:3'); });
  await solveAll(page);
  await page.waitForTimeout(2000);
  res.rankUp = await page.evaluate(() => document.querySelector('.rankup b')?.textContent);
  if (res.rankUp !== 'Садовник') fail.push('FAIL rankUp ' + res.rankUp);
  await page.screenshot({ path: 'test/out/rank_win.png' });
  // медаль: 6 других дней месяца решены, решаем ещё один → бронза +50
  await page.evaluate(() => {
    const A = window.__app; A.closeModal(true);
    const now = new Date(); const ym = A.dateKey(now).slice(0, 7);
    const today = A.dateKey(now); let k = 0;
    for (let d = 1; d <= 28 && k < 6; d++) { const key = ym + '-' + String(d).padStart(2, '0'); if (key !== today) { A.save.data.daily.done[key] = 2; k++; } }
    A.openGame('d:' + today);
  });
  const c0 = await page.evaluate(() => window.__app.save.data.coins);
  await solveAll(page);
  await page.waitForTimeout(2000);
  res.medal = await page.evaluate(() => [...document.querySelectorAll('.newitem b')].map((b) => b.textContent));
  res.medalCoins = (await page.evaluate(() => window.__app.save.data.coins)) - c0;
  if (!res.medal.includes('Бронза') || res.medalCoins < 110) fail.push('FAIL medal ' + JSON.stringify([res.medal, res.medalCoins]));
  await page.screenshot({ path: 'test/out/medal_win.png' });
  await page.evaluate(() => { window.__app.closeModal(true); window.__app.openDaily(); });
  await page.waitForTimeout(300);
  res.calMedals = await page.evaluate(() => document.querySelectorAll('.mm.got').length);
  if (res.calMedals !== 1) fail.push('FAIL calMedals ' + res.calMedals);
  await page.screenshot({ path: 'test/out/medal_cal.png' });
  await page.evaluate(() => window.__app.openRecords('st'));
  await page.waitForTimeout(400);
  res.rankStats = await page.evaluate(() => document.querySelector('.rankbox b')?.textContent);
  if (res.rankStats !== 'Садовник') fail.push('FAIL rankStats ' + res.rankStats);
  await page.screenshot({ path: 'test/out/rank_stats.png' });
} })).concat(fail));
console.log(JSON.stringify(res));
