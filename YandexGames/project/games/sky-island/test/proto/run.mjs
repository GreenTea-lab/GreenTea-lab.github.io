import { build } from 'esbuild';
import { chromium } from 'playwright';
import fs from 'fs';
await build({ entryPoints: ['test/proto/entry.js'], bundle: true, outfile: 'test/proto/bundle.js', format: 'iife', logLevel: 'error' });
fs.writeFileSync('test/proto/index.html', '<html><body style="margin:0;overflow:hidden"><script src="bundle.js"></script></body></html>');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [q, name] of [['t=' + (360000 * 1000 + 90000), 'day'], ['t=' + (360000 * 1000 + 270000), 'night'], ['t=' + (360000 * 1000 + 50000) + '&rain=1', 'rain'], ['t=' + (360000 * 1000 + 120000) + '&phi=1.25&d=34', 'side'], ['t=' + (360000 * 1000 + 200000) + '&phi=1.2&d=30', 'dusk']]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('file://' + process.cwd() + '/test/proto/index.html?' + q);
  await p.waitForFunction(() => document.title === 'done', null, { timeout: 90000 });
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/proto_' + name + '.png' });
  await p.close();
}
await b.close();
console.log('ok');
