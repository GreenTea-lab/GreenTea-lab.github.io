// Скриншоты геймплея для консоли: 4 desktop 1920x1080 + 4 mobile 1080x1920 на язык. node promo/shots.mjs
import { run, done } from '../test/shot.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
// сцены: уровень, сколько слов решено, тема, сколько букв ввести в выбранное слово
const SCENES = [
  { lvl: 4, solve: 2, theme: 'light', typed: 2 },
  { lvl: 37, solve: 5, theme: 'light', typed: 3 },
  { daily: true, solve: 4, theme: 'dark', typed: 2 },
  { lvl: 88, solve: 6, theme: 'contrast', typed: 1 },
];
let all = [];
for (const lang of ['ru', 'en']) {
  for (const [kind, w, h, dpr, mobile] of [['desktop', 1920, 1080, 1, false], ['mobile', 432, 768, 2.5, true]]) {
    process.env.MOCK_SDK = '1';
    process.env.MOCK_LANG = lang;
    all = all.concat(await run({ w, h, dpr, mobile, locale: lang === 'ru' ? 'ru-RU' : 'en-US', steps: async (page) => {
      for (let i = 0; i < SCENES.length; i++) {
        const sc = SCENES[i];
        await page.evaluate((sc) => {
          const A = window.__app;
          A.save.data.tutDone = true;
          A.save.data.coins = 240;
          A.save.data.settings.theme = sc.theme;
          document.documentElement.dataset.theme = sc.theme;
          A.closeModal(true);
          if (sc.daily) A.openDaily(); else A.openLevel(sc.lvl);
          const g = A.game, pz = g.pz;
          // решаем часть слов, вразброс
          const order = pz.entries.slice().sort((a, b) => ((a.id * 7) % 5) - ((b.id * 7) % 5));
          for (const e of order.slice(0, sc.solve)) for (const i of e.cells) pz.letters[i] = pz.cells[i].ch;
          pz.refresh();
          const next = pz.entries.find((e) => !pz.solved.has(e.id) && e.word.length >= 5) || pz.entries.find((e) => !pz.solved.has(e.id));
          g.selectEntry(next.id, true);
          for (let k = 0; k < sc.typed; k++) {
            const i = next.cells.find((c) => !pz.letters[c]);
            if (i === undefined) break;
            pz.letters[i] = pz.cells[i].ch;
            g.sel = next.cells.find((c) => !pz.letters[c]) ?? i;
          }
          g.render();
          g.setCoins(240);
          document.getElementById('toast').innerHTML = '';
        }, sc);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}${lang}_${kind}_${i + 1}.png` });
      }
    } }));
  }
}
done(all);
