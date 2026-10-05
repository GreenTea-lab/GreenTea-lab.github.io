// Скриншоты основных экранов
import { run, done } from './shot.mjs';
const O = 'test/out/';
let all = [];
const fill = (page, n) => page.evaluate((n) => { const b = window.__app.board; let k = 0; for (let i = 0; i < 81 && k < n; i++) if (!b.vals[i]) { b.select(i); b.input(b.sol[i]); k++; } }, n);
for (const [name, w, h, mobile] of [['phone', 390, 800, true], ['desk', 1366, 768, false], ['small', 360, 640, true]]) {
  all = all.concat(await run({ w, h, mobile, dpr: mobile ? 2 : 1, steps: async (page) => {
    await page.waitForTimeout(300);
    await page.screenshot({ path: O + name + '_menu.png' });
    await page.click('.m-gardens'); await page.waitForTimeout(300);
    await page.screenshot({ path: O + name + '_gardens.png' });
    await page.evaluate(() => window.__app.openGame('lvl:easy:0')); await page.waitForTimeout(300);
    await page.screenshot({ path: O + name + '_tut.png' });
    await page.evaluate(() => { window.__app.save.data.tutDone = true; window.__app.openGame('lvl:hard:0'); });
    await fill(page, 20);
    await page.evaluate(() => { const b = window.__app.board; b.toggleNotes(); const i = b.vals.findIndex((v) => !v); b.select(i); b.input(1); b.input(4); b.input(7); b.toggleNotes(); const j = b.vals.findIndex((v, k) => !v && k > i + 3); b.select(j); b.input(b.sol[j] % 9 + 1); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: O + name + '_game.png' });
    await page.evaluate(() => { window.__app.openGame('lvl:easy:1'); }); await page.waitForTimeout(200);
    await fill(page, 81); await page.waitForTimeout(2200);
    await page.screenshot({ path: O + name + '_win.png' });
    await page.evaluate(() => { window.__app.closeModal(true); window.__app.save.data.solved = 30; window.__app.renderGarden(); window.__app.show('garden'); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: O + name + '_garden.png' });
    await page.click('#garden .x-back'); await page.click('.m-set'); await page.waitForTimeout(300);
    await page.screenshot({ path: O + name + '_settings.png' });
  } }));
}
done(all);
