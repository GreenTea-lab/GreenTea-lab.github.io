// Скриншоты уровней в середине игры: node test/look.mjs <w> <h> <m|d> <levels через запятую> [секунд]
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const [W, H, mob, lv, secs] = [+process.argv[2], +process.argv[3], process.argv[4] === 'm', process.argv[5].split(',').map((x) => x - 1), +(process.argv[6] || 40)];
const errs = await run({
  w: W, h: H, mobile: mob, debug: { bot: 1, seed: 5, fast: 1 },
  pre: `localStorage.setItem('kitchen_rush_save_v1', JSON.stringify({coins:5000,daily:{day:new Date().toISOString().slice(0,10)}}))`,
  steps: async (page) => {
    for (const i of lv) {
      await page.evaluate((i) => window.__game.startLevel(i), i);
      await page.waitForTimeout(300);
      await page.evaluate((s) => { for (let k = 0; k < s * 20; k++) __game.step(0.05); }, secs);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `shots/l${i + 1}_${mob ? 'm' : 'd'}${W}.png` });
      console.log('L' + (i + 1), JSON.stringify(await page.evaluate(() => ({ score: __game.k.score, served: __game.k.served, missed: __game.k.missed, orders: __game.k.orders.length, cards: document.querySelectorAll('.ocard').length }))));
    }
  },
});
done(errs);
