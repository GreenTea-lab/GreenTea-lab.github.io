// Рисунки зданий городка на спине кита. Каждое: (ctx, w, t, tier, night, lw, L) — рисуется вверх от (0,0), ширина w.
// tier — сколько порогов пройдено (0..10): здание растёт, появляются флажки, золото, искры.
// L — слой: 'static' (кэшируется в спрайт), 'anim' (рисуется каждый кадр) или 'all'.
import { shade } from './art.js';

const TAU = Math.PI * 2;

function rr(x, X, Y, W, H, r) {
  x.beginPath();
  x.moveTo(X + r, Y);
  x.arcTo(X + W, Y, X + W, Y + H, r);
  x.arcTo(X + W, Y + H, X, Y + H, r);
  x.arcTo(X, Y + H, X, Y, r);
  x.arcTo(X, Y, X + W, Y, r);
  x.closePath();
}
const OL = 'rgba(40,30,60,.55)';
function fillS(x, c, lw) {
  x.fillStyle = c;
  x.fill();
  x.strokeStyle = OL;
  x.lineWidth = lw;
  x.stroke();
}
// объём: свет слева, тень справа
function hgrad(x, X, W, c, k = 0.12) {
  const g = x.createLinearGradient(X, 0, X + W, 0);
  g.addColorStop(0, shade(c, k));
  g.addColorStop(0.5, c);
  g.addColorStop(1, shade(c, -k));
  return g;
}
// стена с объёмом
function wall(x, X, Y, W, H, c, lw, r = W * 0.05) {
  rr(x, X, Y, W, H, r);
  x.fillStyle = hgrad(x, X, W, c);
  x.fill();
  x.strokeStyle = OL;
  x.lineWidth = lw;
  x.stroke();
}
// фактура внутри последнего контура: доски, кирпичики
function planks(x, X, Y, W, H, n, lw, col = 'rgba(120,70,30,.2)') {
  x.strokeStyle = col;
  x.lineWidth = lw * 0.6;
  x.beginPath();
  for (let i = 1; i < n; i++) {
    x.moveTo(X + W * 0.04, Y + (H * i) / n);
    x.lineTo(X + W * 0.96, Y + (H * i) / n);
  }
  x.stroke();
}
function bricks(x, X, Y, W, H, rows, lw, col = 'rgba(120,80,60,.22)') {
  x.save();
  x.clip();
  x.strokeStyle = col;
  x.lineWidth = lw * 0.5;
  x.beginPath();
  const bh = H / rows,
    bw = bh * 2;
  for (let r = 0; r < rows; r++) {
    const y = Y + r * bh;
    x.moveTo(X, y);
    x.lineTo(X + W, y);
    for (let c = (r % 2) * bw * 0.5; c < W; c += bw) {
      x.moveTo(X + c, y);
      x.lineTo(X + c, y + bh);
    }
  }
  x.stroke();
  x.restore();
}
// окно: рама, переплёт, блик, подоконник; ночью светится
function win(x, X, Y, W, H, night, lw, box) {
  rr(x, X, Y, W, H, W * 0.2);
  x.fillStyle = night ? '#ffd86a' : '#9fd8f6';
  x.fill();
  if (!night) {
    x.save();
    x.clip();
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.beginPath();
    x.moveTo(X, Y + H * 0.55);
    x.lineTo(X + W * 0.55, Y);
    x.lineTo(X + W * 0.8, Y);
    x.lineTo(X, Y + H * 0.85);
    x.fill();
    x.restore();
  }
  x.strokeStyle = OL;
  x.lineWidth = lw * 0.7;
  rr(x, X, Y, W, H, W * 0.2);
  x.stroke();
  x.lineWidth = lw * 0.45;
  x.beginPath();
  x.moveTo(X + W / 2, Y);
  x.lineTo(X + W / 2, Y + H);
  x.moveTo(X, Y + H / 2);
  x.lineTo(X + W, Y + H / 2);
  x.stroke();
  // подоконник
  rr(x, X - W * 0.12, Y + H - W * 0.02, W * 1.24, W * 0.14, W * 0.05);
  fillS(x, '#fffaf0', lw * 0.5);
  if (box) {
    // ящик с цветами
    rr(x, X - W * 0.05, Y + H + W * 0.1, W * 1.1, W * 0.18, W * 0.04);
    fillS(x, '#b8784a', lw * 0.5);
    const cs = ['#ff6a8a', '#ffd23a', '#ff9ad0'];
    for (let i = 0; i < 3; i++) {
      x.fillStyle = '#4ab05a';
      x.beginPath();
      x.arc(X + W * (0.15 + i * 0.35), Y + H + W * 0.08, W * 0.12, 0, TAU);
      x.fill();
      x.fillStyle = cs[i];
      x.beginPath();
      x.arc(X + W * (0.15 + i * 0.35), Y + H + W * 0.04, W * 0.07, 0, TAU);
      x.fill();
    }
  }
  if (night) {
    const g = x.createRadialGradient(X + W / 2, Y + H / 2, 0, X + W / 2, Y + H / 2, W * 2);
    g.addColorStop(0, 'rgba(255,215,110,.35)');
    g.addColorStop(1, 'rgba(255,215,110,0)');
    x.fillStyle = g;
    x.fillRect(X - W * 2, Y - W * 2, W * 5, H + W * 4);
  }
}
// дверь с аркой, досками и ручкой; Y — низ
function door(x, X, Y, W, H, c, lw) {
  x.beginPath();
  x.moveTo(X, Y);
  x.lineTo(X, Y - H + W / 2);
  x.arc(X + W / 2, Y - H + W / 2, W / 2, Math.PI, 0);
  x.lineTo(X + W, Y);
  x.closePath();
  x.fillStyle = hgrad(x, X, W, c, 0.15);
  x.fill();
  x.strokeStyle = OL;
  x.lineWidth = lw * 0.8;
  x.stroke();
  x.strokeStyle = 'rgba(40,20,10,.25)';
  x.lineWidth = lw * 0.45;
  x.beginPath();
  x.moveTo(X + W * 0.35, Y - H * 0.85);
  x.lineTo(X + W * 0.35, Y);
  x.moveTo(X + W * 0.65, Y - H * 0.85);
  x.lineTo(X + W * 0.65, Y);
  x.stroke();
  x.fillStyle = '#ffd23a';
  x.beginPath();
  x.arc(X + W * 0.78, Y - H * 0.42, Math.max(0.8, W * 0.08), 0, TAU);
  x.fill();
}
// крыша-треугольник с черепицей
function roof(x, X, Y, W, H, c, lw) {
  const path = () => {
    x.beginPath();
    x.moveTo(X - W * 0.08, Y);
    x.lineTo(X + W / 2, Y - H);
    x.lineTo(X + W * 1.08, Y);
    x.closePath();
  };
  path();
  x.fillStyle = hgrad(x, X, W, c, 0.14);
  x.fill();
  x.save();
  x.clip();
  x.strokeStyle = shade(c, -0.28);
  x.globalAlpha = 0.45;
  x.lineWidth = lw * 0.5;
  const rows = 3,
    s = W * 0.12;
  x.beginPath();
  for (let r = 1; r <= rows; r++) {
    const y = Y - H + (H * r) / (rows + 0.6);
    for (let px = X - W * 0.1 + (r % 2) * s * 0.5; px < X + W * 1.1; px += s) {
      x.moveTo(px + s, y);
      x.arc(px + s / 2, y, s / 2, 0, Math.PI);
    }
  }
  x.stroke();
  x.restore();
  path();
  x.strokeStyle = OL;
  x.lineWidth = lw;
  x.stroke();
  // карниз
  x.strokeStyle = shade(c, -0.3);
  x.lineWidth = lw * 1.4;
  x.beginPath();
  x.moveTo(X - W * 0.06, Y + lw * 0.3);
  x.lineTo(X + W * 1.06, Y + lw * 0.3);
  x.stroke();
}
function flag(x, X, Y, h, c, t, lw) {
  x.strokeStyle = '#6a4a3a';
  x.lineWidth = lw;
  x.beginPath();
  x.moveTo(X, Y);
  x.lineTo(X, Y - h);
  x.stroke();
  const f = Math.sin(t * 5 + X) * h * 0.08;
  x.beginPath();
  x.moveTo(X, Y - h);
  x.quadraticCurveTo(X + h * 0.3, Y - h + f, X + h * 0.55, Y - h * 0.86 + f);
  x.lineTo(X, Y - h * 0.72);
  x.closePath();
  x.fillStyle = c;
  x.fill();
  x.fillStyle = '#ffd23a';
  x.beginPath();
  x.arc(X, Y - h, lw * 0.9, 0, TAU);
  x.fill();
}
function star(x, X, Y, r, c) {
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    x.lineTo(X + Math.cos(a) * rad, Y + Math.sin(a) * rad);
  }
  x.closePath();
  x.fillStyle = c;
  x.fill();
}
// каменный цоколь
function plinth(x, X, W, h, lw) {
  rr(x, X, -h, W, h, h * 0.3);
  fillS(x, '#cfc6d8', lw * 0.7);
  x.strokeStyle = 'rgba(80,60,90,.25)';
  x.lineWidth = lw * 0.45;
  x.beginPath();
  for (let px = X + W * 0.12; px < X + W; px += W * 0.18) {
    x.moveTo(px, -h);
    x.lineTo(px, 0);
  }
  x.stroke();
}

