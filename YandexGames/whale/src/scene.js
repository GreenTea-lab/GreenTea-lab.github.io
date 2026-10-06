// Сцена: океан пяти биомов, кит с городком на спине, жители, чайка с подарком, острова, фонтан и брызги
import { BUILDINGS, milestonesOf, rng } from './data.js';
import { drawBuilding, drawPlot } from './buildings.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

// палитры биомов
export const PAL = {
  warm: { sky: ['#4fb2f0', '#a8defc', '#e6f7ff'], sea: ['#3aa0e0', '#1a5f9e'], whale: '#5b82e0', whaleD: '#3f62c0', belly: '#d4e4ff', foam: '#ffffff', sun: '#fff6c8', grass: '#6cc35a', night: false },
  north: { sky: ['#8fb8d8', '#cfe4f0', '#f2f8fb'], sea: ['#5a92b0', '#24506a'], whale: '#6f8ab0', whaleD: '#4f6a90', belly: '#e6eef8', foam: '#ffffff', sun: '#ffffff', grass: '#8fd0a0', night: false },
  tropic: { sky: ['#7a6ad0', '#ff9a8a', '#ffd89a'], sea: ['#2fb0c0', '#146a8a'], whale: '#5a6ad8', whaleD: '#4048b0', belly: '#ffe0e8', foam: '#fff4ea', sun: '#ffe08a', grass: '#7ad05a', night: false },
  night: { sky: ['#0b1238', '#1f2a68', '#3a3f86'], sea: ['#16306a', '#081436'], whale: '#4a6ac8', whaleD: '#2f4aa0', belly: '#bcd0ff', foam: '#a8c8ff', sun: '#fffbe0', grass: '#4a9a6a', night: true },
  sky: { sky: ['#ffc8e6', '#e6dcff', '#cfeeff'], sea: ['#ffffff', '#e8eeff'], whale: '#7a8ef0', whaleD: '#5a6ad0', belly: '#f0f4ff', foam: '#ffffff', sun: '#fff6d8', grass: '#8ad87a', night: false },
};

export class Scene {
  constructor(cv) {
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.t = 0;
    this.biome = 'warm';
    this.stage = 1;
    this.counts = {};
    this.parts = [];
    this.texts = [];
    this.squish = 0;
    this.spout = 0;
    this.mega = 0;
    this.speedK = 1;
    this.scroll = 0;
    this.gull = null;
    this.island = null;
    this.islandK = 0;
    this.dpr = 1;
  }

  // R — прямоугольник, в который вписывается кит (часть экрана без панели)
  resize(W, H, dpr, R) {
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.cv.width = Math.round(W * dpr);
    this.cv.height = Math.round(H * dpr);
    this.cv.style.width = W + 'px';
    this.cv.style.height = H + 'px';
    this.R = R;
    this.hz = R.y + R.h * 0.4;
    this.layout();
  }

  // размер кита растёт со стадией; городок на спине — плотной группой по центру спины
  layout() {
    const R = this.R;
    if (!R) return;
    const st = this.stage;
    // кит растёт со стадией; в вертикальном экране — по ширине
    const port = R.w / R.h < 1.05;
    const k = port ? 0.74 + 0.028 * (st - 1) : 0.62 + 0.04 * (st - 1);
    this.Lw = port ? Math.min(R.w * k, R.h * 1.25) : Math.min(R.w * k, R.h * k * 1.35);
    this.Hb = this.Lw * 0.3;
    // по горизонтали кит от хвоста (-0.68) до носа (+0.43) — центрируем
    this.cx = R.x + R.w * 0.5 + this.Lw * 0.125;
    this.cy = R.y + R.h * 0.66;
    const n = [3, 5, 7, 9, 11, 12][st - 1];
    this.slots = [];
    // больше шести зданий — два ряда: задний (выше по спине) и передний
    const rows = n > 6 ? 2 : 1;
    const perRow = Math.ceil(n / rows);
    const flat = this.Lw * 0.84 * 0.6;
    const bw = Math.min(flat / (perRow * 0.95), this.Lw * 0.12);
    const span = bw * perRow * 0.95;
    const xc = this._x(0.5);
    const x0 = xc - span / 2;
    for (let i = 0; i < n; i++) {
      const row = rows === 2 ? (i % 2 === 0 ? 1 : 0) : 1;
      const j = rows === 2 ? Math.floor(i / 2) : i;
      const off = rows === 2 && row === 0 ? 0.5 : 0;
      const sx = x0 + (j + 0.5 + off) * (span / perRow) - (rows === 2 && row === 0 ? span / perRow / 2 : 0);
      this.slots.push({ id: BUILDINGS[i].id, x: sx, row, dy: rows === 2 ? (row === 0 ? -bw * 0.12 : bw * 0.3) : bw * 0.1, sc: row === 0 && rows === 2 ? 0.86 : 1, w: bw });
    }
    this.slots.sort((a, b) => a.row - b.row);
    this.bw = bw;
    this.residents = [];
    const R2 = rng(st * 7 + 3);
    for (let i = 0; i < Math.min(14, 2 + st * 2); i++) this.residents.push({ p: R2(), v: (0.03 + R2() * 0.04) * (R2() < 0.5 ? 1 : -1), c: ['#ff6a8a', '#ffb03a', '#4aa8ff', '#5ad06a', '#c86aff'][i % 5], hat: i % 3 });
    this.span = [x0, x0 + span];
  }

