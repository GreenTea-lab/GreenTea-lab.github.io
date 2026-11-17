// Заставка: пока SDK не ответил (до 3 с), снимаем экран загрузки. node test/boot.mjs
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
const root = path.resolve('dist');
const server = http.createServer((req, res) => {
  const p = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.woff2': 'font/woff2' }[path.extname(p)] });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [n, w, h, lang, dpr, pre] of [['d', 1280, 720, 'ru-RU', 1], ['m', 412, 860, 'ru-RU', 2], ['de', 1280, 720, 'en-US', 1, `localStorage.setItem('cozy_fishing_save_v1', JSON.stringify({ ts: 1, char: 'f' }))`], ['me', 390, 844, 'en-US', 2], ['wide', 1920, 820, 'ru-RU', 1], ['low', 960, 440, 'ru-RU', 1]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, locale: lang, isMobile: dpr > 1 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  if (pre) await p.addInitScript(pre);
  await p.goto(`http://localhost:${server.address().port}/`);
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `test/out/boot_${n}.png` });
  ctx.close();
}
await b.close();
server.close();
console.log('ok');
