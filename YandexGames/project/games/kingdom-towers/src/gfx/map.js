// Отрисовка карты уровня в текстуру (в координатах экрана: портрет = транспонированная карта)
import { COLS, ROWS, REGIONS, regionOf, levelPaths, rng } from '../data.js';
import { INK, css, light, dark, ell, circ, poly, paint, line, canvas, rr } from '../art.js';

export const MCS = 80; // пикселей на клетку в текстуре

// Клетки уровня: путь, места под башни, декорации (логические координаты)
export function levelTiles(l) {
  const paths = levelPaths(l);
  const path = new Set();
  for (const p of paths) {
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1];
      const [x1, y1] = p[i];
      const dx = Math.sign(x1 - x0);
      const dy = Math.sign(y1 - y0);
      let x = x0;
      let y = y0;
      for (;;) {
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) path.add(x + ',' + y);
        if (x === x1 && y === y1) break;
        x += dx;
        y += dy;
      }
    }
  }
  const near = (x, y, d) => {
    for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) if (path.has(x + i + ',' + (y + j))) return true;
    return false;
  };
  const r = rng(l * 104729 + 7);
  const build = new Set();
  const deco = new Map();
  // клетки у входа/выхода оставляем свободными от построек (там ворота/пещера)
  const reserved = new Set();
  for (const p of paths) {
    for (const [a, b] of [[p[0], p[1]], [p[p.length - 1], p[p.length - 2]]]) {
      const dx = Math.sign(b[0] - a[0]);
      const dy = Math.sign(b[1] - a[1]);
      const cx = a[0] + dx;
      const cy = a[1] + dy;
      for (let i = -1; i <= 1; i++) reserved.add(dy === 0 ? cx + ',' + (cy + i) : cx + i + ',' + cy);
    }
  }
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const k = x + ',' + y;
      if (path.has(k)) continue;
      if (reserved.has(k)) continue;
      if (near(x, y, 2)) {
        if (!near(x, y, 1) && r() < 0.18) deco.set(k, r());
        else build.add(k);
      } else if (r() < 0.55) deco.set(k, r());
    }
  }
  return { paths, path, build, deco, reserved };
}

// ---------- декорации ----------
function tree(ctx, x, y, s, region) {
  ell(ctx, x, y + 2 * s, 22 * s, 7 * s);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();
  rr(ctx, x - 5 * s, y - 14 * s, 10 * s, 18 * s, 3 * s);
  paint(ctx, 0x7a4a24, 3 * s, { flat: true });
  const c = region.id === 'waste' ? 0xa7a03f : 0x4fae3b;
  [[-12, -22, 14], [12, -22, 14], [0, -34, 17], [0, -20, 15]].forEach(([dx, dy, r]) => {
    circ(ctx, x + dx * s, y + dy * s, r * s);
    paint(ctx, c, 3.2 * s, { box: [0, y - 50 * s, 0, y] });
  });
  [[-12, -22, 14], [12, -22, 14], [0, -34, 17], [0, -20, 15]].forEach(([dx, dy, r]) => {
    circ(ctx, x + dx * s, y + dy * s, r * s - 1.5 * s);
    ctx.fillStyle = css(c);
    ctx.fill();
  });
  circ(ctx, x - 6 * s, y - 40 * s, 5 * s);
  ctx.fillStyle = css(light(c, 0.35));
  ctx.fill();
}

