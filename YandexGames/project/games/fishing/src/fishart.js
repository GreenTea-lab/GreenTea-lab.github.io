// Рисование рыб на canvas по параметрам вида: форма, плавники, окраска, узор, глаз, усы, корона у легендарных
import { SPECIES, rng } from './data.js';

const TAU = Math.PI * 2;

// геометрия тела в единицах длины рыбы (нос справа, x от -0.5 до 0.5)
function geom(S) {
  const H = S.h;
  const head = S.head || 'normal';
  const ph = Math.max(0.055, H * (head === 'flat' ? 0.45 : 0.32));
  const g = { H, ph, xt: -0.31, m: 0, head };
  if (head === 'long') g.m = H * 0.04;
  if (head === 'snout') g.m = H * 0.12;
  if (head === 'flat') g.m = H * 0.06;
  return g;
}

function bodyPath(ctx, g) {
  const { H, ph, xt, m, head } = g;
  ctx.beginPath();
  ctx.moveTo(0.5, m);
  if (head === 'long') {
    ctx.bezierCurveTo(0.49, m - H * 0.16, 0.33, -H * 0.4, 0.12, -H * 0.5);
  } else if (head === 'snout') {
    ctx.bezierCurveTo(0.44, m - H * 0.08, 0.32, -H * 0.36, 0.12, -H * 0.5);
  } else if (head === 'flat' || head === 'big') {
    ctx.bezierCurveTo(0.5, m - H * 0.48, 0.36, -H * 0.52, 0.12, -H * 0.5);
  } else {
    ctx.bezierCurveTo(0.5, m - H * 0.34, 0.33, -H * 0.5, 0.08, -H * 0.5);
  }
  ctx.bezierCurveTo(-0.1, -H * 0.5, -0.2, -ph / 2 - H * 0.06, xt, -ph / 2);
  ctx.lineTo(xt, ph / 2);
  ctx.bezierCurveTo(-0.2, ph / 2 + H * 0.08, -0.08, H * 0.5, 0.06, H * 0.5);
  if (head === 'long') ctx.bezierCurveTo(0.3, H * 0.46, 0.49, m + H * 0.14, 0.5, m);
  else if (head === 'snout') ctx.bezierCurveTo(0.3, H * 0.5, 0.42, m + H * 0.14, 0.5, m);
  else if (head === 'flat' || head === 'big') ctx.bezierCurveTo(0.34, H * 0.5, 0.5, m + H * 0.4, 0.5, m);
  else ctx.bezierCurveTo(0.32, H * 0.5, 0.5, m + H * 0.3, 0.5, m);
  ctx.closePath();
}

// хвост; wig — изгиб (-1..1)
function tailPath(ctx, g, type, wig) {
  const { H, ph, xt } = g;
  const T = Math.max(H * 0.56, 0.12);
  const a = wig * 0.35;
  const P = (x, y) => {
    const dx = x - xt;
    return [xt + dx * Math.cos(a) - y * Math.sin(a), dx * Math.sin(a) + y * Math.cos(a)];
  };
  const L = (x, y) => ctx.lineTo(...P(x, y));
  const Q = (cx, cy, x, y) => ctx.quadraticCurveTo(...P(cx, cy), ...P(x, y));
  ctx.beginPath();
  ctx.moveTo(...P(xt + 0.02, -ph / 2));
  if (type === 'round') {
    Q(-0.4, -T * 0.95, -0.49, -T * 0.4);
    Q(-0.53, 0, -0.49, T * 0.4);
    Q(-0.4, T * 0.95, xt + 0.02, ph / 2);
  } else if (type === 'cut') {
    Q(-0.4, -T * 0.6, -0.49, -T);
    Q(-0.45, 0, -0.49, T);
    Q(-0.4, T * 0.6, xt + 0.02, ph / 2);
  } else if (type === 'shark') {
    Q(-0.38, -T * 0.7, -0.52, -T * 1.25);
    Q(-0.44, -T * 0.2, -0.4, 0.02);
    Q(-0.44, T * 0.5, -0.46, T * 0.62);
    Q(-0.38, T * 0.45, xt + 0.02, ph / 2);
  } else {
    Q(-0.38, -T * 0.55, -0.5, -T);
    Q(-0.44, -T * 0.3, -0.42, 0);
    Q(-0.44, T * 0.3, -0.5, T);
    Q(-0.38, T * 0.55, xt + 0.02, ph / 2);
  }
  ctx.closePath();
}

