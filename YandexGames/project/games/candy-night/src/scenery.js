// Декорации уровня: земля (холст-текстура), дома по мирам, дворы, изгороди, скверы, котёл, окрестности, небо
import * as THREE from 'three';
import { ExtrudeGeometry, Shape } from 'three';
import { B, MAT, MAT_GLOW } from './gfx.js';
import { CS, WALK, SOLID, HEDGE, rng } from './map.js';
import { shade, INK, makeCauldron } from './models.js';

// треугольная призма для крыш: основание 1 по z, высота 1 по y, длина 1 по x
let PRISM = null;
function prismGeo() {
  if (!PRISM) {
    const s = new Shape();
    s.moveTo(-0.5, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0, 1);
    s.lineTo(-0.5, 0);
    const g = new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    g.rotateY(Math.PI / 2);
    g.deleteAttribute('uv');
    PRISM = g.toNonIndexed();
  }
  return PRISM;
}
B.prototype.prism = function (len, w, h, color, o = {}) {
  return this.add(prismGeo(), color, Object.assign({}, o, { sx: len * (o.sx ?? 1), sy: h * (o.sy ?? 1), sz: w * (o.sz ?? 1) }));
};

export const THEME = {
  lane: { bg: '#2a2148', fog: '#2a2148', hemi: ['#9a8ae8', '#3a2a4a', 1.45], moon: ['#cfd6ff', 1.25], road: ['#4f4766', '#575070', '#5e5678', '#4a4360'], grout: '#3b3550', curb: '#8a80a8', grass: ['#3e6b4c', '#36604a', '#467656'], blade: ['#5a8a5c', '#2f553f'], path: ['#9a8c7e', '#8c7f72'], leaf: ['#ff8a2a', '#e8602a', '#ffb43a', '#c94a2a'], plaza: ['#6a5f86', '#75699a', '#62587c'] },
  grave: { bg: '#1f2a3a', fog: '#22303e', hemi: ['#8ab0d8', '#2a3438', 1.4], moon: ['#d6e6ff', 1.2], road: ['#6a5846', '#62513f', '#715e4a', '#5c4c3c'], grout: '#4a3d30', curb: '#7a6a58', grass: ['#2f5236', '#2a4a32', '#355a3c'], blade: ['#4a7a4a', '#22402a'], path: ['#7a7a8a', '#6a6a7c'], leaf: ['#c9a24a', '#8a6a3a', '#a8823a'], plaza: ['#5a5c6c', '#64667a', '#50525f'] },
  forest: { bg: '#18303a', fog: '#1c3640', hemi: ['#7ad0c8', '#1f2a2a', 1.4], moon: ['#d0fff4', 1.15], road: ['#9a8158', '#a68c63', '#8d764e', '#b09868'], grout: '#6a563a', curb: '#6a7a46', grass: ['#20423a', '#1b3832', '#264c42'], blade: ['#3a6e52', '#16302a'], path: ['#8a7456', '#7c684c'], leaf: ['#ff8a2a', '#ffcf4a', '#d84a3a', '#9be15d'], plaza: ['#6a6450', '#746c56', '#5e5846'] },
  castle: { bg: '#24183a', fog: '#2a1c40', hemi: ['#c09aff', '#2a2038', 1.45], moon: ['#f0d8ff', 1.2], road: ['#5f5a70', '#68637a', '#57526a', '#6e6880'], grout: '#3d3850', curb: '#8a84a0', grass: ['#3a4f4a', '#344640', '#405650'], blade: ['#557a64', '#283a34'], path: ['#7a7488', '#6c667a'], leaf: ['#c58bff', '#ff8a2a', '#8a5ac8'], plaza: ['#5a4f72', '#65597e', '#524868'] },
};

const WALLS = ['#9fd3c7', '#c9a7e8', '#ffc9a3', '#f7e08a', '#a8c8f0', '#f2a8b8', '#b8e0a0'];
const ROOFS = ['#4a3a6a', '#3a4a6a', '#6a3a4a', '#3a5a4a', '#5a3a6a'];

// ---------- земля: текстура на холсте ----------
function groundTexture(map, th, R) {
  const P = Math.min(64, Math.floor(2048 / Math.max(map.W, map.H)));
  const cv = document.createElement('canvas');
  cv.width = map.W * P;
  cv.height = map.H * P;
  const g = cv.getContext('2d');
  const T = THEME[th];
  const pick = (a) => a[Math.floor(R() * a.length)];
  const cellKind = (i, j) => {
    if (i < 0 || j < 0 || i >= map.W || j >= map.H) return 'out';
    const v = map.grid[j * map.W + i];
    if (v === HEDGE) return 'hedge';
    const b = blockAt(map, i, j);
    if (!b) return v === WALK ? 'road' : 'out';
    return b.kind;
  };
  // трава везде как подложка
  g.fillStyle = T.grass[0];
  g.fillRect(0, 0, cv.width, cv.height);
  const grass = (x, y, w, h, dense = 1) => {
    for (let k = 0; k < (w * h) / 90; k++) {
      g.fillStyle = pick(T.grass);
      const r = 3 + R() * 9;
      g.beginPath();
      g.arc(x + R() * w, y + R() * h, r, 0, 7);
      g.fill();
    }
    g.lineWidth = Math.max(1, P / 40);
    for (let k = 0; k < ((w * h) / 30) * dense; k++) {
      const bx = x + R() * w,
        by = y + R() * h;
      g.strokeStyle = pick(T.blade);
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx + (R() - 0.5) * 3, by - 3 - R() * 4);
      g.stroke();
    }
  };
  grass(0, 0, cv.width, cv.height);
  const leaves = (x, y, w, h, n) => {
    for (let k = 0; k < n; k++) {
      g.save();
      g.translate(x + R() * w, y + R() * h);
      g.rotate(R() * 6);
      g.fillStyle = pick(T.leaf);
      g.beginPath();
      g.ellipse(0, 0, P * 0.05, P * 0.025, 0, 0, 7);
      g.fill();
      g.restore();
    }
  };
  // улицы
  for (let j = 0; j < map.H; j++)
    for (let i = 0; i < map.W; i++) {
      const k = cellKind(i, j);
      const x = i * P,
        y = j * P;
      if (k === 'road') {
        g.fillStyle = T.grout;
        g.fillRect(x, y, P, P);
        if (th === 'grave' || th === 'forest') {
          // утоптанная тропинка с камешками
          g.fillStyle = T.road[0];
          g.fillRect(x, y, P, P);
          for (let q = 0; q < 26; q++) {
            g.fillStyle = pick(T.road);
            g.beginPath();
            g.arc(x + R() * P, y + R() * P, P * (0.04 + R() * 0.08), 0, 7);
            g.fill();
          }
          for (let q = 0; q < 6; q++) {
            g.fillStyle = shade(T.road[1], 0.25);
            g.beginPath();
            g.ellipse(x + R() * P, y + R() * P, P * 0.03, P * 0.022, R() * 3, 0, 7);
            g.fill();
          }
        } else {
          // брусчатка / плиты
          const n = th === 'castle' ? 2 : 4;
          const s = P / n;
          for (let a = 0; a < n; a++)
            for (let b = 0; b < n; b++) {
              const off = th === 'castle' ? 0 : b % 2 ? s / 2 : 0;
              g.fillStyle = pick(T.road);
              rr(g, x + a * s + off + 1.5 - (off && a === n - 1 ? s : 0), y + b * s + 1.5, s - 3, s - 3, s * 0.3);
              if (off && a === 0) {
                g.fillStyle = pick(T.road);
                rr(g, x + 1.5 - s / 2, y + b * s + 1.5, s - 3, s - 3, s * 0.3);
              }
            }
          // ровный край квадрата клетки
        }
        leaves(x, y, P, P, th === 'forest' ? 7 : th === 'lane' ? 3 : 1);
        // бордюры к кварталам
        g.fillStyle = T.curb;
        const cw = Math.max(2, P * 0.07);
        const isBlock = (ii, jj) => {
          const kk = cellKind(ii, jj);
          return kk === 'house' || kk === 'hedge' || kk === 'out';
        };
        if (isBlock(i - 1, j)) g.fillRect(x, y, cw, P);
        if (isBlock(i + 1, j)) g.fillRect(x + P - cw, y, cw, P);
        if (isBlock(i, j - 1)) g.fillRect(x, y, P, cw);
        if (isBlock(i, j + 1)) g.fillRect(x, y + P - cw, P, cw);
      } else if (k === 'home' || (k === 'park' && th === 'castle')) {
        // мощёная площадь
        g.fillStyle = T.grout;
        g.fillRect(x, y, P, P);
        const s = P / 3;
        for (let a = 0; a < 3; a++)
          for (let b = 0; b < 3; b++) {
            g.fillStyle = pick(T.plaza);
            rr(g, x + a * s + 1.5, y + b * s + 1.5, s - 3, s - 3, s * 0.25);
          }
        leaves(x, y, P, P, 2);
      } else if (k === 'park') {
        // тропинки сквера по траве
        g.fillStyle = pick(T.path);
        g.globalAlpha = 0.85;
        g.beginPath();
        g.ellipse(x + P / 2, y + P / 2, P * 0.42, P * 0.42, 0, 0, 7);
        g.fill();
        g.globalAlpha = 1;
        for (let q = 0; q < 8; q++) {
          g.fillStyle = pick(T.path);
          g.beginPath();
          g.arc(x + P / 2 + (R() - 0.5) * P * 0.6, y + P / 2 + (R() - 0.5) * P * 0.6, P * 0.06, 0, 7);
          g.fill();
        }
        leaves(x, y, P, P, 4);
      } else if (k === 'house') {
        leaves(x, y, P, P, th === 'lane' || th === 'forest' ? 4 : 1);
      }
    }
  // дорожки от дверей к дому
  for (const b of map.blocks) {
    if (b.kind !== 'house' || !b.door) continue;
    const s = b.door.s;
    const cx = ((b.x0 + b.x1 + 1) / 2) * P,
      cy = ((b.y0 + b.y1 + 1) / 2) * P;
    const len = P * 1.3;
    g.fillStyle = pick(T.path);
    const w = P * 0.42;
    for (let q = 0; q < 4; q++) {
      let px, py;
      const f = (q + 0.5) / 4;
      if (s === 's') (px = cx), (py = (b.y1 + 1) * P - f * len);
      if (s === 'n') (px = cx), (py = b.y0 * P + f * len);
      if (s === 'e') (px = (b.x1 + 1) * P - f * len), (py = cy);
      if (s === 'w') (px = b.x0 * P + f * len), (py = cy);
      g.fillStyle = pick(T.path);
      rr(g, px - w / 2, py - w / 2.6, w, w / 1.3, w * 0.25);
    }
  }
  // мягкие тени-виньетки по краям кварталов
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.fill();
}

