import { build } from 'esbuild';
import { chromium } from 'playwright';
import fs from 'fs';
await build({ entryPoints: ['test/sheet/cities.js'], bundle: true, outfile: '/tmp/claude-0/cities.js' });
const js = fs.readFileSync('/tmp/claude-0/cities.js', 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [w, h, vw, name] of [[640, 360, 1300, 'cities_land'], [240, 427, 1240, 'cities_port']]) {
  const p = await b.newPage({ viewport: { width: vw, height: 900 } });
  p.on('console', (m) => console.log(m.text()));
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('about:blank');
  await p.evaluate(([w, h]) => history.replaceState(null, '', `?w=${w}&h=${h}`), [w, h]).catch(() => {});
  await p.setContent(`<body></body>`);
  await p.addScriptTag({ content: `history.replaceState(null,'','?w=${w}&h=${h}');` }).catch(()=>{});
  await p.addScriptTag({ content: js.replace("+new URLSearchParams(location.search).get('w')", w).replace("+new URLSearchParams(location.search).get('h')", h) });
  await p.waitForFunction(() => window.done);
  await p.screenshot({ path: `/tmp/claude-0/shots/${name}.png`, fullPage: true });
}
await b.close();
