// Иконка, обложки и витрина: 3D-сцена фермы без интерфейса и название. node promo/art.mjs
import { run, done } from '../test/shot.mjs';
import { FARM } from './farm.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const TITLES = { ru: ['Ферма', 'на тракторе'], en: ['Tractor', 'Farm'] };
const jobs = [
  ['icon_512', 512, 512, 'ru', 'icon'],
  ['icon_maskable_512', 512, 512, 'ru', 'mask'],
  ['cover_ru_800x470', 800, 470, 'ru', 'cover'],
  ['cover_en_800x470', 800, 470, 'en', 'cover'],
  ['showcase_ru_1560x520', 1560, 520, 'ru', 'show'],
  ['showcase_en_1560x520', 1560, 520, 'en', 'show'],
];
let all = [];
for (const [name, w, h, lang, kind] of jobs) {
  process.env.MOCK_SDK = '1';
  process.env.MOCK_LANG = lang;
  all = all.concat(await run({ w, h, dpr: kind === 'show' || kind === 'cover' ? 1 : 1, pre: `(${FARM})()`, steps: async (page) => {
    await page.evaluate(() => { const g = window.__game; g.startPlay(); g.closeModal(true); });
    await page.evaluate(([kind, title]) => {
      const g = window.__game;
      window.__promoFarm({ harvest0: 0.3, tr: 'red', time: 480 * 0.36 });
      // трактор с жаткой на поле подсолнухов
      window.__place(-3, 13.5, Math.PI / 2, 'harvest', 30);
      document.getElementById('ui').style.display = 'none';
      document.getElementById('menu').style.display = 'none';
      g.arrow.visible = false;
      g.updateHint = () => {};
      const T = g.tractor;
      g.camHook = (cam) => {
        if (kind === 'icon' || kind === 'mask') {
          cam.position.set(T.x + 6.5, 4.2, T.z + 7.5);
          cam.lookAt(T.x + 0.6, 1.2, T.z);
        } else if (kind === 'cover') {
          cam.position.set(T.x + 13, 9, T.z + 15);
          cam.lookAt(T.x - 3, 0.5, T.z - 6);
        } else {
          cam.position.set(T.x + 16, 9.5, T.z + 12);
          cam.lookAt(T.x - 9, 0.5, T.z - 6);
        }
      };
      if (kind === 'mask') g.world.camera.fov = 52; else if (kind === 'icon') g.world.camera.fov = 40;
      g.world.camera.updateProjectionMatrix();
      if (kind === 'cover' || kind === 'show') {
        const d = document.createElement('div');
        const W = innerWidth, H = innerHeight;
        const big = kind === 'show' ? H * 0.26 : H * 0.17, sub = big * 0.5;
        d.style.cssText = `position:fixed;${kind === 'show' ? `left:${W * 0.05}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center` : `left:0;right:0;top:${H * 0.05}px;text-align:center`};z-index:50;font-family:Lobster,serif;color:#fff;line-height:.95;text-shadow:0 4px 0 #a9713f,0 7px 0 #7c4f28,0 12px 26px rgba(60,35,15,.45)`;
        d.innerHTML = `<div style="font-size:${big}px">${title[0]}</div><div style="font-size:${sub}px;color:#ffe9a8">${title[1]}</div>`;
        document.body.appendChild(d);
      }
    }, [kind, TITLES[lang]]);
    // дать сцене прорисоваться и частицам появиться
    await page.evaluate(() => (window.__game.autoDir = [1, 0, 0.35]));
    await page.waitForTimeout(3500);
    await page.evaluate(() => (window.__game.autoDir = [1, 0, 0.001]));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: OUT + name + '.png' });
  } }));
}
done(all);
