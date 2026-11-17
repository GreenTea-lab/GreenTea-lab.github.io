// Снимки моделей: node test/lab.mjs <out-prefix> [models...]  — по 3 ракурса на модель
import { build } from 'esbuild';
import { chromium } from 'playwright';
import fs from 'fs';
await build({ entryPoints: ['tools/carlab.js'], bundle: true, format: 'iife', outfile: 'test/out/carlab.js', logLevel: 'error' });
fs.writeFileSync('test/out/carlab.html', '<!doctype html><html><body style="margin:0;overflow:hidden"><script src="carlab.js"></script></body></html>');
const [pre = 'lab', ...ms] = process.argv.slice(2);
const models = ms.length ? ms : ['lastochka','klin','puzyr','kozlik','karavai','fermer','baron','shustrik','samurai','bizon','molniya'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto('file://' + process.cwd() + '/test/out/carlab.html');
await page.waitForFunction(() => window.__lab, null, { timeout: 20000 });
const views = {
  a: { p: [5.5, 2.2, 5.5], t: [0, 0.6, 0] },          // три четверти спереди
  r: { p: [-5.5, 2.0, -5.0], t: [0, 0.6, 0] },        // три четверти сзади
  s: { p: [0, 0.8, 8.5], t: [0, 0.7, 0], fov: 32 },   // сбоку
  h: { p: [4.2, 2.6, 1.4], t: [1.2, 0.7, 0], hood: 1.05 }, // капот открыт
  i: { p: [0.3, 3.4, 2.6], t: [0, 0.6, 0], noRoof: true, fov: 42 },
  f: { p: [7.5, 1.0, 0], t: [0, 0.7, 0], fov: 22 },
  b: { p: [-7.5, 1.0, 0], t: [0, 0.7, 0], fov: 22 },
  t: { p: [0, 9, 0.01], t: [0, 0, 0], fov: 34 },
  w: { p: [2.2, 0.55, 2.4], t: [1.3, 0.45, 0.6], fov: 40 },
  u: { p: [3.5, 0.25, 3.5], t: [0, 0.35, 0], fov: 35 },
  g: { p: [3.0, 2.4, 1.8], t: [0.3, 1.15, 0], fov: 38 },
  k: { p: [3.9, 1.05, 1.9], t: [1.8, 0.6, 0.45], fov: 36 },
  n: { p: [3.2, 1.2, 1.0], t: [1.9, 0.75, 0.4], fov: 30 },
  m: { p: [3.2, 1.2, 1.0], t: [1.9, 0.75, 0.4], fov: 30, noEngine: true },
  o: { p: [1.6, 1.9, 1.4], t: [0.3, 0.95, 0.6], fov: 34, hood: 1.05 },
  j: { p: [0.6, 0.45, 3.2], t: [0.9, 0.4, 0.6], fov: 30 },
  q: { p: [1.7, 1.6, -1.5], t: [0.4, 0.9, -0.62], fov: 30, hood: 1.05 },
  e: { p: [-4.2, 1.0, 1.6], t: [-1.7, 0.55, 0], fov: 36 },
  c: { p: [-1.2, 1.9, 2.2], t: [0.2, 0.9, 0], fov: 50 },      // салон сверху без крыши
};
for (const m of models) for (const [k, v] of Object.entries(views)) {
  if (process.env.V && !process.env.V.includes(k)) continue;
  await page.evaluate(([m, v, col]) => window.__lab.show({ cars: [{ model: m, hood: v.hood, look: { color: col }, state: { all: { dirt: 0 } } , noRoof: v.noRoof, noEngine: v.noEngine }], cam: v }), [m, v, [0x2a6ad0,0xf2f2ee,0x2f8f4e,0xc0392b][models.indexOf(m)%4]]);
  await page.screenshot({ path: `test/out/${pre}_${m}_${k}.png` });
}
console.log(errs.join('\n') || 'ok');
await browser.close();
