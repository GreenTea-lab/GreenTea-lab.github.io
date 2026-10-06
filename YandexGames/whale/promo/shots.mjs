// Скриншоты геймплея: 4 desktop 1920x1080 + 4 mobile 1080x1920 на язык. node promo/shots.mjs
import { run, done } from '../test/shot.mjs';
import { MID, LATE } from './state.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const SCENES = [
  { st: MID, migr: 0, act: 'mega', tab: 'town' },
  { st: { ...LATE, stage: 5 }, migr: 2, act: 'island', tab: 'town' },
  { st: LATE, migr: 3, act: 'gull', tab: 'whale' },
  { st: LATE, migr: 4, act: 'wind', tab: 'up' },
];
let all = [];
process.env.MOCK_SDK = '1';
for (const lang of ['ru', 'en']) {
  for (const [kind, w, h, dpr, mobile] of [['desktop', 1280, 720, 1.5, false], ['mobile', 432, 768, 2.5, true]]) {
    process.env.MOCK_LANG = lang;
    for (let n = 0; n < SCENES.length; n++) {
      const sc = SCENES[n];
      const st = { ...sc.st, migr: sc.migr, pearls: sc.migr * 14, pearlsEver: sc.migr * 14 };
      all = all.concat(await run({ w, h, dpr, mobile, locale: lang === 'ru' ? 'ru-RU' : 'en-US', pre: `localStorage.setItem('whale_town_save_v1', ${JSON.stringify(JSON.stringify(st))})`, steps: async (page) => {
        await page.evaluate((sc) => {
          const g = __game;
          g.startPlay();
          g.closeModal(true);
          document.getElementById('toasts').style.display = 'none';
          g.checkGoals = () => {};
          g.tab = sc.tab;
          g.renderPanel(true);
          g.gullT = 1e9;
          const S = g.scene;
          g.s.miles = 0.55 * 90 * Math.pow(1.33, g.s.island);
          if (sc.act === 'mega') {
            g.startMega();
            let i = 0;
            const tick = () => { if (i++ < 18) { g.tap(S.cx + (Math.random() - 0.5) * S.Lw * 0.6, S.cy - S.Hb * (0.1 + Math.random() * 0.6)); setTimeout(tick, 110); } };
            tick();
          }
          if (sc.act === 'island') g.s.miles = 1e9;
          if (sc.act === 'gull') { S.gull = { p: 0.5, dur: 1e9 }; S.islandK = 0.92; }
          if (sc.act === 'wind') { g.windEnd = Date.now() + 251000; S.islandK = 0.8; for (let i = 0; i < 6; i++) setTimeout(() => g.tap(S.cx, S.cy - S.Hb * 0.4), i * 120); }
        }, sc);
        await page.waitForTimeout(sc.act === 'mega' ? 2300 : 1400);
        await page.screenshot({ path: `${OUT}${lang}_${kind}_${n + 1}.png` });
      } }));
    }
  }
}
done(all);
