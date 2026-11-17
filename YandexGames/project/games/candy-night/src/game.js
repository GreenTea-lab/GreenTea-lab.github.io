// Игра: рендер, сцена меню, запуск уровней, камера, управление, награды и прогресс
import * as THREE from 'three';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { UI } from './ui.js';
import { iap } from './iap.js';
import { t } from './i18n.js';
import { World } from './world.js';
import { View } from './view.js';
import { Bot } from './bot.js';
import { LEVELS, STAR_COINS, COIN_PACKS, PER_WORLD } from './data.js';
import { makeKid, animKid, makeGhost, makeBat } from './models.js';
import { CS } from './map.js';
import { initThumbs } from './thumbs.js';

const DBG = () => window.__CN_DEBUG || {};

export class Game {
  constructor() {
    this.save = save;
    this.state = 'loading';
    this.paused = false;
    this.w = null;
    this.view = null;
    this.lastAd = Date.now();
  }

  async start(canvas, uiRoot) {
    await save.load();
    const s = save.data;
    if (s.noAds) sdk.noAds = true;
    this.quality = this.pickQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = this.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    initThumbs(this.renderer);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.3, 220);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    input.init();
    this.ui = new UI(this, uiRoot);
    this.buildMenuScene();
    await iap.init(
      {
        coins_1000: { grant: () => this.addCoins(COIN_PACKS.coins_1000) },
        coins_3500: { grant: () => this.addCoins(COIN_PACKS.coins_3500) },
        coins_10000: { grant: () => this.addCoins(COIN_PACKS.coins_10000) },
        disable_ads: {
          permanent: true,
          grant: () => {
            save.data.noAds = true;
            sdk.noAds = true;
          },
        },
      },
      () => save.flush()
    );
    iap.onChange((id, restoring) => {
      if (!restoring) this.ui.toast(t('iapThanks'));
      this.ui.refresh();
    });
    this.ui.menu();
    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  pickQuality() {
    const q = save.data.settings.quality;
    const dbg = DBG().quality;
    if (dbg) return dbg;
    if (q && q !== 'auto') return q;
    const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    return mob ? 'mid' : 'high';
  }

  setQuality(q) {
    save.data.settings.quality = q;
    save.write();
    this.quality = this.pickQuality();
    this.renderer.shadowMap.enabled = this.quality !== 'low';
    this.resize();
    if (this.state === 'menu') this.buildMenuScene();
  }

  resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    this.w_ = w;
    this.h_ = h;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : this.quality === 'mid' ? 1.5 : 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  addCoins(n) {
    save.data.coins += n;
    save.write();
    this.ui && this.ui.refresh();
  }

  // ---------- сцена меню: двор с котлом в мире, до которого дошёл игрок ----------
  menuWorldIdx() {
    let last = 0;
    for (let i = 0; i < LEVELS.length; i++) if (save.open(i)) last = i;
    return Math.floor(last / PER_WORLD) * PER_WORLD;
  }

  buildMenuScene(force = false) {
    const wi = this.menuWorldIdx();
    const costume = save.data.costume;
    if (!force && this.menu && this.menu.wi === wi && this.menu.costume === costume && this.menu.q === this.quality) return;
    if (this.menu) this.menu.view.dispose();
    const w = new World(wi === 0 ? 1 : wi, { seed: 3 });
    // в меню без врагов: только декоративные
    w.enemies = [];
    w.boss = null;
    const v = new View(this, w, costume);
    const P = w.p;
    P.x = w.cauldron.x + 1.4;
    P.z = w.cauldron.z + 2.3;
    P.dir = -0.5;
    P.bag = w.st.bag * 0.7;
    // хоровод призраков и летучие мыши вокруг котла
    const deco = [];
    for (let k = 0; k < 3; k++) {
      const g = makeGhost({ party: k === 1 });
      g.scale.setScalar(0.8);
      v.scene.add(g);
      deco.push({ o: g, a: (k / 3) * Math.PI * 2, r: 4.2, y: 0.4, sp: 0.35 });
    }
    for (let k = 0; k < 4; k++) {
      const b = makeBat();
      v.scene.add(b);
      deco.push({ o: b, a: k * 1.6, r: 6 + k, y: 3.5 + k * 0.6, sp: 0.6 + k * 0.1, bat: true });
    }
    this.menu = { w, view: v, wi, costume, q: this.quality, deco, a: 0 };
  }

