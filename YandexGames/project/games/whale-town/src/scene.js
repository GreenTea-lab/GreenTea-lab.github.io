// Сцена: океан пяти биомов, кит с городком на спине, жители, чайка с подарком, острова, фонтан и брызги
import { BUILDINGS, milestonesOf, rng } from "./data.js";
import { drawBuilding, drawPlot } from "./buildings.js";
import {
  nearIsland,
  farIsland,
  cloudSprite,
  FAR_BY,
  FAR_CX,
  FAR_H,
  shade,
} from "./art.js";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

// палитры биомов
export const PAL = {
  warm: {
    sky: ["#4fb2f0", "#a8defc", "#e6f7ff"],
    sea: ["#3aa0e0", "#1a5f9e"],
    whale: "#5b82e0",
    whaleD: "#3f62c0",
    belly: "#d4e4ff",
    foam: "#ffffff",
    sun: "#fff6c8",
    grass: "#6cc35a",
    night: false,
  },
  north: {
    sky: ["#8fb8d8", "#cfe4f0", "#f2f8fb"],
    sea: ["#5a92b0", "#24506a"],
    whale: "#6f8ab0",
    whaleD: "#4f6a90",
    belly: "#e6eef8",
    foam: "#ffffff",
    sun: "#ffffff",
    grass: "#8fd0a0",
    night: false,
  },
  tropic: {
    sky: ["#7a6ad0", "#ff9a8a", "#ffd89a"],
    sea: ["#2fb0c0", "#146a8a"],
    whale: "#5a6ad8",
    whaleD: "#4048b0",
    belly: "#ffe0e8",
    foam: "#fff4ea",
    sun: "#ffe08a",
    grass: "#7ad05a",
    night: false,
  },
  night: {
    sky: ["#0b1238", "#1f2a68", "#3a3f86"],
    sea: ["#16306a", "#081436"],
    whale: "#4a6ac8",
    whaleD: "#2f4aa0",
    belly: "#bcd0ff",
    foam: "#a8c8ff",
    sun: "#fffbe0",
    grass: "#4a9a6a",
    night: true,
  },
  sky: {
    sky: ["#ffc8e6", "#e6dcff", "#cfeeff"],
    sea: ["#ffffff", "#e8eeff"],
    whale: "#7a8ef0",
    whaleD: "#5a6ad0",
    belly: "#f0f4ff",
    foam: "#ffffff",
    sun: "#fff6d8",
    grass: "#8ad87a",
    night: false,
  },
};

export class Scene {
  constructor(cv) {
    this.cv = cv;
    this.ctx = cv.getContext("2d");
    this.t = 0;
    this.biome = "warm";
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
    if (W !== this.W || H !== this.H || dpr !== this.dpr || !this.cv.width) {
      this.W = W;
      this.H = H;
      this.dpr = dpr;
      this.cv.width = Math.round(W * dpr);
      this.cv.height = Math.round(H * dpr);
      this.cv.style.width = W + "px";
      this.cv.style.height = H + "px";
    }
    // масштаб фона зависит только от окна (не от панели) — спрайты не пересоздаются при её сворачивании
    this.farS = Math.min(W, H * 1.6) / 900 + 0.25;
    this.setRect(R);
  }
  // только прямоугольник сцены (без пересоздания холста) — для плавного сворачивания панели
  setRect(R) {
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
    // в высоком окне (свёрнутая панель) кит крупнее, но целиком влезает по ширине
    const tall = port ? clamp((R.h / R.w - 0.9) / 0.7, 0, 1) : 0;
    const k = port
      ? Math.min(0.88, 0.74 + 0.028 * (st - 1) + 0.1 * tall)
      : 0.62 + 0.04 * (st - 1);
    this.Lw = port
      ? Math.min(R.w * k, R.h * 1.25)
      : Math.min(R.w * k, R.h * k * 1.35);
    this.Hb = this.Lw * 0.3;
    // по горизонтали кит от хвоста (-0.68) до носа (+0.43) — центрируем
    this.cx = R.x + R.w * 0.5 + this.Lw * (port ? 0.1 : 0.125);
    this.cy = R.y + R.h * 0.66;
    const n = [3, 5, 7, 9, 11, 12][st - 1];
    const old = {};
    for (const q of this.slots || []) old[q.id] = q;
    this.slots = [];
    // больше шести зданий — два ряда: задний (выше по спине) и передний
    const rows = n > 6 ? 2 : 1;
    const perRow = Math.ceil(n / rows);
    const flat = this.Lw * 0.84 * 0.6;
    const bw = Math.min(flat / (perRow * 0.95), this.Lw * 0.12);
    const span = bw * perRow * 0.95;
    const xc = this._x(0.46);
    const x0 = xc - span / 2;
    for (let i = 0; i < n; i++) {
      const row = rows === 2 ? (i % 2 === 0 ? 1 : 0) : 1;
      const j = rows === 2 ? Math.floor(i / 2) : i;
      const off = rows === 2 && row === 0 ? 0.5 : 0;
      const sx =
        x0 +
        (j + 0.5 + off) * (span / perRow) -
        (rows === 2 && row === 0 ? span / perRow / 2 : 0);
      const o = old[BUILDINGS[i].id];
      this.slots.push({
        id: BUILDINGS[i].id,
        x: sx,
        row,
        dy: rows === 2 ? (row === 0 ? -bw * 0.12 : bw * 0.3) : bw * 0.1,
        sc: row === 0 && rows === 2 ? 0.86 : 1,
        w: bw,
        avail: o && o.avail,
        pop: o && o.pop,
      });
    }
    this.slots.sort((a, b) => a.row - b.row);
    this.bw = bw;
    if (this._resSt !== st) {
      this._resSt = st;
      this.residents = [];
      const R2 = rng(st * 7 + 3);
      for (let i = 0; i < Math.min(14, 2 + st * 2); i++)
        this.residents.push({
          p: R2(),
          v: (0.03 + R2() * 0.04) * (R2() < 0.5 ? 1 : -1),
          c: ["#ff6a8a", "#ffb03a", "#4aa8ff", "#5ad06a", "#c86aff"][i % 5],
          hat: i % 3,
        });
    }
    this.rows = rows;
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
    if (u < 0.75)
      g = 0.12 + 0.55 * Math.sin((Math.min(1, u / 0.6) * Math.PI) / 2);
    else g = 0.67 - 0.42 * Math.pow((u - 0.75) / 0.25, 2);
    return this.cy + this.Hb * g;
  }
  topAt(x) {
    return this._ty(x) + this._bob();
  }
  // верх спины без покачивания (внутри трансформации кита)
  _ty(x) {
    return this._top(
      clamp((x - (this.cx - this.Lw * 0.48)) / (this.Lw * 0.84), 0, 1),
    );
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
    const u = 0.82;
    return { x: this._x(u), y: this._top(u) + this.Hb * 0.2 + this._bob() };
  }

