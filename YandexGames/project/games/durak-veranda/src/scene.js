// Фон: летняя веранда, вид сверху. Крашеный пол, стол со скатертью и уютные вещи по краям, вокруг игровых зон.
import { rng } from './core.js';

const P2 = Math.PI * 2;
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
// волокна дерева: тонкие волнистые линии вдоль dir ('h' — по горизонтали)
function grain(ctx, x, y, w, h, { seed = 1, color = '#000', alpha = 0.12, dir = 'h', density = 1, knots = true, scale = 1 } = {}) {
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

function shadow(g, x, y, rx, ry, a = 0.32) {
  const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  gr.addColorStop(0, `rgba(30,12,2,${a})`);
  gr.addColorStop(0.7, `rgba(30,12,2,${a * 0.5})`);
  gr.addColorStop(1, 'rgba(30,12,2,0)');
  g.save();
  g.translate(x, y);
  g.scale(1, ry / rx);
  g.translate(-x, -y);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, rx, 0, P2);
  g.fill();
  g.restore();
}

function doily(g, r) {
  g.save();
  g.fillStyle = 'rgba(255,250,240,.92)';
  g.beginPath();
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * P2;
    const rr = r * (0.94 + 0.06 * Math.cos(a * 16));
    k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0);
  }
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let ring = 0; ring < 3; ring++) {
    const rr = r * (0.55 + ring * 0.14);
    const n = 14 + ring * 6;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * P2 + ring * 0.2;
      g.beginPath();
      g.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * (0.035 + ring * 0.006), 0, P2);
      g.fill();
    }
  }
  g.restore();
}

