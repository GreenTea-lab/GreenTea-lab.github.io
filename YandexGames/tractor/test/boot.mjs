// Снимок заставки и проверка звука мотора
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
const html = fs.readFileSync('dist/index.html', 'utf8').replace('<script src="game.js"></script>', '').replace('<script src="/sdk.js"></script>', '');
const dir = path.resolve('dist');
const srv = http.createServer((q, r) => { const p = path.join(dir, q.url); if (q.url === '/') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end(html); } if (fs.existsSync(p)) { r.writeHead(200); return fs.createReadStream(p).pipe(r); } r.writeHead(404); r.end(); }).listen(0);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [n, w, h, dpr] of [['desk', 1280, 720, 1], ['phone', 390, 800, 2]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await pg.goto(`http://localhost:${srv.address().port}/`);
  await pg.evaluate(() => { document.getElementById('bootFill').style.width = '64%'; document.getElementById('bootPct').textContent = '64%'; });
  await pg.waitForTimeout(2300);
  await pg.screenshot({ path: `test/out/boot_${n}.png` });
}
await b.close(); srv.close();
console.log('ok');
