// Игровая логика: уровни, прицел, полёт, камера, победа/поражение, сохранения, реклама
import * as THREE from 'three';
import { initPhysics, Phys, aimSolve, trajPoint, FROM, DT, AMMO, MATS } from './physics.js';
import { LEVELS, buildLevel, AMMO_UNLOCK } from './levels.js';
import { Scene3D, REST_ANGLE, RELEASE_ANGLE } from './render.js';
import { audio } from './audio.js';
import { sdk } from './sdk.js';
import { UI } from './ui.js';
import { t } from './i18n.js';
import { iap } from './iap.js';
import { IC, AMMO_IC } from './icons.js';

const SAVE_KEY = 'cw_save_v1';
export const AMMO_ORDER = ['stone', 'iron', 'bomb', 'split', 'fire'];
export const SKIN_LIST = ['classic', 'royal', 'dark', 'elven', 'frost', 'gold'];
export const SKIN_PRICES = { classic: 0, royal: 600, dark: 1200, elven: 2000, frost: 3000, gold: 5000 };
export const BOOSTER_PRICE = 150;
const N = LEVELS.length;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

export function newSave() {
  return {
    v: 1,
    stars: Array(N).fill(0),
    best: Array(N).fill(0),
    gold: 0,
    skin: 'classic',
    skins: ['classic'],
    boost: 1,
    hints: {},
    settings: { music: true, sfx: true, quality: 'auto' },
    daily: '',
    plays: 0,
  };
}

