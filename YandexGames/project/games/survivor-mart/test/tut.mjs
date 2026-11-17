// Обучение: день 1 с ботом, вечер, ночь, сон; снимки плашки и указателей
import { run, done } from './shot.mjs';
import fs from 'fs';
const mobile = process.argv[2] === 'm';
const out = process.argv[3] || 'shots/tut';
fs.mkdirSync(out, { recursive: true });
const p = mobile ? 'm_' : '';
const errs = await run({
  w: mobile ? 390 : 1280, h: mobile ? 844 : 720, mobile, dpr: mobile ? 2 : 1, debug: { bot: 1, quality: 'low', sub: 10 },
  steps: async (page) => {
    const st = () => page.evaluate(() => { const g = window.__game, w = g.w, u = g.ui; return w ? `${w.phase} ${w.hour.toFixed(1)} tut=${u.tut && u.tut.id} served=${w.sum.served} sleeping=${w.sleeping} modal=${u.modalOpen}` : g.state; });
    await page.click('[data-a="play"]');
    await page.waitForTimeout(800);
    await page.click('[data-open]');
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(700);
      const s = await st();
      const id = s.split('tut=')[1].split(' ')[0];
      if (!seen.has(id)) {
        seen.add(id);
        console.log(i, s);
        await page.screenshot({ path: `${out}/${p}${String(seen.size).padStart(2, '0')}_${id}.png` });
      }
      if (seen.has('loot') && seen.has('bench') && i > 30) break;
    }
    // вечер и ночь
    await page.evaluate(() => { const w = window.__game.w; w.hour = 19.9; });
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(700);
      const s = await st();
      if (s.includes('modal=true')) {
        console.log('card', s);
        await page.screenshot({ path: `${out}/${p}card_${i}.png` });
        await page.click('[data-k]');
      }
      const id = s.split('tut=')[1].split(' ')[0];
      if (!seen.has(id)) {
        seen.add(id);
        console.log(i, s);
        await page.screenshot({ path: `${out}/${p}${String(seen.size).padStart(2, '0')}_${id}.png` });
      }
      if (s.startsWith('night') && i > 30) break;
    }
    // сон
    await page.evaluate(() => { const w = window.__game.w; w.zs.forEach((z) => (z.dead = 1)); w.spawnPlan.length = 0; w.hour = 26; w.nightT = 0.6 * 150; w.P.x = -1.6; w.P.z = -10.0; w.sleep(); });
    await page.waitForTimeout(1500);
    console.log('sleep', await st());
    await page.screenshot({ path: `${out}/${p}zz_sleep.png` });
  },
});
done(errs);
