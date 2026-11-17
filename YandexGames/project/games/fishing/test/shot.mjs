// Тестовый запуск в Chromium: run({ w, h, mobile, steps, locale, pre })
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const root = path.resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.woff2': 'font/woff2' };
const server = http
  .createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (req.url.startsWith('/sdk.js')) {
      if (!process.env.MOCK_SDK) {
        res.writeHead(404);
        return res.end();
      }
      let s = fs.readFileSync(path.resolve('test/mock/sdk.js'), 'utf8');
      s = s.replace("lang: 'tr'", "lang: '" + (process.env.MOCK_LANG || 'ru') + "'");
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      return res.end(s);
    }
    if (req.url === '/') p = path.join(root, 'index.html');
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(0);
const port = server.address().port;

export async function run({ w = 1280, h = 720, mobile = false, dpr = 1, steps, locale = 'ru-RU', pre }) {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, locale });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + e.stack));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text());
  });
  if (pre) await page.addInitScript(pre);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => window.__game && !document.getElementById('boot'), null, { timeout: 30000 });
  try {
    await steps(page);
  } catch (e) {
    errors.push('STEP ERROR ' + e.message + '\n' + e.stack);
  }
  await browser.close();
  return errors;
}

export function done(errors) {
  server.close();
  const filtered = errors.filter((e) => !e.includes('sdk.js') && !e.includes('404') && !e.includes('Яндекс SDK') && !e.includes('GPU stall') && !e.includes('GL Driver') && !e.includes('swiftshader') && !e.includes('ReadPixels'));
  console.log(filtered.length ? filtered.join('\n') : 'NO ERRORS');
}
