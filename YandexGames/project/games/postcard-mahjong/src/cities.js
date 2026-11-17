// Города путешествия: процедурные пейзажи на Canvas 2D. Каждый город — небо, дальний план, достопримечательность,
// дома своего стиля, вода или земля и передний план с цветами и деревьями. Рисуется один раз при смене размера.
import { rng } from './core.js';
import { drawScenery, SCENERY_IDS } from './scenery.js';
import { drawCityArt } from './city-art.js';

const TAU = Math.PI * 2;

function grad(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => gr.addColorStop(Array.isArray(c) ? c[0] : i / (stops.length - 1), Array.isArray(c) ? c[1] : c));
  return gr;
}
function poly(g, pts, fill, stroke, lw) {
  g.beginPath();
  for (let i = 0; i < pts.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, pts[i], pts[i + 1]);
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw || 1;
    g.stroke();
  }
}
function rect(g, x, y, w, h, fill) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
}
function disc(g, x, y, r, fill) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fillStyle = fill;
  g.fill();
}
function ell(g, x, y, rx, ry, fill) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
  g.fillStyle = fill;
  g.fill();
}

// ---------- общие слои ----------
function skyLayer(g, W, H, stops) {
  g.fillStyle = grad(g, 0, 0, 0, H * 0.75, stops);
  g.fillRect(0, 0, W, H);
}
function sunLayer(g, x, y, r, core, glow) {
  const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r * 4);
  gr.addColorStop(0, glow);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  disc(g, x, y, r, core);
}
function cloud(g, x, y, s, fill, shade) {
  const puffs = [[0, 0, 1], [-1.1, 0.25, 0.7], [1.1, 0.2, 0.75], [-0.5, -0.45, 0.75], [0.55, -0.4, 0.8], [1.8, 0.35, 0.5], [-1.8, 0.4, 0.45]];
  if (shade) for (const [dx, dy, r] of puffs) ell(g, x + dx * s, y + dy * s + s * 0.18, r * s, r * s * 0.8, shade);
  for (const [dx, dy, r] of puffs) ell(g, x + dx * s, y + dy * s, r * s, r * s * 0.8, fill);
}
function clouds(g, R, W, H, n, fill, shade, y0, y1, s) {
  for (let i = 0; i < n; i++) cloud(g, R() * W, H * (y0 + R() * (y1 - y0)), s * (0.6 + R() * 0.6), fill, shade);
}
function hills(g, R, W, y, amp, fill, f = 1) {
  g.beginPath();
  g.moveTo(0, y + amp * 2);
  const ph = R() * 10, ph2 = R() * 10;
  for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, y - amp * (0.6 * Math.sin((x / W) * 5 * f + ph) + 0.4 * Math.sin((x / W) * 11 * f + ph2)));
  g.lineTo(W, y + amp * 4);
  g.lineTo(0, y + amp * 4);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}
function waterLayer(g, R, W, y0, y1, c1, c2, glint) {
  g.fillStyle = grad(g, 0, y0, 0, y1, [c1, c2]);
  g.fillRect(0, y0, W, y1 - y0);
  g.strokeStyle = glint;
  g.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const y = y0 + (y1 - y0) * Math.pow(R(), 0.8);
    const w = (6 + R() * 26) * (0.5 + (y - y0) / (y1 - y0));
    const x = R() * W;
    g.lineWidth = 1 + ((y - y0) / (y1 - y0)) * 2.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w, y);
    g.stroke();
  }
}
// отражение уже нарисованной полосы над водой
function reflect(g, W, yLine, h, alpha) {
  const c = g.canvas;
  const hh = Math.min(h, yLine, c.height - yLine);
  if (hh <= 2) return;
  g.save();
  g.globalAlpha = alpha;
  g.translate(0, yLine * 2);
  g.scale(1, -1);
  g.drawImage(c, 0, yLine - hh, W, hh, 0, yLine - hh, W, hh);
  g.restore();
}
function windows(g, x, y, w, h, cols, rows, c, arch, R, lit) {
  const ww = (w / cols) * 0.42, wh = (h / rows) * 0.5;
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const cx = x + (k + 0.5) * (w / cols), cy = y + (r + 0.35) * (h / rows);
      g.fillStyle = lit && R() < 0.25 ? lit : c;
      g.beginPath();
      if (arch) {
        g.moveTo(cx - ww / 2, cy + wh);
        g.lineTo(cx - ww / 2, cy);
        g.arc(cx, cy, ww / 2, Math.PI, 0);
        g.lineTo(cx + ww / 2, cy + wh);
      } else g.rect(cx - ww / 2, cy, ww, wh);
      g.fill();
    }
}
function shadeSide(g, x, y, w, h, a = 0.18) {
  g.fillStyle = `rgba(40,20,10,${a})`;
  g.fillRect(x + w * 0.78, y, w * 0.22, h);
}

