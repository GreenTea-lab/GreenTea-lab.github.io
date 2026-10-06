// Проверка сцены: node test/scenesheet.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
const r = await build({ stdin: { contents: `import { Scene } from './src/scene.js'; import { BUILDINGS } from './src/data.js';
window.mk = (w, h, biome, stage, port) => {
  document.body.innerHTML = ''; const c = document.createElement('canvas'); document.body.appendChild(c);
  const s = new Scene(c); const R = port ? { x: 0, y: 0, w, h: h * 0.56 } : { x: 0, y: 0, w: w * 0.66, h };
  s.stage = stage; s.resize(w, h, 1, R); s.setState({ biome });
  const counts = {}; BUILDINGS.forEach((b, i) => { if (b.stage <= stage) counts[b.id] = i === stage + 1 ? 0 : [60, 30, 12, 5, 1, 120, 26, 3, 2, 1, 1, 1][i]; });
  s.counts = counts; s.slots.forEach((q) => (q.avail = true));
  s.gull = { p: 0.4, dur: 10 }; s.islandK = 0.85; s.spout = 1; s.mega = biome === 'tropic' ? 3 : 0;
  s.tap(s.cx, s.cy, '+1,2 тыс', true);
  for (let i = 0; i < 20; i++) s.draw(1 / 30);
};`, resolveDir: '.', loader: 'js' }, bundle: true, write: false, format: 'iife' });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const jobs = [[1280, 720, 'warm', 1, 0], [1280, 720, 'north', 3, 0], [1280, 720, 'tropic', 4, 0], [1280, 720, 'night', 6, 0], [1280, 720, 'sky', 6, 0], [412, 860, 'warm', 2, 1]];
let i = 0;
for (const j of jobs) {
  const p = await b.newPage({ viewport: { width: j[0], height: j[1] } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.setContent('<body style="margin:0;overflow:hidden"></body>');
  await p.addScriptTag({ content: r.outputFiles[0].text });
  await p.evaluate((j) => window.mk(...j), j);
  await p.screenshot({ path: `test/out/scene_${i++}.png` });
  await p.close();
}
await b.close();
console.log('ok');
