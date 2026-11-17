import { levelPaths, pathCells, COLS, ROWS, genWaves, ENEMIES, levelInfo } from '../src/data.js';
for (let l = 1; l <= 20; l++) {
  const paths = levelPaths(l);
  // проверка самопересечений по каждому пути
  for (const p of paths) {
    const seen = new Map();
    let ok = true;
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      if (x0 !== x1 && y0 !== y1) { console.log('DIAGONAL', l, p[i-1], p[i]); ok = false; }
      const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
      let x = x0, y = y0;
      while (!(x === x1 && y === y1)) { x += dx; y += dy; const k = x + ',' + y; if (seen.has(k) && !(x===x1&&y===y1&&i<p.length)) { console.log('CROSS', l, k); ok = false; } seen.set(k, 1); }
    }
  }
  const cells = pathCells(paths);
  if (l <= 20) {
    let s = `L${l} cells=${cells.size}\n`;
    for (let y = 0; y < ROWS; y++) { for (let x = 0; x < COLS; x++) s += cells.has(x + ',' + y) ? '#' : '.'; s += '\n'; }
    if (l===1||l===9||l===12||l===20) console.log(s);
  }
  const waves = genWaves(l);
  const info = levelInfo(l);
  const tot = waves.reduce((a, w) => a + w.groups.reduce((b, g) => b + g.count * ENEMIES[g.type].hp * info.hpMul * (g.hpBoost || 1), 0), 0);
  console.log(`L${l} waves=${waves.length} totalHP=${Math.round(tot)} last=${waves[waves.length-1].groups.map(g=>g.type+'x'+g.count).join(',')}`);
}
