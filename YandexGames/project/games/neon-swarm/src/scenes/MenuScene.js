// Главное меню, магазин улучшений и таблица лидеров
import { COLORS, SHOP, shopCost, ENEMIES, HEROES, ARENAS, MODES, MAX_THREAT, ACHIEVEMENTS, EVOLVE, RUSH_BOSSES, CAMPAIGN } from '../data.js';
import { goalLong } from './HudScene.js';
import { meta } from '../meta.js';
import { TS } from '../textures.js';
import { uiScale, txt, button, fmtTime, Layer, panelGfx, setTextScale } from '../ui.js';
import { track } from '../analytics.js';
import { t as tr } from '../i18n.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { openSound, volPct } from '../sound-ui.js';

const MUT_ICON = { mu_fast: 'swift', mu_glass: 'power', mu_swarm: 'skull', mu_bosses: 'rush', mu_magnet: 'magnet' };
import { iap, openStore } from '../iap.js';
import { activeEvent, eventState, eventTasks, claimEventTask, eventBadge, eventEndDate, shopItem, buyEventItem, EVENT_SHOP, SKINS } from '../events.js';

const Phaser = window.Phaser;
let firstShow = true;
let lbCache = null;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.registry.set('view', null);
    audio.setIntensity(0);
    sdk.gameplay(false);
    this.L = new Layer(this);
    this.panel = this.registry.get('openPanel') || null; // например, «К улучшениям» с экрана итога
    this.registry.set('openPanel', null);

    // декоративные фигуры на фоне
    const types = Object.keys(ENEMIES).filter((k) => !ENEMIES[k].boss);
    this.decor = [];
    for (let i = 0; i < 12; i++) {
      const s = this.add.image(0, 0, 'e_' + types[i % types.length]).setAlpha(0.35).setDepth(-1);
      const d = { s, vx: 0, vy: 0, rot: (Math.random() - 0.5) * 1.5 };
      this.resetDecor(d, true);
      this.decor.push(d);
    }

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    if (firstShow) {
      firstShow = false;
      const loader = document.getElementById('loader');
      if (loader) loader.remove();
      sdk.ready();
    }
  }

  resetDecor(d, anywhere) {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    d.s.setScale((u * (0.8 + Math.random() * 0.9)) / TS);
    if (anywhere) {
      d.s.setPosition(Math.random() * W, Math.random() * H);
    } else {
      d.s.setPosition(Math.random() * W, H + 60 * u);
    }
    d.vx = (Math.random() - 0.5) * 30 * u;
    d.vy = -(15 + Math.random() * 35) * u;
  }

  update(time, delta) {
    const dt = delta / 1000;
    for (const d of this.decor) {
      d.s.x += d.vx * dt;
      d.s.y += d.vy * dt;
      d.s.rotation += d.rot * dt;
      if (d.s.y < -80 * uiScale(this)) this.resetDecor(d, false);
    }
  }

  layout() {
    this.L.clear();
    const P = this.panel;
    if (P === 'shop') this.buildShop();
    else if (P === 'lb') this.buildLb();
    else if (P === 'prep') this.buildPrep();
    else if (P === 'ach') this.buildAch();
    else if (P === 'daily') this.buildDaily();
    else if (P === 'challenge') this.buildChallenge();
    else if (P === 'rush') this.buildRush();
    else if (P === 'settings') this.buildSettings();
    else if (P === 'camp') this.buildCamp();
    else if (P === 'event') this.buildEvent();
    else this.buildMain();
  }

  go(panel) {
    this.panel = panel;
    this.page = 0;
    this.layout();
  }

  backBtn(y) {
    const { width: W } = this.scale;
    const u = uiScale(this);
    return this.L.add(button(this, { x: W / 2, y, w: Math.min(W * 0.6, 300 * u), h: 62 * u, label: tr('back'), color: COLORS.cyan, onClick: () => this.go(null) }));
  }

  title(text, y, color = COLORS.cyan) {
    const { width: W } = this.scale;
    const u = uiScale(this);
    return this.L.add(txt(this, W / 2, y, text, 36 * u, color, { wrap: W * 0.8 }));
  }

  startRun(run) {
    audio.unlock();
    audio.startMusic();
    this.registry.set('run', run);
    this.scene.start('Game');
  }

  topBar(showSettings = true) {
    const { width: W } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const m = 16 * u;
    L.add(this.add.image(m + 22 * u, m + 24 * u, 'ic_crystal').setDisplaySize(44 * u, 44 * u));
    this.crystalText = L.add(txt(this, m + 50 * u, m + 24 * u, String(save.data.crystals), 30 * u, COLORS.purple, { ox: 0 }));
    if (!showSettings) return;
    const s = 56 * u;
    const mk = (i, icon, on, fn) => {
      const b = L.add(
        button(this, {
          x: W - m - s / 2 - i * (s + 10 * u),
          y: m + s / 2,
          w: s,
          h: s,
          icon,
          iconSize: s * 0.72,
          color: on ? COLORS.cyan : 0x555577,
          onClick: fn,
        })
      );
      if (!on) b.icon.setAlpha(0.35);
    };
    mk(0, 'gear', true, () => this.go('settings'));
    mk(1, 'sound', save.data.settings.sfx, () => openSound(() => this.layout()));
    mk(2, 'music', save.data.settings.music, () => openSound(() => this.layout()));
  }

  buildMain() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    this.topBar();

    const land = W > H * 1.2;
    const ty = land ? H * 0.2 : H * 0.2;
    const s1 = Math.min(78 * u, W * 0.12);
    const s2 = Math.min(118 * u, W * 0.2);
    const t1 = L.add(txt(this, W / 2, ty - s2 * 0.55, tr('title1'), s1, COLORS.cyan));
    const t2 = L.add(txt(this, W / 2, ty + s1 * 0.35, tr('title2'), s2, COLORS.pink));
    L.add(txt(this, W / 2, ty + s1 * 0.35 + s2 * 0.75, tr('subtitle'), 22 * u, 0xd8d4ff, { glowColor: COLORS.purple }));
    this.tweens.add({ targets: t2, scale: 1.05, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
    this.tweens.add({ targets: t1, alpha: 0.75, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.InOut' });

    const bw = Math.min(W * 0.8, 420 * u);
    let y = ty + s1 * 0.35 + s2 * 0.75 + 96 * u;
    const play = L.add(
      button(this, {
        x: W / 2,
        y,
        w: bw,
        h: 92 * u,
        label: tr('play'),
        size: 42 * u,
        color: COLORS.green,
        fillStrong: true,
        onClick: () => (save.data.runs === 0 ? this.startCamp(0) : this.go('camp')),
      })
    );
    this.tweens.add({ targets: play.c, scale: 1.04, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
    y += 46 * u + 22 * u;

    // второстепенные разделы: 3 в ряд на компьютере, 2 в ряд на телефоне
    const items = [
      ['upgrades', 'crystal', COLORS.purple, () => this.go('shop')],
      ['daily', 'gift', COLORS.pink, () => this.go('daily'), meta.dailyBadge()],
      ['achievements', 'star', COLORS.yellow, () => this.go('ach')],
      ['challenge', 'calendar', COLORS.green, () => this.go('challenge')],
      ['rush', meta.rushUnlocked() ? 'rush' : 'lock', COLORS.red, () => this.go('rush')],
      ['records', 'trophy', COLORS.cyan, () => this.go('lb')],
    ];
    const cols = land ? 3 : 2;
    const gap = 12 * u;
    const gw = Math.min(W * 0.94, land ? 760 * u : 560 * u);
    const cw = (gw - (cols - 1) * gap) / cols;
    const ch = 62 * u;
    items.forEach(([key, icon, color, fn, badge], i) => {
      const cx = W / 2 - gw / 2 + cw / 2 + (i % cols) * (cw + gap);
      const cy = y + ch / 2 + Math.floor(i / cols) * (ch + gap);
      L.add(button(this, { x: cx, y: cy, w: cw, h: ch, label: tr('m_' + key), icon, size: (land ? 21 : 20) * u, iconSize: 38 * u, color, onClick: fn }));
      if (badge) {
        const b = L.add(this.add.circle(cx + cw / 2 - 8 * u, cy - ch / 2 + 8 * u, 11 * u, COLORS.red).setStrokeStyle(2 * u, 0xffffff));
        this.tweens.add({ targets: b, scale: 1.25, yoyo: true, repeat: -1, duration: 500 });
      }
    });
    y += Math.ceil(items.length / cols) * (ch + gap);

    // праздничное событие: отдельная кнопка под разделами
    const ea = activeEvent();
    if (ea) {
      const eh = 58 * u;
      const ex = L.add(button(this, { x: W / 2, y: y + eh / 2, w: gw, h: eh, label: tr('ev_' + ea.ev.id).toUpperCase() + ' · ' + this.untilText(ea), icon: 'ev_' + ea.ev.id, size: 20 * u, iconSize: 42 * u, color: ea.ev.color, fillStrong: true, onClick: () => this.go('event') }));
      this.tweens.add({ targets: ex.c, scale: 1.03, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.InOut' });
      if (eventBadge()) {
        const bd = L.add(this.add.circle(W / 2 + gw / 2 - 8 * u, y + 8 * u, 11 * u, COLORS.red).setStrokeStyle(2 * u, 0xffffff));
        this.tweens.add({ targets: bd, scale: 1.25, yoyo: true, repeat: -1, duration: 500 });
      }
      y += eh + gap;
    }

    const b = save.data.best;
    if (b.score > 0) {
      const st = save.data.stars;
      const line = `${tr('best')}: ${b.score.toLocaleString('ru-RU')}  ·  ${fmtTime(b.time)}` + (st.normal ? `  ·  ★${st.normal}/6` : '');
      L.add(txt(this, W / 2, Math.min(H - 22 * u, y + 22 * u), line, 19 * u, COLORS.cyan, { wrap: W * 0.95 }));
    }
  }

  // ---------- Праздничное событие ----------
  untilText(a) {
    const { day, month } = eventEndDate(a);
    return tr('evUntil').replace('{d}', day + ' ' + tr('months')[month]);
  }

  buildEvent() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const d = save.data;
    const a = activeEvent();
    if (!a) return this.go(null);
    const ev = a.ev;
    const es = eventState(a);
    const tab = this.evTab || 'tasks';
    this.topBar(false);
    const land = W > H * 1.2;
    this.title(tr('ev_' + ev.id).toUpperCase(), 40 * u + (land ? 0 : 50 * u), ev.color);
    const top = (land ? 80 : 130) * u;
    const backY = H - 46 * u;
    const gap = 8 * u;
    const colW = land ? Math.min(W * 0.55, 620 * u) : Math.min(W * 0.94, 600 * u);
    const rw = land ? Math.min(W * 0.36, 460 * u) : colW;
    const x0 = (W - colW - 30 * u - rw) / 2;
    const lx = land ? x0 + colW / 2 : W / 2;
    const rx = land ? x0 + colW + 30 * u + rw / 2 : W / 2;
    const pY = land ? backY - 140 * u : backY - 92 * u;
    // срок события и сколько праздничной валюты на руках
    let y = top;
    L.add(txt(this, lx - colW / 2, y, this.untilText(a), 19 * u, 0xd8d4ff, { glow: false, ox: 0 }));
    const balT = L.add(txt(this, lx + colW / 2, y, tr('evHave').replace('{n}', es.bal), 24 * u, ev.color, { ox: 1 }));
    L.add(this.add.image(balT.x - balT.width - 22 * u, y, 'ic_ev_' + ev.id).setDisplaySize(36 * u, 36 * u));
    y += 34 * u;
    // вкладки: задания и магазин
    const tw = (colW - gap) / 2;
    const th0 = 48 * u;
    [['tasks', 'evTabTasks'], ['shop', 'evTabShop']].forEach(([id, key], k) => {
      const on = tab === id;
      const badge = id === 'tasks' ? eventTasks(a).some((t) => t.ready) : EVENT_SHOP.some((it) => shopItem(a, it).can);
      const bx = lx - colW / 2 + tw / 2 + k * (tw + gap);
      L.add(
        button(this, {
          x: bx,
          y: y + th0 / 2,
          w: tw,
          h: th0,
          label: tr(key),
          size: 20 * u,
          color: on ? ev.color : 0x8a84b8,
          fillStrong: on,
          onClick: () => {
            this.evTab = id;
            this.layout();
          },
        })
      );
      if (badge && !on) L.add(this.add.circle(bx + tw / 2 - 8 * u, y + 6 * u, 9 * u, COLORS.red).setStrokeStyle(2 * u, 0xffffff));
    });
    y += th0 + gap * 1.5;
    const listBottom = land ? backY - 30 * u : pY - 60 * u;
    const end = tab === 'tasks' ? this.evTasksList(a, lx, y, colW, listBottom - y, gap) : this.evShopList(a, lx, y, colW, listBottom - y, gap);
    // подсказка: в горизонтальном виде справа, на телефоне под списком, если хватает места
    if (land) L.add(txt(this, rx, top + 10 * u, tr('evHint'), 17 * u, 0xd8d4ff, { glow: false, wrap: rw * 0.95, oy: 0 }));
    else {
      const hint = L.add(txt(this, W / 2, end + 10 * u, tr('evHint'), 16 * u, 0xd8d4ff, { glow: false, wrap: colW * 0.95, oy: 0 }));
      if (hint.y + hint.height > pY - 46 * u) hint.setVisible(false);
    }
    L.add(
      button(this, {
        x: rx,
        y: pY,
        w: Math.min(rw * 0.95, 460 * u),
        h: 70 * u,
        label: tr('evPlay'),
        size: 28 * u,
        color: COLORS.green,
        fillStrong: true,
        onClick: () => {
          const hero = d.sel.hero && meta.heroUnlocked(meta.hero(d.sel.hero)) ? d.sel.hero : 'h_neon';
          this.startRun({ modeId: 'event', hero, arena: ev.arena });
        },
      })
    );
    L.add(txt(this, rx, pY + 48 * u, tr('evPlayD').replace('{a}', tr(ev.arena)), 16 * u, 0xb8b0e0, { glow: false, wrap: rw }));
    this.backBtn(backY);
  }

  // задания праздника: награда — праздничная валюта
  evTasksList(a, lx, y, colW, avail, gap) {
    const u = uiScale(this);
    const L = this.L;
    const ev = a.ev;
    const tasks = eventTasks(a);
    const th = Math.min(66 * u, avail / tasks.length - gap);
    const fs = Math.min(18 * u, th * 0.3);
    tasks.forEach((t) => {
      const cy = y + th / 2;
      const done = t.done;
      L.add(panelGfx(this, lx, cy, colW, th, done ? COLORS.green : t.ready ? COLORS.yellow : ev.color, { radius: 12 * u, tintAlpha: t.ready ? 0.18 : 0.07 }));
      const n = t.k === 'time' ? t.n / 60 : t.n;
      const name = tr('evT_' + t.k).replace('{n}', n);
      const prog = t.k === 'time' ? Math.floor(t.cur / 60) + '/' + n : t.cur + '/' + t.n;
      const left = lx - colW / 2 + 14 * u;
      const bw = 124 * u;
      L.add(txt(this, left, cy - th * 0.2, name, fs, 0xffffff, { ox: 0, wrap: colW - bw - 30 * u, glow: false, align: 'left' }));
      L.add(txt(this, left, cy + th * 0.24, prog, fs * 0.88, done ? COLORS.green : 0xb8b0e0, { ox: 0, glow: false }));
      const bx = lx + colW / 2 - bw / 2 - 8 * u;
      if (done) L.add(this.add.image(bx, cy, 'ic_check').setDisplaySize(th * 0.55, th * 0.55));
      else if (t.ready)
        L.add(
          button(this, {
            x: bx,
            y: cy,
            w: bw,
            h: Math.min(50 * u, th * 0.8),
            label: '+' + t.r,
            icon: 'ev_' + ev.id,
            size: 19 * u,
            color: COLORS.green,
            fillStrong: true,
            onClick: () => {
              if (claimEventTask(a, t.i) !== null) {
                audio.play('buy');
                this.layout();
              }
            },
          })
        );
      else {
        L.add(this.add.image(bx - 22 * u, cy, 'ic_ev_' + ev.id).setDisplaySize(th * 0.5, th * 0.5));
        L.add(txt(this, bx + 2 * u, cy, '+' + t.r, 19 * u, ev.color, { ox: 0, glow: false }));
      }
      y += th + gap;
    });
    return y;
  }

  // магазин праздника: каждый товар подписан, что это такое и что даёт
  evShopList(a, lx, y, colW, avail, gap) {
    const u = uiScale(this);
    const L = this.L;
    const d = save.data;
    const ev = a.ev;
    const th = Math.min(118 * u, avail / EVENT_SHOP.length - gap);
    EVENT_SHOP.forEach((it0) => {
      const it = shopItem(a, it0);
      const cy = y + th / 2;
      L.add(panelGfx(this, lx, cy, colW, th, it.owned ? COLORS.green : ev.color, { radius: 12 * u, tintAlpha: it.can ? 0.14 : 0.07 }));
      const ic = it.id === 'skin' ? 'ic_' + ev.skin : it.id === 'chest' ? 'ic_chest' : 'ic_crystal';
      const isz = Math.min(64 * u, th * 0.6);
      const left = lx - colW / 2 + 12 * u;
      L.add(this.add.image(left + isz / 2, cy, ic).setDisplaySize(isz, isz));
      const bw = 118 * u;
      const tx = left + isz + 12 * u;
      const tw = colW - isz - bw - 46 * u;
      const tag = L.add(txt(this, tx, y + 8 * u, tr('shopTag_' + it.id), 14 * u, ev.color, { ox: 0, oy: 0, glow: false }));
      const nm = tr('shopName_' + it.id).replace('{s}', tr(ev.skin)).replace('{n}', it.crystals || 0);
      const name = L.add(txt(this, tx, tag.y + tag.height + 2 * u, nm, 19 * u, 0xffffff, { ox: 0, oy: 0, glow: false, wrap: tw, align: 'left' }));
      const desc = tr('shopDesc_' + it.id).replace('{n}', d.startChest || 0).replace('{m}', it.max || 0);
      L.add(txt(this, tx, name.y + name.height + 3 * u, desc, Math.min(14 * u, th * 0.13), 0xb8b0e0, { ox: 0, oy: 0, glow: false, wrap: tw, align: 'left' }));
      const bx = lx + colW / 2 - bw / 2 - 10 * u;
      const bh = Math.min(50 * u, th * 0.45);
      if (it.owned) {
        // облик уже куплен: можно надеть или снять
        const on = d.skin === ev.skin;
        L.add(
          button(this, {
            x: bx,
            y: cy,
            w: bw,
            h: bh,
            label: on ? tr('skinOn') : tr('skinPut'),
            size: 16 * u,
            color: on ? COLORS.green : 0x8a84b8,
            fillStrong: on,
            onClick: () => {
              d.skin = on ? null : ev.skin;
              save.write(false);
              this.layout();
            },
          })
        );
      } else if (it.full) L.add(txt(this, bx, cy, tr('shopFull'), 15 * u, 0xb8b0e0, { glow: false, wrap: bw }));
      else
        L.add(
          button(this, {
            x: bx,
            y: cy,
            w: bw,
            h: bh,
            label: String(it.price),
            icon: 'ev_' + ev.id,
            size: 20 * u,
            color: it.can ? COLORS.green : 0x8a84b8,
            fillStrong: it.can,
            disabled: !it.can,
            onClick: () => {
              if (buyEventItem(a, it.id)) {
                audio.play('buy');
                this.layout();
              }
            },
          })
        );
      y += th + gap;
    });
    return y;
  }

  // ---------- Кампания: 12 коротких уровней со звёздами ----------
  campOpen(i) {
    const c = save.data.camp || {};
    return i === 0 || (c[i - 1] || 0) > 0;
  }

  startCamp(i) {
    const d = save.data;
    const hero = d.sel.hero && meta.heroUnlocked(meta.hero(d.sel.hero)) ? d.sel.hero : 'h_neon';
    this.startRun({ modeId: 'campaign', level: i, hero, arena: CAMPAIGN[i].arena });
  }

  buildCamp() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const d = save.data;
    const cs = d.camp || {};
    this.topBar(false);
    const land = W > H * 1.2;
    const total = Object.values(cs).reduce((a, b) => a + b, 0);
    this.title(tr('campTitle'), 40 * u + (land ? 0 : 50 * u));
    L.add(txt(this, W - 20 * u, 40 * u + (land ? 0 : 50 * u), '★ ' + total + '/' + CAMPAIGN.length * 3, 24 * u, COLORS.yellow, { ox: 1 }));
    if (this.campSel === undefined || !this.campOpen(this.campSel)) {
      // по умолчанию — первый непройденный открытый уровень
      let s = 0;
      while (s + 1 < CAMPAIGN.length && this.campOpen(s + 1) && cs[s]) s++;
      this.campSel = s;
    }
    const sel = this.campSel;
    const top = (land ? 80 : 130) * u;
    const backY = H - 46 * u;
    const gap = 10 * u;
    // сетка уровней
    const cols = 4;
    const rowsN = Math.ceil(CAMPAIGN.length / cols);
    const gx0 = land ? W * 0.03 : W * 0.03;
    const gw = land ? W * 0.56 : W * 0.94;
    const detH = land ? 0 : 200 * u;
    const btnH = land ? 0 : 150 * u;
    const gh = (land ? backY - 40 * u : backY - 40 * u - btnH - detH) - top;
    const cw = (gw - (cols - 1) * gap) / cols;
    const ch = Math.min(cw * 1.05, (gh - (rowsN - 1) * gap) / rowsN);
    CAMPAIGN.forEach((c, i) => {
      const cx = gx0 + cw / 2 + (i % cols) * (cw + gap);
      const cy = top + ch / 2 + Math.floor(i / cols) * (ch + gap);
      const open = this.campOpen(i);
      const st = cs[i] || 0;
      const col = !open ? 0x555577 : i === sel ? COLORS.yellow : st ? COLORS.green : COLORS.cyan;
      L.add(panelGfx(this, cx, cy, cw, ch, col, { radius: 12 * u, tintAlpha: i === sel ? 0.2 : 0.08, lineWidth: i === sel ? 3 : 2 }));
      if (open) {
        L.add(txt(this, cx, cy - ch * 0.12, String(i + 1), Math.min(ch * 0.42, 40 * u), 0xffffff, { glowColor: col }));
        L.add(txt(this, cx, cy + ch * 0.27, '★'.repeat(st) + '☆'.repeat(3 - st), Math.min(ch * 0.22, 22 * u), st ? COLORS.yellow : 0x8a84b8, { glow: false }));
      } else L.add(this.add.image(cx, cy, 'ic_lock').setDisplaySize(ch * 0.4, ch * 0.4).setAlpha(0.6));
      const z = L.add(this.add.zone(cx, cy, cw, ch).setInteractive({ useHandCursor: open }));
      z.on('pointerup', () => {
        if (!open) return;
        audio.play('click');
        this.campSel = i;
        this.layout();
      });
    });
    // описание выбранного уровня
    const c = CAMPAIGN[sel];
    const dx = land ? W * 0.79 : W / 2;
    const dw = land ? W * 0.38 : W * 0.94;
    const dTop = land ? top : top + rowsN * (ch + gap) + 4 * u;
    const dH = land ? backY - 40 * u - top - 2 * (70 * u + gap) - gap : detH;
    L.add(panelGfx(this, dx, dTop + dH / 2, dw, dH, COLORS.purple, { radius: 14 * u, tintAlpha: 0.08 }));
    const k = land ? 1.3 : 1.45;
    const lines = [
      [tr('campLevel').replace('{n}', sel + 1) + ' · ' + tr(c.arena) + (c.mut ? ' · ' + tr(c.mut) : ''), 0xffffff, 20],
      [tr('gl_survive').replace('{t}', fmtTime(c.win)), COLORS.cyan, 18],
      ...c.goals.map(([type, n]) => ['★ ' + goalLong(type, n), COLORS.yellow, 17]),
    ];
    const lh = Math.min(dH / (lines.length + 0.4), 40 * u * k);
    const ly0 = dTop + (dH - lh * lines.length) / 2 + lh / 2;
    lines.forEach(([s, col, sz], i) => L.add(txt(this, dx, ly0 + lh * i, s, sz * u * k, col, { wrap: dw * 0.92, glow: i === 0 })));
    // кнопки
    const bw = land ? dw : Math.min(W * 0.8, 420 * u);
    const sY = dTop + dH + gap + 35 * u;
    L.add(button(this, { x: dx, y: sY, w: bw, h: 70 * u, label: tr('start'), size: 34 * u, color: COLORS.green, fillStrong: true, onClick: () => this.startCamp(sel) }));
    L.add(button(this, { x: dx, y: sY + 70 * u + gap, w: bw * 0.8, h: 56 * u, label: tr('campFree'), size: 22 * u, color: COLORS.cyan, onClick: () => this.go('prep') }));
    this.backBtn(backY);
  }

  // ---------- Подготовка к забегу: герой, арена, сложность ----------
  diffList() {
    const d = save.data;
    const list = [{ id: 'quick' }, { id: 'calm' }, { id: 'normal' }];
    for (let k = 1; k <= MAX_THREAT; k++) list.push({ id: 't' + k, k, locked: k === 1 ? !d.hardUnlocked : (d.threatWon || 0) < k - 1 });
    return list;
  }

  buildPrep() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const d = save.data;
    this.topBar(false);
    const land = W > H * 1.2;
    this.title(tr('prepTitle'), 40 * u + (land ? 0 : 50 * u));

    const heroI = Math.max(0, HEROES.findIndex((h) => h.id === d.sel.hero));
    const arenaI = Math.max(0, ARENAS.findIndex((a) => a.id === d.sel.arena));
    const diffs = this.diffList();
    const diffI = Math.max(0, diffs.findIndex((x) => x.id === d.sel.diff));
    const hero = HEROES[heroI];
    const arena = ARENAS[arenaI];
    const diff = diffs[diffI];
    const heroOk = meta.heroUnlocked(hero);
    const arenaOk = meta.arenaUnlocked(arena);
    const diffOk = !diff.locked;

    const sel = (key, list, i, dir) => {
      d.sel[key] = list[(i + dir + list.length) % list.length].id;
      save.write(false);
      this.layout();
    };

    const cards = [];
    // герой
    cards.push({
      head: tr('hero'),
      icon: hero.id,
      name: tr(hero.id),
      desc: tr(hero.id + '_d'),
      lock: heroOk ? null : tr('unlockBy') + ' ' + tr('a_' + hero.ach),
      buy: heroOk ? null : hero,
      color: hero.color,
      prev: () => sel('hero', HEROES, heroI, -1),
      next: () => sel('hero', HEROES, heroI, 1),
      idx: heroI,
      n: HEROES.length,
    });
    cards.push({
      head: tr('arena'),
      icon: arena.id,
      name: tr(arena.id),
      desc: tr(arena.id + '_d'),
      lock: arenaOk ? null : tr('unlockBy') + ' ' + tr('a_' + arena.ach),
      color: arena.grid,
      prev: () => sel('arena', ARENAS, arenaI, -1),
      next: () => sel('arena', ARENAS, arenaI, 1),
      idx: arenaI,
      n: ARENAS.length,
    });
    const dk = diff.k;
    let ddesc = dk ? tr('d_threat_d').replace('{r}', (1 + 0.5 * dk).toFixed(1).replace('.0', '')) : tr('d_' + diff.id + '_d');
    if (dk && d.bestThreat[dk]) ddesc += '\n' + tr('best') + ': ' + fmtTime(d.bestThreat[dk]);
    else if (!dk && d.stars[diff.id]) ddesc += '\n' + tr('stars') + ': ' + '★'.repeat(d.stars[diff.id]) + '☆'.repeat(MODES[diff.id].stars.length - d.stars[diff.id]);
    cards.push({
      head: tr('difficulty'),
      icon: dk ? 'threat' : diff.id === 'quick' ? 'play' : diff.id,
      name: dk ? tr('threatTag') + ' ' + dk : tr('d_' + diff.id),
      desc: ddesc,
      lock: diffOk ? null : dk === 1 ? tr('lockThreat1') : tr('lockThreatN').replace('{n}', dk - 1),
      color: dk ? COLORS.red : diff.id === 'calm' || diff.id === 'quick' ? COLORS.green : COLORS.cyan,
      prev: () => sel('diff', diffs, diffI, -1),
      next: () => sel('diff', diffs, diffI, 1),
      idx: diffI,
      n: diffs.length,
    });

    const top = (land ? 80 : 130) * u;
    const bottomH = 190 * u; // место под «Старт» и «Назад», чтобы кнопка не наезжала на карточки
    const gap = 14 * u;
    const availH = H - top - bottomH;
    let cw, ch;
    if (land) {
      cw = Math.min((W * 0.96 - 2 * gap) / 3, 400 * u);
      ch = Math.min(availH, 380 * u);
    } else {
      cw = Math.min(W * 0.94, 620 * u);
      ch = Math.min((availH - 2 * gap) / 3, 300 * u);
    }
    cards.forEach((c, i) => {
      const cx = land ? W / 2 + (i - 1) * (cw + gap) : W / 2;
      const cy = land ? top + ch / 2 : top + ch / 2 + i * (ch + gap);
      L.add(panelGfx(this, cx, cy, cw, ch, c.color, { radius: 16 * u, tintAlpha: 0.08 }));
      const is = Math.min(land ? ch * 0.3 : ch * 0.5, 110 * u);
      const arrow = 52 * u;
      // заголовок секции и номер варианта
      const hy = cy - ch / 2 + 22 * u;
      L.add(txt(this, cx, hy, c.head + '  ' + (c.idx + 1) + '/' + c.n, 17 * u, 0xb8b0e0, { glow: false }));
      let ix, iy, tx, ty, tw, align;
      if (land) {
        ix = cx;
        iy = cy - ch * 0.17;
        tx = cx;
        ty = iy + is / 2 + 26 * u;
        tw = cw * 0.86;
        align = 0.5;
      } else {
        ix = cx - cw / 2 + arrow + 12 * u + is / 2;
        iy = cy + 10 * u;
        tx = ix + is / 2 + 16 * u;
        ty = cy - ch * 0.12;
        tw = cw / 2 - (tx - cx) - arrow - 10 * u;
        align = 0;
      }
      const im = L.add(this.add.image(ix, iy, 'ic_' + c.icon).setDisplaySize(is, is));
      if (c.lock) {
        im.setAlpha(0.35);
        L.add(this.add.image(ix, iy, 'ic_lock').setDisplaySize(is * 0.55, is * 0.55));
      }
      const k = land ? 1 : 1.25;
      L.add(txt(this, tx, ty, c.name, 24 * u * k, 0xffffff, { ox: align, glowColor: c.color, wrap: tw }));
      const dt = L.add(txt(this, tx, ty + (land ? 34 : 34) * u, c.desc, 17 * u * k, 0xd8d4ff, { ox: align, oy: 0, wrap: tw, glow: false, align: align ? 'center' : 'left' }));
      if (c.lock) L.add(txt(this, tx, dt.y + dt.height + 4 * u, c.lock, 16 * u * k, COLORS.yellow, { ox: align, oy: 0, wrap: tw, glow: false, align: align ? 'center' : 'left' }));
      if (c.buy) {
        const can = d.crystals >= c.buy.cost;
        L.add(
          button(this, {
            x: land ? cx : cx + cw / 2 - 150 * u,
            y: land ? cy + ch / 2 - 34 * u : cy - ch / 2 + 26 * u,
            w: 160 * u,
            h: 46 * u,
            label: String(c.buy.cost),
            icon: 'crystal',
            size: 20 * u,
            color: can ? COLORS.green : 0x555577,
            disabled: !can,
            onClick: () => {
              if (meta.buyHero(c.buy)) {
                audio.play('buy');
                this.layout();
              }
            },
          })
        );
      }
      // стрелки выбора
      const ay = land ? iy : cy;
      L.add(button(this, { x: cx - cw / 2 + arrow / 2 + 8 * u, y: ay, w: arrow, h: arrow * 1.4, icon: 'arrowL', iconSize: arrow * 0.8, color: COLORS.cyan, onClick: c.prev }));
      L.add(button(this, { x: cx + cw / 2 - arrow / 2 - 8 * u, y: ay, w: arrow, h: arrow * 1.4, icon: 'arrowR', iconSize: arrow * 0.8, color: COLORS.cyan, onClick: c.next }));
    });

    const ok = heroOk && arenaOk && diffOk;
    const by = H - 136 * u;
    L.add(
      button(this, {
        x: W / 2,
        y: by,
        w: Math.min(W * 0.8, 420 * u),
        h: 84 * u,
        label: ok ? tr('start') : tr('locked'),
        size: 38 * u,
        color: ok ? COLORS.green : 0x555577,
        fillStrong: ok,
        disabled: !ok,
        onClick: () => this.startRun({ modeId: dk ? 'threat' : diff.id, threat: dk || 0, hero: hero.id, arena: arena.id }),
      })
    );
    this.backBtn(H - 46 * u);
  }

  // ---------- Достижения и справочник эволюций ----------
  buildAch() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const d = save.data;
    this.topBar(false);
    const land = W > H * 1.2;
    const tab = this.tab || 'ach';
    const got = ACHIEVEMENTS.filter((a) => d.ach[a.id]).length;
    const evoGot = Object.keys(EVOLVE).filter((w) => d.stats.evos[w]).length;
    const tw = Math.min(W * 0.44, 280 * u);
    const ty = (land ? 40 : 96) * u;
    [
      ['ach', tr('m_achievements') + ' ' + got + '/' + ACHIEVEMENTS.length, COLORS.yellow],
      ['evo', tr('evoBook') + ' ' + evoGot + '/8', COLORS.pink],
    ].forEach(([id, label, col], i) => {
      const b = L.add(
        button(this, {
          x: W / 2 + (i - 0.5) * (tw + 12 * u),
          y: ty,
          w: tw,
          h: 54 * u,
          label,
          size: 19 * u,
          color: col,
          fillStrong: tab === id,
          onClick: () => {
            this.tab = id;
            this.page = 0;
            this.layout();
          },
        })
      );
      if (tab !== id) b.c.setAlpha(0.6);
    });

    const items =
      tab === 'ach'
        ? ACHIEVEMENTS.map((a) => ({ icon: a.icon, on: !!d.ach[a.id], name: tr('a_' + a.id), desc: tr('a_' + a.id + '_d'), r: a.r }))
        : Object.entries(EVOLVE).map(([w, ev]) => {
            const on = !!d.stats.evos[w];
            return { icon: ev.id, on, name: on ? tr(ev.id) : '???', desc: tr('w_' + w) + ' ' + tr('lvl') + ' 8 + ' + tr('p_' + ev.pass) + (on ? '\n' + tr(ev.id + '_d') : ''), r: 0 };
          });
    const cols = land ? 4 : 2;
    const rows = land ? 2 : 4;
    const per = cols * rows;
    const pages = Math.ceil(items.length / per);
    this.page = Math.min(this.page || 0, pages - 1);
    const top = ty + 44 * u;
    const bottom = 150 * u;
    const gap = 12 * u;
    const gw = Math.min(W * 0.96, 1100 * u);
    const cw = (gw - (cols - 1) * gap) / cols;
    const ch = Math.min((H - top - bottom - (rows - 1) * gap) / rows, (land ? 200 : 270) * u);
    const k = land ? 1 : 1.22;
    const y0 = top + (H - top - bottom - (rows * ch + (rows - 1) * gap)) / 2;
    items.slice(this.page * per, this.page * per + per).forEach((it, i) => {
      const cx = W / 2 - gw / 2 + cw / 2 + (i % cols) * (cw + gap);
      const cy = y0 + ch / 2 + Math.floor(i / cols) * (ch + gap);
      const col = it.on ? (tab === 'ach' ? COLORS.yellow : COLORS.pink) : 0x555577;
      L.add(panelGfx(this, cx, cy, cw, ch, col, { radius: 14 * u, tintAlpha: it.on ? 0.12 : 0.04, lineWidth: 2 }));
      const is = Math.min(ch * 0.42, 64 * u);
      const ix = cx - cw / 2 + is / 2 + 12 * u;
      const im = L.add(this.add.image(ix, cy - ch / 2 + is / 2 + 12 * u, 'ic_' + it.icon).setDisplaySize(is, is));
      if (!it.on) im.setAlpha(0.3);
      if (it.on && tab === 'ach') L.add(this.add.image(cx + cw / 2 - 22 * u, cy - ch / 2 + 22 * u, 'ic_check').setDisplaySize(30 * u, 30 * u));
      const tx = ix + is / 2 + 10 * u;
      L.add(txt(this, tx, cy - ch / 2 + is / 2 + 12 * u, it.name, 18 * u * k, it.on ? 0xffffff : 0xb8b0e0, { ox: 0, wrap: cx + cw / 2 - tx - 34 * u, glow: it.on, glowColor: col }));
      L.add(txt(this, cx - cw / 2 + 12 * u, cy - ch / 2 + is + 22 * u, it.desc, 15 * u * k, 0xd8d4ff, { ox: 0, oy: 0, wrap: cw - 24 * u, glow: false, align: 'left' }));
      if (it.r) {
        const rt = L.add(txt(this, cx + cw / 2 - 40 * u, cy + ch / 2 - 18 * u, '+' + it.r, 16 * u, it.on ? 0x8a84b8 : COLORS.purple, { ox: 1, glow: false }));
        L.add(this.add.image(rt.x + 14 * u, rt.y, 'ic_crystal').setDisplaySize(22 * u, 22 * u).setAlpha(it.on ? 0.5 : 1));
      }
    });
    if (pages > 1) {
      const py = H - bottom + 40 * u;
      L.add(txt(this, W / 2, py, this.page + 1 + ' / ' + pages, 20 * u, COLORS.cyan));
      L.add(button(this, { x: W / 2 - 110 * u, y: py, w: 64 * u, h: 52 * u, icon: 'arrowL', iconSize: 40 * u, color: COLORS.cyan, onClick: () => ((this.page = (this.page - 1 + pages) % pages), this.layout()) }));
      L.add(button(this, { x: W / 2 + 110 * u, y: py, w: 64 * u, h: 52 * u, icon: 'arrowR', iconSize: 40 * u, color: COLORS.cyan, onClick: () => ((this.page = (this.page + 1) % pages), this.layout()) }));
    }
    this.backBtn(H - 40 * u);
  }

  // ---------- Ежедневно: награда за вход и три задания ----------
  buildDaily() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const dd = meta.ensureDay();
    this.topBar(false);
    const land = W > H * 1.2;
    this.title(tr('m_daily'), 40 * u + (land ? 0 : 50 * u), COLORS.pink);
    const top = (land ? 80 : 130) * u;
    const bottom = 100 * u;
    const gap = 14 * u;
    const availH = H - top - bottom;
    const rw = land ? Math.min(W * 0.3, 340 * u) : Math.min(W * 0.94, 600 * u);
    const rh = land ? Math.min(availH, 400 * u) : Math.min(availH * 0.36, 320 * u);
    const rx = land ? W / 2 - (Math.min(W * 0.94, 1000 * u)) / 2 + rw / 2 : W / 2;
    const ry = top + rh / 2;
    // награда дня
    L.add(panelGfx(this, rx, ry, rw, rh, COLORS.pink, { radius: 16 * u, tintAlpha: 0.1 }));
    const { amount, streak } = meta.rewardAmount();
    const gi = L.add(this.add.image(rx, ry - rh * 0.22, 'ic_gift').setDisplaySize(Math.min(rh * 0.34, 110 * u), Math.min(rh * 0.34, 110 * u)));
    if (!dd.claimed) this.tweens.add({ targets: gi, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 300 });
    L.add(txt(this, rx, ry + rh * 0.02, tr('dayReward') + ': +' + amount, 22 * u, COLORS.yellow, { wrap: rw * 0.9 }));
    L.add(txt(this, rx, ry + rh * 0.13, tr('streak') + ': ' + (dd.claimed ? dd.streak : streak), 17 * u, 0xd8d4ff, { glow: false, wrap: rw * 0.9 }));
    const bw = rw * 0.84;
    if (!dd.claimed) {
      L.add(button(this, { x: rx, y: ry + rh * 0.32, w: bw, h: 56 * u, label: tr('take'), color: COLORS.green, fillStrong: true, size: 24 * u, onClick: () => { meta.claimDaily(false); audio.play('buy'); this.layout(); } }));
    } else if (!dd.adClaimed) {
      L.add(
        button(this, {
          x: rx,
          y: ry + rh * 0.32,
          w: bw,
          h: 56 * u,
          label: '+' + amount,
          icon: 'ad',
          color: COLORS.yellow,
          size: 22 * u,
          onClick: () => {
            audio.suspend('ad');
            sdk.showRewarded(null, (ok) => {
              audio.resume('ad');
              if (ok) {
                meta.claimDaily(true);
                audio.play('buy');
              }
              this.layout();
            });
          },
        })
      );
    } else L.add(txt(this, rx, ry + rh * 0.32, tr('comeTomorrow'), 18 * u, COLORS.cyan, { wrap: rw * 0.9 }));

    // задания
    const qs = meta.quests();
    const qx0 = land ? rx + rw / 2 + gap : W / 2 - rw / 2;
    const qw = land ? Math.min(W * 0.94, 1000 * u) - rw - gap : rw;
    const qtop = land ? top : top + rh + gap;
    const qh = Math.min((land ? availH : availH - rh - gap) / 3 - gap * 0.66, (land ? 130 : 170) * u);
    const k = land ? 1 : 1.2;
    qs.forEach((q, i) => {
      const cx = qx0 + qw / 2;
      const cy = qtop + qh / 2 + i * (qh + gap);
      const col = q.done ? 0x555577 : q.ready ? COLORS.green : COLORS.cyan;
      L.add(panelGfx(this, cx, cy, qw, qh, col, { radius: 14 * u, tintAlpha: 0.08, lineWidth: 2 }));
      const n = q.k === 'maxTime' ? fmtTime(q.n) : q.n;
      L.add(txt(this, qx0 + 18 * u, cy - qh * 0.2, tr(q.id).replace('{n}', n), 19 * u * k, 0xffffff, { ox: 0, glowColor: col, wrap: qw * 0.6 }));
      // полоса прогресса
      const pw = qw * 0.55;
      const pg = this.add.graphics();
      pg.fillStyle(0x2a2448, 1).fillRoundedRect(qx0 + 18 * u, cy + qh * 0.12, pw, 12 * u, 6 * u);
      pg.fillStyle(col, 1).fillRoundedRect(qx0 + 18 * u, cy + qh * 0.12, Math.max(12 * u, (pw * q.cur) / q.n), 12 * u, 6 * u);
      L.add(pg);
      const cur = q.k === 'maxTime' ? fmtTime(q.cur) + ' / ' + fmtTime(q.n) : q.cur + ' / ' + q.n;
      L.add(txt(this, qx0 + 18 * u + pw / 2, cy + qh * 0.12 + 28 * u, cur, 15 * u * k, 0xd8d4ff, { glow: false }));
      const bx = qx0 + qw - 90 * u;
      if (q.done) L.add(this.add.image(bx, cy, 'ic_check').setDisplaySize(48 * u, 48 * u));
      else
        L.add(
          button(this, {
            x: bx,
            y: cy,
            w: 150 * u,
            h: 52 * u,
            label: '+' + q.r,
            icon: 'crystal',
            size: 20 * u,
            color: q.ready ? COLORS.green : 0x555577,
            fillStrong: q.ready,
            disabled: !q.ready,
            onClick: () => {
              if (meta.claimQuest(i)) audio.play('buy');
              this.layout();
            },
          })
        );
    });
    this.backBtn(H - 46 * u);
  }

  // ---------- Испытание дня ----------
  buildChallenge() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const c = meta.dailyChallenge();
    this.topBar(false);
    const land = W > H * 1.2;
    this.title(tr('m_challenge'), 40 * u + (land ? 0 : 50 * u), COLORS.green);
    const pw = Math.min(W * 0.94, 760 * u);
    const top = (land ? 80 : 130) * u;
    const ph = Math.min(H - top - 200 * u, (land ? 380 : 560) * u);
    const cy = top + ph / 2;
    const k = land ? 1 : 1.2;
    L.add(panelGfx(this, W / 2, cy, pw, ph, COLORS.green, { radius: 16 * u, tintAlpha: 0.08 }));
    L.add(txt(this, W / 2, cy - ph / 2 + 30 * u, tr('challengeDesc'), 19 * u * k, 0xd8d4ff, { wrap: pw * 0.9, glow: false }));
    const rows = [
      [c.hero.id, tr('hero') + ': ' + tr(c.hero.id)],
      [c.arena.id, tr('arena') + ': ' + tr(c.arena.id)],
      [MUT_ICON[c.mut], tr(c.mut) + ': ' + tr(c.mut + '_d')],
    ];
    const rh = Math.min((ph - 120 * u) / 3, (land ? 64 : 110) * u);
    rows.forEach(([ic, t], i) => {
      const y = cy - ph / 2 + 74 * u + rh / 2 + i * rh;
      L.add(this.add.image(W / 2 - pw / 2 + 50 * u, y, 'ic_' + ic).setDisplaySize(rh * 0.85, rh * 0.85));
      L.add(txt(this, W / 2 - pw / 2 + 50 * u + rh * 0.6, y, t, 20 * u * k, 0xffffff, { ox: 0, wrap: pw - rh - 80 * u, glowColor: COLORS.green }));
    });
    const info = (c.won ? tr('challengeWon') : tr('challengeReward')) + (c.best ? '   ·   ' + tr('best') + ': ' + c.best.toLocaleString('ru-RU') : '');
    L.add(txt(this, W / 2, cy + ph / 2 - 30 * u, info, 18 * u * k, c.won ? COLORS.green : COLORS.yellow, { wrap: pw * 0.92 }));
    L.add(
      button(this, {
        x: W / 2,
        y: H - 140 * u,
        w: Math.min(W * 0.8, 420 * u),
        h: 80 * u,
        label: tr('start'),
        size: 36 * u,
        color: COLORS.green,
        fillStrong: true,
        onClick: () => this.startRun({ modeId: 'daily', hero: c.hero.id, arena: c.arena.id, mut: c.mut }),
      })
    );
    this.backBtn(H - 46 * u);
  }

  // ---------- Бой с боссами ----------
  buildRush() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const d = save.data;
    this.topBar(false);
    const land = W > H * 1.2;
    this.title(tr('m_rush'), 40 * u + (land ? 0 : 50 * u), COLORS.red);
    const open = meta.rushUnlocked();
    const pw = Math.min(W * 0.94, 760 * u);
    const top = (land ? 80 : 130) * u;
    const ph = Math.min(H - top - 200 * u, (land ? 340 : 420) * u);
    const cy = top + ph / 2;
    L.add(panelGfx(this, W / 2, cy, pw, ph, COLORS.red, { radius: 16 * u, tintAlpha: 0.08 }));
    const k = land ? 1 : 1.25;
    L.add(txt(this, W / 2, cy - ph * 0.3, open ? tr('rushDesc') : tr('rushLocked'), 20 * u * k, 0xffffff, { wrap: pw * 0.9, glowColor: COLORS.red }));
    // пять боссов: побеждённые светятся
    const bosses = ['boss', 'pulsar', 'hive', 'serpent', 'mirror'];
    const s = Math.min(pw / 6.5, 90 * u);
    bosses.forEach((b, i) => {
      const x = W / 2 + (i - 2) * (s + 14 * u);
      const done = d.stats.bosses[b];
      const im = L.add(this.add.image(x, cy + ph * 0.05, 'e_' + b).setDisplaySize(s, s));
      if (!done) im.setAlpha(0.25);
      L.add(txt(this, x, cy + ph * 0.05 + s * 0.68, tr('bn_' + b), 14 * u * k, done ? 0xffffff : 0x8a84b8, { glow: false, wrap: s + 12 * u }));
    });
    if (d.rushBest) L.add(txt(this, W / 2, cy + ph / 2 - 28 * u, tr('best') + ': ' + d.rushBest + '/' + RUSH_BOSSES, 19 * u, COLORS.yellow));
    L.add(
      button(this, {
        x: W / 2,
        y: H - 140 * u,
        w: Math.min(W * 0.8, 420 * u),
        h: 80 * u,
        label: open ? tr('start') : tr('locked'),
        size: 36 * u,
        color: open ? COLORS.red : 0x555577,
        fillStrong: open,
        disabled: !open,
        onClick: () => this.startRun({ modeId: 'rush', hero: d.sel.hero && meta.heroUnlocked(meta.hero(d.sel.hero)) ? d.sel.hero : 'h_neon', arena: d.sel.arena && meta.arenaUnlocked(meta.arena(d.sel.arena)) ? d.sel.arena : 'a_grid' }),
      })
    );
    this.backBtn(H - 46 * u);
  }

  // ---------- Настройки ----------
  buildSettings() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const d = save.data;
    const st = d.settings;
    this.topBar(false);
    const land = W > H * 1.2;
    this.title(tr('settings'), land ? 40 * u : H * 0.1);
    const onOff = (v) => (v ? tr('on') : tr('off'));
    const rows = [
      [tr('volume') + ': ' + volPct('music') + ' / ' + volPct('sfx'), 'music', COLORS.cyan, () => openSound(() => this.layout())],
      [tr('reduceFx') + ': ' + onOff(d.reduceFx), 'gear', d.reduceFx ? COLORS.green : COLORS.purple, () => {
        d.reduceFx = !d.reduceFx;
        save.write(false);
        this.layout();
      }],
      [tr('bigText') + ': ' + onOff(st.bigText), 'quest', st.bigText ? COLORS.green : COLORS.purple, () => {
        st.bigText = !st.bigText;
        setTextScale(st.bigText ? 1.15 : 1);
        save.write(false);
        this.layout();
      }],
      // вибрацию показываем только там, где она работает
      sdk.canVibrate()
        ? [tr('vibro') + ': ' + onOff(st.vibro !== false), 'power', st.vibro !== false ? COLORS.green : COLORS.purple, () => {
            st.vibro = st.vibro === false;
            if (st.vibro) sdk.haptic('medium');
            save.write(false);
            this.layout();
          }]
        : null,
      [tr('easyMove') + ': ' + onOff(st.easyMove), 'swift', st.easyMove ? COLORS.green : COLORS.purple, () => {
        st.easyMove = !st.easyMove;
        save.write(false);
        this.layout();
      }],
      [tr('simpleHud') + ': ' + onOff(st.simpleHud), 'star', st.simpleHud ? COLORS.green : COLORS.purple, () => {
        st.simpleHud = !st.simpleHud;
        save.write(false);
        this.layout();
      }],
      [tr('tutAgain'), 'quest', COLORS.yellow, () => {
        d.tutorialDone = false;
        save.write(false);
        this.go(null);
      }],
    ];
    for (let i = rows.length - 1; i >= 0; i--) if (!rows[i]) rows.splice(i, 1);
    // облики героя с праздников: можно сменить и после окончания события
    const skins = Object.keys(SKINS).filter((k) => d.skins && d.skins[k]);
    if (skins.length) {
      const cur = skins.includes(d.skin) ? d.skin : null;
      rows.push([tr('skinLabel').replace('{s}', cur ? tr(cur) : tr('skinNone')), cur || 'hero', cur ? SKINS[cur].color : COLORS.purple, () => {
        const list = [null, ...skins];
        d.skin = list[(list.indexOf(cur) + 1) % list.length];
        save.write(false);
        this.layout();
      }]);
    }
    // в VK: пригласить друзей и добавить игру в избранное
    if (sdk.canSocial()) {
      rows.push([tr('invite'), 'hero', COLORS.pink, () => sdk.invite().then((ok) => ok && track('invite'))]);
      if (sdk.canFavorite()) rows.push([tr('favorite'), 'star', COLORS.yellow, () => sdk.addFavorite().then((ok) => ok && track('favorite'))]);
    }
    const cols = land && rows.length > 4 ? 2 : 1;
    const gap = 14 * u;
    const bw = cols === 2 ? Math.min(W * 0.45, 440 * u) : Math.min(W * 0.9, 520 * u);
    const top = land ? 90 * u : H * 0.2;
    const avail = H - 130 * u - top;
    const nr = Math.ceil(rows.length / cols);
    const bh = Math.min(66 * u, avail / nr - gap);
    rows.forEach(([label, icon, color, fn], i) => {
      const col = cols === 2 ? i % 2 : 0;
      const r = cols === 2 ? Math.floor(i / 2) : i;
      const x = cols === 2 ? W / 2 + (col ? 1 : -1) * (bw / 2 + gap / 2) : W / 2;
      L.add(button(this, { x, y: top + bh / 2 + r * (bh + gap), w: bw, h: bh, label, icon, size: 21 * u, iconSize: Math.min(40 * u, bh * 0.62), color, onClick: fn }));
    });
    L.add(txt(this, W / 2, H - 100 * u, tr('reduceFxHint'), 15 * u, 0x8a84b8, { glow: false, wrap: Math.min(W * 0.9, 700 * u) }));
    this.backBtn(H - 46 * u);
  }

  // ---------- Магазин ----------
  buildShop() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    this.topBar(false);
    const m = 16 * u;
    L.add(txt(this, W / 2, m + 24 * u + (W < 900 * u ? 56 * u : 0), tr('shopTitle'), 34 * u, COLORS.cyan));

    // бесплатные кристаллы за рекламу
    const adAmount = 50;
    L.add(
      button(this, {
        x: W - m - 90 * u,
        y: m + 26 * u,
        w: 180 * u,
        h: 52 * u,
        label: '+' + adAmount,
        icon: 'ad',
        size: 24 * u,
        color: COLORS.yellow,
        onClick: () => {
          audio.suspend('ad');
          sdk.showRewarded(null, (ok) => {
            audio.resume('ad');
            if (ok) {
              save.data.crystals += adAmount;
              save.write();
              audio.play('buy');
              this.layout();
            }
          });
        },
      })
    );

    // магазин кристаллов за портальную валюту
    if (iap.available()) {
      L.add(
        button(this, {
          x: W - m - 90 * u - 190 * u,
          y: m + 26 * u,
          w: 180 * u,
          h: 52 * u,
          label: tr('store'),
          icon: 'crystal',
          size: 22 * u,
          color: COLORS.pink,
          onClick: () => this.openStore(),
        })
      );
    }

    const top = m + 60 * u + (W < 900 * u ? 56 * u : 0);
    const bottom = 100 * u;
    const land = W > H;
    const cols = land ? 5 : 2;
    const rows = Math.ceil(SHOP.length / cols);
    const gap = 12 * u;
    const aw = W - 2 * m;
    const ah = H - top - bottom;
    const cw = Math.min((aw - (cols - 1) * gap) / cols, 300 * u);
    const ch = Math.min((ah - (rows - 1) * gap) / rows, cw * 1.25);
    const gridW = cols * cw + (cols - 1) * gap;
    const gridH = rows * ch + (rows - 1) * gap;
    const x0 = W / 2 - gridW / 2 + cw / 2;
    const y0 = top + (ah - gridH) / 2 + ch / 2;
    const f = Math.min(cw * 0.085, ch * 0.08);

    SHOP.forEach((it, i) => {
      const cx = x0 + (i % cols) * (cw + gap);
      const cy = y0 + Math.floor(i / cols) * (ch + gap);
      const lvl = save.shopLvl(it.id);
      const maxed = lvl >= it.max;
      const cost = maxed ? 0 : shopCost(it, lvl);
      L.add(panelGfx(this, cx, cy, cw, ch, it.color, { radius: 14 * u, tintAlpha: 0.08, lineWidth: 2 }));
      const is = Math.min(ch * 0.26, cw * 0.3);
      const iy = cy - ch / 2 + is / 2 + ch * 0.06;
      L.add(this.add.image(cx - cw / 2 + is / 2 + cw * 0.07, iy, 'ic_' + it.icon).setDisplaySize(is, is));
      L.add(txt(this, cx + cw / 2 - cw * 0.07, iy, lvl + '/' + it.max, f * 1.05, maxed ? COLORS.yellow : it.color, { ox: 1 }));
      L.add(txt(this, cx, cy - ch * 0.04, tr(it.id), f * 1.15, 0xffffff, { wrap: cw * 0.92, glowColor: it.color }));
      L.add(txt(this, cx, cy + ch * 0.13, tr(it.id + '_d'), f * 0.95, 0xd8d4ff, { wrap: cw * 0.9, glow: false }));
      // шкала уровня
      const pw = cw * 0.8;
      const pg = this.add.graphics();
      const seg = pw / it.max;
      for (let k = 0; k < it.max; k++) {
        pg.fillStyle(k < lvl ? it.color : 0x2a2448, 1);
        pg.fillRect(cx - pw / 2 + k * seg + 1.5, cy + ch * 0.25, seg - 3, Math.max(4, ch * 0.025));
      }
      L.add(pg);
      const can = !maxed && save.data.crystals >= cost;
      const b = L.add(
        button(this, {
          x: cx,
          y: cy + ch / 2 - ch * 0.12,
          w: cw * 0.82,
          h: ch * 0.17,
          label: maxed ? tr('maxed') : String(cost),
          icon: maxed ? undefined : 'crystal',
          size: f * 1.1,
          color: maxed ? COLORS.yellow : can ? COLORS.green : 0x555577,
          disabled: !can,
          onClick: () => {
            if (save.data.crystals < cost) return;
            save.data.crystals -= cost;
            save.data.shop[it.id] = lvl + 1;
            save.write();
            audio.play('buy');
            this.layout();
          },
        })
      );
      if (maxed) b.setEnabled(false);
    });

    L.add(
      button(this, {
        x: W / 2,
        y: H - bottom / 2,
        w: Math.min(W * 0.6, 300 * u),
        h: 64 * u,
        label: tr('back'),
        color: COLORS.cyan,
        onClick: () => {
          this.panel = null;
          this.layout();
        },
      })
    );
  }

  openStore() {
    openStore({
      title: tr('storeTitle'),
      txt: { owned: tr('iapOwned'), empty: tr('iapEmpty') },
      theme: { bg: '#140b33', panel: '#0b0620', border: '#31f6ff', ink: '#ffffff', muted: '#b8b0e0', accent: '#2bd96b', accentInk: '#07031a', font: '"Russo One", Arial, sans-serif' },
      onBought: () => {
        audio.play('buy');
        this.layout();
      },
      onClose: () => this.layout(),
    });
  }

  // ---------- Лидерборд ----------
  buildLb() {
    if (sdk.personalRecordsOnly?.()) return this.buildPersonalRecord();
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    this.topBar(false);
    const heading = L.add(txt(this, W / 2, H * 0.12, tr('lbTitle'), 38 * u, COLORS.yellow));
    const pw = Math.min(W * 0.92, 560 * u);
    const ph = H * 0.62;
    const py = H * 0.17 + ph / 2;
    L.add(panelGfx(this, W / 2, py, pw, ph, COLORS.yellow, { radius: 16 * u, tintAlpha: 0.05 }));
    const status = L.add(txt(this, W / 2, py, tr('loading'), 24 * u, COLORS.cyan, { wrap: pw * 0.9 }));

    L.add(
      button(this, {
        x: W / 2,
        y: H - 60 * u,
        w: Math.min(W * 0.6, 300 * u),
        h: 64 * u,
        label: tr('back'),
        color: COLORS.cyan,
        onClick: () => {
          this.panel = null;
          this.layout();
        },
      })
    );

    const render = (res) => {
      if (this.panel !== 'lb' || !status.active) return;
      let rows = [...res.entries];
      heading.setText(res.available ? tr('lbTitle') : tr('lbPersonalTitle'));
      if (!res.available) {
        if (save.data.best.score > 0) rows = [{ rank: null, name: tr('you'), score: save.data.best.score, me: true }];
        else {
          status.setText(res.local ? tr('lbEmpty') : tr('lbUnavailable'));
          return;
        }
      }
      if (!rows.length) {
        status.setText(tr('lbEmpty'));
      } else status.setText('');
      if (sdk.canShare() && save.data.best.score > 0) {
        const b = save.data.best;
        L.add(
          button(this, {
            x: W / 2,
            y: py + ph / 2 - 40 * u,
            w: Math.min(pw * 0.8, 360 * u),
            h: 56 * u,
            label: tr('shareRecord'),
            icon: 'trophy',
            size: 22 * u,
            color: COLORS.yellow,
            onClick: () => sdk.share({ score: b.score, time: b.time }).then((ok) => ok && track('share_story')),
          })
        );
      }
      const rh = Math.min(52 * u, (ph - 100 * u) / Math.max(rows.length, 1));
      rows.slice(0, 10).forEach((r, i) => {
        const y = py - ph / 2 + 24 * u + rh * i + rh / 2;
        const col = r.me ? COLORS.yellow : r.rank <= 3 ? COLORS.cyan : 0xd8d4ff;
        if (r.me) {
          const hl = this.add.rectangle(W / 2, y, pw - 16 * u, rh - 4 * u, COLORS.yellow, 0.12);
          L.add(hl);
        }
        L.add(txt(this, W / 2 - pw / 2 + 24 * u, y, r.rank ? '#' + r.rank : '—', rh * 0.42, col, { ox: 0, glow: r.rank > 0 && r.rank <= 3 }));
        let name = r.name || tr('player');
        if (name.length > 18) name = name.slice(0, 17) + '…';
        L.add(txt(this, W / 2 - pw / 2 + 90 * u, y, name, rh * 0.42, col, { ox: 0, glow: false }));
        L.add(txt(this, W / 2 + pw / 2 - 24 * u, y, r.score.toLocaleString('ru-RU'), rh * 0.44, col, { ox: 1, glow: r.me }));
      });
      if (res.available && !res.authorized) {
        L.add(txt(this, W / 2, py + ph / 2 - 80 * u, tr('lbLogin'), 18 * u, 0xd8d4ff, { glow: false, wrap: pw * 0.9 }));
        L.add(
          button(this, {
            x: W / 2,
            y: py + ph / 2 - 36 * u,
            w: 200 * u,
            h: 50 * u,
            label: tr('lbLoginBtn'),
            color: COLORS.yellow,
            size: 22 * u,
            onClick: async () => {
              const ok = await sdk.login();
              if (ok) {
                lbCache = null;
                if (save.data.best.score > 0) await sdk.submitScore(save.data.best.score);
              }
              if (this.panel === 'lb') this.layout();
            },
          })
        );
      }
    };

    if (lbCache && lbCache.score === save.data.best.score && Date.now() - lbCache.time < (lbCache.res.available ? 30000 : 3000)) {
      render(lbCache.res);
    } else {
      sdk.getLeaderboard(save.data.best.score).then((res) => {
        lbCache = { time: Date.now(), res, score: save.data.best.score };
        render(res);
      });
    }
  }

  buildPersonalRecord() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this), L = this.L, best = save.data.best;
    this.topBar(false);
    L.add(txt(this, W / 2, H * 0.12, tr('lbPersonalTitle'), 38 * u, COLORS.yellow));
    const pw = Math.min(W * 0.92, 560 * u), ph = Math.min(H * 0.62, 450 * u);
    const py = H * 0.17 + ph / 2, top = py - ph / 2;
    L.add(panelGfx(this, W / 2, py, pw, ph, COLORS.yellow, { radius: 16 * u, tintAlpha: 0.05 }));
    if (best.score > 0) {
      L.add(txt(this, W / 2, top + ph * 0.13, tr('lbPersonalNote'), 20 * u, 0xbcb5d4, { wrap: pw * 0.9, glow: false }));
      const value = L.add(txt(this, W / 2, top + ph * 0.31, best.score.toLocaleString('ru-RU'), 62 * u, COLORS.yellow));
      if (value.width > pw * 0.85) value.setScale(pw * 0.85 / value.width);
      L.add(txt(this, W / 2, top + ph * 0.45, tr('score'), 21 * u, COLORS.cyan));
      const details = [[tr('time'), fmtTime(best.time)], [tr('kills'), best.kills.toLocaleString('ru-RU')], [tr('level'), String(best.level)]];
      details.forEach(([label, result], i) => {
        const y = top + ph * (0.57 + i * 0.085);
        L.add(txt(this, W / 2 - pw * 0.38, y, label, 22 * u, 0xbcb5d4, { ox: 0, glow: false }));
        L.add(txt(this, W / 2 + pw * 0.38, y, result, 24 * u, 0xffffff, { ox: 1, glow: false }));
      });
      if (sdk.canShare()) L.add(button(this, { x: W / 2, y: top + ph * 0.9, w: Math.min(pw * 0.84, 360 * u), h: 56 * u,
        label: tr('shareRecord'), icon: 'trophy', size: 22 * u, color: COLORS.yellow,
        onClick: () => sdk.share({ score: best.score, time: best.time }).then((ok) => ok && track('share_story')) }));
    } else {
      L.add(txt(this, W / 2, py, tr('lbPersonalEmpty'), 27 * u, COLORS.cyan, { wrap: pw * 0.85 }));
    }
    L.add(button(this, { x: W / 2, y: H - 60 * u, w: Math.min(W * 0.6, 300 * u), h: 64 * u,
      label: tr('back'), color: COLORS.cyan, onClick: () => { this.panel = null; this.layout(); } }));
  }
}
