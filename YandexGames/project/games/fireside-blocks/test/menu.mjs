import { run, done } from './shot.mjs';
const all = [];
for (const [kind, w, h, dpr, mobile] of [['d', 1280, 720, 1, false], ['m', 405, 720, 2, true], ['s', 360, 640, 2, true]]) {
  const errs = await run({ w, h, dpr, mobile, steps: async (page) => {
    await page.evaluate(() => { window.__save.data.tut.classic = 1; window.__game.toMenu(); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `/tmp/claude-0/menu_${kind}.png` });
    const r = await page.evaluate(() => [...document.querySelectorAll('.topbar,.logo,.sign,.mbtns,.tiles')].map((e) => { const b = e.getBoundingClientRect(); return e.className + ' ' + [b.left, b.top, b.width, b.height].map(Math.round).join(','); }));
    console.log(kind, r.join(' | '));
  } });
  all.push(...errs);
}
done(all);
