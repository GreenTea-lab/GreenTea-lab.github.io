// Скриншоты основных экранов: node test/look.mjs
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/shots/';
const all = [];
for (const [name, w, h, mobile, dpr] of [['d', 1280, 720, false, 1], ['m', 390, 780, true, 2]]) {
  const errs = await run({ w, h, mobile, dpr, steps: async (page) => {
    const ev = (f, a) => page.evaluate(f, a);
    await page.screenshot({ path: `${out}${name}_menu.png` });
    await ev(() => window.__game.ui.act('journey'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}${name}_journey.png` });
    await ev(() => window.__game.startLevel(0));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}${name}_intro.png` });
    await ev(() => document.querySelector('.modal [data-go]').click());
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}${name}_l1.png` });
    await ev(() => { window.__save.data.tut = { first: 1, coin: 1, lock: 1, hidden: 1 }; window.__game.startLevel(47); });
    await page.waitForTimeout(1800);
    await ev(() => { const g = window.__game; const m = g.game.movesList()[0]; g.tap(...Object.values(g.view.tileCenter(m[0]))); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}${name}_l48.png` });
  } });
  all.push(...errs);
}
done(all);
