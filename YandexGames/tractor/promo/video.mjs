// Промо-видео до 8 с (16:9, 1920x1080): уборка подсолнухов, затем продажа урожая в амбаре.
// Кадры снимаются в виртуальном времени (плавно при любой скорости рендера), звук пишется отдельно
// в реальном времени по тому же сценарию. node promo/video.mjs [ru|en]
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { FARM } from './farm.mjs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const W = 1280, H = 720, DPR = 1, FPS = 30, SECONDS = 7.9;
const OUT = 'release/video/';
const PLAN = { ru: {}, en: {} };

function serve(lang) {
  const root = path.resolve('dist');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.woff2': 'font/woff2' };
  return http
    .createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (url.startsWith('/sdk.js')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        return res.end(fs.readFileSync('test/mock/sdk.js', 'utf8').replace("lang: 'tr'", `lang: '${lang}'`));
      }
      const p = path.join(root, url === '/' ? 'index.html' : url);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
        fs.createReadStream(p).pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    })
    .listen(0);
}

// виртуальное время: Date, performance.now, rAF, таймеры и CSS-анимации идут только по __advance
const VIRTUAL = () => {
  const OD = Date;
  const base = new OD('2026-10-05T12:00:00').getTime();
  const p0 = performance.now();
  let vt = 0, raf = [], rid = 0, timers = [], tid = 0;
  performance.now = () => p0 + vt;
  class VDate extends OD {
    constructor(...a) { if (a.length) super(...a); else super(base + vt); }
    static now() { return base + vt; }
  }
  window.Date = VDate;
  window.requestAnimationFrame = (cb) => (raf.push([++rid, cb]), rid);
  window.cancelAnimationFrame = (i) => (raf = raf.filter((x) => x[0] !== i));
  const add = (fn, ms, rep, a) => {
    const id = ++tid;
    timers.push({ id, due: vt + Math.max(0, +ms || 0), ms: Math.max(1, +ms || 0), rep, fn: () => fn(...a) });
    return id;
  };
  window.setTimeout = (fn, ms, ...a) => add(fn, ms, false, a);
  window.setInterval = (fn, ms, ...a) => add(fn, ms, true, a);
  window.clearTimeout = window.clearInterval = (id) => (timers = timers.filter((t) => t.id !== id));
  const syncAnims = () => {
    for (const a of document.getAnimations()) {
      if (a.__vs === undefined) {
        a.__vs = vt - (a.currentTime || 0);
        a.pause();
      }
      a.currentTime = vt - a.__vs;
    }
  };
  window.__advance = (ms) => {
    const target = vt + ms;
    for (;;) {
      let next = null;
      for (const t of timers) if (t.due <= target && (!next || t.due < next.due)) next = t;
      if (!next) break;
      vt = Math.max(vt, next.due);
      if (next.rep) next.due += next.ms;
      else timers = timers.filter((t) => t !== next);
      try { next.fn(); } catch (e) { console.error(e); }
    }
    vt = target;
    const cbs = raf;
    raf = [];
    for (const [, cb] of cbs) try { cb(p0 + vt); } catch (e) { console.error(e); }
    syncAnims();
  };
};

// подготовка сцены и действия сценария (одинаковые в обоих прогонах)
const HELPERS = () => {
  window.__setup = () => {
    const g = window.__game;
    g.startPlay();
    g.closeModal(true);
    g.lastAd = Date.now();
    // стрелка-подсказка в ролике не нужна
    const uh = g.updateHint.bind(g);
    g.updateHint = () => {
      uh();
      g.arrow.visible = false;
    };
    return [];
  };
  window.__act = (kind) => {
    const g = window.__game;
    if (kind === 'A') {
      // уборка подсолнухов: трактор едет вдоль поля
      window.__promoFarm({ harvest0: 0.42, tr: 'red', time: 480 * 0.34 });
      window.__place(-11.5, 16.4, Math.PI / 2, 'harvest', 6);
      g.autoDir = [1, 0, 1];
    } else if (kind === 'B') {
      // к амбару с полным прицепом — продажа
      window.__promoFarm({ harvest0: 0.7, tr: 'red', time: 480 * 0.4, coins: 2460 });
      window.__place(-8, 8.5, Math.PI, 'harvest', 58);
      g.autoDir = [0, -1, 1];
    } else if (kind === 'stop') g.autoDir = [0, -1, 0.001];
  };
};

// расписание: [время, действие, аргумент]
function timeline() {
  return { ev: [[0, 'A'], [4.0, 'B'], [5.6, 'stop']], end: 7.9 };
}

