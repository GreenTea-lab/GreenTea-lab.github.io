// Главное меню поверх живой арены: ник, режим, гараж, рекорды, магазин
import { COLORS, SKINS, TRAILS, BOOSTS, LEVEL_SCORE, hex } from '../data.js';
import { tankIcon } from '../tex.js';
import { uiScale, txt, button, Layer, panelGfx, FONT } from '../ui.js';
import { t as tr, tankName, LANG } from '../i18n.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { openSound } from '../sound-ui.js';
import { iap, openStore } from '../iap.js';

const Phaser = window.Phaser;
let firstShow = true;
let lbCache = null;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.A = this.scene.get('Arena');
    this.L = new Layer(this);
    this.panel = null;
    this.tab = 'colors';
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.removeNick();
    });
    if (firstShow) {
      firstShow = false;
      const loader = document.getElementById('loader');
      if (loader) loader.remove();
      sdk.ready();
      if (!save.data.nick) {
        const n = sdk.playerName ? sdk.playerName() : '';
        if (n) save.data.nick = n.slice(0, 16);
      }
    }
    sdk.gameplay(false);
  }

  layout() {
    this.L.clear();
    this.removeNick();
    if (this.panel === 'garage') this.buildGarage();
    else if (this.panel === 'lb') this.buildLb();
    else this.buildMain();
  }

  coinsBar() {
    const u = uiScale(this);
    const m = 16 * u;
    this.L.add(this.add.image(m + 22 * u, m + 24 * u, 'ic_coin').setDisplaySize(44 * u, 44 * u));
    this.L.add(txt(this, m + 50 * u, m + 24 * u, String(save.data.coins), 30 * u, COLORS.yellow, { ox: 0 }));
  }

  // ---------- Главный экран ----------
  buildMain() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    const land = W > H * 1.15;
    // затемнение арены за меню
    L.add(this.add.rectangle(0, 0, W, H, 0x05021a, 0.42).setOrigin(0));
    this.coinsBar();
    const m = 16 * u;
    const s = 56 * u;
    L.add(button(this, { x: W - m - s / 2, y: m + s / 2, w: s, h: s, icon: 'sound', iconSize: s * 0.72, color: COLORS.cyan, onClick: () => openSound() }));

    const ty = land ? H * 0.2 : H * 0.2;
    const s1 = Math.min(64 * u, W * 0.1);
    const s2 = Math.min(104 * u, W * 0.19);
    const t1 = L.add(txt(this, W / 2, ty - s2 * 0.5, tr('title1'), s1, COLORS.cyan));
    const t2 = L.add(txt(this, W / 2, ty + s1 * 0.38, tr('title2'), s2, COLORS.pink));
    L.add(txt(this, W / 2, ty + s1 * 0.38 + s2 * 0.68, tr('subtitle'), 19 * u, 0xd8d4ff, { glowColor: COLORS.violet, wrap: W * 0.9 }));
    this.tweens.add({ targets: t2, scale: 1.04, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
    this.tweens.add({ targets: t1, alpha: 0.8, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.InOut' });

    const bw = Math.min(W * 0.84, 420 * u);
    let y = ty + s1 * 0.38 + s2 * 0.68 + 62 * u;
    // ник
    this.makeNick(W / 2, y, bw, 54 * u, u);
    y += 54 * u / 2 + 14 * u + 26 * u;
    // режим
    const hw = (bw - 10 * u) / 2;
    const modeBtn = (x, id, label) => {
      const on = (save.data.mode || 'ffa') === id;
      const b = L.add(button(this, { x, y, w: hw, h: 46 * u, label, size: 18 * u, color: on ? COLORS.violet : 0x555577, fillStrong: on, onClick: () => {
        if (save.data.mode === id) return;
        save.data.mode = id;
        save.write(false);
        this.A.buildWorld(id);
        this.layout();
      } }));
      if (!on) b.c.setAlpha(0.7);
    };
    modeBtn(W / 2 - hw / 2 - 5 * u, 'ffa', tr('modeFfa'));
    modeBtn(W / 2 + hw / 2 + 5 * u, 'teams', tr('modeTeams'));
    y += 23 * u + 18 * u + 44 * u;
    const play = L.add(button(this, { x: W / 2, y, w: bw, h: 88 * u, label: tr('play'), size: 40 * u, color: COLORS.green, fillStrong: true, onClick: () => this.play() }));
    this.tweens.add({ targets: play.c, scale: 1.035, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
    y += 44 * u + 12 * u;
    // ускоренный старт
    const bz = save.data.useBoost;
    const have = save.data.boosts;
    const any = have.lvl15 > 0 || have.lvl30 > 0;
    if (any) {
      y += 22 * u;
      const opts = ['', ...['lvl15', 'lvl30'].filter((k) => have[k] > 0)];
      const label = bz && have[bz] > 0 ? tr('boostUse').replace('%s', BOOSTS[bz].level) + ' · ' + tr('boostLeft').replace('%s', have[bz]) : tr('boostUse').replace('%s', 1);
      L.add(button(this, { x: W / 2, y, w: bw * 0.86, h: 44 * u, label, size: 17 * u, color: bz && have[bz] > 0 ? COLORS.yellow : 0x8a84b8, onClick: () => {
        const i = opts.indexOf(bz && have[bz] > 0 ? bz : '');
        save.data.useBoost = opts[(i + 1) % opts.length];
        save.write(false);
        this.layout();
      } }));
      y += 22 * u + 10 * u;
    }
    y += 26 * u;
    L.add(button(this, { x: W / 2, y, w: bw * 0.86, h: 48 * u, label: tr('boostFree'), icon: 'ad', iconSize: 30 * u, size: 17 * u, color: COLORS.yellow, onClick: () => {
      audio.suspend('ad');
      sdk.showRewarded(null, (ok) => {
        audio.resume('ad');
        if (ok) this.play(LEVEL_SCORE[15]);
      });
    } }));
    y += 24 * u + 16 * u;
    // нижний ряд
    const items = [
      ['garage', tr('garage'), 'garage', COLORS.cyan, () => ((this.panel = 'garage'), this.layout())],
      ['lb', tr('records'), 'trophy', COLORS.yellow, () => ((this.panel = 'lb'), this.layout())],
    ];
    if (iap.available()) items.push(['store', tr('store'), 'coin', COLORS.pink, () => this.openStore()]);
    const n = items.length;
    const gw = (bw - (n - 1) * 10 * u) / n;
    y += 30 * u;
    items.forEach(([id, label, icon, col, fn], i) => {
      L.add(button(this, { x: W / 2 - bw / 2 + gw / 2 + i * (gw + 10 * u), y, w: gw, h: 60 * u, label, icon, iconSize: 32 * u, size: (n > 2 ? 15 : 19) * u, color: col, onClick: fn }));
    });
    y += 30 * u;
    const b = save.data.best;
    if (b.score > 0) {
      y += 26 * u;
      L.add(txt(this, W / 2, y, `${tr('best')}: ${b.score.toLocaleString('ru-RU')} · ${tr('lvl')} ${b.level} · ${tankName(b.cls)}`, 18 * u, COLORS.cyan, { wrap: W * 0.95 }));
    }
    const touch = this.sys.game.device.input.touch && !this.sys.game.device.os.desktop;
    L.add(txt(this, W / 2, H - 18 * u, touch ? tr('controlsTouch') : tr('controls'), 14 * u, 0x9a94c8, { glow: false, wrap: W * 0.96 }));
  }

  makeNick(x, y, w, h, u) {
    const canvas = this.game.canvas;
    const r = canvas.getBoundingClientRect();
    const k = r.width / this.scale.width;
    const el = document.createElement('input');
    el.id = 'nick';
    el.type = 'text';
    el.maxLength = 16;
    el.placeholder = tr('nickPh');
    el.value = save.data.nick || '';
    el.autocomplete = 'off';
    el.spellcheck = false;
    el.style.cssText = `position:fixed;left:${r.left + (x - w / 2) * k}px;top:${r.top + (y - h / 2) * k}px;width:${w * k}px;height:${h * k}px;box-sizing:border-box;z-index:20;
      background:rgba(11,6,38,.88);border:2px solid #8a6bff;border-radius:${h * k * 0.3}px;color:#fff;text-align:center;outline:none;
      font:${Math.round(22 * u * k)}px ${FONT};box-shadow:0 0 14px rgba(138,107,255,.45),inset 0 0 12px rgba(138,107,255,.18);-webkit-user-select:text;user-select:text;padding:0 12px`;
    el.addEventListener('input', () => {
      save.data.nick = el.value.slice(0, 16);
    });
    el.addEventListener('change', () => save.write(false));
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        el.blur();
        this.play();
      }
    });
    el.addEventListener('focus', () => el.style.setProperty('border-color', '#31f6ff'));
    el.addEventListener('blur', () => el.style.setProperty('border-color', '#8a6bff'));
    document.body.appendChild(el);
    this.nickEl = el;
  }

  removeNick() {
    const el = document.getElementById('nick');
    if (el) el.remove();
    this.nickEl = null;
  }

  play(startScore) {
    audio.unlock();
    audio.startMusic();
    if (this.nickEl) save.data.nick = this.nickEl.value.trim().slice(0, 16);
    let score = startScore || 0;
    const bz = save.data.useBoost;
    if (!startScore && bz && save.data.boosts[bz] > 0) {
      save.data.boosts[bz]--;
      score = LEVEL_SCORE[BOOSTS[bz].level];
      if (save.data.boosts[bz] <= 0) save.data.useBoost = '';
    }
    save.write();
    this.removeNick();
    this.A.startPlay({ score });
    const hud = this.scene.get('Hud');
    if (hud && hud.build) hud.build();
    this.scene.stop();
  }

  openStore() {
    this.removeNick();
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

  // ---------- Гараж ----------
  buildGarage() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    L.add(this.add.rectangle(0, 0, W, H, 0x05021a, 0.72).setOrigin(0));
    this.coinsBar();
    const m = 16 * u;
    // монеты за рекламу
    const adAmount = 60;
    L.add(button(this, { x: W - m - 80 * u, y: m + 26 * u, w: 160 * u, h: 52 * u, label: '+' + adAmount, icon: 'ad', size: 22 * u, color: COLORS.yellow, onClick: () => {
      audio.suspend('ad');
      sdk.showRewarded(null, (ok) => {
        audio.resume('ad');
        if (ok) {
          save.data.coins += adAmount;
          save.write();
          audio.play('buy');
          this.layout();
        }
      });
    } }));
    const top = m + 64 * u;
    L.add(txt(this, W / 2, top + 14 * u, tr('garage'), 34 * u, COLORS.cyan));
    // вкладки
    const tabs = [
      ['colors', tr('tabColors')],
      ['trails', tr('tabTrails')],
      ['boosts', tr('tabBoosts')],
    ];
    const tw = Math.min(150 * u, (W - 2 * m) / 3 - 8 * u);
    tabs.forEach(([id, label], i) => {
      const on = this.tab === id;
      const b = L.add(button(this, { x: W / 2 + (i - 1) * (tw + 10 * u), y: top + 66 * u, w: tw, h: 44 * u, label, size: 18 * u, color: on ? COLORS.violet : 0x555577, fillStrong: on, onClick: () => {
        this.tab = id;
        this.layout();
      } }));
      if (!on) b.c.setAlpha(0.75);
    });
    const gy = top + 100 * u;
    const bottom = 96 * u;
    let items = [];
    if (this.tab === 'colors') items = SKINS.map((s) => ({ kind: 'skin', ...s }));
    else if (this.tab === 'trails') items = TRAILS.map((s) => ({ kind: 'trail', ...s }));
    else items = Object.entries(BOOSTS).map(([id, b]) => ({ kind: 'boost', id, ...b }));
    const land = W > H;
    const cols = land ? Math.min(items.length, 4) : 2;
    const rows = Math.ceil(items.length / cols);
    const gap = 12 * u;
    const aw = W - 2 * m, ah = H - gy - bottom - 10 * u;
    const cw = Math.min((aw - (cols - 1) * gap) / cols, 230 * u);
    const ch = Math.min((ah - (rows - 1) * gap) / rows, cw * 1.2);
    const gw = cols * cw + (cols - 1) * gap;
    const x0 = W / 2 - gw / 2 + cw / 2;
    const y0 = gy + (ah - (rows * ch + (rows - 1) * gap)) / 2 + ch / 2 + 10 * u;
    const f = Math.min(cw * 0.09, ch * 0.08);
    items.forEach((it, i) => {
      const cx = x0 + (i % cols) * (cw + gap);
      const cy = y0 + Math.floor(i / cols) * (ch + gap);
      const col = it.kind === 'skin' ? (it.rainbow ? COLORS.pink : it.color) : it.kind === 'trail' ? COLORS.cyan : COLORS.yellow;
      L.add(panelGfx(this, cx, cy, cw, ch, col, { radius: 14 * u, tintAlpha: 0.06, lineWidth: 2 }));
      const ic = ch * 0.46;
      const icy = cy - ch * 0.16;
      if (it.kind === 'skin') {
        const img = L.add(this.add.image(cx, icy, tankIcon('basic', it.rainbow ? 0xffffff : it.color)).setDisplaySize(ic, ic));
        if (it.rainbow) {
          let h = 0;
          const ev = this.time.addEvent({ delay: 60, loop: true, callback: () => {
            h = (h + 0.02) % 1;
            if (img.active) img.setTint(Phaser.Display.Color.HSVToRGB(h, 0.75, 1).color);
          } });
          L.add({ destroy: () => ev.remove() });
        }
      } else if (it.kind === 'trail') {
        this.trailPreview(cx, icy, ic, it.id, u);
      } else {
        L.add(this.add.image(cx, icy, tankIcon(it.level >= 30 ? 'triple' : 'twin', SKINS.find((s) => s.id === save.data.skin)?.color || COLORS.cyan)).setDisplaySize(ic, ic));
      }
      const name = it.kind === 'skin' ? tr('skin_' + it.id) : it.kind === 'trail' ? tr('trail_' + it.id) : tr('boost_' + it.id);
      L.add(txt(this, cx, cy + ch * 0.13, name, f * 1.2, 0xffffff, { glowColor: col, wrap: cw * 0.92 }));
      let owned, equipped, label, can;
      if (it.kind === 'boost') {
        const n = save.data.boosts[it.id] || 0;
        L.add(txt(this, cx, cy + ch * 0.25, tr('owned').replace('%s', n), f * 0.9, 0xd8d4ff, { glow: false }));
        owned = false;
        can = save.data.coins >= it.cost;
        label = String(it.cost);
      } else {
        const list = it.kind === 'skin' ? save.data.skins : save.data.trails;
        owned = list.includes(it.id);
        equipped = (it.kind === 'skin' ? save.data.skin : save.data.trail) === it.id;
        can = owned || save.data.coins >= it.cost;
        label = equipped ? tr('equipped') : owned ? tr('equip') : String(it.cost);
      }
      const b = L.add(button(this, { x: cx, y: cy + ch / 2 - ch * 0.13, w: cw * 0.82, h: ch * 0.18, label, icon: !owned ? 'coin' : undefined, size: f * 1.05, color: equipped ? COLORS.yellow : can ? COLORS.green : 0x555577, disabled: !can || equipped, onClick: () => this.garageAct(it, owned) }));
      if (equipped) b.setEnabled(false);
    });
    if (this.tab === 'colors' && save.data.mode === 'teams') L.add(txt(this, W / 2, H - bottom - 6 * u, tr('teamsNote'), 15 * u, 0x9a94c8, { glow: false }));
    L.add(button(this, { x: W / 2, y: H - bottom / 2, w: Math.min(W * 0.6, 300 * u), h: 60 * u, label: tr('back'), color: COLORS.cyan, onClick: () => {
      this.panel = null;
      this.layout();
    } }));
  }

  trailPreview(cx, cy, size, id, u) {
    const L = this.L;
    const col = SKINS.find((s) => s.id === save.data.skin)?.color || COLORS.cyan;
    const tk = L.add(this.add.image(cx + size * 0.18, cy, tankIcon('basic', col)).setDisplaySize(size * 0.62, size * 0.62));
    if (id === 'none') return;
    for (let i = 0; i < 5; i++) {
      const x = cx + size * 0.05 - i * size * 0.14;
      const key = id === 'stars' ? 'star4' : id === 'comet' ? 'glow' : 'spark';
      const s = L.add(this.add.image(x, cy + (i % 2 ? 1 : -1) * size * 0.04, key).setTint(col).setBlendMode(1));
      const base = id === 'comet' ? (size * 0.4 * (1 - i * 0.15)) / 128 : id === 'stars' ? 0.5 * u : 1.4 * u;
      s.setScale(base).setAlpha(1 - i * 0.18);
      this.tweens.add({ targets: s, alpha: 0.15, yoyo: true, repeat: -1, duration: 500 + i * 120 });
    }
  }

  garageAct(it, owned) {
    const d = save.data;
    if (it.kind === 'boost') {
      if (d.coins < it.cost) return;
      d.coins -= it.cost;
      d.boosts[it.id] = (d.boosts[it.id] || 0) + 1;
      d.useBoost = it.id;
      audio.play('buy');
    } else {
      const list = it.kind === 'skin' ? d.skins : d.trails;
      if (!owned) {
        if (d.coins < it.cost) return;
        d.coins -= it.cost;
        list.push(it.id);
        audio.play('buy');
      }
      if (it.kind === 'skin') d.skin = it.id;
      else d.trail = it.id;
    }
    save.write();
    this.layout();
  }

  // ---------- Таблица лидеров Яндекса ----------
  buildLb() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    L.add(this.add.rectangle(0, 0, W, H, 0x05021a, 0.72).setOrigin(0));
    this.coinsBar();
    L.add(txt(this, W / 2, H * 0.12, tr('lbTitle'), 36 * u, COLORS.yellow));
    const pw = Math.min(W * 0.92, 560 * u);
    const ph = H * 0.62;
    const py = H * 0.17 + ph / 2;
    L.add(panelGfx(this, W / 2, py, pw, ph, COLORS.yellow, { radius: 16 * u, tintAlpha: 0.05 }));
    const status = L.add(txt(this, W / 2, py, tr('loading'), 24 * u, COLORS.cyan, { wrap: pw * 0.9 }));
    L.add(button(this, { x: W / 2, y: H - 60 * u, w: Math.min(W * 0.6, 300 * u), h: 60 * u, label: tr('back'), color: COLORS.cyan, onClick: () => {
      this.panel = null;
      this.layout();
    } }));
    const render = (res) => {
      if (this.panel !== 'lb' || !status.active) return;
      let rows = res.entries;
      if (!res.available) {
        if (save.data.best.score > 0) rows = [{ rank: 1, name: save.data.nick || tr('you'), score: save.data.best.score, me: true }];
        else {
          status.setText(res.local ? tr('lbEmpty') : tr('lbUnavailable'));
          return;
        }
      }
      status.setText(rows.length ? '' : tr('lbEmpty'));
      const rh = Math.min(46 * u, (ph - 40 * u) / 11);
      rows.slice(0, 11).forEach((r, i) => {
        const y = py - ph / 2 + 24 * u + rh * i + rh / 2;
        const col = r.me ? COLORS.yellow : r.rank <= 3 ? COLORS.cyan : 0xd8d4ff;
        if (r.me) L.add(this.add.rectangle(W / 2, y, pw - 16 * u, rh - 4 * u, COLORS.yellow, 0.12));
        L.add(txt(this, W / 2 - pw / 2 + 24 * u, y, '#' + r.rank, rh * 0.42, col, { ox: 0, glow: r.rank <= 3 }));
        let name = r.name || tr('player');
        if (name.length > 18) name = name.slice(0, 17) + '…';
        L.add(txt(this, W / 2 - pw / 2 + 90 * u, y, name, rh * 0.42, col, { ox: 0, glow: false }));
        L.add(txt(this, W / 2 + pw / 2 - 24 * u, y, r.score.toLocaleString('ru-RU'), rh * 0.44, col, { ox: 1, glow: r.me }));
      });
      if (res.available && !res.authorized) {
        L.add(txt(this, W / 2, py + ph / 2 - 80 * u, tr('lbLogin'), 18 * u, 0xd8d4ff, { glow: false, wrap: pw * 0.9 }));
        L.add(button(this, { x: W / 2, y: py + ph / 2 - 36 * u, w: 200 * u, h: 50 * u, label: tr('lbLoginBtn'), color: COLORS.yellow, size: 22 * u, onClick: async () => {
          const ok = await sdk.login();
          if (ok) {
            lbCache = null;
            if (save.data.best.score > 0) await sdk.submitScore(save.data.best.score);
          }
          if (this.panel === 'lb') this.layout();
        } }));
      }
    };
    if (lbCache && Date.now() - lbCache.time < 60000) render(lbCache.res);
    else
      sdk.getLeaderboard().then((res) => {
        lbCache = { time: Date.now(), res };
        render(res);
      });
  }
}
