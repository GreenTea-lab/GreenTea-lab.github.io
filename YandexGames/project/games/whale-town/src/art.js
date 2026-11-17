// Процедурные модельки фона: острова пяти биомов, пальмы, ёлки, облака (с кэшем спрайтов)
import { rng } from './data.js';

const TAU = Math.PI * 2;

// цвета: '#rrggbb' → [r,g,b]; смешивание и осветление
const _hx = {};
function hex(c) {
  if (_hx[c]) return _hx[c];
  const n = parseInt(c.slice(1), 16);
  return (_hx[c] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
export function mix(a, b, k) {
  const A = hex(a),
    B = hex(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
}
export function shade(c, k) {
  return k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#101830', -k);
}

// палитры островов по биомам
export const ISL = {
  warm: { sand: ['#fbe7b4', '#e8c27a'], wet: '#d8ae6a', grass: ['#8ad866', '#3e9e48'], leaf: ['#5cc85a', '#2c8a3e'], trunk: ['#c08a54', '#86582e'], rock: ['#b8c0cc', '#7e8898'], lagoon: 'rgba(150,240,225,.55)', foam: 'rgba(255,255,255,.85)', fl: ['#ff7a9a', '#ffd23a', '#ffffff'] },
  tropic: { sand: ['#ffe6c0', '#f0b88a'], wet: '#e0a070', grass: ['#7ee05a', '#2fa04e'], leaf: ['#4fd06a', '#1f8a4a'], trunk: ['#c4885a', '#80502e'], rock: ['#c8b0c8', '#8a7090'], lagoon: 'rgba(120,250,230,.55)', foam: 'rgba(255,248,240,.9)', fl: ['#ff5a9a', '#ffb03a', '#c86aff'] },
  north: { sand: ['#f4f9fc', '#c8dcea'], wet: '#a8bccc', grass: ['#ffffff', '#cfe2ee'], leaf: ['#3e8a72', '#22604e'], trunk: ['#8a6a50', '#5a4636'], rock: ['#9aaabb', '#5f7082'], lagoon: 'rgba(220,240,255,.45)', foam: 'rgba(255,255,255,.9)', fl: ['#ffffff', '#cfe8ff', '#ffffff'] },
  night: { sand: ['#8a86c8', '#56529a'], wet: '#44407e', grass: ['#3a9a8a', '#1e5e62'], leaf: ['#40c8a8', '#1d7a70'], trunk: ['#7a5a6a', '#4a3448'], rock: ['#6a70a0', '#40446e'], lagoon: 'rgba(110,230,220,.28)', foam: 'rgba(170,210,255,.7)', fl: ['#8affe0', '#ffe68a', '#c8a8ff'] },
  sky: { sand: ['#ffffff', '#dcd8f8'], wet: '#c8c4ee', grass: ['#b8f0a0', '#6cc87a'], leaf: ['#ffa8dc', '#e070b0'], trunk: ['#e0a890', '#b07468'], rock: ['#e8e0ff', '#b8b0e0'], lagoon: null, foam: null, fl: ['#ff8ad0', '#ffe07a', '#8ad0ff'] },
};

// ---------- пальма ----------
// X,Y — основание; h — высота; lean — наклон (доля h); sw — покачивание (рад)
export function palm(x, X, Y, h, lean, sw, C, opt = {}) {
  const tx = X + lean * h,
    ty = Y - h;
  const cx = X + lean * h * 0.15,
    cy = Y - h * 0.6;
  const N = 8;
  const pt = (s) => {
    const a = (1 - s) * (1 - s),
      b = 2 * (1 - s) * s,
      c = s * s;
    return [a * X + b * cx + c * tx, a * Y + b * cy + c * ty];
  };
  // ствол: сегменты-колечки, сужается кверху
  const L = [],
    R = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const [px, py] = pt(s);
    const [qx, qy] = pt(Math.min(1, s + 0.01));
    let nx = -(qy - py),
      ny = qx - px;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    const w = h * (0.05 - 0.022 * s);
    L.push([px + nx * w, py + ny * w]);
    R.push([px - nx * w, py - ny * w]);
  }
  x.beginPath();
  x.moveTo(L[0][0], L[0][1]);
  for (const p of L) x.lineTo(p[0], p[1]);
  for (let i = R.length - 1; i >= 0; i--) x.lineTo(R[i][0], R[i][1]);
  x.closePath();
  x.fillStyle = C.trunk[0];
  x.fill();
  // тень на стволе и колечки
  x.strokeStyle = C.trunk[1];
  x.lineWidth = Math.max(0.8, h * 0.012);
  x.lineCap = 'round';
  x.beginPath();
  for (let i = 1; i < N; i++) {
    x.moveTo(L[i][0], L[i][1]);
    x.quadraticCurveTo((L[i][0] + R[i][0]) / 2, (L[i][1] + R[i][1]) / 2 + h * 0.02, R[i][0], R[i][1]);
  }
  x.stroke();
  if (opt.detail !== false) {
    x.strokeStyle = 'rgba(255,255,255,.22)';
    x.lineWidth = Math.max(0.8, h * 0.014);
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const p = [L[i][0] * 0.7 + R[i][0] * 0.3, L[i][1] * 0.7 + R[i][1] * 0.3];
      i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]);
    }
    x.stroke();
  }
  // листья: задние, кокосы, передние
  const fr = [-2.3, -1.6, -0.95, -0.35, 0.4, 1.0, 1.65, 2.35];
  const len = h * 0.56;
  const back = [1, 3, 6],
    front = [0, 2, 4, 5, 7];
  for (const i of back) frond(x, tx, ty, fr[i] + sw * 0.6, len * (0.8 + 0.1 * Math.abs(Math.sin(fr[i]))), C, true, opt.detail);
  if (opt.coco !== false) {
    for (const [dx, dy] of [
      [-0.035, 0.02],
      [0.03, 0.025],
      [0, 0.05],
    ]) {
      x.beginPath();
      x.arc(tx + dx * h, ty + dy * h, h * 0.032, 0, TAU);
      x.fillStyle = '#7a4a2a';
      x.fill();
      if (opt.detail !== false) {
        x.fillStyle = 'rgba(255,230,190,.35)';
        x.beginPath();
        x.arc(tx + dx * h - h * 0.01, ty + dy * h - h * 0.01, h * 0.011, 0, TAU);
        x.fill();
      }
    }
  }
  for (const i of front) frond(x, tx, ty, fr[i] + sw, len * (0.82 + 0.18 * Math.abs(Math.sin(fr[i]))), C, false, opt.detail);
}

