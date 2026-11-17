// Заезд: сцена трассы, игрок, соперники (призраки и боты), камера, эффекты, финиш
import * as THREE from 'three';
import { buildTrack, pointAt, LAPS, STEP, speedProfile } from './tracks.js';
import { World, PALETTE } from './world.js';
import { makeCar, carStats, CARS, PAINTS } from './cars.js';
import { PlayerCar } from './physics.js';
import { Recorder, Opponent, makeBot, botNames, parseSession, sessionPayloads } from './opponents.js';
import { Particles } from './fx.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { sdk } from './sdk.js';
import { LANG, t } from './i18n.js';
import { rng } from './tracks.js';

export const START_S = -20; // игрок стартует с последнего ряда
const SLOTS = [];
for (let k = 0; k < 10; k++) SLOTS.push({ s: -4 - Math.floor(k / 2) * 4, d: k % 2 ? -3 : 3 });

// подбор соперников: настоящие записи + боты
export async function findOpponents(trackIdx, save) {
  const T = buildTrack(trackIdx);
  const cups = save.cups | 0;
  const power = carStats(save.car, save.cars[save.car].up).power;
  sdk.localGhostName = t('earlier');
  let list = await sdk.mpInit({ meta1: { min: trackIdx, max: trackIdx }, meta2: { min: Math.max(0, cups - 120), max: cups + 120 } }, 9);
  if (list.length < 5) {
    const more = await sdk.mpInit({ meta1: { min: trackIdx, max: trackIdx }, meta2: { min: 0, max: 1000000 } }, 9);
    const ids = new Set(list.map((x) => x.id));
    list = list.concat(more.filter((x) => !ids.has(x.id)));
  }
  const ghosts = [];
  for (const s of list) {
    const g = parseSession(s, T, START_S);
    if (g) ghosts.push(g);
  }
  // ближе всего по времени к лучшему времени игрока (или середина)
  const best = (save.tracks[trackIdx] && save.tracks[trackIdx].best) || 0;
  if (best) ghosts.sort((a, b) => Math.abs(a.time - best) - Math.abs(b.time - best));
  const chosen = ghosts.slice(0, 9);
  // боты на свободные места
  const R = rng(Date.now() % 100000);
  const nBots = 9 - chosen.length;
  const names = botNames(LANG, nBots, Math.floor(R() * 1e6));
  // уровень ботов растёт с рейтингом (кубками), а не с прокачкой игрока — прокачка даёт преимущество
  const tierBase = Math.min(CARS.length - 1, Math.floor(cups / 110));
  const lvlBase = Math.min(5, cups / 70 + trackIdx * 0.15);
  const base = 0.83 + Math.min(0.1, cups / 2600) + trackIdx * 0.004 + (save.races < 1 ? -0.05 : 0);
  for (let k = 0; k < nBots; k++) {
    const tier = Math.max(0, Math.min(CARS.length - 1, tierBase - (R() < 0.5 ? 1 : 0)));
    const ups = [0, 1, 2, 3].map(() => Math.max(0, Math.min(5, Math.round(lvlBase + (R() - 0.5) * 2))));
    chosen.push({
      ...makeBot(T, {
        name: names[k] || 'Racer',
        carId: CARS[tier].id,
        ups,
        paint: PAINTS[Math.floor(R() * PAINTS.length)],
        skill: Math.min(0.99, base + (R() - 0.5) * 0.08 + (k / Math.max(1, nBots)) * 0.04),
        seed: Math.floor(R() * 1e6),
        laneBias: (R() - 0.5) * 3,
      }),
    });
  }
  // сила для расстановки: время призрака или оценка бота
  const L = T.n * STEP;
  for (const c of chosen) {
    if (c.kind === 'ghost') c.est = c.time;
    else {
      let tt = 0;
      for (let i = 0; i < T.n; i++) tt += STEP / Math.max(5, c.prof[i] * c.skill);
      c.est = (tt * LAPS * L) / L;
    }
  }
  chosen.sort((a, b) => b.est - a.est); // медленные — впереди
  return { list: chosen, ghosts: ghosts.length };
}

