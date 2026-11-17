// Точка входа
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { audio } from './audio.js';
import { App } from './game.js';
import { initVolume } from './volume.js';
import * as core from './core.js';
import * as levels from './levels.js';
import * as tiles from './tiles.js';
import { drawCity } from './cities.js';
import { postcardURL } from './ui.js';
import { IC } from './icons.js';
import './content.js';
import * as cityArt from './city-art.js';
import * as tileArt from './tile-art.js';
import * as skinArt from './skin-art.js';
import * as postcardArt from './postcard-art.js';

if(typeof CanvasRenderingContext2D!=='undefined'&&!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r=0){r=Math.min(Math.abs(w)/2,Math.abs(h)/2,Number(Array.isArray(r)?r[0]:r)||0);this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath();return this;};
}

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 20px Nunito', 'АБВabc'), document.fonts.load('900 20px Nunito', 'АБВabc'), document.fonts.load('400 20px Kurale', 'АБВabc'), document.fonts.load('400 20px Lobster', 'АБВabc')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch (e) {}
}

async function start() {
  if (window.__PM_UNSUPPORTED) return;
  window.__PM_BOOT_STAGE?.('art');
  window.addEventListener('tileartready',tiles.clearSpriteCache);
  await Promise.all([sdk.init(), fontsReady(), tileArt.loadTileArt(), skinArt.loadSkinArt()]);
  setLang(sdk.lang);
  window.__PM_BOOT_LANGUAGE?.(sdk.lang);
  window.__PM_BOOT_STAGE?.('save');
  const app = new App();
  window.__game = app;
  await app.start(document.getElementById('c'), document.getElementById('ui'));
  window.__save = app.save;
  window.__sdk = sdk;
  window.__lib = { core, levels, tiles, drawCity, postcardURL, IC, cityArt, tileArt, skinArt,postcardArt };
  initVolume(app.save.data.settings);
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  const stop = (why) => {
    app.checkpoint();
    app.background.add(why);
    audio.suspend(why);
    if (app.state === 'play' && !app.finished && !app.ui.modalOpen && !sdk.adActive) app.ui.pause();
    app.syncGameplay();
  };
  const go = (why) => {
    app.background.delete(why);
    audio.resume(why);
    app.syncGameplay();
  };
  window.addEventListener('blur', () => stop('blur'));
  window.addEventListener('focus', () => go('blur'));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop('hidden') : go('hidden')));
  sdk.on('pause', () => stop('sdk'));
  sdk.on('resume', () => go('sdk'));
  sdk.on('adstart', () => { app.ui.root.inert = true; audio.suspend('ad'); });
  sdk.on('adend', () => { app.ui.root.inert = false; audio.resume('ad'); app.syncGameplay(); });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  app.frame(0);
  window.addEventListener('pagehide',()=>app.checkpoint());
  window.addEventListener('beforeunload',()=>app.checkpoint());
  setInterval(()=>app.checkpoint(false),5000);
  window.__PM_BOOT_DONE=true;
  document.getElementById('loader').remove();
  sdk.ready();
}
start().catch((e) => {
  console.error(e);
  const l = document.getElementById('lt');
  if (l) l.textContent = (document.documentElement.lang === 'en' ? 'Failed to start: ' : 'Не удалось запустить игру: ') + (e && e.message ? e.message : e);
  window.__PM_BOOT_ERROR?.(e.message);
});
