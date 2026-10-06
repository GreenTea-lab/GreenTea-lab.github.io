// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
const KEY = 'sky_parkour_save_v1';
const DEFAULT = () => ({ v: 1, ts: 0, max: 1, stars: {}, best: {}, coins: 0, skins: ['red'], skin: 'red', last: 1, gift: { last: null, streak: 0 }, tut: {}, noAds: false, settings: { musicVol: 0.5, sfxVol: 0.8, sens: 1, autoCam: true, quality: 'auto' } });
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
    for (const k of ['settings', 'gift', 'tut']) this.data[k] = Object.assign(DEFAULT()[k], this.data[k] || {});
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
