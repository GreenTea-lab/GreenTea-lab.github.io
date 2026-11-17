// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { UPGRADES } from './data.js';

const KEY = 'kitchen_rush_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 0,
  levels: {}, // idx → { stars, best }
  up: Object.fromEntries(UPGRADES.map((k) => [k, 0])),
  chefs: ['cat', 'dog'], // открытые повара
  pick: ['cat', 'dog'], // кем играем (повар 1 и 2)
  settings: { musicVol: 0.7, sfxVol: 0.9, quality: 'auto' },
  noAds: false,
  daily: { day: '' },
  freeAdAt: 0,
  plays: 0,
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
    const def = DEFAULT();
    d.settings = Object.assign(def.settings, d.settings || {});
    d.up = Object.assign(def.up, d.up || {});
    d.levels = d.levels && typeof d.levels === 'object' ? d.levels : {};
    d.chefs = Array.isArray(d.chefs) ? d.chefs : def.chefs;
    for (const c of def.chefs) if (!d.chefs.includes(c)) d.chefs.push(c);
    d.pick = Array.isArray(d.pick) && d.pick.length === 2 ? d.pick : def.pick;
    d.daily = d.daily || { day: '' };
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

  stars() {
    return Object.values(this.data.levels).reduce((a, l) => a + (l.stars || 0), 0);
  },
  total() {
    return Object.values(this.data.levels).reduce((a, l) => a + (l.best || 0), 0);
  },
  // открыт ли уровень: первый всегда, дальше — если на предыдущем есть звезда
  open(i) {
    return i === 0 || (this.data.levels[i - 1] && this.data.levels[i - 1].stars > 0);
  },
};
