// Integration against the built VK game; VK dialogs are emulated, nothing is published.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const root = path.resolve('dist-vk');
const parent = `<!doctype html><html><body style="margin:0;background:#000"><iframe id="game" style="border:0;width:100vw;height:100vh"></iframe><script>
const q = new URLSearchParams(location.search);
const params = new URLSearchParams({vk_language:q.get('lang') || 'ru',vk_platform:q.get('platform') || 'desktop_web'});
if (q.get('local') !== '1') { params.set('vk_app_id','54817546'); params.set('sign','test'); }
if (q.get('ok') === '1') params.set('vk_client','ok');
window.__calls=[]; window.__storyResult='success';
addEventListener('message', (e) => {
  const m=e.data; if (!m || m.type !== 'vk-connect') return;
  const {handler,params:p}=m; __calls.push({handler,params:p});
  let data={result:true}, failed=false;
  if(handler==='SetSupportedHandlers') data={supportedHandlers:q.get('supported')==='0'?[]:['VKWebAppShowStoryBox']};
  if(handler==='VKWebAppStorageGet') data={keys:p.keys.map(key=>({key,value:''}))};
  if(handler==='VKWebAppShowStoryBox') {
    if(__storyResult==='cancel') data={result:false};
    if(__storyResult==='error') {failed=true;data={error_type:'client_error',error_data:{error_code:4,error_reason:'User denied'}};}
  }
  e.source.postMessage({type:handler+(failed?'Failed':'Result'),data:{...data,request_id:p.request_id}},'*');
});
document.getElementById('game').src='/index.html?'+params;
</script></body></html>`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (url.pathname === '/parent.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(parent); return; }
  const target = path.resolve(root, '.' + url.pathname);
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' }[path.extname(target)] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
const errors = [];
const results = [];
try {
  browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : process.platform === 'win32' ? { channel: 'chrome' } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => { window.__NS_DEBUG = {}; });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  async function load(query = '') {
    await page.goto(`http://127.0.0.1:${server.address().port}/parent.html?${query}`);
    const frame = page.frames().find((f) => f.url().includes('/index.html'));
    assert.ok(frame);
    await frame.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 20000 });
    return frame;
  }
  async function leaderboard(frame, score = 18450) {
    await frame.evaluate((score) => {
      window.__ns_save.data.best = { ...window.__ns_save.data.best, score, time: 412 };
      window.__game.scene.getScene('Menu').go('lb');
    }, score);
    await frame.waitForFunction(() => window.__game.scene.getScene('Menu').panel === 'lb');
    await frame.waitForFunction(() => !window.__game.scene.getScene('Menu').L.items.some((o) => typeof o.text === 'string' && /Загрузка|Loading/.test(o.text)), null, { timeout: 12000 });
    return frame.evaluate(() => window.__game.scene.getScene('Menu').L.items.filter((o) => o.label?.text).map((o) => ({ text: o.label.text, x: o.c.x, y: o.c.y })));
  }
  let frame = await load();
  assert.equal(await frame.evaluate(() => window.__sdk.canShare()), true);
  assert.equal(await page.evaluate(() => __calls.filter((c) => c.handler === 'VKWebAppShowStoryBox').length), 0, 'No story opens automatically');
  let labels = await leaderboard(frame);
  const button = labels.find((x) => x.text === 'Рекорд в историю');
  assert.ok(button, 'Localized story button is shown');
  fs.mkdirSync('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/story-before-click.png' });
  const canvas = await frame.locator('canvas').boundingBox();
  const scale = await frame.evaluate(() => ({ width: window.__game.scale.width, height: window.__game.scale.height }));
  await page.mouse.click(canvas.x + button.x * canvas.width / scale.width, canvas.y + button.y * canvas.height / scale.height, { delay: 60 });
  await page.waitForFunction(() => __calls.some((c) => c.handler === 'VKWebAppShowStoryBox'), null, { timeout: 5000 });
  const options = await page.evaluate(() => __calls.find((c) => c.handler === 'VKWebAppShowStoryBox').params);
  assert.equal(options.background_type, 'image');
  assert.equal(options.locked, true);
  assert.deepEqual(options.attachment, { type: 'url', text: 'play', url: 'https://vk.com/app54817546' });
  assert.match(options.blob, /^data:image\/png;base64,/);
  const image = Buffer.from(options.blob.split(',')[1], 'base64');
  assert.equal(image.readUInt32BE(16), 720);
  assert.equal(image.readUInt32BE(20), 1280);
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/story-ru.png', image);
  await page.screenshot({ path: 'test-results/story-button-ru.png' });
  results.push('User click opens a PNG story (720x1280) with a link to app54817546.');
  for (const mode of ['success', 'cancel', 'error']) {
    await page.evaluate((mode) => { __storyResult = mode; }, mode);
    const result = await frame.evaluate(() => window.__sdk.share({ score: 18450, time: 412 }));
    assert.equal(result, mode === 'success');
    assert.equal(await frame.evaluate(() => window.__game.scene.isActive('Menu')), true);
  }
  results.push('Confirmed result, cancellation and bridge rejection handled correctly.');
  labels = await leaderboard(frame, 0);
  assert.ok(!labels.some((x) => x.text === 'Рекорд в историю'), 'No share button without a record');
  assert.equal(await page.evaluate(() => __calls.some((c) => /WallPost/.test(c.handler))), false);
  frame = await load('lang=en');
  labels = await leaderboard(frame);
  assert.ok(labels.some((x) => x.text === 'Share to story'));
  await frame.evaluate(() => window.__sdk.share({ score: Number.MAX_SAFE_INTEGER, time: 3600 }));
  const enBlob = await page.evaluate(() => __calls.find((c) => c.handler === 'VKWebAppShowStoryBox').params.blob);
  fs.writeFileSync('test-results/story-en.png', Buffer.from(enBlob.split(',')[1], 'base64'));
  results.push('English story card and long scores render successfully.');
  await page.setViewportSize({ width: 390, height: 844 });
  frame = await load('platform=mobile_android');
  labels = await leaderboard(frame);
  const mobileButton = labels.find((x) => x.text === 'Рекорд в историю');
  assert.ok(mobileButton);
  await page.screenshot({ path: 'test-results/story-button-mobile.png' });
  const mobileCanvas = await frame.locator('canvas').boundingBox();
  const mobileScale = await frame.evaluate(() => ({ width: window.__game.scale.width, height: window.__game.scale.height }));
  await page.mouse.click(mobileCanvas.x + mobileButton.x * mobileCanvas.width / mobileScale.width, mobileCanvas.y + mobileButton.y * mobileCanvas.height / mobileScale.height, { delay: 60 });
  await page.waitForFunction(() => __calls.some((c) => c.handler === 'VKWebAppShowStoryBox'), null, { timeout: 5000 });
  results.push('Story button works at a mobile viewport (390x844).');
  for (const query of ['supported=0', 'ok=1', 'local=1']) {
    frame = await load(query);
    assert.equal(await frame.evaluate(() => window.__sdk.canShare()), false);
    labels = await leaderboard(frame);
    assert.ok(!labels.some((x) => x.text === 'Рекорд в историю'));
    assert.equal(await frame.evaluate(() => window.__sdk.share({ score: 10, time: 1 })), false);
    assert.equal(await page.evaluate(() => __calls.some((c) => c.handler === 'VKWebAppShowStoryBox' || /WallPost/.test(c.handler))), false);
  }
  results.push('No sharing in unsupported clients, OK or local mode; no wall calls.');
  assert.deepEqual(errors, []);
  fs.writeFileSync('test-results/stories.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

