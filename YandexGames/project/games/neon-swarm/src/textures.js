// Процедурная неоновая графика: всё рисуется кодом на canvas
import { COLORS, ENEMIES, EVOLVE, HEROES, ARENAS, hex } from './data.js';
import { EVENT_ARENAS, EVENTS, SKINS } from './events.js';

export const TS = 2; // текстуры рисуются в 2x для чёткости

function make(scene, key, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  const ctx = c.getContext('2d');
  draw(ctx, c.width, c.height);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
}

const rgba = (c, a) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

function polyPath(ctx, cx, cy, r, n, rot = -Math.PI / 2, inner = 0) {
  ctx.beginPath();
  const pts = inner ? n * 2 : n;
  for (let i = 0; i < pts; i++) {
    const a = rot + (i / pts) * Math.PI * 2;
    const rr = inner && i % 2 ? inner : r;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function neonStroke(ctx, color, width, blur) {
  ctx.shadowColor = hex(color);
  ctx.shadowBlur = blur;
  ctx.strokeStyle = hex(color);
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.shadowBlur = blur / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = width * 0.4;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function shapePath(ctx, shape, cx, cy, r) {
  switch (shape) {
    case 'tri':
      polyPath(ctx, cx, cy, r, 3, -Math.PI / 2);
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.62, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.62, cy);
      ctx.closePath();
      break;
    case 'hex':
      polyPath(ctx, cx, cy, r, 6, 0);
      break;
    case 'square':
      polyPath(ctx, cx, cy, r, 4, Math.PI / 4);
      break;
    case 'pent':
      polyPath(ctx, cx, cy, r, 5);
      break;
    case 'arrow':
      // наконечник, смотрит вправо (по направлению рывка)
      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      ctx.lineTo(cx - r * 0.8, cy - r * 0.8);
      ctx.lineTo(cx - r * 0.35, cy);
      ctx.lineTo(cx - r * 0.8, cy + r * 0.8);
      ctx.closePath();
      break;
    case 'spike':
      polyPath(ctx, cx, cy, r, 8, -Math.PI / 2, r * 0.62);
      break;
    case 'cross': {
      const a = r * 0.36;
      ctx.beginPath();
      ctx.moveTo(cx - a, cy - r);
      ctx.lineTo(cx + a, cy - r);
      ctx.lineTo(cx + a, cy - a);
      ctx.lineTo(cx + r, cy - a);
      ctx.lineTo(cx + r, cy + a);
      ctx.lineTo(cx + a, cy + a);
      ctx.lineTo(cx + a, cy + r);
      ctx.lineTo(cx - a, cy + r);
      ctx.lineTo(cx - a, cy + a);
      ctx.lineTo(cx - r, cy + a);
      ctx.lineTo(cx - r, cy - a);
      ctx.lineTo(cx - a, cy - a);
      ctx.closePath();
      break;
    }
    case 'oct':
      polyPath(ctx, cx, cy, r, 8, Math.PI / 8);
      break;
    case 'kite':
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.8, cy - r * 0.15);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.8, cy - r * 0.15);
      ctx.closePath();
      break;
    case 'serpent':
      // голова змея смотрит вправо
      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      ctx.quadraticCurveTo(cx + r * 0.4, cy - r * 0.95, cx - r * 0.7, cy - r * 0.7);
      ctx.quadraticCurveTo(cx - r * 1.05, cy, cx - r * 0.7, cy + r * 0.7);
      ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.95, cx + r, cy);
      ctx.closePath();
      break;
    case 'mirror':
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.75, cy - r * 0.25);
      ctx.lineTo(cx + r * 0.75, cy + r * 0.25);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.75, cy + r * 0.25);
      ctx.lineTo(cx - r * 0.75, cy - r * 0.25);
      ctx.closePath();
      break;
    case 'star':
      polyPath(ctx, cx, cy, r, 6, -Math.PI / 2, r * 0.55);
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.82, cy - r * 0.8);
      ctx.lineTo(cx + r * 0.82, cy - r * 0.8);
      ctx.lineTo(cx + r * 0.82, cy - r * 0.05);
      ctx.quadraticCurveTo(cx + r * 0.75, cy + r * 0.65, cx, cy + r);
      ctx.quadraticCurveTo(cx - r * 0.75, cy + r * 0.65, cx - r * 0.82, cy - r * 0.05);
      ctx.closePath();
      break;
    case 'heart':
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.9);
      ctx.bezierCurveTo(cx - r * 1.35, cy - r * 0.05, cx - r * 0.65, cy - r * 1.15, cx, cy - r * 0.42);
      ctx.bezierCurveTo(cx + r * 0.65, cy - r * 1.15, cx + r * 1.35, cy - r * 0.05, cx, cy + r * 0.9);
      ctx.closePath();
      break;
    case 'gear':
      polyPath(ctx, cx, cy, r, 10, 0, r * 0.8);
      break;
    default:
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
}

