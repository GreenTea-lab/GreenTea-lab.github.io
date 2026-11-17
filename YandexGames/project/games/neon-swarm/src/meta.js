// Мета-прогресс: достижения, герои, арены, ежедневная награда, задания и испытание дня
import { ACHIEVEMENTS, HEROES, ARENAS, QUESTS, MUTATORS, EVOLVE, ENEMIES } from './data.js';
import { save, dayKey, dayNum } from './save.js';
import { EVENT_ARENAS } from './events.js';

const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const BOSSES = Object.keys(ENEMIES).filter((k) => ENEMIES[k].boss);

// детерминированный генератор по числу (для заданий и испытания дня)
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export const meta = {
  // очередь только что открытых достижений (для всплывашек)
  fresh: [],

  has(id) {
    return !!save.data.ach[id];
  },

  unlock(id) {
    const d = save.data;
    if (d.ach[id] || !ACH[id]) return false;
    d.ach[id] = Date.now();
    d.crystals += ACH[id].r;
    this.fresh.push(id);
    // открытые героем достижения отмечаем сразу, чтобы не было «откроется позже»
    for (const h of HEROES) if (h.ach === id) d.heroes[h.id] = true;
    if (HEROES.every((h) => this.heroUnlocked(h))) this.unlock('heroes');
    return true;
  },

  takeFresh() {
    const f = this.fresh;
    this.fresh = [];
    return f;
  },

  heroUnlocked(h) {
    return !!save.data.heroes[h.id] || (h.ach && this.has(h.ach)) || !h.cost;
  },
  arenaUnlocked(a) {
    return !a.ach || this.has(a.ach);
  },
  hero(id) {
    return HEROES.find((h) => h.id === id) || HEROES[0];
  },
  arena(id) {
    return ARENAS.find((a) => a.id === id) || EVENT_ARENAS.find((a) => a.id === id) || ARENAS[0];
  },
  buyHero(h) {
    const d = save.data;
    if (this.heroUnlocked(h) || d.crystals < h.cost) return false;
    d.crystals -= h.cost;
    d.heroes[h.id] = true;
    if (HEROES.every((x) => this.heroUnlocked(x))) this.unlock('heroes');
    save.write();
    return true;
  },
  rushUnlocked() {
    return this.has('boss_all');
  },

  // ---------- проверки во время забега ----------
  live(g) {
    const t = g.t;
    if (t >= 300) this.unlock('t5');
    if (t >= 600) this.unlock('t10');
    if (t >= 1200) this.unlock('t20');
    if (g.kills >= 1000) this.unlock('kills1k');
    if (g.kills >= 5000) this.unlock('kills5k');
    if (g.level >= 50) this.unlock('lvl50');
    if (Object.keys(g.weapons).length >= 6) this.unlock('six');
    if (Object.keys(g.evo).length >= 3) this.unlock('evo3');
  },
  onBoss(type) {
    const s = save.data.stats;
    s.bosses[type] = (s.bosses[type] || 0) + 1;
    this.unlock('boss1');
    if (BOSSES.every((b) => s.bosses[b])) this.unlock('boss_all');
  },
  onEvolve(wid) {
    const s = save.data.stats;
    s.evos[wid] = (s.evos[wid] || 0) + 1;
    this.unlock('evo1');
    if (Object.keys(EVOLVE).every((w) => s.evos[w])) this.unlock('evo_all');
  },
  onChest() {
    const s = save.data.stats;
    s.chests++;
    if (s.chests >= 10) this.unlock('chest10');
  },

  // итог забега: статистика, счётчики дня, достижения
  onRunEnd(g) {
    const d = save.data;
    const s = d.stats;
    this.ensureDay();
    s.kills += g.kills;
    s.arenas[g.arenaId] = true;
    this.unlock('first');
    if (s.kills >= 50000) this.unlock('total50k');
    if (ARENAS.every((a) => s.arenas[a.id])) this.unlock('arenas');
    if (g.won) {
      s.wins++;
      if (g.modeId === 'calm') this.unlock('win_calm');
      if (g.modeId === 'normal') this.unlock('win');
      if (g.mode.threat >= 1) this.unlock('threat1');
      if (g.mode.threat >= 5) this.unlock('threat5');
      if (g.mode.rush) this.unlock('rush');
      if (g.mode.daily) {
        if (!d.dailyRun.won) s.dailyWins++;
        this.unlock('daily1');
        if (s.dailyWins >= 7) this.unlock('daily7');
      }
    }
    const c = d.daily.c;
    c.kills = (c.kills || 0) + g.kills;
    c.bosses = (c.bosses || 0) + g.bosses;
    c.maxTime = Math.max(c.maxTime || 0, Math.floor(g.t));
    c.evos = (c.evos || 0) + Object.keys(g.evo).length;
    c.runs = (c.runs || 0) + 1;
    c.maxLevel = Math.max(c.maxLevel || 0, g.level);
    c.chests = (c.chests || 0) + (g.chestsOpened || 0);
  },

  // ---------- ежедневное ----------
  ensureDay() {
    const d = save.data.daily;
    const key = dayKey();
    if (d.day === key) return d;
    d.day = key;
    d.claimed = false;
    d.adClaimed = false;
    d.c = {};
    d.done = [];
    const r = rng(dayNum(key) * 7 + 3);
    const pool = QUESTS.map((q) => q.id);
    d.q = [];
    for (let i = 0; i < 3; i++) {
      const id = pool.splice((r() * pool.length) | 0, 1)[0];
      d.q.push({ id, tier: i });
    }
    return d;
  },
  rewardAmount() {
    const d = save.data.daily;
    const today = dayNum(dayKey());
    const streak = d.lastClaim && dayNum(d.lastClaim) === today - 1 ? d.streak + 1 : d.lastClaim === dayKey() ? d.streak : 1;
    return { amount: 30 + 10 * (Math.min(streak, 7) - 1), streak };
  },
  claimDaily(byAd) {
    const d = this.ensureDay();
    if (byAd) {
      if (!d.claimed || d.adClaimed) return 0;
      d.adClaimed = true;
      const a = this.rewardAmount().amount;
      save.data.crystals += a;
      save.write();
      return a;
    }
    if (d.claimed) return 0;
    const { amount, streak } = this.rewardAmount();
    d.claimed = true;
    d.streak = streak;
    d.lastClaim = d.day;
    save.data.crystals += amount;
    save.write();
    return amount;
  },
  quests() {
    const d = this.ensureDay();
    return d.q.map((q, i) => {
      const def = QUESTS.find((x) => x.id === q.id);
      const n = def.n[q.tier];
      const cur = Math.min(n, d.c[def.k] || 0);
      return { i, id: q.id, k: def.k, n, r: def.r[q.tier], cur, ready: cur >= n && !d.done.includes(i), done: d.done.includes(i) };
    });
  },
  claimQuest(i) {
    const q = this.quests()[i];
    if (!q || !q.ready) return 0;
    save.data.daily.done.push(i);
    save.data.crystals += q.r;
    save.write();
    return q.r;
  },
  // есть ли что забрать (для значка «!» в меню)
  dailyBadge() {
    const d = this.ensureDay();
    return !d.claimed || this.quests().some((q) => q.ready);
  },

  // ---------- испытание дня ----------
  dailyChallenge() {
    const key = dayKey();
    const r = rng(dayNum(key) * 13 + 5);
    const hero = HEROES[(r() * HEROES.length) | 0];
    const arena = ARENAS[(r() * ARENAS.length) | 0];
    const mut = MUTATORS[(r() * MUTATORS.length) | 0];
    const dr = save.data.dailyRun;
    if (dr.day !== key) Object.assign(dr, { day: key, best: 0, won: false });
    return { day: key, hero, arena, mut, best: dr.best, won: dr.won };
  },
};