// деревья
function roundTree(g, x, y, s, c1, c2, trunk = '#6a4424') {
  rect(g, x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5, trunk);
  for (const [dx, dy, r, c] of [[0, -0.95, 0.5, c2], [-0.3, -0.7, 0.36, c2], [0.32, -0.72, 0.38, c2], [-0.08, -1.05, 0.38, c1], [0.2, -0.88, 0.28, c1]]) disc(g, x + dx * s, y + dy * s, r * s, c);
}
function cypress(g, x, y, s, c1, c2) {
  rect(g, x - s * 0.04, y - s * 0.1, s * 0.08, s * 0.1, '#5a3a1a');
  ell(g, x, y - s * 0.6, s * 0.14, s * 0.58, c2);
  ell(g, x - s * 0.03, y - s * 0.66, s * 0.08, s * 0.48, c1);
}
function umbrellaPine(g, x, y, s, c1, c2) {
  g.strokeStyle = '#5a3a1a';
  g.lineWidth = s * 0.07;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x - s * 0.1, y - s * 0.5, x + s * 0.05, y - s * 0.9);
  g.stroke();
  ell(g, x + s * 0.05, y - s * 0.95, s * 0.6, s * 0.18, c2);
  ell(g, x - s * 0.05, y - s * 1.02, s * 0.45, s * 0.13, c1);
}
function palm(g, x, y, s, lean = 0.3, c1 = '#3aa84a', c2 = '#1f7a34') {
  g.strokeStyle = '#8a6a3a';
  g.lineWidth = s * 0.08;
  g.lineCap = 'round';
  const tx = x + lean * s, ty = y - s;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + lean * s * 0.2, y - s * 0.6, tx, ty);
  g.stroke();
  g.strokeStyle = 'rgba(70,40,10,.4)';
  g.lineWidth = s * 0.02;
  for (let i = 1; i < 8; i++) {
    const u = i / 8;
    const px = x + (tx - x) * u + lean * s * 0.2 * (1 - u) * u, py = y + (ty - y) * u;
    g.beginPath();
    g.moveTo(px - s * 0.04, py);
    g.lineTo(px + s * 0.04, py - s * 0.02);
    g.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.55 + (i > 3 ? 0.2 : -0.2);
    const ex = tx + Math.cos(a) * s * 0.55, ey = ty + Math.sin(a) * s * 0.3 + s * 0.22;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(a) * s * 0.35, ty + Math.sin(a) * s * 0.35 - s * 0.08, ex, ey);
    g.quadraticCurveTo(tx + Math.cos(a) * s * 0.3, ty + Math.sin(a) * s * 0.2, tx, ty);
    g.fillStyle = i % 2 ? c1 : c2;
    g.fill();
  }
  for (const d of [-0.05, 0.05]) disc(g, tx + d * s, ty + s * 0.05, s * 0.05, '#6a4a1a');
}
function sakuraTree(g, R, x, y, s) {
  g.strokeStyle = '#5a3a3a';
  g.lineCap = 'round';
  g.lineWidth = s * 0.08;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + s * 0.05, y - s * 0.4, x - s * 0.1, y - s * 0.7);
  g.moveTo(x + s * 0.02, y - s * 0.35);
  g.quadraticCurveTo(x + s * 0.3, y - s * 0.5, x + s * 0.4, y - s * 0.7);
  g.stroke();
  for (let i = 0; i < 26; i++) {
    const a = R() * TAU, r = Math.sqrt(R());
    const px = x + s * 0.12 + Math.cos(a) * r * s * 0.55, py = y - s * 0.78 + Math.sin(a) * r * s * 0.28;
    disc(g, px, py, s * (0.1 + R() * 0.08), ['#ffd0e0', '#ffb8d0', '#f8a0c0', '#fff0f6'][i % 4]);
  }
}
function flowerBed(g, R, x0, x1, y, s, colors, leaf = '#3a8a3a') {
  for (let x = x0; x < x1; x += s * 0.9) ell(g, x, y + s * 0.2, s * 0.9, s * 0.55, leaf);
  for (let i = 0; i < ((x1 - x0) / s) * 2.2; i++) {
    const x = x0 + R() * (x1 - x0), yy = y - R() * s * 0.5;
    const c = colors[Math.floor(R() * colors.length)];
    for (let p = 0; p < 5; p++) disc(g, x + Math.cos((p / 5) * TAU) * s * 0.13, yy + Math.sin((p / 5) * TAU) * s * 0.13, s * 0.11, c);
    disc(g, x, yy, s * 0.07, '#ffe46a');
  }
}
function lamp(g, x, y, s, c = '#2a2a2a') {
  rect(g, x - s * 0.02, y - s * 0.8, s * 0.04, s * 0.8, c);
  rect(g, x - s * 0.08, y - s * 0.02, s * 0.16, s * 0.04, c);
  poly(g, [x - s * 0.08, y - s * 0.8, x + s * 0.08, y - s * 0.8, x + s * 0.06, y - s * 0.95, x - s * 0.06, y - s * 0.95], '#fff3c0', c, s * 0.02);
  rect(g, x - s * 0.09, y - s * 0.83, s * 0.18, s * 0.03, c);
}
function birds(g, R, W, H, n, c) {
  g.strokeStyle = c;
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = H * (0.08 + R() * 0.25), s = H * (0.008 + R() * 0.008);
    g.lineWidth = s * 0.35;
    g.beginPath();
    g.moveTo(x - s * 1.6, y);
    g.quadraticCurveTo(x - s * 0.7, y - s, x, y);
    g.quadraticCurveTo(x + s * 0.7, y - s, x + s * 1.6, y);
    g.stroke();
  }
}

