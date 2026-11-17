// Постоянные улучшения за кристаллы
import { SHOP, shopCost } from '../data.js';
import { uiScale, txt, button, Layer, panel, panelTex } from '../ui.js';
import { t as tr } from '../i18n.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { topBar } from './MenuScene.js';
import { iap, openStore } from '../iap.js';

const Phaser = window.Phaser;

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init(data) {
    this.from = (data && data.from) || 'Menu';
  }

  create() {
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
    topBar(this, L, { back: () => this.scene.start(this.from) });
    const m = 12 * u;
    const bh = 56 * u;
    // кристаллы за рекламу
    const adAmount = 15;
    L.add(
      button(this, {
        x: W - m - 85 * u,
        y: m + bh / 2,
        w: 170 * u,
        h: bh,
        style: 'gold',
        label: '+' + adAmount,
        icon: 'ad',
        size: 24 * u,
        onClick: () => {
          audio.suspend('ad');
          sdk.showRewarded(null, (ok) => {
            audio.resume('ad');
            if (ok) {
              save.data.gems += adAmount;
              save.write();
              audio.play('coin');
              this.layout();
            }
          });
        },
      })
    );
    const narrow = W < 1000 * u;
    const titleY = m + bh + (narrow ? 34 * u : -bh / 2 + 28 * u);
    // сокровищница: самоцветы за портальную валюту (на узком экране — во втором ряду)
    if (iap.available()) {
      L.add(
        button(this, {
          x: narrow ? W - m - 85 * u : W - m - 85 * u - 180 * u,
          y: narrow ? titleY : m + bh / 2,
          w: 170 * u,
          h: narrow ? bh * 0.9 : bh,
          style: 'green',
          label: tr('store'),
          icon: 'gem',
          size: 24 * u,
          onClick: () => this.openStore(),
        })
      );
    }
    if (narrow) L.add(txt(this, W / 2, titleY, tr('shopTitle'), 32 * u, 0xffc93c, { title: true }));
    else L.add(txt(this, W / 2, m + bh / 2, tr('shopTitle'), 34 * u, 0xffc93c, { title: true }));

    const top = narrow ? titleY + 34 * u : m + bh + 16 * u;
    const land = W > H;
    const cols = land ? 6 : 3;
    const rows = Math.ceil(SHOP.length / cols);
    const gap = 10 * u;
    const aw = W - 2 * m;
    const ah = H - top - m;
    const cw = Math.min((aw - (cols - 1) * gap) / cols, 230 * u);
    const ch = Math.min((ah - (rows - 1) * gap) / rows, cw * 1.35);
    const gw = cols * cw + (cols - 1) * gap;
    const gh = rows * ch + (rows - 1) * gap;
    const x0 = W / 2 - gw / 2 + cw / 2;
    const y0 = top + (ah - gh) / 2 + ch / 2;
    const f = Math.min(cw * 0.09, ch * 0.075);

    SHOP.forEach((it, i) => {
      const cx = x0 + (i % cols) * (cw + gap);
      const cy = y0 + Math.floor(i / cols) * (ch + gap);
      const lvl = save.shopLvl(it.id);
      const maxed = lvl >= it.max;
      const cost = maxed ? 0 : shopCost(it, lvl);
      L.add(panel(this, cx, cy, cw, ch, 'wood', 16 * u));
      const is = Math.min(ch * 0.3, cw * 0.4);
      const iconKey = ['archer', 'cannon', 'mage', 'frost', 'ballista'].includes(it.icon) ? `tw_${it.icon}_${Math.max(1, Math.min(4, lvl + 1))}` : 'ic_' + it.icon;
      const im = L.add(this.add.image(cx, cy - ch * 0.26, iconKey));
      im.setScale(is / Math.max(im.width, im.height));
      L.add(txt(this, cx, cy + ch * 0.02, tr(it.id), f * 1.12, 0xffe08a, { wrap: cw * 0.9 }));
      L.add(txt(this, cx, cy + ch * 0.15, tr(it.id + '_d'), f * 0.86, 0xffffff, { wrap: cw * 0.88, strokeK: 0.2 }));
      // уровни
      const pw = cw * 0.76;
      const seg = pw / it.max;
      const pg = L.add(this.add.graphics());
      for (let k = 0; k < it.max; k++) {
        pg.fillStyle(0x2b1a0e, 1).fillRoundedRect(cx - pw / 2 + k * seg + 1, cy + ch * 0.25, seg - 2, Math.max(6, ch * 0.04), 3);
        if (k < lvl) pg.fillStyle(0x7be04f, 1).fillRoundedRect(cx - pw / 2 + k * seg + 3, cy + ch * 0.25 + 2, seg - 6, Math.max(2, ch * 0.04 - 4), 2);
      }
      const can = !maxed && save.data.gems >= cost;
      L.add(
        button(this, {
          x: cx,
          y: cy + ch / 2 - ch * 0.13,
          w: cw * 0.82,
          h: ch * 0.18,
          style: maxed ? 'gold' : can ? 'green' : 'grey',
          label: maxed ? tr('maxed') : String(cost),
          icon: maxed ? undefined : 'gem',
          size: f * 1.15,
          disabled: !can,
          onClick: () => {
            if (save.data.gems < cost || maxed) return;
            save.data.gems -= cost;
            save.data.shop[it.id] = lvl + 1;
            save.write();
            audio.play('upgrade');
            this.layout();
          },
        })
      );
    });
  }

  openStore() {
    openStore({
      title: tr('storeTitle'),
      txt: { owned: tr('iapOwned'), empty: tr('iapEmpty') },
      theme: { bg: '#f6e3b4', panel: '#fbefd0', border: '#6e4426', ink: '#3a2414', muted: '#7a5a38', accent: '#5aa83c', accentInk: '#ffffff', font: 'Rubik, Arial, sans-serif' },
      onBought: () => {
        audio.play('coin');
        this.layout();
      },
      onClose: () => this.layout(),
    });
  }
}
