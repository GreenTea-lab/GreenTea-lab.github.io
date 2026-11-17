// Фон: деревянный стол, вид сверху, с уютными вещами вокруг поля.
// Вещи открываются за звёзды приключения, а сезонная мелочь меняется по временам года.
import { canvas, grain, roundRect, mix, rgba } from './gfx.js';
import { drawItem } from './items.js';
import { buildScene } from './scenes.js';
import { rng } from './core.js';
import { t } from './i18n.js';
import { decorArt } from './decor-art.js';
import {roomBackground} from './room-background.js';
import {paintBackground} from './background-art.js';
import {ROOM_UPGRADES} from './room-progress.js';
export {roomImageCacheSize} from './room-background.js';
export {ROOM_SCENES,roomSceneForDecor} from './room-scenes.js';

export const DECOR = [
  { id: 'cup', stars: 0, r: 1.0 },
  { id: 'scatter', stars: 0, r: 0.9 },
  { id: 'glasses', stars: 0, r: 0.85 },
  { id: 'book', stars: 3, r: 1.25 },
  { id: 'yarn', stars: 8, r: 0.95 },
  { id: 'plate', stars: 14, r: 1.05 },
  { id: 'candle', stars: 22, r: 0.7 },
  { id: 'flowers', stars: 32, r: 1.05 },
  { id: 'watch', stars: 44, r: 0.75 },
  { id: 'cat', stars: 58, r: 1.35 },
  { id: 'jam', stars: 74, r: 0.75 },
  { id: 'teapot', stars: 92, r: 1.1 },
  { id: 'crossword', stars: 112, r: 1.2 },
];
export const unlockedDecor = (stars) => DECOR.filter(d=>stars>=d.stars).map(d=>ROOM_UPGRADES.find(x=>x.slot===d.id&&stars>=x.stars)?.id||d.id);
export const nextDecor = (stars) => [...DECOR,...ROOM_UPGRADES].find(d=>stars<d.stars)||null;

const P2 = Math.PI * 2;

// доски стола
function planks(g, W, H, season) {
  const tone = { autumn: '#b47a42', winter: '#a9784b', spring: '#bd8650', summer: '#c08a4f' }[season] || '#b47a42';
  g.fillStyle = '#3a210f';
  g.fillRect(0, 0, W, H);
  const ph = Math.max(70, Math.min(150, Math.min(W, H) / 5.2));
  const R = rng(7);
  for (let y = -R() * ph * 0.5, row = 0; y < H; y += ph, row++) {
    let x = -R() * 300;
    while (x < W) {
      const len = 380 + R() * 520;
      const c = mix(tone, R() < 0.5 ? '#7a4a24' : '#d9a56a', R() * 0.32);
      const gx = x + 1.5, gy = y + 1.5, gw = len - 3, gh = ph - 3;
      const gr = g.createLinearGradient(0, gy, 0, gy + gh);
      gr.addColorStop(0, mix(c, '#ffffff', 0.08));
      gr.addColorStop(0.5, c);
      gr.addColorStop(1, mix(c, '#2a1406', 0.18));
      g.fillStyle = gr;
      roundRect(g, gx, gy, gw, gh, 4);
      g.fill();
      grain(g, gx, gy, gw, gh, { seed: (row * 31 + Math.round(x)) | 0, color: '#3c1e0a', alpha: 0.22, dir: 'h', density: 0.75, scale: 1.4 });
      // фаска по краю доски
      g.strokeStyle = 'rgba(255,230,190,.12)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(gx + 4, gy + 1.5);
      g.lineTo(gx + gw - 4, gy + 1.5);
      g.stroke();
      g.strokeStyle = 'rgba(30,12,2,.35)';
      g.beginPath();
      g.moveTo(gx + 4, gy + gh - 1);
      g.lineTo(gx + gw - 4, gy + gh - 1);
      g.stroke();
      x += len;
    }
  }
}

// ---------- вещи на столе (вид сверху), r — радиус в px ----------
function shadow(g, x, y, rx, ry, a = 0.32) {
  const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  gr.addColorStop(0, `rgba(30,12,2,${a})`);
  gr.addColorStop(0.7, `rgba(30,12,2,${a * 0.5})`);
  gr.addColorStop(1, 'rgba(30,12,2,0)');
  g.save();
  g.translate(x, y);
  g.scale(1, ry / rx);
  g.translate(-x, -y);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, rx, 0, P2);
  g.fill();
  g.restore();
}

function doily(g, r) {
  g.save();
  g.fillStyle = 'rgba(255,250,240,.92)';
  g.beginPath();
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * P2;
    const rr = r * (0.94 + 0.06 * Math.cos(a * 16));
    k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0);
  }
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let ring = 0; ring < 3; ring++) {
    const rr = r * (0.55 + ring * 0.14);
    const n = 14 + ring * 6;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * P2 + ring * 0.2;
      g.beginPath();
      g.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * (0.035 + ring * 0.006), 0, P2);
      g.fill();
    }
  }
  g.restore();
}

