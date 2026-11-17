// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { XP_LEVEL } from './data.js';
import {DEFAULT,sanitizeSave,saveTimestamp,isSaveSnapshot} from './save-schema.js';
import { MAPS } from './city.js';

const KEY = 'hungry_sinkhole_save_v1';

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
    const pick=isSaveSnapshot(cloud) && (!isSaveSnapshot(local) || saveTimestamp(cloud)>=saveTimestamp(local)) ? cloud : local;
    const d=sanitizeSave(pick);
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

  mapOpen(id) {
    const m = MAPS.find((x) => x.id === id);
    return !!m && this.data.level >= m.need;
  },

  // начислить опыт; возвращает список новых уровней
  addXp(n) {
    if(!Number.isFinite(n)||n<=0)return [];
    const d = this.data;
    d.xp += Math.floor(n);
    const ups = [];
    while (d.xp >= XP_LEVEL(d.level)) {
      d.xp -= XP_LEVEL(d.level);
      d.level++;
      ups.push(d.level);
    }
    return ups;
  },
};
