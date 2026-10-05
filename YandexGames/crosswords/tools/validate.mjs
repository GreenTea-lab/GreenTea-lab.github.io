// Проверка уровней: каждая последовательность букв длиной >= 2 должна быть словом из списка
import fs from 'fs';
let bad = 0;
for (const lang of ['ru', 'en']) {
  const { levels } = JSON.parse(fs.readFileSync(`src/data/${lang}.json`, 'utf8'));
  levels.forEach((L, li) => {
    const g = Array.from({ length: L.h }, () => Array(L.w).fill(null));
    const set = new Set();
    for (const [x, y, d, w] of L.e) {
      set.add(`${x},${y},${d}`);
      for (let i = 0; i < w.length; i++) {
        const cx = x + (d === 'a' ? i : 0), cy = y + (d === 'd' ? i : 0);
        if (g[cy][cx] && g[cy][cx] !== w[i]) { bad++; console.log(lang, li + 1, 'конфликт', w); }
        g[cy][cx] = w[i];
      }
    }
    const runs = [];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (!g[y][x]) continue;
      if ((x === 0 || !g[y][x - 1]) && g[y][x + 1]) runs.push(`${x},${y},a`);
      if ((y === 0 || !g[y - 1][x]) && g[y + 1] && g[y + 1][x]) runs.push(`${x},${y},d`);
    }
    for (const r of runs) if (!set.has(r)) { bad++; console.log(lang, li + 1, 'лишнее слово в', r); }
    if (runs.length !== set.size) { bad++; console.log(lang, li + 1, 'runs', runs.length, 'entries', set.size); }
    if (process.argv[2] == li + 1 && lang === (process.argv[3] || 'ru')) console.log(g.map((r) => r.map((c) => c || '·').join(' ')).join('\n'));
  });
}
console.log(bad ? `ОШИБОК: ${bad}` : 'уровни корректны');
