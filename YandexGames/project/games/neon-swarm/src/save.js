// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'neon_swarm_save_v1';

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  crystals: 0,
  shop: {},
  best: { score: 0, time: 0, kills: 0, level: 0 },
  settings: { music: true, sfx: true },
  tutorialDone: false,
  runs: 0,
  // мета-прогресс
  sel: { hero: 'h_neon', arena: 'a_grid', diff: 'quick' },
  heroes: { h_neon: true },
  ach: {},
  achSeen: {},
  stats: { kills: 0, bosses: {}, evos: {}, chests: 0, wins: 0, dailyWins: 0, arenas: {} },
  threatWon: 0, // максимальная пройденная угроза (0 — ни одной), обычный режим считается отдельно в hardUnlocked
  bestThreat: {},
  stars: { quick: 0, calm: 0, normal: 0 },
  daily: { day: '', claimed: false, adClaimed: false, streak: 0, lastClaim: '', c: {}, q: [], done: [] },
  dailyRun: { day: '', best: 0, won: false },
  rushBest: 0,
  reduceFx: false,
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
    this.data.shop = this.data.shop || {};
    const D = DEFAULT();
    for (const k of ['sel', 'stats', 'daily', 'dailyRun', 'stars']) this.data[k] = Object.assign(D[k], this.data[k] || {});
    this.data.heroes = Object.assign(D.heroes, this.data.heroes || {});
    // старый хардкор = угроза 1; пройденный хардкор открывает угрозу 2
    if (this.data.hardWon && !this.data.threatWon) this.data.threatWon = 1;
    if (this.data.bestHard && !this.data.bestThreat[1]) this.data.bestThreat[1] = this.data.bestHard;
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

  shopLvl(id) {
    return this.data.shop[id] || 0;
  },
};

// день по Москве: ежедневные награды и задания меняются в полночь МСК
export function dayKey(ts = Date.now()) {
  const d = new Date(ts + 3 * 3600 * 1000);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}
export function dayNum(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