export function blockAt(map, i, j) {
  for (const b of map.blocks) if (i >= b.x0 && i <= b.x1 && j >= b.y0 && j <= b.y1) return b;
  return null;
}

// текстура свечения (ореол)
let HALO = null;
export function haloTex() {
  if (!HALO) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    HALO = new THREE.CanvasTexture(c);
  }
  return HALO;
}
export function halo(color, size, op = 0.55) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1);
  return s;
}

// ---------- мелкий декор ----------
export function pumpkin(b, gl, x, z, s = 1, lit = true, y = 0) {
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    b.sph(0.2 * s, k % 2 ? '#ff8a2a' : '#f2761a', { x: x + Math.sin(a) * 0.13 * s, y: y + 0.19 * s, z: z + Math.cos(a) * 0.13 * s, sx: 0.8, sy: 0.95, sz: 0.8 });
  }
  b.sph(0.27 * s, '#ff9333', { x, y: y + 0.19 * s, z, sy: 0.75 });
  b.cyl(0.03 * s, 0.04 * s, 0.12 * s, '#5a7a2a', { x, y: y + 0.42 * s, z, rz: 0.3 });
  if (lit && gl) {
    for (const sx of [-1, 1]) gl.cone(0.05 * s, 0.07 * s, '#ffd24a', { x: x + sx * 0.09 * s, y: y + 0.24 * s, z: z + 0.25 * s, rx: Math.PI / 2 - 0.3 }, 3);
    gl.box(0.16 * s, 0.04 * s, 0.03 * s, '#ffb43a', { x, y: y + 0.12 * s, z: z + 0.26 * s });
  }
}
function tree(b, x, z, s, th, R) {
  if (th === 'forest' || (th === 'lane' && R() < 0.5)) {
    // круглое дерево
    b.cyl(0.14 * s, 0.2 * s, 1.2 * s, '#5a3a2a', { x, y: 0.6 * s, z });
    const c = th === 'forest' ? ['#2f6a5a', '#3a7a62', '#285a50'] : ['#d86a2a', '#e8902a', '#c95a2a'];
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3;
      b.sph((0.55 + R() * 0.2) * s, c[k % 3], { x: x + Math.sin(a) * 0.35 * s, y: (1.5 + (k % 2) * 0.3) * s, z: z + Math.cos(a) * 0.35 * s });
    }
    b.sph(0.6 * s, c[0], { x, y: 1.95 * s, z });
  } else {
    // корявое голое дерево
    const col = th === 'grave' ? '#4a3d4a' : th === 'castle' ? '#3a3046' : '#5a3a2a';
    b.cyl(0.12 * s, 0.22 * s, 1.6 * s, col, { x, y: 0.8 * s, z, rz: 0.06 });
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + R();
      const h = (1.0 + k * 0.25) * s;
      b.cyl(0.04 * s, 0.07 * s, 0.8 * s, col, { x: x + Math.sin(a) * 0.3 * s, y: h + 0.25 * s, z: z + Math.cos(a) * 0.3 * s, rz: Math.sin(a) * 0.9, rx: -Math.cos(a) * 0.9 });
      b.cyl(0.02 * s, 0.035 * s, 0.4 * s, col, { x: x + Math.sin(a) * 0.55 * s, y: h + 0.6 * s, z: z + Math.cos(a) * 0.55 * s, rz: Math.sin(a + 0.6) * 0.4, rx: -Math.cos(a + 0.6) * 0.4 });
    }
    if (th === 'lane') for (let k = 0; k < 4; k++) b.sph(0.12 * s, ['#ff8a2a', '#ffb43a'][k % 2], { x: x + (R() - 0.5) * 0.9 * s, y: (1.5 + R() * 0.6) * s, z: z + (R() - 0.5) * 0.9 * s });
  }
}
function grave(b, x, z, ry = 0, s = 1, R = Math.random) {
  const c = ['#9a98ae', '#8a889e', '#a6a4b8'][Math.floor(R() * 3)];
  const kind = Math.floor(R() * 3);
  if (kind === 0) {
    b.rbox(0.5 * s, 0.6 * s, 0.14 * s, 0.06, c, { x, y: 0.3 * s, z, ry });
    b.cyl(0.25 * s, 0.25 * s, 0.14 * s, c, { x, y: 0.6 * s, z, rx: Math.PI / 2, ry }, 14);
    b.box(0.22 * s, 0.03 * s, 0.02, shade(c, -0.3), { x: x + Math.sin(ry) * 0.075 * s, y: 0.55 * s, z: z + Math.cos(ry) * 0.075 * s, ry });
    b.box(0.16 * s, 0.03 * s, 0.02, shade(c, -0.3), { x: x + Math.sin(ry) * 0.075 * s, y: 0.45 * s, z: z + Math.cos(ry) * 0.075 * s, ry });
  } else if (kind === 1) {
    b.box(0.12 * s, 0.8 * s, 0.12 * s, c, { x, y: 0.4 * s, z, ry });
    b.box(0.46 * s, 0.12 * s, 0.12 * s, c, { x, y: 0.58 * s, z, ry });
  } else {
    b.rbox(0.42 * s, 0.45 * s, 0.18 * s, 0.05, c, { x, y: 0.22 * s, z, ry, rz: 0.12 });
  }
  b.box(0.6 * s, 0.05, 0.8 * s, '#3a4a38', { x: x - Math.sin(ry) * 0.35 * s, y: 0.025, z: z - Math.cos(ry) * 0.35 * s, ry });
}
function candle(b, gl, x, z, y = 0) {
  b.cyl(0.04, 0.045, 0.16, '#f2ead6', { x, y: y + 0.08, z });
  gl.cone(0.03, 0.08, '#ffd24a', { x, y: y + 0.2, z }, 6);
}
function bush(b, x, z, s, col) {
  for (let k = 0; k < 4; k++) b.sph((0.3 + (k % 2) * 0.08) * s, k % 2 ? col : shade(col, 0.12), { x: x + Math.sin(k * 1.6) * 0.22 * s, y: 0.28 * s, z: z + Math.cos(k * 1.6) * 0.22 * s });
}
function mushroom(b, gl, x, z, s, glow) {
  b.cyl(0.05 * s, 0.07 * s, 0.25 * s, '#f2e6c8', { x, y: 0.12 * s, z });
  (glow ? gl : b).hemi(0.16 * s, glow ? '#7ae8ff' : '#d84a4a', { x, y: 0.24 * s, z, sy: 0.7 });
}
function lampPost(b, gl, halos, x, z, th) {
  const col = th === 'castle' ? '#3a3046' : '#2f2a3e';
  b.cyl(0.06, 0.09, 2.2, col, { x, y: 1.1, z });
  b.cyl(0.14, 0.14, 0.08, col, { x, y: 0.04, z });
  b.cyl(0.16, 0.1, 0.08, col, { x, y: 2.25, z }, 6);
  b.cone(0.2, 0.22, col, { x, y: 2.65, z }, 6);
  gl.cyl(0.11, 0.09, 0.32, th === 'grave' ? '#c8f0ff' : '#ffd88a', { x, y: 2.42, z }, 6);
  const h = halo(th === 'grave' ? '#9ad8ff' : '#ffb85a', 2.6, 0.5);
  h.position.set(x, 2.45, z);
  halos.push(h);
}

