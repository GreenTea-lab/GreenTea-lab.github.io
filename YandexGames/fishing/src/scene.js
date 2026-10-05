// Сцена рыбалки на canvas: небо по времени суток, погода, дальний берег пяти водоёмов, вода с отражением,
// мостки, рыбак (или рыбачка), удочка, леска, поплавок, рыба в борьбе, кот, утки, стрекозы, светлячки
import { LOCATIONS, rng } from './data.js';
import { drawFish } from './fishart.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

// ---------- цвета ----------
const hexCache = {};
function rgbOf(c) {
  if (hexCache[c]) return hexCache[c];
  let r;
  if (c[0] === '#') {
    const n = parseInt(c.slice(1), 16);
    r = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } else r = c.match(/[\d.]+/g).slice(0, 3).map(Number);
  return (hexCache[c] = r);
}
export function mix(a, b, k) {
  const A = rgbOf(a),
    B = rgbOf(b);
  return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`;
}
const rgba = (c, a) => {
  const A = rgbOf(c);
  return `rgba(${A[0]},${A[1]},${A[2]},${a})`;
};

const SKY = {
  morning: { top: '#86b3de', mid: '#f3c6ad', hz: '#ffe4bd', light: 0.9, sun: [0.22, 0.2], sunC: '#fff1c8', tint: ['#f0b090', 0.12] },
  day: { top: '#56a3e4', mid: '#a6d4f1', hz: '#e4f4fb', light: 1, sun: [0.72, 0.12], sunC: '#fffbe6', tint: null },
  evening: { top: '#4b5b9c', mid: '#e48c70', hz: '#ffc47c', light: 0.8, sun: [0.82, 0.3], sunC: '#ffd27a', tint: ['#5a3a5a', 0.25] },
  night: { top: '#0d1636', mid: '#202d58', hz: '#3a4673', light: 0.35, moon: [0.74, 0.14], tint: ['#0b1430', 0.72] },
};
const LAND = {
  village: ['#82ab6c', '#5d8f4e', '#3f7337'],
  river: ['#8db07a', '#6a9a58', '#4a7d3f'],
  forest: ['#7b98ab', '#3d6a4a', '#2a5238'],
  reservoir: ['#a3bca6', '#7a9f78', '#5a8a5a'],
  mountain: ['#8f9db4', '#6d8396', '#3e6448'],
};
const WATER = {
  village: ['#6fa59a', '#2f6a64'],
  river: ['#6aa0b6', '#2d6688'],
  forest: ['#5a8fa8', '#22506e'],
  reservoir: ['#64a2c8', '#285f8c'],
  mountain: ['#5fb3b2', '#24697a'],
};

export class Scene {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.loc = 0;
    this.part = 'day';
    this.weather = 'sun';
    this.char = 'm';
    this.t = 0;
    this.parts = [];
    this.ripples = [];
    this.float = null; // { x, y, st: air|water|nibble|bite|fight, k }
    this.fish = null; // { x, y, ang, sz, rush }
    this.jump = null; // прыжок пойманной рыбы
    this.pose = 'idle';
    this.tension = 0;
    this.castAnim = 0;
    this.cat = { on: false, k: 0, pet: 0 };
    this.bubbles = null; // { x, y, t }
    this.ducks = null;
    this.duckT = 8;
    this.jumpT = 4;
    this.dpr = 1;
    this.key = '';
  }

  resize(W, H, dpr) {
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.cv.width = Math.round(W * dpr);
    this.cv.height = Math.round(H * dpr);
    this.cv.style.width = W + 'px';
    this.cv.style.height = H + 'px';
    const port = W / H < 0.85;
    this.port = port;
    const L = (this.L = {});
    L.hz = Math.round(H * (port ? 0.34 : 0.42));
    L.S = port ? Math.min(W / 380, H / 700) : Math.min(W / 1280, H / 720) * 1.32;
    L.deckY = Math.round(H * (port ? 0.8 : 0.72));
    L.fx = Math.round(port ? W * 0.34 : W * 0.16);
    L.pierEnd = L.fx + 70 * L.S;
    L.nearY = Math.min(H - 30 * L.S, L.deckY + H * 0.1);
    L.farY = L.hz + H * 0.035;
    this._statics();
    this.key = '';
  }

  // перспектива: масштаб предмета на воде по высоте
  k(y) {
    const { hz } = this.L;
    return clamp(0.32 + 0.75 * ((y - hz) / (this.H - hz)), 0.3, 1.15);
  }
  // дальность заброса 0..1 по высоте точки
  dist(y) {
    const { nearY, farY } = this.L;
    return clamp((nearY - y) / (nearY - farY), 0, 1);
  }
  // точка заброса по касанию; reach — доля максимальной дальности
  castPoint(x, y, reach) {
    const { nearY, farY, pierEnd, S } = this.L;
    if (y < this.L.hz + 4) return null;
    const minY = nearY - reach * (nearY - farY);
    const ty = clamp(y, minY, nearY);
    const tx = clamp(x, pierEnd + 40 * S, this.W - 30 * S);
    return { x: tx, y: ty, d: this.dist(ty), clamped: y < minY };
  }

  setEnv(loc, part, weather, char) {
    this.loc = loc;
    this.part = part;
    this.weather = weather;
    if (char) this.char = char;
  }

  // ---------- статичные элементы: облака, блики, камыши ----------
  _statics() {
    const R = rng(77);
    this.clouds = [];
    for (let i = 0; i < 9; i++) this.clouds.push({ x: R(), y: 0.04 + R() * 0.22, s: 0.6 + R() * 0.8, v: 0.004 + R() * 0.006, seed: Math.floor(R() * 1000) });
    this.streaks = [];
    for (let i = 0; i < 90; i++) this.streaks.push({ x: R(), y: Math.pow(R(), 1.4), l: 0.3 + R() * 0.7, ph: R() * TAU });
    this.rain = [];
    for (let i = 0; i < 140; i++) this.rain.push({ x: R(), y: R(), v: 0.8 + R() * 0.5 });
    this.flies = [];
    for (let i = 0; i < 14; i++) this.flies.push({ x: R(), y: R(), ph: R() * TAU });
    this.birds = [];
    for (let i = 0; i < 4; i++) this.birds.push({ x: R(), y: 0.06 + R() * 0.12, ph: R() * TAU });
    this.drag = { x: 0.6, y: 0.85, tx: 0.7, ty: 0.8, t: 0 };
  }

  // цвет суши с учётом расстояния, времени и погоды
  tint(col, depth) {
    const P = SKY[this.part];
    let c = mix(col, P.hz, [0.06, 0.24, 0.45, 0][depth]);
    if (P.tint) c = mix(c, P.tint[0], P.tint[1] * (depth === 2 ? 0.8 : depth === 3 ? 0.55 : 1));
    if (this.weather === 'cloud') c = mix(c, '#7d8a94', 0.18);
    if (this.weather === 'rain') c = mix(c, '#6f7c88', 0.3);
    if (this.weather === 'fog') c = mix(c, this.part === 'night' ? '#4a5470' : '#dfe5e8', [0.3, 0.48, 0.65, 0.12][depth]);
    return c;
  }
  skyCols() {
    const P = SKY[this.part];
    let top = P.top,
      mid = P.mid,
      hz = P.hz;
    const w = this.weather;
    const g = this.part === 'night' ? '#2a3348' : '#a2adb8';
    const k = w === 'cloud' ? 0.38 : w === 'rain' ? 0.58 : w === 'fog' ? 0.5 : 0;
    if (k) {
      top = mix(top, g, k);
      mid = mix(mid, g, k * 0.9);
      hz = mix(hz, this.part === 'night' ? '#3a4458' : '#d8dee2', k);
    }
    return { top, mid, hz };
  }

  // ---------- фон: небо, светило, дальний берег, вода ----------
  _bg() {
    const key = [this.W, this.H, this.dpr, this.loc, this.part, this.weather].join('|');
    if (key === this.key) return;
    this.key = key;
    const { W, H, dpr } = this;
    const { hz, S } = this.L;
    const c = (this.bgc = this.bgc || document.createElement('canvas'));
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const P = SKY[this.part];
    const sc = this.skyCols();
    this.sunX = undefined;
    // небо
    const g = x.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, sc.top);
    g.addColorStop(0.62, sc.mid);
    g.addColorStop(1, sc.hz);
    x.fillStyle = g;
    x.fillRect(0, 0, W, hz + 2);
    // звёзды
    if (this.part === 'night' && this.weather !== 'rain') {
      const R = rng(5);
      for (let i = 0; i < 140; i++) {
        const sx = R() * W,
          sy = Math.pow(R(), 1.5) * hz * 0.85,
          r = 0.5 + R() * 1.3;
        x.fillStyle = `rgba(255,250,230,${(this.weather === 'sun' ? 0.5 : 0.22) + R() * 0.4})`;
        x.beginPath();
        x.arc(sx, sy, r, 0, TAU);
        x.fill();
      }
    }
    // солнце или луна
    const vis = this.weather === 'sun' ? 1 : this.weather === 'cloud' ? 0.45 : this.weather === 'fog' ? 0.35 : 0;
    if (P.sun && vis > 0) {
      const [sx, sy] = [P.sun[0] * W, P.sun[1] * H + (this.port ? 0 : 0)];
      const r = 46 * S;
      const glow = x.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 5);
      glow.addColorStop(0, rgba(P.sunC, 0.5 * vis));
      glow.addColorStop(1, rgba(P.sunC, 0));
      x.fillStyle = glow;
      x.fillRect(sx - r * 5, sy - r * 5, r * 10, r * 10);
      x.fillStyle = rgba(P.sunC, 0.95 * vis + 0.05);
      x.beginPath();
      x.arc(sx, sy, r, 0, TAU);
      x.fill();
      this.sunX = sx;
    } else if (P.moon && vis > 0) {
      const [mx, my] = [P.moon[0] * W, P.moon[1] * H];
      const r = 30 * S;
      const glow = x.createRadialGradient(mx, my, r, mx, my, r * 5);
      glow.addColorStop(0, `rgba(220,230,255,${0.3 * vis})`);
      glow.addColorStop(1, 'rgba(220,230,255,0)');
      x.fillStyle = glow;
      x.fillRect(mx - r * 5, my - r * 5, r * 10, r * 10);
      x.fillStyle = `rgba(250,246,225,${0.6 * vis + 0.25})`;
      x.beginPath();
      x.arc(mx, my, r, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(200,196,170,.35)';
      for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.35, 0.12]]) {
        x.beginPath();
        x.arc(mx + dx * r, my + dy * r, rr * r, 0, TAU);
        x.fill();
      }
      this.sunX = mx;
    }
    // дальний берег
    this.shoreTop = hz;
    this._shore(x);
    // вода
    const kind = LOCATIONS[this.loc].kind;
    const WC = WATER[kind];
    let w0 = mix(WC[0], sc.hz, 0.35),
      w1 = WC[1];
    if (P.tint) {
      w0 = mix(w0, P.tint[0], P.tint[1] * 0.8);
      w1 = mix(w1, P.tint[0], P.tint[1]);
    }
    if (this.weather === 'rain' || this.weather === 'cloud') {
      w0 = mix(w0, '#7d8a94', 0.25);
      w1 = mix(w1, '#3d4a54', 0.2);
    }
    this.waterTop = w0;
    const wg = x.createLinearGradient(0, hz, 0, H);
    wg.addColorStop(0, w0);
    wg.addColorStop(1, w1);
    x.fillStyle = wg;
    x.fillRect(0, hz, W, H - hz);
    // отражение берега — отдельный холст (рисуется полосками с колыханием)
    const band = Math.round(Math.min(hz - this.shoreTop + 4, (H - hz) * 0.42));
    const rc = (this.rfl = this.rfl || document.createElement('canvas'));
    rc.width = Math.round(W * dpr);
    rc.height = Math.max(1, Math.round(band * dpr));
    const rx = rc.getContext('2d');
    rx.setTransform(1, 0, 0, -1, 0, rc.height);
    rx.drawImage(c, 0, this.shoreTop * dpr, c.width, band * dpr, 0, 0, c.width, band * dpr);
    rx.setTransform(1, 0, 0, 1, 0, 0);
    rx.globalCompositeOperation = 'source-atop';
    rx.fillStyle = rgba(w0, 0.3);
    rx.fillRect(0, 0, rc.width, rc.height);
    // плавно растворяем к низу, чтобы не было границы
    rx.globalCompositeOperation = 'destination-out';
    const fade = rx.createLinearGradient(0, 0, 0, rc.height);
    fade.addColorStop(0, 'rgba(0,0,0,.15)');
    fade.addColorStop(0.55, 'rgba(0,0,0,.6)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    rx.fillStyle = fade;
    rx.fillRect(0, 0, rc.width, rc.height);
    rx.globalCompositeOperation = 'source-over';
    this.band = band;
  }

  // силуэт холмов по шуму
  _hills(x, base, amp, col, seed, freq, top) {
    const { W } = this;
    const R = rng(seed);
    const ph = [R() * 10, R() * 10, R() * 10];
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(0, base);
    let minY = base;
    for (let i = 0; i <= 64; i++) {
      const u = i / 64;
      const y = base - amp * (0.55 + 0.25 * Math.sin(u * freq * 6.3 + ph[0]) + 0.15 * Math.sin(u * freq * 13 + ph[1]) + 0.05 * Math.sin(u * freq * 29 + ph[2]));
      if (top && i % 16 === 8) top.push([u * W, y]);
      minY = Math.min(minY, y);
      x.lineTo(u * W, y);
    }
    x.lineTo(W, base + 2);
    x.lineTo(0, base + 2);
    x.closePath();
    x.fill();
    this.shoreTop = Math.min(this.shoreTop, minY);
  }

  _shore(x) {
    const { W, H } = this;
    const { hz, S } = this.L;
    const kind = LOCATIONS[this.loc].kind;
    const C = LAND[kind];
    const R = rng(this.loc * 101 + 3);
    const night = this.part === 'night';
    const u = H * 0.01;
    if (kind === 'mountain') {
      // горы со снегом
      const peaks = [];
      const base = hz;
      x.fillStyle = this.tint(C[0], 2);
      x.beginPath();
      x.moveTo(0, base);
      const pts = [];
      for (let i = 0; i <= 7; i++) {
        const px = (i / 7) * W + (R() - 0.5) * W * 0.06;
        const py = hz - (this.port ? 0.11 : 0.2) * H - R() * H * 0.1;
        pts.push([px, py]);
        const vx = px + W / 14 + (R() - 0.5) * W * 0.03;
        pts.push([vx, hz - H * 0.07 - R() * H * 0.05]);
      }
      for (const [px, py] of pts) x.lineTo(px, py);
      x.lineTo(W, base);
      x.closePath();
      x.fill();
      // снег
      x.fillStyle = this.tint('#f4f7fb', 2);
      for (let i = 0; i < pts.length; i += 2) {
        const [px, py] = pts[i];
        const d = H * 0.035;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px + d * 0.9, py + d);
        x.lineTo(px + d * 0.35, py + d * 0.75);
        x.lineTo(px, py + d * 1.05);
        x.lineTo(px - d * 0.4, py + d * 0.7);
        x.lineTo(px - d * 0.9, py + d);
        x.closePath();
        x.fill();
        peaks.push(py);
      }
      this.shoreTop = Math.min(...peaks);
      this._hills(x, hz, H * 0.06, this.tint(C[1], 1), 41, 2.2);
      // ели
      const fir = this.tint('#2d5a3e', 0);
      for (let i = 0; i < 46; i++) {
        const fx = R() * W,
          h = (14 + R() * 18) * S;
        this._fir(x, fx, hz + 1, h, fir);
      }
      // камни у воды
      x.fillStyle = this.tint('#8a8f94', 0);
      for (let i = 0; i < 7; i++) {
        const rx = R() * W;
        x.beginPath();
        x.ellipse(rx, hz + 1, (8 + R() * 10) * S, (4 + R() * 4) * S, 0, Math.PI, 0);
        x.fill();
      }
      // палатка и костёр
      const tx = W * (this.port ? 0.7 : 0.62);
      x.fillStyle = this.tint('#e8823a', 0);
      x.beginPath();
      x.moveTo(tx - 16 * S, hz);
      x.lineTo(tx, hz - 18 * S);
      x.lineTo(tx + 16 * S, hz);
      x.closePath();
      x.fill();
      x.fillStyle = this.tint('#7a3a1a', 0);
      x.beginPath();
      x.moveTo(tx - 4 * S, hz);
      x.lineTo(tx, hz - 10 * S);
      x.lineTo(tx + 4 * S, hz);
      x.fill();
      this.fire = [tx + 26 * S, hz - 2 * S];
      return;
    }
    // дальние холмы и средний план
    this._hills(x, hz, H * (kind === 'reservoir' ? 0.04 : kind === 'forest' ? 0.12 : 0.08), this.tint(C[0], 2), this.loc * 7 + 1, 1.3);
    if (kind !== 'reservoir') this._hills(x, hz, H * (kind === 'forest' ? 0.07 : 0.045), this.tint(C[1], 1), this.loc * 7 + 2, 2.1);
    const near = this.tint(C[2], 0);
    if (kind === 'forest') {
      // плотный ельник
      for (let i = 0; i < 70; i++) {
        const fx = (i / 70) * W + (R() - 0.5) * 20 * S,
          h = (22 + R() * 30) * S;
        this._fir(x, fx, hz + 1, h, this.tint(R() < 0.5 ? '#244a33' : '#2d5a3a', 0));
      }
      for (let i = 0; i < 6; i++) this._birch(x, R() * W, hz + 1, (30 + R() * 14) * S, night);
      // банька с дымком
      const bx = W * (this.port ? 0.58 : 0.66);
      this._house(x, bx, hz, 26 * S, '#7a5236', '#5a6a4a', night, R);
      this.smoke = [[bx + 8 * S, hz - 30 * S]];
    } else if (kind === 'village') {
      // лиственный лес, берёзы, избы
      for (let i = 0; i < 40; i++) {
        const tx = (i / 40) * W + (R() - 0.5) * 30 * S,
          r = (10 + R() * 12) * S;
        this._blobTree(x, tx, hz + 1, r, this.tint(R() < 0.5 ? '#3f7337' : '#4c8240', 0));
      }
      for (let i = 0; i < 9; i++) this._birch(x, R() * W, hz + 1, (34 + R() * 18) * S, night);
      this.smoke = [];
      const hs = this.port ? [0.42, 0.6, 0.82] : [0.36, 0.48, 0.6, 0.78];
      const roofs = ['#b5463a', '#3e7a8a', '#6c8a3a', '#a5683a'];
      hs.forEach((p, i) => {
        const hx = W * p,
          sz = (22 + R() * 6) * S;
        this._house(x, hx, hz, sz, '#8a5a3a', roofs[i % 4], night, R);
        if (i % 2 === 0) this.smoke.push([hx + sz * 0.3, hz - sz * 1.45]);
      });
      // забор
      x.strokeStyle = this.tint('#7a5a3a', 0);
      x.lineWidth = 1.5 * S;
      x.beginPath();
      for (let fx = W * hs[0] - 40 * S; fx < W * hs[hs.length - 1] + 40 * S; fx += 6 * S) {
        x.moveTo(fx, hz);
        x.lineTo(fx, hz - 7 * S);
      }
      x.moveTo(W * hs[0] - 40 * S, hz - 5 * S);
      x.lineTo(W * hs[hs.length - 1] + 40 * S, hz - 5 * S);
      x.stroke();
    } else if (kind === 'river') {
      // ивы, церковь с куполом, стог
      for (let i = 0; i < 26; i++) {
        const tx = (i / 26) * W + (R() - 0.5) * 30 * S;
        this._willow(x, tx, hz + 1, (18 + R() * 12) * S, this.tint(R() < 0.5 ? '#5a8a42' : '#6b9a4c', 0));
      }
      const cx = W * (this.port ? 0.62 : 0.56);
      this._church(x, cx, hz, 44 * S, night);
      this._stack(x, W * (this.port ? 0.3 : 0.38), hz, 16 * S);
      this._stack(x, W * (this.port ? 0.36 : 0.42), hz, 12 * S);
      this.smoke = [];
    } else if (kind === 'reservoir') {
      // тополя, маяк, далёкая плотина
      for (let i = 0; i < 30; i++) {
        const tx = R() * W,
          h = (20 + R() * 16) * S;
        x.fillStyle = this.tint(R() < 0.5 ? '#4f7f4f' : '#5d8d58', 0);
        x.beginPath();
        x.ellipse(tx, hz - h * 0.5, h * 0.18, h * 0.55, 0, 0, TAU);
        x.fill();
      }
      // маяк
      const lx = W * (this.port ? 0.78 : 0.72);
      const lh = 52 * S;
      x.fillStyle = this.tint('#f2f0ea', 0);
      x.beginPath();
      x.moveTo(lx - 7 * S, hz);
      x.lineTo(lx - 4.5 * S, hz - lh);
      x.lineTo(lx + 4.5 * S, hz - lh);
      x.lineTo(lx + 7 * S, hz);
      x.fill();
      x.fillStyle = this.tint('#d0453a', 0);
      for (let i = 0; i < 3; i++) x.fillRect(lx - 6.5 * S + i * 0.6 * S, hz - lh * (0.22 + i * 0.28), 13 * S - i * 1.2 * S, lh * 0.12);
      x.fillStyle = night ? '#ffe9a0' : this.tint('#3a4a5a', 0);
      x.fillRect(lx - 4 * S, hz - lh - 7 * S, 8 * S, 7 * S);
      x.fillStyle = this.tint('#d0453a', 0);
      x.beginPath();
      x.moveTo(lx - 6 * S, hz - lh - 7 * S);
      x.lineTo(lx, hz - lh - 13 * S);
      x.lineTo(lx + 6 * S, hz - lh - 7 * S);
      x.fill();
      this.beacon = night ? [lx, hz - lh - 3.5 * S] : null;
      this.shoreTop = Math.min(this.shoreTop, hz - lh - 14 * S);
      // плотина
      x.fillStyle = this.tint('#b9bcb8', 1);
      x.fillRect(W * 0.04, hz - 7 * S, W * 0.2, 7 * S);
      x.strokeStyle = this.tint('#8a8f8a', 1);
      x.lineWidth = 1 * S;
      for (let i = 0; i < 9; i++) {
        const dx = W * 0.04 + (i * W * 0.2) / 8;
        x.beginPath();
        x.moveTo(dx, hz - 7 * S);
        x.lineTo(dx, hz);
        x.stroke();
      }
      this.smoke = [];
    }
    // полоска берега у воды
    x.fillStyle = mix(near, '#000000', 0.12);
    x.fillRect(0, hz - 1, W, 2.5 * S);
  }

  _fir(x, fx, base, h, col) {
    x.fillStyle = col;
    for (let k = 0; k < 3; k++) {
      const w = h * (0.42 - k * 0.1);
      const y0 = base - h * (0.1 + k * 0.28);
      x.beginPath();
      x.moveTo(fx - w, y0 + h * 0.08);
      x.lineTo(fx, y0 - h * 0.45);
      x.lineTo(fx + w, y0 + h * 0.08);
      x.closePath();
      x.fill();
    }
  }
  _blobTree(x, tx, base, r, col) {
    x.fillStyle = col;
    x.beginPath();
    x.arc(tx, base - r * 0.9, r, 0, TAU);
    x.arc(tx - r * 0.7, base - r * 0.5, r * 0.7, 0, TAU);
    x.arc(tx + r * 0.7, base - r * 0.55, r * 0.75, 0, TAU);
    x.fill();
  }
  _birch(x, bx, base, h, night) {
    const S = this.L.S;
    x.strokeStyle = this.tint('#f2efe6', 0);
    x.lineWidth = 2.4 * S;
    x.beginPath();
    x.moveTo(bx, base);
    x.lineTo(bx + 1 * S, base - h);
    x.stroke();
    x.fillStyle = this.tint('#3a3a32', 0);
    for (let i = 1; i < 5; i++) x.fillRect(bx - 1 * S, base - h * (i / 5.2), 2.4 * S, 1.1 * S);
    x.fillStyle = this.tint('#8fbf5a', 0);
    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.ellipse(bx + (i - 2) * 3 * S, base - h * (0.62 + (i % 2) * 0.18), 6 * S, 9 * S, 0, 0, TAU);
      x.fill();
    }
  }
  _willow(x, tx, base, r, col) {
    x.fillStyle = col;
    x.beginPath();
    x.ellipse(tx, base - r * 0.9, r * 1.1, r * 0.95, 0, 0, TAU);
    x.fill();
    x.strokeStyle = col;
    x.lineWidth = 2.2 * this.L.S;
    for (let i = -3; i <= 3; i++) {
      x.beginPath();
      x.moveTo(tx + i * r * 0.3, base - r * 0.9);
      x.quadraticCurveTo(tx + i * r * 0.36, base - r * 0.3, tx + i * r * 0.33, base);
      x.stroke();
    }
  }
  _house(x, hx, base, sz, wall, roof, night, R) {
    const S = this.L.S;
    x.fillStyle = this.tint(wall, 0);
    x.fillRect(hx - sz * 0.55, base - sz * 0.8, sz * 1.1, sz * 0.8);
    x.strokeStyle = this.tint('#5e3a22', 0);
    x.lineWidth = 0.8 * S;
    for (let i = 1; i < 5; i++) {
      x.beginPath();
      x.moveTo(hx - sz * 0.55, base - sz * 0.16 * i);
      x.lineTo(hx + sz * 0.55, base - sz * 0.16 * i);
      x.stroke();
    }
    x.fillStyle = this.tint(roof, 0);
    x.beginPath();
    x.moveTo(hx - sz * 0.72, base - sz * 0.76);
    x.lineTo(hx, base - sz * 1.35);
    x.lineTo(hx + sz * 0.72, base - sz * 0.76);
    x.closePath();
    x.fill();
    // труба
    x.fillStyle = this.tint('#8a6a5a', 0);
    x.fillRect(hx + sz * 0.22, base - sz * 1.42, sz * 0.14, sz * 0.4);
    // окно
    x.fillStyle = night ? '#ffd56a' : this.tint('#9ec8e0', 0);
    x.fillRect(hx - sz * 0.18, base - sz * 0.6, sz * 0.36, sz * 0.3);
    x.strokeStyle = this.tint('#f2eadc', 0);
    x.lineWidth = 1.2 * S;
    x.strokeRect(hx - sz * 0.18, base - sz * 0.6, sz * 0.36, sz * 0.3);
    if (night) {
      const g = x.createRadialGradient(hx, base - sz * 0.45, 0, hx, base - sz * 0.45, sz * 1.2);
      g.addColorStop(0, 'rgba(255,210,110,.35)');
      g.addColorStop(1, 'rgba(255,210,110,0)');
      x.fillStyle = g;
      x.fillRect(hx - sz * 1.2, base - sz * 1.6, sz * 2.4, sz * 1.8);
    }
    this.shoreTop = Math.min(this.shoreTop, base - sz * 1.42);
  }
  _church(x, cx, base, h, night) {
    const S = this.L.S;
    const w = this.tint('#f4efe4', 0);
    x.fillStyle = w;
    x.fillRect(cx - h * 0.35, base - h * 0.55, h * 0.7, h * 0.55);
    x.fillRect(cx - h * 0.16, base - h * 0.95, h * 0.32, h * 0.42);
    // купол-луковка
    const gold = this.tint('#e8b83a', 0);
    x.fillStyle = gold;
    x.beginPath();
    x.moveTo(cx - h * 0.16, base - h * 0.95);
    x.bezierCurveTo(cx - h * 0.26, base - h * 1.12, cx - h * 0.04, base - h * 1.2, cx, base - h * 1.32);
    x.bezierCurveTo(cx + h * 0.04, base - h * 1.2, cx + h * 0.26, base - h * 1.12, cx + h * 0.16, base - h * 0.95);
    x.closePath();
    x.fill();
    x.strokeStyle = gold;
    x.lineWidth = 1.4 * S;
    x.beginPath();
    x.moveTo(cx, base - h * 1.32);
    x.lineTo(cx, base - h * 1.46);
    x.moveTo(cx - h * 0.05, base - h * 1.41);
    x.lineTo(cx + h * 0.05, base - h * 1.41);
    x.stroke();
    x.fillStyle = night ? '#ffd56a' : this.tint('#6a7f8f', 0);
    for (const dx of [-0.2, 0, 0.2]) x.fillRect(cx + dx * h - h * 0.04, base - h * 0.42, h * 0.08, h * 0.16);
    x.fillStyle = this.tint('#5a8aa0', 0);
    x.beginPath();
    x.moveTo(cx - h * 0.4, base - h * 0.55);
    x.lineTo(cx, base - h * 0.7);
    x.lineTo(cx + h * 0.4, base - h * 0.55);
    x.fill();
    this.shoreTop = Math.min(this.shoreTop, base - h * 1.47);
  }
  _stack(x, sx, base, r) {
    x.fillStyle = this.tint('#d8b860', 0);
    x.beginPath();
    x.ellipse(sx, base, r, r * 1.2, 0, Math.PI, 0);
    x.fill();
  }

  // ---------- облака ----------
  _cloud(x, cx, cy, s, dark) {
    const sc = this.skyCols();
    const base = this.part === 'night' ? '#4a5578' : dark ? '#9aa5ae' : '#ffffff';
    const col = mix(base, sc.hz, this.part === 'evening' ? 0.4 : 0.15);
    x.fillStyle = rgba(col, this.part === 'night' ? 0.55 : 0.92);
    const r = 26 * s * this.L.S;
    x.beginPath();
    x.arc(cx, cy, r, 0, TAU);
    x.arc(cx + r * 1.1, cy + r * 0.2, r * 0.8, 0, TAU);
    x.arc(cx - r * 1.1, cy + r * 0.25, r * 0.7, 0, TAU);
    x.arc(cx + r * 0.4, cy - r * 0.45, r * 0.7, 0, TAU);
    x.fill();
    x.fillRect(cx - r * 1.6, cy + r * 0.2, r * 3.4, r * 0.75);
    x.fillStyle = rgba('#000000', 0.04);
    x.fillRect(cx - r * 1.6, cy + r * 0.7, r * 3.4, r * 0.25);
  }

  // ---------- эффекты ----------
  splash(x, y, s = 1) {
    const k = this.k(y) * s;
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = (90 + Math.random() * 130) * k * this.L.S;
      this.parts.push({ t: 'drop', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, r: (1.6 + Math.random() * 2) * k * this.L.S });
    }
    this.ripple(x, y, s * 1.4);
  }
  ripple(x, y, s = 1) {
    this.ripples.push({ x, y, r: 2, s: s * this.k(y), life: 1.4, max: 1.4 });
  }
  hearts(x, y) {
    for (let i = 0; i < 5; i++) this.parts.push({ t: 'heart', x: x + (Math.random() - 0.5) * 30 * this.L.S, y, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, life: 1.4, max: 1.4, r: (6 + Math.random() * 4) * this.L.S });
  }
  sparkle(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU,
        v = (40 + Math.random() * 120) * this.L.S;
      this.parts.push({ t: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9, max: 0.9, r: (2 + Math.random() * 3) * this.L.S });
    }
  }

  // ---------- кадр ----------
  draw(dt) {
    this.t += dt;
    this._bg();
    const { ctx: x, W, H, dpr } = this;
    const { hz, S } = this.L;
    const t = this.t;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.drawImage(this.bgc, 0, 0);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    // облака
    const nC = { sun: 3, cloud: 7, rain: 9, fog: 3 }[this.weather];
    x.save();
    x.beginPath();
    x.rect(0, 0, W, hz - 2);
    x.clip();
    for (let i = 0; i < nC; i++) {
      const c = this.clouds[i];
      const cx = (((c.x + t * c.v * 0.2) % 1.3) - 0.15) * W;
      this._cloud(x, cx, c.y * hz * 1.6, c.s * (this.port ? 0.8 : 1), this.weather === 'rain');
    }
    // птицы
    if (this.part !== 'night' && this.weather !== 'rain') {
      x.strokeStyle = this.loc === 3 ? 'rgba(255,255,255,.85)' : 'rgba(40,40,50,.55)';
      x.lineWidth = 1.6 * S;
      for (const b of this.birds) {
        const bx = ((b.x + t * 0.012) % 1.2) * W - W * 0.1,
          by = b.y * hz * 1.4 + Math.sin(t * 0.7 + b.ph) * 6 * S;
        const f = Math.sin(t * 6 + b.ph) * 3 * S;
        x.beginPath();
        x.moveTo(bx - 7 * S, by - f);
        x.quadraticCurveTo(bx - 3 * S, by - 4 * S, bx, by);
        x.quadraticCurveTo(bx + 3 * S, by - 4 * S, bx + 7 * S, by - f);
        x.stroke();
      }
    }
    x.restore();
    // дым из труб и костёр
    if (this.smoke && this.smoke.length) {
      for (const [sx, sy] of this.smoke)
        for (let i = 0; i < 6; i++) {
          const k = ((t * 0.25 + i / 6) % 1);
          x.fillStyle = `rgba(230,230,235,${0.35 * (1 - k)})`;
          x.beginPath();
          x.arc(sx + Math.sin(k * 4 + i) * 4 * S + k * 14 * S, sy - k * 40 * S, (3 + k * 8) * S, 0, TAU);
          x.fill();
        }
    }
    if (this.loc === 4 && this.fire) {
      const [fx, fy] = this.fire;
      const fl = 0.8 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.3) * 0.1;
      x.fillStyle = 'rgba(255,170,60,.9)';
      x.beginPath();
      x.moveTo(fx - 4 * S, fy);
      x.quadraticCurveTo(fx, fy - 12 * S * fl, fx + 4 * S, fy);
      x.fill();
      if (this.part === 'night' || this.part === 'evening') {
        const g = x.createRadialGradient(fx, fy, 0, fx, fy, 30 * S);
        g.addColorStop(0, 'rgba(255,170,80,.35)');
        g.addColorStop(1, 'rgba(255,170,80,0)');
        x.fillStyle = g;
        x.fillRect(fx - 30 * S, fy - 30 * S, 60 * S, 60 * S);
      }
    }
    if (this.beacon && Math.sin(t * 2) > 0.2) {
      const [bx, by] = this.beacon;
      const g = x.createRadialGradient(bx, by, 0, bx, by, 24 * S);
      g.addColorStop(0, 'rgba(255,240,170,.8)');
      g.addColorStop(1, 'rgba(255,240,170,0)');
      x.fillStyle = g;
      x.fillRect(bx - 24 * S, by - 24 * S, 48 * S, 48 * S);
    }
    // отражение берега с колыханием
    const band = this.band;
    const rflH = band * 0.9;
    const strip = 3;
    for (let yy = 0; yy < rflH; yy += strip) {
      const off = Math.sin(t * 1.6 + yy * 0.25) * (0.6 + yy * 0.05) * S;
      x.drawImage(this.rfl, 0, yy * dpr, this.rfl.width, strip * dpr, off, hz + yy, W, strip);
    }
    // течение и рябь
    const flow = this.loc === 1 || this.loc === 4 ? 0.03 : 0.006;
    const P = SKY[this.part];
    const bright = this.part === 'night' ? 'rgba(200,215,255,' : 'rgba(255,255,255,';
    x.lineCap = 'round';
    for (const s of this.streaks) {
      const yy = hz + 6 + s.y * (H - hz - 6);
      const kk = this.k(yy);
      const xx = (((s.x + t * flow * (0.5 + kk)) % 1.1) - 0.05) * W;
      const a = (0.1 + 0.12 * Math.sin(t * 1.3 + s.ph)) * P.light;
      x.strokeStyle = bright + a.toFixed(3) + ')';
      x.lineWidth = Math.max(1, 1.6 * kk * S);
      x.beginPath();
      x.moveTo(xx, yy);
      x.lineTo(xx + s.l * 40 * kk * S, yy);
      x.stroke();
    }
    // дорожка солнца или луны
    if (this.sunX !== undefined && (this.weather === 'sun' || this.weather === 'cloud')) {
      const col = this.part === 'night' ? 'rgba(240,240,210,' : this.part === 'day' ? 'rgba(255,255,240,' : 'rgba(255,215,140,';
      for (let i = 0; i < 26; i++) {
        const k = i / 26;
        const yy = hz + 4 + k * (H - hz) * 0.55;
        const w = (8 + k * 60) * S * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7));
        x.strokeStyle = col + ((0.5 - k * 0.4) * (this.weather === 'sun' ? 1 : 0.4)).toFixed(3) + ')';
        x.lineWidth = Math.max(1, (1 + k * 2.5) * S);
        x.beginPath();
        x.moveTo(this.sunX - w / 2 + Math.sin(i * 3.1 + t) * 6 * S, yy);
        x.lineTo(this.sunX + w / 2 + Math.sin(i * 3.1 + t) * 6 * S, yy);
        x.stroke();
      }
    }
    this._waterLife(x, dt);
    this._floatAndFish(x, dt);
    if (!this.noFisher) {
      this._pier(x);
      this._fisher(x, dt);
    }
    this.extra && this.extra(x, this);
    this._fore(x, dt);
    this._particles(x, dt);
    this._weatherFx(x, dt);
  }

  // утки, всплески рыбы, пузыри, кувшинки
  _waterLife(x, dt) {
    const { W, H, t } = this;
    const { hz, S } = this.L;
    // кувшинки (пруд и лесное озеро)
    if (this.loc === 0 || this.loc === 2) {
      const R = rng(this.loc + 9);
      for (let i = 0; i < 9; i++) {
        const lx = W * (0.55 + R() * 0.45),
          ly = hz + (H - hz) * (0.25 + R() * 0.7);
        const k = this.k(ly);
        const r = (13 + R() * 9) * k * S;
        x.fillStyle = this.tint(R() < 0.5 ? '#4f8f3e' : '#5d9a48', 0);
        x.beginPath();
        x.ellipse(lx, ly + Math.sin(t + i) * 0.8 * S, r, r * 0.38, 0, 0.35, TAU - 0.05);
        x.lineTo(lx, ly);
        x.fill();
        if (i % 3 === 0) {
          x.fillStyle = this.part === 'night' ? '#d8d0e8' : '#fff4f8';
          x.beginPath();
          for (let p = 0; p < 6; p++) {
            const a = (p / 6) * TAU;
            x.ellipse(lx + Math.cos(a) * r * 0.18, ly - r * 0.18 + Math.sin(a) * r * 0.06, r * 0.16, r * 0.08, a, 0, TAU);
          }
          x.fill();
          x.fillStyle = '#f5c83a';
          x.beginPath();
          x.arc(lx, ly - r * 0.2, r * 0.07, 0, TAU);
          x.fill();
        }
      }
    }
    // парусник на водохранилище
    if (this.loc === 3) {
      const yy = hz + (H - hz) * 0.06,
        k = this.k(yy),
        xx = (((t * 0.004 + 0.3) % 1.2) - 0.1) * W,
        bob = Math.sin(t * 1.3) * 1 * S;
      x.fillStyle = this.tint('#7a4a3a', 0);
      x.beginPath();
      x.moveTo(xx - 16 * k * S, yy + bob);
      x.lineTo(xx + 16 * k * S, yy + bob);
      x.lineTo(xx + 11 * k * S, yy + 5 * k * S + bob);
      x.lineTo(xx - 11 * k * S, yy + 5 * k * S + bob);
      x.fill();
      x.fillStyle = this.tint('#f6f2e8', 0);
      x.beginPath();
      x.moveTo(xx, yy - 34 * k * S + bob);
      x.lineTo(xx + 14 * k * S, yy - 3 * k * S + bob);
      x.lineTo(xx, yy - 3 * k * S + bob);
      x.fill();
      x.fillStyle = this.tint('#e8c25a', 0);
      x.beginPath();
      x.moveTo(xx - 2 * k * S, yy - 28 * k * S + bob);
      x.lineTo(xx - 2 * k * S, yy - 3 * k * S + bob);
      x.lineTo(xx - 13 * k * S, yy - 3 * k * S + bob);
      x.fill();
    }
    // утки: мама и утята
    if (this.part !== 'night') {
      this.duckT -= dt;
      if (!this.ducks && this.duckT < 0) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.ducks = { x: dir > 0 ? -0.1 : 1.1, dir, y: 0.1 + Math.random() * 0.12 };
      }
      if (this.ducks) {
        const D = this.ducks;
        D.x += D.dir * dt * 0.018;
        const yy = hz + (H - hz) * D.y;
        const k = this.k(yy);
        for (let i = 0; i < 4; i++) this._duck(x, (D.x - D.dir * i * 0.035) * W, yy + Math.sin(t * 2 + i) * 0.6, k * S * (i ? 0.6 : 1), D.dir, t + i);
        if (D.x < -0.25 || D.x > 1.25) {
          this.ducks = null;
          this.duckT = 30 + Math.random() * 40;
        }
      }
    }
    // всплески рыбы вдали
    this.jumpT -= dt;
    if (this.jumpT < 0) {
      this.jumpT = 5 + Math.random() * 9;
      const yy = hz + (H - hz) * (0.08 + Math.random() * 0.4);
      this.splash(W * (0.35 + Math.random() * 0.6), yy, 0.5);
    }
    // пузыри — хорошее место
    const B = this.bubbles;
    if (B) {
      const k = this.k(B.y);
      x.strokeStyle = 'rgba(255,255,255,.75)';
      x.lineWidth = 1.3 * S;
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.8 + i * 0.37) % 1;
        const bx = B.x + Math.sin(i * 2.3 + t) * 16 * k * S,
          by = B.y + Math.cos(i * 1.7) * 6 * k * S;
        x.beginPath();
        x.arc(bx, by - ph * 3 * S, (1.5 + ph * 3.5) * k * S, 0, TAU);
        x.stroke();
      }
      const pr = (t * 0.6) % 1;
      x.strokeStyle = `rgba(255,255,255,${0.5 * (1 - pr)})`;
      x.beginPath();
      x.ellipse(B.x, B.y, (10 + pr * 34) * k * S, (3 + pr * 10) * k * S, 0, 0, TAU);
      x.stroke();
    }
    // круги на воде
    for (const r of this.ripples) {
      r.life -= dt;
      r.r += dt * 26 * r.s * S;
      const a = Math.max(0, r.life / r.max);
      x.strokeStyle = `rgba(255,255,255,${0.55 * a})`;
      x.lineWidth = 1.4 * S;
      x.beginPath();
      x.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, TAU);
      x.stroke();
    }
    this.ripples = this.ripples.filter((r) => r.life > 0);
  }

  _duck(x, dx, dy, s, dir, t) {
    x.save();
    x.translate(dx, dy);
    x.scale(dir * s, s);
    const body = this.part === 'evening' ? '#9a7a5a' : '#a8875a';
    x.fillStyle = body;
    x.beginPath();
    x.ellipse(0, -5, 12, 6, 0, 0, TAU);
    x.fill();
    x.beginPath();
    x.moveTo(-10, -6);
    x.lineTo(-15, -11);
    x.lineTo(-8, -9);
    x.fill();
    x.fillStyle = '#4a6a3a';
    x.beginPath();
    x.arc(9, -13 + Math.sin(t * 2) * 0.6, 4.5, 0, TAU);
    x.fill();
    x.fillStyle = '#f0a020';
    x.beginPath();
    x.moveTo(13, -13);
    x.lineTo(18, -12);
    x.lineTo(13, -11);
    x.fill();
    x.fillStyle = '#111';
    x.beginPath();
    x.arc(10.5, -14, 0.9, 0, TAU);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,.4)';
    x.lineWidth = 1;
    x.beginPath();
    x.ellipse(0, 0, 15, 2.5, 0, 0, TAU);
    x.stroke();
    x.restore();
  }

  // поплавок, леска, рыба в борьбе, прыжок пойманной рыбы
  _floatAndFish(x, dt) {
    const F = this.float;
    const { S } = this.L;
    const t = this.t;
    if (this.fish && this.fish.show) {
      const f = this.fish;
      const k = this.k(f.y);
      drawFish(x, f.id, f.x - Math.cos(f.ang) * 14 * k * S, f.y + 12 * k * S, f.sz * k * S, { sil: 'rgba(14,30,40,.42)', flip: Math.cos(f.ang) < 0, wig: Math.sin(t * 9) * 0.6, rot: Math.sin(f.ang) * 0.2 });
    }
    if (!F) return;
    const k = this.k(F.y);
    let fy = F.y;
    let sub = 0; // насколько притоплен
    let tilt = 0;
    if (F.st === 'air') {
      fy = F.y;
    } else if (F.st === 'water') {
      fy += Math.sin(t * 2.4) * 1.2 * k * S;
    } else if (F.st === 'nibble') {
      const p = F.p || 0;
      sub = Math.sin(p * Math.PI) * 0.45;
      tilt = Math.sin(p * 9) * 0.25;
    } else if (F.st === 'bite') {
      sub = 0.85 + Math.sin(t * 9) * 0.08;
      tilt = Math.sin(t * 5) * 0.3;
    } else if (F.st === 'fight') {
      sub = 0.6 + Math.sin(t * 7) * 0.2;
      tilt = 0.6 + Math.sin(t * 6) * 0.25;
    }
    const s = 1.9 * k * S;
    x.save();
    x.translate(F.x, fy);
    x.rotate(tilt);
    // поплавок: клип по уровню воды
    if (F.st !== 'air') {
      x.beginPath();
      x.rect(-30 * s, -60 * s, 60 * s, 60 * s);
      x.clip();
    }
    x.translate(0, sub * 22 * s);
    x.fillStyle = '#3a2a1a';
    x.fillRect(-0.8 * s, -26 * s, 1.6 * s, 10 * s);
    // ночью на антенне светится «светлячок»
    if (this.part === 'night' || this.part === 'evening' || this.weather === 'fog') {
      const gl = x.createRadialGradient(0, -27 * s, 0, 0, -27 * s, 14 * s);
      gl.addColorStop(0, 'rgba(180,255,120,.95)');
      gl.addColorStop(0.3, 'rgba(160,255,100,.45)');
      gl.addColorStop(1, 'rgba(160,255,100,0)');
      x.fillStyle = gl;
      x.fillRect(-14 * s, -41 * s, 28 * s, 28 * s);
      x.fillStyle = '#eaffc0';
      x.beginPath();
      x.arc(0, -27 * s, 2.4 * s, 0, TAU);
      x.fill();
    }
    x.fillStyle = '#e4382c';
    x.beginPath();
    x.ellipse(0, -12 * s, 5.2 * s, 7.5 * s, 0, Math.PI, 0);
    x.lineTo(5.2 * s, -9 * s);
    x.lineTo(-5.2 * s, -9 * s);
    x.fill();
    x.fillStyle = '#f7f3ea';
    x.fillRect(-5.2 * s, -9.5 * s, 10.4 * s, 4 * s);
    x.fillStyle = '#e4382c';
    x.beginPath();
    x.moveTo(-5.2 * s, -5.6 * s);
    x.lineTo(5.2 * s, -5.6 * s);
    x.lineTo(0, 6 * s);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.beginPath();
    x.ellipse(-2 * s, -14 * s, 1.4 * s, 3 * s, 0, 0, TAU);
    x.fill();
    x.restore();
    if (F.st !== 'air') {
      x.strokeStyle = 'rgba(255,255,255,.5)';
      x.lineWidth = 1.2 * S;
      x.beginPath();
      x.ellipse(F.x, F.y, 9 * s, 2.6 * s, 0, 0, TAU);
      x.stroke();
    }
  }

  // мостки
  _pier(x) {
    const { W, H } = this;
    const { deckY, pierEnd, S, fx } = this.L;
    const night = this.part === 'night';
    const wood = this.tint('#a8784a', 0),
      woodD = this.tint('#7a5232', 0),
      woodL = this.tint('#c99a64', 0);
    const th = 16 * S;
    // сваи с отражением
    for (let px = pierEnd - 12 * S; px > -40 * S; px -= 64 * S) {
      x.fillStyle = woodD;
      x.fillRect(px - 5 * S, deckY + th - 2, 10 * S, H - deckY);
      x.fillStyle = 'rgba(0,0,0,.18)';
      x.fillRect(px - 5 * S, deckY + th + 28 * S, 10 * S, H);
      x.strokeStyle = 'rgba(255,255,255,.35)';
      x.lineWidth = 1.2 * S;
      x.beginPath();
      x.ellipse(px, deckY + th + 30 * S + Math.sin(this.t * 2 + px) * 1.5, 9 * S, 2.4 * S, 0, 0, TAU);
      x.stroke();
    }
    // настил: верх и торец
    x.fillStyle = woodL;
    x.beginPath();
    x.moveTo(-10, deckY - 10 * S);
    x.lineTo(pierEnd + 6 * S, deckY - 10 * S);
    x.lineTo(pierEnd, deckY);
    x.lineTo(-10, deckY);
    x.closePath();
    x.fill();
    x.fillStyle = wood;
    x.fillRect(-10, deckY, pierEnd + 10, th);
    x.strokeStyle = woodD;
    x.lineWidth = 1.4 * S;
    for (let px = pierEnd - 26 * S; px > 0; px -= 26 * S) {
      x.beginPath();
      x.moveTo(px, deckY);
      x.lineTo(px, deckY + th);
      x.moveTo(px + 3 * S, deckY - 10 * S);
      x.lineTo(px, deckY);
      x.stroke();
    }
    x.beginPath();
    x.moveTo(-10, deckY);
    x.lineTo(pierEnd, deckY);
    x.stroke();
    // гвоздики
    x.fillStyle = 'rgba(60,40,20,.6)';
    for (let px = pierEnd - 13 * S; px > 0; px -= 26 * S) x.fillRect(px - 1, deckY + th * 0.4, 2 * S, 2 * S);
    // ведро, термос, ящик
    const bx = fx - 46 * S,
      by = deckY - 4 * S;
    x.fillStyle = this.tint('#5a86a8', 0);
    x.beginPath();
    x.moveTo(bx - 15 * S, by - 30 * S);
    x.lineTo(bx + 15 * S, by - 30 * S);
    x.lineTo(bx + 11 * S, by);
    x.lineTo(bx - 11 * S, by);
    x.closePath();
    x.fill();
    x.fillStyle = this.tint('#7aa4c4', 0);
    x.beginPath();
    x.ellipse(bx, by - 30 * S, 15 * S, 4 * S, 0, 0, TAU);
    x.fill();
    x.fillStyle = this.tint('#2f5a78', 0);
    x.beginPath();
    x.ellipse(bx, by - 30 * S, 12 * S, 2.8 * S, 0, 0, TAU);
    x.fill();
    x.strokeStyle = this.tint('#3d5a70', 0);
    x.lineWidth = 1.6 * S;
    x.beginPath();
    x.arc(bx, by - 30 * S, 15 * S, Math.PI * 1.05, Math.PI * 1.95);
    x.stroke();
    if (this.bucketFull) {
      // хвост рыбы из ведра
      x.fillStyle = this.tint('#c9b25a', 0);
      x.beginPath();
      x.moveTo(bx + 3 * S, by - 31 * S);
      x.lineTo(bx + 8 * S, by - 44 * S);
      x.lineTo(bx + 13 * S, by - 40 * S);
      x.closePath();
      x.fill();
    }
    // термос
    const tx = bx - 27 * S;
    x.fillStyle = this.tint('#c8463a', 0);
    x.fillRect(tx - 6 * S, by - 34 * S, 12 * S, 34 * S);
    x.fillStyle = this.tint('#e8e2d0', 0);
    x.fillRect(tx - 6.5 * S, by - 40 * S, 13 * S, 7 * S);
    // фонарь ночью и вечером
    if (night || this.part === 'evening') {
      const lx = fx + 46 * S,
        ly = deckY - 10 * S;
      x.fillStyle = '#3a3a3a';
      x.fillRect(lx - 6 * S, ly - 20 * S, 12 * S, 20 * S);
      x.fillStyle = '#ffd77a';
      x.fillRect(lx - 4 * S, ly - 17 * S, 8 * S, 13 * S);
      x.strokeStyle = '#3a3a3a';
      x.lineWidth = 1.5 * S;
      x.beginPath();
      x.arc(lx, ly - 21 * S, 4 * S, Math.PI, 0);
      x.stroke();
      const g = x.createRadialGradient(lx, ly - 10 * S, 0, lx, ly - 10 * S, 170 * S);
      const fl = 0.95 + Math.sin(this.t * 9) * 0.03;
      g.addColorStop(0, `rgba(255,205,120,${(night ? 0.42 : 0.25) * fl})`);
      g.addColorStop(1, 'rgba(255,205,120,0)');
      x.fillStyle = g;
      x.fillRect(lx - 170 * S, ly - 180 * S, 340 * S, 340 * S);
    }
  }

  // рыбак или рыбачка на стульчике, удочка, леска, кот
  _fisher(x, dt) {
    const { deckY, fx, S } = this.L;
    const t = this.t;
    const fem = this.char === 'f';
    const pose = this.pose;
    this.castAnim = Math.max(0, this.castAnim - dt);
    const lean = pose === 'fight' ? -0.12 - this.tension * 0.08 : pose === 'bite' ? 0.08 : pose === 'joy' ? -0.05 : 0;
    const breath = Math.sin(t * 1.8) * 0.8;
    // кот
    this._cat(x, fx - 96 * S, deckY - 10 * S, S);
    x.save();
    x.translate(fx, deckY - 44 * S);
    x.scale(S, S);
    const night = this.part === 'night';
    const T = (c) => this.tint(c, 3);
    // стульчик
    x.strokeStyle = T('#6a4a2a');
    x.lineWidth = 3.5;
    x.beginPath();
    x.moveTo(-15, 0);
    x.lineTo(12, 34);
    x.moveTo(12, 0);
    x.lineTo(-15, 34);
    x.stroke();
    x.fillStyle = T(fem ? '#4a7ab8' : '#3d6b4a');
    x.fillRect(-19, -4, 36, 6);
    x.rotate(lean);
    // ноги
    const pants = T(fem ? '#3a5a8a' : '#4a5a6a');
    x.fillStyle = pants;
    x.beginPath();
    x.moveTo(-12, -8);
    x.lineTo(32, -12);
    x.quadraticCurveTo(42, -6, 34, 2);
    x.lineTo(-10, 4);
    x.closePath();
    x.fill();
    x.beginPath();
    x.moveTo(26, -6);
    x.lineTo(38, -6);
    x.lineTo(42, 26);
    x.lineTo(30, 26);
    x.closePath();
    x.fill();
    // сапоги
    x.fillStyle = T(fem ? '#d24a6a' : '#2f3a2f');
    x.beginPath();
    x.moveTo(29, 18);
    x.lineTo(43, 18);
    x.lineTo(44, 31);
    x.quadraticCurveTo(54, 32, 52, 36);
    x.lineTo(28, 36);
    x.closePath();
    x.fill();
    // туловище
    const shirt = T(fem ? '#f2a64a' : '#c85a4a');
    const vest = T(fem ? '#e86a5a' : '#7a8a4a');
    x.save();
    x.translate(0, breath * 0.4);
    x.fillStyle = shirt;
    x.beginPath();
    x.moveTo(-14, -2);
    x.quadraticCurveTo(-20, -40, -6, -60);
    x.quadraticCurveTo(10, -66, 18, -52);
    x.quadraticCurveTo(fem ? 22 : 30, -26, fem ? 18 : 22, -6);
    x.closePath();
    x.fill();
    // клетка на рубашке
    x.save();
    x.clip();
    x.strokeStyle = 'rgba(255,255,255,.22)';
    x.lineWidth = 2;
    for (let i = -30; i < 40; i += 9) {
      x.beginPath();
      x.moveTo(i, -70);
      x.lineTo(i, 0);
      x.moveTo(-30, i - 40);
      x.lineTo(40, i - 40);
      x.stroke();
    }
    x.restore();
    // жилет с карманами
    x.fillStyle = vest;
    x.beginPath();
    x.moveTo(-14, -2);
    x.quadraticCurveTo(-20, -40, -6, -60);
    x.lineTo(4, -60);
    x.quadraticCurveTo(0, -30, 6, -2);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(0,0,0,.15)';
    x.fillRect(-12, -30, 10, 9);
    x.fillRect(-12, -16, 10, 9);
    x.restore();
    // голова
    const hx = 6,
      hy = -82 + breath * 0.5;
    const skin = T('#f3c9a3');
    if (fem) {
      // хвостик
      x.fillStyle = T('#8a4a2a');
      x.beginPath();
      x.ellipse(-16, hy + 8, 9, 13, 0.5, 0, TAU);
      x.fill();
    }
    x.fillStyle = skin;
    x.beginPath();
    x.arc(hx, hy, 21, 0, TAU);
    x.fill();
    // ухо
    x.fillStyle = T('#e8b38e');
    x.beginPath();
    x.ellipse(hx - 6, hy + 2, 5, 6.5, 0, 0, TAU);
    x.fill();
    // нос
    x.fillStyle = T('#eeb08a');
    x.beginPath();
    x.arc(hx + 20, hy + 3, 6.5, 0, TAU);
    x.fill();
    // щека
    x.fillStyle = 'rgba(240,120,110,.35)';
    x.beginPath();
    x.arc(hx + 11, hy + 9, 5.5, 0, TAU);
    x.fill();
    // глаз (моргает)
    const blink = (t % 4.2) < 0.13;
    x.fillStyle = '#2a2018';
    if (pose === 'joy') {
      x.strokeStyle = '#2a2018';
      x.lineWidth = 2.2;
      x.beginPath();
      x.arc(hx + 13, hy - 1, 3.4, Math.PI * 1.1, Math.PI * 1.9);
      x.stroke();
    } else if (blink) x.fillRect(hx + 10, hy - 2, 6, 1.8);
    else {
      x.beginPath();
      x.ellipse(hx + 13, hy - 2, 2.6, 3.4, 0, 0, TAU);
      x.fill();
      x.fillStyle = '#fff';
      x.beginPath();
      x.arc(hx + 13.8, hy - 3.2, 0.9, 0, TAU);
      x.fill();
    }
    if (fem) {
      x.strokeStyle = '#2a2018';
      x.lineWidth = 1.4;
      x.beginPath();
      x.moveTo(hx + 15, hy - 5);
      x.lineTo(hx + 18, hy - 7);
      x.stroke();
      // губы
      x.fillStyle = '#d65a5a';
      x.beginPath();
      x.ellipse(hx + 17, hy + 12, 3, 1.6, 0, 0, TAU);
      x.fill();
    } else {
      // усы
      x.fillStyle = T('#7a5232');
      x.beginPath();
      x.ellipse(hx + 17, hy + 10, 7.5, 3.4, -0.15, 0, TAU);
      x.fill();
      // щетина
      x.fillStyle = 'rgba(120,90,60,.18)';
      x.beginPath();
      x.arc(hx + 6, hy + 10, 14, 0.1, Math.PI * 0.85);
      x.fill();
    }
    // шляпа
    if (fem) {
      x.fillStyle = T('#ecd38e');
      x.beginPath();
      x.ellipse(hx - 1, hy - 14, 34, 8, -0.08, 0, TAU);
      x.fill();
      x.beginPath();
      x.ellipse(hx - 1, hy - 20, 18, 13, 0, Math.PI, 0);
      x.fill();
      x.fillStyle = T('#e2524e');
      x.fillRect(hx - 19, hy - 21, 36, 5);
      x.fillStyle = T('#e2524e');
      x.beginPath();
      x.moveTo(hx - 19, hy - 19);
      x.lineTo(hx - 30, hy - 8);
      x.lineTo(hx - 24, hy - 6);
      x.closePath();
      x.fill();
    } else {
      x.fillStyle = T('#b9a66a');
      x.beginPath();
      x.ellipse(hx, hy - 14, 29, 7, -0.06, 0, TAU);
      x.fill();
      x.beginPath();
      x.moveTo(hx - 18, hy - 15);
      x.quadraticCurveTo(hx - 18, hy - 38, hx, hy - 37);
      x.quadraticCurveTo(hx + 18, hy - 38, hx + 18, hy - 15);
      x.closePath();
      x.fill();
      x.fillStyle = T('#8a7a4a');
      x.fillRect(hx - 18, hy - 21, 36, 5);
    }
    // удочка
    const ang0 = pose === 'fight' ? -1.2 : pose === 'joy' ? -1.35 : pose === 'bite' ? -0.75 : -0.9;
    let ang = ang0;
    if (this.castAnim > 0) {
      const p = 1 - this.castAnim / 0.55;
      ang = p < 0.4 ? lerp(ang0, -2.3, p / 0.4) : lerp(-2.3, ang0 + 0.15, (p - 0.4) / 0.6);
    }
    const handX = 38,
      handY = -34;
    const Lr = this.port ? 175 : 235;
    const bend = clamp(this.tension, 0, 1) * (pose === 'fight' ? 0.75 : 0) + (pose === 'bite' ? 0.12 : 0) + (this.float && this.float.st === 'nibble' ? 0.04 : 0);
    const dx = Math.cos(ang),
      dy = Math.sin(ang);
    const bx = handX - dx * 30,
      by = handY - dy * 30;
    const tipA = ang + bend * 0.9;
    const tipX = handX + Math.cos(tipA) * Lr,
      tipY = handY + Math.sin(tipA) * Lr;
    const cx = handX + dx * Lr * 0.55,
      cy = handY + dy * Lr * 0.55;
    x.strokeStyle = T('#5a3a22');
    x.lineWidth = 5.5;
    x.beginPath();
    x.moveTo(bx, by);
    x.lineTo(handX + dx * 18, handY + dy * 18);
    x.stroke();
    x.strokeStyle = T(['#c9a46a', '#5a8a5a', '#3a3a3a', '#2a4a8a', '#8a2a3a', '#d8a83a'][this.rodLvl || 0]);
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(handX + dx * 18, handY + dy * 18);
    x.quadraticCurveTo(cx, cy, tipX, tipY);
    x.stroke();
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(lerp(cx, tipX, 0.5), lerp(cy, tipY, 0.5));
    x.lineTo(tipX, tipY);
    x.stroke();
    // катушка
    x.fillStyle = T('#8a9aa8');
    x.beginPath();
    x.arc(handX + dx * 8 + 4, handY + dy * 8 + 7, 6, 0, TAU);
    x.fill();
    x.strokeStyle = T('#5a6a78');
    x.lineWidth = 1.5;
    x.stroke();
    if (pose === 'fight') {
      x.strokeStyle = T('#3a4a58');
      const ra = t * 14;
      x.beginPath();
      x.moveTo(handX + dx * 8 + 4, handY + dy * 8 + 7);
      x.lineTo(handX + dx * 8 + 4 + Math.cos(ra) * 6, handY + dy * 8 + 7 + Math.sin(ra) * 6);
      x.stroke();
    }
    // рука
    x.strokeStyle = shirt;
    x.lineWidth = 11;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(2, -54);
    x.quadraticCurveTo(26, -40, handX - 2, handY);
    x.stroke();
    x.fillStyle = skin;
    x.beginPath();
    x.arc(handX, handY, 6.5, 0, TAU);
    x.fill();
    x.restore();
    // кончик удочки в координатах экрана (с учётом наклона корпуса)
    const ca = Math.cos(lean),
      sa = Math.sin(lean);
    const ox = fx,
      oy = deckY - 44 * S;
    this.tip = { x: ox + (tipX * ca - tipY * sa) * S, y: oy + (tipX * sa + tipY * ca) * S };
    // леска
    const F = this.float;
    if (F) {
      const tp = this.tip;
      x.strokeStyle = night ? 'rgba(230,230,240,.55)' : 'rgba(250,250,250,.75)';
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(tp.x, tp.y);
      const sag = (1 - clamp(this.tension * 1.4, 0, 1)) * 60 * S * (F.st === 'air' ? 0.2 : 1);
      x.quadraticCurveTo((tp.x + F.x) / 2, Math.max(tp.y, F.y) - (F.st === 'air' ? 0 : 20 * S) + sag, F.x, F.y - (F.st === 'air' ? 0 : 18 * this.k(F.y) * S));
      x.stroke();
    }
    // прыжок пойманной рыбы
    const J = this.jump;
    if (J) {
      J.t += dt;
      const p = clamp(J.t / J.dur, 0, 1);
      const jx = lerp(J.x0, J.x1, p),
        jy = lerp(J.y0, J.y1, p) - Math.sin(p * Math.PI) * J.h;
      const sz = lerp(J.s0, J.s1, p);
      x.strokeStyle = 'rgba(250,250,250,.75)';
      x.beginPath();
      x.moveTo(this.tip.x, this.tip.y);
      x.lineTo(jx, jy - sz * 0.15);
      x.stroke();
      drawFish(x, J.id, jx, jy, sz, { rot: -0.5 + p * 1.2 + Math.sin(J.t * 18) * 0.15, wig: Math.sin(J.t * 22), flip: true });
      if (p >= 1 && !J.done) {
        J.done = true;
        J.cb && J.cb();
      }
    }
  }

  _cat(x, cx, cy, S) {
    const C = this.cat;
    const t = this.t;
    C.k = clamp(C.k + (C.on ? 1 : -1) * 0.02, 0, 1);
    if (C.k <= 0) return;
    C.pet = Math.max(0, C.pet - 0.016);
    x.save();
    x.globalAlpha = C.k;
    x.translate(cx + (1 - C.k) * -60 * S, cy);
    x.scale(S, S);
    const fur = this.tint('#e8964a', 3),
      furD = this.tint('#c8743a', 3);
    // хвост
    x.strokeStyle = fur;
    x.lineWidth = 7;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(-14, -6);
    x.quadraticCurveTo(-34, -10 + Math.sin(t * 2.2) * 6, -30, -32 + Math.sin(t * 2.2) * 8);
    x.stroke();
    // тело
    x.fillStyle = fur;
    x.beginPath();
    x.ellipse(0, -16, 17, 16, 0, 0, TAU);
    x.fill();
    x.fillStyle = this.tint('#fbe6cc', 3);
    x.beginPath();
    x.ellipse(6, -10, 8, 10, 0, 0, TAU);
    x.fill();
    // полоски
    x.strokeStyle = furD;
    x.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      x.beginPath();
      x.arc(-4, -16, 10 + i * 0, -2.4 + i * 0.35, -2.1 + i * 0.35);
      x.stroke();
    }
    // голова
    const bob = C.pet > 0 ? Math.sin(t * 10) * 1.5 : 0;
    x.fillStyle = fur;
    x.beginPath();
    x.arc(10, -38 + bob, 12, 0, TAU);
    x.fill();
    const ear = (sx) => {
      x.beginPath();
      x.moveTo(10 + sx * 4, -47 + bob);
      x.lineTo(10 + sx * 11, -56 + bob + (sx > 0 && (t % 3) < 0.15 ? 3 : 0));
      x.lineTo(10 + sx * 12, -42 + bob);
      x.closePath();
      x.fill();
    };
    ear(-1);
    ear(1);
    x.fillStyle = '#2a2018';
    if (C.pet > 0) {
      x.strokeStyle = '#2a2018';
      x.lineWidth = 1.6;
      x.beginPath();
      x.arc(6, -39 + bob, 2.5, Math.PI * 1.1, Math.PI * 1.9);
      x.arc(15, -39 + bob, 2.5, Math.PI * 1.1, Math.PI * 1.9);
      x.stroke();
    } else {
      x.beginPath();
      x.ellipse(6, -39 + bob, 1.8, 2.6, 0, 0, TAU);
      x.ellipse(15, -39 + bob, 1.8, 2.6, 0, 0, TAU);
      x.fill();
    }
    x.fillStyle = '#e87a8a';
    x.beginPath();
    x.arc(10.5, -35 + bob, 1.6, 0, TAU);
    x.fill();
    x.strokeStyle = 'rgba(60,40,30,.5)';
    x.lineWidth = 0.8;
    x.beginPath();
    x.moveTo(14, -34 + bob);
    x.lineTo(24, -36 + bob);
    x.moveTo(14, -33 + bob);
    x.lineTo(24, -31 + bob);
    x.moveTo(7, -34 + bob);
    x.lineTo(-3, -36 + bob);
    x.stroke();
    x.restore();
    this.catBox = { x: cx - 30 * S, y: cy - 60 * S, w: 60 * S, h: 64 * S };
  }

  // камыши, стрекоза, светлячки
  _fore(x, dt) {
    const { W, H, t } = this;
    const { S, deckY } = this.L;
    const night = this.part === 'night';
    const reedC = this.tint('#4a7a3a', 0),
      reedD = this.tint('#3a6230', 0);
    const clump = (cx, cy, n, h, seed) => {
      const R = rng(seed);
      for (let i = 0; i < n; i++) {
        const rx = cx + (R() - 0.5) * 60 * S,
          rh = h * (0.6 + R() * 0.5);
        const sw = Math.sin(t * 1.2 + i + seed) * 4 * S;
        x.strokeStyle = R() < 0.5 ? reedC : reedD;
        x.lineWidth = 3 * S;
        x.beginPath();
        x.moveTo(rx, cy);
        x.quadraticCurveTo(rx + sw * 0.5, cy - rh * 0.5, rx + sw, cy - rh);
        x.stroke();
        if (R() < 0.45) {
          x.fillStyle = this.tint('#7a4a2a', 0);
          x.beginPath();
          x.ellipse(rx + sw * 0.9, cy - rh * 0.88, 3.2 * S, 9 * S, sw * 0.02, 0, TAU);
          x.fill();
        }
      }
    };
    if (this.loc !== 3) {
      clump(W - 30 * S, H + 4, 12, 120 * S, 3);
      clump(-10 * S, H + 4, 8, 90 * S, 4);
    }
    if (this.loc === 4) {
      // камни на переднем плане
      x.fillStyle = this.tint('#7d8388', 0);
      x.beginPath();
      x.ellipse(W - 60 * S, H - 6 * S, 70 * S, 30 * S, 0, Math.PI, 0);
      x.fill();
      x.fillStyle = this.tint('#959ba0', 0);
      x.beginPath();
      x.ellipse(W - 80 * S, H - 14 * S, 40 * S, 18 * S, 0, Math.PI, 0);
      x.fill();
    }
    // стрекоза днём
    if (!night && this.weather !== 'rain') {
      const D = this.drag;
      D.t -= dt;
      if (D.t < 0) {
        D.tx = 0.45 + Math.random() * 0.5;
        D.ty = 0.6 + Math.random() * 0.3;
        D.t = 1.5 + Math.random() * 2.5;
      }
      D.x = lerp(D.x, D.tx, dt * 1.6);
      D.y = lerp(D.y, D.ty, dt * 1.6);
      const dx = D.x * W,
        dy = D.y * H + Math.sin(t * 3) * 3 * S;
      x.fillStyle = 'rgba(220,240,255,.5)';
      const fl = Math.sin(t * 60) * 0.4;
      x.beginPath();
      x.ellipse(dx - 2 * S, dy - 4 * S, 9 * S, 2.6 * S, -0.5 + fl, 0, TAU);
      x.ellipse(dx + 2 * S, dy - 4 * S, 9 * S, 2.6 * S, 0.5 - fl, 0, TAU);
      x.fill();
      x.strokeStyle = '#2a7ab8';
      x.lineWidth = 2.4 * S;
      x.beginPath();
      x.moveTo(dx - 12 * S, dy - 3 * S);
      x.lineTo(dx + 6 * S, dy - 3 * S);
      x.stroke();
    }
    // светлячки ночью
    if (night || this.part === 'evening') {
      for (const f of this.flies) {
        const fxp = (f.x * 0.5 + 0.5) * W + Math.sin(t * 0.5 + f.ph) * 30 * S,
          fyp = deckY - 40 * S - f.y * 160 * S + Math.cos(t * 0.7 + f.ph) * 14 * S;
        const a = 0.5 + 0.5 * Math.sin(t * 2.5 + f.ph * 3);
        if (a < 0.2) continue;
        const g = x.createRadialGradient(fxp, fyp, 0, fxp, fyp, 8 * S);
        g.addColorStop(0, `rgba(230,255,140,${0.9 * a})`);
        g.addColorStop(1, 'rgba(230,255,140,0)');
        x.fillStyle = g;
        x.fillRect(fxp - 8 * S, fyp - 8 * S, 16 * S, 16 * S);
      }
    }
  }

  _particles(x, dt) {
    const S = this.L.S;
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = Math.max(0, p.life / p.max);
      if (p.t === 'drop') {
        p.vy += 420 * dt * S;
        x.fillStyle = `rgba(235,248,255,${0.85 * a})`;
        x.beginPath();
        x.arc(p.x, p.y, p.r, 0, TAU);
        x.fill();
      } else if (p.t === 'heart') {
        x.fillStyle = `rgba(240,90,120,${a})`;
        const r = p.r;
        x.beginPath();
        x.moveTo(p.x, p.y + r * 0.7);
        x.bezierCurveTo(p.x - r * 1.2, p.y - r * 0.2, p.x - r * 0.5, p.y - r * 1.1, p.x, p.y - r * 0.4);
        x.bezierCurveTo(p.x + r * 0.5, p.y - r * 1.1, p.x + r * 1.2, p.y - r * 0.2, p.x, p.y + r * 0.7);
        x.fill();
      } else if (p.t === 'spark') {
        p.vx *= 0.94;
        p.vy *= 0.94;
        x.fillStyle = `rgba(255,236,150,${a})`;
        x.beginPath();
        x.arc(p.x, p.y, p.r * a, 0, TAU);
        x.fill();
      }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  _weatherFx(x, dt) {
    const { W, H, t } = this;
    const { hz, S } = this.L;
    if (this.weather === 'rain') {
      x.strokeStyle = this.part === 'night' ? 'rgba(180,195,230,.35)' : 'rgba(225,235,245,.45)';
      x.lineWidth = 1.2 * S;
      x.beginPath();
      for (const r of this.rain) {
        const ry = ((r.y + t * r.v * 0.9) % 1) * H;
        const rx = ((r.x + ry / H * 0.06) % 1) * W;
        x.moveTo(rx, ry);
        x.lineTo(rx - 4 * S, ry + 16 * S);
      }
      x.stroke();
      if (Math.random() < dt * 14) this.ripple(Math.random() * W, hz + 6 + Math.random() * (H - hz), 0.5);
    }
    if (this.weather === 'fog') {
      const fc = this.part === 'night' ? '90,100,130' : '235,240,242';
      for (let i = 0; i < 3; i++) {
        const yy = hz - H * 0.06 + i * H * 0.07;
        const g = x.createLinearGradient(0, yy - H * 0.08, 0, yy + H * 0.08);
        g.addColorStop(0, `rgba(${fc},0)`);
        g.addColorStop(0.5, `rgba(${fc},${0.32 - i * 0.07})`);
        g.addColorStop(1, `rgba(${fc},0)`);
        x.fillStyle = g;
        x.fillRect(Math.sin(t * 0.1 + i) * 40 * S - 50 * S, yy - H * 0.08, W + 100 * S, H * 0.16);
      }
    }
  }
}