function fin(ctx, pts, fill, stroke, lw, rays) {
  const P = new Path2D();
  P.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 2) P.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  P.closePath();
  ctx.fillStyle = fill;
  ctx.fill(P);
  if (rays) {
    ctx.save();
    ctx.clip(P);
    ctx.strokeStyle = 'rgba(0,0,0,.16)';
    ctx.lineWidth = lw * 0.7;
    const [a, b] = rays;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const k = i / 6;
      ctx.moveTo(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k);
      ctx.lineTo(a[0] + (b[0] - a[0]) * k + (rays[2] || 0), a[1] + (b[1] - a[1]) * k + (rays[3] || -0.2));
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke(P);
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  if (k < 0) {
    r *= 1 + k;
    g *= 1 + k;
    b *= 1 + k;
  } else {
    r += (255 - r) * k;
    g += (255 - g) * k;
    b += (255 - b) * k;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function fins(ctx, S, g, lw, sil) {
  const { H } = g;
  const fc = sil || S.c[3];
  const fs = sil || 'rgba(40,30,20,.45)';
  const top = -H * 0.5;
  const bot = H * 0.5;
  const d = S.dors || 'normal';
  const ray = sil ? null : true;
  // спинной
  if (d === 'double') {
    fin(ctx, [[0.2, top + 0.01], [0.15, top - H * 0.5], [0.02, top - H * 0.32], [0, top - H * 0.05], [0.02, top + 0.01]], fc, fs, lw, ray && [[0.18, top], [0.02, top], 0, -H * 0.4]);
    fin(ctx, [[-0.01, top + 0.01], [-0.05, top - H * 0.34], [-0.17, top - H * 0.22], [-0.2, top + H * 0.08], [-0.16, top + H * 0.12]], fc, fs, lw, ray && [[-0.02, top], [-0.16, top + H * 0.1], -0.02, -H * 0.28]);
  } else if (d === 'back') {
    fin(ctx, [[-0.12, top + H * 0.2], [-0.14, top - H * 0.28], [-0.24, top + H * 0.06], [-0.26, top + H * 0.28], [-0.2, top + H * 0.3]], fc, fs, lw, ray && [[-0.13, top + H * 0.2], [-0.24, top + H * 0.3], -0.03, -H * 0.3]);
  } else if (d === 'sail') {
    fin(ctx, [[0.16, top + 0.01], [0.14, top - H * 0.9], [-0.1, top - H * 0.8], [-0.2, top + H * 0.02], [-0.16, top + H * 0.12]], fc, fs, lw, ray && [[0.15, top], [-0.15, top + H * 0.1], 0, -H * 0.7]);
    if (!sil) {
      ctx.fillStyle = 'rgba(255,90,120,.55)';
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(0.1 - i * 0.028, top - H * (0.15 + ((i * 37) % 5) * 0.1), H * 0.045, 0, TAU);
        ctx.fill();
      }
    }
  } else if (d === 'long') {
    fin(ctx, [[0.06, top + 0.012], [0.02, top - H * 0.3], [-0.12, top - H * 0.24], [-0.3, top - H * 0.05], [-0.31, top + H * 0.32]], fc, fs, lw, ray && [[0.04, top], [-0.28, top + H * 0.3], 0, -H * 0.25]);
  } else if (d === 'small') {
    fin(ctx, [[0.16, top + 0.01], [0.13, top - H * 0.3], [0.06, top - H * 0.1], [0.05, top + 0.02], [0.08, top + 0.03]], fc, fs, lw);
  } else {
    fin(ctx, [[0.12, top + 0.01], [0.07, top - H * 0.46], [-0.08, top - H * 0.28], [-0.12, top + H * 0.06], [-0.08, top + H * 0.08]], fc, fs, lw, ray && [[0.1, top], [-0.08, top + H * 0.06], -0.01, -H * 0.36]);
  }
  if (S.adip) fin(ctx, [[-0.18, top + H * 0.16], [-0.2, top - H * 0.12], [-0.25, top + H * 0.2], [-0.24, top + H * 0.25], [-0.21, top + H * 0.22]], fc, fs, lw);
  // анальный
  if (S.dors === 'long' || S.head === 'flat') fin(ctx, [[0.0, bot - 0.01], [-0.06, bot + H * 0.28], [-0.2, bot + H * 0.12], [-0.3, bot - H * 0.08], [-0.31, bot - H * 0.32]], fc, fs, lw, ray && [[0, bot], [-0.28, bot - H * 0.3], 0, H * 0.25]);
  else fin(ctx, [[-0.06, bot - 0.01], [-0.1, bot + H * 0.32], [-0.2, bot + H * 0.04], [-0.22, bot - H * 0.16], [-0.17, bot - H * 0.2]], fc, fs, lw, ray && [[-0.07, bot], [-0.19, bot - H * 0.18], 0, H * 0.28]);
  // брюшной
  fin(ctx, [[0.13, bot - 0.012], [0.09, bot + H * 0.32], [0.01, bot + H * 0.08], [0.02, bot - H * 0.02], [0.05, bot - H * 0.02]], fc, fs, lw, ray && [[0.12, bot], [0.03, bot], -0.02, H * 0.28]);
}

function pattern(ctx, S, g, id) {
  const { H } = g;
  const R = rng(id.length * 97 + id.charCodeAt(0) * 13 + id.charCodeAt(1));
  const pat = S.pat;
  if (pat === 'scales' || pat === 'bigscales' || pat === 'gold') {
    const s = pat === 'bigscales' ? 0.062 : 0.042;
    ctx.lineWidth = pat === 'bigscales' ? 0.006 : 0.004;
    ctx.strokeStyle = pat === 'bigscales' ? 'rgba(70,40,10,.33)' : 'rgba(40,40,40,.16)';
    for (let row = -H / 2 - s; row < H / 2 + s; row += s * 0.72) {
      const off = (Math.round(row / (s * 0.72)) % 2) * s * 0.5;
      for (let x = 0.36 - off; x > -0.36; x -= s) {
        ctx.beginPath();
        ctx.arc(x, row, s * 0.6, -Math.PI / 2.4, Math.PI / 2.4);
        ctx.stroke();
      }
    }
  }
  if (pat === 'gold') {
    ctx.fillStyle = 'rgba(255,255,230,.8)';
    for (let i = 0; i < 9; i++) {
      const x = 0.25 - R() * 0.5,
        y = (R() - 0.5) * H * 0.7,
        r = 0.012 + R() * 0.016;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 2);
      ctx.quadraticCurveTo(x, y, x + r * 2, y);
      ctx.quadraticCurveTo(x, y, x, y + r * 2);
      ctx.quadraticCurveTo(x, y, x - r * 2, y);
      ctx.quadraticCurveTo(x, y, x, y - r * 2);
      ctx.fill();
    }
  }
  if (pat === 'stripes') {
    ctx.fillStyle = S.dors === 'double' && S.eye === 'glass' ? 'rgba(40,50,45,.3)' : 'rgba(30,45,15,.5)';
    for (let i = 0; i < 7; i++) {
      const x = 0.22 - i * 0.075;
      ctx.beginPath();
      ctx.moveTo(x - 0.02, -H * 0.6);
      ctx.quadraticCurveTo(x + 0.012, -H * 0.1, x - 0.004, H * 0.22);
      ctx.quadraticCurveTo(x - 0.02, -H * 0.1, x - 0.05, -H * 0.6);
      ctx.fill();
    }
  }
  if (pat === 'spots' || pat === 'light') {
    ctx.fillStyle = pat === 'spots' ? 'rgba(236,232,170,.62)' : 'rgba(255,240,225,.7)';
    for (let i = 0; i < 34; i++) {
      const x = 0.32 - R() * 0.62,
        y = (R() - 0.65) * H * 0.9;
      ctx.beginPath();
      ctx.ellipse(x, y, pat === 'spots' ? 0.018 : 0.011, pat === 'spots' ? 0.009 : 0.011, 0, 0, TAU);
      ctx.fill();
    }
  }
  if (pat === 'mottle') {
    ctx.fillStyle = 'rgba(15,20,10,.32)';
    for (let i = 0; i < 26; i++) {
      const x = 0.34 - R() * 0.64,
        y = (R() - 0.6) * H * 0.9;
      ctx.beginPath();
      ctx.ellipse(x, y, 0.015 + R() * 0.03, 0.01 + R() * 0.018, R() * 3, 0, TAU);
      ctx.fill();
    }
  }
  if (pat === 'dots' || pat === 'trout' || pat === 'cross') {
    if (pat === 'trout') {
      // розовая полоса вдоль бока
      const gr = ctx.createLinearGradient(0, -H * 0.15, 0, H * 0.15);
      gr.addColorStop(0, 'rgba(240,120,140,0)');
      gr.addColorStop(0.5, 'rgba(240,120,140,.45)');
      gr.addColorStop(1, 'rgba(240,120,140,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(-0.4, -H * 0.15, 0.85, H * 0.3);
    }
    for (let i = 0; i < 30; i++) {
      const x = 0.3 - R() * 0.6,
        y = (R() - 0.7) * H * 0.85;
      if (pat === 'cross') {
        ctx.strokeStyle = 'rgba(30,25,15,.6)';
        ctx.lineWidth = 0.006;
        ctx.beginPath();
        ctx.moveTo(x - 0.008, y - 0.008);
        ctx.lineTo(x + 0.008, y + 0.008);
        ctx.moveTo(x + 0.008, y - 0.008);
        ctx.lineTo(x - 0.008, y + 0.008);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(25,25,20,.55)';
        ctx.beginPath();
        ctx.arc(x, y, 0.007 + R() * 0.004, 0, TAU);
        ctx.fill();
      }
    }
    if (pat === 'trout')
      for (let i = 0; i < 9; i++) {
        const x = 0.24 - R() * 0.5,
          y = (R() - 0.4) * H * 0.4;
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath();
        ctx.arc(x, y, 0.012, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#d6402f';
        ctx.beginPath();
        ctx.arc(x, y, 0.008, 0, TAU);
        ctx.fill();
      }
  }
  if (pat === 'scutes') {
    ctx.fillStyle = 'rgba(245,240,220,.85)';
    ctx.strokeStyle = 'rgba(60,50,30,.4)';
    ctx.lineWidth = 0.003;
    for (const [yy, n, sz] of [[-H * 0.44, 11, 0.018], [-H * 0.05, 14, 0.013], [H * 0.3, 12, 0.01]]) {
      for (let i = 0; i < n; i++) {
        const x = 0.3 - (i * 0.58) / n;
        ctx.beginPath();
        ctx.moveTo(x, yy - sz);
        ctx.lineTo(x + sz * 0.8, yy);
        ctx.lineTo(x, yy + sz);
        ctx.lineTo(x - sz * 0.8, yy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

function crown(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.15);
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.lineTo(-s, -s * 0.9);
  ctx.lineTo(-s * 0.5, -s * 0.45);
  ctx.lineTo(0, -s * 1.15);
  ctx.lineTo(s * 0.5, -s * 0.45);
  ctx.lineTo(s, -s * 0.9);
  ctx.lineTo(s, 0);
  ctx.closePath();
  const gr = ctx.createLinearGradient(0, -s, 0, 0);
  gr.addColorStop(0, '#fff2a0');
  gr.addColorStop(1, '#e0a020');
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = '#9a6a10';
  ctx.lineWidth = s * 0.12;
  ctx.stroke();
  ctx.fillStyle = '#e8424a';
  ctx.beginPath();
  ctx.arc(0, -s * 0.3, s * 0.18, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// x, y — центр, L — длина в пикселях. opt: { wig, sil (цвет силуэта), flip, rot }
export function drawFish(ctx, id, x, y, L, opt = {}) {
  const S = SPECIES[id];
  const g = geom(S);
  const { H, m } = g;
  const sil = opt.sil || null;
  const lw = 0.011;
  ctx.save();
  ctx.translate(x, y);
  if (opt.rot) ctx.rotate(opt.rot);
  ctx.scale(opt.flip ? -L : L, L);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const wig = opt.wig || 0;
  // плавники за телом
  fins(ctx, S, g, lw, sil);
  // хвост
  tailPath(ctx, g, S.tail || 'fork', wig);
  ctx.fillStyle = sil || S.c[3];
  ctx.fill();
  if (!sil) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,.15)';
    ctx.lineWidth = lw * 0.7;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(g.xt, 0);
      ctx.lineTo(-0.52, i * 0.04);
      ctx.stroke();
    }
    if (S.finEdge) {
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = lw * 2;
      ctx.stroke();
    }
    ctx.restore();
    tailPath(ctx, g, S.tail || 'fork', wig);
  }
  ctx.strokeStyle = sil || 'rgba(40,30,20,.5)';
  ctx.lineWidth = lw;
  ctx.stroke();
  // тело
  bodyPath(ctx, g);
  if (sil) {
    ctx.fillStyle = sil;
    ctx.fill();
  } else {
    const gr = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
    gr.addColorStop(0, S.c[0]);
    gr.addColorStop(0.42, S.c[1]);
    gr.addColorStop(0.72, S.c[2]);
    gr.addColorStop(1, shade(S.c[2], 0.3));
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // темнее к хвосту
    const gx = ctx.createLinearGradient(-0.35, 0, 0.4, 0);
    gx.addColorStop(0, 'rgba(20,20,10,.22)');
    gx.addColorStop(0.5, 'rgba(20,20,10,0)');
    ctx.fillStyle = gx;
    ctx.fillRect(-0.5, -H, 1, H * 2);
    pattern(ctx, S, g, id);
    // боковая линия
    ctx.strokeStyle = 'rgba(40,40,30,.25)';
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(0.26, -H * 0.14);
    ctx.quadraticCurveTo(0, -H * 0.18, -0.31, 0);
    ctx.stroke();
    // блик
    const hl = ctx.createRadialGradient(0.12, -H * 0.3, 0, 0.12, -H * 0.3, 0.3);
    hl.addColorStop(0, 'rgba(255,255,255,.42)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(-0.3, -H, 0.8, H);
    // жабры
    ctx.strokeStyle = 'rgba(60,30,20,.4)';
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    const gx0 = S.head === 'long' ? 0.25 : S.head === 'snout' ? 0.2 : 0.29;
    ctx.moveTo(gx0, -H * 0.38);
    ctx.quadraticCurveTo(gx0 - 0.06, 0, gx0, H * 0.38);
    ctx.stroke();
    ctx.restore();
    bodyPath(ctx, g);
  }
  ctx.strokeStyle = sil || 'rgba(40,30,20,.55)';
  ctx.lineWidth = lw;
  ctx.stroke();
  // грудной плавник поверх
  if (!sil) fin(ctx, [[0.25, H * 0.12], [0.2, H * 0.36], [0.12, H * 0.26], [0.13, H * 0.12], [0.2, H * 0.1]], 'rgba(255,255,255,.18)', 'rgba(40,30,20,.3)', lw * 0.8);
  if (sil) {
    ctx.restore();
    return;
  }
  // глаз
  const ex = S.head === 'long' ? 0.37 : S.head === 'snout' ? 0.32 : S.head === 'flat' ? 0.4 : 0.39;
  const ey = S.eye === 'low' ? H * 0.06 : S.head === 'flat' ? -H * 0.14 : -H * 0.13 + m * 0.5;
  const er = Math.max(0.022, H * (S.head === 'flat' ? 0.07 : 0.1));
  ctx.fillStyle = S.eye === 'red' ? '#d43a2a' : S.eye === 'glass' ? '#d9e2df' : S.eye === 'gold' ? '#f0b52c' : '#e9c35a';
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,10,.5)';
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  ctx.fillStyle = '#16120e';
  ctx.beginPath();
  ctx.arc(ex + er * 0.12, ey, er * 0.62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ex + er * 0.35, ey - er * 0.3, er * 0.24, 0, TAU);
  ctx.fill();
  // рот
  ctx.strokeStyle = 'rgba(60,25,20,.6)';
  ctx.lineWidth = lw * 0.9;
  ctx.beginPath();
  const mx = S.head === 'snout' ? 0.36 : 0.5;
  const my = S.head === 'snout' ? H * 0.42 : m + H * 0.04;
  ctx.moveTo(mx, my);
  ctx.quadraticCurveTo(mx - 0.03, my + H * 0.08, mx - (S.pred ? 0.09 : 0.05), my + H * 0.06);
  ctx.stroke();
  // усы
  if (S.whisk) {
    ctx.strokeStyle = S.head === 'snout' ? 'rgba(90,80,60,.7)' : shade(S.c[0], -0.2);
    ctx.lineWidth = lw * (S.head === 'snout' ? 0.6 : 0.9);
    const n = S.whisk;
    for (let i = 0; i < n; i++) {
      const long = S.head === 'flat' && i < 2;
      const sx = S.head === 'snout' ? 0.4 + i * 0.012 : mx - 0.01,
        sy = S.head === 'snout' ? m + H * 0.2 : my + H * 0.02;
      const len = long ? 0.26 : S.whisk === 1 ? 0.06 : S.head === 'snout' ? 0.035 : 0.07;
      const ang = (S.head === 'snout' ? 1.3 : 0.6) + i * 0.25 + (long ? -0.3 : 0);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + Math.cos(ang) * len * 0.6, sy + Math.sin(ang) * len * 0.3, sx + Math.cos(ang) * len * 0.3, sy + Math.sin(ang) * len + (long ? 0.08 : 0));
      ctx.stroke();
    }
  }
  if (S.r === 5) crown(ctx, ex - 0.04, -H * 0.5 - 0.005, Math.max(0.04, H * 0.2));
  ctx.restore();
}

// кэш картинок для интерфейса (dataURL), размер — ширина в пикселях
const cache = {};
export function fishImg(id, w = 160, sil = false) {
  const k = id + w + (sil ? 's' : '');
  if (cache[k]) return cache[k];
  const S = SPECIES[id];
  const h = Math.round(w * Math.max(0.5, S.h * 2.1));
  const c = document.createElement('canvas');
  c.width = w * 2;
  c.height = h * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  drawFish(ctx, id, w * 0.5, h * (S.r === 5 ? 0.56 : 0.52), w * 0.9, { sil: sil ? 'rgba(40,62,80,.55)' : null, wig: 0.15 });
  return (cache[k] = c.toDataURL('image/png'));
}
