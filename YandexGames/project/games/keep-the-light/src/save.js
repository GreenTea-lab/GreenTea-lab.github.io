// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { UPGRADES } from './data.js';

const KEY = 'keep_light_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 0,
  nights: {}, // n → { done, best, time }
  nm: {}, // кошмар: n → { done, best }
  up: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
  colors: ['warm'],
  color: 'warm',
  settings: { musicVol: 0.7, sfxVol: 0.9, sens: 1, quality: 'auto' },
  noAds: false,
  freeAdAt: 0,
  plays: 0,
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
    const def = DEFAULT();
    d.settings = Object.assign(def.settings, d.settings || {});
    d.up = Object.assign(def.up, d.up || {});
    d.nights = d.nights && typeof d.nights === 'object' ? d.nights : {};
    d.nm = d.nm && typeof d.nm === 'object' ? d.nm : {};
    d.colors = Array.isArray(d.colors) ? d.colors : def.colors;
    if (!d.colors.includes('warm')) d.colors.unshift('warm');
    if (!d.colors.includes(d.color)) d.color = 'warm';
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

  async flush() {
    this.data.ts = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {}
    await sdk.saveData(this.data, true);
  },

  // сумма лучших результатов всех ночей (обычных и кошмаров) — для лидерборда
  total() {
    const s = (o) => Object.values(o).reduce((a, n) => a + (n.best || 0), 0);
    return s(this.data.nights) + s(this.data.nm);
  },
  done(n) {
    return !!(this.data.nights[n] && this.data.nights[n].done);
  },
  // открыта ли ночь: первая всегда, дальше — если пройдена предыдущая
  open(n) {
    return n === 1 || this.done(n - 1);
  },
  nightmareOpen() {
    return this.done(5);
  },
};
