// Симуляция экономики: жадный бот-игрок. node test/sim.mjs [часы] [престиж-перья]
import * as E from '../src/econ.js';

const HOURS = +(process.argv[2] || 8);
const s = E.newState();
s.feathers = +(process.argv[3] || 0);
const VAL = { coins: 1, wood: 3, stone: 5, crystals: 0 };
const val = (r) => r.coins + r.wood * VAL.wood + r.stone * VAL.stone;
const costVal = (c) => (c.coins || 0) + (c.wood || 0) * VAL.wood + (c.stone || 0) * VAL.stone + (c.crystals || 0) * 1e9 + (E.hasMarket(s) ? E.shortfall(s, c) * 0.5 : 0);

let t = 0;
const DT = 1;
const log = [];
let lastLevel = 1;
const counts = { build: 0, upgrade: 0, decor: 0, plot: 0 };

function freeCells() {
  return s.plots.length * 25 - s.buildings.length - s.decor.length;
}
function neighborsPlots() {
  const owned = new Set(s.plots);
  const out = [];
  for (const p of s.plots) {
    const [x, z] = p.split(',').map(Number);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = x + dx + ',' + (z + dz);
      if (x + dx < 0 || z + dz < 0 || x + dx >= 5 || z + dz >= 5 || owned.has(k) || out.includes(k)) continue;
      if (E.BIOMES[E.plotBiome(x + dx, z + dz)].unlock <= s.level) out.push(k);
    }
  }
  return out;
}

function candidates() {
  const c = [];
  const base = val(E.rates(s));
  const busy = E.busyBuilders(s, t);
  if (busy < s.builders) {
    for (const type of E.BUILD_ORDER) {
      const d = E.BUILDINGS[type];
      if (d.unlock > s.level) continue;
      if (d.unique && E.countType(s, type)) continue;
      if (freeCells() < 1) continue;
      const cost = E.costOf(type, 1, E.countType(s, type));
      const b = { id: -1, type, lvl: 1 };
      s.buildings.push(b);
      const gain = val(E.rates(s)) - base;
      s.buildings.pop();
      const explore = E.countType(s, type) === 0 ? (d.kind === 'trade' && !E.hasMarket(s) ? 40 : 4) : 1;
      c.push({ kind: 'build', type, cost, score: ((gain + 0.02) / costVal(cost)) * explore });
    }
    for (const b of s.buildings) {
      if (b.lvl >= E.MAX_LVL || (b.build && b.build > t)) continue;
      const cost = E.costOf(b.type, b.lvl + 1);
      b.lvl++;
      const gain = val(E.rates(s)) - base;
      b.lvl--;
      c.push({ kind: 'upgrade', b, cost, score: (gain + 0.01) / costVal(cost) });
    }
  }
  if (freeCells() > 2 && s.decor.length < s.plots.length * 25 * 0.35) {
    for (const type of E.DECOR_ORDER) {
      const d = E.DECOR[type];
      if (d.unlock > s.level || d.crystals) continue;
      const cost = E.decorCost(type, E.decorCount(s, type));
      s.decor.push({ type });
      const gain = val(E.rates(s)) - base;
      s.decor.pop();
      c.push({ kind: 'decor', type, cost, score: gain / costVal(cost) });
    }
  }
  return c;
}

function act() {
  // участок — когда мало места
  const nb = neighborsPlots();
  if (freeCells() < 4 && nb.length) {
    const cost = E.plotCost(s.plots.length);
    if (E.canAfford(s, cost)) {
      E.pay(s, cost);
      s.plots.push(nb[0]);
      counts.plot++;
      return;
    }
  }
  const c = candidates();
  if (!c.length) return;
  c.sort((a, b) => b.score - a.score);
  // узкое место по ресурсам: если лучшему не хватает дерева/камня — поднимаем приоритет их производителей
  const top = c[0];
  for (const r of ['wood', 'stone']) {
    if ((top.cost[r] || 0) > s[r]) {
      for (const x of c) {
        const ty = x.type || (x.b && x.b.type);
        const d = ty && E.BUILDINGS[ty];
        if (d && ((d.out && d.out[r]) || (d.pop && E.rates(s).workK < 1))) x.score *= 6;
      }
    }
  }
  c.sort((a, b) => b.score - a.score);
  // покупаем лучшее доступное среди топ-3 по эффективности
  for (const x of c.slice(0, 3)) {
    if (!E.canAffordEx(s, x.cost)) continue;
    E.payEx(s, x.cost);
    if (x.kind === 'build') {
      s.buildings.push({ id: s.nextId++, type: x.type, lvl: 1, build: t + E.buildTime(1, s) });
    } else if (x.kind === 'upgrade') {
      x.b.lvl++;
      x.b.build = t + E.buildTime(x.b.lvl, s);
    } else s.decor.push({ type: x.type });
    counts[x.kind]++;
    return;
  }
}

const fmt = (n) => (n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0));
const tm = (sec) => `${Math.floor(sec / 3600)}h${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}m`;

while (t < HOURS * 3600) {
  for (const b of s.buildings) if (b.build && b.build <= t) b.build = 0;
  const rain = t % 480 < 120;
  E.tick(s, DT, { rain });
  if (t % 3 === 0) act();
  const L = E.islandLevel(s);
  if (L > lastLevel) {
    s.level = L;
    log.push(`${tm(t)} LVL ${L}  inc ${fmt(E.rates(s).coins)}/s  pop ${E.rates(s).pop}  b=${s.buildings.length} plots=${s.plots.length} decor=${s.decor.length} cozyx${E.cozyMult(s).toFixed(2)} feathers+${E.featherGain(s)}`);
    lastLevel = L;
  }
  if (t % 1800 === 0 && t > 0) {
    const r = E.rates(s);
    log.push(`  ${tm(t)} coins ${fmt(s.coins)} inc ${fmt(r.coins)}/s wood ${fmt(r.wood)}/s stone ${fmt(r.stone)}/s trade ${fmt(r.trade)} work ${(r.workK * 100).toFixed(0)}% earned ${fmt(s.earned)} feathers+${E.featherGain(s)}`);
  }
  t += DT;
}
console.log(log.join('\n'));
console.log(counts, 'levels:', s.buildings.map((b) => b.type[0] + b.type[1] + b.lvl).join(' '));
