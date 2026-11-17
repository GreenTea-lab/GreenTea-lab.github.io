// Точка входа
import { sdk } from './sdk.js';
import { save } from './save.js';
import { setLang } from './i18n.js';
import { iap } from './iap.js';
import { initVolume } from './volume.js';
import { audio } from './audio.js';
import { makeEnemyTextures } from './gfx/enemies.js';
import { makeTowerTextures } from './gfx/towers.js';
import { makeMiscTextures } from './gfx/misc.js';
import { MenuScene } from './scenes/MenuScene.js';
import { LevelsScene } from './scenes/LevelsScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HudScene } from './scenes/HudScene.js';

const Phaser = window.Phaser;

class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create() {
    makeEnemyTextures(this);
    makeTowerTextures(this);
    makeMiscTextures(this);
    this.scene.start('Menu');
  }
}

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 40px "Rubik"', 'АБВ'),
        document.fonts.load('800 40px "Rubik"', 'ABC'),
        document.fonts.load('40px "Ruslan Display"', 'АБВ'),
        document.fonts.load('40px "Ruslan Display"', 'ABC'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) {}
}

function dpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  await save.load();
  // «Без рекламы» запоминается и в сохранении — на случай, если getPurchases() не ответит
  if (save.data.noAds) sdk.noAds = true;
  // покупки: каталог и обработка необработанных платежей до старта игры
  const gems = (n) => () => {
    save.data.gems += n;
  };
  const gemIc = (k) =>
    `<svg viewBox="0 0 24 24">${[[12, 12, 8], [6, 16, 4.5], [18, 16, 4.5]].slice(0, k).map(([x, y, r]) => `<path d="M${x - r * 0.8} ${y - r * 0.3}l${r * 0.4}-${r * 0.6}h${r * 0.8}l${r * 0.4} ${r * 0.6}-${r * 0.8} ${r * 1.1}z" fill="#7fe0ff" stroke="#2a7ab0" stroke-width="1.2"/>`).join('')}</svg>`;
  await iap.init(
    {
      gems_150: { grant: gems(150), icon: gemIc(1) },
      gems_550: { grant: gems(550), icon: gemIc(2) },
      gems_1500: { grant: gems(1500), icon: gemIc(3) },
      disable_ads: {
        permanent: true,
        grant: () => {
          save.data.noAds = true;
          sdk.noAds = true;
        },
        icon: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="3" fill="#9c6234"/><path d="M10 9v6l5-3z" fill="#ffc93c"/><circle cx="12" cy="12" r="10" fill="none" stroke="#d4452f" stroke-width="2.4"/><path d="M5 19L19 5" stroke="#d4452f" stroke-width="2.4"/></svg>',
      },
    },
    () => save.flush()
  );
  initVolume(save.data.settings);

  const r = dpr();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#3a2a1a',
    width: Math.round(window.innerWidth * r),
    height: Math.round(window.innerHeight * r),
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / r },
    audio: { noAudio: true },
    render: { antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__TD_DEBUG },
    input: { activePointers: 3 },
    fps: { smoothStep: !window.__TD_DEBUG },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, MenuScene, LevelsScene, ShopScene, GameScene, HudScene],
  });
  window.__game = game;
  if (window.__TD_DEBUG) window.__setShop = (s) => (save.data.shop = Object.assign({}, s));

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

  // звук разблокируется первым касанием
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchend', unlock);

  // пауза при сворачивании вкладки
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.suspend('hidden');
      game.events.emit('app-hidden');
    } else {
      audio.resume('hidden');
    }
  });
  window.addEventListener('blur', () => {
    audio.suspend('blur');
    game.events.emit('app-hidden');
  });
  window.addEventListener('focus', () => audio.resume('blur'));

  // пауза по команде платформы
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
