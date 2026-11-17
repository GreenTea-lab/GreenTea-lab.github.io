// Процедурные текстуры на canvas: древесина, игровое поле с пунктами, орнаменты, ковёр, стена чайханы, кубики, шашки
const hex = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export function shade(c, k) {
  const a = hex(c);
  const t = k > 0 ? [255, 255, 255] : [0, 0, 0];
  return rgb(mix(a, t, Math.abs(k)));
}

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// значение шума на решётке
function makeNoise(seed) {
  const R = rng(seed);
  const N = 256;
  const perm = new Uint8Array(N * 2);
  const val = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    perm[i] = i;
    val[i] = R();
  }
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < N; i++) perm[N + i] = perm[i];
  const sm = (t) => t * t * (3 - 2 * t);
  const g = (x, y) => val[perm[(perm[x & 255] + y) & 255]];
  const n2 = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = sm(x - xi);
    const yf = sm(y - yi);
    const a = g(xi, yi);
    const b = g(xi + 1, yi);
    const c = g(xi, yi + 1);
    const d = g(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  n2.fbm = (x, y, o = 4) => {
    let s = 0;
    let a = 0.5;
    let f = 1;
    for (let i = 0; i < o; i++) {
      s += a * n2(x * f, y * f);
      f *= 2;
      a *= 0.5;
    }
    return s;
  };
  return n2;
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// древесина: волокна вдоль X. cols = [основа, тёмный, светлый]
export function woodInto(ctx, x0, y0, w, h, cols, seed = 1, opt = {}) {
  const N = makeNoise(seed);
  const base = hex(cols[0]);
  const dark = hex(cols[1]);
  const light = hex(cols[2]);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const sx = opt.sx ?? 0.004;
  const sy = opt.sy ?? 0.03;
  const rings = opt.rings ?? 9;
  const vert = !!opt.vertical;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const x = vert ? j : i;
      const y = vert ? i : j;
      const warp = N.fbm(x * sx, y * sy * 0.6, 3);
      const g = Math.sin((y * sy + warp * rings) * Math.PI);
      const fine = N(x * 0.05, y * 0.9) * 0.5 + N(x * 0.012, y * 0.35) * 0.5;
      let t = 0.5 + g * 0.28 + (fine - 0.5) * 0.5;
      let c = t < 0.5 ? mix(dark, base, t * 2) : mix(base, light, (t - 0.5) * 2 * 0.7);
      // тёмные поры
      if (fine > 0.8) c = mix(c, dark, (fine - 0.8) * 1.5);
      const k = (j * w + i) * 4;
      d[k] = c[0];
      d[k + 1] = c[1];
      d[k + 2] = c[2];
      d[k + 3] = 255;
    }
  ctx.putImageData(img, x0, y0);
}

export function woodCanvas(w, h, cols, seed, opt) {
  const c = canvas(w, h);
  woodInto(c.getContext('2d'), 0, 0, w, h, cols, seed, opt);
  return c;
}

