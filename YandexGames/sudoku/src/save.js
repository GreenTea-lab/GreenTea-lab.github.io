// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'sudoku_zen_save_v1';
export const DIFFS = ['easy', 'medium', 'hard', 'expert'];

const CH = () => ({ stars: {}, cur: 0, free: 0 });

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 100,
  score: 0,
  solved: 0,
  seenItems: 0,
  noAds: false,
  tutDone: false,
  settings: { musicVol: 0.45, sfxVol: 0.8, text: 0, theme: 'night', autoCheck: true, timer: true, petals: true },
  ch: { easy: CH(), medium: CH(), hard: CH(), expert: CH() },
  best: { easy: 0, medium: 0, hard: 0, expert: 0 },
  ip: {},
  last: '',
  daily: { date: '', done: false, streak: 0, last: '' },
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
    this.data.settings = Object.assign(DEFAULT().settings, this.data.settings || {});
    this.data.ch = Object.assign(DEFAULT().ch, this.data.ch || {});
    for (const d of DIFFS) this.data.ch[d] = Object.assign(CH(), this.data.ch[d] || {});
    this.data.best = Object.assign(DEFAULT().best, this.data.best || {});
    this.data.daily = Object.assign(DEFAULT().daily, this.data.daily || {});
    this.data.ip = this.data.ip || {};
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
