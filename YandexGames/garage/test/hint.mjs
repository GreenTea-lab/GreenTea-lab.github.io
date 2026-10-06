// Подсказка обучения в чате с продавцом: видна целиком внутри окна и пульсирует на месте, а не ездит. node test/hint.mjs
import { run, done } from './shot.mjs';
let all = [];
let bad = 0;
for (const [tag, w, h, mobile] of [['d', 1280, 720, false], ['m', 412, 860, true]]) {
  all = all.concat(await run({ w, h, mobile, pre: 'localStorage.clear()', steps: async (page) => {
    await page.click('.b-ok', { force: true });
    await page.click('[data-tab="market"]', { force: true });
    await page.waitForTimeout(800);
    await page.evaluate(() => __game.openSellerChat(__game.s.market.list[0].id));
    await page.waitForSelector('.inhint');
    // дождаться конца анимации появления окна
    await page.waitForFunction(() => !document.querySelector('.chatm').getAnimations({ subtree: false }).some((a) => a.playState === 'running'), null, { timeout: 90000 });
    await page.waitForTimeout(1500);
    const pts = [];
    for (let i = 0; i < 12; i++) {
      pts.push(await page.evaluate(() => {
        const r = document.querySelector('.inhint').getBoundingClientRect();
        const b = document.querySelector('.chatm').getBoundingClientRect();
        // внутри окна и экрана
        const inside = r.top >= b.top && r.bottom <= b.bottom && r.left >= b.left && r.right <= b.right && r.top >= 0 && r.bottom <= innerHeight;
        return [r.x + r.width / 2 - b.x, r.y + r.height / 2 - b.y, inside];
      }));
      await page.waitForTimeout(150);
    }
    const span = (k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
    const ok = span(0) < 2 && span(1) < 2 && pts.every((p) => p[2]);
    if (!ok) bad++;
    console.log(tag, 'сдвиг подсказки относительно окна x/y:', span(0).toFixed(1), span(1).toFixed(1), 'видна целиком:', pts.every((p) => p[2]), ok ? 'OK' : 'FAIL');
    await page.screenshot({ path: `test/out/hint_${tag}.png` });
  } }));
}
if (bad) all.push(`hint: ${bad} FAIL`);
done(all);
