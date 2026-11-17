// Рисование карт: лицо (крупный индекс, классическая раскладка значков, картинки с портретами), рубашки в народных стилях.
import { suit, rank } from './core.js';
import { rng } from './core.js';

const FONT = 'Nunito, "Arial Rounded MT Bold", Arial, sans-serif';
const HEAD = '"Yeseva One", Georgia, serif';
const P2 = Math.PI * 2;

export const COLORS2 = ['#d22f3a', '#d22f3a', '#1f2433', '#1f2433'];
export const COLORS4 = ['#d22f3a', '#1d6fd0', '#22883a', '#1f2433'];
const LABEL = {
  ru: { 11: 'В', 12: 'Д', 13: 'К', 14: 'Т' },
  en: { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' },
};
export const rankLabel = (r, lang) => (r <= 10 ? String(r) : LABEL[lang === 'ru' ? 'ru' : 'en'][r]);

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// масти путями: 0 ♥, 1 ♦, 2 ♣, 3 ♠ (size — полная высота)
export function suitPath(ctx, s, cx, cy, size) {
  const k = size / 2;
  ctx.beginPath();
  if (s === 0) {
    ctx.moveTo(cx, cy + k * 0.92);
    ctx.bezierCurveTo(cx - k * 0.35, cy + k * 0.55, cx - k * 1.05, cy + k * 0.15, cx - k * 0.98, cy - k * 0.38);
    ctx.bezierCurveTo(cx - k * 0.9, cy - k * 1.02, cx - k * 0.12, cy - k * 1.0, cx, cy - k * 0.48);
    ctx.bezierCurveTo(cx + k * 0.12, cy - k * 1.0, cx + k * 0.9, cy - k * 1.02, cx + k * 0.98, cy - k * 0.38);
    ctx.bezierCurveTo(cx + k * 1.05, cy + k * 0.15, cx + k * 0.35, cy + k * 0.55, cx, cy + k * 0.92);
  } else if (s === 1) {
    ctx.moveTo(cx, cy - k);
    ctx.quadraticCurveTo(cx + k * 0.38, cy - k * 0.35, cx + k * 0.8, cy);
    ctx.quadraticCurveTo(cx + k * 0.38, cy + k * 0.35, cx, cy + k);
    ctx.quadraticCurveTo(cx - k * 0.38, cy + k * 0.35, cx - k * 0.8, cy);
    ctx.quadraticCurveTo(cx - k * 0.38, cy - k * 0.35, cx, cy - k);
  } else if (s === 2) {
    const r = k * 0.42;
    ctx.arc(cx, cy - k * 0.47, r, 0, P2);
    ctx.moveTo(cx - k * 0.47 + r, cy + k * 0.1);
    ctx.arc(cx - k * 0.47, cy + k * 0.1, r, 0, P2);
    ctx.moveTo(cx + k * 0.47 + r, cy + k * 0.1);
    ctx.arc(cx + k * 0.47, cy + k * 0.1, r, 0, P2);
    ctx.moveTo(cx + k * 0.12, cy - k * 0.1);
    ctx.quadraticCurveTo(cx + k * 0.12, cy + k * 0.68, cx + k * 0.4, cy + k * 0.96);
    ctx.lineTo(cx - k * 0.4, cy + k * 0.96);
    ctx.quadraticCurveTo(cx - k * 0.12, cy + k * 0.68, cx - k * 0.12, cy - k * 0.1);
  } else {
    ctx.moveTo(cx, cy - k);
    ctx.bezierCurveTo(cx + k * 0.25, cy - k * 0.6, cx + k * 1.05, cy - k * 0.2, cx + k * 0.95, cy + k * 0.3);
    ctx.bezierCurveTo(cx + k * 0.85, cy + k * 0.78, cx + k * 0.3, cy + k * 0.72, cx + k * 0.1, cy + k * 0.38);
    ctx.quadraticCurveTo(cx + k * 0.12, cy + k * 0.75, cx + k * 0.4, cy + k * 0.96);
    ctx.lineTo(cx - k * 0.4, cy + k * 0.96);
    ctx.quadraticCurveTo(cx - k * 0.12, cy + k * 0.75, cx - k * 0.1, cy + k * 0.38);
    ctx.bezierCurveTo(cx - k * 0.3, cy + k * 0.72, cx - k * 0.85, cy + k * 0.78, cx - k * 0.95, cy + k * 0.3);
    ctx.bezierCurveTo(cx - k * 1.05, cy - k * 0.2, cx - k * 0.25, cy - k * 0.6, cx, cy - k);
  }
  ctx.closePath();
}

// раскладка значков для 2..10 (доли ширины/высоты внутреннего поля)
const PIPS = {
  2: [[0.5, 0], [0.5, 1]],
  3: [[0.5, 0], [0.5, 0.5], [0.5, 1]],
  4: [[0, 0], [1, 0], [0, 1], [1, 1]],
  5: [[0, 0], [1, 0], [0.5, 0.5], [0, 1], [1, 1]],
  6: [[0, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [1, 1]],
  7: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0, 1], [1, 1]],
  8: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0.5, 0.75], [0, 1], [1, 1]],
  9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [0.5, 0.5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
  10: [[0, 0], [1, 0], [0.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [0.5, 5 / 6], [0, 1], [1, 1]],
};

// ---------- рубашки ----------
export const BACKS = {
  classic: { price: 0 },
  blue: { price: 600 },
  gzhel: { price: 1200 },
  khokhloma: { price: 2000 },
  birch: { price: 3000 },
  stars: { price: 4500 },
};
export const BACK_ORDER = Object.keys(BACKS);

// ---------- столы ----------
export const CLOTHS = {
  felt: { price: 0 },
  check: { price: 800 },
  lemon: { price: 1500 },
  lace: { price: 2500 },
  walnut: { price: 3500 },
  velvet: { price: 5000 },
};
export const CLOTH_ORDER = Object.keys(CLOTHS);

function petal(ctx, x, y, len, wid, ang) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(wid, -len * 0.5, 0, -len);
  ctx.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
  ctx.restore();
}

