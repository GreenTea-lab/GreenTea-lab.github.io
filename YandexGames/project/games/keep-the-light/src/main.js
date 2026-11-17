// Точка входа
import { sdk } from './sdk.js';
import { setLang, t } from './i18n.js';
import { audio } from './audio.js';
import { Game } from './game.js';
import { initVolume } from './volume.js';

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all(['20px Distressed', '700 20px Cormorant', '20px "Marck Script"', '400 20px "PT Sans"', '700 20px "PT Sans"'].map((f) => document.fonts.load(f, 'АБВabc'))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) {}
}

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  const lt = document.getElementById('lt');
  if (lt) lt.textContent = t('loading');
  const game = new Game();
  window.__game = game;
  window.__t = t;
  await game.start(document.getElementById('c'), document.getElementById('ui'));
  window.__save = game.save;
  initVolume(game.save.data.settings);
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
  // пауза при сворачивании и по сигналу платформы
  const stop = (why) => {
    audio.suspend(why);
    if (game.state === 'play' && !game.paused && !game.ui.modalOpen) game.ui.pause();
  };
  const go = (why) => audio.resume(why);
  window.addEventListener('blur', () => audio.suspend('blur'));
  window.addEventListener('focus', () => audio.resume('blur'));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop('hidden') : go('hidden')));
  sdk.on('pause', () => stop('sdk'));
  sdk.on('resume', () => go('sdk'));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.getElementById('loader').remove();
  sdk.ready();
}
start().catch((e) => {
  console.error(e);
  const l = document.getElementById('lt');
  if (l) l.textContent = (document.documentElement.lang === 'en' ? 'Failed to start: ' : 'Не удалось запустить игру: ') + (e && e.message ? e.message : e);
});
