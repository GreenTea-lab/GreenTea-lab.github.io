// Скриншоты геймплея: 4 desktop 1920x1080 + 4 mobile 1080x1920 на язык. node promo/shots.mjs
import { run, done } from '../test/shot.mjs';
import { PROMO_SAVE } from './state.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
// водоёмы: 0 пруд, 1 река, 2 озеро, 3 водохранилище, 4 горная река
const SCENES = [
  { loc: 1, part: 'day', weather: 'cloud', act: 'fight', fish: { id: 'pike', w: 6.8 } },
  { loc: 0, part: 'evening', weather: 'sun', act: 'catch', fish: { id: 'carp', w: 8.35 } },
  { loc: 3, part: 'night', weather: 'sun', act: 'bite' },
  { loc: 2, part: 'morning', weather: 'fog', act: 'atlas' },
];
let all = [];
process.env.MOCK_SDK = '1';
for (const lang of ['ru', 'en']) {
  for (const [kind, w, h, dpr, mobile] of [['desktop', 1280, 720, 1.5, false], ['mobile', 432, 768, 2.5, true]]) {
    process.env.MOCK_LANG = lang;
    all = all.concat(await run({ w, h, dpr, mobile, locale: lang === 'ru' ? 'ru-RU' : 'en-US', pre: `localStorage.setItem('cozy_fishing_save_v1', ${JSON.stringify(JSON.stringify(PROMO_SAVE))}); window.__env = { part: 'day', weather: 'cloud' };`, steps: async (page) => {
      await page.evaluate(() => { const g = __game; g.startPlay(); g.closeModal(true); });
      for (let n = 0; n < SCENES.length; n++) {
        const sc = SCENES[n];
        await page.evaluate((sc) => {
          const g = __game;
          g.closeModal(true);
          window.__env = { part: sc.part, weather: sc.weather };
          g.s.loc = sc.loc;
          g.reset();
          g.refreshEnv(true);
          const S = g.scene;
          S.duckT = sc.loc === 2 ? 0 : 999;
          S.ducks = null;
          S.cat.on = sc.act === 'bite' || sc.act === 'atlas';
          S.cat.k = S.cat.on ? 1 : 0;
          S.bubbles = sc.act === 'bite' ? { x: S.W * 0.78, y: S.L.hz + (S.H - S.L.hz) * 0.3, life: 99 } : null;
          g.bubT = 999;
          g.catT = 999;
          g.catLife = 999;
          window.__forceFish = sc.fish || { id: 'zander', w: 3 };
          const L = S.L;
          const x = S.W * (S.port ? 0.62 : 0.66), y = L.nearY - 0.62 * (L.nearY - L.farY);
          if (sc.act === 'fight' || sc.act === 'bite' || sc.act === 'catch') {
            g.tryCast(x, y);
            g.cast.t = 5;
            g._updCast(0.01);
            g.waitT = 0.01;
            g._updWait(0.02);
          }
          if (sc.act === 'fight') {
            g.hook();
            const F = g.fight;
            F.p = 0.38;
            F.next = 99;
            g.holding = true;
            const orig = g._updFight.bind(g);
            g._updFight = (dt) => { orig(dt); F.p = 0.38; F.T = 0.58; g.holding = true; };
          }
          if (sc.act === 'catch') {
            g.hook();
            S.fish = null;
            S.float = null;
            g.caught(g.fight);
          }
          if (sc.act === 'bite') g.biteT = 999;
          if (sc.act === 'atlas') g.openAtlas();
        }, sc);
        await page.waitForTimeout(sc.act === 'catch' ? 3200 : 1500);
        await page.screenshot({ path: `${OUT}${lang}_${kind}_${n + 1}.png` });
        await page.evaluate(() => { const g = __game; delete g._updFight; g.closeModal(true); g.reset(); });
      }
    } }));
  }
}
done(all);
