// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { PAINTS } from './cars.js';

const KEY = 'cloud_racers_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 300,
  cups: 0,
  car: 'bug',
  cars: { bug: { up: [0, 0, 0, 0], paint: PAINTS[0] } },
  tracks: {},
  unlocked: 1,
  settings: { musicVol: 0.7, sfxVol: 0.9, engVol: 0.35, quality: 'auto' },
  noAds: false,
  daily: { day: '' },
  tut: 0,
  races: 0,
  wins: 0,
  freeAdAt: 0,
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
    d.cars = d.cars && typeof d.cars === 'object' ? d.cars : {};
    if (!d.cars.bug) d.cars.bug = { up: [0, 0, 0, 0], paint: PAINTS[0] };
    for (const k in d.cars) d.cars[k].up = (d.cars[k].up || [0, 0, 0, 0]).slice(0, 4).map((v) => v | 0);
    if (!d.cars[d.car]) d.car = 'bug';
    d.tracks = d.tracks || {};
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
};
