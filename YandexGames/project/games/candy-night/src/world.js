// Логика уровня (без графики): игрок, конфеты, дома, котёл, фонари, враги, боссы, события
import { genMap, Nav, CS, WALK, rng } from './map.js';
import { LEVELS, ENEMY, BOSS, stats } from './data.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const HOME_R = 2.3; // радиус зоны сдачи у котла

export class World {
  constructor(idx, { up = {}, seed = 1, extraTime = 0 } = {}) {
    this.idx = idx;
    this.lv = LEVELS[idx];
    this.R = rng(seed * 7919 + idx * 131);
    this.map = genMap(this.lv, 1000 + idx * 37 + (seed % 3) * 0);
    this.nav = new Nav(this.map);
    this.st = stats(up);
    this.t = 0;
    this.time = this.lv.time + extraTime;
    this.banked = 0;
    this.finished = false;
    this.won = false;
    this.fx = [];
    this.caught = 0;
    this.hits = 0;
    this.knocks = 0;
    this.midnight = false;
    const m = this.map;
    // игрок появляется у котла
    const hb = m.home;
    const p = this.freeNear(hb.cx * CS, (hb.y1 + 1.5) * CS);
    this.p = { x: p[0], z: p[1], dir: Math.PI, bag: 0, dashT: 0, dashCd: 0, hurtT: 0, slowT: 0, powerT: 0, knock: 0, knockHouse: null, vx: 0, vz: 0, moving: false, combo: 0 };
    this.cauldron = { x: m.homeX, z: m.homeZ };
    // дома
    this.houses = m.blocks
      .filter((b) => b.kind === 'house')
      .map((b) => ({ b, x: b.doorX, z: b.doorZ, lit: this.R() < 0.85, cd: 4 + this.R() * 10, trick: this.R() < this.lv.trick, side: b.door.s, knockT: 0 }));
    // конфеты на улицах
    this.candies = [];
    for (const [i, j] of m.walkCells) {
      if (this.inHome(i, j)) continue;
      if (this.R() < this.lv.streetP) this.addCandy((i + 0.5) * CS, (j + 0.5) * CS, 1);
    }
    this.streetBase = this.candies.length;
    this.respawnT = 6;
    // фонари: в углах карты и в скверах
    this.lanterns = [];
    const spots = [[0, 0], [m.W - 1, 0], [0, m.H - 1], [m.W - 1, m.H - 1]];
    for (const b of m.blocks) if (b.kind === 'park') spots.push([b.x0, b.y1]);
    spots.sort(() => this.R() - 0.5);
    // ближайший к дому фонарь — в первом уровне с фонарём
    for (let k = 0; k < Math.min(this.lv.lanterns, spots.length); k++) {
      const [i, j] = spots[k];
      this.lanterns.push({ x: (i + 0.5) * CS, z: (j + 0.5) * CS, on: true, cd: 0 });
      this.candies = this.candies.filter((c) => Math.hypot(c.x - (i + 0.5) * CS, c.z - (j + 0.5) * CS) > 0.5);
    }
    // враги
    this.enemies = [];
    this.bats = [];
    this.puddles = [];
    this.bones = [];
    this.waves = [];
    const en = this.lv.en || {};
    for (let k = 0; k < (en.ghost || 0); k++) this.spawnGhost();
    for (let k = 0; k < (en.skel || 0); k++) this.spawnWalker('skel');
    for (let k = 0; k < (en.jack || 0); k++) this.spawnWalker('jack');
    for (let k = 0; k < (en.spider || 0); k++) this.spawnSpider();
    for (let k = 0; k < (en.witch || 0); k++) this.spawnWitch(k);
    this.boss = null;
    if (this.lv.boss) this.spawnBoss(this.lv.boss);
    this.evT = this.lv.boss ? 1e9 : 18;
    this.evIdx = 0;
    this.fieldP = null;
    this.fieldCell = -1;
    this.homeField = this.nav.field(Math.floor(m.homeX / CS), hb.y1 + 1);
  }

  // ---------- помощники ----------
  cellOf(x, z) {
    return [Math.floor(x / CS), Math.floor(z / CS)];
  }
  walkAt(x, z) {
    const [i, j] = this.cellOf(x, z);
    return this.nav.walk(i, j);
  }
  inHome(i, j) {
    const h = this.map.home;
    return i >= h.x0 - 1 && i <= h.x1 + 1 && j >= h.y0 - 1 && j <= h.y1 + 1;
  }
  freeNear(x, z) {
    const [i0, j0] = this.cellOf(x, z);
    for (let r = 0; r < 6; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) if (this.nav.walk(i0 + di, j0 + dj)) return [(i0 + di + 0.5) * CS, (j0 + dj + 0.5) * CS];
    return [x, z];
  }
  randomCell(minDistFromPlayer = 0, avoidHome = true) {
    const m = this.map;
    for (let k = 0; k < 60; k++) {
      const [i, j] = m.walkCells[Math.floor(this.R() * m.walkCells.length)];
      if (avoidHome && this.inHome(i, j)) continue;
      if (this.p && Math.hypot((i + 0.5) * CS - this.p.x, (j + 0.5) * CS - this.p.z) < minDistFromPlayer) continue;
      return [i, j];
    }
    return m.walkCells[0];
  }
  addCandy(x, z, v = 1, o = {}) {
    const c = { x, z, v, kind: v >= 5 ? 1 : 0, col: Math.floor(this.R() * 6), y: 0, vy: 0, fly: 0, ttl: o.ttl || 0, age: 0, dead: false, fromX: o.fromX, fromZ: o.fromZ };
    if (o.fromX !== undefined) {
      c.fly = 0.55;
      c.flyT = 0;
    }
    this.candies.push(c);
    return c;
  }
  emit(t, o = {}) {
    this.fx.push(Object.assign({ t }, o));
  }
  get power() {
    return this.p.powerT > 0;
  }
  get bagFull() {
    return this.p.bag >= this.st.bag;
  }
  speedMul() {
    return this.midnight ? 1.15 : 1;
  }

