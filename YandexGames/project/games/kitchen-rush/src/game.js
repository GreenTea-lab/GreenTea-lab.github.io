// Игра: рендер, сцена меню, запуск уровней, камера, управление, награды и прогресс
import * as THREE from 'three';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { UI } from './ui.js';
import { iap } from './iap.js';
import { t } from './i18n.js';
import { Kitchen } from './kitchen.js';
import { KView, CH } from './kview.js';
import { Bot } from './bot.js';
import { LEVELS, STAR_COINS, CHEFS, APRON } from './data.js';
import { makeChef, animChef, itemMesh } from './models.js';
import { B, blobShadow } from './gfx.js';
import { initThumbs } from './thumbs.js';

export const COIN_PACKS = { coins_1000: 1000, coins_3500: 3500, coins_10000: 10000 };
const COIN_RATE = 0.6;

export class Game {
  constructor() {
    this.save = save;
    this.state = 'loading';
    this.paused = false;
    this.k = null;
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    initThumbs(this.renderer);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 120);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    input.init();
    this.buildMenuScene();
    this.ui = new UI(this, uiRoot);
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
    const dbg = window.__KR_DEBUG && window.__KR_DEBUG.quality;
    if (dbg) return dbg;
    if (q && q !== 'auto') return q;
    const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    return mob ? 'mid' : 'high';
  }

  setQuality(q) {
    save.data.settings.quality = q;
    save.write();
    this.quality = this.pickQuality();
    this.resize();
    if (this.k && this.state === 'play') {
      // тени пересоздаются вместе с видом при следующем запуске уровня
    }
  }

  resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    this.w = w;
    this.h = h;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : this.quality === 'mid' ? 1.5 : 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = this.quality !== 'low';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.camFit = null;
  }

  // ---------- сцена меню: два повара на уютной кухоньке ----------
  buildMenuScene() {
    const sc = new THREE.Scene();
    sc.background = new THREE.Color('#ffcf9e');
    sc.add(new THREE.HemisphereLight(0xfff0e0, 0xa08a7a, 1.9));
    const d = new THREE.DirectionalLight(0xfff2dc, 1.6);
    d.position.set(-3, 8, 5);
    d.castShadow = true;
    d.shadow.mapSize.set(1024, 1024);
    d.shadow.camera.left = d.shadow.camera.bottom = -5;
    d.shadow.camera.right = d.shadow.camera.top = 5;
    sc.add(d);
    const b = new B();
    // пол-шахматка кругом
    for (let x = -4; x <= 4; x++)
      for (let z = -3; z <= 3; z++) {
        if (x * x + z * z > 17) continue;
        b.box(1, 0.1, 1, (x + z) & 1 ? '#fbe6cb' : '#f3d5b2', { x, y: -0.05, z });
      }
    // столы сзади
    const cnt = (x, z, body = '#f2c08e', top = '#fff4e4') => {
      b.rbox(0.98, CH - 0.06, 0.98, 0.06, body, { x, y: (CH - 0.06) / 2, z });
      b.rbox(1, 0.08, 1, 0.035, top, { x, y: CH - 0.04, z });
    };
    cnt(-1.5, -1.6);
    cnt(-0.5, -1.6, '#7b8296', '#3e4250');
    cnt(0.5, -1.6, '#7b8296', '#3e4250');
    cnt(1.5, -1.6);
    b.rbox(0.72, 0.05, 0.56, 0.03, '#d9a066', { x: 1.5, y: CH + 0.025, z: -1.6 });
    // стена с окошком
    b.box(6, 2.4, 0.3, '#ffe1c2', { y: 1.2, z: -2.3 });
    b.rbox(1.5, 1.0, 0.08, 0.05, '#ffffff', { x: 0, y: 1.75, z: -2.12 });
    b.rbox(1.3, 0.8, 0.1, 0.04, '#bfe6ff', { x: 0, y: 1.75, z: -2.1 });
    b.box(0.3, 1.0, 0.04, '#ffb38a', { x: -0.75, y: 1.75, z: -2.06 });
    b.box(0.3, 1.0, 0.04, '#ffb38a', { x: 0.75, y: 1.75, z: -2.06 });
    // горшки с растениями
    for (const [x, z] of [[-3.2, -0.6], [3.1, -0.9], [-2.6, 1.6], [2.8, 1.4]]) {
      b.cyl(0.22, 0.17, 0.35, '#e8845a', { x, y: 0.17, z });
      b.sph(0.32, '#6cc24a', { x, y: 0.6, z });
      b.sph(0.2, '#7ed957', { x: x + 0.15, y: 0.75, z: z + 0.1 });
    }
    sc.add(b.mesh());
    const pot = itemMesh({ k: 'pot', n: 3, kind: 'soup', ing: 'tomato', done: false });
    pot.position.set(-0.5, CH + 0.02, -1.6);
    sc.add(pot);
    const pan = itemMesh({ k: 'pan', item: { id: 'meat', st: 'cook' } });
    pan.position.set(0.5, CH + 0.02, -1.6);
    pan.rotation.y = Math.PI / 2;
    sc.add(pan);
    const tom = itemMesh({ k: 'ing', id: 'tomato', st: 'raw' });
    tom.position.set(1.5, CH + 0.05, -1.6);
    sc.add(tom);
    this.menuScene = sc;
    this.menuChefs = [];
    this.menuAngle = 0;
    this.showMenuChefs();
    // пар
    this.steam = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
      sc.add(m);
      this.steam.push({ m, t: i / 6 });
    }
  }

  showMenuChefs(skins) {
    skins = skins || save.data.pick;
    for (const c of this.menuChefs) {
      this.menuScene.remove(c.group);
      this.menuScene.remove(c.sh);
    }
    this.menuChefs = skins.map((s, i) => {
      const c = makeChef(s, APRON[i]);
      c.group.scale.setScalar(1.25);
      c.group.position.set(i ? 0.85 : -0.85, 0, 0.3);
      c.group.rotation.y = i ? -0.35 : 0.35;
      this.menuScene.add(c.group);
      c.sh = blobShadow(0.5, 0.25);
      c.sh.position.set(c.group.position.x, 0.01, 0.3);
      this.menuScene.add(c.sh);
      return c;
    });
  }

  // ---------- камера: вся кухня в кадре, с отступами под интерфейс ----------
  fitCamera() {
    const k = this.k;
    const cam = this.camera;
    const W = this.w,
      H = this.h;
    const touch = input.isTouch;
    const portrait = H > W * 1.05;
    const rot = portrait && k.W > k.H;
    const m = { t: portrait ? 118 : 96, b: touch ? (portrait ? 200 : 20) : 34, l: touch && !portrait ? 70 : 14, r: touch && !portrait ? 190 : 14 };
    const key = [W, H, touch, k.idx].join();
    if (this.camFit === key) return;
    this.camFit = key;
    const pitch = (portrait ? 58 : 54) * (Math.PI / 180);
    const yaw = rot ? -Math.PI / 2 : 0;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const C = new THREE.Vector3(0, 0.3, 0);
    const corners = [];
    const bd = this.view.bounds();
    for (const x of [bd.x0, bd.x1]) for (const z of [bd.z0, bd.z1]) for (const y of [0, 1.3]) corners.push(new THREE.Vector3(x, y, z));
    cam.clearViewOffset();
    cam.fov = 36;
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
    const availW = (2 * (W - m.l - m.r)) / W,
      availH = (2 * (H - m.t - m.b)) / H;
    const box = (d) => {
      cam.position.copy(C).addScaledVector(dir, d);
      cam.lookAt(C);
      cam.updateMatrixWorld();
      let x0 = 9,
        x1 = -9,
        y0 = 9,
        y1 = -9;
      for (const p of corners) {
        const v = p.clone().project(cam);
        x0 = Math.min(x0, v.x);
        x1 = Math.max(x1, v.x);
        y0 = Math.min(y0, v.y);
        y1 = Math.max(y1, v.y);
      }
      return { x0, x1, y0, y1 };
    };
    let lo = 4,
      hi = 80;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const bb = box(mid);
      if (bb.x1 - bb.x0 <= availW && bb.y1 - bb.y0 <= availH) hi = mid;
      else lo = mid;
    }
    const bb = box(hi);
    const cx = (bb.x0 + bb.x1) / 2,
      cy = (bb.y0 + bb.y1) / 2;
    const ax = -1 + (2 * m.l) / W + availW / 2,
      ay = 1 - (2 * m.t) / H - availH / 2;
    const offX = (-(ax - cx) * W) / 2,
      offY = ((ay - cy) * H) / 2;
    cam.setViewOffset(W, H, offX, offY, W, H);
    cam.updateProjectionMatrix();
    // оси движения на экране → мир
    this.right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    this.fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  }

  // ---------- кадр ----------
  frame() {
    const now = performance.now();
    let dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const dbg = window.__KR_DEBUG;
    if (this.state === 'play' && this.k) {
      if (input.pausePressed) {
        input.pausePressed = false;
        if (!this.k.finished) this.ui.pause();
      }
      this.fitCamera();
      if (!this.paused) {
        const sub = (dbg && dbg.sub) || 1;
        for (let i = 0; i < sub; i++) this.step(dt);
        this.ui.hud(this.k, this.view);
      }
      this.renderer.render(this.view.scene, this.camera);
    } else {
      this.menuFrame(dt, now);
    }
  }

  step(dt) {
    const k = this.k;
    let inp, inp2;
    const world = (r) => ({ mx: this.right.x * r.x + this.fwd.x * r.y, mz: this.right.z * r.x + this.fwd.z * r.y, pick: r.pick, act: r.act, actHeld: r.actHeld, sw: r.sw });
    if (this.bot) inp = this.bot.step(dt);
    else if (this.coop) {
      const [a, b] = input.read(true);
      inp = world(a);
      inp2 = world(b);
    } else inp = world(input.read(false));
    if (!k.started) {
      this.countT -= dt;
      if (this.countT <= 0) {
        k.started = true;
        sdk.gameplay(true);
        this.ui.count(0);
        audio.play('go');
      }
    }
    k.update(dt, inp, inp2);
    this.view.update(dt);
    this.sounds(k);
    this.ui.events(k, this.view);
    this.ui.tutorial(k);
    k.events.length = 0;
  }

  sounds(k) {
    const map = { pick: 'pick', drop: 'drop', combine: 'combine', plop: 'plop', pour: 'pour', chop: 'chop', chopped: 'chopped', wash: 'wash', washed: 'washed', cooked: 'cooked', warn: 'warn', burnt: 'burnt', fire: 'fire', extinguished: 'extinguished', serve: 'serve', order: 'order', miss: 'miss', wrong: 'wrong', deny: 'deny', trash: 'trash', switch: 'switch', tick: 'tick' };
    for (const e of k.events) {
      if (map[e.type]) audio.play(map[e.type]);
      if (e.type === 'rush') audio.setMood('boss');
      if (e.type === 'end') this.onEnd();
    }
    let sizzle = 0,
      boil = 0;
    for (const tl of k.tiles) {
      const it = tl.item;
      if (!it || tl.type !== 'stove') continue;
      if (it.k === 'pan' && it.item && it.item.st !== 'burnt') sizzle++;
      if (it.k === 'pot' && it.n > 0 && !it.burnt) boil++;
    }
    audio.loopsSet({ sizzle: sizzle * 0.7, boil: boil * 0.5, fire: (k.fireCount || 0) * 0.5, spray: k.chefs.some((c) => c.spray) });
  }

  menuFrame(dt, now) {
    const dbg = window.__KR_DEBUG;
    this.menuAngle += dt * 0.15;
    const portrait = this.h > this.w;
    const a = Math.sin(this.menuAngle) * 0.5;
    const r = portrait ? 9.5 : 7;
    const kitchenScreen = this.ui && this.ui.screen === 'kitchen';
    if (!(dbg && dbg.freeCam)) {
      this.camera.clearViewOffset();
      this.camera.fov = 40;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(Math.sin(a) * r, portrait ? 4.6 : 3.4, Math.cos(a) * r);
      this.camera.lookAt(0, portrait ? 1.6 : 0.9, 0);
      // на экране кухни повара сдвинуты: слева на широком экране, вверх на узком
      const wide = this.w / this.h >= 1.25 && this.w >= 760;
      if (kitchenScreen) {
        if (wide) this.camera.setViewOffset(this.w, this.h, Math.round(this.w * 0.22), 0, this.w, this.h);
        else this.camera.setViewOffset(this.w, this.h, 0, Math.round(this.h * 0.24), this.w, this.h);
      }
    }
    this.menuChefs.forEach((c, i) => {
      const tt = now / 1000 + i * 1.3;
      animChef(c, tt * 3, Math.sin(tt * 0.8) > 0.6 ? 1.5 : 0, false, false, 0);
      c.hands[i ? 0 : 1].position.y = 0.55 + Math.max(0, Math.sin(tt * 2.2)) * 0.25;
    });
    for (const s of this.steam) {
      s.t = (s.t + dt * 0.4) % 1;
      s.m.position.set(-0.5 + Math.sin(s.t * 9) * 0.1, CH + 0.3 + s.t * 1.2, -1.6);
      s.m.scale.setScalar(0.6 + s.t * 1.5);
      s.m.material.opacity = 0.6 * (1 - s.t);
    }
    this.renderer.render(this.menuScene, this.camera);
  }

  // ---------- уровень ----------
  startLevel(idx, coop) {
    if (coop === undefined) coop = this.coop;
    this.coop = !!coop && !input.isTouch;
    this.ui.closeModal();
    if (this.view) {
      this.view.dispose();
      this.view = null;
    }
    const dbg = window.__KR_DEBUG || {};
    this.k = new Kitchen(idx, { up: save.data.up, seed: dbg.seed });
    this.view = new KView(this, this.k, { quality: this.quality, skins: save.data.pick, coop: this.coop });
    this.bot = dbg.bot ? new Bot(this.k) : null;
    this.state = 'play';
    this.paused = false;
    this.countT = dbg.fast ? 0.1 : 2.2;
    this.camFit = null;
    input.reset();
    audio.loopsStart();
    const theme = LEVELS[idx].theme;
    audio.setMood(theme);
    this.ui.levelHud(this.k);
    this.ui.count(1);
    audio.play('beep');
  }

  pause(on) {
    if (on === undefined) on = !this.paused;
    this.paused = on;
    if (this.state === 'play' && this.k && !this.k.finished && this.k.started) sdk.gameplay(!on);
    if (on) audio.loopsSet({ sizzle: 0, boil: 0, fire: 0, spray: false });
  }

  toMenu() {
    sdk.gameplay(false);
    audio.loopsStop();
    audio.setMood('menu');
    if (this.view) {
      this.view.dispose();
      this.view = null;
    }
    this.k = null;
    this.state = 'menu';
    this.paused = false;
    this.showMenuChefs();
  }

  onEnd() {
    const k = this.k;
    sdk.gameplay(false);
    audio.play('end');
    audio.loopsSet({ sizzle: 0, boil: 0, fire: 0, spray: false });
    const s = save.data;
    const idx = k.idx;
    const stars = k.stars();
    const rec = (s.levels[idx] = s.levels[idx] || { stars: 0, best: 0 });
    const newStars = Math.max(0, stars - rec.stars);
    const best = k.score > rec.best;
    const wasOpen = save.open(idx + 1);
    rec.stars = Math.max(rec.stars, stars);
    if (best) rec.best = k.score;
    const coins = Math.round(k.score * COIN_RATE) + newStars * STAR_COINS;
    s.coins += coins;
    s.plays++;
    save.write();
    sdk.submitScore(save.total());
    const res = { idx, score: k.score, stars, served: k.served, missed: k.missed, tips: k.tips, coins, best, unlocked: !wasOpen && save.open(idx + 1) && idx + 1 < LEVELS.length };
    this.lastResult = res;
    audio.setMood('menu');
    this.ui.banner(t('timeUp'));
    const kk = k;
    setTimeout(() => {
      if (this.k === kk) {
        audio.loopsStop();
        this.ui.results(res);
      }
    }, window.__KR_DEBUG && window.__KR_DEBUG.fast ? 300 : 2000);
  }

  addCoins(n) {
    save.data.coins += n;
  }

  // полноэкранная реклама в логической паузе, не чаще раза в 70 с
  maybeInterstitial(done) {
    if (Date.now() - this.lastAd < 70000 || save.data.noAds) return done();
    this.lastAd = Date.now();
    audio.suspend('ad');
    sdk.showInterstitial(() => {
      audio.resume('ad');
      done();
    });
  }

  rewarded(onReward) {
    audio.suspend('ad');
    const wasPaused = this.paused;
    this.paused = true;
    sdk.showRewarded(
      () => onReward(),
      () => {
        audio.resume('ad');
        this.paused = wasPaused;
        this.lastAd = Date.now();
      }
    );
  }

  chefInfo(id) {
    return CHEFS.find((c) => c.id === id);
  }
}
