// Фоны глав путешествия: восемь нарисованных сцен (вид сверху), поле и панели лежат поверх них.
// buildScene рисует неподвижную часть один раз, drawAmbient добавляет движение: листья, снег, волны, светлячки.
import { rng } from './core.js';
import { mix, rgba, roundRect } from './gfx.js';
import { drawItem } from './items.js';
import { background, paintBackground, ambientArt } from './background-art.js';

const TAU = Math.PI * 2;
export const SCENE_IDS = ['autumn', 'winter', 'spring', 'summer', 'sea', 'fair', 'forest', 'night', 'hearth'];

// ---------- общие приёмы ----------
function lg(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function rg(g, x, y, r0, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function blob(g, x, y, rx, ry, rot, fill) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, TAU);
  g.fillStyle = fill;
  g.fill();
}
function softShadow(g, x, y, rx, ry, a = 0.3, rot = 0) {
  // мягкая тень градиентом (blur-фильтр на сотнях предметов слишком тяжёлый)
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(1, ry / rx);
  g.fillStyle = rg(g, 0, 0, 0, rx * 1.15, [[0, `rgba(20,10,0,${a})`], [0.55, `rgba(20,10,0,${a * 0.6})`], [1, 'rgba(20,10,0,0)']]);
  g.fillRect(-rx * 1.2, -rx * 1.2, rx * 2.4, rx * 2.4);
  g.restore();
}
// мягкие пятна разного оттенка — «живая» поверхность вместо плоской заливки
function mottled(g, W, H, R, cols, n, rmin, rmax, a) {
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * H, r = rmin + R() * (rmax - rmin);
    const c = cols[(R() * cols.length) | 0];
    g.fillStyle = rg(g, x, y, 0, r, [[0, rgba(c, a)], [1, rgba(c, 0)]]);
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
// травинки, мох, шерсть: короткие штрихи группами по цвету
function strokes(g, W, H, R, cols, count, len, w, a, upright = true) {
  g.save();
  g.lineCap = 'round';
  g.lineWidth = w;
  g.globalAlpha = a;
  cols.forEach((c, ci) => {
    g.beginPath();
    const n = Math.round(count / cols.length);
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = R() * H, l = len * (0.5 + R());
      const ang = upright ? -Math.PI / 2 + (R() - 0.5) * 1.1 : R() * TAU;
      const cx = x + Math.cos(ang + 0.5) * l * 0.5, cy = y + Math.sin(ang + 0.5) * l * 0.5;
      g.moveTo(x, y);
      g.quadraticCurveTo(cx, cy, x + Math.cos(ang) * l, y + Math.sin(ang) * l);
    }
    g.strokeStyle = c;
    g.stroke();
  });
  g.restore();
}
function sparkle(g, x, y, r, col = '#fff') {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y);
  g.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
  g.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y);
  g.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r);
  g.fill();
}
// предмет-реквизит с мягкой тенью на земле
function prop(g, id, x, y, r, rot = 0, sh = 0.3) {
  softShadow(g, x + r * 0.12, y + r * 0.2, r * 0.8, r * 0.62, sh);
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  drawItem(g, id, 0, 0, r);
  g.restore();
}
// свободное место: не под полем/панелями и не поверх уже стоящего
function makeFree(avoid, W, H, pad) {
  const placed = [];
  const ok = (x, y, r, tight = 0.9) => {
    if (x < r * 0.3 || y < r * 0.3 || x > W - r * 0.3 || y > H - r * 0.3) return false;
    for (const a of avoid) {
      const nx = Math.max(a.x - pad, Math.min(x, a.x + a.w + pad));
      const ny = Math.max(a.y - pad, Math.min(y, a.y + a.h + pad));
      if (Math.hypot(nx - x, ny - y) < r) return false;
    }
    for (const p of placed) if (Math.hypot(p.x - x, p.y - y) < (p.r + r) * tight) return false;
    return true;
  };
  const take = (R, r, tries = 60, tight) => {
    for (let i = 0; i < tries; i++) {
      const x = R() * W, y = R() * H;
      if (ok(x, y, r, tight)) {
        placed.push({ x, y, r });
        return [x, y];
      }
    }
    return null;
  };
  return { ok, take, placed };
}
function pathStroke(g, pts, w, col) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  g.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
  g.strokeStyle = col;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.stroke();
}
const bez = (p, t) => {
  const u = 1 - t;
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ];
};
const bezTan = (p, t) => {
  const a = bez(p, Math.max(0, t - 0.01)), b = bez(p, Math.min(1, t + 0.01));
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
};

// листья разных пород
function leafShape(g, kind, r, c1, c2) {
  g.beginPath();
  if (kind === 0) {
    // клён
    const pts = [[0, -1], [0.2, -0.58], [0.6, -0.78], [0.5, -0.3], [0.97, -0.14], [0.56, 0.12], [0.64, 0.5], [0.2, 0.34], [0.06, 0.66], [-0.06, 0.66], [-0.2, 0.34], [-0.64, 0.5], [-0.56, 0.12], [-0.97, -0.14], [-0.5, -0.3], [-0.6, -0.78], [-0.2, -0.58]];
    pts.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r)));
    g.closePath();
  } else if (kind === 1) {
    // дуб: волнистый лист
    g.moveTo(0, r * 0.95);
    const L = [[-0.3, 0.6], [-0.5, 0.45], [-0.34, 0.25], [-0.62, 0.05], [-0.4, -0.15], [-0.55, -0.4], [-0.25, -0.5], [-0.2, -0.8], [0, -1]];
    L.forEach(([x, y]) => g.lineTo(x * r, y * r));
    [[0.2, -0.8], [0.25, -0.5], [0.55, -0.4], [0.4, -0.15], [0.62, 0.05], [0.34, 0.25], [0.5, 0.45], [0.3, 0.6]].forEach(([x, y]) => g.lineTo(x * r, y * r));
    g.closePath();
  } else {
    // берёза: сердцевидный зубчатый
    g.moveTo(0, -r);
    g.bezierCurveTo(r * 0.7, -r * 0.5, r * 0.8, r * 0.3, 0, r * 0.9);
    g.bezierCurveTo(-r * 0.8, r * 0.3, -r * 0.7, -r * 0.5, 0, -r);
  }
  g.fillStyle = lg(g, -r * 0.5, -r, r * 0.6, r, [[0, c1], [1, c2]]);
  g.fill();
  g.strokeStyle = rgba(mix(c2, '#1a0800', 0.55), 0.8);
  g.lineWidth = Math.max(1, r * 0.07);
  g.lineJoin = 'round';
  g.stroke();
  g.strokeStyle = rgba(mix(c1, '#ffffff', 0.5), 0.6);
  g.lineWidth = Math.max(0.8, r * 0.04);
  g.beginPath();
  g.moveTo(0, r * 0.85);
  g.lineTo(0, -r * 0.6);
  g.stroke();
}
function fallenLeaf(g, x, y, r, rot, kind, pal) {
  softShadow(g, x + r * 0.1, y + r * 0.16, r * 0.7, r * 0.7, 0.22);
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  leafShape(g, kind, r, pal[0], pal[1]);
  g.restore();
}
function flower5(g, x, y, r, petal, center, rot = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  softShadow(g, r * 0.1, r * 0.2, r * 0.9, r * 0.7, 0.18);
  for (let k = 0; k < 5; k++) {
    g.save();
    g.rotate((k * TAU) / 5);
    g.beginPath();
    g.ellipse(0, -r * 0.55, r * 0.34, r * 0.5, 0, 0, TAU);
    g.fillStyle = lg(g, 0, -r, 0, 0, [[0, mix(petal, '#ffffff', 0.35)], [1, petal]]);
    g.fill();
    g.strokeStyle = rgba(mix(petal, '#301010', 0.55), 0.55);
    g.lineWidth = Math.max(0.7, r * 0.05);
    g.stroke();
    g.restore();
  }
  g.beginPath();
  g.arc(0, 0, r * 0.26, 0, TAU);
  g.fillStyle = center;
  g.fill();
  g.strokeStyle = rgba(mix(center, '#301000', 0.5), 0.6);
  g.lineWidth = Math.max(0.7, r * 0.05);
  g.stroke();
  g.restore();
}
function branch(g, pts, w, col) {
  pathStroke(g, pts, w + 3, mix(col, '#000000', 0.45));
  pathStroke(g, pts, w, col);
  pathStroke(g, pts, w * 0.28, mix(col, '#ffffff', 0.22));
}

// ---------- сцены ----------