async function open(lang, virtual) {
  const server = serve(lang);
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: lang === 'ru' ? 'ru-RU' : 'en-US' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (virtual) await page.addInitScript(VIRTUAL);
  await page.addInitScript(HELPERS);
  await page.addInitScript(`(${FARM})()`);
  await page.goto(`http://localhost:${server.address().port}/`);
  const ready = () => window.__game && !document.getElementById('boot');
  if (virtual) {
    for (let i = 0; i < 400 && !(await page.evaluate(ready)); i++) await page.evaluate(() => window.__advance(50));
  } else await page.waitForFunction(ready);
  return { server, browser, page, errors };
}

async function frames(lang, dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { server, browser, page, errors } = await open(lang, true);
  try {
    await page.evaluate(() => document.fonts.ready);
    const plan = await page.evaluate((p) => window.__setup(p), PLAN[lang]);
    const { ev, end } = timeline(plan);
    console.log(lang, 'план', JSON.stringify(plan), 'последняя буква в', end.toFixed(2), 'с');
    await page.evaluate(() => window.__advance(400));
    const cdp = await page.context().newCDPSession(page);
    const n = Math.round(SECONDS * FPS);
    for (let i = 0; i < n; i++) {
      const t = i / FPS;
      while (ev.length && ev[0][0] <= t) {
        const [, k, a] = ev.shift();
        await page.evaluate(([k, a]) => window.__act(k, a), [k, a]);
      }
      await page.evaluate((d) => window.__advance(d), 1000 / FPS);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: W, height: H, scale: DPR } });
      fs.writeFileSync(path.join(dir, String(i).padStart(5, '0') + '.jpg'), Buffer.from(shot.data, 'base64'));
    }
    const win = await page.evaluate(() => !!document.querySelector('.sheet.win'));
    console.log(lang, 'кадров', n, 'окно итогов:', win);
  } finally {
    await browser.close();
    server.close();
  }
  return errors;
}

// звук: тот же сценарий в реальном времени, запись всего, что идёт в ctx.destination
async function sound(lang, file) {
  const { server, browser, page, errors } = await open(lang, false);
  try {
    await page.evaluate(() => {
      const conn = AudioNode.prototype.connect;
      window.__ctxs = [];
      AudioNode.prototype.connect = function (dst, ...r) {
        const res = conn.call(this, dst, ...r);
        if (dst instanceof AudioDestinationNode) {
          const c = this.context;
          if (!c.__tap) {
            c.__tap = c.createMediaStreamDestination();
            window.__ctxs.push(c);
          }
          conn.call(this, c.__tap);
        }
        return res;
      };
    });
    // жест пользователя включает звук; музыка — сразу настроение «игра»
    await page.mouse.click(W / 2, 20);
    const plan = await page.evaluate((p) => window.__setup(p), PLAN[lang]);
    await page.waitForFunction(() => window.__ctxs.length > 0);
    await page.waitForTimeout(1200);
    const { ev } = timeline(plan);
    const b64 = await page.evaluate(
      ([ev, ms]) =>
        new Promise((resolve) => {
          const c = window.__ctxs[0];
          const rec = new MediaRecorder(c.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
          const chunks = [];
          rec.ondataavailable = (e) => chunks.push(e.data);
          rec.onstop = async () => {
            const buf = new Uint8Array(await new Blob(chunks).arrayBuffer());
            let s = '';
            for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
            resolve(btoa(s));
          };
          rec.start();
          // в кадрах сцена сначала 0,4 с «стоит» — сдвигаем действия так же
          const t0 = performance.now();
          for (const [t, k, a] of ev) setTimeout(() => window.__act(k, a), 400 + t * 1000 - (performance.now() - t0));
          setTimeout(() => rec.stop(), ms);
        }),
      [ev, (SECONDS + 0.6) * 1000],
    );
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  } finally {
    await browser.close();
    server.close();
  }
  return errors;
}

fs.mkdirSync(OUT, { recursive: true });
const langs = process.argv[2] ? [process.argv[2]] : ['ru', 'en'];
for (const lang of langs) {
  const dir = `test/out/frames_${lang}`;
  const audio = `test/out/audio_${lang}.webm`;
  const e1 = await frames(lang, dir);
  const e2 = await sound(lang, audio);
  // кадры сняты с задержкой 0,4 с от старта сцены — звук сдвигаем на столько же
  const out = `${OUT}tractor_${lang}_16x9.mp4`;
  execSync(
    `ffmpeg -y -loglevel error -framerate ${FPS} -i "${dir}/%05d.jpg" -ss 0.4 -i "${audio}" ` +
      `-filter:a "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.3,afade=t=out:st=${(SECONDS - 0.8).toFixed(2)}:d=0.8" ` +
      `-vf "scale=1920:1080:flags=lanczos" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -r ${FPS} -c:a aac -b:a 160k -ar 48000 -t ${SECONDS} -movflags +faststart "${out}"`,
    { stdio: 'inherit' },
  );
  const errs = [...e1, ...e2];
  console.log(out, errs.length ? 'ошибки: ' + errs.join('; ') : 'без ошибок');
}
