// Точка входа: SDK, язык, сохранения, покупки, игра
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { save } from './save.js';
import { iap } from './iap.js';
import { audio } from './audio.js';
import { initVolume } from './volume.js';
import { Game, IAP_DEFS } from './game.js';

// шкала загрузки на заставке
function progress(p) {
  const f = document.getElementById('bootFill'),
    t = document.getElementById('bootPct');
  if (f) f.style.width = Math.round(p) + '%';
  if (t) t.textContent = Math.round(p) + '%';
}

async function boot() {
  progress(18);
  await sdk.init();
  progress(42);
  setLang(sdk.lang);
  await save.load();
  progress(60);
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
    await Promise.all(['800 20px Rubik', '500 20px Rubik', '20px Lobster'].map((f) => document.fonts.load(f, 'Аa1')));
  } catch (e) {}
  progress(85);
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
      game.persist();
    } else audio.resume('hidden');
    game.setGameplay();
  });
  addEventListener('blur', () => audio.suspend('blur'));
  addEventListener('focus', () => audio.resume('blur'));
  sdk.on('pause', () => {
    audio.suspend('sdk');
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
    if (!e.target.closest('.sh-b')) e.preventDefault();
  }, { passive: false });
  const b = document.getElementById('boot');
  // короткая пауза, чтобы шкала успела дойти до конца
  setTimeout(() => {
    b.style.opacity = '0';
    setTimeout(() => b.remove(), 550);
  }, 350);
  sdk.ready();
}

boot();