// ---------- дома ----------
// строит дом в локальных координатах (дверь смотрит в +z), lw×ld — размер квартала
function houseLane(b, L, lw, ld, R) {
  const wall = WALLS[Math.floor(R() * WALLS.length)];
  const roof = ROOFS[Math.floor(R() * ROOFS.length)];
  const trim = '#f6f0ff';
  const floors = R() < 0.5 ? 2 : 1;
  const W = lw - 1.7,
    D = ld - 2.6;
  const zc = -0.35;
  const fh = 1.45;
  const H = floors * fh;
  const front = zc + D / 2;
  // фундамент и стены
  b.box(W + 0.15, 0.25, D + 0.15, '#6a6078', { y: 0.12, z: zc });
  b.rbox(W, H, D, 0.06, wall, { y: 0.25 + H / 2, z: zc });
  // угловые наличники
  for (const sx of [-1, 1]) b.box(0.14, H, 0.14, trim, { x: sx * (W / 2), y: 0.25 + H / 2, z: front });
  b.box(W + 0.1, 0.1, 0.08, trim, { y: 0.25 + fh, z: front + 0.02 });
  // крыша
  const rh = 1.3 + R() * 0.5;
  b.prism(W + 0.5, D + 0.7, rh, roof, { y: 0.25 + H, z: zc });
  b.box(W + 0.55, 0.12, 0.12, shade(roof, -0.25), { y: 0.25 + H + rh, z: zc });
  // черепица полосами
  for (let k = 1; k < 4; k++) {
    const f = k / 4;
    for (const sz of [-1, 1]) b.box(W + 0.52, 0.05, 0.08, shade(roof, 0.12), { y: 0.25 + H + rh * f, z: zc + sz * (D + 0.7) * 0.5 * (1 - f), rx: sz * 0.0 });
  }
  // труба
  const chx = (R() < 0.5 ? -1 : 1) * W * 0.28;
  b.box(0.42, 1.1, 0.42, '#a85a4a', { x: chx, y: 0.25 + H + rh * 0.55, z: zc - D * 0.15 });
  b.box(0.5, 0.1, 0.5, '#7a4a3a', { x: chx, y: 0.25 + H + rh * 0.55 + 0.55, z: zc - D * 0.15 });
  // фронтон над дверью для двухэтажных
  if (floors === 2) {
    b.prism(1.4, 1.2, 0.8, roof, { y: 0.25 + H - 0.05, z: front + 0.1, ry: Math.PI / 2 });
    b.box(1.0, 0.7, 0.05, wall, { y: 0.25 + H + 0.25, z: front + 0.02 });
    b.cyl(0.22, 0.22, 0.06, trim, { y: 0.25 + H + 0.3, z: front + 0.06, rx: Math.PI / 2 }, 14);
    L.cyl(0.17, 0.17, 0.07, '#ffd36b', { y: 0.25 + H + 0.3, z: front + 0.07, rx: Math.PI / 2 }, 14);
  }
  // окна
  const win = (x, y) => {
    b.box(0.72, 0.78, 0.06, trim, { x, y, z: front + 0.03 });
    L.box(0.56, 0.62, 0.05, '#ffd36b', { x, y, z: front + 0.05 });
    b.box(0.05, 0.62, 0.03, trim, { x, y, z: front + 0.08 });
    b.box(0.56, 0.05, 0.03, trim, { x, y, z: front + 0.08 });
    b.box(0.82, 0.08, 0.14, trim, { x, y: y - 0.42, z: front + 0.08 });
    // ставни
    const sh = shade(roof, 0.1);
    for (const sx of [-1, 1]) b.box(0.2, 0.74, 0.04, sh, { x: x + sx * 0.48, y, z: front + 0.04 });
  };
  const wx = Math.min(1.35, W * 0.3);
  win(-wx, 0.25 + fh * 0.55);
  win(wx, 0.25 + fh * 0.55);
  if (floors === 2) {
    win(-wx, 0.25 + fh * 1.55);
    win(wx, 0.25 + fh * 1.55);
  }
  // летучие мышки-наклейки на одном окне
  if (R() < 0.6) for (let k = 0; k < 2; k++) b.box(0.14, 0.05, 0.01, INK, { x: -wx - 0.1 + k * 0.2, y: 0.25 + fh * 0.62 + k * 0.1, z: front + 0.1, rz: 0.3 * (k ? 1 : -1) });
  // крыльцо
  b.box(1.5, 0.2, 0.7, '#8a7a90', { y: 0.1, z: front + 0.35 });
  b.box(1.2, 0.2, 0.45, '#9a8aa0', { y: 0.3, z: front + 0.22 });
  const door = ['#7a3a5a', '#3a5a7a', '#5a3a2a', '#2f4a3a'][Math.floor(R() * 4)];
  b.rbox(0.72, 1.15, 0.08, 0.04, door, { y: 0.35 + 0.58, z: front + 0.04 });
  b.box(0.82, 1.22, 0.05, trim, { y: 0.35 + 0.58, z: front + 0.01 });
  b.sph(0.045, '#ffd84a', { x: 0.22, y: 0.85, z: front + 0.1 });
  // венок
  b.torus(0.14, 0.045, '#ff8a2a', { y: 1.2, z: front + 0.1 });
  // козырёк
  b.prism(1.5, 0.9, 0.35, roof, { y: 1.62, z: front + 0.42 });
  for (const sx of [-1, 1]) b.cyl(0.04, 0.04, 1.3, trim, { x: sx * 0.62, y: 0.95, z: front + 0.78 });
  // фонарь у двери
  b.box(0.1, 0.1, 0.12, INK, { x: -0.6, y: 1.32, z: front + 0.08 });
  L.box(0.14, 0.2, 0.14, '#ffb84a', { x: -0.6, y: 1.18, z: front + 0.12 });
  // тыквы на ступеньках
  return { front, porchY: 0.3, lampX: -0.6, lampY: 1.2 };
}