  // ---------- враги: появление ----------
  spawnGhost(o = {}) {
    const [i, j] = o.at || this.randomCell(10);
    const e = { type: 'ghost', x: (i + 0.5) * CS, z: (j + 0.5) * CS, ti: i, tj: j, home: [i, j], t: this.R() * 3, state: 'wander', fade: 1, dead: 0, temp: o.temp || 0, party: !!o.party, wT: 0, wTarget: null, id: Math.random(), y: 0, dir: 0 };
    e.fade = o.pop ? 0.6 : 1;
    this.enemies.push(e);
    return e;
  }
  spawnWalker(type, o = {}) {
    const [i, j] = o.at || this.randomCell(11);
    const e = { type, x: (i + 0.5) * CS, z: (j + 0.5) * CS, ti: i, tj: j, home: [i, j], t: this.R() * 2, state: 'wander', fade: 1, dead: 0, temp: o.temp || 0, wTarget: null, hopT: this.R(), hop: 0, fromX: 0, fromZ: 0, y: 0, dir: 0, cdir: [0, 0], id: Math.random() };
    this.enemies.push(e);
    return e;
  }
  spawnSpider() {
    // клетка улицы подальше от дома и других пауков
    for (let k = 0; k < 40; k++) {
      const [i, j] = this.randomCell(8);
      const x = (i + 0.5) * CS,
        z = (j + 0.5) * CS;
      if (this.enemies.some((e) => e.type === 'spider' && Math.hypot(e.x - x, e.z - z) < 6)) continue;
      const S = ENEMY.spider;
      this.enemies.push({ type: 'spider', x, z, t: this.R() * (S.up + S.warn + S.down), phase: 'up', y: 3, fade: 1, dead: 0, id: Math.random(), dir: 0 });
      return;
    }
  }
  spawnWitch(k) {
    const m = this.map;
    this.enemies.push({ type: 'witch', a: k * Math.PI + this.R(), cx: (m.W * CS) / 2, cz: (m.H * CS) / 2, rx: m.W * CS * 0.36, rz: m.H * CS * 0.34, x: 0, z: 0, y: 3.2, t: 1.5 + k, fade: 1, dead: 0, id: Math.random(), dir: 0 });
  }
  spawnBoss(kind) {
    const [i, j] = this.randomCell(14);
    const B = BOSS[kind];
    const e = { type: 'boss', kind, x: (i + 0.5) * CS, z: (j + 0.5) * CS, ti: i, tj: j, hp: B.hp, max: B.hp, t: 0, atk: 5, stun: 0, y: 0, fade: 1, dead: 0, hop: 0, hopT: 1, id: Math.random(), dir: 0, sw: 0, intro: 2.2 };
    this.boss = e;
    this.enemies.push(e);
  }

  // ---------- шаг симуляции ----------
  // inp: { mx, mz } — направление движения в мире (длина ≤ 1), dash — рывок
  step(dt, inp = {}) {
    if (this.finished) return;
    this.t += dt;
    if (!this.midnight && this.time - this.t <= 30 && !this.lv.boss) {
      this.midnight = true;
      this.emit('midnight');
    }
    this.updatePlayer(dt, inp);
    this.updateCandies(dt);
    this.updateHouses(dt);
    this.updateLanterns(dt);
    this.updateEnemies(dt);
    this.updateHazards(dt);
    this.updateEvents(dt);
    if (this.t >= this.time) this.finish(this.lv.boss ? false : this.banked >= this.lv.goal[0]);
  }

  finish(won) {
    if (this.finished) return;
    this.finished = true;
    this.won = won;
    this.emit(won ? 'win' : 'lose');
  }

  stars() {
    if (this.lv.boss && !this.won) return 0;
    const g = this.lv.goal;
    let s = 0;
    if (this.lv.boss) s = 1 + (this.banked >= g[1]) + (this.banked >= g[2]);
    else for (const v of g) if (this.banked >= v) s++;
    return s;
  }

