// Рисованные фоны за полем: закат над столицей, белые ночи, золотая осень, огни порта, зимняя сказка
// Рисуется один раз под размер экрана (canvas -> CSS-фон под прозрачной 3D-сценой).

function rnd(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const lerp = (a, b, k) => a + (b - a) * k;

function grad(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [k, c] of stops) gr.addColorStop(k, c);
  return gr;
}
function glow(g, x, y, r, col, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = a;
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}
// облако: много мягких вытянутых пятен с размытыми краями
function cloud(g, x, y, w, col, r) {
  const m = col.match(/rgba?\(([^)]+)\)/);
  const parts = m ? m[1].split(',').map((v) => v.trim()) : ['255', '255', '255', '0.5'];
  const [cr, cg, cb] = parts;
  const a = parts[3] !== undefined ? +parts[3] : 0.6;
  const n = 9 + Math.floor(r() * 7);
  for (let k = 0; k < n; k++) {
    const u = r() - 0.5;
    const cx = x + u * w;
    const rr = w * (0.1 + r() * 0.12) * (1 - Math.abs(u) * 1.1);
    const cy = y - rr * (0.2 + r() * 0.5);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
    gr.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
    gr.addColorStop(0.55, `rgba(${cr},${cg},${cb},${a * 0.7})`);
    gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    g.fillStyle = gr;
    g.save();
    g.translate(cx, cy);
    g.scale(1.6, 0.75);
    g.translate(-cx, -cy);
    g.beginPath();
    g.arc(cx, cy, rr, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}
function stars(g, W, H, n, r, maxY) {
  for (let k = 0; k < n; k++) {
    const x = r() * W,
      y = r() * maxY;
    const s = r() * 1.6 + 0.4;
    g.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.7})`;
    g.fillRect(x, y, s, s);
    if (r() < 0.04) glow(g, x, y, s * 8, 'rgba(255,255,230,.6)');
  }
}
// луковка
function dome(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x - r, y);
  g.bezierCurveTo(x - r * 1.35, y - r * 1.2, x - r * 0.2, y - r * 1.6, x, y - r * 2.5);
  g.bezierCurveTo(x + r * 0.2, y - r * 1.6, x + r * 1.35, y - r * 1.2, x + r, y);
  g.fill();
}
function rect(g, x, y, w, h, col) {
  g.fillStyle = col;
  g.fillRect(x, y - h, w, h);
}
function tri(g, x, y, w, h, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w / 2, y - h);
  g.lineTo(x + w, y);
  g.fill();
}
function windows(g, x, y, w, h, s, r, on, col = '#ffd27a') {
  for (let yy = y - h + s; yy < y - s; yy += s * 1.8)
    for (let xx = x + s * 0.6; xx < x + w - s; xx += s * 1.6) {
      if (r() < on) {
        g.fillStyle = col;
        g.globalAlpha = 0.5 + r() * 0.5;
        g.fillRect(xx, yy, s * 0.7, s * 0.9);
      }
    }
  g.globalAlpha = 1;
}
// высотка «сталинского» силуэта
function stalin(g, x, y, s, col) {
  rect(g, x - 30 * s, y, 60 * s, 70 * s, col);
  rect(g, x - 20 * s, y - 70 * s, 40 * s, 40 * s, col);
  rect(g, x - 12 * s, y - 110 * s, 24 * s, 34 * s, col);
  tri(g, x - 8 * s, y - 144 * s, 16 * s, 40 * s, col);
  rect(g, x - 1.2 * s, y - 184 * s, 2.4 * s, 26 * s, col);
  rect(g, x - 45 * s, y, 15 * s, 46 * s, col);
  rect(g, x + 30 * s, y, 15 * s, 46 * s, col);
}
function kremlinTower(g, x, y, s, col, star) {
  rect(g, x - 10 * s, y, 20 * s, 60 * s, col);
  rect(g, x - 7 * s, y - 60 * s, 14 * s, 18 * s, col);
  tri(g, x - 8 * s, y - 78 * s, 16 * s, 46 * s, col);
  if (star) {
    glow(g, x, y - 128 * s, 16 * s, 'rgba(255,60,60,.8)');
    g.fillStyle = '#ff5a4a';
    starShape(g, x, y - 128 * s, 5 * s);
  }
}
function starShape(g, x, y, r) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
}
function hills(g, W, y, amp, col, r, steps = 7) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, y + 400);
  g.lineTo(0, y);
  const pts = [];
  for (let k = 0; k <= steps; k++) pts.push([(k / steps) * W, y - r() * amp]);
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k],
      [x1, y1] = pts[k + 1];
    g.quadraticCurveTo(x0 + (x1 - x0) / 2, Math.min(y0, y1) - amp * 0.3, x1, y1);
  }
  g.lineTo(W, y + 400);
  g.fill();
}
// вода с бликами
function water(g, W, y0, y1, top, bot, glints, r, glintCol = 'rgba(255,230,180,.55)', gx = W / 2, gw = W * 0.12) {
  g.fillStyle = grad(g, 0, y0, 0, y1, [[0, top], [1, bot]]);
  g.fillRect(0, y0, W, y1 - y0);
  for (let k = 0; k < glints; k++) {
    const y = y0 + Math.pow(r(), 1.6) * (y1 - y0);
    const near = (y - y0) / (y1 - y0);
    const x = gx + (r() - 0.5) * gw * (1 + near * 3);
    const w = (10 + r() * 40) * (0.5 + near * 2);
    g.fillStyle = glintCol;
    g.globalAlpha = 0.25 + r() * 0.6;
    g.fillRect(x - w / 2, y, w, 1.5 + near * 3);
  }
  g.globalAlpha = 1;
}
function birch(g, x, y, h, leaf, r) {
  g.fillStyle = '#f2efe6';
  g.fillRect(x - h * 0.02, y - h, h * 0.04, h);
  g.fillStyle = '#2d2a26';
  for (let k = 0; k < 8; k++) g.fillRect(x - h * 0.02, y - r() * h, h * 0.02 + r() * h * 0.02, h * 0.008);
  for (let k = 0; k < 26; k++) {
    const a = r() * Math.PI * 2;
    const d = r() * h * 0.26;
    g.fillStyle = leaf[Math.floor(r() * leaf.length)];
    g.beginPath();
    g.ellipse(x + Math.cos(a) * d, y - h * 0.82 + Math.sin(a) * d * 0.9, h * 0.07, h * 0.05, a, 0, Math.PI * 2);
    g.fill();
  }
}
function pine(g, x, y, h, col, snow) {
  g.fillStyle = '#3a2a1e';
  g.fillRect(x - h * 0.03, y - h * 0.15, h * 0.06, h * 0.15);
  for (let k = 0; k < 4; k++) {
    const yy = y - h * 0.12 - k * h * 0.22;
    const w = h * (0.5 - k * 0.1);
    tri(g, x - w / 2, yy, w, h * 0.34, col);
    if (snow) {
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.beginPath();
      g.moveTo(x - w * 0.3, yy - h * 0.1);
      g.lineTo(x, yy - h * 0.34);
      g.lineTo(x + w * 0.3, yy - h * 0.1);
      g.quadraticCurveTo(x, yy - h * 0.18, x - w * 0.3, yy - h * 0.1);
      g.fill();
    }
  }
}

const PAINT = {
  // ---------- летний закат над столицей ----------
  sunset(g, W, H, r) {
    const hz = H * 0.58;
    g.fillStyle = grad(g, 0, 0, 0, hz, [[0, '#28356f'], [0.35, '#6a4f8e'], [0.62, '#e0758a'], [0.85, '#f8a95e'], [1, '#ffd88c']]);
    g.fillRect(0, 0, W, hz);
    stars(g, W, H, 60, r, hz * 0.25);
    const sx = W * 0.68,
      sy = hz - H * 0.05;
    glow(g, sx, sy, H * 0.5, 'rgba(255,190,110,.55)');
    glow(g, sx, sy, H * 0.08, 'rgba(255,240,200,1)');
    g.fillStyle = '#fff2c8';
    g.beginPath();
    g.arc(sx, sy, H * 0.035, 0, Math.PI * 2);
    g.fill();
    for (let k = 0; k < 7; k++) cloud(g, r() * W, hz * (0.15 + r() * 0.5), W * (0.12 + r() * 0.16), `rgba(255,${150 + r() * 60},${150 + r() * 40},${0.25 + r() * 0.25})`, r);
    // дальний слой: высотки и телебашня
    const far = '#7a5a86';
    for (let x = 0; x < W; x += 30 + r() * 40) rect(g, x, hz, 26 + r() * 30, 20 + r() * 50, far);
    stalin(g, W * 0.18, hz, H / 900, far);
    stalin(g, W * 0.86, hz, H / 1100, far);
    // телебашня
    const tx = W * 0.94;
    rect(g, tx - 3, hz, 6, H * 0.3, far);
    tri(g, tx - 18, hz, 36, H * 0.12, far);
    rect(g, tx - 8, hz - H * 0.2, 16, 8, far);
    // ближний слой: Кремль, собор с луковками
    const near = '#4a2f4c';
    rect(g, W * 0.22, hz, W * 0.38, H * 0.035, near);
    for (let x = W * 0.22; x < W * 0.6; x += 10) {
      g.fillStyle = near;
      g.beginPath();
      g.moveTo(x, hz - H * 0.035);
      g.lineTo(x + 3, hz - H * 0.045);
      g.lineTo(x + 6, hz - H * 0.035);
      g.fill();
    }
    const s = H / 700;
    kremlinTower(g, W * 0.3, hz, s * 0.8, near, true);
    kremlinTower(g, W * 0.46, hz, s * 1.05, near, true);
    kremlinTower(g, W * 0.58, hz, s * 0.75, near, true);
    // собор
    const cx = W * 0.38;
    rect(g, cx - 40 * s, hz, 80 * s, 36 * s, near);
    for (const [dx, dh, rr] of [[0, 80, 14], [-28, 52, 10], [28, 52, 10], [-16, 64, 9], [16, 64, 9]]) {
      rect(g, cx + dx * s - rr * 0.6 * s, hz - 30 * s, rr * 1.2 * s, (dh - 30) * s, near);
      dome(g, cx + dx * s, hz - dh * s, rr * s, ['#c9443a', '#3a8a5a', '#d8a838', '#3a6ab8', '#c9443a'][Math.abs(dx) % 5]);
    }
    for (let k = 0; k < 40; k++) glow(g, W * 0.22 + r() * W * 0.4, hz - r() * H * 0.03, 4, 'rgba(255,220,140,.9)');
    // река
    water(g, W, hz, H, '#d98a7e', '#2c2d5a', 220, r, 'rgba(255,220,160,.8)', sx, W * 0.06);
    // набережная
    const ey = H * 0.86;
    g.fillStyle = grad(g, 0, ey, 0, H, [[0, '#6b5a5a'], [1, '#3a2e33']]);
    g.fillRect(0, ey, W, H - ey);
    g.fillStyle = '#857070';
    g.fillRect(0, ey, W, H * 0.012);
    for (let x = W * 0.06; x < W; x += W * 0.18) {
      rect(g, x - 2, ey, 4, H * 0.1, '#2a2228');
      glow(g, x, ey - H * 0.105, H * 0.04, 'rgba(255,210,130,.9)');
      g.fillStyle = '#ffe0a0';
      g.beginPath();
      g.arc(x, ey - H * 0.105, H * 0.008, 0, Math.PI * 2);
      g.fill();
    }
  },

  // ---------- белые ночи ----------
  nights(g, W, H, r) {
    const hz = H * 0.6;
    g.fillStyle = grad(g, 0, 0, 0, hz, [[0, '#7d86b8'], [0.45, '#c8a4c6'], [0.8, '#f3c4b4'], [1, '#fbe0c0']]);
    g.fillRect(0, 0, W, hz);
    for (let k = 0; k < 6; k++) cloud(g, r() * W, hz * (0.2 + r() * 0.5), W * (0.15 + r() * 0.2), `rgba(255,${200 + r() * 40},${210 + r() * 30},.35)`, r);
    glow(g, W * 0.3, hz, H * 0.4, 'rgba(255,220,200,.5)');
    const far = '#8a7a9e',
      near = '#4c4466';
    const s = H / 700;
    // дальний берег: дома, Исаакий, Адмиралтейство
    for (let x = 0; x < W; x += 24 + r() * 30) rect(g, x, hz, 22 + r() * 30, 18 + r() * 22, far);
    const ix = W * 0.25;
    rect(g, ix - 50 * s, hz, 100 * s, 40 * s, far);
    rect(g, ix - 24 * s, hz - 40 * s, 48 * s, 20 * s, far);
    g.fillStyle = far;
    g.beginPath();
    g.ellipse(ix, hz - 60 * s, 26 * s, 26 * s, 0, Math.PI, 0);
    g.fill();
    rect(g, ix - 3 * s, hz - 86 * s, 6 * s, 14 * s, far);
    // шпиль крепости
    const px = W * 0.62;
    rect(g, px - 50 * s, hz, 140 * s, 22 * s, near);
    rect(g, px - 12 * s, hz - 22 * s, 24 * s, 40 * s, near);
    tri(g, px - 9 * s, hz - 62 * s, 18 * s, 30 * s, near);
    tri(g, px - 3 * s, hz - 92 * s, 6 * s, 150 * s, near);
    glow(g, px, hz - 200 * s, 30 * s, 'rgba(255,230,160,.6)');
    g.fillStyle = '#ffe2a0';
    g.fillRect(px - 1.5 * s, hz - 240 * s, 3 * s, 60 * s);
    // разведённый мост
    const bx = W * 0.85,
      by = hz + H * 0.02;
    rect(g, bx - 120 * s, by, 240 * s, 6 * s, near);
    g.fillStyle = near;
    for (const sgn of [-1, 1]) {
      g.save();
      g.translate(bx + sgn * 10 * s, by - 6 * s);
      g.rotate(sgn * -1.0);
      g.fillRect(sgn > 0 ? 0 : -90 * s, -6 * s, 90 * s, 8 * s);
      for (let k = 0; k < 6; k++) g.fillRect((sgn > 0 ? 6 : -84) * s + k * 14 * s, -6 * s, 2 * s, -14 * s);
      g.restore();
    }
    for (const x of [bx - 120 * s, bx + 120 * s]) {
      glow(g, x, by - 14 * s, 14 * s, 'rgba(255,220,140,.8)');
    }
    // Нева
    water(g, W, hz, H, '#e7bcc0', '#5a5a86', 260, r, 'rgba(255,240,230,.7)', W * 0.3, W * 0.2);
    // гранитный парапет
    const ey = H * 0.88;
    g.fillStyle = grad(g, 0, ey, 0, H, [[0, '#8a7a84'], [1, '#4a3e4a']]);
    g.fillRect(0, ey, W, H - ey);
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(0, ey, W, 3);
    for (let x = 0; x < W; x += W * 0.09) g.fillRect(x, ey, 2, H - ey);
  },

  // ---------- золотая осень ----------
  autumn(g, W, H, r) {
    const hz = H * 0.56;
    g.fillStyle = grad(g, 0, 0, 0, hz, [[0, '#3f88d0'], [0.6, '#8cc4ec'], [1, '#e7f2f4']]);
    g.fillRect(0, 0, W, hz);
    for (let k = 0; k < 8; k++) cloud(g, r() * W, hz * (0.15 + r() * 0.55), W * (0.1 + r() * 0.14), `rgba(255,255,255,${0.6 + r() * 0.3})`, r);
    hills(g, W, hz, H * 0.04, '#9bb3a6', r);
    // белый кремль на холме с золотыми куполами
    const s = H / 700;
    const kx = W * 0.6;
    g.fillStyle = '#b4a35a';
    g.beginPath();
    g.ellipse(kx, hz + 10, W * 0.2, H * 0.06, 0, Math.PI, 0);
    g.fill();
    const wall = '#f2ede2';
    rect(g, kx - 90 * s, hz - 20 * s, 180 * s, 18 * s, wall);
    for (const dx of [-90, -30, 30, 90]) {
      rect(g, kx + dx * s - 8 * s, hz - 20 * s, 16 * s, 34 * s, wall);
      tri(g, kx + dx * s - 9 * s, hz - 54 * s, 18 * s, 18 * s, '#5a7a5a');
    }
    rect(g, kx - 26 * s, hz - 38 * s, 52 * s, 40 * s, wall);
    for (const [dx, h, rr] of [[0, 96, 13], [-18, 74, 8], [18, 74, 8]]) {
      rect(g, kx + dx * s - rr * 0.6 * s, hz - 78 * s, rr * 1.2 * s, (h - 78 + 14) * s, wall);
      dome(g, kx + dx * s, hz - h * s, rr * s, '#e5b433');
      glow(g, kx + dx * s, hz - (h + rr * 1.2) * s, rr * 2 * s, 'rgba(255,240,180,.7)');
    }
    // поля и река
    g.fillStyle = grad(g, 0, hz, 0, H, [[0, '#c9a24a'], [0.5, '#a4762e'], [1, '#6b4a22']]);
    g.fillRect(0, hz, W, H - hz);
    for (let k = 0; k < 6; k++) {
      g.fillStyle = `rgba(${150 + r() * 80},${100 + r() * 60},40,.35)`;
      g.beginPath();
      g.ellipse(r() * W, hz + H * 0.03 + r() * H * 0.08, W * (0.1 + r() * 0.2), H * 0.02, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = grad(g, 0, hz + H * 0.08, 0, H * 0.8, [[0, '#9cc6e0'], [1, '#4b7ea0']]);
    g.beginPath();
    g.moveTo(0, hz + H * 0.14);
    g.bezierCurveTo(W * 0.3, hz + H * 0.08, W * 0.6, hz + H * 0.22, W, hz + H * 0.12);
    g.lineTo(W, hz + H * 0.2);
    g.bezierCurveTo(W * 0.6, hz + H * 0.3, W * 0.3, hz + H * 0.16, 0, hz + H * 0.24);
    g.fill();
    // берёзы на переднем плане
    const leaf = ['#f2c230', '#e8a020', '#f6d860', '#d8781e', '#c8a020'];
    for (let k = 0; k < 7; k++) birch(g, W * (k < 4 ? 0.02 + k * 0.07 : 0.78 + (k - 4) * 0.08) + r() * 20, H * (0.94 + r() * 0.06), H * (0.42 + r() * 0.25), leaf, r);
    // опавшие листья
    for (let k = 0; k < 160; k++) {
      g.fillStyle = leaf[Math.floor(r() * leaf.length)];
      g.globalAlpha = 0.8;
      g.beginPath();
      g.ellipse(r() * W, H * (0.8 + r() * 0.2), 5, 2.5, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  },

  // ---------- огни порта (Владивосток) ----------
  port(g, W, H, r) {
    const hz = H * 0.6;
    g.fillStyle = grad(g, 0, 0, 0, hz, [[0, '#0b1230'], [0.6, '#1f2b5e'], [1, '#3e4d86']]);
    g.fillRect(0, 0, W, hz);
    stars(g, W, H, 260, r, hz * 0.8);
    glow(g, W * 0.15, H * 0.14, H * 0.12, 'rgba(220,230,255,.5)');
    g.fillStyle = '#f2f0e0';
    g.beginPath();
    g.arc(W * 0.15, H * 0.14, H * 0.03, 0, Math.PI * 2);
    g.fill();
    // сопки с огнями города
    hills(g, W, hz, H * 0.1, '#1a2244', r, 6);
    for (let k = 0; k < 500; k++) {
      const x = r() * W,
        y = hz - r() * H * 0.08;
      g.fillStyle = r() < 0.7 ? '#ffd27a' : '#bfe0ff';
      g.globalAlpha = 0.4 + r() * 0.6;
      g.fillRect(x, y, 2, 2);
    }
    g.globalAlpha = 1;
    // вантовый мост
    const s = H / 700;
    const deckY = hz - 30 * s;
    g.fillStyle = '#0f1530';
    g.fillRect(0, deckY, W, 7 * s);
    for (const px of [W * 0.32, W * 0.72]) {
      g.fillStyle = '#0f1530';
      g.beginPath();
      g.moveTo(px - 16 * s, hz + 10);
      g.lineTo(px - 3 * s, deckY - 150 * s);
      g.lineTo(px + 3 * s, deckY - 150 * s);
      g.lineTo(px + 16 * s, hz + 10);
      g.lineTo(px + 8 * s, hz + 10);
      g.lineTo(px, deckY - 60 * s);
      g.lineTo(px - 8 * s, hz + 10);
      g.fill();
      g.strokeStyle = 'rgba(190,210,255,.55)';
      g.lineWidth = 1;
      for (let k = 1; k <= 12; k++) {
        g.beginPath();
        g.moveTo(px, deckY - 148 * s + k * 5 * s);
        g.lineTo(px - k * 16 * s, deckY);
        g.moveTo(px, deckY - 148 * s + k * 5 * s);
        g.lineTo(px + k * 16 * s, deckY);
        g.stroke();
      }
      glow(g, px, deckY - 152 * s, 12 * s, 'rgba(255,80,80,.9)');
    }
    for (let x = 0; x < W; x += 14 * s) glow(g, x, deckY + 2, 5 * s, 'rgba(255,220,150,.9)');
    // море
    water(g, W, hz, H, '#24305e', '#070b1e', 420, r, 'rgba(255,210,140,.8)', W * 0.5, W * 0.5);
    // кораблики
    for (const [x, y, k] of [[W * 0.2, hz + H * 0.08, 1], [W * 0.8, hz + H * 0.14, 1.4]]) {
      g.fillStyle = '#0a0f24';
      g.beginPath();
      g.moveTo(x - 50 * s * k, y);
      g.lineTo(x + 50 * s * k, y);
      g.lineTo(x + 40 * s * k, y + 12 * s * k);
      g.lineTo(x - 44 * s * k, y + 12 * s * k);
      g.fill();
      rect(g, x - 20 * s * k, y, 34 * s * k, 14 * s * k, '#0a0f24');
      for (let q = 0; q < 5; q++) glow(g, x - 16 * s * k + q * 7 * s * k, y - 6 * s * k, 4 * s * k, 'rgba(255,230,160,.9)');
    }
  },

  // ---------- зимняя сказка ----------
  winter(g, W, H, r) {
    const hz = H * 0.6;
    g.fillStyle = grad(g, 0, 0, 0, hz, [[0, '#0d1838'], [0.55, '#23407a'], [1, '#5a7ab8']]);
    g.fillRect(0, 0, W, hz);
    stars(g, W, H, 220, r, hz * 0.7);
    // северное сияние
    for (let b = 0; b < 3; b++) {
      const y0 = H * (0.12 + b * 0.07);
      for (let x = 0; x < W; x += 3) {
        const y = y0 + Math.sin(x * 0.004 + b * 2) * H * 0.04 + Math.sin(x * 0.011 + b) * H * 0.015;
        const gr = g.createLinearGradient(0, y - H * 0.12, 0, y);
        gr.addColorStop(0, 'rgba(80,255,170,0)');
        gr.addColorStop(1, b === 1 ? 'rgba(140,120,255,.18)' : 'rgba(80,255,170,.2)');
        g.fillStyle = gr;
        g.fillRect(x, y - H * 0.12, 3, H * 0.12);
      }
    }
    hills(g, W, hz, H * 0.06, '#c4d4ee', r);
    hills(g, W, hz + H * 0.04, H * 0.05, '#e4ecf8', r, 5);
    const s = H / 700;
    // деревянная церковь
    const cx = W * 0.5;
    const wood = '#3a2a3a';
    rect(g, cx - 30 * s, hz + 20 * s, 60 * s, 46 * s, wood);
    tri(g, cx - 36 * s, hz - 26 * s, 72 * s, 26 * s, '#f4f8ff');
    rect(g, cx - 10 * s, hz - 26 * s, 20 * s, 40 * s, wood);
    dome(g, cx, hz - 66 * s, 13 * s, '#d8a838');
    rect(g, cx - 1 * s, hz - 108 * s, 2 * s, 12 * s, '#d8a838');
    for (const dx of [-14, 14]) glow(g, cx + dx * s, hz + 6 * s, 10 * s, 'rgba(255,200,110,.9)');
    // избушки
    for (const [x, k] of [[W * 0.22, 1], [W * 0.34, 0.8], [W * 0.68, 0.9], [W * 0.8, 1.1]]) {
      const y = hz + H * 0.05;
      rect(g, x - 26 * s * k, y, 52 * s * k, 30 * s * k, wood);
      tri(g, x - 32 * s * k, y - 30 * s * k, 64 * s * k, 28 * s * k, '#f4f8ff');
      glow(g, x, y - 14 * s * k, 16 * s * k, 'rgba(255,190,100,.9)');
      g.fillStyle = '#ffd890';
      g.fillRect(x - 6 * s * k, y - 20 * s * k, 12 * s * k, 10 * s * k);
      rect(g, x + 12 * s * k, y - 44 * s * k, 6 * s * k, 16 * s * k, wood);
    }
    // снежное поле
    g.fillStyle = grad(g, 0, hz + H * 0.06, 0, H, [[0, '#dfe8f6'], [1, '#9fb4d6']]);
    g.fillRect(0, hz + H * 0.06, W, H);
    for (let k = 0; k < 10; k++) pine(g, k < 5 ? r() * W * 0.18 : W * 0.82 + r() * W * 0.18, H * (0.86 + r() * 0.14), H * (0.25 + r() * 0.2), '#1d3a3a', true);
    for (let k = 0; k < 6; k++) pine(g, r() * W, hz + H * 0.06, H * (0.06 + r() * 0.04), '#2a4a50', true);
    // снегопад
    for (let k = 0; k < 400; k++) {
      g.fillStyle = 'rgba(255,255,255,' + (0.4 + r() * 0.6) + ')';
      g.beginPath();
      g.arc(r() * W, r() * H, 0.6 + r() * 2.2, 0, Math.PI * 2);
      g.fill();
    }
  },
};

export function paintBackground(place, w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  const g = c.getContext('2d');
  (PAINT[place] || PAINT.sunset)(g, c.width, c.height, rnd(place.length * 977 + 13));
  // лёгкая виньетка, чтобы поле читалось
  const gr = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.3, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = gr;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
export const BG_IDS = Object.keys(PAINT);
