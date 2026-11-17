import { CLASSIC_ORDER, CLASSIC_COLOR, drawClassic } from './classic.js';
import { drawPaintedFace } from './tile-art.js';
import { drawSkinBody } from './skin-art.js';
// Painted botanical faces on beveled ceramic bodies. Canvas drawings remain an offline fallback.

import { FRUITS, FLOWERS, FACE_ORDER, FACE_COLOR } from './tile-catalog.js';
export { FRUITS, FLOWERS, FACE_ORDER, FACE_COLOR } from './tile-catalog.js';
export const isFlower = f => FLOWERS.includes(f);

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// ---------- кисти ----------
const OUT = '#3a2414';
function rg(g, x, y, r, c1, c2) {
  const gr = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r * 1.08);
  gr.addColorStop(0, c1);
  gr.addColorStop(1, c2);
  return gr;
}
function lg(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  return gr;
}
function fillStroke(g, fill, stroke = OUT, lw = 3.4) {
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = lw;
  g.strokeStyle = stroke;
  g.stroke();
}
function circle(g, x, y, r, fill, stroke = OUT, lw = 3.4) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  fillStroke(g, fill, stroke, lw);
}
function ellipse(g, x, y, rx, ry, rot, fill, stroke = OUT, lw = 3.4) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) fillStroke(g, fill, stroke, lw);
}
function shine(g, x, y, rx, ry, rot = -0.6, a = 0.6) {
  g.save();
  g.globalAlpha = a;
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fillStyle = '#fff';
  g.fill();
  g.restore();
}
// листик-миндалина с прожилкой
function leaf(g, x, y, len, ang, c1 = '#7ccf4a', c2 = '#3a8a24', w = 0.42) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.5, -len * w, len, 0);
  g.quadraticCurveTo(len * 0.5, len * w, 0, 0);
  g.closePath();
  fillStroke(g, lg(g, 0, -len * w, 0, len * w, [c1, c2]), '#22501a', 3);
  g.beginPath();
  g.moveTo(len * 0.1, 0);
  g.lineTo(len * 0.85, 0);
  g.strokeStyle = 'rgba(30,70,20,.55)';
  g.lineWidth = 2;
  g.stroke();
  g.restore();
}
function stem(g, pts, c = '#6a4424', w = 4.5) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  if (pts.length === 4) g.lineTo(pts[2], pts[3]);
  else g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
  g.lineCap = 'round';
  g.strokeStyle = c;
  g.lineWidth = w;
  g.stroke();
}
// лепесток: от центра наружу
function petal(g, cx, cy, ang, r0, len, wid, fill, stroke = OUT, lw = 3, tip = 'round') {
  g.save();
  g.translate(cx, cy);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(r0, 0);
  if (tip === 'notch') {
    g.bezierCurveTo(r0 + len * 0.3, -wid, r0 + len, -wid * 1.05, r0 + len, -wid * 0.25);
    g.lineTo(r0 + len * 0.86, 0);
    g.lineTo(r0 + len, wid * 0.25);
    g.bezierCurveTo(r0 + len, wid * 1.05, r0 + len * 0.3, wid, r0, 0);
  } else if (tip === 'point') {
    g.bezierCurveTo(r0 + len * 0.35, -wid, r0 + len * 0.75, -wid * 0.7, r0 + len, 0);
    g.bezierCurveTo(r0 + len * 0.75, wid * 0.7, r0 + len * 0.35, wid, r0, 0);
  } else if (tip === 'fringe') {
    g.bezierCurveTo(r0 + len * 0.4, -wid * 0.5, r0 + len * 0.8, -wid, r0 + len, -wid);
    for (let k = 0; k < 4; k++) {
      const yy = -wid + (k + 0.5) * (wid / 2);
      g.lineTo(r0 + len * 0.86, yy);
      g.lineTo(r0 + len, yy + wid / 4);
    }
    g.bezierCurveTo(r0 + len * 0.8, wid, r0 + len * 0.4, wid * 0.5, r0, 0);
  } else {
    g.bezierCurveTo(r0 + len * 0.2, -wid, r0 + len, -wid * 1.1, r0 + len, 0);
    g.bezierCurveTo(r0 + len, wid * 1.1, r0 + len * 0.2, wid, r0, 0);
  }
  g.closePath();
  fillStroke(g, fill, stroke, lw);
  g.restore();
}
function dots(g, pts, r, c) {
  g.fillStyle = c;
  for (const [x, y] of pts) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}
function star5(g, x, y, r, fill, stroke) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  fillStroke(g, fill, stroke, 2.2);
}

