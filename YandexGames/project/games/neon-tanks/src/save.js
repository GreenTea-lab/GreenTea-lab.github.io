// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'neon_tanks_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 0,
  nick: '',
  mode: 'ffa',
  skin: 'cyan',
  trail: 'none',
  skins: ['cyan'],
  trails: ['none'],
  boosts: { lvl15: 0, lvl30: 0 },
  useBoost: '',
  best: { score: 0, level: 0, cls: 'basic', kills: 0 },
  settings: { musicVol: 0.7, sfxVol: 0.9 },
  noAds: false,
  hintDone: false,
  runs: 0,
  totalKills: 0,
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
    this.data.best = Object.assign(DEFAULT().best, this.data.best || {});
    this.data.settings = Object.assign(DEFAULT().settings, this.data.settings || {});
    const d = this.data;
    d.skins = Array.isArray(d.skins) ? d.skins : ['cyan'];
    d.trails = Array.isArray(d.trails) ? d.trails : ['none'];
    d.boosts = Object.assign({ lvl15: 0, lvl30: 0 }, d.boosts || {});
    if (!d.skins.includes(d.skin)) d.skin = 'cyan';
    if (!d.trails.includes(d.trail)) d.trail = 'none';
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
