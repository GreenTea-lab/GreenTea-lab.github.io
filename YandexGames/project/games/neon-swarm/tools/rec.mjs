// Покадровая запись геймплея для промо-видео Яндекс Игр.
// Время в странице подменяется (page.clock): каждый кадр — ровно 1/fps секунды игрового времени,
// поэтому видео плавное, даже если headless-рендер медленный. Музыка пишется отдельно в реальном времени.
import { chromium } from '../node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];

// Виртуальное время: Date/performance.now идут только когда мы двигаем кадр, а requestAnimationFrame
// вызывается вручную ровно один раз на кадр (один рендер на кадр — так быстрее всего в swiftshader)
const VIRTUAL_TIME = () => {
  const OD = Date;
  const base = new OD('2026-10-04T12:00:00').getTime();
  const p0 = performance.now();
  let vt = 0;
  let q = [];
  let id = 0;
  window.__vtime = () => vt;
  window.__advance = (ms) => {
    vt += ms;
    const cbs = q;
    q = [];
    const ts = p0 + vt;
    for (const [, cb] of cbs) {
      try { cb(ts); } catch (e) { console.error(e); }
    }
    return cbs.length;
  };
  performance.now = () => p0 + vt;
  class VDate extends OD {
    constructor(...a) { if (a.length) super(...a); else super(base + vt); }
    static now() { return base + vt; }
  }
  window.Date = VDate;
  window.requestAnimationFrame = (cb) => { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = (i) => { q = q.filter((x) => x[0] !== i); };
};

export function serve(gameDir, lang) {
  const root = path.join(gameDir, 'dist');
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
  const server = http
    .createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (url.startsWith('/sdk.js')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        let s = fs.readFileSync(path.join(gameDir, 'test/mock/sdk.js'), 'utf8');
        s = s.replace(/lang: '[a-z]+'/, `lang: '${lang}'`);
        return res.end(s);
      }
      let p = path.join(root, url === '/' ? 'index.html' : url);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
        fs.createReadStream(p).pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    })
    .listen(0);
  return server;
}

async function open({ gameDir, lang, w, h, mobile, dpr, debugVar, debug, fakeClock, init }) {
  const server = serve(gameDir, lang);
  const browser = await chromium.launch({ executablePath: CHROME, args: ARGS });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr || 1, isMobile: !!mobile, hasTouch: !!mobile, locale: lang === 'ru' ? 'ru-RU' : 'en-US' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  if (fakeClock) await page.addInitScript(VIRTUAL_TIME);
  await page.addInitScript(([v, d]) => (window[v] = d), [debugVar, debug || {}]);
  if (init) await page.addInitScript(init);
  await page.goto(`http://localhost:${server.address().port}/`);
  return { server, browser, page, errors };
}

// Ждём условие, прокручивая фейковое время
async function until(page, pred, fake, maxMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await page.evaluate(pred).catch(() => false)) return true;
    if (fake) await advance(page, 100, 3);
    else await page.waitForTimeout(100);
  }
  throw new Error('timeout waiting for ' + pred);
}

// продвинуть виртуальное время на ms, кадрами по step мс
export async function advance(page, ms, step = 1000 / 30) {
  for (let t = 0; t < ms - 0.01; t += step) await page.evaluate((d) => window.__advance && window.__advance(d), Math.min(step, ms - t));
}

/**
 * Записать кадры. opts: gameDir, lang, w, h, mobile, debugVar, debug, ready (строка-предикат),
 * setup(page) — подготовка сцены, timeline [{t, fn(page)}], seconds, fps, out (папка кадров)
 */
