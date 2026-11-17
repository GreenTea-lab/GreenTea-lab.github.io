// Симуляция арены: танки, фигуры, пули, дроны, ловушки, боссы. Без Phaser — можно гонять в node.
import { TANKS, SHAPES, BOSSES, STATS, STAT_MAX, LEVEL_SCORE, MAX_LEVEL, levelOf, pointsAt, upgradeOptions, TEAM_COLORS, ENEMY_COLOR } from './data.js';
import { thinkBot, botAlloc, botPickClass, newBrain } from './bots.js';
import { randomName } from './names.js';

const D2R = Math.PI / 180;
const CELL = 200;
const CONTACT_CD = 0.1;
const SI = Object.fromEntries(STATS.map((s, i) => [s.id, i]));

let NEXT_ID = 1;

export class World {
  constructor(opts = {}) {
    this.mode = opts.mode || 'ffa';
    this.size = opts.size || 5600;
    this.half = this.size / 2;
    this.nest = 720; // половина стороны «гнезда» пентагонов в центре
    this.botCount = opts.bots ?? 14;
    this.t = 0;
    this.ents = [];
    this.tanks = [];
    this.events = [];
    this.contacts = new Map();
    this.grid = new Map();
    this.counts = { square: 0, triangle: 0, pentagon: 0, alpha: 0, crasher: 0, crasherBig: 0 };
    this.player = null;
    this.usedNames = new Set();
    this.joinQueue = [];
    this.nextBoss = opts.bossAt ?? 150 + Math.random() * 60;
    this.boss = null;
    this.alphaAt = 0;
    this.quotas = { square: 360, triangle: 100, pentagon: 22, nestPent: 24, crasher: 14, crasherBig: 6 };
    this.onRemove = null;
    if (this.mode === 'teams') {
      this.baseW = 520;
      this.bases = [
        { team: 0, x0: -this.half, x1: -this.half + this.baseW },
        { team: 1, x0: this.half - this.baseW, x1: this.half },
      ];
    } else this.bases = [];
    // стартовое наполнение
    for (let i = 0; i < 1600 && this.needShapes(); i++) this.spawnShape(true);
    for (const b of this.bases) for (let i = 0; i < 4; i++) this.spawnProtector(b, i);
    for (let i = 0; i < this.botCount; i++) this.spawnBot(true);
  }

  // ---------- Создание сущностей ----------
  add(e) {
    e.id = NEXT_ID++;
    e.vx = e.vx || 0;
    e.vy = e.vy || 0;
    e.dead = false;
    e.born = this.t;
    this.ents.push(e);
    if (e.kind === 'tank') this.tanks.push(e);
    return e;
  }

  needShapes() {
    const c = this.counts;
    const q = this.quotas;
    return c.square < q.square || c.triangle < q.triangle || c.pentagon < q.pentagon + q.nestPent || c.crasher < q.crasher || c.crasherBig < q.crasherBig;
  }

  inNest(x, y, pad = 0) {
    return Math.abs(x) < this.nest + pad && Math.abs(y) < this.nest + pad;
  }

  freeSpot(minDist, tries, inNest) {
    const h = this.half - 120;
    let best = null;
    for (let i = 0; i < tries; i++) {
      let x, y;
      if (inNest) {
        x = (Math.random() * 2 - 1) * (this.nest - 60);
        y = (Math.random() * 2 - 1) * (this.nest - 60);
      } else {
        x = (Math.random() * 2 - 1) * h;
        y = (Math.random() * 2 - 1) * h;
        if (this.inNest(x, y, 80)) continue;
        if (this.bases.some((b) => x > b.x0 - 100 && x < b.x1 + 100)) continue;
      }
      let ok = true;
      if (this.boss && !this.boss.dead && Math.hypot(this.boss.x - x, this.boss.y - y) < 1700) ok = false;
      for (const t of this.tanks) {
        if (Math.hypot(t.x - x, t.y - y) < minDist) {
          ok = false;
          break;
        }
      }
      best = { x, y };
      if (ok) return best;
    }
    return best;
  }

  spawnShape(initial) {
    const c = this.counts;
    const q = this.quotas;
    let type, nest = false;
    if (c.crasher < q.crasher) (type = 'crasher'), (nest = true);
    else if (c.crasherBig < q.crasherBig) (type = 'crasherBig'), (nest = true);
    else if (c.pentagon < q.nestPent) (type = 'pentagon'), (nest = true);
    else if (c.square < q.square) type = 'square';
    else if (c.triangle < q.triangle) type = 'triangle';
    else if (c.pentagon < q.pentagon + q.nestPent) type = 'pentagon';
    else return null;
    if (type === 'pentagon' && !nest && Math.random() < 0.5) nest = true;
    const p = this.freeSpot(initial ? 0 : 650, 10, nest);
    if (!p) return null;
    return this.makeShape(type, p.x, p.y);
  }