const DRAW = {
  cup(g, r) {
    shadow(g, r * 0.08, r * 0.12, r * 1.05, r * 1.05);
    doily(g, r * 1.02);
    // блюдце
    g.beginPath();
    g.arc(0, 0, r * 0.78, 0, P2);
    g.fillStyle = '#fbf7f0';
    g.fill();
    g.strokeStyle = '#3f72b8';
    g.lineWidth = r * 0.05;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.7, 0, P2);
    g.strokeStyle = 'rgba(63,114,184,.45)';
    g.lineWidth = r * 0.02;
    g.stroke();
    // ручка
    g.beginPath();
    g.ellipse(r * 0.58, r * 0.05, r * 0.16, r * 0.1, 0, 0, P2);
    g.strokeStyle = '#f4efe6';
    g.lineWidth = r * 0.08;
    g.stroke();
    // чашка
    shadow(g, r * 0.05, r * 0.07, r * 0.55, r * 0.55, 0.25);
    g.beginPath();
    g.arc(0, 0, r * 0.5, 0, P2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.strokeStyle = '#d9cfc0';
    g.lineWidth = r * 0.02;
    g.stroke();
    // узор горошком
    g.fillStyle = '#e0574c';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * P2;
      g.beginPath();
      g.arc(Math.cos(a) * r * 0.455, Math.sin(a) * r * 0.455, r * 0.025, 0, P2);
      g.fill();
    }
    // чай с долькой лимона
    const tea = g.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.42);
    tea.addColorStop(0, '#c9762a');
    tea.addColorStop(1, '#7a3a12');
    g.beginPath();
    g.arc(0, 0, r * 0.41, 0, P2);
    g.fillStyle = tea;
    g.fill();
    g.save();
    g.translate(r * 0.1, r * 0.08);
    g.beginPath();
    g.arc(0, 0, r * 0.16, 0, P2);
    g.fillStyle = '#f6e27a';
    g.fill();
    g.strokeStyle = '#e8c23a';
    g.lineWidth = r * 0.03;
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = r * 0.015;
    for (let k = 0; k < 8; k++) {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos((k / 8) * P2) * r * 0.13, Math.sin((k / 8) * P2) * r * 0.13);
      g.stroke();
    }
    g.restore();
    g.beginPath();
    g.ellipse(-r * 0.2, -r * 0.18, r * 0.1, r * 0.04, -0.7, 0, P2);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fill();
    // ложечка
    g.save();
    g.rotate(0.6);
    g.fillStyle = '#c9ced6';
    roundRect(g, r * 0.62, -r * 0.035, r * 0.42, r * 0.07, r * 0.03);
    g.fill();
    g.beginPath();
    g.ellipse(r * 0.6, 0, r * 0.1, r * 0.07, 0, 0, P2);
    g.fill();
    g.restore();
  },
  glasses(g, r) {
    g.rotate(-0.35);
    shadow(g, r * 0.06, r * 0.1, r * 1.0, r * 0.55, 0.22);
    const lens = (x) => {
      g.beginPath();
      g.ellipse(x, 0, r * 0.4, r * 0.34, 0, 0, P2);
      g.fillStyle = 'rgba(210,235,255,.28)';
      g.fill();
      g.strokeStyle = '#a8792e';
      g.lineWidth = r * 0.06;
      g.stroke();
      g.beginPath();
      g.ellipse(x - r * 0.12, -r * 0.1, r * 0.14, r * 0.06, -0.5, 0, P2);
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.fill();
    };
    lens(-r * 0.47);
    lens(r * 0.47);
    g.beginPath();
    g.moveTo(-r * 0.08, -r * 0.05);
    g.quadraticCurveTo(0, -r * 0.16, r * 0.08, -r * 0.05);
    g.strokeStyle = '#a8792e';
    g.lineWidth = r * 0.05;
    g.stroke();
    // сложенные дужки
    g.beginPath();
    g.moveTo(-r * 0.85, -r * 0.1);
    g.lineTo(-r * 0.2, -r * 0.42);
    g.moveTo(r * 0.85, -r * 0.1);
    g.lineTo(r * 0.2, -r * 0.42);
    g.lineWidth = r * 0.045;
    g.stroke();
  },
  book(g, r) {
    g.rotate(0.12);
    const w = r * 1.0, h = r * 0.68;
    shadow(g, r * 0.08, r * 0.12, r * 1.1, r * 0.8, 0.3);
    g.fillStyle = '#7a2e2a';
    roundRect(g, -w - r * 0.05, -h - r * 0.04, w * 2 + r * 0.1, h * 2 + r * 0.1, r * 0.06);
    g.fill();
    const page = (sx) => {
      g.beginPath();
      g.moveTo(0, -h + r * 0.03);
      g.quadraticCurveTo(sx * w * 0.5, -h - r * 0.04, sx * w * 0.98, -h + r * 0.02);
      g.lineTo(sx * w * 0.98, h - r * 0.02);
      g.quadraticCurveTo(sx * w * 0.5, h - r * 0.08, 0, h - r * 0.02);
      g.closePath();
      const gr = g.createLinearGradient(0, 0, sx * w, 0);
      gr.addColorStop(0, '#d9ccb0');
      gr.addColorStop(0.15, '#f7f0df');
      gr.addColorStop(1, '#fbf6ea');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = 'rgba(90,60,30,.25)';
      g.lineWidth = r * 0.012;
      for (let k = 0; k < 11; k++) {
        const y = -h + r * 0.22 + k * h * 0.165;
        const len = k === 10 ? 0.45 : 0.78 - ((k * 7) % 4) * 0.04;
        g.beginPath();
        g.moveTo(sx * w * 0.14, y);
        g.lineTo(sx * w * (0.14 + len * 0.76), y);
        g.lineWidth = r * 0.035;
        g.strokeStyle = 'rgba(70,50,30,.22)';
        g.stroke();
      }
    };
    page(-1);
    page(1);
    g.fillStyle = '#c9a23a';
    g.beginPath();
    g.moveTo(-r * 0.04, -h);
    g.lineTo(r * 0.06, -h);
    g.lineTo(r * 0.06, h + r * 0.35);
    g.lineTo(r * 0.01, h + r * 0.28);
    g.lineTo(-r * 0.04, h + r * 0.35);
    g.closePath();
    g.fill();
  },
  yarn(g, r) {
    shadow(g, r * 0.08, r * 0.1, r * 0.8, r * 0.8);
    const R = rng(4);
    g.beginPath();
    g.arc(0, 0, r * 0.62, 0, P2);
    const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.62);
    gr.addColorStop(0, '#f4a9b8');
    gr.addColorStop(1, '#c95f78');
    g.fillStyle = gr;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(120,30,50,.35)';
    g.lineWidth = r * 0.03;
    for (let k = 0; k < 18; k++) {
      g.beginPath();
      const a = R() * P2;
      g.ellipse(0, 0, r * (0.3 + R() * 0.5), r * (0.1 + R() * 0.25), a, 0, P2);
      g.stroke();
    }
    g.restore();
    // нитка к вязанию
    g.beginPath();
    g.moveTo(r * 0.5, r * 0.35);
    g.bezierCurveTo(r * 1.0, r * 0.9, r * 0.3, r * 1.1, r * 0.9, r * 1.35);
    g.strokeStyle = '#d97a8f';
    g.lineWidth = r * 0.04;
    g.stroke();
    // спицы
    g.strokeStyle = '#c0c6cf';
    g.lineWidth = r * 0.06;
    g.beginPath();
    g.moveTo(-r * 0.9, r * 0.9);
    g.lineTo(r * 0.7, -r * 0.95);
    g.moveTo(-r * 0.8, -r * 0.6);
    g.lineTo(r * 0.95, r * 0.5);
    g.stroke();
    g.fillStyle = '#5a7fc0';
    [[-0.9, 0.9], [-0.8, -0.6]].forEach(([x, y]) => {
      g.beginPath();
      g.arc(x * r, y * r, r * 0.08, 0, P2);
      g.fill();
    });
  },
  plate(g, r, season) {
    shadow(g, r * 0.08, r * 0.1, r * 0.95, r * 0.95);
    g.beginPath();
    g.arc(0, 0, r * 0.85, 0, P2);
    g.fillStyle = '#fbf8f2';
    g.fill();
    g.strokeStyle = '#3f72b8';
    g.lineWidth = r * 0.03;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.62, 0, P2);
    g.strokeStyle = 'rgba(200,190,175,.6)';
    g.lineWidth = r * 0.02;
    g.stroke();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * P2;
      g.beginPath();
      g.ellipse(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74, r * 0.05, r * 0.025, a, 0, P2);
      g.fillStyle = '#3f72b8';
      g.fill();
    }
    const R = rng(11);
    const spots = [[-0.25, -0.15], [0.22, -0.2], [0, 0.25], [-0.05, -0.05]];
    spots.slice(0, 3).forEach(([x, y], i) => {
      g.save();
      g.translate(x * r, y * r);
      g.rotate(R() * P2);
      if (season === 'winter') {
        // пряник-звёздочка
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * P2, rr = (k % 2 ? 0.13 : 0.27) * r;
          k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0);
        }
        g.closePath();
        g.fillStyle = '#b5743a';
        g.fill();
        g.strokeStyle = '#fff';
        g.lineWidth = r * 0.02;
        g.stroke();
      } else {
        g.beginPath();
        g.arc(0, 0, r * 0.25, 0, P2);
        g.fillStyle = '#d9a35a';
        g.fill();
        g.strokeStyle = '#b8803a';
        g.lineWidth = r * 0.02;
        g.stroke();
        g.fillStyle = '#5a3216';
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          g.arc((R() - 0.5) * r * 0.3, (R() - 0.5) * r * 0.3, r * 0.035, 0, P2);
          g.fill();
        }
      }
      g.restore();
    });
  },
  candle(g, r) {
    shadow(g, r * 0.06, r * 0.08, r * 0.95, r * 0.95, 0.25);
    g.beginPath();
    g.arc(0, 0, r * 0.8, 0, P2);
    const br = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 0.8);
    br.addColorStop(0, '#f1d37a');
    br.addColorStop(1, '#a8792e');
    g.fillStyle = br;
    g.fill();
    g.beginPath();
    g.arc(0, 0, r * 0.42, 0, P2);
    g.fillStyle = '#f8efd8';
    g.fill();
    g.strokeStyle = '#e6d6b2';
    g.lineWidth = r * 0.04;
    g.stroke();
    // ушко подсвечника
    g.beginPath();
    g.ellipse(r * 0.85, 0, r * 0.2, r * 0.13, 0, 0, P2);
    g.strokeStyle = '#b8893a';
    g.lineWidth = r * 0.07;
    g.stroke();
  },
  flowers(g, r, season) {
    shadow(g, r * 0.08, r * 0.1, r * 1.0, r * 1.0, 0.25);
    const R = rng(21);
    const leaves = season === 'winter' ? '#2f6a3a' : '#4f8f3a';
    for (let k = 0; k < 9; k++) {
      const a = R() * P2, d = r * (0.35 + R() * 0.5);
      g.save();
      g.rotate(a);
      g.beginPath();
      g.ellipse(d * 0.6, 0, r * 0.38, r * 0.11, 0, 0, P2);
      g.fillStyle = mix(leaves, '#1d3a18', R() * 0.4);
      g.fill();
      g.restore();
    }
    const pal = { autumn: ['#f0a030', '#c95a2a', '#8b5bb0', '#f2c94c'], winter: ['#c4122a', '#c4122a', '#f2f2f2', '#d9a019'], spring: ['#ec6f9a', '#f7d24a', '#ffffff', '#b38fe0'], summer: ['#ffffff', '#4f8fd6', '#ffffff', '#f2c94c'] }[season] || ['#ec6f9a', '#ffffff'];
    const pos = [[0, 0], [0.42, -0.2], [-0.4, -0.25], [0.15, 0.45], [-0.3, 0.38], [0.5, 0.3], [-0.1, -0.5]];
    pos.forEach(([x, y], i) => {
      const c = pal[i % pal.length];
      const pr = r * (0.2 + R() * 0.07);
      g.save();
      g.translate(x * r, y * r);
      if (season === 'winter') {
        // веточка с ягодами рябины и шишкой
        if (i % 3 === 2) {
          g.beginPath();
          g.ellipse(0, 0, pr * 0.9, pr * 0.55, R() * 3, 0, P2);
          g.fillStyle = '#7a4a22';
          g.fill();
        } else for (let b = 0; b < 4; b++) {
          g.beginPath();
          g.arc((R() - 0.5) * pr, (R() - 0.5) * pr, pr * 0.32, 0, P2);
          g.fillStyle = c;
          g.fill();
        }
      } else {
        for (let p = 0; p < 8; p++) {
          g.rotate(P2 / 8);
          g.beginPath();
          g.ellipse(pr * 0.6, 0, pr * 0.55, pr * 0.28, 0, 0, P2);
          g.fillStyle = c;
          g.fill();
          g.strokeStyle = 'rgba(0,0,0,.12)';
          g.lineWidth = 1;
          g.stroke();
        }
        g.beginPath();
        g.arc(0, 0, pr * 0.32, 0, P2);
        g.fillStyle = c === '#f7d24a' || c === '#f2c94c' ? '#8a4a1a' : '#f2b81a';
        g.fill();
      }
      g.restore();
    });
  },
  watch(g, r) {
    shadow(g, r * 0.06, r * 0.08, r * 0.8, r * 0.8, 0.28);
    // цепочка
    g.strokeStyle = '#c9a23a';
    g.lineWidth = r * 0.05;
    for (let k = 0; k < 9; k++) {
      g.beginPath();
      g.ellipse(r * 0.1 + k * r * 0.11, -r * 0.75 - Math.sin(k * 0.5) * r * 0.25, r * 0.06, r * 0.035, 0.4, 0, P2);
      g.stroke();
    }
    g.beginPath();
    g.arc(0, 0, r * 0.68, 0, P2);
    const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.68);
    gr.addColorStop(0, '#f6dc86');
    gr.addColorStop(1, '#a8792e');
    g.fillStyle = gr;
    g.fill();
    g.beginPath();
    g.arc(0, -r * 0.72, r * 0.1, 0, P2);
    g.fill();
    g.beginPath();
    g.arc(0, 0, r * 0.56, 0, P2);
    g.fillStyle = '#fffaf0';
    g.fill();
    g.fillStyle = '#3a2a1a';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * P2;
      g.beginPath();
      g.arc(Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46, r * (k % 3 ? 0.02 : 0.04), 0, P2);
      g.fill();
    }
  },
  cat(g, r) {
    shadow(g, r * 0.08, r * 0.12, r * 1.0, r * 0.85, 0.3);
    const fur = '#e8954a', dark = '#b8652a', light = '#fbe3c4';
    // хвост вокруг
    g.beginPath();
    g.arc(0, r * 0.05, r * 0.78, 0.2, 2.6);
    g.strokeStyle = fur;
    g.lineWidth = r * 0.22;
    g.stroke();
    g.beginPath();
    g.arc(Math.cos(2.6) * r * 0.78, r * 0.05 + Math.sin(2.6) * r * 0.78, r * 0.11, 0, P2);
    g.fillStyle = light;
    g.fill();
    // тело-клубок
    g.beginPath();
    g.ellipse(0, 0, r * 0.75, r * 0.62, 0, 0, P2);
    const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.75);
    gr.addColorStop(0, '#f3ad66');
    gr.addColorStop(1, fur);
    g.fillStyle = gr;
    g.fill();
    // полоски
    g.strokeStyle = dark;
    g.lineWidth = r * 0.07;
    g.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const a = -0.6 + k * 0.32;
      g.beginPath();
      g.arc(r * 0.05, r * 0.05, r * (0.45 + (k % 2) * 0.08), a - 0.18, a + 0.18);
      g.stroke();
    }
    // голова
    const hx = -r * 0.35, hy = -r * 0.12;
    g.fillStyle = fur;
    [[-1, -0.95], [1, -0.55]].forEach(([s, a]) => {
      g.save();
      g.translate(hx, hy);
      g.rotate(a);
      g.beginPath();
      g.moveTo(-r * 0.12, -r * 0.24);
      g.lineTo(0, -r * 0.45);
      g.lineTo(r * 0.12, -r * 0.24);
      g.closePath();
      g.fill();
      g.fillStyle = '#f2b8a0';
      g.beginPath();
      g.moveTo(-r * 0.06, -r * 0.27);
      g.lineTo(0, -r * 0.38);
      g.lineTo(r * 0.06, -r * 0.27);
      g.closePath();
      g.fill();
      g.fillStyle = fur;
      g.restore();
    });
    g.beginPath();
    g.ellipse(hx, hy, r * 0.32, r * 0.28, -0.6, 0, P2);
    g.fillStyle = '#f0a55c';
    g.fill();
    g.beginPath();
    g.ellipse(hx + r * 0.06, hy + r * 0.1, r * 0.15, r * 0.1, -0.6, 0, P2);
    g.fillStyle = light;
    g.fill();
    // закрытые глазки
    g.strokeStyle = '#5a2e14';
    g.lineWidth = r * 0.035;
    [[-0.12, -0.04], [0.06, -0.15]].forEach(([dx, dy]) => {
      g.beginPath();
      g.arc(hx + dx * r, hy + dy * r, r * 0.06, 0.2, Math.PI - 0.2);
      g.stroke();
    });
    g.beginPath();
    g.arc(hx + r * 0.02, hy + r * 0.04, r * 0.025, 0, P2);
    g.fillStyle = '#d0706a';
    g.fill();
    // лапки
    g.fillStyle = light;
    [[-0.05, 0.42], [0.12, 0.45]].forEach(([x, y]) => {
      g.beginPath();
      g.ellipse(x * r, y * r, r * 0.1, r * 0.07, 0, 0, P2);
      g.fill();
    });
  },
  jam(g, r) {
    shadow(g, r * 0.06, r * 0.08, r * 0.85, r * 0.85, 0.28);
    // клетчатая ткань на крышке
    g.save();
    g.beginPath();
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * P2;
      const rr = r * (0.82 + (k % 2) * 0.06);
      k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0);
    }
    g.closePath();
    g.fillStyle = '#fff';
    g.fill();
    g.clip();
    g.fillStyle = 'rgba(214,58,48,.55)';
    for (let k = -6; k <= 6; k++) {
      g.fillRect(k * r * 0.16 - r * 0.04, -r, r * 0.08, r * 2);
      g.fillRect(-r, k * r * 0.16 - r * 0.04, r * 2, r * 0.08);
    }
    g.restore();
    g.beginPath();
    g.arc(0, 0, r * 0.55, 0, P2);
    g.strokeStyle = '#c9a23a';
    g.lineWidth = r * 0.08;
    g.stroke();
    g.beginPath();
    g.ellipse(r * 0.45, -r * 0.4, r * 0.18, r * 0.08, -0.8, 0, P2);
    g.ellipse(r * 0.6, -r * 0.25, r * 0.18, r * 0.08, 0.6, 0, P2);
    g.fillStyle = '#c9a23a';
    g.fill();
  },
  teapot(g, r) {
    shadow(g, r * 0.08, r * 0.1, r * 1.0, r * 0.95, 0.3);
    // носик и ручка
    g.fillStyle = '#f6f2ea';
    g.beginPath();
    g.moveTo(r * 0.5, -r * 0.12);
    g.lineTo(r * 1.05, -r * 0.3);
    g.lineTo(r * 1.1, -r * 0.16);
    g.lineTo(r * 0.55, r * 0.15);
    g.closePath();
    g.fill();
    g.strokeStyle = '#3f72b8';
    g.lineWidth = r * 0.03;
    g.stroke();
    g.beginPath();
    g.ellipse(-r * 0.78, 0, r * 0.22, r * 0.3, 0, 0, P2);
    g.strokeStyle = '#f6f2ea';
    g.lineWidth = r * 0.1;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.68, 0, P2);
    const gr = g.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r * 0.68);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(1, '#e2dcd0');
    g.fillStyle = gr;
    g.fill();
    // гжельский цветок
    g.fillStyle = '#2f5fae';
    for (let k = 0; k < 6; k++) {
      g.save();
      g.rotate((k / 6) * P2);
      g.beginPath();
      g.ellipse(r * 0.47, 0, r * 0.1, r * 0.05, 0, 0, P2);
      g.fill();
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, r * 0.3, 0, P2);
    g.fillStyle = '#f6f2ea';
    g.fill();
    g.strokeStyle = '#2f5fae';
    g.lineWidth = r * 0.04;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.1, 0, P2);
    g.fillStyle = '#2f5fae';
    g.fill();
  },
  crossword(g, r) {
    g.rotate(-0.18);
    const w = r * 0.95, h = r * 0.72;
    shadow(g, r * 0.08, r * 0.1, r * 1.05, r * 0.8, 0.28);
    g.fillStyle = '#f1ece0';
    g.fillRect(-w, -h, w * 2, h * 2);
    g.fillStyle = 'rgba(60,50,40,.35)';
    for (let k = 0; k < 9; k++) g.fillRect(-w * 0.9, -h * 0.85 + k * h * 0.2, w * 0.6, h * 0.05);
    g.fillStyle = '#2a2420';
    g.font = `800 ${r * 0.13}px Nunito, sans-serif`;
    g.fillText(t('d_crossword').toUpperCase(), -w * 0.92, -h * 0.92 + r * 0.04);
    const cs = r * 0.13;
    const R = rng(3);
    for (let y = 0; y < 9; y++) for (let x = 0; x < 7; x++) {
      const px = w * 0.0 + x * cs - w * 0.15, py = -h * 0.75 + y * cs;
      g.fillStyle = R() < 0.25 ? '#2a2420' : '#fff';
      g.fillRect(px, py, cs, cs);
      g.strokeStyle = 'rgba(40,30,20,.5)';
      g.lineWidth = 1;
      g.strokeRect(px, py, cs, cs);
    }
    // карандаш
    g.save();
    g.translate(r * 0.2, h * 0.95);
    g.rotate(-0.25);
    g.fillStyle = '#f2c13a';
    g.fillRect(-r * 0.8, -r * 0.06, r * 1.3, r * 0.12);
    g.fillStyle = '#e8b48a';
    g.beginPath();
    g.moveTo(r * 0.5, -r * 0.06);
    g.lineTo(r * 0.72, 0);
    g.lineTo(r * 0.5, r * 0.06);
    g.fill();
    g.fillStyle = '#e88a9a';
    g.fillRect(-r * 0.9, -r * 0.06, r * 0.12, r * 0.12);
    g.restore();
  },
  scatter(g, r, season) {
    const R = rng(season.length * 13);
    if (season === 'autumn') {
      for (let k = 0; k < 4; k++) {
        g.save();
        g.translate((R() - 0.5) * r * 1.4, (R() - 0.5) * r * 1.4);
        g.rotate(R() * P2);
        shadow(g, 3, 4, r * 0.4, r * 0.4, 0.22);
        leafBig(g, r * 0.42, ['#e8742a', '#d9481f', '#f2b12a', '#b8452a'][k]);
        g.restore();
      }
    } else if (season === 'winter') {
      // мандарины
      [[-0.3, -0.2], [0.35, 0.05], [-0.05, 0.45]].forEach(([x, y], k) => {
        g.save();
        g.translate(x * r, y * r);
        shadow(g, 3, 5, r * 0.4, r * 0.4, 0.3);
        g.beginPath();
        g.arc(0, 0, r * 0.34, 0, P2);
        const gr = g.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.34);
        gr.addColorStop(0, '#ffb04a');
        gr.addColorStop(1, '#e6701a');
        g.fillStyle = gr;
        g.fill();
        g.fillStyle = 'rgba(160,70,10,.25)';
        for (let d = 0; d < 14; d++) {
          g.beginPath();
          g.arc((R() - 0.5) * r * 0.5, (R() - 0.5) * r * 0.5, r * 0.015, 0, P2);
          g.fill();
        }
        if (k !== 1) {
          g.beginPath();
          g.ellipse(r * 0.1, -r * 0.08, r * 0.14, r * 0.06, -0.6, 0, P2);
          g.fillStyle = '#3f7a2e';
          g.fill();
        }
        g.restore();
      });
    } else if (season === 'spring') {
      for (let k = 0; k < 9; k++) {
        g.save();
        g.translate((R() - 0.5) * r * 1.6, (R() - 0.5) * r * 1.6);
        g.rotate(R() * P2);
        g.beginPath();
        g.ellipse(0, 0, r * 0.13, r * 0.08, 0, 0, P2);
        g.fillStyle = ['#f7b6c8', '#fbd3df', '#ffffff'][k % 3];
        g.fill();
        g.restore();
      }
      g.save();
      g.translate(r * 0.1, r * 0.1);
      drawItem(g, 'tulip', 0, 0, r * 0.45);
      g.restore();
    } else {
      [[-0.35, -0.2], [0.3, -0.25], [0.05, 0.3], [-0.3, 0.42]].forEach(([x, y], k) => {
        g.save();
        g.translate(x * r, y * r);
        g.rotate(R() * 2 - 1);
        shadow(g, 3, 4, r * 0.3, r * 0.3, 0.25);
        strawberryFree(g, r * 0.3);
        g.restore();
      });
    }
  },
};

