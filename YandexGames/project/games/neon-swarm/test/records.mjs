// Built VK/OK game: personal records, persistence and zero rating-service requests.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const root = path.resolve('dist-vk');
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (url.pathname === '/parent.html') {
    const q = new URLSearchParams({ vk_app_id: '54817546', sign: 'test', vk_client: url.searchParams.get('client') || 'vk', vk_language: url.searchParams.get('lang') || 'ru', vk_platform: 'desktop_web' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html><body style="margin:0;background:#000"><iframe src="/index.html?${q}" style="border:0;width:100vw;height:100vh"></iframe><script>
    window.__calls=[];addEventListener('message',e=>{const m=e.data;if(!m||m.type!=='vk-connect')return;const {handler,params:p}=m;__calls.push(handler);let data={result:true};
    if(handler==='SetSupportedHandlers')data={supportedHandlers:['VKWebAppShowStoryBox']};
    if(handler==='VKWebAppStorageGet')data={keys:p.keys.map(key=>({key,value:''}))};
    e.source.postMessage({type:handler+'Result',data:{...data,request_id:p.request_id}},'*');});</script></body></html>`); return;
  }
  const file = path.resolve(root, '.' + url.pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
const errors = [], external = [];
try {
  browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : process.platform === 'win32' ? { channel: 'chrome' } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  fs.mkdirSync('test-results', { recursive: true });
  for (const [client, lang, width, height, score] of [['vk', 'ru', 1280, 720, 18450], ['ok', 'ru', 390, 844, 18450], ['vk', 'en', 390, 844, Number.MAX_SAFE_INTEGER]]) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    await ctx.addInitScript(() => { window.__NS_DEBUG = {}; });
    await ctx.route('**/*', (route) => {
      if (/^https?:/.test(route.request().url()) && !route.request().url().startsWith('http://127.0.0.1:')) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/parent.html?client=${client}&lang=${lang}`);
    let frame = page.frames().find((f) => f.url().includes('/index.html'));
    const ready = () => frame.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 20000 });
    await ready();
    await frame.evaluate((score) => { window.__ns_save.data.best = { score, time: 412, kills: 321, level: 18 }; window.__ns_save.write(false); window.__game.scene.getScene('Menu').go('lb'); }, score);
    const labels = () => frame.evaluate(() => window.__game.scene.getScene('Menu').L.items.map((o) => o.text || o.label?.text).filter((s) => typeof s === 'string'));
    const texts = await labels();
    assert.ok(texts.includes(lang === 'en' ? 'PERSONAL BEST' : 'ЛИЧНЫЙ РЕКОРД'));
    assert.ok(texts.includes(score.toLocaleString('ru-RU'))); assert.ok(texts.includes('321')); assert.ok(texts.includes('18'));
    assert.ok(texts.some((s) => /6:52/.test(s)));
    assert.ok(!texts.some((s) => /#\d|ТАБЛИЦА ЛИДЕРОВ|LEADERBOARD|недоступен|unavailable/.test(s)));
    assert.equal(texts.includes(lang === 'en' ? 'Share to story' : 'Рекорд в историю'), client === 'vk');
    await page.screenshot({ path: `test-results/personal-${client}-${lang}.png` });
    await page.reload(); frame = page.frames().find((f) => f.url().includes('/index.html')); await ready();
    assert.equal(await frame.evaluate(() => window.__ns_save.data.best.score), score, 'Personal record survives reload');
    await frame.evaluate(() => { window.__ns_save.data.best.score = 0; window.__game.scene.getScene('Menu').go('lb'); });
    const empty = await labels();
    assert.ok(empty.includes(lang === 'en' ? 'Finish your first run to set a personal best.' : 'Сыграй первый забег, чтобы установить личный рекорд.'));
    assert.ok(!empty.some((s) => /Стань первым|Be the first|#1|Рекорд в историю|Share to story/.test(s)));
    assert.ok(!(await page.evaluate(() => __calls)).includes('VKWebAppGetUserInfo'));
    await ctx.close();
  }
  assert.deepEqual(external, []); assert.deepEqual(errors, []);
  fs.writeFileSync('test-results/records.json', JSON.stringify({ passed: true, cases: ['VK desktop', 'OK mobile', 'English mobile with long score', 'Run details', 'Reload persistence', 'First-run empty state', 'No ranking or profile requests'], external, errors }, null, 2));
  console.log('PASS: VK/OK personal records, run details, persistence, mobile, empty state; no external requests.');
} finally { if (browser) await browser.close(); await new Promise((resolve) => server.close(resolve)); }