// лист пальмы: изогнутая жилка, по бокам перья-листочки (тёмные снизу, светлые сверху)
function frond(x, X, Y, a, L, C, back, detail) {
  const dx = Math.sin(a),
    dy = -Math.cos(a);
  const droop = 0.3 + 0.55 * Math.min(1, Math.abs(dx));
  const M = detail === false ? 6 : 11;
  const P = [];
  for (let i = 0; i <= M; i++) {
    const s = i / M;
    P.push([X + dx * L * s, Y + dy * L * s * (1 - s * 0.45) + droop * L * s * s]);
  }
  const wd = (s) => L * 0.2 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + s * 0.92)), 0.8);
  // сердцевина листа
  const core = (sg) => {
    const out = [];
    for (let i = 0; i <= M; i++) {
      const s = i / M,
        q = P[Math.min(M, i + 1)],
        r = P[Math.max(0, i - 1)];
      let nx = -(q[1] - r[1]),
        ny = q[0] - r[0];
      const nl = Math.hypot(nx, ny) || 1;
      out.push([(nx / nl) * sg, (ny / nl) * sg, s]);
    }
    return out;
  };
  const NA = core(1),
    NB = core(-1);
  // сторона A — нижняя, если лист смотрит вправо
  const lightA = dx < 0;
  const cDark = C.leaf[1],
    cLight = back ? C.leaf[1] : C.leaf[0];
  for (const [N, light] of [
    [NA, lightA],
    [NB, !lightA],
  ]) {
    const col = light ? cLight : cDark;
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(P[0][0], P[0][1]);
    for (let i = 0; i <= M; i++) {
      const w = wd(N[i][2]) * 0.45;
      x.lineTo(P[i][0] + N[i][0] * w, P[i][1] + N[i][1] * w);
    }
    for (let i = M; i >= 0; i--) x.lineTo(P[i][0], P[i][1]);
    x.closePath();
    x.fill();
    // перья: от жилки наружу и назад
    x.strokeStyle = col;
    x.lineWidth = Math.max(0.8, L * (detail === false ? 0.07 : 0.045));
    x.lineCap = 'round';
    x.beginPath();
    const K = detail === false ? 6 : 14;
    for (let k = 1; k < K; k++) {
      const s = k / K;
      const fi = s * M,
        i0 = Math.floor(fi),
        f = fi - i0,
        i1 = Math.min(M, i0 + 1);
      const px = P[i0][0] + (P[i1][0] - P[i0][0]) * f,
        py = P[i0][1] + (P[i1][1] - P[i0][1]) * f;
      const nx = N[i0][0],
        ny = N[i0][1];
      const w = wd(s);
      const ex = px + nx * w + dx * w * 0.35,
        ey = py + ny * w + dy * w * 0.35 + w * 0.35;
      x.moveTo(px, py);
      x.quadraticCurveTo(px + nx * w * 0.6, py + ny * w * 0.6, ex, ey);
    }
    x.stroke();
  }
  if (detail !== false && !back) {
    x.strokeStyle = 'rgba(255,255,210,.4)';
    x.lineWidth = Math.max(0.6, L * 0.016);
    x.beginPath();
    x.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i <= M - 1; i++) x.lineTo(P[i][0], P[i][1]);
    x.stroke();
  }
}

