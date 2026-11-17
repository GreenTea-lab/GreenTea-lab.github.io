// Поле: геометрия клеток и рисунок верхней грани (canvas) в классическом стиле
import { CELLS, GROUPS, GO_SALARY } from './data.js';
import { t, money, LANG } from './i18n.js';

export const S = 24; // сторона поля
export const C = 3.2; // угловая клетка
export const W = (S - 2 * C) / 9; // обычная клетка
export const BAND = 0.72; // цветная полоса
const H = S / 2;

// сторона: 0 — низ, 1 — лево, 2 — верх, 3 — право; in — направление к центру; al — вдоль края по ходу
export function cellGeo(i) {
  const side = Math.floor(i / 10);
  const k = i % 10;
  let x, z;
  if (k === 0) {
    const cx = [H - C / 2, -H + C / 2, -H + C / 2, H - C / 2][side];
    const cz = [H - C / 2, H - C / 2, -H + C / 2, -H + C / 2][side];
    x = cx;
    z = cz;
  } else {
    const d = C + (k - 0.5) * W;
    if (side === 0) [x, z] = [H - d, H - C / 2];
    else if (side === 1) [x, z] = [-H + C / 2, H - d];
    else if (side === 2) [x, z] = [-H + d, -H + C / 2];
    else [x, z] = [H - C / 2, -H + d];
  }
  const inn = [[0, -1], [1, 0], [0, 1], [-1, 0]][side];
  const al = [[-1, 0], [0, -1], [1, 0], [0, 1]][side];
  return { x, z, side, corner: k === 0, in: inn, al, rot: [0, -Math.PI / 2, Math.PI, Math.PI / 2][side] };
}

const PX = 2048 / S;
const INK = '#1d2a24';
const MINT = '#d4ecd6';

function fitText(g, text, maxW, size, font) {
  let s = size;
  g.font = `${font} ${s}px Oswald, "Arial Narrow", Arial, sans-serif`;
  while (g.measureText(text).width > maxW && s > 10) {
    s -= 1;
    g.font = `${font} ${s}px Oswald, "Arial Narrow", Arial, sans-serif`;
  }
  return s;
}
// название в 1–2 строки
function nameLines(g, name, maxW, size) {
  const up = name.toUpperCase();
  g.font = `600 ${size}px Oswald, Arial, sans-serif`;
  if (g.measureText(up).width <= maxW) return [up];
  const parts = up.split(/(?<=[\s-])/);
  if (parts.length > 1) {
    // разбить пополам по словам
    let best = null;
    for (let k = 1; k < parts.length; k++) {
      const a = parts.slice(0, k).join('').trim(),
        b = parts.slice(k).join('').trim();
      const w = Math.max(g.measureText(a).width, g.measureText(b).width);
      if (!best || w < best.w) best = { w, l: [a, b] };
    }
    return best.l;
  }
  return [up];
}

