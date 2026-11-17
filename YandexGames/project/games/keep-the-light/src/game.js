// Игра: сцена, ночь, предметы, взаимодействия, события, скример, итоги
import * as THREE from 'three';
import { World, WALL_H } from './world.js';
import { Monster } from './monster.js';
import { Player, EYE } from './player.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap } from './iap.js';
import { nightCfg, COLORS } from './data.js';
import { ROOMS, START, EXIT } from './map.js';
import { glow } from './tex.js';
import { t } from './i18n.js';

const DBG = window.__KL_DEBUG || {};

export class Game {
  constructor() {
    this.state = 'boot';
    this.save = save;
    this.paused = false;
    this.time = 0;
  }

  async start(canvas, uiRoot) {
    await save.load();
    this.mobile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.applyQuality();
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.mobile, powerPreference: 'high-performance', preserveDrawingBuffer: !!DBG.shots }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = this.shadows;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020204);
    this.scene.fog = new THREE.FogExp2(0x030306, 0.085);
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 60);
    this.hemi = new THREE.HemisphereLight(0x5a6a90, 0x201810, 0.42);
    this.scene.add(this.hemi);
    this.input = new Input(canvas, this.mobile);
    this.input.sens = save.data.settings.sens || 1;
    this.ui = new UI(this, uiRoot);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // покупки
    await iap.init(
      {
        coins_1000: { grant: () => this.addCoins(1000) },
        coins_3500: { grant: () => this.addCoins(3500) },
        coins_10000: { grant: () => this.addCoins(10000) },
        disable_ads: {
          permanent: true,
          grant: () => {
            save.data.noAds = true;
            sdk.noAds = true;
          },
        },
      },
      () => save.flush(),
    );
    sdk.noAds = !!save.data.noAds;
    iap.onChange(() => this.ui.refresh());
    this.toMenu();
    this.last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
    };
    requestAnimationFrame(loop);
  }

  applyQuality() {
    const q = save.data.settings.quality;
    this.quality = q === 'auto' ? (this.mobile ? 'low' : 'high') : q;
    this.shadows = this.quality === 'high';
    if (this.renderer) {
      this.renderer.shadowMap.enabled = this.shadows;
      this.resize();
    }
  }

  resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 1.5 : 1.15);
    this.renderer.setPixelRatio(DBG.dpr || pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 82 : 72;
    this.camera.updateProjectionMatrix();
  }

  addCoins(n) {
    save.data.coins += n;
    save.write();
    this.ui && this.ui.refresh();
  }

  // ---------- сцена ----------
  _clear() {
    if (this.world) this.world.dispose();
    if (this.monster) this.monster.dispose(this.scene);
    if (this.player) {
      this.scene.remove(this.player.spot, this.player.spot.target, this.player.spill);
      this.player.spot.dispose();
    }
    for (const it of this.items || []) this.scene.remove(it.obj);
    this.world = this.monster = this.player = null;
    this.items = [];
  }

  _build(n, nightmare, seed) {
    this._clear();
    this.cfg = nightCfg(n, nightmare);
    this.cfg.stun = 2.5 + save.data.up.flash * 1;
    this.world = new World(this.scene, n, seed, this.quality);
    const col = (COLORS.find((c) => c.id === save.data.color) || COLORS[0]).c;
    this.player = new Player(this.camera, this.scene, { up: save.data.up, color: col, shadows: this.shadows });
    this.player.place(START.x, START.z, START.yaw);
    this.monster = new Monster(this.world, this.cfg, this.scene, audio);
    this.world.setLocks(this.cfg.keys);
    this.renderer.shadowMap.needsUpdate = true;
  }

  toMenu() {
    this.state = 'menu';
    sdk.gameplay(false);
    this.input.enabled = false;
    this.input.unlock();
    this.ui.setHidden(false);
    const n = Math.max(1, Math.min(5, this.nextNight()));
    this._build(1, false, 7);
    // витрина: коридор, луч медленно скользит, вдали стоит Жилец
    this.player.place(2.6, 9, -Math.PI / 2);
    this.monster.state = 'menu';
    this.monster.pos.set(12.5, 0, 8.7);
    this.monster.yaw = -Math.PI / 2;
    this.menuT = 0;
    audio.setMood('menu');
    audio.setRain(0.016);
    this.ui.showMenu();
    void n;
  }

  nextNight() {
    for (let i = 1; i <= 5; i++) if (!save.done(i)) return i;
    return 5;
  }

  startNight(n, nightmare = false) {
    this.night = n;
    this.nightmare = nightmare;
    this._build(n, nightmare, (Math.random() * 1e6) | 0);
    this._placeItems();
    this.state = 'play';
    this.paused = false;
    this.time = 0;
    this.nightT = 0;
    this.keys = 0;
    this.caughtCount = 0;
    this.usedSecond = false;
    this.eventT = 18 + Math.random() * 10;
    this.heartT = 0;
    this.tickT = 0;
    this.tips = {};
    this.flash = 0;
    this.ui.setHidden(false);
    this.input.reset();
    this.input.enabled = true;
    audio.setMood('night');
    audio.setRain(0.012);
    sdk.gameplay(true);
    save.data.plays++;
    save.write();
    this.ui.showHud();
    this.ui.toast(t('tipStart'));
    const run = (this.runId = (this.runId || 0) + 1);
    if (n === 2) setTimeout(() => this.runId === run && this.state === 'play' && this.ui.toast(t('tipFlash')), 9000);
    if (DBG.god) this.monster.state = 'idle', (this.monster.timer = 1e9);
  }

  // ключи и батарейки по местам на мебели
  _placeItems() {
    const w = this.world;
    const all = w.spots.filter((s) => s.y < 1.75);
    const roomOf = (s) => ROOMS.find((r) => s.x >= r.x && s.x < r.x + r.w && s.z >= r.y && s.z < r.y + r.h);
    for (const s of all) s.room = roomOf(s);
    const okKey = all.filter((s) => s.room && s.room.type !== 'foyer' && Math.hypot(s.x - START.x, s.z - START.z) > 5);
    // перемешать и раскидать по разным комнатам; новые крылья — в приоритете
    okKey.sort(() => Math.random() - 0.5);
    const used = new Set();
    const keys = [];
    const newRoom = (s) => s.room.night === this.night;
    for (const pass of [0, 1, 2]) {
      for (const s of okKey) {
        if (keys.length >= this.cfg.keys) break;
        if (keys.includes(s)) continue;
        if (pass === 0 && (!newRoom(s) || used.has(s.room.id))) continue;
        if (pass === 1 && used.has(s.room.id)) continue;
        keys.push(s);
        used.add(s.room.id);
      }
      if (pass === 0 && keys.length > 1) break; // не больше двух ключей в новых комнатах первым проходом
    }
    for (const s of okKey) if (keys.length < this.cfg.keys && !keys.includes(s) && !used.has(s.room.id)) keys.push(s), used.add(s.room.id);
    for (const s of okKey) if (keys.length < this.cfg.keys && !keys.includes(s)) keys.push(s);
    const bats = all.filter((s) => s.room && !keys.includes(s)).sort(() => Math.random() - 0.5);
    const bused = new Set();
    const bl = [];
    for (const s of bats) {
      if (bl.length >= this.cfg.bats) break;
      if (bused.has(s.room.id)) continue;
      bl.push(s);
      bused.add(s.room.id);
    }
    this.items = [];
    for (const s of keys) this.items.push(this._item('key', s));
    for (const s of bl) this.items.push(this._item('battery', s));
  }

  _item(kind, s) {
    const g = new THREE.Group();
    const brass = new THREE.MeshStandardMaterial({ color: 0xd8a840, metalness: 0.8, roughness: 0.3, emissive: 0x3a2808 });
    if (kind === 'key') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 14), brass);
      ring.rotation.x = Math.PI / 2;
      ring.position.x = -0.06;
      g.add(ring);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.11, 6), brass);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.x = 0.025;
      g.add(shaft);
      for (const [x, h] of [[0.065, 0.03], [0.045, 0.02]]) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, h), brass);
        tooth.position.set(x, 0, h / 2);
        g.add(tooth);
      }
      g.position.set(s.x, s.y + 0.012, s.z);
      // бирка
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.06), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 1 }));
      tag.position.set(-0.11, 0, 0.02);
      tag.rotation.y = 0.4;
      g.add(tag);
    } else {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.5, emissive: 0x0a2010 }));
      body.rotation.z = Math.PI / 2;
      g.add(body);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.8, roughness: 0.3 }));
      cap.rotation.z = Math.PI / 2;
      cap.position.x = 0.055;
      g.add(cap);
      g.position.set(s.x, s.y + 0.023, s.z);
    }
    g.rotation.y = Math.random() * 6.28;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(kind === 'key' ? '255,210,120' : '150,255,170'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6, fog: false }));
    sp.scale.set(0.3, 0.3, 1);
    sp.position.y = 0.03;
    g.add(sp);
    g.userData.glint = sp;
    this.scene.add(g);
    return { kind, obj: g, s, taken: false };
  }

  // ---------- интерфейс игрока с миром ----------
  sound(name, pos) {
    if (pos) {
      const muffled = this.player && !this.world.los(this.player.pos.x, this.player.pos.z, pos.x, pos.z);
      audio.play(name, 0, { x: pos.x, z: pos.z, muffled });
    } else audio.play(name);
  }
  noise(x, z, r) {
    if (this.monster) this.monster.hear(x, z, r);
  }
  toast(k) {
    this.ui.toast(t(k === 'battery' ? 'noBattery' : k));
  }
  onBatteryEmpty() {
    this.ui.toast(t('batEmpty'));
  }
  onSpotted() {
    if (this.state !== 'play') return;
    this.sound('spotted');
    this.player.flicker = 1;
    if (!this.tips.run && this.night <= 2) {
      this.tips.run = 1;
      this.ui.toast(t('tipRun'));
    }
  }
  onLost() {
    if (this.state !== 'play') return;
    if (!this.tips.lost && this.night <= 2) {
      this.tips.lost = 1;
      this.ui.toast(t('tipLost'));
    }
  }

  // ---------- кадр ----------
  frame(dt) {
    const time = (this.time += dt);
    if (this.state === 'menu') this._menuFrame(dt, time);
    else if (this.state === 'play' && !this.paused) this._playFrame(dt);
    else if (this.state === 'scare') this._scareFrame(dt);
    else if (this.state === 'escape') this._escapeFrame(dt);
    if (this.world) {
      this.world.update(dt, time);
      this._dust(dt);
    }
    // вспышка молнии
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 2.5);
      this.hemi.intensity = 0.42 + (this.flash > 0.4 && Math.random() < 0.5 ? this.flash * 3 : this.flash * 0.6);
    } else this.hemi.intensity += ((this.player && this.player.hidden ? 1.1 : 0.42) - this.hemi.intensity) * Math.min(1, dt * 2);
    if (this.player) audio.setListener(this.camera.position.x, this.camera.position.z, this.player.yaw);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  _menuFrame(dt, time) {
    this.menuT += dt;
    const p = this.player;
    p.yaw = -Math.PI / 2 + Math.sin(this.menuT * 0.35) * 0.22;
    p.pitch = -0.05 + Math.sin(this.menuT * 0.23) * 0.06;
    p.lightOn = true;
    p.battery = p.batMax;
    p.update(0, this.input, this.world, { drain: 0 }, this);
    p.pos.x = 2.6 + Math.sin(this.menuT * 0.2) * 0.2;
    // Жилец медленно покачивается вдали, иногда шагает в сторону
    const m = this.monster;
    m.speed = 0.25;
    m._animate(dt, 0);
    m.mesh.position.x = 12.5 + Math.sin(this.menuT * 0.15) * 0.4;
    if (Math.random() < dt * 0.05) this.flash = 1, setTimeout(() => this.state === 'menu' && this.sound('thunder'), 300);
  }

  _playFrame(dt) {
    const p = this.player,
      m = this.monster,
      w = this.world,
      inp = this.input;
    if (inp.hit('Escape') || inp.hit('KeyP')) {
      if (!inp.locked) this.ui.pause();
    }
    if (inp.hit('KeyF')) p.toggleLight(this);
    if (inp.hit('KeyQ') || inp.hit('KeyR')) this.doFlash();
    p.update(dt, inp, w, this.cfg, this);
    if (this.state !== 'play') return;
    m.update(dt, p, this);
    if (this.state !== 'play') return;
    this.time += 0; // общее время идёт в frame()
    this.nightT = (this.nightT || 0) + dt;
    // предметы
    for (const it of this.items) {
      if (it.taken) continue;
      const g = it.obj.userData.glint;
      g.material.opacity = 0.35 + Math.sin(this.time * 3 + it.s.x) * 0.25;
      const d = Math.hypot(it.s.x - p.pos.x, it.s.z - p.pos.z);
      if (d < 1.25 && !p.hidden) this._take(it);
    }
    // взаимодействие
    this.target = this._findTarget();
    this.ui.setAction(this.target);
    if (inp.hit('KeyE') || inp.hit('Space') || inp.hit('Enter')) this.act();
    // мерцание фонаря рядом с Жильцом
    const md = Math.hypot(m.pos.x - p.pos.x, m.pos.z - p.pos.z);
    p.flicker = md < 5 ? Math.max(p.flicker - dt, (5 - md) / 5) : Math.max(0, p.flicker - dt * 0.5);
    // сердцебиение
    this.heartT -= dt;
    if (md < 11 && this.heartT <= 0) {
      const k = 1 - md / 11;
      audio.play('heart', k);
      this.heartT = 1.1 - k * 0.65;
    }
    // настроение музыки
    audio.setMood(m.state === 'chase' || m.state === 'check' ? 'chase' : md < 9 && m.state !== 'idle' ? 'danger' : 'night');
    // тиканье часов
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = 1;
      for (const c of w.clocks || []) if (Math.hypot(c.x - p.pos.x, c.z - p.pos.z) < 7) this.sound('tick', c);
    }
    // ночные события
    this.eventT -= dt * this.cfg.events;
    if (this.eventT <= 0) {
      this.eventT = 20 + Math.random() * 25;
      this._event();
    }
    // подсказки первой ночи
    if (this.night === 1 && this.nightT > 30 && !this.tips.hide) {
      this.tips.hide = 1;
      this.ui.toast(t('tipHide'));
    }
    if (this.night === 1 && this.nightT > 70 && !this.tips.light) {
      this.tips.light = 1;
      this.ui.toast(t('tipLight'));
    }
    this.ui.updateHud();
  }

  doFlash() {
    const p = this.player,
      m = this.monster;
    if (this.state !== 'play' || p.hidden) return;
    if (!p.flash(this)) return;
    const dx = m.pos.x - p.pos.x,
      dz = m.pos.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    const f = p.forward;
    const dot = (dx * f.x + dz * f.z) / (d * Math.hypot(f.x, f.z) || 1);
    if (d < 9 && dot > 0.8 && this.world.los(p.pos.x, p.pos.z, m.pos.x, m.pos.z) && m.state !== 'stunned') {
      m.stun(this.cfg.stun);
      this.sound('stunned', m.pos);
    }
  }

  _take(it) {
    it.taken = true;
    this.scene.remove(it.obj);
    if (it.kind === 'key') {
      this.keys++;
      this.sound('key');
      // замок на двери исчезает
      const lock = this.world.lockMeshes[this.keys - 1];
      if (lock) lock.visible = false;
      this.ui.toast(this.keys >= this.cfg.keys ? t('gotAllKeys') : t('gotKey', { a: this.keys, b: this.cfg.keys }));
      this.ui.pulse('keys');
    } else {
      const add = 45;
      const p = this.player;
      const before = p.battery;
      p.battery = Math.min(p.batMax, p.battery + (p.batMax * add) / 100);
      this.sound('battery');
      this.ui.toast(t('gotBattery', { p: Math.round(((p.battery - before) / p.batMax) * 100) }));
      this.ui.pulse('bat');
    }
  }

  // ближайший объект, на который смотрим
  _findTarget() {
    const p = this.player,
      w = this.world;
    if (p.hidden) return { kind: 'leave', label: t('leave') };
    const f = p.forward;
    const fl = Math.hypot(f.x, f.z) || 1;
    let best = null,
      bs = 0;
    const consider = (x, z, maxD, obj) => {
      const dx = x - p.pos.x,
        dz = z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > maxD) return;
      const dot = d < 0.6 ? 1 : (dx * f.x + dz * f.z) / (d * fl);
      if (dot < 0.55) return;
      const s = dot - d * 0.15;
      if (s > bs) (bs = s), (best = obj);
    };
    for (const o of w.doorObjs) consider(o.d.x + 0.5, o.d.y + 0.5, 1.9, { kind: 'door', o, label: o.boarded ? t('boarded') : o.open ? t('closeDoor') : t('open') });
    for (const h of w.hides) consider(h.x, h.z, 1.6, { kind: 'hide', h, label: t('hide') });
    consider(EXIT.x + 1, EXIT.y, 2, { kind: 'exit', label: t('escape') });
    return best;
  }

  act() {
    const tg = this.target,
      p = this.player,
      w = this.world;
    if (!tg || this.state !== 'play') return;
    if (tg.kind === 'door') {
      if (tg.o.boarded) {
        this.sound('locked');
        return;
      }
      // не закрывать дверь на себе
      const d = tg.o.d;
      if (tg.o.open && Math.floor(p.pos.x) === d.x && Math.floor(p.pos.z) === d.y) return;
      if (tg.o.open && Math.floor(this.monster.pos.x) === d.x && Math.floor(this.monster.pos.z) === d.y) return;
      w.toggleDoor(tg.o);
      this.sound(tg.o.open ? 'doorOpen' : 'doorClose', { x: d.x + 0.5, z: d.y + 0.5 });
      this.noise(d.x + 0.5, d.y + 0.5, 5 * p.noiseMul);
    } else if (tg.kind === 'hide') {
      p.hidden = true;
      p.hideSpot = tg.h;
      p.yaw = tg.h.ry + Math.PI;
      p.pitch = 0;
      this.sound('hide');
      // если Жилец видел, как мы залезли — он проверит шкаф
      const m = this.monster;
      if (m.state === 'chase' && m.lostT < 0.6 && Math.hypot(m.pos.x - p.pos.x, m.pos.z - p.pos.z) < 8) m.sawHideT = 0;
      this.ui.setHidden(true);
    } else if (tg.kind === 'leave') {
      p.hidden = false;
      const h = p.hideSpot;
      p.pos.set(h.front.x, 0, h.front.z);
      p.hideSpot = null;
      this.sound('hide');
      this.noise(p.pos.x, p.pos.z, 3);
      this.ui.setHidden(false);
    } else if (tg.kind === 'exit') {
      if (this.keys < this.cfg.keys) {
        this.sound('locked');
        this.ui.toast(t('needKeys', { a: this.keys, b: this.cfg.keys }));
        return;
      }
      this._escape();
    }
  }

  // ---------- события ночи ----------
  _event() {
    const p = this.player,
      w = this.world,
      m = this.monster;
    const R = Math.random();
    if (R < 0.25) {
      // где-то хлопает дверь
      const far = w.doorObjs.filter((o) => !o.boarded && o.open && Math.hypot(o.d.x - p.pos.x, o.d.y - p.pos.z) > 5 && Math.hypot(o.d.x - m.pos.x, o.d.y - m.pos.z) > 2);
      const o = far[(Math.random() * far.length) | 0];
      if (o) {
        w.toggleDoor(o, false);
        this.sound('slam', { x: o.d.x + 0.5, z: o.d.y + 0.5 });
      }
    } else if (R < 0.45) {
      this.flash = 1;
      setTimeout(() => this.sound('thunder'), 400 + Math.random() * 900);
    } else if (R < 0.6) {
      const a = Math.random() * 6.28;
      this.sound('whisper', { x: p.pos.x + Math.cos(a) * 3, z: p.pos.z + Math.sin(a) * 3 });
    } else if (R < 0.72 && w.clocks && w.clocks.length) {
      this.sound('chime', w.clocks[0]);
    } else if (R < 0.84) {
      const kids = ROOMS.find((r) => r.id === 'kids');
      if (w.open[ROOMS.indexOf(kids)]) this.sound('ball', { x: 24, z: 4 });
      else this.sound('drip', { x: p.pos.x + 2, z: p.pos.z });
    } else if (m.state !== 'chase') {
      this.sound('growl', m.pos);
    }
  }

  // ---------- поймали ----------
  caught(m, fromHide) {
    if (this.state !== 'play') return;
    if (DBG.god) return;
    this.state = 'scare';
    this.scareT = 0;
    this.caughtCount++;
    const p = this.player;
    if (p.hidden) {
      p.hidden = false;
      p.pos.set(p.hideSpot.front.x, 0, p.hideSpot.front.z);
      p.hideSpot = null;
      this.ui.setHidden(false);
    }
    // смотрим на Жильца
    const dx = m.pos.x - p.pos.x,
      dz = m.pos.z - p.pos.z;
    p.yaw = Math.atan2(-dx, -dz);
    p.pitch = 0.1;
    p.lightOn = true;
    p.battery = Math.max(p.battery, 10);
    this.input.enabled = false;
    this.input.unlock();
    this.sound('scream');
    sdk.gameplay(false);
    this.ui.scare();
    void fromHide;
  }

  _scareFrame(dt) {
    this.scareT += dt;
    const p = this.player,
      m = this.monster;
    const k = Math.min(1, this.scareT / 0.45);
    const dist = 1.3 - k * 0.85;
    const f = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    m.pos.set(p.pos.x + f.x * dist, 0, p.pos.z + f.z * dist);
    m.yaw = Math.atan2(-f.x, -f.z);
    m.state = 'chase';
    m._animate(dt, 3);
    m.mesh.position.y = -0.48 + Math.sin(this.scareT * 40) * 0.02;
    m.mesh.userData.torso.rotation.x = 0.45;
    p.shake = 1;
    p._camera(dt, this);
    p.pitch = 0.18;
    if (this.scareT > 1.4) {
      this.state = 'over';
      audio.setMood('menu');
      this.ui.showCaught(!this.usedSecond);
    }
  }

  // реклама за второй шанс
  secondChance() {
    sdk.showRewarded(() => {
      this.usedSecond = true;
      this.monster.banish(this.player.pos);
      this.state = 'play';
      this.input.reset();
      this.input.enabled = true;
      sdk.gameplay(true);
      audio.setMood('night');
      this.ui.showHud();
    });
  }

  // ---------- побег ----------
  _escape() {
    this.state = 'escape';
    this.escT = 0;
    this.input.enabled = false;
    this.input.unlock();
    this.sound('unlock');
    sdk.gameplay(false);
    this.ui.hideHud();
    for (const l of this.world.locks) l.visible = false;
    // свет рассвета за дверью
    this.dawn = new THREE.PointLight(0xffe0b0, 0, 12, 1.2);
    this.dawn.position.set(EXIT.x + 1, 1.6, EXIT.y + 1);
    this.scene.add(this.dawn);
    setTimeout(() => this.sound('win'), 500);
  }

  _escapeFrame(dt) {
    this.escT += dt;
    const p = this.player;
    const k = Math.min(1, Math.max(0, (this.escT - 0.5) / 1.5));
    this.world.exitDoors[0].rotation.y = -k * 1.6;
    this.world.exitDoors[1].rotation.y = k * 1.6;
    this.dawn.intensity = k * 12;
    this.scene.fog.density = 0.085 * (1 - k * 0.6);
    // шагнуть к свету
    const tx = EXIT.x + 1,
      tz = EXIT.y - 0.5;
    p.pos.x += (tx - p.pos.x) * Math.min(1, dt * 1.2);
    p.pos.z += (tz - p.pos.z) * Math.min(1, dt * 0.8);
    let dy = Math.PI - p.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    p.yaw += dy * Math.min(1, dt * 3);
    p.pitch *= 0.9;
    p._camera(dt, this);
    this.ui.whiteout(Math.max(0, (this.escT - 1.6) / 1));
    if (this.escT > 2.8) {
      this.scene.fog.density = 0.085;
      this.scene.remove(this.dawn);
      this._finish();
    }
  }

  _finish() {
    this.state = 'over';
    audio.setMood('dawn');
    const n = this.night,
      p = this.player;
    const secs = Math.round(this.nightT);
    const timeB = Math.max(0, 900 - secs) * 2;
    const batB = Math.round((p.battery / p.batMax) * 300);
    const clean = this.caughtCount === 0 ? 500 : 0;
    let score = 1000 * n + timeB + batB + clean;
    if (this.nightmare) score *= 2;
    let coins = 60 + 40 * n + (clean ? 40 : 0);
    if (this.nightmare) coins = Math.round(coins * 1.5);
    const book = this.nightmare ? save.data.nm : save.data.nights;
    const prev = book[n] || { best: 0 };
    const record = score > (prev.best || 0);
    book[n] = { done: true, best: Math.max(prev.best || 0, score), time: Math.min(prev.time || 1e9, secs) };
    save.data.coins += coins;
    save.write();
    save.flush();
    sdk.submitScore(save.total());
    this.ui.showWin({ n, secs, keys: this.keys, bat: Math.round((p.battery / p.batMax) * 100), clean: !!clean, score, coins, record, nightmare: this.nightmare, all: n === 5 && !this.nightmare });
  }

  // ×2 монеты за ролик
  doubleCoins(coins, done) {
    sdk.showRewarded(() => {
      this.addCoins(coins);
      done && done();
    });
  }

  // после итогов — полноэкранная реклама в паузе
  afterRound(fn) {
    sdk.showInterstitial(() => fn());
  }

  setPaused(v) {
    this.paused = v;
    sdk.gameplay(!v && this.state === 'play');
    this.input.enabled = !v;
    if (v) this.input.unlock();
    this.input.reset();
  }

  // пыль вокруг игрока
  _dust() {
    const d = this.world.dust;
    if (!d || !this.player) return;
    const a = d.geometry.attributes.position;
    const px = this.player.pos.x,
      pz = this.player.pos.z;
    for (let i = 0; i < a.count; i++) {
      let x = a.getX(i),
        y = a.getY(i) - 0.0015,
        z = a.getZ(i);
      x += Math.sin(this.time * 0.3 + i) * 0.001;
      if (x - px > 5) x -= 10;
      if (x - px < -5) x += 10;
      if (z - pz > 5) z -= 10;
      if (z - pz < -5) z += 10;
      if (y < 0) y = WALL_H;
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
  }
}

export { EYE };