function houseCrypt(b, L, lw, ld, R) {
  const stone = ['#8e8aa4', '#9a96ae', '#82809a'][Math.floor(R() * 3)];
  const dk = shade(stone, -0.28);
  const lt = shade(stone, 0.18);
  const W = Math.min(lw - 2.2, 4.2),
    D = Math.min(ld - 2.8, 3.4);
  const zc = -0.35;
  const H = 1.8;
  const front = zc + D / 2;
  b.box(W + 0.5, 0.3, D + 0.5, dk, { y: 0.15, z: zc });
  b.box(W, H, D, stone, { y: 0.3 + H / 2, z: zc });
  for (let y = 0.6; y < H; y += 0.45) b.box(W + 0.02, 0.05, D + 0.02, shade(stone, -0.12), { y: 0.3 + y, z: zc });
  // карниз и двускатная крыша
  b.box(W + 0.35, 0.18, D + 0.35, dk, { y: 0.3 + H + 0.09, z: zc });
  b.prism(W + 0.35, D + 0.35, 0.75, lt, { y: 0.3 + H + 0.18, z: zc });
  b.box(W + 0.4, 0.09, 0.1, dk, { y: 0.3 + H + 0.93, z: zc });
  // фронтон спереди
  b.prism(0.14, D + 0.35, 0.75, dk, { x: 0, y: 0.3 + H + 0.18, z: zc, ry: Math.PI / 2, sx: 1 });
  // колонны у входа
  for (const sx of [-1, 1]) {
    b.cyl(0.13, 0.15, H - 0.1, '#c8c4d8', { x: sx * (W / 2 - 0.25), y: 0.35 + (H - 0.1) / 2, z: front + 0.3 }, 10);
    b.box(0.36, 0.12, 0.36, dk, { x: sx * (W / 2 - 0.25), y: 0.36, z: front + 0.3 });
    b.box(0.36, 0.12, 0.36, dk, { x: sx * (W / 2 - 0.25), y: 0.3 + H - 0.1, z: front + 0.3 });
  }
  b.box(W - 0.2, 0.16, 0.5, dk, { y: 0.3 + H - 0.02, z: front + 0.3 });
  // дверь-арка
  b.box(0.85, 1.1, 0.1, '#3a2f48', { y: 0.85, z: front + 0.04 });
  b.cyl(0.425, 0.425, 0.1, '#3a2f48', { y: 1.4, z: front + 0.04, rx: Math.PI / 2 }, 16);
  b.box(0.05, 1.1, 0.04, '#6a5a7a', { y: 0.85, z: front + 0.1 });
  b.sph(0.05, '#c8a84a', { x: 0.24, y: 0.9, z: front + 0.12 });
  // витражи по бокам
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 0.08);
    b.box(0.08, 0.7, 0.45, dk, { x, y: 1.3, z: zc });
    L.box(0.06, 0.5, 0.32, sx < 0 ? '#c58bff' : '#7ad0ff', { x: x + sx * 0.03, y: 1.28, z: zc });
  }
  // круглое окошко на фронтоне
  L.cyl(0.19, 0.19, 0.06, '#ffd36b', { y: 0.3 + H + 0.32, z: front + 0.06, rx: Math.PI / 2 }, 12);
  b.torus(0.23, 0.05, dk, { y: 0.3 + H + 0.32, z: front + 0.04 });
  // ступени и свечи
  b.box(1.5, 0.15, 0.55, dk, { y: 0.07, z: front + 0.62 });
  for (const sx of [-1, 1]) {
    b.cyl(0.06, 0.06, 0.22, '#f2ead6', { x: sx * 0.55, y: 0.26, z: front + 0.62 });
    L.cone(0.05, 0.13, '#ffd24a', { x: sx * 0.55, y: 0.44, z: front + 0.62 }, 6);
  }
  // плющ по стене
  for (let k = 0; k < 7; k++) b.sph(0.13, k % 2 ? '#3a6a3a' : '#4a7a44', { x: W / 2 - 0.04, y: 0.45 + k * 0.2, z: zc - 0.6 + (k % 3) * 0.35, sx: 0.35 });
  return { front, porchY: 0.15, lampX: -0.55, lampY: 0.45 };
}

function houseMushroom(b, L, lw, ld, R) {
  const cap = ['#d84a4a', '#8a5ac8', '#e87a2a', '#3a9a8a'][Math.floor(R() * 4)];
  const stem = '#f2e6c8';
  const zc = -0.55;
  const r = Math.min(Math.min(lw, ld) * 0.16, 0.95);
  const H = 1.6;
  b.cyl(r * 0.92, r, H, stem, { y: H / 2, z: zc }, 18);
  b.cyl(r * 1.02, r * 1.05, 0.25, '#7a6a4a', { y: 0.12, z: zc }, 18);
  // шляпка
  b.hemi(r * 1.55, cap, { y: H - 0.05, z: zc, sy: 0.8 });
  b.cyl(r * 1.55, r * 1.45, 0.18, shade(cap, -0.15), { y: H - 0.05, z: zc }, 22);
  for (let k = 0; k < 9; k++) {
    const a = k * 2.2,
      rr2 = r * (0.6 + (k % 3) * 0.4);
    const y = H - 0.05 + Math.sqrt(Math.max(0, (r * 1.55) ** 2 - rr2 * rr2)) * 0.8;
    b.sph(0.18 + (k % 2) * 0.08, '#fff6ea', { x: Math.sin(a) * rr2, y: y - 0.04, z: zc + Math.cos(a) * rr2, sy: 0.5 });
  }
  const front = zc + r * 0.95;
  // дверь
  b.rbox(0.7, 1.1, 0.12, 0.08, '#8a5a3a', { y: 0.8, z: front });
  b.cyl(0.35, 0.35, 0.12, '#8a5a3a', { y: 1.35, z: front, rx: Math.PI / 2 }, 14);
  b.sph(0.05, '#ffd84a', { x: 0.2, y: 0.85, z: front + 0.08 });
  // круглые окна
  for (const [x, y] of [[-r * 0.55, 1.35], [r * 0.55, 1.1]]) {
    b.torus(0.22, 0.05, '#8a5a3a', { x, y, z: front - 0.12 + Math.abs(x) * -0.15 });
    L.cyl(0.19, 0.19, 0.05, '#ffd36b', { x, y, z: front - 0.13 + Math.abs(x) * -0.15, rx: Math.PI / 2 }, 12);
  }
  // труба-грибок
  b.cyl(0.1, 0.12, 0.5, '#a85a4a', { x: r * 0.5, y: H + r * 1.0, z: zc - r * 0.3 });
  // ступеньки-пеньки
  b.cyl(0.32, 0.36, 0.18, '#8a6a4a', { y: 0.09, z: front + 0.45 }, 12);
  // фонарь-светлячок
  b.cyl(0.03, 0.03, 0.7, '#5a3a2a', { x: -0.7, y: 0.75, z: front + 0.35 });
  L.sph(0.12, '#c8ff8a', { x: -0.7, y: 1.15, z: front + 0.35 });
  return { front, porchY: 0.18, lampX: -0.7, lampY: 1.15 };
}

