// Иконка, обложки и витрина: сцена игры без интерфейса, прыгающая рыба и название. node promo/art.mjs
import { run, done } from '../test/shot.mjs';
import fs from 'fs';
const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const TITLES = { ru: ['Клёвая', 'рыбалка'], en: ['Cozy', 'Fishing'] };
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
  all = all.concat(await run({ w, h, pre: `window.__env = { part: 'evening', weather: 'sun' }; localStorage.setItem('cozy_fishing_save_v1', JSON.stringify({ ts: 1, char: 'm', tutDone: true, login: { last: 99999, streak: 1 } }))`, steps: async (page) => {
    await page.evaluate(([kind, title]) => {
      const g = window.__game;
      g.startPlay();
      g.closeModal(true);
      document.getElementById('ui').style.display = 'none';
      document.getElementById('menu').style.display = 'none';
      const S = g.scene;
      S.duckT = 999;
      S.jumpT = 999;
      S.cat.on = kind === 'cover' || kind === 'show';
      S.cat.k = 1;
      const W = S.W, H = S.H, L = S.L;
      if (kind === 'icon' || kind === 'mask') {
        // крупная рыба в прыжке над водой с поплавком
        S.noFisher = true;
        S.L.hz = Math.round(H * 0.5);
        S.key = '';
        S.extra = (x) => {
          const k = kind === 'mask' ? 0.72 : 0.9;
          const cx = W / 2, cy = H * 0.5;
          x.save();
          x.translate(cx, cy);
          x.scale(k, k);
          x.translate(-cx, -cy);
          // брызги и круги
          x.strokeStyle = 'rgba(255,255,255,.75)';
          x.lineWidth = 6;
          for (const r of [70, 120, 170]) { x.beginPath(); x.ellipse(W * 0.5, H * 0.74, r * 1.3, r * 0.32, 0, 0, Math.PI * 2); x.stroke(); }
          window.__drawFish(x, 'carp', W * 0.5, H * 0.45, W * 0.86, { rot: -0.42, wig: 0.5 });
          // брызги «короной» по обе стороны от рыбы
          x.fillStyle = 'rgba(240,250,255,.95)';
          const drops = [[-190, -30, 11], [-215, -70, 8], [-170, -95, 7], [-240, -15, 9], [-150, -55, 9], [170, -40, 10], [205, -80, 8], [150, -100, 6], [230, -20, 9], [120, -60, 8]];
          for (const [dx, dy, r] of drops) { x.beginPath(); x.ellipse(W * 0.5 + dx, H * 0.74 + dy, r, r * 1.25, 0, 0, Math.PI * 2); x.fill(); }
          // поплавок
          x.save(); x.translate(W * 0.83, H * 0.82); x.scale(3.2, 3.2);
          x.fillStyle = '#e4382c'; x.beginPath(); x.ellipse(0, -12, 5.2, 7.5, 0, Math.PI, 0); x.lineTo(5.2, -9); x.lineTo(-5.2, -9); x.fill();
          x.fillStyle = '#f7f3ea'; x.fillRect(-5.2, -9.5, 10.4, 4); x.fillStyle = '#3a2a1a'; x.fillRect(-0.8, -26, 1.6, 10);
          x.restore();
          x.restore();
        };
      } else {
        // рыбак на мостках, на леске выпрыгивает щука
        S.pose = 'fight';
        S.tension = 0.55;
        const fx = W * (kind === 'show' ? 0.72 : 0.68), fy = L.hz + (H - L.hz) * 0.42;
        S.float = { x: fx, y: fy, st: 'fight' };
        S.extra = (x) => {
          x.fillStyle = 'rgba(235,248,255,.9)';
          for (let i = 0; i < 14; i++) { const a = Math.PI + (i / 13) * Math.PI; x.beginPath(); x.arc(fx + Math.cos(a) * 60 * L.S, fy + 6 + Math.sin(a) * 26 * L.S, (3 + (i % 3) * 2) * L.S, 0, Math.PI * 2); x.fill(); }
          window.__drawFish(x, 'pike', fx, fy - 60 * L.S, 230 * L.S, { rot: -0.55, wig: 0.6, flip: true });
          x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 3;
          for (const r of [40, 70]) { x.beginPath(); x.ellipse(fx, fy + 8, r * L.S, r * 0.28 * L.S, 0, 0, Math.PI * 2); x.stroke(); }
        };
        const d = document.createElement('div');
        const big = kind === 'show' ? H * 0.25 : H * 0.17;
        d.style.cssText = `position:fixed;z-index:50;font-family:Pangolin,cursive;color:#fff;line-height:.92;text-shadow:0 4px 0 #2a6a8a,0 8px 0 #1f4a62,0 14px 30px rgba(10,30,50,.45);${kind === 'show' ? `left:${W * 0.04}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center` : `left:0;right:0;top:${H * 0.05}px;text-align:center`}`;
        d.innerHTML = `<div style="font-size:${big}px;color:#ffe28a">${title[0]}</div><div style="font-size:${big * 0.86}px">${title[1]}</div>`;
        document.body.appendChild(d);
        if (kind === 'show') { S.L.fx = W * 0.42; S.L.pierEnd = S.L.fx + 70 * S.L.S; }
      }
    }, [kind, TITLES[lang]]);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: OUT + name + '.png' });
  } }));
}
done(all);