export function drawBack(ctx, style, w, h) {
  const r = w * 0.09;
  ctx.save();
  rr(ctx, 0, 0, w, h, r);
  ctx.clip();
  const m = w * 0.075;
  const iw = w - m * 2, ih = h - m * 2;
  if (style === 'classic' || style === 'blue') {
    const c1 = style === 'classic' ? '#b8323a' : '#2f5fa8', c2 = style === 'classic' ? '#8e1f28' : '#1f3f7a', c3 = style === 'classic' ? '#e9a24a' : '#a9c8f0';
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = c1;
    rr(ctx, m, m, iw, ih, r * 0.6);
    ctx.fill();
    // ромбическая решётка
    ctx.save();
    rr(ctx, m, m, iw, ih, r * 0.6);
    ctx.clip();
    ctx.strokeStyle = c2;
    ctx.lineWidth = w * 0.025;
    const s = w * 0.14;
    for (let x = -h; x < w + h; x += s) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.moveTo(x, h);
      ctx.lineTo(x + h, 0);
      ctx.stroke();
    }
    ctx.fillStyle = c3;
    for (let y = 0; y < h + s; y += s / 2) for (let x = 0; x < w + s; x += s) {
      const ox = (Math.round(y / (s / 2)) % 2) * (s / 2);
      ctx.beginPath();
      ctx.arc(x + ox, y, w * 0.018, 0, P2);
      ctx.fill();
    }
    ctx.restore();
    // медальон
    ctx.fillStyle = '#fbf6ea';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.24, w * 0.3, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = c2;
    ctx.lineWidth = w * 0.03;
    ctx.stroke();
    ctx.fillStyle = c1;
    for (let k = 0; k < 4; k++) {
      suitPath(ctx, k, w / 2 + Math.cos((k * P2) / 4 - Math.PI / 4) * w * 0.1, h / 2 + Math.sin((k * P2) / 4 - Math.PI / 4) * w * 0.12, w * 0.13);
      ctx.fill();
    }
  } else if (style === 'gzhel') {
    ctx.fillStyle = '#f7f9ff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1d4fa8';
    ctx.lineWidth = w * 0.03;
    rr(ctx, m, m, iw, ih, r * 0.6);
    ctx.stroke();
    ctx.lineWidth = w * 0.012;
    rr(ctx, m * 1.7, m * 1.7, w - m * 3.4, h - m * 3.4, r * 0.4);
    ctx.stroke();
    // крупный цветок гжели в центре и бутоны по углам
    const flower = (cx, cy, R, n) => {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * P2;
        petal(ctx, cx, cy, R, R * 0.55, a);
        const gr = ctx.createLinearGradient(cx, cy, cx + Math.sin(a) * R, cy - Math.cos(a) * R);
        gr.addColorStop(0, '#0f3a8a');
        gr.addColorStop(1, '#6f9be0');
        ctx.fillStyle = gr;
        ctx.fill();
      }
      ctx.fillStyle = '#0f3a8a';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.22, 0, P2);
      ctx.fill();
    };
    ctx.strokeStyle = '#2a5cb8';
    ctx.lineWidth = w * 0.018;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.5);
    ctx.quadraticCurveTo(w * 0.2, h * 0.38, w * 0.3, h * 0.2);
    ctx.moveTo(w * 0.5, h * 0.5);
    ctx.quadraticCurveTo(w * 0.8, h * 0.62, w * 0.7, h * 0.8);
    ctx.stroke();
    for (const [x, y, a] of [[0.27, 0.36, -0.6], [0.73, 0.64, 2.5], [0.38, 0.72, 2.0], [0.62, 0.28, -1.0]]) {
      petal(ctx, w * x, h * y, w * 0.14, w * 0.06, a);
      ctx.fillStyle = '#3c6fc8';
      ctx.fill();
    }
    flower(w / 2, h / 2, w * 0.2, 7);
    flower(w * 0.3, h * 0.2, w * 0.08, 5);
    flower(w * 0.7, h * 0.8, w * 0.08, 5);
  } else if (style === 'khokhloma') {
    ctx.fillStyle = '#1b1410';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e8b13a';
    ctx.lineWidth = w * 0.03;
    rr(ctx, m, m, iw, ih, r * 0.6);
    ctx.stroke();
    // завиток-стебель
    ctx.strokeStyle = '#e8b13a';
    ctx.lineWidth = w * 0.022;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.9);
    ctx.bezierCurveTo(w * 0.9, h * 0.7, w * 0.1, h * 0.35, w * 0.75, h * 0.12);
    ctx.stroke();
    // листья золотом
    const leaves = [[0.32, 0.8, -0.8], [0.62, 0.68, 1.6], [0.42, 0.52, -1.4], [0.55, 0.36, 1.2], [0.4, 0.24, -1.0], [0.66, 0.18, 1.0]];
    for (const [x, y, a] of leaves) {
      petal(ctx, w * x, h * y, w * 0.18, w * 0.08, a);
      ctx.fillStyle = '#e8b13a';
      ctx.fill();
    }
    // ягоды рябины
    for (const [x, y] of [[0.5, 0.5], [0.56, 0.55], [0.47, 0.57], [0.3, 0.33], [0.36, 0.3], [0.7, 0.42], [0.66, 0.85], [0.6, 0.88]]) {
      ctx.fillStyle = '#d22a1e';
      ctx.beginPath();
      ctx.arc(w * x, h * y, w * 0.045, 0, P2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,180,.7)';
      ctx.beginPath();
      ctx.arc(w * x - w * 0.012, h * y - w * 0.014, w * 0.012, 0, P2);
      ctx.fill();
    }
  } else if (style === 'birch') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6aa84f');
    g.addColorStop(1, '#3f7a34');
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = g;
    rr(ctx, m, m, iw, ih, r * 0.6);
    ctx.fill();
    // берёзовые стволы
    const R = rng(11);
    for (const x of [0.28, 0.5, 0.72]) {
      ctx.fillStyle = '#f4f1e8';
      ctx.fillRect(w * x - w * 0.045, m, w * 0.09, ih);
      ctx.fillStyle = '#2a2a2a';
      for (let y = m + 4; y < h - m; y += w * 0.12) {
        ctx.fillRect(w * x - w * 0.045 + R() * w * 0.04, y + R() * w * 0.06, w * (0.02 + R() * 0.04), w * 0.012);
      }
    }
    for (let k = 0; k < 18; k++) {
      petal(ctx, w * (0.15 + R() * 0.7), h * (0.1 + R() * 0.8), w * 0.08, w * 0.04, R() * P2);
      ctx.fillStyle = R() < 0.5 ? '#a6d86e' : '#f2c84a';
      ctx.fill();
    }
  } else {
    // звёздное небо
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1d2a5c');
    g.addColorStop(1, '#0f1636');
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = g;
    rr(ctx, m, m, iw, ih, r * 0.6);
    ctx.fill();
    const R = rng(5);
    const star = (x, y, s) => {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * P2 - Math.PI / 2;
        const rad = k % 2 ? s * 0.42 : s;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = '#ffd35a';
    for (let k = 0; k < 16; k++) star(m + R() * iw, m + R() * ih, w * (0.025 + R() * 0.04));
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, w * 0.17, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#16204a';
    ctx.beginPath();
    ctx.arc(w * 0.57, h * 0.47, w * 0.15, 0, P2);
    ctx.fill();
  }
  ctx.restore();
  ctx.lineWidth = Math.max(1, w * 0.016);
  ctx.strokeStyle = 'rgba(40,30,20,.35)';
  rr(ctx, 0.5, 0.5, w - 1, h - 1, r);
  ctx.stroke();
}

