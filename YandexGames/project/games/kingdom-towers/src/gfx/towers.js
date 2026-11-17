// Башни: 128x176, основание по центру снизу (64,164). 4 уровня у каждой.
import { INK, css, light, dark, ell, circ, poly, paint, line, addTex, rr } from '../art.js';

const STONE = 0xa8a29a;
const WOOD = 0xb07a45;

function foundation(ctx, lvl) {
  ell(ctx, 64, 160, 50, 13);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  ell(ctx, 64, 154, 46, 13);
  paint(ctx, lvl >= 3 ? 0x9a948c : 0x8f8a82, 4, { flat: true });
  // камни
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI + 0.25;
    ell(ctx, 64 + Math.cos(a) * 36, 156 + Math.sin(a) * 6, 8, 4.5);
    ctx.fillStyle = css(light(0x8f8a82, 0.25));
    ctx.fill();
  }
}

function bricks(ctx, x0, y0, x1, y1, color, h = 12) {
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = css(dark(color, 0.28));
  ctx.lineWidth = 2;
  for (let y = y0, row = 0; y < y1; y += h, row++) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    for (let x = x0 + (row % 2 ? h : 0); x < x1; x += h * 2) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function planks(ctx, x0, y0, x1, y1, color) {
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = css(dark(color, 0.3));
  ctx.lineWidth = 2;
  for (let x = x0 + 9; x < x1; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  ctx.restore();
}

function flag(ctx, x, y, color, h = 34) {
  line(ctx, [[x, y], [x, y - h]], INK, 5);
  line(ctx, [[x, y], [x, y - h]], 0x6b4a2a, 2.5);
  poly(ctx, [[x + 1, y - h], [x + 22, y - h + 7], [x + 1, y - h + 15]]);
  paint(ctx, color, 3, { flat: true });
}

function goldTrim(ctx, x0, x1, y) {
  rr(ctx, x0, y - 4, x1 - x0, 8, 3);
  paint(ctx, 0xffc93c, 3, { flat: true });
}

function archer(ctx, lvl) {
  foundation(ctx, lvl);
  const top = lvl >= 3 ? 64 : 72;
  // корпус
  poly(ctx, [[34, 152], [94, 152], [88, top], [40, top]]);
  if (lvl >= 3) {
    paint(ctx, STONE, 4, { box: [0, top, 0, 152] });
    poly(ctx, [[34, 152], [94, 152], [88, top], [40, top]]);
    bricks(ctx, 30, top, 98, 152, STONE);
    poly(ctx, [[34, 152], [94, 152], [88, top], [40, top]]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
  } else {
    paint(ctx, WOOD, 4, { box: [0, top, 0, 152] });
    poly(ctx, [[34, 152], [94, 152], [88, top], [40, top]]);
    planks(ctx, 30, top, 98, 152, WOOD);
    poly(ctx, [[34, 152], [94, 152], [88, top], [40, top]]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // перекладины
    line(ctx, [[40, 100], [88, 136]], dark(WOOD, 0.35), 4);
    line(ctx, [[88, 100], [40, 136]], dark(WOOD, 0.35), 4);
  }
  // окно-бойница
  rr(ctx, 58, top + 22, 12, 22, 6);
  paint(ctx, 0x2b1a0e, 0, { flat: true });
  if (lvl >= 2) {
    // знамя
    poly(ctx, [[50, top + 50], [78, top + 50], [78, top + 76], [64, top + 68], [50, top + 76]]);
    paint(ctx, 0x2f8f46, 3, { flat: true });
  }
  // площадка
  rr(ctx, 26, top - 12, 76, 16, 4);
  paint(ctx, dark(WOOD, 0.15), 4, { box: [0, top - 12, 0, top + 4] });
  if (lvl >= 4) goldTrim(ctx, 26, 102, top - 4);
  // зубцы
  for (let i = 0; i < 4; i++) {
    rr(ctx, 28 + i * 20, top - 26, 12, 16, 3);
    paint(ctx, lvl >= 3 ? STONE : WOOD, 3.5, { flat: true });
  }
  // лучники
  const heads = lvl >= 3 ? [48, 80] : [64];
  heads.forEach((x) => {
    circ(ctx, x, top - 22, 10);
    paint(ctx, 0x3fa34d, 3.5, { flat: true });
    ctx.beginPath();
    ctx.arc(x, top - 20, 6, Math.PI * 0.15, Math.PI * 0.85);
    ctx.fillStyle = css(0xf2c9a0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 9, top - 22, 11, -1.2, 1.2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = css(0x6b4a2a);
    ctx.stroke();
  });
  flag(ctx, 98, top - 8, lvl >= 4 ? 0xffc93c : 0x2f8f46, 30 + lvl * 4);
}

function cannonBase(ctx, lvl) {
  foundation(ctx, lvl);
  const top = 104 - lvl * 4;
  rr(ctx, 26, top, 76, 152 - top, 6);
  paint(ctx, STONE, 4, { box: [0, top, 0, 152] });
  rr(ctx, 26, top, 76, 152 - top, 6);
  bricks(ctx, 26, top, 102, 152, STONE);
  rr(ctx, 26, top, 76, 152 - top, 6);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (lvl >= 3) {
    rr(ctx, 26, top + 18, 76, 10, 2);
    paint(ctx, 0xc0392b, 3, { flat: true });
  }
  ell(ctx, 64, top, 40, 13);
  paint(ctx, light(STONE, 0.1), 4, { flat: true });
  ell(ctx, 64, top, 28, 8);
  ctx.fillStyle = css(dark(STONE, 0.35));
  ctx.fill();
  if (lvl >= 4) goldTrim(ctx, 24, 104, top + 6);
}

function cannonHead(ctx, lvl) {
  // ствол вправо, ось вращения в (64,64)
  const L = 40 + lvl * 4;
  const R = 9 + lvl;
  rr(ctx, 60, 64 - R, L, R * 2, R * 0.8);
  paint(ctx, 0x3b3f47, 4, { box: [0, 64 - R, 0, 64 + R] });
  rr(ctx, 60 + L - 8, 64 - R - 3, 10, R * 2 + 6, 4);
  paint(ctx, lvl >= 4 ? 0xffc93c : 0x2a2d33, 3.5, { flat: true });
  rr(ctx, 74, 64 - R - 1, 6, R * 2 + 2, 2);
  paint(ctx, lvl >= 3 ? 0xffc93c : 0x555a63, 2.5, { flat: true });
  circ(ctx, 64, 64, 16);
  paint(ctx, 0x6b4a2a, 4);
  circ(ctx, 64, 64, 5);
  ctx.fillStyle = INK;
  ctx.fill();
}

function mage(ctx, lvl) {
  foundation(ctx, lvl);
  const top = 92 - lvl * 5;
  const col = 0xc9b8e8;
  rr(ctx, 38, top, 52, 154 - top, 8);
  paint(ctx, col, 4, { box: [0, top, 0, 154] });
  rr(ctx, 38, top, 52, 154 - top, 8);
  bricks(ctx, 38, top, 90, 154, col, 11);
  rr(ctx, 38, top, 52, 154 - top, 8);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // окна
  [top + 26, top + 56].forEach((y, i) => {
    if (i === 1 && lvl < 2) return;
    ctx.beginPath();
    ctx.moveTo(58, y + 16);
    ctx.lineTo(58, y + 6);
    ctx.arc(64, y + 6, 6, Math.PI, 0);
    ctx.lineTo(70, y + 16);
    ctx.closePath();
    paint(ctx, 0xffd76a, 3, { flat: true });
  });
  if (lvl >= 3) goldTrim(ctx, 36, 92, top + 4);
  // крыша
  const tip = top - 52 - lvl * 3;
  poly(ctx, [[28, top + 6], [100, top + 6], [64, tip]]);
  paint(ctx, 0x5b2a86, 4, { box: [0, tip, 0, top + 6] });
  ctx.fillStyle = css(0xffd76a);
  [[52, top - 10], [72, top - 22], [62, top - 36], [78, top - 4]].forEach(([x, y]) => {
    circ(ctx, x, y, 2.5);
    ctx.fill();
  });
  if (lvl >= 4) {
    poly(ctx, [[34, top + 6], [94, top + 6], [90, top + 14], [38, top + 14]]);
    paint(ctx, 0xffc93c, 3, { flat: true });
  }
}

function frost(ctx, lvl) {
  foundation(ctx, lvl);
  const col = 0xbfe6f5;
  const top = 108 - lvl * 4;
  rr(ctx, 32, top, 64, 152 - top, 10);
  paint(ctx, 0x9fb6c9, 4, { box: [0, top, 0, 152] });
  rr(ctx, 32, top, 64, 152 - top, 10);
  bricks(ctx, 32, top, 96, 152, 0x9fb6c9);
  rr(ctx, 32, top, 64, 152 - top, 10);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // снег
  ell(ctx, 64, top + 2, 34, 9);
  paint(ctx, 0xffffff, 3.5, { flat: true });
  // кристаллы
  const spires = [
    [64, 0, 15, 1],
    [42, 22, 9, 0.6],
    [86, 22, 9, 0.6],
    [52, 14, 8, 0.75],
    [76, 14, 8, 0.75],
  ].slice(0, 1 + lvl);
  spires
    .slice()
    .reverse()
    .forEach(([x, dy, w, k]) => {
      const h = (52 + lvl * 8) * k;
      poly(ctx, [[x - w, top + 4], [x - w * 0.8, top - h * 0.6 + dy], [x, top - h + dy], [x + w * 0.8, top - h * 0.6 + dy], [x + w, top + 4]]);
      paint(ctx, col, 3.5, { box: [0, top - h, 0, top] });
      line(ctx, [[x - w * 0.3, top - 2], [x - w * 0.2, top - h * 0.7 + dy]], 0xffffff, 3);
    });
  if (lvl >= 4) goldTrim(ctx, 30, 98, top + 26);
}

function ballistaBase(ctx, lvl) {
  foundation(ctx, lvl);
  const top = 112 - lvl * 4;
  rr(ctx, 28, top, 72, 152 - top, 6);
  paint(ctx, STONE, 4, { box: [0, top, 0, 152] });
  rr(ctx, 28, top, 72, 152 - top, 6);
  bricks(ctx, 28, top, 100, 152, STONE);
  rr(ctx, 28, top, 72, 152 - top, 6);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  rr(ctx, 22, top - 8, 84, 14, 4);
  paint(ctx, WOOD, 4, { box: [0, top - 8, 0, top + 6] });
  if (lvl >= 3) goldTrim(ctx, 22, 106, top + 18);
}

function ballistaHead(ctx, lvl) {
  // ложе вправо, ось в (64,64)
  rr(ctx, 30, 58, 64, 12, 4);
  paint(ctx, 0x8b5a2b, 4, { box: [0, 58, 0, 70] });
  // плечи лука
  const span = 34 + lvl * 3;
  ctx.beginPath();
  ctx.moveTo(80, 64 - span);
  ctx.quadraticCurveTo(100, 64, 80, 64 + span);
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = css(lvl >= 4 ? 0xffc93c : 0x6b4a2a);
  ctx.stroke();
  // тетива
  line(ctx, [[80, 64 - span], [42, 64], [80, 64 + span]], 0xfff3d6, 2);
  // болт
  line(ctx, [[40, 64], [112, 64]], INK, 6);
  line(ctx, [[40, 64], [112, 64]], 0xd9b07a, 3);
  poly(ctx, [[110, 58], [124, 64], [110, 70]]);
  paint(ctx, 0xc7cdd6, 3, { flat: true });
  circ(ctx, 64, 64, 9);
  paint(ctx, 0x555a63, 3.5, { flat: true });
}

export function makeTowerTextures(scene) {
  for (let l = 1; l <= 4; l++) {
    addTex(scene, `tw_archer_${l}`, 128, 176, (ctx) => archer(ctx, l));
    addTex(scene, `tw_cannon_${l}`, 128, 176, (ctx) => cannonBase(ctx, l));
    addTex(scene, `tw_cannonhead_${l}`, 128, 128, (ctx) => cannonHead(ctx, l));
    addTex(scene, `tw_mage_${l}`, 128, 176, (ctx) => mage(ctx, l));
    addTex(scene, `tw_frost_${l}`, 128, 176, (ctx) => frost(ctx, l));
    addTex(scene, `tw_ballista_${l}`, 128, 176, (ctx) => ballistaBase(ctx, l));
    addTex(scene, `tw_ballistahead_${l}`, 128, 128, (ctx) => ballistaHead(ctx, l));
  }
  // волшебная сфера мага
  addTex(scene, 'orb', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(210,150,255,1)');
    g.addColorStop(0.55, 'rgba(155,93,229,0.6)');
    g.addColorStop(1, 'rgba(155,93,229,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  // постройка (леса)
  addTex(scene, 'plot', 128, 128, (ctx) => {
    ell(ctx, 64, 74, 46, 26);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    ell(ctx, 64, 70, 44, 24);
    paint(ctx, 0xc9a06a, 3.5, { flat: true });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ell(ctx, 64 + Math.cos(a) * 32, 70 + Math.sin(a) * 15, 7, 4);
      ctx.fillStyle = css(0x9a948c);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  });
}
