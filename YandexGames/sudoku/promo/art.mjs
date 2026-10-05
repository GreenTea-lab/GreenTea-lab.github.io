// Иконка, обложки и витрина: сцена из игровой графики (небо, луна, сакура, предметы сада) без интерфейса.
// node promo/art.mjs
import { run, done } from '../test/shot.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const TITLES = { ru: ['Судоку', 'Дзен-сад'], en: ['Sudoku', 'Zen Garden'] };
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
  all = all.concat(await run({ w, h, dpr: 1, steps: async (page) => {
    await page.evaluate(([kind, title]) => {
      const A = window.__app;
      A.scene.setPetals(false);
      A.scene.draw();
      document.getElementById('app').style.display = 'none';
      const W = innerWidth, H = innerHeight;
      // лепестки вручную, неподвижно
      const g = document.getElementById('petals').getContext('2d');
      const cols = ['#f6b9c8', '#f3a7ba', '#fbd5de'];
      let s = 5;
      const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < (kind === 'show' ? 34 : 22); i++) {
        g.save(); g.translate(r() * W, r() * H); g.rotate(r() * 6); g.fillStyle = cols[i % 3]; g.globalAlpha = 0.8;
        g.beginPath(); g.ellipse(0, 0, 6 + r() * 5, 3.5 + r() * 2.5, 0, 0, 7); g.fill(); g.restore();
      }
      const d = document.createElement('div');
      const items = (ids, size) => ids.map((id) => `<div style="width:${size}px;height:${size}px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.45))">${A.iconSVG(id).replace('<svg ', '<svg width="100%" height="100%" ')}</div>`).join('');
      const logo = (sz) => A.logoSVG().replace('class="logo"', `width="${sz}" height="${sz}" style="filter:drop-shadow(0 12px 22px rgba(0,0,0,.5))"`);
      const T = (fs, sub) => `<div style="font-family:'Yeseva One',serif;color:#f4ecdc;font-size:${fs}px;line-height:1;text-shadow:0 4px 18px rgba(0,0,0,.55)">${title[0]}</div><div style="font-family:'Alegreya Sans',sans-serif;font-weight:800;color:#e3b45a;font-size:${sub}px;letter-spacing:.32em;text-transform:uppercase;margin-top:${sub * 0.5}px">${title[1]}</div>`;
      let html = '';
      if (kind === 'icon' || kind === 'mask') {
        const sz = kind === 'mask' ? W * 0.62 : W * 0.86;
        html = `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center">${logo(sz)}</div>`;
      } else if (kind === 'cover') {
        html = `<div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;padding-top:${H * 0.07}px">${T(H * 0.17, H * 0.05)}</div>
          <div style="position:fixed;left:50%;bottom:${H * 0.06}px;transform:translateX(-50%)">${logo(H * 0.5)}</div>
          <div style="position:fixed;left:${W * 0.04}px;bottom:${H * 0.03}px;display:flex;align-items:flex-end;gap:6px">${items(['lantern', 'bonsai'], H * 0.24)}</div>
          <div style="position:fixed;right:${W * 0.04}px;bottom:${H * 0.03}px;display:flex;align-items:flex-end;gap:6px">${items(['torii', 'bamboo'], H * 0.26)}</div>`;
      } else {
        html = `<div style="position:fixed;left:${W * 0.06}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center">${T(H * 0.24, H * 0.07)}</div>
          <div style="position:fixed;left:${W * 0.54}px;top:50%;transform:translate(-50%,-50%)">${logo(H * 0.78)}</div>
          <div style="position:fixed;right:${W * 0.04}px;bottom:${H * 0.05}px;display:flex;align-items:flex-end;gap:10px">${items(['lantern', 'pagoda', 'bonsai', 'torii'], H * 0.36)}</div>`;
      }
      d.innerHTML = html;
      document.body.appendChild(d);
    }, [kind, TITLES[lang]]);
    await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + name + '.png' });
  } }));
}
done(all);
