// Арена: симуляция мира, отрисовка, камера, управление игроком
import { World } from '../world.js';
import { TANKS, BOSSES, COLORS, SKINS, TEAM_COLORS, ENEMY_COLOR, LEVEL_SCORE } from '../data.js';
import { TS, R0, barrelKey, bodyKey, spikesKey, shapeKey, bulletKey, droneKey, trapKey } from '../tex.js';
import { newBrain, thinkBot, botAlloc, botPickClass } from '../bots.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { FONT } from '../ui.js';

const Phaser = window.Phaser;
const ADD = 1;
const D2R = Math.PI / 180;
const STEP = 1 / 60;

const hsl = (h) => {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const v = 0.62 - 0.38 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
};

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super('Arena');
  }

  init(data) {
    this.mode = data.mode || save.data.mode || 'ffa';
  }

  create() {
    this.debug = window.__NT_DEBUG || null;
    this.views = new Map();
    this.pools = {};
    this.acc = 0;
    this.state = 'spectate'; // spectate | play | dead
    this.pauseReasons = new Set();
    this.fx = [];
    this.trailT = 0;
    this.camTarget = null;
    this.specT = 0;
    this.lastHp = 0;
    this.runStart = 0;
    this.touch = { mx: 0, my: 0, aim: null, fire: false, active: false };
    this.mouse = { down: false, right: false };
    this.buildWorld();

    const cam = this.cameras.main;
    cam.setBackgroundColor('rgba(0,0,0,0)');
    cam.centerOn(0, 0);
    this.zoomNow = 0.6;

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,C,ESC,P,SHIFT,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,M');
    const statKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'];
    statKeys.forEach((k, i) => this.keys[k].on('down', () => this.statUp(i)));
    this.keys.E.on('down', () => this.toggleAuto('fire'));
    this.keys.C.on('down', () => this.toggleAuto('spin'));
    this.keys.ESC.on('down', () => this.state === 'play' && this.events.emit('want-pause'));
    this.keys.P.on('down', () => this.state === 'play' && this.events.emit('want-pause'));
    this.input.mouse && this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (p) => {
      if (p.wasTouch || (p.event && p.event.pointerType === 'touch')) return;
      if (p.rightButtonDown()) this.mouse.right = true;
      else this.mouse.down = true;
    });
    this.input.on('pointerup', (p) => {
      if (p.wasTouch || (p.event && p.event.pointerType === 'touch')) return;
      if (!p.rightButtonDown()) this.mouse.right = false;
      if (!p.leftButtonDown()) this.mouse.down = false;
    });
    this.input.on('gameout', () => {
      this.mouse.down = false;
      this.mouse.right = false;
    });

    this.onHidden = () => this.state === 'play' && this.events.emit('want-pause');
    this.onSdkPause = () => this.setPause('sdk', true);
    this.onSdkResume = () => this.setPause('sdk', false);
    this.game.events.on('app-hidden', this.onHidden);
    this.game.events.on('sdk-pause', this.onSdkPause);
    this.game.events.on('sdk-resume', this.onSdkResume);
    this.events.once('shutdown', () => {
      this.game.events.off('app-hidden', this.onHidden);
      this.game.events.off('sdk-pause', this.onSdkPause);
      this.game.events.off('sdk-resume', this.onSdkResume);
    });
    window.__arena = this;
  }

  buildWorld(mode) {
    if (mode) this.mode = mode;
    // убрать старые виды
    for (const v of this.views.values()) this.destroyView(v, true);
    this.views.clear();
    if (this.arenaGfx) this.arenaGfx.destroy();
    if (this.hpGfx) this.hpGfx.destroy();
    this.world = new World({ mode: this.mode, bots: this.mode === 'teams' ? 15 : 14, ...(this.debug && this.debug.world) });
    this.world.onRemove = (e) => this.onRemove(e);
    this.drawArena();
    this.hpGfx = this.add.graphics().setDepth(40);
    this.state = 'spectate';
    this.registry.set('mode', this.mode);
  }

  // статичная разметка: граница, гнездо, базы
  drawArena() {
    const w = this.world;
    const g = (this.arenaGfx = this.add.graphics().setDepth(0));
    const h = w.half;
    const F = 9000;
    g.fillStyle(0x000000, 0.55);
    g.fillRect(-F, -F, F * 2, F - h);
    g.fillRect(-F, h, F * 2, F - h);
    g.fillRect(-F, -h, F - h, h * 2);
    g.fillRect(h, -h, F - h, h * 2);
    g.lineStyle(14, COLORS.violet, 0.12);
    g.strokeRect(-h, -h, h * 2, h * 2);
    g.lineStyle(4, COLORS.violet, 0.6);
    g.strokeRect(-h, -h, h * 2, h * 2);
    if (w.mode === 'ffa') {
      const n = w.nest;
      g.fillStyle(COLORS.violet, 0.07);
      g.fillRect(-n, -n, n * 2, n * 2);
      g.lineStyle(3, COLORS.violet, 0.35);
      g.strokeRect(-n, -n, n * 2, n * 2);
      // уголки гнезда
      g.lineStyle(6, COLORS.violet, 0.7);
      const c = 80;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        g.beginPath();
        g.moveTo(sx * n, sy * (n - c));
        g.lineTo(sx * n, sy * n);
        g.lineTo(sx * (n - c), sy * n);
        g.strokePath();
      }
    }
    for (const b of w.bases) {
      const col = TEAM_COLORS[b.team];
      g.fillStyle(col, 0.08);
      g.fillRect(b.x0, -h, b.x1 - b.x0, h * 2);
      g.lineStyle(4, col, 0.45);
      const x = b.team === 0 ? b.x1 : b.x0;
      g.lineBetween(x, -h, x, h);
    }
  }

  // ---------- Игрок ----------
  playerColor() {
    if (this.mode === 'teams') return TEAM_COLORS[0];
    const s = SKINS.find((k) => k.id === save.data.skin) || SKINS[0];
    return s.color;
  }

  startPlay(opts = {}) {
    const w = this.world;
    const name = (save.data.nick || '').slice(0, 16);
    const t = w.addPlayer({ name, color: this.playerColor(), skin: save.data.skin, score: opts.score || 0, team: this.mode === 'teams' ? 0 : undefined });
    if (t.score > 0) t.hp = t.maxHp;
    t.autoFire = !!this.autoFirePref;
    this.player = t;
    if (this.debug && this.debug.autoplay) {
      t.bot = newBrain(t);
      t.bot.skill = 0.9;
      t.bot.path = this.debug.path || t.bot.path;
    }
    this.state = 'play';
    this.runStart = this.world.t;
    this.runKills = 0;
    this.lastHp = t.hp;
    this.peakScore = t.score;
    this.camTarget = t;
    this.setPause('play', false);
    sdk.gameplay(true);
    this.events.emit('player-spawn', t);
    return t;
  }

  statUp(i) {
    const p = this.player;
    if (!p || p.dead || this.state !== 'play') return;
    if (this.world.upgradeStat(p, i)) {
      audio.play('upgrade', i);
      this.events.emit('stats');
    }
  }

  pickClass(id) {
    const p = this.player;
    if (!p || p.dead) return;
    if (this.world.upgradeClass(p, id)) {
      audio.play('class');
      this.burst(p.x, p.y, p.color, 16, p.r * 1.6);
      this.events.emit('stats');
    }
  }

  toggleAuto(k) {
    const p = this.player;
    if (!p || this.state !== 'play') return;
    if (k === 'fire') {
      p.autoFire = !p.autoFire;
      this.autoFirePref = p.autoFire;
    } else p.spinOn = !p.spinOn;
    audio.play('click');
    this.events.emit('toggles');
  }

  setPause(reason, on) {
    if (on) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
    this.paused = this.pauseReasons.size > 0;
    sdk.gameplay(!this.paused && this.state === 'play');
  }

  readInput() {
    const p = this.player;
    if (!p || p.dead || p.bot) return;
    const k = this.keys;
    let mx = 0, my = 0;
    if (k.A.isDown || k.LEFT.isDown) mx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) mx += 1;
    if (k.W.isDown || k.UP.isDown) my -= 1;
    if (k.S.isDown || k.DOWN.isDown) my += 1;
    const tc = this.touch;
    if (tc.active) {
      mx += tc.mx;
      my += tc.my;
    }
    const inp = p.input;
    inp.mx = mx;
    inp.my = my;
    if (tc.active && tc.aim !== null) {
      inp.ax = p.x + Math.cos(tc.aim) * 400;
      inp.ay = p.y + Math.sin(tc.aim) * 400;
      inp.fire = tc.fire;
      inp.repel = false;
    } else if (tc.active) {
      // без правого джойстика ствол смотрит по ходу движения
      if (Math.hypot(mx, my) > 0.2 && !p.autoFire) {
        inp.ax = p.x + mx * 400;
        inp.ay = p.y + my * 400;
      } else if (!inp.ax) {
        inp.ax = p.x + 400;
        inp.ay = p.y;
      }
      inp.fire = false;
      inp.repel = false;
    } else {
      const ptr = this.input.activePointer;
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      inp.ax = wp.x;
      inp.ay = wp.y;
      inp.fire = this.mouse.down;
      inp.repel = this.mouse.right || k.SHIFT.isDown;
      if (inp.repel) inp.fire = true;
    }
    delete inp.aim;
  }

  // ---------- Главный цикл ----------
  update(time, delta) {
    let dt = Math.min(0.1, delta / 1000);
    if (this.paused) dt = 0;
    const sub = (this.debug && this.debug.sub) || 1;
    this.acc += dt * sub;
    this.readInput();
    const w = this.world;
    let n = 0;
    while (this.acc >= STEP && n < 8 * sub) {
      this.acc -= STEP;
      n++;
      if (this.player && this.player.bot && !this.player.dead) thinkBot(w, this.player, STEP);
      if (this.debug && this.debug.god && this.player) this.player.hp = this.player.maxHp;
      w.step(STEP);
      this.handleEvents();
    }
    if (n >= 8 * sub) this.acc = 0;
    this.rainbow(time);
    this.sync(dt);
    this.updCamera(dt);
    this.updFx(dt);
    // музыка: босс рядом / поздняя игра
    const p = this.player;
    let mood = this.state === 'spectate' ? 'menu' : 'game';
    if (this.state === 'play' && p && p.level >= 30) mood = 'late';
    if (this.state === 'play' && w.boss && p && Math.hypot(w.boss.x - p.x, w.boss.y - p.y) < 1600) mood = 'boss';
    if (mood !== this.mood) {
      this.mood = mood;
      audio.setMood(mood);
    }
  }

  rainbow(time) {
    const p = this.player;
    if (!p || p.dead || p.skin !== 'rainbow' || this.mode === 'teams') return;
    const hue = ((time / 4000) % 1);
    p.rainbowTint = hsl(hue);
    p.color = hsl(Math.round(hue * 12) / 12);
  }

  handleEvents() {
    const w = this.world;
    const p = this.player;
    for (const ev of w.events) {
      switch (ev.type) {
        case 'shot':
          if (ev.o === p) audio.play('shoot', ev.size);
          else if (p && this.near(ev.x, ev.y, 700)) audio.play('shoot2');
          if (this.near(ev.x, ev.y, 1400)) this.muzzle(ev);
          break;
        case 'die': {
          const e = ev.e;
          if (ev.killer && ev.killer === p) audio.play(e.kind === 'boss' ? 'bigboom' : e.type === 'pentagon' || e.type === 'alpha' ? 'pop2' : 'pop');
          if (this.near(e.x, e.y, 1500)) this.burst(e.x, e.y, e.color, e.r > 50 ? 22 : e.type === 'pentagon' ? 10 : 6, e.r);
          break;
        }
        case 'levelup':
          if (ev.tank === p) {
            audio.play('levelup');
            this.ringFx(p.x, p.y, p.color, p.r * 3);
            this.events.emit('levelup', ev.level);
          }
          break;
        case 'tankdead': {
          const e = ev.e;
          if (this.near(e.x, e.y, 1600)) {
            this.burst(e.x, e.y, e.color, 18, e.r * 1.4);
            this.ringFx(e.x, e.y, e.color, e.r * 4);
            audio.play('boom', this.near(e.x, e.y, 700) ? 1 : 0.5);
          }
          if (e === p) this.onPlayerDeath(ev.killer);
          else if (ev.killer && ev.killer === p) {
            this.runKills++;
            this.events.emit('notify', { key: 'youKilled', name: e.name, color: COLORS.green });
            audio.play('kill');
          }
          break;
        }
        case 'boss':
          this.events.emit('notify', { key: 'bossSpawn_' + ev.boss.type, color: ev.boss.color, big: true });
          if (this.state === 'play') audio.play('bossWarn');
          break;
        case 'bossdead':
          this.events.emit('notify', { key: 'bossDead_' + ev.e.type, name: ev.killer ? ev.killer.name : '', color: ev.e.color, big: true });
          break;
        case 'class':
          if (ev.tank === p) this.events.emit('stats');
          break;
      }
    }
    w.events.length = 0;
    if (p && !p.dead) {
      if (p.hp < this.lastHp - 0.5) {
        const k = Math.min(1, (this.lastHp - p.hp) / p.maxHp * 4);
        audio.play('hurt');
        this.events.emit('hurt', k);
      }
      this.lastHp = p.hp;
      this.peakScore = Math.max(this.peakScore, p.score);
    }
  }

  near(x, y, d) {
    const c = this.camPos || { x: 0, y: 0 };
    return Math.abs(x - c.x) < d && Math.abs(y - c.y) < d;
  }

  onPlayerDeath(killer) {
    const p = this.player;
    this.state = 'dead';
    sdk.gameplay(false);
    audio.play('death');
    const info = {
      score: Math.floor(p.score),
      level: p.level,
      cls: p.cls,
      kills: p.kills,
      time: this.world.t - this.runStart,
      killer: killer ? this.nameOf(killer) : '',
      killerCls: killer && killer.kind === 'tank' ? killer.cls : null,
      killerColor: killer ? killer.color : COLORS.pink,
      killerKind: killer ? killer.kind : '',
    };
    this.camTarget = killer && !killer.dead && killer.kind !== 'shape' ? killer : null;
    this.deathPos = { x: p.x, y: p.y };
    this.events.emit('player-dead', info);
  }

  nameOf(e) {
    if (e.kind === 'tank') return e.name || '\u0000';
    if (e.kind === 'boss') return '\u0001' + e.type;
    if (e.kind === 'shape') return '\u0002' + e.type;
    return '';
  }

  toSpectate() {
    if (this.player && !this.player.dead) {
      this.world.kill(this.player, null);
    }
    this.player = null;
    this.world.player = null;
    this.state = 'spectate';
    this.camTarget = null;
    sdk.gameplay(false);
  }

  // ---------- Камера ----------
  updCamera(dt) {
    const cam = this.cameras.main;
    const { width: W, height: H } = this.scale;
    let fov = 1.15;
    let tx = 0, ty = 0;
    const p = this.player;
    if (this.state === 'play' && p && !p.dead) {
      fov = p.fov;
      tx = p.x;
      ty = p.y;
    } else {
      // зритель: следим за лидером или за местом гибели
      let t = this.camTarget && !this.camTarget.dead ? this.camTarget : null;
      if (this.state === 'spectate') {
        this.specT -= dt;
        if (!t || this.specT <= 0) {
          this.specT = 14;
          const lb = this.world.leaderboard(5);
          t = lb[Math.floor(Math.random() * lb.length)] || null;
          this.camTarget = t;
        }
      }
      if (t) {
        tx = t.x;
        ty = t.y;
      } else if (this.deathPos && this.state === 'dead') {
        tx = this.deathPos.x;
        ty = this.deathPos.y;
      }
      fov = this.state === 'spectate' ? 1.2 : 1.1;
    }
    const fc = this.debug && this.debug.cam;
    if (fc) {
      this.zoomNow = fc.z;
      cam.setZoom(fc.z);
      this.camPos = { x: fc.x, y: fc.y };
      cam.centerOn(fc.x, fc.y);
      this.registry.set('view', { x: cam.scrollX + W / 2 - W / 2 / fc.z, y: cam.scrollY + H / 2 - H / 2 / fc.z, z: fc.z });
      return;
    }
    const z = Math.sqrt(W * H) / (980 * fov);
    const kz = 1 - Math.exp(-dt * 2.5);
    this.zoomNow += (z - this.zoomNow) * kz;
    cam.setZoom(this.zoomNow);
    if (!this.camPos) this.camPos = { x: tx, y: ty };
    const k = this.state === 'play' ? 1 - Math.exp(-dt * 12) : 1 - Math.exp(-dt * 2);
    this.camPos.x += (tx - this.camPos.x) * k;
    this.camPos.y += (ty - this.camPos.y) * k;
    cam.centerOn(this.camPos.x, this.camPos.y);
    this.registry.set('view', { x: cam.scrollX + W / 2 - W / 2 / this.zoomNow, y: cam.scrollY + H / 2 - H / 2 / this.zoomNow, z: this.zoomNow });
  }

  // ---------- Отрисовка ----------
  pooled(key) {
    const pool = this.pools[key];
    if (pool && pool.length) {
      const s = pool.pop();
      s.setActive(true).setVisible(true).setAlpha(1).setScale(1).setRotation(0).clearTint().setBlendMode(0);
      return s;
    }
    const s = this.add.image(0, 0, key);
    s.poolKey = key;
    return s;
  }

  release(s) {
    s.setActive(false).setVisible(false);
    (this.pools[s.poolKey] || (this.pools[s.poolKey] = [])).push(s);
  }

  makeView(e) {
    let v;
    switch (e.kind) {
      case 'tank':
        v = this.tankView(e, TANKS[e.cls]);
        break;
      case 'boss':
        v = this.tankView(e, BOSSES[e.type], e.type);
        break;
      case 'shape':
        v = { img: this.pooled(shapeKey(e.type)).setDepth(e.type === 'alpha' ? 12 : 10) };
        v.img.setScale(1 / TS);
        break;
      case 'bullet':
        v = { img: this.pooled(bulletKey(e.color)).setDepth(16) };
        break;
      case 'drone':
        v = { img: this.pooled(droneKey(e.color, e.shape)).setDepth(17) };
        break;
      case 'trap':
        v = { img: this.pooled(trapKey(e.color)).setDepth(15) };
        break;
    }
    v.e = e;
    this.views.set(e, v);
    return v;
  }

  tankView(e, c, bossType) {
    const cont = this.add.container(e.x, e.y).setDepth(bossType ? 22 : 20);
    const v = { cont, barrels: [], autos: [], cls: e.cls, color: e.color, boss: !!bossType };
    if (c.smasher) {
      v.spikes = this.add.image(0, 0, spikesKey(c.spikes ? 'spike' : 'hex')).setScale(1 / TS);
      cont.add(v.spikes);
    }
    for (const b of c.barrels) {
      const img = this.add.image(0, 0, barrelKey(b)).setOrigin(0, 0.5).setScale(1 / TS);
      img.b = b;
      cont.add(img);
      v.barrels.push(img);
    }
    let body;
    if (bossType) body = this.add.image(0, 0, shapeKey(bossType)).setScale(R0 / c.r / TS);
    else if (e.skin === 'rainbow' && this.mode !== 'teams') body = this.add.image(0, 0, bodyKey(0xffffff, c.body)).setScale(1 / TS);
    else body = this.add.image(0, 0, bodyKey(e.color, c.body)).setScale(1 / TS);
    v.body = body;
    cont.add(body);
    for (const a of c.autos || []) {
      const img = this.add.image(0, 0, 'turret').setScale(1 / TS);
      cont.add(img);
      v.autos.push(img);
    }
    this.layoutBarrels(v, 0);
    if (!bossType) {
      v.name = this.add
        .text(e.x, e.y, e.name || '', { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: 0x07031a, strokeThickness: 5 })
        .setOrigin(0.5, 1)
        .setDepth(41);
      v.name.setShadow(0, 0, '#000000', 6, false, true);
    }
    return v;
  }

  layoutBarrels(v, _) {
    for (const img of v.barrels) {
      const b = img.b;
      img.setRotation(b.a * D2R);
      const ca = Math.cos(b.a * D2R), sa = Math.sin(b.a * D2R);
      img.bx = -sa * b.y * R0;
      img.by = ca * b.y * R0;
      img.ux = ca;
      img.uy = sa;
      img.setPosition(img.bx, img.by);
    }
  }

  destroyView(v, instant) {
    if (v.cont) {
      if (v.name) v.name.destroy();
      if (instant) v.cont.destroy();
      else {
        this.tweens.add({ targets: v.cont, alpha: 0, scale: v.cont.scale * 1.5, duration: 220, onComplete: () => v.cont.destroy() });
      }
    } else if (v.img) {
      if (instant) this.release(v.img);
      else {
        const img = v.img;
        this.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.6, duration: 160, onComplete: () => this.release(img) });
      }
    }
  }

  onRemove(e) {
    const v = this.views.get(e);
    if (!v) return;
    this.views.delete(e);
    const vis = this.near(e.x, e.y, 2200);
    this.destroyView(v, !vis || (e.kind === 'bullet' && e.life <= 0 && false));
  }

  sync(dt) {
    const w = this.world;
    const g = this.hpGfx;
    g.clear();
    const cam = this.cameras.main;
    const vw = cam.worldView;
    const pad = 200;
    for (const e of w.ents) {
      if (e.dead) continue;
      const vis = e.x > vw.x - pad && e.x < vw.right + pad && e.y > vw.y - pad && e.y < vw.bottom + pad;
      let v = this.views.get(e);
      if (!vis) {
        if (v && v.img) v.img.setVisible(false);
        if (v && v.cont) {
          v.cont.setVisible(false);
          if (v.name) v.name.setVisible(false);
        }
        continue;
      }
      if (!v) v = this.makeView(e);
      if (v.img) {
        const img = v.img;
        img.setVisible(true);
        img.setPosition(e.x, e.y);
        if (e.kind === 'shape') {
          img.setRotation(e.angle);
          if (e.hurtFlash > 0) {
            img.setTint(0xffb0c0);
            e.hurtFlash -= dt * 8;
          } else img.clearTint();
        } else {
          const sc = e.r / (e.kind === 'bullet' ? 14 : 16) / TS;
          img.setScale(sc);
          if (e.kind !== 'bullet') img.setRotation(e.angle);
          // пуля гаснет в конце пути
          if (e.kind === 'bullet') img.setAlpha(Math.min(1, e.life * 5));
          if (e.kind === 'trap') img.setAlpha(Math.min(1, e.life / 2));
        }
      } else {
        this.syncTank(e, v, dt);
      }
      // полоска здоровья
      if ((e.kind === 'tank' || e.kind === 'shape' || e.kind === 'boss') && e.hp < e.maxHp - 0.01 && (e.alpha ?? 1) > 0.15) {
        const bw = Math.max(36, e.r * 2);
        const bh = e.kind === 'boss' ? 9 : 6;
        const by = e.y + e.r + (e.kind === 'tank' ? 16 : 10);
        const f = Math.max(0, e.hp / e.maxHp);
        g.fillStyle(0x0a0620, 0.9);
        g.fillRoundedRect(e.x - bw / 2 - 2, by - 2, bw + 4, bh + 4, 4);
        g.fillStyle(0x3a3266, 0.9);
        g.fillRoundedRect(e.x - bw / 2, by, bw, bh, 3);
        g.fillStyle(f > 0.5 ? 0x7dff6b : f > 0.25 ? 0xffd23f : 0xff3355, 1);
        g.fillRoundedRect(e.x - bw / 2, by, bw * f, bh, 3);
      }
    }
    // следы игрока (косметика)
    const p = this.player;
    if (p && !p.dead && save.data.trail && save.data.trail !== 'none') {
      this.trailT -= dt;
      const sp = Math.hypot(p.vx, p.vy);
      if (this.trailT <= 0 && sp > 60) {
        this.trailT = save.data.trail === 'comet' ? 0.02 : 0.05;
        this.trail(p, save.data.trail);
      }
    }
  }

  syncTank(e, v, dt) {
    const c = v.boss ? BOSSES[e.type] : TANKS[e.cls];
    if (!v.boss && (v.cls !== e.cls || (v.color !== e.color && e.skin !== 'rainbow'))) {
      // сменился класс — пересобрать вид
      const name = v.name;
      v.cont.destroy();
      if (name) name.destroy();
      const nv = this.tankView(e, c);
      this.views.set(e, nv);
      nv.e = e;
      return this.syncTank(e, nv, dt);
    }
    const cont = v.cont;
    cont.setVisible(true);
    cont.setPosition(e.x, e.y);
    cont.setRotation(e.angle);
    const sc = v.boss ? e.r / R0 : e.r / R0;
    cont.setScale(sc);
    // невидимость: себя видно полупрозрачным
    let a = e.alpha ?? 1;
    if (e === this.player) a = Math.max(0.35, a);
    if (e.shield > 0) a *= 0.55 + 0.45 * Math.abs(Math.sin(this.world.t * 10));
    cont.setAlpha(a);
    if (e.rainbowTint !== undefined && e.skin === 'rainbow') v.body.setTint(e.rainbowTint);
    if (e.hurtFlash > 0) {
      v.body.setTint(0xffc4d4);
      e.hurtFlash -= dt * 8;
      v.flashing = true;
    } else if (v.flashing) {
      v.flashing = false;
      if (e.skin === 'rainbow' && e.rainbowTint !== undefined) v.body.setTint(e.rainbowTint);
      else v.body.clearTint();
    }
    // отдача стволов
    v.barrels.forEach((img, i) => {
      const r = (e.recoil && e.recoil[i]) || 0;
      const back = r * 0.13 * R0;
      img.setPosition(img.bx - img.ux * back, img.by - img.uy * back);
    });
    if (v.spikes) v.spikes.setRotation(this.world.t * 2.2 - e.angle);
    v.autos.forEach((img, i) => {
      const a2 = e.autos[i];
      if (!a2) return;
      const ang = a2.a * D2R;
      img.setPosition(Math.cos(ang) * a2.dist * R0, Math.sin(ang) * a2.dist * R0);
      img.setRotation(a2.ang - e.angle);
    });
    if (v.name) {
      v.name.setVisible(a > 0.2 && !(e === this.player && this.state === 'play' && !this.debug?.showOwnName));
      v.name.setPosition(e.x, e.y - e.r - 10);
      v.name.setAlpha(a);
      const s = Math.max(0.8, Math.min(1.6, e.r / 26));
      v.name.setScale(s);
    }
  }

  // ---------- Эффекты ----------
  fxImg(key, x, y, tint, depth = 30) {
    const s = this.pooled(key).setPosition(x, y).setDepth(depth).setBlendMode(ADD);
    if (tint !== undefined) s.setTint(tint);
    return s;
  }

  muzzle(ev) {
    const s = this.fxImg('glow', ev.x, ev.y, ev.o.color, 18);
    s.setScale((ev.size * 2.6) / 128).setAlpha(0.6);
    this.fx.push({ s, t: 0, life: 0.09, a0: 0.6, s0: s.scaleX, s1: s.scaleX * 1.4 });
  }

  burst(x, y, color, n, r) {
    for (let i = 0; i < n; i++) {
      const s = this.fxImg('spark', x, y, color);
      const a = Math.random() * Math.PI * 2;
      const sp = (60 + Math.random() * 180) * (r / 20) ** 0.5;
      s.setScale(0.8 + Math.random() * 1.2);
      this.fx.push({ s, t: 0, life: 0.35 + Math.random() * 0.35, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a0: 1 });
    }
  }

  ringFx(x, y, color, r) {
    const s = this.fxImg('ring', x, y, color, 29);
    s.setScale(0.1).setAlpha(0.7);
    this.fx.push({ s, t: 0, life: 0.45, a0: 0.7, s0: 0.1, s1: (r / 116) * 1.2 });
  }

  trail(p, kind) {
    const back = p.r * 0.8;
    const a = Math.atan2(p.vy, p.vx) + Math.PI;
    const x = p.x + Math.cos(a) * back + (Math.random() - 0.5) * p.r * 0.6;
    const y = p.y + Math.sin(a) * back + (Math.random() - 0.5) * p.r * 0.6;
    const col = p.color;
    if (kind === 'sparks') {
      const s = this.fxImg('spark', x, y, col, 9);
      s.setScale(1.2);
      this.fx.push({ s, t: 0, life: 0.5, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, a0: 0.9 });
    } else if (kind === 'comet') {
      const s = this.fxImg('glow', p.x - p.vx * 0.03, p.y - p.vy * 0.03, col, 9);
      s.setScale((p.r * 1.6) / 128).setAlpha(0.35);
      this.fx.push({ s, t: 0, life: 0.45, a0: 0.35, s0: s.scaleX, s1: s.scaleX * 0.3 });
    } else {
      const s = this.fxImg('star4', x, y, 0xffffff, 9);
      s.setScale(0.5 + Math.random() * 0.5).setTint(col);
      this.fx.push({ s, t: 0, life: 0.7, vx: 0, vy: 0, a0: 1, spin: (Math.random() - 0.5) * 6 });
    }
  }

  updFx(dt) {
    const fx = this.fx;
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) {
        f.s.clearTint();
        f.s.setBlendMode(0);
        this.release(f.s);
        fx[i] = fx[fx.length - 1];
        fx.pop();
        continue;
      }
      if (f.vx !== undefined) {
        f.s.x += f.vx * dt;
        f.s.y += f.vy * dt;
        f.vx *= 0.94;
        f.vy *= 0.94;
      }
      if (f.s1 !== undefined) f.s.setScale(f.s0 + (f.s1 - f.s0) * k);
      if (f.spin) f.s.rotation += f.spin * dt;
      f.s.setAlpha(f.a0 * (1 - k));
    }
  }
}
