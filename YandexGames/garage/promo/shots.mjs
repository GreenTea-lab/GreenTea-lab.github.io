// Скриншоты геймплея: 4 desktop 1920x1080 + 4 mobile 1080x1920 на язык. node promo/shots.mjs [ru|en] && sh promo/fit.sh
import { run, done } from '../test/shot.mjs';
import { stage, saveJS } from './state.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const WRECK = { model: 'kozlik', wreck: 0.8, color: 0x5a8a3a, seed: 21 };
const SCENES = [
  // 1 рынок: объявления с фото
  { car: { model: 'samurai', fresh: 1, color: 0xf0f0f0, metallic: true, seed: 4 }, ui: true, tab: 'market', view: { yaw: 0.9, pitch: 0.18, dist: 7 } },
  // 2 покраска: детали в грунте, краскопульт красит всю машину
  { car: { model: 'baron', fresh: 1, color: 0x2a3a8a, seed: 7, primer: ['doorR', 'fenderR', 'hood', 'quarterR'] }, ui: true, tool: 'paint', paint: 0xc0392b, view: { yaw: 0.7, pitch: 0.16, dist: 6.4 } },
  // 3 болгарка: искры по ржавому крылу
  { car: WRECK, ui: true, tool: 'body', grind: 'doorL', view: { yaw: 0.6, pitch: 0.1, dist: 6 } },
  // 4 продажа: покупатели торгуются
  { car: { model: 'molniya', fresh: 1, color: 0xffb400, metallic: true, seed: 11, look: { rim: 'turbine', spoiler: 2, stripes: 1 }, tuned: { rims: 'turbine' } }, ui: true, tool: 'sell', sell: true, view: { yaw: 0.85, pitch: 0.16, dist: 6.5 } },
];
const only = process.argv[2];
let all = [];
process.env.MOCK_SDK = '1';
for (const lang of ['ru', 'en']) {
  if (only && only !== lang) continue;
  for (const [kind, w, h, dpr, mobile] of [['desktop', 1280, 720, 1.5, false], ['mobile', 432, 768, 2.5, true]]) {
    if (process.env.KIND && process.env.KIND !== kind) continue;
    process.env.MOCK_LANG = lang;
    for (let n = 0; n < SCENES.length; n++) {
      if (process.env.SC && !process.env.SC.includes(String(n + 1))) continue;
      const sc = SCENES[n];
      all = all.concat(await run({ w, h, dpr, mobile, locale: lang === 'ru' ? 'ru-RU' : 'en-US', pre: saveJS(), steps: async (page) => {
        await page.evaluate(stage, sc);
        await page.waitForTimeout(800);
        if (sc.tab === 'market') {
          // машина в кадре остаётся, а предупреждение «сначала продайте» не нужно
          await page.evaluate(() => { __game.s.car = null; __game.renderPanel(); });
        }
        if (sc.tab === 'market') await page.waitForFunction(() => !__game._thumbQ || !__game._thumbQ.length, null, { timeout: 60000 });
        if (sc.wash) {
          await page.evaluate(() => {
            const g = __game, V = g.view;
            // стереть грязь с передней половины кузова
            for (let u = 0.45; u < 1; u += 0.02) for (let v = 0; v < 1; v += 0.03) V.rub({ x: u, y: v }, true);
            g._washDirty = true;
          });
        }
        if (sc.paint) {
          await page.evaluate((col) => {
            const g = __game;
            g._paintPick = col;
            g.renderPanel();
            g.doJob('paintAll', null);
            // краскопульт «застыл» на середине кузова
            if (g.job) Object.assign(g.job, { dur: 999, t: 999 * 0.62 });
          }, sc.paint);
          await page.waitForTimeout(2500);
        }
        if (sc.grind) {
          await page.evaluate((p) => {
            const g = __game;
            const c = g.s.car;
            c.panels[p].rust = Math.min(c.panels[p].rust, 0.62);
            g.view.sync(true);
            g.select(p);
            g.doJob('rust', p);
            if (g.job) g.job.dur = 999;
          }, sc.grind);
          await page.waitForTimeout(2500);
        }
        if (sc.sell) {
          await page.evaluate(() => {
            const g = __game;
            g.listCar();
          });
          for (let i = 0; i < 3; i++) {
            await page.evaluate(() => (__game.buyerT = 0));
            await page.waitForFunction((k) => __game.buyers.length > k, i, { timeout: 30000 });
          }
          if (!mobile) {
            await page.evaluate(() => __game.openBuyerChat(__game.buyers[0].id));
            await page.waitForTimeout(500);
            await page.click('.chatm .o-p', { force: true });
            await page.click('.chatm .b-off', { force: true });
            await page.waitForTimeout(2500);
          }
        }
        await page.waitForTimeout(2500);
        await page.screenshot({ path: `${OUT}${lang}_${kind}_${n + 1}.png` });
      } }));
    }
  }
}
done(all);
