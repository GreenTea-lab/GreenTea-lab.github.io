// Ежедневное: погода по 6-часовым отрезкам, рыба дня, задания, календарь подарков за вход
import { LOCATIONS, SPECIES, rng } from './data.js';

// номер дня по местному времени игрока
export function dayNum(ts = Date.now()) {
  const d = new Date(ts);
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
}

// погода меняется 4 раза в сутки; ночью дождя меньше
export function weatherAt(ts = Date.now()) {
  const d = new Date(ts);
  const block = Math.floor(d.getHours() / 6);
  const R = rng(dayNum(ts) * 7 + block * 131 + 17);
  R();
  const x = R();
  if (x < 0.42) return 'sun';
  if (x < 0.7) return 'cloud';
  if (x < 0.86) return 'rain';
  return 'fog';
}

// когда сменится погода (мс)
export function weatherNext(ts = Date.now()) {
  const d = new Date(ts);
  const n = new Date(d.getFullYear(), d.getMonth(), d.getDate(), (Math.floor(d.getHours() / 6) + 1) * 6, 0, 0, 0);
  return n.getTime() - ts;
}

// рыба дня на водоёме: цена ×2 и клюёт чаще (не легендарная)
export function fishOfDay(locIdx, day = dayNum()) {
  const L = LOCATIONS[locIdx];
  const pool = L.fish.filter((id) => SPECIES[id].r <= 3);
  const R = rng(day * 13 + locIdx * 977 + 5);
  R();
  return pool[Math.floor(R() * pool.length)];
}

// ---------- задания ----------
// kinds: catch (N рыб), species (вид), weight (тяжелее X кг), sell (продать на N), smoke (закоптить N),
// bubbles (на пузырях N), pred (хищников N), cat (угостить кота)
export function makeQuests(day, lvl, unlockedLocs) {
  const R = rng(day * 31 + 7);
  R();
  const locs = unlockedLocs.length ? unlockedLocs : [0];
  const loc = locs[Math.floor(R() * locs.length)];
  const L = LOCATIONS[loc];
  const k = 1 + 0.25 * (lvl - 1);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const common = L.fish.filter((id) => SPECIES[id].r <= 2 && (SPECIES[id].time !== 'night'));
  const sp = pick(common.length ? common : L.fish);
  const heavy = Math.max(0.5, Math.round(SPECIES[sp].w[0] * 2 + 0.3 * lvl) / 2);
  const all = [
    { k: 'catch', n: 8 + Math.min(12, lvl), r: 70 },
    { k: 'species', s: sp, loc, n: 2, r: 90 },
    { k: 'weight', x: Math.min(heavy, 3 + lvl * 0.5), n: 1, r: 100 },
    { k: 'sell', n: Math.round((150 + lvl * 90) / 10) * 10, r: 80 },
    { k: 'smoke', n: 2, r: 80 },
    { k: 'bubbles', n: 3, r: 90 },
    { k: 'cat', n: 1, r: 60 },
  ];
  if (lvl >= 3) all.push({ k: 'pred', n: 3, r: 100 });
  const out = [];
  // первое задание всегда «поймать N рыб» — простое и понятное
  out.push(all[0]);
  const rest = all.slice(1);
  while (out.length < 3) {
    const i = Math.floor(R() * rest.length);
    out.push(rest.splice(i, 1)[0]);
  }
  return out.map((q) => ({ ...q, r: Math.round((q.r * k) / 5) * 5, got: 0, done: false, claimed: false }));
}

// продвинуть задания событием; возвращает список только что выполненных
export function questEvent(quests, ev) {
  const fin = [];
  for (const q of quests) {
    if (q.done) continue;
    let add = 0;
    if (ev.t === 'catch') {
      if (q.k === 'catch') add = 1;
      if (q.k === 'species' && ev.id === q.s) add = 1;
      if (q.k === 'weight' && ev.w >= q.x) add = 1;
      if (q.k === 'bubbles' && ev.bubbles) add = 1;
      if (q.k === 'pred' && SPECIES[ev.id].pred) add = 1;
    } else if (ev.t === 'sell' && q.k === 'sell') add = ev.n;
    else if (ev.t === 'smoke' && q.k === 'smoke') add = 1;
    else if (ev.t === 'cat' && q.k === 'cat') add = 1;
    if (add) {
      q.got = Math.min(q.n, q.got + add);
      if (q.got >= q.n) {
        q.done = true;
        fin.push(q);
      }
    }
  }
  return fin;
}

// ---------- календарь подарков: 7 дней по кругу ----------
export const GIFTS = [
  { coins: 100 },
  { maggot: 10 },
  { coins: 250 },
  { corn: 10, spinner: 5 },
  { coins: 500 },
  { jig: 2 },
  { coins: 1000, jig: 3 },
];

// состояние входа: { last: день последнего подарка, streak: сколько дней подряд забрано }
// возвращает { can, idx, broken } — можно ли забрать сегодня, какой по счёту день, прервалась ли серия
export function giftState(login, today = dayNum()) {
  if (!login || login.last == null) return { can: true, idx: 0, broken: false };
  if (login.last === today) return { can: false, idx: (login.streak - 1) % 7, broken: false };
  if (login.last === today - 1) return { can: true, idx: login.streak % 7, broken: false };
  return { can: true, idx: 0, broken: login.streak > 1, lost: login.streak };
}

// «сундук рыбака» за все три задания дня
export const CHEST = { maggot: 5, spinner: 3, jig: 1, coins: 150 };