  makeShape(type, x, y) {
    const d = SHAPES[type];
    const a = Math.random() * Math.PI * 2;
    const sp = d.chase ? 0 : 6 + Math.random() * 8;
    this.counts[type]++;
    return this.add({
      kind: 'shape',
      type,
      x,
      y,
      r: d.r,
      hp: d.hp,
      maxHp: d.hp,
      dmg: d.dmg,
      xp: d.xp,
      team: d.chase ? -2 : -1,
      mass: type === 'alpha' ? 40 : type === 'pentagon' ? 4 : 1,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.3),
      dvx: Math.cos(a) * sp,
      dvy: Math.sin(a) * sp,
      color: d.color,
      sides: d.sides,
      chase: d.chase || 0,
    });
  }

  // ---------- Танки ----------
  makeTank(o) {
    const t = this.add({
      kind: 'tank',
      x: o.x,
      y: o.y,
      r: 24,
      angle: Math.random() * Math.PI * 2,
      team: 0,
      name: o.name || '',
      cls: 'basic',
      score: o.score || 0,
      level: 1,
      stats: [0, 0, 0, 0, 0, 0, 0, 0],
      kills: 0,
      hp: 50,
      maxHp: 50,
      dmg: 20,
      mass: 1,
      color: o.color,
      skin: o.skin || null,
      isPlayer: !!o.isPlayer,
      input: { mx: 0, my: 0, ax: 0, ay: 0, fire: false, repel: false },
      cds: [],
      autos: [],
      drones: 0,
      shield: o.shield ?? 4,
      lastHurt: -99,
      lastHitter: null,
      alpha: 1,
      spinOn: false,
      autoFire: false,
      recoil: [],
      fired: 0,
      bornT: this.t,
      skipTier: 0,
    });
    t.team = this.mode === 'teams' ? o.team : 1000 + t.id;
    this.setScore(t, t.score, true);
    this.setClass(t, 'basic');
    t.hp = t.maxHp;
    return t;
  }

  spawnPos(team) {
    if (this.mode === 'teams') {
      const b = this.bases[team];
      return { x: (b.x0 + b.x1) / 2 + (Math.random() - 0.5) * (this.baseW - 160), y: (Math.random() * 2 - 1) * (this.half - 300) };
    }
    return this.freeSpot(1100, 30, false);
  }

  teamFor() {
    const n = [0, 0];
    for (const t of this.tanks) if (!t.dead && t.team < 2) n[t.team]++;
    return n[0] <= n[1] ? 0 : 1;
  }

  spawnBot(initial) {
    const name = randomName(this.usedNames);
    this.usedNames.add(name);
    let team = this.mode === 'teams' ? this.teamFor() : 0;
    if (this.mode === 'teams' && this.player && !initial) team = this.teamFor();
    const p = this.spawnPos(team);
    // при открытии арены боты уже «играют» какое-то время
    let score = 0;
    if (initial) {
      const r = Math.random();
      const lvl = r < 0.25 ? 1 + Math.floor(Math.random() * 12) : r < 0.7 ? 12 + Math.floor(Math.random() * 22) : 34 + Math.floor(Math.random() * 12);
      score = LEVEL_SCORE[Math.min(MAX_LEVEL, lvl)] + Math.random() * 300;
      if (r > 0.93) score = 25000 + Math.random() * 40000;
    }
    const color = this.mode === 'teams' ? TEAM_COLORS[team] : ENEMY_COLOR;
    const t = this.makeTank({ x: p.x, y: p.y, name, team, score, color, shield: initial ? 0 : 4 });
    t.bot = newBrain(t);
    botAlloc(this, t);
    for (let i = 0; i < 4; i++) botPickClass(this, t);
    return t;
  }

  addPlayer({ name, color, skin, score = 0, team }) {
    if (this.mode === 'teams' && team === undefined) team = this.teamFor();
    const p = this.spawnPos(team || 0);
    const t = this.makeTank({ x: p.x, y: p.y, name, color, skin, score, isPlayer: true, team: team || 0, shield: 5 });
    this.player = t;
    return t;
  }

  setScore(t, score, init) {
    t.score = score;
    const lvl = levelOf(score);
    if (lvl !== t.level || init) {
      const up = lvl > t.level;
      t.level = lvl;
      if (!init && up) this.events.push({ type: 'levelup', tank: t, level: lvl });
      this.recalc(t);
    }
  }

  addScore(t, xp) {
    if (!t || t.dead || t.kind !== 'tank') return;
    this.setScore(t, t.score + xp);
  }

  freePoints(t) {
    return pointsAt(t.level) - t.stats.reduce((a, b) => a + b, 0);
  }

  statCap(t, i) {
    const c = TANKS[t.cls];
    if (c.smasher && !c.allStats) return [0, 1, 2, 7].includes(i) ? 10 : 0;
    if (c.smasher) return [0, 1, 2, 7].includes(i) ? 10 : STAT_MAX;
    return STAT_MAX;
  }

  upgradeStat(t, i) {
    if (this.freePoints(t) <= 0 || t.stats[i] >= this.statCap(t, i)) return false;
    t.stats[i]++;
    const oldMax = t.maxHp;
    this.recalc(t);
    if (t.maxHp > oldMax) t.hp += t.maxHp - oldMax;
    return true;
  }

  classOptions(t) {
    return upgradeOptions(t.cls, t.level);
  }

  setClass(t, id) {
    t.cls = id;
    const c = TANKS[id];
    t.cds = c.barrels.map((b) => b.d);
    t.recoil = c.barrels.map(() => 0);
    t.autos = (c.autos || []).map((a) => ({ ...a, ang: t.angle, cd: 0, target: null, recoil: 0 }));
    // характеристики сверх лимита (смэшер) сбрасываются в свободные очки
    for (let i = 0; i < 8; i++) t.stats[i] = Math.min(t.stats[i], this.statCap(t, i));
    if (!c.drones) this.killDrones(t);
    this.recalc(t);
    this.events.push({ type: 'class', tank: t });
  }

  upgradeClass(t, id) {
    if (!this.classOptions(t).includes(id)) return false;
    this.setClass(t, id);
    return true;
  }

  recalc(t) {
    const s = t.stats;
    const c = TANKS[t.cls];
    const L = t.level;
    const frac = t.maxHp ? t.hp / t.maxHp : 1;
    t.maxHp = 50 + 2 * (L - 1) + 20 * s[SI.maxhp];
    t.hp = Math.min(t.maxHp, Math.max(1, frac * t.maxHp));
    const sm = c.smasher || 0;
    t.dmg = (20 + 6 * s[SI.body]) * (sm ? 1 + 0.5 * sm : 1);
    t.regen = 0.0035 + 0.0055 * s[SI.regen];
    t.speed = 285 * (1 + 0.075 * s[SI.move]) * (1 - 0.0055 * (L - 1)) * (sm ? 1.08 : 1);
    t.bspd = 560 * (1 + 0.085 * s[SI.bspd]);
    t.bpen = 8 * (1 + 0.75 * s[SI.pen]);
    t.bdmg = 7 * (1 + 0.43 * s[SI.bdmg]);
    t.reload = 0.6 * Math.pow(0.914, s[SI.reload]);
    t.r = 24 * Math.pow(1.01, L - 1);
    t.mass = (t.r / 24) * (t.r / 24) * (sm ? 1.6 : 1);
    t.fov = (1 + (L - 1) * 0.006) * c.fov;
    t.maxDrones = c.drones || 0;
  }

  // ---------- Шаг симуляции ----------
  step(dt) {
    this.t += dt;
    const ents = this.ents;
    // боты думают
    for (const t of this.tanks) if (t.bot && !t.dead) thinkBot(this, t, dt);
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (e.dead) continue;
      switch (e.kind) {
        case 'tank':
          this.updTank(e, dt);
          break;
        case 'shape':
          this.updShape(e, dt);
          break;
        case 'bullet':
          this.updBullet(e, dt);
          break;
        case 'drone':
          this.updDrone(e, dt);
          break;
        case 'trap':
          this.updTrap(e, dt);
          break;
        case 'boss':
          this.updBoss(e, dt);
          break;
      }
    }
    this.collide(dt);
    this.cleanup();
    this.spawning(dt);
  }

  bounds(e, dt) {
    const h = this.half;
    const k = 1 - Math.exp(-dt * 4);
    if (e.x < -h) e.vx += (-h - e.x) * k * 8;
    else if (e.x > h) e.vx += (h - e.x) * k * 8;
    if (e.y < -h) e.vy += (-h - e.y) * k * 8;
    else if (e.y > h) e.vy += (h - e.y) * k * 8;
  }

  updTank(t, dt) {
    const c = TANKS[t.cls];
    const inp = t.input;
    // движение: плавный разгон к целевой скорости
    let mx = inp.mx, my = inp.my;
    const ml = Math.hypot(mx, my);
    if (ml > 1) (mx /= ml), (my /= ml);
    const k = 1 - Math.exp(-dt * 6);
    t.vx += (mx * t.speed - t.vx) * k;
    t.vy += (my * t.speed - t.vy) * k;
    this.bounds(t, dt);
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    // прицел
    if (t.spinOn) t.angle += dt * 1.6;
    else if (inp.aim !== undefined) t.angle = inp.aim;
    else {
      const dx = inp.ax - t.x, dy = inp.ay - t.y;
      if (dx * dx + dy * dy > 1) t.angle = Math.atan2(dy, dx);
    }
    // регенерация; через 30 с без урона — быстрое восстановление
    if (t.hp < t.maxHp) {
      let rg = t.regen;
      if (this.t - t.lastHurt > 30) rg += 0.06;
      t.hp = Math.min(t.maxHp, t.hp + t.maxHp * rg * dt);
    }
    if (t.shield > 0) t.shield -= dt;
    // стрельба
    const fire = (inp.fire || t.autoFire) && !(t.shield > 0 && t.isPlayer && t.shieldHold);
    if (fire && t.shield > 0 && this.t - t.bornT > 0.4) t.shield = 0; // выстрел снимает защиту
    const bs = c.barrels;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      const full = t.reload * b.r * (b.kind === 'drone' ? 1.6 : 1);
      t.recoil[i] = Math.max(0, t.recoil[i] - dt * 6);
      const isDrone = b.kind === 'drone';
      // дроны появляются сами, пока их меньше лимита
      const want = isDrone ? b.mini ? fire : !c.necro && t.drones < t.maxDrones : fire;
      if (want) {
        t.cds[i] -= dt;
        if (t.cds[i] <= 0) {
          t.cds[i] += full;
          if (t.cds[i] < 0) t.cds[i] = 0;
          this.fireBarrel(t, b, i, t);
        }
      } else {
        t.cds[i] = Math.max(t.cds[i] - dt, b.d * full);
      }
    }
    if (fire || ml > 0.1) t.lastAct = this.t;
    // невидимость
    if (c.invis) {
      const still = this.t - (t.lastAct || 0) > 0.6;
      t.alpha = still ? Math.max(0, t.alpha - dt * 0.9) : Math.min(1, t.alpha + dt * 3);
    } else t.alpha = 1;
    // автотурели
    if (t.autos.length) this.updAutos(t, dt, fire);
  }

  updAutos(o, dt, manual) {
    const range = 720;
    for (const a of o.autos) {
      a.recoil = Math.max(0, (a.recoil || 0) - dt * 6);
      const base = (o.angle || 0) + a.a * D2R;
      const px = o.x + Math.cos(base) * a.dist * o.r;
      const py = o.y + Math.sin(base) * a.dist * o.r;
      let tx = null, ty = null;
      if (manual && o.kind === 'tank' && !o.bot && TANKS[o.cls].barrels.length === 0 && !TANKS[o.cls].smasher) {
        tx = o.input.ax;
        ty = o.input.ay;
      } else {
        // ищем цель раз в 0.25 с
        a.scan = (a.scan || 0) - dt;
        if (a.scan <= 0 || !a.target || a.target.dead) {
          a.scan = 0.25;
          a.target = this.nearestTarget(o, px, py, range);
        }
        if (a.target && !a.target.dead) {
          const tg = a.target;
          const d = Math.hypot(tg.x - px, tg.y - py);
          const lead = d / (o.bspd || 500);
          tx = tg.x + tg.vx * lead;
          ty = tg.y + tg.vy * lead;
          if (d > range + tg.r) tx = null;
        }
      }
      if (tx !== null) {
        const want = Math.atan2(ty - py, tx - px);
        let da = ((want - a.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        a.ang += Math.max(-dt * 9, Math.min(dt * 9, da));
        a.cd -= dt;
        if (a.cd <= 0 && Math.abs(da) < 0.25) {
          a.cd = (o.reload || 0.6) * 1.15;
          a.recoil = 1;
          const tr = o.r * 0.42;
          const b = { a: 0, l: 1.65, w: 0.56, y: 0, kind: 'gun', dmg: 0.42, pen: 0.6, spd: 1, s: 1, k: 0, sp: 3, life: 0.8 };
          this.spawnBullet(o, b, px, py, a.ang, tr, o);
        }
      } else {
        a.ang += dt * 0.8;
        a.cd = Math.max(0, a.cd - dt);
      }
    }
  }

  nearestTarget(o, x, y, range, shapesOnly) {
    let best = null;
    const spare = o.bot && !(o.lastTankHitter && o.lastTankHitter.isPlayer && this.t - o.lastHurt < 4);
    let bd = range * range;
    let bestTank = null;
    let btd = range * range;
    this.query(x, y, range, (e) => {
      if (e.dead || e.team === o.team) return;
      if (e.kind === 'bullet' || e.kind === 'trap') return;
      if (e.kind === 'drone' && e.protector) return;
      if (e.kind === 'tank' && (e.alpha < 0.3 || e.shield > 0)) return;
      if (shapesOnly && e.kind !== 'shape') return;
      // боты не добивают новичка-игрока автотурелями
      if (spare && e.isPlayer && e.level < 15) return;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (e.kind === 'tank' || e.kind === 'boss') {
        if (d < btd) (btd = d), (bestTank = e);
      } else if (d < bd) (bd = d), (best = e);
    });
    return bestTank || best;
  }

  // выстрел из ствола b владельца o
  fireBarrel(o, b, i, owner) {
    const R = o.r;
    const ang = o.angle + b.a * D2R;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const px = o.x - sa * b.y * R;
    const py = o.y + ca * b.y * R;
    if (o.recoil) o.recoil[i] = 1;
    if (b.kind === 'drone') return this.spawnDrone(o, b, px + ca * b.l * R * 0.8, py + sa * b.l * R * 0.8, ang);
    if (b.kind === 'trap') return this.spawnTrap(o, b, px + ca * b.l * R, py + sa * b.l * R, ang);
    this.spawnBullet(o, b, px, py, ang, R, owner);
  }

  spawnBullet(o, b, px, py, ang, R, owner) {
    const spread = (Math.random() - 0.5) * 2 * (b.sp || 0) * D2R;
    const a = ang + spread;
    const ca = Math.cos(a), sa = Math.sin(a);
    const br = (b.w * R) / 2 * (b.s || 1);
    const spd = (o.bspd || 500) * (b.spd || 1) * (0.97 + Math.random() * 0.06);
    const len = b.l * R;
    const k = (b.k ?? 1) * 22 * (br / 12) / (o.mass || 1);
    o.vx -= Math.cos(ang) * k;
    o.vy -= Math.sin(ang) * k;
    o.fired = this.t;
    this.events.push({ type: 'shot', o, x: px + Math.cos(ang) * len, y: py + Math.sin(ang) * len, size: br });
    return this.add({
      kind: 'bullet',
      x: px + Math.cos(ang) * (len - br * 0.4),
      y: py + Math.sin(ang) * (len - br * 0.4),
      vx: ca * spd,
      vy: sa * spd,
      r: br,
      hp: (o.bpen || 8) * (b.pen || 1),
      dmg: (o.bdmg || 7) * (b.dmg || 1),
      team: o.team,
      owner: owner,
      life: 1.55 * (b.life || 1),
      mass: 0.2,
      color: o.color,
    });
  }

  spawnDrone(o, b, x, y, ang) {
    const R = o.r;
    const isMini = !!b.mini;
    if (!isMini) o.drones = (o.drones || 0) + 1;
    const r = (b.w2 || b.w) * R * 0.48;
    const boss = o.kind === 'boss';
    return this.add({
      kind: 'drone',
      shape: b.square || o.necro ? 'square' : 'tri',
      x,
      y,
      vx: Math.cos(ang) * 200,
      vy: Math.sin(ang) * 200,
      r: isMini ? r * 1.1 : r,
      hp: (o.bpen || 8) * (boss ? 1 : 1.2) * (isMini ? 0.7 : 1) * (b.square ? 1.6 : 1),
      dmg: (o.bdmg || 7) * (boss ? 1 : 0.72) * (isMini ? 0.75 : 1),
      speed: (o.bspd || 500) * (boss ? 0.42 : 0.54),
      team: o.team,
      owner: o,
      angle: ang,
      life: isMini ? 4 : boss ? 18 : Infinity,
      mini: isMini,
      mass: 0.5,
      color: o.color,
    });
  }

  spawnTrap(o, b, x, y, ang) {
    const R = o.r;
    const spd = (o.bspd || 500) * (b.spd || 0.75) * 1.25;
    const r = b.w * R * 0.55;
    const k = (b.k ?? 0.6) * 12 / (o.mass || 1);
    o.vx -= Math.cos(ang) * k;
    o.vy -= Math.sin(ang) * k;
    o.fired = this.t;
    return this.add({
      kind: 'trap',
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r,
      hp: (o.bpen || 8) * 2 * (b.pen || 1),
      dmg: (o.bdmg || 7) * (b.dmg || 1),
      team: o.team,
      owner: o,
      angle: ang,
      spin: (Math.random() - 0.5) * 2,
      life: 14,
      mass: 0.6,
      color: o.color,
    });
  }

  updBullet(e, dt) {
    e.life -= dt;
    if (e.life <= 0) return this.kill(e, null);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  updTrap(e, dt) {
    e.life -= dt;
    if (e.life <= 0) return this.kill(e, null);
    const f = Math.exp(-dt * 3.2);
    e.vx *= f;
    e.vy *= f;
    e.angle += e.spin * dt * Math.min(1, Math.hypot(e.vx, e.vy) / 100);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  updDrone(e, dt) {
    const o = e.owner;
    if (e.protector) return this.updProtector(e, dt);
    if (!o || o.dead) return this.kill(e, null);
    e.life -= dt;
    if (e.life <= 0) return this.kill(e, null);
    let tx, ty;
    let away = false;
    const inp = o.input || {};
    const active = o.kind === 'tank' && (inp.fire || o.autoFire || inp.repel);
    if (o.kind === 'boss') {
      const tg = o.target;
      if (tg && !tg.dead) (tx = tg.x), (ty = tg.y);
      else {
        const a = this.t * 0.8 + e.id;
        tx = o.x + Math.cos(a) * o.r * 2.2;
        ty = o.y + Math.sin(a) * o.r * 2.2;
      }
    } else if (active) {
      tx = inp.ax;
      ty = inp.ay;
      away = !!inp.repel;
    } else {
      // без команды дроны кружат возле хозяина и нападают на то, что рядом
      e.scan = (e.scan || 0) - dt;
      if (e.scan <= 0) {
        e.scan = 0.4;
        e.auto = this.nearestTarget(o, o.x, o.y, 420, true);
      }
      if (e.auto && !e.auto.dead && Math.hypot(e.auto.x - o.x, e.auto.y - o.y) < 520) (tx = e.auto.x), (ty = e.auto.y);
      else {
        const a = this.t * 1.4 + (e.id % 12) * 0.52;
        const rr = o.r * 3;
        tx = o.x + Math.cos(a) * rr;
        ty = o.y + Math.sin(a) * rr;
      }
    }
    let dx = tx - e.x, dy = ty - e.y;
    let d = Math.hypot(dx, dy) || 1;
    if (away) (dx = -dx), (dy = -dy);
    const sp = e.speed;
    const k = 1 - Math.exp(-dt * 5);
    e.vx += ((dx / d) * sp - e.vx) * k;
    e.vy += ((dy / d) * sp - e.vy) * k;
    e.angle = Math.atan2(e.vy, e.vx);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    this.bounds(e, dt);
  }

  updShape(e, dt) {
    e.angle += e.spin * dt;
    const k = 1 - Math.exp(-dt * 2);
    let tvx = e.dvx, tvy = e.dvy;
    if (e.chase) {
      // крашеры гоняются за танками рядом с гнездом
      e.scan = (e.scan || 0) - dt;
      if (e.scan <= 0) {
        e.scan = 0.3;
        e.target = null;
        let bd = 560 * 560;
        for (const t of this.tanks) {
          if (t.dead || t.alpha < 0.3 || t.shield > 0) continue;
          const d = (t.x - e.x) ** 2 + (t.y - e.y) ** 2;
          if (d < bd && this.inNest(t.x, t.y, 300)) (bd = d), (e.target = t);
        }
      }
      const sp = e.type === 'crasher' ? 240 : 195;
      if (e.target && !e.target.dead) {
        const dx = e.target.x - e.x, dy = e.target.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        tvx = (dx / d) * sp;
        tvy = (dy / d) * sp;
        e.angle = Math.atan2(dy, dx);
      } else if (!this.inNest(e.x, e.y)) {
        const d = Math.hypot(e.x, e.y) || 1;
        tvx = (-e.x / d) * 80;
        tvy = (-e.y / d) * 80;
      } else {
        const a = this.t * 0.3 + e.id;
        tvx = Math.cos(a) * 40;
        tvy = Math.sin(a) * 40;
      }
      const kk = 1 - Math.exp(-dt * 4);
      e.vx += (tvx - e.vx) * kk;
      e.vy += (tvy - e.vy) * kk;
    } else {
      e.vx += (tvx - e.vx) * k;
      e.vy += (tvy - e.vy) * k;
    }
    // пентагоны в гнезде не уплывают наружу
    if (e.nest || (e.type === 'pentagon' && this.inNest(e.x, e.y))) e.nest = 1;
    if (e.nest && !this.inNest(e.x, e.y)) {
      e.dvx = -Math.sign(e.x) * Math.abs(e.dvx || 6);
      e.dvy = -Math.sign(e.y) * Math.abs(e.dvy || 6);
    }
    this.bounds(e, dt);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  // ---------- Боссы ----------
  spawnBoss(type) {
    const d = BOSSES[type];
    const side = Math.floor(Math.random() * 4);
    const h = this.half - 400;
    const s = (Math.random() * 2 - 1) * h * 0.8;
    const pos = [
      [s, -h],
      [h, s],
      [s, h],
      [-h, s],
    ][side];
    const b = this.add({
      kind: 'boss',
      type,
      x: pos[0],
      y: pos[1],
      r: d.r,
      hp: d.hp,
      maxHp: d.hp,
      dmg: d.dmg,
      xp: d.xp,
      team: -3,
      mass: 30,
      angle: 0,
      color: d.color,
      sides: d.sides,
      cds: d.barrels.map((x) => x.d),
      recoil: d.barrels.map(() => 0),
      autos: (d.autos || []).map((a) => ({ ...a, ang: 0, cd: 0 })),
      drones: 0,
      maxDrones: d.drones || 0,
      bspd: 560,
      bpen: type === 'defender' ? 20 : 14,
      bdmg: type === 'defender' ? 9 : 12,
      reload: 0.55,
      wander: Math.random() * Math.PI * 2,
      name: type,
    });
    this.boss = b;
    this.events.push({ type: 'boss', boss: b });
    return b;
  }

  updBoss(b, dt) {
    const d = BOSSES[b.type];
    b.scan = (b.scan || 0) - dt;
    if (b.scan <= 0) {
      b.scan = 0.5;
      b.target = null;
      let bd = 1150 * 1150;
      for (const t of this.tanks) {
        if (t.dead || t.alpha < 0.3 || t.shield > 0) continue;
        const dd = (t.x - b.x) ** 2 + (t.y - b.y) ** 2;
        if (dd < bd) (bd = dd), (b.target = t);
      }
    }
    let tvx, tvy;
    if (b.target) {
      const dx = b.target.x - b.x, dy = b.target.y - b.y;
      const dd = Math.hypot(dx, dy) || 1;
      tvx = (dx / dd) * d.speed;
      tvy = (dy / dd) * d.speed;
      const want = Math.atan2(dy, dx);
      if (b.type === 'defender') b.angle += dt * 0.5;
      else b.angle = want;
    } else {
      b.wander += (Math.random() - 0.5) * dt;
      tvx = Math.cos(b.wander) * d.speed * 0.6;
      tvy = Math.sin(b.wander) * d.speed * 0.6;
      b.angle += dt * 0.3;
      if (Math.abs(b.x) > this.half - 500 || Math.abs(b.y) > this.half - 500) b.wander = Math.atan2(-b.y, -b.x);
    }
    const k = 1 - Math.exp(-dt * 2);
    b.vx += (tvx - b.vx) * k;
    b.vy += (tvy - b.vy) * k;
    this.bounds(b, dt);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const firing = !!b.target;
    d.barrels.forEach((br, i) => {
      b.recoil[i] = Math.max(0, b.recoil[i] - dt * 6);
      const full = b.reload * br.r * (br.kind === 'drone' ? 1.6 : 1) * (br.kind === 'trap' ? 2 : 1);
      const want = br.kind === 'drone' ? b.drones < b.maxDrones : firing;
      if (want) {
        b.cds[i] -= dt;
        if (b.cds[i] <= 0) {
          b.cds[i] += full;
          this.fireBarrel(b, br, i, b);
        }
      }
    });
    if (b.autos.length) this.updAutos(b, dt, false);
    if (b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.002 * dt);
  }

  // ---------- Базы (режим команд) ----------
  spawnProtector(base, i) {
    const cx = (base.x0 + base.x1) / 2;
    return this.add({
      kind: 'drone',
      protector: true,
      shape: 'tri',
      base,
      x: cx,
      y: (i - 1.5) * 500,
      r: 30,
      hp: 1e9,
      maxHp: 1e9,
      dmg: 200,
      speed: 520,
      team: base.team,
      owner: null,
      angle: 0,
      life: Infinity,
      mass: 50,
      color: base.team === 0 ? 0x31f6ff : 0xff2e88,
      home: { x: cx, y: (i - 1.5) * 900 },
    });
  }

  updProtector(e, dt) {
    const b = e.base;
    e.scan = (e.scan || 0) - dt;
    if (e.scan <= 0) {
      e.scan = 0.2;
      e.target = null;
      let bd = Infinity;
      for (const t of this.tanks) {
        if (t.dead || t.team === b.team) continue;
        if (t.x < b.x0 - 60 || t.x > b.x1 + 60) continue;
        const d = (t.x - e.x) ** 2 + (t.y - e.y) ** 2;
        if (d < bd) (bd = d), (e.target = t);
      }
    }
    let tx = e.home.x + Math.cos(this.t + e.id) * 120, ty = e.home.y + Math.sin(this.t * 0.7 + e.id) * 200;
    if (e.target && !e.target.dead) (tx = e.target.x), (ty = e.target.y);
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = e.target ? e.speed : 160;
    const k = 1 - Math.exp(-dt * 5);
    e.vx += ((dx / d) * sp * Math.min(1, d / 60) - e.vx) * k;
    e.vy += ((dy / d) * sp * Math.min(1, d / 60) - e.vy) * k;
    e.angle = Math.atan2(e.vy, e.vx);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.hp = e.maxHp;
  }

  // ---------- Столкновения ----------
  query(x, y, r, fn) {
    const g = this.grid;
    const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL);
    const r0 = Math.floor((y - r) / CELL), r1 = Math.floor((y + r) / CELL);
    for (let cx = c0; cx <= c1; cx++)
      for (let cy = r0; cy <= r1; cy++) {
        const arr = g.get(cx * 4096 + cy);
        if (arr) for (let i = 0; i < arr.length; i++) fn(arr[i]);
      }
  }

  collide(dt) {
    const g = this.grid;
    for (const arr of g.values()) arr.length = 0;
    const ents = this.ents;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      e.idx = i;
      if (e.dead) continue;
      const key = Math.floor(e.x / CELL) * 4096 + Math.floor(e.y / CELL);
      let arr = g.get(key);
      if (!arr) g.set(key, (arr = []));
      arr.push(e);
    }
    for (let i = 0; i < ents.length; i++) {
      const a = ents[i];
      if (a.dead) continue;
      const cx = Math.floor(a.x / CELL), cy = Math.floor(a.y / CELL);
      for (let ox = -1; ox <= 1; ox++)
        for (let oy = -1; oy <= 1; oy++) {
          const arr = g.get((cx + ox) * 4096 + cy + oy);
          if (!arr) continue;
          for (let j = 0; j < arr.length; j++) {
            const b = arr[j];
            if (b.idx <= i || b.dead || a.dead) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const rr = a.r + b.r;
            if (dx * dx + dy * dy >= rr * rr) continue;
            this.pair(a, b, dx, dy, dt);
          }
        }
    }
  }

  pair(a, b, dx, dy, dt) {
    const ka = a.kind, kb = b.kind;
    const projA = ka === 'bullet' || ka === 'trap' || ka === 'drone';
    const projB = kb === 'bullet' || kb === 'trap' || kb === 'drone';
    const same = a.team === b.team;
    if (same) {
      // свои: мягко расталкиваются только тела, дроны и ловушки
      if (ka === 'bullet' || kb === 'bullet') return;
      if ((projA && !projB) || (projB && !projA)) return;
      this.push(a, b, dx, dy, 0.25);
      return;
    }
    // фигуры между собой и с крашерами — только толкаются
    const neutralA = a.team === -1 || a.team === -2;
    const neutralB = b.team === -1 || b.team === -2;
    if (neutralA && neutralB) {
      this.push(a, b, dx, dy, 0.3);
      return;
    }
    // босс и фигуры не трогают друг друга
    if ((a.team === -3 && b.team === -1) || (b.team === -3 && a.team === -1)) {
      this.push(a, b, dx, dy, 0.3);
      return;
    }
    // пули/ловушки пролетают сквозь, толкая цель
    if (ka !== 'bullet' && kb !== 'bullet') this.push(a, b, dx, dy, 1);
    else {
      const bl = ka === 'bullet' ? a : b;
      const ot = bl === a ? b : a;
      if (ot.kind !== 'bullet') {
        const m = 0.04 * (bl.r / 10) / (ot.mass || 1);
        ot.vx += bl.vx * m;
        ot.vy += bl.vy * m;
      }
    }
    // урон не чаще, чем раз в CONTACT_CD для пары
    const key = a.id < b.id ? a.id * 1e7 + b.id : b.id * 1e7 + a.id;
    const next = this.contacts.get(key);
    if (next !== undefined && next > this.t) return;
    this.contacts.set(key, this.t + CONTACT_CD);
    this.hit(a, b);
  }

  push(a, b, dx, dy, k) {
    const d = Math.hypot(dx, dy) || 0.01;
    const ov = a.r + b.r - d;
    const nx = dx / d, ny = dy / d;
    const ma = a.mass || 1, mb = b.mass || 1;
    const fa = mb / (ma + mb), fb = ma / (ma + mb);
    const s = ov * k;
    a.x -= nx * s * fa;
    a.y -= ny * s * fa;
    b.x += nx * s * fb;
    b.y += ny * s * fb;
    const imp = ov * 6 * k;
    a.vx -= nx * imp * fa;
    a.vy -= ny * imp * fa;
    b.vx += nx * imp * fb;
    b.vy += ny * imp * fb;
  }

  dmgTo(target, src) {
    let d = src.dmg;
    // танк легче переносит тараны фигур
    if (target.kind === 'tank' && (src.kind === 'shape' || src.kind === 'boss')) d *= 0.6;
    if (target.kind === 'tank' && src.kind === 'drone' && src.owner && src.owner.kind === 'boss') d *= 0.6;
    return d;
  }

  hit(a, b) {
    const da = this.dmgTo(a, b), db = this.dmgTo(b, a);
    this.damage(a, da, b);
    this.damage(b, db, a);
  }

  ownerOf(e) {
    if (e.kind === 'tank' || e.kind === 'boss') return e;
    if (e.owner) return e.owner;
    return e;
  }

  damage(e, amount, src) {
    if (e.dead || amount <= 0) return;
    if (e.kind === 'tank' && e.shield > 0) return;
    if (e.protector) return;
    e.hp -= amount;
    if (e.kind === 'tank' || e.kind === 'shape' || e.kind === 'boss') {
      e.lastHurt = this.t;
      e.hurtFlash = 1;
      const o = this.ownerOf(src);
      if (o && (o.kind === 'tank' || o.kind === 'boss' || o.kind === 'shape')) e.lastHitter = o;
      if (e.kind === 'tank' && o && o.kind === 'tank') e.lastTankHitter = o;
    }
    if (e.hp <= 0) this.kill(e, this.ownerOf(src));
  }

  kill(e, killer) {
    if (e.dead) return;
    e.dead = true;
    e.deathT = this.t;
    if (e.kind === 'shape') {
      this.counts[e.type]--;
      if (e.type === 'alpha') this.alphaAt = this.t + 120;
    }
    if (e.kind === 'drone' && e.owner && !e.mini) e.owner.drones = Math.max(0, (e.owner.drones || 0) - 1);
    const k = killer && !killer.dead ? killer : killer;
    const credit = k && k.kind === 'tank' ? k : null;
    if (e.kind === 'shape' || e.kind === 'boss') {
      if (credit) {
        this.addScore(credit, e.xp);
        // некромант превращает квадраты в своих дронов
        if (e.kind === 'shape' && e.type === 'square' && TANKS[credit.cls].necro && credit.drones < credit.maxDrones) {
          const dr = this.spawnDrone(credit, { w: 0.84, w2: 0.84, square: 1 }, e.x, e.y, e.angle);
          dr.r = e.r * 0.9;
          dr.fromShape = 1;
        }
      }
      this.events.push({ type: 'die', e, killer: credit });
      if (e.kind === 'boss') {
        this.boss = null;
        this.events.push({ type: 'bossdead', e, killer: credit });
      }
    }
    if (e.kind === 'tank') {
      const kt = credit || (e.lastTankHitter && !e.lastTankHitter.dead && this.t - e.lastHurt < 5 ? e.lastTankHitter : null);
      if (kt && kt !== e) {
        this.addScore(kt, Math.min(e.score, LEVEL_SCORE[MAX_LEVEL]));
        kt.kills++;
      }
      this.killDrones(e);
      this.events.push({ type: 'tankdead', e, killer: kt || killer });
      if (e.bot) {
        this.usedNames.delete(e.name);
        this.joinQueue.push(this.t + 2 + Math.random() * 6);
      }
      if (e === this.player) this.player = null;
    }
    if (this.onRemove) this.onRemove(e);
  }

  killDrones(t) {
    for (const e of this.ents) if (e.kind === 'drone' && e.owner === t && !e.dead) this.kill(e, null);
    t.drones = 0;
  }

  cleanup() {
    const ents = this.ents;
    let w = 0;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (!e.dead) ents[w++] = e;
    }
    ents.length = w;
    if (this.tanks.some((t) => t.dead)) this.tanks = this.tanks.filter((t) => !t.dead);
    if (Math.floor(this.t) !== Math.floor(this.t - 1 / 60)) {
      for (const [k, v] of this.contacts) if (v < this.t) this.contacts.delete(k);
    }
  }

  spawning(dt) {
    // фигуры: понемногу каждую секунду
    this.shapeAcc = (this.shapeAcc || 0) + dt * 30;
    while (this.shapeAcc >= 1) {
      this.shapeAcc--;
      if (this.needShapes()) this.spawnShape(false);
    }
    // альфа-пентагон в гнезде
    if (this.counts.alpha < 1 && this.t > this.alphaAt) {
      this.alphaAt = this.t + 60;
      if (Math.random() < 0.6) this.makeShape('alpha', (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300).nest = 1;
    }
    // новые боты «заходят» на сервер
    for (let i = this.joinQueue.length - 1; i >= 0; i--) {
      if (this.joinQueue[i] <= this.t) {
        this.joinQueue.splice(i, 1);
        const alive = this.tanks.filter((t) => t.bot).length;
        if (alive < this.botCount) this.spawnBot(false);
      }
    }
    // боссы
    if (!this.boss && this.mode === 'ffa' && this.t > this.nextBoss) {
      this.nextBoss = this.t + 220 + Math.random() * 140;
      const types = Object.keys(BOSSES);
      this.spawnBoss(types[Math.floor(Math.random() * types.length)]);
    }
  }

  leaderboard(n = 10) {
    return this.tanks
      .filter((t) => !t.dead)
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }

  rankOf(t) {
    let r = 1;
    for (const o of this.tanks) if (!o.dead && o !== t && o.score > t.score) r++;
    return r;
  }
}