// фетр/сукно
function feltInto(ctx, w, h, cols, seed) {
  const N = makeNoise(seed);
  const base = hex(cols[0]);
  const dark = hex(cols[1]);
  const light = hex(cols[2]);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const R = rng(seed + 7);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const n = N.fbm(i * 0.01, j * 0.01, 3);
      const t = n + (R() - 0.5) * 0.12;
      const c = t < 0.5 ? mix(dark, base, Math.max(0, t * 2)) : mix(base, light, Math.min(1, (t - 0.5) * 1.2));
      const k = (j * w + i) * 4;
      d[k] = c[0];
      d[k + 1] = c[1];
      d[k + 2] = c[2];
      d[k + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
}

// ---------- орнаменты ----------
// бута (капля-пейсли)
function buta(ctx, x, y, s, rot, fill, line) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.bezierCurveTo(0.9, -0.6, 0.9, 0.6, 0, 0.9);
  ctx.bezierCurveTo(-0.7, 0.9, -0.7, 0.1, -0.15, 0.05);
  ctx.bezierCurveTo(0.2, 0, 0.25, -0.5, 0, -1);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 0.09;
  ctx.strokeStyle = line;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.18, 0.35, 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
// розетка-звезда
export function rosette(ctx, x, y, r, n, fill, line, lw = 2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.55 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = line;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
function diamond(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x - w, y);
  ctx.closePath();
}

// ---------- игровое поле ----------
// Поле: x от -6.45 до 6.45, z от -5.1 до 5.1 (мир). Пункты: ширина 1, длина 4.5.
export const FIELD = { w: 12.9, h: 10.2, pt: 4.5 };
export function fieldCanvas(S, px = 150) {
  const W = Math.round(FIELD.w * px);
  const H = Math.round(FIELD.h * px);
  const c = canvas(W, H);
  const g = c.getContext('2d');
  if (S.felt) feltInto(g, W, H, S.field, 11);
  else woodInto(g, 0, 0, W, H, S.field, 5, { sx: 0.0025, sy: 0.012, rings: 6 });
  const X = (x) => (x + FIELD.w / 2) * px;
  const Z = (z) => (z + FIELD.h / 2) * px;
  // мягкая виньетка по краям поля
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,20,5,0.28)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  // рамка-инкрустация каждой половины
  for (const sgn of [-1, 1]) {
    const x0 = sgn < 0 ? X(-6.45) : X(0.45);
    const x1 = sgn < 0 ? X(-0.45) : X(6.45);
    g.strokeStyle = S.line;
    g.lineWidth = 0.035 * px;
    g.strokeRect(x0 + 0.08 * px, Z(-5.1) + 0.08 * px, x1 - x0 - 0.16 * px, H - 0.16 * px);
    g.lineWidth = 0.012 * px;
    g.strokeRect(x0 + 0.15 * px, Z(-5.1) + 0.15 * px, x1 - x0 - 0.3 * px, H - 0.3 * px);
  }
  // пункты
  const L = FIELD.pt * px;
  for (let a = 0; a < 24; a++) {
    const p = pointXZ(a);
    const top = a >= 12;
    const cx = X(p.x);
    const zb = top ? Z(-5.1) + 0.18 * px : Z(5.1) - 0.18 * px; // основание
    const dir = top ? 1 : -1;
    const hw = 0.47 * px;
    const col = a % 2 === 0 ? S.pA : S.pB;
    const tip = zb + dir * (L - 0.2 * px);
    // тень пункта
    g.save();
    g.shadowColor = 'rgba(0,0,0,.35)';
    g.shadowBlur = 0.06 * px;
    g.shadowOffsetY = 0.02 * px;
    g.beginPath();
    g.moveTo(cx - hw, zb);
    g.quadraticCurveTo(cx - hw * 0.55, zb + dir * L * 0.55, cx, tip);
    g.quadraticCurveTo(cx + hw * 0.55, zb + dir * L * 0.55, cx + hw, zb);
    g.closePath();
    const gr = g.createLinearGradient(0, zb, 0, tip);
    gr.addColorStop(0, shade(col, 0.08));
    gr.addColorStop(1, shade(col, -0.18));
    g.fillStyle = gr;
    g.fill();
    g.restore();
    // золотой контур
    g.lineWidth = 0.025 * px;
    g.strokeStyle = S.line;
    g.stroke();
    // внутренняя каёмка
    g.beginPath();
    const ih = hw * 0.68;
    g.moveTo(cx - ih, zb + dir * 0.12 * px);
    g.quadraticCurveTo(cx - ih * 0.55, zb + dir * L * 0.5, cx, tip - dir * 0.4 * px);
    g.quadraticCurveTo(cx + ih * 0.55, zb + dir * L * 0.5, cx + ih, zb + dir * 0.12 * px);
    g.lineWidth = 0.012 * px;
    g.strokeStyle = shade(S.line, -0.1);
    g.globalAlpha = 0.8;
    g.stroke();
    g.globalAlpha = 1;
    // ромбик у основания и капля у острия
    g.fillStyle = S.line;
    diamond(g, cx, zb + dir * 0.32 * px, 0.11 * px, 0.16 * px);
    g.fill();
    g.beginPath();
    g.arc(cx, tip - dir * 0.18 * px, 0.045 * px, 0, Math.PI * 2);
    g.fill();
  }
  // центральные медальоны между рядами
  for (const sgn of [-1, 1]) {
    const cx = X(sgn * 3.45);
    const cy = Z(0);
    g.save();
    g.globalAlpha = 0.9;
    g.strokeStyle = S.line;
    g.fillStyle = S.orn;
    // вытянутый ромб-медальон
    diamond(g, cx, cy, 1.9 * px, 0.42 * px);
    g.lineWidth = 0.03 * px;
    g.globalAlpha = 0.55;
    g.fill();
    g.globalAlpha = 0.95;
    g.stroke();
    diamond(g, cx, cy, 1.6 * px, 0.3 * px);
    g.lineWidth = 0.012 * px;
    g.stroke();
    rosette(g, cx, cy, 0.24 * px, 8, S.inlay, S.line, 0.015 * px);
    for (const s2 of [-1, 1]) {
      buta(g, cx + s2 * 0.85 * px, cy, 0.17 * px, s2 * Math.PI / 2, S.inlay, S.line);
      g.fillStyle = S.line;
      diamond(g, cx + s2 * 1.45 * px, cy, 0.09 * px, 0.06 * px);
      g.fill();
      g.fillStyle = S.orn;
    }
    g.restore();
  }
  return c;
}

