// Фон: небо, луна, горы в тумане, пагода, ветка сакуры (рисуется один раз) и падающие лепестки (анимация)
const THEMES = {
  night: { sky: ['#0d1230', '#1d2457', '#3a3f7a'], moon: '#f6e7c1', glow: 'rgba(246,231,193,.22)', stars: true, mtn: ['#2b2f66', '#1f2350', '#151937'], mist: 'rgba(170,175,230,.10)', branch: '#1a1424', bloom: ['#f3a7ba', '#f7c4d1', '#e88aa3'], petal: ['#f6b9c8', '#f3a7ba', '#fbd5de'] },
  dawn: { sky: ['#e9c7c9', '#f3d6c2', '#f8e5cf'], moon: '#ffd7a0', glow: 'rgba(255,190,130,.35)', stars: false, mtn: ['#c7a9c4', '#a98aae', '#7f6890'], mist: 'rgba(255,255,255,.28)', branch: '#4a2f3a', bloom: ['#f19ab0', '#f7c0cf', '#e27d98'], petal: ['#f2a0b5', '#f7c0cf', '#e9879f'] },
  contrast: { sky: ['#000', '#000', '#000'], moon: '#fff', glow: 'rgba(255,255,255,.08)', stars: false, mtn: ['#111', '#0a0a0a', '#050505'], mist: 'rgba(0,0,0,0)', branch: '#000', bloom: ['#333', '#333', '#333'], petal: [] },
};

