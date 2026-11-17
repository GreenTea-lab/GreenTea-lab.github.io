// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { START_COINS } from './data.js';

const KEY = 'dacha_domino_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: START_COINS,
  rating: 0,
  skin: 'ivory',
  table: 'oilcloth',
  place: 'summer',
  owned: { ivory: 1, rainbow: 1, oilcloth: 1, summer: 1 },
  last: { mode: 'goat', n: 2, target: 51, diff: 1 },
  cur: null, // незаконченная партия
  settings: { musicVol: 0.6, sfxVol: 0.85, fast: false, hints: 'auto' },
  noAds: false,
  daily: { day: '', streak: 0 },
  freeAdAt: 0,
  seen: {},
  stats: { matches: 0, wins: 0, rounds: 0, fish: 0 },
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
    const def = DEFAULT();
    const d = Object.assign(DEFAULT(), pick || {});
    d.settings = Object.assign(def.settings, d.settings || {});
    d.owned = Object.assign(def.owned, d.owned || {});
    d.last = Object.assign(def.last, d.last || {});
    d.daily = Object.assign(def.daily, d.daily || {});
    d.stats = Object.assign(def.stats, d.stats || {});
    d.seen = d.seen || {};
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
};