function pine(ctx, x, y, s, snow) {
  ell(ctx, x, y + 2 * s, 18 * s, 6 * s);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();
  rr(ctx, x - 4 * s, y - 10 * s, 8 * s, 12 * s, 2 * s);
  paint(ctx, 0x6b4224, 3 * s, { flat: true });
  const c = 0x2f7d4a;
  for (let i = 0; i < 3; i++) {
    const w = (22 - i * 5) * s;
    const yy = y - 8 * s - i * 14 * s;
    poly(ctx, [[x - w, yy], [x, yy - 24 * s], [x + w, yy]]);
    paint(ctx, c, 3 * s, { box: [0, yy - 24 * s, 0, yy] });
    if (snow) {
      poly(ctx, [[x - w * 0.55, yy - 10 * s], [x, yy - 24 * s], [x + w * 0.55, yy - 10 * s], [x + w * 0.2, yy - 8 * s], [x - w * 0.2, yy - 9 * s]]);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  }
}

function rock(ctx, x, y, s, c = 0x9a948c) {
  ell(ctx, x, y + 2 * s, 18 * s, 6 * s);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 18 * s, y);
  ctx.quadraticCurveTo(x - 20 * s, y - 16 * s, x - 6 * s, y - 20 * s);
  ctx.quadraticCurveTo(x + 10 * s, y - 26 * s, x + 18 * s, y - 8 * s);
  ctx.quadraticCurveTo(x + 20 * s, y + 2 * s, x, y + 2 * s);
  ctx.closePath();
  paint(ctx, c, 3 * s, { box: [0, y - 26 * s, 0, y] });
  ell(ctx, x - 5 * s, y - 14 * s, 5 * s, 3 * s, -0.4);
  ctx.fillStyle = css(light(c, 0.35));
  ctx.fill();
}

function bush(ctx, x, y, s, c) {
  [[-8, 0, 9], [8, 0, 9], [0, -6, 10]].forEach(([dx, dy, r]) => {
    circ(ctx, x + dx * s, y + dy * s, r * s);
    paint(ctx, c, 2.5 * s, { flat: true });
  });
  [[-8, 0, 9], [8, 0, 9], [0, -6, 10]].forEach(([dx, dy, r]) => {
    circ(ctx, x + dx * s, y + dy * s, r * s - 1.2 * s);
    ctx.fillStyle = css(c);
    ctx.fill();
  });
}

function deadTree(ctx, x, y, s) {
  line(ctx, [[x, y], [x, y - 34 * s]], INK, 9 * s);
  line(ctx, [[x, y - 18 * s], [x - 14 * s, y - 32 * s]], INK, 7 * s);
  line(ctx, [[x, y - 24 * s], [x + 12 * s, y - 40 * s]], INK, 7 * s);
  line(ctx, [[x, y], [x, y - 34 * s]], 0x7a5a3a, 5 * s);
  line(ctx, [[x, y - 18 * s], [x - 14 * s, y - 32 * s]], 0x7a5a3a, 3.5 * s);
  line(ctx, [[x, y - 24 * s], [x + 12 * s, y - 40 * s]], 0x7a5a3a, 3.5 * s);
}

function flower(ctx, x, y, c) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    circ(ctx, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.6);
    ctx.fillStyle = css(c);
    ctx.fill();
  }
  circ(ctx, x, y, 2);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
}

