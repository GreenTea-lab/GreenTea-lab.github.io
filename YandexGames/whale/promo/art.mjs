// Иконка, обложки и витрина: кит с городком без интерфейса и название. node promo/art.mjs
import { run, done } from '../test/shot.mjs';
import { LATE, MID } from './state.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const TITLES = { ru: ['Городок', 'на ките'], en: ['Whale', 'Town'] };
const jobs = [
  ['icon_512', 512, 512, 'ru', 'icon'],
  ['icon_maskable_512', 512, 512, 'ru', 'mask'],
  ['cover_ru_800x470', 800, 470, 'ru', 'cover'],
  ['cover_en_800x470', 800, 470, 'en', 'cover'],
  ['showcase_ru_1560x520', 1560, 520, 'ru', 'show'],
  ['showcase_en_1560x520', 1560, 520, 'en', 'show'],
];
let all = [];
process.env.MOCK_SDK = '1';
for (const [name, w, h, lang, kind] of jobs) {
  process.env.MOCK_LANG = lang;
  const st = kind === 'icon' || kind === 'mask' ? { ...MID, stage: 3, b: { lemon: 60, fish: 40, light: 30, bakery: 26, mill: 12, carousel: 8, bank: 3 } } : { ...LATE, migr: kind === 'show' ? 2 : 0 };
  all = all.concat(await run({ w, h, pre: `localStorage.setItem('whale_town_save_v1', ${JSON.stringify(JSON.stringify(st))})`, steps: async (page) => {
    await page.evaluate(([kind, title]) => {
      const g = __game;
      g.startPlay();
      g.closeModal(true);
      document.getElementById('ui').style.display = 'none';
      document.getElementById('toasts').style.display = 'none';
      const S = g.scene;
      const W = innerWidth, H = innerHeight;
      let R;
      if (kind === 'icon') R = { x: -W * 0.42, y: H * 0.06, w: W * 1.75, h: H * 1.0 };
      else if (kind === 'mask') R = { x: -W * 0.18, y: H * 0.14, w: W * 1.3, h: H * 0.8 };
      else if (kind === 'cover') R = { x: 0, y: H * 0.18, w: W, h: H * 0.82 };
      else R = { x: W * 0.32, y: H * 0.02, w: W * 0.68, h: H * 0.98 };
      g.resize = () => {};
      S.resize(W, H, 1, R);
      if (kind === 'show' || kind === 'cover') S.hz = H * 0.42;
      g.applyScene();
      S.islandK = kind === 'show' ? 0.9 : 0;
      S.gull = kind === 'icon' || kind === 'mask' ? null : { p: kind === 'show' ? 0.62 : 0.2, dur: 1e9 };
      g.gullT = 1e9;
      let fr = 0;
      const keep = () => { S.spout = 1.4; if (fr++ % 9 === 0 && (kind === 'icon' || kind === 'mask')) S.tap(0, 0, '', false); requestAnimationFrame(keep); };
      keep();
      if (kind === 'cover' || kind === 'show') {
        const d = document.createElement('div');
        const big = kind === 'show' ? H * 0.24 : H * 0.15;
        d.style.cssText = `position:fixed;z-index:50;font-family:Marmelad,cursive;color:#fff;line-height:.92;text-shadow:0 4px 0 #2a64b0,0 8px 0 #1f4a90,0 14px 30px rgba(10,30,80,.4);${kind === 'show' ? `left:${W * 0.04}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center` : `left:0;right:0;top:${H * 0.03}px;text-align:center;display:flex;justify-content:center;gap:${big * 0.3}px`}`;
        d.innerHTML = `<div style="font-size:${big}px">${title[0]}</div><div style="font-size:${big * (kind === 'show' ? 0.86 : 1)}px;color:#ffe27a">${title[1]}</div>`;
        document.body.appendChild(d);
      }
    }, [kind, TITLES[lang]]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: OUT + name + '.png' });
  } }));
}
done(all);