function rnd(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export class Scene {
  constructor() {
    this.sky = document.getElementById('sky');
    this.pc = document.getElementById('petals');
    this.fx = document.getElementById('fx');
    this.theme = 'night';
    this.petalsOn = true;
    this.parts = [];
    this.bursts = [];
    this.last = 0;
    this.running = false;
    window.addEventListener('resize', () => this.draw());
    document.addEventListener('visibilitychange', () => !document.hidden && this.loop());
  }

  setTheme(t) {
    this.theme = THEMES[t] ? t : 'night';
    this.draw();
  }

  setPetals(on) {
    this.petalsOn = on;
    if (!on) this.parts = [];
    this.loop();
  }

  draw() {
    const T = THEMES[this.theme];
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = innerWidth,
      H = innerHeight;
    for (const c of [this.sky, this.pc, this.fx]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    this.dpr = dpr;
    const g = this.sky.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // небо
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, T.sky[0]);
    gr.addColorStop(0.55, T.sky[1]);
    gr.addColorStop(1, T.sky[2]);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    const R = rnd(7);
    if (T.stars)
      for (let i = 0; i < Math.round((W * H) / 5000); i++) {
        const x = R() * W,
          y = R() * H * 0.6,
          r = R() * 1.3 + 0.3;
        g.fillStyle = `rgba(255,248,230,${0.25 + R() * 0.6})`;
        g.beginPath();
        g.arc(x, y, r, 0, 7);
        g.fill();
      }
    // луна (на рассвете — солнце)
    const m = Math.min(W, H);
    const mx = W * 0.8,
      my = H * 0.17,
      mr = Math.max(34, m * 0.09);
    const gl = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2);
    gl.addColorStop(0, T.glow);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, W, H);
    if (this.theme !== 'contrast') {
      g.fillStyle = T.moon;
      g.beginPath();
      g.arc(mx, my, mr, 0, 7);
      g.fill();
    }
    if (this.theme === 'night') {
      g.fillStyle = 'rgba(200,180,140,.18)';
      for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.35, 0.12]]) {
        g.beginPath();
        g.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, 7);
        g.fill();
      }
    }
    // горы: три слоя
    const ridge = (base, amp, seed, col, f) => {
      const r = rnd(seed);
      const ph = [r() * 6, r() * 6, r() * 6];
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) {
        const t = x / W;
        const y = base - amp * (0.55 * Math.sin(t * 5 * f + ph[0]) + 0.3 * Math.sin(t * 11 * f + ph[1]) + 0.15 * Math.sin(t * 23 * f + ph[2]) + 0.5);
        g.lineTo(x, y);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();
    };
    ridge(H * 0.62, H * 0.2, 11, T.mtn[0], 1);
    g.fillStyle = T.mist;
    g.fillRect(0, H * 0.56, W, H * 0.12);
    ridge(H * 0.74, H * 0.16, 23, T.mtn[1], 1.3);
    // пагода на холме
    if (this.theme !== 'contrast') this.pagoda(g, W * 0.16, H * 0.7, Math.max(40, m * 0.12), T.mtn[2]);
    g.fillStyle = T.mist;
    g.fillRect(0, H * 0.7, W, H * 0.1);
    ridge(H * 0.9, H * 0.12, 37, T.mtn[2], 1.7);
    // ветка сакуры
    if (this.theme !== 'contrast') this.branch(g, W, H, T);
    this.loop();
  }

  pagoda(g, x, y, s, col) {
    g.fillStyle = col;
    let w = s,
      yy = y;
    for (let k = 0; k < 4; k++) {
      const h = s * 0.22;
      g.fillRect(x - w * 0.32, yy - h, w * 0.64, h);
      g.beginPath();
      g.moveTo(x - w * 0.62, yy - h);
      g.quadraticCurveTo(x - w * 0.3, yy - h * 1.15, x, yy - h * 1.75);
      g.quadraticCurveTo(x + w * 0.3, yy - h * 1.15, x + w * 0.62, yy - h);
      g.closePath();
      g.fill();
      yy -= h * 1.6;
      w *= 0.8;
    }
    g.fillRect(x - s * 0.015, yy - s * 0.35, s * 0.03, s * 0.4);
  }

  branch(g, W, H, T) {
    const s = Math.min(W, H) / 700;
    const R = rnd(91);
    g.strokeStyle = T.branch;
    g.lineCap = 'round';
    const blooms = [];
    const seg = (x, y, ang, len, wid, depth) => {
      const x2 = x + Math.cos(ang) * len,
        y2 = y + Math.sin(ang) * len;
      g.lineWidth = wid;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo((x + x2) / 2 + (R() - 0.5) * len * 0.3, (y + y2) / 2 + (R() - 0.5) * len * 0.3, x2, y2);
      g.stroke();
      if (depth > 0) {
        seg(x2, y2, ang + (R() - 0.3) * 0.7, len * 0.72, wid * 0.66, depth - 1);
        if (R() < 0.75) seg(x2, y2, ang + (R() - 0.7) * 1.1, len * 0.55, wid * 0.55, depth - 1);
      }
      if (depth < 3) for (let k = 0; k < 3; k++) blooms.push([x + (x2 - x) * R() + (R() - 0.5) * 18 * s, y + (y2 - y) * R() + (R() - 0.5) * 18 * s]);
    };
    seg(-20 * s, 40 * s, 0.38, 190 * s, 15 * s, 4);
    for (const [bx, by] of blooms) this.flower(g, bx, by, (6 + R() * 5) * s, T.bloom[Math.floor(R() * 3)], R() * 6);
  }

  flower(g, x, y, r, col, rot) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = col;
    for (let k = 0; k < 5; k++) {
      g.rotate((Math.PI * 2) / 5);
      g.beginPath();
      g.ellipse(0, -r * 0.62, r * 0.42, r * 0.62, 0, 0, 7);
      g.fill();
    }
    g.fillStyle = '#ffe7a8';
    g.beginPath();
    g.arc(0, 0, r * 0.22, 0, 7);
    g.fill();
    g.restore();
  }

  // всплеск лепестков в точке экрана (решён квадрат/строка/судоку)
  burst(x, y, n = 18, spread = 1) {
    const T = THEMES[this.theme];
    if (!T.petal.length) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        v = (1.5 + Math.random() * 3.5) * spread;
      this.bursts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 5 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: T.petal[i % T.petal.length], life: 1 });
    }
    this.loop();
  }

  loop() {
    if (this.running || document.hidden) return;
    if (!this.petalsOn && !this.bursts.length) {
      const g = this.pc.getContext('2d');
      g.clearRect(0, 0, this.pc.width, this.pc.height);
      return;
    }
    this.running = true;
    this.last = performance.now();
    const step = (now) => {
      const dt = Math.min(50, now - this.last) / 16.7;
      this.last = now;
      this.tick(dt);
      if ((this.petalsOn || this.bursts.length) && !document.hidden) requestAnimationFrame(step);
      else {
        this.running = false;
        if (!this.petalsOn) this.pc.getContext('2d').clearRect(0, 0, this.pc.width, this.pc.height);
        this.fx.getContext('2d').clearRect(0, 0, this.fx.width, this.fx.height);
      }
    };
    requestAnimationFrame(step);
  }

  tick(dt) {
    const T = THEMES[this.theme];
    const W = innerWidth,
      H = innerHeight;
    let g = this.pc.getContext('2d');
    g.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    g.clearRect(0, 0, W, H);
    const fg = this.fx.getContext('2d');
    fg.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    fg.clearRect(0, 0, W, H);
    const want = this.petalsOn && T.petal.length ? Math.round(Math.min(26, (W * H) / 40000)) : 0;
    while (this.parts.length < want)
      this.parts.push({ x: Math.random() * W * 1.2 - W * 0.1, y: -20 - Math.random() * H, vx: 0.3 + Math.random() * 0.6, vy: 0.5 + Math.random() * 0.7, r: 4 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.06, sw: Math.random() * 6, c: T.petal[Math.floor(Math.random() * T.petal.length)] });
    if (this.parts.length > want) this.parts.length = want;
    const draw = (p, a) => {
      g.save();
      g.globalAlpha = a;
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.c;
      g.beginPath();
      g.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 7);
      g.fill();
      g.restore();
    };
    for (const p of this.parts) {
      p.sw += 0.03 * dt;
      p.x += (p.vx + Math.sin(p.sw) * 0.5) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > H + 20 || p.x > W + 30) {
        p.x = Math.random() * W * 1.1 - W * 0.2;
        p.y = -20;
      }
      draw(p, 0.75);
    }
    g = fg;
    for (const p of this.bursts) {
      p.vy += 0.09 * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= 0.012 * dt;
      draw(p, Math.max(0, p.life));
    }
    this.bursts = this.bursts.filter((p) => p.life > 0);
  }
}
