// Точка входа
import { sdk } from './sdk.js';
import { save } from './save.js';
import { setLang } from './i18n.js';
import { iap } from './iap.js';
import { initVolume } from './volume.js';
import { audio } from './audio.js';
import { makeBase } from './tex.js';
import { BgScene } from './scenes/BgScene.js';
import { ArenaScene } from './scenes/ArenaScene.js';
import { HudScene } from './scenes/HudScene.js';
import { MenuScene } from './scenes/MenuScene.js';

const Phaser = window.Phaser;

class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create() {
    makeBase(this);
    this.scene.launch('Bg');
    this.scene.launch('Arena', { mode: save.data.mode });
    this.scene.launch('Hud');
    this.scene.launch('Menu');
    this.scene.stop();
  }
}

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('40px "Russo One"', 'АБВ'), document.fonts.load('40px "Russo One"', 'ABC')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) {}
}

const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  await save.load();
  // «Без рекламы» дублируется в сохранении — на случай, если getPurchases() не ответит
  if (save.data.noAds) sdk.noAds = true;
  const coins = (n) => () => {
    save.data.coins += n;
  };
  const coinSvg = (k) =>
    `<svg viewBox="0 0 24 24">${[[12, 12, 8], [7, 15, 5], [17, 15, 5]].slice(0, k).reverse().map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#3a2a08" stroke="#ffd23f" stroke-width="1.6"/><path d="M${x} ${y - r * 0.45}l${r * 0.4} ${r * 0.23}v${r * 0.45}l-${r * 0.4} ${r * 0.23}-${r * 0.4}-${r * 0.23}v-${r * 0.45}z" fill="none" stroke="#ffd23f" stroke-width="1.2"/>`).join('')}</svg>`;
  await iap.init(
    {
      coins_1000: { grant: coins(1000), icon: coinSvg(1) },
      coins_3500: { grant: coins(3500), icon: coinSvg(2) },
      coins_10000: { grant: coins(10000), icon: coinSvg(3) },
      disable_ads: {
        permanent: true,
        grant: () => {
          save.data.noAds = true;
          sdk.noAds = true;
        },
        icon: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="3" fill="none" stroke="#31f6ff" stroke-width="2"/><path d="M10 9v6l5-3z" fill="#31f6ff"/><circle cx="12" cy="12" r="10" fill="none" stroke="#ff2e88" stroke-width="2.2"/><path d="M5 19L19 5" stroke="#ff2e88" stroke-width="2.2"/></svg>',
      },
    },
    () => save.flush()
  );
  initVolume(save.data.settings);

  const r = dpr();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#07031a',
    width: Math.round(window.innerWidth * r),
    height: Math.round(window.innerHeight * r),
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / r },
    audio: { noAudio: true },
    render: { antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__NT_DEBUG },
    input: { activePointers: 4 },
    fps: { smoothStep: !window.__NT_DEBUG },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, BgScene, ArenaScene, HudScene, MenuScene],
  });
  window.__game = game;
  if (window.__NT_DEBUG) window.__nt_save = save;

  let rt = null;
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const rr = dpr();
      game.scale.setZoom(1 / rr);
      game.scale.resize(Math.round(window.innerWidth * rr), Math.round(window.innerHeight * rr));
    }, 60);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchend', unlock);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.suspend('hidden');
      game.events.emit('app-hidden');
    } else audio.resume('hidden');
  });
  window.addEventListener('blur', () => {
    audio.suspend('blur');
    game.events.emit('app-hidden');
  });
  window.addEventListener('focus', () => audio.resume('blur'));
  sdk.on('pause', () => {
    audio.suspend('sdk');
    game.events.emit('sdk-pause');
  });
  sdk.on('resume', () => {
    audio.resume('sdk');
    game.events.emit('sdk-resume');
  });
}

start();
