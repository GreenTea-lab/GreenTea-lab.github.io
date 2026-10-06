// Скриншоты экранов: node test/ui.mjs
import { run, done } from './shot.mjs';
const O = 'test/out/';
let all = [];
for (const [tag, w, h, mobile, dpr] of [['d', 1280, 720, false, 1], ['m', 412, 860, true, 2]]) {
  all = all.concat(await run({ w, h, mobile, dpr, pre: 'localStorage.clear()', steps: async (page) => {
    const sh = (n) => page.screenshot({ path: `${O}ui_${tag}_${n}.png` });
    await page.waitForTimeout(300);
    await sh('01menu');
    await page.click('.m-play'); await page.waitForTimeout(300);
    await sh('02start');
    const S = await page.evaluate(() => { const s = __game.scene; return [s.cx, s.cy - s.Hb * 0.4]; });
    for (let i = 0; i < 25; i++) await page.mouse.click(S[0] + (i % 5) * 8, S[1]);
    await page.waitForTimeout(150);
    await sh('03taps');
    await page.click('[data-b="lemon"]'); await page.waitForTimeout(400);
    await sh('04built');
    // середина игры
    await page.evaluate(() => { const g = __game, s = g.s; s.shells = 5e6; s.stage = 3; s.b = { lemon: 30, fish: 26, light: 12, bakery: 10, mill: 4, carousel: 1 }; s.up.tap = 3; g.applyScene(); g.renderPanel(true); g.scene.gull = { p: 0.35, dur: 11 }; });
    await page.evaluate(() => { const g = __game; g.s.miles = 0.8 * 90 * Math.pow(1.33, g.s.island); });
    await page.waitForTimeout(600);
    await sh('05mid');
    await page.click('[data-tab="up"]'); await page.waitForTimeout(200);
    await sh('06up');
    await page.click('[data-tab="whale"]'); await page.waitForTimeout(200);
    await sh('07whale');
    // остров
    await page.evaluate(() => { const g = __game; g.s.miles = 1e9; });
    await page.waitForTimeout(400);
    await sh('08island');
    await page.click('[data-card="0"]'); await page.waitForTimeout(400);
    // мега-фонтан
    await page.evaluate(() => __game.startMega());
    for (let i = 0; i < 12; i++) await page.mouse.click(S[0], S[1]);
    await page.waitForTimeout(200);
    await sh('09mega');
    for (const [sel, n] of [['.h-goals', '10goals'], ['.h-set', '11settings']]) {
      await page.click(sel); await page.waitForTimeout(350);
      await sh(n);
      await page.evaluate(() => __game.closeModal(true));
    }
    await page.evaluate(() => __game.openGift()); await page.waitForTimeout(300); await sh('12gift'); await page.evaluate(() => __game.closeModal(true));
    await page.evaluate(() => { const g = __game; g.s.island = 10; g.s.all = 5e10; g.renderPanel(true); g.openMigrate(); }); await page.waitForTimeout(300); await sh('13migrate');
    await page.click('.b-go'); await page.waitForTimeout(800);
    await sh('14north');
    await page.evaluate(() => { const g = __game; g.offline = { v: 123456, sec: 5400 }; g.showOffline(); }); await page.waitForTimeout(300); await sh('15offline');
  } }));
}
done(all);