function houseKeep(b, L, lw, ld, R) {
  const stone = ['#7a7490', '#857f9a', '#6e6884'][Math.floor(R() * 3)];
  const dk = shade(stone, -0.25);
  const roof = ['#5a2a8a', '#8a2a4a', '#2a4a8a'][Math.floor(R() * 3)];
  const W = lw - 1.8,
    D = ld - 2.6;
  const zc = -0.3;
  const H = 2.6;
  const front = zc + D / 2;
  b.box(W, H, D, stone, { y: H / 2, z: zc });
  for (let y = 0.45; y < H; y += 0.5) b.box(W + 0.02, 0.04, D + 0.02, shade(stone, -0.1), { y, z: zc });
  // зубцы
  b.box(W + 0.2, 0.15, D + 0.2, dk, { y: H + 0.07, z: zc });
  for (let x = -W / 2 + 0.2; x <= W / 2 - 0.1; x += 0.55)
    for (const sz of [-1, 1]) b.box(0.3, 0.35, 0.25, stone, { x, y: H + 0.3, z: zc + sz * (D / 2) });
  // угловая башня
  const tx = (R() < 0.5 ? -1 : 1) * (W / 2);
  b.cyl(0.75, 0.8, H + 1.4, stone, { x: tx, y: (H + 1.4) / 2, z: zc - D * 0.2 }, 14);
  b.cyl(0.9, 0.9, 0.2, dk, { x: tx, y: H + 1.45, z: zc - D * 0.2 }, 14);
  b.cone(0.95, 1.6, roof, { x: tx, y: H + 2.35, z: zc - D * 0.2 }, 14);
  b.cyl(0.02, 0.02, 0.6, INK, { x: tx, y: H + 3.4, z: zc - D * 0.2 });
  b.box(0.4, 0.25, 0.02, roof, { x: tx + 0.2, y: H + 3.55, z: zc - D * 0.2 });
  L.box(0.24, 0.45, 0.05, '#ffd36b', { x: tx, y: H + 0.7, z: zc - D * 0.2 + 0.78 });
  // стрельчатые окна
  for (const x of [-W * 0.3, W * 0.3]) {
    b.box(0.6, 0.95, 0.06, dk, { x, y: 1.6, z: front + 0.02 });
    L.box(0.42, 0.7, 0.05, '#ffcf6a', { x, y: 1.55, z: front + 0.05 });
    L.cone(0.21, 0.28, '#ffcf6a', { x, y: 2.04, z: front + 0.05, ry: Math.PI / 4 }, 4);
    b.box(0.04, 0.7, 0.03, dk, { x, y: 1.55, z: front + 0.08 });
  }
  // ворота
  b.box(1.1, 1.3, 0.1, '#4a2f2a', { y: 0.65, z: front + 0.04 });
  b.cyl(0.55, 0.55, 0.1, '#4a2f2a', { y: 1.3, z: front + 0.04, rx: Math.PI / 2 }, 16);
  for (let x = -0.4; x <= 0.41; x += 0.27) b.box(0.03, 1.3, 0.03, '#2a1a18', { x, y: 0.65, z: front + 0.1 });
  b.torus(0.08, 0.02, '#c8a84a', { x: 0.2, y: 0.8, z: front + 0.12 });
  // знамёна
  for (const sx of [-1, 1]) {
    b.box(0.5, 1.1, 0.04, roof, { x: sx * W * 0.3, y: H - 0.45, z: front + 0.05 });
    b.cone(0.25, 0.25, roof, { x: sx * W * 0.3, y: H - 1.05, z: front + 0.05, rz: Math.PI, ry: Math.PI / 4, sz: 0.15 }, 4);
    b.sph(0.08, '#ffd84a', { x: sx * W * 0.3, y: H - 0.35, z: front + 0.08 });
  }
  // факелы
  for (const sx of [-1, 1]) {
    b.cyl(0.04, 0.06, 0.35, '#5a3a2a', { x: sx * 0.85, y: 1.3, z: front + 0.12, rx: 0.3 });
    L.cone(0.09, 0.22, '#ffb43a', { x: sx * 0.85, y: 1.55, z: front + 0.2 }, 6);
  }
  b.box(1.6, 0.15, 0.6, dk, { y: 0.07, z: front + 0.4 });
  return { front, porchY: 0.15, lampX: -0.85, lampY: 1.55 };
}

