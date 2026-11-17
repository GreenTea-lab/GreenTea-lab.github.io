// Точка входа
import { sdk } from './sdk.js';
import { save, dayKey, dayNum } from './save.js';
import { setTextScale } from './ui.js';
import { initAnalytics, track } from './analytics.js';
import { setLang } from './i18n.js';
import { iap } from './iap.js';
import { initVolume } from './volume.js';
import { audio } from './audio.js';
import { makeTextures } from './textures.js';
import { BgScene } from './scenes/BgScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HudScene } from './scenes/HudScene.js';

const Phaser = window.Phaser;

class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create() {
    makeTextures(this);
    this.scene.launch('Bg');
    this.scene.start('Menu');
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

function dpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

async function start() {
  await Promise.all([sdk.init(), fontsReady()]);
  setLang(sdk.lang);
  await save.load();
  setTextScale(save.data.settings.bigText ? 1.15 : 1);
  // аналитика: возвращение игрока на 1-й, 3-й и 7-й день после первого запуска
  initAnalytics();
  {
    const d = save.data;
    const today = dayKey();
    if (!d.firstDay) {
      d.firstDay = today;
      track('first_open');
    } else {
      const n = dayNum(today) - dayNum(d.firstDay);
      d.retSent = d.retSent || {};
      for (const k of [1, 3, 7]) if (n === k && !d.retSent[k]) {
        d.retSent[k] = true;
        track('return_d' + k);
      }
    }
  }
  // «Без рекламы» запоминается и в сохранении — на случай, если getPurchases() не ответит
  if (save.data.noAds) sdk.noAds = true;
  // покупки: каталог и обработка необработанных платежей до старта игры
  const cr = (n) => () => {
    save.data.crystals += n;
  };
  const gem = (k) =>
    `<svg viewBox="0 0 24 24">${[[12, 12, 8], [6, 16, 4.5], [18, 16, 4.5]].slice(0, k).map(([x, y, r]) => `<path d="M${x} ${y - r}l${r * 0.75} ${r}-${r * 0.75} ${r}-${r * 0.75}-${r}z" fill="#b86bff" stroke="#e8c8ff" stroke-width="1"/>`).join('')}</svg>`;
  await iap.init(
    {
      crystals_500: { grant: cr(500), icon: gem(1) },
      crystals_1800: { grant: cr(1800), icon: gem(2) },
      crystals_5000: { grant: cr(5000), icon: gem(3) },
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

  // размер области игры: окно минус безопасные зоны телефона (вырез экрана, полоска «домой»), см. #game в index.html
  const box = () => {
    const el = document.getElementById('game');
    const rc = el && el.getBoundingClientRect();
    return rc && rc.width && rc.height ? [rc.width, rc.height] : [window.innerWidth, window.innerHeight];
  };
  const r = dpr();
  const [bw0, bh0] = box();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#07031a',
    width: Math.round(bw0 * r),
    height: Math.round(bh0 * r),
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / r },
    audio: { noAudio: true },
    render: { antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__NS_DEBUG },
    input: { activePointers: 3 },
    fps: { smoothStep: !window.__NS_DEBUG },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, BgScene, MenuScene, GameScene, HudScene],
  });
  window.__game = game;
  if (window.__NS_DEBUG) window.__audio = audio;
  if (window.__NS_DEBUG) window.__ns_save = save;
  if (window.__NS_DEBUG) window.__sdk = sdk;

  // подгонка размера под окно. Окно можно перетащить на другой монитор или изменить размер встроенного окна
  // (VK, браузер), при этом события resize приходят не всегда или раньше, чем окно успело измениться,
  // поэтому, кроме событий, раз в секунду сверяем размер и при расхождении подгоняем.
  let rt = null;
  const fit = () => {
    const rr = dpr();
    const [bw, bh] = box();
    const w = Math.round(bw * rr);
    const h = Math.round(bh * rr);
    if (!bw || !bh) return;
    // сначала размер игры, потом масштаб: иначе после смены плотности пикселей холст остаётся растянутым
    if (game.scale.width !== w || game.scale.height !== h) game.scale.resize(w, h);
    if (game.scale.zoom !== 1 / rr) game.scale.setZoom(1 / rr);
    // размер холста на странице должен совпасть с окном
    const cv = game.canvas;
    if (cv && (Math.abs(cv.getBoundingClientRect().width - bw) > 1 || Math.abs(cv.getBoundingClientRect().height - bh) > 1)) game.scale.refresh();
  };
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(fit, 60);
    // после перетаскивания между мониторами размеры устанавливаются с задержкой
    setTimeout(fit, 400);
    setTimeout(fit, 1200);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  try {
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(document.documentElement);
  } catch (e) {}
  // смена плотности пикселей (другой монитор)
  const watchDpr = () => {
    try {
      const mq = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
      const h = () => {
        onResize();
        watchDpr();
      };
      mq.addEventListener ? mq.addEventListener('change', h, { once: true }) : mq.addListener(h);
    } catch (e) {}
  };
  watchDpr();
  setInterval(fit, 1000);

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
