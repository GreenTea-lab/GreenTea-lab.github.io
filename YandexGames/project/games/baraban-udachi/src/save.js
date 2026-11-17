// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { START_COINS } from './data.js';

const KEY = 'baraban_udachi_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: START_COINS,
  bank: 0, // всего выиграно очков — для рейтинга
  look: 0, // портрет игрока
  skin: 'classic',
  owned: { classic: 1 },
  prizes: {}, // id → сколько раз выигран
  gifts: {}, // id → сколько подарено
  bonusLetters: 0, // открытые буквы от подарков ведущему
  used: [], // недавние задания (чтобы не повторялись)
  settings: { musicVol: 0.5, sfxVol: 0.85, voiceVol: 1, fast: false },
  noAds: false,
  daily: { day: '', streak: 0 },
  freeAdAt: 0,
  seen: {},
  run: null, // забег: тройки → полуфинал → суперигра
  stats: { games: 0, tours: 0, finals: 0, supers: 0, words: 0, letters: 0 },
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
    for (const k of ['settings', 'owned', 'daily', 'stats']) d[k] = Object.assign(def[k], d[k] || {});
    d.prizes = d.prizes || {};
    d.gifts = d.gifts || {};
    d.seen = d.seen || {};
    d.used = Array.isArray(d.used) ? d.used : [];
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