// ---------- построение всей сцены уровня ----------
export function buildLevel(world, theme, quality = 'high') {
  const map = world.map;
  const R = rng(map.W * 131 + map.H * 17 + world.idx * 7);
  const T = THEME[theme];
  const group = new THREE.Group();
  const b = new B(); // статика, тени
  const bs = new B(); // мелочь без теней
  const gl = new B(); // постоянные огоньки
  const halos = [];
  const houseMeshes = [];

  // земля
  const tex = groundTexture(map, theme, R);
  const gw = map.W * CS,
    gh = map.H * CS;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(gw / 2, 0, gh / 2);
  ground.receiveShadow = true;
  group.add(ground);

  // окрестности: широкая трава с листьями
  const outTex = outsideTexture(theme, R);
  const big = new THREE.Mesh(new THREE.PlaneGeometry(gw + 80, gh + 80), new THREE.MeshLambertMaterial({ map: outTex }));
  outTex.repeat.set((gw + 80) / 8, (gh + 80) / 8);
  big.rotation.x = -Math.PI / 2;
  big.position.set(gw / 2, -0.02, gh / 2);
  big.receiveShadow = true;
  group.add(big);

  const fenceCol = theme === 'lane' ? '#f2ecff' : theme === 'grave' ? '#2a2638' : theme === 'forest' ? '#7a5a3a' : '#6e6884';
  // ограда по краю участка
  const fenceSeg = (B_, x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / (theme === 'castle' ? 0.6 : 0.32)));
    if (theme === 'castle') {
      // низкая каменная стенка с зубцами
      B_.box(0.35, 0.45, len, '#6e6884', { x: (x0 + x1) / 2, y: 0.22, z: (z0 + z1) / 2, ry });
      for (let k = 0; k < n; k += 2) {
        const f = (k + 0.5) / n;
        B_.box(0.38, 0.22, 0.3, '#7a7490', { x: x0 + (x1 - x0) * f, y: 0.55, z: z0 + (z1 - z0) * f, ry });
      }
      return;
    }
    if (theme === 'forest') {
      B_.cyl(0.05, 0.05, len, '#7a5a3a', { x: (x0 + x1) / 2, y: 0.45, z: (z0 + z1) / 2, rx: Math.PI / 2, ry });
      B_.cyl(0.05, 0.05, len, '#6a4a2a', { x: (x0 + x1) / 2, y: 0.22, z: (z0 + z1) / 2, rx: Math.PI / 2, ry });
      for (let k = 0; k <= n; k += 3) {
        const f = k / n;
        B_.cyl(0.07, 0.08, 0.65, '#5a3a2a', { x: x0 + (x1 - x0) * f, y: 0.32, z: z0 + (z1 - z0) * f });
      }
      return;
    }
    B_.box(0.05, 0.06, len, fenceCol, { x: (x0 + x1) / 2, y: 0.42, z: (z0 + z1) / 2, ry });
    B_.box(0.05, 0.06, len, fenceCol, { x: (x0 + x1) / 2, y: 0.18, z: (z0 + z1) / 2, ry });
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      const x = x0 + (x1 - x0) * f,
        z = z0 + (z1 - z0) * f;
      if (theme === 'grave') {
        B_.box(0.04, 0.7, 0.04, fenceCol, { x, y: 0.35, z });
        B_.cone(0.05, 0.12, fenceCol, { x, y: 0.75, z }, 4);
      } else {
        B_.box(0.12, 0.55, 0.05, fenceCol, { x, y: 0.28, z, ry });
        B_.cone(0.085, 0.1, fenceCol, { x, y: 0.6, z, ry: ry + Math.PI / 4 }, 4);
      }
    }
  };

  for (const blk of map.blocks) {
    const x0 = blk.x0 * CS,
      x1 = (blk.x1 + 1) * CS,
      z0 = blk.y0 * CS,
      z1 = (blk.y1 + 1) * CS;
    const cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2;
    const bw = x1 - x0,
      bd = z1 - z0;
    if (blk.kind === 'house') {
      const s = blk.door.s;
      const ry = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[s];
      const lw = s === 'n' || s === 's' ? bw : bd;
      const ld = s === 'n' || s === 's' ? bd : bw;
      const hb = new B(),
        L = new B();
      const fn = { lane: houseLane, grave: houseCrypt, forest: houseMushroom, castle: houseKeep }[theme];
      const info = fn(hb, L, lw, ld, R);
      // двор в локальных координатах
      const yb = new B(),
        yg = new B();
      const fx = lw / 2 - 0.25,
        fz = ld / 2 - 0.25;
      // ограда с калиткой спереди
      fenceSeg(yb, -fx, -fz, fx, -fz);
      fenceSeg(yb, -fx, -fz, -fx, fz);
      fenceSeg(yb, fx, -fz, fx, fz);
      fenceSeg(yb, -fx, fz, -0.75, fz);
      fenceSeg(yb, 0.75, fz, fx, fz);
      // столбики калитки
      for (const sx of [-1, 1]) yb.box(0.16, 0.85, 0.16, theme === 'lane' ? '#f6f0ff' : theme === 'grave' ? '#5a566a' : theme === 'forest' ? '#5a3a2a' : '#7a7490', { x: sx * 0.8, y: 0.42, z: fz });
      // украшения двора
      const yardFront = (fz + info.front) / 2 + 0.15;
      if (theme === 'lane') {
        pumpkin(yb, L, -0.55, info.front + 0.62, 0.8, true, 0.2);
        pumpkin(yb, L, 0.6, info.front + 0.55, 0.65, true, 0.2);
        pumpkin(yb, yg, fx - 0.6, yardFront, 1.0, true);
        if (R() < 0.7) {
          // декоративное надгробие из картона
          grave(yb, -fx + 0.6, yardFront, 0, 0.8, R);
        }
        if (R() < 0.6) {
          // почтовый ящик
          yb.cyl(0.04, 0.04, 0.8, '#5a3a2a', { x: 1.15, y: 0.4, z: fz - 0.2 });
          yb.rbox(0.3, 0.24, 0.45, 0.08, '#c4243a', { x: 1.15, y: 0.9, z: fz - 0.2 });
          yb.box(0.04, 0.2, 0.04, '#ffd84a', { x: 1.31, y: 1.0, z: fz - 0.3 });
        }
        tree(yb, -fx + 0.7, -fz + 0.7, 0.62, theme, R);
        // паутинка в углу крыльца
        for (let k = 0; k < 4; k++) yb.box(0.6, 0.012, 0.012, '#e8e4f8', { x: 0.55, y: 1.35, z: info.front + 0.5, rz: -0.8 + k * 0.5 });
      } else if (theme === 'grave') {
        for (let k = 0; k < 3; k++) grave(yb, -fx + 0.5 + k * 0.55, -fz + 0.6, 0, 0.75, R);
        grave(yb, fx - 0.6, yardFront, 0, 0.8, R);
        grave(yb, -fx + 0.6, yardFront, 0, 0.75, R);
        candle(yb, L, fx - 0.25, yardFront + 0.25);
        candle(yb, L, -fx + 0.3, yardFront + 0.3);
        tree(yb, fx - 0.6, -fz + 0.7, 0.62, theme, R);
        pumpkin(yb, L, 0.95, info.front + 0.9, 0.6, true);
      } else if (theme === 'forest') {
        bush(yb, -fx + 0.6, yardFront, 0.9, '#3a7a5a');
        bush(yb, fx - 0.55, -fz + 0.6, 1.0, '#2f6a50');
        for (let k = 0; k < 4; k++) mushroom(yb, L, fx - 0.5 - k * 0.25, yardFront + (k % 2) * 0.25, 0.9 + (k % 2) * 0.4, k % 2 === 0);
        tree(yb, -fx + 0.7, -fz + 0.8, 0.62, theme, R);
        pumpkin(yb, L, 0.9, info.front + 0.6, 0.7, true);
        // бревно
        yb.cyl(0.18, 0.18, 1.0, '#7a5a3a', { x: -fx + 0.7, y: 0.18, z: -0.4, rx: Math.PI / 2 });
        yb.cyl(0.14, 0.14, 1.02, '#c8a070', { x: -fx + 0.7, y: 0.18, z: -0.4, rx: Math.PI / 2 }, 10);
      } else {
        // статуя-горгулья и факелы на стенке
        yb.box(0.4, 0.5, 0.4, '#5a5470', { x: fx - 0.55, y: 0.25, z: yardFront });
        yb.sph(0.2, '#7a7490', { x: fx - 0.55, y: 0.7, z: yardFront });
        for (const sx of [-1, 1]) yb.cone(0.08, 0.18, '#7a7490', { x: fx - 0.55 + sx * 0.12, y: 0.9, z: yardFront }, 4);
        for (const sx of [-1, 1]) yb.box(0.3, 0.2, 0.04, '#6a6480', { x: fx - 0.55 + sx * 0.25, y: 0.72, z: yardFront - 0.05, rz: sx * 0.5 });
        pumpkin(yb, L, -0.9, info.front + 0.6, 0.75, true);
        pumpkin(yb, yg, -fx + 0.6, yardFront, 0.9, true);
        tree(yb, -fx + 0.7, -fz + 0.7, 0.6, theme, R);
      }
      // каждый дом — свой меш: так его можно сделать полупрозрачным, когда он закрывает героя
      const hg = new B();
      hg.merge(hb);
      hg.merge(yb);
      const hmesh = new THREE.Mesh(hg.geometry(), new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: MAT.gradientMap }));
      hmesh.castShadow = quality !== 'low';
      hmesh.receiveShadow = true;
      hmesh.position.set(cx, 0, cz);
      hmesh.rotation.y = ry;
      group.add(hmesh);
      gl.merge(yg, { x: cx, z: cz, ry });
      const lm = L.mesh(MAT_GLOW, false);
      lm.position.set(cx, 0, cz);
      lm.rotation.y = ry;
      group.add(lm);
      // ореол фонаря у двери
      const hl = halo('#ffb85a', 2.4, 0.55);
      const lx = info.lampX,
        lz = info.front + 0.25;
      hl.position.set(cx + Math.cos(ry) * lx + Math.sin(ry) * lz, info.lampY, cz - Math.sin(ry) * lx + Math.cos(ry) * lz);
      group.add(hl);
      hmesh.geometry.computeBoundingBox();
      const bb = hmesh.geometry.boundingBox.clone();
      bb.applyMatrix4(new THREE.Matrix4().makeRotationY(ry));
      bb.translate(new THREE.Vector3(cx, 0, cz));
      houseMeshes.push({ blk, lights: lm, halo: hl, mesh: hmesh, box: bb, mat: hmesh.material });
    } else if (blk.kind === 'park') {
      parkDecor(b, bs, gl, halos, blk, theme, R);
    } else if (blk.kind === 'home') {
      homeDecor(b, bs, gl, halos, blk, theme, R);
    }
  }

  // изгороди на закрытых отрезках улиц
  for (const s of map.hedges) {
    const cells = [];
    if (s.v) for (let j = s.j0; j <= s.j1; j++) cells.push([s.i, j]);
    else for (let i = s.i0; i <= s.i1; i++) cells.push([i, s.j]);
    for (const [i, j] of cells) {
      const x = (i + 0.5) * CS,
        z = (j + 0.5) * CS;
      if (theme === 'lane' || theme === 'forest') {
        b.rbox(s.v ? 1.3 : 2.05, 0.9, s.v ? 2.05 : 1.3, 0.3, theme === 'lane' ? '#3a6a46' : '#2f5a4a', { x, y: 0.45, z });
        for (let k = 0; k < 4; k++) b.sph(0.3, theme === 'lane' ? '#467a52' : '#3a6a56', { x: x + (s.v ? (R() - 0.5) * 0.8 : -0.75 + k * 0.5), y: 0.85, z: z + (s.v ? -0.75 + k * 0.5 : (R() - 0.5) * 0.8) });
        if (R() < 0.5) pumpkin(b, gl, x + (s.v ? 0.75 : 0), z + (s.v ? 0 : 0.75), 0.6, true);
      } else if (theme === 'grave') {
        grave(b, x - 0.4, z, 0, 0.9, R);
        grave(b, x + 0.4, z + 0.2, 0, 0.8, R);
        candle(b, gl, x, z + 0.6);
        bs.box(1.8, 0.04, 1.8, '#2f4a34', { x, y: 0.02, z });
      } else {
        b.box(s.v ? 1.0 : 2.05, 0.8, s.v ? 2.05 : 1.0, '#6e6884', { x, y: 0.4, z });
        for (let k = 0; k < 3; k++) b.box(0.4, 0.3, 0.4, '#7a7490', { x: x + (s.v ? 0 : -0.65 + k * 0.65), y: 0.95, z: z + (s.v ? -0.65 + k * 0.65 : 0) });
      }
    }
  }

  // фонари на углах кварталов (внутри участков)
  for (const blk of map.blocks) {
    if (blk.kind !== 'house' || R() < 0.45) continue;
    const corners = [[blk.x0 * CS + 0.3, blk.y0 * CS + 0.3], [(blk.x1 + 1) * CS - 0.3, (blk.y1 + 1) * CS - 0.3]];
    const [x, z] = corners[Math.floor(R() * 2)];
    lampPost(b, gl, halos, x, z, theme);
  }

  exterior(b, bs, gl, halos, map, theme, R, fenceSeg);

  const sm = b.mesh(MAT, quality !== 'low');
  group.add(sm);
  if (bs.parts.length) group.add(bs.mesh(MAT, false));
  if (gl.parts.length) group.add(gl.mesh(MAT_GLOW, false));
  for (const h of halos) group.add(h);

  // небо: луна и звёзды
  sky(group, map, T);
  return { group, houseMeshes };
}