// ёлка со снегом
export function pine(x, X, Y, h, C, sw) {
  x.fillStyle = C.trunk[1];
  x.fillRect(X - h * 0.04, Y - h * 0.16, h * 0.08, h * 0.16);
  for (let i = 0; i < 3; i++) {
    const by = Y - h * (0.12 + i * 0.26),
      w = h * (0.34 - i * 0.08),
      th = h * 0.42;
    const ox = sw * h * 0.02 * (i + 1);
    x.beginPath();
    x.moveTo(X - w + ox * 0.5, by);
    x.quadraticCurveTo(X, by + h * 0.05, X + w + ox * 0.5, by);
    x.lineTo(X + ox, by - th);
    x.closePath();
    x.fillStyle = i % 2 ? C.leaf[0] : C.leaf[1];
    x.fill();
    // снежная шапка
    x.beginPath();
    x.moveTo(X + ox - w * 0.42, by - th * 0.55);
    x.quadraticCurveTo(X + ox, by - th * 0.42, X + ox + w * 0.42, by - th * 0.55);
    x.lineTo(X + ox, by - th);
    x.closePath();
    x.fillStyle = '#ffffff';
    x.fill();
  }
}

// круглый куст с бликом
function bush(x, X, Y, r, c0, c1, fl, R) {
  x.fillStyle = c1;
  x.beginPath();
  x.arc(X - r * 0.7, Y - r * 0.5, r * 0.75, 0, TAU);
  x.arc(X + r * 0.7, Y - r * 0.45, r * 0.7, 0, TAU);
  x.arc(X, Y - r * 0.85, r, 0, TAU);
  x.fill();
  x.fillStyle = c0;
  x.beginPath();
  x.arc(X - r * 0.15, Y - r * 1.05, r * 0.6, 0, TAU);
  x.arc(X - r * 0.8, Y - r * 0.7, r * 0.4, 0, TAU);
  x.fill();
  if (fl)
    for (let i = 0; i < 3; i++) {
      x.fillStyle = fl[i % fl.length];
      x.beginPath();
      x.arc(X + (R() - 0.5) * r * 1.6, Y - r * (0.4 + R() * 0.9), r * 0.16, 0, TAU);
      x.fill();
    }
}

