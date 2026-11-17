// Гайд: открыть из меню, пройти по всем главам, затем из паузы и с планшета (шаги доски)
import { run, done } from './shot.mjs';
import fs from 'fs';
const mobile = process.argv[2] === 'm';
const out = process.argv[3] || 'shots/guide';
const locale = process.argv[4] || 'ru-RU';
fs.mkdirSync(out, { recursive: true });
const p = (mobile ? 'm_' : '') + locale.slice(0, 2) + '_';
const errs = await run({
  w: mobile ? 390 : 1280, h: mobile ? 844 : 720, mobile, dpr: 1, locale, debug: { quality: 'low' },
  steps: async (page) => {
    await page.click('[data-a="guide"]');
    await page.waitForTimeout(300);
    const chs = await page.$$eval('[data-gch]', (a) => a.map((x) => x.dataset.gch));
    for (const c of chs) {
      await page.click(`[data-gch="${c}"]`);
      await page.waitForTimeout(150);
      const ov = await page.evaluate(() => { const b = document.querySelector('.gbody'); return { sh: b.scrollHeight, ch: b.clientHeight, wide: document.documentElement.scrollWidth > innerWidth || b.scrollWidth > b.clientWidth + 2 }; });
      console.log(c, JSON.stringify(ov));
      await page.screenshot({ path: `${out}/${p}${c}.png` });
    }
    await page.click('.mx');
    // день 2: доска с шагами
    await page.evaluate(() => { const s = window.__save.data; s.day = 2; s.tut = { move: 1 }; s.staff.push({ id: 99, role: 'scav', name: 'Тест', look: 3, lvl: 1, loc: null }); });
    await page.click('[data-a="play"]');
    await page.waitForTimeout(800);
    for (let i = 0; i < 6; i++) {
      const tb = await page.evaluate(() => { const e = document.querySelector('.tutb'); return e ? e.textContent : null; });
      console.log('board', tb);
      await page.screenshot({ path: `${out}/${p}board_${i}.png` });
      if (!tb) break;
      if (await page.$('[data-tbn]')) await page.click('[data-tbn]');
      else if (await page.$('.tut-hl[data-tab]')) await page.click('.tut-hl[data-tab]');
      else break;
      await page.waitForTimeout(200);
    }
    await page.click('[data-open]');
    await page.waitForTimeout(1200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${p}pause.png` });
    await page.click('[data-gd]');
    await page.waitForTimeout(300);
    await page.click('.mx');
    await page.waitForTimeout(300);
    console.log('after guide close: pause modal =', !!(await page.$('.pausem')), 'paused =', await page.evaluate(() => window.__game.paused));
    const txt = await page.evaluate(() => document.querySelector('.tuttxt') && document.querySelector('.tuttxt').textContent);
    console.log('tut text:', txt);
  },
});
done(errs);
