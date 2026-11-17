// Головоломки -> src/data/puzzles.json
//   path   — путь из 1000 уровней (20 садов по 50), сложность растёт «пилой»: каждый сад начинается легче, чем закончился прошлый;
//   pools  — пулы для свободной игры и судоку дня (дальше бесконечно за счёт преобразований, сохраняющих сложность).
// Все головоломки с единственным решением и решаются логикой (без перебора). node tools/genpuzzles.mjs
import fs from 'fs';
import { geom, makePuzzle, rng, parse, countSolutions, rate } from '../src/sudoku.js';
import { TIERS, DTIERS, MTIERS, pathPlan, GARDENS, PER_GARDEN } from '../src/levels.js';

const POOL = { classic: 100, diag: 50, mini: 50 };
const seen = new Set();
const R = rng(20261011);

function gen(kind, spec, n, label) {
  const G = geom(kind);
  const out = [];
  const t0 = Date.now();
  let tries = 0;
  while (out.length < n) {
    tries++;
    const p = makePuzzle(G, R, spec, 1);
    if (!p || seen.has(p.puzzle)) continue;
    seen.add(p.puzzle);
    out.push(p);
  }
  console.log(`${label}: ${n} (${tries} попыток, ${((Date.now() - t0) / 1000).toFixed(1)} с)`);
  return out;
}

const specOf = (kind, t) => (kind === 'classic' ? TIERS : kind === 'diag' ? DTIERS : MTIERS)[t].spec;

// сколько нужно каждого вида и уровня для пути
const plan = pathPlan();
const need = {};
for (const lv of plan) {
  const k = lv.kind + ':' + lv.tier;
  need[k] = (need[k] || 0) + 1;
}
const pathPuzzles = {};
for (const [k, n] of Object.entries(need)) {
  const [kind, t] = k.split(':');
  // по возрастанию «веса» решения, при равенстве — больше подсказок раньше
  pathPuzzles[k] = gen(kind, specOf(kind, +t), n, 'путь ' + k).sort((a, b) => a.score - b.score || b.givens - a.givens);
}
// раздаём по уровням: внутри вида и уровня сложности — в порядке номера уровня
const path = plan.map((lv) => {
  const p = pathPuzzles[lv.kind + ':' + lv.tier].shift();
  return p.puzzle + (lv.kind === 'diag' ? 'x' : '');
});

const pools = { classic: [], diag: [], mini: [] };
for (const kind of ['classic', 'diag', 'mini']) {
  const tiers = kind === 'classic' ? TIERS : kind === 'diag' ? DTIERS : MTIERS;
  tiers.forEach((T, t) => {
    pools[kind][t] = gen(kind, T.spec, POOL[kind], `пул ${kind}:${T.id}`).map((p) => p.puzzle + (kind === 'diag' ? 'x' : ''));
  });
}

// проверка
let bad = 0;
const check = (s, kind, spec) => {
  const G = geom(kind);
  const g = parse(s.slice(0, G.size));
  if (countSolutions(G, g, 2) !== 1) bad++;
  const r = rate(G, g);
  if (r.level < spec.level[0] || r.level > spec.level[1]) bad++;
};
plan.forEach((lv, k) => check(path[k], lv.kind, specOf(lv.kind, lv.tier)));
for (const kind in pools) pools[kind].forEach((list, t) => list.forEach((s) => check(s, kind, specOf(kind, t))));
if (path.length !== GARDENS * PER_GARDEN) bad++;

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/puzzles.json', JSON.stringify({ path, pools }));
console.log(bad ? 'ОШИБОК: ' + bad : `все ${path.length + Object.values(pools).flat(2).length} головоломок с единственным решением и нужной сложностью`);