// ---------- карта ----------
export function renderMap(scene, key, l, portrait) {
  const region = REGIONS[regionOf(l)];
  const tiles = levelTiles(l);
  const W = (portrait ? ROWS : COLS) * MCS;
  const H = (portrait ? COLS : ROWS) * MCS;
  const D = (x, y) => (portrait ? [y, x] : [x, y]);
  const [cv, ctx] = canvas(W, H);
  const r = rng(l * 31337 + (portrait ? 1 : 0));

  // земля
  ctx.fillStyle = css(region.grass);
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < (W * H) / 900; i++) {
    ell(ctx, r() * W, r() * H, 10 + r() * 40, 6 + r() * 22, r() * 3);
    ctx.fillStyle = css(r() < 0.5 ? region.grass2 : light(region.grass, 0.08), 0.5);
    ctx.fill();
  }
  // детали земли
  for (let i = 0; i < (W * H) / 2200; i++) {
    const x = r() * W;
    const y = r() * H;
    if (region.id === 'meadow' || region.id === 'forest') {
      line(ctx, [[x - 4, y], [x - 2, y - 7]], dark(region.grass, 0.18), 2);
      line(ctx, [[x, y], [x + 1, y - 9]], dark(region.grass, 0.18), 2);
      line(ctx, [[x + 4, y], [x + 4, y - 6]], dark(region.grass, 0.18), 2);
    } else if (region.id === 'waste') {
      line(ctx, [[x, y], [x + 8, y + 3], [x + 14, y - 2]], dark(region.grass, 0.2), 1.5);
    } else {
      circ(ctx, x, y, 1.5);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }
  }
  if (region.id === 'meadow') {
    for (let i = 0; i < (W * H) / 9000; i++) flower(ctx, r() * W, r() * H, [0xffffff, 0xff8ab3, 0xffd23f, 0x9fc5ff][(r() * 4) | 0]);
  }

  // дорога
  const C = (x, y) => {
    const [dx, dy] = D(x, y);
    return [(dx + 0.5) * MCS, (dy + 0.5) * MCS];
  };
  for (const pass of [0, 1, 2]) {
    for (const p of tiles.paths) {
      const pts = p.map(([x, y]) => C(x, y));
      line(ctx, pts, pass === 0 ? INK : pass === 1 ? region.pathEdge : region.path, pass === 0 ? MCS * 0.98 : pass === 1 ? MCS * 0.9 : MCS * 0.72);
    }
  }
  // камешки на дороге
  for (const k of tiles.path) {
    const [x, y] = k.split(',').map(Number);
    const [cx, cy] = C(x, y);
    for (let i = 0; i < 4; i++) {
      ell(ctx, cx + (r() - 0.5) * MCS * 0.6, cy + (r() - 0.5) * MCS * 0.6, 2 + r() * 3, 1.5 + r() * 2);
      ctx.fillStyle = css(region.pathEdge, 0.6);
      ctx.fill();
    }
  }

  // места под строительство
  for (const k of tiles.build) {
    const [x, y] = k.split(',').map(Number);
    const [cx, cy] = C(x, y);
    rr(ctx, cx - MCS * 0.42, cy - MCS * 0.42, MCS * 0.84, MCS * 0.84, MCS * 0.16);
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(40,25,10,0.16)';
    ctx.stroke();
  }

  // вход (пещера) и выход (замок)
  const ends = [];
  for (const p of tiles.paths) {
    const a = p[0];
    const b = p[1];
    const dx = Math.sign(b[0] - a[0]);
    const dy = Math.sign(b[1] - a[1]);
    ends.push({ kind: 'cave', x: a[0] + dx * 0.5, y: a[1] + dy * 0.5, dx, dy });
  }
  const last = tiles.paths[0];
  {
    const a = last[last.length - 1];
    const b = last[last.length - 2];
    const dx = Math.sign(a[0] - b[0]);
    const dy = Math.sign(a[1] - b[1]);
    ends.push({ kind: 'castle', x: a[0] - dx * 0.5, y: a[1] - dy * 0.5, dx, dy });
  }

  // декорации, сортировка по y
  const items = [];
  for (const [k, v] of tiles.deco) {
    const [x, y] = k.split(',').map(Number);
    const [cx, cy] = C(x, y);
    items.push([cx + (v - 0.5) * MCS * 0.3, cy + MCS * 0.32, v]);
  }
  items.sort((a, b) => a[1] - b[1]);
  for (const [x, y, v] of items) {
    const s = 0.85 + v * 0.35;
    if (region.id === 'meadow') v < 0.65 ? tree(ctx, x, y, s, region) : v < 0.85 ? bush(ctx, x, y - 6, s, 0x5cc451) : rock(ctx, x, y, s * 0.8);
    else if (region.id === 'forest') v < 0.75 ? pine(ctx, x, y, s, false) : v < 0.9 ? tree(ctx, x, y, s, region) : rock(ctx, x, y, s * 0.8, 0x8a8f86);
    else if (region.id === 'waste') v < 0.5 ? rock(ctx, x, y, s, 0xb07a4a) : v < 0.8 ? deadTree(ctx, x, y, s) : rock(ctx, x, y, s * 0.7, 0x8a6a4a);
    else v < 0.7 ? pine(ctx, x, y, s, true) : rock(ctx, x, y, s, 0xb9c8d6);
  }

  // пещеры и замок
  for (const e of ends) {
    const [ex, ey] = D(e.x, e.y);
    const px = (ex + 0.5) * MCS;
    const py = (ey + 0.5) * MCS;
    if (e.kind === 'cave') {
      ctx.save();
      ctx.translate(px, py);
      const [ddx, ddy] = D(e.dx, e.dy);
      ctx.rotate(Math.atan2(ddy, ddx) + Math.PI / 2);
      ctx.beginPath();
      ctx.arc(0, 0, MCS * 0.62, Math.PI, 0);
      ctx.closePath();
      paint(ctx, 0x6b625a, 4, { flat: true });
      ctx.beginPath();
      ctx.arc(0, 0, MCS * 0.42, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#1d140c';
      ctx.fill();
      [[-0.55, -0.1], [0.55, -0.12], [-0.3, -0.5], [0.3, -0.52]].forEach(([a, b]) => {
        circ(ctx, a * MCS, b * MCS, MCS * 0.13);
        paint(ctx, 0x8a8178, 3, { flat: true });
      });
      ctx.restore();
    } else {
      castle(ctx, px, py, D(e.dx, e.dy));
    }
  }

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, cv);
  return tiles;
}