const DRAW = {
  // палатка с лимонадом
  lemon(x, w, t, tier, night, lw, L) {
    if (L === 'anim') return;
    const h = w * 0.62;
    // стойки
    x.fillStyle = hgrad(x, -w * 0.4, w * 0.06, '#b07a4a');
    x.fillRect(-w * 0.4, -h * 1.05, w * 0.06, h * 0.55);
    x.fillStyle = hgrad(x, w * 0.34, w * 0.06, '#b07a4a');
    x.fillRect(w * 0.34, -h * 1.05, w * 0.06, h * 0.55);
    // прилавок из досок
    wall(x, -w * 0.42, -h * 0.55, w * 0.84, h * 0.55, '#f6e2b0', lw, w * 0.06);
    x.strokeStyle = 'rgba(140,90,40,.22)';
    x.lineWidth = lw * 0.55;
    x.beginPath();
    for (let i = 1; i < 6; i++) {
      x.moveTo(-w * 0.42 + (i * w * 0.84) / 6, -h * 0.5);
      x.lineTo(-w * 0.42 + (i * w * 0.84) / 6, -h * 0.05);
    }
    x.stroke();
    rr(x, -w * 0.46, -h * 0.6, w * 0.92, h * 0.08, w * 0.03);
    fillS(x, '#d8a060', lw * 0.7);
    // полосатый навес с фестонами
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      const X = -w * 0.5 + (i * w) / 6;
      x.moveTo(X, -h * 1.05);
      x.lineTo(X + w / 6, -h * 1.05);
      x.lineTo(X + w / 6, -h * 0.82);
      x.quadraticCurveTo(X + w / 12, -h * 0.68, X, -h * 0.82);
      x.closePath();
      x.fillStyle = i % 2 ? '#fff6dc' : '#ffcc33';
      x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,.35)';
    x.fillRect(-w * 0.5, -h * 1.05, w, h * 0.05);
    x.strokeStyle = OL;
    x.lineWidth = lw;
    x.strokeRect(-w * 0.5, -h * 1.05, w, h * 0.23);
    // лимоны горкой
    for (const [dx, dy] of [
      [-0.08, -0.26],
      [0.1, -0.26],
      [0.01, -0.36],
    ]) {
      x.beginPath();
      x.ellipse(w * dx, h * dy, w * 0.085, w * 0.065, 0, 0, TAU);
      fillS(x, '#ffe14a', lw * 0.6);
      x.fillStyle = 'rgba(255,255,255,.6)';
      x.beginPath();
      x.arc(w * dx - w * 0.03, h * dy - w * 0.02, w * 0.02, 0, TAU);
      x.fill();
    }
    x.fillStyle = '#7ac04a';
    x.beginPath();
    x.ellipse(w * 0.06, -h * 0.45, w * 0.045, w * 0.022, -0.6, 0, TAU);
    x.fill();
    // кувшин и стаканчики
    rr(x, -w * 0.36, -h * 0.76, w * 0.14, h * 0.17, w * 0.03);
    fillS(x, 'rgba(255,240,140,.95)', lw * 0.7);
    x.fillStyle = 'rgba(255,255,255,.6)';
    x.fillRect(-w * 0.34, -h * 0.74, w * 0.025, h * 0.12);
    for (const dx of [0.18, 0.27]) {
      x.beginPath();
      x.moveTo(w * dx, -h * 0.6);
      x.lineTo(w * (dx + 0.07), -h * 0.6);
      x.lineTo(w * (dx + 0.06), -h * 0.73);
      x.lineTo(w * (dx + 0.01), -h * 0.73);
      x.closePath();
      fillS(x, '#fff7c0', lw * 0.5);
    }
  },
  // рыбная лавка
  fish(x, w, t, tier, night, lw, L) {
    const h = w * 0.7;
    if (L !== 'anim') {
      plinth(x, -w * 0.45, w * 0.9, h * 0.1, lw);
      wall(x, -w * 0.42, -h, w * 0.84, h * 0.92, '#e8b07a', lw);
      planks(x, -w * 0.42, -h, w * 0.84, h * 0.92, 5, lw);
      roof(x, -w * 0.48, -h, w * 0.96, h * 0.55, '#3a8fd8', lw);
      door(x, -w * 0.13, -h * 0.08, w * 0.26, h * 0.5, '#8a5a3a', lw);
      win(x, -w * 0.36, -h * 0.78, w * 0.16, w * 0.16, night, lw, true);
      win(x, w * 0.2, -h * 0.78, w * 0.16, w * 0.16, night, lw, true);
      // кронштейн вывески
      x.strokeStyle = '#6a4a3a';
      x.lineWidth = lw;
      x.beginPath();
      x.moveTo(0, -h * 1.5);
      x.lineTo(0, -h * 1.4);
      x.stroke();
    }
    if (L !== 'static') {
      // рыбка-вывеска покачивается
      const fy = -h * 1.62 + Math.sin(t * 2) * w * 0.02;
      x.beginPath();
      x.ellipse(0, fy, w * 0.16, w * 0.08, 0, 0, TAU);
      x.moveTo(-w * 0.14, fy);
      x.lineTo(-w * 0.26, fy - w * 0.07);
      x.lineTo(-w * 0.26, fy + w * 0.07);
      x.closePath();
      fillS(x, '#ff8a5a', lw * 0.8);
      x.fillStyle = 'rgba(255,255,255,.35)';
      x.beginPath();
      x.ellipse(-w * 0.02, fy - w * 0.03, w * 0.09, w * 0.025, 0, 0, TAU);
      x.fill();
      x.strokeStyle = 'rgba(160,60,30,.45)';
      x.lineWidth = lw * 0.5;
      x.beginPath();
      x.arc(-w * 0.04, fy, w * 0.05, -1, 1);
      x.stroke();
      x.fillStyle = '#222';
      x.beginPath();
      x.arc(w * 0.08, fy - w * 0.015, w * 0.018, 0, TAU);
      x.fill();
    }
  },
  // маяк
  light(x, w, t, tier, night, lw, L) {
    const h = w * 1.9;
    if (L !== 'anim') {
      plinth(x, -w * 0.36, w * 0.72, h * 0.05, lw);
      const body = () => {
        x.beginPath();
        x.moveTo(-w * 0.3, -h * 0.04);
        x.lineTo(-w * 0.2, -h * 0.82);
        x.lineTo(w * 0.2, -h * 0.82);
        x.lineTo(w * 0.3, -h * 0.04);
        x.closePath();
      };
      body();
      x.fillStyle = '#fbf6ee';
      x.fill();
      x.save();
      x.clip();
      x.fillStyle = '#e8463a';
      for (let i = 0; i < 4; i++) x.fillRect(-w, -h * (0.14 + i * 0.2), w * 2, h * 0.09);
      // цилиндрический объём
      const g = x.createLinearGradient(-w * 0.3, 0, w * 0.3, 0);
      g.addColorStop(0, 'rgba(255,255,255,.35)');
      g.addColorStop(0.35, 'rgba(255,255,255,0)');
      g.addColorStop(0.7, 'rgba(30,20,60,0)');
      g.addColorStop(1, 'rgba(30,20,60,.22)');
      x.fillStyle = g;
      x.fillRect(-w, -h, w * 2, h);
      x.restore();
      body();
      x.strokeStyle = OL;
      x.lineWidth = lw;
      x.stroke();
      door(x, -w * 0.08, -h * 0.04, w * 0.16, h * 0.13, '#5a6a8a', lw);
      win(x, -w * 0.055, -h * 0.5, w * 0.11, w * 0.14, night, lw);
      // галерея с перилами
      rr(x, -w * 0.28, -h * 0.86, w * 0.56, h * 0.05, w * 0.02);
      fillS(x, '#4a5a7a', lw);
      x.strokeStyle = '#4a5a7a';
      x.lineWidth = lw * 0.6;
      x.beginPath();
      x.moveTo(-w * 0.26, -h * 0.9);
      x.lineTo(w * 0.26, -h * 0.9);
      for (let i = 0; i < 6; i++) {
        x.moveTo(-w * 0.25 + i * w * 0.1, -h * 0.9);
        x.lineTo(-w * 0.25 + i * w * 0.1, -h * 0.86);
      }
      x.stroke();
      rr(x, -w * 0.16, -h, w * 0.32, h * 0.14, w * 0.04);
      fillS(x, night ? '#fff0a0' : '#bfe8ff', lw);
      x.strokeStyle = OL;
      x.lineWidth = lw * 0.5;
      x.beginPath();
      x.moveTo(-w * 0.05, -h);
      x.lineTo(-w * 0.05, -h * 0.86);
      x.moveTo(w * 0.05, -h);
      x.lineTo(w * 0.05, -h * 0.86);
      x.stroke();
      x.beginPath();
      x.moveTo(-w * 0.2, -h);
      x.lineTo(0, -h * 1.12);
      x.lineTo(w * 0.2, -h);
      x.closePath();
      x.fillStyle = hgrad(x, -w * 0.2, w * 0.4, '#e8463a');
      x.fill();
      x.strokeStyle = OL;
      x.lineWidth = lw;
      x.stroke();
      x.fillStyle = '#ffd23a';
      x.beginPath();
      x.arc(0, -h * 1.13, w * 0.035, 0, TAU);
      x.fill();
    }
    if (L !== 'static') {
      // луч
      const a = Math.sin(t * 1.2) * 0.8;
      const g = x.createLinearGradient(0, -h * 0.93, Math.cos(a) * w * 3, -h * 0.93 + Math.sin(a) * w * 0.4);
      g.addColorStop(0, `rgba(255,245,180,${night ? 0.6 : 0.3})`);
      g.addColorStop(1, 'rgba(255,245,180,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, -h * 0.93);
      x.lineTo(Math.cos(a) * w * 3, -h * 0.93 + Math.sin(a) * w * 0.4 - w * 0.25);
      x.lineTo(Math.cos(a) * w * 3, -h * 0.93 + Math.sin(a) * w * 0.4 + w * 0.25);
      x.closePath();
      x.fill();
    }
  },
  // пекарня
  bakery(x, w, t, tier, night, lw, L) {
    const h = w * 0.78;
    if (L !== 'anim') {
      // труба
      rr(x, w * 0.18, -h * 1.45, w * 0.12, h * 0.3, w * 0.02);
      x.fillStyle = hgrad(x, w * 0.18, w * 0.12, '#a85a3a');
      x.fill();
      bricks(x, w * 0.18, -h * 1.45, w * 0.12, h * 0.3, 4, lw);
      rr(x, w * 0.18, -h * 1.45, w * 0.12, h * 0.3, w * 0.02);
      x.strokeStyle = OL;
      x.lineWidth = lw;
      x.stroke();
      rr(x, w * 0.16, -h * 1.48, w * 0.16, h * 0.06, w * 0.02);
      fillS(x, '#8a4a2a', lw * 0.7);
      wall(x, -w * 0.44, -h, w * 0.88, h, '#fff1d6', lw);
      // фахверк
      x.strokeStyle = 'rgba(150,90,50,.35)';
      x.lineWidth = lw * 0.7;
      x.beginPath();
      x.moveTo(-w * 0.44, -h * 0.82);
      x.lineTo(w * 0.44, -h * 0.82);
      x.stroke();
      roof(x, -w * 0.5, -h, w, h * 0.5, '#c8643a', lw);
      // витрина с хлебом
      win(x, -w * 0.38, -h * 0.64, w * 0.34, w * 0.26, night, lw);
      x.fillStyle = '#d8902a';
      for (const dx of [-0.3, -0.21, -0.12]) {
        x.beginPath();
        x.ellipse(w * dx, -h * 0.64 + w * 0.2, w * 0.04, w * 0.025, 0, 0, TAU);
        x.fill();
      }
      door(x, w * 0.06, 0, w * 0.24, h * 0.58, '#8a5a3a', lw);
      // полосатая маркиза
      for (let i = 0; i < 5; i++) {
        x.beginPath();
        x.rect(-w * 0.44 + (i * w * 0.88) / 5, -h * 0.8, (w * 0.88) / 5, h * 0.1);
        x.fillStyle = i % 2 ? '#fff' : '#ff8aa0';
        x.fill();
      }
      x.fillStyle = 'rgba(160,40,70,.18)';
      x.fillRect(-w * 0.44, -h * 0.72, w * 0.88, h * 0.02);
      // крендель
      x.strokeStyle = '#d8902a';
      x.lineWidth = w * 0.045;
      x.beginPath();
      x.arc(-w * 0.08, -h * 1.12, w * 0.06, 0, TAU);
      x.arc(w * 0.0, -h * 1.12, w * 0.06, 0, TAU);
      x.stroke();
    }
    if (L !== 'static') {
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.4 + i / 4) % 1;
        x.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
        x.beginPath();
        x.arc(w * 0.24 + Math.sin(k * 5 + i) * w * 0.05 + k * w * 0.15, -h * 1.55 - k * w * 0.6, w * (0.05 + k * 0.08), 0, TAU);
        x.fill();
      }
    }
  },
  // мельница
  mill(x, w, t, tier, night, lw, L) {
    const h = w * 1.25;
    if (L !== 'anim') {
      const body = () => {
        x.beginPath();
        x.moveTo(-w * 0.32, 0);
        x.lineTo(-w * 0.22, -h);
        x.lineTo(w * 0.22, -h);
        x.lineTo(w * 0.32, 0);
        x.closePath();
      };
      body();
      x.fillStyle = hgrad(x, -w * 0.32, w * 0.64, '#f0d8b0');
      x.fill();
      bricks(x, -w * 0.32, -h, w * 0.64, h, 9, lw, 'rgba(150,110,70,.2)');
      body();
      x.strokeStyle = OL;
      x.lineWidth = lw;
      x.stroke();
      roof(x, -w * 0.28, -h, w * 0.56, h * 0.28, '#8a5ac8', lw);
      win(x, -w * 0.08, -h * 0.64, w * 0.16, w * 0.2, night, lw);
      door(x, -w * 0.1, 0, w * 0.2, h * 0.27, '#8a5a3a', lw);
    }
    if (L !== 'static') {
      // лопасти
      x.save();
      x.translate(0, -h * 0.98);
      x.rotate(t * 1.4);
      for (let i = 0; i < 4; i++) {
        x.rotate(TAU / 4);
        rr(x, -w * 0.07, -w * 0.72, w * 0.14, w * 0.6, w * 0.02);
        fillS(x, '#fff8ea', lw * 0.8);
        x.strokeStyle = 'rgba(120,90,60,.35)';
        x.lineWidth = lw * 0.5;
        x.beginPath();
        for (let k = 1; k < 4; k++) {
          x.moveTo(-w * 0.07, -w * 0.12 - k * w * 0.15);
          x.lineTo(w * 0.07, -w * 0.12 - k * w * 0.15);
        }
        x.moveTo(0, -w * 0.12);
        x.lineTo(0, -w * 0.7);
        x.stroke();
      }
      x.beginPath();
      x.arc(0, 0, w * 0.07, 0, TAU);
      fillS(x, '#6a4a3a', lw);
      x.restore();
    }
  },
  // карусель
  carousel(x, w, t, tier, night, lw, L) {
    const h = w * 0.9;
    if (L !== 'anim') {
      rr(x, -w * 0.48, -h * 0.14, w * 0.96, h * 0.14, w * 0.04);
      x.fillStyle = hgrad(x, -w * 0.48, w * 0.96, '#ffb3c8');
      x.fill();
      x.strokeStyle = OL;
      x.lineWidth = lw;
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,.5)';
      for (let i = 0; i < 8; i++) {
        x.beginPath();
        x.arc(-w * 0.42 + i * w * 0.12, -h * 0.07, w * 0.02, 0, TAU);
        x.fill();
      }
      for (const X of [-0.36, 0, 0.36]) {
        x.fillStyle = hgrad(x, w * X - w * 0.018, w * 0.036, '#e8c45a', 0.25);
        x.fillRect(w * X - w * 0.018, -h * 0.75, w * 0.036, h * 0.62);
      }
      // шатёр
      x.beginPath();
      x.moveTo(-w * 0.52, -h * 0.72);
      x.quadraticCurveTo(0, -h * 1.4, w * 0.52, -h * 0.72);
      x.closePath();
      fillS(x, '#ff6a8a', lw);
      x.save();
      x.clip();
      for (let i = 0; i < 6; i++) {
        x.beginPath();
        x.moveTo(0, -h * 1.2);
        x.lineTo(-w * 0.52 + (i * w) / 5.5, -h * 0.72);
        x.lineTo(-w * 0.52 + ((i + 0.5) * w) / 5.5, -h * 0.72);
        x.closePath();
        x.fillStyle = '#fff2f6';
        x.fill();
      }
      const g = x.createLinearGradient(-w * 0.52, 0, w * 0.52, 0);
      g.addColorStop(0, 'rgba(255,255,255,.25)');
      g.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(60,20,60,.2)');
      x.fillStyle = g;
      x.fillRect(-w * 0.6, -h * 1.4, w * 1.2, h * 0.7);
      x.restore();
      for (let i = 0; i < 7; i++) {
        x.beginPath();
        x.arc(-w * 0.48 + (i * w * 0.96) / 6, -h * 0.72, w * 0.05, 0, Math.PI);
        fillS(x, i % 2 ? '#ffd86a' : '#ff6a8a', lw * 0.6);
      }
    }
    if (L !== 'static') {
      // лошадки вверх-вниз
      for (let i = 0; i < 3; i++) {
        const X = w * (-0.36 + i * 0.36),
          Y = -h * 0.42 + Math.sin(t * 3 + i * 2) * h * 0.08;
        const c = ['#fff', '#ffd86a', '#bfe8ff'][i];
        x.beginPath();
        x.ellipse(X, Y, w * 0.1, w * 0.06, 0, 0, TAU);
        fillS(x, c, lw * 0.7);
        x.beginPath();
        x.arc(X + w * 0.09, Y - w * 0.05, w * 0.04, 0, TAU);
        fillS(x, c, lw * 0.7);
        x.fillStyle = '#ff6a8a';
        x.fillRect(X - w * 0.03, Y - w * 0.065, w * 0.06, w * 0.03);
      }
      // лампочки по краю шатра
      for (let i = 0; i < 7; i++) {
        const on = Math.sin(t * 4 + i * 1.3) > 0;
        x.fillStyle = on ? '#fff6b0' : '#e8b84a';
        x.beginPath();
        x.arc(-w * 0.48 + (i * w * 0.96) / 6, -h * 0.66, w * 0.022, 0, TAU);
        x.fill();
      }
      flag(x, 0, -h * 1.05, h * 0.35, '#ffd23a', t, lw);
    }
  },
  // ракушечный банк
  bank(x, w, t, tier, night, lw, L) {
    if (L === 'anim') return;
    const h = w * 0.8;
    // ступени
    rr(x, -w * 0.52, -h * 0.06, w * 1.04, h * 0.06, w * 0.02);
    fillS(x, '#d8d0e4', lw * 0.7);
    rr(x, -w * 0.48, -h * 0.12, w * 0.96, h * 0.07, w * 0.02);
    fillS(x, '#e6e0ee', lw * 0.7);
    // стена за колоннами
    rr(x, -w * 0.42, -h * 0.76, w * 0.84, h * 0.64, 0);
    x.fillStyle = '#e8e2f2';
    x.fill();
    door(x, -w * 0.07, -h * 0.12, w * 0.14, h * 0.36, '#b08a4a', lw);
    for (let i = 0; i < 4; i++) {
      const X = -w * 0.38 + i * w * 0.24;
      rr(x, X, -h * 0.76, w * 0.1, h * 0.64, w * 0.02);
      x.fillStyle = hgrad(x, X, w * 0.1, '#fbf8ff', 0.18);
      x.fill();
      x.strokeStyle = OL;
      x.lineWidth = lw * 0.8;
      x.stroke();
      x.strokeStyle = 'rgba(90,80,130,.22)';
      x.lineWidth = lw * 0.5;
      x.beginPath();
      x.moveTo(X + w * 0.035, -h * 0.72);
      x.lineTo(X + w * 0.035, -h * 0.16);
      x.moveTo(X + w * 0.065, -h * 0.72);
      x.lineTo(X + w * 0.065, -h * 0.16);
      x.stroke();
      rr(x, X - w * 0.015, -h * 0.8, w * 0.13, h * 0.05, w * 0.01);
      fillS(x, '#fbf8ff', lw * 0.6);
    }
    rr(x, -w * 0.5, -h * 0.84, w, h * 0.06, w * 0.01);
    fillS(x, '#efe8fa', lw * 0.8);
    x.beginPath();
    x.moveTo(-w * 0.52, -h * 0.84);
    x.lineTo(0, -h * 1.18);
    x.lineTo(w * 0.52, -h * 0.84);
    x.closePath();
    x.fillStyle = hgrad(x, -w * 0.52, w * 1.04, '#f2ecff');
    x.fill();
    x.strokeStyle = OL;
    x.lineWidth = lw;
    x.stroke();
    // ракушка-герб
    x.save();
    x.translate(0, -h * 0.94);
    x.beginPath();
    x.moveTo(-w * 0.1, w * 0.04);
    x.quadraticCurveTo(0, -w * 0.16, w * 0.1, w * 0.04);
    x.closePath();
    fillS(x, '#ffb07a', lw * 0.7);
    x.strokeStyle = 'rgba(180,90,40,.5)';
    x.lineWidth = lw * 0.5;
    x.beginPath();
    for (const k of [-0.5, 0, 0.5]) {
      x.moveTo(0, w * 0.04);
      x.lineTo(k * w * 0.08, -w * 0.06);
    }
    x.stroke();
    x.restore();
    if (night) win(x, -w * 0.3, -h * 0.6, w * 0.1, w * 0.1, night, lw);
  },
  // оранжерея
  garden(x, w, t, tier, night, lw, L) {
    if (L === 'anim') return;
    const h = w * 0.8;
    plinth(x, -w * 0.5, w, h * 0.08, lw);
    const dome = () => {
      x.beginPath();
      x.moveTo(-w * 0.46, -h * 0.08);
      x.lineTo(-w * 0.46, -h * 0.45);
      x.arc(0, -h * 0.45, w * 0.46, Math.PI, 0);
      x.lineTo(w * 0.46, -h * 0.08);
      x.closePath();
    };
    dome();
    x.fillStyle = night ? 'rgba(180,240,200,.6)' : 'rgba(200,245,255,.7)';
    x.fill();
    x.save();
    x.clip();
    // растения
    for (let i = 0; i < 6; i++) {
      const X = -w * 0.36 + i * w * 0.145;
      x.fillStyle = i % 2 ? '#4ab05a' : '#2f9a4a';
      x.beginPath();
      x.ellipse(X, -h * 0.25, w * 0.08, h * (0.25 + (i % 3) * 0.1), 0, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,.18)';
      x.beginPath();
      x.ellipse(X - w * 0.025, -h * (0.35 + (i % 3) * 0.05), w * 0.025, h * 0.1, 0, 0, TAU);
      x.fill();
      x.fillStyle = ['#ff6a8a', '#ffd23a', '#c86aff'][i % 3];
      x.beginPath();
      x.arc(X, -h * (0.45 + (i % 3) * 0.1), w * 0.04, 0, TAU);
      x.fill();
    }
    // блики на стекле
    x.fillStyle = 'rgba(255,255,255,.35)';
    x.beginPath();
    x.moveTo(-w * 0.3, -h * 0.9);
    x.lineTo(-w * 0.18, -h * 0.95);
    x.lineTo(-w * 0.36, -h * 0.2);
    x.lineTo(-w * 0.42, -h * 0.25);
    x.fill();
    x.restore();
    dome();
    x.strokeStyle = OL;
    x.lineWidth = lw;
    x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.85)';
    x.lineWidth = lw * 0.8;
    x.beginPath();
    for (const a of [-0.6, 0, 0.6]) {
      x.moveTo(0, -h * 0.45);
      x.lineTo(Math.sin(a) * w * 0.46, -h * 0.45 - Math.cos(a) * w * 0.46);
    }
    x.moveTo(-w * 0.46, -h * 0.45);
    x.lineTo(w * 0.46, -h * 0.45);
    x.stroke();
    x.fillStyle = '#ffd23a';
    x.beginPath();
    x.arc(0, -h * 0.45 - w * 0.47, w * 0.04, 0, TAU);
    x.fill();
  },
  // обсерватория
  observ(x, w, t, tier, night, lw, L) {
    const h = w * 0.85;
    if (L !== 'anim') {
      wall(x, -w * 0.36, -h * 0.55, w * 0.72, h * 0.55, '#e8e4f8', lw, w * 0.04);
      rr(x, -w * 0.36, -h * 0.55, w * 0.72, h * 0.55, w * 0.04);
      bricks(x, -w * 0.36, -h * 0.55, w * 0.72, h * 0.55, 5, lw, 'rgba(90,80,140,.16)');
      x.beginPath();
      x.arc(0, -h * 0.55, w * 0.36, Math.PI, 0);
      x.closePath();
      const g = x.createRadialGradient(-w * 0.12, -h * 0.75, 0, 0, -h * 0.6, w * 0.4);
      g.addColorStop(0, '#f4f6ff');
      g.addColorStop(1, '#b8c0e8');
      x.fillStyle = g;
      x.fill();
      x.strokeStyle = OL;
      x.lineWidth = lw;
      x.stroke();
      // рёбра купола
      x.strokeStyle = 'rgba(90,90,150,.3)';
      x.lineWidth = lw * 0.5;
      x.beginPath();
      for (const k of [-0.5, 0.5]) {
        x.moveTo(k * w * 0.36 * 0.95, -h * 0.55);
        x.quadraticCurveTo(k * w * 0.2, -h * 0.55 - w * 0.3, 0, -h * 0.55 - w * 0.36);
      }
      x.stroke();
      door(x, -w * 0.08, 0, w * 0.16, h * 0.3, '#6a6aa8', lw);
      win(x, -w * 0.28, -h * 0.42, w * 0.12, w * 0.12, night, lw);
      win(x, w * 0.16, -h * 0.42, w * 0.12, w * 0.12, night, lw);
    }
    if (L !== 'static') {
      // телескоп поворачивается
      x.save();
      x.translate(0, -h * 0.75);
      x.rotate(-0.6 + Math.sin(t * 0.5) * 0.15);
      rr(x, -w * 0.06, -w * 0.5, w * 0.12, w * 0.4, w * 0.03);
      fillS(x, '#5a5a8a', lw);
      rr(x, -w * 0.075, -w * 0.52, w * 0.15, w * 0.06, w * 0.02);
      fillS(x, '#ffd23a', lw * 0.6);
      x.restore();
      if (night) for (let i = 0; i < 3; i++) star(x, w * (0.3 + i * 0.1), -h * (1.2 + (i % 2) * 0.2), w * 0.05 * (1 + Math.sin(t * 3 + i) * 0.3), '#fff6a0');
    }
  },
  // ратуша-замок
  castle(x, w, t, tier, night, lw, L) {
    const h = w * 1.1;
    if (L !== 'anim') {
      for (const X of [-0.42, 0.26]) {
        rr(x, w * X, -h * 0.95, w * 0.16, h * 0.95, w * 0.02);
        x.fillStyle = hgrad(x, w * X, w * 0.16, '#efe6d2');
        x.fill();
        bricks(x, w * X, -h * 0.95, w * 0.16, h * 0.95, 10, lw);
        rr(x, w * X, -h * 0.95, w * 0.16, h * 0.95, w * 0.02);
        x.strokeStyle = OL;
        x.lineWidth = lw;
        x.stroke();
        x.beginPath();
        x.moveTo(w * X - w * 0.03, -h * 0.95);
        x.lineTo(w * X + w * 0.08, -h * 1.22);
        x.lineTo(w * X + w * 0.19, -h * 0.95);
        x.closePath();
        x.fillStyle = hgrad(x, w * X - w * 0.03, w * 0.22, '#4a7ad8');
        x.fill();
        x.strokeStyle = OL;
        x.stroke();
        win(x, w * X + w * 0.045, -h * 0.75, w * 0.07, w * 0.1, night, lw);
      }
      wall(x, -w * 0.28, -h * 0.6, w * 0.56, h * 0.6, '#f6efe0', lw, w * 0.03);
      rr(x, -w * 0.28, -h * 0.6, w * 0.56, h * 0.6, w * 0.03);
      bricks(x, -w * 0.28, -h * 0.6, w * 0.56, h * 0.6, 7, lw);
      // зубцы
      for (let i = 0; i < 5; i++) {
        rr(x, -w * 0.24 + i * w * 0.1, -h * 0.68, w * 0.06, h * 0.08, w * 0.01);
        fillS(x, '#f6efe0', lw * 0.7);
      }
      // ворота с решёткой
      x.beginPath();
      x.moveTo(-w * 0.1, 0);
      x.lineTo(-w * 0.1, -h * 0.25);
      x.arc(0, -h * 0.25, w * 0.1, Math.PI, 0);
      x.lineTo(w * 0.1, 0);
      x.closePath();
      fillS(x, '#8a5a3a', lw);
      x.strokeStyle = 'rgba(40,30,30,.45)';
      x.lineWidth = lw * 0.5;
      x.beginPath();
      for (const k of [-0.05, 0, 0.05]) {
        x.moveTo(w * k, -h * 0.3);
        x.lineTo(w * k, 0);
      }
      x.moveTo(-w * 0.1, -h * 0.15);
      x.lineTo(w * 0.1, -h * 0.15);
      x.stroke();
      win(x, -w * 0.06, -h * 0.5, w * 0.12, w * 0.12, night, lw);
      // часы
      x.beginPath();
      x.arc(0, -h * 0.82, w * 0.08, 0, TAU);
      fillS(x, '#fff', lw * 0.7);
      x.strokeStyle = '#3a3a5a';
      x.lineWidth = lw * 0.6;
      x.beginPath();
      x.moveTo(0, -h * 0.82);
      x.lineTo(0, -h * 0.82 - w * 0.05);
      x.moveTo(0, -h * 0.82);
      x.lineTo(w * 0.035, -h * 0.82);
      x.stroke();
    }
    if (L !== 'static') for (const X of [-0.42, 0.26]) flag(x, w * X + w * 0.08, -h * 1.22, h * 0.2, '#ff5a6a', t, lw);
  },
  // причал дирижаблей
  airship(x, w, t, tier, night, lw, L) {
    const h = w * 1.2;
    if (L !== 'anim') {
      // мачта с перекладинами
      x.fillStyle = hgrad(x, -w * 0.035, w * 0.07, '#7a8aa0', 0.25);
      x.fillRect(-w * 0.035, -h * 0.8, w * 0.07, h * 0.8);
      x.strokeStyle = 'rgba(60,70,90,.4)';
      x.lineWidth = lw * 0.5;
      x.beginPath();
      for (let i = 1; i < 6; i++) {
        x.moveTo(-w * 0.035, -h * 0.13 * i);
        x.lineTo(w * 0.035, -h * 0.13 * i - h * 0.06);
      }
      x.stroke();
      wall(x, -w * 0.3, -h * 0.2, w * 0.6, h * 0.2, '#c8d0e0', lw, w * 0.03);
      win(x, -w * 0.22, -h * 0.16, w * 0.1, w * 0.1, night, lw);
      win(x, w * 0.12, -h * 0.16, w * 0.1, w * 0.1, night, lw);
      x.fillStyle = '#ff5a6a';
      x.beginPath();
      x.arc(0, -h * 0.82, w * 0.03, 0, TAU);
      x.fill();
    }
    if (L !== 'static') {
      const by = -h * 1.05 + Math.sin(t * 1.5) * w * 0.04;
      x.strokeStyle = 'rgba(80,80,100,.6)';
      x.lineWidth = lw * 0.6;
      x.beginPath();
      x.moveTo(0, -h * 0.8);
      x.lineTo(0, by + w * 0.18);
      x.stroke();
      // хвост
      x.beginPath();
      x.moveTo(-w * 0.44, by);
      x.lineTo(-w * 0.62, by - w * 0.14);
      x.lineTo(-w * 0.62, by + w * 0.14);
      x.closePath();
      fillS(x, '#ff7a3a', lw * 0.8);
      x.beginPath();
      x.ellipse(0, by, w * 0.5, w * 0.2, 0, 0, TAU);
      x.fillStyle = '#ffb03a';
      x.fill();
      x.save();
      x.clip();
      x.fillStyle = '#ff7a3a';
      for (let i = -2; i <= 2; i++) x.fillRect(i * w * 0.2 - w * 0.04, by - w * 0.3, w * 0.08, w * 0.6);
      const g = x.createLinearGradient(0, by - w * 0.2, 0, by + w * 0.2);
      g.addColorStop(0, 'rgba(255,255,255,.4)');
      g.addColorStop(0.45, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(80,30,10,.25)');
      x.fillStyle = g;
      x.fillRect(-w * 0.5, by - w * 0.2, w, w * 0.4);
      x.restore();
      x.beginPath();
      x.ellipse(0, by, w * 0.5, w * 0.2, 0, 0, TAU);
      x.strokeStyle = OL;
      x.lineWidth = lw;
      x.stroke();
      rr(x, -w * 0.12, by + w * 0.17, w * 0.24, w * 0.1, w * 0.03);
      fillS(x, '#8a5a3a', lw * 0.7);
      x.fillStyle = night ? '#ffd86a' : '#bfe8ff';
      for (const k of [-0.06, 0.02]) x.fillRect(w * k, by + w * 0.19, w * 0.05, w * 0.045);
    }
  },
  // радужный фонтан
  rainbow(x, w, t, tier, night, lw, L) {
    const h = w * 0.9;
    if (L !== 'anim') {
      const cols = ['#ff5a6a', '#ffa03a', '#ffe03a', '#5ad06a', '#4aa8ff', '#9a6aff'];
      cols.forEach((c, i) => {
        x.strokeStyle = c;
        x.lineWidth = w * 0.05;
        x.globalAlpha = 0.85;
        x.beginPath();
        x.arc(0, -h * 0.3, w * (0.46 - i * 0.05), Math.PI, 0);
        x.stroke();
      });
      x.globalAlpha = 1;
      // чаша
      x.beginPath();
      x.ellipse(0, -h * 0.08, w * 0.4, w * 0.1, 0, 0, TAU);
      fillS(x, '#d8d0e8', lw);
      x.beginPath();
      x.ellipse(0, -h * 0.1, w * 0.33, w * 0.065, 0, 0, TAU);
      x.fillStyle = '#9ad8ff';
      x.fill();
      x.fillStyle = 'rgba(255,255,255,.6)';
      x.beginPath();
      x.ellipse(-w * 0.12, -h * 0.11, w * 0.1, w * 0.02, 0, 0, TAU);
      x.fill();
      rr(x, -w * 0.06, -h * 0.5, w * 0.12, h * 0.42, w * 0.03);
      x.fillStyle = hgrad(x, -w * 0.06, w * 0.12, '#e8e4f8', 0.2);
      x.fill();
      x.strokeStyle = OL;
      x.lineWidth = lw;
      x.stroke();
    }
    if (L !== 'static') {
      for (let i = 0; i < 8; i++) {
        const k = (t * 0.9 + i / 8) % 1;
        const a = (i / 8) * TAU;
        x.fillStyle = `rgba(150,210,255,${1 - k})`;
        x.beginPath();
        x.arc(Math.cos(a) * w * 0.25 * k, -h * 0.55 - Math.sin(k * Math.PI) * h * 0.3, w * 0.035, 0, TAU);
        x.fill();
      }
    }
  },
};

