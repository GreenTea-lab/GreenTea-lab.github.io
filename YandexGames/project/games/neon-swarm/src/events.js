// Праздничные события: начинаются за 14 дней до праздника и идут ещё 7 дней после него.
// Во время события в каждом забеге падают праздничные жетоны, за них открываются задания и облик героя.
import { COLORS } from './data.js';
import { save } from './save.js';

const DAY = 86400000;
const BEFORE = 14;
const AFTER = 7;

export const EVENTS = [
  { id: 'halloween', month: 10, day: 31, arena: 'a_pumpkin', token: 'tok_pumpkin', skin: 'sk_pumpkin', color: COLORS.orange },
  { id: 'newyear', month: 1, day: 1, arena: 'a_snow', token: 'tok_snow', skin: 'sk_snow', color: 0x9ad8ff },
  { id: 'cosmos', month: 4, day: 12, arena: 'a_orbit', token: 'tok_star', skin: 'sk_orbit', color: COLORS.blue },
];

// праздничные арены: в обычном списке арен их нет, открываются только через окно события
export const EVENT_ARENAS = [
  { id: 'a_pumpkin', grid: 0xff7a18, stars: 0xffb060, bg: 0x0d0406, pillars: 0.4, pillarColor: 0xff7a18, pillarTex: 'pumpkin', rule: 'dark', reward: 1.25, order: ['mirror', 'boss', 'warden', 'serpent', 'pulsar', 'hive'] },
  { id: 'a_snow', grid: 0x9ad8ff, stars: 0xffffff, bg: 0x030a18, pillars: 0.3, pillarColor: 0x3dff8c, pillarTex: 'tree', rule: 'wind', snow: true, reward: 1.25, order: ['pulsar', 'boss', 'warden', 'hive', 'serpent', 'mirror'] },
  { id: 'a_orbit', grid: 0x4d7cff, stars: 0xc8d8ff, bg: 0x02041a, pillars: 0.3, pillarColor: 0xb04bff, pillarTex: 'planet', reward: 1.25, order: ['serpent', 'pulsar', 'warden', 'mirror', 'boss', 'hive'] },
];

// облики героя за событие: остаются навсегда
export const SKINS = {
  sk_pumpkin: { color: COLORS.orange, spin: 0 },
  sk_snow: { color: 0x9ad8ff, spin: 0.8 },
  sk_orbit: { color: COLORS.blue, spin: 2.5 },
};

// задания события: k — что считаем за время праздника (в любом режиме), n — сколько нужно, r — награда в праздничной валюте
export const EVENT_TASKS = [
  { k: 'runs', n: 2, r: 10 },
  { k: 'kills', n: 1000, r: 10 },
  { k: 'bosses', n: 3, r: 15 },
  { k: 'time', n: 1200, r: 15 },
  { k: 'wins', n: 1, r: 20 },
  { k: 'kills', n: 5000, r: 25 },
];

// магазин праздника: облик героя, сундук на старт следующего забега, обмен на кристаллы
export const EVENT_SHOP = [
  { id: 'skin', price: 60 },
  { id: 'chest', price: 10, max: 3 },
  { id: 'cr', price: 20, crystals: 100 },
];

// праздник года y по Москве (полночь МСК = 21:00 UTC предыдущего дня)
function holidayTs(ev, y) {
  return Date.UTC(y, ev.month - 1, ev.day) - 3 * 3600 * 1000;
}

// какое событие идёт сейчас: { ev, key, start, end, holiday } или null
export function activeEvent(now = Date.now()) {
  const dbg = typeof window !== 'undefined' && window.__NS_DEBUG && window.__NS_DEBUG.event;
  if (dbg === 'none') return null;
  if (dbg) {
    const ev = EVENTS.find((e) => e.id === dbg);
    if (ev) now = holidayTs(ev, new Date(now).getUTCFullYear()) + DAY / 2;
  }
  const y = new Date(now + 3 * 3600 * 1000).getUTCFullYear();
  for (const ev of EVENTS) {
    for (const yy of [y - 1, y, y + 1]) {
      const h = holidayTs(ev, yy);
      const start = h - BEFORE * DAY;
      const end = h + (AFTER + 1) * DAY; // включая седьмой день после праздника
      if (now >= start && now < end) return { ev, key: ev.id + yy, start, end, holiday: h };
    }
  }
  return null;
}

// прогресс события в сохранении: bal — валюта на руках, got — сколько собрано всего, остальное — счётчики заданий
export function eventState(a) {
  const d = save.data;
  d.ev = d.ev || {};
  const s = (d.ev[a.key] = d.ev[a.key] || { v: 2, bal: 0, got: 0, runs: 0, kills: 0, bosses: 0, time: 0, wins: 0, done: [] });
  // старое сохранение: жетоны копились без трат, задания были другими
  if (s.v !== 2) {
    Object.assign(s, { v: 2, bal: s.tok || 0, got: s.tok || 0, kills: 0, bosses: 0, time: 0, wins: 0, done: [] });
    delete s.tok;
  }
  s.done = s.done || [];
  return s;
}

// забег закончился во время праздника: валюта и счётчики заданий
export function eventRunEnd(a, r) {
  const s = eventState(a);
  s.bal += r.tokens;
  s.got += r.tokens;
  s.kills += r.kills;
  s.bosses += r.bosses;
  s.time += r.time;
  if (r.holiday) s.runs += 1;
  if (r.holiday && r.won) s.wins += 1;
}

export function eventTasks(a) {
  const s = eventState(a);
  return EVENT_TASKS.map((t, i) => {
    const cur = Math.min(t.n, s[t.k] || 0);
    const done = s.done.includes(i);
    return { i, ...t, cur, done, ready: cur >= t.n && !done };
  });
}

export function claimEventTask(a, i) {
  const t = eventTasks(a)[i];
  if (!t || !t.ready) return null;
  const s = eventState(a);
  s.done.push(i);
  s.bal += t.r;
  save.write();
  return t.r;
}

// состояние товара: можно ли купить и почему нет
export function shopItem(a, it) {
  const d = save.data;
  const s = eventState(a);
  const owned = it.id === 'skin' && !!(d.skins && d.skins[a.ev.skin]);
  const full = it.max && (d.startChest || 0) >= it.max;
  return { ...it, owned, full, can: !owned && !full && s.bal >= it.price };
}

export function buyEventItem(a, id) {
  const it = EVENT_SHOP.find((x) => x.id === id);
  if (!it || !shopItem(a, it).can) return false;
  const d = save.data;
  const s = eventState(a);
  s.bal -= it.price;
  if (id === 'skin') {
    d.skins = d.skins || {};
    d.skins[a.ev.skin] = true;
    d.skin = a.ev.skin;
  } else if (id === 'chest') d.startChest = (d.startChest || 0) + 1;
  else if (id === 'cr') d.crystals += it.crystals;
  save.write();
  return true;
}

export function eventBadge() {
  const a = activeEvent();
  return !!a && (eventTasks(a).some((t) => t.ready) || shopItem(a, EVENT_SHOP[0]).can);
}

// дата окончания для подписи «до 7 ноября»
export function eventEndDate(a) {
  const d = new Date(a.end - DAY + 3 * 3600 * 1000);
  return { day: d.getUTCDate(), month: d.getUTCMonth() };
}
