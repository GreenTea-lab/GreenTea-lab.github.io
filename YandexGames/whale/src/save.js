// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'whale_town_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  shells: 0,
  run: 0,
  all: 0,
  b: {},
  up: { tap: 0, wind: 0, gull: 0, night: 0, fount: 0 },
  stage: 1,
  miles: 0,
  island: 0,
  cards: [],
  pearls: 0,
  pearlsEver: 0,
  migr: 0,
  islandsAll: 0,
  goals: {},
  taps: 0,
  gulls: 0,
  login: { last: null, streak: 0 },
  buy: 1,
  tut: 0,
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
    this.data = Object.assign(DEFAULT(), pick || {});
    for (const k of ['up', 'settings', 'login']) this.data[k] = Object.assign(DEFAULT()[k], this.data[k] || {});
    this.loadedTs = pick ? pick.ts || 0 : 0;
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