export function makeTextures(scene) {
  // мягкое свечение
  make(scene, 'glow', 128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  make(scene, 'spark', 16, 16, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  make(scene, 'pixel', 4, 4, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 4, 4);
  });

  // игрок
  make(scene, 'player', 56 * TS, 56 * TS, (ctx, w) => {
    const c = w / 2;
    ctx.scale(TS, TS);
    const cc = c / TS;
    const g = ctx.createRadialGradient(cc, cc, 0, cc, cc, 28);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, rgba(COLORS.cyan, 0.9));
    g.addColorStop(0.55, rgba(COLORS.cyan, 0.25));
    g.addColorStop(1, rgba(COLORS.cyan, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 56, 56);
    ctx.beginPath();
    ctx.arc(cc, cc, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = hex(COLORS.cyan);
    ctx.shadowBlur = 10;
    ctx.fill();
  });
  make(scene, 'playerRing', 64 * TS, 64 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    ctx.arc(32, 32, 20, 0.2, Math.PI - 0.2);
    neonStroke(ctx, COLORS.cyan, 2.5, 8);
    ctx.beginPath();
    ctx.arc(32, 32, 20, Math.PI + 0.2, Math.PI * 2 - 0.2);
    neonStroke(ctx, COLORS.cyan, 2.5, 8);
  });

  // враги
  for (const [id, e] of Object.entries(ENEMIES)) {
    const pad = 12;
    const size = (e.r + pad) * 2;
    make(scene, 'e_' + id, size * TS, size * TS, (ctx) => {
      ctx.scale(TS, TS);
      const c = size / 2;
      shapePath(ctx, e.shape, c, c, e.r);
      ctx.fillStyle = rgba(e.color, 0.16);
      ctx.fill();
      neonStroke(ctx, e.color, 3, 12);
      shapePath(ctx, e.shape, c, c, e.r * 0.55);
      ctx.strokeStyle = rgba(e.color, 0.55);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c, c, Math.max(2.5, e.r * 0.14), 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = hex(e.color);
      ctx.shadowBlur = 8;
      ctx.fill();
    });
  }

  // сегмент хвоста Змея
  make(scene, 'e_seg', 44 * TS, 44 * TS, (ctx) => {
    ctx.scale(TS, TS);
    polyPath(ctx, 22, 22, 15, 6, 0);
    ctx.fillStyle = rgba(COLORS.green, 0.18);
    ctx.fill();
    neonStroke(ctx, COLORS.green, 2.5, 10);
    ctx.beginPath();
    ctx.arc(22, 22, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  // колонна арены (белая, красится тинтом)
  make(scene, 'pillar', 120 * TS, 120 * TS, (ctx) => {
    ctx.scale(TS, TS);
    polyPath(ctx, 60, 60, 46, 6, Math.PI / 6);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();
    neonStroke(ctx, 0xffffff, 3, 14);
    polyPath(ctx, 60, 60, 30, 6, Math.PI / 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    polyPath(ctx, 60, 60, 12, 6, Math.PI / 6);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
  });

  makeEventTextures(scene);

  // снаряды
  make(scene, 'bolt', 34 * TS, 14 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.shadowColor = hex(COLORS.cyan);
    ctx.shadowBlur = 8;
    ctx.fillStyle = hex(COLORS.cyan);
    ctx.beginPath();
    ctx.ellipse(17, 7, 13, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(19, 7, 8, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  make(scene, 'ebullet', 22 * TS, 22 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.shadowColor = hex(COLORS.red);
    ctx.shadowBlur = 8;
    ctx.fillStyle = hex(COLORS.red);
    ctx.beginPath();
    ctx.arc(11, 11, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(11, 11, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
  make(scene, 'orb', 40 * TS, 40 * TS, (ctx) => {
    ctx.scale(TS, TS);
    const g = ctx.createRadialGradient(20, 20, 0, 20, 20, 20);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.35, hex(COLORS.pink));
    g.addColorStop(0.6, rgba(COLORS.pink, 0.3));
    g.addColorStop(1, rgba(COLORS.pink, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 40, 40);
  });
  // неоновый диск-пила
  make(scene, 'saw', 44 * TS, 44 * TS, (ctx) => {
    ctx.scale(TS, TS);
    polyPath(ctx, 22, 22, 18, 8, 0, 12);
    ctx.fillStyle = rgba(COLORS.green, 0.25);
    ctx.fill();
    neonStroke(ctx, COLORS.green, 2.5, 10);
    ctx.beginPath();
    ctx.arc(22, 22, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = hex(COLORS.green);
    ctx.shadowBlur = 10;
    ctx.fill();
  });
  // боевой дрон-спутник
  make(scene, 'drone', 32 * TS, 32 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(28, 16);
    ctx.lineTo(16, 28);
    ctx.lineTo(4, 16);
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.blue, 0.3);
    ctx.fill();
    neonStroke(ctx, COLORS.blue, 2.5, 10);
    ctx.beginPath();
    ctx.arc(16, 16, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  make(scene, 'missile', 30 * TS, 16 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    ctx.moveTo(27, 8);
    ctx.lineTo(9, 2);
    ctx.lineTo(12, 8);
    ctx.lineTo(9, 14);
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.orange, 0.5);
    ctx.fill();
    neonStroke(ctx, COLORS.orange, 2, 8);
  });
  make(scene, 'ring', 256, 256, (ctx) => {
    ctx.beginPath();
    ctx.arc(128, 128, 116, 0, Math.PI * 2);
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 7;
    ctx.stroke();
    const g = ctx.createRadialGradient(128, 128, 60, 128, 128, 120);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.18)');
    ctx.fillStyle = g;
    ctx.fill();
  });

  // опыт
  const gems = [
    ['gem1', COLORS.cyan, 7],
    ['gem2', COLORS.green, 9],
    ['gem3', COLORS.pink, 11],
  ];
  for (const [key, col, r] of gems) {
    const s = (r + 8) * 2;
    make(scene, key, s * TS, s * TS, (ctx) => {
      ctx.scale(TS, TS);
      shapePath(ctx, 'diamond', s / 2, s / 2, r);
      ctx.fillStyle = rgba(col, 0.55);
      ctx.fill();
      neonStroke(ctx, col, 2, 8);
    });
  }

  // предметы
  make(scene, 'heal', 36 * TS, 36 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    const r = (x, y, w, h) => ctx.rect(x, y, w, h);
    r(14, 7, 8, 22);
    r(7, 14, 22, 8);
    ctx.fillStyle = rgba(COLORS.green, 0.5);
    ctx.fill();
    neonStroke(ctx, COLORS.green, 2, 10);
  });
  make(scene, 'magnetItem', 36 * TS, 36 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    ctx.arc(18, 16, 9, Math.PI, 0);
    ctx.lineTo(27, 27);
    ctx.moveTo(9, 16);
    ctx.lineTo(9, 27);
    neonStroke(ctx, COLORS.blue, 4, 10);
  });
  make(scene, 'chest', 44 * TS, 44 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    ctx.rect(8, 14, 28, 20);
    ctx.fillStyle = rgba(COLORS.yellow, 0.3);
    ctx.fill();
    neonStroke(ctx, COLORS.yellow, 2.5, 12);
    ctx.beginPath();
    ctx.moveTo(8, 21);
    ctx.lineTo(36, 21);
    ctx.moveTo(22, 14);
    ctx.lineTo(22, 34);
    neonStroke(ctx, COLORS.yellow, 1.5, 6);
  });

  // фон
  make(scene, 'grid', 160, 160, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(160, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 160);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 0);
    ctx.lineTo(80, 160);
    ctx.moveTo(0, 80);
    ctx.lineTo(160, 80);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0, 0, 3, 3);
  });
  make(scene, 'stars', 512, 512, (ctx) => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      const a = 0.15 + rnd() * 0.5;
      ctx.fillStyle = `rgba(${150 + rnd() * 100},${150 + rnd() * 80},255,${a})`;
      const s = rnd() < 0.85 ? 1.5 : 2.5;
      ctx.fillRect(rnd() * 512, rnd() * 512, s, s);
    }
  });

  // джойстик
  make(scene, 'joyBase', 160, 160, (ctx) => {
    ctx.beginPath();
    ctx.arc(80, 80, 66, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(49,246,255,0.06)';
    ctx.fill();
    neonStroke(ctx, COLORS.cyan, 3, 10);
  });
  make(scene, 'joyKnob', 80, 80, (ctx) => {
    ctx.beginPath();
    ctx.arc(40, 40, 24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(49,246,255,0.35)';
    ctx.fill();
    neonStroke(ctx, COLORS.cyan, 3, 10);
  });

  makeIcons(scene);
  makeExtraIcons(scene);
}

// Иконки улучшений 96x96
function makeIcons(scene) {
  const S = 96;
  const icon = (key, color, draw) =>
    make(scene, 'ic_' + key, S, S, (ctx) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.save();
      draw(ctx);
      ctx.restore();
      ctx._c = color;
    });
  const st = (ctx, c, w = 5) => neonStroke(ctx, c, w, 12);

  icon('blaster', COLORS.cyan, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(18, 48);
    ctx.lineTo(62, 48);
    ctx.moveTo(48, 32);
    ctx.lineTo(74, 48);
    ctx.lineTo(48, 64);
    st(ctx, COLORS.cyan);
    ctx.beginPath();
    ctx.moveTo(18, 34);
    ctx.lineTo(34, 34);
    ctx.moveTo(18, 62);
    ctx.lineTo(34, 62);
    st(ctx, COLORS.cyan, 3);
  });
  icon('orbit', COLORS.pink, (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 26, 0, Math.PI * 2);
    st(ctx, COLORS.pink, 3);
    [0, 2.1, 4.2].forEach((a) => {
      ctx.beginPath();
      ctx.arc(48 + Math.cos(a) * 26, 48 + Math.sin(a) * 26, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = hex(COLORS.pink);
      ctx.shadowBlur = 12;
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(48, 48, 6, 0, Math.PI * 2);
    st(ctx, COLORS.pink, 3);
  });
  icon('nova', COLORS.purple, (ctx) => {
    [12, 24, 36].forEach((r) => {
      ctx.beginPath();
      ctx.arc(48, 48, r, 0, Math.PI * 2);
      st(ctx, COLORS.purple, r === 36 ? 5 : 3);
    });
  });
  icon('lightning', COLORS.yellow, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(56, 12);
    ctx.lineTo(30, 52);
    ctx.lineTo(50, 52);
    ctx.lineTo(38, 84);
    ctx.lineTo(68, 40);
    ctx.lineTo(48, 40);
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.yellow, 0.3);
    ctx.fill();
    st(ctx, COLORS.yellow, 4);
  });
  icon('missile', COLORS.orange, (ctx) => {
    ctx.translate(48, 48);
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(10, -10);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-30, -20);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-30, 20);
    ctx.lineTo(-20, 10);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.orange, 0.3);
    ctx.fill();
    st(ctx, COLORS.orange, 4);
  });
  const heart = (ctx) => {
    ctx.beginPath();
    ctx.moveTo(48, 78);
    ctx.bezierCurveTo(10, 52, 14, 18, 36, 20);
    ctx.bezierCurveTo(44, 21, 48, 28, 48, 32);
    ctx.bezierCurveTo(48, 28, 52, 21, 60, 20);
    ctx.bezierCurveTo(82, 18, 86, 52, 48, 78);
    ctx.closePath();
  };
  icon('vitality', COLORS.red, (ctx) => {
    heart(ctx);
    ctx.fillStyle = rgba(COLORS.red, 0.3);
    ctx.fill();
    st(ctx, COLORS.red, 4);
  });
  icon('regen', COLORS.green, (ctx) => {
    ctx.beginPath();
    ctx.rect(40, 18, 16, 60);
    ctx.rect(18, 40, 60, 16);
    ctx.fillStyle = rgba(COLORS.green, 0.3);
    ctx.fill();
    st(ctx, COLORS.green, 4);
  });
  icon('swift', COLORS.cyan, (ctx) => {
    [22, 44].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x + 24, 48);
      ctx.lineTo(x, 72);
      st(ctx, COLORS.cyan, 6);
    });
  });
  icon('magnet', COLORS.blue, (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 46, 22, Math.PI, 0);
    ctx.lineTo(70, 76);
    ctx.moveTo(26, 46);
    ctx.lineTo(26, 76);
    st(ctx, COLORS.blue, 8);
  });
  icon('power', COLORS.orange, (ctx) => {
    polyPath(ctx, 48, 48, 36, 8, -Math.PI / 2, 16);
    ctx.fillStyle = rgba(COLORS.orange, 0.3);
    ctx.fill();
    st(ctx, COLORS.orange, 4);
  });
  icon('haste', COLORS.yellow, (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 50, 30, 0, Math.PI * 2);
    st(ctx, COLORS.yellow, 4);
    ctx.beginPath();
    ctx.moveTo(48, 50);
    ctx.lineTo(48, 30);
    ctx.moveTo(48, 50);
    ctx.lineTo(62, 58);
    ctx.moveTo(40, 12);
    ctx.lineTo(56, 12);
    st(ctx, COLORS.yellow, 4);
  });
  icon('area', COLORS.purple, (ctx) => {
    ctx.beginPath();
    const arr = (x1, y1, x2, y2, ax, ay) => {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.moveTo(x2 + ax, y2);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y2 + ay);
    };
    arr(40, 40, 18, 18, 14, 14);
    arr(56, 40, 78, 18, -14, 14);
    arr(40, 56, 18, 78, 14, -14);
    arr(56, 56, 78, 78, -14, -14);
    st(ctx, COLORS.purple, 5);
  });
  icon('armor', 0x9aa7c7, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(48, 14);
    ctx.lineTo(76, 24);
    ctx.quadraticCurveTo(76, 66, 48, 82);
    ctx.quadraticCurveTo(20, 66, 20, 24);
    ctx.closePath();
    ctx.fillStyle = rgba(0x9aa7c7, 0.25);
    ctx.fill();
    st(ctx, 0x9aa7c7, 4);
  });
  icon('wisdom', COLORS.green, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(12, 48);
    ctx.quadraticCurveTo(48, 12, 84, 48);
    ctx.quadraticCurveTo(48, 84, 12, 48);
    st(ctx, COLORS.green, 4);
    ctx.beginPath();
    ctx.arc(48, 48, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = hex(COLORS.green);
    ctx.shadowBlur = 12;
    ctx.fill();
  });
  icon('laser', COLORS.red, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(14, 70);
    ctx.lineTo(82, 26);
    st(ctx, COLORS.red, 9);
    ctx.beginPath();
    ctx.moveTo(14, 70);
    ctx.lineTo(82, 26);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(16, 70, 8, 0, Math.PI * 2);
    st(ctx, COLORS.red, 3);
  });
  icon('saw', COLORS.green, (ctx) => {
    polyPath(ctx, 48, 48, 34, 8, 0, 22);
    ctx.fillStyle = rgba(COLORS.green, 0.25);
    ctx.fill();
    st(ctx, COLORS.green, 4);
    ctx.beginPath();
    ctx.arc(48, 48, 8, 0, Math.PI * 2);
    st(ctx, COLORS.green, 3);
  });
  icon('drone', COLORS.blue, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(48, 18);
    ctx.lineTo(72, 48);
    ctx.lineTo(48, 78);
    ctx.lineTo(24, 48);
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.blue, 0.25);
    ctx.fill();
    st(ctx, COLORS.blue, 4);
    ctx.beginPath();
    ctx.moveTo(72, 48);
    ctx.lineTo(90, 48);
    ctx.moveTo(84, 40);
    ctx.lineTo(92, 48);
    ctx.lineTo(84, 56);
    st(ctx, COLORS.blue, 3);
  });
  icon('multishot', COLORS.cyan, (ctx) => {
    [-18, 0, 18].forEach((dy) => {
      ctx.beginPath();
      ctx.moveTo(16, 48 + dy);
      ctx.lineTo(66, 48 + dy * 1.4);
      ctx.moveTo(56, 40 + dy * 1.3);
      ctx.lineTo(68, 48 + dy * 1.4);
      ctx.lineTo(56, 56 + dy * 1.5);
      st(ctx, COLORS.cyan, 4);
    });
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('+1', 62, 30);
  });
  icon('crit', COLORS.yellow, (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 30, 0, Math.PI * 2);
    st(ctx, COLORS.yellow, 4);
    ctx.beginPath();
    ctx.arc(48, 48, 14, 0, Math.PI * 2);
    st(ctx, COLORS.yellow, 3);
    ctx.beginPath();
    ctx.moveTo(48, 6);
    ctx.lineTo(48, 26);
    ctx.moveTo(48, 70);
    ctx.lineTo(48, 90);
    ctx.moveTo(6, 48);
    ctx.lineTo(26, 48);
    ctx.moveTo(70, 48);
    ctx.lineTo(90, 48);
    st(ctx, COLORS.yellow, 4);
  });
  icon('pierce', COLORS.purple, (ctx) => {
    [30, 58].forEach((x) => {
      ctx.beginPath();
      ctx.rect(x - 6, 26, 12, 44);
      ctx.fillStyle = rgba(COLORS.purple, 0.25);
      ctx.fill();
      st(ctx, COLORS.purple, 3);
    });
    ctx.beginPath();
    ctx.moveTo(10, 48);
    ctx.lineTo(84, 48);
    ctx.moveTo(72, 38);
    ctx.lineTo(86, 48);
    ctx.lineTo(72, 58);
    st(ctx, COLORS.cyan, 5);
  });
  icon('crystal', COLORS.purple, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(48, 12);
    ctx.lineTo(74, 38);
    ctx.lineTo(48, 84);
    ctx.lineTo(22, 38);
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.purple, 0.45);
    ctx.fill();
    st(ctx, COLORS.purple, 4);
    ctx.beginPath();
    ctx.moveTo(22, 38);
    ctx.lineTo(74, 38);
    ctx.moveTo(48, 12);
    ctx.lineTo(40, 38);
    ctx.lineTo(48, 84);
    ctx.lineTo(56, 38);
    ctx.lineTo(48, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  icon('reroll', COLORS.cyan, (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 26, -0.3, Math.PI - 0.5);
    st(ctx, COLORS.cyan, 5);
    ctx.beginPath();
    ctx.arc(48, 48, 26, Math.PI - 0.3, Math.PI * 2 - 0.5);
    st(ctx, COLORS.cyan, 5);
    ctx.beginPath();
    ctx.moveTo(74, 34);
    ctx.lineTo(74, 46);
    ctx.lineTo(62, 44);
    ctx.moveTo(22, 62);
    ctx.lineTo(22, 50);
    ctx.lineTo(34, 52);
    st(ctx, COLORS.cyan, 5);
  });
  icon('revive', COLORS.pink, (ctx) => {
    heart(ctx);
    st(ctx, COLORS.pink, 4);
    ctx.beginPath();
    ctx.moveTo(48, 36);
    ctx.lineTo(48, 62);
    ctx.moveTo(35, 49);
    ctx.lineTo(61, 49);
    st(ctx, COLORS.pink, 4);
  });
  icon('ad', COLORS.yellow, (ctx) => {
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
  icon('pause', COLORS.cyan, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(36, 26);
    ctx.lineTo(36, 70);
    ctx.moveTo(60, 26);
    ctx.lineTo(60, 70);
    st(ctx, COLORS.cyan, 9);
  });
  icon('music', COLORS.cyan, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(38, 66);
    ctx.lineTo(38, 22);
    ctx.lineTo(70, 16);
    ctx.lineTo(70, 60);
    st(ctx, COLORS.cyan, 4);
    [
      [30, 68],
      [62, 62],
    ].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, 9, 7, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = hex(COLORS.cyan);
      ctx.shadowColor = hex(COLORS.cyan);
      ctx.shadowBlur = 10;
      ctx.fill();
    });
  });
  icon('sound', COLORS.cyan, (ctx) => {
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
  icon('trophy', COLORS.yellow, (ctx) => {
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
  icon('skull', COLORS.pink, (ctx) => {
    polyPath(ctx, 48, 50, 30, 3, -Math.PI / 2);
    st(ctx, COLORS.pink, 4);
    ctx.beginPath();
    ctx.arc(48, 56, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  icon('clock', COLORS.cyan, (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 30, 0, Math.PI * 2);
    ctx.moveTo(48, 48);
    ctx.lineTo(48, 28);
    ctx.moveTo(48, 48);
    ctx.lineTo(62, 56);
    st(ctx, COLORS.cyan, 4);
  });
  icon('close', COLORS.cyan, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(28, 28);
    ctx.lineTo(68, 68);
    ctx.moveTo(68, 28);
    ctx.lineTo(28, 68);
    st(ctx, COLORS.cyan, 7);
  });
}

// Иконки меты: эволюции, герои, арены, меню
function makeExtraIcons(scene) {
  const S = 96;
  const st = (ctx, c, w = 5) => neonStroke(ctx, c, w, 12);
  const icon = (key, draw) =>
    make(scene, 'ic_' + key, S, S, (ctx) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      draw(ctx);
    });
  const star = (ctx, x, y, r, inner = 0.45) => polyPath(ctx, x, y, r, 5, -Math.PI / 2, r * inner);

  // эволюция: иконка оружия в золотом венце со звездой
  for (const [w, ev] of Object.entries(EVOLVE)) {
    const src = scene.textures.get('ic_' + w).getSourceImage();
    icon(ev.id, (ctx) => {
      ctx.beginPath();
      ctx.arc(48, 48, 42, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ev.color, 0.16);
      ctx.fill();
      st(ctx, ev.color, 3);
      ctx.drawImage(src, 14, 16, 68, 68);
      star(ctx, 76, 20, 13);
      ctx.fillStyle = hex(COLORS.yellow);
      ctx.shadowColor = hex(COLORS.yellow);
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }
  icon('evo', (ctx) => {
    star(ctx, 48, 50, 34);
    ctx.fillStyle = rgba(COLORS.yellow, 0.25);
    ctx.fill();
    st(ctx, COLORS.yellow, 4);
    ctx.beginPath();
    ctx.moveTo(48, 70);
    ctx.lineTo(48, 40);
    ctx.moveTo(36, 50);
    ctx.lineTo(48, 38);
    ctx.lineTo(60, 50);
    st(ctx, COLORS.white, 3);
  });
  // герои: ядро в кольце своего цвета с символом оружия
  for (const h of HEROES) {
    const src = scene.textures.get('ic_' + h.weapon).getSourceImage();
    icon(h.id, (ctx) => {
      const g = ctx.createRadialGradient(48, 48, 0, 48, 48, 44);
      g.addColorStop(0, rgba(h.color, 0.35));
      g.addColorStop(1, rgba(h.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      ctx.beginPath();
      ctx.arc(48, 48, 40, 0.3, Math.PI - 0.3);
      st(ctx, h.color, 4);
      ctx.beginPath();
      ctx.arc(48, 48, 40, Math.PI + 0.3, Math.PI * 2 - 0.3);
      st(ctx, h.color, 4);
      ctx.beginPath();
      ctx.arc(48, 48, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = hex(h.color);
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(src, 56, 56, 36, 36);
    });
  }
  icon('hero', (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 30, 0.3, Math.PI - 0.3);
    st(ctx, COLORS.cyan, 4);
    ctx.beginPath();
    ctx.arc(48, 48, 30, Math.PI + 0.3, Math.PI * 2 - 0.3);
    st(ctx, COLORS.cyan, 4);
    ctx.beginPath();
    ctx.arc(48, 48, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  // арены: кусочек сетки своего цвета с колонной
  for (const a of [...ARENAS, ...EVENT_ARENAS]) {
    icon(a.id, (ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(48, 48, 42, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = hex(a.bg);
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = rgba(a.grid, 0.6);
      ctx.lineWidth = 2;
      for (let i = 0; i <= 96; i += 24) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 96);
        ctx.moveTo(0, i);
        ctx.lineTo(96, i);
        ctx.stroke();
      }
      ctx.restore();
      if (a.pillarTex) {
        ctx.drawImage(scene.textures.get(a.pillarTex).getSourceImage(), 38, 34, 42, 42);
      } else if (a.pillars) {
        polyPath(ctx, 58, 54, 16, 6, Math.PI / 6);
        st(ctx, a.pillarColor, 3);
      }
      // особое правило арены
      if (a.rule === 'wind') {
        ctx.beginPath();
        for (const [y, l] of [[28, 30], [50, 40], [70, 26]]) {
          ctx.moveTo(52 - l / 2, y);
          ctx.lineTo(52 + l / 2, y);
        }
        st(ctx, 0xffffff, 3);
      } else if (a.rule === 'dark') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(48, 48, 42, 0, Math.PI * 2);
        ctx.clip();
        const g = ctx.createRadialGradient(36, 40, 6, 36, 40, 40);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        ctx.restore();
      } else if (a.rule === 'shrink') {
        ctx.beginPath();
        ctx.arc(48, 48, 30, 0, Math.PI * 2);
        st(ctx, COLORS.red, 3);
      }
      ctx.beginPath();
      ctx.arc(36, 40, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = hex(COLORS.cyan);
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(48, 48, 42, 0, Math.PI * 2);
      st(ctx, a.grid, 3);
    });
  }
  icon('arena', (ctx) => {
    ctx.strokeStyle = hex(COLORS.purple);
    polyPath(ctx, 48, 48, 34, 4, Math.PI / 4);
    st(ctx, COLORS.purple, 4);
    ctx.beginPath();
    ctx.moveTo(48, 14);
    ctx.lineTo(48, 82);
    ctx.moveTo(14, 48);
    ctx.lineTo(82, 48);
    st(ctx, COLORS.purple, 2);
  });
  icon('star', (ctx) => {
    star(ctx, 48, 50, 36);
    ctx.fillStyle = rgba(COLORS.yellow, 0.6);
    ctx.fill();
    st(ctx, COLORS.yellow, 4);
  });
  icon('starOff', (ctx) => {
    star(ctx, 48, 50, 36);
    ctx.fillStyle = 'rgba(80,70,130,0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,130,190,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  icon('lock', (ctx) => {
    ctx.beginPath();
    ctx.rect(26, 44, 44, 34);
    st(ctx, 0x9aa7c7, 4);
    ctx.beginPath();
    ctx.arc(48, 44, 14, Math.PI, 0);
    st(ctx, 0x9aa7c7, 4);
    ctx.beginPath();
    ctx.arc(48, 60, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  icon('gear', (ctx) => {
    polyPath(ctx, 48, 48, 34, 8, 0, 26);
    st(ctx, COLORS.cyan, 4);
    ctx.beginPath();
    ctx.arc(48, 48, 11, 0, Math.PI * 2);
    st(ctx, COLORS.cyan, 4);
  });
  icon('calendar', (ctx) => {
    ctx.beginPath();
    ctx.rect(18, 24, 60, 54);
    ctx.moveTo(18, 40);
    ctx.lineTo(78, 40);
    ctx.moveTo(34, 16);
    ctx.lineTo(34, 30);
    ctx.moveTo(62, 16);
    ctx.lineTo(62, 30);
    st(ctx, COLORS.green, 4);
    star(ctx, 48, 60, 12);
    ctx.fillStyle = hex(COLORS.yellow);
    ctx.fill();
  });
  icon('gift', (ctx) => {
    ctx.beginPath();
    ctx.rect(20, 40, 56, 40);
    ctx.rect(16, 28, 64, 12);
    ctx.moveTo(48, 28);
    ctx.lineTo(48, 80);
    st(ctx, COLORS.pink, 4);
    ctx.beginPath();
    ctx.ellipse(38, 22, 10, 6, 0.4, 0, Math.PI * 2);
    ctx.ellipse(58, 22, 10, 6, -0.4, 0, Math.PI * 2);
    st(ctx, COLORS.yellow, 3);
  });
  icon('rush', (ctx) => {
    star(ctx, 34, 40, 22, 0.55);
    st(ctx, COLORS.red, 4);
    polyPath(ctx, 62, 60, 22, 6, 0);
    st(ctx, COLORS.yellow, 4);
  });
  icon('threat', (ctx) => {
    polyPath(ctx, 48, 52, 36, 3, -Math.PI / 2);
    ctx.fillStyle = rgba(COLORS.red, 0.25);
    ctx.fill();
    st(ctx, COLORS.red, 4);
    ctx.beginPath();
    ctx.moveTo(48, 38);
    ctx.lineTo(48, 58);
    st(ctx, COLORS.white, 5);
    ctx.beginPath();
    ctx.arc(48, 68, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  icon('calm', (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 30, 0, Math.PI * 2);
    st(ctx, COLORS.green, 4);
    ctx.beginPath();
    ctx.moveTo(30, 50);
    ctx.quadraticCurveTo(48, 70, 66, 50);
    st(ctx, COLORS.green, 4);
  });
  icon('normal', (ctx) => {
    polyPath(ctx, 48, 48, 32, 6, 0);
    st(ctx, COLORS.cyan, 4);
    ctx.beginPath();
    ctx.arc(48, 48, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
  icon('play', (ctx) => {
    polyPath(ctx, 52, 48, 30, 3, 0);
    ctx.fillStyle = rgba(COLORS.green, 0.35);
    ctx.fill();
    st(ctx, COLORS.green, 4);
  });
  icon('chest', (ctx) => {
    ctx.beginPath();
    ctx.rect(18, 34, 60, 42);
    ctx.fillStyle = rgba(COLORS.yellow, 0.25);
    ctx.fill();
    st(ctx, COLORS.yellow, 4);
    ctx.beginPath();
    ctx.moveTo(18, 50);
    ctx.lineTo(78, 50);
    ctx.moveTo(48, 34);
    ctx.lineTo(48, 76);
    st(ctx, COLORS.yellow, 3);
  });
  icon('quest', (ctx) => {
    ctx.beginPath();
    ctx.rect(24, 16, 48, 64);
    st(ctx, COLORS.cyan, 4);
    ctx.beginPath();
    ctx.moveTo(34, 36);
    ctx.lineTo(40, 42);
    ctx.lineTo(50, 30);
    ctx.moveTo(34, 58);
    ctx.lineTo(62, 58);
    st(ctx, COLORS.green, 3);
  });
  icon('arrowL', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(58, 22);
    ctx.lineTo(32, 48);
    ctx.lineTo(58, 74);
    st(ctx, COLORS.cyan, 7);
  });
  icon('arrowR', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(38, 22);
    ctx.lineTo(64, 48);
    ctx.lineTo(38, 74);
    st(ctx, COLORS.cyan, 7);
  });
  icon('check', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(24, 50);
    ctx.lineTo(42, 68);
    ctx.lineTo(74, 30);
    st(ctx, COLORS.green, 7);
  });
}

// Праздники: тьма с фонарём, жетоны, облики героя, колонны-тыквы, ёлки и планеты
function makeEventTextures(scene) {
  // темнота вокруг фонаря: прозрачная середина, тёмные края (масштабируется на всю видимую область)
  make(scene, 'darkMask', 1024, 1024, (ctx) => {
    const g = ctx.createRadialGradient(512, 512, 40, 512, 512, 112);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0.86)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);
  });
  // тыква
  make(scene, 'pumpkin', 120 * TS, 120 * TS, (ctx) => {
    ctx.scale(TS, TS);
    for (const [dx, rx] of [[-18, 22], [18, 22], [0, 26]]) {
      ctx.beginPath();
      ctx.ellipse(60 + dx, 64, rx, 36, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.orange, 0.1);
      ctx.fill();
      neonStroke(ctx, COLORS.orange, 3, 12);
    }
    ctx.beginPath();
    ctx.moveTo(60, 28);
    ctx.quadraticCurveTo(62, 16, 72, 12);
    neonStroke(ctx, COLORS.green, 4, 8);
    // лицо
    ctx.beginPath();
    polyPath(ctx, 48, 58, 7, 3, -Math.PI / 2);
    ctx.fillStyle = hex(COLORS.yellow);
    ctx.fill();
    polyPath(ctx, 72, 58, 7, 3, -Math.PI / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(44, 76);
    ctx.lineTo(52, 82);
    ctx.lineTo(60, 76);
    ctx.lineTo(68, 82);
    ctx.lineTo(76, 76);
    ctx.lineWidth = 3;
    ctx.strokeStyle = hex(COLORS.yellow);
    ctx.stroke();
  });
  // ёлка
  make(scene, 'tree', 120 * TS, 120 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    const pts = [[60, 10], [80, 40], [70, 40], [90, 70], [78, 70], [100, 100], [20, 100], [42, 70], [30, 70], [50, 40], [40, 40]];
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.green, 0.1);
    ctx.fill();
    neonStroke(ctx, COLORS.green, 3, 12);
    polyPath(ctx, 60, 12, 9, 5, -Math.PI / 2, 4);
    ctx.fillStyle = hex(COLORS.yellow);
    ctx.fill();
    for (const [x, y, c] of [[52, 52, COLORS.red], [70, 64, COLORS.cyan], [46, 84, COLORS.yellow], [76, 90, COLORS.pink]]) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = hex(c);
      ctx.fill();
    }
  });
  // планета с кольцом
  make(scene, 'planet', 120 * TS, 120 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    ctx.arc(60, 60, 34, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COLORS.purple, 0.12);
    ctx.fill();
    neonStroke(ctx, COLORS.purple, 3, 12);
    ctx.beginPath();
    ctx.ellipse(60, 60, 54, 14, -0.35, 0, Math.PI * 2);
    neonStroke(ctx, COLORS.yellow, 2.5, 8);
  });
  // праздничные жетоны
  make(scene, 'tok_pumpkin', 36 * TS, 36 * TS, (ctx) => {
    ctx.scale(TS, TS);
    for (const dx of [-5, 5, 0]) {
      ctx.beginPath();
      ctx.ellipse(18 + dx, 20, dx ? 7 : 8, 11, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.orange, 0.35);
      ctx.fill();
      neonStroke(ctx, COLORS.orange, 2, 8);
    }
    ctx.beginPath();
    ctx.moveTo(18, 9);
    ctx.lineTo(21, 4);
    neonStroke(ctx, COLORS.green, 2.5, 6);
  });
  make(scene, 'tok_snow', 36 * TS, 36 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.moveTo(18, 18);
      ctx.lineTo(18 + Math.cos(a) * 14, 18 + Math.sin(a) * 14);
      const bx = 18 + Math.cos(a) * 9;
      const by = 18 + Math.sin(a) * 9;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a + 0.8) * 5, by + Math.sin(a + 0.8) * 5);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a - 0.8) * 5, by + Math.sin(a - 0.8) * 5);
    }
    ctx.lineCap = 'round';
    neonStroke(ctx, 0x9ad8ff, 2.5, 8);
  });
  make(scene, 'tok_star', 36 * TS, 36 * TS, (ctx) => {
    ctx.scale(TS, TS);
    polyPath(ctx, 18, 19, 14, 5, -Math.PI / 2, 6);
    ctx.fillStyle = rgba(COLORS.yellow, 0.45);
    ctx.fill();
    neonStroke(ctx, COLORS.yellow, 2, 8);
  });
  // облики героя: заменяют кольцо вокруг ядра
  make(scene, 'ring_sk_pumpkin', 64 * TS, 64 * TS, (ctx) => {
    ctx.scale(TS, TS);
    for (const [dx, rx] of [[-8, 13], [8, 13], [0, 15]]) {
      ctx.beginPath();
      ctx.ellipse(32 + dx, 34, rx, 20, 0, 0, Math.PI * 2);
      neonStroke(ctx, COLORS.orange, 2.5, 8);
    }
    ctx.beginPath();
    ctx.moveTo(32, 14);
    ctx.quadraticCurveTo(33, 7, 39, 5);
    neonStroke(ctx, COLORS.green, 3, 6);
  });
  make(scene, 'ring_sk_snow', 64 * TS, 64 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x1 = 32 + Math.cos(a) * 14;
      const y1 = 32 + Math.sin(a) * 14;
      const x2 = 32 + Math.cos(a) * 27;
      const y2 = 32 + Math.sin(a) * 27;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      const bx = 32 + Math.cos(a) * 22;
      const by = 32 + Math.sin(a) * 22;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a + 0.9) * 6, by + Math.sin(a + 0.9) * 6);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a - 0.9) * 6, by + Math.sin(a - 0.9) * 6);
    }
    neonStroke(ctx, 0x9ad8ff, 2.5, 8);
  });
  make(scene, 'ring_sk_orbit', 64 * TS, 64 * TS, (ctx) => {
    ctx.scale(TS, TS);
    ctx.beginPath();
    ctx.ellipse(32, 32, 27, 11, 0, 0, Math.PI * 2);
    neonStroke(ctx, COLORS.blue, 2.5, 8);
    ctx.beginPath();
    ctx.ellipse(32, 32, 11, 27, 0, 0, Math.PI * 2);
    neonStroke(ctx, COLORS.purple, 2, 8);
    ctx.beginPath();
    ctx.arc(59, 32, 4, 0, Math.PI * 2);
    ctx.fillStyle = hex(COLORS.yellow);
    ctx.shadowColor = hex(COLORS.yellow);
    ctx.shadowBlur = 8;
    ctx.fill();
  });
  // иконки событий и обликов для меню (96x96)
  for (const ev of EVENTS) {
    make(scene, 'ic_ev_' + ev.id, 96, 96, (ctx) => {
      const src = scene.textures.get(ev.token).getSourceImage();
      ctx.drawImage(src, 8, 8, 80, 80);
    });
  }
  for (const id of Object.keys(SKINS)) {
    make(scene, 'ic_' + id, 96, 96, (ctx) => {
      const g = ctx.createRadialGradient(48, 48, 0, 48, 48, 44);
      g.addColorStop(0, rgba(SKINS[id].color, 0.35));
      g.addColorStop(1, rgba(SKINS[id].color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 96, 96);
      ctx.drawImage(scene.textures.get('ring_' + id).getSourceImage(), 4, 4, 88, 88);
      ctx.beginPath();
      ctx.arc(48, 48, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = hex(SKINS[id].color);
      ctx.shadowBlur = 14;
      ctx.fill();
    });
  }
}
