// Перенос прогресса из прошлой версии (sudoku_zen_save_v1) — из облака и из localStorage. node test/migrate.mjs
import { run, done } from './shot.mjs';
const OLD = { v: 1, ts: 1000, coins: 340, score: 2150, solved: 37, noAds: true, tutDone: true, settings: { musicVol: 0.2, sfxVol: 0.5, text: 1, theme: 'dawn', autoCheck: false, timer: true, petals: false }, best: { easy: 140, medium: 300, hard: 0, expert: 0 }, daily: { date: '2026-10-10', done: true, streak: 4, last: '2026-10-10' }, ch: {}, ip: {} };
const res = {};
const fail = [];
let all = [];
process.env.MOCK_SDK = '1';
const check = (r, tag) => {
  const ok = r.coins === 440 && r.score === 2150 && r.solved === 37 && r.noAds && r.tutDone && r.text === 1 && r.theme === 'dawn' && r.max === 37 && r.best1 === 140 && r.streak === 4 && r.v === 2 && r.toast && r.cloudV === 2;
  if (!ok) fail.push('FAIL ' + tag + ' ' + JSON.stringify(r));
};
const probe = async (page) => {
  await page.waitForTimeout(1500);
  return page.evaluate(() => {
    const D = window.__app.save.data;
    const cloud = JSON.parse(localStorage.getItem('__mock_cloud') || '{}');
    return { coins: D.coins, score: D.score, solved: D.solved, noAds: D.noAds, tutDone: D.tutDone, text: D.settings.text, theme: D.settings.theme, max: D.path.max, best1: D.best['classic:1'], streak: D.daily.streak, v: D.v, toast: document.querySelector('#toast')?.textContent || '', cloudV: cloud.save && cloud.save.v, gardenSeen: document.querySelector('.m-garden small')?.textContent };
  });
};
// 1) старый прогресс в облаке
all = all.concat(await run({ w: 390, h: 800, mobile: true, pre: `if (!sessionStorage.x) { sessionStorage.x = 1; localStorage.clear(); localStorage.setItem('__mock_cloud', ${JSON.stringify(JSON.stringify({ save: OLD }))}); }`, steps: async (page) => {
  res.cloud = await probe(page);
  check(res.cloud, 'cloud');
  await page.screenshot({ path: 'test/out/migrate.png' });
  // повторный запуск: второй раз не переносит и не дарит монеты
  await page.reload();
  await page.waitForFunction(() => window.__app && !document.getElementById('boot'));
  await page.waitForTimeout(500);
  res.again = await page.evaluate(() => ({ coins: window.__app.save.data.coins, toast: document.querySelector('#toast')?.textContent || '' }));
  if (res.again.coins !== 440 || res.again.toast) fail.push('FAIL again ' + JSON.stringify(res.again));
} }));
// 2) старый прогресс только в localStorage
all = all.concat(await run({ w: 390, h: 800, mobile: true, pre: `if (!sessionStorage.x) { sessionStorage.x = 1; localStorage.clear(); localStorage.setItem('sudoku_zen_save_v1', ${JSON.stringify(JSON.stringify(OLD))}); }`, steps: async (page) => {
  res.local = await probe(page);
  check(res.local, 'local');
} }));
// 3) новый игрок — ничего не переносится; в консоли остались товары прошлой версии
const LEGACY = [{ id: 'coins_300', title: '300 монет', price: 19 }, { id: 'coins_1000', title: '1 000 монет', price: 59 }, { id: 'coins_3000', title: '3 000 монет', price: 149 }, { id: 'disable_ads', title: 'Без рекламы', price: 99 }];
all = all.concat(await run({ w: 390, h: 800, mobile: true, pre: `window.__MOCK_CATALOG = ${JSON.stringify(LEGACY)}; if (!sessionStorage.x) { sessionStorage.x = 1; localStorage.clear(); }`, steps: async (page) => {
  res.fresh = await page.evaluate(() => ({ coins: window.__app.save.data.coins, migrated: !!window.__app.save.data.flags.migrated }));
  if (res.fresh.coins !== 200 || res.fresh.migrated) fail.push('FAIL fresh ' + JSON.stringify(res.fresh));
  await page.evaluate(() => window.__app.openStore());
  await page.waitForTimeout(300);
  res.legacyItems = await page.evaluate(() => [...document.querySelectorAll('.s-buy')].map((b) => b.dataset.id));
  await page.click('.s-buy[data-id="coins_300"]');
  await page.waitForTimeout(800);
  res.legacyBought = await page.evaluate(() => window.__app.save.data.coins);
  if (res.legacyItems.length !== 4 || res.legacyBought !== 500) fail.push('FAIL legacy ' + JSON.stringify([res.legacyItems, res.legacyBought]));
} }));
console.log(JSON.stringify(res, null, 1));
done(all.concat(fail));