const DRAW = {
  cup(g, r) {
    shadow(g, r * 0.08, r * 0.12, r * 1.05, r * 1.05);
    doily(g, r * 1.02);
    // блюдце
    g.beginPath();
    g.arc(0, 0, r * 0.78, 0, P2);
    g.fillStyle = '#fbf7f0';
    g.fill();
    g.strokeStyle = '#3f72b8';
    g.lineWidth = r * 0.05;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.7, 0, P2);
    g.strokeStyle = 'rgba(63,114,184,.45)';
    g.lineWidth = r * 0.02;
    g.stroke();
    // ручка
    g.beginPath();
    g.ellipse(r * 0.58, r * 0.05, r * 0.16, r * 0.1, 0, 0, P2);
    g.strokeStyle = '#f4efe6';
    g.lineWidth = r * 0.08;
    g.stroke();
    // чашка
    shadow(g, r * 0.05, r * 0.07, r * 0.55, r * 0.55, 0.25);
    g.beginPath();
    g.arc(0, 0, r * 0.5, 0, P2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.strokeStyle = '#d9cfc0';
    g.lineWidth = r * 0.02;
    g.stroke();
    // узор горошком
    g.fillStyle = '#e0574c';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * P2;
      g.beginPath();
      g.arc(Math.cos(a) * r * 0.455, Math.sin(a) * r * 0.455, r * 0.025, 0, P2);
      g.fill();
    }
    // чай с долькой лимона
    const tea = g.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.42);
    tea.addColorStop(0, '#c9762a');
    tea.addColorStop(1, '#7a3a12');
    g.beginPath();
    g.arc(0, 0, r * 0.41, 0, P2);
    g.fillStyle = tea;
    g.fill();
    g.save();
    g.translate(r * 0.1, r * 0.08);
    g.beginPath();
    g.arc(0, 0, r * 0.16, 0, P2);
    g.fillStyle = '#f6e27a';
    g.fill();
    g.strokeStyle = '#e8c23a';
    g.lineWidth = r * 0.03;
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = r * 0.015;
    for (let k = 0; k < 8; k++) {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos((k / 8) * P2) * r * 0.13, Math.sin((k / 8) * P2) * r * 0.13);
      g.stroke();
    }
    g.restore();
    g.beginPath();
    g.ellipse(-r * 0.2, -r * 0.18, r * 0.1, r * 0.04, -0.7, 0, P2);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fill();
    // ложечка
    g.save();
    g.rotate(0.6);
    g.fillStyle = '#c9ced6';
    roundRect(g, r * 0.62, -r * 0.035, r * 0.42, r * 0.07, r * 0.03);
    g.fill();
    g.beginPath();
    g.ellipse(r * 0.6, 0, r * 0.1, r * 0.07, 0, 0, P2);
    g.fill();
    g.restore();
  },
  glasses(g, r) {
    g.rotate(-0.35);
    shadow(g, r * 0.06, r * 0.1, r * 1.0, r * 0.55, 0.22);
    const lens = (x) => {
      g.beginPath();
      g.ellipse(x, 0, r * 0.4, r * 0.34, 0, 0, P2);
      g.fillStyle = 'rgba(210,235,255,.28)';
      g.fill();
      g.strokeStyle = '#a8792e';
      g.lineWidth = r * 0.06;
      g.stroke();
      g.beginPath();
      g.ellipse(x - r * 0.12, -r * 0.1, r * 0.14, r * 0.06, -0.5, 0, P2);
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.fill();
    };
    lens(-r * 0.47);
    lens(r * 0.47);
    g.beginPath();
    g.moveTo(-r * 0.08, -r * 0.05);
    g.quadraticCurveTo(0, -r * 0.16, r * 0.08, -r * 0.05);
    g.strokeStyle = '#a8792e';
    g.lineWidth = r * 0.05;
    g.stroke();
    // сложенные дужки
    g.beginPath();
    g.moveTo(-r * 0.85, -r * 0.1);
    g.lineTo(-r * 0.2, -r * 0.42);
    g.moveTo(r * 0.85, -r * 0.1);
    g.lineTo(r * 0.2, -r * 0.42);
    g.lineWidth = r * 0.045;
    g.stroke();
  },
  book(g, r) {
    g.rotate(0.12);
    const w = r * 1.0, h = r * 0.68;
    shadow(g, r * 0.08, r * 0.12, r * 1.1, r * 0.8, 0.3);
    g.fillStyle = '#7a2e2a';
    roundRect(g, -w - r * 0.05, -h - r * 0.04, w * 2 + r * 0.1, h * 2 + r * 0.1, r * 0.06);
    g.fill();
    const page = (sx) => {
      g.beginPath();
      g.moveTo(0, -h + r * 0.03);
      g.quadraticCurveTo(sx * w * 0.5, -h - r * 0.04, sx * w * 0.98, -h + r * 0.02);
      g.lineTo(sx * w * 0.98, h - r * 0.02);
      g.quadraticCurveTo(sx * w * 0.5, h - r * 0.08, 0, h - r * 0.02);
      g.closePath();
      const gr = g.createLinearGradient(0, 0, sx * w, 0);
      gr.addColorStop(0, '#d9ccb0');
      gr.addColorStop(0.15, '#f7f0df');
      gr.addColorStop(1, '#fbf6ea');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = 'rgba(90,60,30,.25)';
      g.lineWidth = r * 0.012;
      for (let k = 0; k < 11; k++) {
        const y = -h + r * 0.22 + k * h * 0.165;
        const len = k === 10 ? 0.45 : 0.78 - ((k * 7) % 4) * 0.04;
        g.beginPath();
        g.moveTo(sx * w * 0.14, y);
        g.lineTo(sx * w * (0.14 + len * 0.76), y);
        g.lineWidth = r * 0.035;
        g.strokeStyle = 'rgba(70,50,30,.22)';
        g.stroke();
      }
    };
    page(-1);
    page(1);
    g.fillStyle = '#c9a23a';
    g.beginPath();
    g.moveTo(-r * 0.04, -h);
    g.lineTo(r * 0.06, -h);
    g.lineTo(r * 0.06, h + r * 0.35);
    g.lineTo(r * 0.01, h + r * 0.28);
    g.lineTo(-r * 0.04, h + r * 0.35);
    g.closePath();
    g.fill();
  },
  yarn(g, r) {
    shadow(g, r * 0.08, r * 0.1, r * 0.8, r * 0.8);
    const R = rng(4);
    g.beginPath();
    g.arc(0, 0, r * 0.62, 0, P2);
    const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.62);
    gr.addColorStop(0, '#f4a9b8');
    gr.addColorStop(1, '#c95f78');
    g.fillStyle = gr;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(120,30,50,.35)';
    g.lineWidth = r * 0.03;
    for (let k = 0; k < 18; k++) {
      g.beginPath();
      const a = R() * P2;
      g.ellipse(0, 0, r * (0.3 + R() * 0.5), r * (0.1 + R() * 0.25), a, 0, P2);
      g.stroke();
    }
    g.restore();
    // нитка к вязанию
    g.beginPath();
    g.moveTo(r * 0.5, r * 0.35);
    g.bezierCurveTo(r * 1.0, r * 0.9, r * 0.3, r * 1.1, r * 0.9, r * 1.35);
    g.strokeStyle = '#d97a8f';
    g.lineWidth = r * 0.04;
    g.stroke();
    // спицы
    g.strokeStyle = '#c0c6cf';
    g.lineWidth = r * 0.06;
    g.beginPath();
    g.moveTo(-r * 0.9, r * 0.9);
    g.lineTo(r * 0.7, -r * 0.95);
    g.moveTo(-r * 0.8, -r * 0.6);
    g.lineTo(r * 0.95, r * 0.5);
    g.stroke();
    g.fillStyle = '#5a7fc0';
    [[-0.9, 0.9], [-0.8, -0.6]].forEach(([x, y]) => {
      g.beginPath();
      g.arc(x * r, y * r, r * 0.08, 0, P2);
      g.fill();
    });
  },
  plate(g, r, season) {
    shadow(g, r * 0.08, r * 0.1, r * 0.95, r * 0.95);
    g.beginPath();
    g.arc(0, 0, r * 0.85, 0, P2);
    g.fillStyle = '#fbf8f2';
    g.fill();
    g.strokeStyle = '#3f72b8';
    g.lineWidth = r * 0.03;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.62, 0, P2);
    g.strokeStyle = 'rgba(200,190,175,.6)';
    g.lineWidth = r * 0.02;
    g.stroke();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * P2;
      g.beginPath();
      g.ellipse(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74, r * 0.05, r * 0.025, a, 0, P2);
      g.fillStyle = '#3f72b8';
      g.fill();
    }
    const R = rng(11);
    const spots = [[-0.25, -0.15], [0.22, -0.2], [0, 0.25], [-0.05, -0.05]];
    spots.slice(0, 3).forEach(([x, y], i) => {
      g.save();
      g.translate(x * r, y * r);
      g.rotate(R() * P2);
      if (season === 'winter') {
        // пряник-звёздочка
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * P2, rr = (k % 2 ? 0.13 : 0.27) * r;
          k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0);
        }
        g.closePath();
        g.fillStyle = '#b5743a';
        g.fill();
        g.strokeStyle = '#fff';
        g.lineWidth = r * 0.02;
        g.stroke();
      } else {
        g.beginPath();
        g.arc(0, 0, r * 0.25, 0, P2);
        g.fillStyle = '#d9a35a';
        g.fill();
        g.strokeStyle = '#b8803a';
        g.lineWidth = r * 0.02;
        g.stroke();
        g.fillStyle = '#5a3216';
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          g.arc((R() - 0.5) * r * 0.3, (R() - 0.5) * r * 0.3, r * 0.035, 0, P2);
          g.fill();
        }
      }
      g.restore();
    });
  },
  candle(g, r) {
    shadow(g, r * 0.06, r * 0.08, r * 0.95, r * 0.95, 0.25);
    g.beginPath();
    g.arc(0, 0, r * 0.8, 0, P2);
    const br = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 0.8);
    br.addColorStop(0, '#f1d37a');
    br.addColorStop(1, '#a8792e');
    g.fillStyle = br;
    g.fill();
    g.beginPath();
    g.arc(0, 0, r * 0.42, 0, P2);
    g.fillStyle = '#f8efd8';
    g.fill();
    g.strokeStyle = '#e6d6b2';
    g.lineWidth = r * 0.04;
    g.stroke();
    // ушко подсвечника
    g.beginPath();
    g.ellipse(r * 0.85, 0, r * 0.2, r * 0.13, 0, 0, P2);
    g.strokeStyle = '#b8893a';
    g.lineWidth = r * 0.07;
    g.stroke();
  },
  flowers(g, r, season) {
    shadow(g, r * 0.08, r * 0.1, r * 1.0, r * 1.0, 0.25);
    const R = rng(21);
    const leaves = season === 'winter' ? '#2f6a3a' : '#4f8f3a';
    for (let k = 0; k < 9; k++) {
      const a = R() * P2, d = r * (0.35 + R() * 0.5);
      g.save();
      g.rotate(a);
      g.beginPath();
      g.ellipse(d * 0.6, 0, r * 0.38, r * 0.11, 0, 0, P2);
      g.fillStyle = mix(leaves, '#1d3a18', R() * 0.4);
      g.fill();
      g.restore();
    }
    const pal = { autumn: ['#f0a030', '#c95a2a', '#8b5bb0', '#f2c94c'], winter: ['#c4122a', '#c4122a', '#f2f2f2', '#d9a019'], spring: ['#ec6f9a', '#f7d24a', '#ffffff', '#b38fe0'], summer: ['#ffffff', '#4f8fd6', '#ffffff', '#f2c94c'] }[season] || ['#ec6f9a', '#ffffff'];
    const pos = [[0, 0], [0.42, -0.2], [-0.4, -0.25], [0.15, 0.45], [-0.3, 0.38], [0.5, 0.3], [-0.1, -0.5]];
    pos.forEach(([x, y], i) => {
      const c = pal[i % pal.length];
      const pr = r * (0.2 + R() * 0.07);
      g.save();
      g.translate(x * r, y * r);
      if (season === 'winter') {
        // веточка с ягодами рябины и шишкой
        if (i % 3 === 2) {
          g.beginPath();
          g.ellipse(0, 0, pr * 0.9, pr * 0.55, R() * 3, 0, P2);
          g.fillStyle = '#7a4a22';
          g.fill();
        } else for (let b = 0; b < 4; b++) {
          g.beginPath();
          g.arc((R() - 0.5) * pr, (R() - 0.5) * pr, pr * 0.32, 0, P2);
          g.fillStyle = c;
          g.fill();
        }
      } else {
        for (let p = 0; p < 8; p++) {
          g.rotate(P2 / 8);
          g.beginPath();
          g.ellipse(pr * 0.6, 0, pr * 0.55, pr * 0.28, 0, 0, P2);
          g.fillStyle = c;
          g.fill();
          g.strokeStyle = 'rgba(0,0,0,.12)';
          g.lineWidth = 1;
          g.stroke();
        }
        g.beginPath();
        g.arc(0, 0, pr * 0.32, 0, P2);
        g.fillStyle = c === '#f7d24a' || c === '#f2c94c' ? '#8a4a1a' : '#f2b81a';
        g.fill();
      }
      g.restore();
    });
  },
  watch(g, r) {
    shadow(g, r * 0.06, r * 0.08, r * 0.8, r * 0.8, 0.28);
    // цепочка
    g.strokeStyle = '#c9a23a';
    g.lineWidth = r * 0.05;
    for (let k = 0; k < 9; k++) {
      g.beginPath();
      g.ellipse(r * 0.1 + k * r * 0.11, -r * 0.75 - Math.sin(k * 0.5) * r * 0.25, r * 0.06, r * 0.035, 0.4, 0, P2);
      g.stroke();
    }
    g.beginPath();
    g.arc(0, 0, r * 0.68, 0, P2);
    const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.68);
    gr.addColorStop(0, '#f6dc86');
    gr.addColorStop(1, '#a8792e');
    g.fillStyle = gr;
    g.fill();
    g.beginPath();
    g.arc(0, -r * 0.72, r * 0.1, 0, P2);
    g.fill();
    g.beginPath();
    g.arc(0, 0, r * 0.56, 0, P2);
    g.fillStyle = '#fffaf0';
    g.fill();
    g.fillStyle = '#3a2a1a';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * P2;
      g.beginPath();
      g.arc(Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46, r * (k % 3 ? 0.02 : 0.04), 0, P2);
      g.fill();
    }
  },
  cat(g, r) {
    shadow(g, r * 0.08, r * 0.12, r * 1.0, r * 0.85, 0.3);
    const fur = '#e8954a', dark = '#b8652a', light = '#fbe3c4';
    // хвост вокруг
    g.beginPath();
    g.arc(0, r * 0.05, r * 0.78, 0.2, 2.6);
    g.strokeStyle = fur;
    g.lineWidth = r * 0.22;
    g.stroke();
    g.beginPath();
    g.arc(Math.cos(2.6) * r * 0.78, r * 0.05 + Math.sin(2.6) * r * 0.78, r * 0.11, 0, P2);
    g.fillStyle = light;
    g.fill();
    // тело-клубок
    g.beginPath();
    g.ellipse(0, 0, r * 0.75, r * 0.62, 0, 0, P2);
    const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.75);
    gr.addColorStop(0, '#f3ad66');
    gr.addColorStop(1, fur);
    g.fillStyle = gr;
    g.fill();
    // полоски
    g.strokeStyle = dark;
    g.lineWidth = r * 0.07;
    g.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const a = -0.6 + k * 0.32;
      g.beginPath();
      g.arc(r * 0.05, r * 0.05, r * (0.45 + (k % 2) * 0.08), a - 0.18, a + 0.18);
      g.stroke();
    }
    // голова
    const hx = -r * 0.35, hy = -r * 0.12;
    g.fillStyle = fur;
    [[-1, -0.95], [1, -0.55]].forEach(([s, a]) => {
      g.save();
      g.translate(hx, hy);
      g.rotate(a);
      g.beginPath();
      g.moveTo(-r * 0.12, -r * 0.24);
      g.lineTo(0, -r * 0.45);
      g.lineTo(r * 0.12, -r * 0.24);
      g.closePath();
      g.fill();
      g.fillStyle = '#f2b8a0';
      g.beginPath();
      g.moveTo(-r * 0.06, -r * 0.27);
      g.lineTo(0, -r * 0.38);
      g.lineTo(r * 0.06, -r * 0.27);
      g.closePath();
      g.fill();
      g.fillStyle = fur;
      g.restore();
    });
    g.beginPath();
    g.ellipse(hx, hy, r * 0.32, r * 0.28, -0.6, 0, P2);
    g.fillStyle = '#f0a55c';
    g.fill();
    g.beginPath();
    g.ellipse(hx + r * 0.06, hy + r * 0.1, r * 0.15, r * 0.1, -0.6, 0, P2);
    g.fillStyle = light;
    g.fill();
    // закрытые глазки
    g.strokeStyle = '#5a2e14';
    g.lineWidth = r * 0.035;
    [[-0.12, -0.04], [0.06, -0.15]].forEach(([dx, dy]) => {
      g.beginPath();
      g.arc(hx + dx * r, hy + dy * r, r * 0.06, 0.2, Math.PI - 0.2);
      g.stroke();
    });
    g.beginPath();
    g.arc(hx + r * 0.02, hy + r * 0.04, r * 0.025, 0, P2);
    g.fillStyle = '#d0706a';
    g.fill();
    // лапки
    g.fillStyle = light;
    [[-0.05, 0.42], [0.12, 0.45]].forEach(([x, y]) => {
      g.beginPath();
      g.ellipse(x * r, y * r, r * 0.1, r * 0.07, 0, 0, P2);
      g.fill();
    });
  },
  jam(g, r) {
    shadow(g, r * 0.06, r * 0.08, r * 0.85, r * 0.85, 0.28);
    // клетчатая ткань на крышке
    g.save();
    g.beginPath();
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * P2;
      const rr = r * (0.82 + (k % 2) * 0.06);
      k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0);
    }
    g.closePath();
    g.fillStyle = '#fff';
    g.fill();
    g.clip();
    g.fillStyle = 'rgba(214,58,48,.55)';
    for (let k = -6; k <= 6; k++) {
      g.fillRect(k * r * 0.16 - r * 0.04, -r, r * 0.08, r * 2);
      g.fillRect(-r, k * r * 0.16 - r * 0.04, r * 2, r * 0.08);
    }
    g.restore();
    g.beginPath();
    g.arc(0, 0, r * 0.55, 0, P2);
    g.strokeStyle = '#c9a23a';
    g.lineWidth = r * 0.08;
    g.stroke();
    g.beginPath();
    g.ellipse(r * 0.45, -r * 0.4, r * 0.18, r * 0.08, -0.8, 0, P2);
    g.ellipse(r * 0.6, -r * 0.25, r * 0.18, r * 0.08, 0.6, 0, P2);
    g.fillStyle = '#c9a23a';
    g.fill();
  },
  teapot(g, r) {
    shadow(g, r * 0.08, r * 0.1, r * 1.0, r * 0.95, 0.3);
    // носик и ручка
    g.fillStyle = '#f6f2ea';
    g.beginPath();
    g.moveTo(r * 0.5, -r * 0.12);
    g.lineTo(r * 1.05, -r * 0.3);
    g.lineTo(r * 1.1, -r * 0.16);
    g.lineTo(r * 0.55, r * 0.15);
    g.closePath();
    g.fill();
    g.strokeStyle = '#3f72b8';
    g.lineWidth = r * 0.03;
    g.stroke();
    g.beginPath();
    g.ellipse(-r * 0.78, 0, r * 0.22, r * 0.3, 0, 0, P2);
    g.strokeStyle = '#f6f2ea';
    g.lineWidth = r * 0.1;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.68, 0, P2);
    const gr = g.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r * 0.68);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(1, '#e2dcd0');
    g.fillStyle = gr;
    g.fill();
    // гжельский цветок
    g.fillStyle = '#2f5fae';
    for (let k = 0; k < 6; k++) {
      g.save();
      g.rotate((k / 6) * P2);
      g.beginPath();
      g.ellipse(r * 0.47, 0, r * 0.1, r * 0.05, 0, 0, P2);
      g.fill();
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, r * 0.3, 0, P2);
    g.fillStyle = '#f6f2ea';
    g.fill();
    g.strokeStyle = '#2f5fae';
    g.lineWidth = r * 0.04;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.1, 0, P2);
    g.fillStyle = '#2f5fae';
    g.fill();
  },
};