export class Race {
  constructor(game, trackIdx, opp) {
    this.game = game;
    this.idx = trackIdx;
    this.T = buildTrack(trackIdx);
    const T = this.T;
    this.scene = new THREE.Scene();
    const pal = PALETTE[T.theme];
    this.scene.fog = new THREE.Fog(pal.fog, 160, 900);
    const hemi = new THREE.HemisphereLight(pal.hemiS, pal.hemiG, pal.hemi);
    const sun = new THREE.DirectionalLight(pal.sun, pal.sunI);
    sun.position.set(0.5, 1, -0.6);
    this.scene.add(hemi, sun);
    this.world = new World(T, game.quality);
    this.scene.add(this.world.root);
    const s = game.save.data;
    this.carId = s.car;
    this.paint = s.cars[s.car].paint;
    this.stats = carStats(s.car, s.cars[s.car].up);
    this.player = new PlayerCar(T, this.stats, START_S, SLOTS[9].d);
    this.pModel = makeCar(this.carId, this.paint);
    this.scene.add(this.pModel.group);
    // фары ночью
    if (T.theme === 'night') {
      const spot = new THREE.SpotLight(0xfff2c8, 40, 45, 0.55, 0.6, 1.2);
      spot.position.set(0, 1.2, 1.6);
      spot.target.position.set(0, 0, 14);
      this.pModel.group.add(spot, spot.target);
    }
    this.opps = opp.list.map((src, k) => new Opponent(T, src, SLOTS[k].s, SLOTS[k].d, START_S));
    this.oModels = this.opps.map((o) => {
      const m = makeCar(o.car, o.paint);
      this.scene.add(m.group);
      return m;
    });
    this.ghostCount = opp.ghosts;
    this.rec = new Recorder();
    this.sparks = new Particles(400, true);
    this.smoke = new Particles(260, false);
    this.scene.add(this.sparks.points, this.smoke.points);
    this.t = -4.2; // отсчёт
    this.state = 'count';
    this.coins = 0;
    this.lapShown = 1;
    this.finished = false;
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camYaw = this.player.h;
    this.shake = 0;
    this.fovBoost = 0;
    this.lastCount = 4;
    this.tutStep = s.tut || 0;
    this.tutT = 0;
    this.lastBoostPad = -1;
    this.place = 10;
    this.placeSmooth = 10;
    this.autopilot = !!(window.__CR_DEBUG && window.__CR_DEBUG.bot);
    this.renderPlayer();
    this.initCamera(true);
    // заранее рассчитанный профиль для автопилота
    this.apProf = speedProfile(T, this.stats.vmax, this.stats.turn, this.stats.accel);
  }

  dispose() {
    this.world.dispose();
    this.scene.traverse((o) => {
      if (o.isMesh && o.material && o.material.dispose) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  }

  initCamera(instant) {
    const p = this.player;
    const fx = Math.sin(p.h),
      fz = Math.cos(p.h);
    this.camPos.set(p.x - fx * 9, p.y + 4.5, p.z - fz * 9);
    this.camLook.set(p.x + fx * 6, p.y + 1, p.z + fz * 6);
    if (instant) {
      // пролёт: начинаем высоко над стартом
      this.camPos.set(p.x - fx * 30 + Math.cos(p.h) * 18, p.y + 22, p.z - fz * 30);
    }
  }

  // автопилот (для тестов и после финиша)
  autoInput() {
    const p = this.player,
      T = this.T;
    const n = T.n;
    const i = p.hint;
    const look = 9 + Math.floor(p.speed * 0.35);
    const j = (i + look) % n;
    const tx = T.x[j] + T.nx[j] * T.line[j] * 0.85,
      tz = T.z[j] + T.nz[j] * T.line[j] * 0.85;
    const want = Math.atan2(tx - p.x, tz - p.z);
    let dh = p.h - want;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, dh * 2.6));
    const vlim = this.apProf[(i + 6) % n] * 1.04;
    return { steer, brake: p.vf > vlim + 1.5, drift: false, nitro: p.nitro >= 1 && Math.abs(steer) < 0.2 };
  }