// ---------- фрукты ----------
const F = {
  apple(g) {
    g.beginPath();
    g.moveTo(50, 33);
    g.bezierCurveTo(62, 22, 88, 27, 87, 54);
    g.bezierCurveTo(86, 78, 68, 92, 58, 90);
    g.bezierCurveTo(54, 89, 46, 89, 42, 90);
    g.bezierCurveTo(32, 92, 14, 78, 13, 54);
    g.bezierCurveTo(12, 27, 38, 22, 50, 33);
    fillStroke(g, rg(g, 50, 58, 38, '#ff8a6e', '#c8211a'));
    stem(g, [50, 34, 51, 24, 55, 15]);
    leaf(g, 54, 23, 26, -0.45);
    shine(g, 30, 48, 7, 12, -0.4);
  },
  pear(g) {
    g.beginPath();
    g.moveTo(50, 22);
    g.bezierCurveTo(60, 22, 61, 38, 66, 47);
    g.bezierCurveTo(82, 60, 82, 92, 50, 92);
    g.bezierCurveTo(18, 92, 18, 60, 34, 47);
    g.bezierCurveTo(39, 38, 40, 22, 50, 22);
    fillStroke(g, rg(g, 50, 64, 36, '#f2f79a', '#9ab83a'));
    // румянец
    g.save();
    g.globalAlpha = 0.35;
    ellipse(g, 64, 72, 10, 12, 0, '#ff8a5a', 'transparent', 0);
    g.restore();
    dots(g, [[38, 70], [44, 80], [58, 62], [62, 82], [34, 60]], 1.3, 'rgba(110,80,20,.5)');
    stem(g, [50, 24, 50, 16, 54, 9]);
    leaf(g, 52, 16, 22, -0.6);
    shine(g, 38, 58, 6, 11, -0.3);
  },
  cherry(g) {
    stem(g, [34, 64, 40, 34, 58, 14], '#4a7a24', 3.6);
    stem(g, [67, 68, 66, 36, 58, 14], '#4a7a24', 3.6);
    leaf(g, 58, 15, 26, -0.15);
    circle(g, 33, 68, 18, rg(g, 33, 68, 18, '#ff7a8a', '#a8102e'));
    circle(g, 67, 72, 18, rg(g, 67, 72, 18, '#ff7a8a', '#a8102e'));
    shine(g, 27, 62, 4, 7, -0.5);
    shine(g, 61, 66, 4, 7, -0.5);
  },
  strawberry(g) {
    g.beginPath();
    g.moveTo(50, 92);
    g.bezierCurveTo(26, 80, 12, 52, 21, 38);
    g.bezierCurveTo(30, 26, 70, 26, 79, 38);
    g.bezierCurveTo(88, 52, 74, 80, 50, 92);
    fillStroke(g, rg(g, 50, 58, 36, '#ff8080', '#c81a2a'));
    const seeds = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5 - r; c++) seeds.push([30 + c * 10 + r * 5, 46 + r * 11]);
    g.fillStyle = '#ffe680';
    for (const [x, y] of seeds) {
      g.beginPath();
      g.ellipse(x, y, 1.8, 3, 0, 0, Math.PI * 2);
      g.fill();
    }
    // зелёная розетка
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI + (i * Math.PI) / 9;
      const rr = i % 2 ? 8 : 20;
      g.lineTo(50 + Math.cos(a) * rr * 1.3, 34 + Math.sin(a) * rr * 0.55);
    }
    g.closePath();
    fillStroke(g, lg(g, 0, 22, 0, 40, ['#8ae05a', '#3a9a2a']), '#22501a', 3);
    stem(g, [50, 30, 50, 22, 54, 14], '#3a8a24', 4);
    shine(g, 32, 50, 5, 9, -0.4, 0.45);
  },
  banana(g) {
    const one = (dx, dy, c) => {
      g.save();
      g.translate(dx, dy);
      g.beginPath();
      g.moveTo(20, 24);
      g.bezierCurveTo(16, 70, 54, 92, 90, 70);
      g.bezierCurveTo(92, 64, 89, 59, 84, 59);
      g.bezierCurveTo(60, 66, 40, 54, 36, 24);
      g.closePath();
      fillStroke(g, lg(g, 20, 30, 70, 90, c));
      g.beginPath();
      g.moveTo(27, 30);
      g.bezierCurveTo(28, 62, 54, 78, 84, 66);
      g.strokeStyle = 'rgba(160,110,10,.5)';
      g.lineWidth = 2.5;
      g.stroke();
      g.beginPath();
      g.moveTo(20, 24);
      g.lineTo(19, 14);
      g.lineTo(31, 13);
      g.lineTo(36, 24);
      g.closePath();
      fillStroke(g, '#8a6a2a', OUT, 3);
      circle(g, 89, 64, 3.5, '#5a3a1a', OUT, 2);
      g.restore();
    };
    one(6, -10, ['#f8e070', '#e8b828', '#c8901a']);
    one(-4, 4, ['#fff59a', '#ffd83a', '#e8a81a']);
    shine(g, 26, 52, 3, 9, -0.3, 0.5);
  },
  grapes(g) {
    stem(g, [50, 26, 52, 16, 58, 10], '#6a4424', 4);
    // виноградный лист
    g.save();
    g.translate(60, 20);
    g.rotate(-0.3);
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(6, -14, 20, -14, 22, -4);
    g.bezierCurveTo(30, -2, 30, 10, 20, 10);
    g.bezierCurveTo(14, 16, 4, 10, 0, 0);
    fillStroke(g, lg(g, 0, -12, 0, 12, ['#8ae05a', '#3a9a2a']), '#22501a', 3);
    g.restore();
    const B = [[34, 36], [50, 34], [66, 36], [26, 52], [42, 50], [58, 50], [74, 52], [34, 66], [50, 66], [66, 66], [42, 80], [58, 80], [50, 92]];
    for (const [x, y] of B) {
      circle(g, x, y, 10.5, rg(g, x, y, 10.5, '#c8a0ff', '#5a2a9a'), OUT, 2.8);
      shine(g, x - 3.5, y - 3.5, 2.4, 3.6, -0.5, 0.6);
    }
  },
  orange(g) {
    circle(g, 50, 57, 34, rg(g, 50, 57, 34, '#ffd27a', '#ec7a0c'));
    dots(g, [[38, 46], [50, 40], [62, 46], [34, 60], [46, 54], [58, 56], [68, 62], [40, 72], [54, 70], [64, 76], [48, 82]], 1.4, 'rgba(180,80,0,.45)');
    circle(g, 50, 25, 3.5, '#5a7a24', OUT, 2);
    leaf(g, 52, 24, 24, -0.35);
    shine(g, 36, 44, 7, 11, -0.6);
  },
  lemon(g) {
    g.beginPath();
    g.moveTo(12, 58);
    g.bezierCurveTo(18, 30, 70, 22, 86, 44);
    g.lineTo(92, 42);
    g.lineTo(88, 50);
    g.bezierCurveTo(84, 78, 30, 88, 16, 66);
    g.lineTo(8, 66);
    g.closePath();
    fillStroke(g, rg(g, 48, 54, 38, '#fffab0', '#e8c210'));
    dots(g, [[34, 50], [48, 44], [62, 46], [40, 64], [56, 60], [70, 58]], 1.3, 'rgba(170,130,0,.4)');
    leaf(g, 70, 30, 24, -0.9);
    shine(g, 34, 46, 6, 10, -1.1);
  },
  watermelon(g) {
    g.save();
    g.translate(50, 34);
    g.beginPath();
    g.arc(0, 0, 42, 0.05, Math.PI - 0.05);
    g.closePath();
    fillStroke(g, lg(g, 0, 0, 0, 42, ['#5ac83a', '#2a7a1a']));
    g.beginPath();
    g.arc(0, 0, 35, 0.05, Math.PI - 0.05);
    g.closePath();
    g.fillStyle = '#f4ffd8';
    g.fill();
    g.beginPath();
    g.arc(0, 0, 31, 0.05, Math.PI - 0.05);
    g.closePath();
    g.fillStyle = rg(g, 0, 6, 30, '#ff8a8a', '#e8283a');
    g.fill();
    g.beginPath();
    g.moveTo(-42, 2);
    g.lineTo(42, 2);
    g.strokeStyle = OUT;
    g.lineWidth = 3.4;
    g.stroke();
    for (const [x, y, a] of [[-16, 12, 0.5], [0, 16, 0], [16, 12, -0.5], [-8, 24, 0.2], [8, 24, -0.2]]) {
      g.beginPath();
      g.ellipse(x, y, 2.4, 4.2, a, 0, Math.PI * 2);
      g.fillStyle = '#2a1a14';
      g.fill();
    }
    g.restore();
    // ещё одна долька позади для объёма
    g.globalAlpha = 1;
  },
  pineapple(g) {
    for (const [a, l] of [[-1.9, 26], [-1.57, 32], [-1.25, 26], [-2.3, 18], [-0.85, 18]]) leaf(g, 50, 36, l, a, '#8ae05a', '#2a8a2a', 0.28);
    ellipse(g, 50, 64, 24, 28, 0, rg(g, 50, 64, 28, '#ffe07a', '#d8861a'));
    g.save();
    g.beginPath();
    g.ellipse(50, 64, 22.5, 26.5, 0, 0, Math.PI * 2);
    g.clip();
    g.strokeStyle = 'rgba(140,70,0,.55)';
    g.lineWidth = 2.2;
    for (let k = -6; k <= 6; k++) {
      g.beginPath();
      g.moveTo(20 + k * 9, 34);
      g.lineTo(80 + k * 9, 94);
      g.stroke();
      g.beginPath();
      g.moveTo(80 - k * 9, 34);
      g.lineTo(20 - k * 9, 94);
      g.stroke();
    }
    g.restore();
    shine(g, 40, 54, 4, 9, -0.3, 0.45);
  },
  peach(g) {
    g.beginPath();
    g.moveTo(50, 32);
    g.bezierCurveTo(60, 22, 88, 30, 86, 58);
    g.bezierCurveTo(84, 82, 64, 92, 50, 90);
    g.bezierCurveTo(36, 92, 14, 82, 14, 58);
    g.bezierCurveTo(12, 30, 40, 22, 50, 32);
    fillStroke(g, rg(g, 44, 54, 40, '#ffe0b0', '#f06a5a'));
    g.beginPath();
    g.moveTo(50, 34);
    g.bezierCurveTo(42, 52, 44, 72, 52, 86);
    g.strokeStyle = 'rgba(170,60,40,.55)';
    g.lineWidth = 2.6;
    g.stroke();
    leaf(g, 51, 30, 24, -0.75);
    leaf(g, 49, 30, 20, -2.5);
    shine(g, 30, 52, 6, 10, -0.4, 0.5);
  },
  plum(g) {
    ellipse(g, 50, 58, 30, 34, 0.25, rg(g, 50, 58, 34, '#b48aff', '#3a1a7a'));
    g.beginPath();
    g.moveTo(56, 26);
    g.bezierCurveTo(46, 44, 46, 72, 58, 90);
    g.strokeStyle = 'rgba(40,10,80,.5)';
    g.lineWidth = 2.6;
    g.stroke();
    stem(g, [56, 26, 57, 18, 60, 12], '#6a4424', 3.6);
    leaf(g, 58, 18, 22, -0.4);
    shine(g, 36, 46, 5, 10, -0.3, 0.45);
  },
  kiwi(g) {
    circle(g, 50, 54, 36, rg(g, 50, 54, 36, '#b88a52', '#6a4420'));
    circle(g, 50, 54, 30, rg(g, 50, 54, 30, '#d8f87a', '#5aa81e'), '#4a7a1a', 2);
    ellipse(g, 50, 54, 10, 7, 0, '#fbffe0', 'rgba(120,150,40,.6)', 1.6);
    g.fillStyle = '#1e1a10';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath();
      g.ellipse(50 + Math.cos(a) * 16, 54 + Math.sin(a) * 13, 1.8, 3.2, a + Math.PI / 2, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(240,255,200,.6)';
    g.lineWidth = 1.4;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.beginPath();
      g.moveTo(50 + Math.cos(a) * 11, 54 + Math.sin(a) * 8);
      g.lineTo(50 + Math.cos(a) * 27, 54 + Math.sin(a) * 27);
      g.stroke();
    }
  },
  blueberry(g) {
    leaf(g, 50, 30, 30, -0.5);
    leaf(g, 50, 30, 26, -2.6);
    for (const [x, y, r] of [[36, 50, 17], [64, 52, 17], [50, 74, 18]]) {
      circle(g, x, y, r, rg(g, x, y, r, '#8aa4ff', '#26307a'));
      star5(g, x + 2, y - r * 0.5, r * 0.32, '#2a2050', '#1a1030');
      shine(g, x - r * 0.4, y - r * 0.15, r * 0.18, r * 0.32, -0.4, 0.45);
    }
  },
  avocado(g) {
    g.beginPath();
    g.moveTo(50, 12);
    g.bezierCurveTo(64, 12, 66, 34, 72, 44);
    g.bezierCurveTo(88, 62, 82, 92, 50, 92);
    g.bezierCurveTo(18, 92, 12, 62, 28, 44);
    g.bezierCurveTo(34, 34, 36, 12, 50, 12);
    fillStroke(g, lg(g, 0, 10, 0, 90, ['#5a8a2a', '#2e5a14']));
    g.beginPath();
    g.moveTo(50, 19);
    g.bezierCurveTo(60, 19, 60, 38, 66, 47);
    g.bezierCurveTo(80, 64, 76, 86, 50, 86);
    g.bezierCurveTo(24, 86, 20, 64, 34, 47);
    g.bezierCurveTo(40, 38, 40, 19, 50, 19);
    g.fillStyle = rg(g, 50, 60, 34, '#f4fcb0', '#a8cc4a');
    g.fill();
    circle(g, 50, 64, 13, rg(g, 50, 64, 13, '#d8905a', '#6a3414'));
    shine(g, 46, 59, 3, 5, -0.5, 0.5);
  },
  coconut(g) {
    circle(g, 42, 48, 30, rg(g, 42, 48, 30, '#c89058', '#5a3418'));
    g.strokeStyle = 'rgba(60,30,10,.55)';
    g.lineWidth = 1.6;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      g.beginPath();
      g.moveTo(42 + Math.cos(a) * 22, 48 + Math.sin(a) * 22);
      g.lineTo(42 + Math.cos(a + 0.15) * 29, 48 + Math.sin(a + 0.15) * 29);
      g.stroke();
    }
    dots(g, [[34, 38], [44, 36], [39, 46]], 3.5, '#2a160a');
    // половинка с белой мякотью
    g.beginPath();
    g.ellipse(64, 72, 26, 18, -0.1, 0, Math.PI * 2);
    fillStroke(g, '#7a4a22');
    ellipse(g, 64, 70, 21, 13, -0.1, rg(g, 64, 70, 21, '#ffffff', '#e8e2d0'), '#c8b89a', 2);
  },
};

