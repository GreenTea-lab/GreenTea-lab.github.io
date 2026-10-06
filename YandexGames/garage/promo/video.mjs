// Промо-видео до 8 с (16:9, 1920x1080): настоящий геймплей — мойка ржавой «Ласточки», болгарка с искрами,
// покраска всей машины и продажа покупателю. Кадры снимаются в виртуальном времени, звуки эффектов
// записываются по журналу из прогона кадров, музыка — в реальном времени. node promo/video.mjs [ru|en]
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { saveJS, stage } from './state.mjs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];
const W = 1280, H = 720, DPR = 1.5, FPS = 30, SECONDS = 7.9;
const OUT = 'release/video/';
const CAR = { model: 'lastochka', wreck: 1, color: 0x3d6fb0, seed: 9, look: { rim: 'steel' }, bought: 9000 };
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

// действия по времени (с): мойка зигзагом, болгарка, покраска, продажа
const HELPERS = () => {
  window.__act = (name, t) => {
    const g = window.__game;
    const { THREE } = window.__GF;
    if (name === 'wash') {
      // точка на боковине кузова, ходит зигзагом от багажника к капоту
      const car = g.view.car;
      const box = new THREE.Box3().setFromObject(car.body);
      const k = Math.min(1, t / 1.8);
      const x = THREE.MathUtils.lerp(box.max.x, box.min.x, k);
      const y = THREE.MathUtils.lerp(box.min.y + 0.12, box.max.y - 0.25, 0.5 + 0.5 * Math.sin(t * 22));
      const pts = [new THREE.Vector3(x, y, box.max.z), new THREE.Vector3(x, box.max.y - 0.05, 0)];
      const rc = g.g.renderer.domElement.getBoundingClientRect();
      for (const p of pts) {
        const n = p.clone().project(g.g.camera);
        g._washAt(rc.left + ((n.x + 1) / 2) * rc.width, rc.top + ((1 - n.y) / 2) * rc.height);
      }
    } else if (name === 'grind') {
      g.setTool('body');
      const c = g.s.car;
      c.panels.doorL.rust = Math.min(c.panels.doorL.rust, 0.62);
      g.view.sync(true);
      g.select('doorL');
      g.doJob('rust', 'doorL');
      Object.assign(g.g.view, { tyaw: 0.35, tdist: 7.6, tpitch: 0.14 });
    } else if (name === 'paint') {
      // остальная ржавчина и вмятины убраны «за кадром», затем — покраска всей машины
      const c = g.s.car;
      for (const k in c.panels) Object.assign(c.panels[k], { rust: 0, dent: 0, primer: 0, fade: 0 });
      g.view.sync(false);
      g.setTool('paint');
      g._paintPick = 0x8a1a1a;
      g.doJob('paintAll', null);
      Object.assign(g.g.view, { tyaw: 0.9, tdist: 7.8, tpitch: 0.16 });
    } else if (name === 'sell') {
      g.setTool('sell');
      g.listCar();
      g.buyerT = 0;
      Object.assign(g.g.view, { tyaw: 1.2, tdist: 7.2 });
    } else if (name === 'deal') {
      const B = g.buyers[0];
      if (B) g.sellCar(Math.max(B.offer, Math.round(g.s.car.listed.ask * 0.97 / 500) * 500), B.type);
    }
  };
};
const TIMELINE = [
  [0.15, 1.95, 'wash'],
  [2.0, 0, 'grind'],
  [3.45, 0, 'paint'],
  [5.75, 0, 'sell'],
  [6.45, 0, 'deal'],
];
const SETUP = { car: CAR, ui: true, tool: 'wash', view: { yaw: 1.15, pitch: 0.16, dist: 7.0 } };

