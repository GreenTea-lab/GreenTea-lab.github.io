// Обучение целиком: все шаги на ПК и телефоне, RU и EN, плюс «Пропустить». node test/tut.mjs
import { run, done } from './shot.mjs';
const O = 'test/out/';
const pre = `window.__env = { part: 'day', weather: 'sun' }; localStorage.clear();`;
let all = [];
for (const [tag, w, h, mobile, dpr, locale] of [['d', 1280, 720, false, 1, 'ru-RU'], ['m', 412, 860, true, 2, 'ru-RU'], ['de', 1280, 720, false, 1, 'en-US'], ['me', 390, 844, true, 2, 'en-US']]) {
  all = all.concat(await run({ w, h, mobile, dpr, pre, locale, steps: async (page) => {
    const sh = (n) => page.screenshot({ path: `${O}tut_${tag}_${n}.png` });
    const step = () => page.evaluate(() => __game.tutor.i);
    const tap = async (sel) => { const b = await page.$(sel); const r = await b.boundingBox(); if (mobile) await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); else await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); };
    await page.click('.m-play'); await page.waitForTimeout(300);
    await page.click('[data-char="m"]'); await page.waitForTimeout(400);
    await page.click('.b-take'); await page.waitForTimeout(400);
    await page.click('.mbox .mx'); await page.waitForTimeout(400);
    await sh('01intro');
    if ((await step()) !== 0) throw new Error('tutor not at intro');
    await tap('.t-next'); await page.waitForTimeout(400);
    await sh('02cast');
    // заброс по подсвеченному месту
    const ring = await page.$eval('.t-ring', (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    if (mobile) await page.touchscreen.tap(ring[0], ring[1]); else await page.mouse.click(ring[0], ring[1]);
    await page.waitForFunction(() => __game.phase === 'wait', null, { timeout: 8000 });
    await page.waitForTimeout(700);
    await sh('03wait');
    await page.waitForFunction(() => __game.phase === 'bite', null, { timeout: 15000 });
    await page.waitForTimeout(5000); // окно поклёвки в обучении не закрывается
    if ((await page.evaluate(() => __game.phase)) !== 'bite') throw new Error('bite expired during tutorial');
    await sh('04hook');
    await page.evaluate(() => (window.__forceFish = { id: 'perch', w: 0.4 }));
    await tap('.actbtn.bite');
    await page.waitForTimeout(500);
    await sh('05fight');
    await page.waitForFunction(() => { const g = __game; if (g.fight && g.fight.T > 0.6) g.holding = false; else g.holding = true; return g.phase === 'catch'; }, null, { timeout: 60000, polling: 50 });
    await page.waitForTimeout(400);
    await page.click('.b-keep'); await page.waitForTimeout(500);
    const names = ['06net', '07bait', '08shop', '09quests', '10atlas', '11map', '12env', '13set', '14end'];
    for (const n of names) {
      await sh(n);
      await tap('.t-next'); await page.waitForTimeout(350);
    }
    const st = await page.evaluate(() => [__game.tutor.on, __game.s.tutDone]);
    if (st[0] || !st[1]) throw new Error('tutorial did not finish ' + st);
    await sh('15after');
    // заново из настроек и «Пропустить»
    await page.click('.h-set'); await page.waitForTimeout(400);
    await sh('16settings');
    await page.click('.b-hints'); await page.waitForTimeout(200);
    await page.click('.b-tut'); await page.waitForTimeout(400);
    if ((await step()) !== 0) throw new Error('restart failed');
    await tap('.t-skip'); await page.waitForTimeout(400);
    await sh('17skipped');
    const st2 = await page.evaluate(() => [__game.tutor.on, __game.s.tutDone, __game.s.settings.hints, document.querySelector('.act').textContent.trim()]);
    if (st2[0] || !st2[1] || st2[2] !== false || st2[3]) throw new Error('skip/hints wrong ' + st2);
  } }));
}
done(all);