  update(dt) {
    const T = this.T,
      p = this.player,
      L = T.n * STEP;
    this.t += dt;
    const racing = this.t >= 0;
    // отсчёт
    if (this.t < 0) {
      const c = Math.ceil(-this.t);
      if (c !== this.lastCount && c <= 3) {
        this.lastCount = c;
        this.world.setLights(4 - c);
        audio.play('beep');
        this.game.ui.count(c);
      }
    } else if (this.lastCount !== 0) {
      this.lastCount = 0;
      this.world.setLights(4);
      audio.play('go');
      this.game.ui.count(0);
      sdk.gameplay(true);
      this.world.cheer = 1;
      setTimeout(() => (this.world.cheer = 0.25), 3000);
    }
    // управление
    let inp = input.read(dt);
    if (this.autopilot || this.finished) {
      const a = this.autoInput();
      if (this.finished) a.nitro = false;
      if (this.autopilot && window.__CR_DEBUG.drift) a.drift = Math.abs(a.steer) > 0.5;
      inp = a;
    }
    if (inp.nitro && racing) p.useNitro();
    // физика мелкими шагами, чтобы на слабых устройствах не «пролетать» бортики
    const n = Math.max(1, Math.ceil(dt * 60 - 0.01));
    for (let k = 0; k < n; k++) p.step(dt / n, inp, !racing);
    if (racing && !this.finished) this.rec.push(this.t, p);
    // долго едем не туда — разворачиваем
    if (p.wrongT > 3.5) p.respawn();
    // события
    for (const e of p.ev) {
      if (e.startsWith('boost:')) {
        const k = e.slice(6);
        audio.play(k === 'pad' ? 'boost' : k);
        this.fovBoost = 1;
      } else if (e === 'nitro') {
        audio.play('nitro');
        this.fovBoost = 1;
      } else if (e.startsWith('hit:')) {
        const imp = +e.slice(4);
        audio.play('hit', imp / 10);
        this.shake = Math.min(0.6, imp * 0.04);
        for (let k = 0; k < 8; k++) this.sparks.emit(p.x, p.y + 0.6, p.z, (Math.random() - 0.5) * 6, 2 + Math.random() * 3, (Math.random() - 0.5) * 6, 0.35, 0.6, 0.1, 0xffd27a, 1, 9);
      }
    }
    p.ev.length = 0;
    // ускорители
    for (let k = 0; k < T.boosts.length; k++) {
      const b = T.boosts[k];
      const ds = (((p.sPrev - b.i * STEP) % L) + L) % L;
      if (ds < 3 && Math.abs(p.d - b.d) < 2.2 && racing) {
        if (this.lastBoostPad !== k) {
          p.boost(1.3, 'pad');
          p.nitro = Math.min(1, p.nitro + 0.08);
        }
        this.lastBoostPad = k;
      } else if (this.lastBoostPad === k && ds > 6) this.lastBoostPad = -1;
    }
    // монеты
    const W = this.world;
    for (let k = 0; k < W.coinPos.length; k++) {
      if (W.coinTaken[k]) continue;
      const c = W.coinPos[k];
      if (Math.abs(c.x - p.x) < 2 && Math.abs(c.z - p.z) < 2 && Math.abs(c.y - 1.1 - p.y) < 2.5) {
        W.coinTaken[k] = 1;
        if (!this.finished) this.coins++;
        p.nitro = Math.min(1, p.nitro + 0.035);
        audio.play('coin');
        for (let q = 0; q < 6; q++) this.sparks.emit(c.x, c.y, c.z, (Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4, 0.4, 0.8, 0.2, 0xffe066, 1, 6);
      }
    }
    // круги
    const lap = Math.max(1, Math.min(LAPS, Math.floor(p.sTotal / L) + 1));
    if (lap > this.lapShown && !this.finished) {
      this.lapShown = lap;
      W.resetCoins();
      if (lap === LAPS) {
        audio.play('finalLap');
        audio.setMood('boss');
        this.game.ui.banner(t('finalLap'));
      } else {
        audio.play('lap');
        this.game.ui.banner(t('lapN', { n: lap, m: LAPS }));
      }
    }
    // соперники
    for (const o of this.opps) o.update(this.t, dt, p.sTotal);
    // финиш
    if (!this.finished && p.sTotal >= LAPS * L) this.finish();
    // места
    if (!this.finished) {
      let place = 1;
      for (const o of this.opps) if (o.finished || o.s > p.sTotal) place++;
      this.place = place;
    }
    this.renderPlayer(dt);
    this.renderOpps(dt);
    this.effects(dt);
    this.camera(dt);
    W.update(dt, Math.max(0, this.t + 5), this.game.camera);
    this.sparks.update(dt);
    this.smoke.update(dt);
    // звук мотора
    audio.engineUpdate(p.speed, this.stats.vmax, p.drift ? 1 : 0, p.boostT > 0 || p.nitroT > 0 ? 1 : 0);
    this.tutorial(dt);
  }

  tutorial(dt) {
    if (this.finished || this.t < 0) return;
    this.tutT += dt;
    const ui = this.game.ui;
    const p = this.player;
    if (this.tutStep !== (this.game.save.data.tut || 0)) this.game.save.data.tut = this.tutStep;
    if (this.tutStep === 0 && this.tutT > 0.5) {
      ui.hint(input.isTouch ? t('tutSteerTouch') : t('tutSteer'));
      this.tutStep = 1;
      this.tutT = 0;
    } else if (this.tutStep === 1 && this.tutT > 6) {
      ui.hint(t('tutDrift'));
      this.tutStep = 2;
      this.tutT = 0;
    } else if (this.tutStep === 2 && this.tutT > 9) {
      ui.hint(t('tutBoost'));
      this.tutStep = 3;
      this.tutT = 0;
    } else if (this.tutStep === 3 && p.nitro >= 1 && this.tutT > 4) {
      ui.hint(t('tutNitro'));
      this.tutStep = 4;
      this.game.save.data.tut = 4;
    }
  }

  renderPlayer(dt = 0) {
    const p = this.player,
      m = this.pModel;
    m.group.position.set(p.x, p.y, p.z);
    m.group.rotation.set(0, 0, 0);
    m.group.rotation.y = p.h;
    m.group.rotateX(-p.pitch);
    // лёгкий крен в повороте
    m.group.rotateZ(-p.steerVis * 0.12 * Math.min(1, p.speed / 20));
    m.spin(p.vf * dt);
    m.steer(-p.steerVis);
  }

  renderOpps(dt) {
    const T = this.T,
      p = this.player;
    const q = {};
    this.opps.forEach((o, k) => {
      const m = this.oModels[k];
      pointAt(T, o.s, o.d, q);
      const prevS = m._s ?? o.s;
      m._s = o.s;
      m.group.position.set(q.x, q.y, q.z);
      m.group.rotation.set(0, 0, 0);
      m.group.rotation.y = Math.atan2(q.tx, q.tz) + o.yaw;
      m.group.rotateX(-Math.atan(q.slope));
      m.spin(o.s - prevS);
      const dist = Math.hypot(q.x - p.x, q.z - p.z);
      // соперники проходят сквозь игрока: рядом с ним и с камерой становятся прозрачными
      const cam = this.game.camera.position;
      const dc = Math.hypot(q.x - cam.x, q.z - cam.z);
      const cp = Math.hypot(p.x - cam.x, p.z - cam.z);
      let op = dist < 6 ? 0.5 : 1;
      // между камерой и игроком — почти прозрачные, чтобы не закрывать обзор
      if (dc < cp + 1.5) op = Math.min(op, 0.12 + 0.25 * Math.max(0, Math.min(1, (dc - 3) / Math.max(1, cp - 3))));
      m.setOpacity(op);
      o._x = q.x;
      o._y = q.y;
      o._z = q.z;
      o._dist = dist;
      // искры дрифта и пламя ускорения у соперников (пореже)
      if (o.flags & 1 && Math.random() < 0.5) this.flame(m.group, 0x7ad7ff);
    });
  }

  flame(group, color) {
    const h = group.rotation.y;
    const fx = Math.sin(h),
      fz = Math.cos(h);
    const x = group.position.x - fx * 2.0,
      z = group.position.z - fz * 2.0;
    this.sparks.emit(x, group.position.y + 0.6, z, -fx * 6 + (Math.random() - 0.5), 0.5, -fz * 6 + (Math.random() - 0.5), 0.25, 1.4, 0.3, color, 0.9, 0);
  }

  effects(dt) {
    const p = this.player;
    const fx = Math.sin(p.h),
      fz = Math.cos(p.h);
    const lx = Math.cos(p.h),
      lz = -Math.sin(p.h);
    if (p.drift) {
      const col = p.driftT > 1.7 ? 0xff9a3c : p.driftT > 0.75 ? 0x5ad1ff : 0xffffff;
      for (const s of [-1, 1]) {
        const x = p.x - fx * 1.3 + lx * s * 0.9,
          z = p.z - fz * 1.3 + lz * s * 0.9;
        if (p.driftT > 0.75) this.sparks.emit(x, p.y + 0.2, z, (Math.random() - 0.5) * 3 - fx * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 3 - fz * 2, 0.3, 0.7, 0.1, col, 1, 8);
        if (Math.random() < 0.6) this.smoke.emit(x, p.y + 0.3, z, (Math.random() - 0.5), 0.6, (Math.random() - 0.5), 0.8, 1.2, 3.5, 0xffffff, 0.35, -0.5);
      }
    }
    if (p.boostT > 0 || p.nitroT > 0) {
      const col = p.nitroT > 0 ? 0xff7a3c : p.boostKind === 'turbo2' ? 0xff9a3c : 0x7ad7ff;
      for (let k = 0; k < 2; k++) this.flame(this.pModel.group, col);
    }
    this.fovBoost = Math.max(p.boostT > 0 || p.nitroT > 0 ? 1 : 0, this.fovBoost - dt * 1.5);
  }

  camera(dt) {
    const p = this.player,
      cam = this.game.camera;
    const portrait = this.game.h > this.game.w;
    const dist = (portrait ? 8.2 : 7.6) + Math.min(2, p.speed * 0.03);
    const height = portrait ? 3.7 : 3.2;
    if (this.finished) {
      // облёт вокруг машины после финиша
      this.orbit = (this.orbit || 0) + dt * 0.35;
      const a = p.h + Math.PI * 0.8 + this.orbit;
      const tp = new THREE.Vector3(p.x + Math.sin(a) * 9, p.y + 3.5, p.z + Math.cos(a) * 9);
      this.camPos.lerp(tp, 1 - Math.exp(-dt * 3));
      this.camLook.lerp(new THREE.Vector3(p.x, p.y + 1, p.z), 1 - Math.exp(-dt * 6));
    } else {
      // направление камеры — между курсом и вектором скорости (мягко в заносе)
      const vh = p.speed > 3 ? Math.atan2(p.vx, p.vz) : p.h;
      let target = p.h + angDiff(vh, p.h) * 0.6;
      this.camYaw += angDiff(target, this.camYaw) * (1 - Math.exp(-dt * (this.t < 0 ? 3 : 7)));
      const fx = Math.sin(this.camYaw),
        fz = Math.cos(this.camYaw);
      const tp = new THREE.Vector3(p.x - fx * dist, p.y + height, p.z - fz * dist);
      const k = this.t < -1 ? 1 - Math.exp(-dt * 1.6) : 1 - Math.exp(-dt * 10);
      this.camPos.lerp(tp, k);
      // камера не ниже дороги
      this.camLook.set(p.x + fx * 5, p.y + (portrait ? 0.4 : 1.1), p.z + fz * 5);
    }
    cam.position.copy(this.camPos);
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shake;
      cam.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 2);
    }
    cam.lookAt(this.camLook);
    const base = portrait ? 72 : 62;
    const fov = base + this.fovBoost * 9;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 5);
      cam.updateProjectionMatrix();
    }
  }

  finish() {
    this.finished = true;
    const p = this.player;
    const time = this.t - Math.max(0, (p.sTotal - LAPS * this.T.n * STEP) / Math.max(1, p.speed));
    this.time = time;
    this.rec.push(this.t, p, true); // последняя точка — за линией финиша
    // место: соперники, финишировавшие раньше (у призраков — по их записанному времени)
    let place = 1;
    for (const o of this.opps) if (o.estimate(this.t) < time) place++;
    this.place = place;
    sdk.gameplay(false);
    audio.play(place <= 3 ? 'win' : 'finish');
    this.world.cheer = 1;
    this.recordSession();
    this.game.onFinish(this);
  }

  // таблица результатов
  results() {
    const rows = this.opps.map((o) => ({ name: o.name, time: o.estimate(this.t), car: o.car, paint: o.paint, you: false }));
    rows.push({ name: t('you'), time: this.time, you: true, car: this.carId, paint: this.paint });
    rows.sort((a, b) => a.time - b.time);
    return rows;
  }

  // отправить свой заезд, чтобы другие игроки могли с ним соревноваться
  recordSession() {
    if (this.autopilot && !(window.__CR_DEBUG && window.__CR_DEBUG.pushBot)) return;
    const s = this.game.save.data;
    const name = sdk.playerName();
    const pl = sessionPayloads(this.rec, this.T, this.carId, this.paint, name, this.time);
    for (const x of pl) sdk.mpCommit(x);
    sdk.mpPush({ meta1: this.idx, meta2: s.cups | 0, meta3: this.stats.power });
  }
}

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
