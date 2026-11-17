// Pure Node audit: no browser is launched. Every puzzle is checked independently.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { geom, kindOf, parse, countSolutions, rate, transform } from '../src/sudoku.js';
import { pathPlan, tiersOf } from '../src/levels.js';
import { makeHint } from '../src/hints.js';

const data = JSON.parse(fs.readFileSync(new URL('../src/data/puzzles.json', import.meta.url)));
const plan = pathPlan();
const failures = [], rows = [], seen = new Set();
let hintMoves = 0, hintFallbacks = 0;
function check(puzzle, kind, tier, label, collect = false) {
  const G = geom(kind), grid = parse(puzzle.slice(0, G.size));
  const spec = tiersOf(kind)[tier].spec;
  const solution = [];
  const unique = countSolutions(G, grid, 2, solution) === 1;
  const rating = rate(G, grid);
  const givens = grid.filter(Boolean).length;
  const errors = [];
  if (kindOf(puzzle) !== kind || grid.length !== G.size) errors.push('geometry');
  if (!unique) errors.push('unique solution');
  if (solution.length !== G.size || G.units.some(u => new Set(u.map(i => solution[i])).size !== G.N)) errors.push('solution rules');
  if (rating.level < spec.level[0] || rating.level > spec.level[1] || (spec.test && !spec.test(rating, givens))) errors.push('technique tier');
  // Symmetric removal can land one clue below the target.
  if (givens < spec.givens[0] - 1 || givens > spec.givens[1]) errors.push('clue range');
  if (errors.length) failures.push({ label, errors, givens, rating });
  if (collect && unique) {
    const B = { G, givens:grid, vals:grid.slice(), sol:solution, sel:null };
    for (let step=0; B.vals.some(v=>!v) && step<G.size; step++) {
      const h=makeHint(B);
      if (!h || B.vals[h.target] || h.digit !== solution[h.target] || !h.text) { failures.push({label,errors:['invalid hint']});break; }
      if (!h.area.length && !h.focus.length) hintFallbacks++;
      B.vals[h.target]=h.digit;hintMoves++;
    }
    if (B.vals.some(v=>!v)) failures.push({label,errors:['hint walkthrough incomplete']});
  }
  if (collect) rows.push({ level: rows.length + 1, kind, tier, givens, ...rating });
}
assert.equal(data.path.length, 1000);
assert.equal(plan.length, 1000);
data.path.forEach((p, i) => {
  if (seen.has(p)) failures.push({ label: `path:${i + 1}`, errors: ['duplicate'] });
  seen.add(p);
  check(p, plan[i].kind, plan[i].tier, `path:${i + 1}`, true);
});
let poolCount = 0, transformed = 0;
for (const [kind, tiers] of Object.entries(data.pools)) tiers.forEach((pool, tier) => pool.forEach((p, i) => {
  check(p, kind, tier, `${kind}:${tier}:${i}`); poolCount++;
  // Transformations preserve validity/uniqueness, but deterministic solver order can change its rating.
  if (i < 3) for (const seed of [1, 37, 20261117]) {
    const q = transform(p, seed), G = geom(kind);
    if (kindOf(q) !== kind || countSolutions(G, parse(q.slice(0, G.size)), 2) !== 1) failures.push({ label: `${kind}:${tier}:${i}:${seed}`, errors: ['transform'] });
    transformed++;
  }
}));
const chapters = Array.from({ length: 20 }, (_, g) => {
  const levels = rows.slice(g * 50, g * 50 + 50), classic = levels.filter(x => x.kind === 'classic');
  return { garden: g + 1, levels: levels.length, averageClassicTier: +(classic.reduce((s,x) => s+x.tier, 0)/classic.length).toFixed(3), averageClassicScore: +(classic.reduce((s,x) => s+x.score, 0)/classic.length).toFixed(2), techniques: [...new Set(classic.map(x=>x.level))] };
});
for (let i = 1; i < chapters.length; i++) if (chapters[i].averageClassicTier < chapters[i-1].averageClassicTier) failures.push({ label: `garden:${i+1}`, errors: ['chapter difficulty regressed'] });
for (let i = 1; i < chapters.length; i++) if (chapters[i].averageClassicScore < chapters[i-1].averageClassicScore) failures.push({ label: `garden:${i+1}`, errors: ['chapter logical effort regressed'] });
if (hintFallbacks) failures.push({label:'path hints',errors:[`${hintFallbacks} unexplained fallback hints`]});
const report = { date: '2026-11-17', pathChecked: rows.length, poolChecked: poolCount, transformationsChecked: transformed, hintMoves, hintFallbacks, uniquePathPuzzles: seen.size, progression: 'Increasing chapter averages; intentional recovery puzzles and mini/diagonal variations. Individual levels are not strictly monotonic.', chapters, failures, levels: rows };
fs.mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../reports/levels-audit.json', import.meta.url), JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify({ pathChecked: rows.length, poolCount, transformed, hintMoves, hintFallbacks, chapterScores:chapters.map(c=>c.averageClassicScore), failures }, null, 2));
if (failures.length) process.exitCode = 1;
