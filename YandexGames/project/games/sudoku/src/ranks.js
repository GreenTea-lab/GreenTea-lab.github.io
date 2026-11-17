// Звания игрока по очкам и медали за месяц судоку дня
export const RANKS = [
  { id: 'r0', score: 0 },
  { id: 'r1', score: 1500 },
  { id: 'r2', score: 6000 },
  { id: 'r3', score: 20000 },
  { id: 'r4', score: 50000 },
  { id: 'r5', score: 120000 },
  { id: 'r6', score: 250000 },
];

export function rankOf(score) {
  let i = 0;
  while (i + 1 < RANKS.length && score >= RANKS[i + 1].score) i++;
  const next = RANKS[i + 1];
  return { i, id: RANKS[i].id, next, prog: next ? (score - RANKS[i].score) / (next.score - RANKS[i].score) : 1 };
}

// медали месяца: бронза за 7 дней, серебро за 15, золото за каждый день месяца
export const MEDALS = [
  { id: 'bronze', days: 7, coins: 50, color: '#c98a55' },
  { id: 'silver', days: 15, coins: 100, color: '#b9c0cc' },
  { id: 'gold', days: 0, coins: 250, color: '#e3b45a' }, // 0 — все дни месяца
];

export const daysIn = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
export const need = (md, ym) => md.days || daysIn(ym);

// сколько судоку дня решено в месяце ym ('2026-10')
export const monthCount = (done, ym) => Object.keys(done).filter((k) => k.startsWith(ym + '-') && done[k]).length;

// сколько медалей заслужено в месяце
export const medalsEarned = (done, ym) => MEDALS.filter((md) => monthCount(done, ym) >= need(md, ym)).length;
