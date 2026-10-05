// Скриншоты основных экранов
import { run, done } from './shot.mjs';
const O = 'test/out/';
let all = [];
const solveWord = async (page, n) => page.evaluate((n) => {
  const g = window.__app.game; const pz = g.pz;
  for (let k = 0; k < n; k++) { const e = pz.entries.find((x) => !pz.solved.has(x.id)); if (!e) break; g.selectEntry(e.id, true); for (const i of e.cells) if (!pz.locked(i)) { g.sel = i; g.type(pz.cells[i].ch); } }
}, n);
for (const [name, w, h, mobile] of [['phone', 390, 800, true], ['desk', 1366, 768, false], ['small', 360, 640, true]]) {
  all = all.concat(await run({ w, h, mobile, dpr: mobile ? 2 : 1, steps: async (page) => {
    await page.screenshot({ path: O + name + '_menu.png' });
    await page.click('.m-levels'); await page.waitForTimeout(300);
    await page.screenshot({ path: O + name + '_levels.png' });
    await page.evaluate(() => window.__app.openLevel(0)); await page.waitForTimeout(400);
    await page.screenshot({ path: O + name + '_game0.png' });
    await page.evaluate(() => { window.__app.save.data.tutDone = true; window.__app.openLevel(60); }); await page.waitForTimeout(300);
    await solveWord(page, 3);
    await page.evaluate(() => { const g = window.__app.game; const e = g.pz.entries.find((x) => !g.pz.solved.has(x.id)); g.selectEntry(e.id); g.type(e.word[0]); g.type('Ж'); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: O + name + '_game60.png' });
    await page.click('.t-check'); await page.waitForTimeout(300);
    await page.screenshot({ path: O + name + '_check.png' });
    await page.evaluate(() => window.__app.openLevel(1)); await page.waitForTimeout(200);
    await solveWord(page, 20); await page.waitForTimeout(1600);
    await page.screenshot({ path: O + name + '_win.png' });
    await page.evaluate(() => window.__app.closeModal(true));
    await page.click('.g-set'); await page.waitForTimeout(300);
    await page.screenshot({ path: O + name + '_settings.png' });
  } }));
}
done(all);
