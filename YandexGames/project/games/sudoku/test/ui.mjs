// Скриншоты основных экранов на телефоне, ноутбуке и маленьком телефоне. node test/ui.mjs [фильтр]
import { run, done } from './shot.mjs';
import fs from 'fs';
const O = 'test/out/';
fs.mkdirSync(O, { recursive: true });
const only = process.argv[2];
let all = [];
const fill = (page, n) =>
  page.evaluate((n) => {
    const b = window.__app.board;
    let k = 0;
    for (let i = 0; i < b.G.size && k < n; i++)
      if (!b.vals[i]) {
        b.select(i);
        b.input(b.sol[i]);
        k++;
      }
  }, n);
// сырые ключи перевода на экране (например «it_moon») — ошибка
const rawKeys = (page) => page.evaluate(() => (document.body.innerText.match(/\b(?:[a-z]+_[a-zA-Z0-9_]+|h[A-Z][a-zA-Z]+|tut\d\w*)\b/g) || []).filter((w) => !/^(sdk|vol)_/.test(w)));
const SIZES = [
  ['phone', 390, 800, true],
  ['desk', 1366, 768, false],
  ['small', 360, 640, true],
  ['tablet', 820, 1180, true],
];
for (const [name, w, h, mobile] of SIZES) {
  if (only && !name.startsWith(only)) continue;
  all = all.concat(
    await run({
      w,
      h,
      mobile,
      dpr: mobile ? 2 : 1,
      steps: async (page) => {
        const shot = async (n) => {
          await page.waitForTimeout(250);
          const raw = await rawKeys(page);
          if (raw.length) all.push(`RAW KEYS on ${name}_${n}: ${raw.join(', ')}`);
          await page.screenshot({ path: O + name + '_' + n + '.png' });
        };
        await shot('menu');
        await page.click('.m-path');
        await shot('path');
        await page.click('.gcard[data-g="0"]');
        await shot('levels');
        await page.evaluate(() => window.__app.openGame('p:0'));
        await shot('tut1');
        await page.click('.tp-ok');
        await shot('tut2');
        await page.click('.tp-skip');
        // игра посередине: сложный уровень, заметки, ошибка
        await page.evaluate(() => window.__app.openGame('p:400'));
        await fill(page, 12);
        await page.evaluate(() => {
          const b = window.__app.board;
          b.toggleNotes();
          const i = b.vals.findIndex((v) => !v);
          b.select(i);
          b.input(1);
          b.input(4);
          b.input(7);
          b.toggleNotes();
          const j = b.vals.findIndex((v, k) => !v && k > i + 3);
          b.select(j);
        });
        await page.waitForTimeout(1500);
        await shot('game');
        await page.click('.t-hint');
        await shot('hint');
        await page.click('.hp-ok');
        // диагональное и 6×6
        await page.evaluate(() => window.__app.openGame('f:diag:1:0'));
        await fill(page, 8);
        await page.waitForTimeout(1200);
        await shot('diag');
        await page.evaluate(() => window.__app.openGame('f:mini:0:0'));
        await shot('mini');
        await page.click('.g-time');
        await shot('pause');
        await page.click('.g-resume');
        await page.evaluate(() => window.__app.openGame('p:1'));
        await fill(page, 81);
        await page.waitForTimeout(2300);
        await shot('win');
        await page.evaluate(() => {
          window.__app.closeModal(true);
          window.__app.save.data.solved = 30;
          window.__app.S.season = 0;
          window.__app.renderGarden();
          window.__app.show('garden');
        });
        await page.waitForTimeout(1300);
        await shot('garden');
        await page.evaluate(() => {
          window.__app.save.data.solved = 400;
          window.__app.S.season = 3;
          window.__app.renderGarden();
        });
        await page.waitForTimeout(1300);
        await shot('garden_winter');
        await page.evaluate(() => {
          window.__app.S.season = 1;
          window.__app.renderGarden();
        });
        await page.waitForTimeout(1300);
        await shot('garden_summer');
        await page.evaluate(() => {
          window.__app.S.season = 2;
          window.__app.renderGarden();
        });
        await page.waitForTimeout(1300);
        await shot('garden_autumn');
        await page.evaluate(() => window.__app.show('quick') || window.__app.renderQuick());
        await shot('quick');
        await page.evaluate(() => {
          window.__app.renderMenu();
          window.__app.show('menu');
          window.__app.openDaily();
        });
        await shot('daily');
        await page.evaluate(() => window.__app.openAchievements());
        await shot('ach');
        await page.evaluate(() => window.__app.openRecords('st'));
        await shot('stats');
        await page.evaluate(() => window.__app.openSettings());
        await shot('settings');
      },
    }),
  );
}
done(all);
