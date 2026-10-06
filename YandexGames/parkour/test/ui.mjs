// Скриншоты экранов: node test/ui.mjs [d|m]
import { run, done } from './shot.mjs';
const O = 'test/out/';
const only = process.argv[2];
let all = [];
for (const [tag, w, h, mobile, dpr] of [['d', 1280, 720, false, 1], ['m', 412, 860, true, 2]]) {
  if (only && only !== tag) continue;
  all = all.concat(await run({ w, h, mobile, dpr, pre: 'localStorage.clear()', steps: async (page) => {
    const sh = (n) => page.screenshot({ path: `${O}ui_${tag}_${n}.png` });
    await page.waitForTimeout(600);
    await sh('01menu');
    await page.click('.m-play', { force: true }); await page.waitForTimeout(700);
    await sh('02start');
    // бег вперёд с прыжками
    if (!mobile) {
      await page.keyboard.down('KeyW'); await page.waitForTimeout(900);
      await page.keyboard.press('Space'); await page.waitForTimeout(300);
      await sh('03run');
      await page.keyboard.up('KeyW');
    } else {
      await page.touchscreen.tap(100, 700);
      await page.waitForTimeout(300);
      await sh('03run');
    }
    await page.evaluate(() => __game.finish()); await page.waitForTimeout(1900);
    await sh('04finish');
    await page.evaluate(() => { const g = __game; g.s.max = 23; g.s.coins = 4200; for (let i = 1; i < 23; i++) g.s.stars[i] = 1 + (i % 3); g.closeModal(true); g.toMenu(); g.openLevels(); });
    await page.waitForTimeout(400); await sh('05levels');
    await page.evaluate(() => { __game.closeModal(true); __game.openSkins(); }); await page.waitForTimeout(400); await sh('06skins');
    await page.evaluate(() => { __game.closeModal(true); __game.openShop(); }); await page.waitForTimeout(400); await sh('07shop');
    await page.evaluate(() => { __game.closeModal(true); __game.openSettings(); }); await page.waitForTimeout(300); await sh('08settings');
    await page.evaluate(() => { __game.closeModal(true); __game.openGift(); }); await page.waitForTimeout(300); await sh('09gift');
    for (const L of [8, 17, 28, 37]) {
      await page.evaluate((L) => { __game.closeModal(true); __game.startLevel(L); }, L);
      await page.waitForTimeout(1800);
      await sh('10lv' + L);
    }
    await page.evaluate(() => __game.openPause()); await page.waitForTimeout(300); await sh('11pause');
  } }));
}
done(all);
