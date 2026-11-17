// Сцены для проверки и скриншотов: день, касса, склад, верстак, ночь, итоги
// node test/scenes.mjs [d|m] [ru|en] [outdir]
import { run, done } from './shot.mjs';
import fs from 'fs';
const mobile = process.argv[2] === 'm';
const lang = process.argv[3] || 'ru';
const out = process.argv[4] || 'shots';
fs.mkdirSync(out, { recursive: true });
const ff = async (page, sec, until) =>
  page.evaluate(
    async ([sec, until]) => {
      const g = window.__game;
      const cond = until ? new Function('w', 'return ' + until) : null;
      for (let i = 0; i < sec * 30; i++) {
        const w = g.w;
        if (!w || w.finished) break;
        w.step(1 / 30, g.bot.input(1 / 30));
        g.handleFx();
        if (cond && cond(w)) break;
      }
    },
    [sec, until]
  );
const errs = await run({
  w: mobile ? 390 : 1280, h: mobile ? 844 : 720, mobile, dpr: 1, debug: { bot: 1, quality: 'high' }, locale: lang === 'en' ? 'en-US' : 'ru-RU',
  steps: async (page) => {
    const p = `${out}/${mobile ? 'm' : 'd'}_${lang}_`;
    await page.waitForTimeout(1500);
    await page.screenshot({ path: p + 'menu.png' });
    await page.evaluate(() => { const s = window.__save.data; s.bat = 640; s.stock.wood = 12; s.stock.scrap = 9; s.stock.parts = 3; s.stock.trap = 2; s.stock.cloth = 5; s.stock.chem = 2; s.stock.blanket = 3; s.stock.medkit = 2; s.stock.flashlight = 2; });
    await page.click('[data-a="play"]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: p + 'board.png' });
    await page.click('[data-open]');
    await page.waitForTimeout(400);
    await ff(page, 70);
    await page.waitForTimeout(900);
    await page.screenshot({ path: p + 'day.png' });
    await ff(page, 120, 'w.co && w.P.atReg && w.co.bats.length > 2 && w.co.bats.some((b) => b.st === "?")');
    await page.evaluate(() => { const co = window.__game.w.co; if (co && co.bats[0]) { co.bats[0].dead = true; co.bats[0].charge = 0.04; co.bats[0].st = 'bad'; } if (co && co.bats[1]) { co.bats[1].st = 'ok'; co.bats[1].charge = 0.93; } });
    await page.waitForTimeout(900);
    await page.screenshot({ path: p + 'checkout.png' });
    await page.evaluate(() => window.__game.ui.storage());
    await page.waitForTimeout(400);
    await page.screenshot({ path: p + 'storage.png' });
    await page.evaluate(() => window.__game.ui.bench());
    await page.waitForTimeout(400);
    await page.screenshot({ path: p + 'bench.png' });
    await page.evaluate(() => window.__game.ui.closeModal());
    // вечер и ночь
    await page.evaluate(() => { window.__game.w.hour = 19.6; });
    await ff(page, 120, 'w.phase === "night" && w.nightT > 9');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: p + 'night.png' });
    await ff(page, 200);
    await page.waitForTimeout(4500);
    console.log('summary modal:', await page.evaluate(() => { const m = document.querySelector('.modal'); return m ? m.className + ' ' + getComputedStyle(m.querySelector('.mpanel')).opacity + ' ' + window.__game.state : 'none ' + window.__game.state; }));
    await page.screenshot({ path: p + 'summary.png' });
  },
});
done(errs);