  // ---------- игрок ----------
  updatePlayer(dt, inp) {
    const P = this.p;
    P.hurtT = Math.max(0, P.hurtT - dt);
    P.dashCd = Math.max(0, P.dashCd - dt);
    P.powerT = Math.max(0, P.powerT - dt);
    if (P.powerT <= 0) P.combo = 0;
    let mx = inp.mx || 0,
      mz = inp.mz || 0;
    const l = Math.hypot(mx, mz);
    if (l > 1) (mx /= l), (mz /= l);
    if (inp.dash && P.dashCd <= 0 && (l > 0.1 || P.moving)) {
      P.dashT = 0.22;
      P.dashCd = this.st.dashCd;
      if (l < 0.1) (mx = Math.sin(P.dir)), (mz = Math.cos(P.dir));
      this.emit('dash', { x: P.x, z: P.z });
    }
    // лужи замедляют
    P.slowT = Math.max(0, P.slowT - dt);
    for (const pd of this.puddles) if (Math.hypot(pd.x - P.x, pd.z - P.z) < pd.r) P.slowT = 0.25;
    let sp = this.st.speed * (P.slowT > 0 ? 0.55 : 1) * (P.bag >= this.st.bag ? 0.93 : 1);
    if (P.dashT > 0) {
      P.dashT -= dt;
      sp *= 3;
      if (l < 0.1) (mx = Math.sin(P.dir)), (mz = Math.cos(P.dir));
      else {
        const k = Math.hypot(mx, mz);
        (mx /= k), (mz /= k);
      }
    }
    // отброс после удара
    if (Math.abs(P.vx) + Math.abs(P.vz) > 0.01) {
      this.moveCircle(P, P.vx * dt, P.vz * dt, 0.42);
      P.vx *= Math.pow(0.02, dt);
      P.vz *= Math.pow(0.02, dt);
    }
    P.moving = Math.hypot(mx, mz) > 0.08;
    if (P.moving) {
      const want = Math.atan2(mx, mz);
      let d = want - P.dir;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      P.dir += d * Math.min(1, dt * 14);
      this.laneAssist(P, mx, mz, sp * dt);
      this.moveCircle(P, mx * sp * dt, mz * sp * dt, 0.42);
    }
    // котёл: сдать конфеты
    if (Math.hypot(P.x - this.cauldron.x, P.z - this.cauldron.z) < HOME_R + 0.9 && P.bag > 0) {
      const n = P.bag;
      const full = n >= this.st.bag;
      const bonus = Math.floor(n / 10) * 2 + (full ? 5 : 0);
      this.banked += n + bonus;
      P.bag = 0;
      this.emit('bank', { n, bonus, full });
      if (this.lv.boss) {
        // в бою с боссом котёл ещё и подсвечивает фонари
      }
    }
    // стук в дверь
    let near = null;
    for (const h of this.houses) if (h.lit && Math.hypot(h.x - P.x, h.z - P.z) < 1.35) near = h;
    if (near && !this.bagFull) {
      if (P.knockHouse !== near) {
        P.knockHouse = near;
        P.knock = 0;
        this.emit('knock', { h: near });
      }
      P.knock += dt;
      if (P.knock >= 0.45) this.treat(near);
    } else {
      if (near && this.bagFull && !P.fullWarn) {
        P.fullWarn = 1.5;
        this.emit('full');
      }
      P.knockHouse = null;
      P.knock = 0;
    }
    if (P.fullWarn) P.fullWarn = Math.max(0, P.fullWarn - dt);
  }

  treat(h) {
    const P = this.p;
    h.lit = false;
    h.cd = this.lv.relight + this.R() * 10;
    P.knockHouse = null;
    P.knock = 0;
    this.knocks++;
    const fromX = h.x - Math.sin(0) * 0,
      fromZ = h.z;
    if (h.trick) {
      // «гадость»: из двери вылетает озорной призрак
      h.trick = this.R() < 0.5;
      const [i, j] = this.cellOf(h.x, h.z);
      const g = this.spawnGhost({ at: [i, j], temp: 12, pop: 1 });
      g.state = 'chase';
      g.stunT = 0.7;
      this.emit('trick', { x: h.x, z: h.z });
      this.give(2, fromX, fromZ);
    } else {
      const n = 4 + Math.floor(this.R() * 3) + this.lv.wi;
      this.emit('treat', { x: h.x, z: h.z, n });
      this.give(n, fromX, fromZ);
    }
  }

  // положить конфеты в мешок, лишние — на землю рядом
  give(n, fx, fz) {
    const P = this.p;
    const room = this.st.bag - P.bag;
    const take = Math.min(room, n);
    P.bag += take;
    if (take > 0) this.emit('gain', { n: take, x: fx, z: fz });
    for (let k = take; k < n; k++) this.dropNear(fx, fz, 1);
  }

  dropNear(x, z, v, ttl = 14) {
    for (let k = 0; k < 8; k++) {
      const a = this.R() * TAU,
        r = 0.6 + this.R() * 1.8;
      const nx = x + Math.sin(a) * r,
        nz = z + Math.cos(a) * r;
      if (this.walkAt(nx, nz)) return this.addCandy(nx, nz, v, { ttl, fromX: x, fromZ: z });
    }
    return this.addCandy(x, z, v, { ttl });
  }

  hurt(fromX, fromZ) {
    const P = this.p;
    if (P.hurtT > 0 || P.dashT > 0 || this.finished) return false;
    P.hurtT = 1.4;
    this.hits++;
    const lose = P.bag > 0 ? Math.max(1, Math.ceil(P.bag * 0.5)) : 0;
    P.bag -= lose;
    for (let k = 0; k < lose; k++) this.dropNear(P.x, P.z, 1, 10);
    const a = Math.atan2(P.x - fromX, P.z - fromZ);
    P.vx = Math.sin(a) * 7;
    P.vz = Math.cos(a) * 7;
    this.emit('hurt', { x: P.x, z: P.z, lose });
    return true;
  }

  laneAssist(P, mx, mz, step) {
    const [i, j] = this.cellOf(P.x, P.z);
    const cx = (i + 0.5) * CS,
      cz = (j + 0.5) * CS;
    if (Math.abs(mx) > Math.abs(mz) * 1.2) {
      const sx = Math.sign(mx);
      const off = P.z - cz;
      if (Math.abs(off) > 0.02 && this.nav.walk(i + sx, j) && !this.nav.walk(i + sx, j + Math.sign(off))) P.z -= Math.sign(off) * Math.min(Math.abs(off), step * 0.9);
    } else if (Math.abs(mz) > Math.abs(mx) * 1.2) {
      const sz = Math.sign(mz);
      const off = P.x - cx;
      if (Math.abs(off) > 0.02 && this.nav.walk(i, j + sz) && !this.nav.walk(i + Math.sign(off), j + sz)) P.x -= Math.sign(off) * Math.min(Math.abs(off), step * 0.9);
    }
  }

