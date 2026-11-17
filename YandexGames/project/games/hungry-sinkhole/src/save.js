// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { UPGRADES, SKINS, XP_LEVEL } from './data.js';
import { MAPS } from './city.js';

const KEY = 'hungry_sinkhole_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 0,
  level: 1,
  xp: 0,
  skins: ['classic'],
  skin: 'classic',
  adSkins: {},
  up: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
  best: 0,
  solo: {}, // карта → { pct, pts, stars }
  map: 'town',
  mode: 'battle',
  settings: { musicVol: 0.7, sfxVol: 0.9, quality: 'auto' },
  noAds: false,
  freeAdAt: 0,
  rounds: 0,
  wins: 0,
  tutDone: false,
  daily: null, // задания дня: { day, q: [...] }
  gift: { last: '', streak: 0 },
  zenBest: 0,
  expeditions: {},
  records: {},
  mastery: {},
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
    d.up = Object.assign(def.up, d.up || {});
    d.solo = d.solo && typeof d.solo === 'object' ? d.solo : {};
    d.expeditions = d.expeditions || {};
    d.records = d.records || {};
    d.mastery = d.mastery || {};
    d.adSkins = d.adSkins || {};
    d.gift = d.gift && typeof d.gift === 'object' ? d.gift : def.gift;
    // кто уже играл до появления обучения — обучение не показываем
    if (pick && pick.tutDone === undefined && pick.rounds > 0) d.tutDone = true;
    if (!['battle', 'royale', 'solo', 'zen'].includes(d.mode)) d.mode = 'battle';
    d.skins = Array.isArray(d.skins) ? d.skins.filter((s) => SKINS.some((k) => k.id === s)) : def.skins;
    if (!d.skins.includes('classic')) d.skins.unshift('classic');
    if (!d.skins.includes(d.skin)) d.skin = 'classic';
    if (!MAPS.some((m) => m.id === d.map)) d.map = 'town';
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
    const d = this.data;
    d.xp += n;
    const ups = [];
    while (d.xp >= XP_LEVEL(d.level)) {
      d.xp -= XP_LEVEL(d.level);
      d.level++;
      ups.push(d.level);
    }
    return ups;
  },
};