// центр основания пункта a (абсолютный индекс) в мировых координатах
export function pointXZ(a) {
  if (a < 6) return { x: 5.95 - a, z: 5.1, top: false };
  if (a < 12) return { x: -0.95 - (a - 6), z: 5.1, top: false };
  if (a < 18) return { x: -5.95 + (a - 12), z: -5.1, top: true };
  return { x: 0.95 + (a - 18), z: -5.1, top: true };
}

// полоса орнамента для рамки (повторяется по длине)
export function stripCanvas(S, w = 512, h = 64) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  woodInto(g, 0, 0, w, h, S.frame, 3, { sx: 0.01, sy: 0.08 });
  g.strokeStyle = S.inlay;
  g.fillStyle = S.inlay;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 8);
  g.lineTo(w, 8);
  g.moveTo(0, h - 8);
  g.lineTo(w, h - 8);
  g.stroke();
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * (w / n);
    diamond(g, x, h / 2, w / n / 2 - 4, h / 2 - 16);
    g.lineWidth = 2.5;
    g.stroke();
    g.beginPath();
    g.arc(x, h / 2, 5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(i * (w / n), h / 2, 3, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// верх шашки: кольца гравировки и розетка
export function checkerTopCanvas(cols, size = 256, sheen = false) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  const r = size / 2;
  const grd = g.createRadialGradient(r * 0.75, r * 0.7, r * 0.1, r, r, r);
  grd.addColorStop(0, shade(cols[0], 0.1));
  grd.addColorStop(0.7, cols[0]);
  grd.addColorStop(1, shade(cols[0], -0.12));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  if (sheen) {
    const sh = g.createLinearGradient(0, 0, size, size);
    sh.addColorStop(0, 'rgba(255,220,240,.25)');
    sh.addColorStop(0.5, 'rgba(200,240,255,.0)');
    sh.addColorStop(1, 'rgba(220,255,230,.25)');
    g.fillStyle = sh;
    g.fillRect(0, 0, size, size);
  }
  const ring = (rr, w, col, a = 1) => {
    g.beginPath();
    g.arc(r, r, rr, 0, Math.PI * 2);
    g.lineWidth = w;
    g.strokeStyle = col;
    g.globalAlpha = a;
    g.stroke();
    g.globalAlpha = 1;
  };
  ring(r * 0.86, size * 0.025, cols[1], 0.9);
  ring(r * 0.8, size * 0.012, cols[2], 0.8);
  ring(r * 0.52, size * 0.018, cols[1], 0.85);
  rosette(g, r, r, r * 0.38, 8, null, cols[1], size * 0.016);
  g.globalAlpha = 0.5;
  rosette(g, r + 1.5, r + 1.5, r * 0.38, 8, null, cols[2], size * 0.008);
  g.globalAlpha = 1;
  return c;
}

// грань кубика
export function diceFaceCanvas(v, D, size = 128) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size * 0.4, size * 0.35, size * 0.1, size / 2, size / 2, size * 0.75);
  grd.addColorStop(0, shade(D.body, 0.12));
  grd.addColorStop(1, shade(D.body, -0.08));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const P = {
    1: [[0.5, 0.5]],
    2: [[0.27, 0.27], [0.73, 0.73]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.27, 0.23], [0.73, 0.23], [0.27, 0.5], [0.73, 0.5], [0.27, 0.77], [0.73, 0.77]],
  }[v];
  const pr = size * (v === 1 ? 0.12 : 0.085);
  for (const [x, y] of P) {
    // углублённая точка: светлый ободок снизу, тёмная тень сверху
    g.beginPath();
    g.arc(x * size, y * size + 1.5, pr + 1.5, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fill();
    g.beginPath();
    g.arc(x * size, y * size, pr, 0, Math.PI * 2);
    const pg = g.createRadialGradient(x * size - pr * 0.3, y * size - pr * 0.4, pr * 0.1, x * size, y * size, pr);
    pg.addColorStop(0, shade(D.pip, -0.25));
    pg.addColorStop(1, D.pip);
    g.fillStyle = v === 1 && D.id === 'bone' ? '#9e1b25' : pg;
    g.fill();
  }
  return c;
}

