// Интерфейс боя: счётчики, кнопки, меню постройки, окна
import { C, TOWERS, TOWER_ORDER, ENEMIES, LEVEL_COUNT, SPELLS } from '../data.js';
import { uiScale, txt, button, Layer, panel, panelTex } from '../ui.js';
import { t as tr } from '../i18n.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { openSound, volPct } from '../sound-ui.js';

const Phaser = window.Phaser;

export class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  init(data) {
    this.g = data.game;
    this.ready = false;
  }

  create() {
    this.hudL = new Layer(this);
    this.menuL = new Layer(this);
    this.ovL = new Layer(this);
    this.tipL = new Layer(this);
    this.overlay = null;
    this.menuFor = null;
    this.menuSel = null;
    this.cache = {};
    this.flashRect = this.add.rectangle(0, 0, 10, 10, 0xff2020, 0).setOrigin(0).setDepth(500);
    this.cd = this.add.graphics().setDepth(60);
    this.buildHud();
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    this.ready = true;
    this.levelStartIntro();
  }

  onResize() {
    // раскладку карты делает Game; HUD перестраивается из onLayout
  }

  onLayout() {
    this.buildHud();
    if (this.menuFor) this.reopenMenu();
    if (this.overlay) this.overlay();
    if (this.tutorialFn) this.tutorialFn();
  }

  // ---------- HUD ----------
  buildHud() {
    this.hudL.clear();
    const { width: W, height: H } = this.scale;
    const u = (this.u = uiScale(this));
    const g = this.g;
    this.flashRect.setSize(W, H);
    const m = 10 * u;
    const L = this.hudL;

    // панель счётчиков
    const ph = 58 * u;
    const pw = g.portrait ? W - 2 * m - 2 * (ph + 8 * u) - 8 * u : 430 * u;
    const px = m + pw / 2;
    const py = m + ph / 2;
    L.add(panel(this, px, py, pw, ph, 'woodDark', ph * 0.35).setDepth(50));
    const slot = pw / 3;
    const mk = (i, icon) => {
      const x = m + slot * i + 18 * u + 8 * u;
      const ic = L.add(this.add.image(x, py, 'ic_' + icon).setScale((40 * u) / 96).setDepth(51));
      const t = L.add(txt(this, x + 26 * u, py, '', 28 * u, 0xffffff, { ox: 0 }).setDepth(51));
      return t;
    };
    this.livesT = mk(0, 'heart');
    this.goldT = mk(1, 'coin');
    this.waveT = mk(2, 'flag');

    // справа: скорость и пауза
    const bs = ph;
    L.add(
      button(this, {
        x: W - m - bs / 2,
        y: py,
        w: bs,
        h: bs,
        style: 'blue',
        icon: 'pause',
        iconSize: bs * 0.55,
        depth: 50,
        onClick: () => g.openPause(),
      })
    );
    this.speedBtn = L.add(
      button(this, {
        x: W - m - bs * 1.5 - 8 * u,
        y: py,
        w: bs,
        h: bs,
        style: g.speed === 2 ? 'orange' : 'blue',
        label: g.speed === 2 ? 'x2' : 'x1',
        size: bs * 0.4,
        depth: 50,
        onClick: () => {
          g.speed = g.speed === 2 ? 1 : 2;
          this.buildHud();
        },
      })
    );

    // заклинания (снизу слева)
    const ss = 84 * u;
    const sy = H - m - ss / 2;
    this.spellBtns = {};
    ['meteor', 'freeze'].forEach((id, i) => {
      const sp = g.spells[id];
      const x = m + ss / 2 + i * (ss + 10 * u);
      const b = L.add(
        button(this, {
          x,
          y: sy,
          w: ss,
          h: ss,
          style: sp.ready ? (id === 'meteor' ? 'orange' : 'blue') : 'grey',
          icon: sp.ready ? id : 'lock',
          iconSize: ss * 0.62,
          depth: 50,
          disabled: !sp.ready,
          onClick: () => g.useSpell(id),
        })
      );
      b.pos = [x, sy, ss];
      this.spellBtns[id] = b;
    });

    // кнопка волны (снизу справа)
    const ww = 200 * u;
    const wh = 84 * u;
    this.waveBtnPos = [W - m - ww / 2, H - m - wh / 2];
    this.waveBtn = L.add(
      button(this, {
        x: this.waveBtnPos[0],
        y: this.waveBtnPos[1],
        w: ww,
        h: wh,
        style: 'green',
        label: tr('start'),
        icon: 'swords',
        size: 30 * u,
        iconSize: wh * 0.6,
        depth: 50,
        onClick: () => {
          if (g.waveIdx < 0 || g.nextIn > 0) {
            g.startWave();
            this.hideTutorial('start');
          }
        },
      })
    );
    this.waveBtnState = null;

    // золото за рекламу
    this.goldAdBtn = L.add(
      button(this, {
        x: m + 85 * u,
        y: py + ph / 2 + 40 * u,
        w: 170 * u,
        h: 52 * u,
        style: 'gold',
        label: '+' + this.goldAdAmount(),
        icon: 'ad',
        size: 24 * u,
        color: 0xffffff,
        depth: 49,
        onClick: () =>
          this.withRewarded(() => {
            g.goldAdUsed = true;
            g.gold += this.goldAdAmount();
            audio.play('coin');
            this.floatAtScreen([m + 85 * u, py + ph / 2 + 40 * u], '+' + this.goldAdAmount(), C.gold);
          }),
      })
    );
    this.goldAdBtn.setVisible(false);
    this.cache = {};
  }

  goldAdAmount() {
    return 100 + this.g.lvl * 10;
  }

  nextBtnPos() {
    return this.waveBtnPos;
  }

  update() {
    const g = this.g;
    if (!g || !g.paths) return;
    const set = (k, o, v) => {
      if (this.cache[k] !== v) {
        this.cache[k] = v;
        o.setText(v);
      }
    };
    set('l', this.livesT, String(g.lives));
    set('g', this.goldT, String(g.gold));
    set('w', this.waveT, Math.max(0, g.waveIdx + 1) + '/' + g.waves.length);

    // кнопка волны
    const cgWave = [];
    let state = 'hidden';
    if (!g.ended) {
      if (g.waveIdx < 0) state = 'start';
      else if (g.nextIn > 0) state = 'next';
    }
    if (state !== this.waveBtnState) {
      this.waveBtnState = state;
      this.waveBtn.setVisible(state !== 'hidden');
      this.tweens.killTweensOf(this.waveBtn.c);
      this.waveBtn.c.setScale(1);
      if (state === 'start') {
        this.waveBtn.label.setText(tr('start'));
        this.waveBtn.icon.setTexture('ic_swords');
        this.tweens.add({ targets: this.waveBtn.c, scale: 1.07, yoyo: true, repeat: -1, duration: 500 });
      } else if (state === 'next') this.waveBtn.icon.setTexture('ic_flag');
    }
    if (state === 'next') {
      const v = '+' + Math.ceil(g.nextIn) * 2;
      if (this.waveBtn.label.text !== v) this.waveBtn.label.setText(v);
      // кольцо обратного отсчёта
      const [x, y] = this.waveBtnPos;
      const total = g.waveIdx === 0 ? 14 : 12;
      cgWave.push([x, y, g.nextIn / total]);
    }

    this.goldAdBtn.setVisible(!g.goldAdUsed && g.waveIdx >= 1 && !g.ended && !this.overlay);

    // перезарядка заклинаний
    const cg = this.cd;
    cg.clear();
    for (const [x, y, k] of cgWave) {
      const w = 200 * this.u;
      const h = 84 * this.u;
      cg.fillStyle(0xffe08a, 1);
      cg.fillRoundedRect(x - w / 2 + 10 * this.u, y + h / 2 - 12 * this.u, (w - 20 * this.u) * k, 6 * this.u, 3 * this.u);
    }
    for (const id of ['meteor', 'freeze']) {
      const sp = g.spells[id];
      const b = this.spellBtns[id];
      if (!sp.ready || !b) continue;
      const total = id === 'meteor' ? g.mods.meteorCd : SPELLS.freeze.cd;
      const [x, y, s] = b.pos;
      if (sp.cd > 0) {
        b.c.setAlpha(0.75);
        cg.fillStyle(0x2b1a0e, 0.6);
        cg.slice(x, y, s * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (sp.cd / total), false);
        cg.fillPath();
      } else b.c.setAlpha(1);
      if (g.targeting === id) {
        cg.lineStyle(5 * this.u, 0xffffff, 0.6 + 0.4 * Math.sin(this.time.now / 120));
        cg.strokeRoundedRect(x - s / 2 - 4, y - s / 2 - 4, s + 8, s + 8, s * 0.3);
      }
    }

    // доступность кнопок меню
    if (this.menuBtns) {
      for (const mb of this.menuBtns) if (mb.cost !== undefined) mb.btn.c.setAlpha(g.gold >= mb.cost ? 1 : 0.55);
    }
  }

  // ---------- Всплывающие тексты ----------
  floatAtScreen([x, y], text, color, small) {
    const u = this.u;
    const f = txt(this, x, y, text, (small ? 22 : 30) * u, color).setDepth(300);
    this.tweens.add({ targets: f, y: y - 50 * u, alpha: 0, duration: small ? 800 : 1100, ease: 'Cubic.Out', onComplete: () => f.destroy() });
  }

  toast(text) {
    const { width: W, height: H } = this.scale;
    if (this.toastT) this.toastT.destroy();
    const f = (this.toastT = txt(this, W / 2, H * 0.78, text, 26 * this.u, 0xffe08a, { wrap: W * 0.9 }).setDepth(400));
    this.tweens.add({ targets: f, alpha: 0, delay: 1300, duration: 500, onComplete: () => f.destroy() });
  }

  banner(text, color) {
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const c = this.add.container(W / 2, H * 0.3).setDepth(300);
    const t = txt(this, 0, 0, text, 44 * u, color, { title: false });
    const bg = this.add.image(0, 0, panelTex(this, 'woodDark', t.width + 60 * u, 76 * u, 30 * u));
    c.add([bg, t]);
    c.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, y: H * 0.26, delay: 1500, duration: 400, onComplete: () => c.destroy() });
  }

  hurtFlash() {
    this.flashRect.setFillStyle(0xff2020, 0.25);
    this.tweens.add({ targets: this.flashRect, fillAlpha: 0, duration: 300 });
  }

  flashScreen(color) {
    this.flashRect.setFillStyle(color, 0.45);
    this.tweens.add({ targets: this.flashRect, fillAlpha: 0, duration: 600 });
  }

  setTargeting(id) {
    if (this.targetHint) {
      this.targetHint.destroy();
      this.targetHint = null;
    }
    if (id === 'meteor') {
      const { width: W, height: H } = this.scale;
      this.targetHint = txt(this, W / 2, H * 0.18, tr('meteorHint'), 26 * this.u, 0xffe08a, { wrap: W * 0.9 }).setDepth(300);
    }
  }

  // ---------- Меню постройки / башни ----------
  closeMenu() {
    this.menuL.clear();
    this.menuFor = null;
    this.menuSel = null;
    this.menuBtns = null;
  }

  reopenMenu() {
    const f = this.menuFor;
    if (typeof f === 'string') {
      const [x, y] = f.split(',').map(Number);
      this.showBuildMenu(x, y, this.menuSel);
    } else if (f) this.showTowerMenu(f);
  }

  arcPositions(n, sx, sy, b) {
    const { width: W, height: H } = this.scale;
    const R = Math.max(b * 1.2, (b * 1.15 * n) / Math.PI);
    const spread = (b * 1.18) / R;
    const up = sy - R - b * 0.9 > 70 * this.u;
    const base = up ? -Math.PI / 2 : Math.PI / 2;
    const pos = [];
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread;
      let x = sx + Math.cos(a) * R;
      let y = sy + Math.sin(a) * R;
      x = Math.max(b * 0.6, Math.min(W - b * 0.6, x));
      y = Math.max(b * 0.6, Math.min(H - b * 0.8, y));
      pos.push([x, y]);
    }
    return pos;
  }

  showBuildMenu(cx, cy, sel = null) {
    this.closeMenu();
    const g = this.g;
    const u = this.u;
    this.menuFor = cx + ',' + cy;
    this.menuSel = sel;
    const [sx, sy] = g.toScreen(cx + 0.5, cy + 0.5);
    const b = Math.max(64 * u, Math.min(g.cs * 1.0, 96 * u));
    const L = this.menuL;
    // подсветка клетки
    const hl = L.add(this.add.image(sx, sy, 'plot').setDisplaySize(g.cs * 1.1, g.cs * 0.9).setDepth(70).setAlpha(0.9));
    this.tweens.add({ targets: hl, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });
    const types = TOWER_ORDER.filter((t) => TOWERS[t].unlock <= g.lvl);
    const pos = this.arcPositions(types.length, sx, sy, b);
    this.menuBtns = [];
    types.forEach((type, i) => {
      const [x, y] = pos[i];
      const cost = g.towerCost(type, 1);
      const selected = sel === type;
      const btn = L.add(
        button(this, {
          x,
          y,
          w: b,
          h: b,
          style: selected ? 'green' : 'wood',
          radius: b * 0.32,
          icon: selected ? 'check' : `tw_${type}_1`,
          iconSize: selected ? b * 0.6 : b * 0.82,
          depth: 80,
          onClick: () => {
            if (this.menuSel === type) {
              if (g.build(type, cx, cy)) {
                g.closeMenus();
                this.hideTutorial('build');
              }
            } else {
              this.showBuildMenu(cx, cy, type);
              g.showRange(type, 1, cx, cy);
            }
          },
        })
      );
      this.menuBtns.push({ btn, cost });
      // ценник
      const tagW = b * 0.86;
      const tagH = b * 0.3;
      L.add(this.add.image(x, y + b * 0.5, panelTex(this, 'woodDark', tagW, tagH, tagH * 0.45)).setDepth(82));
      L.add(this.add.image(x - tagW * 0.26, y + b * 0.5, 'ic_coin').setScale((tagH * 0.8) / 96).setDepth(83));
      L.add(txt(this, x + tagW * 0.12, y + b * 0.5, String(cost), tagH * 0.62, g.gold >= cost ? 0xffe08a : 0xff8a7a).setDepth(83));
    });
    if (sel) this.tooltip(sx, sy, tr('t_' + sel), tr('t_' + sel + '_d'), b, pos);
  }

  tooltip(sx, sy, title, desc, b, pos) {
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const L = this.menuL;
    const tw = Math.min(W * 0.8, 340 * u);
    const t1 = txt(this, 0, 0, title, 24 * u, 0xffe08a);
    const t2 = txt(this, 0, 0, desc, 18 * u, 0xffffff, { wrap: tw - 24 * u });
    const th = t1.height + t2.height + 18 * u;
    // ставим подсказку с противоположной стороны от кнопок
    const menuAbove = pos[0][1] < sy;
    let y = menuAbove ? sy + b * 0.9 + th / 2 : sy - b * 0.9 - th / 2;
    y = Math.max(th / 2 + 8, Math.min(H - th / 2 - 8, y));
    const x = Math.max(tw / 2 + 8, Math.min(W - tw / 2 - 8, sx));
    L.add(this.add.image(x, y, panelTex(this, 'woodDark', tw, th, 14 * u)).setDepth(90));
    t1.setPosition(x, y - th / 2 + t1.height / 2 + 6 * u).setDepth(91);
    t2.setPosition(x, y + th / 2 - t2.height / 2 - 6 * u).setDepth(91);
    L.add(t1);
    L.add(t2);
  }

  showTowerMenu(tw, sellArmed = false) {
    this.closeMenu();
    const g = this.g;
    const u = this.u;
    this.menuFor = tw;
    const [sx, sy] = g.toScreen(tw.cx + 0.5, tw.cy + 0.5);
    const b = Math.max(64 * u, Math.min(g.cs * 1.0, 96 * u));
    const L = this.menuL;
    this.menuBtns = [];
    const pos = this.arcPositions(2, sx, sy, b);
    // улучшение
    const maxed = tw.lvl >= 4;
    const upCost = maxed ? 0 : g.towerCost(tw.type, tw.lvl + 1);
    const up = L.add(
      button(this, {
        x: pos[0][0],
        y: pos[0][1],
        w: b,
        h: b,
        style: maxed ? 'grey' : 'green',
        radius: b * 0.32,
        icon: maxed ? 'star' : 'up',
        iconSize: b * 0.6,
        depth: 80,
        disabled: maxed,
        onClick: () => {
          if (g.upgrade(tw)) this.showTowerMenu(tw);
        },
      })
    );
    if (!maxed) this.menuBtns.push({ btn: up, cost: upCost });
    const refund = Math.floor(tw.spent * 0.7);
    L.add(
      button(this, {
        x: pos[1][0],
        y: pos[1][1],
        w: b,
        h: b,
        style: sellArmed ? 'red' : 'wood',
        radius: b * 0.32,
        icon: sellArmed ? 'check' : 'sell',
        iconSize: b * 0.6,
        depth: 80,
        onClick: () => {
          if (sellArmed) {
            g.sell(tw);
            g.closeMenus();
          } else this.showTowerMenu(tw, true);
        },
      })
    );
    const tag = (x, y, val, color) => {
      const tagW = b * 0.86;
      const tagH = b * 0.3;
      L.add(this.add.image(x, y + b * 0.5, panelTex(this, 'woodDark', tagW, tagH, tagH * 0.45)).setDepth(82));
      if (val !== null) {
        L.add(this.add.image(x - tagW * 0.26, y + b * 0.5, 'ic_coin').setScale((tagH * 0.8) / 96).setDepth(83));
        L.add(txt(this, x + tagW * 0.12, y + b * 0.5, String(val), tagH * 0.62, color).setDepth(83));
      } else L.add(txt(this, x, y + b * 0.5, tr('maxed'), tagH * 0.6, 0xffe08a).setDepth(83));
    };
    tag(pos[0][0], pos[0][1], maxed ? null : upCost, g.gold >= upCost ? 0xffe08a : 0xff8a7a);
    tag(pos[1][0], pos[1][1], refund, 0xffffff);
    // описание башни
    const T = TOWERS[tw.type];
    const L1 = tw.lvl - 1;
    const stars = '★'.repeat(tw.lvl) + '☆'.repeat(4 - tw.lvl);
    let desc = `${tr('dmg')}: ${Math.round(T.dmg[L1] * g.mods.dmg[tw.type])}`;
    if (!maxed) desc += ` → ${Math.round(T.dmg[L1 + 1] * g.mods.dmg[tw.type])}`;
    desc += `\n${tr('range')}: ${(T.range[L1] * g.mods.range).toFixed(1)}`;
    if (!maxed) desc += ` → ${(T.range[L1 + 1] * g.mods.range).toFixed(1)}`;
    this.tooltip(sx, sy, `${tr('t_' + tw.type)}  ${stars}`, desc, b, pos);
  }

  // ---------- Окна ----------
  dim(alpha = 0.6) {
    const { width: W, height: H } = this.scale;
    return this.ovL.add(this.add.rectangle(0, 0, W, H, 0x1a0f05, alpha).setOrigin(0).setDepth(200).setInteractive());
  }

  closeOverlay() {
    this.ovL.clear();
    this.overlay = null;
  }

  withRewarded(onReward) {
    audio.suspend('ad');
    this.g.setPause('ad', true);
    sdk.showRewarded(null, (ok) => {
      audio.resume('ad');
      this.g.setPause('ad', false);
      if (ok) onReward();
      else this.toast(tr('adFail'));
    });
  }

  dialog(w, h, title, titleColor = C.gold) {
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const pw = Math.min(W * 0.92, w * u);
    const ph = Math.min(H * 0.92, h * u);
    const L = this.ovL;
    L.add(panel(this, W / 2, H / 2, pw, ph, 'parch', 26 * u).setDepth(201));
    const bw = Math.min(pw * 0.9, 420 * u);
    L.add(panel(this, W / 2, H / 2 - ph / 2, bw, 72 * u, 'wood', 24 * u).setDepth(202));
    L.add(txt(this, W / 2, H / 2 - ph / 2, title, 38 * u, titleColor, { title: true }).setDepth(203));
    return { pw, ph, top: H / 2 - ph / 2, bottom: H / 2 + ph / 2, cx: W / 2, cy: H / 2 };
  }

  showPause() {
    this.g.closeMenus();
    this.overlay = () => this.buildPause();
    this.overlay();
  }

  buildPause() {
    this.ovL.clear();
    const u = this.u;
    const g = this.g;
    const L = this.ovL;
    this.dim();
    const d = this.dialog(440, 470, tr('pause'));
    const bw = d.pw * 0.78;
    const bh = 62 * u;
    let y = d.top + 90 * u;
    const add = (o) => {
      L.add(button(this, Object.assign({ x: d.cx, y, w: bw, h: bh, depth: 210, size: 26 * u }, o)));
      y += bh + 14 * u;
    };
    add({
      label: tr('resume'),
      style: 'green',
      onClick: () => {
        this.closeOverlay();
        g.setPause('menu', false);
      },
    });
    add({
      label: tr('music') + ': ' + volPct('music'),
      icon: 'music',
      style: 'blue',
      size: 22 * u,
      onClick: () => openSound(() => this.buildPause()),
    });
    add({
      label: tr('sound') + ': ' + volPct('sfx'),
      icon: 'sound',
      style: 'blue',
      size: 22 * u,
      onClick: () => openSound(() => this.buildPause()),
    });
    add({ label: tr('restart'), icon: 'retry', style: 'orange', size: 24 * u, onClick: () => this.leave(() => g.scene.restart({ level: g.lvl })) });
    add({ label: tr('toMap'), icon: 'map', style: 'red', size: 24 * u, onClick: () => this.leave(() => this.toMap()) });
  }

  toMap() {
    this.g.scene.start('Levels');
    this.scene.stop();
  }

  leave(fn) {
    this.closeOverlay();
    audio.suspend('ad');
    sdk.showInterstitial(() => {
      audio.resume('ad');
      fn();
    });
  }

  showContinue() {
    this.g.closeMenus();
    this.overlay = () => this.buildContinue();
    this.overlay();
  }

  buildContinue() {
    this.ovL.clear();
    const u = this.u;
    const g = this.g;
    const L = this.ovL;
    this.dim(0.7);
    const d = this.dialog(460, 360, tr('continueTitle'), 0xff8a7a);
    L.add(this.add.image(d.cx, d.top + 110 * u, 'ic_heart').setScale((80 * u) / 96).setDepth(205));
    L.add(txt(this, d.cx + 50 * u, d.top + 110 * u, '+10', 36 * u, 0xffffff, { ox: 0 }).setDepth(205));
    L.add(txt(this, d.cx, d.top + 175 * u, tr('continueDesc'), 22 * u, 0x5a3518, { stroke: false, wrap: d.pw * 0.85 }).setDepth(205));
    L.add(
      button(this, {
        x: d.cx,
        y: d.bottom - 110 * u,
        w: d.pw * 0.8,
        h: 70 * u,
        style: 'green',
        label: tr('continueBtn'),
        icon: 'ad',
        size: 28 * u,
        depth: 210,
        onClick: () =>
          this.withRewarded(() => {
            this.closeOverlay();
            g.doContinue();
          }),
      })
    );
    L.add(
      button(this, {
        x: d.cx,
        y: d.bottom - 40 * u,
        w: d.pw * 0.5,
        h: 50 * u,
        style: 'grey',
        label: tr('noThanks'),
        size: 20 * u,
        depth: 210,
        onClick: () => {
          this.closeOverlay();
          g.finalDefeat();
        },
      })
    );
  }

  showDefeat() {
    this.overlay = () => this.buildDefeat();
    this.overlay();
  }

  buildDefeat() {
    this.ovL.clear();
    const u = this.u;
    const g = this.g;
    const L = this.ovL;
    this.dim(0.7);
    const d = this.dialog(460, 340, tr('defeat'), 0xff8a7a);
    L.add(this.add.image(d.cx, d.top + 105 * u, 'ic_skull').setScale((80 * u) / 96).setDepth(205));
    L.add(txt(this, d.cx, d.top + 170 * u, tr('defeatDesc'), 22 * u, 0x5a3518, { stroke: false, wrap: d.pw * 0.85 }).setDepth(205));
    const bw = d.pw * 0.4;
    L.add(button(this, { x: d.cx - bw * 0.56, y: d.bottom - 55 * u, w: bw, h: 64 * u, style: 'orange', icon: 'retry', label: tr('retry'), size: 22 * u, depth: 210, onClick: () => this.leave(() => g.scene.restart({ level: g.lvl })) }));
    L.add(button(this, { x: d.cx + bw * 0.56, y: d.bottom - 55 * u, w: bw, h: 64 * u, style: 'blue', icon: 'map', label: tr('map'), size: 22 * u, depth: 210, onClick: () => this.leave(() => this.toMap()) }));
  }

  showVictory(res) {
    this.g.closeMenus();
    this.overlay = () => this.buildVictory(res);
    this.overlay();
    // анимация звёзд
    this.starAnim = true;
  }

  buildVictory(res) {
    this.ovL.clear();
    const u = this.u;
    const g = this.g;
    const L = this.ovL;
    this.dim(0.6);
    const d = this.dialog(480, 470, tr('victory'), 0xffe08a);
    const sy = d.top + 125 * u;
    for (let i = 0; i < 3; i++) {
      const x = d.cx + (i - 1) * 100 * u;
      const size = (i === 1 ? 100 : 82) * u;
      const yy = sy - (i === 1 ? 14 * u : 0);
      L.add(this.add.image(x, yy, 'ic_starEmpty').setScale(size / 96).setDepth(205));
      if (i < res.stars) {
        const s = L.add(this.add.image(x, yy, 'ic_star').setScale(size / 96).setDepth(206));
        if (this.starAnim) {
          s.setScale(0);
          this.tweens.add({ targets: s, scale: size / 96, duration: 380, delay: 300 + i * 350, ease: 'Back.Out', onStart: () => audio.play('star') });
        }
      }
    }
    this.starAnim = false;
    L.add(this.add.image(d.cx - 50 * u, d.top + 220 * u, 'ic_gem').setScale((56 * u) / 96).setDepth(205));
    L.add(txt(this, d.cx - 16 * u, d.top + 220 * u, '+' + res.gems, 40 * u, 0x7fe0ff, { ox: 0 }).setDepth(205));
    let y = d.top + 295 * u;
    if (!res.doubled) {
      L.add(
        button(this, {
          x: d.cx,
          y,
          w: d.pw * 0.7,
          h: 62 * u,
          style: 'gold',
          label: tr('double'),
          icon: 'ad',
          size: 24 * u,
          depth: 210,
          onClick: () =>
            this.withRewarded(() => {
              g.doubleReward();
              audio.play('coin');
              this.buildVictory(res);
            }),
        })
      );
    }
    y = d.bottom - 55 * u;
    const hasNext = g.lvl < LEVEL_COUNT;
    const bw = d.pw * (hasNext ? 0.28 : 0.4);
    const items = [
      { icon: 'map', style: 'blue', fn: () => this.leave(() => this.toMap()) },
      { icon: 'retry', style: 'orange', fn: () => this.leave(() => g.scene.restart({ level: g.lvl })) },
    ];
    if (hasNext) items.push({ icon: 'play', label: tr('next'), style: 'green', fn: () => this.leave(() => g.scene.restart({ level: g.lvl + 1 })) });
    const total = items.reduce((a, it) => a + (it.label ? bw * 1.5 : bw * 0.75), 0) + (items.length - 1) * 12 * u;
    let x = d.cx - total / 2;
    for (const it of items) {
      const w = it.label ? bw * 1.5 : bw * 0.75;
      L.add(button(this, { x: x + w / 2, y, w, h: 64 * u, style: it.style, icon: it.icon, label: it.label, size: 24 * u, depth: 210, onClick: it.fn }));
      x += w + 12 * u;
    }
  }

  // карточка нового врага/башни
  showIntro(list) {
    if (!list.length) return;
    this.g.setPause('modal', true);
    this.g.closeMenus();
    const item = list[0];
    this.overlay = () => this.buildIntro(item, list.slice(1));
    this.overlay();
  }

  buildIntro(item, rest) {
    this.ovL.clear();
    const u = this.u;
    const L = this.ovL;
    const dimR = this.dim(0.55);
    const isEnemy = item.kind === 'enemy';
    const title = isEnemy ? tr('newEnemy') : item.kind === 'spell' ? tr('newSpell') : tr('newTower');
    const d = this.dialog(440, 400, title, isEnemy ? 0xff8a7a : 0x9fe870);
    const key = isEnemy ? `en_${item.id}_0` : item.kind === 'spell' ? 'ic_' + item.id : `tw_${item.id}_1`;
    const im = L.add(this.add.image(d.cx, d.top + 150 * u, key).setDepth(205));
    im.setScale((150 * u) / Math.max(im.width, im.height));
    this.tweens.add({ targets: im, y: im.y - 8 * u, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' });
    const name = isEnemy ? tr('e_' + item.id) : item.kind === 'spell' ? tr('sp_' + item.id) : tr('t_' + item.id);
    const desc = isEnemy ? tr('e_' + item.id + '_d') : item.kind === 'spell' ? tr('sp_' + item.id + '_d') : tr('t_' + item.id + '_d');
    L.add(txt(this, d.cx, d.top + 255 * u, name, 30 * u, 0xffe08a).setDepth(205));
    L.add(txt(this, d.cx, d.top + 300 * u, desc, 21 * u, 0x5a3518, { stroke: false, wrap: d.pw * 0.85 }).setDepth(205));
    if (isEnemy) L.add(txt(this, d.cx, d.bottom - 62 * u, tr('leakDmg') + ': ' + ENEMIES[item.id].lives, 20 * u, 0xd0402a, { stroke: false }).setDepth(205));
    L.add(txt(this, d.cx, d.bottom - 28 * u, tr('tapToClose'), 17 * u, 0x8a6a4a, { stroke: false }).setDepth(205));
    let armed = false;
    this.time.delayedCall(400, () => (armed = true));
    dimR.on('pointerup', () => {
      if (!armed) return;
      this.closeOverlay();
      if (rest.length) this.showIntro(rest);
      else {
        this.g.setPause('modal', false);
        if (this.tutorialFn) this.tutorialFn();
      }
    });
  }

  // ---------- Обучение ----------
  levelStartIntro() {
    const g = this.g;
    const list = [];
    for (const t of TOWER_ORDER) if (TOWERS[t].unlock === g.lvl && g.lvl > 1 && !save.data.seen['t_' + t]) list.push({ kind: 'tower', id: t });
    for (const sp of ['meteor', 'freeze']) if (SPELLS[sp].unlock === g.lvl && !save.data.seen['s_' + sp]) list.push({ kind: 'spell', id: sp });
    if (g.debug && g.debug.bot) return;
    list.forEach((it) => (save.data.seen[(it.kind === 'tower' ? 't_' : 's_') + it.id] = true));
    if (g.lvl === 1 && !save.data.tut.build) this.tutorial('build');
    else if (g.lvl === 2 && !save.data.tut.upgrade) this.tutorial('upgrade');
    if (list.length) {
      save.write(false);
      this.showIntro(list);
    }
  }

  tutorial(step) {
    this.tutStep = step;
    this.tutorialFn = () => this.buildTutorial();
    this.buildTutorial();
  }

  buildTutorial() {
    this.tipL.clear();
    const g = this.g;
    const u = this.u;
    const { width: W, height: H } = this.scale;
    const L = this.tipL;
    if (!this.tutStep || this.overlay) return;
    let text = '';
    let target = null;
    if (this.tutStep === 'build') {
      text = tr('tut1');
      // лучшая клетка у начала дороги
      let best = null;
      let bs = -1;
      for (const k of g.tiles.build) {
        const [x, y] = k.split(',').map(Number);
        let s = 0;
        for (const pk of g.tiles.path) {
          const [px, py] = pk.split(',').map(Number);
          if (Math.hypot(px - x, py - y) <= 2.6) s++;
        }
        s -= x * 0.05;
        if (s > bs) {
          bs = s;
          best = [x, y];
        }
      }
      target = g.toScreen(best[0] + 0.5, best[1] + 0.5);
    } else if (this.tutStep === 'start') {
      text = tr('tut2');
      target = [this.waveBtnPos[0], this.waveBtnPos[1] - 50 * u];
    } else if (this.tutStep === 'upgrade') {
      text = tr('tut3');
    }
    const ty = target && target[1] < H * 0.45 ? H * 0.62 : H * 0.2;
    L.add(panel(this, W / 2, ty, Math.min(W * 0.92, 560 * u), 76 * u, 'woodDark', 22 * u).setDepth(150));
    L.add(txt(this, W / 2, ty, text, 22 * u, 0xffe08a, { wrap: Math.min(W * 0.88, 530 * u) }).setDepth(151));
    if (target) {
      if (this.tutStep === 'build') L.add(this.add.image(target[0], target[1], 'plot').setDisplaySize(g.cs * 1.1, g.cs * 0.9).setDepth(148));
      const ring = L.add(this.add.image(target[0], target[1], 'ring').setDisplaySize(g.cs * 1.3, g.cs * 1.3).setDepth(149).setTint(0xfff3a0));
      this.tweens.add({ targets: ring, scale: ring.scale * 1.25, alpha: 0.4, yoyo: true, repeat: -1, duration: 500 });
      const arrow = L.add(txt(this, target[0], target[1] - g.cs * 0.95, '▼', 56 * u, 0xffe08a).setDepth(152));
      this.tweens.add({ targets: arrow, y: arrow.y - 14 * u, yoyo: true, repeat: -1, duration: 400 });
    }
    if (this.tutStep === 'upgrade') this.time.delayedCall(6000, () => this.hideTutorial('upgrade'));
  }

  hideTutorial(step) {
    if (this.tutStep !== step) return;
    this.tipL.clear();
    this.tutStep = null;
    this.tutorialFn = null;
    if (step === 'build' && this.g.waveIdx < 0) this.tutorial('start');
  }
}