  setState(o) {
    if (o.stage && o.stage !== this.stage) {
      this.stage = o.stage;
      this.layout();
    }
    if (o.biome) this.biome = o.biome;
    if (o.isl !== undefined) this.islSeed = o.isl;
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
      this.parts.push({
        t: "drop",
        x: b.x,
        y: b.y - this.Hb * 0.1,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1,
        max: 1,
        r: (2.2 + Math.random() * 2.6) * (this.Lw / 700),
      });
    }
    for (let i = 0; i < (big ? 3 : 1); i++)
      this.parts.push({
        t: "mist",
        x: b.x + (Math.random() - 0.5) * this.Hb * 0.2,
        y: b.y - this.Hb * (0.35 + Math.random() * 0.3),
        vx: (Math.random() - 0.5) * 30,
        vy: -20,
        life: 0.7,
        max: 0.7,
        r: this.Hb * 0.12,
      });
    for (let i = 0; i < (big ? 5 : 2); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = (160 + Math.random() * 160) * (this.Lw / 700);
      this.parts.push({
        t: "shell",
        x: b.x,
        y: b.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1.3,
        max: 1.3,
        r: (7 + Math.random() * 3) * (this.Lw / 700),
        rot: Math.random() * 6,
      });
    }
    if (txt) {
      this.texts.push({
        x: px + (Math.random() - 0.5) * 60,
        y: py - 10 - Math.random() * 20,
        s: txt,
        life: 1.1,
        max: 1.1,
        big,
      });
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
      this.parts.push({
        t: "spark",
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1,
        max: 1,
        r: 3 + Math.random() * 4,
      });
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
    this._sea(x, P, false);
    this._far(x, P);
    this._islandDraw(x, P);
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
    gl.addColorStop(
      0,
      P.night ? "rgba(220,230,255,.35)" : "rgba(255,250,220,.55)",
    );
    gl.addColorStop(1, "rgba(255,250,220,0)");
    x.fillStyle = gl;
    x.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
    if (!P.night) {
      // мягкие лучи медленно вращаются
      x.save();
      x.translate(sx, sy);
      x.rotate(t * 0.04);
      x.fillStyle = "rgba(255,252,225,.14)";
      x.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12,
          l = r * (2.4 + 0.35 * Math.sin(t * 0.8 + i * 1.7));
        x.moveTo(Math.cos(a - 0.09) * r * 1.15, Math.sin(a - 0.09) * r * 1.15);
        x.lineTo(Math.cos(a) * l, Math.sin(a) * l);
        x.lineTo(Math.cos(a + 0.09) * r * 1.15, Math.sin(a + 0.09) * r * 1.15);
      }
      x.fill();
      x.restore();
    }
    x.fillStyle = P.sun;
    x.beginPath();
    x.arc(sx, sy, r, 0, TAU);
    x.fill();
    if (!P.night) {
      x.fillStyle = "rgba(255,255,255,.45)";
      x.beginPath();
      x.arc(sx - r * 0.18, sy - r * 0.18, r * 0.62, 0, TAU);
      x.fill();
    }
    if (P.night) {
      x.fillStyle = PAL.night.sky[1];
      x.beginPath();
      x.arc(sx + r * 0.45, sy - r * 0.25, r * 0.85, 0, TAU);
      x.fill();
      // кратеры на луне
      x.fillStyle = "rgba(200,190,140,.35)";
      x.beginPath();
      x.arc(sx - r * 0.55, sy + r * 0.1, r * 0.13, 0, TAU);
      x.arc(sx - r * 0.3, sy + r * 0.55, r * 0.09, 0, TAU);
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
    if (this.biome === "north") {
      // северное сияние
      for (let i = 0; i < 3; i++) {
        const gg = x.createLinearGradient(0, hz * 0.1, 0, hz * 0.6);
        gg.addColorStop(0, "rgba(120,255,200,0)");
        gg.addColorStop(
          0.5,
          `rgba(120,255,200,${0.16 + 0.06 * Math.sin(t + i)})`,
        );
        gg.addColorStop(1, "rgba(120,255,200,0)");
        x.fillStyle = gg;
        x.beginPath();
        x.moveTo(0, hz * 0.3);
        for (let px = 0; px <= W; px += 40)
          x.lineTo(
            px,
            hz * (0.2 + 0.08 * Math.sin(px * 0.006 + t * 0.4 + i * 2)) +
              i * hz * 0.08,
          );
        x.lineTo(W, hz * 0.55);
        x.lineTo(0, hz * 0.55);
        x.fill();
      }
    }
    // облака плывут (объёмные спрайты)
    const nC = this.biome === "sky" ? 8 : 5;
    const tone = P.night ? "night" : this.biome === "tropic" ? "sunset" : "day";
    const R = rng(23);
    x.globalAlpha = P.night ? 0.55 : 0.95;
    for (let i = 0; i < nC; i++) {
      const sp = 0.3 + R() * 0.5;
      const cw = (90 + R() * 90) * this.farS;
      const px =
        W + cw - ((this.scroll * sp * 0.4 + R() * W * 1.5) % (W + cw * 3));
      const py = hz * (0.12 + R() * 0.45);
      x.drawImage(
        cloudSprite(i % 3, tone),
        px - cw * 0.5,
        py - cw * 0.3,
        cw,
        cw * 0.5,
      );
    }
    x.globalAlpha = 1;
  }

  // айсберг дальнего плана
  _berg(x, px, hz, w) {
    x.fillStyle = "rgba(200,232,248,.45)";
    x.beginPath();
    x.ellipse(px, hz + w * 0.03, w * 0.5, w * 0.05, 0, 0, TAU);
    x.fill();
    const poly = (pts, c) => {
      x.fillStyle = c;
      x.beginPath();
      pts.forEach(([a, b], i) =>
        i ? x.lineTo(px + a * w, hz + b * w) : x.moveTo(px + a * w, hz + b * w),
      );
      x.closePath();
      x.fill();
    };
    poly(
      [
        [-0.42, 0.01],
        [-0.3, -0.18],
        [-0.16, -0.32],
        [0.0, -0.25],
        [0.17, -0.42],
        [0.31, -0.2],
        [0.44, 0.01],
      ],
      "#f2faff",
    );
    poly(
      [
        [0.0, -0.25],
        [0.17, -0.42],
        [0.31, -0.2],
        [0.44, 0.01],
        [0.12, 0.01],
      ],
      "#c6e0f0",
    );
    poly(
      [
        [-0.16, -0.32],
        [-0.08, -0.08],
        [-0.3, -0.18],
      ],
      "#e0eef8",
    );
    x.fillStyle = "rgba(150,200,225,.6)";
    x.fillRect(px - w * 0.42, hz - w * 0.02, w * 0.86, w * 0.03);
  }

  // дальний план: острова с пальмами в дымке, айсберги, облачные острова
  _far(x, P) {
    const { W } = this;
    const hz = this.hz;
    const b = this.biome;
    const R = rng(b.length * 13);
    const haze = P.night ? P.sky[1] : P.sky[2];
    for (let i = 0; i < 5; i++) {
      const w = Math.round(((48 + R() * 64) * this.farS) / 4) * 4;
      const per = W + w * 2.6;
      const px = W + w * 1.3 - ((this.scroll * 0.22 + R() * per * 2) % per);
      if (px < -w || px > W + w) continue;
      if (b === "sky") {
        x.globalAlpha = 0.85;
        x.drawImage(
          cloudSprite(i % 3, "day"),
          px - w * 0.6,
          hz - w * 0.32,
          w * 1.2,
          w * 0.6,
        );
        x.globalAlpha = 1;
      } else if (b === "north" && i % 2 === 0) this._berg(x, px, hz, w);
      else
        x.drawImage(
          farIsland(b, (i % 3) + 1, w, haze, P.night ? 0.55 : 0.5, this.dpr),
          px - w * FAR_CX,
          hz - w * FAR_BY + w * 0.015,
          w * 1.3,
          w * FAR_H,
        );
    }
  }

