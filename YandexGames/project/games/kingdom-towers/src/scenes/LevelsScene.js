// Карта уровней: 4 региона по 5 уровней
import { C, REGIONS, LEVEL_COUNT } from '../data.js';
import { uiScale, txt, button, Layer, panel, panelTex } from '../ui.js';
import { t as tr } from '../i18n.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { topBar } from './MenuScene.js';
import { canvas, css, light, dark, rr, INK } from '../art.js';

const Phaser = window.Phaser;

export class LevelsScene extends Phaser.Scene {
  constructor() {
    super('Levels');
  }

  create() {
    audio.setIntensity(0);
    sdk.gameplay(false);
    this.L = new Layer(this);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  layout() {
    this.L.clear();
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const L = this.L;
    L.add(this.add.image(W / 2, H / 2, panelTex(this, 'parch', W + 20, H + 20, 0)));
    topBar(this, L, { back: () => this.scene.start('Menu') });
    // кнопка улучшений
    const m = 12 * u;
    const bh = 56 * u;
    L.add(button(this, { x: W - m - 100 * u, y: m + bh / 2, w: 200 * u, h: bh, style: 'purple', label: tr('upgrades'), size: 20 * u, icon: 'gem', iconSize: bh * 0.6, onClick: () => this.scene.start('Shop', { from: 'Levels' }) }));

    const top = m + bh + 16 * u;
    const avail = H - top - m;
    const gap = 10 * u;
    const bandH = (avail - gap * 3) / 4;
    const bandW = Math.min(W - 2 * m, 1100 * u);
    const node = Math.min(bandH * 0.56, (bandW / 5) * 0.62, 110 * u);
    const g = L.add(this.add.graphics());
    const centers = [];
    // текущий уровень = первый непройденный открытый
    let current = 1;
    for (let l = 1; l <= LEVEL_COUNT; l++) if (save.unlocked(l)) current = save.starsOf(l) ? Math.min(LEVEL_COUNT, l + 1) : l;

    for (let r = 0; r < 4; r++) {
      const reg = REGIONS[r];
      const by = top + r * (bandH + gap) + bandH / 2;
      L.add(this.add.image(W / 2, by, this.bandTex(reg, bandW, bandH, u)));
      L.add(txt(this, W / 2 - bandW / 2 + 16 * u, by - bandH / 2 + 18 * u, tr('regions')[r], Math.min(20 * u, bandH * 0.16), 0xffffff, { ox: 0 }));
      for (let i = 0; i < 5; i++) {
        const l = r * 5 + i + 1;
        const col = r % 2 === 0 ? i : 4 - i;
        const x = W / 2 - bandW / 2 + (bandW / 5) * (col + 0.5);
        const y = by + bandH * 0.04;
        centers[l] = [x, y];
      }
    }
    // дорожка между уровнями
    for (let l = 1; l < LEVEL_COUNT; l++) {
      const [x0, y0] = centers[l];
      const [x1, y1] = centers[l + 1];
      const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / (14 * u)));
      for (let k = 1; k < n; k++) {
        const f = k / n;
        g.fillStyle(save.starsOf(l) ? 0xffe08a : 0x5a3518, save.starsOf(l) ? 1 : 0.5);
        g.fillCircle(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 3.5 * u);
      }
    }
    for (let l = 1; l <= LEVEL_COUNT; l++) {
      const [x, y] = centers[l];
      const open = save.unlocked(l);
      const stars = save.starsOf(l);
      const isCur = l === current && open;
      const b = L.add(
        button(this, {
          x,
          y,
          w: node,
          h: node,
          radius: node / 2,
          style: !open ? 'grey' : isCur ? 'green' : l % 5 === 0 ? 'red' : 'gold',
          label: open ? String(l) : '',
          icon: open ? undefined : 'lock',
          iconSize: node * 0.5,
          size: node * 0.42,
          allowDisabledClick: true,
          disabled: !open,
          onClick: () => {
            if (!open) {
              audio.play('error');
              this.toast(tr('locked'));
              return;
            }
            this.scene.start('Game', { level: l });
          },
        })
      );
      if (!open) b.c.setAlpha(0.8);
      if (isCur) this.tweens.add({ targets: b.c, scale: 1.1, yoyo: true, repeat: -1, duration: 550, ease: 'Sine.InOut' });
      if (open) {
        for (let s = 0; s < 3; s++) {
          const ss = node * 0.3;
          L.add(this.add.image(x + (s - 1) * ss * 0.95, y + node * 0.55 + (s === 1 ? ss * 0.12 : 0), s < stars ? 'ic_star' : 'ic_starEmpty').setScale(ss / 96));
        }
      }
      if (l % 5 === 0) L.add(this.add.image(x + node * 0.42, y - node * 0.42, 'ic_skull').setScale((node * 0.36) / 96));
    }
  }

  bandTex(reg, w, h, u) {
    const key = `band_${reg.id}_${Math.round(w)}_${Math.round(h)}`;
    if (this.textures.exists(key)) return key;
    const [cv, ctx] = canvas(w, h);
    const r = 20 * u;
    rr(ctx, 3, 3, w - 6, h - 6, r);
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, css(light(reg.grass, 0.1)));
    gr.addColorStop(1, css(dark(reg.grass, 0.1)));
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let i = 0; i < (w * h) / 1500; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 5 + Math.random() * 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = css(reg.grass2, 0.5);
      ctx.fill();
    }
    ctx.restore();
    rr(ctx, 3, 3, w - 6, h - 6, r);
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    this.textures.addCanvas(key, cv);
    return key;
  }

  toast(text) {
    const { width: W, height: H } = this.scale;
    const u = uiScale(this);
    const f = txt(this, W / 2, H * 0.9, text, 24 * u, 0xffe08a).setDepth(100);
    this.tweens.add({ targets: f, alpha: 0, delay: 1000, duration: 500, onComplete: () => f.destroy() });
  }
}