// ---------- цветы ----------
const G = {
  sunflower(g) {
    for (let i = 0; i < 16; i++) petal(g, 50, 52, (i / 16) * Math.PI * 2, 14, 26, 7, lg(g, 0, 0, 40, 0, ['#ffe46a', '#f4a810']), OUT, 2.6, 'point');
    circle(g, 50, 52, 17, rg(g, 50, 52, 17, '#a86a2a', '#4a2410'));
    g.fillStyle = 'rgba(255,200,120,.5)';
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, r = 2 + Math.sqrt(i) * 3.6;
      g.beginPath();
      g.arc(50 + Math.cos(a) * r, 52 + Math.sin(a) * r, 1.6, 0, Math.PI * 2);
      g.fill();
    }
  },
  cornflower(g) {
    stem(g, [50, 70, 50, 82, 48, 96], '#4a8a2a', 4);
    leaf(g, 50, 86, 20, -0.6, '#8ac85a', '#3a7a24', 0.25);
    for (let i = 0; i < 9; i++) petal(g, 50, 48, (i / 9) * Math.PI * 2 - Math.PI / 2, 8, 30, 9, lg(g, 0, 0, 40, 0, ['#8ab0ff', '#2a4ad0']), OUT, 2.6, 'fringe');
    circle(g, 50, 48, 10, rg(g, 50, 48, 10, '#8a5ac8', '#3a1a6a'), OUT, 2.6);
    dots(g, [[47, 45], [53, 46], [50, 51], [46, 50], [54, 50]], 1.5, '#e8d8ff');
  },
  rose(g) {
    leaf(g, 42, 74, 28, 2.5);
    leaf(g, 58, 74, 28, 0.6);
    g.beginPath();
    g.moveTo(22, 46);
    g.bezierCurveTo(18, 72, 34, 84, 50, 84);
    g.bezierCurveTo(66, 84, 82, 72, 78, 46);
    g.bezierCurveTo(72, 30, 60, 22, 50, 22);
    g.bezierCurveTo(40, 22, 28, 30, 22, 46);
    fillStroke(g, rg(g, 50, 54, 34, '#ff8a9a', '#b8102e'));
    g.strokeStyle = 'rgba(110,0,20,.7)';
    g.lineWidth = 3;
    g.lineCap = 'round';
    // завитки лепестков
    g.beginPath();
    g.arc(50, 50, 8, 0.2, Math.PI * 1.7);
    g.stroke();
    g.beginPath();
    g.arc(51, 52, 15, Math.PI * 0.9, Math.PI * 2.1);
    g.stroke();
    g.beginPath();
    g.arc(49, 54, 22, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
    g.beginPath();
    g.moveTo(26, 46);
    g.quadraticCurveTo(36, 38, 40, 46);
    g.stroke();
    g.beginPath();
    g.moveTo(74, 46);
    g.quadraticCurveTo(64, 38, 60, 46);
    g.stroke();
    shine(g, 38, 34, 5, 8, -0.8, 0.4);
  },
  daisy(g) {
    for (let i = 0; i < 14; i++) petal(g, 50, 50, (i / 14) * Math.PI * 2, 9, 32, 7.5, lg(g, 0, 0, 40, 0, ['#ffffff', '#e8eef4']), '#5a5a6a', 2.4);
    circle(g, 50, 50, 13, rg(g, 50, 50, 13, '#fff07a', '#e8a010'), '#8a5a10', 2.8);
    dots(g, [[46, 46], [52, 45], [55, 50], [50, 54], [45, 52], [50, 49]], 1.4, 'rgba(160,90,0,.6)');
  },
  lavender(g) {
    const stems = [[30, 92, 26, 26], [50, 94, 50, 16], [70, 92, 74, 26]];
    for (const [x0, y0, x1, y1] of stems) stem(g, [x0, y0, (x0 + x1) / 2, (y0 + y1) / 2 + 6, x1, y1], '#5a8a3a', 3.4);
    for (const [x0, y0, x1, y1] of stems) {
      for (let k = 0; k < 7; k++) {
        const u = k / 7;
        const x = x1 + (x0 - x1) * u * 0.55, y = y1 + (y0 - y1) * u * 0.55;
        for (const s of [-1, 1]) ellipse(g, x + s * 4.2, y, 4.6, 6.2, s * 0.5, rg(g, x + s * 4, y, 6, '#d8b8ff', '#7a4ad0'), '#3a1a6a', 1.8);
      }
    }
  },
  tulip(g) {
    stem(g, [50, 60, 52, 80, 50, 96], '#3a8a2a', 5);
    leaf(g, 50, 92, 36, -1.05, '#8ad06a', '#3a8a2a', 0.22);
    leaf(g, 50, 92, 32, -2.2, '#8ad06a', '#3a8a2a', 0.22);
    const body = lg(g, 30, 20, 70, 70, ['#ffa0c8', '#e8306a', '#a8104a']);
    g.beginPath();
    g.moveTo(28, 26);
    g.lineTo(38, 36);
    g.lineTo(50, 18);
    g.lineTo(62, 36);
    g.lineTo(72, 26);
    g.bezierCurveTo(78, 46, 74, 66, 50, 68);
    g.bezierCurveTo(26, 66, 22, 46, 28, 26);
    fillStroke(g, body);
    g.beginPath();
    g.moveTo(50, 20);
    g.bezierCurveTo(42, 34, 42, 56, 50, 66);
    g.strokeStyle = 'rgba(120,0,40,.5)';
    g.lineWidth = 2.4;
    g.stroke();
    shine(g, 37, 44, 4, 9, -0.2, 0.4);
  },
  forgetme(g) {
    leaf(g, 50, 80, 30, -0.4);
    leaf(g, 50, 80, 28, -2.7);
    for (const [x, y, r] of [[32, 40, 15], [66, 38, 15], [48, 66, 16]]) {
      for (let i = 0; i < 5; i++) petal(g, x, y, (i / 5) * Math.PI * 2 - Math.PI / 2, 2, r, r * 0.55, rg(g, x, y, r, '#c8e6ff', '#3a8ae8'), OUT, 2.2);
      circle(g, x, y, r * 0.3, '#ffe04a', '#a87a10', 1.8);
      dots(g, [[x, y]], 1.4, '#fff');
    }
  },
  poppy(g) {
    stem(g, [50, 70, 54, 84, 50, 96], '#4a8a2a', 4);
    for (const a of [-2.4, -0.7, 0.85, 2.4]) petal(g, 50, 48, a, 2, 34, 22, rg(g, 50 + Math.cos(a) * 18, 48 + Math.sin(a) * 18, 22, '#ff9a6a', '#d8200a'), OUT, 3);
    circle(g, 50, 48, 11, rg(g, 50, 48, 11, '#5a5a3a', '#14140a'));
    g.strokeStyle = '#14140a';
    g.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(50 + Math.cos(a) * 11, 48 + Math.sin(a) * 11);
      g.lineTo(50 + Math.cos(a) * 17, 48 + Math.sin(a) * 17);
      g.stroke();
    }
    dots(g, [[47, 45], [53, 45]], 1.6, '#c8c87a');
  },
  bell(g) {
    g.beginPath();
    g.moveTo(16, 92);
    g.bezierCurveTo(22, 40, 50, 12, 84, 22);
    g.strokeStyle = '#4a8a2a';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.stroke();
    leaf(g, 22, 80, 24, -0.4, '#8ad06a', '#3a8a2a', 0.3);
    for (const [x, y, s] of [[34, 50, 1], [56, 32, 1.05], [80, 30, 0.9]]) {
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      stem(g, [0, -6, 0, 4], '#4a8a2a', 3);
      g.beginPath();
      g.moveTo(-6, 2);
      g.bezierCurveTo(-8, 14, -12, 22, -16, 28);
      g.lineTo(-10, 26);
      g.lineTo(-5, 30);
      g.lineTo(0, 27);
      g.lineTo(5, 30);
      g.lineTo(10, 26);
      g.lineTo(16, 28);
      g.bezierCurveTo(12, 22, 8, 14, 6, 2);
      g.closePath();
      fillStroke(g, lg(g, -14, 0, 14, 28, ['#d8c0ff', '#7a4ae0', '#4a20a0']), OUT, 2.6);
      g.restore();
    }
  },
  sakura(g) {
    for (let i = 0; i < 5; i++) petal(g, 50, 52, (i / 5) * Math.PI * 2 - Math.PI / 2, 4, 36, 17, rg(g, 50, 52, 40, '#ffffff', '#f28ab4'), '#8a3a5a', 2.8, 'notch');
    g.strokeStyle = '#c8306a';
    g.lineWidth = 1.8;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.beginPath();
      g.moveTo(50, 52);
      g.lineTo(50 + Math.cos(a) * 13, 52 + Math.sin(a) * 13);
      g.stroke();
      dots(g, [[50 + Math.cos(a) * 13, 52 + Math.sin(a) * 13]], 1.9, '#f8d040');
    }
    circle(g, 50, 52, 4, '#e8406a', '#8a1a3a', 1.5);
  },
  lily(g) {
    for (let i = 0; i < 6; i++) petal(g, 50, 52, (i / 6) * Math.PI * 2 - Math.PI / 2, 4, 40, 11, lg(g, 0, 0, 44, 0, ['#ffe08a', '#ff9a2a', '#e8600a']), OUT, 2.6, 'point');
    g.fillStyle = '#8a2a0a';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      for (const d of [14, 22]) {
        g.beginPath();
        g.arc(50 + Math.cos(a) * d + Math.cos(a + 1.57) * 2, 52 + Math.sin(a) * d + Math.sin(a + 1.57) * 2, 1.5, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.strokeStyle = '#6a8a2a';
    g.lineWidth = 1.8;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      g.beginPath();
      g.moveTo(50, 52);
      g.lineTo(50 + Math.cos(a) * 17, 52 + Math.sin(a) * 17);
      g.stroke();
      ellipse(g, 50 + Math.cos(a) * 18, 52 + Math.sin(a) * 18, 3.6, 2, a, '#8a3a10', '#5a2008', 1);
    }
  },
  iris(g) {
    stem(g, [50, 70, 50, 84, 50, 96], '#3a8a2a', 4.5);
    leaf(g, 50, 94, 30, -1.2, '#8ad06a', '#3a8a2a', 0.18);
    const pur = (x, y, r) => rg(g, x, y, r, '#c8b0ff', '#4a20b0');
    // три верхних лепестка
    petal(g, 50, 50, -Math.PI / 2, 0, 36, 13, pur(50, 30, 20), OUT, 2.6);
    petal(g, 50, 50, -Math.PI / 2 - 0.7, 0, 30, 11, pur(36, 34, 18), OUT, 2.6);
    petal(g, 50, 50, -Math.PI / 2 + 0.7, 0, 30, 11, pur(64, 34, 18), OUT, 2.6);
    // нижние, опущенные
    for (const a of [0.55, Math.PI - 0.55, Math.PI / 2]) {
      petal(g, 50, 50, a, 0, 32, 13, pur(50 + Math.cos(a) * 18, 50 + Math.sin(a) * 18, 20), OUT, 2.6);
      ellipse(g, 50 + Math.cos(a) * 12, 50 + Math.sin(a) * 12, 7, 2.6, a, '#ffd23a', '#b88a10', 1.2);
    }
  },
  lotus(g) {
    // вода
    ellipse(g, 50, 82, 40, 9, 0, lg(g, 0, 74, 0, 90, ['#8ad8e8', '#3a98c8']), '#1a5a7a', 2.6);
    const pink = (x, y) => lg(g, x, y - 30, x, y + 10, ['#ffffff', '#ffb0d0', '#e0508a']);
    for (const [a, l] of [[-Math.PI + 0.25, 30], [-0.25, 30], [-Math.PI + 0.75, 36], [-0.75, 36], [-Math.PI / 2, 40]]) petal(g, 50, 74, a, 0, l, 12, pink(50, 60), '#8a2a5a', 2.6, 'point');
    for (const a of [-Math.PI / 2 - 0.35, -Math.PI / 2 + 0.35]) petal(g, 50, 74, a, 0, 32, 10, pink(50, 60), '#8a2a5a', 2.4, 'point');
    ellipse(g, 50, 70, 8, 4, 0, '#ffe04a', '#a87a10', 1.8);
  },
  pansy(g) {
    const top = (x, y) => rg(g, x, y, 22, '#d8a0ff', '#5a1a9a');
    petal(g, 50, 50, -Math.PI / 2 - 0.5, 0, 34, 18, top(38, 30), OUT, 2.8);
    petal(g, 50, 50, -Math.PI / 2 + 0.5, 0, 34, 18, top(62, 30), OUT, 2.8);
    const yel = (x, y) => rg(g, x, y, 22, '#fff8a0', '#f0b010');
    petal(g, 50, 50, Math.PI - 0.35, 0, 32, 17, yel(26, 56), OUT, 2.8);
    petal(g, 50, 50, 0.35, 0, 32, 17, yel(74, 56), OUT, 2.8);
    petal(g, 50, 50, Math.PI / 2, 0, 34, 19, yel(50, 74), OUT, 2.8);
    g.strokeStyle = '#4a1a6a';
    g.lineWidth = 2;
    for (const a of [Math.PI - 0.5, Math.PI - 0.25, 0.25, 0.5, Math.PI / 2 - 0.25, Math.PI / 2, Math.PI / 2 + 0.25]) {
      g.beginPath();
      g.moveTo(50 + Math.cos(a) * 6, 50 + Math.sin(a) * 6);
      g.lineTo(50 + Math.cos(a) * 18, 50 + Math.sin(a) * 18);
      g.stroke();
    }
    circle(g, 50, 50, 4, '#ffe04a', '#8a5a10', 1.6);
  },
  hydrangea(g) {
    leaf(g, 30, 80, 26, 2.6);
    leaf(g, 70, 80, 26, 0.5);
    const pts = [];
    for (let i = 0; i < 19; i++) {
      const a = i * 2.4, r = Math.sqrt(i) * 7.5;
      pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r * 0.9]);
    }
    pts.sort((p, q) => p[1] - q[1]);
    circle(g, 50, 50, 36, '#6a8ad0', OUT, 3.2);
    pts.forEach(([x, y], k) => {
      const c = k % 3 === 0 ? ['#f0d0ff', '#a070e0'] : ['#d8ecff', '#5a8ae8'];
      for (let p = 0; p < 4; p++) petal(g, x, y, (p / 4) * Math.PI * 2 + 0.4, 0, 8.5, 5, rg(g, x, y, 9, c[0], c[1]), '#2a3a7a', 1.4);
      dots(g, [[x, y]], 1.4, '#fff8c0');
    });
  },
  valley(g) {
    // широкий лист
    g.beginPath();
    g.moveTo(60, 96);
    g.bezierCurveTo(90, 70, 88, 30, 72, 12);
    g.bezierCurveTo(66, 40, 58, 70, 60, 96);
    fillStroke(g, lg(g, 60, 10, 80, 96, ['#9ae07a', '#2e7a24']), '#22501a', 3);
    g.beginPath();
    g.moveTo(40, 96);
    g.bezierCurveTo(36, 50, 46, 22, 66, 16);
    g.strokeStyle = '#4a8a2a';
    g.lineWidth = 3.6;
    g.lineCap = 'round';
    g.stroke();
    for (const [x, y, s] of [[60, 22, 0.8], [50, 32, 0.95], [42, 46, 1.05], [38, 62, 1.1], [37, 78, 1]]) {
      g.save();
      g.translate(x - 9 * s, y + 3);
      g.scale(s, s);
      stem(g, [6, -6, 2, 0], '#4a8a2a', 2.4);
      g.beginPath();
      g.moveTo(-6, 0);
      g.bezierCurveTo(-8, 10, -10, 14, -12, 16);
      g.lineTo(-6, 15);
      g.lineTo(0, 18);
      g.lineTo(6, 15);
      g.lineTo(12, 16);
      g.bezierCurveTo(10, 14, 8, 10, 6, 0);
      g.bezierCurveTo(4, -4, -4, -4, -6, 0);
      fillStroke(g, rg(g, 0, 6, 12, '#ffffff', '#d8e8d0'), '#4a6a4a', 2.2);
      g.restore();
    }
  },
};