function leafBig(g, s, c) {
  const pts = [[0, -1], [0.22, -0.55], [0.62, -0.72], [0.5, -0.28], [0.95, -0.12], [0.55, 0.12], [0.62, 0.45], [0.18, 0.3], [0.06, 0.62], [-0.06, 0.62], [-0.18, 0.3], [-0.62, 0.45], [-0.55, 0.12], [-0.95, -0.12], [-0.5, -0.28], [-0.62, -0.72], [-0.22, -0.55]];
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
  g.closePath();
  g.fillStyle = c;
  g.fill();
  g.strokeStyle = 'rgba(90,30,10,.45)';
  g.lineWidth = s * 0.05;
  g.beginPath();
  g.moveTo(0, s * 0.95);
  g.lineTo(0, -s * 0.6);
  g.moveTo(0, s * 0.1);
  g.lineTo(s * 0.5, -s * 0.3);
  g.moveTo(0, s * 0.1);
  g.lineTo(-s * 0.5, -s * 0.3);
  g.stroke();
}
function strawberryFree(g, s) {
  g.beginPath();
  g.moveTo(0, s * 0.92);
  g.bezierCurveTo(-s * 0.95, s * 0.2, -s * 0.75, -s * 0.6, 0, -s * 0.55);
  g.bezierCurveTo(s * 0.75, -s * 0.6, s * 0.95, s * 0.2, 0, s * 0.92);
  g.fillStyle = '#e0343a';
  g.fill();
  g.fillStyle = '#ffe58a';
  for (let k = 0; k < 7; k++) {
    g.beginPath();
    g.arc(Math.sin(k * 2.1) * s * 0.35, -s * 0.2 + k * s * 0.12, s * 0.04, 0, P2);
    g.fill();
  }
  g.fillStyle = '#3e9a35';
  for (let k = 0; k < 5; k++) {
    g.save();
    g.translate(0, -s * 0.55);
    g.rotate(-1.3 + k * 0.65);
    g.beginPath();
    g.ellipse(0, -s * 0.16, s * 0.08, s * 0.2, 0, 0, P2);
    g.fill();
    g.restore();
  }
}

