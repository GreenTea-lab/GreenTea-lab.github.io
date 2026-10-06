// Иконка, обложки и витрина: герой в прыжке над парящими островами и название. node promo/art.mjs
import { run, done } from '../test/shot.mjs';
import { pose, saveJS } from './state.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const TITLES = { ru: ['Небесный', 'паркур'], en: ['Sky', 'Parkour'] };
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
      icon: { L: 3, seg: 'bounce', di: -1, f: 0.45, air: 1.6, vy: 3, cy: 2.75, turn: -0.15, pitch: 0.16, zoom: 0.5, fov: 50, noHud: true },
      mask: { L: 3, seg: 'bounce', di: -1, f: 0.45, air: 1.6, vy: 3, cy: 2.75, turn: -0.15, pitch: 0.16, zoom: 0.7, fov: 50, noHud: true },
      cover: { L: 5, seg: 'bounce', di: -1, f: 0.5, air: 1.5, vy: 3, cy: 2.4, turn: -0.35, pitch: 0.24, zoom: 0.62, fov: 56, noHud: true },
      show: { L: 5, seg: 'bounce', di: -1, f: 0.5, air: 1.5, vy: 3, cy: 2.2, turn: -0.5, pitch: 0.2, zoom: 0.6, fov: 44, noHud: true },
    }[kind];
    await page.evaluate(pose, o);
    await page.evaluate(([kind, title]) => {
      document.getElementById('menu').style.display = 'none';
      const W = innerWidth, H = innerHeight;
      // сдвиг кадра: на витрине герой справа, название слева
      if (kind === 'icon' || kind === 'mask') __game.world.camera.setViewOffset(W, H, 0, H * 0.1, W, H);
      if (kind === 'show') __game.world.camera.setViewOffset(W, H, -W * 0.22, 0, W, H);
      if (kind === 'cover') __game.world.camera.setViewOffset(W, H, 0, -H * 0.06, W, H);
      if (kind === 'cover' || kind === 'show') {
        const d = document.createElement('div');
        const big = kind === 'show' ? H * 0.2 : H * 0.15;
        d.style.cssText = `position:fixed;z-index:50;font-family:'Russo One',sans-serif;color:#fff;line-height:.92;${kind === 'show' ? `left:${W * 0.05}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-start` : `left:0;right:0;top:${H * 0.04}px;display:flex;justify-content:center;align-items:baseline;gap:${big * 0.28}px`}`;
        const s1 = 'text-shadow:0 4px 0 #2364b8,0 7px 0 #1a4a90,0 12px 28px rgba(10,30,80,.45)';
        const s2 = 'color:#ffd23a;text-shadow:0 4px 0 #e0761a,0 7px 0 #b8560c,0 12px 28px rgba(80,30,0,.45)';
        d.innerHTML = `<div style="font-size:${big}px;${s1}">${title[0]}</div><div style="font-size:${big * 1.18}px;${s2}">${title[1]}</div>`;
        document.body.appendChild(d);
      }
    }, [kind, TITLES[lang]]);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: OUT + name + '.png' });
  } }));
}
done(all);
