// Скриншоты экранов: node test/ui.mjs [d|m]
import { run, done } from './shot.mjs';
const O = 'test/out/';
const only = process.argv[2];
let all = [];
for (const [tag, w, h, mobile, dpr] of [['d', 1280, 720, false, 1], ['m', 412, 860, true, 2]]) {
  if (only && only !== tag) continue;
  all = all.concat(await run({ w, h, mobile, dpr, pre: 'localStorage.clear()', steps: async (page) => {
    const sh = (n) => page.screenshot({ path: `${O}ui_${tag}_${n}.png` });
    const wait = (ms) => page.waitForTimeout(ms);
    await wait(800);
    await sh('01welcome');
    await page.click('.b-ok', { force: true }); await wait(300);
    await sh('02empty');
    await page.click('[data-tab="market"]', { force: true }); await wait(4000);
    await sh('03market');
    const id = await page.evaluate(() => __game.s.market.list[0].id);
    await page.evaluate((id) => __game.openLot(id), id); await wait(2500);
    await sh('04lot');
    await page.click('.b-haggle', { force: true }); await wait(300);
    await page.click('[data-pc="20"]', { force: true });
    await page.click('.b-off', { force: true }); await wait(1600);
    await sh('05chat');
    await page.evaluate((id) => { const g = __game; const L = g._lot(id); g.buyLot(id, L ? L.ask : 20000); }, id); await wait(1500);
    await sh('06garage');
    await page.click('[data-tool="wash"]', { force: true }); await wait(600);
    // мойка: провести по машине
    const box = await page.evaluate(() => { const r = __game.cv.getBoundingClientRect(); return [r.width, r.height]; });
    const cx = box[0] * (tag === 'd' ? 0.4 : 0.5), cy = box[1] * (tag === 'd' ? 0.55 : 0.32);
    await page.mouse.move(cx - 120, cy); await page.mouse.down();
    for (let i = 0; i < 30; i++) await page.mouse.move(cx - 120 + i * 8, cy + Math.sin(i) * 20);
    await page.mouse.up(); await wait(800);
    await sh('07wash');
    await page.click('[data-tool="body"]', { force: true }); await wait(400);
    await sh('08body');
    await page.evaluate(() => __game.select('fenderR')); await wait(400);
    await sh('09panel');
    await page.click('[data-job="rust"]', { force: true }); await wait(500);
    await sh('10grind');
    await wait(1600);
    await page.click('[data-tool="mech"]', { force: true }); await wait(1500);
    await sh('11mech');
    await page.evaluate(() => { __game.s.up.booth = 2; }); await page.click('[data-tool="paint"]', { force: true }); await wait(400);
    await sh('12paint');
    await page.click('[data-tool="sell"]', { force: true }); await wait(400);
    await page.click('.b-list', { force: true }); await wait(9000);
    await sh('13sell');
    await page.click('[data-tab="up"]', { force: true }); await wait(400);
    await sh('14up');
    await page.click('[data-tab="rec"]', { force: true }); await wait(300);
    await sh('15rec');
  } }));
}
done(all);