  menuFrame(dt) {
    const M = this.menu;
    if (!M) return;
    const v = M.view,
      w = M.w;
    M.a += dt * 0.08;
    const t = v.t + dt;
    v.update(dt);
    // герой машет ведёрком у котла
    animKid(v.kid, t, 0, 0.7);
    v.kid.userData.arms[1].rotation.x = -0.6 + Math.sin(t * 3) * 0.25;
    for (const d of M.deco) {
      d.a += dt * d.sp;
      const x = w.cauldron.x + Math.cos(d.a) * d.r,
        z = w.cauldron.z + Math.sin(d.a) * d.r;
      d.o.position.set(x, d.y + Math.sin(t * 2 + d.a) * 0.25, z);
      d.o.rotation.y = -d.a;
      if (d.bat) {
        const f = Math.sin(t * 20 + d.a) * 0.7;
        d.o.userData.wings[0].rotation.z = f;
        d.o.userData.wings[1].rotation.z = -f;
      }
    }
    const cam = this.camera;
    const portrait = cam.aspect < 1;
    const R0 = portrait ? 17 : 11.5;
    const ang = 0.35 + Math.sin(M.a) * 0.35;
    const cx = w.cauldron.x,
      cz = w.cauldron.z;
    cam.position.set(cx + Math.sin(ang) * R0, portrait ? 8.5 : 5.2, cz + Math.cos(ang) * R0);
    cam.lookAt(cx, portrait ? 2.2 : 2.2, cz - 2);
    v.moon.position.set(cx - 7, 22, cz + 4);
    v.moon.target.position.set(cx, 0, cz);
    this.renderer.render(v.scene, cam);
  }

  // ---------- уровни ----------
  startLevel(i) {
    this.cleanupLevel();
    const s = save.data;
    const dbg = DBG();
    this.levelIdx = i;
    this.w = new World(i, { up: s.up, seed: dbg.seed || Math.floor(Math.random() * 1e6) });
    this.view = new View(this, this.w, s.costume);
    this.bot = dbg.bot ? new Bot(this.w, dbg.botSkill ?? 1) : null;
    this.state = 'play';
    this.paused = false;
    this.countdown = dbg.fast ? 0 : 1.6;
    this.extraUsed = false;
    this.endShown = false;
    this.lastTick = 99;
    this.view.camera(this.camera, 0, true);
    audio.setMood(this.w.lv.boss ? 'boss' : this.w.lv.world);
    audio.setIntensity(1);
    if (this.w.lv.boss) audio.setMood('boss');
    s.plays++;
    save.write(false);
    this.ui.hud();
    sdk.gameplay(true);
  }

  cleanupLevel() {
    if (this.view) this.view.dispose();
    this.view = null;
    this.w = null;
  }

  toMenu() {
    this.cleanupLevel();
    this.state = 'menu';
    this.paused = false;
    sdk.gameplay(false);
    audio.setIntensity(0);
    audio.setMood('menu');
    this.buildMenuScene();
  }

  pause(on) {
    if (this.state !== 'play') return;
    this.paused = on;
    sdk.gameplay(!on);
    input.clear();
  }

