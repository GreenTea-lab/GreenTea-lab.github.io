// Пиксельные текстуры, нарисованные кодом (16 пикселей на метр)
import * as THREE from 'three';

const N = 16;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
function shade(c, k) {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * k)));
  return (r << 16) | (g << 8) | b;
}

function canvas(w = N, h = N) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  return t;
}

function px(ctx, x, y, c) {
  ctx.fillStyle = hex(c);
  ctx.fillRect(x, y, 1, 1);
}

// доски (волокна вдоль X)
function wood(base, seed, vertical) {
  const c = canvas();
  const g = c.getContext('2d');
  const R = rng(seed);
  for (let y = 0; y < N; y++) {
    const plank = Math.floor(y / 4);
    const pk = 0.92 + ((plank * 37) % 5) * 0.03;
    for (let x = 0; x < N; x++) {
      let k = pk * (0.94 + R() * 0.1);
      if (y % 4 === 3) k *= 0.62; // щель между досками
      if ((x + plank * 5) % 16 === 0 && y % 4 !== 3) k *= 0.75; // стык
      if (R() < 0.06) k *= 0.85; // волокно
      const [xx, yy] = vertical ? [y, x] : [x, y];
      px(g, xx, yy, shade(base, k));
    }
  }
  return c;
}

function stone(base, seed) {
  const c = canvas();
  const g = c.getContext('2d');
  const R = rng(seed);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const row = Math.floor(y / 4);
      const off = row % 2 ? 4 : 0;
      const mortar = y % 4 === 3 || (x + off) % 8 === 7;
      const brick = Math.floor((x + off) / 8) + row * 3;
      let k = mortar ? 0.68 : (0.9 + ((brick * 53) % 7) * 0.025) * (0.93 + R() * 0.12);
      if (!mortar && (y % 4 === 0)) k *= 1.08;
      px(g, x, y, shade(base, k));
    }
  return c;
}

function ice(seed) {
  const c = canvas();
  const g = c.getContext('2d');
  const R = rng(seed);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let k = 0.92 + R() * 0.08;
      if ((x + y) % 11 === 0 || (x - y + 32) % 13 === 0) k = 1.12;
      if (x === 0 || y === 0) k = 1.15;
      if (x === N - 1 || y === N - 1) k = 0.85;
      px(g, x, y, shade(0xa9dcf5, k));
    }
  return c;
}

function metal(seed) {
  const c = canvas();
  const g = c.getContext('2d');
  const R = rng(seed);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let k = 0.9 + R() * 0.07;
      if (x % 8 === 0 || y % 8 === 0) k = 0.7;
      if (x % 8 === 1 || y % 8 === 1) k = 1.12;
      if ((x % 8 === 3 || x % 8 === 6) && (y % 8 === 3 || y % 8 === 6)) k = 1.35; // заклёпки
      px(g, x, y, shade(0x7d8794, k));
    }
  return c;
}

function straw(seed) {
  const c = canvas();
  const g = c.getContext('2d');
  const R = rng(seed);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let k = 0.85 + R() * 0.25;
      if ((x * 3 + y) % 7 === 0) k *= 0.8;
      if (y === 5 || y === 11) k *= 0.6; // перевязка
      px(g, x, y, shade(0xe8c45a, k));
    }
  return c;
}

// бочка с порохом: доски, обручи, красная полоса
function tnt(seed) {
  const c = canvas(32, 16);
  const g = c.getContext('2d');
  const R = rng(seed);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 32; x++) {
      let col = 0x9a5b2c;
      let k = 0.9 + R() * 0.12;
      if (x % 4 === 0) k *= 0.7;
      if (y === 2 || y === 13) (col = 0x5a5f66), (k = 1);
      if (y >= 6 && y <= 9) (col = 0xd93a2b), (k = 0.95 + R() * 0.08);
      px(g, x, y, shade(col, k));
    }
  // знак «огонь» на полосе
  for (const sx of [6, 22]) {
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, -1]]) px(g, sx + dx, 7 + dy, 0xffe066);
  }
  return c;
}

function grass(base, seed, flowers) {
  const S = 32;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  const R = rng(seed);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let k = 0.92 + R() * 0.1;
      if (R() < 0.08) k *= 1.12;
      if (R() < 0.05) k *= 0.88;
      px(g, x, y, shade(base, k));
    }
  if (flowers)
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(R() * S);
      const y = Math.floor(R() * S);
      px(g, x, y, flowers[i % flowers.length]);
    }
  return c;
}

function rock(seed, top) {
  const c = canvas();
  const g = c.getContext('2d');
  const R = rng(seed);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let k = 0.85 + R() * 0.2;
      if (((x * 7 + y * 3) % 17) < 2) k *= 0.8;
      px(g, x, y, shade(0x8a8378, k));
    }
  if (top) for (let x = 0; x < N; x++) for (let y = 0; y < 2 + (R() < 0.5 ? 1 : 0); y++) px(g, x, y, shade(top, 0.9 + R() * 0.15));
  return c;
}

// черепица
function shingle(base, seed) {
  const c = canvas();
  const g = c.getContext('2d');
  const R = rng(seed);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const row = Math.floor(y / 4);
      const off = row % 2 ? 2 : 0;
      let k = 0.92 + R() * 0.1;
      if (y % 4 === 3) k *= 0.7;
      if ((x + off) % 4 === 0) k *= 0.82;
      if (y % 4 === 0) k *= 1.1;
      px(g, x, y, shade(base, k));
    }
  return c;
}

// маска трещин (белые линии на чёрном)
function cracks() {
  const S = 32;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  const R = rng(99);
  for (let i = 0; i < 5; i++) {
    let x = Math.floor(R() * S);
    let y = Math.floor(R() * S);
    for (let s = 0; s < 14; s++) {
      px(g, (x + S) % S, (y + S) % S, 0xffffff);
      x += R() < 0.5 ? 1 : -1;
      y += R() < 0.6 ? 1 : 0;
    }
  }
  return c;
}

// мягкий круг для частиц
function softDot() {
  const S = 64;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function makeTextures() {
  const T = {
    wood: tex(wood(0xb07a45, 3, false)),
    woodV: tex(wood(0xb07a45, 4, true)),
    stone: tex(stone(0xa7a49c, 5)),
    ice: tex(ice(6)),
    metal: tex(metal(7)),
    straw: tex(straw(8)),
    tnt: tex(tnt(9)),
    cracks: tex(cracks(), false),
    dot: softDot(),
    rock: tex(rock(11, null)),
    shingleRed: tex(shingle(0xc8503a, 21)),
    shingleBlue: tex(shingle(0x4a6ab0, 22)),
    grass: {
      valley: tex(grass(0x7cc35a, 12, [0xffffff, 0xffe066, 0xff8fb1])),
      rocks: tex(grass(0xb5b05a, 13, [0xe0a040, 0xd06a3a])),
      ice: tex(grass(0xf2f7ff, 14, [0xdbe8fb])),
    },
    rockTop: {
      valley: tex(rock(15, 0x6db34e)),
      rocks: tex(rock(16, 0xa8a44e)),
      ice: tex(rock(17, 0xf4f8ff)),
    },
  };
  return T;
}