// ковёр-дорожка под доской
export function carpetCanvas(w = 1024, h = 768) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const R = rng(77);
  g.fillStyle = '#7d1e22';
  g.fillRect(0, 0, w, h);
  // ворс
  for (let i = 0; i < 26000; i++) {
    g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,.06)' : 'rgba(255,200,170,.05)';
    g.fillRect(R() * w, R() * h, 2, 2);
  }
  const bands = [
    [0, '#2d1a3a'],
    [26, '#d9a441'],
    [34, '#1f4f5c'],
    [70, '#d9a441'],
    [76, '#7d1e22'],
  ];
  for (const [o, col] of bands) {
    g.fillStyle = col;
    g.fillRect(o, o, w - o * 2, h - o * 2);
  }
  // кайма с ромбами
  g.fillStyle = '#f0d9a0';
  for (let x = 52; x < w - 40; x += 36) {
    diamond(g, x, 52, 10, 12);
    g.fill();
    diamond(g, x, h - 52, 10, 12);
    g.fill();
  }
  for (let y = 88; y < h - 60; y += 36) {
    diamond(g, 52, y, 12, 10);
    g.fill();
    diamond(g, w - 52, y, 12, 10);
    g.fill();
  }
  // центральное поле: сетка медальонов
  g.fillStyle = '#8f2428';
  g.fillRect(80, 80, w - 160, h - 160);
  for (let y = 130; y < h - 100; y += 110)
    for (let x = 140; x < w - 100; x += 130) {
      const off = (Math.round((y - 130) / 110) % 2) * 65;
      const cx = x + off;
      if (cx > w - 110) continue;
      g.fillStyle = '#1f4f5c';
      diamond(g, cx, y, 46, 40);
      g.fill();
      g.strokeStyle = '#e3b453';
      g.lineWidth = 4;
      g.stroke();
      rosette(g, cx, y, 20, 8, '#e3b453', '#2d1a3a', 2);
    }
  // большой центральный медальон
  g.fillStyle = '#2d1a3a';
  diamond(g, w / 2, h / 2, 240, 170);
  g.fill();
  g.strokeStyle = '#e3b453';
  g.lineWidth = 6;
  g.stroke();
  g.fillStyle = '#b8343a';
  diamond(g, w / 2, h / 2, 190, 128);
  g.fill();
  rosette(g, w / 2, h / 2, 70, 12, '#e3b453', '#2d1a3a', 4);
  return c;
}