  // остров, к которому плывёт кит (k: 0 далеко … 1 прибыли)
  _islandDraw(x, P) {
    const k = this.islandK;
    if (k <= 0.55) return;
    const p = (k - 0.55) / 0.45;
    const { W } = this;
    const w = this.Lw * (0.3 + 0.24 * p);
    const end = this.R.x + this.R.w * 0.74;
    const px = W + w * 0.7 - p * (W + w * 0.7 - end);
    nearIsland(
      x,
      px,
      this.hz + w * 0.02,
      w,
      this.biome,
      (this.islSeed || 0) + 1,
      this.t,
      this.dpr,
    );
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
      // дымка у горизонта
      const hh = (H - hz) * 0.16;
      const hg = x.createLinearGradient(0, hz, 0, hz + hh);
      hg.addColorStop(
        0,
        P.night ? "rgba(120,140,230,.35)" : "rgba(255,255,255,.5)",
      );
      hg.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = hg;
      x.fillRect(0, hz, W, hh);
      if (this.biome === "sky") {
        // облачное «море»
        for (let r = 0; r < 4; r++) {
          const yy = hz + (H - hz) * (0.1 + r * 0.25);
          const s = (34 + r * 26) * this.farS;
          let i = 0;
          for (
            let px = -s * 2 + ((-this.scroll * (0.3 + r * 0.25)) % (s * 2));
            px < W + s * 2;
            px += s * 1.6
          ) {
            x.globalAlpha = 0.55 + r * 0.12;
            x.drawImage(
              cloudSprite((r + i++) % 3, "day"),
              px - s * 1.2,
              yy - s * 0.7,
              s * 2.4,
              s * 1.2,
            );
          }
        }
        x.globalAlpha = 1;
      } else {
        // гребешки волн
        x.strokeStyle = P.night
          ? "rgba(160,190,255,.25)"
          : "rgba(255,255,255,.38)";
        x.lineCap = "round";
        // три толщины — три пути вместо сорока шести
        for (let band = 0; band < 3; band++) {
          const R = rng(7);
          x.lineWidth = 1.3 + band;
          x.beginPath();
          for (let i = 0; i < 46; i++) {
            const yy = hz + 4 + Math.pow(R(), 1.3) * (H - hz);
            const k = (yy - hz) / (H - hz);
            const len = (14 + R() * 30) * (0.4 + k);
            const px =
              W +
              60 -
              ((this.scroll * (0.4 + k * 1.2) + R() * W * 2) % (W + 120));
            if (Math.min(2, Math.floor(k * 3)) !== band) continue;
            const bob = Math.sin(t * 1.6 + i) * len * 0.05;
            x.moveTo(px, yy + bob);
            x.quadraticCurveTo(
              px + len * 0.5,
              yy + bob - len * 0.13,
              px + len,
              yy + bob,
            );
          }
          x.stroke();
        }
        // дорожка солнца/луны и блёстки
        const sx = this.R.x + this.R.w * 0.8;
        x.strokeStyle = P.night
          ? "rgba(230,230,200,.3)"
          : "rgba(255,250,220,.45)";
        x.lineWidth = 2;
        x.beginPath();
        for (let i = 0; i < 14; i++) {
          const yy = hz + 3 + i * (H - hz) * 0.03;
          const w = (10 + i * 5) * (0.6 + 0.4 * Math.sin(t * 2 + i));
          x.moveTo(sx - w / 2, yy);
          x.lineTo(sx + w / 2, yy);
        }
        x.stroke();
        const R3 = rng(41);
        x.fillStyle = P.night
          ? "rgba(240,240,210,.9)"
          : "rgba(255,255,240,.95)";
        x.beginPath();
        for (let i = 0; i < 9; i++) {
          const yy = hz + 6 + R3() * (H - hz) * 0.42;
          const px = sx + (R3() - 0.5) * (20 + (yy - hz) * 0.5);
          const tw = Math.max(0, Math.sin(t * (2 + R3() * 2) + i * 2.3));
          const s = (2 + (yy - hz) * 0.02) * tw;
          if (s < 0.4) continue;
          x.moveTo(px - s * 2, yy);
          x.quadraticCurveTo(px, yy, px, yy - s * 2);
          x.quadraticCurveTo(px, yy, px + s * 2, yy);
          x.quadraticCurveTo(px, yy, px, yy + s * 2);
          x.quadraticCurveTo(px, yy, px - s * 2, yy);
        }
        x.fill();
        if (this.biome === "night") {
          // светящиеся медузы
          const R2 = rng(5);
          for (let i = 0; i < 8; i++) {
            const px = W + 40 - ((this.scroll * 0.6 + R2() * W * 2) % (W + 80));
            const py =
              hz + (H - hz) * (0.35 + R2() * 0.6) + Math.sin(t + i) * 6;
            const rr = 8 + R2() * 10;
            const gl = x.createRadialGradient(px, py, 0, px, py, rr * 3);
            gl.addColorStop(0, "rgba(140,255,230,.5)");
            gl.addColorStop(1, "rgba(140,255,230,0)");
            x.fillStyle = gl;
            x.fillRect(px - rr * 3, py - rr * 3, rr * 6, rr * 6);
            x.fillStyle = "rgba(190,255,240,.7)";
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
    const yAt = (px) =>
      wl +
      Math.sin(px * 0.02 - t * 2.4 + this.scroll * 0.01) * A +
      Math.sin(px * 0.05 + t * 1.3) * A * 0.4;
    const front0 =
      this.biome === "sky"
        ? "rgba(255,255,255,.88)"
        : P.night
          ? "rgba(22,48,106,.82)"
          : "rgba(40,140,215,.72)";
    const col =
      this.biome === "north"
        ? "rgba(80,140,175,.78)"
        : this.biome === "tropic"
          ? "rgba(40,170,190,.75)"
          : front0;
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(0, H);
    for (let px = 0; px <= W + 10; px += 10) x.lineTo(px, yAt(px));
    x.lineTo(W, H);
    x.closePath();
    x.fill();
    // светлый гребень волны
    x.strokeStyle = P.night ? "rgba(170,200,255,.3)" : "rgba(255,255,255,.35)";
    x.lineWidth = Math.max(1.5, this.Hb * 0.012);
    x.beginPath();
    for (let px = 0; px <= W + 10; px += 10)
      px ? x.lineTo(px, yAt(px)) : x.moveTo(px, yAt(px));
    x.stroke();
    // пена у кита: мягкая широкая полоса и тонкая кромка
    const x0 = this.cx - this.Lw * 0.5,
      x1 = this.cx + this.Lw * 0.41;
    x.beginPath();
    for (let px = x0; px <= x1; px += 6)
      px === x0 ? x.moveTo(px, yAt(px)) : x.lineTo(px, yAt(px));
    x.strokeStyle = P.foam;
    x.lineCap = "round";
    x.globalAlpha = 0.25;
    x.lineWidth = Math.max(3, this.Hb * 0.07);
    x.stroke();
    x.globalAlpha = 0.85;
    x.lineWidth = Math.max(1.5, this.Hb * 0.022);
    x.stroke();
    // клочки пены уплывают назад вдоль бока
    x.fillStyle = P.foam;
    for (let i = 0; i < 10; i++) {
      const k = (t * 0.3 + i / 10) % 1;
      const fx = x1 - k * (x1 - x0);
      const rx = this.Hb * (0.045 + 0.03 * Math.sin(i * 2.7));
      x.globalAlpha = 0.6 * Math.sin(k * Math.PI);
      x.beginPath();
      x.ellipse(fx, yAt(fx) + this.Hb * 0.025, rx, rx * 0.26, 0, 0, TAU);
      x.fill();
    }
    x.globalAlpha = 1;
    this._bow(x, P, yAt);
  }

  // носовой бурун: вода горкой у морды, пенный след и мелкие капельки
  _bow(x, P, yAt) {
    const t = this.t,
      Hb = this.Hb,
      Lw = this.Lw;
    const nx = this.cx + Lw * 0.43;
    const y0 = yAt(nx);
    const hh = Hb * (0.085 + 0.015 * Math.sin(t * 3.1));
    const foam = P.foam;
    // пенный след от носа вниз-назад
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.45 + i / 5) % 1;
      const fx = nx + Hb * 0.05 - Lw * 0.1 * k + Math.sin(i * 2.3) * Hb * 0.04,
        fy = y0 + Hb * (0.06 + 0.16 * k);
      const rx = Hb * (0.07 + 0.06 * k);
      x.globalAlpha = 0.3 * (1 - k) * Math.min(1, k * 5);
      x.fillStyle = foam;
      x.beginPath();
      x.ellipse(fx, fy, rx, rx * 0.22, -0.12, 0, TAU);
      x.fill();
    }
    x.globalAlpha = 1;
    // водяная горка: мягкий градиент, кромка из трёх волн
    const L = nx - Hb * 0.12,
      Rr = nx + Hb * 0.22;
    const g = x.createLinearGradient(0, y0 - hh, 0, y0 + Hb * 0.04);
    g.addColorStop(
      0,
      P.night ? "rgba(200,220,255,.9)" : "rgba(255,255,255,.95)",
    );
    g.addColorStop(
      1,
      P.night ? "rgba(160,190,255,.15)" : "rgba(255,255,255,.15)",
    );
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(L, y0 + Hb * 0.03);
    x.quadraticCurveTo(
      L + Hb * 0.04,
      y0 - hh * 0.7,
      nx - Hb * 0.06,
      y0 - hh * 0.85,
    );
    x.quadraticCurveTo(
      nx - Hb * 0.02,
      y0 - hh * 1.05,
      nx + Hb * 0.03,
      y0 - hh * 0.9,
    );
    x.quadraticCurveTo(
      nx + Hb * 0.08,
      y0 - hh * 0.95,
      nx + Hb * 0.12,
      y0 - hh * 0.55,
    );
    x.quadraticCurveTo(nx + Hb * 0.16, y0 - hh * 0.3, Rr, y0 + Hb * 0.02);
    x.closePath();
    x.fill();
    x.strokeStyle = foam;
    x.lineWidth = Math.max(1, Hb * 0.014);
    x.globalAlpha = 0.9;
    x.beginPath();
    x.moveTo(L + Hb * 0.03, y0 - hh * 0.45);
    x.quadraticCurveTo(
      L + Hb * 0.05,
      y0 - hh * 0.75,
      nx - Hb * 0.06,
      y0 - hh * 0.85,
    );
    x.quadraticCurveTo(
      nx - Hb * 0.02,
      y0 - hh * 1.05,
      nx + Hb * 0.03,
      y0 - hh * 0.9,
    );
    x.quadraticCurveTo(
      nx + Hb * 0.08,
      y0 - hh * 0.95,
      nx + Hb * 0.12,
      y0 - hh * 0.55,
    );
    x.stroke();
    // мелкие брызги-капельки вперёд
    x.fillStyle = P.night ? "rgba(210,225,255,1)" : "rgba(255,255,255,1)";
    const R = rng(77);
    for (let i = 0; i < 7; i++) {
      const sp = 0.8 + R() * 0.8,
        vx = Hb * (0.15 + R() * 0.25),
        vy = Hb * (0.18 + R() * 0.14),
        r0 = Hb * (0.009 + R() * 0.008);
      const k = (t * sp + i / 7) % 1;
      const px = nx + Hb * 0.04 + vx * k,
        py = y0 - hh * 0.8 - vy * k + vy * 1.6 * k * k;
      x.globalAlpha = 0.85 * (1 - k);
      x.beginPath();
      x.arc(px, py, r0 * (1 - k * 0.4), 0, TAU);
      x.fill();
    }
    x.globalAlpha = 1;
  }

  // кит (городок на спине рисуется в той же трансформации — при тапе приминается вместе с китом)
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
    x.strokeStyle = "rgba(30,30,70,.45)";
    x.lineWidth = Math.max(1.5, this.Lw * 0.004);
    x.beginPath();
    x.moveTo(this.Lw * 0.04, -this.Hb * 0.14);
    x.quadraticCurveTo(
      -this.Lw * 0.06,
      -this.Hb * 0.12,
      -this.Lw * 0.11,
      -this.Hb * 0.48,
    );
    x.quadraticCurveTo(
      -this.Lw * 0.15,
      -this.Hb * 0.2,
      -this.Lw * 0.09,
      -this.Hb * 0.02,
    );
    x.quadraticCurveTo(
      -this.Lw * 0.16,
      this.Hb * 0.12,
      -this.Lw * 0.2,
      this.Hb * 0.02,
    );
    x.quadraticCurveTo(
      -this.Lw * 0.12,
      this.Hb * 0.24,
      this.Lw * 0.04,
      this.Hb * 0.12,
    );
    x.closePath();
    x.fill();
    x.stroke();
    // складка на хвосте
    x.strokeStyle = "rgba(20,30,90,.18)";
    x.beginPath();
    x.moveTo(-this.Lw * 0.02, -this.Hb * 0.05);
    x.quadraticCurveTo(
      -this.Lw * 0.07,
      -this.Hb * 0.02,
      -this.Lw * 0.09,
      -this.Hb * 0.02,
    );
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
    x.bezierCurveTo(
      nx + this.Lw * 0.08,
      this._top(1),
      nx + this.Lw * 0.085,
      this._bot(1),
      nx,
      this._bot(1),
    );
    for (let i = N; i >= 0; i--) {
      const u = i / N;
      x.lineTo(this._x(u), this._bot(u));
    }
    x.closePath();
    const g = x.createLinearGradient(
      0,
      this.cy - this.Hb,
      0,
      this.cy + this.Hb * 0.6,
    );
    g.addColorStop(0, P.whaleD);
    g.addColorStop(0.5, P.whale);
    g.addColorStop(1, P.whale);
    x.fillStyle = g;
    x.fill();
    x.save();
    x.clip();
    // к хвосту кожа чуть темнее, у головы — блик
    const sg = x.createLinearGradient(this._x(0), 0, this._x(0.45), 0);
    sg.addColorStop(0, "rgba(15,25,80,.22)");
    sg.addColorStop(1, "rgba(15,25,80,0)");
    x.fillStyle = sg;
    x.fillRect(
      this._x(0) - this.Lw * 0.05,
      this.cy - this.Hb * 1.2,
      this.Lw * 0.45,
      this.Hb * 2.4,
    );
    const hx = this._x(0.86),
      hy = this._top(0.86) + this.Hb * 0.22;
    const hg = x.createRadialGradient(hx, hy, 0, hx, hy, this.Hb * 0.45);
    hg.addColorStop(0, "rgba(255,255,255,.2)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = hg;
    x.fillRect(
      hx - this.Hb * 0.45,
      hy - this.Hb * 0.45,
      this.Hb * 0.9,
      this.Hb * 0.9,
    );
    // светлое брюхо со складками
    x.fillStyle = P.belly;
    x.beginPath();
    x.moveTo(this._x(0.08), this.cy + this.Hb * 0.25);
    for (let i = 0; i <= 30; i++) {
      const u = 0.08 + (i / 30) * 0.97;
      x.lineTo(
        this._x(u),
        this.cy +
          this.Hb *
            (0.22 - 0.25 * Math.sin(((u - 0.08) / 0.97) * Math.PI * 0.9)),
      );
    }
    x.lineTo(this._x(1.06), this.cy + this.Hb);
    x.lineTo(this._x(0.08), this.cy + this.Hb);
    x.closePath();
    x.fill();
    x.strokeStyle = "rgba(80,90,150,.18)";
    x.lineWidth = Math.max(1, this.Hb * 0.02);
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.moveTo(this._x(0.42 + i * 0.01), this.cy + this.Hb * (0.3 + i * 0.07));
      x.quadraticCurveTo(
        this._x(0.75),
        this.cy + this.Hb * (0.25 + i * 0.07),
        this._x(1.0),
        this.cy + this.Hb * (0.08 + i * 0.07),
      );
      x.stroke();
    }
    // пятнышки на спине
    const R = rng(3);
    for (let i = 0; i < 9; i++) {
      const u = 0.1 + R() * 0.7;
      const ex = this._x(u),
        ey = this._top(u) + this.Hb * (0.3 + R() * 0.3),
        rx = this.Hb * (0.04 + R() * 0.05);
      x.fillStyle = "rgba(255,255,255,.13)";
      x.beginPath();
      x.ellipse(ex, ey, rx, this.Hb * 0.03, 0, 0, TAU);
      x.fill();
      x.fillStyle = "rgba(255,255,255,.1)";
      x.beginPath();
      x.ellipse(
        ex - rx * 0.15,
        ey - this.Hb * 0.008,
        rx * 0.55,
        this.Hb * 0.012,
        0,
        0,
        TAU,
      );
      x.fill();
    }
    if (this.biome === "night") {
      x.fillStyle = "rgba(140,255,230,.55)";
      for (let i = 0; i < 12; i++) {
        const u = 0.12 + (i / 12) * 0.75;
        x.beginPath();
        x.arc(
          this._x(u),
          this._top(u) + this.Hb * 0.35,
          this.Hb * 0.025 * (1 + 0.4 * Math.sin(t * 3 + i)),
          0,
          TAU,
        );
        x.fill();
      }
    }
    x.restore();
    x.strokeStyle = "rgba(30,30,70,.45)";
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
    x.fillStyle = "rgba(255,120,150,.45)";
    x.beginPath();
    x.ellipse(ex + er * 0.3, ey + er * 1.7, er * 1.15, er * 0.6, 0, 0, TAU);
    x.fill();
    if (blink) {
      x.strokeStyle = "#1a1a3a";
      x.lineWidth = er * 0.35;
      x.beginPath();
      x.arc(ex, ey, er * 0.8, 0.2, Math.PI - 0.2);
      x.stroke();
    } else {
      x.fillStyle = "#1a1a3a";
      x.beginPath();
      x.arc(ex, ey, er, 0, TAU);
      x.fill();
      x.fillStyle = "#fff";
      x.beginPath();
      x.arc(ex + er * 0.3, ey - er * 0.35, er * 0.38, 0, TAU);
      x.fill();
      x.beginPath();
      x.arc(ex - er * 0.3, ey + er * 0.35, er * 0.15, 0, TAU);
      x.fill();
    }
    x.strokeStyle = "#1a1a3a";
    x.lineWidth = er * 0.3;
    x.beginPath();
    x.moveTo(ex + er * 1.6, ey + er * 1.2);
    x.quadraticCurveTo(
      ex + er * 2.4,
      ey + er * 2.4,
      this._x(1.0) + this.Lw * 0.055,
      ey + er * 1.1,
    );
    x.stroke();
    // трава и городок на спине, затем фонтан
    this._town(x, P);
    this._spout(x);
    x.restore();
  }

