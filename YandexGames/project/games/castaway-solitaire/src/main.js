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
      Promise.all([document.fonts.load('800 20px Nunito', 'АБВabc'), document.fonts.load('900 20px Nunito', 'АБВabc10'), document.fonts.load('400 20px Lobster', 'АБВabc')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) {}
}

async function start() {
  if(!window.WebGLRenderingContext || !document.createElement('canvas').getContext('2d'))throw Error(navigator.language.startsWith('ru')?'Обновите браузер или приложение VK.':'Please update your browser or VK app.');
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  const game = new Game();
  window.__game = game;
  if (window.__CS_DEBUG) {window.__audio = audio;window.__sdk=sdk;}
  await game.start(document.getElementById('c'), document.getElementById('t'), document.getElementById('ui'));
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
    if (game.state === 'level' && !game.ui.modalOpen && game.table.g && !game.table.over) game.ui.pause();
  };
  const go = (why) => audio.resume(why);
  window.addEventListener('blur', () => stop('blur'));
  sdk.on('adstart', () => { audio.suspend('ad'); game.adBlocked=true; });
  sdk.on('adend', () => { audio.resume('ad'); game.adBlocked=false; });
  window.addEventListener('focus', () => audio.resume('blur'));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop('hidden') : go('hidden')));
  sdk.on('pause', () => stop('sdk'));
  sdk.on('resume', () => go('sdk'));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.getElementById('loader').remove();
  sdk.ready();
  document.documentElement.lang=sdk.lang==='en'?'en':'ru';
  document.title=sdk.lang==='en'?'Castaway Solitaire':'Пасьянс Робинзона';
}
start().catch((e) => {
  console.error(e);
  const l = document.getElementById('lt');
  if (l) l.textContent = (document.documentElement.lang === 'en' ? 'Failed to start: ' : 'Не удалось запустить игру: ') + (e && e.message ? e.message : e);
});