// стена чайханы с арками и вечерним небом (задний план)
export function wallCanvas(w = 2048, h = 1024) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const R = rng(5);
  // штукатурка
  const pl = g.createLinearGradient(0, 0, 0, h);
  pl.addColorStop(0, '#c99a6a');
  pl.addColorStop(1, '#a8754a');
  g.fillStyle = pl;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = R() < 0.5 ? 'rgba(80,40,10,.05)' : 'rgba(255,230,190,.05)';
    g.fillRect(R() * w, R() * h, 3 + R() * 4, 3 + R() * 4);
  }
  const arches = 4;
  const aw = w / arches;
  for (let i = 0; i < arches; i++) {
    const cx = aw * (i + 0.5);
    const top = h * 0.12;
    const bot = h * 0.78;
    const hw = aw * 0.34;
    const path = () => {
      g.beginPath();
      g.moveTo(cx - hw, bot);
      g.lineTo(cx - hw, top + hw * 0.9);
      g.quadraticCurveTo(cx - hw, top + hw * 0.1, cx, top);
      g.quadraticCurveTo(cx + hw, top + hw * 0.1, cx + hw, top + hw * 0.9);
      g.lineTo(cx + hw, bot);
      g.closePath();
    };
    // небо заката
    g.save();
    path();
    g.clip();
    const sky = g.createLinearGradient(0, top, 0, bot);
    sky.addColorStop(0, '#3b2f6b');
    sky.addColorStop(0.45, '#c8577a');
    sky.addColorStop(0.75, '#f5a35a');
    sky.addColorStop(1, '#ffd88a');
    g.fillStyle = sky;
    g.fillRect(cx - hw, top, hw * 2, bot - top);
    // звёзды
    for (let k = 0; k < 14; k++) {
      g.fillStyle = 'rgba(255,240,220,' + (0.4 + R() * 0.5) + ')';
      g.fillRect(cx - hw + R() * hw * 2, top + R() * (bot - top) * 0.3, 2, 2);
    }
    // силуэты кипарисов и куполов
    g.fillStyle = '#3a1f2e';
    const base = bot - (bot - top) * 0.12;
    for (let k = 0; k < 4; k++) {
      const tx = cx - hw + (k + 0.3 + R() * 0.4) * (hw / 2);
      const th = (bot - top) * (0.22 + R() * 0.16);
      g.beginPath();
      g.moveTo(tx - 12, base + 20);
      g.quadraticCurveTo(tx - 14, base - th * 0.5, tx, base - th);
      g.quadraticCurveTo(tx + 14, base - th * 0.5, tx + 12, base + 20);
      g.fill();
    }
    if (i % 2 === 0) {
      const dx = cx + hw * 0.25;
      g.beginPath();
      g.arc(dx, base - 40, 46, Math.PI, 0);
      g.fill();
      g.fillRect(dx - 52, base - 40, 104, 70);
      g.fillRect(dx - 3, base - 110, 6, 30);
    }
    g.fillRect(cx - hw, base, hw * 2, bot - base);
    g.restore();
    // решётка-машрабия в верхней части арки
    g.save();
    path();
    g.clip();
    g.strokeStyle = 'rgba(60,30,15,.85)';
    g.lineWidth = 4;
    for (let y = top; y < top + hw * 0.9; y += 26)
      for (let x = cx - hw; x < cx + hw; x += 26) {
        diamond(g, x + ((y / 26) % 2) * 13, y, 13, 13);
        g.stroke();
      }
    g.restore();
    // наличник арки
    path();
    g.lineWidth = 22;
    g.strokeStyle = '#6b3a1e';
    g.stroke();
    g.lineWidth = 6;
    g.strokeStyle = '#d9a64a';
    g.stroke();
  }
  // изразцовый пояс внизу
  const ty = h * 0.82;
  g.fillStyle = '#1d5c6b';
  g.fillRect(0, ty, w, h - ty);
  for (let x = 0; x < w; x += 64) {
    g.fillStyle = '#e8d9b0';
    rosette(g, x + 32, ty + 46, 22, 8, '#e8d9b0', '#0f3a45', 3);
    g.fillStyle = '#c0453a';
    diamond(g, x, ty + 46, 10, 10);
    g.fill();
  }
  g.fillStyle = '#d9a64a';
  g.fillRect(0, ty - 6, w, 8);
  g.fillRect(0, ty + 92, w, 6);
  return c;
}
