// Игровая сцена: карта, башни, враги, волны, заклинания
import { COLS, ROWS, C, TOWERS, TOWER_ORDER, ENEMIES, SPELLS, levelInfo, genWaves, regionOf } from '../data.js';
import { levelTiles, renderMap, MCS } from '../gfx/map.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { t as tr } from '../i18n.js';

const Phaser = window.Phaser;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.lvl = data.level || 1;
  }

  create() {
    this.debug = window.__TD_DEBUG || null;
    const l = this.lvl;
    const info = levelInfo(l);
    this.info = info;
    this.waves = genWaves(l);
    this.tiles = levelTiles(l);
    this.region = regionOf(l);

    // бонусы постоянных улучшений
    const sh = (id) => save.shopLvl(id);
    this.mods = {
      dmg: {
        archer: 1 + 0.1 * sh('u_archer'),
        cannon: 1 + 0.1 * sh('u_cannon'),
        mage: 1 + 0.1 * sh('u_mage'),
        frost: 1 + 0.08 * sh('u_frost'),
        ballista: 1 + 0.1 * sh('u_ballista'),
      },
      slow: 1 + 0.08 * sh('u_frost'),
      range: 1 + 0.04 * sh('u_range'),
      cost: 1 - 0.04 * sh('u_discount'),
      bounty: 1 + 0.06 * sh('u_bounty'),
      meteorDmg: SPELLS.meteor.dmg * (1 + 0.3 * sh('u_meteor')) * (1 + 0.08 * (l - 1)),
      meteorCd: SPELLS.meteor.cd * Math.pow(0.9, sh('u_meteor')),
      freezeDur: SPELLS.freeze.dur + 0.7 * sh('u_freeze'),
    };

    this.gold = info.gold + 30 * sh('u_gold');
    this.maxLives = info.lives + 2 * sh('u_lives');
    this.lives = this.maxLives;
    this.waveIdx = -1;
    this.spawnList = [];
    this.spawnClock = 0;
    this.nextIn = -1; // отсчёт до следующей волны
    this.speed = 1;
    this.ended = false;
    this.continueUsed = false;
    this.goldAdUsed = false;
    this.kills = 0;
    this.pauseReasons = new Set();
    this.spells = {
      meteor: { cd: 0, ready: l >= SPELLS.meteor.unlock },
      freeze: { cd: 0, ready: l >= SPELLS.freeze.unlock },
    };
    this.targeting = null;
    this.frozenT = 0;

    this.enemies = [];
    this.towers = new Map(); // "x,y" -> tower
    this.projs = [];
    this.fxList = [];
    this.pool = {};

    // пути с длинами
    this.paths = this.tiles.paths.map((wp) => {
      const pts = wp.map(([x, y]) => [x + 0.5, y + 0.5]);
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts, cum, len: cum[cum.length - 1] };
    });

    this.mapImg = this.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(-10);
    this.rangeRing = this.add.image(0, 0, 'ring').setDepth(-5).setVisible(false);
    this.bars = this.add.graphics().setDepth(20000);
    this.layout();

    // ввод: тап по карте
    this.input.on('pointerdown', (p) => {
      this.downAt = { x: p.x, y: p.y, t: this.time.now };
    });
    this.input.on('pointerup', (p, over) => {
      if (!this.downAt || (over && over.length)) return;
      if (Math.hypot(p.x - this.downAt.x, p.y - this.downAt.y) > 24) return;
      this.onTap(p.x, p.y);
    });

    this.onHidden = () => {
      if (!this.ended && this.waveIdx >= 0) this.openPause();
    };
    this.onSdkPause = () => this.setPause('sdk', true);
    this.onSdkResume = () => this.setPause('sdk', false);
    this.game.events.on('app-hidden', this.onHidden);
    this.game.events.on('sdk-pause', this.onSdkPause);
    this.game.events.on('sdk-resume', this.onSdkResume);
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.game.events.off('app-hidden', this.onHidden);
      this.game.events.off('sdk-pause', this.onSdkPause);
      this.game.events.off('sdk-resume', this.onSdkResume);
      this.scale.off('resize', this.layout, this);
      sdk.gameplay(false);
    });

    this.scene.launch('Hud', { game: this });
    this.hud = this.scene.get('Hud');
    audio.setMood('game');
    audio.setIntensity(1);
    sdk.gameplay(true);
  }

  // ---------- Раскладка ----------
  layout() {
    const { width: W, height: H } = this.scale;
    const u = Math.max(0.5, Math.min(2.6, Math.min(W, H) / 720));
    this.u = u;
    this.portrait = H > W * 1.05;
    const gw = this.portrait ? ROWS : COLS;
    const gh = this.portrait ? COLS : ROWS;
    const top = this.portrait ? 78 * u : 0;
    const bot = this.portrait ? 120 * u : 0;
    this.cs = Math.min(W / gw, (H - top - bot) / gh);
    this.offX = (W - gw * this.cs) / 2;
    this.offY = top + (H - top - bot - gh * this.cs) / 2;
    const key = `map_${this.lvl}_${this.portrait ? 'p' : 'l'}`;
    if (!this.textures.exists(key)) renderMap(this, key, this.lvl, this.portrait);
    this.mapImg.setTexture(key).setPosition(this.offX, this.offY).setDisplaySize(gw * this.cs, gh * this.cs);
    for (const tw of this.towers.values()) this.placeTower(tw);
    if (this.hud && this.hud.ready) this.hud.onLayout();
  }

  toScreen(x, y) {
    if (this.portrait) [x, y] = [y, x];
    return [this.offX + x * this.cs, this.offY + y * this.cs];
  }
  fromScreen(sx, sy) {
    const x = (sx - this.offX) / this.cs;
    const y = (sy - this.offY) / this.cs;
    return this.portrait ? [y, x] : [x, y];
  }

  // ---------- Пауза ----------
  setPause(reason, on) {
    if (on) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
    const paused = this.pauseReasons.size > 0;
    if (paused && !this.scene.isPaused()) this.scene.pause();
    if (!paused && this.scene.isPaused()) this.scene.resume();
    sdk.gameplay(!paused && !this.ended);
  }
  openPause() {
    if (this.ended || this.pauseReasons.has('menu') || this.pauseReasons.has('modal')) return;
    this.setPause('menu', true);
    this.hud.showPause();
  }

  // ---------- Тапы по карте ----------
  onTap(sx, sy) {
    const [lx, ly] = this.fromScreen(sx, sy);
    if (this.targeting === 'meteor') {
      if (lx >= 0 && ly >= 0 && lx < COLS && ly < ROWS) this.castMeteor(lx, ly);
      this.targeting = null;
      this.hud.setTargeting(null);
      return;
    }
    const cx = Math.floor(lx);
    const cy = Math.floor(ly);
    const k = cx + ',' + cy;
    if (this.towers.has(k)) {
      const tw = this.towers.get(k);
      if (this.hud.menuFor === tw) this.closeMenus();
      else {
        this.showRange(tw.type, tw.lvl, cx, cy);
        this.hud.showTowerMenu(tw);
      }
    } else if (this.tiles.build.has(k)) {
      if (this.hud.menuFor === k) this.closeMenus();
      else {
        this.rangeRing.setVisible(false);
        this.hud.showBuildMenu(cx, cy);
      }
    } else this.closeMenus();
  }

  closeMenus() {
    this.rangeRing.setVisible(false);
    this.hud.closeMenu();
  }

  showRange(type, lvl, cx, cy) {
    const r = TOWERS[type].range[lvl - 1] * this.mods.range;
    const [sx, sy] = this.toScreen(cx + 0.5, cy + 0.5);
    this.rangeRing.setPosition(sx, sy).setDisplaySize(r * 2 * this.cs * (256 / 240), r * 2 * this.cs * (256 / 240)).setVisible(true);
  }

  // ---------- Башни ----------
  towerCost(type, lvl) {
    return Math.round(TOWERS[type].cost[lvl - 1] * this.mods.cost);
  }

  build(type, cx, cy) {
    const cost = this.towerCost(type, 1);
    if (this.gold < cost) {
      audio.play('error');
      this.hud.toast(tr('notEnough'));
      return false;
    }
    this.gold -= cost;
    const tw = { type, lvl: 1, cx, cy, spent: cost, cd: 0.2, aim: 0, kick: 0 };
    tw.base = this.add.image(0, 0, `tw_${type}_1`);
    if (type === 'cannon' || type === 'ballista') tw.head = this.add.image(0, 0, `tw_${type}head_1`);
    if (type === 'mage') tw.orb = this.add.image(0, 0, 'orb').setBlendMode(1);
    this.towers.set(cx + ',' + cy, tw);
    this.placeTower(tw);
    tw.base.setScale(tw.base.scaleX * 0.2, tw.base.scaleY * 0.2);
    this.tweens.add({ targets: tw.base, scaleX: tw.sc, scaleY: tw.sc, duration: 260, ease: 'Back.Out' });
    this.puffs(cx + 0.5, cy + 0.6, 6, 0xd9c7a6);
    audio.play('build');
    save.data.tut.build = true;
    return true;
  }

  upgrade(tw) {
    if (tw.lvl >= 4) return false;
    const cost = this.towerCost(tw.type, tw.lvl + 1);
    if (this.gold < cost) {
      audio.play('error');
      this.hud.toast(tr('notEnough'));
      return false;
    }
    this.gold -= cost;
    tw.spent += cost;
    tw.lvl++;
    tw.base.setTexture(`tw_${tw.type}_${tw.lvl}`);
    if (tw.head) tw.head.setTexture(`tw_${tw.type}head_${tw.lvl}`);
    this.placeTower(tw);
    this.tweens.add({ targets: tw.base, scaleY: { from: tw.sc * 1.15, to: tw.sc }, duration: 240, ease: 'Back.Out' });
    this.sparkles(tw.cx + 0.5, tw.cy + 0.3, 12, C.gold);
    audio.play('upgrade');
    save.data.tut.upgrade = true;
    return true;
  }

  sell(tw) {
    const refund = Math.floor(tw.spent * 0.7);
    this.gold += refund;
    tw.base.destroy();
    tw.head && tw.head.destroy();
    tw.orb && tw.orb.destroy();
    this.towers.delete(tw.cx + ',' + tw.cy);
    this.puffs(tw.cx + 0.5, tw.cy + 0.5, 8, 0xd9c7a6);
    this.coinPop(tw.cx + 0.5, tw.cy + 0.3, refund);
    audio.play('sell');
  }

  placeTower(tw) {
    const cs = this.cs;
    const [sx, sy] = this.toScreen(tw.cx + 0.5, tw.cy + 0.5);
    const sc = (cs * 1.08) / 128;
    tw.sc = sc;
    const by = sy + cs * 0.4;
    tw.base.setOrigin(0.5, 164 / 176).setPosition(sx, by).setScale(sc).setDepth(by);
    // точки крепления в текстуре
    const L = tw.lvl;
    let topY = 60;
    if (tw.type === 'cannon') topY = 104 - L * 4 - 4;
    if (tw.type === 'ballista') topY = 112 - L * 4 - 10;
    if (tw.type === 'archer') topY = (L >= 3 ? 64 : 72) - 22;
    if (tw.type === 'mage') topY = 92 - L * 5 - 52 - L * 3 - 12;
    if (tw.type === 'frost') topY = 108 - L * 4 - (52 + L * 8);
    tw.muzzle = [sx, by - (164 - topY) * sc];
    if (tw.head) tw.head.setPosition(sx, by - (164 - topY) * sc).setScale(sc).setDepth(by + 0.5).setRotation(tw.aim);
    if (tw.orb) tw.orb.setPosition(sx, by - (164 - topY) * sc).setScale(sc * 0.9).setDepth(by + 0.5);
  }

  // ---------- Волны ----------
  startWave() {
    if (this.waveIdx >= this.waves.length - 1) return;
    if (this.nextIn > 0 && this.waveIdx >= 0) {
      const bonus = Math.ceil(this.nextIn) * 2;
      if (bonus > 0) {
        this.gold += bonus;
        this.hud.floatAtScreen(this.hud.nextBtnPos(), '+' + bonus, C.gold);
        audio.play('coin');
      }
    }
    this.waveIdx++;
    this.nextIn = -1;
    const w = this.waves[this.waveIdx];
    for (const g of w.groups) {
      for (let i = 0; i < g.count; i++) this.spawnList.push({ t: this.spawnClock + g.delay + i * g.gap, type: g.type, path: g.path, hpBoost: g.hpBoost || 1 });
    }
    this.spawnList.sort((a, b) => a.t - b.t);
    const boss = w.groups.some((g) => ENEMIES[g.type].boss);
    const last = this.waveIdx === this.waves.length - 1;
    this.hud.banner(boss ? tr('bossWarn') : last ? tr('lastWave') : tr('wave') + ' ' + (this.waveIdx + 1) + '/' + this.waves.length, boss ? C.red : C.gold);
    audio.play(boss ? 'boss' : 'wave');
    audio.setMood(boss ? 'boss' : 'game');
    // знакомство с новыми врагами
    const fresh = [...new Set(w.groups.map((g) => g.type))].filter((tp) => !save.data.seen['e_' + tp]);
    if (fresh.length && !(this.debug && this.debug.bot)) {
      fresh.forEach((tp) => (save.data.seen['e_' + tp] = true));
      save.write(false);
      this.hud.showIntro(fresh.map((tp) => ({ kind: 'enemy', id: tp })));
    }
  }

  spawn(s) {
    const def = ENEMIES[s.type];
    const hp = def.hp * this.info.hpMul * s.hpBoost;
    const e = {
      type: s.type,
      def,
      hp,
      maxHp: hp,
      armor: def.armor,
      speed: def.speed * (0.94 + Math.random() * 0.12),
      d: 0,
      path: this.paths[Math.min(s.path, this.paths.length - 1)],
      off: def.boss ? 0 : (Math.random() - 0.5) * 0.36,
      x: 0,
      y: 0,
      slowT: 0,
      slowK: 0,
      alive: true,
      anim: Math.random() * 10,
      healT: 2,
      fly: !!def.fly,
      lastSx: 0,
    };
    e.shadow = this.img('shadow');
    e.spr = this.img(`en_${s.type}_0`);
    this.posEnemy(e);
    this.enemies.push(e);
  }

  posEnemy(e) {
    const p = e.path;
    let i = 1;
    while (i < p.cum.length - 1 && p.cum[i] < e.d) i++;
    const seg = p.cum[i] - p.cum[i - 1] || 1;
    const k = Math.min(1, Math.max(0, (e.d - p.cum[i - 1]) / seg));
    const [x0, y0] = p.pts[i - 1];
    const [x1, y1] = p.pts[i];
    const dx = (x1 - x0) / seg;
    const dy = (y1 - y0) / seg;
    e.x = x0 + (x1 - x0) * k - dy * e.off;
    e.y = y0 + (y1 - y0) * k + dx * e.off;
  }

  // ---------- Пул спрайтов ----------
  img(key) {
    const arr = this.pool[key] || (this.pool[key] = []);
    const s = arr.pop() || this.add.image(0, 0, key);
    s.__key = key;
    return s.setActive(true).setVisible(true).setAlpha(1).setRotation(0).setScale(1).setFlipX(false).clearTint().setBlendMode(0);
  }
  free(s) {
    s.setActive(false).setVisible(false);
    (this.pool[s.__key] || (this.pool[s.__key] = [])).push(s);
  }

  // ---------- Урон ----------
  hit(e, dmg, type, pierce = 0) {
    if (!e.alive) return;
    const real = type === 'magic' ? dmg : dmg * (1 - e.armor * (1 - pierce));
    e.hp -= real;
    e.flash = 0.08;
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    e.alive = false;
    this.kills++;
    const bounty = Math.round(e.def.bounty * this.mods.bounty);
    this.gold += bounty;
    this.puffs(e.x, e.y, e.def.boss ? 16 : 5, 0xffffff);
    if (e.def.boss) {
      this.cameras.main.shake(400, 0.01);
      audio.play('cannon');
    }
    audio.play('die');
    this.coinPop(e.x, e.y - 0.3, bounty);
    this.free(e.spr);
    this.free(e.shadow);
    if (e.ice) {
      this.free(e.ice);
      e.ice = null;
    }
  }

  leak(e) {
    e.alive = false;
    this.lives = Math.max(0, this.lives - e.def.lives);
    this.free(e.spr);
    this.free(e.shadow);
    if (e.ice) this.free(e.ice);
    audio.play('leak');
    this.hud.hurtFlash();
    // сколько жизней отнял прорвавшийся враг
    const [sx, sy] = this.toScreen(e.x, e.y);
    this.hud.floatAtScreen([sx, sy], '-' + e.def.lives, 0xff5a4a);
    if (this.lives <= 0 && !this.ended) this.onDefeat();
  }

  // ---------- Эффекты ----------
  puffs(x, y, n, color) {
    const [sx, sy] = this.toScreen(x, y);
    for (let i = 0; i < n; i++) {
      const s = this.img('puff');
      const a = Math.random() * Math.PI * 2;
      const d = (0.15 + Math.random() * 0.35) * this.cs;
      s.setPosition(sx, sy).setTint(color).setDepth(15000).setScale((this.cs / 64) * (0.25 + Math.random() * 0.2)).setAlpha(0.9);
      this.tweens.add({
        targets: s,
        x: sx + Math.cos(a) * d,
        y: sy + Math.sin(a) * d * 0.6 - this.cs * 0.15,
        alpha: 0,
        scale: s.scale * 1.8,
        duration: 380 + Math.random() * 200,
        onComplete: () => this.free(s),
      });
    }
  }

  sparkles(x, y, n, color) {
    const [sx, sy] = this.toScreen(x, y);
    for (let i = 0; i < n; i++) {
      const s = this.img('spark');
      const a = Math.random() * Math.PI * 2;
      const d = (0.2 + Math.random() * 0.5) * this.cs;
      s.setPosition(sx, sy).setTint(color).setDepth(15001).setBlendMode(1).setScale(this.cs / 50);
      this.tweens.add({ targets: s, x: sx + Math.cos(a) * d, y: sy + Math.sin(a) * d, alpha: 0, duration: 450, onComplete: () => this.free(s) });
    }
  }

  coinPop(x, y, n) {
    if (n <= 0) return;
    const [sx, sy] = this.toScreen(x, y);
    this.hud.floatAtScreen([sx, sy], '+' + n, C.gold, true);
  }

  // ---------- Заклинания ----------
  useSpell(id) {
    const sp = this.spells[id];
    if (!sp.ready || sp.cd > 0 || this.ended) return;
    if (id === 'meteor') {
      this.targeting = this.targeting === 'meteor' ? null : 'meteor';
      this.hud.setTargeting(this.targeting);
      this.closeMenus();
    } else if (id === 'freeze') {
      sp.cd = SPELLS.freeze.cd;
      this.frozenT = this.mods.freezeDur;
      for (const e of this.enemies) {
        if (!e.alive || e.ice) continue;
        e.ice = this.img('iceblock');
      }
      this.hud.flashScreen(0xbfe6f5);
      audio.play('freeze');
    }
  }

  castMeteor(x, y) {
    const sp = this.spells.meteor;
    sp.cd = this.mods.meteorCd;
    const [tx, ty] = this.toScreen(x, y);
    const m = this.img('meteor');
    const s = this.cs / 45;
    m.setPosition(tx + this.cs * 4, ty - this.cs * 6).setScale(s).setDepth(16000);
    audio.play('meteor');
    this.tweens.add({
      targets: m,
      x: tx,
      y: ty,
      duration: 480,
      ease: 'Quad.In',
      onComplete: () => {
        this.free(m);
        const R = SPELLS.meteor.radius;
        for (const e of this.enemies) {
          if (e.alive && Math.hypot(e.x - x, e.y - y) < R) this.hit(e, this.mods.meteorDmg, 'magic');
        }
        this.puffs(x, y, 14, 0xff9a3c);
        this.puffs(x, y, 8, 0x6b5a4a);
        const cr = this.img('crater');
        cr.setPosition(tx, ty).setScale((this.cs * 2.2) / 128).setDepth(-4);
        this.tweens.add({ targets: cr, alpha: 0, delay: 1500, duration: 1500, onComplete: () => this.free(cr) });
        this.cameras.main.shake(300, 0.008);
      },
    });
  }

  // ---------- Основной цикл ----------
  update(time, deltaMs) {
    if (!this.hud || !this.hud.ready) return;
    let dt = Math.min(deltaMs / 1000, 0.05);
    let steps = this.speed;
    if (this.debug && this.debug.sub) {
      steps = this.debug.sub;
      dt = 1 / 30;
    }
    for (let i = 0; i < steps; i++) {
      if (this.ended || this.pauseReasons.size) break;
      this.step(dt);
    }
    this.render();
  }

  step(dt) {
    if (this.debug && this.debug.bot) this.botThink(dt);
    // спавн и отсчёт
    if (this.waveIdx >= 0) {
      this.spawnClock += dt;
      while (this.spawnList.length && this.spawnList[0].t <= this.spawnClock) this.spawn(this.spawnList.shift());
      if (!this.spawnList.length && this.nextIn < 0 && this.waveIdx < this.waves.length - 1) this.nextIn = this.waveIdx === 0 ? 14 : 12;
      if (this.nextIn > 0) {
        this.nextIn -= dt;
        if (this.nextIn <= 0) {
          this.nextIn = 0;
          this.startWave();
        }
      }
    }
    for (const id in this.spells) if (this.spells[id].cd > 0) this.spells[id].cd = Math.max(0, this.spells[id].cd - dt);
    if (this.frozenT > 0) this.frozenT -= dt;

    // враги
    for (const e of this.enemies) {
      if (!e.alive) continue;
      let sp = e.speed;
      if (this.frozenT > 0 && !e.def.boss) sp = 0;
      else if (this.frozenT > 0) sp *= 0.4;
      else if (e.slowT > 0) {
        e.slowT -= dt;
        sp *= 1 - e.slowK;
      }
      e.d += sp * dt;
      e.anim += dt * (sp > 0 ? 1 : 0);
      if (e.flash > 0) e.flash -= dt;
      if (e.d >= e.path.len) {
        this.leak(e);
        continue;
      }
      this.posEnemy(e);
      if (e.def.heal) {
        e.healT -= dt;
        if (e.healT <= 0) {
          e.healT = 2.2;
          let healed = false;
          for (const o of this.enemies) {
            if (o.alive && o !== e && o.hp < o.maxHp && Math.hypot(o.x - e.x, o.y - e.y) < 1.4) {
              o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.12);
              healed = true;
              this.healFx(o);
            }
          }
          if (healed) audio.play('heal');
        }
      }
    }
    if (this.enemies.some((e) => !e.alive)) this.enemies = this.enemies.filter((e) => e.alive);
    if (this.frozenT <= 0) {
      for (const e of this.enemies)
        if (e.ice) {
          this.free(e.ice);
          e.ice = null;
        }
    }

    // башни
    for (const tw of this.towers.values()) this.towerStep(tw, dt);
    // снаряды
    this.projStep(dt);

    // победа
    if (!this.ended && this.waveIdx === this.waves.length - 1 && !this.spawnList.length && !this.enemies.length) this.onVictory();
  }

  towerStep(tw, dt) {
    const T = TOWERS[tw.type];
    const L = tw.lvl - 1;
    tw.cd -= dt;
    tw.kick = Math.max(0, tw.kick - dt * 4);
    const range = T.range[L] * this.mods.range;
    const cx = tw.cx + 0.5;
    const cy = tw.cy + 0.5;
    // выбор цели: дальше всех продвинувшийся (баллиста — самый живучий)
    let target = null;
    let best = -1;
    for (const e of this.enemies) {
      if (!e.alive || (e.fly && !T.air)) continue;
      if (Math.hypot(e.x - cx, e.y - cy) > range) continue;
      const score = tw.type === 'ballista' ? e.hp : e.d;
      if (score > best) {
        best = score;
        target = e;
      }
    }
    if (target && (tw.head || tw.type === 'ballista')) {
      const [tsx, tsy] = this.toScreen(target.x, target.y);
      const want = Math.atan2(tsy - tw.muzzle[1], tsx - tw.muzzle[0]);
      tw.aim = want;
    }
    if (!target || tw.cd > 0) return;
    tw.cd = 1 / T.rate[L];
    tw.kick = 1;
    const dmg = T.dmg[L] * this.mods.dmg[tw.type];
    const [ox, oy] = this.fromScreen(tw.muzzle[0], tw.muzzle[1]);
    const P = { kind: tw.type, x: ox, y: oy, target, tx: target.x, ty: target.y, dmg, L, alive: true };
    if (tw.type === 'archer') {
      P.speed = 9;
      P.spr = this.img('pr_arrow');
      audio.play('arrow');
    } else if (tw.type === 'cannon') {
      // упреждение: целимся туда, где враг будет через время полёта
      const T0 = 0.65;
      const ahead = Math.min(target.path.len, target.d + target.speed * T0 * (target.slowT > 0 ? 1 - target.slowK : 1));
      const dSave = target.d;
      target.d = ahead;
      this.posEnemy(target);
      P.tx = target.x;
      P.ty = target.y;
      target.d = dSave;
      this.posEnemy(target);
      P.sx = ox;
      P.sy = oy;
      P.t = 0;
      P.T = T0;
      P.spr = this.img('pr_ball');
      audio.play('cannon');
    } else if (tw.type === 'mage') {
      P.speed = 7;
      P.spr = this.img('pr_magic');
      P.spr.setBlendMode(1);
      audio.play('magic');
    } else if (tw.type === 'frost') {
      P.speed = 8;
      P.spr = this.img('pr_shard');
      audio.play('frost');
    } else if (tw.type === 'ballista') {
      P.speed = 14;
      P.spr = this.img('pr_bolt');
      audio.play('ballista');
    }
    P.spr.setDepth(17000);
    this.projs.push(P);
  }

  projStep(dt) {
    for (const P of this.projs) {
      if (!P.alive) continue;
      const T = TOWERS[P.kind];
      if (P.kind === 'cannon') {
        P.t += dt;
        const k = Math.min(1, P.t / P.T);
        P.x = P.sx + (P.tx - P.sx) * k;
        P.y = P.sy + (P.ty - P.sy) * k;
        P.h = Math.sin(Math.PI * k) * 1.1;
        if (k >= 1) {
          P.alive = false;
          const R = T.splash[P.L];
          for (const e of this.enemies) {
            if (!e.alive || e.fly) continue;
            const d = Math.hypot(e.x - P.x, e.y - P.y);
            if (d < R) this.hit(e, P.dmg * (d < R * 0.4 ? 1 : 0.7), 'phys');
          }
          this.puffs(P.x, P.y, 7, 0x8a7a6a);
          this.sparkles(P.x, P.y, 5, 0xffa040);
        }
        continue;
      }
      if (P.target && P.target.alive) {
        P.tx = P.target.x;
        P.ty = P.target.y - (P.target.fly ? 0.45 : 0.15);
      }
      const dx = P.tx - P.x;
      const dy = P.ty - P.y;
      const d = Math.hypot(dx, dy);
      const step = P.speed * dt;
      P.ang = Math.atan2(dy, dx);
      if (d <= step) {
        P.alive = false;
        const e = P.target;
        if (e && e.alive) {
          if (P.kind === 'ballista') this.hit(e, P.dmg, 'phys', T.pierceArmor);
          else this.hit(e, P.dmg, T.dmgType);
          if (P.kind === 'frost') {
            const slow = Math.min(0.75, T.slow[P.L] * this.mods.slow);
            const apply = (o) => {
              const k = o.def.boss ? slow * 0.5 : slow;
              o.slowK = o.slowT > 0 ? Math.max(o.slowK, k) : k;
              o.slowT = 1.6;
            };
            apply(e);
            if (T.splash[P.L] > 0) for (const o of this.enemies) if (o !== e && o.alive && Math.hypot(o.x - e.x, o.y - e.y) < T.splash[P.L]) apply(o);
            this.sparkles(e.x, e.y - 0.2, 4, 0xbfe6f5);
          }
          if (P.kind === 'mage') this.sparkles(e.x, e.y - 0.2, 5, 0xc89bff);
        }
      } else {
        P.x += (dx / d) * step;
        P.y += (dy / d) * step;
      }
    }
    for (const P of this.projs) if (!P.alive) this.free(P.spr);
    if (this.projs.some((p) => !p.alive)) this.projs = this.projs.filter((p) => p.alive);
  }

  healFx(o) {
    const [sx, sy] = this.toScreen(o.x, o.y);
    const s = this.img('healfx');
    s.setPosition(sx, sy - this.cs * 0.4).setScale(this.cs / 60).setDepth(15002);
    this.tweens.add({ targets: s, y: sy - this.cs * 0.9, alpha: 0, duration: 700, onComplete: () => this.free(s) });
  }

  // ---------- Отрисовка ----------
  render() {
    const cs = this.cs;
    const b = this.bars;
    b.clear();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const [sx, sy] = this.toScreen(e.x, e.y);
      const size = e.def.size;
      const frame = Math.floor(e.anim * (e.fly ? 6 : 5)) % 2;
      e.spr.setTexture(`en_${e.type}_${frame}`);
      const sc = (size * cs) / 100;
      const fly = e.fly ? cs * (0.5 + 0.06 * Math.sin(e.anim * 4)) : 0;
      const bob = e.fly ? 0 : Math.abs(Math.sin(e.anim * 9)) * cs * 0.05;
      if (Math.abs(sx - e.lastSx) > 0.01) e.spr.setFlipX(sx < e.lastSx);
      e.lastSx = sx;
      const footY = sy + cs * 0.12;
      e.spr.setOrigin(0.5, 116 / 128).setPosition(sx, footY - fly - bob).setScale(sc).setDepth(footY);
      e.shadow.setPosition(sx, footY).setScale((size * cs) / 55, (size * cs) / 55).setDepth(-3).setAlpha(e.fly ? 0.6 : 1);
      if (e.flash > 0) e.spr.setTintFill(0xffffff);
      else if (e.slowT > 0) e.spr.setTint(0xa8dcff);
      else e.spr.clearTint();
      if (e.ice) e.ice.setPosition(sx, footY - fly - size * cs * 0.4).setScale((size * cs) / 80).setDepth(footY + 0.4);
      // полоска здоровья
      if (e.hp < e.maxHp) {
        const w = Math.max(cs * 0.5, size * cs * 0.75);
        const h = Math.max(4, cs * 0.075);
        const top = footY - fly - size * cs * 0.98 - h;
        b.fillStyle(0x2b1a0e, 1).fillRect(sx - w / 2 - 1.5, top - 1.5, w + 3, h + 3);
        b.fillStyle(0x5a1a14, 1).fillRect(sx - w / 2, top, w, h);
        b.fillStyle(e.def.boss ? 0xff7a2a : 0x7be04f, 1).fillRect(sx - w / 2, top, (w * Math.max(0, e.hp)) / e.maxHp, h);
      }
    }
    for (const tw of this.towers.values()) {
      if (tw.head) tw.head.setRotation(tw.aim).setScale(tw.sc * (1 - tw.kick * 0.08), tw.sc);
      if (tw.orb) tw.orb.setScale(tw.sc * (0.8 + 0.12 * Math.sin(this.time.now / 250 + tw.cx)));
    }
    for (const P of this.projs) {
      if (!P.alive) continue;
      const [sx, sy] = this.toScreen(P.x, P.y);
      if (P.kind === 'cannon') {
        P.spr.setPosition(sx, sy - P.h * cs).setScale(cs / 70);
      } else {
        P.spr.setPosition(sx, sy);
        const [ax, ay] = this.portrait ? [Math.sin(P.ang || 0), Math.cos(P.ang || 0)] : [Math.cos(P.ang || 0), Math.sin(P.ang || 0)];
        P.spr.setRotation(Math.atan2(ay, ax)).setScale(cs / (P.kind === 'mage' ? 70 : 80));
      }
    }
  }

  // ---------- Конец уровня ----------
  onVictory() {
    this.ended = true;
    sdk.gameplay(false);
    const ratio = this.lives / this.maxLives;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1;
    const prev = save.starsOf(this.lvl);
    const newStars = Math.max(0, stars - prev);
    const gems = 4 + this.lvl * 2 + newStars * 8;
    save.data.stars[this.lvl] = Math.max(prev, stars);
    save.data.gems += gems;
    save.write();
    if (newStars > 0) sdk.submitScore(save.totalStars());
    this.result = { win: true, stars, gems, newStars, doubled: false };
    audio.play('victory');
    this.time.delayedCall(600, () => this.hud.showVictory(this.result));
  }

  onDefeat() {
    this.setPause('modal', true);
    if (!this.continueUsed) this.hud.showContinue();
    else this.finalDefeat();
  }

  doContinue() {
    this.continueUsed = true;
    this.lives = 10;
    // отбрасываем ближайших к замку врагов назад
    for (const e of this.enemies) if (e.alive && e.path.len - e.d < 3) e.d = Math.max(0, e.d - 4);
    this.setPause('modal', false);
  }

  finalDefeat() {
    this.ended = true;
    sdk.gameplay(false);
    audio.play('defeat');
    this.result = { win: false };
    this.hud.showDefeat();
  }

  doubleReward() {
    if (!this.result || this.result.doubled) return;
    this.result.doubled = true;
    save.data.gems += this.result.gems;
    this.result.gems *= 2;
    save.write();
  }

  // ---------- Бот для автотестов баланса ----------
  botThink(dt) {
    this.botT = (this.botT || 0) - dt;
    if (this.waveIdx < 0) {
      if (this.towers.size >= 2 || this.gold < 70) this.startWave();
    } else if (this.debug.botEarly && this.nextIn > 0 && this.nextIn < 10) this.startWave();
    if (this.botT > 0) return;
    this.botT = 0.5;
    // заклинания
    if (this.spells.meteor.ready && this.spells.meteor.cd <= 0 && this.enemies.length) {
      let best = null;
      let bn = 0;
      for (const e of this.enemies) {
        let n = 0;
        for (const o of this.enemies) if (Math.hypot(o.x - e.x, o.y - e.y) < 1.4) n += o.def.boss ? 6 : 1;
        if (n > bn) {
          bn = n;
          best = e;
        }
      }
      if (best && bn >= 4) this.castMeteor(best.x, best.y);
    }
    if (this.spells.freeze.ready && this.spells.freeze.cd <= 0 && this.enemies.some((e) => e.path.len - e.d < 3 || (e.def.boss && e.path.len - e.d < 8))) this.useSpell('freeze');
    const avail = TOWER_ORDER.filter((t) => TOWERS[t].unlock <= this.lvl);
    const plan = this.debug.botPlan || ['archer', 'cannon', 'mage', 'archer', 'frost', 'cannon', 'ballista', 'mage', 'archer'];
    const n = this.towers.size;
    // чередуем: новая башня / улучшение самой слабой
    let weakest = null;
    for (const tw of this.towers.values()) if (tw.lvl < 4 && (!weakest || tw.lvl < weakest.lvl)) weakest = tw;
    const wantMore = n < 3 + this.waveIdx * 0.5 || !weakest || (weakest.lvl >= 2 && n < 4 + this.waveIdx * 0.8);
    if (!wantMore && weakest) {
      if (this.towerCost(weakest.type, weakest.lvl + 1) <= this.gold) this.upgrade(weakest);
      return;
    }
    let type = plan[n % plan.length];
    if (!avail.includes(type)) type = avail[n % avail.length];
    if (this.towerCost(type, 1) > this.gold) return;
    // клетка с наибольшим покрытием пути
    const R = TOWERS[type].range[0] * this.mods.range;
    let bestK = null;
    let bestScore = -1;
    for (const k of this.tiles.build) {
      if (this.towers.has(k)) continue;
      const [x, y] = k.split(',').map(Number);
      let score = 0;
      for (const pk of this.tiles.path) {
        const [px, py] = pk.split(',').map(Number);
        if (Math.hypot(px - x, py - y) <= R) score++;
      }
      score += Math.random() * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestK = k;
      }
    }
    if (bestK) {
      const [x, y] = bestK.split(',').map(Number);
      this.build(type, x, y);
    }
  }
}
