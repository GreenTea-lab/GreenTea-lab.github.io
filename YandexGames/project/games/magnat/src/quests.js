// Задания дня и достижения: счётчики событий, прогресс, награды
import { QUESTS, QUESTS_PER_DAY, ACHIEVEMENTS } from './data.js';
import { save } from './save.js';

const today = () => new Date().toISOString().slice(0, 10);

// три задания на сегодня (одинаковые в течение дня, без повторов)
export function dailyQuests() {
  const d = save.data;
  const day = today();
  if (d.quests.day !== day) {
    let s = [...day].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const ids = QUESTS.map((q) => q.id).sort(() => r() - 0.5);
    d.quests = { day, list: ids.slice(0, QUESTS_PER_DAY).map((id) => ({ id, p: 0, got: 0 })) };
  }
  return d.quests.list.map((x) => ({ ...QUESTS.find((q) => q.id === x.id), p: x.p, got: x.got }));
}

// событие ev на n; возвращает список только что выполненных заданий и достижений
export function track(ev, n = 1) {
  const d = save.data;
  const done = [];
  const before = d.cnt[ev] || 0;
  d.cnt[ev] = before + n;
  for (const a of ACHIEVEMENTS) if (a.ev === ev && before < a.n && d.cnt[ev] >= a.n) done.push({ kind: 'ach', id: a.id });
  dailyQuests();
  for (const x of d.quests.list) {
    const q = QUESTS.find((k) => k.id === x.id);
    if (!q || q.ev !== ev || x.p >= q.n) continue;
    x.p = Math.min(q.n, x.p + n);
    if (x.p >= q.n) done.push({ kind: 'quest', id: q.id });
  }
  return done;
}

export function achievements() {
  const d = save.data;
  return ACHIEVEMENTS.map((a) => ({ ...a, p: Math.min(a.n, d.cnt[a.ev] || 0), got: !!d.ach[a.id] }));
}

// сколько наград можно забрать (для значка на кнопке)
export function claimable() {
  return dailyQuests().filter((q) => q.p >= q.n && !q.got).length + achievements().filter((a) => a.p >= a.n && !a.got).length;
}

export function claim(kind, id) {
  const d = save.data;
  if (kind === 'quest') {
    const x = d.quests.list.find((k) => k.id === id);
    const q = QUESTS.find((k) => k.id === id);
    if (!x || !q || x.got || x.p < q.n) return 0;
    x.got = 1;
    d.coins += q.c;
    return q.c;
  }
  const a = ACHIEVEMENTS.find((k) => k.id === id);
  if (!a || d.ach[id] || (d.cnt[a.ev] || 0) < a.n) return 0;
  d.ach[id] = 1;
  d.coins += a.c;
  return a.c;
}