function outsideTexture(theme, R) {
  const T = THEME[theme];
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = T.grass[1];
  g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 160; k++) {
    g.fillStyle = T.grass[k % 3];
    g.beginPath();
    g.arc(R() * 256, R() * 256, 4 + R() * 14, 0, 7);
    g.fill();
  }
  for (let k = 0; k < 600; k++) {
    g.strokeStyle = T.blade[k % 2];
    g.lineWidth = 1.5;
    const x = R() * 256,
      y = R() * 256;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (R() - 0.5) * 3, y - 4 - R() * 4);
    g.stroke();
  }
  for (let k = 0; k < 30; k++) {
    g.fillStyle = T.leaf[k % T.leaf.length];
    g.beginPath();
    g.ellipse(R() * 256, R() * 256, 4, 2, R() * 3, 0, 7);
    g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function parkDecor(b, bs, gl, halos, blk, theme, R) {
  for (const [i, j] of blk.obst) {
    const x = (i + 0.5) * CS,
      z = (j + 0.5) * CS;
    const center = i > blk.x0 && i < blk.x1 && j > blk.y0 && j < blk.y1;
    if (theme === 'lane') {
      if (center) {
        // фонтан с тыквой
        b.cyl(0.9, 0.95, 0.4, '#8a80a8', { x, y: 0.2, z }, 20);
        bs.cyl(0.78, 0.78, 0.05, '#5ac8e8', { x, y: 0.38, z }, 20);
        b.cyl(0.18, 0.22, 0.9, '#8a80a8', { x, y: 0.7, z }, 10);
        pumpkin(b, gl, x, z, 0.8, true, 1.1);
      } else {
        bush(b, x, z, 1.3, '#3a7a50');
        pumpkin(b, gl, x + 0.3, z + 0.5, 0.6, true);
      }
    } else if (theme === 'grave') {
      if (center) {
        // ангел-статуя
        b.box(0.9, 0.5, 0.9, '#6a6880', { x, y: 0.25, z });
        b.cone(0.35, 1.0, '#a8a6bc', { x, y: 1.0, z }, 12);
        b.sph(0.2, '#b8b6cc', { x, y: 1.6, z });
        for (const sx of [-1, 1]) b.sph(0.3, '#c8c6dc', { x: x + sx * 0.3, y: 1.2, z: z - 0.15, sx: 0.4, sy: 1.2 });
        b.torus(0.15, 0.025, '#ffe48a', { x, y: 1.85, z, rx: Math.PI / 2 });
        candle(b, gl, x - 0.35, z + 0.55);
        candle(b, gl, x + 0.35, z + 0.55);
      } else {
        grave(b, x, z, 0, 1.0, R);
        grave(b, x + 0.5, z - 0.4, 0, 0.8, R);
      }
    } else if (theme === 'forest') {
      if (center) {
        b.cyl(0.55, 0.75, 1.8, '#5a3a2a', { x, y: 0.9, z }, 12);
        for (let k = 0; k < 5; k++) b.cyl(0.12, 0.2, 0.7, '#5a3a2a', { x: x + Math.sin(k * 1.3) * 0.65, y: 0.15, z: z + Math.cos(k * 1.3) * 0.65, rz: Math.sin(k * 1.3) * 1.2, rx: -Math.cos(k * 1.3) * 1.2 });
        for (let k = 0; k < 7; k++) b.sph(0.72, ['#2f6a5a', '#3a7a62', '#285a50'][k % 3], { x: x + Math.sin(k) * 0.7, y: 2.2 + (k % 2) * 0.4, z: z + Math.cos(k) * 0.7 });
        for (let k = 0; k < 6; k++) gl.sph(0.05, '#e8ff8a', { x: x + Math.sin(k * 2) * 1.4, y: 1.0 + (k % 3) * 0.5, z: z + Math.cos(k * 2) * 1.4 });
      } else {
        b.sph(0.6, '#6a6a7a', { x, y: 0.3, z, sy: 0.7 });
        b.sph(0.4, '#7a7a8a', { x: x + 0.45, y: 0.2, z: z + 0.3, sy: 0.7 });
        mushroom(b, gl, x - 0.5, z + 0.5, 1.4, true);
      }
    } else {
      if (center) {
        b.cyl(0.95, 1.0, 0.45, '#6e6884', { x, y: 0.22, z }, 16);
        bs.cyl(0.82, 0.82, 0.05, '#a87ae8', { x, y: 0.42, z }, 16);
        b.cyl(0.15, 0.2, 1.2, '#7a7490', { x, y: 0.8, z }, 8);
        b.cyl(0.5, 0.3, 0.15, '#7a7490', { x, y: 1.4, z }, 12);
        gl.sph(0.14, '#e0b0ff', { x, y: 1.55, z });
      } else {
        b.box(0.6, 0.4, 0.6, '#5a5470', { x, y: 0.2, z });
        b.cone(0.25, 1.2, '#2f5a40', { x, y: 1.0, z }, 8);
      }
    }
  }
  // мелочь на дорожках сквера (не мешает пройти)
  for (let j = blk.y0; j <= blk.y1; j++)
    for (let i = blk.x0; i <= blk.x1; i++) {
      if (blk.obst.some(([a, c]) => a === i && c === j)) continue;
      if (R() < 0.5) continue;
      const x = (i + 0.15 + R() * 0.7) * CS,
        z = (j + 0.15 + R() * 0.7) * CS;
      if (theme === 'forest') mushroom(bs, gl, x, z, 0.7, R() < 0.5);
      else if (theme === 'grave') bs.cone(0.06, 0.18, '#4a7a4a', { x, y: 0.09, z }, 5);
      else bs.sph(0.08, ['#ff9ad0', '#ffe48a', '#c8a8ff'][Math.floor(R() * 3)], { x, y: 0.05, z, sy: 0.5 });
    }
}

function homeDecor(b, bs, gl, halos, blk, theme, R) {
  const cx = blk.cx * CS,
    cz = blk.cy * CS;
  // кольцо приёма конфет
  const ring = new B();
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    ring.box(0.35, 0.03, 0.12, k % 2 ? '#ffb43a' : '#ff6aa8', { x: cx + Math.cos(a) * 2.9, y: 0.02, z: cz + Math.sin(a) * 2.9, ry: -a });
  }
  bs.merge(ring);
  // гирлянда-флажки между столбами по углам площади
  const x0 = blk.x0 * CS + 0.25,
    x1 = (blk.x1 + 1) * CS - 0.25,
    z0 = blk.y0 * CS + 0.25,
    z1 = (blk.y1 + 1) * CS - 0.25;
  const posts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  for (const [x, z] of posts) {
    b.cyl(0.06, 0.08, 2.4, '#3a3048', { x, y: 1.2, z });
    gl.sph(0.12, '#ffd88a', { x, y: 2.45, z });
    const h = halo('#ffb85a', 1.8, 0.45);
    h.position.set(x, 2.45, z);
    halos.push(h);
  }
  for (let p = 0; p < 4; p++) {
    const [ax, az] = posts[p],
      [bx, bz] = posts[(p + 1) % 4];
    const n = 9;
    for (let k = 1; k < n; k++) {
      const f = k / n;
      const sag = Math.sin(f * Math.PI) * 0.45;
      const x = ax + (bx - ax) * f,
        z = az + (bz - az) * f;
      const ry = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
      bs.cone(0.12, 0.24, ['#ff8a2a', '#7a4dc4', '#9be15d', '#2a2238'][k % 4], { x, y: 2.15 - sag, z, rx: Math.PI, ry, sz: 0.2 }, 3);
    }
  }
}

