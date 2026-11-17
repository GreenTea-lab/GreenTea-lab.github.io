// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { START_COINS } from './data.js';

const KEY = 'magnat_v1';

const DEFAULT = () => ({
  v: 2,
  ts: 0,
  coins: START_COINS,
  rating: 0,
  token: 'car',
  place: 'sunset',
  houses: 'classic',
  owned: { car: 1, doll: 1, boat: 1, plane: 1, sunset: 1, classic: 1 },
  last: { n: 4, diff: 1, limit: 2, h: 1, rules: {} },
  cur: null, // незаконченная партия
  settings: { musicVol: 0.6, sfxVol: 0.85, speed: 0, cam: 'follow', hints: true },
  noAds: false,
  daily: { day: '', streak: 0 },
  freeAdAt: 0,
  seen: {},
  stats: { games: 0, wins: 0 },
  cnt: {}, // счётчики событий за всё время (для достижений)
  ach: {}, // забранные награды за достижения
  quests: { day: '', list: [] }, // задания дня
  tut: {}, // показанные шаги обучения
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
    d.last = Object.assign(def.last, d.last || {});
    d.daily = Object.assign(def.daily, d.daily || {});
    d.stats = Object.assign(def.stats, d.stats || {});
    d.seen = d.seen || {};
    d.cnt = d.cnt || {};
    d.ach = d.ach || {};
    d.tut = d.tut || {};
    d.quests = d.quests && d.quests.list ? d.quests : { day: '', list: [] };
    // v1 → v2: длина партии получила вариант «10 кругов» (индексы сдвинулись), скорость стала тремя ступенями
    if ((d.v || 1) < 2) {
      d.last.limit = Math.min(3, (d.last.limit || 0) + 1);
      if (d.settings.fast) d.settings.speed = 1;
      // старым игрокам обучение уже не нужно
      if (d.stats.games > 0) d.tut = { skip: 1 };
      d.v = 2;
    }
    d.last.rules = d.last.rules || {};
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