  // форма кита: доля u (0 — хвостовой стебель, 1 — нос)
  _x(u) {
    return this.cx - this.Lw * 0.48 + u * this.Lw * 0.84;
  }
  // спина почти плоская (там стоит город), голова большая и круглая
  _top(u) {
    let f;
    if (u < 0.2) f = 0.22 + 0.68 * Math.sin(((u / 0.2) * Math.PI) / 2);
    else if (u < 0.8) f = 0.9 + 0.1 * ((u - 0.2) / 0.6);
    else f = 1 - 0.52 * Math.pow((u - 0.8) / 0.2, 2);
    return this.cy - this.Hb * f;
  }
  _bot(u) {
    let g;
    if (u < 0.75) g = 0.12 + 0.55 * Math.sin((Math.min(1, u / 0.6) * Math.PI) / 2);
    else g = 0.67 - 0.42 * Math.pow((u - 0.75) / 0.25, 2);
    return this.cy + this.Hb * g;
  }
  topAt(x) {
    const u = clamp((x - (this.cx - this.Lw * 0.48)) / (this.Lw * 0.84), 0, 1);
    return this._top(u) + this._bob();
  }
  _bob() {
    return Math.sin(this.t * 1.3) * this.Hb * 0.03;
  }
  // попадание по киту (для тапа)
  hitWhale(px, py) {
    const u = (px - (this.cx - this.Lw * 0.55)) / (this.Lw * 0.95);
    if (u < 0 || u > 1.02) return false;
    return py > this.cy - this.Hb * 1.35 && py < this.cy + this.Hb * 0.8;
  }
  // точка фонтана (дыхало)
  blow() {
    const u = 0.86;
    return { x: this._x(u), y: this._top(u) + this._bob() };
  }

  setState(o) {
    if (o.stage && o.stage !== this.stage) {
      this.stage = o.stage;
      this.layout();
    }
    if (o.biome) this.biome = o.biome;
    if (o.counts) this.counts = o.counts;
  }

