// Физика разрушения на Rapier. Модуль не зависит от three — его гоняет и игра, и бот в Node.
import RAPIER from '@dimforge/rapier3d-compat';

export const G = 12; // ускорение свободного падения (чуть больше реального — бодрее)
export const DT = 1 / 60;
// точка вылета снаряда из ковша катапульты (совпадает с моделью: ось 0,1.1,-0.2; плечо 2.2; угол 0.67)
export const FROM = [0, 1.1 + 2.2 * Math.cos(0.67), -0.2 + 2.2 * Math.sin(0.67)];

// точка вылета, когда катапульта развёрнута на угол yaw вокруг своей оси (0, 0, 0)
export function launchFrom(yaw) {
  return [Math.sin(yaw) * FROM[2], FROM[1], Math.cos(yaw) * FROM[2]];
}

// прицеливание с учётом разворота катапульты: два уточнения угла
export function aimSolve(target, arc) {
  let yaw = Math.atan2(target[0], target[2]);
  let from = launchFrom(yaw);
  let sol = solveLaunch(from, target, arc);
  if (!sol) return null;
  yaw = sol.yaw;
  from = launchFrom(yaw);
  sol = solveLaunch(from, target, arc);
  if (!sol) return null;
  return { sol, from, yaw: sol.yaw };
}

// материалы: плотность, трение, упругость, прочность (в единицах «удара» = изменение скорости, м/с), очки
export const MATS = {
  wood: { dens: 0.7, fric: 0.75, rest: 0.05, hp: 7, dvMin: 1.6, pts: 100 },
  stone: { dens: 2.4, fric: 0.85, rest: 0.02, hp: 12, dvMin: 2.0, pts: 200 },
  ice: { dens: 0.9, fric: 0.06, rest: 0.05, hp: 4, dvMin: 1.4, pts: 80 },
  metal: { dens: 4.0, fric: 0.6, rest: 0.05, hp: 34, dvMin: 3.0, pts: 300 },
  tnt: { dens: 0.8, fric: 0.7, rest: 0.05, hp: 2.5, dvMin: 1.2, pts: 150 },
  straw: { dens: 0.35, fric: 0.9, rest: 0.02, hp: 5, dvMin: 1.5, pts: 60 },
};

export const ENEMIES = {
  goblin: { hp: 3.2, dvMin: 1.4, size: [0.62, 0.9, 0.62], dens: 0.9, pts: 1000 },
  helmet: { hp: 6.5, dvMin: 1.8, size: [0.66, 0.98, 0.66], dens: 1.0, pts: 1500 },
  king: { hp: 13, dvMin: 2.2, size: [1.05, 1.5, 1.05], dens: 1.0, pts: 5000 },
};

// снаряды: радиус, плотность, особенности
export const AMMO = {
  stone: { r: 0.4, dens: 3.2 },
  iron: { r: 0.42, dens: 9.5 },
  bomb: { r: 0.42, dens: 2.6, explode: { R: 3.3, P: 15 } },
  split: { r: 0.36, dens: 4.5, split: 3, kid: { r: 0.32, dens: 7 } },
  fire: { r: 0.4, dens: 2.4, fire: { R: 2.6, P: 5 } },
};

export async function initPhysics() {
  await RAPIER.init();
}

let NEXT = 1;

