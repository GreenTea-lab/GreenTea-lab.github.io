// Проверка всех уровней: проходимость, перекрытия, длина, время. node tools/levels.mjs
import { genLevel, validate, LEVELS } from '../src/data.js';
let badAll = 0;
for (let L = 1; L <= LEVELS; L++) {
  const lv = genLevel(L);
  const bad = validate(lv);
  badAll += bad.length;
  const cnt = {};
  lv.segs.forEach((k) => (cnt[k] = (cnt[k] || 0) + 1));
  console.log(`${String(L).padStart(2)} ${lv.theme.id.padEnd(7)} платф ${String(lv.plats.length).padStart(3)} монет ${String(lv.coins.length).padStart(2)} чекп ${lv.cps.length} путь ${lv.dist.toFixed(0).padStart(3)} м пар ${lv.par} с | ${Object.entries(cnt).map(([k, v]) => k + v).join(' ')}${bad.length ? '  ПРОБЛЕМЫ ' + JSON.stringify(bad.slice(0, 3)) : ''}`);
}
console.log(badAll ? `ПРОБЛЕМ: ${badAll}` : 'все уровни проходимы');
