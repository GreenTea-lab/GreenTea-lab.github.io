// Быстрый прогон: меню, уровни, окно уровня, игра ботом, кухня
import { run, done } from './shot.mjs';
const [w, h, mob] = [+(process.argv[2] || 1280), +(process.argv[3] || 720), process.argv[4] === 'm'];
const tag = process.argv[5] || (mob ? 'm' : 'd');
const errs = await run({
  w, h, mobile: mob, debug: { bot: true, sub: 3, seed: 7 },
  steps: async (page) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `shots/${tag}_gift.png` });
    await page.evaluate(() => __game.ui.closeModal());
    await page.screenshot({ path: `shots/${tag}_menu.png` });
    await page.click('[data-a=play]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `shots/${tag}_levels.png` });
    await page.click('.lcard[data-i="0"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `shots/${tag}_intro.png` });
    await page.click('[data-go]');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `shots/${tag}_start.png` });
    await page.waitForTimeout(12000);
    await page.screenshot({ path: `shots/${tag}_play.png` });
    const st = await page.evaluate(() => ({ t: __game.k.t, score: __game.k.score, served: __game.k.served, orders: __game.k.orders.length }));
    console.log('state', JSON.stringify(st));
    await page.evaluate(() => __game.ui.menu());
    await page.waitForTimeout(300);
    await page.click('[data-a=kitchen]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `shots/${tag}_kitchen.png` });
    await page.click('[data-tab=chefs]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `shots/${tag}_chefs.png` });
  },
});
done(errs);
