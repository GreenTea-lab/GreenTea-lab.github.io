// Фоны: базовый «бумажный» и по одному пейзажу на каждую главу (темы глав из i18n: ch0…ch11).
// Пейзаж рисуется один раз на холст (кэш по главе, теме и размеру), поверх идёт лёгкая анимация частиц.
// Ночная тема: те же пейзажи, но с ночным небом, затемнением и светящимися окнами и фонарями.

function rnd(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- общие элементы ----------
function skyGrad(g, W, H, stops) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
}

function glow(g, x, y, r, col) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col);
  gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

function disc(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function stars(g, W, H, R, n, maxY) {
  for (let i = 0; i < n; i++) {
    const x = R() * W,
      y = R() * maxY,
      r = R() * 1.2 + 0.35;
    g.fillStyle = `rgba(255,246,222,${0.3 + R() * 0.6})`;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    if (r > 1.35) {
      g.strokeStyle = 'rgba(255,246,222,.35)';
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(x - r * 3, y);
      g.lineTo(x + r * 3, y);
      g.moveTo(x, y - r * 3);
      g.lineTo(x, y + r * 3);
      g.stroke();
    }
  }
}

function moon(g, x, y, r) {
  glow(g, x, y, r * 4, 'rgba(255,240,200,.22)');
  disc(g, x, y, r, '#f8ecc8');
  g.fillStyle = 'rgba(214,194,150,.35)';
  for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.28, 0.18, 0.15], [-0.05, 0.38, 0.11]]) {
    g.beginPath();
    g.arc(x + dx * r, y + dy * r, rr * r, 0, TAU);
    g.fill();
  }
}

function sun(g, x, y, r, col = '#fff3c4', halo = 'rgba(255,236,170,.55)') {
  glow(g, x, y, r * 3.2, halo);
  disc(g, x, y, r * 1.18, 'rgba(255,250,225,.45)');
  disc(g, x, y, r, col);
}

// цвет: hex -> осветлённый (k > 0) или затемнённый (k < 0) rgb
function rgbOf(col) {
  let h = col.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(col, k, a = 1) {
  const c = rgbOf(col),
    t = k < 0 ? 0 : 255,
    m = Math.abs(k);
  const [r, g, b] = c.map((v) => Math.round(v + (t - v) * m));
  return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
}

function cloud(g, x, y, s, col) {
  const a = +(col.match(/[\d.]+\)$/) || ['1'])[0].replace(')', '');
  const shape = (dx, dy) => {
    g.beginPath();
    g.arc(x + dx, y + dy, s * 0.55, Math.PI * 0.5, Math.PI * 1.5);
    g.arc(x + dx + s * 0.55, y + dy - s * 0.35, s * 0.6, Math.PI, TAU);
    g.arc(x + dx + s * 1.25, y + dy - s * 0.2, s * 0.5, Math.PI * 1.1, TAU);
    g.arc(x + dx + s * 1.75, y + dy, s * 0.4, Math.PI * 1.5, Math.PI * 0.5);
    g.closePath();
  };
  // тень снизу, затем объёмное тело с бликом сверху
  g.fillStyle = `rgba(150,170,205,${a * 0.35})`;
  shape(s * 0.08, s * 0.12);
  g.fill();
  const gr = g.createLinearGradient(0, y - s, 0, y + s * 0.55);
  gr.addColorStop(0, `rgba(255,255,255,${a})`);
  gr.addColorStop(0.55, `rgba(250,252,255,${a})`);
  gr.addColorStop(1, `rgba(206,218,238,${a})`);
  g.fillStyle = gr;
  shape(0, 0);
  g.fill();
  g.fillStyle = `rgba(255,255,255,${a * 0.8})`;
  g.beginPath();
  g.ellipse(x + s * 0.5, y - s * 0.62, s * 0.32, s * 0.14, -0.2, 0, TAU);
  g.fill();
}

// гряда холмов: градиент сверху вниз, тень на дальний план, светлый гребень и фактура
function ridgeY(W, base, amp, seed, f, x) {
  const r = rnd(seed);
  const ph = [r() * 6, r() * 6, r() * 6];
  const t = x / Math.max(W, 1);
  return base - amp * (0.6 * Math.sin(t * 4 * f + ph[0]) + 0.28 * Math.sin(t * 9 * f + ph[1]) + 0.12 * Math.sin(t * 19 * f + ph[2]) + 0.5);
}
function ridge(g, W, H, base, amp, seed, col, f = 1, tex = 'grass') {
  const ys = [];
  for (let x = -6; x <= W + 12; x += 6) ys.push([x, ridgeY(W, base, amp, seed, f, x)]);
  const path = (dy) => {
    g.beginPath();
    g.moveTo(-6, H + 4);
    for (const [x, y] of ys) g.lineTo(x, y + dy);
    g.lineTo(W + 12, H + 4);
    g.closePath();
  };
  // мягкая тень, падающая на предыдущий план
  g.fillStyle = 'rgba(20,20,50,.07)';
  path(-amp * 0.18);
  g.fill();
  const gr = g.createLinearGradient(0, base - amp * 1.1, 0, base + amp * 2.2);
  gr.addColorStop(0, shade(col, 0.16));
  gr.addColorStop(0.45, col);
  gr.addColorStop(1, shade(col, -0.2));
  g.fillStyle = gr;
  path(0);
  g.fill();
  // освещённый гребень
  g.strokeStyle = shade(col, 0.35, 0.7);
  g.lineWidth = Math.max(1.2, amp * 0.06);
  g.beginPath();
  ys.forEach(([x, y], i) => (i ? g.lineTo(x, y + g.lineWidth * 0.6) : g.moveTo(x, y + g.lineWidth * 0.6)));
  g.stroke();
  if (!tex) return;
  // фактура: травинки, камешки или снежные искры
  const r = rnd(seed * 3 + 1);
  const n = Math.round(W / 9);
  for (let k = 0; k < n; k++) {
    const x = r() * W,
      y = ridgeY(W, base, amp, seed, f, x) + amp * (0.15 + r() * 1.4);
    const s = Math.max(1, amp * (0.05 + r() * 0.05));
    if (tex === 'grass') {
      g.strokeStyle = shade(col, r() < 0.5 ? -0.22 : 0.2, 0.55);
      g.lineWidth = Math.max(1, s * 0.4);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - s * 0.5, y - s * 1.6);
      g.moveTo(x, y);
      g.lineTo(x + s * 0.5, y - s * 1.8);
      g.stroke();
    } else {
      if ((tex === 'snow' && k % 3) || (tex === 'dots' && k % 2)) continue;
      g.fillStyle = tex === 'snow' ? 'rgba(150,170,215,.22)' : shade(col, r() < 0.5 ? -0.2 : 0.18, 0.5);
      g.beginPath();
      g.ellipse(x, y, s * 1.2, s * 0.6, 0, 0, TAU);
      g.fill();
    }
  }
}

// полоса дымки между планами
function haze(g, W, y, h, col) {
  const gr = g.createLinearGradient(0, y - h, 0, y + h);
  gr.addColorStop(0, col.replace(/[\d.]+\)$/, '0)'));
  gr.addColorStop(0.5, col);
  gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = gr;
  g.fillRect(0, y - h, W, h * 2);
}

function groundShadow(g, x, y, rx, ry) {
  g.fillStyle = 'rgba(20,25,40,.18)';
  g.beginPath();
  g.ellipse(x + rx * 0.25, y, rx, ry, 0, 0, TAU);
  g.fill();
}

// шар листвы с объёмом: свет сверху слева
function blob(g, x, y, r, col) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  gr.addColorStop(0, shade(col, 0.22));
  gr.addColorStop(0.6, col);
  gr.addColorStop(1, shade(col, -0.22));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function roundTree(g, x, y, s, trunk, c1, c2, fruit) {
  groundShadow(g, x, y, s * 0.38, s * 0.07);
  const tg = g.createLinearGradient(x - s * 0.07, 0, x + s * 0.07, 0);
  tg.addColorStop(0, shade(trunk, 0.15));
  tg.addColorStop(1, shade(trunk, -0.3));
  g.fillStyle = tg;
  g.beginPath();
  g.moveTo(x - s * 0.08, y);
  g.lineTo(x - s * 0.04, y - s * 0.55);
  g.lineTo(x + s * 0.04, y - s * 0.55);
  g.lineTo(x + s * 0.08, y);
  g.fill();
  // ветки
  g.strokeStyle = shade(trunk, -0.1);
  g.lineWidth = Math.max(1, s * 0.03);
  g.beginPath();
  g.moveTo(x, y - s * 0.4);
  g.lineTo(x - s * 0.14, y - s * 0.56);
  g.moveTo(x, y - s * 0.46);
  g.lineTo(x + s * 0.15, y - s * 0.6);
  g.stroke();
  // тёмная подложка кроны, затем объёмные шары
  const dk = shade(c1, -0.28);
  disc(g, x + s * 0.03, y - s * 0.6, s * 0.34, dk);
  blob(g, x - s * 0.24, y - s * 0.62, s * 0.26, c1);
  blob(g, x + s * 0.25, y - s * 0.64, s * 0.27, c1);
  blob(g, x, y - s * 0.8, s * 0.36, c1);
  blob(g, x - s * 0.1, y - s * 0.92, s * 0.19, c2);
  blob(g, x + s * 0.16, y - s * 0.78, s * 0.12, c2);
  // мелкие листочки по краю
  const R = rnd(Math.round(x * 13 + y * 7));
  g.fillStyle = shade(c2, 0.15, 0.7);
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI * (0.15 + R() * 0.7),
      rr = s * 0.36;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * rr * 0.8, y - s * 0.8 + Math.sin(a) * rr * 0.8, s * 0.035, s * 0.02, a, 0, TAU);
    g.fill();
  }
  if (fruit) {
    for (let k = 0; k < 7; k++) {
      const fx = x + (R() - 0.5) * s * 0.7,
        fy = y - s * (0.5 + R() * 0.5),
        fr = s * 0.045;
      disc(g, fx, fy, fr, fruit);
      disc(g, fx - fr * 0.35, fy - fr * 0.35, fr * 0.35, 'rgba(255,255,255,.6)');
    }
  }
}

function fir(g, x, y, s, col, hi, snow) {
  groundShadow(g, x, y, s * 0.3, s * 0.05);
  g.fillStyle = '#4b3527';
  g.fillRect(x - s * 0.04, y - s * 0.18, s * 0.08, s * 0.18);
  const dk = shade(col, -0.25),
    lt = hi || shade(col, 0.15);
  for (let k = 0; k < 3; k++) {
    const yy = y - s * 0.12 - k * s * 0.24,
      w = s * (0.36 - k * 0.08),
      h = s * 0.42;
    // ярус: левая сторона на свету, правая в тени, снизу тёмная кайма
    g.fillStyle = dk;
    g.beginPath();
    g.moveTo(x - w, yy + s * 0.02);
    g.quadraticCurveTo(x, yy + s * 0.08, x + w, yy + s * 0.02);
    g.lineTo(x, yy - h);
    g.closePath();
    g.fill();
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x - w, yy);
    g.quadraticCurveTo(x, yy + s * 0.05, x + w, yy);
    g.lineTo(x, yy - h);
    g.closePath();
    g.fill();
    g.fillStyle = lt;
    g.beginPath();
    g.moveTo(x, yy - h);
    g.lineTo(x - w, yy);
    g.quadraticCurveTo(x - w * 0.5, yy + s * 0.03, x - w * 0.1, yy + s * 0.03);
    g.closePath();
    g.fill();
    g.fillStyle = shade(col, -0.35, 0.45);
    g.beginPath();
    g.moveTo(x, yy - h);
    g.lineTo(x + w, yy);
    g.quadraticCurveTo(x + w * 0.6, yy + s * 0.035, x + w * 0.25, yy + s * 0.04);
    g.closePath();
    g.fill();
    if (snow) {
      g.fillStyle = snow;
      g.beginPath();
      g.moveTo(x - w * 0.42, yy - h * 0.58);
      g.quadraticCurveTo(x - w * 0.2, yy - h * 0.5, x, yy - h * 0.54);
      g.quadraticCurveTo(x + w * 0.2, yy - h * 0.48, x + w * 0.42, yy - h * 0.58);
      g.lineTo(x, yy - h);
      g.closePath();
      g.fill();
      g.beginPath();
      g.ellipse(x - w * 0.55, yy - s * 0.01, w * 0.32, s * 0.025, 0, 0, TAU);
      g.fill();
    }
  }
}

// домик в объёме: фасад с фронтоном, боковая стена и скат крыши уходят вправо-вверх
function house(c, x, y, s, o) {
  const { g } = c;
  const w = s,
    h = s * 0.62,
    d = s * 0.5,
    sk = d * 0.32,
    rh = s * 0.44,
    ov = s * 0.07;
  groundShadow(g, x + d * 0.4, y, w * 0.75, s * 0.07);
  // боковая стена
  g.fillStyle = shade(o.wall, -0.2);
  g.beginPath();
  g.moveTo(x + w / 2, y);
  g.lineTo(x + w / 2 + d, y - sk);
  g.lineTo(x + w / 2 + d, y - h - sk);
  g.lineTo(x + w / 2, y - h);
  g.fill();
  // фасад
  const fg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  fg.addColorStop(0, shade(o.wall, 0.08));
  fg.addColorStop(1, o.wall);
  g.fillStyle = fg;
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.lineTo(x - w / 2, y - h);
  g.lineTo(x, y - h - rh);
  g.lineTo(x + w / 2, y - h);
  g.lineTo(x + w / 2, y);
  g.fill();
  // доски/кладка
  g.strokeStyle = shade(o.wall, -0.12, 0.5);
  g.lineWidth = Math.max(0.6, s * 0.012);
  g.beginPath();
  for (let k = 1; k < 5; k++) {
    g.moveTo(x - w / 2, y - (h * k) / 5);
    g.lineTo(x + w / 2, y - (h * k) / 5);
  }
  g.stroke();
  // скат крыши над боковой стеной
  g.fillStyle = o.roof;
  g.beginPath();
  g.moveTo(x, y - h - rh);
  g.lineTo(x + w / 2 + ov, y - h + ov * 0.6);
  g.lineTo(x + w / 2 + ov + d, y - h + ov * 0.6 - sk);
  g.lineTo(x + d, y - h - rh - sk);
  g.closePath();
  g.fill();
  g.strokeStyle = shade(o.roof, -0.22, 0.7);
  g.lineWidth = Math.max(0.8, s * 0.018);
  g.beginPath();
  for (let k = 1; k < 4; k++) {
    const t = k / 4;
    g.moveTo(lerp(x, x + w / 2 + ov, t), lerp(y - h - rh, y - h + ov * 0.6, t));
    g.lineTo(lerp(x + d, x + w / 2 + ov + d, t), lerp(y - h - rh - sk, y - h + ov * 0.6 - sk, t));
  }
  g.stroke();
  // тень под свесом на боковой стене
  g.fillStyle = 'rgba(0,0,0,.18)';
  g.beginPath();
  g.moveTo(x + w / 2, y - h);
  g.lineTo(x + w / 2 + d, y - h - sk);
  g.lineTo(x + w / 2 + d, y - h - sk + s * 0.08);
  g.lineTo(x + w / 2, y - h + s * 0.08);
  g.fill();
  // кайма фронтона
  g.strokeStyle = shade(o.roof, 0.1);
  g.lineWidth = s * 0.07;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - w / 2 - ov, y - h + ov * 0.6);
  g.lineTo(x, y - h - rh);
  g.lineTo(x + w / 2 + ov, y - h + ov * 0.6);
  g.stroke();
  if (o.chimney) {
    const cx = x + d * 0.6 + w * 0.12,
      cy = y - h - rh * 0.45 - sk * 0.6;
    g.fillStyle = shade(o.roof, -0.1);
    g.fillRect(cx, cy - s * 0.3, s * 0.12, s * 0.32);
    g.fillStyle = shade(o.roof, -0.3);
    g.fillRect(cx + s * 0.08, cy - s * 0.3, s * 0.04, s * 0.32);
    g.fillStyle = shade(o.roof, 0.15);
    g.fillRect(cx - s * 0.02, cy - s * 0.34, s * 0.16, s * 0.05);
  }
  // круглое окошко на фронтоне
  disc(g, x, y - h - rh * 0.38, s * 0.065, shade(o.roof, -0.1));
  disc(g, x, y - h - rh * 0.38, s * 0.045, o.lit ? '#ffd879' : '#cfe5f2');
  // дверь с крыльцом
  g.fillStyle = shade(o.wall, -0.3);
  g.fillRect(x - w * 0.16, y - s * 0.04, w * 0.3, s * 0.04);
  g.fillStyle = o.door || '#7a4a32';
  g.fillRect(x - w * 0.12, y - h * 0.58, w * 0.22, h * 0.54);
  g.fillStyle = 'rgba(255,255,255,.15)';
  g.fillRect(x - w * 0.12, y - h * 0.58, w * 0.05, h * 0.54);
  disc(g, x + w * 0.06, y - h * 0.3, s * 0.015, '#e6c06a');
  const win = (wx, wy, ww, wh, side) => {
    g.fillStyle = shade(o.wall, -0.35);
    g.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
    g.fillStyle = o.lit ? '#ffd879' : side ? '#a9c7da' : '#cfe5f2';
    g.fillRect(wx, wy, ww, wh);
    if (!o.lit) {
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.beginPath();
      g.moveTo(wx, wy + wh * 0.6);
      g.lineTo(wx + ww * 0.6, wy);
      g.lineTo(wx + ww * 0.85, wy);
      g.lineTo(wx, wy + wh * 0.9);
      g.fill();
    }
    g.fillStyle = o.frame || '#fff';
    g.fillRect(wx + ww / 2 - 0.6, wy, 1.2, wh);
    g.fillRect(wx, wy + wh / 2 - 0.6, ww, 1.2);
    g.fillStyle = shade(o.wall, 0.25);
    g.fillRect(wx - ww * 0.12, wy + wh, ww * 1.24, Math.max(1, s * 0.025));
    c.lit.push(() => {
      glow(c.g, wx + ww / 2, wy + wh / 2, s * 0.45, 'rgba(255,205,110,.45)');
      c.g.fillStyle = '#ffd879';
      c.g.fillRect(wx, wy, ww, wh);
      c.g.fillStyle = 'rgba(120,70,30,.7)';
      c.g.fillRect(wx + ww / 2 - 0.6, wy, 1.2, wh);
      c.g.fillRect(wx, wy + wh / 2 - 0.6, ww, 1.2);
    });
  };
  win(x - w * 0.38, y - h * 0.72, w * 0.18, h * 0.3);
  win(x + w * 0.2, y - h * 0.72, w * 0.18, h * 0.3);
  // окно на боковой стене (в перспективе — просто узкое)
  const sx = x + w / 2 + d * 0.35;
  win(sx, y - h * 0.72 - sk * 0.4, d * 0.3, h * 0.3, true);
  if (o.lit) c.lit.push(() => disc(c.g, x, y - h - rh * 0.38, s * 0.045, '#ffd879'));
}