function rock(x, X, Y, r, C) {
  x.fillStyle = C.rock[1];
  x.beginPath();
  x.ellipse(X, Y, r, r * 0.62, 0, Math.PI, 0);
  x.fill();
  x.fillStyle = C.rock[0];
  x.beginPath();
  x.ellipse(X - r * 0.15, Y - r * 0.12, r * 0.72, r * 0.42, 0, Math.PI, 0);
  x.fill();
}

// облачная «подушка» для неба-биома
function puff(x, X, Y, w, c0, c1) {
  x.fillStyle = c1;
  x.beginPath();
  x.ellipse(X, Y, w * 0.5, w * 0.1, 0, 0, TAU);
  x.fill();
  x.fillStyle = c0;
  x.beginPath();
  for (const [dx, dy, r] of [
    [-0.36, -0.02, 0.12],
    [-0.18, -0.06, 0.16],
    [0.04, -0.07, 0.17],
    [0.24, -0.05, 0.14],
    [0.4, -0.01, 0.1],
  ]) {
    x.moveTo(X + dx * w + r * w, Y + dy * w);
    x.arc(X + dx * w, Y + dy * w, r * w, 0, TAU);
  }
  x.fill();
}

// ---------- остров ----------
// cx — центр, by — линия воды, w — ширина; seed — вариант; t — время;
// o: { flag, chest, detail, small, layer: 'static' | 'anim' | 'all' }
export function island(x, cx, by, w, biome, seed, t, o = {}) {
  const C = ISL[biome] || ISL.warm;
  const R = rng(seed * 31 + 7);
  const det = o.detail !== false;
  const LS = o.layer !== 'anim',
    LA = o.layer !== 'static';
  const sky = biome === 'sky',
    north = biome === 'north',
    night = biome === 'night';
  // лагуна и пена
  if (C.lagoon) {
    if (LS) {
      x.fillStyle = C.lagoon;
      x.beginPath();
      x.ellipse(cx, by + w * 0.012, w * 0.6, w * 0.06, 0, 0, TAU);
      x.fill();
    }
    if (det && LA) {
      x.strokeStyle = C.foam;
      x.lineWidth = Math.max(1, w * 0.007);
      const k = 1 + 0.025 * Math.sin(t * 1.6 + seed);
      x.beginPath();
      x.ellipse(cx, by + w * 0.01, w * 0.53 * k, w * 0.04 * k, 0, 0.05, Math.PI - 0.05);
      x.stroke();
      x.globalAlpha = 0.5;
      x.beginPath();
      x.ellipse(cx, by + w * 0.016, (w * 0.585) / k, (w * 0.052) / k, 0, 0.3, Math.PI - 0.3);
      x.stroke();
      x.globalAlpha = 1;
    }
  }
  // геометрия острова (одинакова для обоих слоёв)
  const sl = w * (0.47 + R() * 0.04),
    sr = w * (0.47 + R() * 0.04);
  const sh = w * (0.085 + R() * 0.02);
  const gl = w * (0.3 + R() * 0.05),
    gr = w * (0.27 + R() * 0.05),
    gh = w * (0.13 + R() * 0.05);
  const gx = cx - w * 0.03 + (R() - 0.5) * w * 0.06;
  const gy = by - sh * 0.75;
  if (LS) {
    // берег: песок / камень со снегом / облако
    if (sky) {
      puff(x, cx, by - w * 0.02, w * 1.05, '#ffffff', '#e2dcfa');
    } else {
      const g = x.createLinearGradient(0, by - sh, 0, by);
      g.addColorStop(0, C.sand[0]);
      g.addColorStop(1, C.sand[1]);
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(cx - sl, by);
      x.bezierCurveTo(cx - sl * 0.8, by - sh * 0.9, cx - sl * 0.45, by - sh, cx - sl * 0.1, by - sh);
      x.bezierCurveTo(cx + sr * 0.3, by - sh * 1.05, cx + sr * 0.75, by - sh * 0.85, cx + sr, by);
      x.closePath();
      x.fill();
      // мокрый песок у воды
      x.fillStyle = C.wet;
      x.beginPath();
      x.moveTo(cx - sl, by);
      x.quadraticCurveTo(cx, by - sh * 0.38, cx + sr, by);
      x.quadraticCurveTo(cx, by - sh * 0.12, cx - sl, by);
      x.fill();
    }
    // холм травы (или снега)
    const gg = x.createLinearGradient(0, gy - gh, 0, gy);
    gg.addColorStop(0, C.grass[0]);
    gg.addColorStop(1, C.grass[1]);
    x.fillStyle = gg;
    x.beginPath();
    x.moveTo(gx - gl, gy);
    x.bezierCurveTo(gx - gl * 0.85, gy - gh * 0.75, gx - gl * 0.45, gy - gh * 1.05, gx - gl * 0.05, gy - gh);
    x.bezierCurveTo(gx + gr * 0.35, gy - gh * 0.98, gx + gr * 0.55, gy - gh * 0.65, gx + gr * 0.7, gy - gh * 0.6);
    x.bezierCurveTo(gx + gr * 0.9, gy - gh * 0.5, gx + gr, gy - gh * 0.25, gx + gr, gy);
    x.closePath();
    x.fill();
    if (det) {
      // кромка травы зубчиками
      x.fillStyle = C.grass[1];
      const n = 7;
      x.beginPath();
      for (let i = 0; i < n; i++) {
        const px = gx - gl * 0.92 + ((gl * 0.92 + gr * 0.92) * (i + 0.5)) / n;
        x.moveTo(px + w * 0.035, gy - 1);
        x.ellipse(px, gy - 1, w * 0.035, w * 0.012 * (1 + (i % 2) * 0.5), 0, 0, Math.PI);
      }
      x.fill();
      // блик
      x.fillStyle = 'rgba(255,255,255,.22)';
      x.beginPath();
      x.ellipse(gx - gl * 0.35, gy - gh * 0.78, gl * 0.35, gh * 0.16, -0.12, 0, TAU);
      x.fill();
    }
    // камни на берегу
    if (det && !sky) {
      rock(x, cx + sr * 0.7, by - sh * 0.15, w * 0.035, C);
      rock(x, cx - sl * 0.78, by - sh * 0.08, w * 0.026, C);
      rock(x, cx + sr * 0.82, by - sh * 0.02, w * 0.02, C);
    }
    // кусты
    if (!north) {
      bush(x, gx - gl * 0.75, gy - gh * 0.12, w * 0.04, C.grass[0], C.grass[1], det ? C.fl : null, R);
      bush(x, gx + gr * 0.55, gy - gh * 0.55, w * 0.034, C.grass[0], C.grass[1], det ? C.fl : null, R);
    }
    // деревья
    const sway = det && o.layer !== 'static' ? Math.sin(t * 1.3 + seed) * 0.08 : 0;
    if (north) {
      pine(x, gx - gl * 0.4, gy - gh * 0.85, w * 0.3, C, sway);
      pine(x, gx + gr * 0.05, gy - gh * 0.98, w * 0.38, C, sway);
      pine(x, gx + gr * 0.55, gy - gh * 0.62, w * 0.24, C, sway);
    } else {
      const hs = [w * (0.36 + R() * 0.06), w * (0.28 + R() * 0.05), w * 0.22];
      const n = o.small ? 2 : 3;
      const pos = [
        [gx + gr * 0.18, gy - gh * 0.92, 0.22],
        [gx - gl * 0.42, gy - gh * 0.82, -0.3],
        [gx + gr * 0.62, gy - gh * 0.58, 0.38],
      ];
      for (let i = 0; i < n; i++) palm(x, pos[i][0], pos[i][1], hs[i], pos[i][2], sway * (1 + i * 0.3), C, { detail: det, coco: det && i < 2 });
    }
  }
  // ночь: светящиеся грибочки и светлячки
  if (night && det && LS) {
    for (let i = 0; i < 4; i++) {
      const mx = gx - gl * 0.6 + i * gl * 0.45,
        my = gy - gh * (0.15 + (i % 2) * 0.2);
      const r = w * 0.016;
      const gw = x.createRadialGradient(mx, my - r, 0, mx, my - r, r * 5);
      gw.addColorStop(0, 'rgba(140,255,230,.45)');
      gw.addColorStop(1, 'rgba(140,255,230,0)');
      x.fillStyle = gw;
      x.fillRect(mx - r * 5, my - r * 6, r * 10, r * 10);
      x.fillStyle = '#e8fff8';
      x.fillRect(mx - r * 0.25, my - r, r * 0.5, r);
      x.fillStyle = '#7affd8';
      x.beginPath();
      x.arc(mx, my - r, r, Math.PI, 0);
      x.fill();
    }
  }
  if (night && det && LA) {
    for (let i = 0; i < 6; i++) {
      const a = t * 0.7 + i * 1.7;
      const fx = gx + Math.sin(a) * gl * 0.9,
        fy = gy - gh - w * 0.1 + Math.cos(a * 1.3) * w * 0.08;
      x.fillStyle = `rgba(255,240,150,${0.5 + 0.5 * Math.sin(t * 4 + i)})`;
      x.beginPath();
      x.arc(fx, fy, Math.max(1, w * 0.006), 0, TAU);
      x.fill();
    }
  }
  // флажок цели и сундук с подарками
  if (o.flag && LA) {
    const fx = gx - gl * 0.08,
      fy = gy - gh * 1.0;
    x.strokeStyle = '#6a4a3a';
    x.lineWidth = Math.max(1.5, w * 0.008);
    x.beginPath();
    x.moveTo(fx, fy);
    x.lineTo(fx, fy - w * 0.2);
    x.stroke();
    const f = Math.sin(t * 5) * w * 0.012;
    x.fillStyle = '#ff5a6a';
    x.beginPath();
    x.moveTo(fx, fy - w * 0.2);
    x.quadraticCurveTo(fx + w * 0.05, fy - w * 0.19 + f, fx + w * 0.1, fy - w * 0.17 + f);
    x.lineTo(fx, fy - w * 0.13);
    x.closePath();
    x.fill();
  }
  if (o.chest && LA) {
    const cx2 = cx + sr * 0.38,
      cy2 = by - sh * 0.62,
      s = w * 0.05;
    const gw = x.createRadialGradient(cx2, cy2 - s * 0.5, 0, cx2, cy2 - s * 0.5, s * 2.6);
    gw.addColorStop(0, `rgba(255,240,150,${0.45 + 0.2 * Math.sin(t * 3)})`);
    gw.addColorStop(1, 'rgba(255,240,150,0)');
    x.fillStyle = gw;
    x.fillRect(cx2 - s * 2.6, cy2 - s * 3.1, s * 5.2, s * 5.2);
    x.fillStyle = '#b06a3a';
    x.fillRect(cx2 - s * 0.6, cy2 - s * 0.7, s * 1.2, s * 0.7);
    x.fillStyle = '#d0844a';
    x.beginPath();
    x.moveTo(cx2 - s * 0.6, cy2 - s * 0.7);
    x.quadraticCurveTo(cx2, cy2 - s * 1.15, cx2 + s * 0.6, cy2 - s * 0.7);
    x.closePath();
    x.fill();
    x.fillStyle = '#ffd23a';
    x.fillRect(cx2 - s * 0.6, cy2 - s * 0.62, s * 1.2, s * 0.1);
    x.fillRect(cx2 - s * 0.08, cy2 - s * 0.72, s * 0.16, s * 0.3);
  }
}

