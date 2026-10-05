// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'cozy_fishing_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 100,
  xp: 0,
  lvl: 1,
  loc: 0,
  locs: [0],
  gear: { rod: 0, reel: 0, line: 0, net: 0, smoker: 0 },
  bait: { worm: 1, maggot: 5, corn: 0, spinner: 0, jig: 0 },
  cur: 'worm',
  keep: [], // садок: { id, w, p }
  smoke: [], // коптильня: { id, w, p, end }
  atlas: {}, // id: { n, best }
  stats: { caught: 0, grams: 0, sold: 0, earned: 0, legends: 0, casts: 0 },
  daily: { day: -1, quests: [], chest: false },
  login: { last: null, streak: 0 },
  sales: 0,
  luck: 0,
  freeAt: 0,
  char: null,
  tutDone: false,
  noAds: false,
  settings: { musicVol: 0.5, sfxVol: 0.8 },
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
    for (const k of ['gear', 'bait', 'stats', 'settings', 'daily', 'login']) this.data[k] = Object.assign(DEFAULT()[k], this.data[k] || {});
    this.data.bait.worm = 1;
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
