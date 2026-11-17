import { chromium } from 'playwright';
import { build } from 'esbuild';
await build({ entryPoints: ['test/proto/entry.js'], bundle: true, outfile: 'test/proto/bundle.js', format: 'iife' });
const shots = JSON.parse(process.argv[2]);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, w, h, qs] of shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  const t0 = Date.now();
  await page.goto('file://' + process.cwd() + '/test/proto/index.html?' + qs);
  await page.waitForFunction(() => window.__done, null, { timeout: 120000 });
  await page.screenshot({ path: '/tmp/claude-0/p_' + name + '.png' });
  console.log(name, Date.now() - t0, 'ms');
  await page.close();
}
await browser.close();
