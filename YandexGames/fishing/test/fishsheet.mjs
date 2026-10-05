// Лист всех рыб для проверки рисунка: node test/fishsheet.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
const r = await build({ stdin: { contents: `import { drawFish } from './src/fishart.js'; import { SPECIES_ORDER, SPECIES } from './src/data.js';
const c = document.createElement('canvas'); c.width = 1500; c.height = 1100; document.body.appendChild(c);
const x = c.getContext('2d'); x.fillStyle = '#cfe6ef'; x.fillRect(0,0,1500,1100);
SPECIES_ORDER.forEach((id, i) => { const cx = 150 + (i % 5) * 300, cy = 90 + Math.floor(i / 5) * 175; drawFish(x, id, cx, cy, 240, { wig: 0.2 }); x.fillStyle='#234'; x.font='16px sans-serif'; x.fillText(id, cx - 40, cy + 75); });
window.done = true;`, resolveDir: '.', loader: 'js' }, bundle: true, write: false, format: 'iife' });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.setContent('<body style="margin:0"></body>');
await p.addScriptTag({ content: r.outputFiles[0].text });
await p.screenshot({ path: 'test/out/fishsheet.png' });
await b.close();
console.log('ok');