  // движение круга с выталкиванием из сплошных клеток
  moveCircle(o, dx, dz, r) {
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.3) || 1;
    for (let s = 0; s < steps; s++) {
      o.x += dx / steps;
      this.resolve(o, r);
      o.z += dz / steps;
      this.resolve(o, r);
    }
  }
  resolve(o, r) {
    const m = this.map;
    const i0 = Math.floor((o.x - r) / CS),
      i1 = Math.floor((o.x + r) / CS);
    const j0 = Math.floor((o.z - r) / CS),
      j1 = Math.floor((o.z + r) / CS);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        if (this.nav.walk(i, j)) continue;
        const nx = clamp(o.x, i * CS, (i + 1) * CS),
          nz = clamp(o.z, j * CS, (j + 1) * CS);
        let ddx = o.x - nx,
          ddz = o.z - nz;
        const d = Math.hypot(ddx, ddz);
        if (d < r) {
          if (d < 1e-5) {
            // центр внутри клетки — выталкиваем к ближайшей стороне
            ddx = o.x - (i + 0.5) * CS;
            ddz = o.z - (j + 0.5) * CS;
            const k = Math.hypot(ddx, ddz) || 1;
            o.x += (ddx / k) * r;
            o.z += (ddz / k) * r;
          } else {
            o.x += (ddx / d) * (r - d);
            o.z += (ddz / d) * (r - d);
          }
        }
      }
    o.x = clamp(o.x, r, m.W * CS - r);
    o.z = clamp(o.z, r, m.H * CS - r);
  }

  // ---------- конфеты ----------
  updateCandies(dt) {
    const P = this.p;
    const mag = this.st.magnet;
    const full = this.bagFull;
    let alive = 0;
    for (const c of this.candies) {
      if (c.dead) continue;
      c.age += dt;
      if (c.fly > 0) {
        c.flyT += dt;
        if (c.flyT >= c.fly) c.fly = 0;
        continue;
      }
      if (c.ttl && c.age > c.ttl) {
        c.dead = true;
        continue;
      }
      alive++;
      if (full) continue;
      const d = Math.hypot(c.x - P.x, c.z - P.z);
      if (d < mag * 2.2 && d > 0.01) {
        const k = Math.min(1, (dt * 9) / d);
        c.x += (P.x - c.x) * k * (d < mag ? 1 : 0.35);
        c.z += (P.z - c.z) * k * (d < mag ? 1 : 0.35);
      }
      if (d < 0.55) {
        const take = Math.min(c.v, this.st.bag - P.bag);
        if (take <= 0) continue;
        P.bag += take;
        c.dead = true;
        this.emit('pick', { x: c.x, z: c.z, v: c.v });
      }
    }
    if (this.candies.length > 400) this.candies = this.candies.filter((c) => !c.dead);
    // понемногу подсыпаем конфеты на улицы
    this.respawnT -= dt;
    if (this.respawnT <= 0) {
      this.respawnT = 7;
      const street = this.candies.filter((c) => !c.dead && !c.ttl).length;
      if (street < this.streetBase * 0.75) for (let k = 0; k < 6; k++) {
        const [i, j] = this.randomCell(7);
        this.addCandy((i + 0.5) * CS, (j + 0.5) * CS, 1);
      }
    }
    this.aliveCandies = alive;
  }

  // ---------- дома ----------
  updateHouses(dt) {
    for (const h of this.houses) {
      if (h.lit) continue;
      h.cd -= dt;
      if (h.cd <= 0) {
        h.lit = true;
        if (!h.trick && this.lv.trick && this.R() < this.lv.trick * 0.5) h.trick = true;
        this.emit('relight', { h });
      }
    }
  }

  updateLanterns(dt) {
    const P = this.p;
    for (const L of this.lanterns) {
      if (!L.on) {
        L.cd -= dt;
        if (L.cd <= 0) L.on = true;
        continue;
      }
      if (Math.hypot(L.x - P.x, L.z - P.z) < 0.9) {
        L.on = false;
        L.cd = this.lv.boss ? 10 : 24;
        P.powerT = this.st.lantern;
        P.combo = 0;
        this.emit('power', { x: L.x, z: L.z });
      }
    }
  }

  // ---------- враги ----------
  playerField() {
    const [i, j] = this.cellOf(this.p.x, this.p.z);
    const k = j * this.map.W + i;
    if (k !== this.fieldCell || !this.fieldP) {
      this.fieldCell = k;
      this.fieldP = this.nav.field(i, j, this.fieldP);
    }
    return this.fieldP;
  }

  // ходьба по клеткам: к центру целевой клетки, по прибытии — решение о следующей
  gridMove(e, sp, dt, decide) {
    let rem = sp * dt;
    for (let g = 0; g < 3 && rem > 0; g++) {
      const tx = (e.ti + 0.5) * CS,
        tz = (e.tj + 0.5) * CS;
      const dx = tx - e.x,
        dz = tz - e.z;
      const d = Math.hypot(dx, dz);
      if (d <= rem) {
        e.x = tx;
        e.z = tz;
        rem -= d;
        const n = decide(e);
        if (!n) break;
        e.ti = n[0];
        e.tj = n[1];
      } else {
        e.x += (dx / d) * rem;
        e.z += (dz / d) * rem;
        e.dir = Math.atan2(dx, dz);
        rem = 0;
      }
    }
  }

  wanderNext(e) {
    if (!e.wTarget || (e.ti === e.wTarget[0] && e.tj === e.wTarget[1]) || this.R() < 0.04) {
      e.wTarget = this.randomCell(0, false);
      e.wField = this.nav.field(e.wTarget[0], e.wTarget[1], e.wField);
    }
    return this.nav.next(e.wField, e.ti, e.tj, false, this.R);
  }

  catchEnemy(e) {
    const P = this.p;
    P.combo++;
    const n = Math.min(10, 1 + P.combo * 2);
    e.dead = e.type === 'bat' ? 99 : 6;
    this.caught++;
    this.emit('catch', { x: e.x, z: e.z, n, type: e.type });
    this.give(n, e.x, e.z);
  }

  touch(e, r) {
    const P = this.p;
    return Math.hypot(e.x - P.x, e.z - P.z) < r + 0.38;
  }

  updateEnemies(dt) {
    const P = this.p;
    const pf = this.playerField();
    const spm = this.speedMul();
    for (const e of this.enemies) {
      if (e.dead > 0) {
        e.dead -= dt;
        if (e.dead <= 0) {
          if (e.temp) {
            e.gone = true;
            continue;
          }
          // возвращается в своё логово
          const [i, j] = e.home || this.randomCell(10);
          if (e.home) {
            e.x = (i + 0.5) * CS;
            e.z = (j + 0.5) * CS;
            e.ti = i;
            e.tj = j;
          }
          e.fade = 0;
          e.state = 'wander';
        }
        continue;
      }
      e.fade = Math.min(1, e.fade + dt * 0.9);
      const harmless = e.fade < 1;
      if (e.temp) {
        e.temp -= dt;
        if (e.temp <= 0) {
          e.dead = 0.6;
          e.temp = 0.001;
          this.emit('poof', { x: e.x, z: e.z });
          continue;
        }
      }
      e.t += dt;
      switch (e.type) {
        case 'ghost':
          this.ghost(e, dt, pf, spm);
          break;
        case 'skel':
          this.skel(e, dt, pf, spm);
          break;
        case 'jack':
          this.jack(e, dt, pf, spm);
          break;
        case 'spider':
          this.spider(e, dt);
          continue;
        case 'witch':
          this.witch(e, dt);
          continue;
        case 'boss':
          this.bossStep(e, dt, pf);
          continue;
      }
      // касание
      if (!harmless && e.type !== 'jack' && this.touch(e, ENEMY[e.type].r)) {
        if (this.power) this.catchEnemy(e);
        else this.hurt(e.x, e.z);
      } else if (!harmless && e.type === 'jack' && this.touch(e, ENEMY.jack.r) && e.hop <= 0) {
        if (this.power) this.catchEnemy(e);
        else this.hurt(e.x, e.z);
      }
    }
    if (this.enemies.some((e) => e.gone)) this.enemies = this.enemies.filter((e) => !e.gone);
    // летучие мыши
    for (const b of this.bats) {
      b.t += dt;
      if (b.dead) continue;
      b.x += b.dx * dt * spm;
      b.z += b.dz * dt * spm;
      b.y = 1.3 + Math.sin(b.t * 6 + b.ph) * 0.25;
      const m = this.map;
      if (b.x < -6 || b.z < -6 || b.x > m.W * CS + 6 || b.z > m.H * CS + 6) b.dead = 99;
      else if (b.t > 0.4 && Math.hypot(b.x - P.x, b.z - P.z) < 0.85) {
        if (this.power) {
          this.catchEnemy(b);
          b.dead = 99;
        } else this.hurt(b.x - b.dx, b.z - b.dz);
      }
    }
    this.bats = this.bats.filter((b) => !b.dead);
  }

  ghost(e, dt, pf, spm) {
    const P = this.p;
    if (e.stunT > 0) {
      e.stunT -= dt;
      return;
    }
    const d = Math.hypot(e.x - P.x, e.z - P.z);
    const pw = this.power;
    if (pw) e.state = 'flee';
    else if (d < ENEMY.ghost.sense || e.temp || e.party) e.state = 'chase';
    else if (e.state !== 'wander' && d > ENEMY.ghost.sense + 3) e.state = 'wander';
    let sp = ENEMY.ghost.speed * (1 + this.lv.wi * 0.06) * spm;
    if (pw) sp *= 0.65;
    else if (e.state === 'chase') sp *= 1.12;
    this.gridMove(e, sp, dt, (e) => {
      if (e.state === 'flee') return this.nav.next(pf, e.ti, e.tj, true, this.R);
      if (e.state === 'chase') return this.R() < 0.15 ? this.wanderNext(e) : this.nav.next(pf, e.ti, e.tj, false, this.R);
      return this.wanderNext(e);
    });
  }

  skel(e, dt, pf, spm) {
    const P = this.p;
    const S = ENEMY.skel;
    if (e.state === 'charge') {
      const [dx, dz] = e.cdir;
      const nx = e.x + dx * S.charge * dt * spm,
        nz = e.z + dz * S.charge * dt * spm;
      const ahead = this.walkAt(nx + dx * 0.95, nz + dz * 0.95);
      e.chargeT -= dt;
      if (!ahead || e.chargeT <= 0 || this.power) {
        // остановиться в центре клетки
        const [i, j] = this.cellOf(e.x, e.z);
        e.ti = i;
        e.tj = j;
        e.state = 'tired';
        e.tiredT = 1.1;
      } else {
        e.x = nx;
        e.z = nz;
      }
      return;
    }
    if (e.state === 'alert') {
      e.alertT -= dt;
      if (e.alertT <= 0) {
        e.state = 'charge';
        e.chargeT = 1.8;
        this.emit('charge', { x: e.x, z: e.z });
      }
      return;
    }
    if (e.state === 'tired') {
      e.tiredT -= dt;
      if (e.tiredT <= 0) e.state = 'wander';
      this.gridMove(e, 1.2, dt, () => null);
      return;
    }
    const pw = this.power;
    // увидел игрока на прямой — рывок
    const [i, j] = this.cellOf(e.x, e.z);
    const [pi, pj] = this.cellOf(P.x, P.z);
    const centered = Math.hypot(e.x - (i + 0.5) * CS, e.z - (j + 0.5) * CS) < 0.25;
    if (!pw && centered && (i === pi || j === pj) && Math.hypot(e.x - P.x, e.z - P.z) < S.sense && this.clearLine(i, j, pi, pj)) {
      e.state = 'alert';
      e.alertT = 0.5;
      e.x = (i + 0.5) * CS;
      e.z = (j + 0.5) * CS;
      e.cdir = [Math.sign(pi - i), Math.sign(pj - j)];
      e.dir = Math.atan2(e.cdir[0], e.cdir[1]);
      this.emit('alert', { x: e.x, z: e.z });
      return;
    }
    const sp = S.speed * (1 + this.lv.wi * 0.05) * spm * (pw ? 0.75 : 1);
    this.gridMove(e, sp, dt, (e) => (pw ? this.nav.next(pf, e.ti, e.tj, true, this.R) : this.wanderNext(e)));
  }

  clearLine(i0, j0, i1, j1) {
    const si = Math.sign(i1 - i0),
      sj = Math.sign(j1 - j0);
    let i = i0,
      j = j0;
    while (i !== i1 || j !== j1) {
      i += si;
      j += sj;
      if (!this.nav.walk(i, j)) return false;
    }
    return true;
  }

  // тыквоголовый: прыжки по клеткам к игроку, при приземлении — волна
  jack(e, dt, pf, spm) {
    const J = ENEMY.jack;
    const pw = this.power;
    if (e.hop > 0) {
      e.hop -= dt;
      const k = 1 - Math.max(0, e.hop) / 0.45;
      e.x = e.fromX + ((e.ti + 0.5) * CS - e.fromX) * k;
      e.z = e.fromZ + ((e.tj + 0.5) * CS - e.fromZ) * k;
      e.y = Math.sin(k * Math.PI) * 1.1;
      if (e.hop <= 0) {
        e.y = 0;
        if (!pw) {
          this.waves.push({ x: e.x, z: e.z, r: 0.3, max: J.wave, t: 0, hit: false });
          this.emit('thud', { x: e.x, z: e.z });
        }
      }
      return;
    }
    e.hopT -= dt * spm;
    if (e.hopT <= 0) {
      e.hopT = J.hop * (pw ? 0.8 : 1) - this.lv.wi * 0.05;
      const P = this.p;
      const near = Math.hypot(e.x - P.x, e.z - P.z) < 12;
      const n = pw ? this.nav.next(pf, e.ti, e.tj, true, this.R) : near ? this.nav.next(pf, e.ti, e.tj, false, this.R) : this.wanderNext(e);
      if (n) {
        e.fromX = e.x;
        e.fromZ = e.z;
        e.ti = n[0];
        e.tj = n[1];
        e.hop = 0.45;
        e.dir = Math.atan2(e.ti + 0.5 - e.x / CS, e.tj + 0.5 - e.z / CS);
      }
    }
  }

  spider(e, dt) {
    const S = ENEMY.spider;
    const cyc = S.up + S.warn + S.down + 0.6;
    const t = e.t % cyc;
    let ph;
    if (t < S.up) ph = 'up';
    else if (t < S.up + S.warn) ph = 'warn';
    else if (t < S.up + S.warn + 0.15) ph = 'drop';
    else if (t < S.up + S.warn + S.down) ph = 'down';
    else ph = 'rise';
    if (ph !== e.phase) {
      e.phase = ph;
      if (ph === 'warn') this.emit('spiderWarn', { x: e.x, z: e.z });
      if (ph === 'drop') this.emit('spiderDrop', { x: e.x, z: e.z });
    }
    e.y = ph === 'up' ? 3.2 : ph === 'warn' ? 2.6 : ph === 'drop' ? 2.6 - ((t - S.up - S.warn) / 0.15) * 2.2 : ph === 'down' ? 0.4 : 0.4 + ((t - S.up - S.warn - S.down) / 0.6) * 2.8;
    if ((ph === 'down' || ph === 'drop') && e.y < 1.2 && this.touch(e, S.r - 0.2)) {
      if (this.power) {
        this.catchEnemy(e);
        e.dead = 4;
        e.t = 0;
      } else this.hurt(e.x, e.z + 0.01);
    }
  }

  witch(e, dt) {
    e.a += (ENEMY.witch.speed / Math.max(e.rx, e.rz)) * dt * this.speedMul();
    const nx = e.cx + Math.cos(e.a) * e.rx,
      nz = e.cz + Math.sin(e.a) * e.rz;
    e.dir = Math.atan2(nx - e.x, nz - e.z);
    e.x = nx;
    e.z = nz;
    e.y = 3.2 + Math.sin(e.t * 2) * 0.3;
    e.t2 = (e.t2 || 0) + dt;
    if (e.t2 > ENEMY.witch.every) {
      e.t2 = 0;
      const [i, j] = this.cellOf(e.x, e.z);
      if (this.nav.walk(i, j) && !this.inHome(i, j)) {
        this.puddles.push({ x: (i + 0.5) * CS, z: (j + 0.5) * CS, r: 1.05, t: 0, life: 8, fall: 0.6 });
        this.emit('splash', { x: e.x, z: e.z });
      }
    }
  }

  // ---------- боссы ----------
  bossStep(e, dt, pf) {
    const P = this.p;
    const B = BOSS[e.kind];
    if (e.intro > 0) {
      e.intro -= dt;
      return;
    }
    if (e.stun > 0) {
      e.stun -= dt;
      e.x += (e.kx || 0) * dt;
      e.z += (e.kz || 0) * dt;
      e.kx *= 0.9;
      e.kz *= 0.9;
      this.clampToMap(e);
      return;
    }
    const pw = this.power;
    const rage = 1 + (e.max - e.hp) * 0.12;
    e.atk -= dt;
    if (e.kind === 'bigboo') {
      // летит сквозь стены
      const dx = P.x - e.x,
        dz = P.z - e.z;
      const d = Math.hypot(dx, dz) || 1;
      const sp = B.speed * rage * (pw ? -0.7 : 1);
      e.x += (dx / d) * sp * dt;
      e.z += (dz / d) * sp * dt;
      e.dir = Math.atan2(dx, dz);
      this.clampToMap(e);
      if (e.atk <= 0) {
        e.atk = 9;
        if (this.enemies.filter((x) => x.type === 'ghost').length < 6) {
          for (let k = 0; k < 2; k++) {
            const g = this.spawnGhost({ at: this.cellOf(...this.freeNear(e.x + (k ? 2 : -2), e.z)), temp: 18, pop: 1 });
            g.state = 'chase';
          }
          this.emit('summon', { x: e.x, z: e.z });
        }
      }
    } else if (e.kind === 'skelking') {
      if (e.throwT > 0) {
        e.throwT -= dt;
        if (e.throwT <= 0) {
          const a0 = Math.atan2(P.x - e.x, P.z - e.z);
          for (const da of [-0.32, 0, 0.32]) this.bones.push({ x: e.x, z: e.z, dx: Math.sin(a0 + da) * 7, dz: Math.cos(a0 + da) * 7, t: 0, life: 1.9 });
          this.emit('throw', { x: e.x, z: e.z });
        }
        return;
      }
      if (e.atk <= 0 && !pw) {
        e.atk = 4.2 / rage;
        e.throwT = 0.6;
        e.dir = Math.atan2(P.x - e.x, P.z - e.z);
        this.emit('alert', { x: e.x, z: e.z });
        return;
      }
      const sp = B.speed * rage * (pw ? 0.75 : 1);
      this.gridMove(e, sp, dt, (e) => this.nav.next(pf, e.ti, e.tj, pw, this.R));
    } else if (e.kind === 'witchqueen') {
      if (e.swoop > 0) {
        e.swoop -= dt;
        e.x += e.sdx * dt;
        e.z += e.sdz * dt;
        e.y = 0.6;
        this.clampToMap(e);
        if (e.swoop <= 0) e.atk = 4.5 / rage;
      } else if (e.aim > 0) {
        e.aim -= dt;
        e.y = 1.6;
        if (e.aim <= 0) {
          const dx = e.tx - e.x,
            dz = e.tz - e.z;
          const d = Math.hypot(dx, dz) || 1;
          e.sdx = (dx / d) * 11;
          e.sdz = (dz / d) * 11;
          e.swoop = Math.min(1.5, (d + 4) / 11);
          this.emit('swoop', { x: e.x, z: e.z });
        }
      } else {
        // кружит вокруг игрока
        e.orb = (e.orb || 0) + dt * 0.7;
        const R0 = pw ? 9 : 6;
        const tx = P.x + Math.cos(e.orb) * R0,
          tz = P.z + Math.sin(e.orb) * R0;
        const dx = tx - e.x,
          dz = tz - e.z;
        const d = Math.hypot(dx, dz) || 1;
        const sp = B.speed * (pw ? 0.55 : 1);
        e.x += (dx / d) * Math.min(d, sp * dt);
        e.z += (dz / d) * Math.min(d, sp * dt);
        e.y = 1.6 + Math.sin(e.t * 2) * 0.2;
        e.dir = Math.atan2(dx, dz);
        this.clampToMap(e);
        e.t += dt;
        e.pud = (e.pud || 0) + dt;
        if (e.pud > 2.4) {
          e.pud = 0;
          const [i, j] = this.cellOf(e.x, e.z);
          if (this.nav.walk(i, j) && !this.inHome(i, j)) this.puddles.push({ x: (i + 0.5) * CS, z: (j + 0.5) * CS, r: 1.05, t: 0, life: 7, fall: 0.5 });
        }
        if (e.atk <= 0 && !pw) {
          e.aim = 0.85;
          e.tx = P.x;
          e.tz = P.z;
          this.emit('aim', { x: e.x, z: e.z, tx: P.x, tz: P.z });
        }
        e.bat = (e.bat || 0) + dt;
        if (e.bat > 11) {
          e.bat = 0;
          this.batSwarm(4, e.x, e.z);
        }
      }
    } else if (e.kind === 'pumpking') {
      if (e.hop > 0) {
        e.hop -= dt;
        const k = 1 - Math.max(0, e.hop) / 0.55;
        e.x = e.fromX + ((e.ti + 0.5) * CS - e.fromX) * k;
        e.z = e.fromZ + ((e.tj + 0.5) * CS - e.fromZ) * k;
        e.y = Math.sin(k * Math.PI) * 1.8;
        if (e.hop <= 0) {
          e.y = 0;
          this.waves.push({ x: e.x, z: e.z, r: 0.5, max: pw ? 1.2 : B.wave, t: 0, hit: false, big: true });
          this.emit('thud', { x: e.x, z: e.z, big: 1 });
        }
      } else {
        e.hopT -= dt * rage;
        if (e.hopT <= 0) {
          e.hopT = B.hop;
          const n = this.nav.next(pf, e.ti, e.tj, pw, this.R);
          if (n) {
            e.fromX = e.x;
            e.fromZ = e.z;
            e.ti = n[0];
            e.tj = n[1];
            e.hop = 0.55;
            e.dir = Math.atan2(e.ti + 0.5 - e.x / CS, e.tj + 0.5 - e.z / CS);
          }
        }
        if (e.atk <= 0) {
          e.atk = 11;
          if (this.enemies.filter((x) => x.type === 'jack').length < 4) {
            for (let k = 0; k < 2; k++) this.spawnWalker('jack', { at: this.randomCell(6), temp: 25 });
            this.emit('summon', { x: e.x, z: e.z });
          }
        }
      }
    }
    // касание босса
    if (this.touch(e, B.r) && (e.kind !== 'pumpking' || e.hop <= 0)) {
      if (pw) {
        e.hp--;
        P.powerT = 0;
        const a = Math.atan2(e.x - P.x, e.z - P.z);
        e.kx = Math.sin(a) * 6;
        e.kz = Math.cos(a) * 6;
        e.stun = 1.4;
        e.swoop = 0;
        e.aim = 0;
        e.throwT = 0;
        if (e.kind === 'skelking' || e.kind === 'pumpking') {
          // вернуть на клетку
          const [i, j] = this.cellOf(...this.freeNear(e.x, e.z));
          e.ti = i;
          e.tj = j;
          e.hop = 0;
          e.kx = e.kz = 0;
          e.y = 0;
        }
        this.emit('bossHit', { x: e.x, z: e.z, hp: e.hp });
        if (e.hp <= 0) {
          e.dead = 1e9;
          this.banked += 40;
          this.emit('bossDown', { x: e.x, z: e.z });
          for (const x of this.enemies) if (x !== e && x.type !== 'spider' && x.type !== 'witch') x.dead = 1e9;
          this.bats.length = 0;
          this.winT = 1.6;
        }
      } else this.hurt(e.x, e.z);
    }
  }

  clampToMap(e) {
    const m = this.map;
    e.x = clamp(e.x, 1, m.W * CS - 1);
    e.z = clamp(e.z, 1, m.H * CS - 1);
  }

  // ---------- опасности: лужи, кости, волны ----------
  updateHazards(dt) {
    const P = this.p;
    for (const pd of this.puddles) pd.t += dt;
    this.puddles = this.puddles.filter((pd) => pd.t < pd.life);
    for (const b of this.bones) {
      b.t += dt;
      b.x += b.dx * dt;
      b.z += b.dz * dt;
      if (Math.hypot(b.x - P.x, b.z - P.z) < 0.6) {
        if (this.hurt(b.x - b.dx, b.z - b.dz)) b.t = 99;
      }
    }
    this.bones = this.bones.filter((b) => b.t < b.life);
    for (const w of this.waves) {
      w.t += dt;
      w.r = 0.3 + (w.max - 0.3) * Math.min(1, w.t / 0.35);
      const d = Math.hypot(w.x - P.x, w.z - P.z);
      if (!w.hit && w.t < 0.4 && d < w.r + 0.3 && d > w.r - 0.9) {
        w.hit = true;
        if (!this.power) this.hurt(w.x, w.z);
      }
    }
    this.waves = this.waves.filter((w) => w.t < 0.55);
    if (this.winT !== undefined) {
      this.winT -= dt;
      if (this.winT <= 0) this.finish(true);
    }
  }

  // ---------- события ----------
  batSwarm(n, sx, sz) {
    const P = this.p;
    const m = this.map;
    const side = Math.floor(this.R() * 4);
    for (let k = 0; k < n; k++) {
      let x, z;
      if (sx !== undefined) {
        x = sx + (this.R() - 0.5) * 2;
        z = sz + (this.R() - 0.5) * 2;
      } else if (side === 0) (x = -4), (z = P.z + (this.R() - 0.5) * 14);
      else if (side === 1) (x = m.W * CS + 4), (z = P.z + (this.R() - 0.5) * 14);
      else if (side === 2) (x = P.x + (this.R() - 0.5) * 14), (z = -4);
      else (x = P.x + (this.R() - 0.5) * 14), (z = m.H * CS + 4);
      // летят к точке рядом с игроком и дальше
      const tx = P.x + (this.R() - 0.5) * 5,
        tz = P.z + (this.R() - 0.5) * 5;
      const d = Math.hypot(tx - x, tz - z) || 1;
      const sp = ENEMY.bat.speed * (0.85 + this.R() * 0.3);
      this.bats.push({ x, z, y: 1.3, dx: ((tx - x) / d) * sp, dz: ((tz - z) / d) * sp, t: -k * 0.35, ph: this.R() * 6, dead: 0, type: 'bat', id: Math.random() });
    }
    this.emit('bats');
  }

  updateEvents(dt) {
    const ev = this.lv.events;
    if (!ev.length) return;
    this.evT -= dt;
    if (this.evT > 0) return;
    this.evT = this.lv.evEvery * (this.midnight ? 0.7 : 1) * (0.85 + this.R() * 0.3);
    const e = ev[this.evIdx++ % ev.length];
    if (e === 'bats') this.batSwarm(4 + this.lv.wi + (this.midnight ? 2 : 0));
    else if (e === 'rain') {
      // конфетный дождь в случайном месте
      const [i, j] = this.randomCell(9);
      const x = (i + 0.5) * CS,
        z = (j + 0.5) * CS;
      for (let k = 0; k < 14; k++) this.dropNear(x, z, 1, 22);
      this.dropNear(x, z, 5, 22);
      this.emit('rain', { x, z });
    } else if (e === 'party') {
      for (let k = 0; k < 2; k++) {
        const g = this.spawnGhost({ temp: 16, pop: 1, party: true });
        g.state = 'chase';
      }
      this.emit('party');
    }
  }

  // ближайший к игроку горящий дом (для подсказок)
  nearestLit() {
    let best = null,
      bd = 1e9;
    for (const h of this.houses) {
      if (!h.lit) continue;
      const d = Math.hypot(h.x - this.p.x, h.z - this.p.z);
      if (d < bd) (bd = d), (best = h);
    }
    return best;
  }
}

export { HOME_R };
