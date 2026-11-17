// Игра: партия, ходы людей и ботов, анимации костей, рука игрока, камера
import * as THREE from 'three';
import * as R from './rules.js';
import { Scene3D } from './scene.js';
import { TileKit, makeGhost, TH } from './tiles.js';
import { Snake, layoutRound } from './layout.js';
import { UI } from './ui.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap } from './iap.js';
import { pickBots } from './avatars.js';
import { t } from './i18n.js';
import { WIN_COINS, ROUND_COINS, LOSE_COINS, RATING, PLACES, HINT_ROUNDS } from './data.js';

const DBG = window.__DD_DEBUG || {};
if (window.__DD_DEBUG) window.__R = { ...R, pickBots };
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const V = new THREE.Vector3();

export class Game {
  constructor() {
    this.state = 'boot';
    this.tw = [];
    this.paused = false;
    this.flow = 0; // меняется при выходе из партии — старые асинхронные цепочки останавливаются
  }

  async start(canvas, uiRoot) {
    await save.load();
    const d = save.data;
    this.s3 = new Scene3D(canvas);
    this.kit = new TileKit();
    this.kit.setSkin(d.skin);
    this.s3.setTable(d.table);
    this.s3.setPlace(d.place);
    this.tiles = this.kit.tiles;
    for (const tl of this.tiles) {
      tl.visible = false;
      this.s3.board.add(tl);
    }
    this.handG = new THREE.Group();
    this.s3.cam.add(this.handG);
    this.ghosts = [makeGhost(), makeGhost()];
    this.ghosts.forEach((g) => {
      g.visible = false;
      this.s3.board.add(g);
    });
    this.ray = new THREE.Raycaster();
    this.ui = new UI(this, uiRoot);
    sdk.noAds = !!d.noAds;
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
      () => save.flush()
    );
    iap.onChange(() => this.ui.refreshTop());
    window.addEventListener('resize', () => this.onResize());
    canvas.addEventListener('pointerdown', (e) => this.onPointer(e));
    this.onResize();
    this.toHome();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(DBG.bot || DBG.fastdt ? 0.3 : 0.05, (now - last) / 1000);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    if (!DBG.manual) requestAnimationFrame(loop);
  }

  addCoins(n) {
    save.data.coins += n;
    this.ui.refreshTop();
  }

  onResize() {
    this.s3.resize();
    this.updateRegion();
    this.ui.onResize && this.ui.onResize();
  }

  updateRegion() {
    const hm = this.state === 'match' ? this.handMetrics() : null;
    if (hm) document.documentElement.style.setProperty('--hb', Math.round(hm.h + 4) + 'px');
    const m = this.ui.boardMargins(hm);
    this.s3.setRegion(m);
    this.refit(false);
  }

  // ---------- кадр ----------
  frame(dt) {
    if (!this.paused) {
      for (let i = this.tw.length - 1; i >= 0; i--) {
        const w = this.tw[i];
        w.t += dt;
        const k = Math.min(1, w.t / w.dur);
        w.fn && w.fn(k);
        if (k >= 1) {
          this.tw.splice(i, 1);
          w.res();
        }
      }
    }
    if (this.state === 'home') this.s3.yaw = Math.sin(this.s3.t * 0.12) * 0.22;
    this.s3.update(dt);
    if (this.state === 'match') this.layoutHand(dt);
    this.s3.render();
    if (this.state === 'match') this.ui.frame && this.ui.frame();
  }

  tween(dur, fn) {
    return new Promise((res) => this.tw.push({ t: 0, dur, fn, res }));
  }
  wait(sec) {
    return this.tween(sec, null);
  }
  get speed() {
    return save.data.settings.fast ? 0.55 : 1;
  }
  // подсказки ходов: «авто» — только первые коны, потом игрок ищет ходы сам
  get hintsOn() {
    const h = save.data.settings.hints;
    return h === 'on' || (h !== 'off' && save.data.stats.rounds < HINT_ROUNDS);
  }

  // ---------- главный экран: на столе красивая «змейка» ----------
  toHome() {
    this.flow++;
    this.tw.length = 0;
    this.state = 'home';
    this.M = null;
    this.paused = false;
    sdk.gameplay(false);
    audio.setIntensity(0);
    this.clearBoard();
    const chain = [[6, 6], [6, 3], [3, 3], [3, 5], [5, 1], [1, 1]];
    const left = [[6, 4], [4, 2], [2, 2], [2, 0]];
    const sn = new Snake(9);
    const place = (id, p, faceDown = false) => {
      const tl = this.tiles[id];
      tl.visible = true;
      this.s3.board.attach(tl);
      tl.position.set(p.x, TH / 2, p.z);
      tl.quaternion.setFromEuler(E.set(0, p.rot, faceDown ? Math.PI : 0));
      tl.scale.setScalar(1);
      this.shadows(tl, true);
    };
    let id = R.tileId(6, 6);
    place(id, sn.placeFirst(id, 6));
    let v = 6;
    for (const [a, b] of chain.slice(1)) {
      id = R.tileId(a, b);
      place(id, sn.next('R', id, v));
      v = a === v ? b : a;
    }
    v = 6;
    for (const [a, b] of left) {
      id = R.tileId(a, b);
      place(id, sn.next('L', id, v));
      v = a === v ? b : a;
    }
    // несколько костей лежат рядом рубашкой вверх
    [[0, 5], [1, 4], [0, 3], [2, 6], [4, 4]].forEach(([a, b], i) => {
      const k = R.tileId(a, b);
      place(k, { x: -6 + i * 2.6 + (i % 2) * 0.5, z: 5.6 + (i % 2) * 1.4, rot: 0.3 - i * 0.4 }, i !== 4);
    });
    this.homeBB = { x0: -17, x1: 17, z0: -12, z1: 13 };
    this.updateRegion();
    this.s3.fit(this.homeBB, true);
    this.ui.home();
  }

  shadows(tl, on) {
    const b = tl.userData.body;
    b.castShadow = on;
    b.receiveShadow = on;
  }

  clearBoard() {
    for (const tl of this.tiles) {
      tl.visible = false;
      this.s3.board.attach(tl);
      tl.scale.setScalar(1);
      this.kit.glow(tl.userData.id, 0);
    }
    this.ghosts.forEach((g) => (g.visible = false));
    this.choice = null;
  }

  // ---------- партия ----------
  // cfg: { mode, n, target, diff }
  newMatch(cfg) {
    const seed = DBG.seed || Math.floor(Math.random() * 1e9);
    const m = R.newMatch({ ...cfg, seed });
    const bots = pickBots(m.n - 1, seed);
    save.data.last = { ...cfg };
    save.data.cur = null;
    save.write();
    this.beginMatch({ m, bots, r: null });
  }

  continueMatch() {
    const c = save.data.cur;
    if (!c) return;
    this.beginMatch(JSON.parse(JSON.stringify(c)));
  }

  beginMatch({ m, bots, r, xmax }) {
    this.flow++;
    this.tw.length = 0;
    this.state = 'match';
    this.s3.yaw = 0;
    this.paused = false;
    this.clearBoard();
    const lv = m.diff;
    this.M = {
      m,
      r: null,
      players: [{ name: t('you'), me: true }].concat(bots.map((b) => ({ ...b, lvl: lv }))),
      bots,
      rand: R.rng(m.seed ^ 0x5bd1e995),
      xmax: xmax || 0,
    };
    audio.setIntensity(1);
    audio.setMood(this.placeMood());
    this.ui.matchHUD();
    this.updateRegion();
    if (r) this.resumeRound(r);
    else this.nextRound();
  }

  placeMood() {
    const p = PLACES.find((x) => x.id === save.data.place);
    return p ? p.mood : 'game';
  }

  persist() {
    const M = this.M;
    if (!M) return;
    save.data.cur = M.m.done ? null : { m: M.m, bots: M.bots, r: M.r && !M.r.over ? M.r : null, xmax: M.xmax };
    save.write();
  }

  // ширина ряда цепочки под пропорции экрана
  pickXmax() {
    const reg = this.s3.region;
    const aspect = ((reg.x1 - reg.x0) * this.s3.W) / ((reg.y1 - reg.y0) * this.s3.H);
    return Math.max(4.6, Math.min(8.6, 3.4 + aspect * 2.2));
  }

  async nextRound() {
    const M = this.M;
    const flow = this.flow;
    M.r = R.startRound(M.m);
    M.xmax = this.pickXmax();
    M.snake = new Snake(M.xmax);
    M.poses = [];
    this.clearBoard();
    this.ui.updatePlates();
    this.persist();
    sdk.gameplay(true);
    await this.dealAnim();
    if (flow !== this.flow) return;
    this.ui.roundStartTip();
    this.loop();
  }

  resumeRound(r) {
    const M = this.M;
    M.r = r;
    M.xmax = M.xmax || this.pickXmax();
    const { sn, out } = layoutRound(r, M.xmax);
    M.snake = sn;
    M.poses = out;
    for (const p of out) {
      const tl = this.tiles[p.id];
      tl.visible = true;
      this.s3.board.attach(tl);
      tl.position.set(p.x, TH / 2, p.z);
      tl.quaternion.setFromEuler(E.set(0, p.rot, 0));
      this.shadows(tl, true);
    }
    for (const id of r.hands[0]) this.toHand(id, true);
    this.ui.updatePlates();
    this.refit(true);
    sdk.gameplay(true);
    this.loop();
  }

  // раздача: кости перемешиваются в центре стола рубашкой вверх и разлетаются игрокам
  async dealAnim() {
    const M = this.M;
    const r = M.r;
    const sp = this.speed;
    const ids = R.TILES.map((_, i) => i);
    const rnd = M.rand;
    this.refit(true);
    const pile = ids.map((id) => {
      const a = rnd() * Math.PI * 2,
        rr = Math.sqrt(rnd()) * 5.5;
      return { id, x: Math.cos(a) * rr, z: Math.sin(a) * rr * 0.8, rot: rnd() * Math.PI, ph: rnd() * 6 };
    });
    for (const p of pile) {
      const tl = this.tiles[p.id];
      tl.visible = true;
      this.s3.board.attach(tl);
      tl.scale.setScalar(1);
      tl.position.set(p.x, TH / 2, p.z);
      tl.quaternion.setFromEuler(E.set(0, p.rot, Math.PI));
      this.shadows(tl, true);
    }
    audio.play('shuffle');
    let lastClack = 0;
    await this.tween(1.1 * sp, (k) => {
      const tt = k * 6;
      for (const p of pile) {
        const tl = this.tiles[p.id];
        const amp = Math.sin(k * Math.PI) * 1.8;
        tl.position.x = p.x + Math.cos(tt + p.ph) * amp;
        tl.position.z = p.z + Math.sin(tt * 0.8 + p.ph) * amp;
        tl.quaternion.setFromEuler(E.set(0, p.rot + k * 2 * Math.sin(p.ph), Math.PI));
      }
      if (k - lastClack > 0.12) {
        lastClack = k;
        audio.play('clack', 0.4);
      }
    });
    // раздача по кругу
    const order = [];
    for (let i = 0; i < 7; i++) for (let p = 0; p < r.n; p++) order.push({ p, id: r.hands[p][i] });
    // в руке игрока порядок отсортирован, раздаём в порядке руки
    const flights = [];
    order.forEach((o, i) => {
      flights.push(
        this.wait(i * 0.035 * sp).then(() => {
          if (o.p === 0) return this.flyToHand(o.id, 0.42 * sp);
          return this.flyToSeat(o.id, o.p, 0.4 * sp);
        })
      );
    });
    // остаток — в базар
    r.bone.forEach((id, i) => {
      flights.push(this.wait((order.length + i) * 0.025 * sp).then(() => this.flyToBone(id, 0.35 * sp)));
    });
    await Promise.all(flights);
    this.ui.updatePlates();
  }

  // поза слота руки (в системе координат камеры)
  handMetrics() {
    const W = this.s3.W,
      H = this.s3.H;
    const n = this.M && this.M.r ? this.M.r.hands[0].length : 7;
    const pad = 12;
    const base = Math.min(H * 0.105, W < H ? 76 : 84);
    let rows = 1,
      per = Math.max(n, 1);
    let tw = Math.min(base, (W - 2 * pad) / (per * 1.12));
    if (tw < base * 0.66 && n > 7) {
      rows = 2;
      per = Math.ceil(n / 2);
      tw = Math.min(base * 0.82, (W - 2 * pad) / (per * 1.12));
    }
    const gap = tw * 0.12;
    const bottom = 12 + (this.ui.safeBottom ? this.ui.safeBottom() : 0);
    const h = rows * tw * 2 + (rows - 1) * gap * 1.6 + tw * 0.3 + bottom;
    return { tw, rows, per, gap, bottom, h, n };
  }

  slotPose(i, hm, raise = 0) {
    const W = this.s3.W,
      H = this.s3.H;
    const row = hm.rows === 2 ? (i < hm.per ? 0 : 1) : 0;
    const k = hm.rows === 2 ? (row === 0 ? i : i - hm.per) : i;
    const cnt = hm.rows === 2 ? (row === 0 ? hm.per : hm.n - hm.per) : hm.n;
    const step = hm.tw * 1.12;
    const cx = W / 2 + (k - (cnt - 1) / 2) * step;
    const rowsBelow = hm.rows - 1 - row;
    const cy = H - hm.bottom - hm.tw - rowsBelow * (hm.tw * 2 + hm.gap * 1.6) - raise * hm.tw;
    const D = 14;
    const p = this.s3.camPoint(cx, cy, D);
    const sc = hm.tw * this.s3.unitsPerPx(D);
    return { p, sc, cx, cy };
  }

  layoutHand(dt) {
    const M = this.M;
    if (!M || !M.r) return;
    const hand = M.r.hands[0];
    const hm = this.handMetrics();
    const my = M.r.turn === 0 && !M.r.over && !this.busy;
    const moves = my ? R.movesFor(M.r, 0) : [];
    const playable = new Set(moves.map((m) => m.id));
    const k = 1 - Math.exp(-dt * 14);
    const hl = this.hintsOn;
    hand.forEach((id, i) => {
      const tl = this.tiles[id];
      if (tl.parent !== this.handG || tl.userData.flying) return;
      const sel = this.choice && this.choice.id === id;
      const raise = sel ? 0.42 : my && hl && playable.has(id) ? 0.16 : 0;
      const s = this.slotPose(i, hm, raise);
      tl.position.lerp(s.p, k);
      const cur = tl.scale.x;
      tl.scale.setScalar(cur + (s.sc - cur) * k);
      tl.quaternion.slerp(Q.setFromEuler(E.set(Math.PI / 2 - 0.1, 0, 0)), k);
      this.kit.glow(id, !my || !hl ? 0 : playable.has(id) ? (sel ? 1 : 0.6) : -1, this.s3.t);
    });
    if (this._hmKey !== hm.n + ':' + hm.rows) {
      this._hmKey = hm.n + ':' + hm.rows;
      this.updateRegion();
    }
  }

  // кость прилетает в руку игрока
  async flyToHand(id, dur) {
    const tl = this.tiles[id];
    const r = this.M.r;
    const i = r.hands[0].indexOf(id);
    const hm = this.handMetrics();
    const s = this.slotPose(Math.max(0, i), hm);
    // целевая поза в мире
    const tmp = new THREE.Object3D();
    this.handG.add(tmp);
    tmp.position.copy(s.p);
    tmp.quaternion.setFromEuler(E.set(Math.PI / 2 - 0.1, 0, 0));
    tmp.scale.setScalar(s.sc);
    tmp.updateMatrixWorld(true);
    const pos = new THREE.Vector3(),
      quat = new THREE.Quaternion(),
      sc = new THREE.Vector3();
    tmp.matrixWorld.decompose(pos, quat, sc);
    this.handG.remove(tmp);
    this.s3.scene.attach(tl);
    tl.userData.flying = true;
    this.shadows(tl, false);
    await this.fly(tl, pos, quat, sc.x, dur, 2);
    tl.userData.flying = false;
    this.toHand(id);
    audio.play('deal');
  }

  toHand(id, instant = false) {
    const tl = this.tiles[id];
    tl.visible = true;
    this.handG.attach(tl);
    this.shadows(tl, false);
    if (instant) {
      const r = this.M.r;
      const s = this.slotPose(r.hands[0].indexOf(id), this.handMetrics());
      tl.position.copy(s.p);
      tl.scale.setScalar(s.sc);
      tl.quaternion.setFromEuler(E.set(Math.PI / 2 - 0.1, 0, 0));
    }
  }

  seatWorld(p, y = 7) {
    const sp = this.ui.seatScreen(p);
    return this.s3.worldAt(sp.x, sp.y, y);
  }

  async flyToSeat(id, p, dur) {
    const tl = this.tiles[id];
    this.s3.scene.attach(tl);
    const to = this.seatWorld(p, 9);
    const q = tl.quaternion.clone();
    await this.fly(tl, to, q, 0.35, dur, 2);
    tl.visible = false;
    this.s3.board.attach(tl);
    this.ui.updatePlates();
  }

  async flyToBone(id, dur) {
    const tl = this.tiles[id];
    this.s3.scene.attach(tl);
    const sp = this.ui.boneScreen();
    const to = this.s3.worldAt(sp.x, sp.y, 9);
    await this.fly(tl, to, tl.quaternion.clone(), 0.35, dur, 1.5);
    tl.visible = false;
    this.s3.board.attach(tl);
  }

  // полёт кости: позиция с дугой, поворот, масштаб
  fly(tl, toPos, toQuat, toScale, dur, arc = 3) {
    const p0 = tl.position.clone(),
      q0 = tl.quaternion.clone(),
      s0 = tl.scale.x;
    return this.tween(dur, (k) => {
      const e = ease(k);
      tl.position.lerpVectors(p0, toPos, e);
      tl.position.y += Math.sin(Math.PI * e) * arc;
      tl.quaternion.slerpQuaternions(q0, toQuat, e);
      tl.scale.setScalar(s0 + (toScale - s0) * e);
    });
  }

  // ---------- ход за ходом ----------
  async loop() {
    const flow = this.flow;
    const M = this.M;
    const r = M.r;
    this.busy = false;
    while (flow === this.flow && !r.over) {
      this.ui.updatePlates();
      if (r.turn === 0) {
        await this.humanTurn();
      } else {
        await this.botTurn(r.turn);
      }
      if (flow !== this.flow) return;
      this.persist();
    }
    if (flow !== this.flow) return;
    await this.roundOver();
  }

  humanTurn() {
    const M = this.M;
    const r = M.r;
    return new Promise(async (resolve) => {
      this._resolveHuman = resolve;
      this.busy = false;
      this.choice = null;
      if (!R.canMove(r, 0)) {
        if (r.bone.length) {
          // нечем ходить — ждём нажатия «Базар» (или авто, если включено)
          this.ui.needDraw(true);
          if (DBG.bot) this.humanDraw();
          return;
        }
        this.busy = true;
        this.ui.toast(t('passMe'));
        audio.play('knock');
        await this.wait(1.1 * this.speed);
        R.pass(r, 0);
        this.ui.bubble(0, t('pass'));
        this.busy = false;
        resolve();
        return;
      }
      this.ui.myTurn(true);
      if (DBG.bot) {
        await this.wait(0.2);
        const mv = R.botMove(r, 0, 2, Math.random);
        this.playHuman(mv.id, mv.side);
      }
    });
  }

  _dbgMoves() {
    return R.movesFor(this.M.r, 0).map((m) => m.id);
  }
  _dbgSides(id) {
    const r = this.M.r;
    if (!r.first) return 1;
    const [L, Rr] = R.ends(r);
    return L !== Rr && R.sidesFor(r, id).length === 2 ? 2 : 1;
  }

  // нажали «Базар»: берём кости, пока не найдётся ход
  async humanDraw() {
    const M = this.M;
    if (!M || this.busy || M.r.turn !== 0 || R.canMove(M.r, 0) || !M.r.bone.length) return;
    const flow = this.flow;
    this.busy = true;
    this.ui.needDraw(false);
    while (!R.canMove(M.r, 0) && M.r.bone.length && flow === this.flow) {
      const id = R.draw(M.r, 0);
      audio.play('draw');
      const tl = this.tiles[id];
      const sp = this.ui.boneScreen();
      tl.visible = true;
      this.s3.scene.attach(tl);
      tl.position.copy(this.s3.worldAt(sp.x, sp.y, 9));
      tl.quaternion.setFromEuler(E.set(0, 0, Math.PI));
      tl.scale.setScalar(0.4);
      this.ui.updatePlates();
      await this.flyToHand(id, 0.38 * this.speed);
      await this.wait(0.12);
    }
    if (flow !== this.flow) return;
    this.busy = false;
    this.persist();
    if (!R.canMove(M.r, 0)) {
      // базар кончился, а хода нет — пропуск
      this.busy = true;
      this.ui.toast(t('passMe'));
      audio.play('knock');
      await this.wait(1.1 * this.speed);
      R.pass(M.r, 0);
      this.ui.bubble(0, t('pass'));
      this.busy = false;
      this._resolveHuman && this._resolveHuman();
      return;
    }
    this.ui.myTurn(true);
  }

  // нажатие на экран: выбор кости в руке
  onPointer(e) {
    if (this.state !== 'match' || this.ui.modalOpen || this.paused) return;
    const M = this.M;
    if (!M || !M.r || M.r.over || M.r.turn !== 0 || this.busy) return;
    audio.unlock();
    const v = new THREE.Vector2((e.clientX / this.s3.W) * 2 - 1, 1 - (e.clientY / this.s3.H) * 2);
    this.ray.setFromCamera(v, this.s3.cam);
    const bodies = M.r.hands[0].map((id) => this.tiles[id].userData.body);
    const hit = this.ray.intersectObjects(bodies, false)[0];
    if (!hit) {
      // мимо — снять выбор
      if (this.choice) this.cancelChoice();
      return;
    }
    this.tapTile(hit.object.userData.tile);
  }

  tapTile(id) {
    const M = this.M;
    const r = M.r;
    if (!r.hands[0].includes(id)) return;
    const moves = R.movesFor(r, 0).filter((m) => m.id === id);
    if (!moves.length) {
      audio.play('deny');
      this.wiggle(id);
      if (!r.first && r.must >= 0) this.ui.toast(t('mustStart', { t: R.TILES[r.must].join('–') }));
      return;
    }
    let sides = R.sidesFor(r, id);
    if (!r.first) sides = ['R'];
    if (sides.length === 2) {
      const [L, Rr] = R.ends(r);
      if (L === Rr) sides = [r.left.length <= r.right.length ? 'L' : 'R'];
    }
    if (sides.length === 1) {
      this.playHuman(id, sides[0]);
      return;
    }
    if (this.choice && this.choice.id === id) return;
    audio.play('select');
    this.choice = { id, sides };
    this.showGhosts();
  }

  cancelChoice() {
    this.choice = null;
    this.ghosts.forEach((g) => (g.visible = false));
    this.ui.markers([]);
    this.refit(false);
  }

  showGhosts() {
    const M = this.M;
    const c = this.choice;
    const list = [];
    c.sides.forEach((side, i) => {
      const [L, Rr] = R.ends(M.r);
      const inner = side === 'L' ? L : Rr;
      const p = M.snake.next(side, c.id, inner, true);
      const g = this.ghosts[i];
      g.visible = this.hintsOn;
      g.position.set(p.x, TH * 0.25, p.z);
      g.rotation.set(0, p.rot, 0);
      list.push({ side, p });
    });
    this.choice.ghosts = list;
    this.refit(false);
    this.ui.markers(list);
  }

  // позиции маркеров выбора на экране
  markerScreens() {
    if (!this.choice || !this.choice.ghosts) return [];
    return this.choice.ghosts.map((g) => ({ side: g.side, ...this.s3.toScreen(new THREE.Vector3(g.p.x, TH, g.p.z)) }));
  }

  chooseSide(side) {
    if (!this.choice) return;
    const id = this.choice.id;
    this.playHuman(id, side);
  }

  wiggle(id) {
    const tl = this.tiles[id];
    const x0 = tl.position.x;
    tl.userData.flying = true;
    this.tween(0.3, (k) => {
      tl.position.x = x0 + Math.sin(k * Math.PI * 6) * 0.06 * (1 - k);
      if (k >= 1) tl.userData.flying = false;
    });
  }

  async playHuman(id, side) {
    if (this.busy) return;
    this.busy = true;
    this.ghosts.forEach((g) => (g.visible = false));
    this.ui.markers([]);
    this.choice = null;
    this.ui.myTurn(false);
    await this.placeTile(0, id, side);
    this.busy = false;
    this._resolveHuman && this._resolveHuman();
  }

  async botTurn(p) {
    const M = this.M;
    const r = M.r;
    const flow = this.flow;
    const sp = this.speed;
    this.busy = true;
    await this.wait((1.25 + M.rand() * 0.9) * sp);
    if (flow !== this.flow) return;
    const lvl = M.players[p].lvl;
    let mv = R.botMove(r, p, lvl, M.rand);
    while (!mv && r.bone.length) {
      R.draw(r, p);
      audio.play('draw');
      await this.drawToSeat(p);
      if (flow !== this.flow) return;
      mv = R.botMove(r, p, lvl, M.rand);
    }
    if (mv) {
      await this.placeTile(p, mv.id, mv.side);
      // реплика иногда
      if (r.over && !r.over.fish) this.ui.bubble(p, t('domino'));
      else if (M.rand() < 0.08) this.ui.bubble(p, pickLine(M.rand));
    } else {
      R.pass(r, p);
      audio.play('knock');
      this.ui.bubble(p, t('pass'));
      this.ui.updatePlates();
      await this.wait(1.2 * sp);
    }
    this.busy = false;
  }

  async drawToSeat(p) {
    const sp = this.ui.boneScreen();
    const id = this.M.r.hands[p][0];
    const tl = this.tiles[id];
    tl.visible = true;
    this.s3.scene.attach(tl);
    tl.position.copy(this.s3.worldAt(sp.x, sp.y, 9));
    tl.quaternion.setFromEuler(E.set(0, 0, Math.PI));
    tl.scale.setScalar(0.35);
    this.ui.updatePlates();
    await this.fly(tl, this.seatWorld(p, 9), tl.quaternion.clone(), 0.35, 0.5 * this.speed, 1.5);
    tl.visible = false;
    this.s3.board.attach(tl);
  }

  // положить кость в цепочку (общая для всех игроков)
  async placeTile(p, id, side) {
    const M = this.M;
    const r = M.r;
    const entry = R.play(r, p, id, side);
    const pose = entry.side === 'C' ? M.snake.placeFirst(id, r.first.l) : M.snake.next(side, id, entry.i);
    M.poses.push({ id, ...pose });
    const tl = this.tiles[id];
    tl.visible = true;
    if (p === 0) {
      this.s3.scene.attach(tl);
    } else {
      this.s3.scene.attach(tl);
      tl.position.copy(this.seatWorld(p, 9));
      tl.quaternion.setFromEuler(E.set(0, pose.rot + 1.2, Math.PI));
      tl.scale.setScalar(0.4);
    }
    this.shadows(tl, true);
    tl.userData.flying = true;
    this.ui.updatePlates();
    this.refit(false);
    const to = new THREE.Vector3(pose.x, TH / 2, pose.z);
    const q = new THREE.Quaternion().setFromEuler(E.set(0, pose.rot, 0));
    audio.play('swoosh');
    await this.fly(tl, to, q, 1, (p === 0 ? 0.5 : 0.8) * this.speed, 3.2);
    tl.userData.flying = false;
    this.s3.board.attach(tl);
    const last = r.over && !r.over.fish;
    audio.play(last ? 'slam' : 'clack', last ? 1 : 0.8);
    this.dust(to, last);
    if (last) this.shake();
    this.kit.glow(id, 0);
  }

  // лёгкое «подпрыгивание» соседних костей при ударе
  dust(pos, strong) {
    const near = this.M.poses.filter((p) => Math.hypot(p.x - pos.x, p.z - pos.z) < (strong ? 9 : 3.2));
    for (const p of near) {
      const tl = this.tiles[p.id];
      if (Math.abs(tl.position.x - pos.x) < 0.01 && Math.abs(tl.position.z - pos.z) < 0.01) continue;
      const y0 = TH / 2;
      const amp = strong ? 0.5 : 0.12;
      const delay = Math.hypot(p.x - pos.x, p.z - pos.z) * 0.02;
      this.wait(delay).then(() =>
        this.tween(0.22, (k) => {
          tl.position.y = y0 + Math.sin(k * Math.PI) * amp;
        })
      );
    }
  }

  shake() {
    const s3 = this.s3;
    this.tween(0.4, (k) => {
      const a = (1 - k) * 0.35;
      s3.view.x += Math.sin(k * 60) * a * 0.3;
      s3.view.z += Math.cos(k * 53) * a * 0.3;
    });
  }

  // камера: вся цепочка + призраки
  refit(instant) {
    if (this.state !== 'match' || !this.M) {
      if (this.state === 'home' && this.homeBB) this.s3.fit(this.homeBB, instant);
      return;
    }
    const M = this.M;
    let x0 = Infinity,
      x1 = -Infinity,
      z0 = Infinity,
      z1 = -Infinity;
    const add = (p, rr = 1.15) => {
      x0 = Math.min(x0, p.x - rr);
      x1 = Math.max(x1, p.x + rr);
      z0 = Math.min(z0, p.z - rr);
      z1 = Math.max(z1, p.z + rr);
    };
    (M.poses || []).forEach((p) => add(p));
    if (this.choice && this.choice.ghosts) this.choice.ghosts.forEach((g) => add(g.p, 1.6));
    if (x0 === Infinity) {
      x0 = -6;
      x1 = 6;
      z0 = -4.5;
      z1 = 4.5;
    }
    // небольшой запас, чтобы следующая кость не выходила за край
    this.s3.fit({ x0: x0 - 1.2, x1: x1 + 1.2, z0: z0 - 1, z1: z1 + 1 }, instant);
  }

  // ---------- конец кона ----------
  async roundOver() {
    const M = this.M;
    const r = M.r;
    const flow = this.flow;
    this.busy = true;
    this.ui.myTurn(false);
    this.ui.needDraw(false);
    await this.wait(0.5);
    if (flow !== this.flow) return;
    if (r.over.fish) {
      audio.play('fish');
      this.ui.stamp(t('fish'), 'fish');
      this.ui.bubble(r.over.by, t('fishSay'));
      this.shake();
    } else {
      this.ui.stamp(r.over.out === 0 ? t('youOut') : t('outBy', { n: M.players[r.over.out].name }), r.over.out === 0 || (M.m.mode === 'goat' && R.team(r.over.out) === 0) ? 'good' : 'bad');
    }
    // открыть кости соперников: перевернуть в руке
    await this.wait(1.4);
    if (flow !== this.flow) return;
    const res = R.applyRound(M.m, r);
    const mine = M.m.mode === 'goat' ? res.win === 0 : res.win === 0;
    let coins = 0;
    if (mine) {
      coins = ROUND_COINS;
      save.data.coins += coins;
    }
    save.data.stats.rounds++;
    if (r.over.fish) save.data.stats.fish++;
    sdk.gameplay(false);
    this.persist();
    audio.play(mine ? 'roundWin' : res.win === -1 ? 'click' : 'roundLose');
    this.ui.roundModal(res, r, coins, () => {
      if (flow !== this.flow) return;
      if (M.m.done) this.matchOver();
      else {
        // полноэкранная реклама между конами — не чаще раза в 3 минуты
        const go = () => flow === this.flow && this.nextRound();
        if (Date.now() - (this._lastAd ||= Date.now()) > 180000 && M.m.k % 3 === 0) {
          this._lastAd = Date.now();
          sdk.showInterstitial(go);
        } else go();
      }
    });
  }

  matchOver() {
    const M = this.M;
    const m = M.m;
    const won = R.humanWon(m);
    const d = save.data;
    d.stats.matches++;
    let coins = LOSE_COINS,
      rating = 0;
    if (won) {
      d.stats.wins++;
      coins = WIN_COINS[m.diff] + (m.target > 60 ? Math.round(WIN_COINS[m.diff] * 0.6) : 0);
      rating = RATING[m.diff] * (m.target > 60 ? 2 : 1);
      d.rating += rating;
      sdk.submitScore(d.rating);
    }
    d.coins += coins;
    d.cur = null;
    save.write();
    audio.play(won ? 'win' : 'lose');
    this._lastAd = Date.now();
    this.ui.matchModal(won, coins, rating);
  }

  // удвоить награду за партию (ролик)
  doubleReward(coins, done) {
    sdk.showRewarded(
      () => {
        save.data.coins += coins;
        save.write();
        this.ui.refreshTop();
      },
      (ok) => done && done(ok)
    );
  }

  leaveMatch() {
    this.persist();
    this.toHome();
  }

  setPause(on) {
    this.paused = on;
    sdk.gameplay(!on && this.state === 'match');
  }

  // ---------- магазин: применить набор/стол/место ----------
  applySkin(id) {
    save.data.skin = id;
    this.kit.setSkin(id);
    save.write();
  }
  applyTable(id) {
    save.data.table = id;
    this.s3.setTable(id);
    save.write();
  }
  applyPlace(id) {
    save.data.place = id;
    this.s3.setPlace(id);
    save.write();
    if (this.state === 'match') audio.setMood(this.placeMood());
  }
}

function pickLine(rand) {
  const lines = ['line1', 'line2', 'line3', 'line4', 'line5', 'line6'];
  return t(lines[Math.floor(rand() * lines.length)]);
}