// ключ: снимает замки
function key(g) {
  g.save();g.translate(50,50);g.rotate(-.7);
  const gold=lg(g,-18,-30,18,35,['#fff0b3','#d3b365','#a28346']);
  g.fillStyle=gold;g.strokeStyle='#92794c';g.lineWidth=1.5;
  g.beginPath();g.arc(0,-22,16,0,Math.PI*2);g.arc(0,-22,8,0,Math.PI*2,true);g.fill();g.stroke();
  rrect(g,-4,-8,8,48,2);g.fill();g.stroke();
  g.beginPath();g.moveTo(4,24);g.lineTo(17,24);g.lineTo(17,31);g.lineTo(11,31);g.lineTo(11,38);g.lineTo(4,38);g.closePath();g.fill();g.stroke();
  g.strokeStyle='#fff3c8';g.lineWidth=1.6;g.beginPath();g.arc(0,-22,12,Math.PI,Math.PI*1.75);g.moveTo(-1,-4);g.lineTo(-1,34);g.stroke();g.restore();
}

// набор рисунков: фрукты и цветы или классические плитки маджонга
let faceSet = 'fruit';
export function setFaceSet(s) {
  if (s === faceSet) return;
  faceSet = ['fruit','classic','gems','stamps'].includes(s) ? s : 'fruit';
  cache.clear();
}
export const getFaceSet = () => faceSet;
export const faceSize = (w,set=faceSet,face) => Math.round(w*(set==='stamps'?(FACE_ORDER.indexOf(face)>=0&&FACE_ORDER.indexOf(face)<16?1.02:.80):.88));
export const classicOf = (f) => CLASSIC_ORDER[FACE_ORDER.indexOf(f)];
export function drawFace(g, f, set = faceSet) {
  if (f === 'key') return key(g);
  if (set === 'classic' && FACE_ORDER.includes(f)) return drawClassic(g, classicOf(f));
  if(set!=='classic'&&drawPaintedFace(g,f,set))return;
  if(set==='gems'||set==='stamps'){
    const n=FACE_ORDER.indexOf(f),col=FACE_COLOR[f]||'#628997';g.save();
    if(set==='gems'){
      const sides=5+n%4,outer=[],inner=[],rot=-Math.PI/2+(n%3)*.16;
      for(let i=0;i<sides;i++){const a=rot+i/sides*Math.PI*2;outer.push([50+Math.cos(a)*38,44+Math.sin(a)*35]);inner.push([50+Math.cos(a)*21,44+Math.sin(a)*19]);}
      const facet=(pts,shade)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=col;g.fill();g.fillStyle=shade;g.fill();g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=.55;g.stroke();};
      for(let i=0;i<sides;i++)facet([outer[i],outer[(i+1)%sides],inner[(i+1)%sides],inner[i]],i<sides/2?'rgba(255,255,255,.35)':'rgba(24,45,48,.24)');
      facet(inner,'rgba(255,255,255,.18)');g.strokeStyle='rgba(66,64,56,.6)';g.lineWidth=1.1;g.beginPath();outer.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.stroke();
      g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.4;g.beginPath();g.moveTo(...outer[0]);g.lineTo(...outer[1]);g.stroke();
      g.fillStyle='#5b6354';g.font='700 15px Nunito,Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(String(n+1),50,91);
    }else{
      g.shadowColor='rgba(62,52,36,.14)';g.shadowBlur=2;g.shadowOffsetY=2;g.fillStyle='#f9efd8';g.fillRect(10,5,80,90);g.shadowBlur=0;g.shadowOffsetY=0;
      g.strokeStyle='#b69e70';g.lineWidth=1.8;g.setLineDash([1.5,3]);g.strokeRect(10,5,80,90);g.setLineDash([]);g.fillStyle=col+'24';g.fillRect(16,12,68,64);g.strokeStyle=col+'aa';g.lineWidth=1;g.strokeRect(16,12,68,64);
      g.save();g.translate(17,10);g.scale(.66,.66);if(!drawPaintedFace(g,f))(F[f]||G[f])(g);g.restore();
      g.fillStyle='#686449';g.font='700 12px Nunito,Arial';g.textAlign='right';g.fillText(String(n+1),80,88);g.strokeStyle='#8b876d';g.lineWidth=.8;g.beginPath();g.moveTo(20,83);g.lineTo(49,83);g.moveTo(20,87);g.lineTo(42,87);g.stroke();
    }
    g.restore();return;
  }
  (F[f] || G[f])(g);
}
export function faceColor(f) {
  if (faceSet !== 'classic' || f === 'key') return FACE_COLOR[f];
  const c = classicOf(f) || 'c';
  return CLASSIC_COLOR[c[0]] || CLASSIC_COLOR[c] || '#fff';
}

