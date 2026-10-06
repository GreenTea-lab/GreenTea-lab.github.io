// Иконка, обложки и витрина: машины «до» и «после» в гараже и название. node promo/art.mjs [фильтр] && sh promo/fit.sh
import { run, done } from '../test/shot.mjs';
import { stage, saveJS } from './state.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const TITLES = { ru: ['Гаражный', 'флиппер'], en: ['Garage', 'Flipper'] };
const SHINY = { model: 'lastochka', fresh: 1, color: 0xd8301a, metallic: true, seed: 3, look: { rim: 'spoke5' }, tuned: { rims: 'spoke5' } };
const RUSTY = { model: 'lastochka', wreck: 1, color: 0x3d6fb0, seed: 9 };
const jobs = [
  ['icon_512', 512, 512, 'ru', 'icon'],
  ['icon_maskable_512', 512, 512, 'ru', 'mask'],
  ['cover_ru_800x470', 800, 470, 'ru', 'cover'],
  ['cover_en_800x470', 800, 470, 'en', 'cover'],
  ['showcase_ru_1560x520', 1560, 520, 'ru', 'show'],
  ['showcase_en_1560x520', 1560, 520, 'en', 'show'],
];
const only = process.argv[2];
let all = [];
process.env.MOCK_SDK = '1';
for (const [name, w, h, lang, kind] of jobs) {
  if (only && !name.includes(only)) continue;
  process.env.MOCK_LANG = lang;
  all = all.concat(await run({ w, h, dpr: kind === 'icon' || kind === 'mask' ? 1 : 2, pre: saveJS(), steps: async (page) => {
    const o = {
      icon: { car: SHINY, view: { yaw: 1.05, pitch: 0.2, dist: 5.6, ty: 0.55 }, fov: 40 },
      mask: { car: SHINY, view: { yaw: 1.05, pitch: 0.2, dist: 6.2, ty: 0.55 }, fov: 40 },
      cover: { car: SHINY, carPos: [0.4, -0.3, 0], second: { ...RUSTY, x: -1.6, z: 2.5, ry: 0 }, view: { yaw: 0.95, pitch: 0.14, dist: 8.0, ty: 0.7, tx: -0.5 }, fov: 40 },
      show: { car: SHINY, carPos: [0.4, -0.3, 0], second: { ...RUSTY, x: -1.6, z: 2.5, ry: 0 }, view: { yaw: 0.95, pitch: 0.12, dist: 9.4, ty: 0.75, tx: -0.5 }, fov: 32 },
    }[kind];
    await page.evaluate(stage, o);
    await page.evaluate(([kind, title]) => {
      const g = __game;
      g.layout = () => {};
      g.resize = () => {};
      g.g.camera.aspect = innerWidth / innerHeight;
      g.g.camera.updateProjectionMatrix();
      const W = innerWidth, H = innerHeight;
      if (kind === 'icon' || kind === 'mask') g.g.camera.setViewOffset(W, H, 0, H * 0.06, W, H);
      if (kind === 'show') g.g.camera.setViewOffset(W, H, -W * 0.2, H * 0.03, W, H);
      if (kind === 'cover') g.g.camera.setViewOffset(W, H, 0, -H * 0.12, W, H);
      if (kind === 'cover' || kind === 'show') {
        const d = document.createElement('div');
        const big = kind === 'show' ? H * 0.155 : H * 0.12;
        d.style.cssText = `position:fixed;z-index:50;font-family:Unbounded,sans-serif;font-weight:800;color:#fff;line-height:.95;${kind === 'show' ? `left:${W * 0.04}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-start` : `left:0;right:0;top:${H * 0.05}px;display:flex;justify-content:center;align-items:baseline;gap:${big * 0.3}px`}`;
        const s1 = 'text-shadow:0 4px 0 #6a2a00,0 10px 30px rgba(0,0,0,.6)';
        const s2 = 'color:#ff8a1a;text-shadow:0 4px 0 #5a2000,0 10px 30px rgba(0,0,0,.6)';
        d.innerHTML = `<div style="font-size:${big}px;${s1}">${title[0]}</div><div style="font-size:${big * 1.08}px;${s2}">${title[1]}</div>`;
        document.body.appendChild(d);
      }
    }, [kind, TITLES[lang]]);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: OUT + name + '.png' });
  } }));
}
done(all);