function leafBig(g, s, c) {
  const pts = [[0, -1], [0.22, -0.55], [0.62, -0.72], [0.5, -0.28], [0.95, -0.12], [0.55, 0.12], [0.62, 0.45], [0.18, 0.3], [0.06, 0.62], [-0.06, 0.62], [-0.18, 0.3], [-0.62, 0.45], [-0.55, 0.12], [-0.95, -0.12], [-0.5, -0.28], [-0.62, -0.72], [-0.22, -0.55]];
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
  g.closePath();
  g.fillStyle = c;
  g.fill();
  g.strokeStyle = 'rgba(90,30,10,.45)';
  g.lineWidth = s * 0.05;
  g.beginPath();
  g.moveTo(0, s * 0.95);
  g.lineTo(0, -s * 0.6);
  g.moveTo(0, s * 0.1);
  g.lineTo(s * 0.5, -s * 0.3);
  g.moveTo(0, s * 0.1);
  g.lineTo(-s * 0.5, -s * 0.3);
  g.stroke();
}
function strawberryFree(g, s) {
  g.beginPath();
  g.moveTo(0, s * 0.92);
  g.bezierCurveTo(-s * 0.95, s * 0.2, -s * 0.75, -s * 0.6, 0, -s * 0.55);
  g.bezierCurveTo(s * 0.75, -s * 0.6, s * 0.95, s * 0.2, 0, s * 0.92);
  g.fillStyle = '#e0343a';
  g.fill();
  g.fillStyle = '#ffe58a';
  for (let k = 0; k < 7; k++) {
    g.beginPath();
    g.arc(Math.sin(k * 2.1) * s * 0.35, -s * 0.2 + k * s * 0.12, s * 0.04, 0, P2);
    g.fill();
  }
  g.fillStyle = '#3e9a35';
  for (let k = 0; k < 5; k++) {
    g.save();
    g.translate(0, -s * 0.55);
    g.rotate(-1.3 + k * 0.65);
    g.beginPath();
    g.ellipse(0, -s * 0.16, s * 0.08, s * 0.2, 0, 0, P2);
    g.fill();
    g.restore();
  }
}

