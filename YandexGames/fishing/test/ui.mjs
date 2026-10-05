// Скриншоты экранов: меню, выбор персонажа, игра, поклёвка, борьба, улов, окна. node test/ui.mjs
import { run, done } from './shot.mjs';
const O = 'test/out/';
const pre = `window.__env = { part: 'day', weather: 'sun' }; localStorage.clear();`;
let all = [];
for (const [tag, w, h, mobile, dpr] of [['d', 1280, 720, false, 1], ['m', 412, 860, true, 2]]) {
  all = all.concat(await run({ w, h, mobile, dpr, pre, steps: async (page) => {
    const sh = (n) => page.screenshot({ path: `${O}ui_${tag}_${n}.png` });
    await page.waitForTimeout(400);
    await sh('01menu');
    await page.click('.m-play'); await page.waitForTimeout(300);
    await sh('02char');
    await page.click('[data-char="f"]'); await page.waitForTimeout(400);
    await sh('03gift');
    await page.click('.b-take'); await page.waitForTimeout(400);
    await page.click('.mbox .mx'); await page.waitForTimeout(300);
    await sh('04tut');
    await page.click('.tut-ok'); await page.waitForTimeout(300);
    await sh('05idle');
    // заброс по воде
    const pt = await page.evaluate(() => { const L = __game.scene.L; return [__game.scene.W * 0.65, L.nearY - 0.5 * (L.nearY - L.farY)]; });
    await page.mouse.click(pt[0], pt[1]);
    await page.waitForTimeout(1000);
    await sh('06wait');
    await page.waitForFunction(() => __game.phase === 'bite', null, { timeout: 15000 });
    await page.waitForTimeout(150);
    await sh('07bite');
    await page.evaluate(() => (window.__forceFish = { id: 'pike', w: 3.4 }));
    await page.click('.actbtn.bite', { force: true });
    await page.waitForTimeout(200);
    // тянуть
    await page.evaluate(() => (__game.holding = true));
    await page.waitForTimeout(900);
    await sh('08fight');
    await page.waitForFunction(() => { const g = __game; if (g.fight && g.fight.T > 0.7) g.holding = false; else if (g.fight && g.fight.T < 0.3) g.holding = true; return g.phase === 'catch'; }, null, { timeout: 40000, polling: 50 });
    await page.waitForTimeout(500);
    await sh('09catch');
    await page.click('.b-keep'); await page.waitForTimeout(400);
    await sh('10after');
    for (const [sel, n] of [['.h-net', '11net'], ['.h-shop', '12shop'], ['.h-atlas', '13atlas'], ['.h-map', '14map'], ['.h-quests', '15quests'], ['.h-bait', '16bait'], ['.h-env', '17forecast'], ['.h-set', '18settings']]) {
      await page.click(sel); await page.waitForTimeout(450);
      await sh(n);
      await page.evaluate(() => __game.closeModal(true));
    }
    // золотая рыбка, уровень
    await page.evaluate(() => { const g = __game; g.cast = { x: 0, y: 0, d: 0.5, bubbles: false }; g.caught({ id: 'goldfish', w: 0.8 }); });
    await page.waitForTimeout(500);
    await sh('19wish');
    await page.click('.b-c'); await page.waitForTimeout(300);
    await page.evaluate(() => { __game.s.xp = 9999; __game.checkLevel(); });
    await page.waitForTimeout(400);
    await sh('20level');
    await page.evaluate(() => __game.closeModal(true));
    await page.evaluate(() => { const S = __game.scene; S.cat.on = true; __game.catLife = 99; });
    await page.waitForTimeout(800);
    await page.evaluate(() => __game.openCat());
    await page.waitForTimeout(300);
    await sh('21cat');
  } }));
}
done(all);