// куст с объёмом
function bush(g, x, y, s, col) {
  groundShadow(g, x, y, s * 0.6, s * 0.1);
  disc(g, x, y - s * 0.3, s * 0.45, shade(col, -0.25));
  blob(g, x - s * 0.32, y - s * 0.3, s * 0.32, col);
  blob(g, x + s * 0.3, y - s * 0.3, s * 0.3, col);
  blob(g, x, y - s * 0.48, s * 0.38, col);
}

// камень с бликом
function rock(g, x, y, s, col) {
  groundShadow(g, x, y, s * 0.55, s * 0.1);
  const gr = g.createLinearGradient(x - s * 0.5, y - s * 0.6, x + s * 0.4, y);
  gr.addColorStop(0, shade(col, 0.25));
  gr.addColorStop(1, shade(col, -0.25));
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - s * 0.55, y);
  g.quadraticCurveTo(x - s * 0.55, y - s * 0.5, x - s * 0.1, y - s * 0.6);
  g.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s * 0.55, y);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.3)';
  g.beginPath();
  g.ellipse(x - s * 0.2, y - s * 0.42, s * 0.14, s * 0.06, -0.4, 0, TAU);
  g.fill();
}

// дальние горы: у каждой вершины освещённый левый склон, затенённый правый и снежная шапка
function mountains(g, W, base, amp, seed, col, cap) {
  const r = rnd(seed);
  const n = Math.max(3, Math.round(W / (amp * 1.6)));
  for (let k = -1; k <= n; k++) {
    const cx = (W * (k + 0.5 + (r() - 0.5) * 0.6)) / n,
      hh = amp * (0.55 + r() * 0.45),
      wl = amp * (0.9 + r() * 0.5),
      wr = amp * (0.9 + r() * 0.5);
    const top = base - hh;
    g.fillStyle = shade(col, 0.1);
    g.beginPath();
    g.moveTo(cx - wl, base + 2);
    g.lineTo(cx - wl * 0.15, top + hh * 0.08);
    g.lineTo(cx, top);
    g.lineTo(cx + wl * 0.08, base + 2);
    g.fill();
    g.fillStyle = shade(col, -0.16);
    g.beginPath();
    g.moveTo(cx, top);
    g.lineTo(cx + wr * 0.3, top + hh * 0.3);
    g.lineTo(cx + wr, base + 2);
    g.lineTo(cx + wl * 0.08, base + 2);
    g.fill();
    // расщелины
    g.strokeStyle = shade(col, -0.25, 0.5);
    g.lineWidth = Math.max(1, amp * 0.02);
    g.beginPath();
    g.moveTo(cx + wr * 0.1, top + hh * 0.2);
    g.lineTo(cx + wr * 0.25, top + hh * 0.6);
    g.moveTo(cx - wl * 0.3, top + hh * 0.35);
    g.lineTo(cx - wl * 0.2, top + hh * 0.7);
    g.stroke();
    if (cap) {
      const ch = hh * 0.3;
      g.fillStyle = cap;
      g.beginPath();
      g.moveTo(cx, top);
      g.lineTo(cx - wl * 0.33, top + ch);
      g.lineTo(cx - wl * 0.15, top + ch * 0.78);
      g.lineTo(cx - wl * 0.02, top + ch * 1.05);
      g.lineTo(cx + wr * 0.12, top + ch * 0.8);
      g.lineTo(cx + wr * 0.3, top + ch);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(120,140,190,.35)';
      g.beginPath();
      g.moveTo(cx, top);
      g.lineTo(cx + wr * 0.3, top + ch);
      g.lineTo(cx + wr * 0.12, top + ch * 0.8);
      g.lineTo(cx + wl * 0.02, top + ch * 0.6);
      g.closePath();
      g.fill();
    }
  }
}

function tuft(g, x, y, s, col) {
  g.strokeStyle = col;
  g.lineWidth = Math.max(1, s * 0.12);
  g.lineCap = 'round';
  g.beginPath();
  for (const a of [-0.5, -0.15, 0.2, 0.5]) {
    g.moveTo(x, y);
    g.quadraticCurveTo(x + a * s * 0.6, y - s * 0.6, x + a * s * 1.1, y - s * (0.9 - Math.abs(a) * 0.5));
  }
  g.stroke();
}

function flower(g, x, y, r, petal, mid = '#ffe08a') {
  g.fillStyle = petal;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU;
    g.beginPath();
    g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.48, 0, TAU);
    g.fill();
  }
  disc(g, x, y, r * 0.38, mid);
}

function bird(g, x, y, s, col) {
  g.strokeStyle = col;
  g.lineWidth = Math.max(1, s * 0.16);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - s, y - s * 0.2);
  g.quadraticCurveTo(x - s * 0.45, y - s * 0.65, x, y);
  g.quadraticCurveTo(x + s * 0.45, y - s * 0.65, x + s, y - s * 0.2);
  g.stroke();
}

function fence(g, x0, x1, y, s, col) {
  g.fillStyle = col;
  const step = s * 0.55;
  for (let x = x0; x < x1; x += step) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y - s * 0.75);
    g.lineTo(x + s * 0.11, y - s * 0.88);
    g.lineTo(x + s * 0.22, y - s * 0.75);
    g.lineTo(x + s * 0.22, y);
    g.fill();
  }
  g.fillRect(x0 - s * 0.1, y - s * 0.6, x1 - x0 + s * 0.2, s * 0.09);
  g.fillRect(x0 - s * 0.1, y - s * 0.28, x1 - x0 + s * 0.2, s * 0.09);
}

