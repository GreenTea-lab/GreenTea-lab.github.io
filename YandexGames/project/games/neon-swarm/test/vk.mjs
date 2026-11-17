// Проверка VK-сборки: игра в iframe, родитель изображает VK (VKWebAppInit, хранилище, реклама).
// node test/vk.mjs
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const root = path.resolve('dist-vk');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.woff2': 'font/woff2' };
const parent = `<!doctype html><html><body style="margin:0;background:#000">
<iframe id="f" src="/index.html?vk_app_id=1&vk_language=ru&vk_platform=desktop_web&sign=x" style="border:0;width:1280px;height:720px"></iframe>
<script>
window.__log = []; window.__store = JSON.parse(sessionStorage.getItem('store') || '{}'); window.__adsShown = {reward:0, interstitial:0};
addEventListener('message', (e) => {
  const m = e.data; if (!m || m.type !== 'vk-connect') return;
  const { handler, params } = m; window.__log.push(handler + ' ' + JSON.stringify(params).slice(0, 80));
  let data = { result: true };
  if (handler === 'SetSupportedHandlers') data = { supportedHandlers: ['VKWebAppShowStoryBox'] };
  if (handler === 'VKWebAppStorageGet') data = { keys: params.keys.map((k) => ({ key: k, value: __store[k] || '' })) };
  if (handler === 'VKWebAppStorageSet') { if (params.value.length > 4096) data = null; else { __store[params.key] = params.value; sessionStorage.setItem('store', JSON.stringify(__store)); } }
  if (handler === 'VKWebAppShowNativeAds') __adsShown[params.ad_format]++;
  const reply = data ? { type: handler + 'Result', data: { ...data, request_id: params.request_id } } : { type: handler + 'Failed', data: { error_type: 'client_error', request_id: params.request_id } };
  setTimeout(() => e.source.postMessage(reply, '*'), 30);
});
</script></body></html>`;
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/favicon.ico') { res.writeHead(204); return res.end(); }
  if (u === '/parent.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(parent); }
  const p = path.join(root, decodeURIComponent(u));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) { res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }
  else { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : process.platform === 'win32' ? { channel: 'chrome' } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => { if (location.pathname === '/index.html') window.__NS_DEBUG = {}; });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const frame = async () => page.frames().find((f) => f.url().includes('index.html'));
const waitMenu = async () => { const f = await frame(); await f.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'), null, { timeout: 20000 }); return f; };
await page.goto(`http://localhost:${port}/parent.html`);
let f = await waitMenu();
const shotDir = process.env.OUT || 'test-results';
fs.mkdirSync(shotDir, { recursive: true });
const shot = (n) => page.screenshot({ path: path.join(shotDir, 'vk_' + n + '.png') });
await shot('menu');
console.log('lang', await f.evaluate(() => document.documentElement.lang), 'log', (await page.evaluate(() => __log)).slice(0, 4));
// изменить сохранение и сбросить его сразу
await f.evaluate(async () => { const s = window.__ns_save; s.data.crystals = 4321; s.data.stats.kills = 777; await s.flush(); });
await page.waitForTimeout(800);
const store = await page.evaluate(() => __store);
console.log('store keys', Object.keys(store), 'chunks max len', Math.max(...Object.values(store).map((v) => v.length)));
assert.ok(Object.values(store).every((v) => v.length <= 4096));
// очистить localStorage, перезагрузить — сохранение должно прийти из VK
await f.evaluate(() => localStorage.clear());
await page.reload();
f = await waitMenu();
await page.waitForTimeout(500);
console.log('after reload crystals', await f.evaluate(() => window.__ns_save.data.crystals), 'kills', await f.evaluate(() => window.__ns_save.data.stats.kills));
assert.equal(await f.evaluate(() => window.__ns_save.data.crystals), 4321);
assert.equal(await f.evaluate(() => window.__ns_save.data.stats.kills), 777);
// магазин за голоса скрыт, лидерборд — свой рекорд
await shot('menu2');
// реклама: сразу после запуска межэкранная не показывается, за награду — показывается и награждает
const ad1 = await f.evaluate(() => new Promise((res) => window.__sdk.showInterstitial(() => res('done'))));
const rw = await f.evaluate(() => new Promise((res) => window.__sdk.showRewarded(() => (window.__got = true), (ok) => res(ok))));
console.log('interstitial', ad1, 'rewarded ok', rw, 'got', await f.evaluate(() => window.__got));
console.log('ads', await page.evaluate(() => __adsShown));
assert.equal(rw, true);
assert.deepEqual(await page.evaluate(() => __adsShown), { reward: 1, interstitial: 0 });
// Соцфункции VK: приглашение, избранное и добровольная публикация рекорда в историю.
await f.evaluate(() => { window.__ns_save.data.best.score = 18450; window.__ns_save.data.best.time = 412; window.__game.scene.getScene('Menu').go('settings'); });
await page.waitForTimeout(500);
await shot('settings');
const labels = await f.evaluate(() => window.__game.scene.getScene('Menu').L.items.filter((o) => o.label && o.label.text).map((o) => [o.label.text, o.c.x, o.c.y]));
console.log('settings', JSON.stringify(labels.map((l) => l[0])));
for (const re of [/Пригласить/, /избранное/]) { const b = labels.find((l) => re.test(l[0])); await page.mouse.click(b[1], b[2]); await page.waitForTimeout(300); }
await f.evaluate(() => window.__game.scene.getScene('Menu').go('lb'));
await page.waitForTimeout(1500);
await shot('lb');
const lb = await f.evaluate(() => window.__game.scene.getScene('Menu').L.items.filter((o) => o.label && o.label.text).map((o) => [o.label.text, o.c.x, o.c.y]));
const sh = lb.find((l) => /Рекорд в историю/.test(l[0]));
assert.ok(sh, 'Story button is visible for a supported VK client');
await page.mouse.click(sh[1], sh[2]);
await page.waitForFunction(() => __log.some((l) => l.startsWith('VKWebAppShowStoryBox ')));
const social = (await page.evaluate(() => __log)).filter((l) => /Invite|StoryBox|Favorites|Taptic/.test(l));
assert.ok(!(await page.evaluate(() => __log)).some((l) => /WallPost/.test(l)));
console.log('social', JSON.stringify(social));
await browser.close();
server.close();
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
assert.deepEqual(errors, []);

