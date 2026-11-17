// Проверка подгонки под размер окна: туда-сюда меняем размер, холст должен совпадать с окном
import { run, done } from './shot.mjs';
const errs = await run({
  w: 800, h: 500,
  steps: async (page) => {
    const state = () => page.evaluate(() => { const c = document.querySelector('#game canvas'); const r = c.getBoundingClientRect(); return { win: [innerWidth, innerHeight], canvasCss: [Math.round(r.width), Math.round(r.height)], game: [__game.scale.width, __game.scale.height] }; });
    const sizes = [[1600, 900], [800, 500], [1280, 720], [420, 800], [1920, 1080], [600, 400]];
    let bad = 0;
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(1500);
      const s = await state();
      const ok = Math.abs(s.canvasCss[0] - s.win[0]) <= 1 && Math.abs(s.canvasCss[1] - s.win[1]) <= 1;
      if (!ok) bad++;
      console.log(w + 'x' + h, JSON.stringify(s), ok ? 'OK' : 'BAD');
    }
    // без событий resize: подменяем размер напрямую и ждём опрос
    console.log('bad', bad);
    if (bad) throw new Error('resize mismatch');
  },
});
done(errs);
