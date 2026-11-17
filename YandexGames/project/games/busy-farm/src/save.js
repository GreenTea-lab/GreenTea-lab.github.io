// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { UPGRADES, UP_COST, MEDAL_STARS } from './data.js';

const KEY = 'busy_farm_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  levels: {}, // n → { medal: 'gold'|'silver'|'done', best: секунд }
  up: Object.fromEntries(UPGRADES.map((k) => [k, 0])),
  spent: 0, // потрачено звёзд
  bank: 0, // копилка монет
  settings: { musicVol: 0.6, sfxVol: 0.85, quality: 'auto' },
  noAds: false,
  tips: {}, // показанные подсказки
  plays: 0,
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
    if (cloud && cloud.v && (!local || (cloud.ts || 0) >= (local.ts || 0))) pick = cloud;
    const def = DEFAULT();
    const d = Object.assign(def, pick || {});
    d.settings = Object.assign(DEFAULT().settings, d.settings || {});
    d.up = Object.assign(DEFAULT().up, d.up || {});
    d.levels = d.levels && typeof d.levels === 'object' ? d.levels : {};
    d.tips = d.tips || {};
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

  starsEarned() {
    let n = 0;
    for (const l of Object.values(this.data.levels)) n += MEDAL_STARS[l.medal] || 0;
    return n;
  },
  starsFree() {
    return this.starsEarned() - this.data.spent;
  },
  upCost(k) {
    const lv = this.data.up[k] || 0;
    return lv >= UP_COST.length ? Infinity : UP_COST[lv];
  },
  // открыт ли уровень n (с 1)
  open(n) {
    return n === 1 || !!this.data.levels[n - 1];
  },
  nextLevel() {
    for (let n = 1; n <= 48; n++) if (!this.data.levels[n]) return n;
    return 48;
  },
};
