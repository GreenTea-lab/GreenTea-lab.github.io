// Крупный план рыбака и поплавка: node test/zoom.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
const r = await build({ stdin: { contents: `import { Scene } from './src/scene.js';
window.mk = (w, h, loc, part, weather, char, st, cast) => {
  document.body.innerHTML = ''; const c = document.createElement('canvas'); document.body.appendChild(c);
  const s = new Scene(c); s.resize(w, h, 2); s.setEnv(loc, part, weather, char);
  s.cat.on = true; s.cat.k = 1;
  s.float = { x: w * 0.45, y: h * 0.62, st: 'water' };
  if (st === 'fight') { s.pose = 'fight'; s.tension = 0.7; s.reeling = true; s.float = { x: w * 0.45, y: h * 0.66, st: 'fight' }; s.fish = { show: 1, id: 'pike', x: w * 0.45, y: h * 0.66, ang: 0.3, sz: 90 }; }
  if (st === 'bite') { s.pose = 'bite'; s.float.st = 'bite'; }
  if (st === 'joy') { s.pose = 'joy'; s.float = null; }
  for (let i = 0; i < 30; i++) s.draw(1 / 30);
  if (cast) { s.castAnim = 0.55 * (1 - cast); s.draw(0.0001); }
};`, resolveDir: '.', loader: 'js' }, bundle: true, write: false, format: 'iife' });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const jobs = [
  ['m_idle', 1280, 720, 0, 'day', 'sun', 'm', 'idle'], ['f_idle', 1280, 720, 0, 'day', 'sun', 'f', 'idle'],
  ['m_fight', 1280, 720, 1, 'evening', 'cloud', 'm', 'fight'], ['f_fight', 1280, 720, 4, 'day', 'sun', 'f', 'fight'],
  ['m_joy', 1280, 720, 2, 'morning', 'sun', 'm', 'joy'], ['f_bite', 1280, 720, 3, 'night', 'sun', 'f', 'bite'],
  ['m_cast', 1280, 720, 0, 'day', 'sun', 'm', 'idle', 0.35], ['m_port', 412, 860, 0, 'day', 'sun', 'm', 'idle'],
];
for (const [n, ...j] of jobs) {
  const p = await b.newPage({ viewport: { width: j[0], height: j[1] }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.setContent('<body style="margin:0;overflow:hidden"></body>');
  await p.addScriptTag({ content: r.outputFiles[0].text });
  await p.evaluate((j) => window.mk(...j), j);
  const port = j[0] < j[1];
  await p.screenshot({ path: `test/out/zoom_${n}.png`, clip: port ? { x: 0, y: 420, width: 412, height: 440 } : { x: 60, y: 260, width: 360, height: 280 } });
  if (n === 'm_idle' || n === 'f_bite') await p.screenshot({ path: `test/out/zoom_${n}_float.png`, clip: { x: 520, y: 390, width: 110, height: 90 } });
  await p.close();
}
await b.close();
console.log('ok');
