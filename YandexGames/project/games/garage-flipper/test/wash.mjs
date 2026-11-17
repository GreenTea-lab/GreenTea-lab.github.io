// Мойка до 100%, подсветка остатков грязи, открытие свёрнутого меню кнопкой инструмента: node test/wash.mjs
import { run, done } from './shot.mjs';
const O = 'test/out/';
const res = await run({ w: 1280, h: 720, mobile: false, dpr: 1, pre: 'localStorage.clear()', steps: async (page) => {
  const wait = (ms) => page.waitForTimeout(ms);
  const out = {};
  await wait(500);
  await page.click('.b-ok', { force: true }); await wait(200);
  await page.evaluate(() => { const g = __game; g._ensureMarket(); const L = g.s.market.list[0]; g.buyLot(L.id, L.ask); });
  await wait(1200);
  await page.evaluate(() => __game.closeModal(true));
  await page.click('[data-tool="wash"]', { force: true }); await wait(800);
  // отмыть всё, кроме левого борта (имитация: тёрли везде, где видно спереди-справа)
  out.start = await page.evaluate(() => __game.view.dirtLeft());
  await page.evaluate(() => { const v = __game.view; const W = v.mask.c.width, H = v.mask.c.height;
    for (let t = 0; t < W * H; t += 1) { const k = v.maskKeys[v.maskLab[t]]; if (v.maskLab[t] >= 0 && !/L$/.test(k)) { const x = t % W, y = (t / W) | 0; v.mask.x.fillStyle = '#000'; v.mask.x.fillRect(x, y, 1, 1); } }
    v.mask.tex.needsUpdate = true; __game._washDirty = true; });
  await page.waitForFunction(() => !__game._washDirty, null, { timeout: 60000 }); await wait(300);
  out.partial = await page.evaluate(() => __game.s.car.dirt);
  await page.click('.b-dirtwhere', { force: true }); await wait(1800);
  await page.evaluate(() => { __game._dirtShow = 0; __game._washIdle = -999; __game.g.view.yaw = __game.g.view.tyaw; });
  await wait(1500);
  await page.screenshot({ path: O + 'wash_nohint.png' });
  await page.evaluate(() => { __game._dirtShow = 99; });
  await wait(1500);
  await page.screenshot({ path: O + 'wash_hint.png' });
  out.yaw = await page.evaluate(() => __game.g.view.tyaw);
  // домыть остальное
  await page.evaluate(() => { const v = __game.view; v.mask.x.fillStyle = '#000'; v.mask.x.fillRect(0, 0, v.mask.c.width, v.mask.c.height); v.mask.tex.needsUpdate = true; __game._washDirty = true; });
  await page.waitForFunction(() => !__game._washDirty, null, { timeout: 60000 }); await wait(300);
  out.final = await page.evaluate(() => __game.s.car.dirt);
  // свёрнутое меню открывается кнопкой инструмента
  await page.click('.pcol', { force: true }); await wait(400);
  out.closed = await page.evaluate(() => document.body.classList.contains('pclosed'));
  await page.click('[data-tool="sell"]', { force: true }); await wait(400);
  out.reopened = !(await page.evaluate(() => document.body.classList.contains('pclosed')));
  console.log(JSON.stringify(out));
} });
done(res);