// иконки товаров для окна магазина (если в консоли не загружена своя)
function goldIcon(n) {
  const c = [[12, 13]];
  if (n > 1) c.push([7, 16], [17, 16]);
  if (n > 2) c.push([12, 7], [5, 9], [19, 9]);
  return `<svg viewBox="0 0 24 24">${c.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#f2c230" stroke="#a87a10" stroke-width="1.4"/>`).join('')}</svg>`;
}
const NOADS_IC =
  '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="3" fill="#7a48d0"/><path d="M10 9v6l5-3z" fill="#fff"/><circle cx="12" cy="12" r="10" fill="none" stroke="#d4452f" stroke-width="2.4"/><path d="M5 19L19 5" stroke="#d4452f" stroke-width="2.4"/></svg>';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export class Game {
  constructor() {
    this.state = 'boot';
    this.paused = false;
    this.cam = { pos: V(10, 8, 10), look: V(0, 2, 30), gPos: V(10, 8, 10), gLook: V(0, 2, 30), k: 3, fov: 50, gFov: 50 };
    this.acc = 0;
    this.timeScale = 1;
    this.slowT = 0;
    this.last = performance.now();
    this.arc = 'low';
    this.lastAd = Date.now();
    this.sinceAd = 0;
    this.fps = { t: 0, n: 0, low: 0 };
    this.debug = window.__CW_DEBUG || null;
  }

  // ---------- запуск ----------
  async start(canvas, uiRoot) {
    await initPhysics();
    this.s = await this.load();
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    this.mobile = mobile;
    const q = this.s.settings.quality === 'auto' ? (mobile ? 'mid' : 'high') : this.s.settings.quality;
    this.quality = q;
    this.scene = new Scene3D(canvas, q);
    this.scene.setSkin(this.s.skin);
    this.ui = new UI(this, uiRoot);
    await this.initIap();
    this.canvas = canvas;
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.scene.resize(w, h);
      this.portrait = h > w;
      if (this.state === 'aim' && !this.lookMode) this.aimCam(true);
    };
    window.addEventListener('resize', onResize);
    onResize();
    this.bindInput(canvas);
    this.toMenu();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ---------- сохранения ----------
  async load() {
    let local = null;
    try {
      local = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    } catch (e) {}
    let cloud = null;
    try {
      cloud = await sdk.loadData();
    } catch (e) {}
    const score = (s) => (s && s.stars ? s.stars.reduce((a, b) => a + b, 0) * 1e6 + (s.gold || 0) : -1);
    const pick = score(cloud) > score(local) ? cloud : local;
    const s = Object.assign(newSave(), pick || {});
    while (s.stars.length < N) s.stars.push(0);
    while (s.best.length < N) s.best.push(0);
    s.settings = Object.assign(newSave().settings, s.settings || {});
    return s;
  }

  // ---------- покупки ----------
  async initIap() {
    // «Без рекламы» запоминается и в сохранении — на случай, если getPurchases() не ответит
    if (this.s.noAds) sdk.noAds = true;
    const gold = (n) => () => {
      this.s.gold += n;
    };
    let restored = 0;
    iap.onChange((id, restoring) => {
      if (restoring && !this.iapDefs[id].permanent) restored++;
      if (this.ui) this.ui.refreshGold();
    });
    this.iapDefs = {
      gold_1000: { grant: gold(1000), icon: goldIcon(1) },
      gold_3500: { grant: gold(3500), icon: goldIcon(2) },
      gold_10000: { grant: gold(10000), icon: goldIcon(3) },
      cannonballs_5: { grant: () => (this.s.boost += 5), icon: AMMO_IC.iron },
      disable_ads: {
        permanent: true,
        grant: () => {
          this.s.noAds = true;
          sdk.noAds = true;
        },
        icon: NOADS_IC,
      },
    };
    await iap.init(this.iapDefs, () => this.saveNow());
    if (restored) setTimeout(() => this.ui.toast(t('iapRestored')), 1200);
  }

  async buyIap(id) {
    const ok = await iap.buy(id);
    if (ok) {
      audio.play('buy');
      this.ui.toast(t('iapThanks'));
      this.updateHUD();
    }
    this.ui.refreshModal();
    return ok;
  }

  // немедленное сохранение в облако (после покупки, до consumePurchase)
  async saveNow() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.s));
    } catch (e) {}
    await sdk.saveData(this.s, true);
  }

  save(cloud = true) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.s));
    } catch (e) {}
    if (cloud) {
      clearTimeout(this._cloudT);
      this._cloudT = setTimeout(() => sdk.saveData(this.s), 800);
    }
  }

  unlocked(i) {
    return i === 0 || this.s.stars[i - 1] > 0 || (this.debug && this.debug.unlockAll);
  }
  nextLevel() {
    for (let i = 0; i < N; i++) if (!this.s.stars[i]) return i;
    return N - 1;
  }
  totalScore() {
    return this.s.best.reduce((a, b) => a + b, 0);
  }

  // ---------- меню ----------
  toMenu() {
    this.clearLevel();
    const w = Math.floor(this.nextLevel() / 10);
    this.loadPhys(w * 10 + 9);
    this.state = 'menu';
    this.ui.showMenu();
    audio.setIntensity(0);
    sdk.gameplay(false);
  }

  toMap(world) {
    if (this.state !== 'menu') this.toMenu();
    this.ui.showMap(world ?? Math.floor(this.nextLevel() / 10));
    if (this.s.daily !== today()) setTimeout(() => this.ui.dailyModal(), 400);
  }

  clearLevel() {
    if (this.P) this.P.free();
    this.P = null;
    this.scene.clearLevel();
    this.proj = null;
    audio.setFire(false);
  }

  loadPhys(i) {
    this.clearLevel();
    const lv = (this.lv = buildLevel(i));
    this.li = i;
    const P = (this.P = new Phys());
    P.load(lv);
    for (let k = 0; k < 150; k++) P.step();
    P.events = [];
    this.scene.setWorld(lv.world);
    this.scene.loadLevel(P, lv);
    // габариты замка
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y1 = 0;
    for (const b of lv.blocks.concat(lv.rocks)) {
      const [w, h, d] = b.size;
      x0 = Math.min(x0, b.pos[0] - w / 2);
      x1 = Math.max(x1, b.pos[0] + w / 2);
      z0 = Math.min(z0, b.pos[2] - d / 2);
      z1 = Math.max(z1, b.pos[2] + d / 2);
      y1 = Math.max(y1, b.pos[1] + h / 2);
    }
    this.box = { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, h: y1, z0 };
    this.scene.setBall(null);
    this.scene.setArm(REST_ANGLE);
  }

  // ---------- уровень ----------
  startLevel(i) {
    if (!this.unlocked(i)) return;
    this.loadPhys(i);
    const lv = this.lv;
    this.ammo = { ...lv.ammo };
    this.used = 0;
    this.adShots = 0;
    this.winAt = 0;
    this.loseAt = 0;
    this.result = null;
    this.lookMode = false;
    this.arc = 'low';
    this.yawGoal = 0;
    this.catYaw = 0;
    this.sel = AMMO_ORDER.find((k) => this.ammo[k] > 0);
    this.scene.setBall(this.sel);
    this.state = 'intro';
    this.introT = 0;
    const b = this.box;
    this.introFrom = { pos: V(b.cx + 13, 6.5, b.cz - 3), look: V(b.cx, b.h * 0.45, b.cz) };
    this.cam.pos.copy(this.introFrom.pos);
    this.cam.look.copy(this.introFrom.look);
    this.ui.showHUD();
    this.ui.banner(t('level', { n: i + 1 }), lv.boss ? t('boss') : t(`world${lv.world}`));
    audio.setIntensity(1);
    audio.setMood(['valley', 'rocks', 'ice'][lv.world]);
    if (lv.boss) audio.setMood('boss');
    sdk.gameplay(true);
    this.s.plays++;
    this.updateHUD();
    if (lv.boss) setTimeout(() => audio.play('king'), 900);
  }

  aimPose() {
    const b = this.box;
    const aspect = window.innerWidth / window.innerHeight;
    // камера стоит за катапультой: катапульта видна внизу кадра, замок — впереди
    const pos = V(0, 3.1 + b.h * 0.06, -9);
    const look = V(b.cx * 0.6, Math.max(1.5, b.h * 0.3), b.cz);
    const D = pos.distanceTo(look);
    const vert = b.h * 0.6 + 1.6;
    const horiz = b.w * 0.5 + (aspect < 1 ? 1.2 : 2.4);
    const half = Math.max(vert, horiz / aspect) / D;
    const fov = Math.min(64, Math.max(36, (2 * Math.atan(half) * 180) / Math.PI));
    return { pos, look, fov };
  }

  aimCam(snap) {
    const p = this.aimPose();
    this.cam.gPos.copy(p.pos);
    this.cam.gLook.copy(p.look);
    this.cam.gFov = p.fov;
    this.cam.k = 4;
    if (snap) {
      this.cam.pos.copy(p.pos);
      this.cam.look.copy(p.look);
      this.cam.fov = p.fov;
    }
  }

  overviewCam() {
    const b = this.box;
    const dist = 12 + Math.max(b.w, b.h) * 0.9;
    const side = this.proj && !this.proj.dead ? Math.sign(this.proj.body.translation().x - b.cx) || 1 : 1;
    this.cam.gPos.set(b.cx + side * dist * 0.45, 3 + b.h * 0.55, b.cz - dist * 0.85);
    this.cam.gLook.set(b.cx, b.h * 0.38, b.cz);
    this.cam.gFov = 48;
    this.cam.k = 2.2;
  }

  ammoLeft() {
    return Object.values(this.ammo).reduce((a, b) => a + b, 0);
  }

  selectAmmo(type) {
    if (this.state !== 'aim' && this.state !== 'intro') return;
    if (!this.ammo[type]) return;
    this.sel = type;
    this.scene.setBall(type);
    audio.play('select');
    this.updateHUD();
  }

  toggleArc() {
    this.arc = this.arc === 'low' ? 'high' : 'low';
    audio.play('select');
    this.updateHUD();
  }

  toggleLook() {
    if (this.state !== 'aim') return;
    this.lookMode = !this.lookMode;
    if (this.lookMode) {
      const b = this.box;
      this.orbit = { a: -0.5, h: 0.35, r: 16 + Math.max(b.w, b.h) * 0.8 };
    } else this.aimCam();
    this.updateHUD();
  }

  useBooster() {
    if (!['aim', 'intro', 'settle', 'flight'].includes(this.state)) return;
    if (this.s.boost > 0) {
      this.s.boost--;
      this.ammo.iron = (this.ammo.iron || 0) + 1;
      this.save();
      if (this.state === 'aim' || this.state === 'intro') this.selectAmmo('iron');
      this.updateHUD();
      audio.play('buy');
    } else this.ui.boosterModal();
  }

  updateHUD() {
    if (!this.P) return;
    this.ui.updateHUD({
      score: this.P.score,
      enemies: this.P.enemiesLeft(),
      ammo: this.ammo,
      sel: this.sel,
      arc: this.arc,
      look: this.lookMode,
      boost: this.s.boost,
      level: this.li,
      canAct: this.state === 'aim',
    });
  }

  // ---------- ввод ----------
  bindInput(c) {
    c.addEventListener('pointerdown', (e) => {
      audio.unlock();
      if (this.paused || this.ui.modalOpen) return;
      c.setPointerCapture && c.setPointerCapture(e.pointerId);
      if (this.state === 'intro') {
        this.introT = 99;
        return;
      }
      if (this.state === 'flight') {
        this.tapAction();
        return;
      }
      // тап, пока замок «успокаивается», — сразу к следующему выстрелу
      if (this.state === 'settle' && this.settleT > 0.3) {
        this.resolve();
        return;
      }
      if (this.state === 'menu') return;
      if (this.state !== 'aim') return;
      if (this.lookMode) {
        this.drag = { x: e.clientX, y: e.clientY };
        return;
      }
      this.aiming = true;
      this.aimType = e.pointerType;
      this.updateAim(e.clientX, e.clientY);
    });
    c.addEventListener('pointermove', (e) => {
      if (this.drag && this.lookMode) {
        this.orbit.a -= (e.clientX - this.drag.x) * 0.006;
        this.orbit.h = Math.max(0.08, Math.min(1.1, this.orbit.h + (e.clientY - this.drag.y) * 0.004));
        this.drag = { x: e.clientX, y: e.clientY };
        return;
      }
      if (this.aiming) this.updateAim(e.clientX, e.clientY);
    });
    const up = () => {
      this.drag = null;
      if (!this.aiming) return;
      this.aiming = false;
      this.scene.hideAim();
      if (this.state === 'aim' && this.aim && this.aim.ok) this.fire();
      this.aim = null;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => {
      this.aiming = false;
      this.drag = null;
      this.scene.hideAim();
      this.aim = null;
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.state === 'flight') this.tapAction();
      if (e.code === 'Escape' && this.state !== 'menu') this.ui.pauseModal();
    });
  }

  updateAim(cx, cy) {
    const off = this.aimType === 'touch' ? 70 : 0;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const nx = (cx / w) * 2 - 1;
    const ny = -((cy - off) / h) * 2 + 1;
    const target = this.scene.raycast(nx, ny);
    if (!target) {
      this.aim = null;
      this.scene.hideAim();
      return;
    }
    const tg = [target.x, target.y + 0.05, target.z];
    const A = aimSolve(tg, this.arc);
    const sol = A && A.sol;
    if (!sol) {
      this.aim = null;
      this.scene.hideAim();
      return;
    }
    // траектория до первого препятствия; первые точки идут от самой катапульты к точке вылета
    const pts = [];
    const top = [Math.sin(A.yaw) * 0.3, 1.7, Math.cos(A.yaw) * 0.3];
    for (let i = 0; i < 3; i++) {
      const k = i / 3;
      pts.push([top[0] + (A.from[0] - top[0]) * k, top[1] + (A.from[1] - top[1]) * k, top[2] + (A.from[2] - top[2]) * k]);
    }
    const steps = 34;
    let blocked = false;
    let prev = A.from;
    for (let i = 1; i <= steps; i++) {
      const p = trajPoint(A.from, sol.vel, (sol.T * i) / steps);
      if (!blocked && p[2] > 5 && i < steps - 1) {
        const hit = this.scene.segmentHit(prev, p);
        if (hit) {
          pts.push([hit.x, hit.y, hit.z]);
          blocked = Math.hypot(hit.x - tg[0], hit.y - tg[1], hit.z - tg[2]) > 1.3;
          break;
        }
      }
      pts.push(p);
      prev = p;
    }
    this.aim = { target: tg, sol, from: A.from, yaw: A.yaw, ok: true };
    this.yawGoal = A.yaw;
    this.scene.showAim(pts, tg, !blocked);
  }

  fire() {
    this.state = 'fire';
    this.fireT = 0;
    this.launched = false;
    this.shot = { type: this.sel, vel: this.aim.sol.vel, T: this.aim.sol.T, from: this.aim.from, yaw: this.aim.yaw };
    this.yawGoal = this.aim.yaw;
    this.ui.setActive(false);
  }

  tapAction() {
    const p = this.proj;
    if (!p || p.dead || p.spent) return;
    if (p.type === 'split') {
      const kids = this.P.splitProj(p);
      for (const k of kids) this.scene.addProj(k);
      this.scene.removeObj(p);
      this.proj = kids[1];
      this.projs = kids;
      audio.play('split');
      this.ui.flightHint(null);
    } else if (p.type === 'bomb') {
      this.P.detonate(p);
      this.scene.removeObj(p);
      this.ui.flightHint(null);
    }
  }

  // ---------- основной цикл ----------
  loop(now) {
    requestAnimationFrame(this.loop);
    let dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.debug && this.debug.speed) dt *= this.debug.speed;
    if (!this.paused) this.update(dt);
    this.render(dt);
    this.autoQuality(dt);
  }

  update(dt) {
    const P = this.P;
    // замедление при больших взрывах
    if (this.slowT > 0) {
      this.slowT -= dt;
      this.timeScale = 0.35;
    } else this.timeScale = Math.min(1, this.timeScale + dt * 2);
    if (P) {
      this.acc += dt * this.timeScale;
      let n = 0;
      const maxN = (this.debug && this.debug.maxSteps) || 3;
      while (this.acc >= DT && n < maxN) {
        P.step();
        this.acc -= DT;
        n++;
        this.handleEvents();
      }
      if (n === maxN) this.acc = 0;
      this.scene.sync(P, dt);
      // горение
      for (const o of P.fires) {
        const p = o.body.translation();
        this.scene.burn(p, o.rad);
      }
      audio.setFire(P.fires.size > 0 && this.state !== 'menu');
      // след снаряда
      if (this.projs) for (const q of this.projs) if (!q.dead && !q.hit && Math.random() < 0.7) this.scene.trail(q.body.translation(), q.type);
    }
    this.scene.update(dt);
    switch (this.state) {
      case 'menu': {
        const b = this.box;
        const a = performance.now() / 9000;
        const r = 14 + Math.max(b.w, b.h) * 0.7;
        this.cam.gPos.set(b.cx + Math.sin(a) * r, 3 + b.h * 0.3, b.cz - Math.cos(a) * r);
        this.cam.gLook.set(b.cx, b.h * 0.62, b.cz);
        this.cam.gFov = 50;
        this.cam.k = 1.5;
        break;
      }
      case 'intro': {
        this.introT += dt;
        const D = 2.8;
        const k = ease(Math.min(1, this.introT / D));
        const A = this.aimPose();
        const f = this.introFrom;
        this.cam.pos.lerpVectors(f.pos, A.pos, k);
        this.cam.pos.y += Math.sin(k * Math.PI) * 4;
        this.cam.look.lerpVectors(f.look, A.look, k);
        this.cam.fov = 50 + (A.fov - 50) * k;
        this.cam.gFov = this.cam.fov;
        this.cam.gPos.copy(this.cam.pos);
        this.cam.gLook.copy(this.cam.look);
        if (this.introT >= D) {
          this.state = 'aim';
          this.aimCam(true);
          this.ui.setActive(true);
          this.updateHUD();
          this.showHints();
        }
        break;
      }
      case 'aim':
        if (this.lookMode) {
          const b = this.box;
          const o = this.orbit;
          this.cam.gPos.set(b.cx + Math.sin(o.a) * o.r * Math.cos(o.h), 1 + Math.sin(o.h) * o.r, b.cz - Math.cos(o.a) * o.r * Math.cos(o.h));
          this.cam.gLook.set(b.cx, b.h * 0.4, b.cz);
          this.cam.gFov = 50;
          this.cam.k = 6;
        }
        this.checkEnd(dt);
        break;
      case 'fire': {
        // сначала катапульта доворачивается на цель, потом бросает
        if (Math.abs(this.catYaw - this.shot.yaw) > 0.01) break;
        this.fireT += dt;
        const tR = 0.17;
        if (this.fireT < tR) {
          const k = this.fireT / tR;
          this.scene.setArm(REST_ANGLE + (RELEASE_ANGLE - REST_ANGLE) * k * k);
        } else if (!this.launched) this.launch();
        break;
      }
      case 'flight': {
        this.flightT += dt;
        const p = this.proj;
        if (p && !p.dead) {
          const q = p.body.translation();
          const v = p.body.linvel();
          // камера летит за снарядом, катапульта остаётся позади
          this.cam.gPos.set(q.x - 0.8, Math.max(2.4, q.y + 1.6), q.z - 5.5);
          this.cam.gLook.set(q.x, q.y, q.z + 5 + Math.max(0, v.z) * 0.15);
          this.cam.gFov = 55;
          this.cam.k = 4.5;
        }
        const impact = !p || p.dead || p.hit || (this.projs && this.projs.some((x) => x.hit || x.dead)) || this.flightT > this.shot.T + 1.2;
        if (impact) {
          this.state = 'settle';
          this.settleT = 0;
          this.calmT = 0;
          this.overviewCam();
          this.ui.flightHint(null);
        }
        this.armBack(dt);
        break;
      }
      case 'settle': {
        this.settleT += dt;
        this.armBack(dt);
        const act = this.P.activity();
        if (act < 0.6) this.calmT += dt;
        else this.calmT = 0;
        if (this.checkEnd(dt)) break;
        // ждём недолго: как только всё почти замерло — снова к катапульте
        if ((this.calmT > 0.35 && this.settleT > 0.6) || this.settleT > 4.5) this.resolve();
        break;
      }
      case 'win':
      case 'lose':
        this.armBack(dt);
        break;
    }
    // плавный разворот катапульты к цели
    if (this.catYaw === undefined) this.catYaw = 0;
    const dy = (this.yawGoal ?? 0) - this.catYaw;
    this.catYaw += Math.sign(dy) * Math.min(Math.abs(dy), dt * 3.5);
    this.scene.setYaw(this.catYaw);
    // камера
    const c = this.cam;
    const k = 1 - Math.exp(-c.k * dt);
    if (this.state !== 'intro') {
      c.pos.lerp(c.gPos, k);
      c.look.lerp(c.gLook, k);
      c.fov += (c.gFov - c.fov) * k;
    }
  }

  armBack(dt) {
    if (this.armT === undefined) return;
    this.armT += dt;
    const a = this.armT;
    if (a < 0.12) this.scene.setArm(RELEASE_ANGLE + (0.95 - RELEASE_ANGLE) * (a / 0.12));
    else if (a < 1.1) this.scene.setArm(0.95 + (REST_ANGLE - 0.95) * ease((a - 0.12) / 0.98));
    else {
      this.scene.setArm(REST_ANGLE);
      this.armT = undefined;
      if (this.state === 'aim' || this.state === 'settle' || this.state === 'flight') this.scene.setBall(this.ammo[this.sel] ? this.sel : AMMO_ORDER.find((k) => this.ammo[k] > 0) || null);
    }
  }

  launch() {
    this.launched = true;
    const s = this.shot;
    this.P.damageOn = true;
    const o = this.P.addProjectile(s.type, s.from, s.vel);
    this.scene.addProj(o);
    this.scene.setBall(null);
    this.proj = o;
    this.projs = [o];
    this.ammo[s.type]--;
    this.used++;
    if (!this.ammo[this.sel]) this.sel = AMMO_ORDER.find((k) => this.ammo[k] > 0) || this.sel;
    this.armT = 0;
    this.state = 'flight';
    this.flightT = 0;
    audio.play('launch');
    if (s.type === 'split') this.ui.flightHint(t('tapSplit'));
    if (s.type === 'bomb') this.ui.flightHint(t('tapBomb'));
    this.updateHUD();
  }

  // проверка конца уровня
  checkEnd() {
    if (!this.P || this.result) return false;
    if (this.P.enemiesLeft() === 0 && this.P.damageOn) {
      if (!this.winAt) this.winAt = performance.now() + 1300;
      if (performance.now() > this.winAt) this.win();
      return true;
    }
    return false;
  }

  resolve() {
    // убрать лежащие снаряды
    for (const o of [...this.P.objs.values()])
      if (o.kind === 'proj') {
        this.scene.dust(o.body.translation(), 5, 0xffffff, 0.8);
        this.scene.removeObj(o);
        this.P.remove(o);
      }
    this.proj = null;
    this.projs = null;
    if (this.P.enemiesLeft() === 0) return this.win();
    if (this.ammoLeft() > 0) {
      this.state = 'aim';
      this.aimCam();
      this.ui.setActive(true);
      if (this.armT === undefined) this.scene.setBall(this.ammo[this.sel] ? this.sel : AMMO_ORDER.find((k) => this.ammo[k] > 0));
      this.updateHUD();
    } else this.lose();
  }

  win() {
    if (this.result) return;
    this.result = 'win';
    this.state = 'win';
    this.ui.setActive(false);
    const left = this.ammoLeft();
    const bonus = left * 1000;
    const score = this.P.score + bonus;
    const par = this.lv.par || 1;
    const stars = this.used <= par ? 3 : this.used <= par + 1 ? 2 : 1;
    const i = this.li;
    const first = !this.s.stars[i];
    const newBest = score > this.s.best[i];
    const gold = Math.round(score / 50) + (first ? 25 + i * 3 : 0);
    this.s.stars[i] = Math.max(this.s.stars[i], stars);
    if (newBest) this.s.best[i] = score;
    this.s.gold += gold;
    this.save();
    if (newBest) sdk.submitScore(this.totalScore());
    sdk.gameplay(false);
    audio.play('win');
    this.overviewCam();
    this.sinceAd++;
    this.lastWin = { stars, score, bonus, gold, newBest, best: this.s.best[i], level: i, left };
    setTimeout(() => this.ui.winModal(this.lastWin), 900);
  }

  lose() {
    this.result = 'lose';
    this.state = 'lose';
    this.ui.setActive(false);
    sdk.gameplay(false);
    audio.play('lose');
    this.sinceAd++;
    setTimeout(() => this.ui.loseModal({ canAd: this.adShots < 2 }), 700);
  }

  // реклама за доп. снаряд после поражения
  extraShot() {
    this.rewarded(() => {
      this.adShots++;
      this.ammo.iron = (this.ammo.iron || 0) + 1;
      this.result = null;
      this.state = 'aim';
      this.sel = 'iron';
      this.scene.setBall('iron');
      this.aimCam();
      this.ui.closeModal();
      this.ui.setActive(true);
      this.updateHUD();
      sdk.gameplay(true);
    });
  }

  doubleGold() {
    const w = this.lastWin;
    if (!w || w.doubled) return;
    this.rewarded(() => {
      w.doubled = true;
      this.s.gold += w.gold;
      this.save();
      this.ui.winModal(w);
      audio.play('coin');
    });
  }

  // переходы после окна результата (с редкой полноэкранной рекламой)
  after(fn) {
    this.ui.closeModal();
    const can = this.li >= 2 && this.sinceAd >= 2 && Date.now() - this.lastAd > 150000;
    if (!can) return fn();
    this.sinceAd = 0;
    this.lastAd = Date.now();
    audio.suspend('ad');
    sdk.showInterstitial(() => {
      audio.resume('ad');
      fn();
    });
  }

  restart() {
    this.after(() => this.startLevel(this.li));
  }
  next() {
    this.after(() => (this.li + 1 < N ? this.startLevel(this.li + 1) : this.toMap(2)));
  }
  exitToMap() {
    this.after(() => {
      const w = this.lv ? this.lv.world : 0;
      this.toMenu();
      this.toMap(w);
    });
  }

  rewarded(onReward) {
    audio.suspend('ad');
    const wasPaused = this.paused;
    this.paused = true;
    sdk.gameplay(false);
    sdk.showRewarded(
      () => onReward(),
      () => {
        audio.resume('ad');
        this.paused = wasPaused;
      },
    );
  }

  pause(on) {
    this.paused = on;
    if (this.state !== 'menu' && !this.result) sdk.gameplay(!on);
  }

  // ---------- события физики → звук и эффекты ----------
  handleEvents() {
    const P = this.P;
    const S = this.scene;
    for (const e of P.events) {
      switch (e.t) {
        case 'hit': {
          const snd = { wood: 'hitWood', stone: 'hitStone', ice: 'hitIce', metal: 'hitMetal', tnt: 'hitWood', straw: 'hitWood', enemy: 'ouch', ground: 'thud' }[e.mat] || 'thud';
          audio.play(snd, Math.min(1, e.power / 15));
          S.dust(e.p, 6, e.mat === 'ground' ? 0xc8b89a : 0xe8e0d0, 1);
          if (e.power > 8) S.shake = Math.max(S.shake, 0.18);
          break;
        }
        case 'dmg':
          S.flashObj(e.o, Math.min(1, e.d / 4));
          if (e.o.kind === 'enemy') audio.play('ouch');
          else if (e.d > 2.5) audio.play({ wood: 'hitWood', stone: 'hitStone', ice: 'hitIce', metal: 'hitMetal' }[e.o.mat] || 'hitWood', Math.min(1, e.d / 10));
          break;
        case 'break': {
          const o = e.o;
          S.removeObj(o);
          const n = Math.round(Math.min(26, Math.max(5, (o.vol || 1) * 10)));
          S.debrisBurst(e.p, o.mat, n, 3.5, o.mat === 'stone' || o.mat === 'metal' ? 0.24 : 0.2);
          S.dust(e.p, 4 + Math.round(n / 4), o.mat === 'ice' ? 0xeaf6ff : 0xe0d8c8, 1.2);
          audio.play({ wood: 'breakWood', stone: 'breakStone', ice: 'breakIce', metal: 'breakMetal', tnt: 'breakWood', straw: 'breakWood' }[o.mat]);
          if (e.pts >= 150) this.ui.floaterWorld(e.p, '+' + e.pts, 'pts');
          break;
        }
        case 'kill': {
          const o = e.o;
          S.removeObj(o);
          S.dust(e.p, 14, 0xb8e0a0, 1.4, 1.3);
          S.debrisBurst(e.p, 'enemy', 8, 3, 0.14);
          audio.play(o.type === 'king' ? 'king' : 'goblin');
          this.ui.floaterWorld(e.p, '+' + e.pts, 'kill');
          if (o.type === 'king') this.slowT = 0.8;
          this.updateHUD();
          break;
        }
        case 'boom':
          S.explosion(e.p, e.R);
          audio.play('boom');
          if (e.src === 'tnt' || e.R > 3) this.slowT = Math.max(this.slowT, 0.35);
          break;
        case 'fire':
          audio.play('fire');
          break;
        case 'split':
          break;
        case 'launch':
          break;
      }
    }
    P.events.length = 0;
  }

  showHints() {
    const lv = this.lv;
    const queue = [];
    // новый вид снаряда
    for (const k of AMMO_ORDER) if (AMMO_UNLOCK[k] === this.li + 1 && k !== 'stone') queue.push({ ammo: k });
    if (lv.hint && !this.s.hints[lv.hint]) queue.push({ hint: lv.hint });
    const nextH = () => {
      const h = queue.shift();
      if (!h) return;
      if (h.ammo) this.ui.newAmmo(h.ammo, nextH);
      else {
        this.s.hints[h.hint] = 1;
        this.save(false);
        this.ui.hint(h.hint, nextH);
      }
    };
    nextH();
  }

  // ---------- рендер ----------
  render(dt) {
    this.scene.render(this.cam.pos, this.cam.look, this.cam.fov);
    this.ui.frame(dt);
  }

  autoQuality(dt) {
    if (this.s.settings.quality !== 'auto' || this.state === 'menu') return;
    const f = this.fps;
    f.t += dt;
    f.n++;
    if (f.t > 4) {
      const fps = f.n / f.t;
      f.t = 0;
      f.n = 0;
      if (fps < 38) f.low++;
      else f.low = 0;
      if (f.low >= 2 && this.quality !== 'low') {
        this.setQuality(this.quality === 'high' ? 'mid' : 'low');
        f.low = 0;
      }
    }
  }

  setQuality(q) {
    this.quality = q;
    const r = this.scene.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : q === 'mid' ? 1.5 : 1));
    const sh = q !== 'low';
    if (r.shadowMap.enabled !== sh) {
      r.shadowMap.enabled = sh;
      this.scene.sun.castShadow = sh;
      this.scene.scene.traverse((m) => {
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mm) => (mm.needsUpdate = true));
      });
    }
    this.scene.resize(window.innerWidth, window.innerHeight);
  }

  // ---------- магазин ----------
  buySkin(id) {
    const s = this.s;
    if (s.skins.includes(id)) {
      s.skin = id;
      this.scene.setSkin(id);
      this.save();
      audio.play('select');
      return true;
    }
    const price = SKIN_PRICES[id];
    if (s.gold < price) {
      audio.play('error');
      this.ui.toast(t('notEnough'));
      return false;
    }
    s.gold -= price;
    s.skins.push(id);
    s.skin = id;
    this.scene.setSkin(id);
    this.save();
    audio.play('buy');
    return true;
  }

  buyBooster(ad) {
    if (ad) {
      this.rewarded(() => {
        this.s.boost++;
        this.save();
        this.ui.refreshModal();
        audio.play('buy');
      });
      return;
    }
    if (this.s.gold < BOOSTER_PRICE) {
      audio.play('error');
      this.ui.toast(t('notEnough'));
      return;
    }
    this.s.gold -= BOOSTER_PRICE;
    this.s.boost++;
    this.save();
    audio.play('buy');
    this.ui.refreshModal();
  }

  takeDaily(x3) {
    const give = (k) => {
      this.s.daily = today();
      this.s.gold += 100 * k;
      this.save();
      audio.play('coin');
      this.ui.closeModal();
      this.ui.refreshGold();
    };
    if (x3) this.rewarded(() => give(3));
    else give(1);
  }
}
