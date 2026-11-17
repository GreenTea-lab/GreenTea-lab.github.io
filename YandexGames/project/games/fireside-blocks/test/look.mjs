// Скриншоты основных экранов: node test/look.mjs
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/shots/';
const all = [];
for (const [tag, w, h, mobile] of [['d', 1280, 720, false], ['m', 390, 844, true]]) {
  all.push(...(await run({ w, h, mobile, dpr: mobile ? 2 : 1, steps: async (page) => {
    await page.screenshot({ path: `${out}${tag}_menu.png` });
    await page.evaluate(() => { const s = window.__save.data; s.tut.classic = 1; for (let i = 0; i < 9; i++) s.levels[i] = { stars: 3 - (i % 2) }; });
    await page.evaluate(() => window.__game.startClassic(false));
    await page.waitForTimeout(400);
    // несколько ходов ботом
    await page.evaluate(async () => {
      const { } = {};
      const g = window.__game;
      for (let k = 0; k < 7; k++) {
        const st = g.st.game;
        const slot = st.tray.findIndex(Boolean);
        // ищем любое место
        const N = 8;
        outer: for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const ev = st.tray[slot]; if (!ev) break outer; try { const before = st.moves; g.placeAt(slot, x, y); if (st.moves > before) break outer; } catch (e) {} }
      }
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}${tag}_classic.png` });
    await page.evaluate(() => { window.__game.toMenu(); window.__game.ui.levels(); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}${tag}_levels.png` });
    await page.evaluate(() => window.__game.startLevel(9));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}${tag}_intro.png` });
    await page.evaluate(() => window.__game.ui.closeModal());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}${tag}_adv.png` });
  } })));
}
done(all);