// ---------- сборка фона ----------
// avoid: прямоугольники, где не должно быть вещей (поле, лоток, кнопки), в CSS-пикселях
// ---------- новые вещи веранды ----------
Object.assign(DRAW, {
  // миска вишни
  cherries(g, r) {
    shadow(g, r * 0.08, r * 0.1, r * 0.95, r * 0.95, 0.3);
    g.beginPath();
    g.arc(0, 0, r * 0.82, 0, P2);
    const bw = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 0.82);
    bw.addColorStop(0, '#ffffff');
    bw.addColorStop(1, '#dcd6ca');
    g.fillStyle = bw;
    g.fill();
    g.strokeStyle = '#c2462e';
    g.lineWidth = r * 0.05;
    g.beginPath();
    g.arc(0, 0, r * 0.74, 0, P2);
    g.stroke();
    const R = rng(31);
    const pts = [];
    for (let k = 0; k < 16; k++) {
      const a = R() * P2, d = Math.sqrt(R()) * r * 0.5;
      pts.push([Math.cos(a) * d, Math.sin(a) * d]);
    }
    pts.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of pts) {
      g.beginPath();
      g.arc(x, y, r * 0.15, 0, P2);
      const cg = g.createRadialGradient(x - r * 0.05, y - r * 0.05, 0, x, y, r * 0.15);
      cg.addColorStop(0, '#e2364a');
      cg.addColorStop(1, '#7a0f1e');
      g.fillStyle = cg;
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.beginPath();
      g.arc(x - r * 0.05, y - r * 0.05, r * 0.035, 0, P2);
      g.fill();
    }
    // хвостики
    g.strokeStyle = '#4f7a2a';
    g.lineWidth = r * 0.03;
    g.lineCap = 'round';
    for (const [x, y] of pts.slice(-5)) {
      g.beginPath();
      g.moveTo(x, y - r * 0.08);
      g.quadraticCurveTo(x + r * 0.1, y - r * 0.3, x + r * 0.22, y - r * 0.32);
      g.stroke();
    }
    // пара вишенок рядом с миской
    for (const [x, y] of [[r * 0.95, r * 0.55], [r * 1.12, r * 0.42]]) {
      shadow(g, x + 2, y + 3, r * 0.17, r * 0.17, 0.3);
      g.beginPath();
      g.arc(x, y, r * 0.14, 0, P2);
      g.fillStyle = '#b81d30';
      g.fill();
    }
  },
  // яблоки
  apples(g, r) {
    const R = rng(41);
    [[-0.38, -0.15, '#d84a2a'], [0.35, -0.25, '#9cc33a'], [0, 0.35, '#e8b02a']].forEach(([x, y, c]) => {
      g.save();
      g.translate(x * r, y * r);
      shadow(g, 4, 6, r * 0.45, r * 0.45, 0.3);
      g.beginPath();
      g.arc(0, 0, r * 0.4, 0, P2);
      const ag = g.createRadialGradient(-r * 0.12, -r * 0.12, 0, 0, 0, r * 0.4);
      ag.addColorStop(0, mix(c, '#ffffff', 0.35));
      ag.addColorStop(1, mix(c, '#3a1a08', 0.25));
      g.fillStyle = ag;
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath();
      g.ellipse(-r * 0.15, -r * 0.15, r * 0.1, r * 0.06, -0.7, 0, P2);
      g.fill();
      g.strokeStyle = '#5a3a1a';
      g.lineWidth = r * 0.04;
      g.beginPath();
      g.moveTo(0, -r * 0.02);
      g.lineTo(r * 0.06, -r * 0.14);
      g.stroke();
      g.beginPath();
      g.ellipse(r * 0.16, -r * 0.16, r * 0.12, r * 0.05, -0.5 + R(), 0, P2);
      g.fillStyle = '#4f8f3a';
      g.fill();
      g.restore();
    });
  },
  // блокнот со счётом партий
  notepad(g, r) {
    g.rotate(0.12);
    const w = r * 0.72, h = r * 0.95;
    shadow(g, r * 0.08, r * 0.1, r * 0.95, r * 1.05, 0.26);
    g.fillStyle = '#fbf7ea';
    g.fillRect(-w, -h, w * 2, h * 2);
    g.strokeStyle = 'rgba(80,120,190,.35)';
    g.lineWidth = Math.max(1, r * 0.012);
    for (let y = -h + r * 0.3; y < h; y += r * 0.17) {
      g.beginPath();
      g.moveTo(-w, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.strokeStyle = 'rgba(210,70,70,.5)';
    g.beginPath();
    g.moveTo(-w + r * 0.25, -h);
    g.lineTo(-w + r * 0.25, h);
    g.stroke();
    // спираль
    g.fillStyle = '#7a7f8a';
    for (let x = -w + r * 0.12; x < w; x += r * 0.16) {
      g.beginPath();
      g.arc(x, -h, r * 0.04, 0, P2);
      g.fill();
    }
    // палочки счёта
    g.strokeStyle = '#2a3a6a';
    g.lineWidth = r * 0.03;
    g.lineCap = 'round';
    const R = rng(9);
    for (let row = 0; row < 3; row++) {
      const y = -h + r * 0.3 + (row + 1) * r * 0.34;
      const n = [4, 2, 3][row];
      for (let k = 0; k < n; k++) {
        const x = -w + r * 0.45 + k * r * 0.13;
        g.beginPath();
        g.moveTo(x + (R() - 0.5) * 2, y - r * 0.12);
        g.lineTo(x + (R() - 0.5) * 2, y + r * 0.02);
        g.stroke();
      }
    }
    // карандаш
    g.save();
    g.translate(r * 0.25, h * 0.7);
    g.rotate(-0.5);
    g.fillStyle = '#3a8a4a';
    g.fillRect(-r * 0.7, -r * 0.06, r * 1.2, r * 0.12);
    g.fillStyle = '#e8b48a';
    g.beginPath();
    g.moveTo(r * 0.5, -r * 0.06);
    g.lineTo(r * 0.72, 0);
    g.lineTo(r * 0.5, r * 0.06);
    g.fill();
    g.restore();
  },
  // сушки на тарелочке
  sushki(g, r) {
    shadow(g, r * 0.08, r * 0.1, r * 0.95, r * 0.95, 0.3);
    g.beginPath();
    g.arc(0, 0, r * 0.86, 0, P2);
    g.fillStyle = '#f9f4ea';
    g.fill();
    g.strokeStyle = '#c9a23a';
    g.lineWidth = r * 0.04;
    g.stroke();
    const R = rng(17);
    [[-0.28, -0.22], [0.27, -0.18], [0.02, 0.28], [-0.32, 0.25], [0.35, 0.28]].forEach(([x, y]) => {
      g.save();
      g.translate(x * r, y * r);
      g.beginPath();
      g.arc(0, 0, r * 0.26, 0, P2);
      g.arc(0, 0, r * 0.1, 0, P2, true);
      const sg = g.createRadialGradient(-r * 0.06, -r * 0.06, r * 0.05, 0, 0, r * 0.26);
      sg.addColorStop(0, '#f2c27a');
      sg.addColorStop(1, '#b8742e');
      g.fillStyle = sg;
      g.fill('evenodd');
      g.fillStyle = '#5a3216';
      for (let k = 0; k < 6; k++) {
        const a = R() * P2;
        g.beginPath();
        g.arc(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18, r * 0.02, 0, P2);
        g.fill();
      }
      g.restore();
    });
  },
});

