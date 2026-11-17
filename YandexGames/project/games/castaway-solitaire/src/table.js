// Стол пасьянса: раскладка, колода, сброс, анимации, подсказки, ввод. Рисуется на отдельном 2D-canvas.
import { Tri, ROW_STEP, WILD, starsFor } from './logic.js';
import { CardArt, drawLock, drawKey, drawCoin, drawSand, star, rr } from './cards.js';
import { audio } from './audio.js';
import { HINT_DELAY } from './data.js';

const SP = 1.03; // шаг карт по горизонтали (с зазором)
const ease = {
  out: (k) => 1 - (1 - k) ** 3,
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  back: (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2,
};
const KEY_COL = ['#f2b52f', '#f2b52f', '#7ec8ff'];

export class Table {
  constructor(canvas, hooks) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.art = new CardArt();
    this.active = false;
    this.tweens = [];
    this.floats = [];
    this.conf = [];
    this.idle = 0;
    this.time = 0;
    this.W = 1;
    this.H = 1;
    this.dpr = 1;
    this.safe = { top: 0, bottom: 0 };
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
  }

  setWildLabel(s) {
    this.art.wildLabel = s;
  }

  resize(w, h, dpr) {
    this.W = w;
    this.H = h;
    this.dpr = dpr;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    if (this.g) this.layout(true);
  }

  // ---------- партия ----------
  start(def, opts = {}) {
    this.def = def;
    this.g = new Tri(def);
    this.active = true;
    this.over = false;
    this.busy = 0;
    this.tweens = [];
    this.floats = [];
    this.conf = [];
    this.idle = 0;
    this.tut = opts.tut || 0;
    this.topMin = opts.topMin || 0;
    this.undoFree = opts.freeUndo || 0;
    this.sprites = this.g.cards.map(() => ({ x: 0, y: 0, r: 0, sx: 1, face: false, flip: -1, shake: 0, hidden: false, z: 0, glow: 0 }));
    this.wasteSpr = [];
    this.layout(false);
    // раздача: карты вылетают из колоды
    const order = this.g.cards.map((c, i) => i).sort((a, b) => this.g.cards[a].row - this.g.cards[b].row || this.g.cards[a].x - this.g.cards[b].x);
    order.forEach((i, k) => {
      const s = this.sprites[i];
      const p = this.slot(i);
      s.x = this.stockPos.x;
      s.y = this.stockPos.y;
      s.r = -0.3;
      s.hidden = true;
      this.busy++;
      this.tween({ d: 0.32, delay: k * 0.035, start: () => (s.hidden = false), fn: (e) => {
        s.x = this.stockPos.x + (p.x - this.stockPos.x) * e;
        s.y = this.stockPos.y + (p.y - this.stockPos.y) * e;
        s.r = -0.3 * (1 - e);
      }, done: () => {
        this.busy--;
        if (k % 3 === 0) audio.play('deal');
      } });
    });
    const tEnd = order.length * 0.035 + 0.35;
    this.busy++;
    this.tween({ d: 0.01, delay: tEnd, fn: () => {}, done: () => {
      this.busy--;
      this.g.cards.forEach((c, i) => this.faceUp(i) && this.flip(i, true));
      this.wasteSpr = [{ c: this.g.top(), x: this.wastePos.x, y: this.wastePos.y, r: 0 }];
      audio.play('flip');
      this.changed();
    } });
    this.wasteHidden = true;
    this.busy++;
    this.tween({ d: 0.01, delay: tEnd, fn: () => {}, done: () => {
      this.busy--;
      this.wasteHidden = false;
    } });
  }
  stop() {
    this.active = false;
    this.g = null;
    this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
  }
  faceUp(i) {
    return this.g.faceUp(i);
  }

  layout(snap) {
    const W = this.W;
    const H = this.H;
    const g = this.g;
    const maxX = Math.max(...g.cards.map((c) => c.x));
    const rows = Math.max(...g.cards.map((c) => c.row)) + 1;
    const Lw = (maxX + 2) / 2;
    this.topRes = Math.max((H < 520 ? 62 : 104) + this.safe.top, this.topMin || 0,this.hooks.topBoundary?.()||0);
    const botRes = 30 + this.safe.bottom;
    const byW = (W - 20) / (Lw * SP);
    const byH = (H - this.topRes - botRes - 34) / (1.4 * ((rows - 1) * ROW_STEP + 1) + 1.4 * 1.15);
    const maxFit=Math.max(18,Math.min(220,byW,byH)),base=Math.min(128,maxFit*.9);
    this.maxScale=Math.min(140,Math.floor(maxFit/base*100));
    this.cardScale=Math.min(this.maxScale,Math.max(70,this.requestedScale||100));
    const cw=base*this.cardScale/100;
    this.cw = cw;
    this.ch = cw * 1.4;
    this.art.setSize(cw, this.dpr);
    const tabH = this.ch * ((rows - 1) * ROW_STEP + 1);
    // нижняя зона: колода и сброс
    const by = H - botRes - this.ch / 2;
    const zoneTop = this.topRes;
    const zoneBot = by - this.ch / 2 - 22;
    this.tabTop = zoneTop + Math.max(0, (zoneBot - zoneTop - tabH) * 0.42);
    this.offX = (W - Lw * cw * SP) / 2 + (cw * (SP - 1)) / 2;
    const gap = Math.max(14, cw * 0.35);
    this.stockPos = { x: W / 2 - cw / 2 - gap / 2, y: by };
    this.wastePos = { x: W / 2 + cw / 2 + gap / 2, y: by };
    if (snap) {
      g.cards.forEach((c, i) => {
        if (c.gone) return;
        const p = this.slot(i);
        const s = this.sprites[i];
        s.x = p.x;
        s.y = p.y;
      });
      for (const w of this.wasteSpr) {
        w.x = this.wastePos.x;
        w.y = this.wastePos.y;
      }
    }
    this.hooks.onScale?.({value:this.cardScale,max:this.maxScale});
  }
  slot(i) {
    const c = this.g.cards[i];
    return { x: this.offX + (c.x / 2) * this.cw * SP + this.cw / 2, y: this.tabTop + c.row * ROW_STEP * this.ch + this.ch / 2 };
  }

  tween(o) {
    o.t = -(o.delay || 0);
    o.ease = o.ease || ease.out;
    this.tweens.push(o);
    return o;
  }
  flip(i, toFace) {
    const s = this.sprites[i];
    s.flip = 0;
    s.flipTo = toFace;
  }

  changed() {
    const g = this.g;
    this.hooks.onChange &&
      this.hooks.onChange({ score: g.score, stock: g.stock.length, left: g.remaining(), streak: g.streak, canUndo: g.canUndo() && !this.over, stars: starsFor(this.def, g.stock.length) });
  }

  // ---------- действия ----------
  onDown(e) {
    if (!this.active || this.over || this.hooks.canInput?.() === false) return;
    const r = this.cv.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    audio.unlock();
    this.idle = 0;
    if (this.busy > 0) {
      // во время анимации ход откладывается совсем ненадолго
      this.queued = { x, y };
      return;
    }
    this.tap(x, y);
  }
  tap(x, y) {
    if(!this.active || this.over || this.hooks.canInput?.()===false) return;
    const g = this.g;
    const { cw, ch } = this;
    // колода
    const sp = this.stockPos;
    if (Math.abs(x - sp.x) < cw * 0.6 && Math.abs(y - sp.y) < ch * 0.6) {
      this.draw();
      return;
    }
    // карты раскладки: сверху вниз по рядам
    let hit = -1;
    for (let i = g.cards.length - 1; i >= 0; i--) {
      const c = g.cards[i];
      if (c.gone) continue;
      const s = this.sprites[i];
      if (Math.abs(x - s.x) < cw * 0.52 && Math.abs(y - s.y) < ch * 0.52) {
        // ищем самую «верхнюю» (с большим рядом) карту под пальцем
        if (hit < 0 || c.row > g.cards[hit].row) hit = i;
      }
    }
    if (hit >= 0) this.play(hit);
  }
  play(i) {
    if(!this.active || this.over || this.hooks.canInput?.()===false) return;
    const g = this.g;
    if (!g.faceUp(i)) return;
    if (!g.playable(i)) {
      this.sprites[i].shake = 1;
      audio.play('deny');
      if (g.locked(i)) this.hooks.onBlocked && this.hooks.onBlocked('lock');
      else if (g.cards[i].sandLeft > 0) this.hooks.onBlocked && this.hooks.onBlocked('sand');
      return;
    }
    const res = g.play(i);
    const s = this.sprites[i];
    const from = { x: s.x, y: s.y };
    s.hidden = true;
    const fly = { c: g.top(), x: from.x, y: from.y, r: 0, fly: true };
    this.wasteSpr.push(fly);
    if (this.wasteSpr.length > 3) this.wasteSpr.shift();
    this.busy++;
    const to = this.wastePos;
    const lift = Math.min(this.ch * 0.8, Math.abs(to.y - from.y) * 0.3 + 30);
    this.tween({ d: 0.3, ease: ease.inOut, fn: (e) => {
      fly.x = from.x + (to.x - from.x) * e;
      fly.y = from.y + (to.y - from.y) * e - Math.sin(e * Math.PI) * lift;
      fly.r = Math.sin(e * Math.PI) * 0.25 * (to.x > from.x ? 1 : -1);
    }, done: () => {
      fly.fly = false;
      fly.r = 0;
      this.busy--;
      audio.play('place');
    } });
    audio.play('combo', Math.min(12, res.streak - 1));
    // очки, монеты, серия
    this.float('+' + res.pts, to.x, to.y - this.ch * 0.75, '#fff', 0.42);
    if (res.streak >= 3 && res.streak % 1 === 0) this.hooks.onStreak && this.hooks.onStreak(res.streak);
    if (res.coin) {
      this.float('+' + res.coin, from.x, from.y, '#ffd34a', 0.36, true);
      audio.play('coin');
    }
    if (res.unlocked) {
      audio.play('unlock');
      this.g.cards.forEach((c, j) => {
        if (c.lock === res.unlocked && !c.gone) this.sprites[j].unlockT = 1;
      });
    }
    for (const j of res.washed) this.sprites[j].washT = 1;
    if (res.washed.length) audio.play('wave');
    for (const j of res.flipped) this.flip(j, true);
    if (res.flipped.length) setTimeout(() => audio.play('flip'), 120);
    this.changed();
    this.hooks.onMove && this.hooks.onMove(res);
    if (g.won()) this.finish(true);
    else this.checkStuck();
  }
  draw() {
    if(!this.active || this.over || this.hooks.canInput?.()===false) return;
    const g = this.g;
    if (!g.stock.length) {
      audio.play('deny');
      this.checkStuck(true);
      return;
    }
    const c = g.draw();
    const from = { ...this.stockPos };
    const fly = { c, x: from.x, y: from.y, r: 0, fly: true, flip: 0 };
    this.wasteSpr.push(fly);
    if (this.wasteSpr.length > 3) this.wasteSpr.shift();
    this.busy++;
    audio.play('draw');
    const to = this.wastePos;
    this.tween({ d: 0.26, ease: ease.inOut, fn: (e) => {
      fly.x = from.x + (to.x - from.x) * e;
      fly.y = from.y - Math.sin(e * Math.PI) * 20;
      fly.flip = e;
    }, done: () => {
      fly.fly = false;
      fly.flip = 1;
      this.busy--;
    } });
    this.changed();
    this.hooks.onMove && this.hooks.onMove({ draw: true });
    this.checkStuck();
  }
  undo() {
    if(this.hooks.canInput?.()===false)return false;
    const g = this.g;
    if (!g || this.busy || this.over || !g.canUndo()) return false;
    const u = g.undo();
    if (!u) return false;
    const top = this.wasteSpr.pop();
    if (u.t === 'play') {
      const s = this.sprites[u.i];
      const p = this.slot(u.i);
      // карты, которые открылись этим ходом, снова закрываются
      g.cards.forEach((c, j) => {
        if (!c.gone && j !== u.i && this.sprites[j].face && !g.faceUp(j)) this.flip(j, false);
      });
      s.hidden = false;
      s.x = this.wastePos.x;
      s.y = this.wastePos.y;
      s.face = true;
      this.busy++;
      this.tween({ d: 0.28, ease: ease.inOut, fn: (e) => {
        s.x = this.wastePos.x + (p.x - this.wastePos.x) * e;
        s.y = this.wastePos.y + (p.y - this.wastePos.y) * e;
      }, done: () => this.busy-- });
    } else if (u.t === 'draw') {
      const fly = { c: u.c, x: this.wastePos.x, y: this.wastePos.y, r: 0, fly: true, flip: 1, back: true };
      this.flyBack = fly;
      this.busy++;
      this.tween({ d: 0.24, ease: ease.inOut, fn: (e) => {
        fly.x = this.wastePos.x + (this.stockPos.x - this.wastePos.x) * e;
        fly.flip = 1 - e;
      }, done: () => {
        this.busy--;
        this.flyBack = null;
      } });
    }
    this.refillWaste();
    audio.play('undo');
    this.changed();
    return true;
  }
  refillWaste() {
    // восстановить видимые карты сброса по состоянию партии
    const w = this.g.waste;
    const n = Math.min(3, w.length);
    this.wasteSpr = w.slice(w.length - n).map((c) => ({ c, x: this.wastePos.x, y: this.wastePos.y, r: 0 }));
  }
  joker() {
    if(this.hooks.canInput?.()===false)return false;
    if (!this.g || this.busy || this.over) return false;
    this.g.joker();
    const fly = { c: this.g.top(), x: this.wastePos.x, y: this.wastePos.y - this.ch * 1.2, r: 0, fly: true, s: 0 };
    this.wasteSpr.push(fly);
    if (this.wasteSpr.length > 3) this.wasteSpr.shift();
    this.busy++;
    this.tween({ d: 0.45, ease: ease.back, fn: (e) => {
      fly.y = this.wastePos.y - this.ch * 1.2 * (1 - e);
      fly.s = e;
    }, done: () => {
      fly.fly = false;
      fly.s = 1;
      this.busy--;
    } });
    audio.play('joker');
    this.changed();
    return true;
  }
  addCards(list) {
    this.g.addCards(list);
    this.over = false;
    audio.play('draw');
    this.changed();
  }
  checkStuck(force) {
    const g = this.g;
    if (g.won() || g.stock.length > 0) return;
    if (!g.anyPlayable()) {
      clearTimeout(this.stuckT);
      this.stuckT = setTimeout(() => {
        if (!this.active || !this.g || this.g.won() || this.g.anyPlayable() || this.g.stock.length) return;
        this.over = true;
        this.hooks.onStuck && this.hooks.onStuck();
      }, force ? 200 : 650);
    }
  }
  finish() {
    this.over = true;
    const g = this.g;
    const left = g.stock.length;
    const stars = starsFor(this.def, left);
    const coinsBase = g.coins;
    // оставшиеся в колоде карты превращаются в бонус
    let k = 0;
    const per = 250;
    const tick = () => {
      if (!this.active) return;
      if (k < left) {
        this.float('+' + per, this.stockPos.x, this.stockPos.y - this.ch * 0.6 - (k % 3) * 8, '#ffe58a', 0.4);
        audio.play('combo', Math.min(12, k + 2));
        k++;
        this.stockShow = left - k;
        setTimeout(tick, 170);
      } else {
        this.burst();
        audio.play('win');
        setTimeout(() => this.active && this.hooks.onWin({ score: g.score, stars, left, best: g.best, coins: coinsBase }), 900);
      }
    };
    this.stockShow = left;
    setTimeout(tick, 450);
  }
  burst() {
    const cols = ['#ffd34a', '#ff7aa2', '#6fd6ff', '#8be07a', '#ffffff', '#ffa94d'];
    for (let i = 0; i < 140; i++) {
      this.conf.push({ x: this.W / 2 + (Math.random() - 0.5) * this.W * 0.3, y: this.H * 0.45, vx: (Math.random() - 0.5) * 900, vy: -300 - Math.random() * 700, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, c: cols[i % cols.length], s: 5 + Math.random() * 7, life: 0 });
    }
  }
  float(text, x, y, color, size = 0.4, coin = false) {
    this.floats.push({ text, x, y, color, size: this.cw * size, t: 0, coin });
  }
  // подсказка: какая карта сейчас подходит
  hintTarget() {
    const g = this.g;
    if (!g) return null;
    for (let i = g.cards.length - 1; i >= 0; i--) if (g.playable(i)) return { i, x: this.sprites[i].x, y: this.sprites[i].y };
    if (g.stock.length) return { stock: true, x: this.stockPos.x, y: this.stockPos.y };
    return null;
  }

  // ---------- кадр ----------
  update(dt) {
    if (!this.active) return;
    this.time += dt;
    for (let i = 0; i < this.tweens.length; i++) {
      const o = this.tweens[i];
      o.t += dt;
      if (o.t < 0) continue;
      // start срабатывает один раз, в том числе у твинов без задержки (было: самая первая карта раздачи оставалась невидимой)
      if (!o.started) {
        o.started = true;
        o.start && o.start();
      }
      const k = Math.min(1, o.t / o.d);
      o.fn(o.ease(k));
      if (k >= 1) {
        o.dead = true;
        o.done && o.done();
      }
    }
    this.tweens = this.tweens.filter((o) => !o.dead);
    for (const s of this.sprites) {
      if (s.flip >= 0) {
        s.flip += dt / 0.24;
        if (s.flip >= 0.5 && s.face !== s.flipTo) s.face = s.flipTo;
        if (s.flip >= 1) s.flip = -1;
      }
      if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 3.5);
      if (s.unlockT > 0) s.unlockT = Math.max(0, s.unlockT - dt * 1.6);
      if (s.washT > 0) s.washT = Math.max(0, s.washT - dt * 2);
    }
    for (const f of this.floats) {
      f.t += dt;
      f.y -= dt * 46;
    }
    this.floats = this.floats.filter((f) => f.t < 1.1);
    for (const c of this.conf) {
      c.life += dt;
      c.vy += 900 * dt;
      c.vx *= 0.99;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.r += c.vr * dt;
    }
    this.conf = this.conf.filter((c) => c.life < 3 && c.y < this.H + 40);
    if (this.queued && !this.busy) {
      const q = this.queued;
      this.queued = null;
      this.tap(q.x, q.y);
    }
    if (!this.busy && !this.over) this.idle += dt;
  }

  drawCard(ctx, img, x, y, r = 0, sx = 1, alpha = 1, s = 1) {
    const { cw, ch } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (r) ctx.rotate(r);
    ctx.scale(sx * s, s);
    // Soft contact shadow is rasterised once per card size, then reused.
    const pad=this.art.w*.14+6;
    ctx.drawImage(this.art.shadow(),-cw/2-pad,-ch/2-pad,cw+pad*2,ch+pad*2);
    ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch);
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    if (!this.active || !this.g) return;
    const g = this.g;
    const { cw, ch, art } = this;
    const t = this.time;
    // подсказка
    let hint = null;
    const hd = this.tut ? 1.2 : HINT_DELAY;
    if (this.idle > hd && !this.busy && !this.over) hint = this.hintTarget();
    // раскладка: от верхних рядов к нижним
    const order = g.cards.map((c, i) => i).sort((a, b) => g.cards[a].row - g.cards[b].row);
    for (const i of order) {
      const c = g.cards[i];
      const s = this.sprites[i];
      if (c.gone && s.hidden) continue;
      if (s.hidden) continue;
      let sx = 1;
      let showFace = s.face;
      if (s.flip >= 0) sx = Math.abs(Math.cos(s.flip * Math.PI));
      const shake = s.shake > 0 ? Math.sin(s.shake * 30) * s.shake * cw * 0.08 : 0;
      const img = showFace ? art.face(c.rank, c.suit) : art.back();
      const x = s.x + shake;
      const y = s.y;
      if (hint && hint.i === i) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 6);
        ctx.save();
        ctx.shadowColor = 'rgba(255,230,120,1)';
        ctx.shadowBlur = 18 + pulse * 14;
        ctx.fillStyle = 'rgba(255,240,170,.9)';
        rr(ctx, x - cw / 2 - 3, y - ch / 2 - 3, cw + 6, ch + 6, cw * 0.12);
        ctx.fill();
        ctx.restore();
      }
      this.drawCard(ctx, img, x, y, s.r, sx);
      if (showFace && sx > 0.3) this.drawBadges(ctx, c, s, x, y, sx);
      // затемнение карт, на которые сейчас нельзя сходить (только открытые)
      if (showFace && s.flip < 0 && !this.over && !g.playable(i) && g.faceUp(i) && this.dim) {
        ctx.fillStyle = 'rgba(0,30,50,.12)';
        rr(ctx, x - cw / 2, y - ch / 2, cw, ch, cw * 0.1);
        ctx.fill();
      }
    }
    // колода
    const sp = this.stockPos;
    const n = this.stockShow !== undefined && this.over ? this.stockShow : g.stock.length;
    if (n > 0) {
      const layers = Math.min(6, n);
      for (let k = layers - 1; k >= 0; k--) this.drawCard(ctx, art.back(), sp.x - k * 1.6, sp.y - k * 1.6);
      const top = g.stock[g.stock.length - 1];
      if (hint && hint.stock) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 6);
        ctx.save();
        ctx.strokeStyle = `rgba(255,236,140,${0.6 + pulse * 0.4})`;
        ctx.lineWidth = 4 + pulse * 3;
        rr(ctx, sp.x - cw / 2 - 6 - (layers - 1) * 1.6, sp.y - ch / 2 - 6 - (layers - 1) * 1.6, cw + 12, ch + 12, cw * 0.14);
        ctx.stroke();
        ctx.restore();
      }
      void top;
    } else {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 3;
      rr(ctx, sp.x - cw / 2, sp.y - ch / 2, cw, ch, cw * 0.1);
      ctx.stroke();
      ctx.restore();
    }
    // счётчик карт в колоде
    {
      const bx = sp.x - cw / 2 + 2;
      const by = sp.y - ch / 2 - 4;
      const r = Math.max(14, cw * 0.22);
      ctx.fillStyle = n > 3 ? '#2a7fb8' : n > 0 ? '#e8833a' : '#c94b4b';
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${r * 1.15}px Nunito, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n), bx, by + 1);
    }
    // сброс
    const wp = this.wastePos;
    if (!this.wasteHidden) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      rr(ctx, wp.x - cw / 2, wp.y - ch / 2, cw, ch, cw * 0.1);
      ctx.fill();
      ctx.restore();
      for (const w of this.wasteSpr) {
        let sx = 1;
        let face = true;
        if (w.flip !== undefined && w.fly) {
          sx = Math.abs(Math.cos(w.flip * Math.PI));
          face = w.flip >= 0.5;
        }
        const img = face ? (w.c.rank === WILD ? art.wild() : art.face(w.c.rank, w.c.suit)) : art.back();
        this.drawCard(ctx, img, w.x, w.y, w.r, sx, 1, w.s !== undefined ? 0.4 + 0.6 * w.s : 1);
      }
    }
    if (this.flyBack) {
      const w = this.flyBack;
      const sx = Math.abs(Math.cos(w.flip * Math.PI));
      this.drawCard(ctx, w.flip >= 0.5 ? (w.c.rank === WILD ? art.wild() : art.face(w.c.rank, w.c.suit)) : art.back(), w.x, w.y, 0, sx);
    }
    // серия над сбросом
    if (g.streak >= 2 && !this.over) {
      const txt = (this.streakLabel || '×') + g.streak;
      ctx.save();
      ctx.font = `900 ${Math.max(16, cw * 0.26)}px Nunito, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(txt).width + 22;
      const x = wp.x;
      const y = wp.y + ch / 2 + 16;
      if (y + 12 < this.H) {
        ctx.fillStyle = g.streak >= 8 ? '#ff7a59' : g.streak >= 5 ? '#ffb02e' : '#3bb3d6';
        rr(ctx, x - tw / 2, y - 13, tw, 26, 13);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(txt, x, y + 1);
      }
      ctx.restore();
    }
    // палец-подсказка на первом уровне
    if (hint && this.tut) this.drawHand(ctx, hint.x + cw * 0.15, hint.y + ch * 0.15, t);
    // всплывающие очки
    for (const f of this.floats) {
      const a = f.t < 0.15 ? f.t / 0.15 : Math.max(0, 1 - (f.t - 0.6) / 0.5);
      ctx.save();
      ctx.globalAlpha = Math.min(1, a);
      ctx.font = `900 ${f.size}px Nunito, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, f.size * 0.18);
      ctx.strokeStyle = 'rgba(30,60,90,.75)';
      if (f.coin) drawCoin(ctx, f.x - f.size * 0.9, f.y, f.size * 0.42);
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
    // конфетти
    for (const c of this.conf) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.fillStyle = c.c;
      ctx.globalAlpha = Math.max(0, 1 - c.life / 3);
      ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
      ctx.restore();
    }
  }

  drawBadges(ctx, c, s, x, y, sx) {
    const { cw, ch } = this;
    const g = this.g;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, 1);
    if (c.coin) drawCoin(ctx, cw * 0.3, ch * 0.34, cw * 0.13);
    if (c.key) {
      ctx.fillStyle = 'rgba(255,240,190,.95)';
      ctx.beginPath();
      ctx.arc(0, ch * 0.08, cw * 0.27, 0, Math.PI * 2);
      ctx.fill();
      drawKey(ctx, 0, ch * 0.08, cw * 0.42, KEY_COL[c.key] || KEY_COL[1]);
    }
    if (c.lock) {
      const locked = !g.keysUsed.has(c.lock);
      if (locked || s.unlockT > 0) {
        const a = locked ? 1 : s.unlockT;
        ctx.globalAlpha = a;
        // цепи крест-накрест
        ctx.strokeStyle = 'rgba(120,100,70,.85)';
        ctx.lineWidth = cw * 0.06;
        ctx.setLineDash([cw * 0.07, cw * 0.04]);
        ctx.beginPath();
        ctx.moveTo(-cw * 0.45, -ch * 0.4);
        ctx.lineTo(cw * 0.45, ch * 0.4);
        ctx.moveTo(cw * 0.45, -ch * 0.4);
        ctx.lineTo(-cw * 0.45, ch * 0.4);
        ctx.stroke();
        ctx.setLineDash([]);
        const lift = locked ? 0 : (1 - s.unlockT) * ch * 0.3;
        drawLock(ctx, 0, ch * 0.06 - lift, cw * 0.46, !locked);
        if (c.lock === 2) {
          ctx.fillStyle = '#7ec8ff';
          ctx.beginPath();
          ctx.arc(cw * 0.22, ch * 0.2, cw * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    if (c.sandLeft > 0 || s.washT > 0) {
      ctx.globalAlpha = c.sandLeft > 0 ? 1 : s.washT;
      drawSand(ctx, -cw / 2, -ch / 2, cw, ch, Math.max(1, c.sandLeft));
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawHand(ctx, x, y, t) {
    const k = Math.sin(t * 5) * 6;
    ctx.save();
    ctx.translate(x + k * 0.4, y + k);
    ctx.rotate(-0.4);
    const s = Math.max(26, this.cw * 0.5);
    ctx.fillStyle = '#ffe2c4';
    ctx.strokeStyle = '#6b4a32';
    ctx.lineWidth = 3;
    ctx.beginPath();
    rr(ctx, -s * 0.14, -s * 0.1, s * 0.28, s * 0.7, s * 0.14);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    rr(ctx, -s * 0.34, s * 0.3, s * 0.68, s * 0.55, s * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export { star };