  // фонтан из дыхала: ствол струи, корона из струек-дуг, облачко брызг; два прохода (контур, потом заливка), чтобы части слились в одну форму
  _spout(x) {
    const t = this.t,
      Hb = this.Hb;
    const bx = this._x(0.82),
      by = this._top(0.82) + Hb * 0.2;
    // дыхало на спине
    x.fillStyle = "rgba(15,25,80,.4)";
    x.beginPath();
    x.ellipse(bx, by, Hb * 0.06, Hb * 0.02, 0, 0, TAU);
    x.fill();
    const mega = this.mega > 0;
    const sp = Math.min(
      1.3,
      Math.max(this.spout, mega ? 1.3 : 0, 0.12 + 0.06 * Math.sin(t * 3)),
    );
    const h = Hb * (0.24 + 0.45 * sp);
    const sw = Hb * (0.04 + 0.035 * sp);
    const wob = Math.sin(t * 8) * Hb * 0.012 * sp;
    const cx = bx + wob,
      ty = by - h;
    const ol = Math.max(1.5, Hb * 0.014);
    // маленькая радуга за струёй
    if (mega) {
      const cols = [
        "255,90,106",
        "255,190,60",
        "120,210,110",
        "80,170,255",
        "160,110,255",
      ];
      x.lineWidth = Hb * 0.028;
      cols.forEach((c, i) => {
        x.strokeStyle = `rgba(${c},.32)`;
        x.beginPath();
        x.arc(
          cx,
          ty + h * 0.55,
          h * 0.62 - i * Hb * 0.028,
          Math.PI * 1.12,
          Math.PI * 1.88,
        );
        x.stroke();
      });
    }
    // дуги короны
    const n = sp > 0.5 ? 5 : 3;
    const arcs = [];
    for (let i = 0; i < n; i++) {
      const k = (i / (n - 1)) * 2 - 1;
      const reach =
        h * (0.22 + 0.2 * Math.abs(k)) * (1 + 0.05 * Math.sin(t * 6 + i));
      arcs.push({
        s: [cx + k * sw * 0.5, ty + h * 0.1],
        c: [cx + k * reach * 0.75, ty - h * (0.2 - 0.08 * Math.abs(k))],
        e: [
          cx + k * reach,
          ty + h * (Math.abs(k) < 0.3 ? -0.05 : 0.22 + 0.1 * Math.abs(k)),
        ],
        w: Hb * (0.035 + 0.025 * sp) * (1 - 0.35 * Math.abs(k)),
      });
    }
    const puffR = Hb * (0.05 + 0.04 * sp);
    const shape = (pass) => {
      const ex = pass ? 0 : ol * 2;
      x.lineCap = "round";
      // ствол
      x.beginPath();
      x.moveTo(bx - Hb * 0.042 - ex / 2, by + ex / 2);
      x.quadraticCurveTo(
        bx - Hb * 0.03 - ex / 2,
        by - h * 0.5,
        cx - sw - ex / 2,
        ty + h * 0.1,
      );
      x.lineTo(cx + sw + ex / 2, ty + h * 0.1);
      x.quadraticCurveTo(
        bx + Hb * 0.03 + ex / 2,
        by - h * 0.5,
        bx + Hb * 0.042 + ex / 2,
        by + ex / 2,
      );
      x.closePath();
      x.fill();
      // дуги
      for (const A of arcs) {
        x.lineWidth = A.w + ex;
        x.beginPath();
        x.moveTo(A.s[0], A.s[1]);
        x.quadraticCurveTo(A.c[0], A.c[1], A.e[0], A.e[1]);
        x.stroke();
        x.beginPath();
        x.arc(A.e[0], A.e[1] + A.w * 0.2, A.w * 0.62 + ex / 2, 0, TAU);
        x.fill();
      }
      // облачко на макушке
      x.beginPath();
      for (const [dx, dy, r] of [
        [-0.6, 0.1, 0.8],
        [0.6, 0.1, 0.8],
        [0, -0.25, 1],
      ]) {
        x.moveTo(cx + dx * puffR + r * puffR + ex / 2, ty + dy * puffR);
        x.arc(cx + dx * puffR, ty + dy * puffR, r * puffR + ex / 2, 0, TAU);
      }
      x.fill();
    };
    x.fillStyle = x.strokeStyle = "rgba(60,130,210,.8)";
    shape(0);
    const g = x.createLinearGradient(0, ty - puffR, 0, by);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.6, "#e6f5ff");
    g.addColorStop(1, "#a9d8fb");
    x.fillStyle = x.strokeStyle = g;
    shape(1);
    // блик на стволе
    x.strokeStyle = "rgba(255,255,255,.9)";
    x.lineWidth = Math.max(1, Hb * 0.01);
    x.beginPath();
    x.moveTo(bx - Hb * 0.008, by - h * 0.12);
    x.quadraticCurveTo(
      bx - Hb * 0.01,
      by - h * 0.5,
      cx - sw * 0.45,
      ty + h * 0.16,
    );
    x.stroke();
    x.strokeStyle = "rgba(120,185,240,.55)";
    x.lineWidth = Math.max(1, Hb * 0.014);
    x.beginPath();
    x.moveTo(bx + Hb * 0.022, by - h * 0.08);
    x.quadraticCurveTo(
      bx + Hb * 0.02,
      by - h * 0.5,
      cx + sw * 0.6,
      ty + h * 0.16,
    );
    x.stroke();
    // капли падают с концов дуг
    x.fillStyle = "rgba(225,243,255,.95)";
    for (let i = 0; i < arcs.length; i++) {
      const A = arcs[i];
      if (Math.abs(A.e[0] - cx) < sw) continue;
      for (let j = 0; j < 2; j++) {
        const k = (t * 1.6 + i * 0.37 + j * 0.5) % 1;
        const dr = Hb * 0.016 * (1 - k * 0.4),
          px = A.e[0] + Math.sign(A.e[0] - cx) * Hb * 0.03 * k,
          py = A.e[1] + A.w + k * h * 0.35;
        x.globalAlpha = 1 - k;
        x.beginPath();
        x.moveTo(px, py - dr * 2.2);
        x.quadraticCurveTo(px + dr * 1.1, py - dr * 0.3, px, py + dr);
        x.quadraticCurveTo(px - dr * 1.1, py - dr * 0.3, px, py - dr * 2.2);
        x.fill();
      }
    }
    x.globalAlpha = 1;
    // пена у дыхала
    x.fillStyle = "rgba(255,255,255,.85)";
    x.beginPath();
    x.ellipse(
      bx,
      by - Hb * 0.005,
      Hb * (0.05 + 0.02 * sp),
      Hb * 0.018,
      0,
      0,
      TAU,
    );
    x.fill();
    // искорки в мега-режиме
    if (mega) {
      x.fillStyle = "#fff6b0";
      for (let i = 0; i < 6; i++) {
        const a = t * 1.5 + i * 1.05,
          r = h * (0.25 + 0.15 * Math.sin(t * 2 + i));
        const px = cx + Math.cos(a) * r,
          py = ty + Math.sin(a) * r * 0.6;
        const s2 = Hb * 0.025 * Math.max(0, Math.sin(t * 5 + i * 2));
        if (s2 < 0.5) continue;
        x.beginPath();
        x.moveTo(px - s2, py);
        x.quadraticCurveTo(px, py, px, py - s2);
        x.quadraticCurveTo(px, py, px + s2, py);
        x.quadraticCurveTo(px, py, px, py + s2);
        x.quadraticCurveTo(px, py, px - s2, py);
        x.fill();
      }
    }
  }

  // лужайка-дёрн на спине: верх по силуэту кита, снизу неровная кромка; тропинка, цветы, кустики
  _town(x, P) {
    const t = this.t;
    const [x0, x1] = this.span;
    const bw = this.bw;
    const two = this.rows === 2;
    const pad = bw * 0.6;
    const L = x0 - pad,
      Rr = x1 + pad;
    const depth = bw * (two ? 0.62 : 0.42);
    const lift = this.Hb * 0.024;
    const steps = 36;
    const bell = (k) => Math.pow(Math.max(0, Math.sin(k * Math.PI)), 0.5);
    const gTop = shade(P.grass, 0.16),
      gBot = shade(P.grass, -0.2),
      gEdge = shade(P.grass, -0.32);
    const top = [],
      bot = [];
    let yT = 1e9,
      yB = -1e9;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps,
        px = lerp(L, Rr, k);
      const ty = this._ty(px),
        b = bell(k);
      top.push([px, ty - lift * b]);
      bot.push([px, ty + depth * b * (1 + 0.1 * Math.sin(i * 1.9))]);
      yT = Math.min(yT, ty - lift * b);
      yB = Math.max(yB, ty + depth * b * 1.1);
    }
    const poly = (A, B, dy) => {
      x.beginPath();
      A.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
      for (let i = B.length - 1; i >= 0; i--) x.lineTo(B[i][0], B[i][1] + dy);
      x.closePath();
    };
    // тень дёрна на коже кита
    poly(top, bot, this.Hb * 0.03);
    x.fillStyle = "rgba(15,25,80,.2)";
    x.fill();
    // дёрн
    poly(top, bot, 0);
    const gg = x.createLinearGradient(0, yT, 0, yB);
    gg.addColorStop(0, gTop);
    gg.addColorStop(1, gBot);
    x.fillStyle = gg;
    x.fill();
    // травинки свисают по нижней кромке
    const s = bw * 0.05;
    x.fillStyle = gBot;
    x.beginPath();
    for (let i = 1; i < steps; i++) {
      const [px, py] = bot[i];
      const d = s * (0.8 + ((i * 7) % 3) * 0.35) * bell(i / steps);
      x.moveTo(px - s, py - s * 0.5);
      x.lineTo(px - s * 0.2, py + d);
      x.lineTo(px + s * 0.4, py - s * 0.3);
      x.lineTo(px + s * 0.9, py + d * 0.7);
      x.lineTo(px + s * 1.4, py - s * 0.5);
    }
    x.fill();
    x.strokeStyle = gEdge;
    x.lineWidth = Math.max(1, bw * 0.02);
    x.globalAlpha = 0.45;
    x.beginPath();
    bot.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
    x.stroke();
    x.globalAlpha = 1;
    // травинки торчат над спиной
    x.strokeStyle = gTop;
    x.lineCap = "round";
    x.lineWidth = Math.max(1, bw * 0.022);
    x.beginPath();
    for (let i = 1; i < steps; i++) {
      const [px, py] = top[i];
      const h = bw * 0.07 * bell(i / steps) * (0.7 + ((i * 5) % 4) * 0.15);
      const sw = Math.sin(t * 2 + i) * h * 0.25;
      x.moveTo(px - s * 0.3, py + 1);
      x.quadraticCurveTo(
        px - s * 0.35,
        py - h * 0.5,
        px - s * 0.5 + sw,
        py - h,
      );
      x.moveTo(px + s * 0.3, py + 1);
      x.quadraticCurveTo(
        px + s * 0.4,
        py - h * 0.45,
        px + s * 0.6 + sw,
        py - h * 0.8,
      );
    }
    x.stroke();
    // тропинка
    const pOff = two ? 0.1 : 0.27;
    const pathY = (px) => {
      const k = clamp((px - L) / (Rr - L), 0, 1);
      return (
        this._ty(px) + bw * pOff * bell(k) + Math.sin(px * 0.05) * bw * 0.02
      );
    };
    const p0 = x0 - pad * 0.35,
      p1 = x1 + pad * 0.35;
    x.beginPath();
    for (let i = 0; i <= 24; i++) {
      const px = lerp(p0, p1, i / 24);
      i ? x.lineTo(px, pathY(px)) : x.moveTo(px, pathY(px));
    }
    x.lineCap = "round";
    x.lineJoin = "round";
    x.strokeStyle = P.night ? "#7a76b0" : "#f2d9a2";
    x.lineWidth = bw * 0.11;
    x.stroke();
    x.setLineDash([bw * 0.05, bw * 0.09]);
    x.strokeStyle = P.night ? "rgba(40,40,90,.35)" : "rgba(170,120,60,.3)";
    x.lineWidth = bw * 0.035;
    x.stroke();
    x.setLineDash([]);
    // цветочки
    const R = rng(31);
    const nF = Math.round((Rr - L) / (bw * 0.28));
    const fc = P.night
      ? ["#bfefff", "#ffe68a", "#d8b8ff"]
      : ["#ffffff", "#ffd23a", "#ff8aa0", "#c8a0ff"];
    const fr = Math.max(1.2, bw * 0.022);
    const fl = [];
    for (let i = 0; i < nF; i++) {
      const k = 0.06 + R() * 0.88;
      const px = lerp(L, Rr, k);
      const py = this._ty(px) + depth * bell(k) * (0.1 + R() * 0.75);
      if (Math.abs(py - pathY(px)) >= bw * 0.07)
        fl.push([px, py, i % fc.length]);
    }
    // лепестки одного цвета — одним путём
    for (let c = 0; c <= fc.length; c++) {
      x.fillStyle = c < fc.length ? fc[c] : "#ffb03a";
      x.beginPath();
      for (const [px, py, ci] of fl) {
        if (c === fc.length) {
          x.moveTo(px + fr * 0.6, py);
          x.arc(px, py, fr * 0.6, 0, TAU);
          continue;
        }
        if (ci !== c) continue;
        for (let a = 0; a < 5; a++) {
          const ax = px + Math.cos((a * TAU) / 5) * fr,
            ay = py + Math.sin((a * TAU) / 5) * fr;
          x.moveTo(ax + fr * 0.8, ay);
          x.arc(ax, ay, fr * 0.8, 0, TAU);
        }
      }
      x.fill();
    }
    // кустики на краях лужайки
    for (const [px, k] of [
      [L + pad * 0.45, 0.06],
      [Rr - pad * 0.45, 0.94],
    ]) {
      const py = this._ty(px) + depth * bell(k) * 0.4;
      const r = bw * 0.13;
      x.fillStyle = gEdge;
      x.beginPath();
      x.arc(px - r * 0.6, py - r * 0.3, r * 0.7, 0, TAU);
      x.arc(px + r * 0.6, py - r * 0.25, r * 0.65, 0, TAU);
      x.arc(px, py - r * 0.7, r * 0.85, 0, TAU);
      x.fill();
      x.fillStyle = gTop;
      x.beginPath();
      x.arc(px - r * 0.15, py - r * 0.95, r * 0.45, 0, TAU);
      x.fill();
    }
    // жители гуляют по тропинке
    const residents = () => {
      for (const r of this.residents) {
        r.p += r.v * 0.016;
        if (r.p < 0 || r.p > 1) r.v = -r.v;
        r.p = clamp(r.p, 0, 1);
        const px = lerp(p0, p1, r.p);
        const py = pathY(px) - Math.abs(Math.sin(t * 8 + r.p * 40)) * bw * 0.04;
        const s = bw * 0.11;
        x.fillStyle = "rgba(20,40,20,.18)";
        x.beginPath();
        x.ellipse(px, pathY(px), s * 0.7, s * 0.2, 0, 0, TAU);
        x.fill();
        x.fillStyle = r.c;
        x.beginPath();
        x.ellipse(px, py - s * 1.2, s * 0.7, s * 0.9, 0, 0, TAU);
        x.fill();
        x.fillStyle = "#ffd8b8";
        x.beginPath();
        x.arc(px, py - s * 2.4, s * 0.6, 0, TAU);
        x.fill();
        if (r.hat === 0) {
          x.fillStyle = "#3a3a5a";
          x.fillRect(px - s * 0.6, py - s * 3.1, s * 1.2, s * 0.35);
        } else if (r.hat === 1) {
          x.fillStyle = "#ffd23a";
          x.beginPath();
          x.ellipse(px, py - s * 2.85, s * 0.9, s * 0.25, 0, 0, TAU);
          x.fill();
        }
        x.fillStyle = "#1a1a3a";
        x.beginPath();
        x.arc(px + s * 0.22 * Math.sign(r.v), py - s * 2.45, s * 0.1, 0, TAU);
        x.fill();
      }
    };
    // здания: задний ряд, жители, передний ряд
    let walked = false;
    for (const s of this.slots) {
      if (two && s.row === 1 && !walked) {
        residents();
        walked = true;
      }
      const n = this.counts[s.id] || 0;
      const y = this._ty(s.x) + s.dy;
      if (s.pop) s.pop = Math.max(0, s.pop - 0.04);
      const pop = s.pop ? 1 + Math.sin(s.pop * Math.PI) * 0.18 : 1;
      if (!n) {
        if (s.avail) drawPlot(x, s.x, y, s.w * s.sc, t);
        continue;
      }
      x.fillStyle = "rgba(20,50,30,.22)";
      x.beginPath();
      x.ellipse(
        s.x,
        y + bw * 0.01,
        s.w * s.sc * 0.5,
        s.w * s.sc * 0.09,
        0,
        0,
        TAU,
      );
      x.fill();
      x.save();
      x.translate(s.x, y);
      x.scale(pop, pop);
      drawBuilding(
        x,
        s.id,
        0,
        0,
        s.w * 0.92 * s.sc,
        milestonesOf(n),
        t,
        P.night,
        this.dpr,
      );
      x.restore();
    }
    if (!walked) residents();
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
    x.strokeStyle = "#8a6a4a";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, 6 * s);
    x.lineTo(0, 18 * s);
    x.stroke();
    x.fillStyle = "#ff5a6a";
    x.fillRect(-10 * s, 18 * s, 20 * s, 16 * s);
    x.fillStyle = "#ffd23a";
    x.fillRect(-2 * s, 18 * s, 4 * s, 16 * s);
    x.fillRect(-10 * s, 24 * s, 20 * s, 4 * s);
    // сияние
    const gl = x.createRadialGradient(0, 20 * s, 0, 0, 20 * s, 40 * s);
    gl.addColorStop(0, "rgba(255,240,150,.5)");
    gl.addColorStop(1, "rgba(255,240,150,0)");
    x.fillStyle = gl;
    x.fillRect(-40 * s, -20 * s, 80 * s, 80 * s);
    // птица
    x.fillStyle = "#fff";
    x.strokeStyle = "rgba(40,40,60,.6)";
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
    x.fillStyle = "#fff";
    x.beginPath();
    x.arc(13 * s, -3 * s, 5 * s, 0, TAU);
    x.fill();
    x.stroke();
    x.fillStyle = "#ffb03a";
    x.beginPath();
    x.moveTo(17 * s, -3 * s);
    x.lineTo(24 * s, -1 * s);
    x.lineTo(17 * s, 0);
    x.fill();
    x.fillStyle = "#111";
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
      if (p.t === "drop") {
        // капля-слезинка вытянута по скорости, с бликом
        p.vy += 600 * dt;
        const v = Math.hypot(p.vx, p.vy) || 1,
          ux = p.vx / v,
          uy = p.vy / v;
        const tl = p.r * (1.6 + Math.min(2.2, v / 260));
        x.fillStyle = `rgba(215,240,255,${0.92 * a})`;
        x.beginPath();
        x.moveTo(p.x - ux * tl, p.y - uy * tl);
        x.lineTo(p.x - uy * p.r, p.y + ux * p.r);
        x.arc(
          p.x,
          p.y,
          p.r,
          Math.atan2(ux, -uy),
          Math.atan2(ux, -uy) + Math.PI,
          true,
        );
        x.closePath();
        x.fill();
        x.fillStyle = `rgba(255,255,255,${a})`;
        x.beginPath();
        x.arc(
          p.x + ux * p.r * 0.2 - p.r * 0.25,
          p.y + uy * p.r * 0.2 - p.r * 0.3,
          p.r * 0.35,
          0,
          TAU,
        );
        x.fill();
      } else if (p.t === "mist") {
        const k = 1 - a;
        x.fillStyle = `rgba(240,250,255,${0.28 * a})`;
        x.beginPath();
        x.arc(p.x, p.y, p.r * (0.6 + k * 0.9), 0, TAU);
        x.fill();
      } else if (p.t === "shell") {
        // ракушка-гребешок: волнистый край, рёбрышки, «ушки» у замка
        p.vy += 500 * dt;
        p.rot += dt * 5;
        const r = p.r;
        x.save();
        x.translate(p.x, p.y);
        x.rotate(Math.sin(p.rot) * 0.6);
        x.globalAlpha = a;
        x.beginPath();
        x.moveTo(0, r * 0.62);
        x.lineTo(-r * 0.97, r * 0.12);
        const n = 6;
        for (let i = 0; i < n; i++) {
          const a0 = Math.PI + 0.2 + ((Math.PI - 0.4) * i) / n,
            a1 = a0 + (Math.PI - 0.4) / n,
            am = (a0 + a1) / 2;
          x.quadraticCurveTo(
            Math.cos(am) * r * 1.16,
            r * 0.3 + Math.sin(am) * r * 1.16,
            Math.cos(a1) * r,
            r * 0.3 + Math.sin(a1) * r,
          );
        }
        x.closePath();
        x.fillStyle = "#ffb88a";
        x.fill();
        x.strokeStyle = "#c8653a";
        x.lineWidth = Math.max(1, r * 0.12);
        x.lineJoin = "round";
        x.stroke();
        x.beginPath();
        for (let i = 1; i < n; i++) {
          const a1 = Math.PI + 0.2 + ((Math.PI - 0.4) * i) / n;
          x.moveTo(0, r * 0.58);
          x.lineTo(Math.cos(a1) * r * 0.92, r * 0.3 + Math.sin(a1) * r * 0.92);
        }
        x.lineWidth = Math.max(0.8, r * 0.08);
        x.stroke();
        x.fillStyle = "rgba(255,255,255,.45)";
        x.beginPath();
        x.ellipse(-r * 0.3, -r * 0.25, r * 0.22, r * 0.12, -0.5, 0, TAU);
        x.fill();
        x.fillStyle = "#f08a5a";
        x.beginPath();
        x.moveTo(-r * 0.32, r * 0.5);
        x.lineTo(r * 0.32, r * 0.5);
        x.lineTo(r * 0.2, r * 0.78);
        x.lineTo(-r * 0.2, r * 0.78);
        x.closePath();
        x.fill();
        x.stroke();
        x.restore();
      } else if (p.t === "spark") {
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
    x.textAlign = "center";
    x.textBaseline = "middle";
    for (const q of this.texts) {
      q.life -= dt;
      q.y -= dt * 70;
      const a = clamp((q.life / q.max) * 1.6, 0, 1);
      const fs = (q.big ? 30 : 22) * clamp(this.Lw / 650, 0.75, 1.3);
      x.font = `800 ${fs}px Rubik, sans-serif`;
      x.globalAlpha = a;
      x.lineWidth = fs * 0.18;
      x.strokeStyle = "rgba(30,40,90,.75)";
      x.strokeText(q.s, q.x, q.y);
      x.fillStyle = q.color || "#fff";
      x.fillText(q.s, q.x, q.y);
    }
    x.globalAlpha = 1;
    this.texts = this.texts.filter((q) => q.life > 0);
  }
}
