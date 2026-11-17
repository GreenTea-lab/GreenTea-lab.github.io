// Процедурная неоновая графика: танки, стволы, фигуры, снаряды, иконки (всё рисуется кодом)
import { COLORS, SHAPES, BOSSES, TANKS, hex } from './data.js';

export const TS = 2; // текстуры в 2x для чёткости
export const R0 = 40; // радиус корпуса в текстурах танка

const rgba = (c, a) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
const lighten = (c, k) => {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return (Math.round(r + (255 - r) * k) << 16) | (Math.round(g + (255 - g) * k) << 8) | Math.round(b + (255 - b) * k);
};

let SCENE = null;
function make(key, w, h, draw) {
  if (SCENE.textures.exists(key)) return key;
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  const ctx = c.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  draw(ctx, c.width, c.height);
  SCENE.textures.addCanvas(key, c);
  return key;
}

function neon(ctx, color, width, blur, core = 0.75) {
  ctx.shadowColor = hex(color);
  ctx.shadowBlur = blur;
  ctx.strokeStyle = hex(color);
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.shadowBlur = blur / 2;
  ctx.strokeStyle = `rgba(255,255,255,${core})`;
  ctx.lineWidth = width * 0.38;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function poly(ctx, cx, cy, r, n, rot = -Math.PI / 2, inner = 0) {
  ctx.beginPath();
  const pts = inner ? n * 2 : n;
  for (let i = 0; i < pts; i++) {
    const a = rot + (i / pts) * Math.PI * 2;
    const rr = inner && i % 2 ? inner : r;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// ---------- Стволы ----------
// текстура одного ствола: начало (основание) в левой точке, ось вправо
export function barrelKey(b) {
  const key = `br_${b.kind}_${b.l}_${b.w}_${b.w2 || 0}_${b.cap ? 1 : 0}_${b.base ? 1 : 0}`;
  const L = b.l * R0, W = b.w * R0, W2 = (b.w2 || b.w) * R0;
  const capW = b.cap ? W * 1.45 : 0;
  const hMax = Math.max(W, W2, capW) + 14;
  make(key, (L + 14) * TS, hMax * TS, (ctx, cw, ch) => {
    ctx.scale(TS, TS);
    const cy = hMax / 2;
    ctx.beginPath();
    if (b.kind === 'trap') {
      const L1 = L * 0.62;
      ctx.moveTo(2, cy - W / 2);
      ctx.lineTo(L1, cy - W / 2);
      ctx.lineTo(L, cy - capW / 2);
      ctx.lineTo(L, cy + capW / 2);
      ctx.lineTo(L1, cy + W / 2);
      ctx.lineTo(2, cy + W / 2);
    } else if (b.base) {
      ctx.moveTo(2, cy - W * 0.85);
      ctx.lineTo(L * 0.45, cy - W / 2);
      ctx.lineTo(L, cy - W / 2);
      ctx.lineTo(L, cy + W / 2);
      ctx.lineTo(L * 0.45, cy + W / 2);
      ctx.lineTo(2, cy + W * 0.85);
    } else {
      ctx.moveTo(2, cy - W / 2);
      ctx.lineTo(L, cy - W2 / 2);
      ctx.lineTo(L, cy + W2 / 2);
      ctx.lineTo(2, cy + W / 2);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, cy - W2 / 2, 0, cy + W2 / 2);
    g.addColorStop(0, '#332c6e');
    g.addColorStop(0.5, '#1c1745');
    g.addColorStop(1, '#2a2460');
    ctx.fillStyle = g;
    ctx.fill();
    neon(ctx, COLORS.barrel, 2.6, 8, 0.55);
    // мелкие детали: кольцо у дула и риска по оси
    const ex = b.kind === 'trap' ? L * 0.6 : L - Math.min(8, L * 0.12);
    const ew = b.kind === 'trap' ? W : W + (W2 - W) * (ex / L);
    ctx.beginPath();
    ctx.moveTo(ex, cy - ew / 2 + 2);
    ctx.lineTo(ex, cy + ew / 2 - 2);
    ctx.strokeStyle = 'rgba(200,195,255,0.55)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (W > 14 && b.kind === 'gun') {
      ctx.beginPath();
      ctx.moveTo(L * 0.55, cy);
      ctx.lineTo(ex - 5, cy);
      ctx.strokeStyle = 'rgba(160,150,255,0.28)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  });
  return key;
}

// ---------- Корпуса ----------
// корпус танка: круг (или квадрат) с внутренним кольцом и ядром. white=true — белый для покраски tint
export function bodyKey(color, shape = 'circle') {
  const key = `body_${shape}_${color.toString(16)}`;
  const S = (R0 + 16) * 2;
  make(key, S * TS, S * TS, (ctx) => {
    ctx.scale(TS, TS);
    const c = S / 2;
    const path = (r) => {
      if (shape === 'square') poly(ctx, c, c, r * 1.12, 4, Math.PI / 4);
      else {
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
      }
    };
    path(R0);
    const g = ctx.createRadialGradient(c - R0 * 0.3, c - R0 * 0.35, R0 * 0.1, c, c, R0);
    g.addColorStop(0, rgba(lighten(color, 0.35), 0.55));
    g.addColorStop(0.6, rgba(color, 0.28));
    g.addColorStop(1, rgba(color, 0.16));
    ctx.fillStyle = '#0d0828';
    ctx.fill();
    ctx.fillStyle = g;
    ctx.fill();
    neon(ctx, color, 3.6, 14);
    // внутреннее кольцо с рисками
    path(R0 * 0.64);
    ctx.strokeStyle = rgba(lighten(color, 0.3), 0.42);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * R0 * 0.7, c + Math.sin(a) * R0 * 0.7);
      ctx.lineTo(c + Math.cos(a) * R0 * 0.82, c + Math.sin(a) * R0 * 0.82);
      ctx.strokeStyle = rgba(lighten(color, 0.4), 0.5);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    // ядро
    poly(ctx, c, c, R0 * 0.2, 6, 0);
    ctx.fillStyle = rgba(lighten(color, 0.6), 0.9);
    ctx.shadowColor = hex(color);
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  return key;
}

// шипы смэшера (вращаются под корпусом)
export function spikesKey(kind) {
  const key = 'spikes_' + kind;
  const S = (R0 * 1.5 + 12) * 2;
  make(key, S * TS, S * TS, (ctx) => {
    ctx.scale(TS, TS);
    const c = S / 2;
    if (kind === 'spike') poly(ctx, c, c, R0 * 1.42, 12, 0, R0 * 0.92);
    else poly(ctx, c, c, R0 * 1.28, 6, 0);
    ctx.fillStyle = '#1a1438';
    ctx.fill();
    neon(ctx, COLORS.barrel, 2.6, 8, 0.5);
  });
  return key;
}

// автотурель: круглое основание + короткий ствол (радиус основания = R0*0.42)
export function turretKey() {
  return make('turret', (R0 * 1.4 + 12) * 2 * TS, (R0 * 1.4 + 12) * 2 * TS, (ctx, w) => {
    ctx.scale(TS, TS);
    const c = w / TS / 2;
    const tr = R0 * 0.42;
    ctx.beginPath();
    ctx.rect(c, c - tr * 0.3, tr * 1.65, tr * 0.6);
    ctx.fillStyle = '#16112f';
    ctx.fill();
    neon(ctx, COLORS.barrel, 2.2, 6, 0.5);
    ctx.beginPath();
    ctx.arc(c, c, tr, 0, Math.PI * 2);
    ctx.fillStyle = '#211a48';
    ctx.fill();
    neon(ctx, COLORS.barrel, 2.4, 8, 0.55);
    ctx.beginPath();
    ctx.arc(c, c, tr * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,195,255,0.6)';
    ctx.fill();
  });
}

// ---------- Фигуры ----------
export function shapeKey(type) {
  const d = SHAPES[type] || BOSSES[type];
  const key = 'sh_' + type;
  const r = d.r;
  const pad = 14;
  const S = (r + pad) * 2;
  make(key, S * TS, S * TS, (ctx) => {
    ctx.scale(TS, TS);
    const c = S / 2;
    const rot = d.sides === 4 ? Math.PI / 4 : -Math.PI / 2;
    const rr = d.sides === 4 ? r * 1.06 : d.sides === 3 ? r * 1.12 : r;
    poly(ctx, c, c, rr, d.sides, rot);
    ctx.fillStyle = '#0d0828';
    ctx.fill();
    ctx.fillStyle = rgba(d.color, 0.2);
    ctx.fill();
    neon(ctx, d.color, r > 60 ? 5 : 3, r > 60 ? 20 : 12);
    poly(ctx, c, c, rr * 0.56, d.sides, rot);
    ctx.strokeStyle = rgba(d.color, 0.5);
    ctx.lineWidth = r > 60 ? 2.4 : 1.4;
    ctx.stroke();
    if (r > 60) {
      poly(ctx, c, c, rr * 0.3, d.sides, rot);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(c, c, Math.max(2.2, r * 0.12), 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = hex(d.color);
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  return key;
}

// ---------- Снаряды ----------
export function bulletKey(color) {
  return make('bl_' + color.toString(16), 40 * TS, 40 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    ctx.arc(20, 20, 14, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.5);
    ctx.shadowColor = hex(color);
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = hex(lighten(color, 0.25));
    ctx.stroke();
    const g = ctx.createRadialGradient(17, 17, 0, 20, 20, 10);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(20, 20, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function droneKey(color, shape) {
  return make('dr_' + shape + '_' + color.toString(16), 44 * TS, 44 * TS, (ctx) => {
    ctx.scale(TS, TS);
    if (shape === 'square') poly(ctx, 22, 22, 15.5, 4, Math.PI / 4);
    else poly(ctx, 22, 22, 16, 3, 0);
    ctx.fillStyle = '#0d0828';
    ctx.fill();
    ctx.fillStyle = rgba(color, 0.32);
    ctx.fill();
    neon(ctx, color, 2.6, 10);
    ctx.beginPath();
    ctx.arc(22, 22, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
}

export function trapKey(color) {
  return make('tr_' + color.toString(16), 44 * TS, 44 * TS, (ctx) => {
    ctx.scale(TS, TS);
    poly(ctx, 22, 22, 17, 3, -Math.PI / 2, 6.5);
    ctx.fillStyle = '#0d0828';
    ctx.fill();
    ctx.fillStyle = rgba(color, 0.32);
    ctx.fill();
    neon(ctx, color, 2.4, 10);
  });
}

// ---------- Общие ----------
export function makeBase(scene) {
  SCENE = scene;
  make('glow', 128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  make('spark', 16, 16, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  make('star4', 32, 32, (ctx) => {
    poly(ctx, 16, 16, 15, 4, 0, 4);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  make('pixel', 4, 4, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 4, 4);
  });
  make('ring', 256, 256, (ctx) => {
    ctx.beginPath();
    ctx.arc(128, 128, 116, 0, Math.PI * 2);
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 7;
    ctx.stroke();
  });
  // фон: сетка арены
  make('grid', 200, 200, (ctx) => {
    ctx.strokeStyle = 'rgba(120,70,255,0.17)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(200, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 200);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,70,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 0);
    ctx.lineTo(100, 200);
    ctx.moveTo(0, 100);
    ctx.lineTo(200, 100);
    ctx.stroke();
    ctx.fillStyle = 'rgba(170,120,255,0.55)';
    ctx.fillRect(0, 0, 3, 3);
  });
  make('stars', 512, 512, (ctx) => {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(${150 + rnd() * 100},${150 + rnd() * 80},255,${0.15 + rnd() * 0.5})`;
      const s = rnd() < 0.85 ? 1.5 : 2.5;
      ctx.fillRect(rnd() * 512, rnd() * 512, s, s);
    }
  });
  make('joyBase', 160, 160, (ctx) => {
    ctx.beginPath();
    ctx.arc(80, 80, 66, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(49,246,255,0.06)';
    ctx.fill();
    neon(ctx, COLORS.cyan, 3, 10);
  });
  make('joyKnob', 80, 80, (ctx) => {
    ctx.beginPath();
    ctx.arc(40, 40, 24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(49,246,255,0.35)';
    ctx.fill();
    neon(ctx, COLORS.cyan, 3, 10);
  });
  make('vignette', 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 80, 128, 128, 182);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
  for (const t of Object.keys(SHAPES)) shapeKey(t);
  turretKey();
  makeIcons();
}

// миниатюра класса для кнопок выбора (canvas → текстура), цвет color
export function tankIcon(cls, color) {
  const key = `ti_${cls}_${color.toString(16)}`;
  const c = TANKS[cls];
  const S = 128;
  make(key, S * TS, S * TS, (ctx) => {
    ctx.scale(TS, TS);
    // масштаб под самый длинный ствол, чтобы иконка занимала всю клетку
    let ext = c.smasher ? (c.spikes ? 1.45 : 1.3) : 1.12;
    for (const b of c.barrels) ext = Math.max(ext, Math.hypot(b.l, Math.abs(b.y) + (b.w2 || b.w) / 2));
    const R = (S / 2 - 8) / ext;
    // смещаем к центру масс, если стволы только с одной стороны
    let sx = 0, sy = 0;
    for (const b of c.barrels) {
      sx += Math.cos((b.a * Math.PI) / 180 - Math.PI / 4) * b.l;
      sy += Math.sin((b.a * Math.PI) / 180 - Math.PI / 4) * b.l;
    }
    const n = Math.max(1, c.barrels.length);
    const off = Math.min(0.45, Math.hypot(sx, sy) / n / 2);
    const oa = Math.atan2(sy, sx);
    const R2 = (S / 2 - 8) / (ext - off * 0.9);
    const RR = Math.min(R2, R * 1.35);
    drawTankCanvas(ctx, S / 2 - Math.cos(oa) * off * RR, S / 2 - Math.sin(oa) * off * RR, c, color, -Math.PI / 4, RR);
  });
  return key;
}

// полная отрисовка танка на canvas (для иконок, промо и обложек)
export function drawTankCanvas(ctx, cx, cy, c, color, angle, R, opts = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const k = R / R0;
  ctx.scale(k, k);
  if (c.smasher) {
    const img = SCENE ? null : null;
    if (c.spikes) poly(ctx, 0, 0, R0 * 1.42, 12, 0, R0 * 0.92);
    else poly(ctx, 0, 0, R0 * 1.28, 6, 0);
    ctx.fillStyle = '#1a1438';
    ctx.fill();
    neon(ctx, COLORS.barrel, 2.6, 8, 0.5);
  }
  for (const b of c.barrels) {
    ctx.save();
    ctx.rotate((b.a * Math.PI) / 180);
    ctx.translate(0, b.y * R0);
    const L = b.l * R0, W = b.w * R0, W2 = (b.w2 || b.w) * R0, capW = W * 1.45;
    ctx.beginPath();
    if (b.kind === 'trap') {
      const L1 = L * 0.62;
      ctx.moveTo(0, -W / 2);
      ctx.lineTo(L1, -W / 2);
      ctx.lineTo(L, -capW / 2);
      ctx.lineTo(L, capW / 2);
      ctx.lineTo(L1, W / 2);
      ctx.lineTo(0, W / 2);
    } else if (b.base) {
      ctx.moveTo(0, -W * 0.85);
      ctx.lineTo(L * 0.45, -W / 2);
      ctx.lineTo(L, -W / 2);
      ctx.lineTo(L, W / 2);
      ctx.lineTo(L * 0.45, W / 2);
      ctx.lineTo(0, W * 0.85);
    } else {
      ctx.moveTo(0, -W / 2);
      ctx.lineTo(L, -W2 / 2);
      ctx.lineTo(L, W2 / 2);
      ctx.lineTo(0, W / 2);
    }
    ctx.closePath();
    ctx.fillStyle = '#241e52';
    ctx.fill();
    neon(ctx, COLORS.barrel, 2.6, 8, 0.55);
    ctx.restore();
  }
  ctx.beginPath();
  if (c.body === 'square') poly(ctx, 0, 0, R0 * 1.12, 4, Math.PI / 4);
  else if (opts.sides) poly(ctx, 0, 0, R0, opts.sides, -Math.PI / 2);
  else ctx.arc(0, 0, R0, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0828';
  ctx.fill();
  ctx.fillStyle = rgba(color, 0.3);
  ctx.fill();
  neon(ctx, color, 3.6, 14);
  ctx.beginPath();
  ctx.arc(0, 0, R0 * 0.64, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(lighten(color, 0.3), 0.42);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  poly(ctx, 0, 0, R0 * 0.2, 6, 0);
  ctx.fillStyle = rgba(lighten(color, 0.6), 0.9);
  ctx.fill();
  for (const a of c.autos || []) {
    const ang = (a.a * Math.PI) / 180;
    const px = Math.cos(ang) * a.dist * R0, py = Math.sin(ang) * a.dist * R0;
    const tr = R0 * 0.42;
    ctx.beginPath();
    ctx.rect(px, py - tr * 0.3, tr * 1.65, tr * 0.6);
    ctx.fillStyle = '#16112f';
    ctx.fill();
    neon(ctx, COLORS.barrel, 2.2, 6, 0.5);
    ctx.beginPath();
    ctx.arc(px, py, tr, 0, Math.PI * 2);
    ctx.fillStyle = '#211a48';
    ctx.fill();
    neon(ctx, COLORS.barrel, 2.4, 8, 0.55);
  }
  ctx.restore();
}

// ---------- Иконки интерфейса 96x96 ----------
function makeIcons() {
  const S = 96;
  const icon = (key, draw) => make('ic_' + key, S, S, (ctx) => draw(ctx));
  const st = (ctx, c, w = 5) => neon(ctx, c, w, 12);
  icon('coin', (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 30, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COLORS.yellow, 0.25);
    ctx.fill();
    st(ctx, COLORS.yellow, 5);
    poly(ctx, 48, 48, 14, 6, 0);
    st(ctx, COLORS.yellow, 3.5);
  });
  icon('trophy', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(28, 18);
    ctx.lineTo(68, 18);
    ctx.lineTo(66, 42);
    ctx.quadraticCurveTo(48, 64, 30, 42);
    ctx.closePath();
    ctx.moveTo(48, 56);
    ctx.lineTo(48, 72);
    ctx.moveTo(34, 78);
    ctx.lineTo(62, 78);
    ctx.moveTo(28, 24);
    ctx.quadraticCurveTo(12, 26, 26, 42);
    ctx.moveTo(68, 24);
    ctx.quadraticCurveTo(84, 26, 70, 42);
    st(ctx, COLORS.yellow, 4);
  });
  icon('garage', (ctx) => {
    ctx.beginPath();
    ctx.rect(46, 40, 34, 16);
    st(ctx, COLORS.barrel, 4);
    ctx.beginPath();
    ctx.arc(40, 48, 20, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COLORS.cyan, 0.25);
    ctx.fill();
    st(ctx, COLORS.cyan, 4.5);
  });
  icon('ad', (ctx) => {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(14, 22, 68, 52, 10) : ctx.rect(14, 22, 68, 52);
    st(ctx, COLORS.yellow, 4);
    ctx.beginPath();
    ctx.moveTo(40, 34);
    ctx.lineTo(62, 48);
    ctx.lineTo(40, 62);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  icon('pause', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(36, 26);
    ctx.lineTo(36, 70);
    ctx.moveTo(60, 26);
    ctx.lineTo(60, 70);
    st(ctx, COLORS.cyan, 9);
  });
  icon('sound', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(16, 38);
    ctx.lineTo(30, 38);
    ctx.lineTo(48, 22);
    ctx.lineTo(48, 74);
    ctx.lineTo(30, 58);
    ctx.lineTo(16, 58);
    ctx.closePath();
    st(ctx, COLORS.cyan, 4);
    ctx.beginPath();
    ctx.arc(52, 48, 14, -0.8, 0.8);
    ctx.moveTo(52 + Math.cos(-0.8) * 26, 48 + Math.sin(-0.8) * 26);
    ctx.arc(52, 48, 26, -0.8, 0.8);
    st(ctx, COLORS.cyan, 4);
  });
  icon('fire', (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 26, 0, Math.PI * 2);
    st(ctx, COLORS.pink, 4);
    ctx.beginPath();
    ctx.moveTo(48, 12);
    ctx.lineTo(48, 30);
    ctx.moveTo(48, 66);
    ctx.lineTo(48, 84);
    ctx.moveTo(12, 48);
    ctx.lineTo(30, 48);
    ctx.moveTo(66, 48);
    ctx.lineTo(84, 48);
    st(ctx, COLORS.pink, 4);
    ctx.beginPath();
    ctx.arc(48, 48, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  icon('spin', (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 26, -0.4, Math.PI * 1.4);
    st(ctx, COLORS.green, 5);
    ctx.beginPath();
    ctx.moveTo(70, 26);
    ctx.lineTo(72, 40);
    ctx.lineTo(58, 38);
    st(ctx, COLORS.green, 5);
  });
  icon('skull', (ctx) => {
    poly(ctx, 48, 50, 30, 3, -Math.PI / 2);
    st(ctx, COLORS.pink, 4);
    ctx.beginPath();
    ctx.arc(48, 56, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  icon('close', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(28, 28);
    ctx.lineTo(68, 68);
    ctx.moveTo(68, 28);
    ctx.lineTo(28, 68);
    st(ctx, COLORS.cyan, 7);
  });
  icon('plus', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(48, 22);
    ctx.lineTo(48, 74);
    ctx.moveTo(22, 48);
    ctx.lineTo(74, 48);
    st(ctx, 0xffffff, 8);
  });
  icon('crown', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(16, 70);
    ctx.lineTo(20, 30);
    ctx.lineTo(36, 48);
    ctx.lineTo(48, 22);
    ctx.lineTo(60, 48);
    ctx.lineTo(76, 30);
    ctx.lineTo(80, 70);
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.yellow, 0.3);
    ctx.fill();
    st(ctx, COLORS.yellow, 4);
  });
}