  // ---------- эффекты ----------
  tap(px, py, txt, big) {
    this.squish = 1;
    this.spout = Math.min(1.5, this.spout + 0.5);
    const b = this.blow();
    for (let i = 0; i < (big ? 18 : 8); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      const v = (180 + Math.random() * 220) * (this.Lw / 700);
      this.parts.push({ t: 'drop', x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, max: 1, r: (3 + Math.random() * 3) * (this.Lw / 700) });
    }
    for (let i = 0; i < (big ? 5 : 2); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = (160 + Math.random() * 160) * (this.Lw / 700);
      this.parts.push({ t: 'shell', x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.3, max: 1.3, r: (7 + Math.random() * 3) * (this.Lw / 700), rot: Math.random() * 6 });
    }
    if (txt) {
      this.texts.push({ x: px + (Math.random() - 0.5) * 60, y: py - 10 - Math.random() * 20, s: txt, life: 1.1, max: 1.1, big });
      if (this.texts.length > 9) this.texts.shift();
    }
  }
  float(x, y, s, color) {
    this.texts.push({ x, y, s, life: 1.6, max: 1.6, big: true, color });
  }
  burst(x, y, n = 20) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU,
        v = 60 + Math.random() * 200;
      this.parts.push({ t: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, max: 1, r: 3 + Math.random() * 4 });
    }
  }
  buildFx(id) {
    const s = this.slots.find((q) => q.id === id);
    if (!s) return;
    this.burst(s.x, s.y - s.w * 0.4, 14);
    s.pop = 1;
  }

  // ---------- кадр ----------
  draw(dt) {
    this.t += dt;
    const x = this.ctx;
    const { W, H, dpr } = this;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scroll += dt * 40 * this.speedK;
    this.squish = Math.max(0, this.squish - dt * 5);
    this.spout = Math.max(0, this.spout - dt * 1.2);
    const P = PAL[this.biome];
    this._sky(x, P);
    this._far(x, P);
    this._islandDraw(x, P);
    this._sea(x, P, false);
    this._whale(x, P);
    this._sea(x, P, true);
    this._gull(x, dt);
    this._particles(x, dt);
  }

  _sky(x, P) {
    const { W, H } = this;
    const hz = this.hz;
    const g = x.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, P.sky[0]);
    g.addColorStop(0.65, P.sky[1]);
    g.addColorStop(1, P.sky[2]);
    x.fillStyle = g;
    x.fillRect(0, 0, W, hz + 1);
    const t = this.t;
    // солнце или луна
    const sx = this.R.x + this.R.w * 0.8,
      sy = hz * 0.32,
      r = Math.min(this.R.w, H) * 0.07;
    const gl = x.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 4);
    gl.addColorStop(0, P.night ? 'rgba(220,230,255,.35)' : 'rgba(255,250,220,.55)');
    gl.addColorStop(1, 'rgba(255,250,220,0)');
    x.fillStyle = gl;
    x.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
    x.fillStyle = P.sun;
    x.beginPath();
    x.arc(sx, sy, r, 0, TAU);
    x.fill();
    if (P.night) {
      x.fillStyle = PAL.night.sky[1];
      x.beginPath();
      x.arc(sx + r * 0.45, sy - r * 0.25, r * 0.85, 0, TAU);
      x.fill();
      const R = rng(11);
      for (let i = 0; i < 110; i++) {
        const px = R() * W,
          py = Math.pow(R(), 1.4) * hz * 0.95;
        const tw = 0.5 + 0.5 * Math.sin(t * (1 + R() * 2) + i);
        x.fillStyle = `rgba(255,250,220,${0.3 + 0.6 * tw * R()})`;
        x.beginPath();
        x.arc(px, py, 0.6 + R() * 1.4, 0, TAU);
        x.fill();
      }
    }
    if (this.biome === 'north') {
      // северное сияние
      for (let i = 0; i < 3; i++) {
        const gg = x.createLinearGradient(0, hz * 0.1, 0, hz * 0.6);
        gg.addColorStop(0, 'rgba(120,255,200,0)');
        gg.addColorStop(0.5, `rgba(120,255,200,${0.16 + 0.06 * Math.sin(t + i)})`);
        gg.addColorStop(1, 'rgba(120,255,200,0)');
        x.fillStyle = gg;
        x.beginPath();
        x.moveTo(0, hz * 0.3);
        for (let px = 0; px <= W; px += 40) x.lineTo(px, hz * (0.2 + 0.08 * Math.sin(px * 0.006 + t * 0.4 + i * 2)) + i * hz * 0.08);
        x.lineTo(W, hz * 0.55);
        x.lineTo(0, hz * 0.55);
        x.fill();
      }
    }
    // облака плывут
    const nC = this.biome === 'sky' ? 8 : 5;
    const R = rng(23);
    for (let i = 0; i < nC; i++) {
      const sp = 0.3 + R() * 0.5;
      const cw = (60 + R() * 70) * (this.Lw / 700 + 0.4);
      const px = W + cw - ((this.scroll * sp * 0.4 + R() * W * 1.5) % (W + cw * 3));
      const py = hz * (0.12 + R() * 0.45);
      this._cloud(x, px, py, cw, P.night ? 'rgba(160,170,220,.35)' : 'rgba(255,255,255,.92)');
    }
  }
  _cloud(x, cx, cy, w, c) {
    x.fillStyle = c;
    x.beginPath();
    x.arc(cx, cy, w * 0.28, 0, TAU);
    x.arc(cx + w * 0.3, cy + w * 0.06, w * 0.22, 0, TAU);
    x.arc(cx - w * 0.3, cy + w * 0.08, w * 0.2, 0, TAU);
    x.arc(cx + w * 0.08, cy - w * 0.14, w * 0.2, 0, TAU);
    x.fill();
    x.fillRect(cx - w * 0.45, cy + w * 0.05, w * 0.9, w * 0.22);
  }

  // дальний план: силуэты островов, айсберги, пальмы, светящиеся медузы
  _far(x, P) {
    const { W } = this;
    const hz = this.hz;
    const b = this.biome;
    const R = rng(b.length * 13);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const w = (80 + R() * 160) * (this.Lw / 700 + 0.3);
      const per = W + w * 2;
      const px = W + w - ((this.scroll * 0.25 + R() * per * 2) % per);
      if (b === 'north') {
        x.fillStyle = 'rgba(240,250,255,.9)';
        x.beginPath();
        x.moveTo(px - w * 0.4, hz);
        x.lineTo(px - w * 0.15, hz - w * 0.32);
        x.lineTo(px + w * 0.05, hz - w * 0.22);
        x.lineTo(px + w * 0.2, hz - w * 0.4);
        x.lineTo(px + w * 0.42, hz);
        x.closePath();
        x.fill();
        x.fillStyle = 'rgba(180,215,235,.8)';
        x.beginPath();
        x.moveTo(px + w * 0.05, hz - w * 0.22);
        x.lineTo(px + w * 0.2, hz - w * 0.4);
        x.lineTo(px + w * 0.42, hz);
        x.lineTo(px + w * 0.1, hz);
        x.closePath();
        x.fill();
      } else if (b === 'sky') {
        this._cloud(x, px, hz - w * 0.05, w * 0.9, 'rgba(255,255,255,.8)');
      } else {
        const col = b === 'night' ? 'rgba(30,40,90,.9)' : b === 'tropic' ? 'rgba(120,90,150,.55)' : 'rgba(90,150,170,.45)';
        x.fillStyle = col;
        x.beginPath();
        x.ellipse(px, hz + 1, w * 0.5, w * 0.12, 0, Math.PI, 0);
        x.fill();
        if (b === 'tropic' || b === 'warm') {
          x.strokeStyle = col;
          x.lineWidth = 3;
          x.beginPath();
          x.moveTo(px, hz - w * 0.1);
          x.quadraticCurveTo(px + w * 0.05, hz - w * 0.25, px + w * 0.02, hz - w * 0.32);
          x.stroke();
          x.fillStyle = col;
          for (let a = 0; a < 5; a++) {
            x.beginPath();
            x.ellipse(px + w * 0.02 + Math.cos(a * 1.25) * w * 0.07, hz - w * 0.32 + Math.sin(a * 1.25) * w * 0.03, w * 0.08, w * 0.02, a * 1.25, 0, TAU);
            x.fill();
          }
        }
      }
    }
  }

  // остров, к которому плывёт кит (k: 0 далеко … 1 прибыли)
  _islandDraw(x, P) {
    const k = this.islandK;
    if (k <= 0.6) return;
    const p = (k - 0.6) / 0.4;
    const { W } = this;
    const hz = this.hz;
    const w = this.Lw * (0.35 + 0.35 * p);
    const px = W + w * 0.6 - p * (W - this.R.x - this.R.w * 0.62 + w * 0.6);
    const b = this.biome;
    const sand = b === 'north' ? '#eef6fb' : b === 'night' ? '#4a4a8a' : b === 'sky' ? '#ffffff' : '#f6dca0';
    const green = b === 'north' ? '#9ab8c8' : b === 'night' ? '#2a6a6a' : b === 'sky' ? '#ffd0ea' : '#5ac05a';
    x.fillStyle = sand;
    x.beginPath();
    x.ellipse(px, hz + 2, w * 0.5, w * 0.1, 0, Math.PI, 0);
    x.fill();
    x.fillStyle = green;
    x.beginPath();
    x.ellipse(px - w * 0.05, hz - w * 0.02, w * 0.36, w * 0.13, 0, Math.PI, 0);
    x.fill();
    // пальма / ёлка / кристалл
    x.strokeStyle = b === 'north' ? '#6a7a8a' : '#8a5a3a';
    x.lineWidth = Math.max(2, w * 0.025);
    x.beginPath();
    x.moveTo(px + w * 0.1, hz - w * 0.1);
    x.quadraticCurveTo(px + w * 0.16, hz - w * 0.3, px + w * 0.12, hz - w * 0.42);
    x.stroke();
    x.fillStyle = b === 'north' ? '#4a8a7a' : b === 'night' ? '#6affd8' : b === 'sky' ? '#ff9ad8' : '#3aa04a';
    for (let a = 0; a < 6; a++) {
      x.beginPath();
      x.ellipse(px + w * 0.12 + Math.cos(a * 1.05) * w * 0.1, hz - w * 0.42 + Math.sin(a * 1.05) * w * 0.035, w * 0.11, w * 0.03, a * 1.05, 0, TAU);
      x.fill();
    }
    // флажок «остров»
    x.fillStyle = '#ff5a6a';
    x.fillRect(px - w * 0.2, hz - w * 0.3, w * 0.012, w * 0.2);
    x.beginPath();
    x.moveTo(px - w * 0.188, hz - w * 0.3);
    x.lineTo(px - w * 0.1, hz - w * 0.27);
    x.lineTo(px - w * 0.188, hz - w * 0.24);
    x.fill();
  }

  // море: задний слой (за китом) и передний (перекрывает низ кита)
  _sea(x, P, front) {
    const { W, H, t } = this;
    const hz = this.hz;
    if (!front) {
      const g = x.createLinearGradient(0, hz, 0, H);
      g.addColorStop(0, P.sea[0]);
      g.addColorStop(1, P.sea[1]);
      x.fillStyle = g;
      x.fillRect(0, hz, W, H - hz);
      if (this.biome === 'sky') {
        // облачное «море»
        for (let r = 0; r < 4; r++) {
          const yy = hz + (H - hz) * (0.1 + r * 0.25);
          const s = 30 + r * 25;
          for (let px = -s * 2 + ((-this.scroll * (0.3 + r * 0.25)) % (s * 2)); px < W + s * 2; px += s * 1.6) this._cloud(x, px, yy, s * 2, `rgba(255,255,255,${0.5 + r * 0.12})`);
        }
      } else {
        // полоски ряби
        x.strokeStyle = P.night ? 'rgba(160,190,255,.25)' : 'rgba(255,255,255,.35)';
        x.lineCap = 'round';
        const R = rng(7);
        for (let i = 0; i < 46; i++) {
          const yy = hz + 4 + Math.pow(R(), 1.3) * (H - hz);
          const k = (yy - hz) / (H - hz);
          const len = (14 + R() * 30) * (0.4 + k);
          const px = W + 60 - ((this.scroll * (0.4 + k * 1.2) + R() * W * 2) % (W + 120));
          x.lineWidth = 1 + k * 2;
          x.beginPath();
          x.moveTo(px, yy);
          x.lineTo(px + len, yy);
          x.stroke();
        }
        // дорожка солнца/луны
        const sx = this.R.x + this.R.w * 0.8;
        for (let i = 0; i < 14; i++) {
          const yy = hz + 3 + i * (H - hz) * 0.03;
          const w = (10 + i * 5) * (0.6 + 0.4 * Math.sin(t * 2 + i));
          x.strokeStyle = P.night ? 'rgba(230,230,200,.3)' : 'rgba(255,250,220,.45)';
          x.lineWidth = 2;
          x.beginPath();
          x.moveTo(sx - w / 2, yy);
          x.lineTo(sx + w / 2, yy);
          x.stroke();
        }
        if (this.biome === 'night') {
          // светящиеся медузы
          const R2 = rng(5);
          for (let i = 0; i < 8; i++) {
            const px = W + 40 - ((this.scroll * 0.6 + R2() * W * 2) % (W + 80));
            const py = hz + (H - hz) * (0.35 + R2() * 0.6) + Math.sin(t + i) * 6;
            const rr = 8 + R2() * 10;
            const gl = x.createRadialGradient(px, py, 0, px, py, rr * 3);
            gl.addColorStop(0, 'rgba(140,255,230,.5)');
            gl.addColorStop(1, 'rgba(140,255,230,0)');
            x.fillStyle = gl;
            x.fillRect(px - rr * 3, py - rr * 3, rr * 6, rr * 6);
            x.fillStyle = 'rgba(190,255,240,.7)';
            x.beginPath();
            x.arc(px, py, rr, Math.PI, 0);
            x.fill();
          }
        }
      }
      return;
    }
    // передний слой воды: полупрозрачная волна у ватерлинии кита
    const wl = this.cy + this.Hb * 0.12;
    const A = this.Hb * 0.05;
    const front0 = this.biome === 'sky' ? 'rgba(255,255,255,.88)' : P.night ? 'rgba(22,48,106,.82)' : 'rgba(40,140,215,.72)';
    const col = this.biome === 'north' ? 'rgba(80,140,175,.78)' : this.biome === 'tropic' ? 'rgba(40,170,190,.75)' : front0;
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(0, H);
    for (let px = 0; px <= W + 10; px += 10) x.lineTo(px, wl + Math.sin(px * 0.02 - t * 2.4 + this.scroll * 0.01) * A + Math.sin(px * 0.05 + t * 1.3) * A * 0.4);
    x.lineTo(W, H);
    x.closePath();
    x.fill();
    // пена у кита
    x.strokeStyle = P.foam;
    x.lineWidth = Math.max(2, this.Hb * 0.03);
    x.globalAlpha = 0.85;
    x.beginPath();
    const x0 = this.cx - this.Lw * 0.5,
      x1 = this.cx + this.Lw * 0.45;
    for (let px = x0; px <= x1; px += 6) {
      const y = wl + Math.sin(px * 0.02 - t * 2.4 + this.scroll * 0.01) * A + Math.sin(px * 0.05 + t * 1.3) * A * 0.4;
      if (px === x0) x.moveTo(px, y);
      else x.lineTo(px, y);
    }
    x.stroke();
    x.globalAlpha = 1;
    // носовой бурун
    for (let i = 0; i < 5; i++) {
      const k = (t * 1.6 + i / 5) % 1;
      x.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
      x.beginPath();
      x.arc(x1 + this.Lw * 0.02 - k * this.Lw * 0.2, wl - Math.sin(k * Math.PI) * this.Hb * 0.12, this.Hb * (0.03 + 0.03 * k), 0, TAU);
      x.fill();
    }
  }

  // кит
  _whale(x, P) {
    const t = this.t;
    const bob = this._bob();
    const sq = Math.sin(this.squish * Math.PI) * 0.05;
    x.save();
    x.translate(this.cx, this.cy + bob);
    x.scale(1 + sq, 1 - sq);
    x.translate(-this.cx, -this.cy);
    const N = 48;
    // хвост
    const tu = 0;
    const tx = this._x(tu),
      ty = (this._top(tu) + this._bot(tu)) / 2;
    const tw = Math.sin(t * 2.2) * 0.25;
    x.save();
    x.translate(tx, ty);
    x.rotate(-0.25 + tw);
    x.fillStyle = P.whale;
    x.strokeStyle = 'rgba(30,30,70,.45)';
    x.lineWidth = Math.max(1.5, this.Lw * 0.004);
    x.beginPath();
    x.moveTo(this.Lw * 0.04, -this.Hb * 0.14);
    x.quadraticCurveTo(-this.Lw * 0.06, -this.Hb * 0.12, -this.Lw * 0.11, -this.Hb * 0.48);
    x.quadraticCurveTo(-this.Lw * 0.15, -this.Hb * 0.2, -this.Lw * 0.09, -this.Hb * 0.02);
    x.quadraticCurveTo(-this.Lw * 0.16, this.Hb * 0.12, -this.Lw * 0.2, this.Hb * 0.02);
    x.quadraticCurveTo(-this.Lw * 0.12, this.Hb * 0.24, this.Lw * 0.04, this.Hb * 0.12);
    x.closePath();
    x.fill();
    x.stroke();
    x.restore();
    // тело
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const px = this._x(u),
        py = this._top(u);
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    const nx = this._x(1);
    x.bezierCurveTo(nx + this.Lw * 0.08, this._top(1), nx + this.Lw * 0.085, this._bot(1), nx, this._bot(1));
    for (let i = N; i >= 0; i--) {
      const u = i / N;
      x.lineTo(this._x(u), this._bot(u));
    }
    x.closePath();
    const g = x.createLinearGradient(0, this.cy - this.Hb, 0, this.cy + this.Hb * 0.6);
    g.addColorStop(0, P.whaleD);
    g.addColorStop(0.5, P.whale);
    g.addColorStop(1, P.whale);
    x.fillStyle = g;
    x.fill();
    x.save();
    x.clip();
    // светлое брюхо со складками
    x.fillStyle = P.belly;
    x.beginPath();
    x.moveTo(this._x(0.08), this.cy + this.Hb * 0.25);
    for (let i = 0; i <= 30; i++) {
      const u = 0.08 + (i / 30) * 0.97;
      x.lineTo(this._x(u), this.cy + this.Hb * (0.22 - 0.25 * Math.sin(((u - 0.08) / 0.97) * Math.PI * 0.9)));
    }
    x.lineTo(this._x(1.06), this.cy + this.Hb);
    x.lineTo(this._x(0.08), this.cy + this.Hb);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(80,90,150,.18)';
    x.lineWidth = Math.max(1, this.Hb * 0.02);
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.moveTo(this._x(0.42 + i * 0.01), this.cy + this.Hb * (0.3 + i * 0.07));
      x.quadraticCurveTo(this._x(0.75), this.cy + this.Hb * (0.25 + i * 0.07), this._x(1.0), this.cy + this.Hb * (0.08 + i * 0.07));
      x.stroke();
    }
    // пятнышки на спине
    x.fillStyle = 'rgba(255,255,255,.14)';
    const R = rng(3);
    for (let i = 0; i < 9; i++) {
      const u = 0.1 + R() * 0.7;
      x.beginPath();
      x.ellipse(this._x(u), this._top(u) + this.Hb * (0.25 + R() * 0.3), this.Hb * (0.04 + R() * 0.05), this.Hb * 0.03, 0, 0, TAU);
      x.fill();
    }
    if (this.biome === 'night') {
      x.fillStyle = 'rgba(140,255,230,.55)';
      for (let i = 0; i < 12; i++) {
        const u = 0.12 + (i / 12) * 0.75;
        x.beginPath();
        x.arc(this._x(u), this._top(u) + this.Hb * 0.35, this.Hb * 0.025 * (1 + 0.4 * Math.sin(t * 3 + i)), 0, TAU);
        x.fill();
      }
    }
    x.restore();
    x.strokeStyle = 'rgba(30,30,70,.45)';
    x.lineWidth = Math.max(1.5, this.Lw * 0.004);
    x.stroke();
    // грудной плавник
    const fu = 0.64;
    x.save();
    x.translate(this._x(fu), this.cy + this.Hb * 0.38);
    x.rotate(0.5 + Math.sin(t * 2.6) * 0.25);
    x.beginPath();
    x.ellipse(-this.Hb * 0.25, 0, this.Hb * 0.32, this.Hb * 0.11, 0, 0, TAU);
    x.fillStyle = P.whaleD;
    x.fill();
    x.stroke();
    x.restore();
    // глаз, щёчка, улыбка
    const ex = this._x(0.9),
      ey = this.cy - this.Hb * 0.14;
    const er = this.Hb * 0.09;
    const blink = this.t % 4.5 < 0.14;
    x.fillStyle = 'rgba(255,120,150,.45)';
    x.beginPath();
    x.ellipse(ex + er * 0.3, ey + er * 1.7, er * 1.15, er * 0.6, 0, 0, TAU);
    x.fill();
    if (blink) {
      x.strokeStyle = '#1a1a3a';
      x.lineWidth = er * 0.35;
      x.beginPath();
      x.arc(ex, ey, er * 0.8, 0.2, Math.PI - 0.2);
      x.stroke();
    } else {
      x.fillStyle = '#1a1a3a';
      x.beginPath();
      x.arc(ex, ey, er, 0, TAU);
      x.fill();
      x.fillStyle = '#fff';
      x.beginPath();
      x.arc(ex + er * 0.3, ey - er * 0.35, er * 0.38, 0, TAU);
      x.fill();
      x.beginPath();
      x.arc(ex - er * 0.3, ey + er * 0.35, er * 0.15, 0, TAU);
      x.fill();
    }
    x.strokeStyle = '#1a1a3a';
    x.lineWidth = er * 0.3;
    x.beginPath();
    x.moveTo(ex + er * 1.6, ey + er * 1.2);
    x.quadraticCurveTo(ex + er * 2.4, ey + er * 2.4, this._x(1.0) + this.Lw * 0.055, ey + er * 1.1);
    x.stroke();
    x.restore();
    // фонтан
    const b = this.blow();
    const sp = Math.max(this.spout, this.mega > 0 ? 1.4 : 0, 0.12 + 0.06 * Math.sin(t * 3));
    if (sp > 0.05) {
      const h = this.Hb * (0.4 + sp * 1.1);
      const gg = x.createLinearGradient(0, b.y - h, 0, b.y);
      gg.addColorStop(0, 'rgba(200,235,255,0)');
      gg.addColorStop(1, 'rgba(220,240,255,.85)');
      x.fillStyle = gg;
      x.beginPath();
      x.moveTo(b.x - this.Hb * 0.04, b.y);
      x.quadraticCurveTo(b.x - this.Hb * 0.02, b.y - h * 0.6, b.x - this.Hb * 0.25 * sp, b.y - h);
      x.quadraticCurveTo(b.x, b.y - h * 1.12, b.x + this.Hb * 0.25 * sp, b.y - h);
      x.quadraticCurveTo(b.x + this.Hb * 0.02, b.y - h * 0.6, b.x + this.Hb * 0.04, b.y);
      x.fill();
      if (this.mega > 0) {
        // радуга в брызгах
        const cols = ['rgba(255,90,106,.5)', 'rgba(255,200,60,.5)', 'rgba(90,208,106,.5)', 'rgba(74,168,255,.5)', 'rgba(154,106,255,.5)'];
        cols.forEach((c, i) => {
          x.strokeStyle = c;
          x.lineWidth = this.Hb * 0.05;
          x.beginPath();
          x.arc(b.x, b.y - h * 0.4, h * (0.55 - i * 0.05), Math.PI * 1.05, Math.PI * 1.95);
          x.stroke();
        });
      }
    }
    // трава и городок на спине
    this._town(x, P);
  }

  _town(x, P) {
    const t = this.t;
    const bob = this._bob();
    const [x0, x1] = this.span;
    const pad = this.bw * 0.5;
    // лужайка вдоль спины
    x.fillStyle = P.grass;
    x.strokeStyle = 'rgba(40,90,40,.4)';
    x.lineWidth = Math.max(1, this.bw * 0.03);
    x.beginPath();
    const steps = 30;
    const th = this.bw * (this.slots.length > 6 ? 0.42 : 0.2);
    for (let i = 0; i <= steps; i++) {
      const px = lerp(x0 - pad, x1 + pad, i / steps);
      const py = this.topAt(px) - th * Math.sin((i / steps) * Math.PI) * 0.6 + this.Hb * 0.02;
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    for (let i = steps; i >= 0; i--) {
      const px = lerp(x0 - pad, x1 + pad, i / steps);
      x.lineTo(px, this.topAt(px) + th * 0.9 * Math.sin((i / steps) * Math.PI) + this.Hb * 0.02);
    }
    x.closePath();
    x.fill();
    x.stroke();
    // цветочки
    const R = rng(31);
    for (let i = 0; i < Math.round((x1 - x0) / (this.bw * 0.4)); i++) {
      const px = lerp(x0 - pad * 0.7, x1 + pad * 0.7, R());
      const py = this.topAt(px) + this.Hb * 0.02 + th * 0.3;
      x.fillStyle = ['#fff', '#ffd23a', '#ff8aa0'][i % 3];
      x.beginPath();
      x.arc(px, py, Math.max(1.5, this.bw * 0.035), 0, TAU);
      x.fill();
    }
    // жители гуляют (за зданиями)
    for (const r of this.residents) {
      r.p += r.v * 0.016;
      if (r.p < 0 || r.p > 1) r.v = -r.v;
      r.p = clamp(r.p, 0, 1);
      const px = lerp(x0 - pad * 0.6, x1 + pad * 0.6, r.p);
      const py = this.topAt(px) + this.Hb * 0.02 - Math.abs(Math.sin(t * 8 + r.p * 40)) * this.bw * 0.04;
      const s = this.bw * 0.11;
      x.fillStyle = r.c;
      x.beginPath();
      x.ellipse(px, py - s * 1.2, s * 0.7, s * 0.9, 0, 0, TAU);
      x.fill();
      x.fillStyle = '#ffd8b8';
      x.beginPath();
      x.arc(px, py - s * 2.4, s * 0.6, 0, TAU);
      x.fill();
      if (r.hat === 0) {
        x.fillStyle = '#3a3a5a';
        x.fillRect(px - s * 0.6, py - s * 3.1, s * 1.2, s * 0.35);
      } else if (r.hat === 1) {
        x.fillStyle = '#ffd23a';
        x.beginPath();
        x.ellipse(px, py - s * 2.85, s * 0.9, s * 0.25, 0, 0, TAU);
        x.fill();
      }
      x.fillStyle = '#1a1a3a';
      x.beginPath();
      x.arc(px + s * 0.22 * Math.sign(r.v), py - s * 2.45, s * 0.1, 0, TAU);
      x.fill();
    }
    // здания
    for (const s of this.slots) {
      const n = this.counts[s.id] || 0;
      const y = this.topAt(s.x) + s.dy;
      if (s.pop) s.pop = Math.max(0, s.pop - 0.04);
      const pop = s.pop ? 1 + Math.sin(s.pop * Math.PI) * 0.18 : 1;
      if (!n) {
        if (s.avail) drawPlot(x, s.x, y, s.w * s.sc, t);
        continue;
      }
      x.save();
      x.translate(s.x, y);
      x.scale(pop, pop);
      drawBuilding(x, s.id, 0, 0, s.w * 0.92 * s.sc, milestonesOf(n), t, P.night);
      x.restore();
    }
  }

  // чайка с подарком
  _gull(x, dt) {
    const G = this.gull;
    if (!G) return;
    G.p += dt / G.dur;
    const { W } = this;
    const px = lerp(-80, W + 80, G.p);
    const py = this.hz * 0.45 + Math.sin(G.p * 9) * this.hz * 0.08;
    G.x = px;
    G.y = py;
    const s = Math.max(0.8, this.Lw / 700) * 1.1;
    const f = Math.sin(this.t * 10) * 12 * s;
    x.save();
    x.translate(px, py);
    // подарок
    x.strokeStyle = '#8a6a4a';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, 6 * s);
    x.lineTo(0, 18 * s);
    x.stroke();
    x.fillStyle = '#ff5a6a';
    x.fillRect(-10 * s, 18 * s, 20 * s, 16 * s);
    x.fillStyle = '#ffd23a';
    x.fillRect(-2 * s, 18 * s, 4 * s, 16 * s);
    x.fillRect(-10 * s, 24 * s, 20 * s, 4 * s);
    // сияние
    const gl = x.createRadialGradient(0, 20 * s, 0, 0, 20 * s, 40 * s);
    gl.addColorStop(0, 'rgba(255,240,150,.5)');
    gl.addColorStop(1, 'rgba(255,240,150,0)');
    x.fillStyle = gl;
    x.fillRect(-40 * s, -20 * s, 80 * s, 80 * s);
    // птица
    x.fillStyle = '#fff';
    x.strokeStyle = 'rgba(40,40,60,.6)';
    x.lineWidth = 1.5;
    x.beginPath();
    x.ellipse(0, 0, 14 * s, 7 * s, 0, 0, TAU);
    x.fill();
    x.stroke();
    x.beginPath();
    x.moveTo(-4 * s, -2 * s);
    x.quadraticCurveTo(-14 * s, -14 * s - f, -26 * s, -6 * s - f);
    x.quadraticCurveTo(-14 * s, -4 * s, -4 * s, 2 * s);
    x.fill();
    x.stroke();
    x.beginPath();
    x.moveTo(4 * s, -2 * s);
    x.quadraticCurveTo(14 * s, -14 * s - f, 26 * s, -6 * s - f);
    x.quadraticCurveTo(14 * s, -4 * s, 4 * s, 2 * s);
    x.fill();
    x.stroke();
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(13 * s, -3 * s, 5 * s, 0, TAU);
    x.fill();
    x.stroke();
    x.fillStyle = '#ffb03a';
    x.beginPath();
    x.moveTo(17 * s, -3 * s);
    x.lineTo(24 * s, -1 * s);
    x.lineTo(17 * s, 0);
    x.fill();
    x.fillStyle = '#111';
    x.beginPath();
    x.arc(14 * s, -4.5 * s, 1.2 * s, 0, TAU);
    x.fill();
    x.restore();
    if (G.p >= 1) this.gull = null;
  }
  hitGull(px, py) {
    const G = this.gull;
    if (!G || G.x === undefined) return false;
    const s = Math.max(0.8, this.Lw / 700) * 1.1;
    return Math.hypot(px - G.x, py - (G.y + 14 * s)) < 46 * s;
  }

  _particles(x, dt) {
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = Math.max(0, p.life / p.max);
      if (p.t === 'drop') {
        p.vy += 600 * dt;
        x.fillStyle = `rgba(225,245,255,${0.9 * a})`;
        x.beginPath();
        x.arc(p.x, p.y, p.r, 0, TAU);
        x.fill();
      } else if (p.t === 'shell') {
        p.vy += 500 * dt;
        p.rot += dt * 5;
        x.save();
        x.translate(p.x, p.y);
        x.rotate(p.rot);
        x.globalAlpha = a;
        x.beginPath();
        x.moveTo(-p.r, p.r * 0.4);
        x.quadraticCurveTo(0, -p.r * 1.4, p.r, p.r * 0.4);
        x.closePath();
        x.fillStyle = '#ffb88a';
        x.fill();
        x.strokeStyle = '#c8704a';
        x.lineWidth = 1.2;
        x.stroke();
        x.beginPath();
        for (const k of [-0.5, 0, 0.5]) {
          x.moveTo(0, p.r * 0.4);
          x.lineTo(k * p.r, -p.r * 0.5);
        }
        x.stroke();
        x.restore();
      } else if (p.t === 'spark') {
        p.vx *= 0.93;
        p.vy *= 0.93;
        x.fillStyle = `rgba(255,236,140,${a})`;
        x.beginPath();
        x.arc(p.x, p.y, p.r * a, 0, TAU);
        x.fill();
      }
    }
    this.parts = this.parts.filter((p) => p.life > 0 && p.y < this.H + 40);
    // всплывающие числа
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (const q of this.texts) {
      q.life -= dt;
      q.y -= dt * 70;
      const a = clamp(q.life / q.max * 1.6, 0, 1);
      const fs = (q.big ? 30 : 22) * clamp(this.Lw / 650, 0.75, 1.3);
      x.font = `800 ${fs}px Rubik, sans-serif`;
      x.globalAlpha = a;
      x.lineWidth = fs * 0.18;
      x.strokeStyle = 'rgba(30,40,90,.75)';
      x.strokeText(q.s, q.x, q.y);
      x.fillStyle = q.color || '#fff';
      x.fillText(q.s, q.x, q.y);
    }
    x.globalAlpha = 1;
    this.texts = this.texts.filter((q) => q.life > 0);
  }
}
