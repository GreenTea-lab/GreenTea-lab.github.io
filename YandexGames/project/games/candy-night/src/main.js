// Точка входа
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { audio } from './audio.js';
import { Game } from './game.js';
import { initVolume } from './volume.js';

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 20px Nunito', 'АБВabc'), document.fonts.load('400 20px Pangolin', 'АБВabc'), document.fonts.load('400 20px "Rubik Wet Paint"', 'АБВabc')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch (e) {}
}

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  const game = new Game();
  window.__game = game;
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
  const stop = (why) => {
    audio.suspend(why);
    if (game.state === 'play' && game.w && !game.w.finished && !game.paused && game.ui.screen === 'hud' && !game.ui.modalOpen) game.ui.pause();
  };
  const go = (why) => audio.resume(why);
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
