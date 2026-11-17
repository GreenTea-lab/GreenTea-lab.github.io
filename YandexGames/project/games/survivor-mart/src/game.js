// Игра: рендер, меню, утренний планшет, день торговли, ночь обороны, итоги, реклама и покупки
import * as THREE from 'three';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { UI } from './ui.js';
import { IC } from './icons.js';
import { iap } from './iap.js';
import { t, LANG } from './i18n.js';
import { World, perks, wageOf, H0, SLEEP_K } from './world.js';
import { View } from './view.js';
import { Bot } from './bot.js';
import { COIN_PACKS, ROLES, WAGE, NAMES_RU, NAMES_EN, GOOD_IDS, GOODS, isHorde, isBoss, BUILD } from './data.js';
import * as DATA from './data.js';
import { galleryRender } from './gallery.js';
import { makeCustomer, makeZombie, animPerson, animZombie } from './models.js';
import { initThumbs } from './thumbs.js';

const DBG = () => window.__SM_DEBUG || {};

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
    if (window.__SM_DEBUG) Object.assign(window, { __DATA: DATA, __gallery: (sp, v) => galleryRender(this.renderer, sp, v) });
    await save.load();
    const s = save.data;
    if (s.noAds) sdk.noAds = true;
    this.quality = this.pickQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = this.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    initThumbs(this.renderer);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.3, 260);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    input.init();
    this.ui = new UI(this, uiRoot);
    await iap.init(
      {
        coins_1000: { icon: IC.bat, grant: () => this.addBat(COIN_PACKS.coins_1000) },
        coins_3500: { icon: IC.bat, grant: () => this.addBat(COIN_PACKS.coins_3500) },
        coins_10000: { icon: IC.bat, grant: () => this.addBat(COIN_PACKS.coins_10000) },
        disable_ads: {
          icon: IC.ad,
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
    this.buildMenuScene();
    this.state = 'menu';
    this.ui.menu();
    audio.setMood('menu');
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
    if (this.state === 'menu') this.buildMenuScene(true);
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

  addBat(n) {
    save.data.bat += n;
    save.write();
    this.ui && this.ui.refresh();
  }

  // ---------- меню: лавка на закате, продавец машет у двери ----------
  buildMenuScene(force = false) {
    if (this.menu && !force && this.menu.q === this.quality) return;
    if (this.menu) this.menu.view.dispose();
    const w = new World({ phase: 'day', hour: 18.6 });
    w.custT = 1e9;
    w.dayZ = [];
    w.staff = [];
    const v = new View(this, w);
    w.P.x = -1.6;
    w.P.z = -1.2;
    w.P.dir = 0.2;
    // пара покупателей и зомби-соседи
    const deco = [];
    const c1 = makeCustomer(11);
    c1.position.set(1.4, 0, -0.6);
    c1.rotation.y = -0.6;
    v.scene.add(c1);
    deco.push({ o: c1, kind: 'p', seed: 1 });
    const c2 = makeCustomer(23);
    c2.position.set(2.5, 0, 0.2);
    c2.rotation.y = -1.2;
    v.scene.add(c2);
    deco.push({ o: c2, kind: 'p', seed: 2 });
    const z1 = makeZombie('walker', 5);
    z1.position.set(-6.2, 0, 3.4);
    z1.rotation.y = 0.9;
    v.scene.add(z1);
    deco.push({ o: z1, kind: 'z', seed: 3 });
    const z2 = makeZombie('brute', 9);
    z2.position.set(7.4, 0, 4.4);
    z2.rotation.y = -1.0;
    v.scene.add(z2);
    deco.push({ o: z2, kind: 'z', seed: 4 });
    for (const sh of w.shelves) if (!sh.type) Object.assign(sh, { type: 'can', n: 0 });
    this.menu = { w, view: v, q: this.quality, deco, a: 0 };
  }

  menuFrame(dt) {
    const M = this.menu;
    if (!M) return;
    const v = M.view,
      w = M.w;
    M.a += dt * 0.07;
    v.update(dt);
    animPerson(v.hero, v.t, 0, { wave: true });
    for (const d of M.deco) {
      if (d.kind === 'p') animPerson(d.o, v.t + d.seed, 0, { seed: d.seed });
      else {
        animZombie(d.o, v.t, true, { seed: d.seed });
        d.o.position.x += Math.sin(v.t * 0.4 + d.seed) * dt * 0.3;
      }
    }
    const cam = this.camera;
    const portrait = cam.aspect < 1;
    const R0 = portrait ? 19 : 13.5;
    const ang = Math.sin(M.a) * 0.35;
    cam.position.set(Math.sin(ang) * R0, portrait ? 8.5 : 5.6, 2.5 + Math.cos(ang) * R0);
    cam.lookAt(0, portrait ? 2.6 : 2.4, -2.5);
    this.renderer.render(v.scene, cam);
  }

  // ---------- новый день ----------
  play() {
    const s = save.data;
    if (s.cur && s.cur.day === s.day && s.prepDay === s.day) {
      this.startWorld(s.cur.phase, s.cur.t);
      return;
    }
    this.morning();
  }

  // утро: зарплата, кандидаты, лечение
  prepDay() {
    const s = save.data;
    if (s.prepDay === s.day) return;
    s.prepDay = s.day;
    const pk = perks(s.skills);
    for (const st of s.staff) st.hurt = st.hurtDay === s.day - 1 ? 1 : 0;
    // зарплата по порядку найма
    let paid = 0;
    for (const st of s.staff) {
      const w = wageOf(st, pk);
      if (s.bat >= w) {
        s.bat -= w;
        paid += w;
        st.unpaid = false;
      } else st.unpaid = true;
    }
    s.paidToday = paid;
    // кандидаты на работу
    const names = LANG === 'en' ? NAMES_EN : NAMES_RU;
    const used = new Set(s.staff.map((x) => x.name));
    s.cand = [];
    const roles = [...ROLES].sort(() => Math.random() - 0.5);
    if (s.day <= 2 && !s.staff.length) roles.unshift('scav');
    for (let k = 0; k < 3; k++) {
      let nm = names[(Math.random() * names.length) | 0];
      for (let q = 0; q < 10 && used.has(nm); q++) nm = names[(Math.random() * names.length) | 0];
      used.add(nm);
      let lvl = 1;
      if (Math.random() < Math.min(0.5, s.day * 0.04)) lvl++;
      if (s.day > 8 && Math.random() < 0.3) lvl++;
      s.cand.push({ id: s.nextId++, name: nm, role: roles[k % roles.length], lvl: Math.min(3, lvl), look: (Math.random() * 1e6) | 0, hurt: 0, loc: null });
    }
    s.cur = null;
    save.write();
  }

  morning() {
    this.prepDay();
    this.cleanupWorld();
    this.w = new World({ phase: 'day', hour: H0 });
    this.view = new View(this, this.w);
    this.view.camera(this.camera, 0, true);
    this.state = 'board';
    this.paused = false;
    sdk.gameplay(false);
    audio.setMood('morning');
    this.ui.board.open('morning');
  }

  openShop() {
    this.startWorld('day', H0);
  }

  startWorld(phase, hour) {
    this.cleanupWorld();
    const dbg = DBG();
    this.w = new World({ phase, hour });
    this.view = new View(this, this.w);
    this.bot = dbg.bot ? new Bot(this.w) : null;
    this.view.camera(this.camera, 0, true);
    this.state = 'play';
    this.paused = false;
    this.ui.hud();
    if (phase === 'day') {
      audio.setMood(hour >= 18 ? 'evening' : 'day');
      if (hour <= H0 + 0.01) this.ui.banner(t('dayN', { n: this.w.day }), true, t('openSub'));
    }
    this.w.persist(false);
    sdk.gameplay(true);
  }

  cleanupWorld() {
    if (this.view) this.view.dispose();
    this.view = null;
    this.w = null;
  }

  toMenu() {
    if (this.w && !this.w.finished) this.w.persist();
    this.cleanupWorld();
    this.state = 'menu';
    this.paused = false;
    sdk.gameplay(false);
    audio.setMood('menu');
    this.buildMenuScene(true);
    this.ui.menu();
  }

  pause(on) {
    if (this.state !== 'play') return;
    this.paused = on;
    sdk.gameplay(!on);
    input.clear();
  }

  resumeFromBoard() {
    this.ui.hud();
    this.pause(false);
  }

  // правки с планшета во время дня
  onWeapon() {
    if (!this.w) return;
    this.w.setWeapon(save.data.weapon);
    this.view && this.view.setWeapon(save.data.weapon);
  }
  onSkill() {
    if (this.w) this.w.applySkills();
  }
  refreshStaff() {
    if (this.w) this.w.syncStaff();
  }
  onBuilt(id) {
    if (this.w) this.w.applyBuild();
    if (id === 'radio' && save.data.build.radio >= BUILD.radio.max && !save.data.ending) {
      save.data.ending = 1;
      save.data.bat += 1000;
      save.data.earned += 1000;
      save.write();
      sdk.submitScore(save.data.earned);
      audio.play('win');
      this.ui.ending(() => this.ui.board.render());
    }
  }

  crateLoot() {
    const s = save.data;
    const got = {};
    const pool = GOOD_IDS.filter((id) => GOODS[id].day <= s.day + 1);
    const n = 6 + ((Math.random() * 5) | 0);
    for (let k = 0; k < n; k++) {
      const id = pool[(Math.random() * pool.length) | 0];
      got[id] = (got[id] || 0) + 1;
    }
    got.wood = 2;
    for (const [k, q] of Object.entries(got)) s.stock[k] += q;
    return got;
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
    if (!this.w || !this.view) return;
    const w = this.w,
      v = this.view;
    if (this.state === 'board' || this.state === 'summary') {
      v.update(this.state === 'summary' ? dt * 0.3 : 0);
      this.boardCam(dt);
      this.renderer.render(v.scene, this.camera);
      return;
    }
    if (this.state !== 'play') return;
    const dbg = DBG();
    if (!this.paused && !w.finished) {
      // во сне ночь пролетает быстрее
      const sub = (dbg.sub || 1) * (w.sleeping ? SLEEP_K : 1);
      for (let k = 0; k < sub; k++) {
        let inp;
        if (this.bot) inp = this.bot.input(dt);
        else {
          const m = input.move();
          inp = { mx: m.x, mz: m.z, act: k === 0 && input.act(), heal: k === 0 && input.heal() };
        }
        if (dbg.god) w.P.hurtT = 1;
        w.step(dt, inp);
        this.handleFx();
        if (w.finished) break;
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
    if (w.finished && this.state === 'play') {
      this.state = 'summary';
      setTimeout(() => this.onDawn(), 1200);
    }
  }

  boardCam(dt) {
    const cam = this.camera;
    const portrait = cam.aspect < 1;
    this._bc = (this._bc || 0) + dt * 0.05;
    const a = Math.sin(this._bc) * 0.25;
    const R0 = portrait ? 24 : 18;
    cam.position.set(Math.sin(a) * R0, portrait ? 17 : 12, 6 + Math.cos(a) * R0);
    cam.lookAt(0, 0, -3);
  }

  handleFx() {
    const w = this.w;
    for (const e of w.fx) {
      this.view.onFx(e);
      this.ui.onFx(e, w);
      switch (e.t) {
        case 'night':
          audio.play(e.horde ? 'horn' : 'night');
          audio.setMood(e.boss ? 'boss' : e.horde ? 'horde' : 'night');
          break;
        case 'dusk':
          audio.play('dusk');
          audio.setMood('evening');
          break;
        case 'closing':
          audio.play('bell');
          break;
        case 'dawn':
          audio.play('rooster');
          break;
        case 'wave':
          if (e.n > 1) audio.play('horn');
          break;
        case 'sleep':
          audio.play('sleep');
          audio.setMood('morning');
          break;
        case 'wake':
          audio.play('wake');
          audio.setMood(isBoss(w.day) ? 'boss' : isHorde(w.day) ? 'horde' : 'night');
          break;
        case 'ui':
        case 'need':
          break;
        default:
          audio.play(e.t, e);
      }
    }
    w.fx.length = 0;
  }

  // ---------- рассвет ----------
  onDawn() {
    const w = this.w;
    if (!w) return;
    sdk.gameplay(false);
    audio.setMood('morning');
    this.ui.set('', 'summary');
    this.ui.summary(w, () => this.nextDay());
  }

  nextDay() {
    const s = save.data;
    s.day++;
    s.stats.days++;
    s.cur = null;
    for (const st of s.staff) if (st.hurt && st.hurtDay === undefined) st.hurtDay = s.day - 1;
    save.write();
    sdk.submitScore(s.earned);
    this.adBreak(() => this.morning());
  }

  // полноэкранная реклама в логической паузе, не чаще раза в минуту
  adBreak(then) {
    if (Date.now() - this.lastAd < 60000 || save.data.noAds) return then();
    this.lastAd = Date.now();
    audio.suspend('ad');
    sdk.showInterstitial(() => {
      audio.resume('ad');
      then();
    });
  }

  rewarded(onReward, onDone) {
    audio.suspend('ad');
    sdk.showRewarded(onReward, (ok) => {
      audio.resume('ad');
      this.lastAd = Date.now();
      onDone && onDone(ok);
    });
  }
}
