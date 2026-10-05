// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'tractor_farm_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 150,
  xp: 0,
  lvl: 1,
  earned: 0,
  harvested: 0,
  sales: 0,
  upg: { speed: 0, width: 0, cap: 0, grow: 0 },
  tractors: ['red'],
  tr: 'red',
  fields: [],
  load: {},
  orders: [],
  seed: 'wheat',
  pos: null,
  noAds: false,
  tutDone: false,
  settings: { musicVol: 0.5, sfxVol: 0.8, quality: 'auto', engine: true },
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
    this.data.settings = Object.assign(DEFAULT().settings, this.data.settings || {});
    this.data.upg = Object.assign(DEFAULT().upg, this.data.upg || {});
    this.data.load = this.data.load || {};
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