// ряд домов вдоль линии base
function houseRow(g, R, W, base, s, st) {
  let x = -R() * s * 2;
  const out = [];
  while (x < W) {
    const w = s * (st.wMin + R() * (st.wMax - st.wMin));
    const h = s * (st.hMin + R() * (st.hMax - st.hMin));
    const c = st.colors[Math.floor(R() * st.colors.length)];
    out.push({ x, w, h, c });
    x += w + (st.gap || 0) * s;
  }
  for (const b of out) {
    const y = base - b.h;
    rect(g, b.x, y, b.w, b.h, b.c);
    if (st.trim) rect(g, b.x, y, b.w, s * 0.4, st.trim);
    shadeSide(g, b.x, y, b.w, b.h, 0.12);
    const cols = Math.max(1, Math.round(b.w / (s * st.winW)));
    const rows = Math.max(1, Math.round(b.h / (s * st.winH)));
    windows(g, b.x, y + s * 0.6, b.w, b.h - s * 1.2, cols, rows, st.win, st.arch, R, st.lit);
    st.roof && st.roof(g, b.x, y, b.w, s, R, b);
  }
  return out;
}
const roofs = {
  gable: (c) => (g, x, y, w, s) => poly(g, [x - s * 0.2, y, x + w / 2, y - w * 0.45, x + w + s * 0.2, y], c),
  mansard: (c) => (g, x, y, w, s, R) => {
    poly(g, [x - s * 0.15, y, x + s * 0.5, y - s * 2.2, x + w - s * 0.5, y - s * 2.2, x + w + s * 0.15, y], c);
    const n = Math.max(1, Math.floor(w / (s * 2.2)));
    for (let k = 0; k < n; k++) {
      const cx = x + (k + 0.5) * (w / n);
      rect(g, cx - s * 0.35, y - s * 1.7, s * 0.7, s * 1.0, '#e8e0d0');
      rect(g, cx - s * 0.22, y - s * 1.5, s * 0.44, s * 0.7, '#4a5a6a');
    }
    if (R() < 0.7) rect(g, x + w * 0.7, y - s * 3, s * 0.6, s * 1.2, '#b06a4a');
  },
  flat: (c) => (g, x, y, w, s) => rect(g, x - s * 0.15, y - s * 0.35, w + s * 0.3, s * 0.4, c),
  dutch: (cs) => (g, x, y, w, s, R, b) => {
    const kind = Math.floor(R() * 3);
    const c = b.c;
    if (kind === 0) {
      // ступенчатый фронтон
      const st = 4;
      const pts = [x, y];
      for (let i = 0; i < st; i++) {
        const xi = x + (w / 2) * (i / st), yi = y - (w * 0.7 * i) / st;
        pts.push(xi, yi - (w * 0.7) / st, xi + (w / 2 / st), yi - (w * 0.7) / st);
      }
      pts.push(x + w / 2, y - w * 0.7);
      for (let i = st - 1; i >= 0; i--) {
        const xi = x + w - (w / 2) * (i / st), yi = y - (w * 0.7 * i) / st;
        pts.push(xi - w / 2 / st, yi - (w * 0.7) / st, xi, yi - (w * 0.7) / st);
      }
      pts.push(x + w, y);
      poly(g, pts, c);
    } else if (kind === 1) {
      // колокол
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x, y - w * 0.3, x + w * 0.25, y - w * 0.4, x + w * 0.3, y - w * 0.75);
      g.lineTo(x + w * 0.7, y - w * 0.75);
      g.bezierCurveTo(x + w * 0.75, y - w * 0.4, x + w, y - w * 0.3, x + w, y);
      g.fillStyle = c;
      g.fill();
      rect(g, x + w * 0.26, y - w * 0.8, w * 0.48, s * 0.3, '#f4efe4');
    } else {
      poly(g, [x, y, x + w / 2, y - w * 0.6, x + w, y], c);
      poly(g, [x + w * 0.1, y - s * 0.1, x + w / 2, y - w * 0.52, x + w * 0.9, y - s * 0.1], 'rgba(255,255,255,.12)');
    }
    // белые карнизы и окно на чердаке
    rect(g, x + w * 0.42, y - w * 0.32, w * 0.16, w * 0.2, '#f4efe4');
    rect(g, x + w * 0.45, y - w * 0.29, w * 0.1, w * 0.14, '#3a4a5a');
    rect(g, x + w * 0.46, y - w * 0.62, s * 0.18, s * 0.3, '#2a2a2a');
  },
  terra: (c) => (g, x, y, w, s) => {
    poly(g, [x - s * 0.3, y, x + w * 0.5, y - w * 0.18, x + w + s * 0.3, y], c);
    g.strokeStyle = 'rgba(90,30,10,.35)';
    g.lineWidth = s * 0.08;
    for (let k = 1; k < 5; k++) {
      g.beginPath();
      g.moveTo(x + (w * k) / 5, y - w * 0.18 * (1 - Math.abs(k / 5 - 0.5) * 2));
      g.lineTo(x + (w * k) / 5, y);
      g.stroke();
    }
  },
};