// ---------- пол веранды: крашеные доски ----------
function floor(g, W, H) {
  g.fillStyle = '#2c3a33';
  g.fillRect(0, 0, W, H);
  const bw = Math.max(46, Math.min(90, Math.min(W, H) / 7));
  const R = rng(3);
  for (let x = -R() * bw, col = 0; x < W; x += bw, col++) {
    let y = -R() * 400;
    while (y < H) {
      const len = 500 + R() * 600;
      const paint = mix('#7fae9c', R() < 0.5 ? '#5f8f80' : '#9cc4b2', R() * 0.5);
      g.fillStyle = paint;
      roundRect(g, x + 1.5, y + 1.5, bw - 3, len - 3, 3);
      g.fill();
      // облупившаяся краска: видно дерево
      for (let k = 0; k < 5; k++) {
        const px = x + 4 + R() * (bw - 10), py = y + R() * len;
        g.fillStyle = 'rgba(160,110,60,.55)';
        g.beginPath();
        g.ellipse(px, py, 2 + R() * bw * 0.12, 4 + R() * 26, 0, 0, P2);
        g.fill();
      }
      grain(g, x + 1.5, y + 1.5, bw - 3, len - 3, { seed: col * 17 + Math.round(y), color: '#20322a', alpha: 0.18, dir: 'v', density: 0.5, scale: 1.2 });
      g.fillStyle = 'rgba(30,40,35,.6)';
      for (const ny of [y + 12, y + len - 14]) {
        g.beginPath();
        g.arc(x + bw * 0.3, ny, 2.2, 0, P2);
        g.arc(x + bw * 0.7, ny, 2.2, 0, P2);
        g.fill();
      }
      y += len;
    }
  }
}

