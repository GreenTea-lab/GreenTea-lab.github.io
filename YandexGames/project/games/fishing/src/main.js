// Точка входа: SDK, язык, сохранения, покупки, игра
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { save } from './save.js';
import { iap } from './iap.js';
import { audio } from './audio.js';
import { initVolume } from './volume.js';
import { Game, IAP_DEFS } from './game.js';
import { Scene } from './scene.js';

// живая сцена на заставке: утро, рыбак на мостках (персонаж из сохранения), поплавок подрагивает
function bootScene() {
  const cv = document.getElementById('bootCv');
  if (!cv) return () => {};
  let char = 'm';
  try {
    const sv = JSON.parse(localStorage.getItem('cozy_fishing_save_v1') || 'null');
    if (sv && sv.char) char = sv.char;
  } catch (e) {}
  const S = new Scene(cv);
  S.setEnv(0, 'morning', 'sun', char);
  S.cat.on = true;
  S.cat.k = 1;
  const place = () => {
    S.resize(innerWidth, innerHeight, Math.min(devicePixelRatio || 1, 2));
    const L = S.L;
    S.float = { x: S.W * (S.port ? 0.66 : 0.6), y: L.nearY - 0.42 * (L.nearY - L.farY), st: 'water' };
  };
  place();
  addEventListener('resize', place);
  let on = true,
    last = performance.now(),
    nib = 1.6;
  const loop = (tt) => {
    if (!on) return;
    const dt = Math.min(0.05, (tt - last) / 1000);
    last = tt;
    const F = S.float;
    nib -= dt;
    if (F.st === 'nibble') {
      F.p += dt / 0.35;
      if (F.p >= 1) F.st = 'water';
    } else if (nib <= 0) {
      F.st = 'nibble';
      F.p = 0;
      S.ripple(F.x, F.y, 0.6);
      nib = 1.8 + Math.random() * 2.2;
    }
    S.draw(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return () => {
    on = false;
    removeEventListener('resize', place);
  };
}

// шкала загрузки на заставке
function progress(p) {
  const f = document.getElementById('bootFill'),
    t = document.getElementById('bootPct'),
    fl = document.getElementById('bootFl');
  if (f) f.style.width = Math.round(p) + '%';
  if (fl) fl.style.left = Math.round(p) + '%';
  if (t) t.textContent = Math.round(p) + '%';
}

async function boot() {
  let stopBoot = () => {};
  try {
    stopBoot = bootScene();
  } catch (e) {
    console.warn('[boot] scene', e);
  }
  progress(15);
  await sdk.init();
  progress(40);
  setLang(sdk.lang);
  await save.load();
  progress(58);
  try {
    await iap.init(IAP_DEFS, () => save.flush());
  } catch (e) {
    console.warn('[IAP] init', e);
  }
  if (iap.owned.has('disable_ads')) save.data.noAds = true;
  sdk.noAds = !!save.data.noAds;
  initVolume(save.data.settings);
  progress(72);
  try {
    await Promise.all(['800 20px Nunito', '600 20px Nunito', '900 20px Nunito', '20px Pangolin'].map((f) => document.fonts.load(f, 'Аa1')));
  } catch (e) {}
  progress(86);
  stopBoot();
  const game = new Game();
  progress(100);
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  addEventListener('pointerdown', unlock, { capture: true });
  addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.suspend('hidden');
      game.holding = false;
      game.persist();
    } else audio.resume('hidden');
    game.setGameplay();
  });
  addEventListener('blur', () => audio.suspend('blur'));
  addEventListener('focus', () => audio.resume('blur'));
  sdk.on('pause', () => {
    audio.suspend('sdk');
    game.holding = false;
    sdk.gameplay(false);
  });
  sdk.on('resume', () => {
    audio.resume('sdk');
    game.setGameplay();
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.list,.grid,.locs,.mbox')) e.preventDefault();
  }, { passive: false });
  const b = document.getElementById('boot');
  setTimeout(() => {
    b.style.opacity = '0';
    setTimeout(() => b.remove(), 550);
  }, 350);
  sdk.ready();
}

boot();
