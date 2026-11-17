// Интерфейс поверх арены: счёт, уровень, характеристики, классы, лидеры, миникарта, джойстики, окна
import { COLORS, STATS, TANKS, TEAM_COLORS, LEVEL_SCORE, MAX_LEVEL, hex, coinsFor } from '../data.js';
import { tankIcon } from '../tex.js';
import { uiScale, txt, button, Layer, panelGfx, drawPanel, fmtTime, FONT } from '../ui.js';
import { t as tr, tankName } from '../i18n.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { openSound } from '../sound-ui.js';

const Phaser = window.Phaser;
const fmt = (n) => {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'm';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return n.toLocaleString('ru-RU');
};

export class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    this.A = this.scene.get('Arena');
    this.L = new Layer(this);
    this.ov = new Layer(this);
    this.overlay = null;
    this.notes = [];
    this.touchMode = false;
    this.joyL = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
    this.joyR = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
    this.vigRed = this.add.image(0, 0, 'vignette').setOrigin(0).setTint(0xff0030).setAlpha(0).setDepth(0);
    this.g = this.add.graphics().setDepth(5);
    this.mini = this.add.graphics().setDepth(6);
    this.jg = [this.add.image(0, 0, 'joyBase'), this.add.image(0, 0, 'joyKnob'), this.add.image(0, 0, 'joyBase'), this.add.image(0, 0, 'joyKnob')];
    this.jg.forEach((s) => s.setDepth(60).setVisible(false).setAlpha(0.7));
    this.lbRows = [];
    this.lbT = 0;
    this.statSig = '';
    this.classSig = '';
    this.build();

    const A = this.A;
    this.onSpawn = () => {
      this.closeOverlay();
      this.build();
    };
    this.onDead = (info) => this.showDeath(info);
    this.onNotify = (n) => this.notify(n);
    this.onHurt = (k) => {
      this.vigRed.setAlpha(Math.min(0.75, this.vigRed.alpha + 0.25 + k));
    };
    this.onStats = () => (this.statSig = '');
    this.onLevel = () => (this.statSig = '');
    this.onPause = () => this.openPause();
    this.onToggles = () => this.showToggles();
    A.events.on('player-spawn', this.onSpawn);
    A.events.on('player-dead', this.onDead);
    A.events.on('notify', this.onNotify);
    A.events.on('hurt', this.onHurt);
    A.events.on('stats', this.onStats);
    A.events.on('levelup', this.onLevel);
    A.events.on('want-pause', this.onPause);
    A.events.on('toggles', this.onToggles);
    this.events.once('shutdown', () => {
      A.events.off('player-spawn', this.onSpawn);
      A.events.off('player-dead', this.onDead);
      A.events.off('notify', this.onNotify);
      A.events.off('hurt', this.onHurt);
      A.events.off('stats', this.onStats);
      A.events.off('levelup', this.onLevel);
      A.events.off('want-pause', this.onPause);
      A.events.off('toggles', this.onToggles);
      this.scale.off('resize', this.onResize, this);
      A.touch.active = false;
    });

    this.input.addPointer(2);
    this.input.on('pointerdown', (p, over) => this.pDown(p, over));
    this.input.on('pointermove', (p) => this.pMove(p));
    this.input.on('pointerup', (p) => this.pUp(p));
    this.input.on('pointerupoutside', (p) => this.pUp(p));
    this.scale.on('resize', this.onResize, this);
    if (!save.data.hintDone) this.time.delayedCall(800, () => this.showHint());
  }

  onResize() {
    this.statSig = '';
    this.classSig = '';
    this.build();
    if (this.overlay) this.overlay();
  }

  get P() {
    return this.A.player;
  }

  // ---------- Сенсорное управление ----------
  pDown(p, over) {
    const isTouch = p.wasTouch || (p.event && p.event.pointerType === 'touch');
    if (!isTouch) return;
    if (!this.touchMode) {
      this.touchMode = true;
      this.build();
    }
    if (this.overlay || (over && over.length)) return;
    if (this.A.state !== 'play') return;
    const W = this.scale.width;
    const j = p.x < W / 2 ? this.joyL : this.joyR;
    if (j.id !== -1) return;
    j.id = p.id;
    j.ox = p.x;
    j.oy = p.y;
    j.x = 0;
    j.y = 0;
    this.applyTouch();
  }

  pMove(p) {
    for (const j of [this.joyL, this.joyR]) {
      if (j.id !== p.id) continue;
      const R = this.jr;
      let dx = p.x - j.ox, dy = p.y - j.oy;
      let len = Math.hypot(dx, dy);
      if (len > R) {
        j.ox = p.x - (dx / len) * R;
        j.oy = p.y - (dy / len) * R;
        dx = p.x - j.ox;
        dy = p.y - j.oy;
        len = R;
      }
      j.x = len > R * 0.1 ? dx / R : 0;
      j.y = len > R * 0.1 ? dy / R : 0;
      j.len = len / R;
    }
    this.applyTouch();
  }

  pUp(p) {
    for (const j of [this.joyL, this.joyR]) if (j.id === p.id) Object.assign(j, { id: -1, x: 0, y: 0, len: 0 });
    this.applyTouch();
  }

  applyTouch() {
    const t = this.A.touch;
    t.active = this.touchMode;
    t.mx = Math.max(-1, Math.min(1, this.joyL.x * 1.25));
    t.my = Math.max(-1, Math.min(1, this.joyL.y * 1.25));
    // правый джойстик: целимся и стреляем; отпустили — ствол остаётся там, куда смотрел
    if (this.joyR.id !== -1 && this.joyR.len > 0.15) {
      t.aim = Math.atan2(this.joyR.y, this.joyR.x);
      t.fire = true;
    } else t.fire = false;
  }

  // ---------- Постоянный HUD ----------
  build() {
    this.L.clear();
    this.lbRows = [];
    const { width: W, height: H } = this.scale;
    const u = (this.u = uiScale(this));
    this.jr = 60 * u;
    this.jg.forEach((s, i) => s.setDisplaySize(i % 2 ? this.jr * 1.1 : this.jr * 2.3, i % 2 ? this.jr * 1.1 : this.jr * 2.3));
    this.vigRed.setDisplaySize(W, H);
    this.statSig = '';
    this.classSig = '';
    for (const o of this.statBtns || []) o.destroy && o.destroy();
    for (const o of this.classBtns || []) o.destroy && o.destroy();
    this.statBtns = [];
    this.classBtns = [];
    if (this.A.state !== 'play') return;
    const m = 12 * u;
    const port = H > W * 1.1;
    this.port = port;
    // пауза
    this.L.add(button(this, { x: m + 26 * u, y: m + 26 * u, w: 52 * u, h: 52 * u, icon: 'pause', iconSize: 34 * u, color: COLORS.cyan, depth: 20, onClick: () => this.openPause() }));
    // лидеры
    const lw = (port ? 190 : 240) * u;
    const rows = port ? 5 : 10;
    const rh = (port ? 19 : 22) * u;
    this.lb = { x: W - m - lw, y: m, w: lw, rh, rows };
    this.lbTitle = this.L.add(txt(this, W - m - lw / 2, m + 12 * u, tr('leaders'), 18 * u, 0xffffff, { glowColor: COLORS.violet }));
    for (let i = 0; i < rows; i++) {
      const y = m + 30 * u + i * (rh + 3 * u) + rh / 2;
      const t1 = this.L.add(txt(this, W - m - lw / 2, y, '', rh * 0.62, 0xffffff, { glow: false, stroke: 0x07031a, strokeW: 3 * u }).setDepth(8));
      this.lbRows.push({ t: t1, y });
    }
    // миникарта
    const ms = (port ? 110 : 150) * u;
    this.mm = { x: W - m - ms, y: H - m - ms, s: ms };
    // счёт и уровень внизу по центру
    const bw = Math.min(W * (port ? 0.62 : 0.4), 440 * u);
    const by = H - m - 18 * u;
    this.bars = { x: W / 2 - bw / 2, w: bw, yLvl: by - 13 * u, hLvl: 26 * u, ySc: by - 13 * u - 30 * u, hSc: 20 * u, wSc: bw * 0.78 };
    if (port) {
      this.bars.yLvl = by - 13 * u - (this.touchMode ? 0 : 0);
    }
    this.lvlText = this.L.add(txt(this, W / 2, this.bars.yLvl + this.bars.hLvl / 2, '', 17 * u, 0xffffff, { glow: false, stroke: 0x07031a, strokeW: 3 * u }).setDepth(8));
    this.scText = this.L.add(txt(this, W / 2, this.bars.ySc + this.bars.hSc / 2, '', 14 * u, 0xffffff, { glow: false, stroke: 0x07031a, strokeW: 3 * u }).setDepth(8));
    this.nameText = this.L.add(txt(this, W / 2, this.bars.ySc - 22 * u, save.data.nick || '', 30 * u, 0xffffff, { glowColor: this.P ? this.P.color : COLORS.cyan }));
    // переключатели для телефона
    if (this.touchMode) {
      const s = 54 * u;
      const bx = W - m - s / 2;
      const by2 = this.mm.y - m - s / 2;
      this.afBtn = this.L.add(button(this, { x: bx, y: by2, w: s, h: s, icon: 'fire', iconSize: s * 0.7, color: COLORS.pink, depth: 20, onClick: () => this.A.toggleAuto('fire') }));
      this.spBtn = this.L.add(button(this, { x: bx - s - 10 * u, y: by2, w: s, h: s, icon: 'spin', iconSize: s * 0.7, color: COLORS.green, depth: 20, onClick: () => this.A.toggleAuto('spin') }));
      this.showToggles(true);
    }
    this.statsOpen = this.statsOpen ?? !port;
  }

  showToggles(silent) {
    const p = this.P;
    if (!p) return;
    if (this.afBtn) this.afBtn.c.setAlpha(p.autoFire ? 1 : 0.45);
    if (this.spBtn) this.spBtn.c.setAlpha(p.spinOn ? 1 : 0.45);
    if (!silent && !this.touchMode) this.notify({ text: (tr('autoFire') + ': ' + (p.autoFire ? tr('on') : tr('off'))) + '   ·   ' + tr('autoSpin') + ': ' + (p.spinOn ? tr('on') : tr('off')), color: COLORS.cyan, small: true });
  }

  // ---------- Характеристики ----------
  buildStats() {
    for (const o of this.statBtns) o.destroy && o.destroy();
    this.statBtns = [];
    const p = this.P;
    if (!p || p.dead) return;
    const A = this.A;
    const w = A.world;
    const u = this.u;
    const { width: W, height: H } = this.scale;
    const free = w.freePoints(p);
    const m = 12 * u;
    const port = this.port;
    if (free <= 0 && !this.statsPinned) return;
    if (port && !this.statsOpen) {
      // на телефоне — значок «+N», по нажатию раскрывается панель
      const b = button(this, { x: m + 40 * u, y: H - m - 150 * u, w: 80 * u, h: 52 * u, label: '+' + free, size: 26 * u, color: COLORS.green, fillStrong: true, depth: 20, onClick: () => {
        this.statsOpen = true;
        this.statSig = '';
      } });
      this.statBtns.push(b);
      return;
    }
    const rh = (port ? 30 : 24) * u;
    const pw = (port ? Math.min(W - 2 * m, 360 * u) : 290 * u);
    const x0 = m;
    const y0 = port ? H * 0.42 : H - m - 8 * (rh + 4 * u) - 8 * u;
    const bg = this.add.graphics().setDepth(18);
    this.statBtns.push(bg);
    drawPanel(bg, pw + 16 * u, 8 * (rh + 4 * u) + 40 * u, COLORS.violet, { radius: 12 * u, fillAlpha: 0.72, lineWidth: 2, tintAlpha: 0.05 });
    bg.setPosition(x0 + pw / 2 + 8 * u - 8 * u, y0 + (8 * (rh + 4 * u)) / 2 - 16 * u);
    const head = txt(this, x0 + 4 * u, y0 - 26 * u, '×' + free, 20 * u, COLORS.green, { ox: 0 }).setDepth(19);
    this.statBtns.push(head);
    if (port) {
      const cb = button(this, { x: x0 + pw - 16 * u, y: y0 - 24 * u, w: 34 * u, h: 34 * u, icon: 'close', iconSize: 24 * u, color: COLORS.cyan, depth: 20, onClick: () => {
        this.statsOpen = false;
        this.statSig = '';
      } });
      this.statBtns.push(cb);
    }
    STATS.forEach((s, i) => {
      const y = y0 + i * (rh + 4 * u) + rh / 2;
      const cap = w.statCap(p, i);
      const g = this.add.graphics().setDepth(19);
      const barW = pw - rh * 1.4;
      g.fillStyle(0x140d33, 1);
      g.fillRoundedRect(x0, y - rh / 2, barW, rh, rh / 2.4);
      const segs = Math.max(cap, 1);
      const sw = (barW - 8 * u) / segs;
      for (let k = 0; k < segs; k++) {
        g.fillStyle(k < p.stats[i] ? s.color : 0x2a2252, cap ? 1 : 0.35);
        g.fillRoundedRect(x0 + 4 * u + k * sw + 1, y - rh / 2 + 4 * u, sw - 2, rh - 8 * u, 3 * u);
      }
      g.lineStyle(1.5, s.color, 0.6);
      g.strokeRoundedRect(x0, y - rh / 2, barW, rh, rh / 2.4);
      this.statBtns.push(g);
      const lab = txt(this, x0 + barW / 2, y, tr('st_' + s.id) + (port ? '' : `  [${i + 1}]`), rh * 0.5, 0xffffff, { glow: false, stroke: 0x07031a, strokeW: 3 * u }).setDepth(20);
      this.statBtns.push(lab);
      const can = free > 0 && p.stats[i] < cap;
      const b = button(this, { x: x0 + barW + rh * 0.75, y, w: rh * 1.15, h: rh, icon: 'plus', iconSize: rh * 0.7, color: s.color, fillStrong: can, disabled: !can, depth: 20, onClick: () => this.A.statUp(i) });
      this.statBtns.push(b);
    });
  }

  // ---------- Выбор класса ----------
  buildClasses() {
    for (const o of this.classBtns) o.destroy && o.destroy();
    this.classBtns = [];
    const p = this.P;
    if (!p || p.dead || this.classSkipped === p.level + ':' + p.cls) return;
    const opts = this.A.world.classOptions(p);
    if (!opts.length) return;
    const u = this.u;
    const { width: W, height: H } = this.scale;
    const m = 12 * u;
    const port = this.port;
    const cs = (port ? 74 : 86) * u;
    const cols = port ? Math.min(opts.length, 4) : 2;
    const gap = 8 * u;
    const x0 = m + cs / 2;
    const y0 = m + 64 * u + cs / 2 + 18 * u;
    const title = txt(this, m, y0 - cs / 2 - 14 * u, tr('chooseClass'), 17 * u, COLORS.yellow, { ox: 0 }).setDepth(20);
    this.classBtns.push(title);
    this.tweens.add({ targets: title, alpha: 0.5, yoyo: true, repeat: -1, duration: 600 });
    opts.forEach((id, i) => {
      const cx = x0 + (i % cols) * (cs + gap);
      const cy = y0 + Math.floor(i / cols) * (cs + gap + 4 * u);
      const col = [COLORS.cyan, COLORS.green, COLORS.pink, COLORS.yellow, COLORS.violet, COLORS.orange][i % 6];
      const b = button(this, { x: cx, y: cy, w: cs, h: cs, color: col, depth: 20, radius: 12 * u, onClick: () => {
        this.A.pickClass(id);
        this.classSig = '';
      } });
      const ic = this.add.image(0, -cs * 0.08, tankIcon(id, this.P.color)).setDisplaySize(cs * 0.86, cs * 0.86);
      b.c.add(ic);
      const lab = txt(this, 0, cs * 0.36, tankName(id), cs * 0.15, 0xffffff, { glow: false, stroke: 0x07031a, strokeW: 3 });
      b.c.add(lab);
      this.classBtns.push(b);
    });
    const rowsN = Math.ceil(opts.length / cols);
    const sk = button(this, { x: m + 60 * u, y: y0 + rowsN * (cs + gap + 4 * u) - cs / 2 + 14 * u, w: 120 * u, h: 32 * u, label: tr('skip'), size: 15 * u, color: 0x8a84b8, depth: 20, onClick: () => {
      this.classSkipped = this.P.level + ':' + this.P.cls;
      this.classSig = '';
    } });
    this.classBtns.push(sk);
  }

  // ---------- Кадр ----------
  update(time, delta) {
    const dt = delta / 1000;
    const A = this.A;
    const p = this.P;
    this.vigRed.setAlpha(Math.max(0, this.vigRed.alpha - dt * 1.6));
    this.updNotes(dt);
    this.drawJoy();
    const g = this.g;
    g.clear();
    this.mini.clear();
    if (A.state !== 'play' || !p) return;
    if (!this.lvlText || !this.lvlText.active) this.build();
    const u = this.u;
    const w = A.world;
    // характеристики и классы пересобираются, когда что-то поменялось
    const sig = [w.freePoints(p), p.stats.join(''), p.cls, this.statsOpen ? 1 : 0].join('|');
    if (sig !== this.statSig) {
      this.statSig = sig;
      this.buildStats();
    }
    const csig = p.cls + '|' + w.classOptions(p).join(',') + '|' + this.classSkipped;
    if (csig !== this.classSig) {
      this.classSig = csig;
      this.buildClasses();
    }
    // полосы счёта и уровня
    const B = this.bars;
    const lvl = p.level;
    const cur = LEVEL_SCORE[lvl] || 0;
    const nxt = lvl < MAX_LEVEL ? LEVEL_SCORE[lvl + 1] : cur;
    const f = lvl < MAX_LEVEL ? (p.score - cur) / (nxt - cur) : 1;
    g.fillStyle(0x0a0620, 0.85);
    g.fillRoundedRect(B.x, B.yLvl, B.w, B.hLvl, B.hLvl / 2);
    g.fillStyle(COLORS.yellow, 0.95);
    g.fillRoundedRect(B.x + 3, B.yLvl + 3, Math.max(B.hLvl, (B.w - 6) * Math.min(1, f)), B.hLvl - 6, (B.hLvl - 6) / 2);
    g.lineStyle(2, COLORS.yellow, 0.6);
    g.strokeRoundedRect(B.x, B.yLvl, B.w, B.hLvl, B.hLvl / 2);
    const lb = w.leaderboard(1)[0];
    const sf = lb ? Math.min(1, p.score / Math.max(1, lb.score)) : 1;
    const sx = B.x + (B.w - B.wSc) / 2;
    g.fillStyle(0x0a0620, 0.85);
    g.fillRoundedRect(sx, B.ySc, B.wSc, B.hSc, B.hSc / 2);
    g.fillStyle(COLORS.green, 0.9);
    g.fillRoundedRect(sx + 3, B.ySc + 3, Math.max(B.hSc, (B.wSc - 6) * sf), B.hSc - 6, (B.hSc - 6) / 2);
    const lt = tr('lvl') + ' ' + lvl + ' ' + tankName(p.cls);
    if (this.lvlText.text !== lt) this.lvlText.setText(lt);
    const st = tr('score') + ': ' + Math.floor(p.score).toLocaleString('ru-RU');
    if (this.scText.text !== st) this.scText.setText(st);
    // лидеры
    this.lbT -= dt;
    if (this.lbT <= 0) {
      this.lbT = 0.4;
      this.drawLb();
    }
    this.drawLbBars();
    this.drawMini();
  }

  drawLb() {
    const A = this.A;
    const rows = A.world.leaderboard(this.lb.rows);
    this.lbData = rows;
    rows.forEach((t, i) => {
      const r = this.lbRows[i];
      if (!r) return;
      const name = t === A.player ? t.name || tr('you') : t.name || tr('unnamed');
      const s = `${name.length > 14 ? name.slice(0, 13) + '…' : name} — ${fmt(t.score)}`;
      if (r.t.text !== s) r.t.setText(s);
      r.t.setColor(t === A.player ? '#fff6a8' : '#ffffff');
    });
    for (let i = rows.length; i < this.lbRows.length; i++) this.lbRows[i].t.setText('');
  }

  drawLbBars() {
    const rows = this.lbData || [];
    const g = this.g;
    const L = this.lb;
    const u = this.u;
    const top = rows[0] ? rows[0].score : 1;
    rows.forEach((t, i) => {
      const r = this.lbRows[i];
      if (!r) return;
      const y = r.y - L.rh / 2;
      g.fillStyle(0x0a0620, 0.75);
      g.fillRoundedRect(L.x, y, L.w, L.rh, L.rh / 2);
      const f = Math.max(0.08, t.score / Math.max(1, top));
      const col = t === this.A.player ? t.color : this.A.mode === 'teams' ? TEAM_COLORS[t.team] : COLORS.pink;
      g.fillStyle(col, t === this.A.player ? 0.75 : 0.45);
      g.fillRoundedRect(L.x + 2, y + 2, (L.w - 4) * f, L.rh - 4, (L.rh - 4) / 2);
    });
  }

  drawMini() {
    const g = this.mini;
    const M = this.mm;
    const A = this.A;
    const w = A.world;
    const u = this.u;
    g.fillStyle(0x0a0620, 0.78);
    g.fillRoundedRect(M.x, M.y, M.s, M.s, 8 * u);
    g.lineStyle(2, COLORS.violet, 0.7);
    g.strokeRoundedRect(M.x, M.y, M.s, M.s, 8 * u);
    const k = M.s / w.size;
    const X = (x) => M.x + (x + w.half) * k;
    const Y = (y) => M.y + (y + w.half) * k;
    if (w.mode === 'ffa') {
      g.fillStyle(COLORS.violet, 0.25);
      g.fillRect(X(-w.nest), Y(-w.nest), w.nest * 2 * k, w.nest * 2 * k);
    }
    for (const b of w.bases) {
      g.fillStyle(TEAM_COLORS[b.team], 0.22);
      g.fillRect(X(b.x0), M.y, (b.x1 - b.x0) * k, M.s);
    }
    // союзники в командном режиме
    if (w.mode === 'teams' && A.player) {
      g.fillStyle(TEAM_COLORS[A.player.team], 0.8);
      for (const t of w.tanks) if (t !== A.player && t.team === A.player.team) g.fillCircle(X(t.x), Y(t.y), 2 * u);
    }
    if (w.boss && !w.boss.dead) {
      g.fillStyle(w.boss.color, 0.9);
      g.fillCircle(X(w.boss.x), Y(w.boss.y), 4 * u);
    }
    const p = A.player;
    if (p) {
      const x = X(p.x), y = Y(p.y), a = p.angle;
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(x + Math.cos(a) * 7 * u, y + Math.sin(a) * 7 * u, x + Math.cos(a + 2.5) * 5 * u, y + Math.sin(a + 2.5) * 5 * u, x + Math.cos(a - 2.5) * 5 * u, y + Math.sin(a - 2.5) * 5 * u);
    }
  }

  drawJoy() {
    const show = this.touchMode && this.A.state === 'play' && !this.overlay;
    [this.joyL, this.joyR].forEach((j, i) => {
      const base = this.jg[i * 2], knob = this.jg[i * 2 + 1];
      const on = show && j.id !== -1;
      base.setVisible(on);
      knob.setVisible(on);
      if (on) {
        base.setPosition(j.ox, j.oy);
        knob.setPosition(j.ox + j.x * this.jr, j.oy + j.y * this.jr);
        knob.setTint(i ? COLORS.pink : COLORS.cyan);
        base.setTint(i ? COLORS.pink : COLORS.cyan);
      }
    });
  }

  // ---------- Уведомления ----------
  notify(n) {
    const { width: W } = this.scale;
    const u = this.u;
    let s = n.text;
    if (!s) {
      s = tr(n.key);
      if (n.name !== undefined) s = s.replace('%s', n.name || tr('unnamed'));
    }
    const t = txt(this, W / 2, 0, s, (n.big ? 24 : n.small ? 15 : 19) * u, n.color || 0xffffff, { wrap: W * 0.8 }).setDepth(70);
    t.setAlpha(0);
    this.notes.unshift({ t, life: n.big ? 4 : 2.6, age: 0 });
    if (this.notes.length > 4) this.notes.pop().t.destroy();
    if (n.big) audio.play('notify');
  }

  updNotes(dt) {
    const u = this.u;
    const y0 = (this.port ? 120 : 70) * u;
    this.notes = this.notes.filter((n) => {
      n.age += dt;
      if (n.age > n.life) {
        n.t.destroy();
        return false;
      }
      return true;
    });
    this.notes.forEach((n, i) => {
      n.t.y += (y0 + i * 32 * u - n.t.y) * 0.25;
      n.t.setAlpha(Math.min(1, n.age * 5, (n.life - n.age) * 2));
    });
  }

  showHint() {
    if (this.A.state !== 'play') return;
    this.notify({ key: this.touchMode ? 'hintTouch' : 'hintKeys', color: COLORS.cyan, small: false });
    this.time.delayedCall(2600, () => this.A.state === 'play' && this.notify({ key: 'hintShapes', color: COLORS.yellow }));
    save.data.hintDone = true;
    save.write(false);
  }

  // ---------- Окна ----------
  closeOverlay() {
    this.ov.clear();
    this.overlay = null;
  }

  dim() {
    const { width: W, height: H } = this.scale;
    const r = this.add.rectangle(0, 0, W, H, 0x05021a, 0.62).setOrigin(0).setDepth(80).setInteractive();
    this.ov.add(r);
  }

  openPause() {
    if (this.A.state !== 'play' || this.overlay) return;
    this.A.setPause('menu', true);
    audio.play('click');
    this.overlay = () => {
      this.ov.clear();
      const { width: W, height: H } = this.scale;
      const u = this.u;
      this.dim();
      const pw = Math.min(W * 0.86, 420 * u);
      this.ov.add(panelGfx(this, W / 2, H / 2, pw, 360 * u, COLORS.cyan, { radius: 18 * u }).setDepth(81));
      this.ov.add(txt(this, W / 2, H / 2 - 130 * u, tr('pause'), 40 * u, COLORS.cyan).setDepth(82));
      const mk = (y, label, color, fn, icon) => this.ov.add(button(this, { x: W / 2, y, w: pw * 0.8, h: 62 * u, label, color, icon, iconSize: 34 * u, size: 24 * u, depth: 83, onClick: fn }));
      mk(H / 2 - 45 * u, tr('resume'), COLORS.green, () => this.resume());
      mk(H / 2 + 30 * u, tr('volume'), COLORS.cyan, () => openSound(), 'sound');
      mk(H / 2 + 105 * u, tr('toMenu'), COLORS.pink, () => {
        this.closeOverlay();
        this.A.setPause('menu', false);
        this.leaveToMenu(true);
      });
    };
    this.overlay();
  }

  resume() {
    this.closeOverlay();
    this.A.setPause('menu', false);
  }

  leaveToMenu(ad) {
    const A = this.A;
    const go = () => {
      A.toSpectate();
      this.closeOverlay();
      this.build();
      this.scene.launch('Menu');
      this.scene.bringToTop('Menu');
    };
    if (ad) {
      audio.suspend('ad');
      sdk.showInterstitial(() => {
        audio.resume('ad');
        go();
      });
    } else go();
  }

  showDeath(info) {
    // результат забега: монеты, рекорд, лидерборд
    const coins = coinsFor(info.score, info.kills);
    save.data.coins += coins;
    save.data.runs++;
    const b = save.data.best;
    const isBest = info.score > b.score;
    if (isBest) Object.assign(b, { score: info.score, level: info.level, cls: info.cls, kills: info.kills });
    save.data.totalKills = (save.data.totalKills || 0) + info.kills;
    save.write();
    if (isBest) sdk.submitScore(info.score);
    this.deathInfo = { ...info, coins, isBest, adUsed: false };
    this.statSig = '';
    this.classSig = '';
    for (const o of this.statBtns) o.destroy && o.destroy();
    for (const o of this.classBtns) o.destroy && o.destroy();
    this.statBtns = [];
    this.classBtns = [];
    this.L.clear();
    this.time.delayedCall(1100, () => {
      this.overlay = () => this.drawDeath();
      this.overlay();
    });
  }

  killerLabel(info) {
    const k = info.killer;
    if (!k) return tr('unknown');
    if (k === '\u0000') return tr('unnamed');
    if (k[0] === '\u0001') return tr('boss_' + k.slice(1));
    if (k[0] === '\u0002') return tr('sh_' + k.slice(1));
    return k;
  }

  drawDeath() {
    this.ov.clear();
    const I = this.deathInfo;
    const { width: W, height: H } = this.scale;
    const u = this.u;
    this.dim();
    const pw = Math.min(W * 0.92, 520 * u);
    const ph = Math.min(H * 0.94, ((this.deathInfo.killerCls ? 56 : 0) + (!this.deathInfo.adUsed && this.deathInfo.score >= 200 ? 70 : 0) + 400) * u);
    const cy = H / 2;
    this.ov.add(panelGfx(this, W / 2, cy, pw, ph, COLORS.pink, { radius: 18 * u }).setDepth(81));
    let y = cy - ph / 2 + 40 * u;
    this.ov.add(txt(this, W / 2, y, tr('killedBy'), 22 * u, 0xd8d4ff, { glow: false }).setDepth(82));
    y += 44 * u;
    if (I.killerCls) {
      const ic = this.add.image(W / 2 - 0, y + 4 * u, tankIcon(I.killerCls, I.killerColor)).setDisplaySize(70 * u, 70 * u).setDepth(82);
      this.ov.add(ic);
      y += 56 * u;
    }
    this.ov.add(txt(this, W / 2, y, this.killerLabel(I), 34 * u, COLORS.pink, { wrap: pw * 0.9 }).setDepth(82));
    y += 52 * u;
    const line = (a, b, col = 0xffffff) => {
      this.ov.add(txt(this, W / 2 - pw * 0.36, y, a, 20 * u, 0xd8d4ff, { ox: 0, glow: false }).setDepth(82));
      this.ov.add(txt(this, W / 2 + pw * 0.36, y, b, 22 * u, col, { ox: 1 }).setDepth(82));
      y += 32 * u;
    };
    line(tr('score'), I.score.toLocaleString('ru-RU') + (I.isBest ? '  ★' : ''), I.isBest ? COLORS.yellow : 0xffffff);
    line(tr('level'), I.level + ' · ' + tankName(I.cls));
    line(tr('timeAlive'), fmtTime(I.time));
    line(tr('kills'), String(I.kills));
    line(tr('coinsGot'), '+' + I.coins, COLORS.yellow);
    y += 12 * u;
    const bw = pw * 0.82;
    if (!I.adUsed && I.score >= 200) {
      this.ov.add(
        button(this, {
          x: W / 2,
          y: y + 28 * u,
          w: bw,
          h: 58 * u,
          label: tr('continueHalf'),
          icon: 'ad',
          iconSize: 34 * u,
          size: 20 * u,
          color: COLORS.yellow,
          fillStrong: true,
          depth: 83,
          onClick: () => {
            audio.suspend('ad');
            sdk.showRewarded(null, (ok) => {
              audio.resume('ad');
              if (!ok) return;
              I.adUsed = true;
              this.respawn(Math.floor(I.score / 2));
            });
          },
        })
      );
      y += 70 * u;
    }
    const half = (bw - 12 * u) / 2;
    this.ov.add(button(this, { x: W / 2 - half / 2 - 6 * u, y: y + 30 * u, w: half, h: 60 * u, label: tr('again'), size: 22 * u, color: COLORS.green, fillStrong: true, depth: 83, onClick: () => {
      audio.suspend('ad');
      sdk.showInterstitial(() => {
        audio.resume('ad');
        this.respawn(0);
      });
    } }));
    this.ov.add(button(this, { x: W / 2 + half / 2 + 6 * u, y: y + 30 * u, w: half, h: 60 * u, label: tr('toMenu'), size: 22 * u, color: COLORS.cyan, depth: 83, onClick: () => this.leaveToMenu(true) }));
  }

  respawn(score) {
    this.closeOverlay();
    this.classSkipped = null;
    this.A.startPlay({ score });
  }
}