// столешница (дерево) — видна по краям скатерти
function tableTop(g, x, y, w, h, dark) {
  const tone = dark ? '#6a3a1c' : '#a8693a';
  g.save();
  roundRect(g, x, y, w, h, 24);
  g.clip();
  const ph = 90;
  const R = rng(13);
  for (let yy = y, row = 0; yy < y + h; yy += ph, row++) {
    const c = mix(tone, R() < 0.5 ? '#5a2f12' : '#c48a50', R() * 0.3);
    const gr = g.createLinearGradient(0, yy, 0, yy + ph);
    gr.addColorStop(0, mix(c, '#ffffff', 0.08));
    gr.addColorStop(1, mix(c, '#2a1406', 0.15));
    g.fillStyle = gr;
    g.fillRect(x, yy, w, ph - 2);
    grain(g, x, yy, w, ph - 2, { seed: row * 7 + 3, color: '#3c1e0a', alpha: 0.2, dir: 'h', density: 0.7, scale: 1.4 });
    g.fillStyle = 'rgba(30,12,2,.35)';
    g.fillRect(x, yy + ph - 2, w, 2);
  }
  g.restore();
}

// скатерти
function cloth(g, id, x, y, w, h) {
  const R = rng(77);
  g.save();
  roundRect(g, x, y, w, h, 18);
  g.clip();
  if (id === 'felt') {
    const gr = g.createRadialGradient(x + w / 2, y + h * 0.45, 0, x + w / 2, y + h / 2, Math.hypot(w, h) * 0.6);
    gr.addColorStop(0, '#3f8f5a');
    gr.addColorStop(1, '#22603a');
    g.fillStyle = gr;
    g.fillRect(x, y, w, h);
    for (let k = 0; k < (w * h) / 60; k++) {
      g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)';
      g.fillRect(x + R() * w, y + R() * h, 1.5, 1.5);
    }
    g.strokeStyle = 'rgba(240,210,120,.55)';
    g.lineWidth = 3;
    roundRect(g, x + 22, y + 22, w - 44, h - 44, 14);
    g.stroke();
    g.lineWidth = 1.2;
    roundRect(g, x + 30, y + 30, w - 60, h - 60, 10);
    g.stroke();
  } else if (id === 'check') {
    g.fillStyle = '#fbf6ee';
    g.fillRect(x, y, w, h);
    const s = 44;
    g.fillStyle = 'rgba(200,40,46,.42)';
    for (let xx = x; xx < x + w; xx += s * 2) g.fillRect(xx, y, s, h);
    for (let yy = y; yy < y + h; yy += s * 2) g.fillRect(x, yy, w, s);
    g.fillStyle = 'rgba(255,255,255,.12)';
    for (let k = 0; k < (w * h) / 900; k++) g.fillRect(x + R() * w, y + R() * h, 2, 1);
  } else if (id === 'lemon') {
    g.fillStyle = '#cfe6f2';
    g.fillRect(x, y, w, h);
    const s = 120;
    for (let yy = y - s, row = 0; yy < y + h + s; yy += s * 0.75, row++) {
      for (let xx = x - s + (row % 2) * s * 0.5; xx < x + w + s; xx += s) {
        // лимон
        g.save();
        g.translate(xx, yy);
        g.rotate(-0.5 + R() * 0.3);
        g.beginPath();
        g.ellipse(0, 0, 22, 15, 0, 0, P2);
        g.fillStyle = '#f6d84a';
        g.fill();
        g.beginPath();
        g.ellipse(-22, 0, 4, 3, 0, 0, P2);
        g.ellipse(22, 0, 4, 3, 0, 0, P2);
        g.fill();
        g.beginPath();
        g.ellipse(4, -16, 12, 5, -0.4, 0, P2);
        g.fillStyle = '#5a9a3a';
        g.fill();
        g.restore();
        // белые цветочки
        g.fillStyle = 'rgba(255,255,255,.85)';
        const fx = xx + s * 0.5, fy = yy + s * 0.32;
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          g.arc(fx + Math.cos((k / 5) * P2) * 6, fy + Math.sin((k / 5) * P2) * 6, 4.5, 0, P2);
          g.fill();
        }
        g.fillStyle = '#f2b13a';
        g.beginPath();
        g.arc(fx, fy, 3, 0, P2);
        g.fill();
      }
    }
    g.fillStyle = 'rgba(255,255,255,.08)';
    g.fillRect(x, y, w, h * 0.4);
  } else if (id === 'lace') {
    g.fillStyle = '#f3ead6';
    g.fillRect(x, y, w, h);
    for (let k = 0; k < (w * h) / 400; k++) {
      g.fillStyle = 'rgba(150,120,80,.06)';
      g.fillRect(x + R() * w, y + R() * h, 3, 1);
    }
    // кружевная кайма
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.fillStyle = 'rgba(255,255,255,.9)';
    const band = 46;
    for (const [ax, ay, bx, by] of [[x, y, x + w, y], [x, y + h, x + w, y + h], [x, y, x, y + h], [x + w, y, x + w, y + h]]) {
      const L = Math.hypot(bx - ax, by - ay), n = Math.floor(L / 34);
      for (let k = 0; k <= n; k++) {
        const px = ax + ((bx - ax) * k) / n, py = ay + ((by - ay) * k) / n;
        g.beginPath();
        g.arc(px, py, band * 0.55, 0, P2);
        g.fill();
      }
    }
    g.globalCompositeOperation = 'destination-out';
    for (const [ax, ay, bx, by] of [[x, y, x + w, y], [x, y + h, x + w, y + h], [x, y, x, y + h], [x + w, y, x + w, y + h]]) {
      const L = Math.hypot(bx - ax, by - ay), n = Math.floor(L / 34);
      for (let k = 0; k <= n; k++) {
        const px = ax + ((bx - ax) * k) / n, py = ay + ((by - ay) * k) / n;
        g.beginPath();
        g.arc(px, py, 7, 0, P2);
        g.fill();
        for (let q = 0; q < 6; q++) {
          g.beginPath();
          g.arc(px + Math.cos((q / 6) * P2) * 16, py + Math.sin((q / 6) * P2) * 16, 3, 0, P2);
          g.fill();
        }
      }
    }
    g.globalCompositeOperation = 'source-over';
    // кружевная салфетка в центре
    g.save();
    g.translate(x + w / 2, y + h * 0.45);
    doily(g, Math.min(w, h) * 0.22);
    g.restore();
  } else if (id === 'walnut') {
    tableTop(g, x, y, w, h, true);
    g.fillStyle = 'rgba(255,220,170,.06)';
    g.fillRect(x, y, w, h * 0.5);
  } else {
    const gr = g.createRadialGradient(x + w / 2, y + h * 0.45, 0, x + w / 2, y + h / 2, Math.hypot(w, h) * 0.6);
    gr.addColorStop(0, '#9a2a3a');
    gr.addColorStop(1, '#5a1220');
    g.fillStyle = gr;
    g.fillRect(x, y, w, h);
    for (let k = 0; k < (w * h) / 60; k++) {
      g.fillStyle = R() < 0.5 ? 'rgba(255,200,200,.03)' : 'rgba(0,0,0,.06)';
      g.fillRect(x + R() * w, y + R() * h, 1.5, 1.5);
    }
    // золотой орнамент по краю
    g.strokeStyle = 'rgba(232,177,58,.8)';
    g.lineWidth = 3;
    roundRect(g, x + 20, y + 20, w - 40, h - 40, 14);
    g.stroke();
    g.fillStyle = 'rgba(232,177,58,.8)';
    for (const [cx, cy] of [[x + 20, y + 20], [x + w - 20, y + 20], [x + 20, y + h - 20], [x + w - 20, y + h - 20]]) {
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.ellipse(cx + Math.cos((k / 4) * P2) * 10, cy + Math.sin((k / 4) * P2) * 10, 8, 4, (k / 4) * P2, 0, P2);
        g.fill();
      }
    }
  }
  g.restore();
  // кромка и тень скатерти
  if (id !== 'walnut') {
    g.strokeStyle = 'rgba(0,0,0,.22)';
    g.lineWidth = 2;
    roundRect(g, x, y, w, h, 18);
    g.stroke();
  }
}

