// Интерфейс поверх игры: HUD, джойстик, окна (уровень, пауза, смерть)
import { COLORS, WEAPONS, PASSIVES, OVERCHARGE, EVOLVE, ACHIEVEMENTS, RUSH_BOSSES, SHOP, shopCost, CAMPAIGN, hex } from '../data.js';
import { uiScale, txt, button, fmtTime, Layer, panelGfx, drawPanel } from '../ui.js';
import { t as tr } from '../i18n.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { openSound, volPct } from '../sound-ui.js';

const Phaser = window.Phaser;

// какие характеристики оружия показывать на карточке «было → станет»
const STAT_KEYS = ['dmg', 'count', 'beams', 'pulses', 'strikes', 'chains', 'pierce', 'cd', 'radius', 'width', 'dist', 'size', 'rot'];
const pct = (v) => '+' + Math.round(v) + '%';
// итог пассивки на уровне l
const PASSIVE_TOTAL = {
  vitality: (l) => '+' + 20 * l,
  regen: (l) => '+' + (0.5 * l).toFixed(1),
  swift: (l) => pct(8 * l),
  magnet: (l) => pct(35 * l),
  power: (l) => pct(10 * l),
  haste: (l) => '-' + Math.round((1 - Math.pow(0.93, l)) * 100) + '%',
  area: (l) => pct(12 * l),
  armor: (l) => '-' + 6 * l + '%',
  wisdom: (l) => pct(10 * l),
  multishot: (l) => '+' + l,
  crit: (l) => 6 * l + '%',
  pierce: (l) => '+' + l,
};

// короткая подпись цели кампании для верхней строки: «120/400 врагов»
export function goalShort(type, n, v) {
  if (type === 'hp') return tr('gs_hp').replace('{n}', n);
  return tr('gs_' + type).replace('{v}', Math.min(v, n)).replace('{n}', n);
}
// полная подпись цели для меню и итога: «Уничтожь 400 врагов»
export function goalLong(type, n) {
  return tr('gl_' + type + (n === 1 && (type === 'bosses' || type === 'evo' || type === 'chests') ? '1' : '')).replace('{n}', n);
}

