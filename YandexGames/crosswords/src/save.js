// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'crosswords_save_v1';

const PROG = () => ({ stars: {}, cur: 0, ip: null });

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 100,
  score: 0,
  solvedWords: 0,
  noAds: false,
  tutDone: false,
  settings: { musicVol: 0.45, sfxVol: 0.8, text: 0, theme: 'light', autoCheck: false },
  p: { ru: PROG(), en: PROG() },
  daily: { date: '', lang: '', puz: null, ip: null, done: false, streak: 0, last: '' },
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
    const D = DEFAULT();
    this.data = Object.assign(D, pick || {});
    this.data.settings = Object.assign(DEFAULT().settings, this.data.settings || {});
    this.data.p = Object.assign({ ru: PROG(), en: PROG() }, this.data.p || {});
    for (const k of ['ru', 'en']) this.data.p[k] = Object.assign(PROG(), this.data.p[k] || {});
    this.data.daily = Object.assign(DEFAULT().daily, this.data.daily || {});
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
};