// ---------- сцены глав ----------
// c: { g, W, H, u (1% короткой стороны), hz (линия горизонта), R, N (ночь), lit[] }
// sky(c) рисует небо; land(c) — землю (поверх неё ночью кладётся затемнение, затем горят lit[])
const SCENES = [
  // 0. Первые шаги: весеннее утро, тропинка между холмами, ростки
  {
    sky: ['#9fd3ee', '#cfe9f2', '#fbf1d4'],
    nsky: ['#0f1a3a', '#1f2e5c', '#3a4c7c'],
    parts: { day: 'pollen', night: 'firefly' },
    skyArt(c) {
      const { g, W, H, u, hz, N, R } = c;
      if (N) {
        stars(g, W, H, R, (W * hz) / 2600, hz * 0.85);
        moon(g, W * 0.78, hz * 0.28, u * 5);
      } else {
        sun(g, W * 0.78, hz * 0.3, u * 6);
        cloud(g, W * 0.08, hz * 0.32, u * 7, 'rgba(255,255,255,.85)');
        cloud(g, W * 0.55, hz * 0.16, u * 5, 'rgba(255,255,255,.7)');
        cloud(g, W * 0.86, hz * 0.62, u * 4, 'rgba(255,255,255,.6)');
        bird(g, W * 0.35, hz * 0.4, u * 1.4, 'rgba(60,80,110,.55)');
        bird(g, W * 0.4, hz * 0.45, u * 1, 'rgba(60,80,110,.45)');
      }
    },
    land(c) {
      const { g, W, H, u, hz, R } = c;
      mountains(g, W, hz + u * 3, u * 16, 2, '#8fb0c8', '#f4f8ff');
      haze(g, W, hz + u * 2, u * 5, 'rgba(240,248,250,.7)');
      ridge(g, W, H, hz + u * 2, u * 9, 3, '#a9d0b9', 1);
      for (let k = 0; k < 9; k++) {
        const x = R() * W;
        roundTree(g, x, ridgeY(W, hz + u * 2, u * 9, 3, 1, x) + u * 2, u * (3 + R() * 1.5), '#7a6a5c', '#84b99a', '#9fd0b0');
      }
      haze(g, W, hz + u * 8, u * 4, 'rgba(240,250,245,.45)');
      ridge(g, W, H, hz + u * 9, u * 8, 5, '#8cc58f', 1.3);
      for (let k = 0; k < 7; k++) {
        const x = W * (0.05 + k * 0.15 + R() * 0.05);
        roundTree(g, x, ridgeY(W, hz + u * 9, u * 8, 5, 1.3, x) + u, u * (6 + R() * 3), '#7a5a3c', '#5fae6a', '#86c98a');
      }
      for (let k = 0; k < 5; k++) {
        const x = R() * W;
        bush(g, x, ridgeY(W, hz + u * 9, u * 8, 5, 1.3, x) + u * 5, u * (3 + R() * 2), '#6fb56e');
      }
      ridge(g, W, H, hz + u * 18, u * 6, 9, '#a6d77c', 0.9);
      // тропинка от низа к горизонту
      const top = hz + u * 16;
      g.fillStyle = '#ecdcb0';
      g.beginPath();
      g.moveTo(W * 0.32, H + 2);
      g.bezierCurveTo(W * 0.42, H - (H - top) * 0.4, W * 0.7, top + (H - top) * 0.3, W * 0.56, top);
      g.lineTo(W * 0.58, top);
      g.bezierCurveTo(W * 0.78, top + (H - top) * 0.35, W * 0.62, H - (H - top) * 0.35, W * 0.72, H + 2);
      g.closePath();
      g.fill();
      // следы
      g.fillStyle = 'rgba(160,130,80,.35)';
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        const x = lerp(W * 0.52, W * 0.6, Math.sin(t * 3)) + (k % 2 ? u * 1.2 : -u * 1.2) * (1 - t * 0.6);
        const y = lerp(H - u * 4, top + u * 4, t);
        g.beginPath();
        g.ellipse(x, y, u * 0.7 * (1 - t * 0.5), u * 1.1 * (1 - t * 0.5), 0, 0, TAU);
        g.fill();
      }
      // ростки, цветы и травка
      for (let k = 0; k < 26; k++) {
        const x = R() * W,
          y = lerp(top + u * 2, H, R());
        const s = u * (1.2 + ((y - top) / (H - top)) * 2.2);
        if (k % 3 === 0) sprout(g, x, y, s);
        else if (k % 3 === 1) flower(g, x, y, s * 0.35, ['#fff', '#ffd1dc', '#fff2a8'][k % 3]);
        else tuft(g, x, y, s, '#6fb65a');
      }
      // камни у тропинки и кусты на переднем плане
      rock(g, W * 0.3, H - (H - top) * 0.25, u * 4, '#a7a49a');
      rock(g, W * 0.34, H - (H - top) * 0.22, u * 2.2, '#b8b5aa');
      rock(g, W * 0.78, H - (H - top) * 0.55, u * 3, '#a7a49a');
      bush(g, W * 0.95, H - u * 2, u * 9, '#68b062');
      bush(g, W * 0.05, H + u * 1, u * 7, '#5fa85a');
      for (const [fx, fy, fc] of [[0.9, 0.92, '#fff'], [0.95, 0.85, '#ffd1dc'], [0.02, 0.95, '#fff2a8']]) flower(g, W * fx, H * fy, u * 1, fc);
    },
  },
  // 1. Тёплый вечер: закат, деревня на холме, фонарь
  {
    sky: ['#6f5aa8', '#e2789a', '#ffb37a', '#ffe0a3'],
    nsky: ['#0d1230', '#262a63', '#4d3d78', '#7a4d70'],
    parts: { day: 'firefly', night: 'firefly' },
    skyArt(c) {
      const { g, W, H, u, hz, N, R } = c;
      stars(g, W, H, R, (W * hz) / (N ? 2400 : 9000), hz * (N ? 0.85 : 0.35));
      if (N) moon(g, W * 0.22, hz * 0.25, u * 4.5);
      else {
        sun(g, W * 0.62, hz * 0.96, u * 9, '#ffe8a8', 'rgba(255,190,120,.6)');
        g.fillStyle = 'rgba(255,214,170,.55)';
        for (const [x, y, w] of [[0.05, 0.55, 0.3], [0.6, 0.42, 0.34], [0.3, 0.72, 0.22]]) {
          g.beginPath();
          g.ellipse(W * (x + w / 2), hz * y, (W * w) / 2, u * 0.9, 0, 0, TAU);
          g.fill();
        }
      }
    },
    land(c) {
      const { g, W, H, u, hz, R } = c;
      mountains(g, W, hz + u * 4, u * 13, 12, '#a57aa0', null);
      haze(g, W, hz + u * 3, u * 4, 'rgba(255,180,160,.35)');
      ridge(g, W, H, hz + u * 4, u * 7, 13, '#8c5f8f', 1);
      ridge(g, W, H, hz + u * 11, u * 7, 17, '#6e4878', 1.4);
      // деревня на склоне
      const xs = [0.12, 0.27, 0.43, 0.76, 0.9];
      xs.forEach((f, k) => {
        const x = W * f,
          y = ridgeY(W, hz + u * 11, u * 7, 17, 1.4, x) + u * 1.5;
        house(c, x, y, u * (6 + (k % 2) * 1.5), { wall: k % 2 ? '#e7b48a' : '#d99a7a', roof: k % 2 ? '#7a3f4e' : '#5e3550', lit: true, chimney: k === 1, door: '#5a3242' });
      });
      for (let k = 0; k < 6; k++) {
        const x = W * (0.02 + R() * 0.96);
        fir(g, x, ridgeY(W, hz + u * 11, u * 7, 17, 1.4, x) + u * 2, u * (6 + R() * 4), '#4f3566', '#5d4075');
      }
      haze(g, W, hz + u * 16, u * 4, 'rgba(255,170,150,.18)');
      ridge(g, W, H, hz + u * 20, u * 5, 19, '#4a3158', 0.9);
      fence(g, W * 0.02, W * 0.3, hz + u * 27, u * 4, '#3a2846');
      bush(g, W * 0.9, H - u * 3, u * 8, '#4f3566');
      bush(g, W * 0.08, H, u * 6, '#4a3060');
      // фонарь
      const lx = W * 0.66,
        ly = H - (H - hz) * 0.18;
      g.fillStyle = '#2a1d33';
      g.fillRect(lx - u * 0.45, ly - u * 18, u * 0.9, u * 18);
      g.fillRect(lx - u * 1.6, ly - u * 0.8, u * 3.2, u * 0.8);
      g.beginPath();
      g.moveTo(lx - u * 2, ly - u * 18);
      g.lineTo(lx + u * 2, ly - u * 18);
      g.lineTo(lx + u * 1.4, ly - u * 22);
      g.lineTo(lx - u * 1.4, ly - u * 22);
      g.fill();
      const lamp = () => {
        glow(c.g, lx, ly - u * 20, u * 16, 'rgba(255,200,110,.5)');
        c.g.fillStyle = '#ffe2a0';
        c.g.fillRect(lx - u * 1.2, ly - u * 21.6, u * 2.4, u * 3.2);
      };
      lamp();
      c.lit.push(lamp);
      // скамейка и травка
      g.fillStyle = '#3a2840';
      g.fillRect(lx - u * 12, ly - u * 3.2, u * 8, u * 0.9);
      g.fillRect(lx - u * 12, ly - u * 5.4, u * 8, u * 0.7);
      g.fillRect(lx - u * 11.5, ly - u * 3, u * 0.7, u * 3);
      g.fillRect(lx - u * 5, ly - u * 3, u * 0.7, u * 3);
      // кошка на скамейке
      const kx = lx - u * 7.5,
        ky = ly - u * 5.4;
      g.fillStyle = '#2a1d33';
      g.beginPath();
      g.ellipse(kx, ky - u * 1.3, u * 1.6, u * 1.4, 0, 0, TAU);
      g.fill();
      disc(g, kx + u * 1, ky - u * 3, u * 1, '#2a1d33');
      g.beginPath();
      g.moveTo(kx + u * 0.3, ky - u * 3.6);
      g.lineTo(kx + u * 0.5, ky - u * 4.6);
      g.lineTo(kx + u * 1, ky - u * 3.8);
      g.lineTo(kx + u * 1.5, ky - u * 4.6);
      g.lineTo(kx + u * 1.8, ky - u * 3.5);
      g.fill();
      g.strokeStyle = '#2a1d33';
      g.lineWidth = u * 0.45;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(kx - u * 1.4, ky - u * 0.4);
      g.quadraticCurveTo(kx - u * 3.2, ky + u * 0.4, kx - u * 2.6, ky + u * 2.2);
      g.stroke();
      // тропинка к домам и цветы
      g.fillStyle = 'rgba(255,190,150,.16)';
      g.beginPath();
      g.moveTo(W * 0.3, H + 2);
      g.quadraticCurveTo(W * 0.42, hz + u * 30, W * 0.5, hz + u * 20);
      g.lineTo(W * 0.53, hz + u * 20);
      g.quadraticCurveTo(W * 0.52, hz + u * 30, W * 0.55, H + 2);
      g.fill();
      for (let k = 0; k < 16; k++) tuft(g, R() * W, lerp(hz + u * 22, H, R()), u * 2, '#5b3f69');
      for (let k = 0; k < 12; k++) {
        const x = R() * W,
          y = lerp(hz + u * 24, H, R());
        flower(g, x, y, u * 0.8, ['#f2a0b8', '#ffd08a', '#e7c0ff'][k % 3], '#fff2c0');
      }
    },
  },
  // 2. Летний сад: забор, яблони, клумбы
  {
    sky: ['#79c3ec', '#b6e0f2', '#eef8e8'],
    nsky: ['#0e1a36', '#1c3260', '#2e4f6e'],
    parts: { day: 'petal', night: 'firefly' },
    skyArt(c) {
      const { g, W, H, u, hz, N, R } = c;
      if (N) {
        stars(g, W, H, R, (W * hz) / 2600, hz * 0.8);
        moon(g, W * 0.2, hz * 0.28, u * 5);
      } else {
        sun(g, W * 0.18, hz * 0.26, u * 6.5);
        cloud(g, W * 0.48, hz * 0.24, u * 6, 'rgba(255,255,255,.9)');
        cloud(g, W * 0.8, hz * 0.48, u * 4.5, 'rgba(255,255,255,.75)');
      }
    },
    land(c) {
      const { g, W, H, u, hz, R } = c;
      mountains(g, W, hz + u * 3, u * 12, 20, '#9cbcd2', null);
      haze(g, W, hz + u * 2, u * 4, 'rgba(240,250,250,.6)');
      ridge(g, W, H, hz + u * 3, u * 6, 21, '#9fcf9a', 1.1);
      for (let k = 0; k < 6; k++) bush(g, R() * W, hz + u * (5 + R() * 2), u * (3 + R() * 2), '#7cb878');
      for (let k = 0; k < 5; k++) {
        const x = W * (0.08 + k * 0.22 + R() * 0.06);
        roundTree(g, x, hz + u * (8 + R() * 3), u * (13 + R() * 4), '#7a5236', '#4f9e55', '#78c070', '#e2463a');
      }
      ridge(g, W, H, hz + u * 13, u * 2.5, 23, '#86c46a', 0.7);
      fence(g, -u * 2, W + u * 2, hz + u * 17, u * 8, '#fbf5e8');
      g.fillStyle = 'rgba(80,120,60,.18)';
      g.fillRect(0, hz + u * 17, W, u * 1.2);
      ridge(g, W, H, hz + u * 19, u * 1.5, 29, '#7cbe5e', 0.6);
      // дорожка из плитки
      for (let k = 0; k < 9; k++) {
        const t = k / 8;
        const y = lerp(hz + u * 21, H - u * 1, t),
          sw = u * (2 + t * 5);
        const x = W * 0.5 + Math.sin(t * 3) * W * 0.06;
        g.fillStyle = 'rgba(60,80,40,.25)';
        g.beginPath();
        g.ellipse(x + sw * 0.08, y + sw * 0.1, sw, sw * 0.38, 0, 0, TAU);
        g.fill();
        const pg = g.createLinearGradient(0, y - sw * 0.4, 0, y + sw * 0.4);
        pg.addColorStop(0, '#efe6d2');
        pg.addColorStop(1, '#c9bca0');
        g.fillStyle = pg;
        g.beginPath();
        g.ellipse(x, y, sw, sw * 0.36, 0, 0, TAU);
        g.fill();
      }
      // клумбы с цветами
      const cols = ['#f27da0', '#ffd449', '#ffffff', '#b08ae6', '#ff8a4c', '#e85b6a'];
      for (let row = 0; row < 3; row++) {
        const y0 = lerp(hz + u * 22, H - u * 3, row / 2.2);
        const s = u * (1.1 + row * 0.55);
        g.fillStyle = row % 2 ? '#6fb253' : '#64a84b';
        g.beginPath();
        g.ellipse(W * (row % 2 ? 0.7 : 0.3), y0 + s * 2, W * 0.42, s * 3.2, 0, 0, TAU);
        g.fill();
        for (let k = 0; k < 18 + row * 4; k++) {
          const x = R() * W,
            y = y0 + (R() - 0.3) * s * 3;
          g.strokeStyle = '#3f8a3e';
          g.lineWidth = Math.max(1, s * 0.18);
          g.beginPath();
          g.moveTo(x, y + s * 1.6);
          g.lineTo(x, y);
          g.stroke();
          flower(g, x, y, s * 0.75, cols[Math.floor(R() * cols.length)]);
        }
      }
      bush(g, W * 0.02, H - u * 1, u * 10, '#5ea258');
      for (let k = 0; k < 5; k++) flower(g, W * 0.02 + (R() - 0.5) * u * 10, H - u * (6 + R() * 5), u * 1.1, '#f27da0');
      // маленькая лейка в углу
      const wx = W * 0.86,
        wy = H - u * 4;
      g.fillStyle = '#6aa7c9';
      g.fillRect(wx - u * 3, wy - u * 5, u * 6, u * 5);
      g.beginPath();
      g.moveTo(wx + u * 3, wy - u * 3.5);
      g.lineTo(wx + u * 7, wy - u * 7);
      g.lineTo(wx + u * 7.6, wy - u * 6.2);
      g.lineTo(wx + u * 3, wy - u * 1.8);
      g.fill();
      g.strokeStyle = '#6aa7c9';
      g.lineWidth = u * 0.8;
      g.beginPath();
      g.arc(wx, wy - u * 5, u * 2.4, Math.PI, TAU);
      g.stroke();
    },
  },
  // 3. Дорога к морю: дюны, дорога, маяк, парус
  {
    sky: ['#6fb8e6', '#a9d8f0', '#e8f4f2'],
    nsky: ['#0b1636', '#18305e', '#2c4c78'],
    parts: { day: 'gull', night: 'none' },
    skyArt(c) {
      const { g, W, H, u, hz, N, R } = c;
      if (N) {
        stars(g, W, H, R, (W * hz) / 2400, hz * 0.85);
        moon(g, W * 0.5, hz * 0.3, u * 5);
      } else {
        sun(g, W * 0.5, hz * 0.55, u * 6);
        cloud(g, W * 0.1, hz * 0.2, u * 5.5, 'rgba(255,255,255,.85)');
        cloud(g, W * 0.7, hz * 0.3, u * 4, 'rgba(255,255,255,.7)');
      }
    },
    land(c) {
      const { g, W, H, u, hz, R, N } = c;
      // море
      const sea = g.createLinearGradient(0, hz, 0, hz + u * 16);
      sea.addColorStop(0, '#2f6f9e');
      sea.addColorStop(0.55, '#3f92c4');
      sea.addColorStop(1, '#7cc8dc');
      g.fillStyle = sea;
      g.fillRect(0, hz, W, u * 18);
      // солнечная (лунная) дорожка
      g.fillStyle = N ? 'rgba(255,240,200,.75)' : 'rgba(255,255,240,.8)';
      for (let k = 0; k < 9; k++) {
        const y = hz + u * (1 + k * 1.6),
          w = u * (2 + k * 1.2) * (0.6 + R() * 0.6);
        g.fillRect(W * 0.5 - w / 2 + (R() - 0.5) * u * 2, y, w, Math.max(1, u * 0.3));
      }
      c.lit.push(() => {
        c.g.fillStyle = 'rgba(255,240,200,.55)';
        for (let k = 0; k < 9; k++) {
          const y = hz + u * (1 + k * 1.6),
            w = u * (2 + k * 1.2);
          c.g.fillRect(W * 0.5 - w / 2, y, w, Math.max(1, u * 0.3));
        }
      });
      g.strokeStyle = 'rgba(255,255,255,.45)';
      g.lineWidth = Math.max(1, u * 0.25);
      for (let k = 0; k < 14; k++) {
        const x = R() * W,
          y = hz + u * (2 + R() * 13);
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + u * 1.2, y - u * 0.6, x + u * 2.4, y);
        g.stroke();
      }
      // остров и парусник
      g.fillStyle = '#6f9fb8';
      g.beginPath();
      g.ellipse(W * 0.16, hz + 1, u * 9, u * 2.2, 0, Math.PI, TAU);
      g.fill();
      const sx = W * 0.32,
        sy = hz + u * 6;
      g.fillStyle = '#7a4a32';
      g.beginPath();
      g.moveTo(sx - u * 3, sy);
      g.lineTo(sx + u * 3, sy);
      g.lineTo(sx + u * 2, sy + u * 1.2);
      g.lineTo(sx - u * 2, sy + u * 1.2);
      g.fill();
      g.fillStyle = '#fffaf0';
      g.beginPath();
      g.moveTo(sx - u * 0.2, sy - u * 0.3);
      g.lineTo(sx - u * 0.2, sy - u * 6.5);
      g.lineTo(sx - u * 3.2, sy - u * 0.3);
      g.fill();
      g.fillStyle = '#e46a4f';
      g.beginPath();
      g.moveTo(sx + u * 0.3, sy - u * 0.3);
      g.lineTo(sx + u * 0.3, sy - u * 5.5);
      g.lineTo(sx + u * 2.6, sy - u * 0.3);
      g.fill();
      // скала с маяком справа
      const lx = W * 0.84;
      const cg = g.createLinearGradient(lx - u * 12, hz - u * 3, lx + u * 6, hz + u * 12);
      cg.addColorStop(0, '#b0a898');
      cg.addColorStop(0.5, '#8a8478');
      cg.addColorStop(1, '#5e5a52');
      g.fillStyle = cg;
      g.beginPath();
      g.moveTo(lx - u * 12, hz + u * 10);
      g.quadraticCurveTo(lx - u * 8, hz - u * 2, lx, hz - u * 2.5);
      g.quadraticCurveTo(lx + u * 9, hz - u * 2, W + u * 4, hz + u * 4);
      g.lineTo(W + u * 4, hz + u * 14);
      g.closePath();
      g.fill();
      // трава на скале и прибой
      g.fillStyle = '#8fae6a';
      g.beginPath();
      g.moveTo(lx - u * 9, hz + u * 1);
      g.quadraticCurveTo(lx - u * 6, hz - u * 2.6, lx, hz - u * 2.9);
      g.quadraticCurveTo(lx + u * 9, hz - u * 2.4, W + u * 4, hz + u * 3.6);
      g.lineTo(W + u * 4, hz + u * 1.6);
      g.quadraticCurveTo(lx + u * 6, hz - u * 1, lx, hz - u * 1.4);
      g.quadraticCurveTo(lx - u * 5, hz - u * 1, lx - u * 9, hz + u * 1);
      g.fill();
      rock(g, lx - u * 10, hz + u * 10.5, u * 4, '#7d776c');
      rock(g, lx - u * 6, hz + u * 11.5, u * 2.5, '#8f897d');
      g.strokeStyle = 'rgba(255,255,255,.75)';
      g.lineWidth = Math.max(1, u * 0.35);
      g.beginPath();
      g.moveTo(lx - u * 13, hz + u * 11.6);
      g.quadraticCurveTo(lx - u * 8, hz + u * 13, lx - u * 3, hz + u * 12.4);
      g.stroke();
      const ty = hz - u * 2;
      for (let k = 0; k < 5; k++) {
        const y0 = ty - k * u * 3.4,
          w0 = u * (2.4 - k * 0.22),
          w1 = u * (2.4 - (k + 1) * 0.22);
        g.fillStyle = k % 2 ? '#d94a3c' : '#fbf6ec';
        g.beginPath();
        g.moveTo(lx - w0, y0);
        g.lineTo(lx + w0, y0);
        g.lineTo(lx + w1, y0 - u * 3.4);
        g.lineTo(lx - w1, y0 - u * 3.4);
        g.fill();
      }
      // объём башни: тень справа, блик слева
      g.fillStyle = 'rgba(40,30,40,.22)';
      g.beginPath();
      g.moveTo(lx + u * 0.7, ty);
      g.lineTo(lx + u * 2.4, ty);
      g.lineTo(lx + u * 1.3, ty - u * 17);
      g.lineTo(lx + u * 0.4, ty - u * 17);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.beginPath();
      g.moveTo(lx - u * 1.6, ty);
      g.lineTo(lx - u * 1.0, ty);
      g.lineTo(lx - u * 0.6, ty - u * 17);
      g.lineTo(lx - u * 0.9, ty - u * 17);
      g.fill();
      const top = ty - u * 17;
      g.fillStyle = '#3a3f4e';
      g.fillRect(lx - u * 1.9, top - u * 0.6, u * 3.8, u * 0.8);
      g.fillStyle = '#ffe29a';
      g.fillRect(lx - u * 1.3, top - u * 3.4, u * 2.6, u * 2.8);
      g.fillStyle = '#d94a3c';
      g.beginPath();
      g.moveTo(lx - u * 1.9, top - u * 3.4);
      g.lineTo(lx, top - u * 5.6);
      g.lineTo(lx + u * 1.9, top - u * 3.4);
      g.fill();
      c.lit.push(() => {
        const gg = c.g;
        gg.save();
        gg.globalAlpha = 0.28;
        const bm = gg.createLinearGradient(lx, 0, lx - W * 0.5, 0);
        bm.addColorStop(0, '#fff2b8');
        bm.addColorStop(1, 'rgba(255,242,184,0)');
        gg.fillStyle = bm;
        gg.beginPath();
        gg.moveTo(lx, top - u * 2);
        gg.lineTo(lx - W * 0.5, top - u * 9);
        gg.lineTo(lx - W * 0.5, top + u * 5);
        gg.closePath();
        gg.fill();
        gg.restore();
        glow(gg, lx, top - u * 2, u * 9, 'rgba(255,230,150,.6)');
        gg.fillStyle = '#fff2b8';
        gg.fillRect(lx - u * 1.3, top - u * 3.4, u * 2.6, u * 2.8);
      });
      // пена у кромки берега
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.fillRect(0, hz + u * 15.2, W, Math.max(1.5, u * 0.5));
      // дюны и дорога
      ridge(g, W, H, hz + u * 19, u * 4, 31, '#efd9a6', 0.8, 'dots');
      ridge(g, W, H, hz + u * 25, u * 5, 37, '#e6c98d', 1.1, 'dots');
      rock(g, W * 0.08, H - u * 6, u * 7, '#a39b8c');
      rock(g, W * 0.14, H - u * 4, u * 4, '#b5ad9c');
      // ракушки и морская звезда
      const star = (x, y, r) => {
        g.fillStyle = '#ef8a5a';
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * TAU - Math.PI / 2,
            rr = k % 2 ? r * 0.45 : r;
          g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.fill();
        disc(g, x - r * 0.15, y - r * 0.15, r * 0.2, 'rgba(255,255,255,.4)');
      };
      star(W * 0.86, H - u * 5, u * 2.4);
      g.fillStyle = '#fbeee0';
      g.beginPath();
      g.ellipse(W * 0.78, H - u * 3, u * 1.6, u * 1.1, 0.3, 0, TAU);
      g.fill();
      const rg = g.createLinearGradient(0, hz + u * 19, 0, H);
      rg.addColorStop(0, '#b9a684');
      rg.addColorStop(1, '#9c8a6a');
      g.fillStyle = rg;
      g.beginPath();
      g.moveTo(W * 0.2, H + 2);
      g.quadraticCurveTo(W * 0.42, hz + u * 30, W * 0.49, hz + u * 19);
      g.lineTo(W * 0.53, hz + u * 19);
      g.quadraticCurveTo(W * 0.6, hz + u * 30, W * 0.82, H + 2);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.65)';
      g.setLineDash([u * 2, u * 2.2]);
      g.lineWidth = Math.max(1, u * 0.45);
      g.beginPath();
      g.moveTo(W * 0.51, H + 2);
      g.quadraticCurveTo(W * 0.51, hz + u * 30, W * 0.51, hz + u * 20);
      g.stroke();
      g.setLineDash([]);
      // столбики и травка на дюнах
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        const y = lerp(H - u * 2, hz + u * 23, t),
          s = u * (5 - t * 3.5);
        for (const side of [-1, 1]) {
          const x = W * 0.51 + side * lerp(W * 0.36, W * 0.05, t);
          g.fillStyle = '#9a7650';
          g.fillRect(x - s * 0.08, y - s, s * 0.16, s);
        }
      }
      for (let k = 0; k < 18; k++) {
        const x = R() * W;
        if (Math.abs(x - W * 0.51) < W * 0.12) continue;
        tuft(g, x, lerp(hz + u * 22, H, R()), u * (1.6 + R() * 1.6), '#9aa85a');
      }
    },
  },
  // 4. Осенний лес: рыжие деревья, ели, грибы
  {
    sky: ['#9ec5df', '#d9dfe2', '#f6dfc0'],
    nsky: ['#111834', '#262b52', '#4a3b5a'],
    parts: { day: 'leaf', night: 'leaf' },
    skyArt(c) {
      const { g, W, H, u, hz, N, R } = c;
      if (N) {
        stars(g, W, H, R, (W * hz) / 2600, hz * 0.8);
        moon(g, W * 0.8, hz * 0.25, u * 5);
      } else {
        sun(g, W * 0.8, hz * 0.34, u * 5.5, '#fff0c8', 'rgba(255,214,150,.55)');
        cloud(g, W * 0.12, hz * 0.3, u * 5, 'rgba(255,255,255,.75)');
        bird(g, W * 0.45, hz * 0.3, u * 1.3, 'rgba(70,60,70,.5)');
        bird(g, W * 0.5, hz * 0.36, u * 1.1, 'rgba(70,60,70,.45)');
        bird(g, W * 0.41, hz * 0.38, u * 0.9, 'rgba(70,60,70,.4)');
      }
    },
    land(c) {
      const { g, W, H, u, hz, R } = c;
      mountains(g, W, hz + u * 2, u * 14, 40, '#b4a4b4', '#f6f2f4');
      haze(g, W, hz + u * 1, u * 4, 'rgba(250,236,220,.6)');
      // дальняя полоса леса в дымке
      g.fillStyle = '#d2a483';
      for (let x = 0; x < W + u * 3; x += u * 2.6) disc(g, x, hz + u * (1.5 + Math.sin(x * 0.07) * 0.8), u * 2.4, '#d6a07a');
      ridge(g, W, H, hz + u * 2, u * 8, 41, '#c9a58c', 1);
      const crowns = [['#e8893a', '#f3aa5a'], ['#d4562f', '#e8784a'], ['#f2c040', '#f8d870'], ['#b8452e', '#d2654a']];
      for (let k = 0; k < 10; k++) {
        const x = W * (k / 9) + (R() - 0.5) * W * 0.06;
        const y = ridgeY(W, hz + u * 2, u * 8, 41, 1, x) + u * 3;
        if (k % 3 === 1) fir(g, x, y, u * (9 + R() * 3), '#3f6b4f', '#4d7d5c');
        else {
          const cc = crowns[k % 4];
          roundTree(g, x, y, u * (8 + R() * 3), '#6b4a36', cc[0], cc[1]);
        }
      }
      ridge(g, W, H, hz + u * 12, u * 6, 43, '#b97a4a', 1.3);
      for (let k = 0; k < 7; k++) {
        const x = W * (0.07 + k * 0.145) + (R() - 0.5) * W * 0.05;
        const y = ridgeY(W, hz + u * 12, u * 6, 43, 1.3, x) + u * 4;
        if (k % 3 === 2) fir(g, x, y, u * (14 + R() * 4), '#2f5a40', '#3c6c4e');
        else {
          const cc = crowns[(k + 1) % 4];
          roundTree(g, x, y, u * (13 + R() * 4), '#5a3c2a', cc[0], cc[1]);
        }
      }
      haze(g, W, hz + u * 22, u * 4, 'rgba(255,220,180,.2)');
      ridge(g, W, H, hz + u * 24, u * 4, 47, '#a5633a', 0.9, 'dots');
      // пенёк
      const px = W * 0.7,
        py = H - u * 5;
      groundShadow(g, px, py, u * 4, u * 0.8);
      const sg = g.createLinearGradient(px - u * 3, 0, px + u * 3, 0);
      sg.addColorStop(0, '#9a6a48');
      sg.addColorStop(1, '#5a3a26');
      g.fillStyle = sg;
      g.fillRect(px - u * 3, py - u * 4, u * 6, u * 4);
      g.fillStyle = '#e2c08e';
      g.beginPath();
      g.ellipse(px, py - u * 4, u * 3, u * 1, 0, 0, TAU);
      g.fill();
      g.strokeStyle = '#b8915e';
      g.lineWidth = Math.max(1, u * 0.2);
      for (const rr of [0.4, 0.7]) {
        g.beginPath();
        g.ellipse(px, py - u * 4, u * 3 * rr, u * rr, 0, 0, TAU);
        g.stroke();
      }
      bush(g, W * 0.97, H - u * 1, u * 9, '#c8682f');
      bush(g, W * 0.03, H + u * 1, u * 8, '#d4862f');
      // ковёр из листьев
      const lc = ['#e8893a', '#d4562f', '#f2c040', '#b8452e', '#f3aa5a'];
      for (let k = 0; k < 70; k++) {
        const x = R() * W,
          y = lerp(hz + u * 24, H, R());
        const s = u * (0.5 + ((y - hz) / (H - hz)) * 1.1);
        g.save();
        g.translate(x, y);
        g.rotate(R() * TAU);
        g.fillStyle = lc[k % lc.length];
        g.beginPath();
        g.ellipse(0, 0, s, s * 0.5, 0, 0, TAU);
        g.fill();
        g.restore();
      }
      // грибы
      const mush = (x, y, s, cap) => {
        g.fillStyle = '#f4ead6';
        g.beginPath();
        g.moveTo(x - s * 0.22, y);
        g.lineTo(x - s * 0.16, y - s * 0.7);
        g.lineTo(x + s * 0.16, y - s * 0.7);
        g.lineTo(x + s * 0.22, y);
        g.fill();
        g.fillStyle = cap;
        g.beginPath();
        g.ellipse(x, y - s * 0.7, s * 0.6, s * 0.42, 0, Math.PI, TAU);
        g.fill();
        if (cap === '#d6402f') for (const [dx, dy] of [[-0.25, -0.88], [0.15, -0.95], [0.32, -0.78]]) disc(g, x + dx * s, y + dy * s, s * 0.07, '#fff');
      };
      mush(W * 0.14, H - u * 6, u * 6, '#d6402f');
      mush(W * 0.2, H - u * 4.5, u * 3.5, '#8a5232');
      mush(W * 0.88, H - u * 8, u * 4.5, '#d6402f');
    },
  },
  // 5. Зимние узоры: снежные холмы, ели, домик с дымом, снеговик
  {
    sky: ['#a9c4e8', '#d6e2f2', '#f2eef6'],
    nsky: ['#0c1430', '#1e2b58', '#3a4a7a'],
    parts: { day: 'snow', night: 'snow' },
    skyArt(c) {
      const { g, W, H, u, hz, N, R } = c;
      if (N) {
        stars(g, W, H, R, (W * hz) / 2200, hz * 0.85);
        moon(g, W * 0.25, hz * 0.26, u * 5);
      } else {
        sun(g, W * 0.24, hz * 0.3, u * 5, '#fffaf0', 'rgba(255,255,240,.6)');
        cloud(g, W * 0.6, hz * 0.22, u * 6, 'rgba(255,255,255,.8)');
      }
      // морозные узоры по верхним углам
      frost(g, 0, 0, u * 26, 1);
      frost(g, W, 0, u * 26, -1);
    },
    land(c) {
      const { g, W, H, u, hz, R } = c;
      mountains(g, W, hz + u * 2, u * 18, 50, '#9fb0d0', '#fbfdff');
      haze(g, W, hz + u * 1, u * 4, 'rgba(245,248,255,.7)');
      ridge(g, W, H, hz + u * 2, u * 8, 51, '#dbe5f2', 1, 'snow');
      for (let k = 0; k < 9; k++) {
        const x = W * (k / 8) + (R() - 0.5) * W * 0.06;
        fir(g, x, ridgeY(W, hz + u * 2, u * 8, 51, 1, x) + u * 3, u * (8 + R() * 3), '#4f7a76', '#5e8b86', '#f4f8fc');
      }
      ridge(g, W, H, hz + u * 12, u * 6, 53, '#eef3fa', 1.3, 'snow');
      // домик
      const hx = W * 0.68,
        hy = ridgeY(W, hz + u * 12, u * 6, 53, 1.3, W * 0.68) + u * 2;
      house(c, hx, hy, u * 11, { wall: '#c98a5e', roof: '#7d4a52', chimney: true, door: '#6a3a32', lit: true });
      g.fillStyle = '#fbfdff';
      g.beginPath();
      g.moveTo(hx - u * 7, hy - u * 6.6);
      g.quadraticCurveTo(hx - u * 3, hy - u * 12.5, hx, hy - u * 12.2);
      g.quadraticCurveTo(hx + u * 3, hy - u * 12.5, hx + u * 7, hy - u * 6.6);
      g.quadraticCurveTo(hx + u * 3, hy - u * 9.6, hx, hy - u * 10.6);
      g.quadraticCurveTo(hx - u * 3, hy - u * 9.6, hx - u * 7, hy - u * 6.6);
      g.fill();
      // дымок
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let k = 0; k < 4; k++) disc(g, hx + u * (3 + k * 1.3), hy - u * (14 + k * 2.6), u * (1 + k * 0.45), 'rgba(255,255,255,' + (0.7 - k * 0.14) + ')');
      for (let k = 0; k < 5; k++) {
        const x = W * (0.05 + k * 0.2) + (R() - 0.5) * W * 0.05;
        if (Math.abs(x - hx) < u * 12) continue;
        fir(g, x, ridgeY(W, hz + u * 12, u * 6, 53, 1.3, x) + u * 5, u * (13 + R() * 4), '#3d6763', '#4d7a74', '#f8fbff');
      }
      ridge(g, W, H, hz + u * 24, u * 4, 57, '#f7faff', 0.9, 'snow');
      // заборчик в снегу
      fence(g, W * 0.55, W * 0.98, hz + u * 30, u * 4.5, '#8a6a52');
      g.fillStyle = '#ffffff';
      for (let x = W * 0.55; x < W * 0.98; x += u * 4.5 * 0.55) {
        g.beginPath();
        g.ellipse(x + u * 0.5, hz + u * 30 - u * 4, u * 0.8, u * 0.45, 0, 0, TAU);
        g.fill();
      }
      g.fillRect(W * 0.55, hz + u * 30 - u * 2.95, W * 0.43, u * 0.35);
      g.beginPath();
      g.ellipse(W * 0.76, hz + u * 30.4, W * 0.24, u * 1.4, 0, 0, TAU);
      g.fill();
      // голубые тени сугробов
      g.fillStyle = 'rgba(150,175,215,.25)';
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.ellipse(R() * W, lerp(hz + u * 28, H, R()), u * (6 + R() * 8), u * (0.8 + R() * 0.8), 0, 0, TAU);
        g.fill();
      }
      // снеговик
      const sx = W * 0.2,
        sy = H - u * 5;
      disc(g, sx, sy - u * 4, u * 4.6, '#ffffff');
      disc(g, sx, sy - u * 10.5, u * 3.3, '#ffffff');
      disc(g, sx, sy - u * 15.2, u * 2.4, '#ffffff');
      g.fillStyle = 'rgba(150,175,215,.35)';
      g.beginPath();
      g.ellipse(sx + u * 1.5, sy + u * 0.4, u * 6, u * 1.1, 0, 0, TAU);
      g.fill();
      disc(g, sx, sy - u * 4, u * 4.6, '#ffffff');
      disc(g, sx - u * 0.8, sy - u * 15.6, u * 0.32, '#2a2a36');
      disc(g, sx + u * 0.8, sy - u * 15.6, u * 0.32, '#2a2a36');
      g.fillStyle = '#ee8a3a';
      g.beginPath();
      g.moveTo(sx, sy - u * 15);
      g.lineTo(sx + u * 2.4, sy - u * 14.6);
      g.lineTo(sx, sy - u * 14.3);
      g.fill();
      g.fillStyle = '#d64545';
      g.fillRect(sx - u * 2.6, sy - u * 13.4, u * 5.2, u * 1.1);
      g.fillRect(sx + u * 1, sy - u * 13, u * 1.1, u * 3.4);
      for (const k of [0, 1, 2]) disc(g, sx, sy - u * (9.4 + k * 1.3), u * 0.3, '#2a2a36');
      g.strokeStyle = '#6b4a36';
      g.lineWidth = u * 0.5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(sx - u * 3, sy - u * 11);
      g.lineTo(sx - u * 6.5, sy - u * 13.5);
      g.moveTo(sx + u * 3, sy - u * 11);
      g.lineTo(sx + u * 6.2, sy - u * 9.5);
      g.stroke();
    },
  },
  // 6. Книжная полка: уютная комната, полки с книгами, окно, лампа
  {
    sky: ['#d7b48a', '#e7c99e', '#e9cfa8'],
    nsky: ['#2a2238', '#352a40', '#3a2c3c'],
    parts: { day: 'dust', night: 'dust' },
    interior: true,
    skyArt() {},
    land(c) {
      const { g, W, H, u, R, N } = c;
      // обои в мелкий узор
      g.fillStyle = 'rgba(255,255,255,.16)';
      const st = u * 6;
      for (let y = st / 2; y < H; y += st)
        for (let x = ((y / st) % 2) * (st / 2); x < W + st; x += st) {
          g.beginPath();
          g.moveTo(x, y - u * 0.9);
          g.lineTo(x + u * 0.6, y);
          g.lineTo(x, y + u * 0.9);
          g.lineTo(x - u * 0.6, y);
          g.fill();
        }
      // окно
      const ww = Math.min(W * 0.36, u * 34),
        wh = ww * 1.15,
        wx = W * 0.5 - ww / 2,
        wy = H * 0.1;
      const sk = g.createLinearGradient(0, wy, 0, wy + wh);
      sk.addColorStop(0, N ? '#16204a' : '#8fc8ea');
      sk.addColorStop(1, N ? '#36457a' : '#dff0f4');
      g.fillStyle = '#7a5236';
      g.fillRect(wx - u * 1.6, wy - u * 1.6, ww + u * 3.2, wh + u * 3.2);
      g.fillStyle = sk;
      g.fillRect(wx, wy, ww, wh);
      if (N) {
        g.save();
        g.translate(wx, wy);
        stars(g, ww, wh, rnd(5), 26, wh * 0.6);
        g.restore();
        moon(g, wx + ww * 0.7, wy + wh * 0.28, u * 3.2);
      } else {
        cloud(g, wx + ww * 0.12, wy + wh * 0.3, u * 3.4, 'rgba(255,255,255,.9)');
        disc(g, wx + ww * 0.78, wy + wh * 0.22, u * 3.2, '#fff3c4');
      }
      g.fillStyle = N ? '#2e3d55' : '#8cc08a';
      g.beginPath();
      g.moveTo(wx, wy + wh);
      g.quadraticCurveTo(wx + ww * 0.3, wy + wh * 0.72, wx + ww * 0.6, wy + wh * 0.82);
      g.quadraticCurveTo(wx + ww * 0.85, wy + wh * 0.7, wx + ww, wy + wh * 0.78);
      g.lineTo(wx + ww, wy + wh);
      g.fill();
      g.fillStyle = '#7a5236';
      g.fillRect(wx + ww / 2 - u * 0.6, wy, u * 1.2, wh);
      g.fillRect(wx, wy + wh * 0.48, ww, u * 1.2);
      // занавески
      g.fillStyle = '#b5524a';
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? wx - u * 4 : wx + ww + u * 4;
        g.beginPath();
        g.moveTo(x0, wy - u * 3);
        g.lineTo(x0 - side * u * 7, wy - u * 3);
        g.quadraticCurveTo(x0 - side * u * 3, wy + wh * 0.5, x0 - side * u * 6, wy + wh + u * 4);
        g.lineTo(x0, wy + wh + u * 4);
        g.fill();
      }
      g.fillStyle = '#7a5236';
      g.fillRect(wx - u * 6, wy - u * 4, ww + u * 12, u * 1.2);
      // полки с книгами (по бокам от окна и под ним)
      const bc = ['#b5524a', '#2f6e8a', '#d8a440', '#4f8a5e', '#7a4f8a', '#c8743a', '#3d5a8a', '#a33b4d', '#e2c58c', '#556b2f'];
      const shelf = (x0, x1, y, hMax) => {
        const ng = g.createLinearGradient(0, y - hMax - u * 3, 0, y);
        ng.addColorStop(0, 'rgba(40,20,10,.38)');
        ng.addColorStop(1, 'rgba(40,20,10,.08)');
        g.fillStyle = ng;
        g.fillRect(x0 - u, y - hMax - u * 3, x1 - x0 + u * 2, hMax + u * 3);
        const sg = g.createLinearGradient(0, y, 0, y + u * 1.4);
        sg.addColorStop(0, '#9a6a48');
        sg.addColorStop(0.35, '#7a5036');
        sg.addColorStop(1, '#5a3826');
        g.fillStyle = sg;
        g.fillRect(x0 - u, y, x1 - x0 + u * 2, u * 1.4);
        g.fillStyle = 'rgba(0,0,0,.18)';
        g.fillRect(x0 - u, y + u * 1.4, x1 - x0 + u * 2, u * 0.6);
        let x = x0;
        while (x < x1 - u * 2) {
          const r = R();
          if (r < 0.06) {
            // горшок с растением
            const pw = u * 4;
            g.fillStyle = '#c86a4a';
            g.fillRect(x, y - u * 3.5, pw, u * 3.5);
            g.fillStyle = '#5aa06a';
            for (const [dx, dy, rr] of [[0.5, -5.5, 1.8], [0.2, -4.6, 1.3], [0.8, -4.8, 1.4]]) disc(g, x + pw * dx, y + u * dy, u * rr, '#5aa06a');
            x += pw + u;
            continue;
          }
          const bw = u * (1.6 + R() * 1.6),
            bh = Math.min(hMax, u * (7 + R() * 5));
          const col = bc[Math.floor(R() * bc.length)];
          if (r > 0.93 && x + bh < x1) {
            // лежащая стопка
            for (let k = 0; k < 3; k++) {
              g.fillStyle = bc[Math.floor(R() * bc.length)];
              g.fillRect(x, y - (k + 1) * u * 1.7, bh * (0.9 - k * 0.06), u * 1.6);
            }
            x += bh + u * 0.6;
            continue;
          }
          const bg = g.createLinearGradient(x, 0, x + bw, 0);
          bg.addColorStop(0, shade(col, -0.15));
          bg.addColorStop(0.3, shade(col, 0.18));
          bg.addColorStop(0.7, col);
          bg.addColorStop(1, shade(col, -0.3));
          g.fillStyle = bg;
          g.fillRect(x, y - bh, bw, bh);
          g.fillStyle = shade(col, -0.25);
          g.fillRect(x + bw * 0.25, y - bh * 0.62, bw * 0.5, bh * 0.12);
          g.fillStyle = 'rgba(255,255,255,.35)';
          g.fillRect(x, y - bh * 0.82, bw, u * 0.4);
          g.fillRect(x, y - bh * 0.2, bw, u * 0.4);
          g.fillStyle = 'rgba(0,0,0,.12)';
          g.fillRect(x + bw - u * 0.4, y - bh, u * 0.4, bh);
          x += bw + u * 0.15;
        }
      };
      const gap = u * 15;
      for (let y = H * 0.18; y < H; y += gap) {
        if (y > wy - u * 2 && y < wy + wh + u * 14) {
          shelf(u * 2, wx - u * 9, y, gap - u * 3);
          shelf(wx + ww + u * 9, W - u * 2, y, gap - u * 3);
        } else shelf(u * 2, W - u * 2, y, gap - u * 3);
      }
      // подоконник с лампой
      g.fillStyle = '#8a5e40';
      g.fillRect(wx - u * 3, wy + wh + u * 1.6, ww + u * 6, u * 1.8);
      const lx = wx + ww * 0.82,
        ly = wy + wh + u * 1.6;
      g.fillStyle = '#3a3040';
      g.fillRect(lx - u * 0.4, ly - u * 7, u * 0.8, u * 7);
      g.fillRect(lx - u * 2.2, ly - u * 0.8, u * 4.4, u * 0.8);
      const lampShade = () => {
        const gg = c.g;
        glow(gg, lx, ly - u * 6, u * 22, N ? 'rgba(255,200,120,.55)' : 'rgba(255,220,150,.35)');
        gg.fillStyle = '#e8b25a';
        gg.beginPath();
        gg.moveTo(lx - u * 3.4, ly - u * 6);
        gg.lineTo(lx + u * 3.4, ly - u * 6);
        gg.lineTo(lx + u * 2, ly - u * 10);
        gg.lineTo(lx - u * 2, ly - u * 10);
        gg.fill();
      };
      lampShade();
      c.lit.push(lampShade);
      // чашка и раскрытая книга
      const cx = wx + ww * 0.2;
      g.fillStyle = '#f4efe6';
      g.fillRect(cx, ly - u * 2.6, u * 2.6, u * 2.6);
      g.strokeStyle = '#f4efe6';
      g.lineWidth = u * 0.5;
      g.beginPath();
      g.arc(cx + u * 2.9, ly - u * 1.4, u * 0.8, -1.4, 1.4);
      g.stroke();
      g.fillStyle = '#fffaf0';
      g.beginPath();
      g.moveTo(cx + u * 5, ly);
      g.quadraticCurveTo(cx + u * 7.5, ly - u * 1.6, cx + u * 10, ly - u * 0.4);
      g.quadraticCurveTo(cx + u * 12.5, ly - u * 1.6, cx + u * 15, ly);
      g.fill();
    },
  },
  // 7. Тихое озеро: лес на том берегу, отражения, мостки, лодка, камыши, утки
  {
    sky: ['#8fc3e6', '#cfe3ee', '#f8e6d6'],
    nsky: ['#0c1532', '#1b2c5a', '#34507a'],
    parts: { day: 'pollen', night: 'firefly' },
    skyArt(c) {
      const { g, W, hz, u, N, R } = c;
      if (N) {
        stars(g, W, hz, R, (W * hz) / 2400, hz * 0.85);
        moon(g, W * 0.7, hz * 0.3, u * 4.5);
      } else {
        sun(g, W * 0.7, hz * 0.42, u * 5.5, '#fff4d0', 'rgba(255,225,170,.55)');
        cloud(g, W * 0.12, hz * 0.28, u * 5.5, 'rgba(255,255,255,.85)');
        cloud(g, W * 0.82, hz * 0.18, u * 4, 'rgba(255,255,255,.7)');
      }
    },
    land(c) {
      const { g, W, H, u, hz, R, N } = c;
      mountains(g, W, hz - u * 1, u * 12, 81, '#93a9c4', '#f4f7fc');
      haze(g, W, hz - u * 1, u * 4, 'rgba(240,246,250,.6)');
      // дальний берег с ельником
      ridge(g, W, H, hz + u * 1, u * 3, 83, '#5f8f6e', 1.4);
      const shore = hz + u * 3;
      const firs = [];
      for (let x = -u * 2; x < W + u * 2; x += u * (2.2 + R() * 1.6)) firs.push([x, shore + R() * u * 0.6, u * (4 + R() * 3)]);
      for (const [x, y, s] of firs) fir(g, x, y, s, '#3f6f55', '#4f8264');
      // вода с отражением берега
      const wy = shore,
        wh = u * 26;
      const wg = g.createLinearGradient(0, wy, 0, wy + wh);
      wg.addColorStop(0, '#6c9fb8');
      wg.addColorStop(0.5, '#4f88a6');
      wg.addColorStop(1, '#3a6f8e');
      g.fillStyle = wg;
      g.fillRect(0, wy, W, H - wy);
      g.save();
      g.globalAlpha = 0.28;
      for (const [x, y, s] of firs) {
        g.save();
        g.translate(0, wy * 2 + u * 0.6);
        g.scale(1, -1);
        fir(g, x, y, s, '#2f5a45');
        g.restore();
      }
      g.restore();
      // блики и рябь
      g.strokeStyle = 'rgba(255,255,255,.5)';
      g.lineWidth = Math.max(1, u * 0.25);
      for (let k = 0; k < 22; k++) {
        const x = R() * W,
          y = wy + u * (2 + R() * 22),
          l = u * (1.5 + R() * 3);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + l, y);
        g.stroke();
      }
      // дорожка от солнца / луны
      g.fillStyle = N ? 'rgba(255,240,200,.55)' : 'rgba(255,248,220,.7)';
      for (let k = 0; k < 10; k++) {
        const y = wy + u * (1 + k * 1.8),
          w = u * (1.5 + k * 0.9) * (0.6 + R() * 0.5);
        g.fillRect(W * 0.7 - w / 2, y, w, Math.max(1, u * 0.3));
      }
      // кувшинки
      for (let k = 0; k < 7; k++) {
        const x = W * (0.1 + R() * 0.5),
          y = wy + u * (8 + R() * 14),
          r = u * (1.2 + R() * 1);
        g.fillStyle = '#4f8f4a';
        g.beginPath();
        g.ellipse(x, y, r, r * 0.4, 0, 0.3, TAU);
        g.lineTo(x, y);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.25)';
        g.beginPath();
        g.ellipse(x - r * 0.3, y - r * 0.1, r * 0.4, r * 0.12, 0, 0, TAU);
        g.fill();
        if (k % 3 === 0) flower(g, x + r * 0.2, y - r * 0.25, r * 0.45, '#fbd3e0', '#ffe08a');
      }
      // утки
      const duck = (x, y, s, f) => {
        g.save();
        g.translate(x, y);
        g.scale(f, 1);
        g.strokeStyle = 'rgba(255,255,255,.5)';
        g.lineWidth = Math.max(1, s * 0.06);
        g.beginPath();
        g.ellipse(0, s * 0.1, s * 1.4, s * 0.25, 0, 0, TAU);
        g.stroke();
        blob(g, 0, -s * 0.15, s * 0.55, '#8a6a4a');
        g.fillStyle = '#8a6a4a';
        g.beginPath();
        g.ellipse(-s * 0.1, -s * 0.05, s * 0.8, s * 0.35, 0, 0, TAU);
        g.fill();
        blob(g, s * 0.55, -s * 0.6, s * 0.3, '#3f7a55');
        g.fillStyle = '#e8a33a';
        g.beginPath();
        g.moveTo(s * 0.8, -s * 0.62);
        g.lineTo(s * 1.1, -s * 0.55);
        g.lineTo(s * 0.8, -s * 0.5);
        g.fill();
        disc(g, s * 0.62, -s * 0.68, s * 0.05, '#111');
        g.restore();
      };
      duck(W * 0.42, wy + u * 9, u * 1.6, 1);
      duck(W * 0.48, wy + u * 11, u * 1.1, 1);
      // мостки справа в перспективе
      const px = W * 0.62,
        py = wy + u * 12;
      const pg = g.createLinearGradient(0, py, 0, H);
      pg.addColorStop(0, '#b88a5c');
      pg.addColorStop(1, '#8a6040');
      g.fillStyle = pg;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + u * 6, py);
      g.lineTo(W + u * 8, H + 2);
      g.lineTo(W * 0.66, H + 2);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(70,40,20,.45)';
      g.lineWidth = Math.max(1, u * 0.2);
      for (let k = 1; k < 12; k++) {
        const t = (k / 12) ** 1.6;
        const y = lerp(py, H, t);
        g.beginPath();
        g.moveTo(lerp(px, W * 0.66, t), y);
        g.lineTo(lerp(px + u * 6, W + u * 8, t), y);
        g.stroke();
      }
      for (const t of [0.15, 0.45, 0.85]) {
        const y = lerp(py, H, t),
          s = lerp(u * 0.6, u * 2.2, t);
        g.fillStyle = '#5e3e28';
        g.fillRect(lerp(px, W * 0.66, t) - s, y, s, s * 4);
        g.fillRect(lerp(px + u * 6, W + u * 8, t) - s * 0.2, y, s, s * 4);
      }
      // фонарь на мостках
      const lx = px + u * 5.2,
        ly = py + u * 1;
      g.fillStyle = '#3a2a22';
      g.fillRect(lx - u * 0.3, ly - u * 7, u * 0.6, u * 7);
      const lamp = () => {
        glow(c.g, lx, ly - u * 7.6, u * 8, 'rgba(255,200,110,.5)');
        c.g.fillStyle = '#ffe2a0';
        c.g.fillRect(lx - u * 0.8, ly - u * 8.6, u * 1.6, u * 2);
      };
      g.fillStyle = '#3a2a22';
      g.fillRect(lx - u * 1, ly - u * 8.9, u * 2, u * 0.4);
      g.fillStyle = '#e8d9b0';
      g.fillRect(lx - u * 0.8, ly - u * 8.6, u * 1.6, u * 2);
      c.lit.push(lamp);
      // лодка у мостков
      const bx = W * 0.5,
        by = wy + u * 17;
      g.fillStyle = 'rgba(30,50,70,.25)';
      g.beginPath();
      g.ellipse(bx, by + u * 1.4, u * 7, u * 0.9, 0, 0, TAU);
      g.fill();
      const bg = g.createLinearGradient(0, by - u * 2, 0, by + u * 1.2);
      bg.addColorStop(0, '#d9774a');
      bg.addColorStop(1, '#9a4a2c');
      g.fillStyle = bg;
      g.beginPath();
      g.moveTo(bx - u * 6.5, by - u * 1.8);
      g.lineTo(bx + u * 6.5, by - u * 1.8);
      g.quadraticCurveTo(bx + u * 5, by + u * 1.2, bx, by + u * 1.2);
      g.quadraticCurveTo(bx - u * 5, by + u * 1.2, bx - u * 6.5, by - u * 1.8);
      g.fill();
      g.fillStyle = '#f2e6d0';
      g.fillRect(bx - u * 6.5, by - u * 2.1, u * 13, u * 0.5);
      g.strokeStyle = '#8a6040';
      g.lineWidth = u * 0.35;
      g.beginPath();
      g.moveTo(bx - u * 2, by - u * 2);
      g.lineTo(bx - u * 5, by - u * 5);
      g.moveTo(bx + u * 6.5, by - u * 1.8);
      g.quadraticCurveTo(bx + u * 9, by - u * 1, px + u * 1, py + u * 4);
      g.stroke();
      // камыши слева на переднем плане
      for (let k = 0; k < 16; k++) {
        const x = W * 0.02 + R() * W * 0.22,
          y = H - R() * u * 5,
          h = u * (10 + R() * 9);
        g.strokeStyle = k % 2 ? '#5f8a3e' : '#4d7a34';
        g.lineWidth = Math.max(1, u * 0.35);
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + u * (R() - 0.5) * 3, y - h * 0.6, x + u * (R() - 0.5) * 2, y - h);
        g.stroke();
        if (k % 3 === 0) {
          const tx = x + u * (R() - 0.5) * 1,
            ty = y - h * 0.8;
          g.fillStyle = '#7a4a2a';
          g.beginPath();
          g.ellipse(tx, ty, u * 0.6, u * 2, 0, 0, TAU);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,.25)';
          g.fillRect(tx - u * 0.4, ty - u * 1.6, u * 0.25, u * 2.6);
        }
      }
    },
  },
  // 8. Поле подсолнухов: лоскутные поля, мельница, тюки сена, подсолнухи
  {
    sky: ['#7cc0ea', '#bfe0f0', '#fff3d8'],
    nsky: ['#0d1634', '#1d2c58', '#3c4c70'],
    parts: { day: 'butterfly', night: 'firefly' },
    skyArt(c) {
      const { g, W, hz, u, N, R } = c;
      if (N) {
        stars(g, W, hz, R, (W * hz) / 2400, hz * 0.85);
        moon(g, W * 0.25, hz * 0.3, u * 5);
      } else {
        sun(g, W * 0.25, hz * 0.3, u * 6.5, '#fff1b8', 'rgba(255,225,140,.6)');
        cloud(g, W * 0.55, hz * 0.22, u * 6.5, 'rgba(255,255,255,.9)');
        cloud(g, W * 0.86, hz * 0.45, u * 4.5, 'rgba(255,255,255,.75)');
      }
    },
    land(c) {
      const { g, W, H, u, hz, R } = c;
      ridge(g, W, H, hz + u * 2, u * 6, 91, '#a9c98a', 1);
      // лоскутные поля на дальнем склоне
      const cols = ['#e8c95a', '#9cc46a', '#d9b04a', '#b7d27a', '#e2d07a'];
      for (let k = 0; k < 7; k++) {
        const y0 = hz + u * (4 + k * 1.8),
          y1 = y0 + u * 1.6;
        g.fillStyle = cols[k % cols.length];
        g.beginPath();
        g.moveTo(-4, y1);
        for (let x = -4; x <= W + 8; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.01 + k) * u * 0.6);
        g.lineTo(W + 8, y1 + u);
        g.lineTo(-4, y1 + u);
        g.fill();
      }
      // мельница
      const mx = W * 0.78,
        my = ridgeY(W, hz + u * 2, u * 6, 91, 1, W * 0.78) + u * 1;
      groundShadow(g, mx, my, u * 5, u * 0.8);
      const mg = g.createLinearGradient(mx - u * 3, 0, mx + u * 3, 0);
      mg.addColorStop(0, '#fbf3e4');
      mg.addColorStop(1, '#c9b89c');
      g.fillStyle = mg;
      g.beginPath();
      g.moveTo(mx - u * 3.2, my);
      g.lineTo(mx - u * 2, my - u * 13);
      g.lineTo(mx + u * 2, my - u * 13);
      g.lineTo(mx + u * 3.2, my);
      g.fill();
      g.fillStyle = '#9a4a3a';
      g.beginPath();
      g.moveTo(mx - u * 2.6, my - u * 13);
      g.lineTo(mx, my - u * 16.5);
      g.lineTo(mx + u * 2.6, my - u * 13);
      g.fill();
      g.fillStyle = '#6a3a2a';
      g.fillRect(mx - u * 0.8, my - u * 3.4, u * 1.6, u * 3.4);
      g.fillStyle = '#8fc0e0';
      g.fillRect(mx - u * 0.6, my - u * 9, u * 1.2, u * 1.6);
      const hx = mx,
        hy = my - u * 13.2;
      g.save();
      g.translate(hx, hy);
      g.rotate(0.35);
      for (let k = 0; k < 4; k++) {
        g.rotate(Math.PI / 2);
        g.fillStyle = '#6a4a32';
        g.fillRect(-u * 0.25, 0, u * 0.5, u * 10);
        g.fillStyle = 'rgba(250,244,230,.92)';
        g.fillRect(u * 0.25, u * 2, u * 2, u * 7.6);
        g.strokeStyle = 'rgba(106,74,50,.6)';
        g.lineWidth = Math.max(1, u * 0.12);
        for (let j = 1; j < 5; j++) {
          g.beginPath();
          g.moveTo(u * 0.25, u * (2 + j * 1.5));
          g.lineTo(u * 2.25, u * (2 + j * 1.5));
          g.stroke();
        }
      }
      g.restore();
      disc(g, hx, hy, u * 0.7, '#4a3020');
      // тюки сена
      const bale = (x, y, s) => {
        groundShadow(g, x, y, s * 1.1, s * 0.18);
        const bg = g.createLinearGradient(x - s, 0, x + s, 0);
        bg.addColorStop(0, '#f2d58a');
        bg.addColorStop(1, '#c9a050');
        g.fillStyle = bg;
        g.fillRect(x - s, y - s * 1.2, s * 1.4, s * 1.2);
        g.beginPath();
        g.ellipse(x + s * 0.4, y - s * 0.6, s * 0.45, s * 0.6, 0, 0, TAU);
        g.fillStyle = '#e6c06a';
        g.fill();
        g.strokeStyle = '#b8903e';
        g.lineWidth = Math.max(1, s * 0.05);
        for (const rr of [0.2, 0.4]) {
          g.beginPath();
          g.ellipse(x + s * 0.4, y - s * 0.6, s * rr, s * rr * 1.3, 0, 0, TAU);
          g.stroke();
        }
      };
      haze(g, W, hz + u * 16, u * 3, 'rgba(255,245,220,.35)');
      ridge(g, W, H, hz + u * 18, u * 3, 93, '#9cc46a', 0.8);
      bale(W * 0.18, hz + u * 20, u * 2.6);
      bale(W * 0.28, hz + u * 21, u * 2);
      bale(W * 0.52, hz + u * 19.5, u * 1.8);
      // подсолнухи: ряды от дальнего к ближнему
      const sunflower = (x, y, s, tilt) => {
        g.strokeStyle = '#5a8a3a';
        g.lineWidth = Math.max(1, s * 0.12);
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + s * 0.2, y - s * 1.5, x + tilt * s * 0.3, y - s * 2.6);
        g.stroke();
        if (s > u * 1.2) {
          for (const d of [-1, 1]) {
            g.fillStyle = d < 0 ? '#6a9e44' : '#4f8034';
            g.beginPath();
            g.ellipse(x + d * s * 0.45, y - s * 1.3, s * 0.5, s * 0.2, d * 0.5, 0, TAU);
            g.fill();
          }
        }
        const cx = x + tilt * s * 0.3,
          cy = y - s * 2.7;
        g.save();
        g.translate(cx, cy);
        g.rotate(tilt * 0.3);
        for (let k = 0; k < 16; k++) {
          g.rotate(TAU / 16);
          g.fillStyle = k % 2 ? '#f6c21c' : '#f2a91a';
          g.beginPath();
          g.ellipse(0, -s * 0.62, s * 0.16, s * 0.36, 0, 0, TAU);
          g.fill();
        }
        const cg = g.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.05, 0, 0, s * 0.42);
        cg.addColorStop(0, '#8a5a2a');
        cg.addColorStop(1, '#4a2e16');
        g.fillStyle = cg;
        g.beginPath();
        g.arc(0, 0, s * 0.4, 0, TAU);
        g.fill();
        if (s > u * 2) {
          g.fillStyle = 'rgba(255,220,150,.35)';
          for (let k = 0; k < 14; k++) {
            const a = k * 2.4,
              rr = s * 0.32 * Math.sqrt(k / 14);
            g.beginPath();
            g.arc(Math.cos(a) * rr, Math.sin(a) * rr, s * 0.03, 0, TAU);
            g.fill();
          }
        }
        g.restore();
      };
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        const t = r / (rows - 1);
        const y = lerp(hz + u * 23, H + u * 6, t ** 1.4),
          s = u * lerp(0.9, 5.2, t);
        const step = s * 1.3;
        for (let x = (r % 2) * step * 0.5 - step; x < W + step; x += step * (0.9 + R() * 0.3)) sunflower(x, y, s, (R() - 0.5) * 0.8);
      }
    },
  },
  // 9. Горный перевал: снежные вершины, водопад, шале, альпийский луг
  {
    sky: ['#6aaee0', '#a9d2ee', '#e8f4f6'],
    nsky: ['#0a1430', '#172a58', '#2d4876'],
    parts: { day: 'pollen', night: 'firefly' },
    skyArt(c) {
      const { g, W, hz, u, N, R } = c;
      if (N) {
        stars(g, W, hz, R, (W * hz) / 2000, hz * 0.85);
        moon(g, W * 0.18, hz * 0.25, u * 4.5);
      } else {
        sun(g, W * 0.18, hz * 0.22, u * 5, '#fffbe6', 'rgba(255,250,220,.6)');
        cloud(g, W * 0.6, hz * 0.18, u * 5, 'rgba(255,255,255,.85)');
        bird(g, W * 0.4, hz * 0.3, u * 1.4, 'rgba(50,60,80,.55)');
      }
    },
    land(c) {
      const { g, W, H, u, hz, R } = c;
      mountains(g, W, hz + u * 4, u * 30, 101, '#7f93b8', '#fbfdff');
      haze(g, W, hz - u * 2, u * 5, 'rgba(255,255,255,.45)');
      mountains(g, W, hz + u * 8, u * 18, 103, '#6f88a0', '#f4f8fc');
      haze(g, W, hz + u * 6, u * 4, 'rgba(240,248,255,.55)');
      // склон с ельником
      ridge(g, W, H, hz + u * 8, u * 8, 105, '#5f8f5e', 1.2);
      for (let k = 0; k < 16; k++) {
        const x = R() * W;
        fir(g, x, ridgeY(W, hz + u * 8, u * 8, 105, 1.2, x) + u * (2 + R() * 3), u * (5 + R() * 3), '#2f5f45', '#3f7457');
      }
      // скала с водопадом
      const fx = W * 0.3,
        top = hz + u * 2;
      const rg = g.createLinearGradient(fx - u * 10, 0, fx + u * 10, 0);
      rg.addColorStop(0, '#a7a39a');
      rg.addColorStop(1, '#6a665e');
      g.fillStyle = rg;
      g.beginPath();
      g.moveTo(fx - u * 12, hz + u * 22);
      g.lineTo(fx - u * 8, top);
      g.lineTo(fx + u * 7, top - u * 1.5);
      g.lineTo(fx + u * 11, hz + u * 22);
      g.fill();
      g.fillStyle = '#6f9a5a';
      g.beginPath();
      g.moveTo(fx - u * 8.5, top + u * 0.5);
      g.lineTo(fx - u * 8, top - u * 1);
      g.lineTo(fx + u * 7, top - u * 2.4);
      g.lineTo(fx + u * 7.4, top - u * 0.5);
      g.fill();
      const wg = g.createLinearGradient(0, top, 0, hz + u * 22);
      wg.addColorStop(0, '#d8f0ff');
      wg.addColorStop(1, '#8fc8ea');
      g.fillStyle = wg;
      g.fillRect(fx - u * 2, top - u * 1.5, u * 4, hz + u * 22 - top);
      g.strokeStyle = 'rgba(255,255,255,.75)';
      g.lineWidth = Math.max(1, u * 0.25);
      for (let k = 0; k < 6; k++) {
        const x = fx - u * 1.6 + k * u * 0.65;
        g.beginPath();
        g.moveTo(x, top);
        g.lineTo(x + u * 0.1, hz + u * 21);
        g.stroke();
      }
      for (let k = 0; k < 8; k++) disc(g, fx + (R() - 0.5) * u * 7, hz + u * (21 + R() * 2), u * (0.8 + R() * 1.2), 'rgba(255,255,255,.75)');
      // ручей
      g.fillStyle = '#7fbfe0';
      g.beginPath();
      g.moveTo(fx - u * 3, hz + u * 22);
      g.quadraticCurveTo(fx + u * 2, hz + u * 30, W * 0.12, H + 2);
      g.lineTo(W * 0.3, H + 2);
      g.quadraticCurveTo(fx + u * 6, hz + u * 30, fx + u * 3, hz + u * 22);
      g.fill();
      // луг
      ridge(g, W, H, hz + u * 22, u * 3, 107, '#8cc46e', 0.8);
      g.fillStyle = '#7fbfe0';
      g.beginPath();
      g.moveTo(fx - u * 1.5, hz + u * 22);
      g.quadraticCurveTo(fx + u * 3, hz + u * 32, W * 0.14, H + 2);
      g.lineTo(W * 0.27, H + 2);
      g.quadraticCurveTo(fx + u * 5, hz + u * 32, fx + u * 2, hz + u * 22);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.6)';
      g.lineWidth = Math.max(1, u * 0.3);
      for (let k = 0; k < 6; k++) {
        const y = lerp(hz + u * 25, H - u * 2, k / 6);
        const x = lerp(fx + u * 1.5, W * 0.2, k / 6);
        g.beginPath();
        g.moveTo(x - u, y);
        g.lineTo(x + u * 1.5, y);
        g.stroke();
      }
      // шале
      house(c, W * 0.7, hz + u * 25, u * 12, { wall: '#c88a56', roof: '#5a4a5e', chimney: true, door: '#6a3a28', frame: '#fff' });
      // цветы и камни на лугу
      const fc = ['#ffffff', '#f2d14a', '#c88ae6', '#f07a9a', '#7ab0f0'];
      for (let k = 0; k < 40; k++) {
        const x = R() * W,
          y = lerp(hz + u * 25, H, R());
        if (x > W * 0.08 && x < W * 0.36 && y > hz + u * 24) continue;
        flower(g, x, y, u * (0.5 + ((y - hz) / (H - hz)) * 0.9), fc[k % fc.length]);
      }
      rock(g, W * 0.45, H - u * 4, u * 6, '#9a968c');
      rock(g, W * 0.9, H - u * 2, u * 8, '#8f8b80');
    },
  },
  // 10. Северное сияние: полярные сумерки, зелёные ленты в небе, тайга, замёрзшее озеро
  {
    sky: ['#13284e', '#245273', '#5f97a8', '#bcd8d8'],
    nsky: ['#050a1e', '#0c1c3c', '#173556', '#2a4a62'],
    parts: { day: 'snow', night: 'snow' },
    skyArt(c) {
      const { g, W, H, hz, u, N, R } = c;
      stars(g, W, hz, R, (W * hz) / (N ? 1400 : 2600), hz * 0.8);
      // ленты сияния: волнистые занавеси с вертикальными лучами
      const bands = [
        [0.28, 0.3, '120,255,190', 1],
        [0.42, 0.22, '110,220,255', 0.7],
        [0.18, 0.18, '190,140,255', 0.55],
      ];
      g.save();
      g.globalCompositeOperation = 'lighter';
      bands.forEach(([by, len, rgb, a], bi) => {
        const ph = R() * 6;
        const A = (N ? 1 : 0.75) * a;
        const yAt = (x) => hz * by + Math.sin(x / W * 5 + ph) * hz * 0.07 + Math.sin(x / W * 13 + ph * 2) * hz * 0.025;
        for (let x = -4; x < W + 4; x += 3) {
          const y = yAt(x),
            l = hz * len * (0.7 + 0.3 * Math.sin(x * 0.05 + bi));
          const gr = g.createLinearGradient(0, y - l, 0, y);
          gr.addColorStop(0, `rgba(${rgb},0)`);
          gr.addColorStop(0.75, `rgba(${rgb},${0.1 * A})`);
          gr.addColorStop(1, `rgba(${rgb},${0.28 * A})`);
          g.fillStyle = gr;
          g.fillRect(x, y - l, 3.2, l + 2);
        }
      });
      g.restore();
    },
    land(c) {
      const { g, W, H, u, hz, R } = c;
      mountains(g, W, hz + u * 3, u * 14, 111, '#6f86a4', '#eef4fb');
      haze(g, W, hz + u * 2, u * 3, 'rgba(200,230,240,.35)');
      ridge(g, W, H, hz + u * 4, u * 3, 113, '#dce8f2', 1.2, 'snow');
      for (let x = -u; x < W + u; x += u * (1.6 + R() * 1.2)) fir(g, x, hz + u * (4.6 + R()), u * (3 + R() * 2.5), '#24463e', '#2f5a4e', '#e8f0f8');
      // замёрзшее озеро с отражением сияния
      const ly = hz + u * 6,
        lh = u * 12;
      const lg = g.createLinearGradient(0, ly, 0, ly + lh);
      lg.addColorStop(0, '#5f8fa6');
      lg.addColorStop(0.5, '#8fb8c8');
      lg.addColorStop(1, '#c9dee6');
      g.fillStyle = lg;
      g.beginPath();
      g.ellipse(W * 0.5, ly + lh / 2, W * 0.42, lh / 2, 0, 0, TAU);
      g.fill();
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.25;
      g.fillStyle = 'rgb(120,255,190)';
      g.beginPath();
      g.ellipse(W * 0.45, ly + lh * 0.35, W * 0.25, lh * 0.12, 0, 0, TAU);
      g.fill();
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = Math.max(1, u * 0.2);
      for (let k = 0; k < 8; k++) {
        const x = W * (0.2 + R() * 0.6),
          y = ly + lh * (0.2 + R() * 0.6);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + u * (2 + R() * 3), y + u * (R() - 0.5));
        g.stroke();
      }
      ridge(g, W, H, hz + u * 18, u * 4, 115, '#eef4fa', 1, 'snow');
      // избушка с горящим окном
      house(c, W * 0.22, hz + u * 21, u * 11, { wall: '#8a5a3e', roof: '#e8f0f8', chimney: true, door: '#4a2e20', lit: true });
      for (let k = 0; k < 4; k++) disc(g, W * 0.22 + u * (3 + k * 1.2), hz + u * (8 - k * 2.4), u * (0.9 + k * 0.4), 'rgba(235,240,250,' + (0.6 - k * 0.12) + ')');
      ridge(g, W, H, hz + u * 26, u * 3, 117, '#f6faff', 0.8, 'snow');
      // крупные ели по краям
      fir(g, W * 0.92, H - u * 2, u * 26, '#1f4038', '#2b5248', '#f2f7fc');
      fir(g, W * 0.82, H + u * 2, u * 18, '#24463e', '#2f5a4e', '#f2f7fc');
      fir(g, W * 0.04, H + u * 1, u * 20, '#1f4038', '#2b5248', '#f2f7fc');
      // санки у избушки
      const sx = W * 0.4,
        sy = hz + u * 27;
      g.strokeStyle = '#7a4a2a';
      g.lineWidth = Math.max(1, u * 0.4);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(sx - u * 3, sy);
      g.lineTo(sx + u * 3, sy);
      g.quadraticCurveTo(sx + u * 4.2, sy, sx + u * 4, sy - u * 1.2);
      g.stroke();
      g.fillStyle = '#c0392b';
      g.fillRect(sx - u * 3, sy - u * 2, u * 6, u * 1.2);
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(sx - u * 3, sy - u * 2, u * 6, u * 0.3);
    },
  },
  // 11. Мастер слова: звёздное небо, созвездия, старый город, перо
  {
    sky: ['#3b3f8a', '#7a64a8', '#e9a77a', '#f6d39a'],
    nsky: ['#070b22', '#141a46', '#2c2a66', '#4b3570'],
    parts: { day: 'letter', night: 'letter' },
    skyArt(c) {
      const { g, W, H, u, hz, N, R } = c;
      stars(g, W, H, R, (W * hz) / (N ? 1500 : 3500), hz * (N ? 0.95 : 0.6));
      // созвездия
      g.strokeStyle = 'rgba(255,236,190,.35)';
      g.lineWidth = Math.max(1, u * 0.18);
      const cons = [
        [[0.08, 0.18], [0.16, 0.12], [0.22, 0.2], [0.3, 0.14], [0.36, 0.24]],
        [[0.62, 0.3], [0.7, 0.2], [0.78, 0.26], [0.74, 0.38], [0.62, 0.3]],
      ];
      for (const cn of cons) {
        g.beginPath();
        cn.forEach(([x, y], i) => (i ? g.lineTo(W * x, hz * y) : g.moveTo(W * x, hz * y)));
        g.stroke();
        for (const [x, y] of cn) {
          glow(g, W * x, hz * y, u * 2, 'rgba(255,240,200,.6)');
          disc(g, W * x, hz * y, Math.max(1.2, u * 0.35), '#fff6dc');
        }
      }
      // месяц
      const mx = W * 0.86,
        my = hz * 0.16,
        mr = u * 5;
      glow(g, mx, my, mr * 4, 'rgba(255,236,190,.25)');
      g.fillStyle = '#fbeec4';
      g.beginPath();
      g.arc(mx, my, mr, 0, TAU);
      g.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.85, 0, TAU, true);
      g.fill('evenodd');
    },
    land(c) {
      const { g, W, H, u, hz, R } = c;
      mountains(g, W, hz + u * 6, u * 12, 70, '#6e5c9a', null);
      haze(g, W, hz + u * 5, u * 4, 'rgba(240,170,140,.25)');
      ridge(g, W, H, hz + u * 6, u * 5, 71, '#5a4a86', 1, 'dots');
      // силуэт старого города
      const base = hz + u * 14;
      let x = -u * 2;
      const wins = [];
      g.fillStyle = '#3c2f63';
      while (x < W + u * 2) {
        const w = u * (5 + R() * 6),
          h = u * (6 + R() * 12);
        const tower = R() < 0.18;
        g.fillStyle = '#3c2f63';
        g.fillRect(x, base - h, w, h + u);
        g.fillStyle = 'rgba(255,190,150,.12)';
        g.fillRect(x, base - h, w * 0.18, h + u);
        g.fillStyle = 'rgba(10,5,30,.25)';
        g.fillRect(x + w * 0.82, base - h, w * 0.18, h + u);
        g.fillStyle = '#3c2f63';
        if (tower) {
          g.beginPath();
          g.moveTo(x - u * 0.5, base - h);
          g.lineTo(x + w / 2, base - h - u * 8);
          g.lineTo(x + w + u * 0.5, base - h);
          g.fill();
        } else {
          g.beginPath();
          g.moveTo(x - u * 0.3, base - h);
          g.lineTo(x + w / 2, base - h - u * 3);
          g.lineTo(x + w + u * 0.3, base - h);
          g.fill();
        }
        g.fillStyle = 'rgba(255,200,160,.35)';
        g.fillRect(x - u * 0.3, base - h, w + u * 0.6, Math.max(1, u * 0.3));
        for (let k = 0; k < 3; k++) if (R() < 0.6) wins.push([x + u * 1.2 + R() * (w - u * 3), base - h + u * 2 + R() * (h - u * 4)]);
        x += w + u * (0.2 + R() * 1.2);
      }
      // башня с часами
      const tx = W * 0.3,
        th = u * 30;
      g.fillStyle = '#3c2f63';
      g.fillRect(tx - u * 3.5, base - th, u * 7, th);
      g.fillStyle = 'rgba(10,5,30,.25)';
      g.fillRect(tx + u * 1.6, base - th, u * 1.9, th);
      g.fillStyle = '#3c2f63';
      g.beginPath();
      g.moveTo(tx - u * 4.5, base - th);
      g.lineTo(tx, base - th - u * 10);
      g.lineTo(tx + u * 4.5, base - th);
      g.fill();
      const clock = () => {
        disc(c.g, tx, base - th + u * 5, u * 2.6, '#f8e2a8');
        c.g.strokeStyle = '#3c2f63';
        c.g.lineWidth = u * 0.4;
        c.g.beginPath();
        c.g.moveTo(tx, base - th + u * 5);
        c.g.lineTo(tx, base - th + u * 3.2);
        c.g.moveTo(tx, base - th + u * 5);
        c.g.lineTo(tx + u * 1.3, base - th + u * 5.4);
        c.g.stroke();
      };
      clock();
      const lights = () => {
        for (const [wx, wy] of wins) {
          glow(c.g, wx + u * 0.6, wy + u * 0.8, u * 3, 'rgba(255,200,110,.35)');
          c.g.fillStyle = '#ffd98a';
          c.g.fillRect(wx, wy, u * 1.2, u * 1.6);
          c.g.fillStyle = 'rgba(90,50,40,.6)';
          c.g.fillRect(wx + u * 0.55, wy, u * 0.12, u * 1.6);
          c.g.fillRect(wx - u * 0.15, wy + u * 1.6, u * 1.5, u * 0.2);
        }
        clock();
      };
      lights();
      c.lit.push(lights);
      ridge(g, W, H, base + u * 4, u * 3, 73, '#2c2350', 0.8, 'dots');
      // перо в чернильнице
      const ix = W * 0.8,
        iy = H - u * 4;
      glow(g, ix, iy - u * 4, u * 10, 'rgba(255,220,160,.18)');
      g.fillStyle = '#5a4a8a';
      g.beginPath();
      g.moveTo(ix - u * 4, iy);
      g.lineTo(ix - u * 3, iy - u * 5);
      g.lineTo(ix + u * 3, iy - u * 5);
      g.lineTo(ix + u * 4, iy);
      g.fill();
      g.fillRect(ix - u * 1.8, iy - u * 6.6, u * 3.6, u * 1.8);
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(ix - u * 2.6, iy - u * 4.2, u * 0.8, u * 3.4);
      g.save();
      g.translate(ix, iy - u * 6);
      g.rotate(0.35);
      g.fillStyle = '#f4ecdc';
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-u * 4.5, -u * 10, -u * 0.5, -u * 22);
      g.quadraticCurveTo(u * 3.5, -u * 10, 0, 0);
      g.fill();
      g.strokeStyle = 'rgba(120,100,150,.6)';
      g.lineWidth = Math.max(1, u * 0.25);
      g.beginPath();
      g.moveTo(0, -u * 1);
      g.quadraticCurveTo(-u * 0.8, -u * 11, -u * 0.5, -u * 21);
      g.stroke();
      g.restore();
    },
  },
];

