// Скриншоты геймплея: 4 desktop 1920x1080 + 4 mobile 1080x1920 на язык. node promo/shots.mjs
import { run, done } from '../test/shot.mjs';
import { FARM } from './farm.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
// поля: 0 (0,16) 1 (25,16) 2 (-25,16) 3 (0,36) 4 (25,36) 5 (-25,36)
const SCENES = [
  { opt: { harvest0: 0.35, tr: 'red' }, place: [-6, 13.3, Math.PI / 2, 'harvest', 28], dir: [1, 0, 0.6] },
  { opt: { wild5: 0, plow5: 0.4, tr: 'green' }, place: [-30, 34.2, Math.PI / 2, 'plow', 0], dir: [1, 0, 0.6] },
  { opt: { sow4: 0.45, tr: 'blue', time: 480 * 0.42 }, place: [21, 34.3, Math.PI / 2, 'seed', 0], dir: [1, 0, 0.6] },
  { opt: { harvest0: 0.6, tr: 'gold', time: 480 * 0.47 }, place: [-8, 4.5, Math.PI, 'harvest', 55], dir: [0, -1, 0.5], sell: true },
];
let all = [];
for (const lang of ['ru', 'en']) {
  for (const [kind, w, h, dpr, mobile] of [['desktop', 1920, 1080, 1, false], ['mobile', 432, 768, 2.5, true]]) {
    process.env.MOCK_SDK = '1';
    process.env.MOCK_LANG = lang;
    all = all.concat(await run({ w, h, dpr, mobile, locale: lang === 'ru' ? 'ru-RU' : 'en-US', pre: `(${FARM})()`, steps: async (page) => {
      await page.evaluate(() => { const g = window.__game; g.startPlay(); g.closeModal(true); });
      for (let n = 0; n < SCENES.length; n++) {
        const sc = SCENES[n];
        await page.evaluate((sc) => {
          window.__promoFarm(sc.opt);
          window.__place(...sc.place);
          window.__game.autoDir = sc.dir;
        }, sc);
        await page.waitForTimeout(sc.sell ? 2600 : 3800);
        if (sc.sell) await page.waitForFunction(() => document.querySelector('.toast'), null, { timeout: 30000 }).catch(() => {});
        await page.evaluate(() => (window.__game.autoDir = [0, 1, 0.001]));
        await page.waitForTimeout(sc.sell ? 200 : 700);
        await page.screenshot({ path: `${OUT}${lang}_${kind}_${n + 1}.png` });
      }
    } }));
  }
}
done(all);
