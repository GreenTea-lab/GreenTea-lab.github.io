// Главное меню и таблица лидеров
import { C, LEVEL_COUNT } from '../data.js';
import { renderMap } from '../gfx/map.js';
import { uiScale, txt, button, Layer, panel } from '../ui.js';
import { t as tr } from '../i18n.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { openSound } from '../sound-ui.js';

const Phaser = window.Phaser;
let firstShow = true;
let lbCache = null;

// фон-карта для меню, растянутая «cover»
export function menuBackground(scene, level = 1) {
  const { width: W, height: H } = scene.scale;
  const portrait = H > W;
  const key = `map_${level}_${portrait ? 'p' : 'l'}`;
  if (!scene.textures.exists(key)) renderMap(scene, key, level, portrait);
  const img = scene.add.image(W / 2, H / 2, key).setDepth(-10);
  const k = Math.max(W / img.width, H / img.height);
  img.setScale(k);
  const shade = scene.add.rectangle(0, 0, W, H, 0x1a0f05, 0.35).setOrigin(0).setDepth(-9);
  return [img, shade];
}

export function topBar(scene, L, opts = {}) {
  const { width: W } = scene.scale;
  const u = uiScale(scene);
  const m = 12 * u;
  const h = 56 * u;
  const items = [];
  if (opts.back) {
    L.add(button(scene, { x: m + h / 2, y: m + h / 2, w: h, h, style: 'red', icon: 'close', iconSize: h * 0.5, depth: 50, onClick: opts.back }));
  }
  let x = m + (opts.back ? h + 12 * u : 0);
  const pw = 150 * u;
  const chip = (icon, val, color) => {
    L.add(panel(scene, x + pw / 2, m + h / 2, pw, h * 0.86, 'woodDark', 20 * u).setDepth(50));
    L.add(scene.add.image(x + 26 * u, m + h / 2, 'ic_' + icon).setScale((44 * u) / 96).setDepth(51));
    const t = L.add(txt(scene, x + 54 * u, m + h / 2, String(val), 26 * u, color, { ox: 0 }).setDepth(51));
    items.push(t);
    x += pw + 10 * u;
  };
  chip('gem', save.data.gems, 0x7fe0ff);
  chip('star', save.totalStars() + '/' + LEVEL_COUNT * 3, 0xffe08a);
  return items;
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    audio.setIntensity(0);
    sdk.gameplay(false);
    this.L = new Layer(this);
    this.panelMode = null;
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

  layout() {
    this.L.clear();
    menuBackground(this, 1).forEach((o) => this.L.add(o));
    if (this.panelMode === 'lb') this.buildLb();
    else this.buildMain();
  }

  settings() {
    const { width: W } = this.scale;
    const u = uiScale(this);
    const m = 12 * u;
    const s = 56 * u;
    const mk = (i, key, icon) => {
      const on = save.data.settings[key];
      const b = this.L.add(
        button(this, {
          x: W - m - s / 2 - i * (s + 10 * u),
          y: m + s / 2,
          w: s,
          h: s,
          style: on ? 'blue' : 'grey',
          icon,
          iconSize: s * 0.6,
          depth: 50,
          onClick: () => openSound(() => this.layout()),
        })
      );
      if (!on) b.icon.setAlpha(0.4);
    };
    mk(0, 'sfx', 'sound');
    mk(1, 'music', 'music');
  }

  buildMain() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    topBar(this, L);
    this.settings();
    const land = W > H * 1.2;
    const ty = land ? H * 0.27 : H * 0.25;
    const s2 = Math.min(84 * u, W * 0.105);
    const bw = Math.min(W * 0.94, s2 * 9);
    const ban = L.add(panel(this, W / 2, ty, bw, s2 * 2.5, 'wood', 30 * u));
    const t1 = L.add(txt(this, W / 2, ty - s2 * 0.62, tr('title1'), s2 * 0.62, 0xfff3d6, { title: true }));
    const t2 = L.add(txt(this, W / 2, ty + s2 * 0.3, tr('title2'), s2, 0xffc93c, { title: true, strokeK: 0.14 }));
    ban.setScale(0.9);
    this.tweens.add({ targets: [ban, t1, t2], y: '-=6', yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.InOut' });
    this.tweens.add({ targets: ban, scale: 1, duration: 400, ease: 'Back.Out' });
    L.add(txt(this, W / 2, ty + s2 * 1.6, tr('subtitle'), 24 * u, 0xffffff, { wrap: W * 0.9 }));

    const bw2 = Math.min(W * 0.8, 400 * u);
    let y = land ? H * 0.6 : H * 0.56;
    const play = L.add(
      button(this, {
        x: W / 2,
        y,
        w: bw2,
        h: 96 * u,
        style: 'green',
        label: tr('play'),
        icon: 'play',
        size: 42 * u,
        iconSize: 56 * u,
        onClick: () => {
          audio.unlock();
          audio.startMusic();
          this.scene.start('Levels');
        },
      })
    );
    this.tweens.add({ targets: play.c, scale: 1.05, yoyo: true, repeat: -1, duration: 650, ease: 'Sine.InOut' });
    y += 96 * u / 2 + 20 * u + 38 * u;
    L.add(button(this, { x: W / 2, y, w: bw2, h: 76 * u, style: 'purple', label: tr('upgrades'), icon: 'gem', size: 28 * u, onClick: () => this.scene.start('Shop', { from: 'Menu' }) }));
    y += 76 * u + 14 * u;
    L.add(
      button(this, {
        x: W / 2,
        y,
        w: bw2,
        h: 76 * u,
        style: 'gold',
        label: tr('records'),
        icon: 'trophy',
        size: 28 * u,
        onClick: () => {
          this.panelMode = 'lb';
          this.layout();
        },
      })
    );
  }

  buildLb() {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    topBar(this, L, {
      back: () => {
        this.panelMode = null;
        this.layout();
      },
    });
    const pw = Math.min(W * 0.94, 600 * u);
    const top = 90 * u;
    const ph = H - top - 30 * u;
    const py = top + ph / 2;
    L.add(panel(this, W / 2, py, pw, ph, 'parch', 26 * u));
    L.add(panel(this, W / 2, top, Math.min(pw * 0.9, 440 * u), 66 * u, 'wood', 22 * u));
    L.add(txt(this, W / 2, top, tr('lbTitle'), 30 * u, 0xffc93c, { title: true }));
    L.add(txt(this, W / 2, top + 52 * u, tr('lbSub'), 18 * u, 0x8a6a4a, { stroke: false }));
    const status = L.add(txt(this, W / 2, py, tr('loading'), 24 * u, 0x5a3518, { stroke: false, wrap: pw * 0.85 }));
    const listTop = top + 80 * u;
    const render = (res) => {
      if (this.panelMode !== 'lb' || !status.active) return;
      let rows = res.entries;
      if (!res.available) {
        const st = save.totalStars();
        if (st > 0) rows = [{ rank: 1, name: tr('you'), score: st, me: true }];
        else {
          status.setText(res.local ? tr('lbEmpty') : tr('lbUnavailable'));
          return;
        }
      }
      status.setText(rows.length ? '' : tr('lbEmpty'));
      const rh = Math.min(50 * u, (ph - 190 * u) / 10);
      rows.slice(0, 10).forEach((r, i) => {
        const y = listTop + rh * i + rh / 2;
        if (r.me) L.add(this.add.rectangle(W / 2, y, pw - 40 * u, rh - 4 * u, 0xffc93c, 0.3));
        const col = r.rank <= 3 ? [0xffc93c, 0xd9e2ec, 0xe0a060][r.rank - 1] : 0x5a3518;
        L.add(txt(this, W / 2 - pw / 2 + 36 * u, y, '#' + r.rank, rh * 0.45, col, { ox: 0, stroke: r.rank <= 3 }));
        let name = r.name || tr('player');
        if (name.length > 18) name = name.slice(0, 17) + '…';
        L.add(txt(this, W / 2 - pw / 2 + 100 * u, y, name, rh * 0.42, 0x5a3518, { ox: 0, stroke: false }));
        L.add(this.add.image(W / 2 + pw / 2 - 40 * u, y, 'ic_star').setScale((rh * 0.6) / 96));
        L.add(txt(this, W / 2 + pw / 2 - 66 * u, y, String(r.score), rh * 0.45, 0x5a3518, { ox: 1, stroke: false }));
      });
      if (res.available && !res.authorized) {
        L.add(txt(this, W / 2, py + ph / 2 - 90 * u, tr('lbLogin'), 19 * u, 0x8a6a4a, { stroke: false, wrap: pw * 0.85 }));
        L.add(
          button(this, {
            x: W / 2,
            y: py + ph / 2 - 45 * u,
            w: 220 * u,
            h: 56 * u,
            style: 'gold',
            label: tr('lbLoginBtn'),
            size: 24 * u,
            onClick: async () => {
              const ok = await sdk.login();
              if (ok) {
                lbCache = null;
                if (save.totalStars() > 0) await sdk.submitScore(save.totalStars());
              }
              if (this.panelMode === 'lb') this.layout();
            },
          })
        );
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