// ---------- достопримечательности (x — центр основания, y — земля, s — масштаб) ----------
const LM = {
  // Спасская башня и купола Покровского собора
  moscow(g, x, y, s) {
    const brick = '#c03a2a', brick2 = '#9a2a1e', white = '#f6efe2';
    // кремлёвская стена
    rect(g, x - s * 60, y - s * 6, s * 120, s * 6, brick);
    rect(g, x - s * 60, y - s * 2.2, s * 120, s * 0.3, brick2);
    for (let k = -60; k < 60; k += 1.6) {
      poly(g, [x + k * s, y - s * 6, x + k * s, y - s * 7.4, x + (k + 0.4) * s, y - s * 6.9, x + (k + 0.8) * s, y - s * 7.4, x + (k + 0.8) * s, y - s * 6], brick);
    }
    // собор слева
    const bx = x - s * 15;
    rect(g, bx - s * 7, y - s * 9, s * 14, s * 9, '#d0563a');
    windows(g, bx - s * 7, y - s * 8, s * 14, s * 7, 6, 2, '#5a2a1a', true, Math.random, null);
    const dome = (dx, by, w, h, c1, c2, stripes) => {
      rect(g, bx + dx - w * 0.38, by, w * 0.76, s * 3.5, '#e8d6b6');
      rect(g, bx + dx - w * 0.38, by + s * 1.2, w * 0.76, s * 0.4, '#c8a878');
      g.save();
      g.beginPath();
      g.moveTo(bx + dx - w / 2, by);
      g.bezierCurveTo(bx + dx - w * 0.75, by - h * 0.45, bx + dx - w * 0.1, by - h * 0.65, bx + dx, by - h);
      g.bezierCurveTo(bx + dx + w * 0.1, by - h * 0.65, bx + dx + w * 0.75, by - h * 0.45, bx + dx + w / 2, by);
      g.closePath();
      g.fillStyle = c1;
      g.fill();
      g.clip();
      g.strokeStyle = c2;
      g.lineWidth = w * 0.13;
      for (let k = -4; k <= 4; k++) {
        g.beginPath();
        if (stripes === 'twist') {
          g.moveTo(bx + dx + k * w * 0.25 - w, by);
          g.lineTo(bx + dx + k * w * 0.25 + w * 0.3, by - h);
        } else {
          g.moveTo(bx + dx + k * w * 0.22, by);
          g.lineTo(bx + dx + k * w * 0.05, by - h);
        }
        g.stroke();
      }
      g.restore();
      rect(g, bx + dx - s * 0.08, by - h - s * 1.2, s * 0.16, s * 1.2, '#e8b830');
      rect(g, bx + dx - s * 0.4, by - h - s * 0.9, s * 0.8, s * 0.12, '#e8b830');
    };
    rect(g, bx - s * 1.2, y - s * 23, s * 2.4, s * 14, '#e8d6b6');
    poly(g, [bx - s * 1.5, y - s * 23, bx, y - s * 29, bx + s * 1.5, y - s * 23], '#4a8a5a');
    rect(g, bx - s * 0.08, y - s * 30.5, s * 0.16, s * 1.6, '#e8b830');
    dome(-4.6 * s, y - s * 13, s * 3.6, s * 4.6, '#3a8ad0', '#f4f0e0', 'twist');
    dome(4.6 * s, y - s * 13, s * 3.6, s * 4.6, '#e8b830', '#3a9a4a', 'twist');
    dome(-2 * s, y - s * 16, s * 3, s * 4, '#e84a3a', '#f4f0e0', 'v');
    dome(2.2 * s, y - s * 16.5, s * 3, s * 4, '#3a9a4a', '#e8d070', 'twist');
    // Спасская башня
    const tx = x + s * 6;
    rect(g, tx - s * 4, y - s * 18, s * 8, s * 18, brick);
    rect(g, tx - s * 4, y - s * 18, s * 8, s * 0.6, white);
    poly(g, [tx - s * 1.6, y, tx - s * 1.6, y - s * 4, tx, y - s * 5.4, tx + s * 1.6, y - s * 4, tx + s * 1.6, y], '#4a2018');
    windows(g, tx - s * 4, y - s * 16, s * 8, s * 8, 3, 2, white, true, Math.random, null);
    rect(g, tx - s * 3.2, y - s * 25, s * 6.4, s * 7, brick);
    rect(g, tx - s * 3.4, y - s * 25.3, s * 6.8, s * 0.6, white);
    // часы
    disc(g, tx, y - s * 21.5, s * 2.3, '#2a3a5a');
    disc(g, tx, y - s * 21.5, s * 2, '#f6efe2');
    g.strokeStyle = '#2a2a2a';
    g.lineWidth = s * 0.25;
    g.beginPath();
    g.moveTo(tx, y - s * 21.5);
    g.lineTo(tx, y - s * 23);
    g.moveTo(tx, y - s * 21.5);
    g.lineTo(tx + s * 1, y - s * 21.2);
    g.stroke();
    rect(g, tx - s * 2.4, y - s * 30, s * 4.8, s * 5, white);
    windows(g, tx - s * 2.4, y - s * 29.5, s * 4.8, s * 4, 3, 1, '#c8a050', true, Math.random, null);
    for (const d of [-2.4, 2.4]) {
      rect(g, tx + d * s - s * 0.35, y - s * 31.6, s * 0.7, s * 1.6, white);
      poly(g, [tx + d * s - s * 0.45, y - s * 31.6, tx + d * s, y - s * 33.6, tx + d * s + s * 0.45, y - s * 31.6], '#4a8a5a');
    }
    poly(g, [tx - s * 2.2, y - s * 30, tx, y - s * 41, tx + s * 2.2, y - s * 30], '#3a7a4a');
    g.strokeStyle = 'rgba(255,230,140,.5)';
    g.lineWidth = s * 0.15;
    for (let k = 1; k < 5; k++) {
      g.beginPath();
      g.moveTo(tx - s * 2.2 + (k * s * 4.4) / 5, y - s * 30);
      g.lineTo(tx, y - s * 41);
      g.stroke();
    }
    // рубиновая звезда
    const sy = y - s * 43;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? s * 0.8 : s * 1.9;
      g.lineTo(tx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#e8203a';
    g.fill();
    g.strokeStyle = '#ffd24a';
    g.lineWidth = s * 0.25;
    g.stroke();
  },
  // Адмиралтейство: жёлтое здание, золотой шпиль с корабликом
  spb(g, x, y, s) {
    const yel = '#f2c86a', white = '#f8f2e4';
    rect(g, x - s * 26, y - s * 9, s * 52, s * 9, yel);
    rect(g, x - s * 26, y - s * 9.5, s * 52, s * 0.8, white);
    for (let k = -25; k < 26; k += 2.2) rect(g, x + k * s, y - s * 8.5, s * 0.6, s * 8.5, white);
    windows(g, x - s * 26, y - s * 8, s * 52, s * 7, 22, 2, '#5a6a7a', true, Math.random, null);
    rect(g, x - s * 7, y - s * 16, s * 14, s * 16, yel);
    poly(g, [x - s * 2.6, y, x - s * 2.6, y - s * 5, x, y - s * 7.4, x + s * 2.6, y - s * 5, x + s * 2.6, y], '#6a5040');
    rect(g, x - s * 7.5, y - s * 16.5, s * 15, s * 0.9, white);
    rect(g, x - s * 5, y - s * 22, s * 10, s * 6, yel);
    for (let k = -4.5; k <= 4; k += 1.4) rect(g, x + k * s, y - s * 22, s * 0.5, s * 6, white);
    rect(g, x - s * 5.5, y - s * 22.6, s * 11, s * 0.8, white);
    rect(g, x - s * 3, y - s * 26, s * 6, s * 4, yel);
    g.beginPath();
    g.moveTo(x - s * 3.2, y - s * 26);
    g.quadraticCurveTo(x, y - s * 31, x + s * 3.2, y - s * 26);
    g.fillStyle = '#e8b830';
    g.fill();
    poly(g, [x - s * 0.9, y - s * 29, x, y - s * 52, x + s * 0.9, y - s * 29], '#f0c840');
    poly(g, [x - s * 0.9, y - s * 29, x, y - s * 52, x, y - s * 29], '#c8941a');
    disc(g, x, y - s * 52.4, s * 0.5, '#f0c840');
    // кораблик
    const sy = y - s * 54;
    poly(g, [x - s * 1.4, sy, x + s * 1.4, sy, x + s * 0.9, sy + s * 0.8, x - s * 0.9, sy + s * 0.8], '#f0c840');
    poly(g, [x - s * 0.1, sy, x - s * 0.1, sy - s * 2.2, x + s * 1.1, sy - s * 0.4], '#f0c840');
    rect(g, x - s * 0.1, sy - s * 2.4, s * 0.2, s * 2.4, '#c8941a');
  },
  // Эйфелева башня: решётка из линий
  paris(g, x, y, s) {
    const c = '#6a4a3a', c2 = '#8a6a5a';
    const H = s * 52;
    const leg = (dir) => {
      g.beginPath();
      g.moveTo(x + dir * s * 11, y);
      g.quadraticCurveTo(x + dir * s * 5, y - H * 0.3, x + dir * s * 2.2, y - H * 0.6);
      g.lineTo(x + dir * s * 0.6, y - H * 0.95);
      g.lineTo(x + dir * s * 0.2, y - H * 0.95);
      g.lineTo(x + dir * s * 1.4, y - H * 0.6);
      g.quadraticCurveTo(x + dir * s * 3.2, y - H * 0.3, x + dir * s * 7.2, y);
      g.closePath();
      g.fillStyle = c;
      g.fill();
    };
    leg(-1);
    leg(1);
    // арка между ногами
    g.beginPath();
    g.moveTo(x - s * 8.6, y - s * 0.1);
    g.quadraticCurveTo(x, y - s * 14, x + s * 8.6, y - s * 0.1);
    g.lineTo(x + s * 7.6, y - s * 2);
    g.quadraticCurveTo(x, y - s * 11.5, x - s * 7.6, y - s * 2);
    g.closePath();
    g.fillStyle = c;
    g.fill();
    // решётка
    g.strokeStyle = c2;
    g.lineWidth = s * 0.18;
    for (let k = 0; k < 24; k++) {
      const u = k / 24;
      const yy = y - H * 0.6 * u;
      const half = s * (9.1 - 7.3 * Math.sqrt(u)) - s * 0.1;
      g.beginPath();
      g.moveTo(x - half - s * 1.8 * (1 - u), yy);
      g.lineTo(x - half + s * 1.4, yy - s * 1.2);
      g.moveTo(x + half + s * 1.8 * (1 - u), yy);
      g.lineTo(x + half - s * 1.4, yy - s * 1.2);
      g.stroke();
    }
    // площадки
    rect(g, x - s * 7.2, y - H * 0.29, s * 14.4, s * 1.4, c);
    rect(g, x - s * 7.6, y - H * 0.29 - s * 0.5, s * 15.2, s * 0.5, '#4a3020');
    rect(g, x - s * 3.4, y - H * 0.6, s * 6.8, s * 1.1, c);
    rect(g, x - s * 1.2, y - H * 0.95, s * 2.4, s * 1.6, c);
    rect(g, x - s * 0.25, y - H * 1.04, s * 0.5, s * 4.5, c);
    // огоньки вечером
    g.fillStyle = 'rgba(255,220,120,.85)';
    for (let k = 0; k < 18; k++) {
      const u = k / 18;
      g.beginPath();
      g.arc(x + (k % 2 ? 1 : -1) * s * (7 - 6 * u), y - H * 0.9 * u - s * 1, s * 0.22, 0, TAU);
      g.fill();
    }
  },
  // мельница с крыльями
  amsterdam(g, x, y, s) {
    poly(g, [x - s * 6, y, x - s * 3.6, y - s * 18, x + s * 3.6, y - s * 18, x + s * 6, y], '#7a5a4a');
    poly(g, [x - s * 6, y, x - s * 3.6, y - s * 18, x - s * 1.8, y - s * 18, x - s * 3, y], 'rgba(255,255,255,.12)');
    rect(g, x - s * 6.6, y - s * 7, s * 13.2, s * 0.8, '#4a3020');
    g.beginPath();
    g.moveTo(x - s * 4.4, y - s * 18);
    g.quadraticCurveTo(x, y - s * 25, x + s * 4.4, y - s * 18);
    g.fillStyle = '#3a4a5a';
    g.fill();
    rect(g, x - s * 1, y - s * 4, s * 2, s * 4, '#3a2a1a');
    rect(g, x - s * 1.4, y - s * 13, s * 2.8, s * 2.8, '#f4efe4');
    rect(g, x - s * 1, y - s * 12.6, s * 2, s * 2, '#3a4a5a');
    // крылья
    const cx = x, cy = y - s * 20.5;
    for (let i = 0; i < 4; i++) {
      const a = 0.4 + (i * Math.PI) / 2;
      g.save();
      g.translate(cx, cy);
      g.rotate(a);
      rect(g, -s * 0.3, 0, s * 0.6, s * 17, '#5a3a24');
      g.strokeStyle = '#f4efe4';
      g.lineWidth = s * 0.18;
      g.fillStyle = 'rgba(250,245,230,.85)';
      g.fillRect(s * 0.3, s * 3, s * 3.2, s * 13.5);
      for (let k = 0; k < 8; k++) {
        g.beginPath();
        g.moveTo(s * 0.3, s * (3 + k * 1.9));
        g.lineTo(s * 3.5, s * (3 + k * 1.9));
        g.stroke();
      }
      g.beginPath();
      g.moveTo(s * 3.5, s * 3);
      g.lineTo(s * 3.5, s * 16.5);
      g.stroke();
      g.restore();
    }
    disc(g, cx, cy, s * 1, '#3a2a1a');
  },
  // колокольня Сан-Марко
  venice(g, x, y, s) {
    const brick = '#b85a3a';
    rect(g, x - s * 3.6, y - s * 36, s * 7.2, s * 36, brick);
    g.strokeStyle = 'rgba(80,20,10,.35)';
    g.lineWidth = s * 0.3;
    for (const d of [-2.2, 0, 2.2]) {
      g.beginPath();
      g.moveTo(x + d * s, y - s * 2);
      g.lineTo(x + d * s, y - s * 34);
      g.stroke();
    }
    rect(g, x - s * 4, y - s * 43, s * 8, s * 7, '#f2ead8');
    windows(g, x - s * 4, y - s * 42.4, s * 8, s * 6, 4, 1, '#4a3a2a', true, Math.random, null);
    rect(g, x - s * 4.4, y - s * 36.6, s * 8.8, s * 0.8, '#e8dcc0');
    rect(g, x - s * 3.6, y - s * 48, s * 7.2, s * 5, '#e8dcc0');
    poly(g, [x - s * 3.6, y - s * 48, x, y - s * 58, x + s * 3.6, y - s * 48], '#4a9a7a');
    disc(g, x, y - s * 58.6, s * 0.8, '#e8b830');
    // палаццо с арками
    for (const [ox, w, c] of [[-22, 14, '#f4c8a0'], [12, 16, '#f8e0c0'], [-36, 12, '#e8a888']]) {
      const bx = x + ox * s;
      rect(g, bx, y - s * 16, w * s, s * 16, c);
      windows(g, bx, y - s * 15, w * s, s * 14, Math.round(w / 2), 3, '#6a4a3a', true, Math.random, null);
      rect(g, bx - s * 0.3, y - s * 16.5, (w + 0.6) * s, s * 0.8, '#f6efe0');
    }
  },
  // Колизей
  rome(g, x, y, s) {
    const stone = '#e8c88a', dark = '#a8784a';
    const w = s * 46, h = s * 20;
    g.beginPath();
    g.moveTo(x - w / 2, y);
    g.lineTo(x - w / 2, y - h * 0.82);
    g.quadraticCurveTo(x - w * 0.1, y - h * 1.0, x + w * 0.22, y - h * 1.0);
    g.lineTo(x + w * 0.3, y - h * 0.62);
    g.lineTo(x + w * 0.4, y - h * 0.66);
    g.lineTo(x + w / 2, y - h * 0.4);
    g.lineTo(x + w / 2, y);
    g.closePath();
    g.fillStyle = stone;
    g.fill();
    g.save();
    g.clip();
    for (let lv = 0; lv < 4; lv++) {
      const yy = y - h * (0.03 + lv * 0.24);
      rect(g, x - w / 2, yy - h * 0.02, w, h * 0.03, '#f4dca8');
      if (lv === 3) {
        for (let k = 0; k < 24; k++) rect(g, x - w / 2 + (k + 0.3) * (w / 24), yy - h * 0.15, w / 70, h * 0.06, dark);
        continue;
      }
      for (let k = 0; k < 16; k++) {
        const ax = x - w / 2 + (k + 0.5) * (w / 16);
        const aw = w / 16 * 0.62, ah = h * 0.17;
        g.beginPath();
        g.moveTo(ax - aw / 2, yy - h * 0.02);
        g.lineTo(ax - aw / 2, yy - ah + aw / 2);
        g.arc(ax, yy - ah + aw / 2, aw / 2, Math.PI, 0);
        g.lineTo(ax + aw / 2, yy - h * 0.02);
        g.fillStyle = lv === 0 ? '#6a4a2a' : '#8a5a34';
        g.fill();
      }
    }
    g.restore();
    rect(g, x - w / 2, y - h * 0.02, w, h * 0.02, dark);
  },
  // Голубая мечеть: купола и минареты
  istanbul(g, x, y, s) {
    const c = '#b8c4d8', c2 = '#8a98b4', lead = '#7a8aa8';
    rect(g, x - s * 22, y - s * 8, s * 44, s * 8, c);
    windows(g, x - s * 22, y - s * 7, s * 44, s * 6, 16, 1, '#4a5a7a', true, Math.random, null);
    const dome = (dx, dy, r) => {
      rect(g, x + dx * s - r * 1.05, y - dy * s - r * 0.25, r * 2.1, r * 0.35, c);
      g.beginPath();
      g.arc(x + dx * s, y - dy * s - r * 0.2, r, Math.PI, 0);
      g.fillStyle = lead;
      g.fill();
      g.beginPath();
      g.arc(x + dx * s - r * 0.25, y - dy * s - r * 0.35, r * 0.55, Math.PI * 1.1, Math.PI * 1.6);
      g.strokeStyle = 'rgba(255,255,255,.35)';
      g.lineWidth = r * 0.12;
      g.stroke();
      rect(g, x + dx * s - s * 0.12, y - dy * s - r * 1.2 - s * 1.4, s * 0.24, s * 1.6, '#e8b830');
      disc(g, x + dx * s, y - dy * s - r * 1.2 - s * 1.5, s * 0.35, '#e8b830');
    };
    rect(g, x - s * 14, y - s * 14, s * 28, s * 6, c);
    for (const dx of [-16, -9, 9, 16]) dome(dx, 8, s * 3.2);
    dome(-8, 14, s * 5.5);
    dome(8, 14, s * 5.5);
    rect(g, x - s * 9, y - s * 19, s * 18, s * 5, c);
    dome(0, 19, s * 9.5);
    // минареты
    for (const dx of [-27, -21, 21, 27, -33, 33]) {
      const mx = x + dx * s, top = y - s * (Math.abs(dx) > 30 ? 30 : 36);
      rect(g, mx - s * 0.9, top, s * 1.8, y - top, '#d8e0ec');
      rect(g, mx - s * 1.4, top + (y - top) * 0.35, s * 2.8, s * 0.6, c2);
      rect(g, mx - s * 1.4, top + (y - top) * 0.6, s * 2.8, s * 0.6, c2);
      poly(g, [mx - s * 0.95, top, mx, top - s * 6, mx + s * 0.95, top], lead);
    }
  },
  // пирамиды Гизы
  cairo(g, x, y, s) {
    const pyr = (cx, w, h) => {
      poly(g, [cx - w / 2, y, cx, y - h, cx + w / 2, y], '#e8b86a');
      poly(g, [cx, y - h, cx + w / 2, y, cx + w * 0.12, y], '#c08a44');
      g.strokeStyle = 'rgba(120,70,20,.25)';
      g.lineWidth = s * 0.2;
      for (let k = 1; k < 10; k++) {
        const yy = y - (h * k) / 10, hw = (w / 2) * (1 - k / 10);
        g.beginPath();
        g.moveTo(cx - hw, yy);
        g.lineTo(cx + hw, yy);
        g.stroke();
      }
    };
    pyr(x + s * 22, s * 26, s * 15);
    pyr(x - s * 14, s * 40, s * 24);
    pyr(x + s * 8, s * 48, s * 30);
  },
  // пятиярусная пагода
  kyoto(g, x, y, s) {
    const wood = '#b83a2a', roof = '#3a3a44', cream = '#f4ecd8';
    rect(g, x - s * 6, y - s * 3, s * 12, s * 3, '#8a7a6a');
    for (let k = 0; k < 5; k++) {
      const by = y - s * 3 - k * s * 8;
      const w = s * (9 - k * 1.1);
      rect(g, x - w / 2, by - s * 6, w, s * 6, k % 2 ? cream : wood);
      rect(g, x - w * 0.15, by - s * 4.6, w * 0.3, s * 4.6, '#5a2a1a');
      const rw = w + s * 7;
      g.beginPath();
      g.moveTo(x - rw / 2 - s * 1, by - s * 6.6);
      g.quadraticCurveTo(x - rw / 2 + s * 1, by - s * 7, x - w / 2, by - s * 8.6);
      g.lineTo(x + w / 2, by - s * 8.6);
      g.quadraticCurveTo(x + rw / 2 - s * 1, by - s * 7, x + rw / 2 + s * 1, by - s * 6.6);
      g.lineTo(x + rw / 2, by - s * 5.6);
      g.lineTo(x - rw / 2, by - s * 5.6);
      g.closePath();
      g.fillStyle = roof;
      g.fill();
      rect(g, x - rw / 2, by - s * 6, rw, s * 0.4, '#5a5a66');
    }
    const top = y - s * 3 - 5 * s * 8;
    rect(g, x - s * 0.3, top - s * 9, s * 0.6, s * 9, '#c89a3a');
    for (let k = 0; k < 6; k++) rect(g, x - s * 1.1, top - s * (2 + k * 1.2), s * 2.2, s * 0.35, '#c89a3a');
    // тории
    const gx = x - s * 22;
    for (const d of [-5, 5]) rect(g, gx + d * s - s * 0.6, y - s * 12, s * 1.2, s * 12, '#d8402a');
    rect(g, gx - s * 6.5, y - s * 10, s * 13, s * 1, '#d8402a');
    g.beginPath();
    g.moveTo(gx - s * 8, y - s * 12.4);
    g.quadraticCurveTo(gx, y - s * 11.4, gx + s * 8, y - s * 12.4);
    g.lineTo(gx + s * 8.4, y - s * 14);
    g.quadraticCurveTo(gx, y - s * 13, gx - s * 8.4, y - s * 14);
    g.closePath();
    g.fillStyle = '#2a2a2a';
    g.fill();
    rect(g, gx - s * 7.6, y - s * 12.6, s * 15.2, s * 0.9, '#d8402a');
  },
  // Сахарная Голова и канатная дорога
  rio(g, x, y, s) {
    const rock = (cx, w, h, c1, c2) => {
      g.beginPath();
      g.moveTo(cx - w / 2, y);
      g.bezierCurveTo(cx - w * 0.45, y - h * 0.7, cx - w * 0.25, y - h, cx, y - h);
      g.bezierCurveTo(cx + w * 0.3, y - h, cx + w * 0.42, y - h * 0.65, cx + w / 2, y);
      g.closePath();
      g.fillStyle = grad(g, cx - w / 2, 0, cx + w / 2, 0, [c1, c2]);
      g.fill();
      // зелень у подножия
      g.beginPath();
      g.moveTo(cx - w / 2, y);
      g.bezierCurveTo(cx - w * 0.42, y - h * 0.45, cx - w * 0.2, y - h * 0.3, cx, y - h * 0.32);
      g.bezierCurveTo(cx + w * 0.2, y - h * 0.3, cx + w * 0.4, y - h * 0.4, cx + w / 2, y);
      g.fillStyle = '#3a8a4a';
      g.fill();
    };
    rock(x - s * 14, s * 20, s * 14, '#8a7a7a', '#5a4a52');
    rock(x + s * 6, s * 22, s * 34, '#9a8a8a', '#5a4a52');
    // канатка
    g.strokeStyle = '#3a3a3a';
    g.lineWidth = s * 0.15;
    g.beginPath();
    g.moveTo(x - s * 14, y - s * 14);
    g.quadraticCurveTo(x - s * 4, y - s * 18, x + s * 4, y - s * 33.5);
    g.stroke();
    const cx = x - s * 6, cy = y - s * 19.6;
    rect(g, cx - s * 0.08, cy, s * 0.16, s * 1, '#3a3a3a');
    rect(g, cx - s * 1.2, cy + s * 1, s * 2.4, s * 1.6, '#e8d040');
    rect(g, cx - s * 0.9, cy + s * 1.3, s * 1.8, s * 0.7, '#5a8ab8');
  },
};

export const CITY_IDS = SCENERY_IDS;
export function drawCity(g,id,W,H,opts={}) { return drawCityArt(g,id,W,H,opts); }
