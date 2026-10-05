// Пулы головоломок: src/data/puzzles.json. Первые 30 каждой сложности — сад (кампания), остальные — свободная игра.
// node tools/genpuzzles.mjs
import fs from 'fs';
import { makePuzzle, SPECS, rng, parse, countSolutions, rate } from '../src/sudoku.js';
const COUNT = { easy: 130, medium: 130, hard: 130, expert: 130 };
const out = {};
const seen = new Set();
for (const [k, n] of Object.entries(COUNT)) {
  const R = rng(1000 + Object.keys(COUNT).indexOf(k));
  const list = [];
  const t0 = Date.now();
  while (list.length < n) {
    const p = makePuzzle(R, SPECS[k], 400);
    if (!p || seen.has(p.puzzle)) continue;
    seen.add(p.puzzle);
    list.push(p.puzzle);
  }
  // в саду сложность растёт: сортируем первые 30 по числу подсказок (больше — легче)
  const camp = list.slice(0, 30).sort((a, b) => b.replace(/\./g, '').length - a.replace(/\./g, '').length);
  out[k] = camp.concat(list.slice(30));
  console.log(k, list.length, ((Date.now() - t0) / 1000).toFixed(1) + ' с');
}
// судоку дня: средние и сложные вперемешку
const R = rng(777);
const daily = [];
while (daily.length < 180) {
  const p = makePuzzle(R, SPECS[daily.length % 2 ? 'hard' : 'medium'], 400);
  if (!p || seen.has(p.puzzle)) continue;
  seen.add(p.puzzle);
  daily.push(p.puzzle);
}
out.daily = daily;
// проверка: единственность и уровень
let bad = 0;
for (const [k, list] of Object.entries(out))
  for (const s of list) {
    const g = parse(s);
    if (countSolutions(g, 2) !== 1) bad++;
    const lv = rate(g);
    if (k !== 'daily' && (lv < SPECS[k].level[0] || lv > SPECS[k].level[1])) bad++;
  }
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/puzzles.json', JSON.stringify(out));
console.log(bad ? 'ОШИБОК: ' + bad : 'все головоломки с единственным решением и нужной сложностью');
