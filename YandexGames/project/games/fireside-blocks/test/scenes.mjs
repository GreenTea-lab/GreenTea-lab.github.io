// Скриншоты фонов всех глав: десктоп и телефон → /tmp/claude-0/scene_<id>_<d|m>.png
import { run, done } from './shot.mjs';
const ids = (process.argv[2] || 'autumn,winter,spring,summer,sea,fair,forest,night').split(',');
const all = [];
for (const [kind, w, h, dpr, mobile] of [['d', 1280, 720, 1, false], ['m', 405, 720, 2, true]]) {
  const errs = await run({ w, h, dpr, mobile, debug: { seed: 5 }, steps: async (page) => {
    await page.evaluate(() => { window.__save.data.tut.classic = 1; });
    for (const id of ids) {
      await page.evaluate(async (id) => {
        const g = window.__game;
        const S = ['autumn', 'winter', 'spring', 'summer', 'sea', 'fair', 'forest', 'night'];
        const starts = [0, 15, 30, 45, 60, 80, 100, 120];
        g.startLevel(starts[S.indexOf(id)]);
        g.ui.closeModal();
        window.__save.data.tut.l = 1;
      }, id);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `/tmp/claude-0/scene_${id}_${kind}.png` });
    }
  } });
  all.push(...errs);
}
done(all);
