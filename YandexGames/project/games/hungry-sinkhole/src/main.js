// Точка входа
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { audio } from './audio.js';
import { Game } from './game.js';
import { initVolume } from './volume.js';
import {loadingStage,finishLoading} from './loading.js';

window.__sdk = sdk;
window.__audio = audio;

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 20px Rubik', 'АБВabc'), document.fonts.load('600 20px Rubik', 'АБВabc'), document.fonts.load('400 20px "Rubik Bubbles"', 'АБВabc')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch (e) {}
}

async function start() {
  await loadingStage(1);
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  const game = new Game();
  window.__game = game;
  await game.start(document.getElementById('c'), document.getElementById('ui'),stage=>loadingStage(stage,sdk.lang));
  window.__save = game.save;
  initVolume(game.save.data.settings);
  const unlock = () => {
    audio.unlock();
    if (!document.hidden && !sdk.adActive) audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  // пауза при сворачивании и по сигналу платформы
  const stop = (why) => {
    game.backgroundHolds.add(why);
    audio.suspend(why);
    if (game.state === 'play' && !game.paused && !game.ui.modalOpen) game.pause(true);
  };
  const go = (why) => {game.backgroundHolds.delete(why);audio.resume(why);if(!game.backgroundHolds.size&&game.state==='play'&&game.paused&&!game.ui.modalOpen)game.ui.showPause();};
  // звук не играет, пока вкладка/фрейм без фокуса (требование 1.3)
  window.addEventListener('blur', () => stop('blur'));
  window.addEventListener('focus', () => go('blur'));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop('hidden') : go('hidden')));
  sdk.on('adstart', () => audio.suspend('ad'));
  sdk.on('adend', () => audio.resume('ad'));
  sdk.on('pause', () => stop('sdk'));
  sdk.on('resume', () => go('sdk'));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  await finishLoading();
  sdk.ready();
}
start().catch((e) => {
  console.error(e);
  window.__loadingFailed?.();
});