function exterior(b, bs, gl, halos, map, theme, R, fenceSeg) {
  const gw = map.W * CS,
    gh = map.H * CS;
  // граница: ограда вокруг всего квартала
  const m = 0.35;
  fenceSeg(b, -m, -m, gw + m, -m);
  fenceSeg(b, -m, gh + m, gw + m, gh + m);
  fenceSeg(b, -m, -m, -m, gh + m);
  fenceSeg(b, gw + m, -m, gw + m, gh + m);
  // за оградой: деревья, тыквенные грядки, домики, кусты
  const occupied = [];
  const free = (x, z, r) => occupied.every(([a, c, rr2]) => Math.hypot(a - x, c - z) > rr2 + r);
  const place = (x, z, r) => occupied.push([x, z, r]);
  const ring = 16;
  for (let k = 0; k < (gw + gh) * 1.6; k++) {
    const side = Math.floor(R() * 4);
    let x, z;
    const d = 1.3 + Math.pow(R(), 1.5) * ring;
    if (side === 0) (x = -2 + R() * (gw + 4)), (z = -d);
    else if (side === 1) (x = -2 + R() * (gw + 4)), (z = gh + d);
    else if (side === 2) (x = -d), (z = -2 + R() * (gh + 4));
    else (x = gw + d), (z = -2 + R() * (gh + 4));
    const r = 0.9;
    if (!free(x, z, r)) continue;
    place(x, z, r);
    const roll = R();
    if (roll < 0.45) tree(b, x, z, 0.9 + R() * 0.6, theme, R);
    else if (roll < 0.62) {
      if (theme === 'grave') grave(b, x, z, (R() - 0.5) * 0.6, 1.1, R);
      else if (theme === 'forest') mushroom(b, gl, x, z, 2 + R() * 2, R() < 0.4);
      else pumpkin(b, gl, x, z, 0.8 + R() * 0.8, R() < 0.5);
    } else if (roll < 0.8) bush(b, x, z, 1.1 + R() * 0.5, theme === 'forest' ? '#2f6a50' : theme === 'grave' ? '#2f4a36' : '#3a6a46');
    else if (roll < 0.86 && theme !== 'castle') pumpkin(b, gl, x, z, 1.4, true);
    else bs.sph(0.5 + R() * 0.4, '#5a5a6a', { x, y: 0.15, z, sy: 0.5 });
  }
  // дальние силуэты домов вдоль верхнего края (видны в меню и на высоких экранах)
  for (let x = -6; x < gw + 6; x += 7 + R() * 3) {
    const z = -10 - R() * 6;
    if (!free(x, z, 2.5)) continue;
    const hb = new B(),
      L = new B();
    const fn = { lane: houseLane, grave: houseCrypt, forest: houseMushroom, castle: houseKeep }[theme];
    fn(hb, L, 6, 6, R);
    b.merge(hb, { x, z });
    gl.merge(L, { x, z });
  }
}

function sky(group, map, T) {
  const gw = map.W * CS,
    gh = map.H * CS;
  const moon = halo(T.moon[0], 30, 0.35);
  moon.position.set(gw * 0.7, 26, -38);
  group.add(moon);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false }));
  disc.position.copy(moon.position);
  disc.lookAt(gw / 2, 0, gh / 2);
  group.add(disc);
  // кратеры
  const cr = new THREE.MeshBasicMaterial({ color: '#efe2c0', fog: false });
  for (const [dx, dy, r] of [[-1.2, 0.8, 0.8], [1.3, -0.6, 0.6], [0.2, -1.7, 0.45], [1.6, 1.4, 0.35]]) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(r, 16), cr);
    c.position.set(dx, dy, 0.02);
    disc.add(c);
  }
  const pts = [];
  const R = rng(5);
  for (let k = 0; k < 300; k++) pts.push(gw / 2 + (R() - 0.5) * 220, 18 + R() * 50, -30 - R() * 60);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.45, fog: false, transparent: true, opacity: 0.85 }));
  group.add(stars);
}

export { makeCauldron };
