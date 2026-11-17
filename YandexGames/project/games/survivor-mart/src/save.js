// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { GOOD_IDS, MATS, BUILD_IDS, SKILLS } from './data.js';

const KEY = 'survivor_mart_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  day: 1,
  bat: 80, // заряды — валюта
  earned: 0, // всего заработано (лидерборд)
  rep: 50,
  xp: 0,
  lvl: 1,
  sp: 0,
  skills: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0])),
  stock: Object.assign(Object.fromEntries([...GOOD_IDS, ...MATS, 'trap'].map((k) => [k, 0])), { can: 8, water: 8, candle: 5, bandage: 3, scrap: 3, wood: 8, cloth: 2 }),
  shelves: [], // [{ type, n }]
  prices: {}, // id → 0 дёшево / 1 норма / 2 дорого
  staff: [], // { id, name, role, lvl, look, hurt, loc }
  cand: [],
  candDay: 0,
  nextId: 1,
  build: Object.fromEntries(BUILD_IDS.map((k) => [k, 0])),
  locs: { market: 1 },
  weapons: ['pin'],
  weapon: 'pin',
  barr: { door: -1, winL: -1, winR: -1 }, // -1 — полная прочность
  traps: [], // занятые слоты капканов
  crafting: [], // очередь верстака: { id, left }
  cur: null, // день в процессе: { phase, t, looted }
  stats: { sold: 0, kills: 0, served: 0, days: 0, gifts: 0 },
  ending: 0,
  settings: { musicVol: 0.7, sfxVol: 0.9, quality: 'auto' },
  noAds: false,
  daily: { day: '' },
  crateDay: 0,
  freeAdAt: 0,
  tut: {},
});

export const save = {
  data: DEFAULT(),
  fresh: DEFAULT,

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
    this.data = this.normalize(pick);
  },

  normalize(pick) {
    const def = DEFAULT();
    const d = Object.assign(DEFAULT(), pick || {});
    d.settings = Object.assign(def.settings, d.settings || {});
    d.skills = Object.assign(def.skills, d.skills || {});
    d.stock = Object.assign(Object.fromEntries(Object.keys(def.stock).map((k) => [k, 0])), d.stock || def.stock);
    d.build = Object.assign(def.build, d.build || {});
    d.stats = Object.assign(def.stats, d.stats || {});
    d.barr = Object.assign(def.barr, d.barr || {});
    for (const k of ['shelves', 'staff', 'cand', 'weapons', 'traps', 'crafting']) if (!Array.isArray(d[k])) d[k] = def[k];
    if (!d.weapons.includes('pin')) d.weapons.unshift('pin');
    if (!d.weapons.includes(d.weapon)) d.weapon = 'pin';
    d.locs = d.locs || { market: 1 };
    d.prices = d.prices || {};
    d.daily = d.daily || { day: '' };
    d.tut = d.tut || {};
    return d;
  },

  reset() {
    const keep = { settings: this.data.settings, noAds: this.data.noAds, daily: this.data.daily, freeAdAt: this.data.freeAdAt };
    this.data = Object.assign(DEFAULT(), keep);
    this.write();
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