export class Phys {
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -G, z: 0 });
    this.world.timestep = DT;
    this.world.numSolverIterations = 8;
    this.objs = new Map(); // id -> obj
    this.byHandle = new Map(); // collider handle -> obj
    this.events = []; // события для отрисовки и звука
    this.damageOn = false;
    this.time = 0;
    this.fires = new Set();
    this.pending = []; // отложенные взрывы
    this.score = 0;
    this.seed = 12345;
    // земля
    const gb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
    this.ground = this.world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.5, 200).setFriction(0.9), gb);
    this.byHandle.set(this.ground.handle, { kind: 'ground', id: 0 });
  }

  free() {
    this.world.free();
  }

  rnd() {
    // детерминированный генератор (mulberry32), чтобы бот и игра видели одно и то же
    let t = (this.seed = (this.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  load(lv) {
    for (const r of lv.rocks) this.addRock(r.pos, r.size);
    for (const bl of lv.blocks) this.addBlock(bl.mat, bl.shape, bl.size, bl.pos, bl.rot);
    for (const e of lv.enemies) this.addEnemy(e.type, e.pos);
  }

  // снимок мира (для бота: перебор выстрелов без пересборки уровня)
  snapshot() {
    const objs = [];
    for (const o of this.objs.values()) {
      const c = { ...o, bh: o.body.handle, ch: o.collider.handle };
      delete c.body;
      delete c.collider;
      objs.push(c);
    }
    return { snap: this.world.takeSnapshot(), objs, time: this.time, seed: this.seed, score: this.score, fires: [...this.fires].map((o) => o.id), pending: this.pending.map((e) => ({ ...e, o: e.o ? e.o.id : null })), damageOn: this.damageOn };
  }

  static restore(S) {
    const P = Object.create(Phys.prototype);
    P.world = RAPIER.World.restoreSnapshot(S.snap);
    P.objs = new Map();
    P.byHandle = new Map();
    P.events = [];
    P.time = S.time;
    P.seed = S.seed;
    P.score = S.score;
    P.damageOn = S.damageOn;
    P.ground = null;
    for (const c of S.objs) {
      const o = { ...c, body: P.world.getRigidBody(c.bh), collider: P.world.getCollider(c.ch) };
      P.objs.set(o.id, o);
      P.byHandle.set(c.ch, o);
    }
    P.world.forEachCollider((c) => {
      if (!P.byHandle.has(c.handle)) P.byHandle.set(c.handle, { kind: 'ground', id: 0 });
    });
    P.fires = new Set(S.fires.map((id) => P.objs.get(id)).filter(Boolean));
    P.pending = S.pending.map((e) => ({ ...e, o: e.o ? P.objs.get(e.o) : undefined }));
    return P;
  }

  _colliderDesc(shape, size, mat) {
    let d;
    if (shape === 'cyl') d = RAPIER.ColliderDesc.cylinder(size[1] / 2, size[0] / 2);
    else if (shape === 'roof') {
      // треугольная призма вдоль X: основание w x d, высота h
      const [w, h, dd] = size;
      const p = [];
      for (const x of [-w / 2, w / 2]) p.push(x, -h / 2, -dd / 2, x, -h / 2, dd / 2, x, h / 2, 0);
      d = RAPIER.ColliderDesc.convexHull(new Float32Array(p));
    } else if (shape === 'ball') d = RAPIER.ColliderDesc.ball(size[0]);
    else d = RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2);
    return d;
  }

  // статичная скала / платформа
  addRock(pos, size) {
    const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pos[0], pos[1], pos[2]));
    const c = this.world.createCollider(RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setFriction(0.9), b);
    const o = { id: NEXT++, kind: 'rock', pos, size, body: b, collider: c };
    this.byHandle.set(c.handle, o);
    return o;
  }

  addBlock(mat, shape, size, pos, rotY = 0) {
    const M = MATS[mat];
    const q = yawQuat(rotY);
    const bd = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos[0], pos[1], pos[2]).setRotation(q).setCanSleep(true);
    const b = this.world.createRigidBody(bd);
    const cd = this._colliderDesc(shape, size, mat).setDensity(M.dens).setFriction(M.fric).setRestitution(M.rest);
    const c = this.world.createCollider(cd, b);
    const vol = shape === 'cyl' ? Math.PI * (size[0] / 2) ** 2 * size[1] : shape === 'roof' ? (size[0] * size[1] * size[2]) / 2 : size[0] * size[1] * size[2];
    const o = { id: NEXT++, kind: 'block', mat, shape, size, body: b, collider: c, hp: M.hp, maxHp: M.hp, mass: b.mass(), vol, v0: null, w0: null, burn: 0, impact: 0, rad: Math.max(...size) / 2 };
    this.objs.set(o.id, o);
    this.byHandle.set(c.handle, o);
    return o;
  }

  addEnemy(type, pos, rotY = Math.PI) {
    const E = ENEMIES[type];
    const [w, h, d] = E.size;
    const b = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(pos[0], pos[1], pos[2]).setRotation(yawQuat(rotY)).setCanSleep(true).setAngularDamping(0.4),
    );
    const c = this.world.createCollider(RAPIER.ColliderDesc.roundCuboid(w / 2 - 0.06, h / 2 - 0.06, d / 2 - 0.06, 0.06).setDensity(E.dens).setFriction(0.8).setRestitution(0.1), b);
    const o = { id: NEXT++, kind: 'enemy', type, size: E.size, body: b, collider: c, hp: E.hp, maxHp: E.hp, mass: b.mass(), v0: null, w0: null, impact: 0, rad: h / 2 };
    this.objs.set(o.id, o);
    this.byHandle.set(c.handle, o);
    return o;
  }

  addProjectile(type, pos, vel, kid) {
    const A = AMMO[type];
    const R = kid ? A.kid.r : A.r;
    const dens = kid ? A.kid.dens : A.dens;
    const b = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(pos[0], pos[1], pos[2]).setLinvel(vel[0], vel[1], vel[2]).setCcdEnabled(true).setAngularDamping(0.8).setCanSleep(true),
    );
    const c = this.world.createCollider(RAPIER.ColliderDesc.ball(R).setDensity(dens).setFriction(0.6).setRestitution(0.15), b);
    const o = { id: NEXT++, kind: 'proj', type, size: [R, R, R], r: R, body: b, collider: c, mass: b.mass(), v0: null, w0: null, born: this.time, hit: false, impact: 0, rad: R, spent: false };
    this.objs.set(o.id, o);
    this.byHandle.set(c.handle, o);
    this.events.push({ t: 'launch', o });
    return o;
  }

  remove(o) {
    if (!this.objs.has(o.id)) return;
    this.objs.delete(o.id);
    this.byHandle.delete(o.collider.handle);
    this.world.removeRigidBody(o.body);
    this.fires.delete(o);
    o.dead = true;
  }

  pos(o) {
    return o.body.translation();
  }

  enemiesLeft() {
    let n = 0;
    for (const o of this.objs.values()) if (o.kind === 'enemy') n++;
    return n;
  }

  // самая большая скорость среди тел (для определения «всё успокоилось»)
  activity() {
    let m = 0;
    for (const o of this.objs.values()) {
      if (o.body.isSleeping()) continue;
      const v = o.body.linvel();
      const s = Math.hypot(v.x, v.y, v.z);
      if (s > m) m = s;
    }
    return m;
  }

  // ---------- шаг ----------
  step() {
    const objs = [...this.objs.values()];
    for (const o of objs) {
      const v = o.body.linvel();
      o.v0 = { x: v.x, y: v.y, z: v.z };
      o.impact = 0;
    }
    this.world.step();
    this.time += DT;
    if (this.damageOn) this._damage(objs);
    this._fire();
    this._pending();
    // вылет за пределы
    for (const o of this.objs.values()) {
      const p = o.body.translation();
      if (p.y < -6 || Math.abs(p.x) > 120 || Math.abs(p.z) > 140) {
        if (o.kind === 'enemy') this._kill(o, 'fall');
        else this.remove(o);
      }
    }
  }

  _damage(objs) {
    // изменение скорости за шаг (без учёта гравитации) — мера удара
    for (const o of objs) {
      if (o.dead || !o.v0) continue;
      const v = o.body.linvel();
      const dv = Math.hypot(v.x - o.v0.x, v.y - o.v0.y + G * DT, v.z - o.v0.z);
      if (o.body.isSleeping()) continue;
      o.impact = Math.max(o.impact, dv);
    }
    // снаряд, врезавшийся в зажатый блок: передаём импульс тем, кого касается
    for (const o of objs) {
      if (o.dead || o.kind !== 'proj') continue;
      if (o.impact > 2.5) {
        const J = o.mass * o.impact;
        const touched = [];
        this.world.contactPairsWith(o.collider, (c2) => {
          const t = this.byHandle.get(c2.handle);
          if (t && (t.kind === 'block' || t.kind === 'enemy')) touched.push(t);
        });
        for (const t of touched) t.impact = Math.max(t.impact, Math.min(40, (J / t.mass) * 0.75));
        if (!o.hit && (touched.length || o.impact > 4)) {
          o.hit = true;
          this.events.push({ t: 'hit', o, p: o.body.translation(), power: o.impact, mat: touched[0] ? touched[0].mat || 'enemy' : 'ground' });
        }
      }
      // бомба и огонь срабатывают при первом касании
      if (!o.spent && this.time - o.born > 0.08 && (o.type === 'bomb' || o.type === 'fire')) {
        let touching = false;
        this.world.contactPairsWith(o.collider, () => (touching = true));
        if (touching || o.impact > 3) this.detonate(o);
      }
    }
    for (const o of objs) {
      if (o.dead || o.kind === 'proj') continue;
      const dvMin = o.kind === 'enemy' ? ENEMIES[o.type].dvMin : MATS[o.mat].dvMin;
      const d = o.impact - dvMin;
      if (d <= 0) continue;
      o.hp -= d;
      if (d > 0.8) this.events.push({ t: 'dmg', o, d, p: o.body.translation() });
      if (o.hp <= 0) {
        if (o.kind === 'enemy') this._kill(o, 'hit');
        else this._break(o);
      }
    }
  }

  _kill(o, why) {
    if (o.dead) return;
    const p = o.body.translation();
    this.score += ENEMIES[o.type].pts;
    this.events.push({ t: 'kill', o, p: { x: p.x, y: p.y, z: p.z }, why, pts: ENEMIES[o.type].pts });
    this.remove(o);
  }

  _break(o) {
    if (o.dead) return;
    const p = o.body.translation();
    const r = o.body.rotation();
    const pts = MATS[o.mat].pts;
    this.score += pts;
    this.events.push({ t: 'break', o, p: { x: p.x, y: p.y, z: p.z }, q: { x: r.x, y: r.y, z: r.z, w: r.w }, pts });
    this.remove(o);
    if (o.mat === 'tnt') this.pending.push({ at: this.time + 0.05, p: { x: p.x, y: p.y, z: p.z }, R: 3.6, P: 16, src: 'tnt' });
  }

  // подрыв снаряда (бомба/огонь) или по тапу
  detonate(o) {
    if (o.spent || o.dead) return;
    o.spent = true;
    const p = o.body.translation();
    const A = AMMO[o.type];
    const e = A.explode || A.fire;
    if (!e) return;
    this.explode({ x: p.x, y: p.y, z: p.z }, e.R, e.P, o.type);
    if (A.fire) this.ignite({ x: p.x, y: p.y, z: p.z }, e.R + 0.4);
    this.remove(o);
  }

  // картечь: снаряд делится на несколько
  splitProj(o) {
    if (o.spent || o.dead || o.type !== 'split') return [];
    o.spent = true;
    const p = o.body.translation();
    const v = o.body.linvel();
    const out = [];
    const sp = Math.hypot(v.x, v.z);
    const yaw = Math.atan2(v.x, v.z);
    for (const [dy, dp] of [[-0.16, 0.05], [0, 0.12], [0.16, 0.05]]) {
      const yy = yaw + dy;
      const nv = [Math.sin(yy) * sp, v.y + dp * sp, Math.cos(yy) * sp];
      const n = this.addProjectile('split', [p.x, p.y, p.z], nv, true);
      n.spent = true;
      n.child = true;
      out.push(n);
    }
    this.events.push({ t: 'split', p });
    this.remove(o);
    return out;
  }

  explode(p, R, P, src) {
    this.events.push({ t: 'boom', p, R, src });
    for (const o of [...this.objs.values()]) {
      if (o.kind === 'proj' && o.type !== 'split') continue;
      const q = o.body.translation();
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dz = q.z - p.z;
      const d = Math.max(0.01, Math.hypot(dx, dy, dz) - o.rad * 0.6);
      if (d > R) continue;
      const k = 1 - d / R;
      const dens = o.kind === 'block' ? MATS[o.mat].dens : 1;
      const dv = (P * k) / Math.sqrt(Math.max(0.5, dens));
      const L = Math.hypot(dx, dy + 0.6, dz) || 1;
      const imp = o.mass * dv;
      o.body.wakeUp();
      o.body.applyImpulse({ x: (dx / L) * imp, y: ((dy + 0.6) / L) * imp, z: (dz / L) * imp }, true);
      o.body.applyTorqueImpulse({ x: (this.rnd() - 0.5) * imp * 0.3, y: (this.rnd() - 0.5) * imp * 0.3, z: (this.rnd() - 0.5) * imp * 0.3 }, true);
      // прямой урон взрывом
      if (this.damageOn && o.kind !== 'proj') {
        o.hp -= dv * 0.55;
        if (o.hp <= 0) {
          if (o.kind === 'enemy') this._kill(o, 'boom');
          else this._break(o);
        }
      }
    }
  }

  ignite(p, R) {
    for (const o of this.objs.values()) {
      if (o.kind !== 'block' || !['wood', 'ice', 'tnt', 'straw'].includes(o.mat)) continue;
      const q = o.body.translation();
      if (Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) - o.rad * 0.5 < R) this._setFire(o);
    }
  }

  _setFire(o) {
    if (o.burn > 0 || o.dead) return;
    o.burn = this.time;
    this.fires.add(o);
    this.events.push({ t: 'fire', o });
    if (o.mat === 'tnt') {
      const q = o.body.translation();
      this.pending.push({ at: this.time + 0.7, o });
    }
  }

  _fire() {
    if (!this.fires.size) return;
    const tickSpread = Math.floor(this.time * 2) !== Math.floor((this.time - DT) * 2);
    for (const o of [...this.fires]) {
      if (o.dead) {
        this.fires.delete(o);
        continue;
      }
      const rate = o.mat === 'ice' ? 2.6 : o.mat === 'straw' ? 3 : 1.5;
      o.hp -= rate * DT;
      if (o.hp <= 0) {
        this.fires.delete(o);
        this._break(o);
        continue;
      }
      if (!tickSpread || o.mat === 'ice') continue;
      const p = o.body.translation();
      for (const t of this.objs.values()) {
        if (t === o || t.dead) continue;
        const q = t.body.translation();
        const d = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) - o.rad - t.rad;
        if (t.kind === 'enemy' && d < 0.7) {
          t.hp -= 0.9;
          this.events.push({ t: 'dmg', o: t, d: 0.9, p: q });
          if (t.hp <= 0) this._kill(t, 'fire');
        } else if (t.kind === 'block' && t.burn === 0 && ['wood', 'tnt', 'straw'].includes(t.mat) && d < 0.25 && this.rnd() < 0.45) this._setFire(t);
      }
    }
  }

  _pending() {
    if (!this.pending.length) return;
    const now = this.time;
    const rest = [];
    for (const e of this.pending) {
      if (e.at > now) {
        rest.push(e);
        continue;
      }
      if (e.o) {
        if (!e.o.dead) {
          const q = e.o.body.translation();
          const p = { x: q.x, y: q.y, z: q.z };
          this.score += MATS.tnt.pts;
          this.events.push({ t: 'break', o: e.o, p, q: e.o.body.rotation(), pts: MATS.tnt.pts });
          this.remove(e.o);
          this.explode(p, 3.6, 16, 'tnt');
        }
      } else this.explode(e.p, e.R, e.P, e.src);
    }
    this.pending = rest;
  }
}

function yawQuat(a) {
  return { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) };
}

// баллистика: начальная скорость, чтобы попасть из from в to под углом pitch (радианы)
export function solveLaunch(from, to, arc) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const h = to[1] - from[1];
  const d = Math.max(0.5, Math.hypot(dx, dz));
  const base = Math.atan2(h, d);
  let pitch = arc === 'high' ? Math.max(base + 0.35, 0.95) : Math.max(base + 0.16, 0.22);
  pitch = Math.min(pitch, 1.35);
  const c = Math.cos(pitch);
  const den = 2 * c * c * (d * Math.tan(pitch) - h);
  if (den <= 0) return null;
  const v = Math.sqrt((G * d * d) / den);
  const yaw = Math.atan2(dx, dz);
  return { v, pitch, yaw, vel: [Math.sin(yaw) * c * v, Math.sin(pitch) * v, Math.cos(yaw) * c * v], T: d / (c * v) };
}

export function trajPoint(from, vel, t) {
  return [from[0] + vel[0] * t, from[1] + vel[1] * t - 0.5 * G * t * t, from[2] + vel[2] * t];
}