export class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  init(data) {
    this.g = data.game;
    this.ready = false;
  }

  create() {
    this.joy = { active: false, x: 0, y: 0, id: -1, ox: 0, oy: 0 };
    this.hudL = new Layer(this);
    this.ovL = new Layer(this);
    this.overlay = null;
    this.adBusy = false;
    this.warnSlots = [];
    this.warnTexts = [];
    this.toasts = [];
    this.chestClose = null;
    this.chestRes = null;
    this.tcache = {};
    this.makeVignette();

    this.vig = this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(0);
    this.vigRed = this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(0).setTint(0xff0030).setAlpha(0);
    this.flash = this.add.rectangle(0, 0, 10, 10, 0xff1040, 0).setOrigin(0).setDepth(1);
    this.bars = this.add.graphics().setDepth(10);
    this.joyBase = this.add.image(0, 0, 'joyBase').setDepth(50).setVisible(false).setAlpha(0.8);
    this.joyKnob = this.add.image(0, 0, 'joyKnob').setDepth(51).setVisible(false);

    this.buildHud();

    this.tut = save.data.tutorialDone ? -1 : 0;
    this.tutMove = 0;
    this.achQ = 0;
    if (this.tut === 0) this.showTut();

    this.input.on('pointerdown', (p, over) => {
      audio.unlock();
      if (this.overlay || (over && over.length)) return;
      if (this.joy.active) return;
      const j = this.joy;
      j.active = true;
      j.id = p.id;
      j.ox = p.x;
      j.oy = p.y;
      j.x = 0;
      j.y = 0;
    });
    this.input.on('pointermove', (p) => {
      const j = this.joy;
      if (!j.active || p.id !== j.id) return;
      const R = this.joyR;
      let dx = p.x - j.ox;
      let dy = p.y - j.oy;
      let len = Math.hypot(dx, dy);
      if (len > R) {
        j.ox = p.x - (dx / len) * R;
        j.oy = p.y - (dy / len) * R;
        dx = p.x - j.ox;
        dy = p.y - j.oy;
        len = R;
      }
      const m = len / R;
      if (m < 0.12) {
        j.x = 0;
        j.y = 0;
      } else {
        j.x = (dx / len) * Math.min(1, m * 1.25);
        j.y = (dy / len) * Math.min(1, m * 1.25);
      }
    });
    const up = (p) => {
      if (p.id === this.joy.id) this.resetJoy();
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.input.on('gameout', () => this.resetJoy());

    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    this.ready = true;
  }

  resetJoy() {
    Object.assign(this.joy, { active: false, x: 0, y: 0, id: -1 });
  }

  makeVignette() {
    if (this.textures.exists('vignette')) return;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 70, 128, 128, 182);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    this.textures.addCanvas('vignette', c);
  }

  onResize() {
    this.buildHud();
    if (this.overlay) this.overlay();
  }

  // ---------- HUD ----------
  buildHud() {
    this.hudL.clear();
    const { width: W, height: H } = this.scale;
    const u = (this.u = uiScale(this));
    this.joyR = 64 * u;
    this.joyBase.setDisplaySize(this.joyR * 2.4, this.joyR * 2.4);
    this.joyKnob.setDisplaySize(this.joyR * 1.2, this.joyR * 1.2);
    this.vig.setDisplaySize(W, H);
    this.vigRed.setDisplaySize(W, H);
    this.flash.setSize(W, H);

    const m = 12 * u;
    const pb = 58 * u;
    this.lay = { m, pb, barX: m, barY: m, barW: W - 3 * m - pb, barH: 16 * u };
    const L = this.lay;
    const y2 = L.barY + L.barH + 26 * u;

    this.lvlText = this.hudL.add(txt(this, L.barX, y2, '', 24 * u, COLORS.cyan, { ox: 0 }));
    this.timeText = this.hudL.add(txt(this, W / 2, y2 + 4 * u, '0:00', 38 * u, 0xffffff, { glowColor: COLORS.pink }));
    this.killIcon = this.hudL.add(this.add.image(L.barX + L.barW - 12 * u, y2, 'ic_skull').setDisplaySize(34 * u, 34 * u));
    this.killText = this.hudL.add(txt(this, L.barX + L.barW - 34 * u, y2, '0', 24 * u, COLORS.pink, { ox: 1 }));
    // фаза забега: цель 30:00 → овердрайв → критическая угроза → бесконечность
    this.phaseText = this.hudL.add(txt(this, W / 2, y2 + 34 * u, '', 15 * u, COLORS.cyan));
    // в портретной ориентации полоса босса ниже, чтобы не наезжать на иконки оружия
    const by = W < H * 1.1 ? y2 + 140 * u : y2 + 66 * u;
    this.bossLabel = this.hudL.add(txt(this, W / 2, by, tr('boss'), 18 * u, COLORS.red));
    this.bossLabel.setVisible(false);
    this.lay.bossY = by + 18 * u;
    // крупная полоса здоровья под уровнем
    this.lay.hpX = L.barX;
    this.lay.hpY = y2 + 22 * u;
    this.lay.hpW = Math.min(190 * u, W * 0.3);
    this.lay.hpH = (this.g.simple ? 20 : 14) * u;
    // на узком экране строка цели не помещается по центру и наезжала на полосу здоровья:
    // ставим её справа от полосы, с переносом
    if (W < H * 1.1) {
      const left = this.lay.hpX + this.lay.hpW + 12 * u;
      this.phaseText.setOrigin(1, 0).setPosition(W - m, y2 + 24 * u).setAlign('right').setWordWrapWidth(W - m - left, true);
    }
    this.lay.slotY = y2 + 60 * u;
    // праздничные жетоны за этот забег
    if (this.g.evA) {
      // рядом с уровнем, между ним и таймером
      const tx = L.barX + Math.min(110 * u, W * 0.26);
      this.tokIcon = this.hudL.add(this.add.image(tx, y2, this.g.evA.ev.token).setDisplaySize(28 * u, 28 * u));
      this.tokText = this.hudL.add(txt(this, tx + 16 * u, y2, '0', 22 * u, this.g.evA.ev.color, { ox: 0 }));
    } else this.tokText = null;
    this.slotSig = '';
    this.slotL = this.slotL || new Layer(this);

    this.hudL.add(
      button(this, {
        x: W - m - pb / 2,
        y: m + pb / 2,
        w: pb,
        h: pb,
        icon: 'pause',
        iconSize: pb * 0.7,
        color: COLORS.cyan,
        onClick: () => this.g.openPause(),
      })
    );
    this.tcache = {};
    this.hudVis = undefined;
    this.buildSlots();
  }

  // иконки оружия и пассивок на экране боя
  buildSlots() {
    const g = this.g;
    this.slotL.clear();
    const u = this.u;
    const L = this.lay;
    const ws = Object.entries(g.weapons);
    const ps = Object.entries(g.passives);
    this.slotSig = ws.map(([k, v]) => k + v + (g.evo[k] ? 'e' : '')).join() + '|' + ps.map(([k, v]) => k + v).join();
    const s1 = 34 * u;
    const s2 = 24 * u;
    ws.forEach(([id, l], i) => {
      const x = L.barX + s1 / 2 + i * (s1 + 6 * u);
      const y = L.slotY;
      const ev = g.evo[id];
      this.slotL.add(this.add.rectangle(x, y, s1 + 4 * u, s1 + 4 * u, 0x05010f, 0.6).setStrokeStyle(2 * u, ev ? COLORS.yellow : WEAPONS[id].color, ev ? 1 : 0.6).setDepth(9));
      this.slotL.add(this.add.image(x, y, 'ic_' + (ev ? EVOLVE[id].id : id)).setDisplaySize(s1, s1).setDepth(10));
      if (!ev && !g.simple) this.slotL.add(txt(this, x + s1 * 0.42, y + s1 * 0.42, String(l), 13 * u, 0xffffff, { glowColor: WEAPONS[id].color }).setDepth(11));
    });
    // в простом интерфейсе пассивки под оружием не показываем
    if (!g.simple) ps.forEach(([id, l], i) => {
      const x = L.barX + s2 / 2 + i * (s2 + 4 * u);
      const y = L.slotY + s1 / 2 + s2 / 2 + 10 * u;
      this.slotL.add(this.add.image(x, y, 'ic_' + id).setDisplaySize(s2, s2).setDepth(10).setAlpha(0.9));
    });
    this.slotL.items.forEach((o) => o.setVisible(!this.overlay));
  }

  update() {
    const g = this.g;
    if (!g || !g.p) return;
    const { width: W, height: H } = this.scale;
    const L = this.lay;
    const u = this.u;
    const b = this.bars;
    b.clear();
    const vis = !this.overlay;
    if (vis !== this.hudVis) {
      this.hudVis = vis;
      this.hudL.items.forEach((o) => (o.c ? (o.c.setVisible(vis), o.zone.setVisible(vis)) : o.setVisible(vis)));
      this.slotL.items.forEach((o) => o.setVisible(vis));
      if (this.tutL) this.tutL.items.forEach((o) => o.c ? (o.c.setVisible(vis), o.zone.setVisible(vis)) : o.setVisible(vis));
      this.bars.setVisible(vis);
      if (!vis) this.bossLabel.setVisible(false);
    }
    // полоса опыта
    const ratio = Math.min(1, g.xp / g.need);
    b.fillStyle(0x000000, 0.55).fillRoundedRect(L.barX, L.barY, L.barW, L.barH, L.barH / 2);
    if (ratio > 0.01) {
      b.fillStyle(COLORS.cyan, 1).fillRoundedRect(L.barX, L.barY, Math.max(L.barH, L.barW * ratio), L.barH, L.barH / 2);
      b.fillStyle(0xffffff, 0.35).fillRoundedRect(L.barX + 3, L.barY + 2, Math.max(L.barH, L.barW * ratio) - 6, L.barH * 0.3, L.barH * 0.15);
    }
    b.lineStyle(2, COLORS.cyan, 0.8).strokeRoundedRect(L.barX, L.barY, L.barW, L.barH, L.barH / 2);

    // здоровье
    const hr = Math.max(0, Math.min(1, g.p.hp / g.st.maxHp));
    b.fillStyle(0x000000, 0.55).fillRoundedRect(L.hpX, L.hpY, L.hpW, L.hpH, L.hpH / 2);
    if (hr > 0.02) b.fillStyle(hr > 0.3 ? COLORS.green : COLORS.red, 1).fillRoundedRect(L.hpX, L.hpY, Math.max(L.hpH, L.hpW * hr), L.hpH, L.hpH / 2);
    b.lineStyle(2, hr > 0.3 ? COLORS.green : COLORS.red, 0.8).strokeRoundedRect(L.hpX, L.hpY, L.hpW, L.hpH, L.hpH / 2);
    const sig = Object.entries(g.weapons).map(([k, v]) => k + v + (g.evo[k] ? 'e' : '')).join() + '|' + Object.entries(g.passives).map(([k, v]) => k + v).join();
    if (sig !== this.slotSig) this.buildSlots();

    // полоса босса
    const boss = g.boss && g.boss.alive ? g.boss : null;
    this.bossLabel.setVisible(!!boss && vis);
    if (boss && this.tcache.bossType !== boss.type) {
      this.tcache.bossType = boss.type;
      this.bossLabel.setText(tr('bossName_' + boss.type));
    }
    if (boss) {
      const bw = Math.min(W * 0.7, 520 * u);
      const bh = 12 * u;
      const r = Math.max(0, boss.hp / boss.maxHp);
      b.fillStyle(0x000000, 0.6).fillRect(W / 2 - bw / 2, L.bossY, bw, bh);
      b.fillStyle(COLORS.red, 1).fillRect(W / 2 - bw / 2, L.bossY, bw * r, bh);
      b.lineStyle(2, COLORS.red, 1).strokeRect(W / 2 - bw / 2, L.bossY, bw, bh);
      // стрелка к боссу за краем экрана
      const cam = g.cameras.main;
      const sx = (boss.x - cam.worldView.x) * cam.zoom;
      const sy = (boss.y - cam.worldView.y) * cam.zoom;
      if (sx < 0 || sy < 0 || sx > W || sy > H) {
        const a = Math.atan2(sy - H / 2, sx - W / 2);
        const mg = 40 * u;
        const k = Math.min((W / 2 - mg) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - mg) / Math.abs(Math.sin(a) || 1e-6));
        const ax = W / 2 + Math.cos(a) * k;
        const ay = H / 2 + Math.sin(a) * k;
        const s = 18 * u * (1 + 0.15 * Math.sin(g.t * 10));
        b.fillStyle(COLORS.red, 0.9);
        b.fillTriangle(
          ax + Math.cos(a) * s,
          ay + Math.sin(a) * s,
          ax + Math.cos(a + 2.5) * s,
          ay + Math.sin(a + 2.5) * s,
          ax + Math.cos(a - 2.5) * s,
          ay + Math.sin(a - 2.5) * s
        );
      }
    }

    const set = (key, obj, val) => {
      if (this.tcache[key] !== val) {
        this.tcache[key] = val;
        obj.setText(val);
      }
    };
    set('lvl', this.lvlText, tr('lvl') + ' ' + g.level);
    set('time', this.timeText, fmtTime(g.t));
    set('kills', this.killText, String(g.kills));
    if (this.tokText) set('tok', this.tokText, String(g.evTok));
    const ph = g.threat();
    let phTxt;
    if (g.mode.rush) phTxt = tr('rushTag') + ' · ' + (g.endless ? tr('phase3Hud') + ' · ' + tr('bossesHud') + ' ' + g.rushKills : tr('bossesHud') + ' ' + g.rushKills + '/' + RUSH_BOSSES);
    else if (g.camp && !g.finale && !g.won) {
      // кампания: номер уровня, сколько продержаться и ход целей на звёзды
      const gl = g.camp.goals.map(([type, n]) => {
        const v = g.goalValue(type);
        return (type === 'hp' ? '' : v >= n ? '✓' : '') + goalShort(type, n, v);
      });
      phTxt = tr('campTag').replace('{n}', g.mode.level + 1) + ' · ' + fmtTime(g.win) + '  ★ ' + gl.join('  ★ ');
    } else {
      const head = g.camp ? tr('campTag').replace('{n}', g.mode.level + 1) + ' · ' : g.mode.event ? tr('ev_' + g.evA.ev.id) + ' · ' : g.mode.daily ? tr('dailyTag') + ' · ' : g.mode.threat ? tr('threatTag') + ' ' + g.mode.threat + ' · ' : g.modeId === 'quick' ? tr('quickTag') + ' · ' : g.modeId === 'calm' ? tr('calmTag') + ' · ' : '';
      const body = g.finale ? tr('finalWarn') : ph === 0 ? tr('goalHud') + ' ' + fmtTime(g.win) : tr('phase' + ph + 'Hud');
      phTxt = head + body + (g.overcharge ? '  ⚡' + g.overcharge : '');
    }
    if (this.tcache.ph !== phTxt) {
      this.tcache.ph = phTxt;
      this.phaseText.setText(phTxt);
      const col = [COLORS.cyan, COLORS.pink, COLORS.red, COLORS.purple][ph];
      this.phaseText.setColor(hex(col)).setShadow(0, 0, hex(col), 6, false, true);
    }

    // низкое здоровье
    const hpR = g.p.hp / g.st.maxHp;
    this.vigRed.setAlpha(hpR < 0.3 && !g.ended ? (0.3 - hpR) * 2.5 * (0.6 + 0.4 * Math.sin(g.t * 8)) : 0);

    // джойстик
    const j = this.joy;
    this.joyBase.setVisible(j.active && !this.overlay);
    this.joyKnob.setVisible(j.active && !this.overlay);
    if (j.active) {
      this.joyBase.setPosition(j.ox, j.oy);
      this.joyKnob.setPosition(j.ox + j.x * this.joyR * 0.8, j.oy + j.y * this.joyR * 0.8);
    }
  }

  hurtFlash() {
    this.flash.setFillStyle(0xff1040, 0.28);
    this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 260 });
  }

  warn(text, color) {
    const { width: W, height: H } = this.scale;
    // несколько предупреждений одновременно (фаза + событие) встают друг под другом
    const slot = (this.warnSlots = this.warnSlots || []).indexOf(false) >= 0 ? this.warnSlots.indexOf(false) : this.warnSlots.length;
    this.warnSlots[slot] = true;
    const w = txt(this, W / 2, H * 0.3, text, 40 * this.u, color, { wrap: W * 0.95 }).setDepth(20).setAlpha(0);
    // шаг по реальной высоте: на телефоне надпись бывает в две строки
    w.y += slot * (w.height + 10 * this.u);
    (this.warnTexts = this.warnTexts || []).push(w);
    this.tweens.add({
      targets: w,
      alpha: { from: 0, to: 1 },
      yoyo: true,
      repeat: 2,
      duration: 380,
      onComplete: () => {
        w.destroy();
        this.warnSlots[slot] = false;
      },
    });
  }

  floatText(text, color) {
    const { width: W, height: H } = this.scale;
    const f = txt(this, W / 2, H / 2 - 50 * this.u, text, 30 * this.u, color).setDepth(20);
    this.tweens.add({ targets: f, y: f.y - 70 * this.u, alpha: 0, duration: 1300, onComplete: () => f.destroy() });
  }

  toast(text) {
    const { width: W, height: H } = this.scale;
    const f = txt(this, W / 2, H * 0.9, text, 22 * this.u, COLORS.yellow).setDepth(300);
    this.tweens.add({ targets: f, alpha: 0, delay: 1200, duration: 600, onComplete: () => f.destroy() });
  }

  // ---------- Обучение: по шагам, с кнопкой «Пропустить» ----------
  showTut() {
    if (this.tutL) this.tutL.clear();
    this.tutL = this.tutL || new Layer(this);
    if (this.tut < 0) return;
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const touch = this.sys.game.device.input.touch;
    const text = [touch ? tr('tut0') : tr('tut0Desk'), tr('tut1'), tr('tut2'), tr('tut3')][this.tut];
    const pw = Math.min(W * 0.92, 660 * u);
    const ph = 96 * u;
    const y = H - ph / 2 - 70 * u;
    this.tutL.add(panelGfx(this, W / 2, y, pw, ph, COLORS.cyan, { radius: 16 * u, tintAlpha: 0.12 }).setDepth(30));
    this.tutL.add(txt(this, W / 2 - pw / 2 + 20 * u, y - ph / 2 + 18 * u, tr('tutTitle') + ' ' + (this.tut + 1) + '/4', 15 * u, COLORS.yellow, { ox: 0, glow: false }).setDepth(31));
    this.tutL.add(txt(this, W / 2, y + 8 * u, text, 22 * u, 0xffffff, { wrap: pw * 0.92, glowColor: COLORS.cyan }).setDepth(31));
    this.tutL.add(
      button(this, {
        x: W / 2 + pw / 2 - 110 * u,
        y: y + ph / 2 + 30 * u,
        w: 210 * u,
        h: 42 * u,
        label: tr('tutSkip'),
        size: 16 * u,
        color: 0x8a84b8,
        depth: 31,
        onClick: () => this.endTut(),
      })
    );
  }

  endTut() {
    this.tut = -1;
    if (this.tutL) this.tutL.clear();
    save.data.tutorialDone = true;
    save.write(false);
  }

  nextTut() {
    if (this.tut < 0) return;
    this.tut++;
    if (this.tut > 3) return this.endTut();
    this.showTut();
    // последний шаг (про сундуки и эволюции) просто висит несколько секунд
    if (this.tut === 3) this.time.delayedCall(7000, () => this.tut === 3 && this.endTut());
  }

  // вызывается игрой каждый шаг
  tutorialStep() {
    if (this.tut < 0) return;
    const g = this.g;
    if (this.tut === 0) {
      if (g.p.vx || g.p.vy) this.tutMove += 1 / 60;
      if (this.tutMove > 1.2) this.nextTut();
    } else if (this.tut === 1 && (g.level > 1 || g.pendingLevels > 0)) this.nextTut();
  }

  // ---------- Вехи и достижения ----------
  milestone(n, total, bonus) {
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const L = new Layer(this);
    const y = H * 0.24;
    const s = 40 * u;
    for (let i = 0; i < total; i++) {
      const x = W / 2 + (i - (total - 1) / 2) * (s + 8 * u);
      const im = L.add(this.add.image(x, y, i < n ? 'ic_star' : 'ic_starOff').setDisplaySize(s, s).setDepth(25));
      if (i === n - 1) {
        im.setScale(im.scaleX * 2);
        this.tweens.add({ targets: im, scaleX: im.scaleX / 2, scaleY: im.scaleY / 2, duration: 450, ease: 'Back.Out' });
      }
    }
    const mt = L.add(txt(this, W / 2 - 18 * u, y + 44 * u, tr('milestone') + ' ' + fmtTime(this.g.mode.stars[n - 1]) + '  +' + bonus, 26 * u, COLORS.yellow).setDepth(25));
    L.add(this.add.image(mt.x + mt.width / 2 - 4 * u, y + 44 * u, 'ic_crystal').setDisplaySize(30 * u, 30 * u).setDepth(25));
    audio.play('chest');
    this.time.delayedCall(2600, () => {
      L.items.forEach((o) => this.tweens.add({ targets: o, alpha: 0, duration: 400 }));
      this.time.delayedCall(450, () => L.clear());
    });
  }

  achToast(id) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const slot = this.achQ++;
    const pw = Math.min(W * 0.8, (this.overlay && W > H * 1.2 ? 370 : 440) * u);
    const ph = 58 * u;
    // в бою — сверху по центру; поверх окон: на широком экране справа, на телефоне внизу
    const land = W > H * 1.2;
    let x = W / 2;
    let y = 150 * u + slot * (ph + 8 * u);
    if (this.overlay) {
      if (land) {
        x = W - pw / 2 - 16 * u;
        y = H * 0.3 + slot * (ph + 8 * u);
      } else y = H - ph / 2 - 16 * u - slot * (ph + 8 * u);
    }
    const c = this.add.container(x, y).setDepth(320);
    (this.toasts = this.toasts || []).push(c);
    const g = this.add.graphics();
    drawPanel(g, pw, ph, COLORS.yellow, { radius: 14 * u, tintAlpha: 0.18 });
    c.add(g);
    c.add(this.add.image(-pw / 2 + 32 * u, 0, 'ic_' + a.icon).setDisplaySize(40 * u, 40 * u));
    c.add(txt(this, -pw / 2 + 60 * u, -10 * u, tr('achGot'), 14 * u, COLORS.yellow, { ox: 0, glow: false }));
    c.add(txt(this, -pw / 2 + 60 * u, 11 * u, tr('a_' + id), 20 * u, 0xffffff, { ox: 0, glowColor: COLORS.yellow }));
    c.add(txt(this, pw / 2 - 44 * u, 0, '+' + a.r, 20 * u, COLORS.purple, { ox: 1 }));
    c.add(this.add.image(pw / 2 - 26 * u, 0, 'ic_crystal').setDisplaySize(28 * u, 28 * u));
    c.setAlpha(0);
    c.y -= 30 * u;
    audio.play('buy');
    this.tweens.add({ targets: c, alpha: 1, y, duration: 300, ease: 'Back.Out' });
    this.time.delayedCall(3000, () =>
      this.tweens.add({
        targets: c,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          c.destroy();
          this.achQ = Math.max(0, this.achQ - 1);
        },
      })
    );
  }

  // ---------- Сундук ----------
  showChest(res, onClose) {
    this.resetJoy();
    this.chestRes = res;
    this.chestClose = onClose;
    this.chestSpin = true;
    this.overlay = () => this.buildChest();
    this.overlay();
    this.time.delayedCall(1500, () => {
      if (this.overlay && this.chestRes === res && this.chestSpin) {
        this.chestSpin = false;
        this.overlay();
      }
    });
  }

  buildChest() {
    this.ovL.clear();
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const L = this.ovL;
    const g = this.g;
    const res = this.chestRes;
    const d = this.dim(0.82);
    // нажатие по фону пропускает «рулетку»
    d.on('pointerup', () => {
      if (this.chestSpin) {
        this.chestSpin = false;
        this.overlay();
      }
    });
    L.add(txt(this, W / 2, H * 0.14, res.evo ? tr('evoTitle') : tr('chestTitle'), 46 * u, COLORS.yellow, { wrap: W * 0.95 }).setDepth(101));
    if (this.chestSpin) {
      // крутящаяся лента иконок
      const pool = [...Object.keys(WEAPONS), ...Object.keys(PASSIVES)];
      const s = 92 * u;
      const ic = L.add(this.add.image(W / 2, H * 0.45, 'ic_' + pool[0]).setDisplaySize(s, s).setDepth(102));
      const ring = L.add(this.add.image(W / 2, H * 0.45, 'ring').setDisplaySize(s * 1.8, s * 1.8).setTint(COLORS.yellow).setDepth(101).setBlendMode(1));
      let k = 0;
      const ev = this.time.addEvent({
        delay: 70,
        loop: true,
        callback: () => {
          if (!ic.active) return ev.remove();
          k++;
          ic.setTexture('ic_' + pool[(k * 7) % pool.length]).setDisplaySize(s, s);
          audio.play('pickup', k % 12);
        },
      });
      this.tweens.add({ targets: ring, angle: 360, duration: 1500, repeat: -1 });
      L.add(txt(this, W / 2, H * 0.72, tr('chestTap'), 18 * u, 0x8a84b8, { glow: false }).setDepth(101));
      return;
    }
    audio.play('levelup');
    if (res.evo) {
      const ev = EVOLVE[res.evo];
      const s = 130 * u;
      const im = L.add(this.add.image(W / 2, H * 0.36, 'ic_' + ev.id).setDisplaySize(s, s).setDepth(102));
      this.tweens.add({ targets: im, scale: im.scale * 1.08, yoyo: true, repeat: -1, duration: 600 });
      L.add(txt(this, W / 2, H * 0.36 + s * 0.68, tr(ev.id), 34 * u, ev.color === COLORS.white ? COLORS.yellow : ev.color, { wrap: W * 0.9 }).setDepth(102));
      L.add(txt(this, W / 2, H * 0.36 + s * 0.68 + 44 * u, tr(ev.id + '_d'), 21 * u, 0xffffff, { wrap: Math.min(W * 0.9, 620 * u), glowColor: COLORS.cyan }).setDepth(102));
    } else {
      const n = res.items.length;
      const land = W > H * 1.1;
      const k = land ? 1 : 1.35;
      const s = (n > 3 ? 64 : 84) * u * k;
      res.items.forEach((o, i) => {
        const info = this.optInfo(o);
        let x, y;
        if (land || n === 1) {
          x = W / 2 + (i - (n - 1) / 2) * Math.min(170 * u, (W * 0.92) / n);
          y = H * 0.38;
        } else {
          x = W / 2 + ((i % 3) - (Math.min(3, n - Math.floor(i / 3) * 3) - 1) / 2) * Math.min(W * 0.32, 200 * u);
          y = H * 0.3 + Math.floor(i / 3) * 190 * u * k;
        }
        const im = L.add(this.add.image(x, y, 'ic_' + info.icon).setDisplaySize(s, s).setDepth(102).setAlpha(0));
        this.tweens.add({ targets: im, alpha: 1, duration: 250, delay: i * 120 });
        L.add(txt(this, x, y + s * 0.66, info.name, 16 * u * k, 0xffffff, { wrap: land ? 150 * u : W * 0.27, glowColor: o.color }).setDepth(102));
        if (info.tag) L.add(txt(this, x, y + s * 0.66 + 34 * u * k, info.tag, 15 * u * k, o.color).setDepth(102));
      });
      if (n > 1) L.add(txt(this, W / 2, H * 0.22, 'x' + n + '!', 30 * u, COLORS.pink).setDepth(102));
    }
    const by = H * 0.74;
    L.add(this.add.image(W / 2 - 50 * u, by - 56 * u, 'ic_crystal').setDisplaySize(34 * u, 34 * u).setDepth(102));
    L.add(txt(this, W / 2 - 28 * u, by - 56 * u, '+' + res.crystals, 26 * u, COLORS.purple, { ox: 0 }).setDepth(102));
    const bw = Math.min(W * 0.8, 340 * u);
    const close = () => {
      this.closeOverlay();
      const f = this.chestClose;
      this.chestClose = null;
      f && f();
    };
    L.add(button(this, { x: W / 2, y: by, w: bw, h: 64 * u, label: tr('take'), color: COLORS.green, fillStrong: true, depth: 102, onClick: close }));
    if (!g.chestAdUsed) {
      L.add(
        button(this, {
          x: W / 2,
          y: by + 78 * u,
          w: bw,
          h: 56 * u,
          label: tr('chestAgain'),
          icon: 'ad',
          size: 20 * u,
          color: COLORS.yellow,
          depth: 102,
          onClick: () =>
            this.withRewarded(() => {
              if (g.chestAdUsed) return;
              g.chestAdUsed = true;
              const f = this.chestClose;
              this.closeOverlay();
              g.openChest(true);
              // прежний обработчик закрытия переходит новому окну
              this.chestClose = f;
            }),
        })
      );
    }
  }

  // ---------- Окна ----------
  dim(alpha = 0.75) {
    const { width: W, height: H } = this.scale;
    const r = this.add.rectangle(0, 0, W, H, 0x05010f, alpha).setOrigin(0).setDepth(100).setInteractive();
    return this.ovL.add(r);
  }

  closeOverlay() {
    this.ovL.clear();
    this.overlay = null;
  }

  // описание карточки: для взятого оружия — что именно изменится, для пассивок — итог
  optInfo(o) {
    const g = this.g;
    if (o.kind === 'w') {
      const W = WEAPONS[o.id];
      let desc;
      if (o.lvl === 1) desc = tr('w_' + o.id + '_d')[0];
      else {
        const lines = [];
        for (const k of STAT_KEYS) {
          const arr = W[k];
          if (!Array.isArray(arr)) continue;
          const a = arr[o.lvl - 2];
          const b = arr[o.lvl - 1];
          if (a === b) continue;
          const f = (v) => (k === 'cd' ? v.toFixed(2).replace(/0$/, '') + tr('sec') : k === 'size' ? '×' + v : String(v));
          lines.push(tr('st_' + k) + ': ' + f(a) + ' → ' + f(b));
          if (lines.length >= 3) break;
        }
        desc = lines.join('\n');
      }
      const ev = EVOLVE[o.id];
      const hint = g.evo[o.id] ? '' : g.passives[ev.pass] ? tr('evoReadyHint') : tr('evoNeed') + ' ' + tr('p_' + ev.pass);
      return { name: tr('w_' + o.id), desc, icon: o.id, tag: o.lvl === 1 ? tr('newItem') : tr('lvl') + ' ' + (o.lvl - 1) + ' → ' + o.lvl, hint };
    }
    if (o.kind === 'p') {
      const tot = PASSIVE_TOTAL[o.id];
      let desc = tr('p_' + o.id + '_d');
      if (o.lvl > 1 && tot) desc += '\n' + tr('total') + ': ' + tot(o.lvl - 1) + ' → ' + tot(o.lvl);
      // пассивка нужна для эволюции уже взятого оружия
      const w = Object.keys(EVOLVE).find((k) => EVOLVE[k].pass === o.id && g.weapons[k] && !g.evo[k]);
      const hint = w ? tr('evoFor') + ' ' + tr('w_' + w) : '';
      return { name: tr('p_' + o.id), desc, icon: o.id, tag: o.lvl === 1 ? tr('newItem') : tr('lvl') + ' ' + (o.lvl - 1) + ' → ' + o.lvl, hint };
    }
    if (o.kind === 'oc') return { name: tr(o.id), desc: tr(o.id + '_d'), icon: OVERCHARGE[o.id].icon, tag: '⚡ ' + o.lvl };
    if (o.kind === 'heal') return { name: tr('healTitle'), desc: tr('heal'), icon: 'regen', tag: '' };
    return { name: tr('crystalsTitle'), desc: tr('crystalsDesc'), icon: 'crystal', tag: '' };
  }

  showLevelUp(options) {
    this.resetJoy();
    this.overlay = () => this.buildLevelUp(options);
    this.overlay();
  }

  buildLevelUp(options) {
    this.ovL.clear();
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const L = this.ovL;
    this.dim(0.7);
    const land = W > H * 1.15;
    const titleY = land ? H * 0.1 : H * 0.11;
    L.add(txt(this, W / 2, titleY, tr('choose'), 40 * u, COLORS.cyan).setDepth(101));
    L.add(txt(this, W / 2, titleY + 42 * u, tr('level') + ' ' + this.g.level, 22 * u, COLORS.pink).setDepth(101));

    let armed = false;
    this.time.delayedCall(350, () => (armed = true));
    const gap = 16 * u;
    const pick = (o) => {
      if (!armed) return;
      this.closeOverlay();
      if (this.tut === 2) this.nextTut();
      this.g.chooseUpgrade(o);
    };
    if (this.tut === 2) L.add(txt(this, W / 2, titleY + 76 * u, tr('tut2'), 19 * u, COLORS.yellow, { wrap: W * 0.9, glow: false }).setDepth(101));

    // простой интерфейс: подсказываем лучший выбор и убираем лишние цифры
    const rec = this.g.simple ? this.g.recommend(options) : -1;
    options.forEach((o, i) => {
      const info = this.optInfo(o);
      if (this.g.simple) {
        info.hint = '';
        if (o.kind === 'w' && o.lvl > 1) info.desc = tr('w_' + o.id + '_d')[o.lvl - 1] || info.desc;
        if (i === rec) info.tag = '★ ' + tr('advice');
      }
      let cx, cy, cw, ch;
      if (land) {
        cw = Math.min(330 * u, (W - 4 * gap) / 3);
        ch = Math.min(H * 0.56, 400 * u);
        cx = W / 2 + (i - 1) * (cw + gap);
        cy = H * 0.53;
      } else {
        cw = Math.min(W - 2 * gap, 620 * u);
        ch = Math.min((H * 0.6 - 2 * gap) / 3, 165 * u);
        cx = W / 2;
        cy = H * 0.5 + (i - 1) * (ch + gap);
      }
      const btn = L.add(button(this, { x: cx, y: cy, w: cw, h: ch, color: o.color, depth: 102, radius: 16 * u, onClick: () => pick(o) }));
      const c = btn.c;
      if (land) {
        const is = cw * 0.34;
        c.add(this.add.image(0, -ch * 0.27, 'ic_' + info.icon).setDisplaySize(is, is));
        c.add(txt(this, 0, -ch * 0.02, info.name, 24 * u, 0xffffff, { wrap: cw * 0.9, glowColor: o.color }));
        if (info.tag) c.add(txt(this, 0, ch * 0.08, info.tag, 18 * u, o.kind && info.tag === tr('newItem') ? COLORS.yellow : o.color));
        c.add(txt(this, 0, ch * 0.25, info.desc, 18 * u, 0xd8d4ff, { wrap: cw * 0.88, glow: false }));
        if (info.hint) c.add(txt(this, 0, ch * 0.42, info.hint, 15 * u, COLORS.yellow, { wrap: cw * 0.9, glow: false }));
      } else {
        const is = Math.min(ch * 0.66, 100 * u);
        const left = -cw / 2 + 18 * u;
        c.add(this.add.image(left + is / 2, 0, 'ic_' + info.icon).setDisplaySize(is, is));
        const tx = left + is + 16 * u;
        c.add(txt(this, tx, -ch * 0.3, info.name, 22 * u, 0xffffff, { ox: 0, glowColor: o.color }));
        if (info.tag) c.add(txt(this, cw / 2 - 16 * u, -ch * 0.3, info.tag, 16 * u, info.tag === tr('newItem') ? COLORS.yellow : o.color, { ox: 1 }));
        c.add(txt(this, tx, ch * 0.03, info.desc, 16 * u, 0xd8d4ff, { ox: 0, wrap: cw / 2 - tx - 12 * u, glow: false }));
        if (info.hint) c.add(txt(this, tx, ch * 0.36, info.hint, 14 * u, COLORS.yellow, { ox: 0, wrap: cw / 2 - tx - 12 * u, glow: false }));
      }
      c.setAlpha(0);
      c.y += 20 * u;
      this.tweens.add({ targets: c, alpha: 1, y: cy, duration: 260, delay: i * 70, ease: 'Back.Out' });
    });

    // переброс
    const g = this.g;
    const by = land ? H * 0.9 : Math.min(H - 50 * u, H * 0.5 + 1.5 * (Math.min((H * 0.6 - 2 * gap) / 3, 165 * u) + gap) + 50 * u);
    const free = g.rerolls > 0;
    L.add(
      button(this, {
        x: W / 2,
        y: by,
        w: 300 * u,
        h: 62 * u,
        label: free ? tr('reroll') + ' (' + g.rerolls + ')' : tr('rerollAd'),
        icon: free ? 'reroll' : 'ad',
        size: 22 * u,
        color: free ? COLORS.cyan : COLORS.yellow,
        depth: 102,
        onClick: () => {
          if (free) {
            g.rerolls--;
            this.showLevelUp(g.buildOptions());
          } else {
            this.withRewarded(() => this.showLevelUp(g.buildOptions()));
          }
        },
      })
    );
  }

  withRewarded(onReward) {
    // пока реклама грузится и идёт, второй запрос не шлём, а кнопки под ней не нажимаются:
    // иначе награда могла прийти, когда игрок уже ушёл с этого окна
    if (this.adBusy) return;
    this.adBusy = true;
    const { width: W, height: H } = this.scale;
    const block = this.add.rectangle(0, 0, W, H, 0x05010f, 0.35).setOrigin(0).setDepth(300).setInteractive();
    audio.suspend('ad');
    sdk.showRewarded(null, (ok) => {
      this.adBusy = false;
      if (block.active) block.destroy();
      audio.resume('ad');
      if (ok) onReward();
      else this.toast(tr('adFail'));
    });
  }

  showPause() {
    this.resetJoy();
    this.overlay = () => this.buildPause();
    this.overlay();
  }

  buildPause() {
    this.ovL.clear();
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const L = this.ovL;
    const g = this.g;
    this.dim(0.78);
    L.add(txt(this, W / 2, H * 0.16, tr('pause'), 52 * u, COLORS.cyan).setDepth(101));

    // текущая сборка
    const items = [
      ...Object.entries(g.weapons).map(([id, l]) => [g.evo[id] ? EVOLVE[id].id : id, g.evo[id] ? '★' : l, WEAPONS[id].color]),
      ...Object.entries(g.passives).map(([id, l]) => [id, l, PASSIVES[id].color]),
    ];
    const is = Math.min(54 * u, (W * 0.9) / Math.max(1, Math.min(items.length, 7)) - 8 * u);
    const perRow = Math.max(1, Math.floor((W * 0.9) / (is + 10 * u)));
    items.forEach(([id, l, col], i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, items.length - row * perRow);
      const x = W / 2 + ((i % perRow) - (inRow - 1) / 2) * (is + 10 * u);
      const y = H * 0.27 + row * (is + 26 * u);
      L.add(this.add.image(x, y, 'ic_' + id).setDisplaySize(is, is).setDepth(101));
      L.add(txt(this, x, y + is * 0.62, String(l), 15 * u, col).setDepth(101));
    });

    const bw = Math.min(W * 0.8, 360 * u);
    const bh = 64 * u;
    let y = H * 0.5;
    const step = bh + 16 * u;
    L.add(
      button(this, {
        x: W / 2,
        y,
        w: bw,
        h: bh,
        label: tr('resume'),
        color: COLORS.green,
        fillStrong: true,
        depth: 102,
        onClick: () => {
          this.closeOverlay();
          g.closePause();
        },
      })
    );
    y += step;
    const mus = L.add(
      button(this, {
        x: W / 2,
        y,
        w: bw,
        h: bh,
        label: tr('music') + ': ' + volPct('music'),
        icon: 'music',
        color: COLORS.cyan,
        depth: 102,
        size: 22 * u,
        onClick: () => openSound(() => this.buildPause()),
      })
    );
    y += step;
    L.add(
      button(this, {
        x: W / 2,
        y,
        w: bw,
        h: bh,
        label: tr('sound') + ': ' + volPct('sfx'),
        icon: 'sound',
        color: COLORS.cyan,
        depth: 102,
        size: 22 * u,
        onClick: () => openSound(() => this.buildPause()),
      })
    );
    y += step;
    L.add(
      button(this, {
        x: W / 2,
        y,
        w: bw,
        h: bh,
        label: tr('toMenu'),
        color: COLORS.pink,
        depth: 102,
        onClick: () => {
          this.closeOverlay();
          g.finishRun();
        },
      })
    );
  }

  showRevive(canFree) {
    this.resetJoy();
    const fn = () => this.buildRevive(canFree);
    this.overlay = fn;
    this.time.delayedCall(600, () => {
      if (this.overlay === fn) fn();
    });
  }

  buildRevive(canFree) {
    this.ovL.clear();
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const L = this.ovL;
    const g = this.g;
    this.dim(0.7);
    L.add(txt(this, W / 2, H * 0.3, tr('reviveTitle'), 50 * u, COLORS.pink).setDepth(101));
    L.add(txt(this, W / 2, H * 0.3 + 60 * u, tr('reviveDesc'), 24 * u, 0xffffff, { wrap: W * 0.85, glowColor: COLORS.cyan }).setDepth(101));
    const bw = Math.min(W * 0.85, 400 * u);
    L.add(
      button(this, {
        x: W / 2,
        y: H * 0.56,
        w: bw,
        h: 76 * u,
        label: canFree ? tr('reviveFree') : tr('reviveAd'),
        icon: canFree ? 'revive' : 'ad',
        color: COLORS.green,
        fillStrong: true,
        size: 26 * u,
        depth: 102,
        onClick: () => {
          if (canFree) {
            this.closeOverlay();
            g.revive(true);
          } else {
            this.withRewarded(() => {
              this.closeOverlay();
              g.revive(false);
            });
          }
        },
      })
    );
    L.add(
      button(this, {
        x: W / 2,
        y: H * 0.56 + 100 * u,
        w: bw * 0.7,
        h: 56 * u,
        label: tr('noThanks'),
        color: 0x8a84b8,
        size: 20 * u,
        depth: 102,
        onClick: () => {
          this.closeOverlay();
          g.finishRun();
        },
      })
    );
  }

  // ---------- Победа на 30:00 ----------
  showWin() {
    this.resetJoy();
    this.overlay = () => this.buildWin();
    this.overlay();
  }

  buildWin() {
    this.ovL.clear();
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const L = this.ovL;
    const g = this.g;
    this.dim(0.8);
    const t1 = L.add(txt(this, W / 2, H * 0.2, tr('winTitle'), 50 * u, COLORS.green, { wrap: W * 0.95 }).setDepth(101));
    this.tweens.add({ targets: t1, scale: 1.06, yoyo: true, repeat: -1, duration: 600 });
    const k = g.mode.threat || 0;
    const desc = g.camp ? tr('winCampDesc') : g.mode.daily ? tr('winDailyDesc') : g.mode.rush ? tr('winRushDesc') : g.mode.event ? tr('winEventDesc') : g.modeId === 'quick' ? tr('winQuickDesc') : g.modeId === 'calm' ? tr('winCalmDesc') : k >= 5 ? tr('winHardDesc') : k ? tr('winThreatDesc').replace('{n}', k).replace('{m}', k + 1) : tr('winDesc');
    const dt = L.add(txt(this, W / 2, H * 0.2 + 40 * u, desc, 24 * u, 0xffffff, { wrap: Math.min(W * 0.9, 640 * u), glowColor: COLORS.cyan, oy: 0 }).setDepth(101));
    // описание бывает в 2–3 строки: кристаллы и кнопки идут под ним
    const cy = Math.max(H * 0.2 + 130 * u, dt.y + dt.height + 14 * u);
    L.add(this.add.image(W / 2 - 60 * u, cy, 'ic_crystal').setDisplaySize(44 * u, 44 * u).setDepth(102));
    L.add(txt(this, W / 2 - 30 * u, cy, '+' + g.winBonus, 36 * u, COLORS.purple, { ox: 0 }).setDepth(102));
    const bw = Math.min(W * 0.88, 460 * u);
    const bh = 70 * u;
    L.add(
      button(this, {
        x: W / 2,
        y: cy + 90 * u,
        w: bw,
        h: bh,
        label: tr('endless'),
        sub: tr('endlessSub'),
        size: 24 * u,
        color: COLORS.red,
        fillStrong: true,
        depth: 102,
        onClick: () => {
          this.closeOverlay();
          g.continueEndless();
        },
      })
    );
    L.add(
      button(this, {
        x: W / 2,
        y: cy + 90 * u + bh + 16 * u,
        w: bw,
        h: 60 * u,
        label: tr('finishRun'),
        size: 22 * u,
        color: COLORS.green,
        depth: 102,
        onClick: () => {
          this.closeOverlay();
          g.finishRun();
          g.setPause('win', false);
        },
      })
    );
  }

  showGameOver(res) {
    this.resetJoy();
    // уже показанные всплывашки и предупреждения боя убираем, чтобы не наезжали на итоги
    for (const c of this.toasts || []) if (c.active) c.destroy();
    for (const w of this.warnTexts || []) if (w.active) w.setVisible(false);
    this.toasts = [];
    this.warnTexts = [];
    this.achQ = 0;
    this.overlay = () => this.buildGameOver(res);
    this.overlay();
  }

  buildGameOver(res) {
    this.ovL.clear();
    const { width: W, height: H } = this.scale;
    const u = this.u;
    const L = this.ovL;
    const g = this.g;
    this.dim(0.82);
    L.add(txt(this, W / 2, H * 0.12, res.won ? tr('victory') : tr('gameOver'), 46 * u, res.won ? COLORS.green : COLORS.pink, { wrap: W * 0.95 }).setDepth(101));
    const tag = res.camp ? tr('campLevel').replace('{n}', res.camp.i + 1) : res.event ? tr('ev_' + res.event.ev.id) : res.mode.rush ? tr('rushTag') : res.mode.daily ? tr('dailyTag') : res.mode.threat ? tr('threatTag') + ' ' + res.mode.threat : res.modeId === 'quick' ? tr('quickTag') : res.modeId === 'calm' ? tr('calmTag') : '';
    if (tag) L.add(txt(this, W / 2, H * 0.12 - 40 * u, tag, 20 * u, res.mode.threat ? COLORS.red : COLORS.cyan).setDepth(101));
    // достижения, открытые в конце забега
    res.ach.forEach((id, i) => this.time.delayedCall(400 + i * 700, () => this.achToast(id)));
    res.ach = [];
    if (res.record) {
      const r = L.add(txt(this, W / 2, H * 0.12 + 50 * u, tr('newRecord'), 28 * u, COLORS.yellow).setDepth(101));
      this.tweens.add({ targets: r, scale: 1.12, yoyo: true, repeat: -1, duration: 500 });
    }
    // на широком экране: итоги слева, кнопки справа в столбик
    const side = W > H * 1.25;
    const cx = side ? W * 0.32 : W / 2;
    const pw = Math.min(side ? W * 0.5 : W * 0.9, 460 * u);
    const rows = [
      ['clock', tr('time'), fmtTime(res.time)],
      ['skull', tr('kills'), String(res.kills)],
      res.camp ? ['star', tr('stars'), '★'.repeat(res.camp.stars) + '☆'.repeat(3 - res.camp.stars)] : res.mode.rush ? ['rush', tr('bossesHud'), res.rushKills + '/' + RUSH_BOSSES] : res.mode.stars.length ? ['star', tr('stars'), '★'.repeat(res.stars) + '☆'.repeat(res.mode.stars.length - res.stars)] : ['wisdom', tr('level'), String(res.level)],
      ['trophy', tr('score'), res.score.toLocaleString('ru-RU')],
    ];
    if (g.evA) rows.push(['ev_' + g.evA.ev.id, tr('evTokens_' + g.evA.ev.id), '+' + res.tokens]);
    const rh = 46 * u;
    const top = H * 0.27;
    L.add(panelGfx(this, cx, top + (rows.length * rh) / 2 + 6 * u, pw, rows.length * rh + 30 * u, COLORS.cyan, { radius: 16 * u }).setDepth(101));
    rows.forEach(([ic, label, val], i) => {
      const y = top + 14 * u + i * rh + rh / 2 - 6 * u;
      L.add(this.add.image(cx - pw / 2 + 34 * u, y, 'ic_' + ic).setDisplaySize(34 * u, 34 * u).setDepth(102));
      L.add(txt(this, cx - pw / 2 + 62 * u, y, label, 22 * u, 0xd8d4ff, { ox: 0, glow: false }).setDepth(102));
      L.add(txt(this, cx + pw / 2 - 20 * u, y, val, 24 * u, 0xffffff, { ox: 1, glowColor: COLORS.cyan }).setDepth(102));
    });

    const cy = top + rows.length * rh + 60 * u;
    L.add(this.add.image(cx - 70 * u, cy, 'ic_crystal').setDisplaySize(44 * u, 44 * u).setDepth(102));
    L.add(txt(this, cx - 40 * u, cy, '+' + res.crystals, 36 * u, COLORS.purple, { ox: 0 }).setDepth(102));

    // цель на следующий забег: ближайшая звезда и ближайшая покупка в магазине
    const goals = [];
    const gcol = [];
    // кампания: какие цели выполнены, а каких не хватило
    if (res.camp)
      res.camp.goals.forEach((x) => {
        goals.push((x.ok ? '✓ ' : '✗ ') + goalLong(x.type, x.n) + (x.ok ? '' : x.type === 'hp' ? ' (' + x.v + '%)' : ' (' + Math.min(x.v, x.n) + '/' + x.n + ')'));
        gcol.push(x.ok ? COLORS.green : 0xb8b0e0);
      });
    if (res.mode.stars && res.stars < res.mode.stars.length) goals.push(tr('goalStar').replace('{t}', fmtTime(res.mode.stars[res.stars])));
    let near = null;
    for (const it of SHOP) {
      const lvl = save.shopLvl(it.id);
      if (lvl >= it.max) continue;
      const c = shopCost(it, lvl);
      if (!near || c < near.c) near = { it, c };
    }
    const canBuy = !!near && save.data.crystals >= near.c;
    if (near) goals.push(canBuy ? tr('goalBuy').replace('{n}', tr(near.it.id)) : tr('goalSave').replace('{n}', near.c - save.data.crystals).replace('{u}', tr(near.it.id)));
    const gh = 26 * u;
    goals.forEach((s, i) => L.add(txt(this, cx, cy + 38 * u + i * gh, s, 19 * u, gcol[i] ?? (i ? COLORS.purple : COLORS.yellow), { wrap: side ? W * 0.58 : W * 0.92, glow: false }).setDepth(102)));
    const toMenu = () =>
      this.leave(() => {
        g.scene.start('Menu');
        this.scene.stop();
      });
    const specs = [];
    if (canBuy)
      specs.push({
        label: tr('toShop'),
        icon: 'crystal',
        color: COLORS.purple,
        fillStrong: true,
        size: 24 * u,
        onClick: () =>
          this.leave(() => {
            g.registry.set('openPanel', 'shop');
            g.scene.start('Menu');
            this.scene.stop();
          }),
      });
    if (!res.doubled)
      specs.push({
        label: tr('double'),
        icon: 'ad',
        color: COLORS.yellow,
        fillStrong: true,
        size: 24 * u,
        onClick: () =>
          this.withRewarded(() => {
            g.doubleCrystals();
            audio.play('buy');
            this.buildGameOver(res);
          }),
      });
    if (res.camp && res.camp.next) {
      const ni = res.camp.i + 1;
      specs.push({
        label: tr('campNext'),
        color: COLORS.green,
        fillStrong: true,
        onClick: () =>
          this.leave(() => {
            g.registry.set('run', { modeId: 'campaign', level: ni, hero: g.run.hero, arena: CAMPAIGN[ni].arena });
            g.scene.restart();
          }),
      });
    }
    specs.push({ label: tr('again'), color: COLORS.green, fillStrong: true, onClick: () => this.leave(() => g.scene.restart()) });
    specs.push({ label: tr('menu'), color: COLORS.cyan, onClick: toMenu });
    // кнопки: в столбик, а если по высоте не помещаются и экран широкий — сеткой в два столбца
    const startY = side ? top + 40 * u : cy + 38 * u + goals.length * gh + 34 * u;
    const gap = 10 * u;
    const avail = H - 10 * u - startY + gap;
    const n = specs.length;
    const two = !side && n > 2 && avail / n - gap < 56 * u && W >= 560 * u;
    const cols = two ? 2 : 1;
    const rowsN = Math.ceil(n / cols);
    const bw = two ? Math.min(W * 0.44, 300 * u) : side ? Math.min(W * 0.36, 380 * u) : Math.min(W * 0.85, 380 * u);
    const bh = Math.max(28 * u, Math.min(64 * u, avail / rowsN - gap));
    specs.forEach((b, i) => {
      const col = two ? i % 2 : 0;
      const row = two ? Math.floor(i / 2) : i;
      // в сетке последняя кнопка одна в ряду — по центру
      const alone = two && i === n - 1 && n % 2 === 1;
      const x = two && !alone ? W / 2 + (col ? 1 : -1) * (bw / 2 + gap / 2) : side ? W * 0.75 : W / 2;
      L.add(button(this, { x, y: startY + row * (bh + gap), w: bw, h: bh, depth: 102, ...b }));
    });
  }

  leave(fn) {
    this.closeOverlay();
    // после первого забега (он же обучение) межэкранную рекламу не показываем: правила VK 5.1.5.2 (б)
    if (save.data.runs < 2) return fn();
    audio.suspend('ad');
    sdk.showInterstitial(() => {
      audio.resume('ad');
      fn();
    });
  }
}
