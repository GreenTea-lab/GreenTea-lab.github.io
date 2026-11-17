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
      Promise.all([document.fonts.load('800 20px Nunito', 'АБВabc'), document.fonts.load('700 20px "Balsamiq Sans"', 'АБВabc'), document.fonts.load('400 20px Neucha', 'АБВabc')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch (e) {}
}

const ld = (v) => window.__ld && window.__ld(v);

async function start() {
  ld(0.15);
  await Promise.all([sdk.init().then(() => ld(0.35)), fontsReady()]);
  ld(0.45);
  setLang(sdk.lang);
  const game = new Game();
  window.__game = game;
  if (window.__BF_DEBUG) window.__audio = audio;
  await game.start(document.getElementById('c'), document.getElementById('ui'));
  ld(0.9);
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
    if (game.state === 'play' && game.farm && !game.farm.finished && !game.paused && !game.ui.modalOpen && game.ui.screen === 'hud') game.ui.openPause();
  };
  const go = (why) => audio.resume(why);
  // звук не играет, пока вкладка/фрейм без фокуса (требование 1.3)
  window.addEventListener('blur', () => audio.suspend('blur'));
  window.addEventListener('focus', () => audio.resume('blur'));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop('hidden') : go('hidden')));
  sdk.on('pause', () => stop('sdk'));
  sdk.on('resume', () => go('sdk'));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  // машина доезжает до конца дороги, заставка плавно тает
  ld(1);
  await new Promise((r) => setTimeout(r, 450));
  const L = document.getElementById('loader');
  L.classList.add('out');
  setTimeout(() => L.remove(), 520);
  sdk.ready();
}
start().catch((e) => {
  console.error(e);
  const l = document.getElementById('lt');
  if (l) l.textContent = (document.documentElement.lang === 'en' ? 'Failed to start: ' : 'Не удалось запустить игру: ') + (e && e.message ? e.message : e);
});