export async function recordFrames(opts) {
  const { seconds, fps = 30, out } = opts;
  if (!opts.stills) {
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
  }
  const stills = (opts.stills || []).slice().sort((a, b) => a.t - b.t);
  const { server, browser, page, errors } = await open({ ...opts, fakeClock: true });
  try {
    await until(page, opts.ready, true);
    const adv = (ms) => advance(page, ms);
    const cdp = await page.context().newCDPSession(page);
    if (opts.setup) await opts.setup(page, adv);
    const tl = (opts.timeline || []).slice().sort((a, b) => a.t - b.t);
    const n = Math.round(seconds * fps);
    const step = 1000 / fps;
    const t0 = Date.now();
    // в режиме скриншотов между снимками рендерим в маленьком окне — так в разы быстрее
    const full = { width: opts.w, height: opts.h };
    const low = { width: Math.max(160, Math.round(opts.w / 5)), height: Math.max(160, Math.round(opts.h / 5)) };
    low.height = Math.round((low.width * opts.h) / opts.w);
    let isLow = false;
    const setLow = async (v) => {
      if (v === isLow) return;
      isLow = v;
      await page.setViewportSize(v ? low : full);
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      await page.waitForTimeout(400);
    };
    if (opts.stills && !opts.noLow && stills.length && stills[0].t > 1.2) await setLow(true);
    for (let i = 0; i < n; i++) {
      const t = i / fps;
      if (opts.stills && !opts.noLow && stills.length) await setLow(stills[0].t - t > 1.5);
      while (tl.length && tl[0].t <= t) await tl.shift().fn(page, adv);
      if (opts.onFrame) await opts.onFrame(page, t);
      await page.evaluate((d) => window.__advance(d), step);
      if (opts.stills) {
        // режим скриншотов: снимаем только нужные моменты в PNG
        while (stills.length && stills[0].t <= t + 1e-6) {
          const st = stills.shift();
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: opts.w, height: opts.h, scale: opts.dpr || 1 } });
          fs.writeFileSync(st.file, Buffer.from(shot.data, 'base64'));
          console.log('  снимок', st.file);
        }
        if (!stills.length) break;
        continue;
      }
      const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
      fs.writeFileSync(path.join(out, String(i).padStart(5, '0') + '.jpg'), Buffer.from(shot.data, 'base64'));
      if (i % 60 === 0) process.stdout.write(`  ${opts.name || ''} кадр ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)} с)\n`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (errors.length) console.log('ошибки страницы:', errors.slice(0, 5));
  return errors;
}

/**
 * Записать музыку игры в реальном времени: перехватываем все подключения к ctx.destination
 * и параллельно отправляем звук в MediaStreamDestination → MediaRecorder.
 * opts: gameDir, lang, debugVar, debug, ready, start(page) — запустить музыку, seconds, outFile (.webm)
 */
export async function recordAudio(opts) {
  const init = () => {
    const Orig = window.AudioContext || window.webkitAudioContext;
    const conn = AudioNode.prototype.connect;
    window.__recCtx = [];
    AudioNode.prototype.connect = function (dst, ...rest) {
      const r = conn.call(this, dst, ...rest);
      try {
        if (dst instanceof AudioDestinationNode) {
          const c = this.context;
          if (!c.__tap) {
            c.__tap = c.createMediaStreamDestination();
            window.__recCtx.push(c);
          }
          conn.call(this, c.__tap);
        }
      } catch (e) {}
      return r;
    };
    window.__startRec = (ms) =>
      new Promise((res) => {
        const c = window.__recCtx[window.__recCtx.length - 1];
        const rec = new MediaRecorder(c.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
        const chunks = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = async () => {
          const b = new Blob(chunks, { type: 'audio/webm' });
          const buf = new Uint8Array(await b.arrayBuffer());
          let s = '';
          for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
          res(btoa(s));
        };
        rec.start();
        setTimeout(() => rec.stop(), ms);
      });
  };
  const { server, browser, page } = await open({ ...opts, w: opts.w || 480, h: opts.h || 270, fakeClock: false, init });
  try {
    await until(page, opts.ready, false);
    await opts.start(page);
    await page.waitForFunction(() => window.__recCtx.length > 0, null, { timeout: 20000 });
    await page.waitForTimeout(500);
    const b64 = await page.evaluate((ms) => window.__startRec(ms), opts.seconds * 1000);
    fs.writeFileSync(opts.outFile, Buffer.from(b64, 'base64'));
  } finally {
    await browser.close();
    server.close();
  }
}

// Склейка: кадры + музыка (с плавным затуханием) → MP4 H.264
export function encode({ frames, fps = 30, audio, out, seconds, fadeIn = 0.5, fadeOut = 1.5 }) {
  const a = audio
    ? `-i "${audio}" -filter:a "afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${(seconds - fadeOut).toFixed(2)}:d=${fadeOut}" -c:a aac -b:a 160k -shortest`
    : '-an';
  execSync(
    `ffmpeg -y -loglevel error -framerate ${fps} -i "${frames}/%05d.jpg" ${a} -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -t ${seconds} "${out}"`,
    { stdio: 'inherit' }
  );
}