// портрет для картинок: голова, головной убор, одежда цвета масти
function court(ctx, r, s, x, y, w, h, col) {
  const cx = x + w / 2;
  const robe = ['#d9434c', '#e0703a', '#3f8a52', '#3d4f8a'][s];
  const robe2 = ['#9e2731', '#a8481c', '#25603a', '#25305e'][s];
  const hair = r === 13 ? '#8a8f9a' : r === 12 ? '#c48a3a' : '#6a3d1c';
  // фон-рамка
  const bg = ctx.createLinearGradient(0, y, 0, y + h);
  bg.addColorStop(0, s < 2 ? '#fde9e2' : '#e8edf8');
  bg.addColorStop(1, s < 2 ? '#f8d6cc' : '#d6def0');
  ctx.fillStyle = bg;
  rr(ctx, x, y, w, h, w * 0.08);
  ctx.fill();
  ctx.save();
  rr(ctx, x, y, w, h, w * 0.08);
  ctx.clip();
  const u = w / 10;
  const hy = y + h * 0.44;
  // плечи и одежда
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(cx - u * 4.6, y + h);
  ctx.quadraticCurveTo(cx - u * 4.4, hy + u * 2.4, cx - u * 1.6, hy + u * 2.1);
  ctx.lineTo(cx + u * 1.6, hy + u * 2.1);
  ctx.quadraticCurveTo(cx + u * 4.4, hy + u * 2.4, cx + u * 4.6, y + h);
  ctx.closePath();
  ctx.fill();
  // воротник и узор
  ctx.fillStyle = '#f5c03c';
  ctx.beginPath();
  ctx.moveTo(cx - u * 1.9, hy + u * 2.05);
  ctx.lineTo(cx, hy + u * 3.6);
  ctx.lineTo(cx + u * 1.9, hy + u * 2.05);
  ctx.lineTo(cx + u * 1.2, hy + u * 1.8);
  ctx.lineTo(cx, hy + u * 2.7);
  ctx.lineTo(cx - u * 1.2, hy + u * 1.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = robe2;
  for (const dx of [-3, -1.8, 1.8, 3]) {
    ctx.beginPath();
    ctx.arc(cx + dx * u, hy + u * 3.8 + Math.abs(dx) * u * 0.15, u * 0.32, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = col;
  suitPath(ctx, s, cx, hy + u * 4.6, u * 1.4);
  ctx.fill();
  // шея и голова
  ctx.fillStyle = '#f2c7a5';
  ctx.fillRect(cx - u * 0.6, hy + u * 1.1, u * 1.2, u * 1.2);
  // волосы сзади (у дамы длинные)
  ctx.fillStyle = hair;
  if (r === 12) {
    ctx.beginPath();
    ctx.ellipse(cx, hy + u * 0.6, u * 2.1, u * 2.3, 0, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = '#f6d2b3';
  ctx.beginPath();
  ctx.ellipse(cx, hy, u * 1.55, u * 1.75, 0, 0, P2);
  ctx.fill();
  // причёска
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(cx, hy - u * 1.0, u * 1.6, u * 0.85, 0, Math.PI, P2);
  ctx.fill();
  if (r === 13) {
    // борода короля
    ctx.beginPath();
    ctx.moveTo(cx - u * 1.45, hy + u * 0.2);
    ctx.quadraticCurveTo(cx - u * 1.3, hy + u * 2.4, cx, hy + u * 2.5);
    ctx.quadraticCurveTo(cx + u * 1.3, hy + u * 2.4, cx + u * 1.45, hy + u * 0.2);
    ctx.quadraticCurveTo(cx, hy + u * 1.2, cx - u * 1.45, hy + u * 0.2);
    ctx.fill();
    ctx.fillStyle = '#f6d2b3';
    ctx.beginPath();
    ctx.ellipse(cx, hy + u * 0.95, u * 0.45, u * 0.2, 0, 0, P2);
    ctx.fill();
  }
  // лицо: глаза, щёки, улыбка
  ctx.fillStyle = '#3a2516';
  for (const dx of [-0.55, 0.55]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * u, hy - u * 0.05, u * 0.17, u * 0.22, 0, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(232,110,110,.45)';
  for (const dx of [-0.95, 0.95]) {
    ctx.beginPath();
    ctx.arc(cx + dx * u, hy + u * 0.45, u * 0.3, 0, P2);
    ctx.fill();
  }
  if (r !== 13) {
    ctx.strokeStyle = '#a0503a';
    ctx.lineWidth = u * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, hy + u * 0.45, u * 0.38, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  // головной убор
  ctx.lineJoin = 'round';
  ctx.lineWidth = u * 0.2;
  if (r === 13) {
    ctx.fillStyle = '#f5c03c';
    ctx.strokeStyle = '#b07a12';
    const cy = hy - u * 1.75;
    ctx.beginPath();
    ctx.moveTo(cx - u * 1.6, cy + u * 0.6);
    ctx.lineTo(cx - u * 1.85, cy - u * 1.0);
    ctx.lineTo(cx - u * 0.85, cy - u * 0.1);
    ctx.lineTo(cx, cy - u * 1.3);
    ctx.lineTo(cx + u * 0.85, cy - u * 0.1);
    ctx.lineTo(cx + u * 1.85, cy - u * 1.0);
    ctx.lineTo(cx + u * 1.6, cy + u * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.arc(cx, cy + u * 0.1, u * 0.3, 0, P2);
    ctx.fill();
  } else if (r === 12) {
    ctx.fillStyle = '#f5c03c';
    ctx.strokeStyle = '#b07a12';
    const cy = hy - u * 1.55;
    ctx.beginPath();
    ctx.moveTo(cx - u * 1.5, cy + u * 0.5);
    ctx.quadraticCurveTo(cx - u * 1.1, cy - u * 0.5, cx, cy - u * 0.9);
    ctx.quadraticCurveTo(cx + u * 1.1, cy - u * 0.5, cx + u * 1.5, cy + u * 0.5);
    ctx.quadraticCurveTo(cx, cy + u * 0.1, cx - u * 1.5, cy + u * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.ellipse(cx, cy - u * 0.25, u * 0.25, u * 0.33, 0, 0, P2);
    ctx.fill();
  } else {
    // берет с пером
    ctx.fillStyle = robe;
    ctx.strokeStyle = robe2;
    ctx.beginPath();
    ctx.ellipse(cx - u * 0.1, hy - u * 1.45, u * 2.0, u * 0.85, -0.12, Math.PI * 0.92, Math.PI * 2.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f5c03c';
    rr(ctx, cx - u * 1.75, hy - u * 1.6, u * 3.5, u * 0.45, u * 0.2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c8c8c8';
    ctx.beginPath();
    ctx.moveTo(cx + u * 0.9, hy - u * 1.7);
    ctx.quadraticCurveTo(cx + u * 2.9, hy - u * 2.6, cx + u * 2.6, hy - u * 3.6);
    ctx.quadraticCurveTo(cx + u * 1.5, hy - u * 2.8, cx + u * 0.9, hy - u * 1.7);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = w * 0.025;
  rr(ctx, x, y, w, h, w * 0.08);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawFace(ctx, c, w, h, { four = false, lang = 'ru' } = {}) {
  const s = suit(c), r = rank(c);
  const col = (four ? COLORS4 : COLORS2)[s];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#fffefa');
  g.addColorStop(1, '#f6efdf');
  ctx.fillStyle = g;
  rr(ctx, 0.5, 0.5, w - 1, h - 1, w * 0.09);
  ctx.fill();
  ctx.lineWidth = Math.max(1, w * 0.016);
  ctx.strokeStyle = 'rgba(60,45,30,.35)';
  ctx.stroke();
  const label = rankLabel(r, lang);
  // крупный индекс: видно, даже когда карты в руке перекрываются
  ctx.fillStyle = col;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const ix = w * 0.165;
  ctx.font = `900 ${w * (label.length > 1 ? 0.26 : 0.3)}px ${FONT}`;
  if (label.length > 1) {
    ctx.save();
    ctx.translate(ix + w * 0.005, w * 0.3);
    ctx.scale(0.86, 1);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  } else ctx.fillText(label, ix, w * 0.3);
  suitPath(ctx, s, ix, w * 0.44, w * 0.2);
  ctx.fill();
  // нижний индекс (перевёрнутый)
  ctx.save();
  ctx.translate(w, h);
  ctx.rotate(Math.PI);
  ctx.font = `900 ${w * 0.17}px ${FONT}`;
  ctx.fillText(label, w * 0.11, w * 0.19);
  suitPath(ctx, s, w * 0.11, w * 0.28, w * 0.12);
  ctx.fill();
  ctx.restore();
  // центр
  const y0 = h * 0.15, y1 = h * 0.8;
  if (r >= 11 && r <= 13) {
    court(ctx, r, s, w * 0.29, h * 0.07, w * 0.64, h * 0.76, col);
  } else if (r === 14) {
    // туз: большой значок с золотым ободком
    ctx.fillStyle = '#f5c03c';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(w * 0.56, h * 0.5, w * 0.31, 0, P2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#d9a12a';
    ctx.lineWidth = w * 0.015;
    ctx.beginPath();
    ctx.arc(w * 0.56, h * 0.5, w * 0.31, 0, P2);
    ctx.stroke();
    ctx.fillStyle = col;
    suitPath(ctx, s, w * 0.56, h * 0.5, w * 0.44);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    suitPath(ctx, s, w * 0.53, h * 0.47, w * 0.16);
    ctx.fill();
  } else {
    const pts = PIPS[r] || [];
    const ps = w * (r >= 9 ? 0.17 : 0.2);
    const px0 = w * 0.37, px1 = w * 0.71;
    for (const [fx, fy] of pts) {
      const x = px0 + (px1 - px0) * fx, y = y0 + (y1 - y0) * fy;
      ctx.save();
      ctx.translate(x, y);
      if (fy > 0.5) ctx.rotate(Math.PI);
      ctx.fillStyle = col;
      suitPath(ctx, s, 0, 0, ps);
      ctx.fill();
      ctx.restore();
    }
  }
}

// кэш спрайтов по размеру
export class CardArt {
  constructor() {
    this.cache = new Map();
    this.w = 0;
    this.dpr = 1;
    this.back = 'classic';
    this.four = false;
    this.lang = 'ru';
  }
  setup(w, dpr, back, four, lang) {
    w = Math.round(w);
    if (w === this.w && dpr === this.dpr && back === this.back && four === this.four && lang === this.lang) return;
    this.w = w;
    this.h = Math.round(w * 1.42);
    this.dpr = dpr;
    this.back = back;
    this.four = four;
    this.lang = lang;
    this.cache.clear();
  }
  mk() {
    const c = document.createElement('canvas');
    c.width = Math.ceil(this.w * this.dpr);
    c.height = Math.ceil(this.h * this.dpr);
    const ctx = c.getContext('2d');
    ctx.scale(this.dpr, this.dpr);
    return [c, ctx];
  }
  face(id) {
    const k = 'f' + id;
    let c = this.cache.get(k);
    if (!c) {
      const [cv, ctx] = this.mk();
      drawFace(ctx, id, this.w, this.h, { four: this.four, lang: this.lang });
      this.cache.set(k, (c = cv));
    }
    return c;
  }
  backImg() {
    let c = this.cache.get('b');
    if (!c) {
      const [cv, ctx] = this.mk();
      drawBack(ctx, this.back, this.w, this.h);
      this.cache.set('b', (c = cv));
    }
    return c;
  }
}

// превью для магазина
export function backPreview(style, w = 90) {
  const h = Math.round(w * 1.42);
  const c = document.createElement('canvas');
  c.width = w * 2;
  c.height = h * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  drawBack(ctx, style, w, h);
  return c.toDataURL();
}