export function paintBoard(theme = {}) {
  const N = 2048;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = MINT;
  g.fillRect(0, 0, N, N);
  // лёгкая фактура бумаги
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.035})`;
    g.fillRect(Math.random() * N, Math.random() * N, 2, 2);
  }
  center(g, N);
  for (let i = 0; i < 40; i++) paintCell(g, i);
  // внутренняя и внешняя рамки
  g.strokeStyle = INK;
  g.lineWidth = 5;
  g.strokeRect(C * PX, C * PX, (S - 2 * C) * PX, (S - 2 * C) * PX);
  g.lineWidth = 8;
  g.strokeRect(4, 4, N - 8, N - 8);
  return c;
}

function paintCell(g, i) {
  const cg = cellGeo(i);
  const cell = CELLS[i];
  g.save();
  g.translate((cg.x + H) * PX, (cg.z + H) * PX);
  g.rotate([0, Math.PI / 2, Math.PI, -Math.PI / 2][cg.side]);
  const w = (cg.corner ? C : W) * PX;
  const h = C * PX;
  // рамка клетки
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.strokeRect(-w / 2, -h / 2, w, h);
  if (cg.corner) {
    corner(g, cell, w);
    g.restore();
    return;
  }
  const top = -h / 2;
  const mw = w - 18;
  const name = t('c_' + cell.key);
  if (cell.type === 'city') {
    g.fillStyle = GROUPS[cell.group].color;
    g.fillRect(-w / 2, top, w, BAND * PX);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-w / 2, top + BAND * PX);
    g.lineTo(w / 2, top + BAND * PX);
    g.stroke();
    // блик на полосе
    const gr = g.createLinearGradient(0, top, 0, top + BAND * PX);
    gr.addColorStop(0, 'rgba(255,255,255,.28)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(-w / 2 + 2, top + 2, w - 4, BAND * PX * 0.5);
    const lines = nameLines(g, name, mw, 27);
    g.fillStyle = INK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let y = top + BAND * PX + 30;
    for (const l of lines) {
      fitText(g, l, mw, 27, 600);
      g.fillText(l, 0, y);
      y += 30;
    }
    landmark(g, LM[cell.key] || 'houses', 0, h / 2 - 82, w - 26, 66, cell.i);
    g.font = '500 23px Oswald, Arial, sans-serif';
    fitText(g, money(cell.price), mw, 23, 500);
    g.fillText(money(cell.price), 0, h / 2 - 24);
  } else {
    g.fillStyle = INK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const lines = nameLines(g, name, mw, 25);
    let y = top + 30;
    for (const l of lines) {
      fitText(g, l, mw, 25, 600);
      g.fillText(l, 0, y);
      y += 28;
    }
    const iy = lines.length > 1 ? 18 : 6;
    if (cell.type === 'card') {
      if (cell.deck === 'chance') question(g, 0, iy + 4);
      else chestIcon(g, 0, iy + 6);
    } else if (cell.type === 'tax') {
      if (cell.key === 'tax2') ring(g, 0, iy + 4);
      else coins(g, 0, iy + 4);
      g.fillStyle = INK;
      g.font = '500 21px Oswald, Arial, sans-serif';
      fitText(g, money(cell.amount), mw, 23, 500);
      g.fillText(money(cell.amount), 0, h / 2 - 24);
    } else if (cell.type === 'transport' || cell.type === 'util') {
      ICONS[cell.icon](g, 0, iy + 6);
      g.fillStyle = INK;
      fitText(g, money(cell.price), mw, 23, 500);
      g.fillText(money(cell.price), 0, h / 2 - 24);
    }
  }
  g.restore();
}

// ---------- углы ----------
// вызывается в повёрнутой системе стороны; надписи углов идут по диагонали к центру
function corner(g, cell, w) {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = INK;
  const half = w / 2;
  if (cell.type === 'go') {
    // стрелка вдоль нижнего ряда — по ходу движения (влево)
    g.save();
    g.translate(0, half - 56);
    g.fillStyle = '#c8282a';
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(110, -14);
    g.lineTo(-40, -14);
    g.lineTo(-40, -34);
    g.lineTo(-100, 0);
    g.lineTo(-40, 34);
    g.lineTo(-40, 14);
    g.lineTo(110, 14);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    g.save();
    g.translate(-8, -16);
    g.rotate(-Math.PI / 4);
    let fs = 66;
    g.font = `900 ${fs}px "Playfair Display", Georgia, serif`;
    const go = t('c_go').toUpperCase();
    while (g.measureText(go).width > w * 0.9 && fs > 30) g.font = `900 ${(fs -= 2)}px "Playfair Display", Georgia, serif`;
    g.lineWidth = 5;
    g.strokeStyle = '#fff';
    g.strokeText(go, 0, 6);
    g.fillStyle = '#c8282a';
    g.fillText(go, 0, 6);
    g.fillStyle = INK;
    const sub = t('c_goSub', { n: money(GO_SALARY) });
    fitText(g, sub, w * 0.8, 21, 500);
    g.fillText(sub, 0, -50);
    g.restore();
  } else if (cell.type === 'jail') {
    // назад в систему холста: внутренний угол клетки — справа сверху
    g.rotate(-Math.PI / 2);
    const s = 2.15 * PX;
    const x0 = half - s,
      y0 = -half;
    g.fillStyle = '#f39a3c';
    g.fillRect(x0, y0, s, s);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.strokeRect(x0, y0, s, s);
    g.save();
    g.translate(x0 + s / 2, y0 + s / 2);
    g.rotate(Math.PI / 4);
    g.fillStyle = INK;
    fitText(g, t('c_jail').toUpperCase(), s * 0.9, 30, 600);
    g.fillText(t('c_jail').toUpperCase(), 0, -58);
    g.fillStyle = '#fff6e4';
    g.fillRect(-36, -36, 72, 72);
    g.fillStyle = '#6b4a2b';
    g.beginPath();
    g.arc(0, -4, 15, 0, Math.PI * 2);
    g.fill();
    g.fillRect(-20, 10, 40, 26);
    g.strokeStyle = '#3a3f44';
    g.lineWidth = 6;
    for (let k = -27; k <= 27; k += 13.5) {
      g.beginPath();
      g.moveTo(k, -36);
      g.lineTo(k, 36);
      g.stroke();
    }
    g.lineWidth = 3;
    g.strokeStyle = INK;
    g.strokeRect(-36, -36, 72, 72);
    g.restore();
    // «Просто в гостях» по внешним полосам
    g.fillStyle = INK;
    const v = t('justVisit').toUpperCase();
    const strip = w - s;
    g.save();
    g.translate(-half + strip / 2, y0 + s / 2);
    g.rotate(Math.PI / 2);
    fitText(g, v, s - 16, 24, 600);
    g.fillText(v, 0, 0);
    g.restore();
    g.save();
    g.translate(x0 + s / 2, half - strip / 2);
    fitText(g, v, s - 16, 24, 600);
    g.fillText(v, 0, 0);
    g.restore();
  } else if (cell.type === 'park') {
    g.rotate(-Math.PI / 4);
    const n = t('c_park').toUpperCase();
    fitText(g, n, w * 0.85, 32, 600);
    g.fillText(n, 0, -84);
    tree(g, -34, 10, 1.2);
    tree(g, 40, 18, 0.95);
    g.fillStyle = '#8a5a34';
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.fillRect(-44, 52, 92, 12);
    g.strokeRect(-44, 52, 92, 12);
    g.fillRect(-44, 34, 92, 10);
    g.strokeRect(-44, 34, 92, 10);
    g.beginPath();
    g.moveTo(-36, 64);
    g.lineTo(-36, 82);
    g.moveTo(40, 64);
    g.lineTo(40, 82);
    g.stroke();
  } else if (cell.type === 'tojail') {
    g.rotate(-Math.PI / 4);
    const n = t('c_tojail').toUpperCase();
    fitText(g, n, w * 0.85, 34, 600);
    g.fillText(n, 0, -84);
    g.save();
    g.translate(0, 14);
    g.fillStyle = '#3a3f44';
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.fillRect(-64, 34, 128, 22);
    g.strokeRect(-64, 34, 128, 22);
    for (const [x, col] of [[-30, '#2f6fd6'], [30, '#e2312d']]) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, 34, 30, Math.PI, 0);
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.6)';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(x, 34, 18, Math.PI * 1.15, Math.PI * 1.45);
      g.stroke();
      g.strokeStyle = INK;
      g.lineWidth = 3;
    }
    g.strokeStyle = '#e2312d';
    g.lineWidth = 4;
    for (const a of [-2.6, -2.1, -1.57, -1.05, -0.55]) {
      g.beginPath();
      g.moveTo(Math.cos(a) * 54, 30 + Math.sin(a) * 54);
      g.lineTo(Math.cos(a) * 70, 30 + Math.sin(a) * 70);
      g.stroke();
    }
    g.restore();
  }
}

function tree(g, x, y, s) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = '#7a4a2a';
  g.fillRect(-4, -10, 8, 34);
  g.fillStyle = '#3f9a4a';
  g.strokeStyle = INK;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(0, -26, 22, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.beginPath();
  g.arc(-7, -33, 8, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// ---------- центр поля ----------
function center(g, N) {
  const m = C * PX;
  // мягкая виньетка внутри
  const gr = g.createRadialGradient(N / 2, N / 2, 100, N / 2, N / 2, N / 2);
  gr.addColorStop(0, 'rgba(255,255,255,.35)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(m, m, N - 2 * m, N - 2 * m);
  // декоративная карта-силуэт: меридианы и параллели
  g.save();
  g.beginPath();
  g.rect(m, m, N - 2 * m, N - 2 * m);
  g.clip();
  g.strokeStyle = 'rgba(29,42,36,.08)';
  g.lineWidth = 2;
  for (let k = -6; k <= 6; k++) {
    g.beginPath();
    g.ellipse(N / 2, N / 2 + 900, 1300, 1300, 0, Math.PI * 1.25 + k * 0.03, Math.PI * 1.75 - k * 0.03);
    g.stroke();
  }
  for (let r = 300; r < 1400; r += 120) {
    g.beginPath();
    g.arc(N / 2, N / 2 + 1500, r + 900, Math.PI * 1.3, Math.PI * 1.7);
    g.stroke();
  }
  g.restore();
  // диагональная лента с названием
  g.save();
  g.translate(N / 2, N / 2);
  g.rotate(-Math.PI / 4);
  const title = t('title').toUpperCase();
  g.font = `900 150px "Playfair Display", Georgia, serif`;
  let fs = 150;
  while (g.measureText(title).width > 880 && fs > 60) {
    fs -= 4;
    g.font = `900 ${fs}px "Playfair Display", Georgia, serif`;
  }
  const tw = g.measureText(title).width + 110;
  const th = fs * 1.25;
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(-tw / 2 + 10, -th / 2 + 14, tw, th);
  g.fillStyle = '#c8282a';
  g.fillRect(-tw / 2, -th / 2, tw, th);
  g.strokeStyle = '#fff';
  g.lineWidth = 6;
  g.strokeRect(-tw / 2 + 12, -th / 2 + 12, tw - 24, th - 24);
  g.strokeStyle = INK;
  g.lineWidth = 5;
  g.strokeRect(-tw / 2, -th / 2, tw, th);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(title, 0, fs * 0.06);
  g.fillStyle = INK;
  g.font = '600 52px Oswald, Arial, sans-serif';
  g.fillText(t('subtitle').toUpperCase(), 0, th / 2 + 60);
  // звёздочки
  g.fillStyle = '#c8282a';
  for (const sx of [-1, 1]) star(g, sx * (g.measureText(t('subtitle').toUpperCase()).width / 2 + 50), th / 2 + 60, 18);
  g.restore();
  // места под колоды карточек
  deckSpot(g, N / 2 - 470, N / 2 - 330, -Math.PI / 4, '#f39324', t('chance'), 'chance');
  deckSpot(g, N / 2 + 470, N / 2 + 330, -Math.PI / 4 + Math.PI, '#4b8fd6', t('chest'), 'chest');
}
// координаты колод в мире (для 3D-стопок)
export const DECKS = {
  chance: { x: ((1024 - 470) / PX - H), z: ((1024 - 330) / PX - H), rot: Math.PI / 4 },
  chest: { x: ((1024 + 470) / PX - H), z: ((1024 + 330) / PX - H), rot: Math.PI / 4 + Math.PI },
};
function deckSpot(g, x, y, rot, col, label, kind) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const w = 3.2 * PX,
    h = 2.0 * PX;
  g.setLineDash([16, 12]);
  g.strokeStyle = 'rgba(29,42,36,.55)';
  g.lineWidth = 4;
  roundRect(g, -w / 2 - 14, -h / 2 - 14, w + 28, h + 28, 18);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = col;
  g.globalAlpha = 0.22;
  roundRect(g, -w / 2, -h / 2, w, h, 14);
  g.fill();
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(29,42,36,.45)';
  g.font = '600 40px Oswald, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label.toUpperCase(), 0, h / 2 + 44);
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
function star(g, x, y, r) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

// ---------- значки ----------
function question(g, x, y) {
  g.save();
  g.font = `900 92px "Playfair Display", Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.strokeText('?', x, y + 14);
  g.fillStyle = '#f08a1c';
  g.fillText('?', x, y + 14);
  g.restore();
}
function chestIcon(g, x, y) {
  g.save();
  g.translate(x, y);
  g.strokeStyle = INK;
  g.lineWidth = 3.5;
  g.fillStyle = '#4b8fd6';
  g.fillRect(-46, -6, 92, 48);
  g.strokeRect(-46, -6, 92, 48);
  g.beginPath();
  g.moveTo(-46, -6);
  g.quadraticCurveTo(0, -46, 46, -6);
  g.closePath();
  g.fillStyle = '#6aa8ea';
  g.fill();
  g.stroke();
  g.fillStyle = '#f5c842';
  g.fillRect(-10, -12, 20, 24);
  g.strokeRect(-10, -12, 20, 24);
  g.fillStyle = INK;
  g.fillRect(-3, -4, 6, 9);
  g.strokeStyle = '#f5c842';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(-30, -2);
  g.lineTo(-30, 40);
  g.moveTo(30, -2);
  g.lineTo(30, 40);
  g.stroke();
  g.restore();
}
function ring(g, x, y) {
  g.save();
  g.translate(x, y);
  g.strokeStyle = '#d8a520';
  g.lineWidth = 9;
  g.beginPath();
  g.arc(0, 18, 26, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 18, 31, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#bfe8ff';
  g.beginPath();
  g.moveTo(0, -40);
  g.lineTo(18, -22);
  g.lineTo(0, -6);
  g.lineTo(-18, -22);
  g.closePath();
  g.fill();
  g.lineWidth = 3;
  g.stroke();
  g.restore();
}
function coins(g, x, y) {
  g.save();
  g.translate(x, y);
  g.strokeStyle = INK;
  g.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    g.fillStyle = '#f2c230';
    g.beginPath();
    g.ellipse(-18, 34 - k * 12, 30, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  for (let k = 0; k < 2; k++) {
    g.fillStyle = '#f2c230';
    g.beginPath();
    g.ellipse(28, 34 - k * 12, 26, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.fillStyle = INK;
  g.font = '700 22px Oswald, Arial';
  g.textAlign = 'center';
  g.fillText('₽', -18, 0);
  g.restore();
}
const ICONS = {
  train(g, x, y) {
    g.save();
    g.translate(x, y);
    g.fillStyle = INK;
    g.fillRect(-48, -10, 62, 34);
    g.fillRect(8, -34, 34, 58);
    g.fillRect(-40, -34, 14, 26);
    g.fillRect(-56, 18, 104, 8);
    g.fillStyle = '#d4ecd6';
    g.fillRect(14, -26, 22, 16);
    g.fillStyle = INK;
    for (const wx of [-36, -10, 28]) {
      g.beginPath();
      g.arc(wx, 32, 12, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#d4ecd6';
    for (const wx of [-36, -10, 28]) {
      g.beginPath();
      g.arc(wx, 32, 4, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  },
  ship(g, x, y) {
    g.save();
    g.translate(x, y);
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(-56, 6);
    g.lineTo(56, 6);
    g.lineTo(40, 34);
    g.lineTo(-44, 34);
    g.closePath();
    g.fill();
    g.fillRect(-34, -14, 60, 20);
    g.fillRect(-20, -36, 14, 22);
    g.fillRect(4, -30, 14, 16);
    g.fillStyle = '#d4ecd6';
    for (let k = 0; k < 4; k++) g.fillRect(-28 + k * 14, -9, 8, 8);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    for (let k = -60; k < 60; k += 20) {
      g.moveTo(k, 44);
      g.quadraticCurveTo(k + 5, 38, k + 10, 44);
      g.quadraticCurveTo(k + 15, 50, k + 20, 44);
    }
    g.stroke();
    g.restore();
  },
  plane(g, x, y) {
    g.save();
    g.translate(x, y + 4);
    g.rotate(-0.35);
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(0, 0, 58, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-8, -6);
    g.lineTo(-26, -46);
    g.lineTo(-12, -46);
    g.lineTo(18, -6);
    g.moveTo(-8, 6);
    g.lineTo(-26, 46);
    g.lineTo(-12, 46);
    g.lineTo(18, 6);
    g.moveTo(-46, -4);
    g.lineTo(-58, -24);
    g.lineTo(-50, -24);
    g.lineTo(-36, -4);
    g.moveTo(-46, 4);
    g.lineTo(-58, 24);
    g.lineTo(-50, 24);
    g.lineTo(-36, 4);
    g.fill();
    g.restore();
  },
  anchor(g, x, y) {
    g.save();
    g.translate(x, y);
    g.strokeStyle = INK;
    g.lineWidth = 8;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(0, -34, 9, 0, Math.PI * 2);
    g.moveTo(0, -25);
    g.lineTo(0, 38);
    g.moveTo(-22, -12);
    g.lineTo(22, -12);
    g.stroke();
    g.beginPath();
    g.arc(0, 4, 36, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
    g.fillStyle = INK;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 36, 2);
      g.lineTo(s * 44, 22);
      g.lineTo(s * 24, 18);
      g.fill();
    }
    g.restore();
  },
  bolt(g, x, y) {
    g.save();
    g.translate(x, y);
    g.fillStyle = '#f6d327';
    g.strokeStyle = INK;
    g.lineWidth = 4;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(10, -46);
    g.lineTo(-26, 6);
    g.lineTo(-2, 6);
    g.lineTo(-12, 46);
    g.lineTo(28, -8);
    g.lineTo(4, -8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  },
  drop(g, x, y) {
    g.save();
    g.translate(x, y);
    g.fillStyle = '#4ba3e3';
    g.strokeStyle = INK;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, -46);
    g.bezierCurveTo(14, -20, 32, 0, 32, 16);
    g.arc(0, 16, 32, 0, Math.PI);
    g.bezierCurveTo(-32, 0, -14, -20, 0, -46);
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath();
    g.ellipse(-12, 14, 6, 12, 0.3, 0, Math.PI * 2);
    g.fill();
    g.restore();
  },
};

// ---------- силуэты городов ----------
const LM = {
  ivanovo: 'houses', kostroma: 'domes', pskov: 'fort', vologda: 'domes', tver: 'river', tula: 'fort', ryazan: 'domes', yaroslavl: 'domes',
  samara: 'rocket', saratov: 'bridge', volgograd: 'statue', nnovgorod: 'fort', kazan: 'mosque', ufa: 'mosque', ekb: 'towers', nsk: 'theater',
  krsk: 'chapel', vladivostok: 'bridge', kaliningrad: 'gothic', sochi: 'palm', spb: 'spire', moscow: 'kremlin',
};
function landmark(g, kind, cx, cy, w, h, seed) {
  g.save();
  g.translate(cx - w / 2, cy - h / 2);
  g.fillStyle = 'rgba(29,42,36,.42)';
  const base = h;
  const rect = (x, y, ww, hh) => g.fillRect(x, base - y - hh, ww, hh);
  const dome = (x, y, r) => {
    // луковка
    g.beginPath();
    g.moveTo(x - r, base - y);
    g.bezierCurveTo(x - r * 1.3, base - y - r * 1.2, x - r * 0.2, base - y - r * 1.5, x, base - y - r * 2.4);
    g.bezierCurveTo(x + r * 0.2, base - y - r * 1.5, x + r * 1.3, base - y - r * 1.2, x + r, base - y);
    g.fill();
  };
  const tri = (x, y, ww, hh) => {
    g.beginPath();
    g.moveTo(x, base - y);
    g.lineTo(x + ww / 2, base - y - hh);
    g.lineTo(x + ww, base - y);
    g.fill();
  };
  let r = seed * 7 + 3;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  // земля
  rect(0, 0, w, 3);
  switch (kind) {
    case 'houses':
      for (let x = 2; x < w - 14; x += 18 + rnd() * 6) {
        const hh = 14 + rnd() * 16;
        rect(x, 0, 16, hh);
        tri(x - 2, hh, 20, 9);
      }
      rect(w / 2 - 3, 0, 6, 46);
      break;
    case 'domes':
      rect(w / 2 - 22, 0, 44, 26);
      tri(w / 2 - 24, 26, 48, 10);
      rect(w / 2 - 7, 26, 14, 14);
      dome(w / 2, 40, 9);
      rect(w / 2 - 1, 61, 2, 6);
      rect(w / 2 - 34, 0, 10, 30);
      dome(w / 2 - 29, 30, 6);
      rect(w / 2 + 24, 0, 10, 30);
      dome(w / 2 + 29, 30, 6);
      rect(4, 0, 18, 14);
      rect(w - 22, 0, 18, 12);
      break;
    case 'fort':
      rect(6, 0, w - 12, 16);
      for (let x = 6; x < w - 8; x += 8) rect(x, 16, 4, 4);
      for (const x of [8, w / 2 - 8, w - 24]) {
        rect(x, 0, 16, x === w / 2 - 8 ? 38 : 28);
        tri(x - 2, x === w / 2 - 8 ? 38 : 28, 20, 14);
      }
      break;
    case 'river':
      for (let x = 4; x < w - 10; x += 14) rect(x, 8, 12, 10 + rnd() * 18);
      rect(w / 2 - 4, 8, 8, 40);
      dome(w / 2, 48, 5);
      g.fillRect(0, base - 6, w, 2);
      break;
    case 'rocket':
      rect(w / 2 - 6, 0, 12, 46);
      tri(w / 2 - 6, 46, 12, 14);
      tri(w / 2 - 14, 0, 10, 16);
      tri(w / 2 + 4, 0, 10, 16);
      for (let x = 6; x < w / 2 - 20; x += 14) rect(x, 0, 10, 10 + rnd() * 12);
      for (let x = w / 2 + 20; x < w - 10; x += 14) rect(x, 0, 10, 10 + rnd() * 12);
      break;
    case 'bridge':
      rect(0, 12, w, 4);
      for (const x of [w * 0.3, w * 0.7]) {
        rect(x - 3, 0, 6, 50);
        g.strokeStyle = 'rgba(29,42,36,.42)';
        g.lineWidth = 1.5;
        for (let k = 1; k <= 5; k++) {
          g.beginPath();
          g.moveTo(x, base - 48 + k * 2);
          g.lineTo(x - k * 7, base - 16);
          g.moveTo(x, base - 48 + k * 2);
          g.lineTo(x + k * 7, base - 16);
          g.stroke();
        }
      }
      break;
    case 'statue':
      tri(w / 2 - 30, 0, 60, 14);
      rect(w / 2 - 4, 14, 8, 30);
      tri(w / 2 - 8, 14, 16, 24);
      g.save();
      g.translate(w / 2 + 2, base - 42);
      g.rotate(-0.5);
      g.fillRect(0, -2, 26, 3);
      g.restore();
      rect(w / 2 - 14, 34, 10, 3);
      rect(w / 2 - 3, 44, 6, 6);
      break;
    case 'mosque':
      g.beginPath();
      g.arc(w / 2, base - 24, 14, Math.PI, 0);
      g.fill();
      rect(w / 2 - 18, 0, 36, 24);
      rect(w / 2 - 1, 38, 2, 8);
      for (const x of [w / 2 - 34, w / 2 + 28]) {
        rect(x, 0, 6, 50);
        tri(x - 1, 50, 8, 12);
      }
      rect(6, 0, 16, 12);
      rect(w - 22, 0, 16, 12);
      break;
    case 'towers':
      for (let x = 4; x < w - 10; x += 12) rect(x, 0, 10, 16 + rnd() * 34);
      rect(w / 2 - 6, 0, 12, 56);
      break;
    case 'theater':
      rect(w / 2 - 34, 0, 68, 22);
      g.beginPath();
      g.arc(w / 2, base - 22, 22, Math.PI, 0);
      g.fill();
      rect(w / 2 - 1, 44, 2, 6);
      g.fillStyle = 'rgba(212,236,214,.8)';
      for (let x = w / 2 - 28; x < w / 2 + 28; x += 10) g.fillRect(x, base - 20, 4, 14);
      break;
    case 'chapel':
      rect(w / 2 - 8, 0, 16, 28);
      tri(w / 2 - 12, 28, 24, 22);
      rect(w / 2 - 1, 50, 2, 10);
      rect(w / 2 - 4, 54, 8, 2);
      for (let x = 2; x < w / 2 - 14; x += 9) tri(x, 0, 14, 10 + rnd() * 18);
      for (let x = w / 2 + 14; x < w - 8; x += 9) tri(x, 0, 14, 10 + rnd() * 18);
      break;
    case 'gothic':
      rect(w / 2 - 16, 0, 32, 30);
      tri(w / 2 - 18, 30, 36, 14);
      rect(w / 2 - 6, 30, 12, 18);
      tri(w / 2 - 8, 48, 16, 16);
      for (let x = 4; x < w / 2 - 22; x += 12) tri(x, 0, 12, 18);
      for (let x = w / 2 + 22; x < w - 8; x += 12) tri(x, 0, 12, 18);
      break;
    case 'palm':
      for (const [x, s] of [[w * 0.3, 1], [w * 0.62, 0.8]]) {
        g.save();
        g.translate(x, base);
        g.scale(s, s);
        g.beginPath();
        g.moveTo(-2, 0);
        g.quadraticCurveTo(4, -26, 2, -50);
        g.lineTo(6, -50);
        g.quadraticCurveTo(8, -26, 3, 0);
        g.fill();
        for (const a of [-2.6, -2.0, -1.2, -0.5, 0.1]) {
          g.beginPath();
          g.ellipse(4 + Math.cos(a) * 12, -50 + Math.sin(a) * 6, 14, 3.5, a, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
      }
      g.beginPath();
      g.arc(w * 0.85, base - 30, 9, 0, Math.PI * 2);
      g.fill();
      break;
    case 'spire':
      rect(8, 0, w - 16, 18);
      rect(w / 2 - 10, 18, 20, 12);
      tri(w / 2 - 4, 30, 8, 30);
      rect(w / 2 - 1, 56, 2, 8);
      break;
    case 'kremlin':
      rect(4, 0, w - 8, 14);
      for (let x = 4; x < w - 6; x += 7) rect(x, 14, 3, 4);
      rect(w / 2 - 8, 0, 16, 34);
      tri(w / 2 - 9, 34, 18, 22);
      g.beginPath();
      g.arc(w / 2, base - 60, 3, 0, Math.PI * 2);
      g.fill();
      rect(16, 0, 10, 24);
      tri(15, 24, 12, 12);
      rect(w - 26, 0, 10, 24);
      tri(w - 27, 24, 12, 12);
      dome(w / 2 + 30, 14, 6);
      dome(w / 2 - 30, 14, 6);
      break;
  }
  g.restore();
}