// ---------- корпус плитки ----------
// стили: лицо, бок и рамка
export const STYLES = {
  ivory: { face: ['#fffdf4', '#e9ddc1'], side: ['#f2e6c9', '#bcaa83'], base: '#355c50', edge: '#a08b65', rim:'#c4af7d' },
  jade: { face: ['#f5fff6', '#d9e8d9'], side: ['#93bba3', '#467761'], base: '#254d3f', edge: '#78957b', rim:'#a6b498' },
  honey: { face: ['#fff6e5', '#eddbb5'], side: ['#cfa568', '#89613c'], base: '#5e4730', edge: '#a4875b', rim:'#c0a36e' },
  porcelain: { face: ['#fffefa', '#e6ebef'], side: ['#a8bbd3', '#4e6689'], base: '#334c70', edge: '#8d9cb0', rim: '#6d86ab' },
  rose:{face:['#fff8f5','#f4d9de'],side:['#d797a7','#91475f'],base:'#68455e',edge:'#90596c',rim:'#c28c99'},
  obsidian:{face:['#f3f0f8','#ddd8e7'],side:['#4e5167','#20263c'],base:'#141b2a',edge:'#57536b',rim:'#9c85b9'},
  pearl:{face:['#fffefc','#eee5f5'],side:['#d6c6de','#9c96b7'],base:'#7a7494',edge:'#a295b0',rim:'#c5afca'},
  aqua:{face:['#f9fffd','#dbeee9'],side:['#65b8b9','#286e80'],base:'#285365',edge:'#45777d',rim:'#8dbdb7'},
  lavender:{face:['#fffaff','#e9def6'],side:['#b398cb','#6b5887'],base:'#544365',edge:'#8a729e',rim:'#bda3cb'},
  walnut:{face:['#fff6df','#e4c89a'],side:['#a67549','#5d3e2b'],base:'#3e3028',edge:'#7e5c38'},
  terracotta:{face:['#fff9ec','#eed6ba'],side:['#d09169','#9c533b'],base:'#714535',edge:'#a16a4b',rim:'#cf9b72'},
  midnight:{face:['#fcfcff','#dfe6f1'],side:['#5b74a2','#26395e'],base:'#202b45',edge:'#7184a4',rim:'#bfa76b'},
};
export const STYLE_ORDER = Object.keys(STYLES);

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
export { rrect };