function castle(ctx, x, y, [dx, dy]) {
  const s = MCS / 80;
  // сдвиг к краю
  x -= dx * MCS * 0.32;
  y -= dy * MCS * 0.32 - (dy === 0 ? MCS * 0.12 : 0);
  ctx.save();
  ctx.translate(x, y);
  const wall = 0xb8b0a4;
  rr(ctx, -46 * s, -40 * s, 92 * s, 56 * s, 4 * s);
  paint(ctx, wall, 4 * s, { box: [0, -40 * s, 0, 16 * s] });
  for (let i = 0; i < 5; i++) {
    rr(ctx, (-44 + i * 20) * s, -52 * s, 12 * s, 14 * s, 2 * s);
    paint(ctx, wall, 3 * s, { flat: true });
  }
  // ворота
  ctx.beginPath();
  ctx.moveTo(-16 * s, 16 * s);
  ctx.lineTo(-16 * s, -10 * s);
  ctx.arc(0, -10 * s, 16 * s, Math.PI, 0);
  ctx.lineTo(16 * s, 16 * s);
  ctx.closePath();
  paint(ctx, 0x6b4224, 4 * s, { flat: true });
  for (let i = -1; i <= 1; i++) line(ctx, [[i * 8 * s, -20 * s], [i * 8 * s, 14 * s]], INK, 2 * s);
  // башни
  [-46, 46].forEach((tx) => {
    rr(ctx, (tx - 14) * s, -64 * s, 28 * s, 82 * s, 4 * s);
    paint(ctx, light(wall, 0.05), 4 * s, { box: [0, -64 * s, 0, 18 * s] });
    poly(ctx, [[(tx - 18) * s, -62 * s], [(tx + 18) * s, -62 * s], [tx * s, -94 * s]]);
    paint(ctx, 0x3d6fd1, 4 * s, { box: [0, -94 * s, 0, -62 * s] });
    line(ctx, [[tx * s, -94 * s], [tx * s, -112 * s]], INK, 3 * s);
    poly(ctx, [[tx * s, -112 * s], [(tx + 16) * s, -106 * s], [tx * s, -100 * s]]);
    paint(ctx, 0xffc93c, 2.5 * s, { flat: true });
    rr(ctx, (tx - 4) * s, -40 * s, 8 * s, 14 * s, 4 * s);
    paint(ctx, 0x2b1a0e, 0, { flat: true });
  });
  ctx.restore();
}
