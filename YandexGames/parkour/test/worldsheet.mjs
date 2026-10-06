// Снимки мира на разных уровнях без интерфейса: node test/worldsheet.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
const r = await build({ stdin: { contents: `import { World } from './src/world.js'; import { genLevel, SKINS } from './src/data.js'; import { initLevel, tickLevel, makePlayer } from './src/physics.js';
window.mk = (L, at, skin) => {
  const c = document.createElement('canvas'); c.style.cssText='width:100vw;height:100vh;display:block'; document.body.appendChild(c);
  const w = new World(c, 'high'); w.resize(innerWidth, innerHeight);
  const lv = genLevel(L); initLevel(lv); w.build(lv); w.setSkin(SKINS[skin]);
  const P = makePlayer(lv); const p = lv.plats[at]; P.x = p.x; P.y = p.y; P.z = p.z; P.ground = p; P.cp = 0;
  const q = lv.plats[at + 2]; const yaw = Math.atan2(q.x - p.x, q.z - p.z); P.yaw = yaw;
  for (let i = 0; i < 30; i++) { tickLevel(lv, 1/30); w.update(1/30, P, { yaw, pitch: 0.38, snap: i === 0 }); }
  w.render();
};`, resolveDir: '.', loader: 'js' }, bundle: true, write: false, format: 'iife' });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const jobs = [[1, 0, 0], [8, 5, 3], [13, 10, 4], [18, 12, 5], [23, 14, 6], [27, 8, 7], [33, 10, 8], [38, 12, 9]];
let i = 0;
for (const j of jobs) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.setContent('<body style="margin:0;overflow:hidden"></body>');
  await p.addScriptTag({ content: r.outputFiles[0].text });
  await p.evaluate((j) => window.mk(...j), j);
  await p.screenshot({ path: `test/out/world_${i++}.png` });
  await p.close();
}
await b.close();
console.log('ok');