async function open(lang, virtual) {
  const server = serve(lang);
  const browser = await chromium.launch({ executablePath: CHROME, args: ARGS });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: lang === 'ru' ? 'ru-RU' : 'en-US' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (virtual) await page.addInitScript(VIRTUAL);
  await page.addInitScript(HELPERS);
  await page.addInitScript(saveJS({ xp: 0 }) + `Math.random = (() => { let s = 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();`);
  await page.goto(`http://localhost:${server.address().port}/`);
  const ready = () => window.__game && !document.getElementById('boot');
  if (virtual) {
    for (let i = 0; i < 400 && !(await page.evaluate(ready)); i++) await page.evaluate(() => window.__advance(50));
  } else await page.waitForFunction(ready);
  await page.evaluate(stage, SETUP);
  await page.evaluate(() => {
    const g = window.__game;
    g.lastAd = Date.now();
    g.g._idle = -1e9;
  });
  return { server, browser, page, errors };
}

async function frames(lang, dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { server, browser, page, errors } = await open(lang, true);
  let sfx = [];
  try {
    await page.evaluate(() => document.fonts.ready);
    // прогреть сцену: тени, шейдеры, камера на месте
    for (let i = 0; i < 20; i++) await page.evaluate(() => window.__advance(50));
    await page.evaluate(() => {
      window.__sfx = [];
      const A = window.__audio, play = A.play.bind(A);
      A.play = (...a) => (window.__sfx.push([performance.now() - window.__t0, a]), play(...a));
      window.__t0 = performance.now();
    });
    const cdp = await page.context().newCDPSession(page);
    const n = Math.round(SECONDS * FPS);
    const done = new Set();
    for (let i = 0; i < n; i++) {
      const t = i / FPS;
      for (const [t0, t1, name] of TIMELINE) {
        if (t1 ? t >= t0 && t <= t1 : t >= t0 && !done.has(name)) {
          done.add(name);
          await page.evaluate(([nm, tt]) => window.__act(nm, tt), [name, t - t0]);
        }
      }
      await page.evaluate((d) => window.__advance(d), 1000 / FPS);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: W, height: H, scale: DPR } });
      fs.writeFileSync(path.join(dir, String(i).padStart(5, '0') + '.jpg'), Buffer.from(shot.data, 'base64'));
    }
    const info = await page.evaluate(() => [__game.s.sold, Math.round(__game.s.money), !!document.querySelector('.fin')]);
    sfx = await page.evaluate(() => window.__sfx);
    console.log(lang, 'кадров', n, 'продано/деньги/окно продажи:', info.join(' '), 'звуков', sfx.length);
  } finally {
    await browser.close();
    server.close();
  }
  return { errors, sfx };
}

// звук: музыка в реальном времени, эффекты — по журналу из прогона кадров
async function sound(lang, file, sfx) {
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
    await page.mouse.click(30, H - 20);
    await page.evaluate(() => {
      const g = window.__game;
      g.g.render = () => {};
      const A = window.__audio;
      window.__play = A.play.bind(A);
      A.play = () => {};
    });
    await page.waitForFunction(() => window.__ctxs.length > 0);
    await page.waitForTimeout(1500);
    const b64 = await page.evaluate(
      ([sfx, ms]) =>
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
          const t0 = performance.now();
          const at = (ms, f) => setTimeout(f, Math.max(0, 300 + ms - (performance.now() - t0)));
          for (const [t, a] of sfx) at(t, () => window.__play(...a));
          setTimeout(() => rec.stop(), ms);
        }),
      [sfx, (SECONDS + 0.6) * 1000],
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
  const { errors: e1, sfx } = await frames(lang, dir);
  const e2 = await sound(lang, audio, sfx);
  const out = `${OUT}garage_${lang}_16x9.mp4`;
  execSync(
    `ffmpeg -y -loglevel error -framerate ${FPS} -i "${dir}/%05d.jpg" -ss 0.3 -i "${audio}" ` +
      `-filter:a "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.2,afade=t=out:st=${(SECONDS - 0.8).toFixed(2)}:d=0.8" ` +
      `-c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -r ${FPS} -c:a aac -b:a 160k -ar 48000 -t ${SECONDS} -movflags +faststart "${out}"`,
    { stdio: 'inherit' },
  );
  const errs = [...e1, ...e2];
  console.log(out, errs.length ? 'ошибки: ' + errs.join('; ') : 'без ошибок');
}
