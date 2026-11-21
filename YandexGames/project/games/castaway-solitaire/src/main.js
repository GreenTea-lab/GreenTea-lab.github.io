// Точка входа
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { audio } from './audio.js';
import { Game } from './game.js';
import { initVolume } from './volume.js';
import { save } from './save.js';

const loadingPhases={
  save:[30,'Открываем сохранение…','Opening your save…'],
  island:[54,'Готовим остров…','Preparing the island…'],
  table:[81,'Готовим карты…','Getting the cards ready…'],
  done:[100,'Остров готов','Your island is ready'],
};

function loading(stage){
  const [amount,ru,en]=loadingPhases[stage];
  document.querySelector('.load-fill').style.width=amount+'%';
  document.querySelector('.load-progress').setAttribute('aria-valuenow',amount);
  document.getElementById('load-status').textContent=document.documentElement.lang==='en'?en:ru;
  if(stage==='island'&&!document.hidden)return new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
}

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
  const english=document.documentElement.lang==='en';
  document.title=document.getElementById('lt').textContent=english?'Castaway Solitaire':'Пасьянс Робинзона';
  document.getElementById('load-retry').textContent=english?'Try again':'Попробовать снова';
  loading('save');
  const game = new Game();
  window.__game = game;
  if (window.__CS_DEBUG) {window.__audio = audio;window.__sdk=sdk;}
  await game.start(document.getElementById('c'), document.getElementById('t'), document.getElementById('ui'),loading);
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
  game.island.render();
  loading('done');
  const loader=document.getElementById('loader');
  loader.setAttribute('aria-busy','false');
  loader.classList.add('loaded');
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,260));
  loader.remove();
  sdk.ready();
}
start().catch((e) => {
  console.error(e);
  const loader=document.getElementById('loader');
  if(!loader)return;
  loader.dataset.error='';
  loader.setAttribute('aria-busy','false');
  document.getElementById('load-status').textContent=document.documentElement.lang==='en'?
    'Could not start the game. Try again or check that your browser supports WebGL.':
    'Не удалось запустить игру. Попробуйте снова или проверьте поддержку WebGL в браузере.';
  document.getElementById('load-retry').hidden=false;
});