// снежинка-узор в углу экрана (sx = 1 — левый угол, −1 — правый)
function frost(g, x, y, s, sx) {
  g.save();
  g.translate(x, y);
  g.scale(sx, 1);
  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.lineCap = 'round';
  const branch = (len, w, d) => {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(len, 0);
    g.stroke();
    if (d <= 0) return;
    for (const t of [0.35, 0.6, 0.82]) {
      for (const a of [-0.7, 0.7]) {
        g.save();
        g.translate(len * t, 0);
        g.rotate(a);
        branch(len * (1 - t) * 0.55, w * 0.7, d - 1);
        g.restore();
      }
    }
  };
  for (const a of [0.15, 0.55, 0.95, 1.35]) {
    g.save();
    g.rotate(a);
    branch(s, Math.max(1, s * 0.02), 2);
    g.restore();
  }
  g.restore();
}

function sprout(g, x, y, s) {
  g.strokeStyle = '#4f9a4a';
  g.lineWidth = Math.max(1, s * 0.14);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + s * 0.1, y - s * 0.5, x, y - s * 0.8);
  g.stroke();
  g.fillStyle = '#7cc76a';
  g.beginPath();
  g.ellipse(x - s * 0.28, y - s * 0.82, s * 0.3, s * 0.14, -0.5, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(x + s * 0.28, y - s * 0.9, s * 0.32, s * 0.15, 0.5, 0, TAU);
  g.fill();
}

