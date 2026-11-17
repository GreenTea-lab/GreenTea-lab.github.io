// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'durak_veranda_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 200,
  points: 0,
  streak: 0,
  stats: { games: 0, wins: 0, firsts: 0, duraks: 0, bestStreak: 0 },
  hints: 3,
  cloth: 'felt',
  back: 'classic',
  cloths: ['felt'],
  backs: ['classic'],
  cfg: { mode: 'podkidnoy', deck: 36, players: 2, level: 1 },
  settings: { musicVol: 0.6, sfxVol: 0.9, four: false, speed: 'normal', sort: 'suit', hints: true },
  noAds: false,
  daily: { day: '', streak: 0 },
  cur: null, // незаконченная партия
  tut: {},
  freeAt: 0,
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
    d.stats = Object.assign(def.stats, d.stats || {});
    d.cfg = Object.assign(def.cfg, d.cfg || {});
    for (const [k, base] of [['cloths', 'felt'], ['backs', 'classic']]) {
      d[k] = Array.isArray(d[k]) ? d[k] : [base];
      if (!d[k].includes(base)) d[k].unshift(base);
    }
    if (!d.cloths.includes(d.cloth)) d.cloth = 'felt';
    if (!d.backs.includes(d.back)) d.back = 'classic';
    d.daily = d.daily || { day: '', streak: 0 };
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

};
