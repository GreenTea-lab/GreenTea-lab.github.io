// Быстрые снимки гаража с машиной на разных экранах: node test/ui2.mjs [tags]
import { run, done } from './shot.mjs';
const O = 'test/out/';
const only = process.argv[2];
const sizes = [['m', 412, 860, true, 2], ['l', 844, 390, true, 2], ['d', 1280, 720, false, 1]];
let all = [];
for (const [tag, w, h, mobile, dpr] of sizes) {
  if (only && !only.includes(tag)) continue;
  all = all.concat(await run({ w, h, mobile, dpr, pre: 'localStorage.clear()', steps: async (page) => {
    const sh = (n) => page.screenshot({ path: `${O}u2_${tag}_${n}.png` });
    const wait = (ms) => page.waitForTimeout(ms);
    await wait(500);
    await page.click('.b-ok', { force: true }); await wait(200);
    await page.evaluate(() => { const g = __game; g._ensureMarket(); const L = g.s.market.list[0]; g.buyLot(L.id, L.ask); });
    await wait(1200);
    await page.evaluate(() => __game.closeModal(true));
    await page.evaluate(() => { __game.s.tut.step = 9; __game.tutHint(); });
    await wait(1500);
    await sh('1info');
    await page.click('[data-tool="wash"]', { force: true }); await wait(1200);
    await sh('2wash');
    await page.click('[data-tool="mech"]', { force: true }); await wait(3500);
    await sh('3mech');
    await page.evaluate(() => { __game.g.focus({ tyaw: __game.g.nearYaw(0.3), tpitch: 0.5, tdist: 5.2 }); }); await wait(2500);
    await sh('4mech2');
    await page.click('[data-tool="body"]', { force: true }); await wait(1000);
    await page.evaluate(() => __game.select('fenderR')); await wait(600);
    await sh('5body');
    if (tag === 'm') {
      await page.evaluate(() => __game.setSheet('max')); await wait(800);
      await sh('6max');
      await page.evaluate(() => __game.setSheet('min')); await wait(800);
      await sh('7min');
    } else {
      await page.click('.pcol', { force: true }); await wait(1200);
      await sh('6col');
    }
    await page.click('[data-tab="market"]', { force: true }); await wait(2500);
    await sh('8market');
  } }));
}
done(all);