// ---------- базовый фон: бумага в клетку и буквы-плитки по краям ----------
function paintBase(g, W, H, N) {
  g.fillStyle = N ? '#161d2a' : '#f5efe3';
  g.fillRect(0, 0, W, H);
  // мягкие пятна света
  glow(g, W * 0.15, H * 0.1, Math.max(W, H) * 0.55, N ? 'rgba(63,160,134,.10)' : 'rgba(255,214,140,.30)');
  glow(g, W * 0.9, H * 0.95, Math.max(W, H) * 0.5, N ? 'rgba(109,155,224,.10)' : 'rgba(150,200,170,.22)');
  // клетка
  const s = 34;
  g.strokeStyle = N ? 'rgba(148,161,186,.07)' : 'rgba(42,50,70,.055)';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = (W % s) / 2; x < W; x += s) {
    g.moveTo(Math.round(x) + 0.5, 0);
    g.lineTo(Math.round(x) + 0.5, H);
  }
  for (let y = (H % s) / 2; y < H; y += s) {
    g.moveTo(0, Math.round(y) + 0.5);
    g.lineTo(W, Math.round(y) + 0.5);
  }
  g.stroke();
  // плитки с буквами по краям (центр свободен под меню)
  const R = rnd(77);
  const letters = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
  const lat = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lang = document.documentElement.lang === 'en' ? lat : letters;
  const t = Math.max(30, Math.min(W, H) * 0.075);
  const spots = [];
  const n = Math.round((W * H) / 30000) + 4;
  const narrow = W < 640;
  for (let k = 0; k < n * 4 && spots.length < n; k++) {
    let x = R() * W,
      y = R() * H;
    // на узком экране плитки выглядывают из-за краёв, чтобы не лезть под кнопки
    if (narrow) x = R() < 0.5 ? R() * t * 0.35 - t * 0.1 : W - R() * t * 0.35 + t * 0.1;
    const dx = Math.abs(x - W / 2) / (W / 2),
      dy = Math.abs(y - H / 2) / (H / 2);
    // на широком — только по бокам от колонки меню и не на карандаше
    if (!narrow && Math.abs(x - W / 2) < Math.min(W / 2 - t, 400)) continue;
    if (x < 200 && y > H - 170) continue;
    if (spots.some(([a, b]) => Math.hypot(a - x, b - y) < t * 1.8)) continue;
    spots.push([x, y]);
  }
  for (const [x, y] of spots) {
    const sz = t * (0.75 + R() * 0.5);
    g.save();
    g.translate(x, y);
    g.rotate((R() - 0.5) * 0.5);
    g.globalAlpha = N ? 0.32 : 0.42;
    g.fillStyle = N ? 'rgba(0,0,0,.35)' : 'rgba(60,45,20,.12)';
    g.fillRect(-sz / 2 + 2, -sz / 2 + 4, sz, sz);
    const hl = R() < 0.25;
    g.fillStyle = N ? (hl ? '#a87a1e' : '#283246') : hl ? '#ffc838' : '#fffaf0';
    g.strokeStyle = N ? '#94a1ba' : '#2a3246';
    g.lineWidth = Math.max(1.5, sz * 0.055);
    roundRect(g, -sz / 2, -sz / 2, sz, sz, sz * 0.12);
    g.fill();
    g.stroke();
    g.fillStyle = N ? '#f2ede3' : '#1d2536';
    g.font = `700 ${Math.round(sz * 0.6)}px "PT Sans",Arial,sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(lang[Math.floor(R() * lang.length)], 0, sz * 0.04);
    g.restore();
  }
  // карандаш в нижнем левом углу
  g.save();
  g.globalAlpha = N ? 0.4 : 0.55;
  g.translate(Math.min(W * 0.12, 90), H - Math.min(H * 0.1, 70));
  g.rotate(-0.6);
  const L = Math.max(90, Math.min(W, H) * 0.22),
    w = L * 0.09;
  g.fillStyle = '#e9b949';
  g.fillRect(-L / 2, -w / 2, L * 0.8, w);
  g.fillStyle = '#d29a2c';
  g.fillRect(-L / 2, w * 0.1, L * 0.8, w * 0.4);
  g.fillStyle = '#f2d2a2';
  g.beginPath();
  g.moveTo(L * 0.3, -w / 2);
  g.lineTo(L / 2, 0);
  g.lineTo(L * 0.3, w / 2);
  g.fill();
  g.fillStyle = '#2a3246';
  g.beginPath();
  g.moveTo(L * 0.44, -w * 0.17);
  g.lineTo(L / 2, 0);
  g.lineTo(L * 0.44, w * 0.17);
  g.fill();
  g.fillStyle = '#e88a9a';
  g.fillRect(-L / 2 - w * 0.9, -w / 2, w * 0.7, w);
  g.fillStyle = '#b8bcc8';
  g.fillRect(-L / 2 - w * 0.25, -w / 2, w * 0.3, w);
  g.restore();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// рисует сцену главы ch (или базовый фон при ch < 0) в контекст g размером W×H
// контрастная тема: тот же рисунок, но обесцвеченный и под белой вуалью, чтобы клетки и текст оставались главными
function washOut(g, W, H, a) {
  g.save();
  g.globalCompositeOperation = 'saturation';
  g.fillStyle = 'hsl(0,0%,50%)';
  g.globalAlpha = 0.55;
  g.fillRect(0, 0, W, H);
  g.restore();
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.fillRect(0, 0, W, H);
}

export function paint(g, W, H, ch, night, contrast = false) {
  if (contrast) night = false;
  paintScene(g, W, H, ch, night);
  if (contrast) washOut(g, W, H, ch < 0 || !SCENES[ch] ? 0.5 : 0.62);
}

function paintScene(g, W, H, ch, night) {
  if (ch < 0 || !SCENES[ch]) return paintBase(g, W, H, night);
  const sc = SCENES[ch];
  const port = W < H * 0.8;
  const u = (Math.min(W, H * 1.15) / 100) * (port ? 1.45 : 1);
  const hz = H * (port ? 0.4 : 0.58);
  const c = { g, W, H, u, hz, N: night, R: rnd(ch * 97 + 13), lit: [] };
  skyGrad(g, W, H, night ? sc.nsky : sc.sky);
  sc.skyArt(c);
  // земля рисуется на отдельном слое, чтобы ночью затемнить только её
  const lay = document.createElement('canvas');
  lay.width = g.canvas.width;
  lay.height = g.canvas.height;
  const lg = lay.getContext('2d');
  lg.setTransform(g.getTransform());
  c.g = lg;
  c.R = rnd(ch * 131 + 7);
  sc.land(c);
  if (night) {
    lg.save();
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.globalCompositeOperation = 'source-atop';
    lg.fillStyle = sc.interior ? 'rgba(18,14,40,.5)' : 'rgba(14,20,52,.55)';
    lg.fillRect(0, 0, lay.width, lay.height);
    lg.restore();
  }
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(lay, 0, 0);
  g.restore();
  c.g = g;
  if (night) for (const f of c.lit) f();
  // лёгкая виньетка, чтобы интерфейс читался
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, night ? 'rgba(0,0,10,.35)' : 'rgba(40,30,20,.12)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
}

// ---------- частицы ----------
const PCOL = {
  pollen: ['#fffbe0', '#fff2a8', '#ffffff'],
  firefly: ['#fff3a0', '#ffe27a'],
  petal: ['#f7b7c8', '#fbd3dd', '#f29bb2', '#ffffff'],
  leaf: ['#e8893a', '#d4562f', '#f2c040', '#b8452e'],
  snow: ['#ffffff'],
  dust: ['#fff0c0', '#ffe2a0'],
  letter: ['#ffe7b0', '#fff6dc'],
  butterfly: ['#f6a23a', '#7ab0f0', '#f7f2e8', '#e87a9a'],
  gull: ['#ffffff'],
};

function sprite(type, col, letter) {
  const s = 48;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  const m = s / 2;
  if (type === 'firefly' || type === 'dust' || type === 'pollen') {
    glow(g, m, m, m, type === 'firefly' ? 'rgba(255,240,140,.55)' : 'rgba(255,245,200,.35)');
    disc(g, m, m, type === 'firefly' ? 4 : 3, col);
  } else if (type === 'petal') {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(m, m - 14);
    g.quadraticCurveTo(m + 14, m - 4, m, m + 14);
    g.quadraticCurveTo(m - 14, m - 4, m, m - 14);
    g.fill();
  } else if (type === 'leaf') {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(m, m - 18);
    g.quadraticCurveTo(m + 15, m - 4, m, m + 16);
    g.quadraticCurveTo(m - 15, m - 4, m, m - 18);
    g.fill();
    g.strokeStyle = 'rgba(90,40,20,.45)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(m, m - 16);
    g.lineTo(m, m + 20);
    g.stroke();
  } else if (type === 'snow') {
    glow(g, m, m, 12, 'rgba(255,255,255,.6)');
    disc(g, m, m, 5, col);
  } else if (type === 'letter') {
    glow(g, m, m, m, 'rgba(255,230,170,.25)');
    g.fillStyle = col;
    g.font = '700 26px "PT Serif",Georgia,serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(letter, m, m + 1);
  } else if (type === 'butterfly') {
    for (const d of [-1, 1]) {
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(m + d * 8, m - 5, 8, 10, d * 0.5, 0, TAU);
      g.fill();
      g.beginPath();
      g.ellipse(m + d * 6, m + 7, 5, 6, -d * 0.4, 0, TAU);
      g.fill();
      disc(g, m + d * 9, m - 7, 2.2, 'rgba(255,255,255,.7)');
    }
    g.fillStyle = '#3a2a22';
    g.fillRect(m - 1.5, m - 10, 3, 20);
  } else if (type === 'gull') {
    bird(g, m, m + 4, 16, 'rgba(255,255,255,.95)');
  }
  return cv;
}

export const THUMB_W = 640,
  THUMB_H = 120;

export class Scene {
  constructor() {
    const mk = (id) => {
      const c = document.createElement('canvas');
      c.id = id;
      c.className = 'bgc';
      document.body.insertBefore(c, document.body.firstChild);
      return c;
    };
    this.pc = mk('bgp');
    this.layers = [mk('bg1'), mk('bg0')];
    this.front = 0;
    this.ch = null;
    this.theme = null;
    this.key = '';
    this.cache = new Map();
    this.thumbs = new Map();
    this.parts = [];
    this.sprites = {};
    this.running = false;
    this.reduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tm;
    window.addEventListener('resize', () => {
      clearTimeout(tm);
      tm = setTimeout(() => this.draw(), 160);
    });
    document.addEventListener('visibilitychange', () => !document.hidden && this.loop());
  }

  // ch: номер главы или −1 (базовый фон); theme: light | dark | contrast
  set(ch, theme = this.theme) {
    if (ch === this.ch && theme === this.theme) return;
    if (theme !== this.theme) this.warm();
    this.ch = ch;
    this.theme = theme;
    // отрисовка после смены экрана, чтобы переход не ждал пейзажа (он проявится плавно)
    clearTimeout(this._t);
    this._t = setTimeout(() => this.draw(), 16);
  }

  get night() {
    return this.theme === 'dark';
  }

  draw() {
    const contrast = this.theme === 'contrast';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = innerWidth,
      H = innerHeight;
    const key = `${this.ch}|${contrast ? 'c' : this.night ? 1 : 0}|${W}x${H}|${dpr}`;
    if (key === this.key) return this.loop();
    this.key = key;
    let src = this.cache.get(key);
    if (!src) {
      src = document.createElement('canvas');
      src.width = Math.round(W * dpr);
      src.height = Math.round(H * dpr);
      const g = src.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(g, W, H, this.ch, this.night, contrast);
      this.cache.set(key, src);
      if (this.cache.size > 3) this.cache.delete(this.cache.keys().next().value);
    }
    // плавная смена: новый фон рисуется на заднем холсте и проявляется
    const next = this.layers[1 - this.front],
      cur = this.layers[this.front];
    next.width = Math.round(W * dpr);
    next.height = Math.round(H * dpr);
    const g = next.getContext('2d');
    if (src) g.drawImage(src, 0, 0);
    next.classList.add('on');
    cur.classList.remove('on');
    this.front = 1 - this.front;
    this.dpr = dpr;
    for (const c of [this.pc]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    this.parts = [];
    this.loop();
  }

  // баннеры глав рисуются заранее, по одному за раз, чтобы список уровней открывался мгновенно
  warm() {
    clearTimeout(this._w);
    let k = 0;
    const step = () => {
      if (k >= SCENES.length) return;
      // во время игры не рисуем, чтобы не мешать анимации
      if (this.ch !== -1) return (this._w = setTimeout(step, 1000));
      this.thumb(k++, THUMB_W, THUMB_H);
      this._w = setTimeout(step, 80);
    };
    this._w = setTimeout(step, 900);
  }

  // картинка-баннер главы для списка уровней
  thumb(ch, w, h) {
    const contrast = this.theme === 'contrast';
    const key = `${ch}|${contrast ? 'c' : this.night ? 1 : 0}|${w}x${h}`;
    if (this.thumbs.has(key)) return this.thumbs.get(key);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(g, w, h, ch, this.night, contrast);
    const url = cv.toDataURL('image/jpeg', 0.86);
    this.thumbs.set(key, url);
    return url;
  }

  partType() {
    const sc = SCENES[this.ch];
    if (!sc || this.theme === 'contrast' || this.reduced) return 'none';
    return this.night ? sc.parts.night : sc.parts.day;
  }

  spr(type, col, letter = '') {
    const k = type + col + letter;
    return this.sprites[k] || (this.sprites[k] = sprite(type, col, letter));
  }

  loop() {
    if (this.running || document.hidden) return;
    const type = this.partType();
    if (type === 'none') {
      this.pc.getContext('2d').clearRect(0, 0, this.pc.width, this.pc.height);
      return;
    }
    this.running = true;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(50, now - last) / 16.7;
      last = now;
      const t = this.partType();
      if (t === 'none' || document.hidden) {
        this.running = false;
        this.pc.getContext('2d').clearRect(0, 0, this.pc.width, this.pc.height);
        return;
      }
      this.tick(dt, t);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  spawn(type, W, H, init) {
    const cols = PCOL[type];
    const p = {
      type,
      c: cols[Math.floor(Math.random() * cols.length)],
      x: Math.random() * W,
      y: init ? Math.random() * H : -30,
      r: 0.5 + Math.random() * 0.5,
      rot: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 0.04,
      ph: Math.random() * TAU,
      a: 1,
    };
    const letters = document.documentElement.lang === 'en' ? 'ABCDEFGHIJKLMNOPRSTW' : 'АБВГДЕЖЗИКЛМНОПРСТЯ';
    if (type === 'letter') p.l = letters[Math.floor(Math.random() * letters.length)];
    if (type === 'leaf' || type === 'petal' || type === 'snow') {
      p.vx = 0.15 + Math.random() * 0.4;
      p.vy = type === 'snow' ? 0.35 + Math.random() * 0.5 : 0.5 + Math.random() * 0.6;
    } else if (type === 'gull') {
      p.x = init ? Math.random() * W : -40;
      p.y = H * (0.08 + Math.random() * 0.3);
      p.vx = 0.35 + Math.random() * 0.35;
      p.vy = 0;
    } else {
      // светлячки, пылинки, пыльца и буквы парят
      if (!init) p.y = H + 30;
      p.vx = (Math.random() - 0.5) * 0.25;
      p.vy = -(0.12 + Math.random() * 0.3);
    }
    return p;
  }

  tick(dt, type) {
    const W = innerWidth,
      H = innerHeight;
    const g = this.pc.getContext('2d');
    const dpr = this.dpr || 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const dens = { butterfly: 5, gull: 3, letter: 12, firefly: 16, dust: 14, pollen: 14, snow: 30, leaf: 14, petal: 16 }[type] || 12;
    const want = Math.round(Math.min(dens, dens * Math.sqrt((W * H) / (900 * 700))) + 2);
    if (this.parts.length && this.parts[0].type !== type) this.parts = [];
    while (this.parts.length < want) this.parts.push(this.spawn(type, W, H, !this.parts.length || this.parts.length < want - 1));
    if (this.parts.length > want) this.parts.length = want;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      p.ph += 0.025 * dt;
      p.x += (p.vx + (type === 'gull' ? 0 : Math.sin(p.ph) * 0.35)) * dt;
      p.y += (p.vy + (type === 'gull' ? Math.sin(p.ph) * 0.15 : 0)) * dt;
      p.rot += p.vr * dt;
      const out = p.y > H + 40 || p.y < -50 || p.x > W + 50 || p.x < -60;
      if (out) {
        this.parts[i] = this.spawn(type, W, H, false);
        continue;
      }
      const img = this.spr(type, p.c, p.l);
      let a = 0.85,
        s = 24 * p.r;
      if (type === 'firefly') a = 0.35 + 0.65 * Math.abs(Math.sin(p.ph * 1.6));
      if (type === 'dust' || type === 'pollen') (a = 0.5 + 0.4 * Math.sin(p.ph * 1.3)), (s = 16 * p.r);
      if (type === 'letter') (a = 0.25 + 0.35 * Math.abs(Math.sin(p.ph * 0.7))), (s = 30 * p.r);
      if (type === 'snow') s = 14 * p.r;
      if (type === 'gull') (s = 30 * p.r), (a = 0.9);
      if (type === 'butterfly') {
        g.globalAlpha = 0.95;
        g.save();
        g.translate(p.x, p.y);
        g.scale(0.25 + 0.75 * Math.abs(Math.sin(p.ph * 6)), 1);
        g.drawImage(img, -14 * p.r, -14 * p.r, 28 * p.r, 28 * p.r);
        g.restore();
        continue;
      }
      g.globalAlpha = a;
      if (type === 'leaf' || type === 'petal') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.scale(1, 0.6 + 0.4 * Math.sin(p.ph * 2));
        g.drawImage(img, -s / 2, -s / 2, s, s);
        g.restore();
      } else g.drawImage(img, p.x - s / 2, p.y - s / 2, s, s);
    }
    g.globalAlpha = 1;
  }
}
