// Точка входа
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { audio } from './audio.js';
import { App } from './game.js';
import { initVolume } from './volume.js';
import { planSet } from './bot.js';
import * as gfx from './gfx.js';
import * as items from './items.js';
import * as scenes from './scenes.js';
import * as table from './table.js';
import * as core from './core.js';
import { IC } from './icons.js';
import {loadItemArt} from './item-art.js';
const loadingStatus=(ru,en)=>{const e=document.getElementById('lt');if(e)e.textContent=document.documentElement.lang==='en'?en:ru;};

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 20px Nunito', 'АБВabc'), document.fonts.load('900 20px Nunito', 'АБВabc'), document.fonts.load('400 20px Kurale', 'АБВabc')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch (e) {}
}

async function start() {
  loadingStatus('Готовим комнату и коллекции…','Preparing your room and collections…');
  await Promise.all([sdk.init(), fontsReady(),Promise.race([loadItemArt(),new Promise(r=>setTimeout(r,3000))])]);
  setLang(sdk.lang);
  loadingStatus('Расставляем бруски…','Setting out the blocks…');
  const app = new App();
  window.__game = app;
  window.__sdk = sdk;
  window.__audio = audio;
  await app.start(document.getElementById('c'), document.getElementById('ui'));
  window.__save = app.save;
  window.__plan = planSet;
  window.__gfx = { ...gfx, ...table, ...items, ...scenes, core };
  window.__handSVG = IC.hand;
  initVolume(app.save.data.settings);
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  // пауза при сворачивании и по сигналу платформы
  const reasons = new Set();
  const stop = (why) => {
    reasons.add(why);
    app.blocked = true;
    app.cancelDrag();
    app.st.selected = -1;
    audio.suspend(why);
    if (app.state === 'play' && !app.finished && !app.ui.modalOpen && !sdk.adActive) app.ui.pause();
  };
  const go = (why) => {
    reasons.delete(why);
    app.blocked = reasons.size > 0;
    audio.resume(why);
  };
  // звук не играет, пока вкладка/фрейм без фокуса (требование 1.3)
  window.addEventListener('blur', () => stop('blur'));
  window.addEventListener('focus', () => go('blur'));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop('hidden') : go('hidden')));
  sdk.on('pause', () => stop('sdk'));
  sdk.on('resume', () => go('sdk'));
  sdk.on('adstart', () => {
    app.cancelDrag();
    audio.suspend('ad');
    document.documentElement.classList.add('ad-active');
  });
  sdk.on('adend', () => {
    audio.resume('ad');
    document.documentElement.classList.remove('ad-active');
    sdk.gameplay(app.state === 'play' && !app.finished && !app.ui.modalOpen && !app.blocked);
  });
  document.addEventListener('click', e => {
    if (sdk.adActive || app.blocked) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  sdk.onAdsChange?.(() => app.ui.syncAds());
  window.addEventListener('pagehide', () => app.save.flush());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  clearTimeout(window.__loadingWatchdog);
  document.getElementById('loader').remove();
  sdk.ready();
}
start().catch((e) => {
  clearTimeout(window.__loadingWatchdog);
  console.error(e);
  const l = document.getElementById('lt');
  if (l) l.textContent = document.documentElement.lang === 'en' ? 'Could not start. Update your browser or try again.' : 'Не удалось запустить игру. Обновите браузер или попробуйте ещё раз.';
  document.getElementById('loader')?.classList.add('failed');
});