// ----- уголок интерьера слева от меню: окно с шторами, картина, кресло, растение -----
function interior(g, x0, x1, H, wy, R) {
  const w = x1 - x0;
  if (w < 120) return;
  // окно
  const ww = w * 0.74, wx = x0 + (w - ww) / 2, wt = H * 0.12, wh = Math.min(H * 0.34, ww * 1.15), fr = Math.max(7, ww * 0.045);
  softShadow(g, wx + ww / 2, wt + wh + 10, ww * 0.6, 10, 0.35);
  g.fillStyle = lg(g, 0, wt, 0, wt + wh, [[0, '#b88a5a'], [1, '#7a4e2c']]);
  roundRect(g, wx - fr, wt - fr, ww + fr * 2, wh + fr * 2, 8);
  g.fill();
  g.strokeStyle = '#2e1808';
  g.lineWidth = 2;
  g.stroke();
  g.save();
  roundRect(g, wx, wt, ww, wh, 3);
  g.clip();
  g.fillStyle = lg(g, 0, wt, 0, wt + wh, [[0, '#0e1640'], [0.6, '#27337a'], [1, '#5a4a8a']]);
  g.fillRect(wx, wt, ww, wh);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(255,248,210,${0.35 + R() * 0.55})`;
    g.beginPath();
    g.arc(wx + R() * ww, wt + R() * wh * 0.6, 0.7 + R() * 1.3, 0, TAU);
    g.fill();
  }
  const mxx = wx + ww * 0.72, myy = wt + wh * 0.2, mr = ww * 0.1;
  g.fillStyle = rg(g, mxx, myy, mr * 0.8, mr * 3.2, [[0, 'rgba(255,240,190,.35)'], [1, 'rgba(255,240,190,0)']]);
  g.fillRect(mxx - mr * 3.2, myy - mr * 3.2, mr * 6.4, mr * 6.4);
  blob(g, mxx, myy, mr, mr, 0, '#fff4d0');
  blob(g, mxx + mr * 0.35, myy - mr * 0.1, mr * 0.85, mr * 0.85, 0, '#27337a');
  // снежные холмы и ёлки
  blob(g, wx + ww * 0.25, wt + wh * 0.97, ww * 0.7, wh * 0.2, 0, '#e8eefc');
  blob(g, wx + ww * 0.85, wt + wh * 1.0, ww * 0.6, wh * 0.18, 0, '#d4def4');
  for (const [tx, ts] of [[0.2, 1], [0.38, 0.7], [0.62, 0.85]]) {
    const bx = wx + ww * tx, by = wt + wh * 0.84, sz = ww * 0.17 * ts;
    g.fillStyle = '#16304a';
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.moveTo(bx, by - sz * (1.5 - k * 0.45));
      g.lineTo(bx + sz * (0.5 + k * 0.2), by - sz * (0.5 - k * 0.45) + sz * 0.2);
      g.lineTo(bx - sz * (0.5 + k * 0.2), by - sz * (0.5 - k * 0.45) + sz * 0.2);
      g.closePath();
      g.fill();
    }
    g.fillStyle = 'rgba(240,246,255,.85)';
    blob(g, bx, by - sz * 1.45, sz * 0.12, sz * 0.07, 0, '#fff');
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = 'rgba(255,255,255,.8)';
    g.beginPath();
    g.arc(wx + R() * ww, wt + R() * wh, 0.8 + R() * 1.1, 0, TAU);
    g.fill();
  }
  g.fillStyle = lg(g, wx, wt, wx + ww, wt + wh, [[0, 'rgba(255,255,255,.14)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(wx, wt, ww, wh);
  g.restore();
  // переплёт
  g.fillStyle = '#9a6c40';
  g.fillRect(wx + ww / 2 - fr * 0.4, wt, fr * 0.8, wh);
  g.fillRect(wx, wt + wh * 0.5 - fr * 0.4, ww, fr * 0.8);
  g.strokeStyle = '#2e1808';
  g.lineWidth = 1.5;
  g.strokeRect(wx, wt, ww, wh);
  // подоконник
  g.fillStyle = lg(g, 0, wt + wh, 0, wt + wh + fr * 1.6, [[0, '#c89868'], [1, '#7a4e2c']]);
  roundRect(g, wx - fr * 1.6, wt + wh + fr * 0.6, ww + fr * 3.2, fr * 1.3, 4);
  g.fill();
  g.stroke();
  // карниз и шторы с подхватами
  const rodY = wt - fr * 1.8;
  g.fillStyle = '#4a2c14';
  roundRect(g, wx - fr * 3, rodY - 3, ww + fr * 6, 6, 3);
  g.fill();
  blob(g, wx - fr * 3, rodY, 6, 6, 0, '#d8a850');
  blob(g, wx + ww + fr * 3, rodY, 6, 6, 0, '#d8a850');
  const curtain = (sx) => {
    const ex = wx + (sx < 0 ? -fr * 2.2 : ww + fr * 2.2), inner = wx + ww / 2 + sx * ww * 0.2;
    const top = rodY + 3, bot = wt + wh + fr * 2.2, tie = wt + wh * 0.62;
    const mid = (ex + inner) / 2;
    g.beginPath();
    g.moveTo(ex, top);
    g.lineTo(inner, top);
    g.bezierCurveTo(inner + sx * -4, tie - 20, mid + sx * -ww * 0.05, tie, mid, tie);
    g.bezierCurveTo(mid + sx * ww * 0.1, tie + 20, inner + sx * ww * 0.12, bot - 30, inner + sx * ww * 0.1, bot);
    g.lineTo(ex - sx * fr * 0.4, bot);
    g.closePath();
    g.fillStyle = lg(g, ex, 0, inner, 0, sx < 0 ? [[0, '#8a2a28'], [0.5, '#b8433a'], [1, '#8a2a28']] : [[0, '#8a2a28'], [0.5, '#b8433a'], [1, '#8a2a28']]);
    g.fill();
    g.strokeStyle = 'rgba(30,6,6,.55)';
    g.lineWidth = 1.5;
    g.stroke();
    // складки
    g.strokeStyle = 'rgba(255,180,160,.22)';
    g.lineWidth = 2;
    for (let k = 1; k < 4; k++) {
      const fx = ex + (inner - ex) * (k / 4);
      g.beginPath();
      g.moveTo(fx, top + 2);
      g.quadraticCurveTo(fx + sx * 3, (top + tie) / 2, mid + (fx - mid) * 0.5, tie);
      g.stroke();
    }
    blob(g, mid, tie, 5, 7, 0, '#e8c070');
  };
  curtain(-1);
  curtain(1);
  // картина в рамке над креслом
  const pw = w * 0.4, ph = pw * 0.72, px = x0 + w * 0.3, py = wt + wh + fr * 3 + 22;
  if (py + ph < wy - 24) {
    softShadow(g, px + pw / 2 + 3, py + ph + 4, pw * 0.55, 6, 0.3);
    g.fillStyle = lg(g, px, py, px + pw, py + ph, [[0, '#c8955a'], [1, '#7a4a24']]);
    roundRect(g, px, py, pw, ph, 4);
    g.fill();
    g.strokeStyle = '#2e1808';
    g.lineWidth = 2;
    g.stroke();
    const m = pw * 0.07;
    g.save();
    roundRect(g, px + m, py + m, pw - m * 2, ph - m * 2, 2);
    g.clip();
    g.fillStyle = lg(g, 0, py, 0, py + ph, [[0, '#f6d89a'], [1, '#f2a860']]);
    g.fillRect(px, py, pw, ph);
    blob(g, px + pw * 0.7, py + ph * 0.36, pw * 0.08, pw * 0.08, 0, '#fff2c0');
    blob(g, px + pw * 0.3, py + ph * 1.0, pw * 0.5, ph * 0.38, 0, '#6a9a52');
    blob(g, px + pw * 0.85, py + ph * 1.02, pw * 0.5, ph * 0.3, 0, '#4a7a3e');
    g.restore();
  }
  // кресло
  const fb = H * 0.88, cw = w * 0.64, chh = cw * 0.86, cl = x0 + w * 0.02, top = fb - chh;
  softShadow(g, cl + cw / 2, fb + 4, cw * 0.62, 12, 0.4);
  g.fillStyle = '#4a2c14';
  for (const lx of [cl + cw * 0.08, cl + cw * 0.84]) {
    g.beginPath();
    g.moveTo(lx, fb - 14);
    g.lineTo(lx + cw * 0.08, fb - 14);
    g.lineTo(lx + cw * 0.065, fb);
    g.lineTo(lx + cw * 0.015, fb);
    g.closePath();
    g.fill();
  }
  const fab = (x, y, ww2, hh2, r, c0, c1) => {
    g.fillStyle = lg(g, x, y, x + ww2, y + hh2, [[0, c0], [1, c1]]);
    roundRect(g, x, y, ww2, hh2, r);
    g.fill();
    g.strokeStyle = 'rgba(30,6,6,.6)';
    g.lineWidth = 1.8;
    g.stroke();
  };
  fab(cl + cw * 0.06, top, cw * 0.88, chh * 0.78, cw * 0.18, '#b8433a', '#7a2420');
  g.fillStyle = 'rgba(30,6,6,.35)';
  for (let r2 = 0; r2 < 2; r2++) for (let c2 = 0; c2 < 3; c2++) {
    blob(g, cl + cw * (0.3 + c2 * 0.2), top + chh * (0.16 + r2 * 0.16), 3.5, 3.5, 0, 'rgba(30,6,6,.5)');
  }
  fab(cl + cw * 0.14, fb - chh * 0.42, cw * 0.72, chh * 0.3, cw * 0.1, '#c8523f', '#8a2c26');
  fab(cl, fb - chh * 0.62, cw * 0.2, chh * 0.55, cw * 0.1, '#a83a32', '#6a1e1a');
  fab(cl + cw * 0.8, fb - chh * 0.62, cw * 0.2, chh * 0.55, cw * 0.1, '#a83a32', '#6a1e1a');
  // подушка с узором
  g.save();
  g.translate(cl + cw * 0.34, fb - chh * 0.5);
  g.rotate(-0.18);
  const ps = cw * 0.32;
  g.fillStyle = lg(g, -ps / 2, -ps / 2, ps / 2, ps / 2, [[0, '#f0c860'], [1, '#c8963a']]);
  roundRect(g, -ps / 2, -ps / 2, ps, ps, ps * 0.2);
  g.fill();
  g.strokeStyle = 'rgba(80,40,10,.6)';
  g.lineWidth = 1.6;
  g.stroke();
  g.strokeStyle = 'rgba(120,60,20,.5)';
  g.lineWidth = 2;
  for (let k = -1; k <= 1; k++) {
    g.beginPath();
    g.moveTo(-ps * 0.36, k * ps * 0.2);
    g.lineTo(ps * 0.36, k * ps * 0.2);
    g.stroke();
  }
  g.restore();
  // вязаный плед на подлокотнике
  const bxx = cl + cw * 0.8, byy = fb - chh * 0.62;
  g.save();
  roundRect(g, bxx - cw * 0.05, byy - 3, cw * 0.3, chh * 0.62, cw * 0.06);
  g.clip();
  const cols = ['#f0e4c8', '#4f8a5a', '#f0e4c8', '#d8a040'];
  for (let k = 0; k < 8; k++) {
    g.fillStyle = cols[k % 4];
    g.fillRect(bxx - cw * 0.05, byy - 3 + k * chh * 0.08, cw * 0.3, chh * 0.08 + 1);
  }
  g.restore();
  g.strokeStyle = 'rgba(30,20,10,.5)';
  g.lineWidth = 1.4;
  roundRect(g, bxx - cw * 0.05, byy - 3, cw * 0.3, chh * 0.62, cw * 0.06);
  g.stroke();
  // растение в горшке
  const pot = (w - cw) * 0.5, ptx = x1 - pot * 0.62, pth = pot * 0.9;
  softShadow(g, ptx, fb + 3, pot * 0.8, 6, 0.35);
  for (let k = 0; k < 9; k++) {
    const ang = -Math.PI / 2 + (k - 4) * 0.2, len = pot * (1.5 + (k % 3) * 0.4);
    g.save();
    g.translate(ptx, fb - pth);
    g.rotate(ang + Math.PI / 2);
    blob(g, 0, -len / 2, pot * 0.2, len / 2, 0, k % 2 ? '#3f8a48' : '#2a6a38');
    g.strokeStyle = 'rgba(10,40,16,.5)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -len);
    g.stroke();
    g.restore();
  }
  g.beginPath();
  g.moveTo(ptx - pot * 0.55, fb - pth);
  g.lineTo(ptx + pot * 0.55, fb - pth);
  g.lineTo(ptx + pot * 0.4, fb);
  g.lineTo(ptx - pot * 0.4, fb);
  g.closePath();
  g.fillStyle = lg(g, ptx - pot * 0.5, 0, ptx + pot * 0.5, 0, [[0, '#d8784a'], [0.5, '#e8956a'], [1, '#a8502c']]);
  g.fill();
  g.strokeStyle = '#4a2010';
  g.lineWidth = 1.8;
  g.stroke();
  g.fillStyle = '#b8603a';
  roundRect(g, ptx - pot * 0.62, fb - pth - 4, pot * 1.24, 12, 4);
  g.fill();
  g.stroke();
}

const BUILD = {
  // ----- осенний парк -----
  autumn(g, W, H, R, free, u) {
    g.fillStyle = lg(g, 0, 0, W * 0.3, H, [[0, '#8f9a44'], [1, '#68782e']]);
    g.fillRect(0, 0, W, H);
    mottled(g, W, H, R, ['#b9a94a', '#5b6a26', '#c28a38', '#7a8a32'], 70, u * 2, u * 5, 0.22);
    strokes(g, W, H, R, ['#5d7226', '#8aa036', '#b5a64a', '#4a5e1e', '#9aa842'], (W * H) / 70, u * 0.22, 1.1, 0.5);
    // дорожка из гравия
    const P = [[-W * 0.1, H * 0.84], [W * 0.3, H * 0.62], [W * 0.62, H * 0.4], [W * 1.1, H * 0.22]];
    const pw = u * 2.8;
    pathStroke(g, P, pw + 10, '#8a7550');
    pathStroke(g, P, pw, '#cdb88f');
    pathStroke(g, P, pw * 0.55, '#d8c7a2');
    for (let i = 0; i < 520; i++) {
      const t = R(), c = bez(P, t), a = bezTan(P, t) + Math.PI / 2, d = (R() - 0.5) * pw * 0.95;
      g.fillStyle = ['#a99169', '#e2d3b2', '#9a8660', '#bda57c'][(R() * 4) | 0];
      g.beginPath();
      g.ellipse(c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, 1.2 + R() * 2.4, 1 + R() * 1.6, R() * 3, 0, TAU);
      g.fill();
    }
    // лужа с отражением неба и листиком
    const pu = free.take(R, u * 1.8, 80);
    if (pu) {
      const [x, y] = pu;
      blob(g, x, y, u * 1.5, u * 0.85, -0.2, 'rgba(60,40,10,.35)');
      blob(g, x, y, u * 1.42, u * 0.78, -0.2, lg(g, x - u, y - u, x + u, y + u, [[0, '#cfe3ee'], [1, '#8fb2c6']]));
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(x - u * 0.2, y - u * 0.1, u * 0.7, u * 0.3, -0.2, 3.4, 5.2);
      g.stroke();
      fallenLeaf(g, x + u * 0.3, y, u * 0.34, 0.8, 0, ['#f2a030', '#c8401a']);
    }
    // россыпь листьев
    const pals = [['#ffd84a', '#f08a1e'], ['#f39a24', '#c8331a'], ['#e0452a', '#8a1a10'], ['#c8a030', '#8a5a14'], ['#e8c040', '#c07a1c']];
    for (let i = 0; i < (W * H) / 5200; i++) {
      const r = u * (0.32 + R() * 0.3), p = free.take(R, r * 1.1, 8, 0.6);
      if (p) fallenLeaf(g, p[0], p[1], r, R() * TAU, (R() * 3) | 0, pals[(R() * pals.length) | 0]);
    }
    // желуди, грибы, шишки
    for (let i = 0; i < 4; i++) { const p = free.take(R, u * 0.8); if (p) prop(g, 'acorn', p[0], p[1], u * 0.5, R() * 2 - 1); }
    for (let i = 0; i < 3; i++) { const p = free.take(R, u * 0.85); if (p) prop(g, 'mushroom', p[0], p[1], u * 0.55, R() * 0.4 - 0.2); }
    // пятна солнца сквозь листву
    for (let i = 0; i < 9; i++) {
      const x = R() * W, y = R() * H, r = u * (1.5 + R() * 2.5);
      g.fillStyle = rg(g, x, y, 0, r, [[0, 'rgba(255,240,170,.22)'], [1, 'rgba(255,240,170,0)']]);
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // ветви с листвой по верхним углам
    for (const sx of [0, 1]) {
      const X = (x) => (sx ? W - x : x);
      const B = [[X(-10), u * 1.0], [X(W * 0.12), u * 1.8], [X(W * 0.2), u * 0.8], [X(W * 0.34), u * 1.5]];
      branch(g, B, u * 0.2, '#6a4326');
      for (let i = 0; i < 16; i++) {
        const t = 0.1 + (i / 16) * 0.9, c = bez(B, t);
        const pal = pals[(R() * 4) | 0];
        fallenLeaf(g, c[0] + (R() - 0.5) * u * 0.9, c[1] + (R() - 0.2) * u * 1.0, u * (0.42 + R() * 0.25), R() * TAU, (R() * 3) | 0, pal);
      }
    }
    return { kind: 'leaves', pal: pals };
  },

  // ----- зимний вечер -----
  winter(g, W, H, R, free, u) {
    g.fillStyle = lg(g, 0, 0, W * 0.2, H, [[0, '#eaf3fc'], [0.6, '#cfe0f1'], [1, '#aec6e0']]);
    g.fillRect(0, 0, W, H);
    mottled(g, W, H, R, ['#ffffff', '#a8c0dc', '#dbe8f6', '#97b3d4'], 80, u * 2, u * 6, 0.3);
    // сугробы: свет сверху-слева, голубая тень снизу-справа
    for (let i = 0; i < 16; i++) {
      const x = R() * W, y = R() * H, rx = u * (2 + R() * 3), ry = rx * (0.35 + R() * 0.25), rot = (R() - 0.5) * 0.5;
      blob(g, x + 4, y + 7, rx, ry, rot, 'rgba(110,140,185,.35)');
      blob(g, x, y, rx, ry, rot, lg(g, x - rx, y - ry, x + rx, y + ry, [[0, '#ffffff'], [1, '#d6e4f3']]));
    }
    // следы
    const T = [[-W * 0.05, H * 0.9], [W * 0.25, H * 0.5], [W * 0.7, H * 0.7], [W * 1.05, H * 0.3]];
    for (let i = 0; i < 34; i++) {
      const t = i / 34, c = bez(T, t), a = bezTan(T, t), side = i % 2 ? 1 : -1;
      const x = c[0] + Math.cos(a + Math.PI / 2) * side * u * 0.22, y = c[1] + Math.sin(a + Math.PI / 2) * side * u * 0.22;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      blob(g, 1, 1, u * 0.2, u * 0.12, 0, 'rgba(255,255,255,.7)');
      blob(g, 0, 0, u * 0.2, u * 0.12, 0, 'rgba(120,150,190,.55)');
      blob(g, -u * 0.02, -u * 0.02, u * 0.14, u * 0.07, 0, 'rgba(170,195,225,.6)');
      g.restore();
    }
    // искры снега
    for (let i = 0; i < (W * H) / 4500; i++) sparkle(g, R() * W, R() * H, 1.5 + R() * 3.5, `rgba(255,255,255,${0.5 + R() * 0.5})`);
    // красные ягоды и падуб
    for (let i = 0; i < 3; i++) {
      const p = free.take(R, u * 1.0);
      if (!p) continue;
      g.save();
      g.translate(p[0], p[1]);
      g.rotate(R() * TAU);
      softShadow(g, 3, 5, u * 0.7, u * 0.5, 0.2);
      for (const a of [-0.9, 0.9]) {
        g.save();
        g.rotate(a);
        g.beginPath();
        for (let k = 0; k <= 12; k++) {
          const t = k / 12, y = -t * u * 0.9, w = Math.sin(t * Math.PI) * u * 0.24 + (k % 2 ? u * 0.07 : 0);
          k ? g.lineTo(w, y) : g.moveTo(0, 0);
        }
        for (let k = 12; k >= 0; k--) {
          const t = k / 12, y = -t * u * 0.9, w = Math.sin(t * Math.PI) * u * 0.24 + (k % 2 ? u * 0.07 : 0);
          g.lineTo(-w, y);
        }
        g.closePath();
        g.fillStyle = lg(g, 0, 0, 0, -u, [[0, '#2f7a3a'], [1, '#1d5a2a']]);
        g.fill();
        g.strokeStyle = '#123a1a';
        g.lineWidth = 1.2;
        g.stroke();
        g.restore();
      }
      for (const [bx, by] of [[0, 0], [u * 0.16, -u * 0.04], [-u * 0.1, u * 0.12]]) {
        blob(g, bx, by, u * 0.13, u * 0.13, 0, rg(g, bx - 2, by - 2, 0, u * 0.14, [[0, '#ff6a5a'], [1, '#a81420']]));
        blob(g, bx - u * 0.04, by - u * 0.04, u * 0.035, u * 0.025, -0.6, 'rgba(255,255,255,.8)');
      }
      g.restore();
    }
    for (let i = 0; i < 3; i++) { const p = free.take(R, u * 0.8); if (p) prop(g, 'mitten', p[0], p[1], u * 0.55, R() * 2 - 1); }
    for (let i = 0; i < 2; i++) { const p = free.take(R, u * 0.8); if (p) prop(g, 'ornament', p[0], p[1], u * 0.5, R() * 0.5); }
    // еловые лапы в верхних углах и внизу
    const fir = (x, y, rot, s) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      softShadow(g, 6, 10, u * 2.4 * s, u * 0.9 * s, 0.25);
      g.strokeStyle = '#4a2c14';
      g.lineWidth = u * 0.12 * s;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(u * 4 * s, 0);
      g.stroke();
      for (let i = 0; i < 26; i++) {
        const t = i / 26, bx = t * u * 3.8 * s, len = u * (1.2 - t * 0.8) * s;
        for (const sd of [-1, 1]) {
          g.save();
          g.translate(bx, 0);
          g.rotate(sd * (1.0 + (i % 3) * 0.05));
          g.lineCap = 'round';
          for (let q = 0; q < 5; q++) {
            g.strokeStyle = ['#1d5a2a', '#2a7a38', '#164a22'][q % 3];
            g.lineWidth = u * 0.07 * s;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(len * (0.55 + q * 0.12), (q - 2) * u * 0.07 * s);
            g.stroke();
          }
          // снежок на веточке
          blob(g, len * 0.5, 0, len * 0.3, u * 0.07 * s, 0, 'rgba(255,255,255,.85)');
          g.restore();
        }
      }
      g.restore();
    };
    fir(-u * 0.5, u * 0.9, 0.35, 1.1);
    fir(W + u * 0.5, u * 1.1, Math.PI - 0.4, 1.0);
    fir(-u * 0.5, H - u * 0.6, -0.4, 0.9);
    // гирлянда по верху
    const bulbs = [];
    const wire = (x0, x1, y, sag) => {
      g.beginPath();
      g.moveTo(x0, y);
      g.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y);
      g.strokeStyle = '#2a2a2a';
      g.lineWidth = 2;
      g.stroke();
      const n = Math.max(4, Math.round((x1 - x0) / (u * 1.4)));
      for (let i = 1; i < n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, yy = y + 2 * sag * t * (1 - t) * 1;
        bulbs.push({ x, y: yy + 7, c: ['#ff4a4a', '#ffd23a', '#4ac0ff', '#6adf6a', '#ff8ad0'][i % 5], ph: R() * 6 });
      }
    };
    wire(-10, W * 0.5, u * 0.35, u * 0.5);
    wire(W * 0.5, W + 10, u * 0.35, u * 0.5);
    return { kind: 'snow', bulbs };
  },

  // ----- весенний луг -----
  spring(g, W, H, R, free, u) {
    g.fillStyle = lg(g, 0, 0, W * 0.2, H, [[0, '#a6d672'], [1, '#6cae48']]);
    g.fillRect(0, 0, W, H);
    mottled(g, W, H, R, ['#d4e888', '#5a9a3a', '#b8de78', '#7ec054'], 70, u * 2, u * 5, 0.25);
    strokes(g, W, H, R, ['#5a9a3a', '#7ec054', '#9ad468', '#4c8a30', '#c6e684'], (W * H) / 60, u * 0.26, 1.2, 0.55);
    // ручей
    const S = [[W * 1.1, H * 0.5], [W * 0.7, H * 0.62], [W * 0.5, H * 0.95], [W * 0.05, H * 1.1]];
    const sw = u * 2.2;
    pathStroke(g, S, sw + u * 0.7, '#c9b690');
    pathStroke(g, S, sw + 6, '#8a7550');
    pathStroke(g, S, sw, lg(g, 0, 0, W, H, [[0, '#7cc6ea'], [1, '#4aa0d2']]));
    pathStroke(g, S, sw * 0.5, 'rgba(255,255,255,.28)');
    for (let i = 0; i < 40; i++) {
      const t = R(), c = bez(S, t), a = bezTan(S, t);
      g.strokeStyle = 'rgba(255,255,255,.6)';
      g.lineWidth = 1.3;
      g.beginPath();
      const d = (R() - 0.5) * sw * 0.7;
      const x = c[0] + Math.cos(a + 1.57) * d, y = c[1] + Math.sin(a + 1.57) * d;
      g.moveTo(x - 8, y);
      g.quadraticCurveTo(x, y - 3, x + 8, y);
      g.stroke();
    }
    for (let i = 0; i < 70; i++) {
      const t = R(), c = bez(S, t), a = bezTan(S, t) + Math.PI / 2, side = R() < 0.5 ? -1 : 1, d = side * (sw * 0.5 + u * (0.1 + R() * 0.4));
      g.fillStyle = ['#a89878', '#cfc0a0', '#8a7a5c'][(R() * 3) | 0];
      blob(g, c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, 2 + R() * 4, 1.5 + R() * 3, R() * 3, g.fillStyle);
    }
    // кувшинка в ручье
    { const c = bez(S, 0.55); softShadow(g, c[0] + 2, c[1] + 4, u * 0.5, u * 0.4, 0.2); blob(g, c[0], c[1], u * 0.48, u * 0.42, 0, '#4a9a3a'); blob(g, c[0] - u * 0.1, c[1] - u * 0.08, u * 0.3, u * 0.24, 0, '#6cbf48'); flower5(g, c[0] + u * 0.1, c[1] - u * 0.05, u * 0.26, '#ffd0e0', '#f6c443'); }
    // цветы-россыпь и клевер
    const cols = [['#ff9ec0', '#ffe27a'], ['#ffffff', '#f6c443'], ['#c9a8f0', '#ffe27a'], ['#8fc0ff', '#ffffff'], ['#ffd25a', '#e07a1a']];
    for (let i = 0; i < (W * H) / 5600; i++) {
      const r = u * (0.2 + R() * 0.2), p = free.take(R, r * 1.2, 10, 0.55);
      if (p) { const c = cols[(R() * cols.length) | 0]; flower5(g, p[0], p[1], r, c[0], c[1], R() * TAU); }
    }
    for (let i = 0; i < 4; i++) { const p = free.take(R, u * 0.9); if (p) prop(g, 'tulip', p[0], p[1], u * 0.6, R() * 0.5 - 0.25); }
    for (let i = 0; i < 4; i++) { const p = free.take(R, u * 0.8); if (p) prop(g, 'daisy', p[0], p[1], u * 0.5, R() * TAU); }
    for (let i = 0; i < 2; i++) { const p = free.take(R, u * 0.7); if (p) prop(g, 'ladybug', p[0], p[1], u * 0.34, R() * TAU, 0.2); }
    // цветущая вишня в верхних углах
    for (const sx of [0, 1]) {
      const X = (x) => (sx ? W - x : x);
      const B = [[X(-10), u * 0.9], [X(W * 0.1), u * 2.0], [X(W * 0.22), u * 0.6], [X(W * 0.36), u * 1.4]];
      branch(g, B, u * 0.18, '#6a4034');
      for (let i = 0; i < 24; i++) {
        const t = 0.05 + (i / 24) * 0.95, c = bez(B, t);
        flower5(g, c[0] + (R() - 0.5) * u * 1.1, c[1] + (R() - 0.3) * u * 1.0, u * (0.28 + R() * 0.2), ['#ffc4d6', '#ffe3ec', '#ffa8c4'][(R() * 3) | 0], '#f6c443', R() * TAU);
      }
    }
    return { kind: 'petals' };
  },

  // ----- летний пикник -----
  summer(g, W, H, R, free, u) {
    g.fillStyle = lg(g, 0, 0, W * 0.2, H, [[0, '#9ad850'], [1, '#5aa032']]);
    g.fillRect(0, 0, W, H);
    mottled(g, W, H, R, ['#d0ec7a', '#4c9028', '#aee060', '#78b83a'], 70, u * 2, u * 5, 0.25);
    strokes(g, W, H, R, ['#4c9028', '#6cb83a', '#8ad050', '#3e7e22', '#c0e870'], (W * H) / 60, u * 0.26, 1.2, 0.55);
    // плед в клетку (под полем)
    g.save();
    g.translate(W / 2, H * 0.5);
    g.rotate(-0.07);
    const bw = W * 0.98, bh = H * 0.86;
    softShadow(g, 6, 12, bw / 2, bh / 2, 0.35);
    g.beginPath();
    g.rect(-bw / 2, -bh / 2, bw, bh);
    g.fillStyle = '#fff7ec';
    g.fill();
    g.save();
    g.clip();
    const cw = u * 0.85;
    g.fillStyle = 'rgba(214,52,44,.62)';
    for (let x = -bw / 2; x < bw / 2; x += cw * 2) g.fillRect(x, -bh / 2, cw, bh);
    for (let y = -bh / 2; y < bh / 2; y += cw * 2) g.fillRect(-bw / 2, y, bw, cw);
    // складки
    for (let i = 0; i < 9; i++) {
      const x = (R() - 0.5) * bw, y = (R() - 0.5) * bh, r = u * (1.5 + R() * 2);
      g.fillStyle = rg(g, x, y, 0, r, [[0, i % 2 ? 'rgba(255,255,255,.28)' : 'rgba(80,20,10,.16)'], [1, 'rgba(0,0,0,0)']]);
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.restore();
    g.strokeStyle = 'rgba(120,40,30,.55)';
    g.lineWidth = 3;
    g.strokeRect(-bw / 2 + 4, -bh / 2 + 4, bw - 8, bh - 8);
    // бахрома
    g.strokeStyle = '#f2e6d0';
    g.lineWidth = 2;
    g.beginPath();
    for (let y = -bh / 2; y < bh / 2; y += 6) {
      g.moveTo(-bw / 2, y);
      g.lineTo(-bw / 2 - 11, y + 2);
      g.moveTo(bw / 2, y);
      g.lineTo(bw / 2 + 11, y + 2);
    }
    g.stroke();
    g.restore();
    // клубника, вишня, лимонад, арбуз на траве и пледе
    for (let i = 0; i < 4; i++) { const p = free.take(R, u * 0.9); if (p) prop(g, 'strawberry', p[0], p[1], u * 0.55, R() * 2 - 1); }
    for (let i = 0; i < 3; i++) { const p = free.take(R, u * 0.9); if (p) prop(g, 'cherry', p[0], p[1], u * 0.55, R() * 2 - 1); }
    for (let i = 0; i < 3; i++) { const p = free.take(R, u * 0.9); if (p) prop(g, 'butterfly', p[0], p[1], u * 0.6, R() * 2 - 1, 0.18); }
    { // стакан лимонада сверху
      const p = free.take(R, u * 1.0);
      if (p) {
        const [x, y] = p;
        softShadow(g, x + 4, y + 6, u * 0.62, u * 0.55, 0.3);
        blob(g, x, y, u * 0.6, u * 0.6, 0, '#f3fbff');
        blob(g, x, y, u * 0.52, u * 0.52, 0, rg(g, x, y, 0, u * 0.52, [[0, '#fff29a'], [1, '#f2c93a']]));
        g.strokeStyle = 'rgba(255,255,255,.8)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, u * 0.55, 3.5, 4.7);
        g.stroke();
        // долька лимона
        g.save();
        g.translate(x + u * 0.1, y + u * 0.05);
        blob(g, 0, 0, u * 0.3, u * 0.3, 0, '#f6df3a');
        for (let k = 0; k < 8; k++) {
          g.save();
          g.rotate((k * TAU) / 8);
          blob(g, 0, -u * 0.14, u * 0.05, u * 0.1, 0, '#fffbd0');
          g.restore();
        }
        g.restore();
        // соломинка
        g.strokeStyle = '#e0453a';
        g.lineWidth = u * 0.1;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x - u * 0.3, y + u * 0.2);
        g.lineTo(x + u * 0.55, y - u * 0.5);
        g.stroke();
      }
    }
    { // ломтик арбуза
      const p = free.take(R, u * 1.1);
      if (p) {
        g.save();
        g.translate(p[0], p[1]);
        g.rotate(R() * TAU);
        softShadow(g, 4, 6, u * 0.8, u * 0.6, 0.28);
        g.beginPath();
        g.moveTo(-u * 0.8, -u * 0.3);
        g.quadraticCurveTo(0, u * 0.9, u * 0.8, -u * 0.3);
        g.closePath();
        g.fillStyle = '#3f8f35';
        g.fill();
        g.beginPath();
        g.moveTo(-u * 0.7, -u * 0.3);
        g.quadraticCurveTo(0, u * 0.75, u * 0.7, -u * 0.3);
        g.closePath();
        g.fillStyle = '#eaf6d2';
        g.fill();
        g.beginPath();
        g.moveTo(-u * 0.62, -u * 0.3);
        g.quadraticCurveTo(0, u * 0.62, u * 0.62, -u * 0.3);
        g.closePath();
        g.fillStyle = lg(g, 0, -u * 0.3, 0, u * 0.6, [[0, '#ff6a72'], [1, '#e0323e']]);
        g.fill();
        g.fillStyle = '#2a1a14';
        [[-0.3, -0.05], [0.0, 0.1], [0.3, -0.05], [-0.12, 0.3], [0.14, 0.32]].forEach(([x, y]) => blob(g, x * u, y * u, u * 0.05, u * 0.08, 0.3, '#2a1a14'));
        g.restore();
      }
    }
    for (let i = 0; i < (W * H) / 9000; i++) {
      const r = u * (0.2 + R() * 0.15), p = free.take(R, r * 1.2, 10, 0.55);
      if (p) flower5(g, p[0], p[1], r, ['#ffffff', '#ffe27a', '#ff9ec0'][(R() * 3) | 0], '#f6a41e', R() * TAU);
    }
    // тёплое солнце сверху слева
    g.fillStyle = rg(g, W * 0.08, -H * 0.05, 0, Math.max(W, H) * 0.8, [[0, 'rgba(255,245,170,.5)'], [0.5, 'rgba(255,245,170,.1)'], [1, 'rgba(255,245,170,0)']]);
    g.fillRect(0, 0, W, H);
    return { kind: 'fluff' };
  },

  // ----- берег моря -----
  sea(g, W, H, R, free, u) {
    g.fillStyle = lg(g, 0, 0, 0, H, [[0, '#d9b878'], [0.25, '#ecd29a'], [1, '#f4e2b4']]);
    g.fillRect(0, 0, W, H);
    mottled(g, W, H, R, ['#fff3d0', '#c9a468', '#e8c88a', '#f8ecc6'], 80, u * 2, u * 6, 0.3);
    // песчаные рифли
    g.lineCap = 'round';
    for (let k = 0; k < H / (u * 0.5); k++) {
      const y0 = k * u * 0.5 + R() * u * 0.3;
      g.beginPath();
      for (let x = -10; x < W + 10; x += 14) {
        const y = y0 + Math.sin(x * 0.012 + k * 1.7) * u * 0.14 + Math.sin(x * 0.037 + k) * u * 0.05;
        x === -10 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.strokeStyle = k % 2 ? 'rgba(160,120,60,.2)' : 'rgba(255,250,220,.32)';
      g.lineWidth = 2;
      g.stroke();
    }
    strokes(g, W, H, R, ['#c4a060', '#fff2cc', '#b89050'], (W * H) / 90, u * 0.1, 1, 0.5, false);
    // мокрый песок у воды
    const wh = H * 0.17;
    g.fillStyle = lg(g, 0, wh, 0, wh + u * 3.2, [[0, 'rgba(120,88,40,.7)'], [0.5, 'rgba(150,112,56,.36)'], [1, 'rgba(150,112,56,0)']]);
    g.fillRect(0, wh, W, u * 3.4);
    // пляжный зонт сверху (вид сверху)
    const um = free.take(R, u * 2.4, 120);
    if (um) {
      const [x, y] = um;
      softShadow(g, x + 8, y + 12, u * 2, u * 2, 0.28);
      for (let k = 0; k < 10; k++) {
        const a0 = (k * TAU) / 10, a1 = ((k + 1) * TAU) / 10;
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, u * 2, a0, a1);
        g.closePath();
        g.fillStyle = k % 2 ? '#fff6ea' : '#e0453a';
        g.fill();
        g.strokeStyle = 'rgba(80,20,10,.35)';
        g.lineWidth = 1;
        g.stroke();
      }
      g.fillStyle = rg(g, x - u * 0.5, y - u * 0.6, 0, u * 2.4, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(0,0,0,.18)']]);
      g.beginPath();
      g.arc(x, y, u * 2, 0, TAU);
      g.fill();
      blob(g, x, y, u * 0.16, u * 0.16, 0, '#7a5a30');
    }
    // выброшенная ветка
    { const p = free.take(R, u * 1.6); if (p) { g.save(); g.translate(p[0], p[1]); g.rotate(R() * TAU); softShadow(g, 4, 6, u * 1.3, u * 0.3, 0.25); g.beginPath(); g.moveTo(-u * 1.3, 0); g.bezierCurveTo(-u * 0.5, -u * 0.35, u * 0.4, u * 0.2, u * 1.3, -u * 0.1); g.lineWidth = u * 0.26; g.lineCap = 'round'; g.strokeStyle = '#6a5036'; g.stroke(); g.lineWidth = u * 0.18; g.strokeStyle = '#a58a68'; g.stroke(); g.lineWidth = 1; g.strokeStyle = 'rgba(70,50,30,.5)'; g.stroke(); g.restore(); } }
    for (let i = 0; i < 5; i++) { const p = free.take(R, u * 0.9); if (p) prop(g, 'shell', p[0], p[1], u * 0.55, R() * TAU); }
    for (let i = 0; i < 3; i++) { const p = free.take(R, u * 0.9); if (p) prop(g, 'starfish', p[0], p[1], u * 0.58, R() * TAU); }
    { const p = free.take(R, u * 1.0); if (p) prop(g, 'anchor', p[0], p[1], u * 0.62, R() * 0.6 - 0.3); }
    // галька
    for (let i = 0; i < (W * H) / 9000; i++) {
      const r = u * (0.1 + R() * 0.2), p = free.take(R, r * 1.3, 10, 0.6);
      if (p) { softShadow(g, p[0] + 2, p[1] + 3, r, r * 0.8, 0.25); blob(g, p[0], p[1], r, r * 0.78, R() * 3, lg(g, p[0] - r, p[1] - r, p[0] + r, p[1] + r, [[0, '#f0e6d8'], [1, '#a8987c']])); }
    }
    // следы босых ног
    const F = [[W * 1.05, H * 0.9], [W * 0.7, H * 0.55], [W * 0.2, H * 0.78], [-W * 0.05, H * 0.4]];
    for (let i = 0; i < 18; i++) {
      const t = i / 18, c = bez(F, t), a = bezTan(F, t), side = i % 2 ? 1 : -1;
      const x = c[0] + Math.cos(a + 1.57) * side * u * 0.2, y = c[1] + Math.sin(a + 1.57) * side * u * 0.2;
      if (!free.ok(x, y, u * 0.3, 0)) continue;
      g.save();
      g.translate(x, y);
      g.rotate(a + 1.57);
      blob(g, 0, 0, u * 0.13, u * 0.28, 0, 'rgba(150,115,60,.45)');
      blob(g, 0, -u * 0.34, u * 0.1, u * 0.09, 0, 'rgba(150,115,60,.45)');
      g.restore();
    }
    return { kind: 'waves', wh };
  },

  // ----- ярмарка -----
  fair(g, W, H, R, free, u) {
    g.fillStyle = '#6a5a4a';
    g.fillRect(0, 0, W, H);
    // брусчатка
    const ch = u * 0.62;
    for (let row = 0, y = -ch * 0.3; y < H; y += ch, row++) {
      let x = -R() * ch * 2;
      while (x < W) {
        const w = ch * (1.2 + R() * 0.9);
        const base = ['#9c8e7c', '#b0a28e', '#8a7e6e', '#a89a86', '#baad98'][(R() * 5) | 0];
        g.fillStyle = lg(g, x, y, x + w, y + ch, [[0, mix(base, '#ffffff', 0.14)], [1, mix(base, '#2a1a0a', 0.18)]]);
        roundRect(g, x + 1.5, y + 1.5, w - 3, ch - 3, ch * 0.28);
        g.fill();
        g.strokeStyle = 'rgba(40,28,16,.35)';
        g.lineWidth = 1;
        g.stroke();
        x += w;
      }
    }
    mottled(g, W, H, R, ['#ffe9b0', '#3a2a1a', '#c8b898'], 40, u * 2, u * 5, 0.18);
    // яркий узорчатый ковёр под полем
    g.save();
    g.translate(W / 2, H * 0.5);
    const rw = W * 0.94, rh = H * 0.84;
    softShadow(g, 5, 10, rw / 2, rh / 2, 0.38);
    g.fillStyle = '#9a2a24';
    g.fillRect(-rw / 2, -rh / 2, rw, rh);
    g.save();
    g.beginPath();
    g.rect(-rw / 2, -rh / 2, rw, rh);
    g.clip();
    const band = (inset, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.strokeRect(-rw / 2 + inset, -rh / 2 + inset, rw - inset * 2, rh - inset * 2); };
    band(u * 0.2, u * 0.34, '#f2dca0');
    band(u * 0.75, u * 0.5, '#26508a');
    band(u * 1.3, u * 0.22, '#f2dca0');
    // орнамент: ромбы и цветочки вдоль синей полосы и по полю
    const m = (x, y, s, c1, c2) => {
      g.save();
      g.translate(x, y);
      g.fillStyle = c1;
      g.beginPath();
      g.moveTo(0, -s);
      g.lineTo(s, 0);
      g.lineTo(0, s);
      g.lineTo(-s, 0);
      g.closePath();
      g.fill();
      g.fillStyle = c2;
      g.beginPath();
      g.arc(0, 0, s * 0.35, 0, TAU);
      g.fill();
      g.restore();
    };
    for (let x = -rw / 2 + u * 0.75; x < rw / 2 - u * 0.5; x += u * 0.95) {
      m(x, -rh / 2 + u * 0.75, u * 0.28, '#f2dca0', '#c8322a');
      m(x, rh / 2 - u * 0.75, u * 0.28, '#f2dca0', '#c8322a');
    }
    for (let y = -rh / 2 + u * 0.75; y < rh / 2 - u * 0.5; y += u * 0.95) {
      m(-rw / 2 + u * 0.75, y, u * 0.28, '#f2dca0', '#c8322a');
      m(rw / 2 - u * 0.75, y, u * 0.28, '#f2dca0', '#c8322a');
    }
    for (let y = -rh / 2 + u * 2; y < rh / 2 - u * 1.6; y += u * 1.5) for (let x = -rw / 2 + u * 2; x < rw / 2 - u * 1.6; x += u * 1.5) m(x + ((Math.round(y / u) % 2) ? u * 0.75 : 0), y, u * 0.34, 'rgba(242,200,120,.4)', 'rgba(38,80,138,.5)');
    g.restore();
    g.strokeStyle = 'rgba(60,10,8,.6)';
    g.lineWidth = 2;
    g.strokeRect(-rw / 2, -rh / 2, rw, rh);
    g.strokeStyle = '#f2e0b0';
    g.lineWidth = 2;
    g.beginPath();
    for (let y = -rh / 2; y < rh / 2; y += 5) {
      g.moveTo(-rw / 2, y);
      g.lineTo(-rw / 2 - 10, y + 1);
      g.moveTo(rw / 2, y);
      g.lineTo(rw / 2 + 10, y + 1);
    }
    g.stroke();
    g.restore();
    // сладости ярмарки на мостовой
    for (let i = 0; i < 3; i++) { const p = free.take(R, u * 0.9); if (p) prop(g, 'bagel', p[0], p[1], u * 0.55, R() * TAU); }
    for (let i = 0; i < 3; i++) { const p = free.take(R, u * 0.9); if (p) prop(g, 'gingerbread', p[0], p[1], u * 0.55, R() * 1 - 0.5); }
    for (let i = 0; i < 2; i++) { const p = free.take(R, u * 0.9); if (p) prop(g, 'honey', p[0], p[1], u * 0.6, R() * 0.4 - 0.2); }
    // конфетти
    for (let i = 0; i < (W * H) / 3500; i++) {
      const x = R() * W, y = R() * H;
      g.save();
      g.translate(x, y);
      g.rotate(R() * TAU);
      g.fillStyle = ['#e0453a', '#f6c443', '#3f8fd8', '#72b043', '#ff9ec0'][(R() * 5) | 0];
      g.fillRect(-3, -1.5, 6, 3);
      g.restore();
    }
    return { kind: 'bunting', fall: true };
  },

  // ----- сказочный лес -----
  forest(g, W, H, R, free, u) {
    g.fillStyle = lg(g, 0, 0, W * 0.3, H, [[0, '#2f6a44'], [1, '#1c4030']]);
    g.fillRect(0, 0, W, H);
    mottled(g, W, H, R, ['#58a04a', '#143828', '#7ac062', '#235a3a'], 90, u * 2, u * 5, 0.3);
    strokes(g, W, H, R, ['#4a9a50', '#78c068', '#2a6a3c', '#a0dc84'], (W * H) / 45, u * 0.12, 1.4, 0.55, false);
    // корни в углах
    const root = (x, y, a, len) => {
      for (let k = 0; k < 4; k++) {
        const ang = a + (k - 1.5) * 0.45 + (R() - 0.5) * 0.2, L = len * (0.7 + R() * 0.5);
        const P = [[x, y], [x + Math.cos(ang) * L * 0.3, y + Math.sin(ang) * L * 0.3 + (R() - 0.5) * u], [x + Math.cos(ang) * L * 0.7, y + Math.sin(ang) * L * 0.7 + (R() - 0.5) * u], [x + Math.cos(ang) * L, y + Math.sin(ang) * L]];
        pathStroke(g, P, u * 0.55, '#2a1a10');
        pathStroke(g, P, u * 0.42, '#5a3c22');
        pathStroke(g, P, u * 0.14, '#8a6238');
      }
    };
    root(-u, -u * 0.6, 0.7, u * 5);
    root(W + u, -u * 0.4, 2.4, u * 5);
    root(-u, H + u * 0.6, -0.7, u * 5);
    root(W + u, H + u * 0.6, -2.4, u * 5);
    // папоротники, грибы, шишки, совы
    for (let i = 0; i < 5; i++) { const p = free.take(R, u * 1.4); if (p) prop(g, 'fern', p[0], p[1], u * 0.95, R() * TAU, 0.22); }
    for (let i = 0; i < 4; i++) {
      const p = free.take(R, u * 0.9);
      if (!p) continue;
      g.fillStyle = rg(g, p[0], p[1], 0, u * 1.1, [[0, 'rgba(255,230,140,.4)'], [1, 'rgba(255,230,140,0)']]);
      g.fillRect(p[0] - u * 1.1, p[1] - u * 1.1, u * 2.2, u * 2.2);
      prop(g, 'mushroom', p[0], p[1], u * 0.6, R() * 0.4 - 0.2);
    }
    for (let i = 0; i < 3; i++) { const p = free.take(R, u * 0.8); if (p) prop(g, 'pinecone', p[0], p[1], u * 0.5, R() * TAU); }
    { const p = free.take(R, u * 1.0); if (p) prop(g, 'owl', p[0], p[1], u * 0.62, 0, 0.35); }
    // замшелые камни
    for (let i = 0; i < 6; i++) {
      const r = u * (0.4 + R() * 0.5), p = free.take(R, r * 1.3);
      if (!p) continue;
      softShadow(g, p[0] + 3, p[1] + 5, r, r * 0.8, 0.35);
      blob(g, p[0], p[1], r, r * 0.8, R() * 3, lg(g, p[0] - r, p[1] - r, p[0] + r, p[1] + r, [[0, '#9aa8a0'], [1, '#4a5a56']]));
      blob(g, p[0] - r * 0.1, p[1] - r * 0.25, r * 0.85, r * 0.45, 0, rg(g, p[0], p[1] - r * 0.3, 0, r, [[0, '#6cc060'], [1, '#2f7a3a']]));
    }
    // светящиеся колокольчики
    for (let i = 0; i < (W * H) / 12000; i++) {
      const p = free.take(R, u * 0.4, 10, 0.5);
      if (!p) continue;
      g.fillStyle = rg(g, p[0], p[1], 0, u * 0.5, [[0, 'rgba(150,210,255,.55)'], [1, 'rgba(150,210,255,0)']]);
      g.fillRect(p[0] - u * 0.5, p[1] - u * 0.5, u, u);
      flower5(g, p[0], p[1], u * 0.17, '#9ad0ff', '#ffffff', R() * TAU);
    }
    return { kind: 'fireflies', pts: Array.from({ length: 26 }, () => ({ x: R(), y: R(), ph: R() * 6, sp: 0.3 + R() * 0.5 })) };
  },

  // ----- главный экран: уютная комната с камином -----
  hearth(g, W, H, R, free, u, avoid) {
    // высота камина — до верха вывески названия
    const tops = (avoid || []).filter((a) => a.y > 70 && a.w > 100).map((a) => a.y);
    // для промо размеры и положение камина задаются снаружи (window.__hearth)
    const ov = (typeof window !== 'undefined' && window.__hearth) || null;
    // широкий экран: камин сбоку от меню, слева уголок с окном и креслом
    const rects = (avoid || []).filter((a) => !(a.y < 70 && a.w > W * 0.5));
    let side = null;
    if (!ov && rects.length) {
      const l = Math.min(...rects.map((a) => a.x)), r = Math.max(...rects.map((a) => a.x + a.w));
      if (l >= 150 && W - r >= 150) side = { l: l - 14, r };
    }
    const wy0 = H * 0.68;
    let hh, hw, cx;
    if (side) {
      hw = Math.max(W * 0.2, (W - side.r - 12) / 1.1);
      hh = Math.min(wy0 - 14, hw * 2.7);
      cx = W - hw * 0.55 - 4;
    } else {
      hh = ov ? ov.hh : Math.max(72, Math.min(H * 0.3, (tops.length ? Math.min(...tops) : H * 0.22) - 4));
      hw = ov ? ov.hw : Math.min(W * 0.94, hh * 3.1);
      cx = ov ? ov.cx : W / 2;
    }
    // базовый размер мелких деталей (носки, часы, свечи, поленья)
    const hq = Math.min(hh, hw * 1.2);
    // стена: тёплые обои в полоску с ромбиками
    g.fillStyle = lg(g, 0, 0, 0, H, [[0, '#8a5a3a'], [0.7, '#6e4430'], [1, '#4e2e1c']]);
    g.fillRect(0, 0, W, H);
    const sw = Math.max(28, u * 0.6);
    for (let x = 0; x < W; x += sw * 2) {
      g.fillStyle = 'rgba(255,225,170,.07)';
      g.fillRect(x, 0, sw, H);
    }
    g.fillStyle = 'rgba(255,225,170,.14)';
    for (let y = sw; y < H * 0.68; y += sw * 1.4) for (let x = sw * 0.5; x < W + sw; x += sw * 2) {
      g.beginPath();
      g.moveTo(x, y - 5);
      g.lineTo(x + 4, y);
      g.lineTo(x, y + 5);
      g.lineTo(x - 4, y);
      g.closePath();
      g.fill();
    }
    mottled(g, W, H, R, ['#2a1408', '#c89868'], 30, u * 3, u * 7, 0.16);
    // деревянные панели внизу и плинтус
    const wy = H * 0.68;
    g.fillStyle = lg(g, 0, wy, 0, H, [[0, '#6a4224'], [1, '#3e2410']]);
    g.fillRect(0, wy, W, H - wy);
    for (let x = 0; x < W; x += u * 0.8) {
      g.strokeStyle = 'rgba(25,10,0,.45)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, wy + 14);
      g.lineTo(x, H);
      g.stroke();
      g.strokeStyle = 'rgba(255,210,150,.1)';
      g.beginPath();
      g.moveTo(x + 2, wy + 14);
      g.lineTo(x + 2, H);
      g.stroke();
    }
    g.fillStyle = lg(g, 0, wy, 0, wy + 14, [[0, '#a8744a'], [1, '#6a4224']]);
    g.fillRect(0, wy, W, 14);
    g.fillStyle = 'rgba(20,8,0,.5)';
    g.fillRect(0, wy + 14, W, 4);
    // круглый плетёный коврик у ног
    const rx = cx, ry = H * 0.93, rs = side ? Math.min(1, hw * 0.55 / (u * 3.1)) : 1;
    softShadow(g, rx, ry + 6, u * 3.2 * rs, u * 0.9 * rs, 0.35);
    for (let k = 0; k < 6; k++) {
      blob(g, rx, ry, u * (3.1 - k * 0.38) * rs, u * (0.85 - k * 0.1) * rs, 0, ['#c8553a', '#f0d8a0', '#4a7a9a', '#f0d8a0', '#c8553a', '#8a3a2a'][k]);
    }
    if (side) interior(g, 10, side.l, H, wy0, R);
    // камин: каменная кладка
    const top = -6, fl = hh + 4;
    const stone = (x, y, w, h) => {
      const base = ['#a89a88', '#b8aa96', '#968a7a', '#c0b4a0'][(R() * 4) | 0];
      g.fillStyle = lg(g, x, y, x + w, y + h, [[0, mix(base, '#ffffff', 0.14)], [1, mix(base, '#2a1a0a', 0.2)]]);
      roundRect(g, x + 1, y + 1, w - 2, h - 2, h * 0.22);
      g.fill();
      g.strokeStyle = 'rgba(40,28,16,.4)';
      g.lineWidth = 1;
      g.stroke();
    };
    const bx = cx - hw / 2;
    softShadow(g, cx, fl + 6, hw * 0.55, hh * 0.08, 0.4);
    g.save();
    roundRect(g, bx, top, hw, fl - top, 8);
    g.clip();
    g.fillStyle = '#7a6e5e';
    g.fillRect(bx, top, hw, fl - top);
    const sh = Math.max(12, hq * 0.1);
    for (let row = 0, y = top; y < fl; y += sh, row++) {
      let x = bx - (row % 2) * sh;
      while (x < bx + hw) {
        const w2 = sh * (1.6 + R() * 1.3);
        stone(x, y, w2, sh);
        x += w2;
      }
    }
    g.restore();
    // каминная полка
    const mY = hh * (side ? 0.27 : 0.2), mH = Math.max(10, hh * 0.1), mw = hw * 1.1;
    softShadow(g, cx, mY + mH + 6, mw * 0.5, mH * 0.7, 0.4);
    g.fillStyle = lg(g, 0, mY, 0, mY + mH, [[0, '#b8825a'], [0.5, '#8a5a38'], [1, '#5a3620']]);
    roundRect(g, cx - mw / 2, mY, mw, mH, 5);
    g.fill();
    g.strokeStyle = '#2e1808';
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = 'rgba(255,220,170,.35)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - mw / 2 + 6, mY + 2.5);
    g.lineTo(cx + mw / 2 - 6, mY + 2.5);
    g.stroke();
    // проём камина с аркой
    const ow = hw * (side ? 0.6 : 0.46), oy0 = hh * (side ? 0.56 : 0.4), oy1 = hh * 0.96;
    const opening = () => {
      g.beginPath();
      g.moveTo(cx - ow / 2, oy1);
      g.lineTo(cx - ow / 2, oy0 + ow * 0.28);
      g.quadraticCurveTo(cx - ow / 2, oy0, cx, oy0);
      g.quadraticCurveTo(cx + ow / 2, oy0, cx + ow / 2, oy0 + ow * 0.28);
      g.lineTo(cx + ow / 2, oy1);
      g.closePath();
    };
    opening();
    g.fillStyle = lg(g, 0, oy0, 0, oy1, [[0, '#120804'], [1, '#2a1208']]);
    g.fill();
    g.save();
    opening();
    g.clip();
    // кирпичная задняя стенка
    for (let row = 0, y = oy0; y < oy1; y += sh * 0.7, row++) {
      for (let x = cx - ow / 2 - (row % 2) * sh; x < cx + ow / 2; x += sh * 1.5) {
        g.fillStyle = ['#3a1a0e', '#2e140a', '#44200f'][(R() * 3) | 0];
        g.fillRect(x + 1, y + 1, sh * 1.5 - 2, sh * 0.7 - 2);
      }
    }
    g.fillStyle = rg(g, cx, oy1, 0, ow * 0.9, [[0, 'rgba(255,120,30,.55)'], [1, 'rgba(255,120,30,0)']]);
    g.fillRect(cx - ow, oy0, ow * 2, oy1 - oy0);
    // поленья
    const log = (x, y, len, ang) => {
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      const th = Math.max(8, hq * 0.085);
      g.fillStyle = lg(g, 0, -th, 0, th, [[0, '#8a5a34'], [1, '#3e2410']]);
      roundRect(g, -len / 2, -th / 2, len, th, th * 0.5);
      g.fill();
      g.strokeStyle = '#20100a';
      g.lineWidth = 1.5;
      g.stroke();
      blob(g, len / 2, 0, th * 0.34, th * 0.5, 0, '#d8a870');
      blob(g, len / 2, 0, th * 0.2, th * 0.3, 0, '#a8744a');
      g.restore();
    };
    log(cx - ow * 0.08, oy1 - hh * 0.05, ow * 0.8, 0.12);
    log(cx + ow * 0.06, oy1 - hh * 0.09, ow * 0.74, -0.14);
    g.restore();
    opening();
    g.strokeStyle = '#2a1a0c';
    g.lineWidth = 3;
    g.stroke();
    // каменная плита перед камином и решётка
    g.fillStyle = lg(g, 0, fl - 6, 0, fl + 8, [[0, '#b8aa96'], [1, '#6a5e4e']]);
    roundRect(g, cx - hw * 0.58, fl - 4, hw * 1.16, 12, 4);
    g.fill();
    g.strokeStyle = '#2a1a0c';
    g.lineWidth = 2;
    g.stroke();
    // носки у камина
    const sock = (x, col) => {
      g.save();
      g.translate(x, mY + mH);
      g.rotate(0.04);
      softShadow(g, 3, 6, hq * 0.1, hq * 0.1, 0.3);
      g.beginPath();
      g.moveTo(-hq * 0.055, 0);
      g.lineTo(hq * 0.055, 0);
      g.lineTo(hq * 0.055, hq * 0.19);
      g.quadraticCurveTo(hq * 0.055, hq * 0.27, hq * 0.13, hq * 0.28);
      g.quadraticCurveTo(hq * 0.15, hq * 0.3, hq * 0.1, hq * 0.31);
      g.lineTo(-hq * 0.03, hq * 0.3);
      g.quadraticCurveTo(-hq * 0.055, hq * 0.28, -hq * 0.055, hq * 0.2);
      g.closePath();
      g.fillStyle = col;
      g.fill();
      g.strokeStyle = 'rgba(30,5,5,.7)';
      g.lineWidth = 1.5;
      g.stroke();
      g.fillStyle = '#fff6e6';
      roundRect(g, -hq * 0.065, -hq * 0.01, hq * 0.13, hq * 0.05, 3);
      g.fill();
      g.stroke();
      g.restore();
    };
    if (!(ov && ov.noSocks)) {
      sock(cx - ow / 2 - hw * 0.1, '#d8423a');
      sock(cx + ow / 2 + hw * 0.1, '#3f8f45');
    }
    // на полке: часы, свечи, ёлочка
    const candles = [];
    const candle = (x) => {
      const ch = hq * 0.17, cw = hq * 0.055;
      g.fillStyle = lg(g, x - cw, 0, x + cw, 0, [[0, '#f6ead0'], [1, '#d8c49c']]);
      roundRect(g, x - cw / 2, mY - ch, cw, ch, 3);
      g.fill();
      g.strokeStyle = 'rgba(80,50,20,.6)';
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = '#c8a050';
      roundRect(g, x - cw * 0.95, mY - ch * 0.12, cw * 1.9, ch * 0.12, 3);
      g.fill();
      candles.push({ x, y: mY - ch - 3, s: hq * 0.045 });
    };
    candle(cx - hw * 0.36);
    candle(cx + hw * 0.36);
    // часы
    const ccx = cx, ccy = mY - hq * 0.1, cr = hq * 0.1;
    softShadow(g, ccx + 3, ccy + cr, cr, cr * 0.5, 0.3);
    blob(g, ccx, ccy, cr, cr, 0, lg(g, ccx - cr, ccy - cr, ccx + cr, ccy + cr, [[0, '#f0c860'], [1, '#a8782a']]));
    blob(g, ccx, ccy, cr * 0.82, cr * 0.82, 0, '#fff6e0');
    g.strokeStyle = '#3a2410';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(ccx, ccy);
    g.lineTo(ccx - cr * 0.3, ccy - cr * 0.35);
    g.moveTo(ccx, ccy);
    g.lineTo(ccx + cr * 0.45, ccy + cr * 0.1);
    g.stroke();
    for (let k = 0; k < 12; k++) {
      const a = (k * TAU) / 12;
      g.fillStyle = '#3a2410';
      g.fillRect(ccx + Math.cos(a) * cr * 0.7 - 1, ccy + Math.sin(a) * cr * 0.7 - 1, 2, 2);
    }
    // еловая гирлянда на полке с огоньками (по краям)
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const x = cx + sx * (hw * 0.14 + i * hw * 0.056), y = mY - 2 - Math.sin((i / 6) * Math.PI) * 2;
        g.save();
        g.translate(x, y);
        g.rotate(sx * 0.4);
        blob(g, 0, 0, hq * 0.045, hq * 0.018, 0, i % 2 ? '#2a7a38' : '#1d5a2a');
        g.restore();
      }
    }
    return { kind: 'fire', cx, oy1, ow, hh, hq, candles, u };
  },

  // ----- звёздная ночь -----
  night(g, W, H, R, free, u) {
    g.fillStyle = lg(g, 0, 0, 0, H, [[0, '#080c2c'], [0.45, '#1a2660'], [0.8, '#43397a'], [1, '#6a4a86']]);
    g.fillRect(0, 0, W, H);
    // северное сияние
    for (let k = 0; k < 3; k++) {
      const y0 = H * (0.28 + k * 0.1);
      g.beginPath();
      g.moveTo(0, y0 + 80);
      for (let x = 0; x <= W; x += 20) g.lineTo(x, y0 + Math.sin(x * 0.006 + k * 2) * u * 1.4 + Math.sin(x * 0.015 + k) * u * 0.5);
      g.lineTo(W, y0 - u * 4);
      g.lineTo(0, y0 - u * 4);
      g.closePath();
      g.fillStyle = lg(g, 0, y0 - u * 4, 0, y0 + 40, [[0, 'rgba(80,230,170,0)'], [0.7, ['rgba(80,230,170,.16)', 'rgba(120,150,255,.14)', 'rgba(190,120,255,.12)'][k]], [1, 'rgba(80,230,170,0)']]);
      g.fill();
    }
    mottled(g, W, H, R, ['#4a3a8a', '#6a5ab0', '#2a3a80'], 24, u * 3, u * 7, 0.18);
    // звёзды
    const stars = [];
    for (let i = 0; i < (W * H) / 2800; i++) {
      const x = R() * W, y = R() * H * 0.85, r = 0.6 + R() * 1.6;
      g.fillStyle = `rgba(255,${240 + ((R() * 15) | 0)},${210 + ((R() * 45) | 0)},${0.4 + R() * 0.6})`;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      if (R() < 0.08) stars.push({ x, y, r: 2 + R() * 3, ph: R() * 6 });
    }
    // луна
    const mx = W * 0.2, my = Math.max(u * 2.2, H * 0.09), mr = u * 1.7;
    g.fillStyle = rg(g, mx, my, mr * 0.8, mr * 4.2, [[0, 'rgba(255,240,180,.4)'], [1, 'rgba(255,240,180,0)']]);
    g.fillRect(mx - mr * 4.2, my - mr * 4.2, mr * 8.4, mr * 8.4);
    blob(g, mx, my, mr, mr, 0, lg(g, mx - mr, my - mr, mx + mr, my + mr, [[0, '#fffbd8'], [1, '#f0d680']]));
    for (const [cx, cy, cr] of [[-0.3, -0.25, 0.22], [0.35, 0.1, 0.18], [-0.1, 0.45, 0.14], [0.2, -0.5, 0.1], [-0.55, 0.2, 0.09]]) {
      blob(g, mx + cx * mr, my + cy * mr, cr * mr, cr * mr * 0.9, 0, 'rgba(190,150,60,.28)');
      blob(g, mx + cx * mr - 1, my + cy * mr - 1, cr * mr * 0.8, cr * mr * 0.7, 0, 'rgba(255,250,210,.3)');
    }
    // холмы, ели и домики с тёплыми окошками
    const hill = (y0, amp, col, seed, trees) => {
      const Rh = rng(seed);
      g.beginPath();
      g.moveTo(0, H);
      const pts = [];
      for (let x = 0; x <= W + 20; x += 16) {
        const y = y0 + Math.sin(x * 0.004 + seed) * amp + Math.sin(x * 0.011 + seed * 2) * amp * 0.4;
        pts.push([x, y]);
        g.lineTo(x, y);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fillStyle = col;
      g.fill();
      if (trees) {
        for (let i = 0; i < W / (u * 0.8); i++) {
          const p = pts[(Rh() * pts.length) | 0], s = u * (0.5 + Rh() * 0.5);
          g.fillStyle = mix(col, '#000000', 0.25);
          for (let k = 0; k < 3; k++) {
            g.beginPath();
            g.moveTo(p[0], p[1] - s * (1.2 + k * 0.7));
            g.lineTo(p[0] + s * (0.5 + k * 0.18), p[1] - s * (0.35 + k * 0.7) + 2);
            g.lineTo(p[0] - s * (0.5 + k * 0.18), p[1] - s * (0.35 + k * 0.7) + 2);
            g.closePath();
            g.fill();
          }
        }
      }
      return pts;
    };
    hill(H * 0.86, u * 0.8, '#3a3170', 5, false);
    hill(H * 0.92, u * 0.7, '#251f55', 9, true);
    const hp = hill(H * 0.98, u * 0.5, '#15123a', 13, true);
    for (let i = 0; i < 5; i++) {
      const p = hp[(R() * hp.length) | 0], s = u * 0.7;
      g.fillStyle = '#0d0b28';
      g.fillRect(p[0] - s, p[1] - s * 0.8, s * 1.6, s * 0.9);
      g.beginPath();
      g.moveTo(p[0] - s * 1.15, p[1] - s * 0.8);
      g.lineTo(p[0] - s * 0.2, p[1] - s * 1.6);
      g.lineTo(p[0] + s * 0.75, p[1] - s * 0.8);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffd25a';
      g.fillRect(p[0] - s * 0.7, p[1] - s * 0.55, s * 0.4, s * 0.4);
      g.fillRect(p[0] + s * 0.1, p[1] - s * 0.55, s * 0.4, s * 0.4);
    }
    // фонарики-светлячки в траве у холмов
    prop(g, 'lantern', W * 0.84, H * 0.96, u * 0.5, 0, 0.1);
    return { kind: 'stars', stars };
  },
};

// ---------- публичный интерфейс ----------
export function buildScene(g, W, H, id, avoid) {
  const image = background(id, W, H);
  if (image) {
    paintBackground(g, W, H, id, image);
    return { kind: 'generated', id, avoid };
  }
  const R = rng(SCENE_IDS.indexOf(id) * 101 + 17);
  const u = Math.max(40, Math.min(96, Math.min(W, H) * 0.075));
  const free = makeFree(avoid, W, H, u * 0.18);
  const f = BUILD[id] || BUILD.autumn;
  const anim = f(g, W, H, R, free, u, avoid) || {};
  anim.id = id;
  anim.u = u;
  return anim;
}

// движение поверх фона: время t в секундах
export function drawAmbient(g, W, H, t, a) {
  if (!a) return;
  if (a.kind === 'generated') return ambientArt(g, W, H, t, a.id, a.avoid);
  const u = a.u;
  g.save();
  switch (a.kind) {
    case 'fire': {
      const { cx, oy1, ow, hh } = a, hq = a.hq || hh;
      const fl = (k) => 0.5 + 0.5 * Math.sin(t * k);
      // тёплый мерцающий свет на стене
      const glow = 0.2 + 0.07 * fl(7.3) + 0.05 * fl(11.1);
      g.fillStyle = rg(g, cx, oy1 - hh * 0.2, 0, Math.max(W, H) * 0.75, [[0, `rgba(255,150,50,${glow})`], [0.4, `rgba(255,120,30,${glow * 0.35})`], [1, 'rgba(255,120,30,0)']]);
      g.fillRect(0, 0, W, H);
      // пламя тремя слоями
      const tongue = (x, w, h, col, ph) => {
        const sw = Math.sin(t * 5 + ph) * w * 0.18;
        const hh2 = h * (0.88 + 0.12 * Math.sin(t * 8.5 + ph * 1.7));
        g.beginPath();
        g.moveTo(x - w, oy1 - hh * 0.04);
        g.bezierCurveTo(x - w * 1.05, oy1 - hh2 * 0.4, x - w * 0.3 + sw, oy1 - hh2 * 0.7, x + sw * 1.4, oy1 - hh2);
        g.bezierCurveTo(x + w * 0.3 + sw, oy1 - hh2 * 0.7, x + w * 1.05, oy1 - hh2 * 0.4, x + w, oy1 - hh * 0.04);
        g.closePath();
        g.fillStyle = col;
        g.fill();
      };
      const fw = ow * 0.26, fh = hq * 0.4;
      tongue(cx - fw * 0.9, fw * 0.55, fh * 0.75, '#d8360e', 0.5);
      tongue(cx + fw * 0.9, fw * 0.55, fh * 0.7, '#d8360e', 2.1);
      tongue(cx, fw * 0.8, fh, '#f2761a', 1);
      tongue(cx - fw * 0.35, fw * 0.5, fh * 0.8, '#ffa828', 3.3);
      tongue(cx + fw * 0.35, fw * 0.5, fh * 0.72, '#ffa828', 4.4);
      tongue(cx, fw * 0.42, fh * 0.6, '#ffe070', 5.2);
      tongue(cx, fw * 0.2, fh * 0.34, '#fffbd0', 6.1);
      // искры
      for (let i = 0; i < 14; i++) {
        const life = ((t * 0.5 + i * 0.173) % 1);
        const x = cx + Math.sin(i * 7.3 + t * 1.3) * ow * 0.2 * (0.4 + life), y = oy1 - hq * 0.12 - life * hq * 0.5;
        g.fillStyle = `rgba(255,${180 + ((i * 17) % 60)},80,${(1 - life) * 0.9})`;
        g.beginPath();
        g.arc(x, y, 1 + (1 - life) * 1.6, 0, TAU);
        g.fill();
      }
      // огоньки свечей
      for (const c of a.candles) {
        const k = 0.85 + 0.15 * Math.sin(t * 9 + c.x);
        g.fillStyle = rg(g, c.x, c.y, 0, c.s * 4, [[0, 'rgba(255,200,100,.5)'], [1, 'rgba(255,200,100,0)']]);
        g.fillRect(c.x - c.s * 4, c.y - c.s * 4, c.s * 8, c.s * 8);
        g.beginPath();
        g.moveTo(c.x, c.y - c.s * 1.9 * k);
        g.bezierCurveTo(c.x + c.s * 1.0, c.y - c.s * 0.6, c.x + c.s * 0.8, c.y + c.s * 0.8, c.x, c.y + c.s * 0.9);
        g.bezierCurveTo(c.x - c.s * 0.8, c.y + c.s * 0.8, c.x - c.s * 1.0, c.y - c.s * 0.6, c.x, c.y - c.s * 1.9 * k);
        g.fillStyle = '#ffb82e';
        g.fill();
        g.beginPath();
        g.ellipse(c.x, c.y + c.s * 0.1, c.s * 0.4, c.s * 0.7, 0, 0, TAU);
        g.fillStyle = '#fff6b0';
        g.fill();
      }
      break;
    }
    case 'leaves': {
      for (let i = 0; i < 16; i++) {
        const s = 0.5 + ((i * 37) % 10) / 12, sp = 22 + ((i * 53) % 30);
        const x = ((((i * 211) % 1000) / 1000) * W + Math.sin(t * 0.7 + i) * 40 + t * 12) % W;
        const y = (((i * 137) % 1000) / 1000 * H + t * sp) % (H + 60) - 30;
        g.save();
        g.translate(x < 0 ? x + W : x, y);
        g.rotate(Math.sin(t * 1.3 + i) * 0.9 + i);
        g.scale(Math.cos(t * 1.7 + i * 2) * 0.5 + 0.55, 1);
        leafShape(g, i % 3, u * 0.3 * s, a.pal[i % 5][0], a.pal[i % 5][1]);
        g.restore();
      }
      break;
    }
    case 'snow': {
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 70; i++) {
        const sp = 20 + ((i * 29) % 40), s = 1.2 + ((i * 17) % 10) / 4;
        const x = ((((i * 331) % 1000) / 1000) * W + Math.sin(t * 0.6 + i) * 22) % W;
        const y = (((i * 173) % 1000) / 1000 * H + t * sp) % (H + 10);
        g.globalAlpha = 0.5 + ((i * 7) % 5) / 10;
        g.beginPath();
        g.arc(x, y, s, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
      for (const b of a.bulbs) {
        const k = 0.55 + 0.45 * Math.sin(t * 2.4 + b.ph);
        g.fillStyle = rg(g, b.x, b.y, 0, u * 0.55, [[0, rgba(b.c, 0.65 * k)], [1, rgba(b.c, 0)]]);
        g.fillRect(b.x - u * 0.55, b.y - u * 0.55, u * 1.1, u * 1.1);
        blob(g, b.x, b.y, 4.5, 6, 0, mix(b.c, '#ffffff', 0.35 * k));
        blob(g, b.x - 1, b.y - 2, 1.4, 2, 0, 'rgba(255,255,255,.8)');
      }
      break;
    }
    case 'petals': {
      for (let i = 0; i < 22; i++) {
        const sp = 18 + ((i * 41) % 26);
        const x = ((((i * 277) % 1000) / 1000) * W + Math.sin(t * 0.8 + i) * 36 + t * 10) % W;
        const y = (((i * 151) % 1000) / 1000 * H + t * sp) % (H + 30) - 15;
        g.save();
        g.translate(x, y);
        g.rotate(t * 1.2 + i);
        g.scale(1, Math.cos(t * 2 + i) * 0.4 + 0.6);
        g.beginPath();
        g.ellipse(0, 0, u * 0.12, u * 0.08, 0, 0, TAU);
        g.fillStyle = ['#ffc4d6', '#ffe3ec', '#ffa8c4'][i % 3];
        g.fill();
        g.restore();
      }
      break;
    }
    case 'fluff': {
      for (let i = 0; i < 14; i++) {
        const x = ((((i * 313) % 1000) / 1000) * W + t * (10 + (i % 5) * 4)) % W;
        const y = ((((i * 191) % 1000) / 1000) * H + Math.sin(t * 0.5 + i) * 30 - t * 6 + H * 4) % H;
        g.strokeStyle = 'rgba(255,255,255,.75)';
        g.lineWidth = 1;
        g.beginPath();
        for (let k = 0; k < 7; k++) {
          const an = (k / 7) * TAU;
          g.moveTo(x, y);
          g.lineTo(x + Math.cos(an) * u * 0.14, y + Math.sin(an) * u * 0.14);
        }
        g.stroke();
        blob(g, x, y, 1.8, 1.8, 0, 'rgba(255,255,255,.9)');
      }
      break;
    }
    case 'waves': {
      const wh = a.wh;
      g.save();
      g.beginPath();
      g.rect(0, 0, W, H);
      g.clip();
      // вода
      const edge = (x, k) => wh + Math.sin(x * 0.012 + t * 0.8 + k) * u * 0.28 + Math.sin(x * 0.03 - t * 1.1) * u * 0.12 + Math.sin(t * 0.55 + k) * u * 0.3;
      g.beginPath();
      g.moveTo(0, 0);
      for (let x = 0; x <= W; x += 10) g.lineTo(x, edge(x, 0));
      g.lineTo(W, 0);
      g.closePath();
      g.fillStyle = lg(g, 0, 0, 0, wh + u, [[0, '#1c8db8'], [0.6, '#36b8cc'], [1, '#7ad8d6']]);
      g.fill();
      // блики на воде
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = 0; i < 26; i++) {
        const x = (((i * 197) % 1000) / 1000) * W, y = (((i * 89) % 1000) / 1000) * wh * 0.9;
        const k = Math.max(0, Math.sin(t * 1.6 + i * 1.7));
        if (k > 0.2) sparkle(g, x, y, 2 + k * 4, `rgba(255,255,255,${k * 0.8})`);
      }
      // пена
      g.beginPath();
      for (let x = 0; x <= W; x += 8) g.lineTo(x, edge(x, 0) + Math.sin(x * 0.09 + t * 1.5) * u * 0.07);
      for (let x = W; x >= 0; x -= 8) g.lineTo(x, edge(x, 0) - u * 0.15 + Math.sin(x * 0.05 + t) * u * 0.06);
      g.closePath();
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= W; x += 8) g.lineTo(x, edge(x, 1.5) + u * 0.5 + Math.sin(t * 0.9 + x * 0.02) * u * 0.1);
      g.stroke();
      g.restore();
      break;
    }
    case 'bunting': {
      const flags = ['#e0453a', '#f6c443', '#3f8fd8', '#72b043', '#ff9ec0', '#ffffff'];
      const rope = (x0, x1, y, sag, ph) => {
        const sw = Math.sin(t * 0.9 + ph) * 3;
        g.beginPath();
        g.moveTo(x0, y);
        g.quadraticCurveTo((x0 + x1) / 2 + sw, y + sag * 2, x1, y);
        g.strokeStyle = '#4a3220';
        g.lineWidth = 2;
        g.stroke();
        const n = Math.max(5, Math.round((x1 - x0) / (u * 0.95)));
        for (let i = 1; i < n; i++) {
          const k = i / n, x = x0 + (x1 - x0) * k + sw * 2 * k * (1 - k), yy = y + 2 * sag * k * (1 - k);
          const rot = Math.sin(t * 1.4 + i + ph) * 0.12;
          g.save();
          g.translate(x, yy);
          g.rotate(rot);
          g.beginPath();
          g.moveTo(-u * 0.24, 0);
          g.lineTo(u * 0.24, 0);
          g.lineTo(0, u * 0.6);
          g.closePath();
          g.fillStyle = flags[i % flags.length];
          g.fill();
          g.strokeStyle = 'rgba(60,30,10,.5)';
          g.lineWidth = 1;
          g.stroke();
          g.restore();
        }
      };
      rope(-5, W * 0.52, u * 0.3, u * 0.55, 0);
      rope(W * 0.48, W + 5, u * 0.5, u * 0.5, 2);
      // конфетти
      for (let i = 0; i < 26; i++) {
        const x = ((((i * 257) % 1000) / 1000) * W + Math.sin(t * 0.7 + i) * 18) % W;
        const y = (((i * 131) % 1000) / 1000 * H + t * (14 + (i % 5) * 4)) % (H + 20) - 10;
        g.save();
        g.translate(x, y);
        g.rotate(t * 2 + i);
        g.scale(Math.cos(t * 3 + i), 1);
        g.fillStyle = flags[i % 5];
        g.fillRect(-3, -2, 6, 4);
        g.restore();
      }
      break;
    }
    case 'fireflies': {
      // косые лучи света
      for (let i = 0; i < 3; i++) {
        const x = W * (0.2 + i * 0.3) + Math.sin(t * 0.2 + i) * 20;
        g.beginPath();
        g.moveTo(x, -10);
        g.lineTo(x + u * 1.2, -10);
        g.lineTo(x + u * 4.4, H);
        g.lineTo(x + u * 2.2, H);
        g.closePath();
        g.fillStyle = lg(g, x, 0, x + u * 3, H, [[0, 'rgba(255,245,180,.12)'], [1, 'rgba(255,245,180,0)']]);
        g.fill();
      }
      for (const f of a.pts) {
        const x = (f.x * W + Math.sin(t * f.sp + f.ph) * u * 1.2 + W) % W;
        const y = (f.y * H + Math.cos(t * f.sp * 0.8 + f.ph * 2) * u * 0.9 + H) % H;
        const k = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.6 * f.sp + f.ph));
        g.fillStyle = rg(g, x, y, 0, u * 0.55, [[0, `rgba(230,255,140,${0.8 * k})`], [1, 'rgba(230,255,140,0)']]);
        g.fillRect(x - u * 0.55, y - u * 0.55, u * 1.1, u * 1.1);
        blob(g, x, y, 2.2, 2.2, 0, `rgba(255,255,220,${k})`);
      }
      break;
    }
    case 'stars': {
      for (const s of a.stars) {
        const k = 0.45 + 0.55 * Math.sin(t * 2 + s.ph);
        sparkle(g, s.x, s.y, s.r * (0.8 + k * 0.8), `rgba(255,250,220,${0.5 + k * 0.5})`);
      }
      // падающая звезда раз в ~9 секунд
      const c = (t % 9) / 1.2;
      if (c < 1) {
        const x0 = W * 0.9 - c * W * 0.5, y0 = H * 0.05 + c * H * 0.22;
        const gr = g.createLinearGradient(x0, y0, x0 + u * 3, y0 - u * 1.2);
        gr.addColorStop(0, 'rgba(255,255,255,.95)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.strokeStyle = gr;
        g.lineWidth = 2.4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x0 + u * 3, y0 - u * 1.2);
        g.stroke();
      }
      break;
    }
  }
  g.restore();
}
