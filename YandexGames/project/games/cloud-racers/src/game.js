// Игра: рендер, сцена меню/гаража, переходы между экранами, награды и прогресс
import * as THREE from 'three';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { UI } from './ui.js';
import { Race, findOpponents } from './race.js';
import { makeCar, CARS, PAINTS, carStats } from './cars.js';
import { TRACKS, THEMES } from './tracks.js';
import { iap } from './iap.js';
import { t } from './i18n.js';

export const PLACE_COINS = [150, 115, 90, 70, 60, 50, 44, 38, 32, 26];
export const PLACE_CUPS = [12, 9, 7, 5, 3, 2, 1, 0, -1, -2];
export const COIN_PACKS = { coins_1000: 1000, coins_3500: 3500, coins_10000: 10000 };

export class Game {
  constructor() {
    this.save = save;
    this.state = 'loading';
    this.paused = false;
    this.race = null;
    this.lastAd = Date.now();
  }

  async start(canvas, uiRoot) {
    await save.load();
    const s = save.data;
    if (s.noAds) sdk.noAds = true;
    this.quality = this.pickQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.3, 4000);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    input.init();
    this.buildMenuScene();
    this.ui = new UI(this, uiRoot);
    // покупки
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
    if (q && q !== 'auto') return q;
    const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    const dbg = window.__CR_DEBUG && window.__CR_DEBUG.quality;
    if (dbg) return dbg;
    return mob ? 'mid' : 'high';
  }

  setQuality(q) {
    save.data.settings.quality = q;
    save.write();
    this.quality = this.pickQuality();
    this.resize();
  }

  resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    this.w = w;
    this.h = h;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : this.quality === 'mid' ? 1.5 : 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this._shift = -1;
    this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  // ---------- сцена меню: машинка на парящем островке ----------
  buildMenuScene() {
    const sc = new THREE.Scene();
    sc.fog = new THREE.Fog(0xcdeeff, 60, 400);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(0x4fb6f5) }, bot: { value: new THREE.Color(0xe2f5ff) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(vP.y*1.5+0.3,0.0,1.0); gl_FragColor = vec4(mix(bot, top, h),1.0);\n#include <colorspace_fragment>\n}',
      })
    );
    sc.add(sky);
    sc.add(new THREE.HemisphereLight(0xd6efff, 0x7aa860, 1.2));
    const sun = new THREE.DirectionalLight(0xfff6e0, 1.5);
    sun.position.set(0.6, 1, 0.5);
    sc.add(sun);
    // островок-подиум
    const top = new THREE.Mesh(new THREE.CylinderGeometry(6, 5.6, 1.2, 40), new THREE.MeshLambertMaterial({ color: 0x86d35e }));
    top.position.y = -0.6;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(5.6, 7, 12), new THREE.MeshLambertMaterial({ color: 0x9a7354, flatShading: true }));
    rock.rotation.x = Math.PI;
    rock.position.y = -4.7;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.2, 40), new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
    disc.position.y = 0.05;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.14, 8, 48), new THREE.MeshLambertMaterial({ color: 0xffcf5a }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    this.podium = new THREE.Group();
    this.podium.add(top, rock, disc, ring);
    // цветы и кусты вокруг
    const bush = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const b = new THREE.Mesh(bush, new THREE.MeshLambertMaterial({ color: i % 3 ? 0x6cc24a : 0x58b03e }));
      const s = 0.5 + (i % 3) * 0.2;
      b.scale.set(s, s * 0.8, s);
      b.position.set(Math.cos(a) * 4.8, 0.1, Math.sin(a) * 4.8);
      this.podium.add(b);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshLambertMaterial({ color: [0xff8fb8, 0xfff0a0, 0xb59bff][i % 3] }));
      f.position.set(Math.cos(a + 0.33) * 4.4, 0.15, Math.sin(a + 0.33) * 4.4);
      this.podium.add(f);
    }
    sc.add(this.podium);
    // облака
    const cg = new THREE.IcosahedronGeometry(1, 2);
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x404650 });
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + Math.random() * 0.2,
        r = 45 + Math.random() * 120;
      const c = new THREE.Mesh(cg, cm);
      const s = 4 + Math.random() * 7;
      c.scale.set(s * 1.6, s * 0.55, s);
      c.position.set(Math.cos(a) * r, -16 - Math.random() * 22 + (r > 120 ? 14 : 0), Math.sin(a) * r);
      sc.add(c);
    }
    this.menuScene = sc;
    this.menuCar = null;
    this.menuAngle = 0;
    this.showMenuCar(save.data.car);
  }

  showMenuCar(id, paint) {
    if (this.menuCar) this.podium.remove(this.menuCar.group);
    const s = save.data;
    paint = paint || (s.cars[id] ? s.cars[id].paint : CARS.find((c) => c.id === id) && undefined);
    const c = makeCar(id, paint || '#ff6b6b');
    c.group.position.y = 0.15;
    this.podium.add(c.group);
    this.menuCar = c;
  }

  // ---------- кадр ----------
  frame() {
    const now = performance.now();
    let dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const dbg = window.__CR_DEBUG;
    if (this.state === 'race' && this.race) {
      if (input.pausePressed) {
        input.pausePressed = false;
        if (!this.race.finished) this.ui.pause();
      }
      if (!this.paused) {
        const sub = (dbg && dbg.sub) || 1;
        for (let i = 0; i < sub; i++) this.race.update(dt);
        this.ui.hud(this.race);
      }
      this.renderer.render(this.race.scene, this.camera);
    } else {
      this.menuAngle += dt * 0.25;
      const portrait = this.h > this.w;
      const r = portrait ? 15 : 11.5;
      const a = this.menuAngle;
      if (!(dbg && dbg.freeCam)) {
        this.camera.position.set(Math.sin(a) * r, portrait ? 5.5 : 4.2, Math.cos(a) * r);
        this.camera.lookAt(0, portrait ? 2.2 : 1.0, 0);
      }
      if (this.camera.fov !== 50 && !(dbg && dbg.freeCam)) {
        this.camera.fov = 50;
        this.camera.updateProjectionMatrix();
      }
      // в гараже на широком экране машинка сдвинута влево (справа панель)
      // а на узком — вверх (панель снизу)
      const gar = this.ui && this.ui.screen === 'garage';
      const wide = this.w / this.h >= 1.25 && this.w >= 760;
      const sx = gar && wide ? Math.round(this.w * 0.2) : 0;
      const sy = gar && !wide ? Math.round(this.h * 0.2) : 0;
      const shift = sx * 100000 + sy;
      if (shift !== this._shift) {
        this._shift = shift;
        if (shift) this.camera.setViewOffset(this.w, this.h, sx, sy, this.w, this.h);
        else this.camera.clearViewOffset();
      }
      if (this.menuCar && !(dbg && dbg.freeCam)) this.menuCar.group.rotation.y = -this.menuAngle * 0.6;
      this.podium.position.y = Math.sin(now / 1400) * 0.25;
      this.renderer.render(this.menuScene, this.camera);
    }
  }

  // ---------- заезд ----------
  async startRace(idx) {
    this.ui.searching();
    audio.setMood('menu');
    const t0 = Date.now();
    let opp;
    try {
      opp = await findOpponents(idx, save.data);
    } catch (e) {
      console.warn(e);
      opp = { list: [], ghosts: 0 };
    }
    // небольшая пауза, чтобы надпись «ищем соперников» не мигала
    const wait = 900 - (Date.now() - t0);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (this.race) {
      this.race.dispose();
      this.race = null;
    }
    this.race = new Race(this, idx, opp);
    this.state = 'race';
    this.paused = false;
    if (this._shift) {
      this._shift = 0;
      this.camera.clearViewOffset();
    }
    input.reset();
    audio.engineStart();
    const theme = TRACKS[idx].theme;
    audio.setMood(theme === 'night' ? 'night' : theme === 'snow' ? 'snow' : 'game');
    this.ui.raceHud(this.race);
  }

  pause(on) {
    if (on === undefined) on = !this.paused;
    this.paused = on;
    if (this.state === 'race' && this.race && !this.race.finished && this.race.t >= 0) sdk.gameplay(!on);
    if (on) audio.engineUpdate(0, 1, 0, 0);
  }

  toMenu() {
    if (this.race) {
      this.race.dispose();
      this.race = null;
    }
    sdk.gameplay(false);
    audio.engineStop();
    audio.setMood('menu');
    this.state = 'menu';
    this.paused = false;
    this.showMenuCar(save.data.car);
  }

  // после финиша: награды, рекорды, открытие трасс, рейтинг
  onFinish(race) {
    const s = save.data;
    const place = race.place;
    const idx = race.idx;
    const coins = Math.round(PLACE_COINS[place - 1] * (1 + idx * 0.08)) + race.coins * 3;
    const cupsD = Math.max(-s.cups, PLACE_CUPS[place - 1]);
    s.coins += coins;
    s.cups += cupsD;
    s.races++;
    if (place === 1) s.wins++;
    const tr = (s.tracks[idx] = s.tracks[idx] || { best: 0, place: 0 });
    const record = !tr.best || race.time < tr.best;
    if (record) tr.best = Math.round(race.time * 100) / 100;
    if (!tr.place || place < tr.place) tr.place = place;
    let unlocked = null;
    if (place <= 3 && idx + 1 === s.unlocked && s.unlocked < TRACKS.length) {
      s.unlocked++;
      unlocked = idx + 1;
    }
    save.write();
    sdk.submitScore(s.cups);
    const res = { place, coins, cupsD, record, unlocked, time: race.time, rows: race.results(), collected: race.coins, idx };
    this.lastResult = res;
    audio.setMood(TRACKS[idx].theme === 'night' ? 'night' : 'menu');
    setTimeout(() => {
      if (this.race === race) this.ui.results(res);
    }, 2200);
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

  // ---------- гараж ----------
  carState(id) {
    return save.data.cars[id];
  }

  buyCar(id) {
    const c = CARS.find((x) => x.id === id);
    const s = save.data;
    if (s.cars[id] || s.coins < c.price) return false;
    s.coins -= c.price;
    s.cars[id] = { up: [0, 0, 0, 0], paint: PAINTS[c.paint] || PAINTS[0] };
    s.car = id;
    save.write();
    return true;
  }

  power() {
    const s = save.data;
    return carStats(s.car, s.cars[s.car].up).power;
  }

  themeOf(idx) {
    return THEMES.indexOf(TRACKS[idx].theme);
  }
}
