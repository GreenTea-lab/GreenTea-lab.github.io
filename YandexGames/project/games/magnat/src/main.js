// Точка входа
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { audio } from './audio.js';
import { Game } from './game.js';
import { initVolume } from './volume.js';
import { save } from './save.js';

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 20px Nunito', 'АБВabc'),
        document.fonts.load('900 20px Nunito', 'АБВabc10'),
        document.fonts.load('900 40px "Playfair Display"', 'МАГНАТabc'),
        document.fonts.load('600 20px Oswald', 'МОСКВАabc0₽'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) {}
}

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  const game = new Game();
  window.__game = game;
  await game.start(document.getElementById('c'), document.getElementById('ui'));
  window.__save = save;
  initVolume(save.data.settings);
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  // пауза при сворачивании и по сигналу платформы
  const stop = (why) => {
    audio.suspend(why);
    // во время рекламы за награду (выход из тюрьмы) меню паузы не нужно: ход ждёт окончания ролика
    if (game.state === 'match' && !game.M.over && !sdk.adActive) game.ui.pauseMenu();
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
