// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'kingdom_towers_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  gems: 0,
  stars: {},
  shop: {},
  settings: { music: true, sfx: true },
  seen: {},
  tut: {},
});

export const save = {
  data: DEFAULT(),

  async load() {
    let local = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) local = JSON.parse(raw);
    } catch (e) {}
    let cloud = null;
    try {
      cloud = await sdk.loadData();
    } catch (e) {}
    let pick = local;
    if (cloud && (!local || (cloud.ts || 0) >= (local.ts || 0))) pick = cloud;
    const d = Object.assign(DEFAULT(), pick || {});
    d.settings = Object.assign(DEFAULT().settings, d.settings || {});
    d.stars = d.stars || {};
    d.shop = d.shop || {};
    d.seen = d.seen || {};
    d.tut = d.tut || {};
    this.data = d;
  },

  write(cloud = true) {
    this.data.ts = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {}
    if (cloud) sdk.saveData(this.data);
  },

  // немедленная запись в облако (после покупки, до consumePurchase)
  async flush() {
    this.data.ts = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {}
    await sdk.saveData(this.data, true);
  },

  shopLvl(id) {
    return this.data.shop[id] || 0;
  },
  starsOf(l) {
    return this.data.stars[l] || 0;
  },
  totalStars() {
    return Object.values(this.data.stars).reduce((a, b) => a + b, 0);
  },
  unlocked(l) {
    return l === 1 || this.starsOf(l - 1) > 0;
  },
};
