// старое сохранение v1 → v2 и выход из тюрьмы за рекламу. MOCK_SDK=1 node test/migrate.mjs
import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, debug: { turbo: 4, dice: [[1, 2]] }, pre: () => {
  localStorage.setItem('magnat_v1', JSON.stringify({ v: 1, ts: 9e12, coins: 500, last: { n: 3, diff: 2, limit: 1, h: 1 }, settings: { fast: true, cam: 'follow' }, stats: { games: 3, wins: 1 }, daily: { day: new Date().toISOString().slice(0, 10), streak: 1 } }));
}, steps: async (page) => {
  const d = await page.evaluate(() => { const d = window.__save.data; return { v: d.v, limit: d.last.limit, speed: d.settings.speed, tut: d.tut, coins: d.coins }; });
  console.log('MIGRATED', JSON.stringify(d));
  await page.evaluate(() => { document.querySelectorAll('#mod .modal').forEach((m) => m.close()); window.__game.newGame({ n: 2, diff: 0, limit: 0 }); const M = window.__game.M; M.players[0].inJail = true; M.players[0].pos = 10; window.__game.placeTokens(); });
  await page.waitForSelector('#mod [data-a="ad"]', { timeout: 20000 });
  await page.click('#mod [data-a="ad"]');
  await page.waitForTimeout(3000);
  console.log('JAIL', await page.evaluate(() => JSON.stringify({ inJail: window.__game.M.players[0].inJail, jailAd: window.__game.M.jailAd, pause: !!document.querySelector('.pausem'), calls: window.__calls.filter((c) => /rewarded|gp/.test(c)) })));
} });
done(errs);
