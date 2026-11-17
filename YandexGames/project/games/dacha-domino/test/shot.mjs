// Тестовый прогон: node test/shot.mjs <name> <w> <h> <mobile?> <script>
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.woff2': 'font/woff2' };
const server = http
  .createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (req.url.startsWith('/sdk.js') && process.env.MOCK_SDK) p = path.resolve('test/mock/sdk.js');
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    } else if (req.url.startsWith('/') && req.url.endsWith('/')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(path.join(root, 'index.html')).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(0);
const port = server.address().port;

export async function run({ w = 1280, h = 720, mobile = false, dpr = 1, debug = {}, steps, locale = 'ru-RU', pre }) {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, locale });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + e.stack));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text());
  });
  if (pre) await page.addInitScript(pre);
  await page.addInitScript((d) => {
    window.__DD_DEBUG = d;
  }, debug);
  await page.goto(`http://localhost:${port}/`);
  try { await page.waitForFunction(() => window.__game && window.__game.ui && !document.getElementById('loader'), null, { timeout: 40000 }); } catch (e) { console.log('LOAD FAIL', errors.join('\n')); throw e; }
  await page.waitForTimeout(500);
  try {
    await steps(page);
  } catch (e) {
    errors.push('STEP ERROR ' + e.message);
  }
  await browser.close();
  return errors;
}

export function done(errors) {
  server.close();
  const filtered = errors.filter((e) => !e.includes('sdk.js') && !e.includes('404') && !e.includes('GPU stall') && !e.includes('GL Driver'));
  console.log(filtered.length ? filtered.join('\n') : 'NO ERRORS');
}