// размеры плитки в пикселях: лицо w×h, толщина d (видна справа и снизу)
export function tileDims(w) {
  return { w, h: Math.round(w * 1.28), d: Math.max(3, Math.round(w * 0.13)), r: Math.max(2.5, w * 0.11) };
}

const cache = new Map();
// спрайт корпуса: лицо + бок (вправо-вниз). Размер спрайта (w+d) × (h+d)
export function bodySprite(style, w, kind = 'face') {
  const k = 'b:'+style+':'+w+':'+kind;
  if(cache.has(k))return cache.get(k);
  const S=STYLES[style]||STYLES.ivory,D=tileDims(w),c=canvas(D.w+D.d+2,D.h+D.d+2),g=c.getContext('2d');
  if(drawSkinBody(g,style,D.w,D.h,D.d,kind)){cache.set(k,c);return c;}
  const edge=Math.max(.65,w*.011),inset=w*.063;
  // Deep enamel sole, cream ceramic side and narrow metallic seam.
  rrect(g,D.d,D.d,D.w,D.h,D.r);g.fillStyle=lg(g,0,D.h*.4,D.w,D.h+D.d,[S.base,S.base,'#263e36']);g.fill();
  rrect(g,D.d*.55,D.d*.55,D.w,D.h,D.r);g.fillStyle=lg(g,0,0,D.w,D.h,[S.side[0],S.side[0],S.side[1]]);g.fill();
  rrect(g,D.d*.55,D.d*.55,D.w,D.h,D.r);g.strokeStyle='rgba(255,247,222,.45)';g.lineWidth=edge;g.stroke();
  g.save();rrect(g,D.d*.55,D.d*.55,D.w,D.h,D.r);g.clip();
  g.fillStyle='rgba(255,250,231,.5)';g.fillRect(0,D.h+D.d*.42,D.w+D.d,Math.max(.6,w*.014));
  g.fillStyle='rgba(72,61,42,.15)';g.fillRect(0,D.h+D.d*.68,D.w+D.d,Math.max(.7,w*.012));g.restore();
  // Convex bevel around a softly concave, polished face.
  rrect(g,.5,.5,D.w-1,D.h-1,D.r);
  const face=kind==='back'?['#527a69','#274b42']:S.face;
  g.fillStyle=lg(g,0,0,D.w*.5,D.h,[face[0],face[0],face[1]]);g.fill();g.strokeStyle=S.edge;g.lineWidth=edge;g.stroke();
  g.save();rrect(g,.5,.5,D.w-1,D.h-1,D.r);g.clip();
  const light=g.createRadialGradient(w*.23,w*.12,0,w*.32,D.h*.32,w*1.1);light.addColorStop(0,'rgba(255,255,255,.7)');light.addColorStop(.45,'rgba(255,255,255,.12)');light.addColorStop(1,'rgba(98,79,44,.10)');g.fillStyle=light;g.fillRect(0,0,D.w,D.h);
  let seed=w*997+style.length*137;const R=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<170;i++){g.fillStyle=i%3?'rgba(255,255,255,.12)':'rgba(87,67,44,.035)';g.fillRect(R()*D.w,R()*D.h,Math.max(.4,w*.004),Math.max(.4,w*.004));}
  if(['jade','pearl','aqua','obsidian','lavender'].includes(style)){
    g.strokeStyle='rgba(115,129,117,.065)';g.lineWidth=Math.max(.45,w*.007);
    for(let i=0;i<5;i++){g.beginPath();g.moveTo(-w*.1,D.h*R());g.bezierCurveTo(w*.3,D.h*R(),w*.6,D.h*R(),w*1.2,D.h*R());g.stroke();}
  }
  if(['walnut','honey'].includes(style)){
    g.strokeStyle='rgba(118,81,42,.045)';g.lineWidth=Math.max(.35,w*.005);
    for(let y=3;y<D.h;y+=w*.04){g.beginPath();g.moveTo(0,y);g.bezierCurveTo(w*.3,y-w*.03,w*.7,y+w*.04,w,y);g.stroke();}
  }
  rrect(g,edge*1.7,edge*1.7,D.w-edge*3.4,D.h-edge*3.4,Math.max(1,D.r-edge));g.strokeStyle='rgba(255,255,250,.82)';g.lineWidth=edge;g.stroke();
  const bevel=g.createLinearGradient(0,0,D.w,D.h);bevel.addColorStop(0,'rgba(255,255,255,.55)');bevel.addColorStop(.42,'rgba(255,255,255,0)');bevel.addColorStop(1,'rgba(93,75,45,.14)');g.strokeStyle=bevel;g.lineWidth=Math.max(1,w*.032);rrect(g,w*.035,w*.035,D.w-w*.07,D.h-w*.07,D.r*.75);g.stroke();
  // Fine engraved frame leaves the botanical silhouette uncluttered.
  rrect(g,inset,inset,D.w-inset*2,D.h-inset*2,D.r*.56);g.strokeStyle=kind==='back'?'#d6c28ab3':(S.rim||'#b69d73')+'99';g.lineWidth=Math.max(.55,w*.009);g.stroke();
  rrect(g,inset+w*.023,inset+w*.023,D.w-inset*2-w*.046,D.h-inset*2-w*.046,D.r*.43);g.strokeStyle=kind==='back'?'#e5d8ad26':'rgba(255,255,255,.63)';g.lineWidth=Math.max(.45,w*.006);g.stroke();
  if(w>=40){
    g.fillStyle=kind==='back'?'#decb93':S.rim||'#b69d73';g.globalAlpha=.55;
    for(const y of [w*.13,D.h-w*.13]){g.beginPath();g.moveTo(w*.5,y-w*.018);g.lineTo(w*.518,y);g.lineTo(w*.5,y+w*.018);g.lineTo(w*.482,y);g.closePath();g.fill();}g.globalAlpha=1;
  }
  g.restore();
  if(kind==='back'){
    g.save();g.translate(D.w/2,D.h/2);g.scale(w/100,w/100);g.strokeStyle='#d9c68e';g.fillStyle='#d9c68e';g.lineWidth=1.4;
    for(let i=0;i<8;i++){g.save();g.rotate(i*Math.PI/4);g.beginPath();g.moveTo(0,-29);g.lineTo(4,-8);g.lineTo(0,-3);g.lineTo(-4,-8);g.closePath();g.globalAlpha=i%2?.55:.9;g.fill();g.restore();}
    g.globalAlpha=.7;g.beginPath();g.arc(0,0,18,0,Math.PI*2);g.stroke();g.beginPath();g.arc(0,0,4,0,Math.PI*2);g.fill();g.restore();
  }
  cache.set(k,c);return c;
}

