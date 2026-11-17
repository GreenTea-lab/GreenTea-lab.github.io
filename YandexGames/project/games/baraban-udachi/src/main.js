// Точка входа
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { Game } from './game.js';

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 20px Nunito', 'АБВabc'),
        document.fonts.load('900 20px Nunito', 'АБВabc'),
        document.fonts.load('400 20px Lobster', 'АБВabc'),
        document.fonts.load('800 20px Rubik', 'АБВ123'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) {}
}

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  const game = new Game();
  window.__game = game;
  await game.start();
  game.applyVol();
  const unlock = () => {
    audio.unlock();
    game.applyVol();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  // пауза при сворачивании и по сигналу платформы
  const stop = (why) => {
    audio.suspend(why);
    if (game.state === 'play' && !game.paused) game.pauseMenu();
  };
  const go = (why) => audio.resume(why);
  window.addEventListener('blur', () => audio.suspend('blur'));
  window.addEventListener('focus', () => audio.resume('blur'));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop('hidden') : go('hidden')));
  sdk.on('pause', () => stop('sdk'));
  sdk.on('resume', () => go('sdk'));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.getElementById('loader').remove();
}
start().catch((e) => {
  console.error(e);
  const l = document.getElementById('lt');
  if (l) l.textContent = 'Не удалось запустить игру: ' + (e && e.message ? e.message : e);
});
