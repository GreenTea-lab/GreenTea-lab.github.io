// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'nardy_teahouse_v1';

export const START_COINS = 200;
// награды за победу по уровню бота (умножаются на марс/кокс)
export const WIN_COINS = [40, 80, 140];
export const WIN_POINTS = [10, 25, 50];
export const AD_COINS = 150;
export const AD_COOLDOWN = 3 * 60 * 1000;
export const DAILY = [50, 80, 120, 160, 200, 250, 400];

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: START_COINS,
  score: 0,
  games: 0,
  wins: 0,
  stats: { long: [[0, 0], [0, 0], [0, 0]], short: [[0, 0], [0, 0], [0, 0]] },
  owned: { board: ['walnut'], checkers: ['classic'], dice: ['bone'] },
  eq: { board: 'walnut', checkers: 'classic', dice: 'bone' },
  last: { mode: 'long', level: 1 },
  cur: null, // незаконченная партия
  settings: { musicVol: 0.6, sfxVol: 0.8, quality: 'auto', confirm: false, autoroll: false, pips: true },
  noAds: false,
  daily: { day: '', streak: 0 },
  freeAdAt: 0,
  seen: {},
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
    d.eq = Object.assign(def.eq, d.eq || {});
    d.stats = Object.assign(def.stats, d.stats || {});
    d.daily = Object.assign(def.daily, d.daily || {});
    d.last = Object.assign(def.last, d.last || {});
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