// знаки роста: флажок, золотая звезда, искры (всё, кроме звезды, анимировано)
function badges(ctx, id, w, tier, t, lw, L) {
  if (L !== 'static' && tier >= 2 && id !== 'carousel' && id !== 'castle') flag(ctx, w * 0.4, -w * 0.05, w * 0.42, ['#ff5a6a', '#4aa8ff', '#5ad06a'][tier % 3], t, lw);
  if (L !== 'anim' && tier >= 4) {
    star(ctx, -w * 0.42, -w * 0.18, w * 0.13, '#e8a020');
    star(ctx, -w * 0.42, -w * 0.19, w * 0.11, '#ffd23a');
  }
  if (L !== 'static' && tier >= 6)
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * 2.1;
      star(ctx, Math.cos(a) * w * 0.5, -w * 0.6 + Math.sin(a) * w * 0.3, w * 0.05 * (1 + Math.sin(t * 6 + i)), 'rgba(255,240,150,.9)');
    }
}

// кэш статичных частей: спрайт на (здание, порог, ширину, ночь, dpr)
const spr = new Map();
const BX = 0.8,
  BUP = 2.5,
  BDN = 0.25;
function staticSprite(id, tier, q, night, dpr, grow) {
  const key = id + '|' + tier + '|' + q + '|' + (night ? 1 : 0) + '|' + dpr;
  let c = spr.get(key);
  if (c) return c;
  if (spr.size > 96) spr.clear();
  const W = q * BX * 2 * grow,
    H = q * (BUP + BDN) * grow;
  c = document.createElement('canvas');
  c.width = Math.ceil(W * dpr);
  c.height = Math.ceil(H * dpr);
  const x = c.getContext('2d');
  x.scale(dpr, dpr);
  x.translate(W / 2, q * BUP * grow);
  x.scale(grow, grow);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  const lw = Math.max(1, q * 0.035);
  DRAW[id](x, q, 0, tier, night, lw, 'static');
  badges(x, id, q, tier, 0, lw, 'static');
  spr.set(key, c);
  return c;
}

