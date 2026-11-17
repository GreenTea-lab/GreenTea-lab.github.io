// витрина новых окон: задания, настройка партии, обучение, совет при покупке, соперник, обмен, итоги
import { run, done } from './shot.mjs';
const [w, h, mobile] = [+(process.argv[2] || 1280), +(process.argv[3] || 720), process.argv[4] === 'm'];
const tag = process.argv[5] || 'd';
const shot = (page, n) => page.screenshot({ path: `shots/${tag}_${n}.png` });
const closeAll = (page) => page.evaluate(() => document.querySelectorAll('#mod .modal').forEach((m) => m.close && m.close()));
const errs = await run({ w, h, mobile, locale: process.env.LOC || 'ru-RU', debug: { dice: [[2, 1], [3, 3], [1, 2]] }, steps: async (page) => {
  await page.waitForTimeout(1200);
  await closeAll(page);
  await page.evaluate(() => { const d = window.__save.data; d.cnt.buy = 3; d.cnt.win = 1; d.daily = { day: new Date().toISOString().slice(0, 10), streak: 1 }; window.__game.toHome(); });
  await page.waitForTimeout(400);
  await closeAll(page);
  await shot(page, 'home');
  await page.click('[data-a="quests"]');
  await page.waitForTimeout(400);
  await shot(page, 'quests');
  await closeAll(page);
  await page.waitForTimeout(300);
  await closeAll(page);
  await page.click('[data-a="new"]');
  await page.waitForTimeout(400);
  await page.click('[data-r="pot"]');
  await page.click('[data-r="quick"]');
  await shot(page, 'setup');
  await page.click('[data-a="go"]');
  await page.waitForTimeout(1500);
  await shot(page, 'coach');
  // пройти подсказки до покупки
  for (let k = 0; k < 40; k++) {
    const st = await page.evaluate(() => {
      const m = [...document.querySelectorAll('#mod .modal')].pop();
      if (!m) { const r = document.querySelector('.bar [data-a="roll"]'); if (r) { r.click(); return 'roll'; } return 'wait'; }
      if (m.querySelector('[data-a="buy"]')) return 'buy';
      const ok = m.querySelector('[data-a="ok"]'); if (ok) { ok.click(); return 'ok'; }
      return 'modal';
    });
    if (st === 'buy') break;
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(300);
  await shot(page, 'buy');
  await closeAll(page);
  await page.evaluate(() => window.__game.ui.playerInfo(1));
  await page.waitForTimeout(400);
  await shot(page, 'rival');
  await closeAll(page);
  await page.evaluate(() => { const g = window.__game; const M = g.M; const own = Object.keys(M.own).map(Number); const mine = own.filter((i) => M.own[i].o === 0); const his = own.filter((i) => M.own[i].o === 1); window.__game.ui.trade(1); const m = [...document.querySelectorAll('#mod .modal')].pop(); if (his[0] != null) m.querySelector(`.tchip[data-c="${his[0]}"]`).click(); });
  await page.waitForTimeout(400);
  await shot(page, 'trade');
  await closeAll(page);
  await page.evaluate(() => { const M = window.__game.M; for (let r = 0; r < 12; r++) M.hist.push(M.players.map((p, i) => 1500 + r * (i * 60 - 80) + Math.round(Math.sin(r + i) * 150))); M.stats.rentGot = [800, 300, 1200, 50]; M.stats.rentPaid = [400, 900, 200, 700]; M.stats.built = [5, 2, 8, 0]; window.__game.flow++; window.__game.finish(); });
  await page.waitForTimeout(800);
  await shot(page, 'results');
} });
done(errs);
