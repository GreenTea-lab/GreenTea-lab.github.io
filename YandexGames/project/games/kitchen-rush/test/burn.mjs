// Пригорание: суп доваривается и стоит на плите, пока не сгорит
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const errs = await run({
  w: 1280, h: 720, debug: { seed: 5, fast: 1 },
  pre: `localStorage.setItem('kitchen_rush_save_v1', JSON.stringify({coins:5000,daily:{day:new Date().toISOString().slice(0,10)}}))`,
  steps: async (page) => {
    await page.evaluate(() => window.__game.startLevel(1));
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const k = __game.k;
      const st = k.tiles.find((t) => t.type === 'stove' && t.item && t.item.k === 'pot');
      Object.assign(st.item, { n: 3, kind: 'soup', ing: 'tomato', p: 0.97 });
      st.item.v++;
      window.__ev = [];
      for (let i = 0; i < 20 * 6.5; i++) { __game.step(0.05); window.__ev.push(...k.events.map((e) => e.type)); }
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'shots/burn_warn.png' });
    await page.evaluate(() => { for (let i = 0; i < 20 * 4; i++) { __game.step(0.05); } });
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'shots/burn_done.png' });
    console.log(await page.evaluate(() => { const st = __game.k.tiles.find((t) => t.type === 'stove' && t.item && t.item.k === 'pot' && t.item.n); return JSON.stringify({ burnt: st.item.burnt, burn: st.item.burn.toFixed(1) }); }));
  },
});
done(errs);
