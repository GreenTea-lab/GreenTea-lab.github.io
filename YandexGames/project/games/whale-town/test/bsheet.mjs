// Лист зданий на уровнях 0, 3, 6: node test/bsheet.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
const r = await build({ stdin: { contents: `import { drawBuilding, drawPlot } from './src/buildings.js'; import { BUILDINGS } from './src/data.js';
const c = document.createElement('canvas'); c.width = 1500; c.height = 760; document.body.appendChild(c);
const x = c.getContext('2d'); x.fillStyle = '#9fd4f0'; x.fillRect(0,0,1500,760);
BUILDINGS.forEach((b, i) => { for (const [j, tier] of [[0, 0], [1, 3], [2, 6]]) { const cx = 70 + i * 120, cy = 220 + j * 240; x.fillStyle = '#6cc35a'; x.fillRect(cx - 55, cy, 110, 10); drawBuilding(x, b.id, cx, cy, 80, tier, 1.3, j === 2); } });
drawPlot(x, 1440, 220, 80, 0.5);`, resolveDir: '.', loader: 'js' }, bundle: true, write: false, format: 'iife' });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 760 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.setContent('<body style="margin:0"></body>');
await p.addScriptTag({ content: r.outputFiles[0].text });
await p.screenshot({ path: 'test/out/bsheet.png' });
await b.close();
console.log('ok');