// ---------- кэш спрайтов ----------
const cache = new Map();
function sprite(key, w, h, draw) {
  let c = cache.get(key);
  if (c) return c;
  if (cache.size > 80) cache.clear();
  c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  draw(c.getContext('2d'));
  cache.set(key, c);
  return c;
}

// облако: спрайт 3 вариантов, объёмное (светлый верх, сиреневатый низ)
export function cloudSprite(v, tone) {
  const W = 256,
    H = 128;
  return sprite('cl' + v + tone, W, H, (x) => {
    const R = rng(v * 17 + 3);
    const top = tone === 'night' ? '#aab0e8' : tone === 'warm' ? '#ffffff' : '#ffffff';
    const bot = tone === 'night' ? '#5a6098' : tone === 'sunset' ? '#ffc8c0' : '#d8e4f6';
    const puffs = [];
    const n = 5 + (v % 2);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      puffs.push([W * (0.2 + u * 0.6) + (R() - 0.5) * 12, H * (0.62 - Math.sin(u * Math.PI) * (0.18 + R() * 0.1)), H * (0.2 + Math.sin(u * Math.PI) * 0.14 + R() * 0.05)]);
    }
    const g = x.createLinearGradient(0, H * 0.2, 0, H * 0.85);
    g.addColorStop(0, top);
    g.addColorStop(0.55, top);
    g.addColorStop(1, bot);
    x.fillStyle = g;
    x.beginPath();
    for (const [px, py, r] of puffs) {
      x.moveTo(px + r, py);
      x.arc(px, py, r, 0, TAU);
    }
    x.rect(W * 0.16, H * 0.6, W * 0.68, H * 0.2);
    x.fill();
    // блики на верхушках
    for (const [px, py, r] of puffs) {
      const hg = x.createRadialGradient(px - r * 0.25, py - r * 0.4, 0, px - r * 0.25, py - r * 0.4, r * 0.75);
      hg.addColorStop(0, tone === 'night' ? 'rgba(220,225,255,.45)' : 'rgba(255,255,255,.8)');
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = hg;
      x.beginPath();
      x.arc(px, py, r, 0, TAU);
      x.fill();
    }
  });
}

