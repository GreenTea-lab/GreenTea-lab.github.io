// Три размера текста и три темы: меню, игра, уровни, победа на телефоне и ноутбуке. node test/themes.mjs
import { run, done } from './shot.mjs';
const O = 'test/out/';
let all = [];
const combos = [[0, 'night'], [2, 'night'], [1, 'dawn'], [2, 'contrast']];
for (const [name, w, h, mobile] of [['phone', 390, 800, true], ['small', 360, 640, true], ['desk', 1366, 768, false]])
  all = all.concat(await run({ w, h, mobile, dpr: mobile ? 2 : 1, steps: async (page) => {
    for (const [tx, th] of combos) {
      await page.evaluate(([tx, th]) => {
        const A = window.__app;
        A.closeModal(true);
        Object.assign(A.save.data.settings, { text: tx, theme: th });
        A.save.data.tutDone = true;
        A.applySettings();
        A.openGame('p:59');
      }, [tx, th]);
      await page.waitForTimeout(700);
      const ov = await page.evaluate(() => {
        const r = document.querySelector('#game .pad')?.getBoundingClientRect();
        const b = document.querySelector('#game .board')?.getBoundingClientRect();
        return { padBottom: r && Math.round(r.bottom), board: b && Math.round(b.width), H: innerHeight, sw: document.documentElement.scrollWidth, W: innerWidth };
      });
      if (ov.padBottom > ov.H + 1 || ov.sw > ov.W) all.push(`OVERFLOW ${name} t${tx} ${th}: ${JSON.stringify(ov)}`);
      await page.screenshot({ path: `${O}th_${name}_t${tx}_${th}_game.png` });
      await page.evaluate(() => { window.__app.renderMenu(); window.__app.show('menu'); });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${O}th_${name}_t${tx}_${th}_menu.png` });
    }
  } }));
done(all);
