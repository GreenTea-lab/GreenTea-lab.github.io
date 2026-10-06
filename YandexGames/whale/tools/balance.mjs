// Симуляция темпа: игрок тапает 3 раза в секунду (активная игра), жадно покупает самое выгодное.
// node tools/balance.mjs [часов]
import { BUILDINGS, STAGES, UPGRADES, UP_ORDER, bCost, income, tapValue, upCost, speed, islandDist, pearlsGain, freshRun, migrateIsland, gullGap, fountDur } from '../src/data.js';
const H = +(process.argv[2] || 3);
const s = { goals: {}, pearls: 0, cards: [] };
freshRun(s);
const dt = 0.5, TAPS = +(process.argv[3] || 3);
let t = 0, log = [], nextIsl = islandDist(1), gullT = 0, fount = 0;
const fmt = (x) => (x < 1e3 ? x.toFixed(0) : x < 1e6 ? (x / 1e3).toFixed(1) + 'K' : x < 1e9 ? (x / 1e6).toFixed(1) + 'M' : x < 1e12 ? (x / 1e9).toFixed(1) + 'B' : (x / 1e12).toFixed(1) + 'T');
const mm = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
let runs = 0;
while (t < H * 3600) {
  t += dt;
  const inc = income(s);
  const tap = tapValue(s, inc);
  const gain = inc * dt + tap * TAPS * dt;
  s.shells += gain; s.run += gain; s.all = (s.all || 0) + gain;
  s.miles += speed(s) * dt + 0.25 * TAPS * dt;
  // чайка: подарок = 60 с дохода (ловим каждую вторую)
  gullT += dt;
  if (gullT > gullGap(s) * 2) { gullT = 0; const g = Math.max(inc * 60, tap * 30); s.shells += g; s.run += g; }
  if (s.miles >= nextIsl) {
    s.island++; s.miles -= nextIsl; nextIsl = islandDist(s.island + 1);
    s.cards.push({ k: s.island % 2 ? 'all' : 'tap', v: s.island % 2 ? 0.15 : 0.5 });
    log.push(`${mm(t)} остров ${s.island} (доход ${fmt(inc)}/с)`);
  }
  // покупки: рост кита, улучшения, здания по окупаемости
  for (let guard = 0; guard < 50; guard++) {
    const opts = [];
    if (s.stage < 6 && s.shells >= STAGES[s.stage].cost) { s.shells -= STAGES[s.stage].cost; s.stage++; log.push(`${mm(t)} кит: стадия ${s.stage}`); continue; }
    for (const b of BUILDINGS) {
      if (b.stage > s.stage) continue;
      const c = bCost(s, b.id, s.b[b.id] || 0);
      const before = income(s); s.b[b.id] = (s.b[b.id] || 0) + 1; const d = income(s) - before; s.b[b.id]--;
      opts.push({ c, roi: c / Math.max(1e-9, d), do: () => (s.b[b.id] = (s.b[b.id] || 0) + 1) });
    }
    for (const u of ['tap', 'wind']) {
      const l = s.up[u]; if (l >= UPGRADES[u].max) continue;
      const c = upCost(u, l);
      const before = tapValue(s, income(s)); s.up[u]++; const d = tapValue(s, income(s)) - before; s.up[u]--;
      opts.push({ c, roi: u === 'tap' ? c / Math.max(1e-9, d * TAPS) : c / Math.max(1e-9, income(s) * 0.05), do: () => s.up[u]++ });
    }
    const best = opts.filter((o) => o.c <= s.shells).sort((a, b) => a.roi - b.roi)[0];
    if (!best || best.roi > 600) break;
    s.shells -= best.c; best.do();
  }
  if (s.island >= migrateIsland(s) && pearlsGain(s) >= 3 && runs < 9) {
    const p = pearlsGain(s);
    s.pearlsEver = (s.pearlsEver || 0) + p;
    log.push(`${mm(t)} МИГРАЦИЯ: +${p} жемчуга (заработано ${fmt(s.run)})`);
    s.pearls += p; runs++; s.migr = runs; freshRun(s); nextIsl = islandDist(1);
  }
}
console.log(log.join('\n'));
console.log('итог: стадия', s.stage, 'острова', s.island, 'доход', fmt(income(s)), 'жемчуг', s.pearls, 'здания', JSON.stringify(s.b));