// ---------- сборка фона ----------
// avoid: прямоугольники, где не должно быть вещей (поле, лоток, кнопки), в CSS-пикселях
export function buildTable(W, H, dpr, season, decorIds, avoid, scene) {
  // У квадратного поля размер хранится в s, у панелей — в w/h.
  avoid=avoid.map(a=>({...a,w:a.w??a.s,h:a.h??a.s}));
  const c = canvas(W * dpr, H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  // в путешествии вместо стола — нарисованный фон главы
  if (scene) {
    const roomState=scene==='hearth'?roomBackground(decorIds,W,H):null;
    let sa;
    if(roomState?.image){paintBackground(g,W,H,'hearth',roomState.image);sa={kind:'generated',id:'hearth',avoid};}
    else sa=buildScene(g,W,H,scene,avoid);
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(10,5,0,0)');
    vg.addColorStop(1, 'rgba(10,5,0,.32)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    const roomMeta=roomState?Object.fromEntries(Object.entries(roomState).filter(([key])=>key!=='image'&&key!=='promise')):null;
    return { canvas: c, anims: [], scene: sa, roomState:roomMeta };
  }
  planks(g, W, H, season);
  const unit = Math.max(44, Math.min(110, Math.min(W, H) * 0.085));
  const placed = [];
  const anims = [];
  const R = rng(5);
  const pad = unit * 0.15;
  const blocked = (x, y, r) => {
    for (const a of avoid) {
      const nx = Math.max(a.x - pad, Math.min(x, a.x + a.w + pad));
      const ny = Math.max(a.y - pad, Math.min(y, a.y + a.h + pad));
      if (Math.hypot(nx - x, ny - y) < r) return true;
    }
    for (const p of placed) if (Math.hypot(p.x - x, p.y - y) < (p.r + r) * 0.92) return true;
    return false;
  };
  for (const id of decorIds) {
    const d = DECOR.find((q) => q.id === id);
    if (!d) continue;
    let done = false;
    for (const k of [1, 0.85, 0.7, 0.58]) {
      const r = unit * d.r * k;
      let best = null, bv = -1e9;
      const step = Math.max(14, r * 0.35);
      for (let y = r + pad; y < H - r - pad; y += step) for (let x = r + pad; x < W - r - pad; x += step) {
        if (blocked(x, y, r * 1.05)) continue;
        // подальше от других вещей и чуть-чуть случайности
        let v = R() * unit * 0.4;
        let dmin = 1e9;
        for (const p of placed) dmin = Math.min(dmin, Math.hypot(p.x - x, p.y - y) - p.r);
        v += Math.min(dmin, unit * 4);
        // не прижимать к самому краю экрана
        v -= Math.max(0, r * 0.9 - Math.min(x, W - x, y, H - y)) * 1.5;
        if (v > bv) {
          bv = v;
          best = [x, y];
        }
      }
      if (best) {
        placed.push({ id, x: best[0], y: best[1], r });
        done = true;
        break;
      }
    }
    if (!done) continue;
  }
  for (const p of placed) {
    g.save();
    g.translate(p.x, p.y);
    const art=decorArt(p.id);
    if(art){g.shadowColor='rgba(35,17,5,.32)';g.shadowBlur=p.r*.12;g.shadowOffsetY=p.r*.07;g.drawImage(art,-p.r,-p.r,p.r*2,p.r*2);}
    else DRAW[p.id](g, p.r * 0.95, season);
    g.restore();
    if (!art && p.id === 'cup') anims.push({ t: 'steam', x: p.x, y: p.y, r: p.r });
    if (!art && p.id === 'candle') anims.push({ t: 'flame', x: p.x, y: p.y, r: p.r });
    if (!art && p.id === 'watch') anims.push({ t: 'watch', x: p.x, y: p.y, r: p.r * 0.95 });
  }
  // тёплый свет лампы и виньетка
  const lx = W * 0.15, ly = -H * 0.05;
  const lg = g.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 1.1);
  lg.addColorStop(0, 'rgba(255,214,150,.30)');
  lg.addColorStop(0.5, 'rgba(255,190,120,.08)');
  lg.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  vg.addColorStop(0, 'rgba(30,12,2,0)');
  vg.addColorStop(1, 'rgba(30,12,2,.5)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  return { canvas: c, anims, placed };
}

// анимированные мелочи поверх фона: пар над чаем, огонёк свечи, стрелки часов
export function drawAnims(g, anims, t) {
  for (const a of anims) {
    if (a.t === 'steam') {
      g.save();
      g.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.35 + k / 3) % 1;
        const alpha = Math.sin(ph * Math.PI) * 0.35;
        g.strokeStyle = `rgba(255,255,255,${alpha})`;
        g.lineWidth = a.r * 0.09;
        g.beginPath();
        const x0 = a.x + (k - 1) * a.r * 0.18, y0 = a.y - a.r * 0.1 - ph * a.r * 0.9;
        for (let s = 0; s <= 1; s += 0.1) {
          const x = x0 + Math.sin(s * 5 + t * 2 + k) * a.r * 0.1;
          const y = y0 - s * a.r * 0.5;
          s ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
      g.restore();
    } else if (a.t === 'flame') {
      const f = 0.85 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.06;
      const gl = g.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 2.6 * f);
      gl.addColorStop(0, 'rgba(255,200,90,.42)');
      gl.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = gl;
      g.beginPath();
      g.arc(a.x, a.y, a.r * 2.6 * f, 0, P2);
      g.fill();
      g.beginPath();
      g.arc(a.x, a.y, a.r * 0.2 * f, 0, P2);
      g.fillStyle = '#fff3c0';
      g.fill();
      g.beginPath();
      g.arc(a.x, a.y, a.r * 0.06, 0, P2);
      g.fillStyle = '#3a2a1a';
      g.fill();
    } else if (a.t === 'watch') {
      const d = new Date();
      const h = (d.getHours() % 12) + d.getMinutes() / 60, m = d.getMinutes() + d.getSeconds() / 60, s = d.getSeconds() + d.getMilliseconds() / 1000;
      const hand = (ang, len, w, c) => {
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(a.x + Math.sin(ang) * len, a.y - Math.cos(ang) * len);
        g.strokeStyle = c;
        g.lineWidth = w;
        g.lineCap = 'round';
        g.stroke();
      };
      hand((h / 12) * P2, a.r * 0.28, a.r * 0.06, '#2a1a0a');
      hand((m / 60) * P2, a.r * 0.42, a.r * 0.04, '#2a1a0a');
      hand((s / 60) * P2, a.r * 0.46, a.r * 0.015, '#c4122a');
      g.beginPath();
      g.arc(a.x, a.y, a.r * 0.04, 0, P2);
      g.fillStyle = '#2a1a0a';
      g.fill();
    }
  }
}

export { rgba };
