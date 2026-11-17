// Точка входа
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { audio } from './audio.js';
import { Game } from './game.js';
import { initVolume } from './volume.js';

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 20px Nunito', 'АБВabc'), document.fonts.load('400 20px "Russo One"', 'АБВabc')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch (e) {}
}

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  const game = new Game();
  window.__game = game;
  if (window.__CR_DEBUG) window.__audio = audio;
  await game.start(document.getElementById('c'), document.getElementById('ui'));
  window.__save = game.save;
  initVolume(game.save.data.settings);
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  // пауза при сворачивании и по сигналу платформы
  let extPause = 0;
  const stop = (why) => {
    audio.suspend(why);
    extPause++;
    if (game.state === 'race' && game.race && !game.race.finished && !game.paused) game.ui.pause();
  };
  const go = (why) => {
    audio.resume(why);
    extPause = Math.max(0, extPause - 1);
  };
  // звук не играет, пока вкладка/фрейм без фокуса (требование 1.3)
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
