// Точка входа
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { audio } from './audio.js';
import { Game } from './game.js';
import { initVolume } from './volume.js';

async function fontsReady() {
  try {
    await Promise.race([document.fonts.load('800 20px Nunito', 'АБВabc'), new Promise((r) => setTimeout(r, 2000))]);
  } catch (e) {}
}

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  const game = new Game();
  window.__game = game;
  if (window.__SI_DEBUG) import('./econ.js').then((m) => (window.__E = m));
  await game.start(document.getElementById('c'));
  initVolume(game.s.settings);
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => (document.hidden ? audio.suspend('hidden') : audio.resume('hidden')));
  window.addEventListener('blur', () => audio.suspend('blur'));
  window.addEventListener('focus', () => audio.resume('blur'));
  // пауза по сигналу платформы: звук и игровой процесс
  sdk.on('pause', () => {
    audio.suspend('sdk');
    game.paused = true;
    sdk.gameplay(false);
  });
  sdk.on('resume', () => {
    audio.resume('sdk');
    game.paused = false;
    if (!document.hidden) sdk.gameplay(true);
  });
  document.getElementById('loader').remove();
  sdk.ready();
}
start();