// рисует здание: x, y — точка основания; w — ширина; dpr — включает кэш статичной части
export function drawBuilding(ctx, id, X, Y, w, tier, t, night, dpr) {
  const fn = DRAW[id];
  if (!fn) return;
  const grow = 1 + Math.min(tier, 6) * 0.06;
  const lw = Math.max(1, w * 0.035);
  if (dpr) {
    // ширина квантуется шагами ~9%, спрайт подгоняется масштабом — без пересоздания на каждый пиксель
    const q = Math.max(8, Math.round(Math.pow(2, Math.round(Math.log2(w) * 8) / 8)));
    const c = staticSprite(id, tier, q, night, dpr, grow);
    const k = w / q;
    ctx.drawImage(c, X - q * BX * grow * k, Y - q * BUP * grow * k, (c.width / dpr) * k, (c.height / dpr) * k);
  }
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(grow, grow);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const L = dpr ? 'anim' : 'all';
  fn(ctx, w, t, tier, night, lw, L);
  badges(ctx, id, w, tier, t, lw, L);
  ctx.restore();
}

// пустой участок под стройку
export function drawPlot(ctx, X, Y, w, t) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.fillStyle = 'rgba(150,110,60,.25)';
  ctx.beginPath();
  ctx.ellipse(0, -w * 0.05, w * 0.42, w * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.setLineDash([w * 0.08, w * 0.06]);
  ctx.lineWidth = Math.max(1.5, w * 0.04);
  ctx.beginPath();
  ctx.ellipse(0, -w * 0.05, w * 0.42, w * 0.12, 0, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  const b = Math.sin(t * 3) * w * 0.03;
  ctx.fillStyle = '#b07a4a';
  ctx.fillRect(-w * 0.02, -w * 0.5 + b, w * 0.04, w * 0.45);
  rr(ctx, -w * 0.18, -w * 0.62 + b, w * 0.36, w * 0.2, w * 0.04);
  ctx.fillStyle = '#fff6dc';
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.stroke();
  ctx.fillStyle = '#e8743a';
  ctx.font = `800 ${w * 0.2}px Rubik, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', 0, -w * 0.52 + b);
  ctx.restore();
}

// высота здания относительно ширины (для подсказок над ним)
export const B_H = { lemon: 0.7, fish: 1.25, light: 2.15, bakery: 1.5, mill: 2, carousel: 1.35, bank: 0.95, garden: 0.85, observ: 1.2, castle: 1.4, airship: 1.4, rainbow: 0.9 };
