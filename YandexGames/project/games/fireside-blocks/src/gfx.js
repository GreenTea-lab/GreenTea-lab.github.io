// Процедурная графика: текстуры дерева, деревянные бруски, значки предметов.
import { rng } from './core.js';
import {NEW_SKINS,material} from './materials.js';

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
export const rgba = (h, a) => {
  const [r, g, b] = hex(h);
  return `rgba(${r},${g},${b},${a})`;
};

// волокна дерева: тонкие волнистые линии вдоль dir ('h' — по горизонтали)
export function grain(ctx, x, y, w, h, { seed = 1, color = '#000', alpha = 0.12, dir = 'h', density = 1, knots = true, scale = 1 } = {}) {
  const R = rng(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const L = dir === 'h' ? w : h;
  const T = dir === 'h' ? h : w;
  const lines = Math.max(4, Math.round((T / (3.2 * scale)) * density));
  const kx = [];
  if (knots && L > 120 * scale) {
    const nk = R() < 0.6 ? 1 : 0;
    for (let i = 0; i < nk; i++) kx.push([R() * L, R() * T, (6 + R() * 10) * scale]);
  }
  const ph1 = R() * 10, ph2 = R() * 10, f1 = (0.004 + R() * 0.006) / scale, f2 = (0.013 + R() * 0.01) / scale;
  for (let i = 0; i < lines; i++) {
    const base = (i + R() * 0.8) * (T / lines);
    const amp = (1.5 + R() * 3) * scale;
    ctx.beginPath();
    for (let s = 0; s <= L; s += 6 * scale) {
      let off = Math.sin(s * f1 + ph1 + i * 0.15) * amp * 1.6 + Math.sin(s * f2 + ph2 + i * 0.4) * amp * 0.5;
      // волокна огибают сучок
      for (const [kxp, kyp, kr] of kx) {
        const dx = s - kxp, dy = base - kyp;
        const d2 = dx * dx + dy * dy;
        const infl = Math.exp(-d2 / (kr * kr * 9)) * kr * 2.2;
        off += dy >= 0 ? infl : -infl;
      }
      const px = dir === 'h' ? x + s : x + base + off;
      const py = dir === 'h' ? y + base + off : y + s;
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * (0.35 + R() * 0.9);
    ctx.lineWidth = (0.6 + R() * 1.4) * scale;
    ctx.stroke();
  }
  for (const [kxp, kyp, kr] of kx) {
    const cx = dir === 'h' ? x + kxp : x + kyp;
    const cy = dir === 'h' ? y + kyp : y + kxp;
    ctx.globalAlpha = alpha * 1.6;
    for (let r = kr; r > 1; r -= 2.2 * scale) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, dir === 'h' ? r * 1.7 : r * 0.7, dir === 'h' ? r * 0.7 : r * 1.7, 0, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
    }
    ctx.globalAlpha = alpha * 2.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, dir === 'h' ? kr * 0.5 : kr * 0.25, dir === 'h' ? kr * 0.25 : kr * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- наборы брусков ----------
// у каждого набора 8 цветов: 0..6 — фигуры, 7 — «старый брусок» стартовых раскладок
export const STYLES = {
  painted: { cols: ['#e0574c', '#f39237', '#f3c13a', '#72b043', '#3f8fd8', '#9a68cf', '#2fb3a6', '#b98a5a'], grain: 0.26, paint: true },
  natural: { cols: ['#e8cf9c', '#d9a868', '#b9773f', '#8a5634', '#c99b6d', '#a8693e', '#6e4128', '#9c7b55'], grain: 0.3, paint: false },
  khokhloma: { cols: ['#c8261e', '#1d1a19', '#d9a019', '#c8261e', '#1d1a19', '#d9a019', '#a81f18', '#7a5a3a'], grain: 0.1, paint: true, pattern: 'khokh' },
  pastel: { cols: ['#f2a3a0', '#f7c08a', '#f4dd8a', '#b3d99a', '#9cc6ec', '#c9aee8', '#93d8cf', '#cdb497'], grain: 0.22, paint: true },
  knit: { cols: ['#d94a4a', '#f08a3a', '#f2c848', '#6aaa48', '#4a8ad6', '#9a64c8', '#34aaa0', '#b89066'], grain: 0.04, pattern: 'knit', matte: true },
  candy: { cols: ['#ff4f6a', '#ff9a2e', '#ffd93a', '#5ccf55', '#33a8f0', '#b76af0', '#2fd6c4', '#d8a070'], grain: 0.03, pattern: 'candy', glossy: true },
  pebble: { cols: ['#c4786a', '#d49a62', '#d8c078', '#8aa874', '#7a98b8', '#9a86b0', '#74aaa0', '#a89c8c'], grain: 0.03, pattern: 'pebble', matte: true, round: 0.3 },
  gzhel: { cols: ['#c4d8ff', '#ffd0c2', '#ffe8a0', '#c6ecb8', '#dac4f2', '#b8eae4', '#f4c2d6', '#d8ccb8'], grain: 0.04, pattern: 'gzhel', glossy: true },
  gem: { cols: ['#e0314f', '#f27a1a', '#f0c020', '#2eb86a', '#2e7ae0', '#8a46d0', '#10b4b8', '#8a8aa0'], grain: 0, pattern: 'gem', glossy: true },
  ebony: { cols: ['#7a1a2a', '#7a3a14', '#6a5a14', '#1a5a3a', '#1a3a7a', '#4a1a6a', '#14585e', '#3a2a22'], grain: 0.22, pattern: 'inlay' },
};
export const STYLE_ORDER = ['painted',...NEW_SKINS,'natural', 'pastel', 'khokhloma', 'knit', 'candy', 'pebble', 'gzhel', 'gem', 'ebony'];
const bright=['#d85b65','#e8a04e','#d8bb4d','#78b184','#628fca','#ac7eba','#56aca9','#aa8965'];
for(const id of NEW_SKINS)STYLES[id]={cols:bright.map((c,i)=>id==='copper'?['#bd7958','#d0a66e','#bf9562','#85a58a','#758fba','#ad829c','#76aead','#aa8165'][i]:id==='cosmos'?mix(c,'#112139',.55):id==='pearl'?mix(c,'#fff4ed',.55):id==='denim'?mix(c,'#23416a',.35):id==='frost'?mix(c,'#d7f1ff',.5):c),grain:0,pattern:'v2-'+id,glossy:['pearl','frost','stained','copper','marble','ceramic'].includes(id),matte:['denim','embroidery','patchwork'].includes(id)};

const cache = new Map();
export function blockSprite(style, ci, S) {
  S = Math.round(S);
  const key = style + ci + '_' + S;
  if (cache.has(key)) return cache.get(key);
  const st = STYLES[style] || STYLES.painted;
  const base = st.cols[ci] || st.cols[0];
  const c = canvas(S, S);
  const g = c.getContext('2d');
  const r = S * (st.round || 0.16);
  const pad = S * 0.035;
  // тень под бруском
  g.fillStyle = 'rgba(40,20,5,.35)';
  roundRect(g, pad, pad + S * 0.03, S - pad * 2, S - pad * 2, r);
  g.fill();
  // корпус
  const body = g.createLinearGradient(0, 0, S, S);
  body.addColorStop(0, mix(base, '#ffffff', 0.22));
  body.addColorStop(0.55, base);
  body.addColorStop(1, mix(base, '#2a1406', 0.28));
  g.fillStyle = body;
  roundRect(g, pad, pad, S - pad * 2, S - pad * 2.6, r);
  g.fill();
  // волокна дерева сквозь краску
  g.save();
  roundRect(g, pad, pad, S - pad * 2, S - pad * 2.6, r);
  g.clip();
  grain(g, 0, 0, S, S, { seed: ci * 17 + 3, color: mix(base, '#2a1406', 0.6), alpha: st.grain, dir: ci % 2 ? 'h' : 'v', density: 1.3, knots: false, scale: S / 64 });
  // светлая верхняя грань и тёмная нижняя (фаска)
  const bev = S * 0.11;
  g.fillStyle = 'rgba(255,255,255,.28)';
  g.beginPath();
  g.moveTo(pad, pad);
  g.lineTo(S - pad, pad);
  g.lineTo(S - pad - bev, pad + bev);
  g.lineTo(pad + bev, pad + bev);
  g.lineTo(pad + bev, S - pad - bev);
  g.lineTo(pad, S - pad);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(40,18,4,.26)';
  g.beginPath();
  g.moveTo(S - pad, pad);
  g.lineTo(S - pad, S - pad);
  g.lineTo(pad, S - pad);
  g.lineTo(pad + bev, S - pad - bev);
  g.lineTo(S - pad - bev, S - pad - bev);
  g.lineTo(S - pad - bev, pad + bev);
  g.closePath();
  g.fill();
  // лицевая грань чуть светлее в центре
  const face = g.createRadialGradient(S * 0.4, S * 0.38, 0, S * 0.5, S * 0.5, S * 0.55);
  face.addColorStop(0, 'rgba(255,255,255,.16)');
  face.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = face;
  g.fillRect(pad + bev, pad + bev, S - 2 * (pad + bev), S - 2 * (pad + bev));
  g.save();
  roundRect(g,pad+bev,pad+bev,S-2*(pad+bev),S-pad*2.6-bev*2,S*.07);
  g.clip();
  if (st.pattern === 'khokh') khokhloma(g, S, ci, base);
  else if(st.pattern?.startsWith('v2-'))material(g,S,st.pattern.slice(3),base);
  else if (st.pattern) PATTERNS[st.pattern](g, S, ci, base, pad + bev);
  const finish=g.createLinearGradient(0,0,S*.85,S);
  finish.addColorStop(0,'rgba(255,226,179,.18)');finish.addColorStop(.4,'rgba(255,226,179,0)');finish.addColorStop(1,'rgba(43,20,10,.19)');
  g.fillStyle=finish;g.fillRect(0,0,S,S);
  g.restore();
  // Узоры остаются на лицевой части и больше не закрашивают объёмную фаску.
  g.strokeStyle=rgba(mix(base,'#fff0c7',.65),.65);g.lineWidth=Math.max(.7,S*.016);
  g.beginPath();g.moveTo(pad+bev,pad+bev);g.lineTo(S-pad-bev,pad+bev);g.stroke();
  g.restore();
  // тонкий контур
  g.strokeStyle = rgba(mix(base, '#2a1406', 0.65), 0.55);
  g.lineWidth = Math.max(1, S * 0.025);
  roundRect(g, pad, pad, S - pad * 2, S - pad * 2.6, r);
  g.stroke();
  // блик лака
  if (!st.matte) {
    g.fillStyle = st.glossy ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.22)';
    g.beginPath();
    g.ellipse(S * 0.3, S * 0.24, S * (st.glossy ? 0.13 : 0.1), S * (st.glossy ? 0.05 : 0.04), -0.5, 0, Math.PI * 2);
    g.fill();
  }
  cache.set(key, c);
  return c;
}

// узоры новых наборов: рисуются внутри клипа корпуса, in — отступ лицевой грани
const PATTERNS = {
  // вязаное полотно: ёлочка из петелек
  knit(g, S, ci, base) {
    const st = S * 0.115;
    g.lineCap = 'round';
    for (let y = S * 0.1; y < S; y += st) {
      for (let x = S * 0.06 + ((Math.round(y / st) % 2) * st) / 2; x < S; x += st) {
        g.lineWidth = S * 0.04;
        g.strokeStyle = rgba(mix(base, '#2a1406', 0.45), 0.5);
        g.beginPath();
        g.moveTo(x - st * 0.4, y - st * 0.2);
        g.lineTo(x, y + st * 0.28);
        g.lineTo(x + st * 0.4, y - st * 0.2);
        g.stroke();
        g.lineWidth = S * 0.028;
        g.strokeStyle = rgba(mix(base, '#ffffff', 0.5), 0.5);
        g.beginPath();
        g.moveTo(x - st * 0.4, y - st * 0.26);
        g.lineTo(x, y + st * 0.2);
        g.lineTo(x + st * 0.4, y - st * 0.26);
        g.stroke();
      }
    }
  },
  // леденец: спиральные полоски и сильный блеск
  candy(g, S, ci, base) {
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(-Math.PI / 4);
    g.fillStyle = 'rgba(255,255,255,.34)';
    for (let x = -S; x < S; x += S * 0.34) g.fillRect(x, -S, S * 0.15, S * 2);
    g.restore();
    g.fillStyle = rg0(g, S * 0.36, S * 0.34, S * 0.5, 'rgba(255,255,255,.4)', 'rgba(255,255,255,0)');
    g.fillRect(0, 0, S, S);
  },
  // речная галька: крапинки и разводы
  pebble(g, S, ci, base) {
    let z = ci * 31 + 7;
    const R = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = i % 2 ? rgba(mix(base, '#2a1406', 0.6), 0.32) : rgba('#ffffff', 0.4);
      g.beginPath();
      g.ellipse(S * (0.12 + R() * 0.76), S * (0.12 + R() * 0.76), S * (0.008 + R() * 0.018), S * (0.008 + R() * 0.014), R() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = rgba('#ffffff', 0.28);
    g.lineWidth = S * 0.03;
    g.beginPath();
    g.moveTo(S * 0.15, S * 0.55);
    g.bezierCurveTo(S * 0.4, S * 0.4, S * 0.6, S * 0.7, S * 0.85, S * 0.5);
    g.stroke();
  },
  // гжель: синий цветок и листья по белой глазури
  gzhel(g, S, ci, base) {
    const c = '#2a56b8', c2 = '#6a90e0';
    const cx = S * 0.5, cy = S * 0.52;
    g.strokeStyle = c;
    g.fillStyle = c;
    g.lineWidth = S * 0.028;
    g.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      g.save();
      g.translate(cx, cy);
      g.rotate((k * Math.PI) / 2 + Math.PI / 4);
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(S * 0.11, -S * 0.06, S * 0.12, -S * 0.2, 0, -S * 0.26);
      g.bezierCurveTo(-S * 0.12, -S * 0.2, -S * 0.11, -S * 0.06, 0, 0);
      g.fillStyle = c2;
      g.fill();
      g.stroke();
      g.restore();
    }
    g.beginPath();
    g.arc(cx, cy, S * 0.065, 0, Math.PI * 2);
    g.fillStyle = c;
    g.fill();
    // листики и точки по углам
    for (const [x, y, a] of [[0.2, 0.2, 0.8], [0.8, 0.2, 2.3], [0.2, 0.8, -0.8], [0.8, 0.8, -2.3]]) {
      g.save();
      g.translate(S * x, S * y);
      g.rotate(a);
      g.beginPath();
      g.ellipse(0, 0, S * 0.07, S * 0.028, 0, 0, Math.PI * 2);
      g.fillStyle = c;
      g.fill();
      g.restore();
    }
    g.fillStyle = c;
    for (const [x, y] of [[0.5, 0.17], [0.5, 0.87], [0.17, 0.52], [0.83, 0.52]]) {
      g.beginPath();
      g.arc(S * x, S * y, S * 0.02, 0, Math.PI * 2);
      g.fill();
    }
  },
  // самоцвет: грани как у огранённого камня
  gem(g, S, ci, base, inn) {
    const o = S * 0.05, i = S * 0.3;
    const tri = (pts, col) => {
      g.beginPath();
      pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fillStyle = col;
      g.fill();
    };
    tri([[o, o], [S - o, o], [S - i, i], [i, i]], 'rgba(255,255,255,.38)');
    tri([[o, o], [i, i], [i, S - i], [o, S - o]], 'rgba(255,255,255,.18)');
    tri([[S - o, o], [S - o, S - o], [S - i, S - i], [S - i, i]], 'rgba(20,0,30,.2)');
    tri([[o, S - o], [S - o, S - o], [S - i, S - i], [i, S - i]], 'rgba(20,0,30,.34)');
    g.fillStyle = rg0(g, S * 0.42, S * 0.4, S * 0.3, 'rgba(255,255,255,.35)', 'rgba(255,255,255,0)');
    g.fillRect(i, i, S - 2 * i, S - 2 * i);
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = S * 0.018;
    g.beginPath();
    g.moveTo(o, o);
    g.lineTo(i, i);
    g.moveTo(S - o, o);
    g.lineTo(S - i, i);
    g.moveTo(o, S - o);
    g.lineTo(i, S - i);
    g.moveTo(S - o, S - o);
    g.lineTo(S - i, S - i);
    g.rect(i, i, S - 2 * i, S - 2 * i);
    g.stroke();
    // искорка
    g.fillStyle = '#fff';
    const sx = S * 0.4, sy = S * 0.4, sr = S * 0.07;
    g.beginPath();
    g.moveTo(sx, sy - sr);
    g.lineTo(sx + sr * 0.22, sy - sr * 0.22);
    g.lineTo(sx + sr, sy);
    g.lineTo(sx + sr * 0.22, sy + sr * 0.22);
    g.lineTo(sx, sy + sr);
    g.lineTo(sx - sr * 0.22, sy + sr * 0.22);
    g.lineTo(sx - sr, sy);
    g.lineTo(sx - sr * 0.22, sy - sr * 0.22);
    g.closePath();
    g.fill();
  },
  // чёрное дерево с золотой инкрустацией
  inlay(g, S, ci, base) {
    const gold = '#f0c860', gd = '#a8782a';
    const o = S * 0.2;
    g.strokeStyle = gd;
    g.lineWidth = S * 0.05;
    roundRect(g, o, o, S - 2 * o, S - 2 * o, S * 0.08);
    g.stroke();
    g.strokeStyle = gold;
    g.lineWidth = S * 0.03;
    roundRect(g, o, o, S - 2 * o, S - 2 * o, S * 0.08);
    g.stroke();
    const cx = S / 2, cy = S * 0.52, r = S * 0.1;
    g.beginPath();
    g.moveTo(cx, cy - r);
    g.lineTo(cx + r, cy);
    g.lineTo(cx, cy + r);
    g.lineTo(cx - r, cy);
    g.closePath();
    g.fillStyle = gold;
    g.fill();
    g.strokeStyle = gd;
    g.lineWidth = S * 0.016;
    g.stroke();
    g.fillStyle = gold;
    for (const [x, y] of [[0.5, 0.12], [0.5, 0.9], [0.1, 0.5], [0.9, 0.5]]) {
      g.beginPath();
      g.arc(S * x, S * y, S * 0.018, 0, Math.PI * 2);
      g.fill();
    }
  },
};
const rg0 = (g, x, y, r, c0, c1) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, c0);
  gr.addColorStop(1, c1);
  return gr;
};

// хохломской завиток: золотые травки на красном/чёрном, красные ягоды на золоте
function khokhloma(g, S, ci, base) {
  const gold = base === '#d9a019' ? '#a81f18' : '#e9b52a';
  const cx = S * 0.5, cy = S * 0.52;
  g.strokeStyle = gold;
  g.fillStyle = gold;
  g.lineWidth = S * 0.035;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(cx, cy, S * 0.2, Math.PI * 0.9, Math.PI * 2.3);
  g.stroke();
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (0.95 + k * 0.32);
    const x = cx + Math.cos(a) * S * 0.2, y = cy + Math.sin(a) * S * 0.2;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * S * 0.06, y + Math.sin(a) * S * 0.06, S * 0.055, S * 0.022, a, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = base === '#d9a019' ? '#c8261e' : '#d23a2a';
  if (base === '#c8261e') g.fillStyle = '#1d1a19';
  g.beginPath();
  g.arc(cx, cy, S * 0.07, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.beginPath();
  g.arc(cx - S * 0.02, cy - S * 0.025, S * 0.02, 0, Math.PI * 2);
  g.fill();
}