// остров для дальнего плана: с дымкой, в кэше (без анимации)
export function farIsland(biome, seed, w, haze, hazeK, dpr) {
  const ww = Math.round(w / 4) * 4;
  const S = Math.min(2, dpr);
  return sprite(`fi${biome}${seed}${ww}${haze}${S}`, ww * 1.3 * S, ww * FAR_H * S, (x) => {
    x.scale(S, S);
    island(x, ww * FAR_CX, ww * FAR_BY, ww, biome, seed, 0, { detail: false, small: true });
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = hazeK;
    x.fillStyle = haze;
    x.fillRect(0, 0, ww * 1.3, ww * FAR_H);
  });
}
// где на спрайте острова линия воды и центр (доли от ширины w)
export const FAR_BY = 0.86,
  FAR_CX = 0.65,
  FAR_H = 0.98;

// остров, к которому плывёт кит: статичная часть в спрайте (размер квантуется ~6%), анимация поверх
export function nearIsland(x, cx, by, w, biome, seed, t, dpr) {
  const q = Math.round(Math.pow(2, Math.round(Math.log2(Math.max(16, w)) * 12) / 12));
  const S = Math.min(2, dpr);
  const c = sprite(`ni${biome}${seed}${q}${S}`, q * 1.3 * S, q * FAR_H * S, (y) => {
    y.scale(S, S);
    island(y, q * FAR_CX, q * FAR_BY, q, biome, seed, 0, { layer: 'static' });
  });
  const k = w / q;
  x.drawImage(c, cx - q * FAR_CX * k, by - q * FAR_BY * k, q * 1.3 * k, q * FAR_H * k);
  island(x, cx, by, w, biome, seed, t, { layer: 'anim', flag: true, chest: true });
}
