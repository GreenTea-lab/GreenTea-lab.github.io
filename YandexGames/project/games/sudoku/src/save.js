// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';

const KEY = 'sudoku_zen_save_v2';
const OLD_KEY = 'sudoku_zen_save_v1';
const OLD_TIERS = { easy: 1, medium: 2, hard: 3, expert: 4 };

// перенос прогресса из прошлой версии игры (v1: 4 сада по 30 судоку)
export function migrate(o) {
  const D = DEFAULT();
  D.coins = Math.max(D.coins, (o.coins || 0) + 100); // монеты игрока плюс подарок за обновление
  D.score = o.score || 0;
  D.solved = o.solved || 0;
  D.noAds = !!o.noAds;
  D.tutDone = !!o.tutDone;
  D.settings = Object.assign(D.settings, o.settings || {});
  // на пути открыто столько уровней, сколько судоку уже решено
  D.path.max = Math.min(999, D.solved);
  for (const [k, n] of Object.entries(OLD_TIERS)) if (o.best && o.best[k]) D.best['classic:' + n] = o.best[k];
  if (o.daily) {
    D.daily.streak = o.daily.streak || 0;
    D.daily.best = D.daily.streak;
    D.daily.last = o.daily.last || '';
    if (o.daily.done && o.daily.date) D.daily.done[o.daily.date] = 2;
  }
  D.flags.migrated = 1;
  D.ts = o.ts || 0;
  return D;
}

const DEFAULT = () => ({
  v: 2,
  ts: 0,
  coins: 200,
  freeHints: 3,
  score: 0,
  solved: 0,
  perfect: 0,
  hintsUsed: 0,
  noAds: false,
  tutDone: false,
  settings: { musicVol: 0.45, sfxVol: 0.8, text: 0, theme: 'night', autoCheck: true, timer: true, petals: true, hlPeers: true, hlSame: true, input: 'cell', skin: 'paper' },
  skins: [], // купленные стили поля
  premium: false, // «Сад мастера»
  gift: '', // дата последнего подарка дня
  // путь: звёзды уровней строкой ('0'..'3'), max — наибольший открытый уровень
  path: { stars: '', max: 0 },
  // свободная игра: номер следующей головоломки по виду и сложности ('classic:2')
  free: {},
  best: {}, // лучшее время по виду и сложности
  stats: {}, // { 'classic:2': { n, t } }
  ip: {}, // незаконченные: ключ -> состояние поля
  last: '',
  daily: { done: {}, streak: 0, best: 0, last: '', saved: '', medals: {} },
  garden: { extra: 0, seen: 0 },
  ach: {}, // полученные награды за достижения
  flags: {}, // разовые события: diag, mini, fast, clean, master …
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
    if (cloud && cloud.v === 2 && (!local || (cloud.ts || 0) >= (local.ts || 0))) pick = cloud;
    if (!pick) {
      // нового сохранения нет: ищем прошлую версию в облаке и в localStorage
      let old = null;
      try {
        const raw = localStorage.getItem(OLD_KEY);
        if (raw) old = JSON.parse(raw);
      } catch (e) {}
      if (cloud && cloud.v !== 2 && (!old || (cloud.ts || 0) >= (old.ts || 0))) old = cloud;
      if (old && (old.solved || old.coins || old.score)) {
        pick = migrate(old);
        this.migrated = true;
      }
    }
    const D = DEFAULT();
    this.data = Object.assign(D, pick || {});
    for (const k of ['settings', 'path', 'daily', 'garden']) this.data[k] = Object.assign(DEFAULT()[k], this.data[k] || {});
    for (const k of ['free', 'best', 'stats', 'ip', 'ach', 'flags']) this.data[k] = this.data[k] || {};
    if (!this.data.daily.done) this.data.daily.done = {};
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
