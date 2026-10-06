// Скриншоты геймплея: 4 desktop 1920x1080 + 4 mobile 1080x1920 на язык. node promo/shots.mjs [ru|en]
import { run, done } from '../test/shot.mjs';
import { pose, saveJS } from './state.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const HINT = { ru: 'Батут подбросит высоко!', en: 'The trampoline throws you high!' };
const SCENES = [
  { L: 3, seg: 'bounce', di: -1, f: 0.55, air: 1.2, vy: 3, cy: 0.5, pitch: 0.42, coins: 214, time: 9.4, hint: true },
  { L: 9, seg: 'sweeper', di: -1, f: 0.62, air: 1.1, vy: 2, cy: -0.45, pitch: 0.46, coins: 1260, time: 31.7 },
  { L: 28, seg: 'disc', di: -1, f: 0.5, air: 1.3, vy: 2, cy: 0.6, pitch: 0.4, coins: 2480, time: 48.2 },
  { L: 33, seg: 'moving', di: -1, f: 0.5, air: 1.2, vy: 2, cy: -0.6, pitch: 0.42, coins: 3480, time: 57.9, finish: true },
];
const only = process.argv[2];
let all = [];
process.env.MOCK_SDK = '1';
for (const lang of ['ru', 'en']) {
  if (only && only !== lang) continue;
  for (const [kind, w, h, dpr, mobile] of [['desktop', 1280, 720, 1.5, false], ['mobile', 432, 768, 2.5, true]]) {
    process.env.MOCK_LANG = lang;
    for (let n = 0; n < SCENES.length; n++) {
      const sc = { ...SCENES[n], joy: mobile, hint: SCENES[n].hint ? HINT[lang] : '' };
      // на телефоне четвёртый кадр — экран скинов
      const skins = mobile && n === 3;
      all = all.concat(await run({ w, h, dpr, mobile, locale: lang === 'ru' ? 'ru-RU' : 'en-US', pre: saveJS(), steps: async (page) => {
        await page.evaluate(pose, sc);
        if (sc.finish && !skins) {
          await page.evaluate(() => { const g = __game; g.state = 'play'; g.time = 57.9; g.P.deaths = 2; g.finish(); });
          await page.waitForTimeout(3500);
        } else if (skins) {
          await page.evaluate(() => { __game.toMenu(); __game.openSkins(); });
          await page.waitForTimeout(1500);
        } else await page.waitForTimeout(2500);
        await page.screenshot({ path: `${OUT}${lang}_${kind}_${n + 1}.png` });
      } }));
    }
  }
}
done(all);
