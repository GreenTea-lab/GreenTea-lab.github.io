// Игра: рендер, смена экранов, уровень, ввод, события фермы → звук и подсказки, сохранения, реклама, покупки
import * as THREE from 'three';
import { Farm } from './sim.js';
import { Bot } from './bot.js';
import { FarmView } from './view.js';
import { makeLayout } from './layout.js';
import { LEVELS, ANIMALS, BUILDINGS, MEDAL_STARS, medalOf, UPGRADES, BUILDING_ORDER } from './data.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { iap } from './iap.js';
import { audio } from './audio.js';
import { UI } from './ui.js';
import { initThumbs } from './thumbs.js';
import { t } from './i18n.js';
import { SHOP_IC } from './icons.js';
import { Tutor } from './tutor.js';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const seasonOf = (n) => Math.min(3, Math.floor((n - 1) / 12));
const DEBUG = () => window.__BF_DEBUG || {};

export class Game {
  constructor() {
    this.state = 'menu';
    this.paused = false;
    this.farm = null;
    this.view = null;
    this.level = 1;
    this.save = save;
    this.adCoinsTaken = false;
  }

  async start(canvas, uiRoot) {
    this.canvas = canvas;
    await save.load();
    const q = save.data.settings.quality;
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    this.quality = q === 'auto' ? (mobile ? 'mid' : 'high') : q === 'low' ? 'low' : 'high';
    const r = new THREE.WebGLRenderer({ canvas, antialias: this.quality !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: !!DEBUG().shots });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : 1.5));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = this.quality !== 'low';
    r.shadowMap.type = THREE.PCFShadowMap;
    this.r = r;
    initThumbs(r);
    // покупки
    await iap.init(
      {
        coins_1000: { icon: SHOP_IC.coins_1000, grant: () => (save.data.bank += 1000) },
        coins_3500: { icon: SHOP_IC.coins_3500, grant: () => (save.data.bank += 3500) },
        coins_10000: { icon: SHOP_IC.coins_10000, grant: () => (save.data.bank += 10000) },
        disable_ads: { permanent: true, icon: SHOP_IC.disable_ads, grant: () => ((save.data.noAds = true), (sdk.noAds = true)) },
      },
      () => save.flush(),
    );
    sdk.noAds = !!save.data.noAds;
    iap.onChange(() => this.ui && this.ui.refresh());
    this.ui = new UI(this, uiRoot);
    this.tutor = new Tutor(this);
    this.debugOff = !!DEBUG().bot;
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.showMenu();
    this.resize();
    this.last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!DEBUG().manual) this.frame(dt);
    };
    requestAnimationFrame(loop);
  }

  portrait() {
    return window.innerHeight > window.innerWidth * 1.05;
  }

  resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    this.r.setSize(w, h, false);
    if (this.view) this.view.resize(w, h, this.ui.insets(this.state, this.lay));
  }

  // ---------- меню: живая ферма на фоне ----------
  showMenu() {
    if (this.tutor) this.tutor.stop();
    this.state = 'menu';
    this.paused = false;
    sdk.gameplay(false);
    audio.setIntensity(0);
    audio.setMood('menu');
    const lay = makeLayout(this.portrait());
    const L = {
      n: 0,
      goals: { cheese: 1e9 },
      gold: 1e9,
      silver: 1e9,
      coins: 1e9,
      start: { goose: 4, sheep: 2, cow: 1, cat: 1, dog: 1 },
      pre: BUILDING_ORDER,
      animals: ['goose', 'sheep', 'cow', 'cat', 'dog'],
      buildings: BUILDING_ORDER,
      bears: null,
      isAnimalGoal: () => false,
    };
    this.setFarm(new Farm(L, lay, { well: 5, store: 5, truck: 5 }, 3), lay);
    this.demoBot = new Bot(this.farm, { aps: 2 });
    // немного травы для красоты
    for (let i = 0; i < 14; i++) {
      const p = this.farm.randField(1);
      this.farm.plant(p.x, p.z);
    }
    this.farm.well.water = this.farm.wellCap();
    this.ui.showMenu();
    this.resize();
  }

  setFarm(farm, lay) {
    if (this.view) this.view.dispose();
    this.farm = farm;
    this.lay = lay;
    this.view = new FarmView(this.r, farm, lay, { quality: this.quality });
  }

  // ---------- уровень ----------
  startLevel(n) {
    this.level = n;
    this.demoBot = null;
    const L = LEVELS[n - 1];
    const lay = makeLayout(this.portrait());
    this.setFarm(new Farm(L, lay, { ...save.data.up }, (Math.random() * 1e9) | 0), lay);
    this.state = 'play';
    this.paused = false;
    this.adCoinsTaken = false;
    this.goalsDone = new Set();
    this.lastHungry = 0;
    save.data.plays++;
    sdk.gameplay(true);
    audio.setMood(SEASONS[seasonOf(n)]);
    audio.setIntensity(1);
    this.ui.showHud();
    this.resize();
    this.tutor.start(n);
    if (DEBUG().bot) this.debugBot = new Bot(this.farm, { aps: DEBUG().aps || 2 });
  }

  pause(on) {
    if (this.state !== 'play') return;
    this.paused = on;
    sdk.gameplay(!on);
  }

  restart() {
    this.startLevel(this.level);
  }

  // ---------- ввод ----------
  bindInput() {
    this.canvas.addEventListener('pointerdown', (e) => {
      audio.unlock();
      if (this.state !== 'play' || this.paused || !this.view || this.farm.finished) return;
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      const hit = this.view.pick(e.clientX - r.left, e.clientY - r.top);
      if (hit) this.act(hit, e.clientX, e.clientY);
    });
  }

  act(hit, sx, sy) {
    const f = this.farm;
    const ui = this.ui;
    switch (hit.type) {
      case 'item': {
        const r = f.collect(hit.id);
        if (r === 'ok') audio.play('collect', this.combo = (this.combo || 0) + 1);
        else if (r === 'full') {
          audio.play('deny');
          ui.toast(t('storeFull'));
          ui.tip('store', 't7', true);
        }
        break;
      }
      case 'bear': {
        const r = f.hitBear(hit.id);
        if (r === 'full') {
          audio.play('deny');
          ui.toast(t('storeFull'));
        } else if (r === 'store') audio.play('collect');
        break;
      }
      case 'well': {
        const r = f.refillWell();
        if (r === 'ok') audio.play('refill');
        else if (r === 'money') {
          audio.play('deny');
          ui.toast(t('needMoney'));
        } else audio.play('click');
        break;
      }
      case 'store':
      case 'truck':
        audio.play('click');
        ui.openBarn();
        break;
      case 'slot': {
        const s = f.slots[hit.i];
        if (!s.built) {
          ui.openBuild(hit.i);
          break;
        }
        const r = f.useSlot(hit.i);
        if (r === 'ok') audio.play('load');
        else if (r === 'empty') {
          audio.play('deny');
          ui.toast(t('needInput', { n: t('i_' + BUILDINGS[s.kind].in) }), BUILDINGS[s.kind].in);
        } else if (r === 'busy') {
          audio.play('deny');
          ui.toast(t('busy'));
        }
        break;
      }
      case 'ground': {
        if (!hit.inField) return;
        const r = f.plant(hit.x, hit.z);
        if (r === 'ok') audio.play('plant');
        else if (r === 'nowater') {
          audio.play('nowater');
          ui.toast(t('wellEmpty'));
          ui.tip('well', 'wellEmpty', true);
        } else if (r === 'refill') {
          audio.play('deny');
          ui.toast(t('wellRefill'));
        }
        break;
      }
    }
  }

  buyAnimal(kind) {
    if (this.state !== 'play' || this.paused) return;
    if (this.farm.buyAnimal(kind)) audio.play('buy');
    else {
      audio.play('deny');
      this.ui.toast(t('needMoney'));
    }
  }

  // перемотка уровня без отрисовки (для отладки и промо)
  step(dt) {
    const f = this.farm;
    if (!f || this.state !== 'play' || f.finished) return;
    if (this.debugBot) this.debugBot.tick(dt);
    f.update(dt);
    this.handleEvents(true);
  }

  // ---------- кадр ----------
  frame(dt) {
    const f = this.farm;
    if (!f) return;
    if (this.state === 'menu') {
      if (this.demoBot) this.demoBot.tick(dt);
      f.update(dt);
      // в меню ферма бесконечная
      if (f.coins < 1e8) f.coins = 1e9;
    } else if (this.state === 'play' && !this.paused && !this.ui.modalOpen) {
      const sub = DEBUG().sub || 1;
      for (let i = 0; i < sub; i++) {
        if (this.debugBot) this.debugBot.tick(dt);
        f.update(dt);
        if (i < sub - 1) this.handleEvents(true);
      }
    }
    this.view.update(this.state === 'play' && (this.paused || this.ui.modalOpen) ? 0 : dt);
    if (this.state === 'play') {
      this.handleEvents(false);
      this.tutor.update();
      this.ui.updateHud(dt);
    } else f.events.length = 0;
    this.r.render(this.view.scene, this.view.cam);
  }

  handleEvents(silent) {
    const f = this.farm;
    const ui = this.ui;
    for (const e of f.events) {
      if (this.state === 'play') this.tutor.onEvent(e);
      if (silent && e.t !== 'win') continue;
      switch (e.t) {
        case 'lay':
          audio.play('lay');
          if (Math.random() < 0.25) audio.play(e.kind);
          break;
        case 'land':
          audio.play('land');
          setTimeout(() => audio.play(e.kind), 250);
          break;
        case 'collect':
          ui.goalPulse(e.item);
          break;
        case 'made':
          audio.play('made');
          break;
        case 'build':
          audio.play('build');
          break;
        case 'wellDone':
          audio.play('water');
          break;
        case 'wellEmpty':
          break;
        case 'truckGo':
          audio.play('truck');
          break;
        case 'sold':
          audio.play('sold');
          ui.float(this.lay.road.exitX - 4, 1.5, this.lay.road.z, '+' + e.value, 'coin');
          break;
        case 'spoil':
          audio.play('spoil');
          break;
        case 'crush':
          audio.play('spoil');
          break;
        case 'hungry':
          if (f.t - this.lastHungry > 6) {
            this.lastHungry = f.t;
            audio.play('hungry');
          }
          break;
        case 'starved':
          audio.play('starved');
          ui.toast(t('starved'));
          break;
        case 'bearDrop':
          audio.play('bear');
          break;
        case 'bearLand':
          audio.play('land');
          break;
        case 'cageHit':
          audio.play('cageHit', e.n);
          break;
        case 'caged':
          audio.play('caged');
          break;
        case 'dogCatch':
          audio.play('dog');
          break;
        case 'bearOut':
          audio.play('bear');
          ui.toast(t('bearOut'));
          break;
        case 'bearHit':
          audio.play(e.kind);
          break;
        case 'bearStore':
          audio.play('collect');
          break;
        case 'buy':
          break;
        case 'storeFull':
          break;
        case 'win':
          this.win();
          break;
      }
    }
    // цели: звук при выполнении каждой
    for (const k of Object.keys(f.L.goals)) {
      if (!this.goalsDone.has(k) && f.goalProgress(k) >= f.L.goals[k]) {
        this.goalsDone.add(k);
        if (!f.finished) audio.play('goal');
      } else if (this.goalsDone.has(k) && f.goalProgress(k) < f.L.goals[k]) this.goalsDone.delete(k);
    }
    f.events.length = 0;
  }

  // ---------- победа ----------
  win() {
    this.tutor.stop();
    const f = this.farm;
    const n = this.level;
    const L = LEVELS[n - 1];
    const tm = f.finishT;
    const medal = medalOf(L, tm);
    const prev = save.data.levels[n];
    const prevStars = prev ? MEDAL_STARS[prev.medal] : 0;
    const gained = Math.max(0, MEDAL_STARS[medal] - prevStars);
    const better = !prev || MEDAL_STARS[medal] > prevStars;
    save.data.levels[n] = { medal: better ? medal : prev.medal, best: Math.min(prev ? prev.best : 1e9, tm) };
    // часть оставшихся монет — в копилку
    const toBank = Math.floor((Math.max(0, f.coins) * 0.1) / 10) * 10;
    save.data.bank += toBank;
    save.write();
    sdk.submitScore(save.starsEarned());
    sdk.gameplay(false);
    audio.play('win');
    this.lastWin = { n, tm, medal, gained, toBank, newBest: !prev || tm < prev.best, doubled: false };
    setTimeout(() => this.ui.showWin(this.lastWin), 900);
  }

  // реклама между уровнями
  afterLevel(next) {
    sdk.showInterstitial(() => next());
  }

  // копилка ×2 за рекламу
  doubleBank() {
    const w = this.lastWin;
    if (!w || w.doubled || !w.toBank) return;
    sdk.showRewarded(
      () => {
        w.doubled = true;
        save.data.bank += w.toBank;
        save.write();
        audio.play('coin');
      },
      () => this.ui.refresh(),
    );
  }

  // монеты за рекламу прямо в уровне (раз за уровень)
  adCoinsAmount() {
    const L = LEVELS[this.level - 1];
    const v = Math.max(150, Math.round((L.coins * 0.3) / 50) * 50);
    return Math.min(v, 5000);
  }
  adCoins() {
    if (this.adCoinsTaken || this.state !== 'play') return;
    sdk.showRewarded(
      () => {
        this.adCoinsTaken = true;
        this.farm.coins += this.adCoinsAmount();
        audio.play('coin');
      },
      () => this.ui.refresh(),
    );
  }

  takeBank(n) {
    n = Math.min(n, save.data.bank);
    if (n <= 0 || this.state !== 'play') return;
    save.data.bank -= n;
    this.farm.coins += n;
    save.write();
    audio.play('coin');
  }

  buyUpgrade(k) {
    const c = save.upCost(k);
    if (save.starsFree() < c) return false;
    save.data.spent += c;
    save.data.up[k]++;
    save.write();
    audio.play('upgrade');
    return true;
  }
}
