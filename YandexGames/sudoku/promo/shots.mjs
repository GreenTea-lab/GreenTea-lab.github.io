// Скриншоты геймплея: 4 desktop 1920x1080 + 4 mobile 1080x1920 на язык. node promo/shots.mjs
import { run, done } from '../test/shot.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const SCENES = [
  { key: 'lvl:easy:6', theme: 'night', fill: 22, notes: 0, sel: 'empty' },
  { key: 'lvl:hard:4', theme: 'night', fill: 14, notes: 6, sel: 'same' },
  { key: 'lvl:medium:9', theme: 'dawn', fill: 26, notes: 3, sel: 'empty' },
  { key: 'lvl:expert:2', theme: 'night', fill: 30, notes: 8, sel: 'same', burst: true },
];
let all = [];
for (const lang of ['ru', 'en']) {
  for (const [kind, w, h, dpr, mobile] of [['desktop', 1920, 1080, 1, false], ['mobile', 432, 768, 2.5, true]]) {
    process.env.MOCK_SDK = '1';
    process.env.MOCK_LANG = lang;
    all = all.concat(await run({ w, h, dpr, mobile, locale: lang === 'ru' ? 'ru-RU' : 'en-US', steps: async (page) => {
      for (let n = 0; n < SCENES.length; n++) {
        const sc = SCENES[n];
        await page.evaluate((sc) => {
          const A = window.__app;
          A.save.data.tutDone = true;
          A.save.data.coins = 260;
          A.save.data.settings.theme = sc.theme;
          document.documentElement.dataset.theme = sc.theme;
          A.scene.setTheme(sc.theme);
          A.closeModal(true);
          delete A.save.data.ip[sc.key];
          A.openGame(sc.key);
          const b = A.board;
          // заполняем часть клеток верными цифрами, вразброс
          let k = 0;
          for (let s = 0; s < 81 && k < sc.fill; s++) {
            const i = (s * 37) % 81;
            if (!b.vals[i]) { b.vals[i] = b.sol[i]; k++; }
          }
          // заметки в нескольких пустых клетках: верная цифра и пара вариантов
          let m = 0;
          for (let s = 0; s < 81 && m < sc.notes; s++) {
            const i = (s * 53 + 7) % 81;
            if (!b.vals[i]) { const d = b.sol[i]; b.notes[i] = (1 << (d - 1)) | (1 << ((d + s) % 9)) | (s % 2 ? 1 << ((d + 3) % 9) : 0); m++; }
          }
          b.time = 200 + sc.fill * 9;
          let sel = b.vals.findIndex((v, i) => !v && !b.notes[i] && i > 30);
          if (sc.sel === 'same') sel = b.vals.findIndex((v, i) => v && !b.givens[i] && i > 20);
          b.select(sel);
          b.render();
          b.setCoins(260);
          b._tick();
          document.getElementById('toast').innerHTML = '';
          if (sc.burst) { const r = b.cells[40].getBoundingClientRect(); A.scene.burst(r.left + r.width / 2, r.top, 22); }
        }, sc);
        await page.waitForTimeout(sc.burst ? 700 : 500);
        await page.screenshot({ path: `${OUT}${lang}_${kind}_${n + 1}.png` });
      }
    } }));
  }
}
done(all);