  // ---------- кадр ----------
  frame() {
    const now = performance.now();
    let dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.state === 'menu' || this.state === 'loading') {
      this.menuFrame(dt);
      return;
    }
    if (this.state !== 'play' || !this.w) return;
    const w = this.w,
      v = this.view;
    const dbg = DBG();
    if (!this.paused && !w.finished) {
      if (this.countdown > 0) {
        this.countdown -= dt;
        if (this.countdown <= 0) {
          audio.play('go');
          this.ui.banner(t('go'));
        }
      } else {
        const sub = dbg.sub || 1;
        for (let k = 0; k < sub; k++) {
          let inp;
          if (this.bot) inp = this.bot.input(dt);
          else {
            const m = input.move();
            inp = { mx: m.x, mz: m.z, dash: input.dash() };
          }
          if (dbg.god) w.p.hurtT = 1;
          const wasPower = w.power;
          w.step(dt, inp);
          if (wasPower && !w.power) audio.play('powerEnd');
          this.handleFx();
          if (w.finished) break;
        }
        const left = w.time - w.t;
        if (left <= 10 && Math.ceil(left) !== this.lastTick && !w.lv.boss) {
          this.lastTick = Math.ceil(left);
          if (left > 0) audio.play('tick');
        }
      }
    }
    input.endFrame();
    if (input.pausePressed) {
      input.pausePressed = false;
      if (!w.finished && this.ui.screen === 'hud' && !this.ui.modalOpen) this.ui.pause();
    }
    v.update(this.paused ? 0 : dt);
    v.camera(this.camera, dt);
    this.renderer.render(v.scene, this.camera);
    this.ui.hudUpdate(w, v);
    if (w.finished && !this.endShown) {
      this.endShown = true;
      setTimeout(() => this.onEnd(), 1100);
    }
  }

  handleFx() {
    const w = this.w;
    for (const e of w.fx) {
      this.view.onFx(e);
      this.ui.onFx(e, w);
      switch (e.t) {
        case 'pick':
          this.pickCombo = (this.pickT && w.t - this.pickT < 0.5 ? this.pickCombo + 1 : 0) || 0;
          this.pickT = w.t;
          audio.play('pick', this.pickCombo);
          break;
        case 'bank':
          audio.play('bank');
          if (e.bonus) audio.play('bonus');
          break;
        case 'catch':
          audio.play('catch', w.p.combo);
          break;
        case 'thud':
          audio.play('thud', e.big ? 1 : 0);
          break;
        case 'midnight':
          audio.play('midnight');
          audio.setMood('midnight');
          break;
        case 'bossDown':
          audio.play('bossDown');
          break;
        case 'win':
        case 'lose':
        case 'relight':
        case 'gain':
          break;
        default:
          audio.play(e.t);
      }
    }
    w.fx.length = 0;
  }

  // ---------- итоги ----------
  onEnd() {
    const w = this.w;
    if (!w) return;
    sdk.gameplay(false);
    // не хватило — можно докупить время за рекламу (один раз)
    if (!w.won && !this.extraUsed) {
      this.ui.lose(w);
      audio.play('lose');
      return;
    }
    this.finishLevel();
  }

  // продолжить: +20 секунд
  addTime() {
    const w = this.w;
    this.extraUsed = true;
    w.time = w.t + 20;
    w.finished = false;
    w.won = false;
    this.endShown = false;
    this.ui.hud();
    sdk.gameplay(true);
  }

  finishLevel() {
    const w = this.w;
    const i = this.levelIdx;
    const s = save.data;
    const stars = w.stars();
    const prev = s.levels[i] || { stars: 0, best: 0 };
    const newStars = Math.max(0, stars - prev.stars);
    const coins = Math.round(w.banked * (w.won ? 1 : 0.5)) + newStars * STAR_COINS;
    const rec = { stars: Math.max(prev.stars, stars), best: Math.max(prev.best, w.won ? w.banked : 0) };
    const newBest = w.won && w.banked > prev.best;
    const wasOpen = save.open(i + 1);
    s.levels[i] = rec;
    s.coins += coins;
    save.write();
    if (newBest) sdk.submitScore(save.total());
    const unlocked = !wasOpen && i + 1 < LEVELS.length && save.open(i + 1);
    audio.play(w.won ? 'win' : 'lose');
    this.ui.results({ w, stars, coins, newBest, best: rec.best, unlocked, idx: i });
  }

  // полноэкранная реклама в логической паузе (между уровнями), не чаще раза в минуту
  adBreak(then) {
    if (Date.now() - this.lastAd < 60000 || save.data.noAds) return then();
    this.lastAd = Date.now();
    audio.suspend('ad');
    sdk.showInterstitial(() => {
      audio.resume('ad');
      then();
    });
  }

  // реклама за награду: на время ролика звук выключен
  rewarded(onReward, onDone) {
    audio.suspend('ad');
    sdk.showRewarded(onReward, (ok) => {
      audio.resume('ad');
      this.lastAd = Date.now();
      onDone && onDone(ok);
    });
  }
}