// спрайт лица (картинка без корпуса), квадрат size
export function faceSprite(f, size, set = faceSet) {
  const k = `f:${set}:${f}:${size}`;
  if (cache.has(k)) return cache.get(k);
  const c = canvas(size, size);
  const g = c.getContext('2d');
  g.scale(size / 100, size / 100);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  drawFace(g, f, set);
  cache.set(k, c);
  return c;
}

// значки поверх плитки: монетка, замок
export function badgeSprite(kind, size) {
  const k = `g:${kind}:${size}`;
  if (cache.has(k)) return cache.get(k);
  const c = canvas(size, size);
  const g = c.getContext('2d');
  g.scale(size / 100, size / 100);
  g.lineJoin = 'round';
  if (kind === 'coin') {
    circle(g, 50, 50, 42, rg(g, 50, 50, 42, '#fff3a0', '#e0a020'), '#7a4a10', 7);
    g.beginPath();
    g.arc(50, 50, 27, 0, Math.PI * 2);
    g.strokeStyle = '#b87a10';
    g.lineWidth = 6;
    g.stroke();
    g.beginPath();
    g.moveTo(50, 32);
    g.lineTo(50, 68);
    g.strokeStyle = '#7a4a10';
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.stroke();
  } else if (kind === 'lock') {
    g.beginPath();
    g.arc(50, 40, 22, Math.PI, 0);
    g.lineWidth = 11;
    g.strokeStyle = '#5a6470';
    g.stroke();
    g.beginPath();
    g.arc(50, 40, 22, Math.PI, 0);
    g.lineWidth = 5;
    g.strokeStyle = '#c8d0d8';
    g.stroke();
    rrect(g, 18, 40, 64, 50, 10);
    fillStroke(g, lg(g, 0, 40, 0, 90, ['#ffe48a', '#d89a20']), '#6a4410', 6);
    circle(g, 50, 60, 7, '#5a3a10', '#5a3a10', 1);
    g.beginPath();
    g.moveTo(50, 62);
    g.lineTo(50, 76);
    g.lineWidth = 7;
    g.strokeStyle = '#5a3a10';
    g.stroke();
  }
  cache.set(k, c);
  return c;
}

export function clearSpriteCache() {
  cache.clear();
}

// картинка лица в data-URL для DOM (обучение, магазин)
export function faceURL(f, size = 96) {
  return faceSprite(f, size).toDataURL();
}
// целая плитка в data-URL (для окна стилей, обложек)
export function tileURL(style, f, w = 60, set) {
  const D = tileDims(w);
  const c = canvas(D.w + D.d + 2, D.h + D.d + 2);
  const g = c.getContext('2d');
  g.drawImage(bodySprite(style, w), 0, 0);
  const fs = faceSize(w,set,f);
  g.drawImage(faceSprite(f, fs, set), (D.w - fs) / 2, (D.h - fs) / 2);
  return c.toDataURL();
}

export function backURL(style,w=60){return bodySprite(style,w,'back').toDataURL();}
