// Проверка сцены без игры: node test/scenesheet.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
const r = await build({ stdin: { contents: `import { Scene } from './src/scene.js';
window.mk = (w, h, loc, part, weather, char, st) => {
  document.body.innerHTML = ''; const c = document.createElement('canvas'); document.body.appendChild(c);
  const s = new Scene(c); s.resize(w, h, 1); s.setEnv(loc, part, weather, char);
  s.cat.on = true; s.cat.k = 1;
  if (st === 'float') { s.float = { x: w * 0.6, y: h * 0.6, st: 'water' }; }
  if (st === 'fight') { s.pose = 'fight'; s.tension = 0.7; s.float = { x: w * 0.55, y: h * 0.62, st: 'fight' }; s.fish = { show: 1, id: 'pike', x: w * 0.55, y: h * 0.62, ang: 0.3, sz: 90 }; }
  s.bubbles = { x: w * 0.7, y: h * 0.55 };
  for (let i = 0; i < 30; i++) s.draw(1 / 30);
};`, resolveDir: '.', loader: 'js' }, bundle: true, write: false, format: 'iife' });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const jobs = [
  [1280, 720, 0, 'day', 'sun', 'm', 'float'], [1280, 720, 1, 'evening', 'cloud', 'f', 'fight'], [1280, 720, 2, 'morning', 'fog', 'm', 'float'],
  [1280, 720, 3, 'night', 'sun', 'f', 'float'], [1280, 720, 4, 'day', 'rain', 'm', 'fight'], [432, 768, 0, 'night', 'cloud', 'm', 'float'],
];
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
