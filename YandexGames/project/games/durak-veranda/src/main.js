// Точка входа
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { audio } from './audio.js';
import { App } from './game.js';
import { initVolume } from './volume.js';
import * as core from './core.js';
import * as bot from './bot.js';
import { drawFace, drawBack } from './cards.js';
import { drawAvatar, jesterCap } from './avatars.js';
import { buildScene } from './scene.js';

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 20px Nunito', 'АБВabc'), document.fonts.load('900 20px Nunito', 'АБВabc'), document.fonts.load('400 20px "Yeseva One"', 'АБВabc')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch (e) {}
}

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  const app = new App();
  window.__game = app;
  window.__core = core;
  window.__bot = bot;
  window.__art = { drawFace, drawBack, drawAvatar, jesterCap, buildScene };
  await app.start(document.getElementById('c'), document.getElementById('ui'));
  window.__save = app.save;
  initVolume(app.save.data.settings);
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  const stop = (why) => {
    audio.suspend(why);
    if (app.state === 'play' && app.game && !app.game.over && !app.ui.modalOpen && !sdk.adActive) app.ui.pause();
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