export const DECOR_ORDER = ['cup', 'cherries', 'sushki', 'notepad', 'jam', 'teapot', 'apples', 'flowers', 'glasses', 'cat'];
const DECOR_R = { cup: 1.0, cherries: 1.0, sushki: 0.95, notepad: 1.05, jam: 0.75, teapot: 1.05, apples: 0.95, flowers: 1.0, glasses: 0.85, cat: 1.35 };

// W×H — экран; L — раскладка (зоны, которые нельзя закрывать вещами)
export function buildScene(W, H, dpr, clothId, L) {
  L = L || {};
  const c = canvas(W * dpr, H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  floor(g, W, H);
  // стол: в альбомной ориентации по краям виден пол
  const land = W > H * 1.1;
  const tx = land ? Math.max(18, W * 0.035) : -30, ty = -40;
  const tw = W - tx * 2, th = H + 80;
  g.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(g, tx + 6, ty + 10, tw, th, 26);
  g.fill();
  tableTop(g, tx, ty, tw, th, false);
  const m = land ? Math.min(W, H) * 0.045 : Math.min(W, H) * 0.035;
  const cx = tx + m, cy = ty + m + 40, cw = tw - m * 2, ch = th - m * 2 - 80;
  // тень скатерти и сама скатерть
  g.fillStyle = 'rgba(0,0,0,.25)';
  roundRect(g, cx + 3, cy + 5, cw, ch, 18);
  g.fill();
  cloth(g, clothId, cx, cy, cw, ch);
  // вещи вокруг игровых зон
  const unit = Math.max(40, Math.min(100, Math.min(W, H) * 0.085));
  const avoid = L.avoid || [];
  const placed = [];
  const anims = [];
  const R = rng(5);
  const pad = unit * 0.1;
  const blocked = (x, y, r) => {
    for (const a of avoid) {
      const nx = Math.max(a.x - pad, Math.min(x, a.x + a.w + pad));
      const ny = Math.max(a.y - pad, Math.min(y, a.y + a.h + pad));
      if (Math.hypot(nx - x, ny - y) < r) return true;
    }
    for (const p of placed) if (Math.hypot(p.x - x, p.y - y) < (p.r + r) * 0.95) return true;
    return false;
  };
  for (const id of DECOR_ORDER) {
    for (const k of [1, 0.85, 0.7]) {
      const r = unit * DECOR_R[id] * k;
      let best = null, bv = -1e9;
      const step = Math.max(12, r * 0.3);
      for (let y = r * 0.2; y < H - r * 0.2; y += step) for (let x = r * 0.2; x < W - r * 0.2; x += step) {
        if (blocked(x, y, r * 1.02)) continue;
        // вещи только на столе, не на полу
        if (x - r * 0.8 < tx || x + r * 0.8 > tx + tw) continue;
        let v = R() * unit * 0.3;
        let dmin = 1e9;
        for (const p of placed) dmin = Math.min(dmin, Math.hypot(p.x - x, p.y - y) - p.r);
        v += Math.min(dmin, unit * 3);
        // наполовину за краем экрана можно, но не больше
        v -= Math.max(0, r * 0.75 - Math.min(x, W - x, y, H - y)) * 3;
        if (v > bv) (bv = v), (best = [x, y]);
      }
      if (best) {
        placed.push({ id, x: best[0], y: best[1], r });
        break;
      }
    }
  }
  for (const p of placed) {
    g.save();
    g.translate(p.x, p.y);
    g.rotate((R() - 0.5) * 0.5);
    DRAW[p.id](g, p.r * 0.95, 'summer');
    g.restore();
    if (p.id === 'cup') anims.push({ t: 'steam', x: p.x, y: p.y, r: p.r });
  }
  // вечерний тёплый свет и виньетка
  const lx = W * 0.5, ly = H * 0.35;
  const lg = g.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 0.8);
  lg.addColorStop(0, 'rgba(255,224,160,.16)');
  lg.addColorStop(1, 'rgba(255,200,130,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  vg.addColorStop(0, 'rgba(20,10,2,0)');
  vg.addColorStop(1, 'rgba(20,10,2,.42)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  return { canvas: c, anims, placed };
}

export function drawAnims(g, anims, t) {
  for (const a of anims) {
    if (a.t !== 'steam') continue;
    g.save();
    g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.35 + k / 3) % 1;
      const alpha = Math.sin(ph * Math.PI) * 0.35;
      g.strokeStyle = `rgba(255,255,255,${alpha})`;
      g.lineWidth = a.r * 0.09;
      g.beginPath();
      const x0 = a.x + (k - 1) * a.r * 0.18, y0 = a.y - a.r * 0.1 - ph * a.r * 0.9;
      for (let s = 0; s <= 1; s += 0.1) {
        const x = x0 + Math.sin(s * 5 + t * 2 + k) * a.r * 0.1;
        const y = y0 - s * a.r * 0.5;
        s ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }
}

// превью скатерти для магазина
export function clothPreview(id, w = 150, h = 96) {
  const c = canvas(w * 2, h * 2);
  const g = c.getContext('2d');
  g.scale(2, 2);
  tableTop(g, 0, 0, w, h, false);
  // уменьшенный узор: рисуем крупнее и сжимаем
  const big = canvas(w * 2.4, h * 2.4);
  const bg = big.getContext('2d');
  cloth(bg, id, 0, 0, w * 2.4, h * 2.4);
  g.save();
  roundRect(g, 8, 8, w - 16, h - 16, 8);
  g.clip();
  g.drawImage(big, 8, 8, w - 16, h - 16);
  g.restore();
  return c.toDataURL();
}
