// Быстрый прогон: меню, планшет, открыть лавку, день с ботом, ночь
import { run, done } from './shot.mjs';
const mobile = process.argv[2] === 'm';
const errs = await run({
  w: mobile ? 390 : 1280, h: mobile ? 844 : 720, mobile, dpr: 1, debug: { bot: 1, quality: 'mid', sub: 4 },
  steps: async (page) => {
    const p = mobile ? 'm_' : '';
    await page.screenshot({ path: `shots/${p}menu.png` });
    await page.click('[data-a="play"]');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `shots/${p}board.png` });
    for (const tab of ['staff', 'trips', 'prices', 'build', 'gear', 'skills']) {
      await page.click(`[data-tab="${tab}"]`);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `shots/${p}tab_${tab}.png` });
    }
    await page.click('[data-tab="plan"]');
    await page.click('[data-open]');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `shots/${p}day1.png` });
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(2500);
      const st = await page.evaluate(() => { const w = window.__game.w; return w ? `${w.phase} ${w.hour.toFixed(1)} bat=${window.__save.data.bat} q=${w.queue.length} co=${!!w.co} hand=${w.P.hand ? w.P.hand.type + w.P.hand.n : '-'} spots=${w.spots.filter((s) => s.done).length}` : window.__game.state; });
      console.log(i, st);
      if (i === 3) await page.screenshot({ path: `shots/${p}day2.png` });
    }
  },
});
done(errs);
