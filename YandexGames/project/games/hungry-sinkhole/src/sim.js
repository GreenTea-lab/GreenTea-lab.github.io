import {lanePose,advanceTraffic,footprintOverlap,turnCurve,curvePose} from './traffic.js';
import {foodMassFor} from './food-balance.js';
// Мир игры: предметы города, дыры и физика обрушения на Rapier (физика взята из «Разрушителя Замков»:
// урон по Δv из контактов, разрушение, взрывы). Модуль не зависит от three — его гоняют и игра, и тесты в Node.
//
// Как устроена дыра. Земля — один большой статичный коллайдер. Предмет, который пролезает в дыру и стоит
// над ней, перестаёт сталкиваться с землёй (группы столкновений) и падает. Чтобы он красиво опрокидывался
// через край, у каждой дыры есть кольцо-«бортик» из капсул на уровне земли: с ним сталкиваются только
// падающие предметы. Ушедший под землю предмет считается съеденным.
//
// Производительность. Весь город «заморожен» (без тел Rapier, только позиция). Тела создаются только
// рядом с дырами в зоне вокруг игрока (здание включается целиком, чтобы обрушение было честным), а
// уснувшие и далёкие снова замораживаются. Дыры вдали от игрока едят по упрощённым правилам.
import RAPIER from '@dimforge/rapier3d-compat';

const IMP = { x: 0, y: 0, z: 0 };
export const DT = 1 / 60;
export const G = 14;

// материалы: плотность, трение, упругость, прочность и порог удара (в Δv, м/с), ценность за м³
export const MATS = {
  wood: { dens: 0.6, fric: 0.75, rest: 0.05, hp: 5, dvMin: 2.4, val: 1.0 },
  brick: { dens: 1.6, fric: 0.8, rest: 0.02, hp: 6, dvMin: 2.6, val: 1.3 },
  concrete: { dens: 2.0, fric: 0.85, rest: 0.02, hp: 8, dvMin: 3.0, val: 1.5 },
  glass: { dens: 1.2, fric: 0.5, rest: 0.05, hp: 3.5, dvMin: 2.2, val: 1.7 },
  metal: { dens: 2.6, fric: 0.6, rest: 0.05, hp: 14, dvMin: 3.6, val: 1.8 },
  stone: { dens: 2.2, fric: 0.85, rest: 0.02, hp: 8, dvMin: 2.8, val: 1.4 },
  prop: { dens: 0.7, fric: 0.7, rest: 0.1, hp: 1e9, dvMin: 1e9, val: 1.4 },
  tnt: { dens: 0.8, fric: 0.7, rest: 0.05, hp: 2, dvMin: 2.0, val: 2.0 },
};

const GR_GROUND = 1;
const GR_ITEM = 2;
const GR_RIM = 4;
const GR_DROP = 8;
const grp = (m, f) => ((m << 16) | f) >>> 0;
const C_GROUND = grp(GR_GROUND, GR_ITEM);
const C_ITEM = grp(GR_ITEM, GR_GROUND | GR_ITEM | GR_DROP);
// падающие в дыру не сталкиваются друг с другом: куча в яме — самое дорогое для физики
const C_DROP = grp(GR_DROP, GR_ITEM | GR_RIM);
const C_RIM = grp(GR_RIM, GR_ITEM | GR_DROP);
const C_GHOST = grp(GR_ITEM, 0); // застрявший в дыре предмет проваливается сквозь всё
const RIM_R = 0.16; // толщина бортика

const CELL = 6;
const cellKey = (x, z) => (Math.floor(x / CELL) + 512) * 2048 + (Math.floor(z / CELL) + 512);

export async function initPhysics() {
  await RAPIER.init();
}

// размер дыры по «съеденному объёму»
export const R0 = 1.15;
export const radiusFor = (mass, bonus = 0) => Math.sqrt((R0 + bonus) ** 2 + mass * 0.055);
export const scoreForMass = (mass) => Math.round(Math.max(0,mass)*10);
// скорость дыры растёт с размером, чтобы большая не казалась ватной
// дыра a может съесть дыру b: хватает заметной разницы в размере (без потолка — гиганты тоже едят друг друга)
export const canEatHole = (a, b) => a.r - b.r >= Math.max(0.35, b.r * 0.07);
// какую дыру нужно иметь, чтобы проглотить предмет: целый дом на месте — по размеру дома, обломки и мелочь — по своему
export const fitOf = (it) => {
  if (!it.gfit) return it.fit;
  const dx = it.p.x - it.hx, dy = it.p.y - it.hy, dz = it.p.z - it.hz;
  return dy * dy < 0.36 && dx * dx + dz * dz < 0.64 ? it.gfit : it.fit;
};
export const speedFor = (r, bonus = 0) => Math.min(13, 5.6 + r * 0.5) * (1 + bonus);

let NEXT = 1;

// через сколько секунд (плюс случайный разброс) возвращается пропавшее
export const REGEN = { walker: 9, car: 11, prop: 15, house: 28 };
// бонусы: ускорение, магнит, двойные очки, великан; длительность в секундах
export const PICK_TYPES = ['speed', 'magnet', 'x2', 'giant', 'shield', 'freeze'];
export const PICK_TIME = { speed: 8, magnet: 9, x2: 10, giant: 7, shield: 10, freeze: 6, slow: 6 };
// золотая цель: очки и монеты тому, кто съест
export const GOLD_PTS = 400;
export const GOLD_COINS = 3;
// защита от поглощения: после появления или от бонуса «Щит»
export const safe = (h) => h.shield > 0 || h.eff.shield > 0;
const growthMul = (h) => (h.eff && h.eff.x2 > 0 ? 2 : 1);

export class Sim {
  constructor(map, opts = {}) {
    this.map = map;
    this.half = map.half;
    this.maxBodies = opts.maxBodies || 320;
    this.physR = opts.physR || 42;
    this.world = new RAPIER.World({ x: 0, y: -G, z: 0 });
    // на телефоне хватает 2 итераций решателя: обломкам точность не нужна, а шаг заметно дешевле
    this.world.timestep = DT;
    this.world.numSolverIterations = opts.iters || 4;
    this.time = 0;
    this.tick = 0;
    this.seed = opts.seed || 777;
    this.events = [];
    this.items = [];
    this.byId = new Map();
    this.cells = new Map();
    this.groups = new Map();
    this.active = new Set();
    this.agents = [];
    this.holes = [];
    this.focus = null;
    this.totalVol = 0;
    this.eatenVol = 0;
    this.added = []; // новые предметы (обломки) — их подхватывает отрисовка
    const gb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0));
    const H = this.half + 30;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(H, 1, H).setFriction(0.9).setCollisionGroups(C_GROUND), gb);
    // регенерация: съеденное со временем вырастает на своём месте (в «Разрушении» выключена)
    this.regen = !!opts.regen;
    this.regenQ = [];
    this.groupHome = new Map(); // дом → { specs, n, alive, x, z, R, top, queued }
    this.pickups = [];
    this.pickupsOn = opts.pickups || 0; // сколько бонусов может лежать на карте одновременно
    this.pickT = 3;
    for (const s of map.items) {
      // агента копируем: исходная запись нужна нетронутой, чтобы вернуть прохожего или машину
      const it = this.addItem(s.agent ? { ...s, agent: { ...s.agent } } : s);
      it.home = s;
      if (it.grp) {
        let g = this.groupHome.get(it.grp);
        if (!g) this.groupHome.set(it.grp, (g = { specs: [], n: 0, alive: 0, queued: false }));
        g.specs.push(s);
        g.n++;
        g.alive++;
      }
    }
    for (const [gid, items] of this.groups) {
      this._fitGroup(items);
      const g = this.groupHome.get(gid);
      if (g) {
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, top = 0;
        for (const it of items) {
          x0 = Math.min(x0, it.p.x - it.footR);
          x1 = Math.max(x1, it.p.x + it.footR);
          z0 = Math.min(z0, it.p.z - it.footR);
          z1 = Math.max(z1, it.p.z + it.footR);
          top = Math.max(top, it.p.y + it.size[1] / 2);
        }
        g.x = (x0 + x1) / 2;
        g.z = (z0 + z1) / 2;
        g.R = Math.hypot(x1 - x0, z1 - z0) / 2;
        g.top = top;
      }
    }
    this.totalVol = this.items.reduce((a, it) => a + it.vol, 0);
    this.nItems0 = this.items.length;
  }

  // дом целиком можно начать есть, только когда дыра шире примерно 0.7 его основания
  _fitGroup(items) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const it of items) {
      x0 = Math.min(x0, it.p.x);
      x1 = Math.max(x1, it.p.x);
      z0 = Math.min(z0, it.p.z);
      z1 = Math.max(z1, it.p.z);
    }
    const foot = Math.min(x1 - x0, z1 - z0) + 1;
    for (const it of items) {
      it.gfit = Math.max(it.fit, Math.min(10, foot * 0.7));
      it.hx = it.p.x;
      it.hy = it.p.y;
      it.hz = it.p.z;
    }
  }

  free() {
    try {
      this.world.free();
    } catch (e) {}
  }

  rnd() {
    let t = (this.seed = (this.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ---------- предметы ----------
  addItem(s) {
    const size = s.size;
    const M = MATS[s.mat] || MATS.prop;
    const vol = s.vol != null ? s.vol : s.shape === 'cyl' ? Math.PI * (size[0] / 2) ** 2 * size[1] : s.shape === 'ball' ? 0.52 * size[0] ** 3 : s.shape === 'cone' ? (Math.PI * (size[0] / 2) ** 2 * size[1]) / 3 : s.shape === 'roof' ? (size[0] * size[1] * size[2]) / 2 : size[0] * size[1] * size[2];
    const sorted = [...size].sort((a, b) => b - a);
    const q = s.q || yawQuat(s.ry || 0);
    const it = {
      id: NEXT++,
      shape: s.shape || 'box',
      size,
      mat: s.mat,
      look: s.look,
      sourceLook: s.sourceLook || null,
      tint: s.tint == null ? 0xffffff : s.tint,
      p: { x: s.x, y: s.y, z: s.z },
      q: { x: q.x, y: q.y, z: q.z, w: q.w },
      grp: s.grp || 0,
      st: 0,
      body: null,
      col: null,
      vol,
      foodMass:foodMassFor(s,vol),
      pts: s.pts != null ? s.pts : Math.max(1, Math.round(vol * M.val * 6)),
      hp: M.hp,
      rad: 0.5 * Math.hypot(size[0], size[1], size[2]),
      footR: 0.5 * Math.hypot(size[0], size[2]),
      fit: Math.max(sorted[1], sorted[0] * 0.5),
      agent: s.agent || null,
      kind: s.kind || 'block',
      dropping: false,
      cell: 0,
      v: s.v || null,
      w: s.w || null,
    };
    this.items.push(it);
    this.byId.set(it.id, it);
    if (it.grp) {
      if (!this.groups.has(it.grp)) this.groups.set(it.grp, []);
      this.groups.get(it.grp).push(it);
    }
    this._cellPut(it);
    if (it.agent) this.agents.push(it);
    return it;
  }

  _cellPut(it) {
    const k = cellKey(it.p.x, it.p.z);
    it.cell = k;
    let c = this.cells.get(k);
    if (!c) this.cells.set(k, (c = new Set()));
    c.add(it);
  }
  _cellMove(it) {
    const k = cellKey(it.p.x, it.p.z);
    if (k === it.cell) return;
    const c = this.cells.get(it.cell);
    if (c) c.delete(it);
    this._cellPut(it);
  }
  _cellDel(it) {
    const c = this.cells.get(it.cell);
    if (c) c.delete(it);
  }

  // обход предметов, чей центр не дальше R (+запас на крупные предметы) от точки
  query(x, z, R, fn) {
    const R2 = R + 7;
    const x0 = Math.floor((x - R2) / CELL), x1 = Math.floor((x + R2) / CELL);
    const z0 = Math.floor((z - R2) / CELL), z1 = Math.floor((z + R2) / CELL);
    for (let cx = x0; cx <= x1; cx++)
      for (let cz = z0; cz <= z1; cz++) {
        const c = this.cells.get((cx + 512) * 2048 + (cz + 512));
        if (c) for (const it of c) fn(it);
      }
  }

  _colliderDesc(it) {
    const [w, h, d] = it.size;
    let cd;
    if (it.shape === 'cyl') cd = RAPIER.ColliderDesc.cylinder(h / 2, w / 2);
    else if (it.shape === 'ball') cd = RAPIER.ColliderDesc.ball(w / 2);
    else if (it.shape === 'cone') cd = RAPIER.ColliderDesc.cone(h / 2, w / 2);
    else if (it.shape === 'roof') {
      const p = [];
      for (const x of [-w / 2, w / 2]) p.push(x, -h / 2, -d / 2, x, -h / 2, d / 2, x, h / 2, 0);
      cd = RAPIER.ColliderDesc.convexHull(new Float32Array(p)) || RAPIER.ColliderDesc.cuboid(w / 2, h / 4, d / 2);
    } else cd = RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2);
    const M = MATS[it.mat] || MATS.prop;
    return cd.setDensity(M.dens).setFriction(M.fric).setRestitution(M.rest).setCollisionGroups(C_ITEM);
  }

  activate(it) {
    if (it.st !== 0) return;
    const bd = RAPIER.RigidBodyDesc.dynamic().setTranslation(it.p.x, it.p.y, it.p.z).setRotation(it.q).setCanSleep(true).setAngularDamping(0.25).setLinearDamping(0.02);
    if (it.v) bd.setLinvel(it.v.x, it.v.y, it.v.z);
    if (it.w) bd.setAngvel(it.w);
    it.body = this.world.createRigidBody(bd);
    it.col = this.world.createCollider(this._colliderDesc(it), it.body);
    it.mass = it.body.mass();
    it.st = 1;
    it.v = it.w = null;
    it.dropping = false;
    it.v0 = it.vel = null;
    it.awake = false;
    it.actT = this.time;
    if(it.kind==='car')it.safeTrafficPose={p:{...it.p},q:{...it.q}};
    it.agent = null;
    this.active.add(it);
  }

  activateGroup(it) {
    if (it.grp) {
      for (const o of this.groups.get(it.grp)) if (o.st === 0) this.activate(o);
    } else this.activate(it);
  }

  freeze(it) {
    if (it.st !== 1) return;
    this._readPose(it);
    if(it.kind==='car'&&!it.dropping&&it.safeTrafficPose){
      const yaw=Math.atan2(2*it.q.w*it.q.y,1-2*it.q.y*it.q.y);
      if(this._trafficBlocked(it,{...it.p,yaw})){
        Object.assign(it.p,it.safeTrafficPose.p);Object.assign(it.q,it.safeTrafficPose.q);
      }
    }
    this.world.removeRigidBody(it.body);
    it.body = it.col = null;
    it.st = 0;
    it.dropping = false;
    this.active.delete(it);
    this._cellMove(it);
    (this.frozenNow || (this.frozenNow = [])).push(it);
  }

  _readPose(it) {
    const p = it.body.translation();
    const q = it.body.rotation();
    it.p.x = p.x;
    it.p.y = p.y;
    it.p.z = p.z;
    it.q.x = q.x;
    it.q.y = q.y;
    it.q.z = q.z;
    it.q.w = q.w;
  }

  // убрать предмет из мира (съеден или разрушен)
  remove(it, quiet) {
    if (it.st === 2) return;
    const wasFrozen = it.st === 0;
    if (it.st === 1) {
      this._readPose(it);
      this.world.removeRigidBody(it.body);
      it.body = it.col = null;
      this.active.delete(it);
    }
    it.st = 2;
    this._cellDel(it);
    if (it.agent) it.agent = null;
    if (this.regen && it.home && !it.noRegen) this._lost(it);
    if (quiet||this.attract) return;
    // соседей, которые на нём лежали, будим (и «размораживаем»)
    const p = it.p;
    this.query(p.x, p.z, it.rad + 1, (o) => {
      if (o.st === 2 || o === it) return;
      const dx = o.p.x - p.x, dy = o.p.y - p.y, dz = o.p.z - p.z;
      if (Math.hypot(dx, dy, dz) > o.rad + it.rad + 0.15) return;
      if (o.st === 0) {
        // чужой дом от соседней съеденной машины не оживает — только свой дом или отдельная мелочь
        // дом, съеденный упрощённо, оживает позже через wakeLater, когда в физике будет место
        if (o.grp && (o.grp !== it.grp || wasFrozen)) return;
        if (this.active.size < this.maxBodies + 80) this.activateGroup(o);
      } else o.body.wakeUp();
    });
  }

  // ---------- дыры ----------
  addHole(h) {
    const hole = Object.assign({ id: NEXT++, x: 0, z: 0, vx: 0, vz: 0, dirX: 0, dirZ: 0, throttle: 0, mass: 0, pts: 0, alive: true, respawnT: 0, sizeBonus: 0, speedBonus: 0, suck: 0, rim: null, phys: false, eaten: 0, kills: 0, deaths: 0, shield: 0, eff: { speed: 0, magnet: 0, x2: 0, giant: 0, shield: 0, freeze: 0, slow: 0 }, picks: 0 }, h);
    hole.suckE = hole.suck;
    hole.r = radiusFor(hole.mass, hole.sizeBonus);
    hole.pts = scoreForMass(hole.mass);
    this.holes.push(hole);
    return hole;
  }

  _updateRim(h) {
    if (!h.rim) {
      const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(h.x, 0, h.z));
      h.rim = { body: b, cols: [], r: 0 };
    }
    const rim = h.rim;
    if (Math.abs(rim.r - h.r) > h.r * 0.04) {
      for (const c of rim.cols) this.world.removeCollider(c, false);
      rim.cols = [];
      rim.r = h.r;
      const R = h.r + RIM_R * 0.5;
      const n = Math.max(12, Math.min(40, Math.ceil((Math.PI * 2 * R) / 0.9)));
      const chord = 2 * R * Math.sin(Math.PI / n);
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        const tx = -Math.sin(a), tz = Math.cos(a);
        const k = Math.SQRT1_2;
        const cd = RAPIER.ColliderDesc.capsule(chord / 2, RIM_R)
          .setTranslation(Math.cos(a) * R, -RIM_R - 0.02, Math.sin(a) * R)
          .setRotation({ x: tz * k, y: 0, z: -tx * k, w: k })
          .setFriction(0.6)
          .setCollisionGroups(C_RIM);
        rim.cols.push(this.world.createCollider(cd, rim.body));
      }
    }
    rim.body.setNextKinematicTranslation({ x: h.x, y: 0, z: h.z });
  }

  _dropRim(h) {
    if (!h.rim) return;
    this.world.removeRigidBody(h.rim.body);
    h.rim = null;
  }

  // ---------- шаг ----------
  stepAttract(){
    // Live bots, traffic, swallowing and rebuilding without a Rapier step.
    this.time+=DT;this.tick++;
    for(const h of this.holes){this._moveHole(h);h.phys=false;if(h.alive&&this.tick%4===0)this._simpleEat(h,true);}
    this._holesEatHoles();this._agents();if(this.pickupsOn)this._pickups();
    if(this.regen&&this.tick%20===0)this._regenStep();
  }
  step() {
    this.time += DT;
    // за шаг на куски ломается не больше 5 предметов, остальное рассыпается пылью — обвал не плодит сотни тел разом
    this.chunkBudget = 5;
    this.tick++;
    const holes = this.holes;
    const F = this.focus;
    const phys = [];
    for (const h of holes) {
      this._moveHole(h);
      // физика только у дыр, край которых виден на экране (viewR задаёт игра по камере); остальные едят упрощённо
      const R = this.viewR || this.physR;
      h.phys = h.alive && (!F || h === F || Math.hypot(h.x - F.x, h.z - F.z) - h.r < R);
      if (h.phys) {
        this._updateRim(h);
        phys.push(h);
      } else this._dropRim(h);
    }
    this.phys = phys;
    // недоеденные дома в кадре, которым не хватило места в физике
    if (this.wakeLater && this.wakeLater.size && this.active.size < this.maxBodies - 30) {
      for (const g of this.wakeLater) {
        this.wakeLater.delete(g);
        const items = this.groups.get(g);
        const o = items && items.find((x) => x.st === 0);
        if (o) this.activateGroup(o);
        break;
      }
    }
    // включаем физику у предметов на краю дыр
    if (this.tick % 2 === 0) for (const h of phys) this._activateAround(h);

    // падение в дыру и затягивание
    // позы берём из кэша (обновляется после шага только у неспящих тел) — меньше обращений к wasm и мусора
    for (const it of this.active) {
      const b = it.body;
      const p = it.p;
      let best = null, bestE = 1e9, bestD = 0;
      for (const h of phys) {
        const ex = p.x - h.x, ez = p.z - h.z;
        const d = Math.sqrt(ex * ex + ez * ez);
        if (d - h.r < bestE) {
          bestE = d - h.r;
          best = h;
          bestD = d;
        }
      }
      let drop = false;
      if (best) {
        const fits = fitOf(it) < best.r * 1.9;
        if (fits) drop = bestD < best.r - it.footR * 0.3 || (it.dropping && bestD < best.r + it.rad + 0.4);
      }
      if (drop !== it.dropping) {
        if (!drop && p.y < -0.02) {
          // дыра ушла, а предмет уже под землёй — он упал
          this._eat(it, it.lastHole);
          continue;
        }
        it.dropping = drop;
        it.dropT = 0;
        it.col.setCollisionGroups(drop ? C_DROP : C_ITEM);
        b.wakeUp();
      }
      if (drop) {
        it.dropT += DT;
        // застрял (зажат соседями или лёг поперёк) — отпускаем сквозь всё
        if (it.dropT > 0.9 && !it.ghost && p.y > -it.rad) {
          it.ghost = true;
          it.col.setCollisionGroups(C_GHOST);
        }
      }
      if (best && fitOf(it) < best.r * 1.9) {
        const h = best;
        const dx = h.x - p.x, dz = h.z - p.z;
        const L = Math.max(0.01, bestD);
        const m = it.mass;
        if (drop) {
          it.lastHole = h;
          const a = 3 + 7 * Math.min(1, L / h.r);
          IMP.x = (dx / L) * m * a * DT;
          IMP.y = -m * G * 0.8 * DT;
          IMP.z = (dz / L) * m * a * DT;
          b.applyImpulse(IMP, true);
        } else if (bestE < it.footR + 0.5 + h.suckE) {
          // лёгкое затягивание к краю (магнит тянет сильнее и дальше)
          const a = 2.5 + h.suckE * 2;
          IMP.x = (dx / L) * m * a * DT;
          IMP.y = 0;
          IMP.z = (dz / L) * m * a * DT;
          b.applyImpulse(IMP, true);
        }
      }
    }

    this.world.step();
    this._sync();
    this._damage();
    this._pending();

    // съедено то, что целиком ушло под землю
    for (const it of this._list()) {
      const p = it.p;
      if (p.y + it.rad < -1.2 || p.y < -12) {
        let best = it.lastHole, bd = 1e9;
        for (const h of phys) {
          const ex = p.x - h.x, ez = p.z - h.z;
          const d = Math.sqrt(ex * ex + ez * ez) - h.r;
          if (d < bd) {
            bd = d;
            best = h;
          }
        }
        if (best && bd > it.rad + 4) best = null;
        this._eat(it, best);
      } else if (Math.abs(p.x) > this.half + 25 || Math.abs(p.z) > this.half + 25) this.remove(it);
    }

    this._holesEatHoles();
    if (this.tick % 4 === 0) for (const h of holes) if (h.alive && !h.phys) this._simpleEat(h);
    this._agents();
    if (this.pickupsOn) this._pickups();
    if (this.regen && this.tick % 20 === 0) this._regenStep();
    if (this.tick % 30 === 0) this._deactivate();
  }

  _moveHole(h) {
    if (!h.alive) {
      h.respawnT -= DT;
      if (h.respawnT <= 0 && !h.noRespawn) this.respawn(h);
      return;
    }
    if (h.shield > 0) h.shield -= DT;
    const e = h.eff;
    for (const k in e) if (e[k] > 0) e[k] -= DT;
    h.suckE = h.suck + (e.magnet > 0 ? 2.6 : 0);
    const sp = speedFor(h.r, h.speedBonus + (e.speed > 0 ? 0.45 : 0)) * h.throttle * (e.slow > 0 ? 0.55 : 1);
    const tx = h.dirX * sp, tz = h.dirZ * sp;
    const k = Math.min(1, DT * 9);
    h.vx += (tx - h.vx) * k;
    h.vz += (tz - h.vz) * k;
    h.x += h.vx * DT;
    h.z += h.vz * DT;
    const lim = this.half - Math.min(h.r * 0.6, 6) - 1;
    h.x = Math.max(-lim, Math.min(lim, h.x));
    h.z = Math.max(-lim, Math.min(lim, h.z));
    // рост плавный
    const target = radiusFor(h.mass, h.sizeBonus) * (e.giant > 0 ? 1.4 : 1);
    h.r += (target - h.r) * Math.min(1, DT * 3);
  }

  respawn(h) {
    let bx = 0, bz = 0, bs = -1;
    for (let i = 0; i < 12; i++) {
      const x = (this.rnd() * 2 - 1) * (this.half - 12);
      const z = (this.rnd() * 2 - 1) * (this.half - 12);
      let near = 1e9;
      for (const o of this.holes) if (o !== h && o.alive) near = Math.min(near, Math.hypot(o.x - x, o.z - z) - o.r);
      if (near > bs) {
        bs = near;
        bx = x;
        bz = z;
      }
    }
    h.x = bx;
    h.z = bz;
    h.vx = h.vz = 0;
    h.alive = true;
    h.shield = 2.5;
    h.r = radiusFor(h.mass, h.sizeBonus);
    h.pts = scoreForMass(h.mass);
    this.events.push({ t: 'respawn', h });
  }

  _activateAround(h) {
    if (this.active.size >= this.maxBodies) {
      // перегруз: мелочь проваливается без физики
      this._simpleEat(h, true);
      return;
    }
    const reach = h.r + 0.9 + h.suckE;
    let skipped = false;
    this.query(h.x, h.z, reach + 4, (it) => {
      if (it.st !== 0) return;
      // дом, который дыре не по зубам, не трогаем: не будим физику и не расшатываем
      if (fitOf(it) >= h.r * 1.9) return;
      const d = Math.hypot(it.p.x - h.x, it.p.z - h.z) - it.footR;
      if (d >= reach) return;
      if (it.grp) {
        // целая башня не влезает в бюджет физики — её край съедим упрощённо, остальное обрушится позже
        let n = 0;
        for (const o of this.groups.get(it.grp)) if (o.st === 0) n++;
        if (n > 12 && this.active.size > 20 && this.active.size + n > this.maxBodies + 30) {
          skipped = true;
          return;
        }
      }
      this.activateGroup(it);
    });
    if (skipped) this._simpleEat(h, true);
  }

  // упрощённое поедание (дыра вдали от игрока или перегруз физики)
  _simpleEat(h, sinkFx) {
    const touched = this._touched || (this._touched = new Set());
    this.query(h.x, h.z, h.r, (it) => {
      if (it.st !== 0) return;
      if (fitOf(it) >= h.r * 1.9) return;
      const ex = it.p.x - h.x, ez = it.p.z - h.z;
      const d = Math.sqrt(ex * ex + ez * ez);
      if (d < h.r - it.footR * 0.3) {
        if (sinkFx) this.events.push({ t: 'sink', it: { ...it, p: { ...it.p }, q: { ...it.q } } });
        if (it.grp) touched.add(it.grp);
        this._eat(it, h);
      }
    });
    if (touched.size) {
      for (const g of touched) {
        const rest = this.groups.get(g) || [];
        if (sinkFx&&!this.attract) {
          // в кадре (перегруз физики): остаток дома обрушится по-настоящему, когда освободится место
          (this.wakeLater || (this.wakeLater = new Set())).add(g);
        } else {
          // за кадром: куски без опоры кладём на землю, а не держим в воздухе
          for (const o of rest) if (o.st === 0) this._settle(o);
        }
      }
      touched.clear();
    }
  }

  // предмет без физики опускаем на землю (плашмя по меньшему размеру)
  _settle(it) {
    const [sx, sy, sz] = it.size;
    const lo = Math.min(sx, sy, sz);
    if (it.p.y <= lo / 2 + 0.05) return;
    if (sy > lo + 0.01) {
      // поворачиваем так, чтобы тонкая сторона смотрела вверх
      const yaw = Math.atan2(2 * (it.q.w * it.q.y), 1 - 2 * it.q.y * it.q.y);
      const flat = sx <= sz ? { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 } : { x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };
      const cy = Math.cos(yaw / 2), syw = Math.sin(yaw / 2);
      it.q.x = cy * flat.x + syw * flat.z;
      it.q.y = syw * flat.w;
      it.q.z = cy * flat.z - syw * flat.x;
      it.q.w = cy * flat.w;
    }
    it.p.y = lo / 2;
    this._cellMove(it);
    (this.frozenNow || (this.frozenNow = [])).push(it);
  }

  _eat(it, h) {
    if (it.st === 2) return;
    this.remove(it);
    this.eatenVol += it.vol;
    let pts=0;
    if (h && h.alive) {
      const before=h.pts;
      h.mass += it.foodMass * (h.grow || 1) * growthMul(h);
      h.pts = scoreForMass(h.mass);
      pts=h.pts-before;
      h.eaten++;
    } else h=null;
    this.events.push({ t: 'eat', it, h, pts });
  }

  _holesEatHoles() {
    const hs = this.holes;
    for (let i = 0; i < hs.length; i++)
      for (let j = 0; j < hs.length; j++) {
        const a = hs[i], b = hs[j];
        if (a === b || !a.alive || !b.alive || safe(b)) continue;
        if (!canEatHole(a, b)) continue;
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d > a.r - b.r * 0.4) continue;
        const previousMass=b.mass,previousScore=b.pts;
        const before=a.pts;
        a.mass += (b.mass * 0.5 + 10) * growthMul(a);
        a.pts = scoreForMass(a.mass);
        const pts=a.pts-before;
        a.kills++;
        b.alive = false;
        b.deaths++;
        b.deadAt = this.time;
        for (const k in b.eff) b.eff[k] = 0;
        b.respawnT = 3;
        b.mass = 0;
        b.pts = 0;
        b.r = radiusFor(0,b.sizeBonus);
        b.vx = b.vz = 0;
        this._dropRim(b);
        this.events.push({ t: 'holeEat', a, b, pts, previousMass, previousScore });
      }
  }

  // копия списка активных без новой аллокации каждый шаг
  _list() {
    const a = this._tmpA || (this._tmpA = []);
    const b = this._tmpB || (this._tmpB = []);
    const out = this._flip ? a : b;
    this._flip = !this._flip;
    out.length = 0;
    for (const it of this.active) out.push(it);
    return out;
  }

  _agents() {
    const holes = this.holes;
    const F = this.focus;
    for (const it of this.agents) {
      if (it.st !== 0 || !it.agent) continue;
      const A = it.agent;
      // вдали от игрока (за кадром) прохожие и машины шагают реже, но крупнее
      let k = 1;
      if (F) {
        const ex = it.p.x - F.x, ez = it.p.z - F.z;
        const far = 70 + (F.r || 0) * 6;
        if (ex * ex + ez * ez > far * far) {
          if ((this.tick + it.id) % 4) continue;
          k = 4;
        }
      }
      if (A.type === 'car') this._car(it, A, k * DT);
      else this._walker(it, A, holes, k * DT);
      this._cellMove(it);
      it.mv = this.tick;
    }
    if (this.tick % 120 === 0) this.agents = this.agents.filter((it) => it.st === 0 && it.agent);
  }

  _car(it, A, DT) {
    const net = this.map.roads;
    // тормозим, если впереди дыра
    let slow = 1;
    for (const h of this.holes) {
      if (!h.alive) continue;
      const ex = h.x - it.p.x, ez = h.z - it.p.z;
      const d = Math.sqrt(ex * ex + ez * ez) - h.r;
      if (d < 5) slow = Math.min(slow, Math.max(0.15, d / 5));
    }
    const previous={x:it.p.x,z:it.p.z,yaw:Math.atan2(2*it.q.w*it.q.y,1-2*it.q.y*it.q.y)};
    const choose=(from,at)=>{
      const nb=net.nodes[at].n.filter(k=>k!==from),offset=Math.floor(this.rnd()*Math.max(1,nb.length));
      for(let n=0;n<nb.length;n++){
        const next=nb[(n+offset)%nb.length],curve=turnCurve(net,A,next,it.size[2]);
        let clear=true;for(let i=0;i<=12&&clear;i++)if(this._trafficBlocked(it,curvePose(curve,i/12)))clear=false;
        if(clear)return next;
      }
      return nb.length?nb[offset]:from;
    };
    if(!A.curve)advanceTraffic(net,A,0,it.size[2],choose);
    const reservations=this.trafficJunctions||(this.trafficJunctions=new Map());
    // Leave enough space for the entire turning bus, not just a car's own nose.
    const nearTurn=A.turn!=null || A.t*A.len>=A.len-11-it.size[2]/2;
    if(nearTurn){
      const owner=reservations.get(A.b);
      if(owner&&owner!==it&&owner.st===0&&owner.agent){
        const v=it.v||(it.v={x:0,y:0,z:0});v.x=v.y=v.z=0;return;
      }
      reservations.set(A.b,it);
    }
    const old={...A};
    const travel=A.speed*slow*DT*(A.turn!=null?.7:1);
    const p=advanceTraffic(net,A,travel,it.size[2],choose);
    if(this._trafficBlocked(it,p,true)){
      Object.assign(A,old);A.wait=(A.wait||0)+DT;
      // Try another junction exit when a route is physically blocked.
      if(A.wait>1.2 && A.turn==null){A.curve=null;A.wait=0;}
      const v=it.v||(it.v={x:0,y:0,z:0});v.x=v.y=v.z=0;return;
    }
    if(A.a!==old.a && reservations.get(old.b)===it)reservations.delete(old.b);
    A.wait=0;it.p.x=p.x;it.p.z=p.z;A.yaw=p.yaw;
    it.q.x=it.q.z=0;it.q.y=Math.sin(p.yaw/2);it.q.w=Math.cos(p.yaw/2);
    const v=it.v||(it.v={x:0,y:0,z:0});v.x=(p.x-previous.x)/DT;v.y=0;v.z=(p.z-previous.z)/DT;
  }

  _trafficBlocked(it,p,traffic=false){
    let blocked=false;const box={x:p.x,z:p.z,yaw:p.yaw,w:it.size[0],d:it.size[2]};
    this.query(p.x,p.z,it.footR+2,o=>{
      if(blocked||o===it||o.st!==0)return;
      const wall=o.grp && o.kind==='block';
      if(!wall && !(traffic && o.kind==='car'))return;
      if(o.p.y-o.size[1]/2>it.size[1]-.1 || o.p.y+o.size[1]/2<.25)return;
      const yaw=Math.atan2(2*o.q.w*o.q.y,1-2*o.q.y*o.q.y);
      if(footprintOverlap(box,{x:o.p.x,z:o.p.z,yaw,w:o.size[0],d:o.size[2]},.06))blocked=true;
    });return blocked;
  }

  _walker(it, A, holes, DT) {
    // паника: убегаем от ближайшей дыры
    let fx = 0, fz = 0;
    for (const h of holes) {
      if (!h.alive) continue;
      const dx = it.p.x - h.x, dz = it.p.z - h.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d - h.r < 5) {
        fx += dx / (d + 0.01);
        fz += dz / (d + 0.01);
      }
    }
    if (fx || fz) {
      A.panic = 1.5;
      const L = Math.hypot(fx, fz);
      A.dx = fx / L;
      A.dz = fz / L;
    }
    let sp = A.speed;
    if (A.panic > 0) {
      A.panic -= DT;
      sp = A.speed * 2.6;
    } else {
      A.turn -= DT;
      if (A.turn <= 0) {
        A.turn = 2 + this.rnd() * 4;
        // идём вдоль тротуара: держимся у точки «дома»
        const hx = A.hx - it.p.x, hz = A.hz - it.p.z;
        const a = Math.atan2(hx, hz) + (this.rnd() - 0.5) * 2.4;
        const far = Math.hypot(hx, hz) > 6;
        const ang = far ? a : this.rnd() * Math.PI * 2;
        A.dx = Math.sin(ang);
        A.dz = Math.cos(ang);
        A.idle = this.rnd() < 0.25 ? 1 + this.rnd() * 2 : 0;
      }
      if (A.idle > 0) {
        A.idle -= DT;
        sp = 0;
      }
    }
    const lim = this.half - 2;
    it.p.x = Math.max(-lim, Math.min(lim, it.p.x + A.dx * sp * DT));
    it.p.z = Math.max(-lim, Math.min(lim, it.p.z + A.dz * sp * DT));
    A.phase = (A.phase || 0) + sp * DT * 3;
    if (sp > 0) {
      const a = Math.atan2(A.dx, A.dz);
      it.q.x = 0;
      it.q.y = Math.sin(a / 2);
      it.q.z = 0;
      it.q.w = Math.cos(a / 2);
    }
    const v = it.v || (it.v = { x: 0, y: 0, z: 0 });
    v.x = A.dx * sp;
    v.y = 0;
    v.z = A.dz * sp;
  }

  _deactivate() {
    const phys = this.phys || [];
    const F = this.focus, R = (this.viewR || this.physR) + 15;
    // дом замораживаем только целиком: замороженный кусок теряет коллайдер, и стоящее на нём проваливается
    const hold = this._hold || (this._hold = new Set());
    const list = this._list();
    const plan = this._plan || (this._plan = []);
    plan.length = 0;
    for (const it of list) {
      let act = 0; // 0 оставить, 1 заморозить, 2 заморозить и уложить, 3 съесть
      if (F && this.viewR && (it.p.x - F.x) ** 2 + (it.p.z - F.z) ** 2 > R * R) {
        // далеко за кадром: падающее — сразу в дыру, остальное замораживаем
        act = it.dropping || it.p.y < -0.02 ? 3 : 2;
      } else if (!it.dropping) {
        let near = 1e9;
        for (const h of phys) {
          const ex = it.p.x - h.x, ez = it.p.z - h.z;
          near = Math.min(near, Math.sqrt(ex * ex + ez * ez) - h.r - it.footR);
        }
        if (it.body.isSleeping()) {
          if (near > 2.5) act = 1;
        } else {
          // почти улёгшиеся обломки замораживаем сразу, не дожидаясь сна: дрожащая куча — главный пик физики
          const v = it.vel;
          const v2 = v ? v.x * v.x + v.y * v.y + v.z * v.z : 0;
          if ((near > 25 && v2 < 0.16) || (near > 4 && v2 < 0.04 && it.p.y < it.rad + 0.5)) act = 1;
        }
      }
      // держат дом только куски, стоящие на своих местах; сдвинутые обломки замерзают сами по себе
      const home = it.gfit && fitOf(it) === it.gfit;
      if (act === 0 && home) hold.add(it.grp);
      plan.push(it, act);
    }
    for (let i = 0; i < plan.length; i += 2) {
      const it = plan[i], act = plan[i + 1];
      if (act === 3) this._eat(it, it.lastHole);
      else if (act && !(it.gfit && fitOf(it) === it.gfit && hold.has(it.grp))) {
        this.freeze(it);
        // за кадром на земле оставляем только сдвинутые куски, стоящий дом остаётся домом
        if (act === 2 && (!it.gfit || fitOf(it) !== it.gfit)) this._settle(it);
      }
    }
    hold.clear();
    plan.length = 0;
  }

  // поза, поворот и скорость неспящих тел — одним проходом после шага
  _sync() {
    for (const it of this.active) {
      const b = it.body;
      if (b.isSleeping()) {
        it.awake = false;
        continue;
      }
      it.awake = true;
      const p = b.translation();
      it.p.x = p.x;
      it.p.y = p.y;
      it.p.z = p.z;
      const q = b.rotation();
      it.q.x = q.x;
      it.q.y = q.y;
      it.q.z = q.z;
      it.q.w = q.w;
      if(it.kind==='car'&&!it.dropping && p.y>=it.size[1]*.35){
        const yaw=Math.atan2(2*q.w*q.y,1-2*q.y*q.y);
        if(this._trafficBlocked(it,{x:p.x,z:p.z,yaw})&&it.safeTrafficPose){
          Object.assign(it.p,it.safeTrafficPose.p);Object.assign(it.q,it.safeTrafficPose.q);
          b.setTranslation(it.p,true);b.setRotation(it.q,true);b.setLinvel({x:0,y:0,z:0},true);b.setAngvel({x:0,y:0,z:0},true);
        }else it.safeTrafficPose={p:{...it.p},q:{...it.q}};
      }
      const v = b.linvel();
      if (!it.vel) {
        it.vel = { x: v.x, y: v.y, z: v.z };
        it.v0 = { x: v.x, y: v.y, z: v.z };
      } else {
        it.v0.x = it.vel.x;
        it.v0.y = it.vel.y;
        it.v0.z = it.vel.z;
        it.vel.x = v.x;
        it.vel.y = v.y;
        it.vel.z = v.z;
      }
    }
  }

  // ---------- урон и разрушение (как в «Разрушителе Замков») ----------
  _damage() {
    for (const it of this._list()) {
      if (!it.awake || !it.v0 || it.st !== 1 || it.dropping) continue;
      // первые доли секунды после включения физики дом «усаживается» — это не удар
      if (this.time - it.actT < 0.5) continue;
      const M = MATS[it.mat];
      if (!M || M.dvMin > 100) continue;
      const v = it.vel;
      const ax = v.x - it.v0.x, ay = v.y - it.v0.y + G * DT, az = v.z - it.v0.z;
      const dv = Math.sqrt(ax * ax + ay * ay + az * az);
      const d = dv - M.dvMin;
      if (d <= 0) continue;
      it.hp -= d;
      if (d > 1) this.events.push({ t: 'hit', it, d, p: { ...it.p } });
      if (it.hp <= 0) this.breakItem(it);
    }
  }

  breakItem(it) {
    if (it.st !== 1) return;
    const b = it.body;
    this._readPose(it);
    const v = b.linvel();
    const w = b.angvel();
    const vel = { x: v.x, y: v.y, z: v.z };
    const ang = { x: w.x, y: w.y, z: w.z };
    // обломки достаются ближайшей дыре рядом
    let owner = null, od = 1e9;
    for (const h of this.phys || []) {
      const d = Math.hypot(it.p.x - h.x, it.p.z - h.z) - h.r;
      if (d < od) {
        od = d;
        owner = h;
      }
    }
    if (od > 14) owner = null;
    const big = it.shape === 'box' && Math.max(...it.size) > 1.25 && this.active.size < this.maxBodies + 20 && this.chunkBudget-- > 0;
    this.remove(it);
    this.events.push({ t: 'break', it, p: { ...it.p }, big });
    if (it.mat === 'tnt') {
      this.pending = this.pending || [];
      this.pending.push({ at: this.time + 0.06, p: { ...it.p }, R: 5, P: 15 });
    }
    if (big) {
      // раскалываем вдоль длинной стороны на 2 (очень длинное — на 3)
      const s = it.size;
      const ax = s[0] >= s[1] && s[0] >= s[2] ? 0 : s[1] >= s[2] ? 1 : 2;
      const n = s[ax] > 4.5 ? 3 : 2;
      const ns = [...s];
      ns[ax] = s[ax] / n;
      for (let i = 0; i < n; i++) {
        const off = [0, 0, 0];
        off[ax] = (i - (n - 1) / 2) * ns[ax];
        const o = rotate(it.q, off);
        const sep = rotate(it.q, off.map((c) => c * 0.6));
        const kid = this.addItem({
          shape: 'box',
          size: [...ns],
          mat: it.mat,
          look: it.look,
          tint: it.tint,
          x: it.p.x + o[0],
          y: it.p.y + o[1],
          z: it.p.z + o[2],
          q: { ...it.q },
          kind: 'chunk',
          foodMass:it.foodMass/n,
          v: { x: vel.x + sep[0], y: vel.y + sep[1] + 0.6, z: vel.z + sep[2] },
          w: ang,
        });
        kid.hp = MATS[it.mat].hp * 0.85;
        this.added.push(kid);
        this.activate(kid);
      }
    } else if (owner && owner.alive) {
      // мелочь рассыпается в пыль — очки той дыре, что всё устроила
      owner.mass += it.foodMass * 0.5 * (owner.grow || 1) * growthMul(owner);
      owner.pts = scoreForMass(owner.mass);
      this.eatenVol += it.vol;
    }
  }

  _pending() {
    if (!this.pending || !this.pending.length) return;
    const rest = [];
    for (const e of this.pending) {
      if (e.at > this.time) rest.push(e);
      else this.explode(e.p, e.R, e.P);
    }
    this.pending = rest;
  }

  explode(p, R, P) {
    this.events.push({ t: 'boom', p, R });
    this.query(p.x, p.z, R + 2, (o) => {
      if (o.st === 2) return;
      const dx = o.p.x - p.x, dy = o.p.y - p.y, dz = o.p.z - p.z;
      const d = Math.max(0.05, Math.hypot(dx, dy, dz) - o.rad * 0.5);
      if (d > R) return;
      if (o.st === 0) {
        if (this.active.size > this.maxBodies + 80) return;
        this.activateGroup(o);
      }
      if (o.st !== 1) return;
      const k = 1 - d / R;
      const dens = (MATS[o.mat] || MATS.prop).dens;
      const dv = (P * k) / Math.sqrt(Math.max(0.5, dens));
      const L = Math.hypot(dx, dy + 0.8, dz) || 1;
      const imp = o.mass * dv;
      o.body.applyImpulse({ x: (dx / L) * imp, y: ((dy + 0.8) / L) * imp, z: (dz / L) * imp }, true);
      o.body.applyTorqueImpulse({ x: (this.rnd() - 0.5) * imp * 0.3, y: (this.rnd() - 0.5) * imp * 0.3, z: (this.rnd() - 0.5) * imp * 0.3 }, true);
      const M = MATS[o.mat];
      if (M && M.dvMin < 100) {
        o.hp -= dv * 0.5;
        if (o.hp <= 0) this.breakItem(o);
      }
    });
  }

  // ---------- регенерация ----------
  // предмет пропал: мелочь вернётся сама по себе, дом — когда от него почти ничего не останется
  _lost(it) {
    if (it.grp) {
      const g = this.groupHome.get(it.grp);
      if (!g) return;
      g.alive--;
      if (!g.queued && g.alive < g.n) {
        g.queued = true;
        this.regenQ.push({ g, gid: it.grp, at: this.time + REGEN.house + this.rnd() * 15 });
      }
      return;
    }
    const k = it.home.kind;
    const base = k === 'person' || k === 'animal' ? REGEN.walker : k === 'car' ? REGEN.car : REGEN.prop;
    this.regenQ.push({ s: it.home, at: this.time + base + this.rnd() * 10 });
  }

  _regenStep() {
    // в долгой игре (меню, «Спокойный») список предметов растёт — выкидываем давно пропавшие
    if (this.items.length > this.nItems0 * 1.5) {
      this.items = this.items.filter((it) => {
        if (it.st !== 2) return true;
        this.byId.delete(it.id);
        return false;
      });
    }
    const q = this.regenQ;
    let budget = 14; // spread expensive rebuilds across simulation ticks
    for (let i = q.length - 1; i >= 0 && budget > 0; i--) {
      const e = q[i];
      if (e.at > this.time) continue;
      budget -= e.g ? 7 : 1;
      if (e.g ? this._rebuild(e) : this._regrow(e.s)) q.splice(i, 1);
      else e.at = this.time + 2 + this.rnd() * 3; // рядом дыра или место занято — попробуем позже
    }
  }

  enableRegen() {
    if (this.regen) return;
    this.regen = true;
    // A finished finite map becomes a living city, including old damaged buildings.
    for (const [gid, g] of this.groupHome) {
      g.alive = (this.groups.get(gid) || []).filter(it => it.st !== 2).length;
      if (g.alive < g.n && !g.queued) {
        g.queued = true;
        this.regenQ.push({ g, gid, at: this.time + REGEN.house + this.rnd() * 10 });
      }
    }
    for (const it of this.items) if (it.st === 2 && it.home && !it.grp && !it.noRegen) this._lost(it);
  }

  // рядом нет ни одной дыры: под носом у игрока ничего не вырастает
  _clearOf(x, z, R) {
    for (const h of this.holes) if (h.alive && Math.hypot(h.x - x, h.z - z) < h.r + R + 4) return false;
    return true;
  }

  _regrow(s) {
    let spec = s;
    if (s.agent && s.agent.type === 'car') {
      // машина выезжает на случайный участок дороги
      const nodes = this.map.roads.nodes;
      const a = Math.floor(this.rnd() * nodes.length);
      const nb = nodes[a].n;
      const b = nb[Math.floor(this.rnd() * nb.length)];
      const len = Math.hypot(nodes[b].x - nodes[a].x, nodes[b].z - nodes[a].z);
      const t = 0.2 + this.rnd() * 0.6;
      const dx = (nodes[b].x - nodes[a].x) / len, dz = (nodes[b].z - nodes[a].z) / len;
      const lane = s.agent.lane;
      spec = { ...s, x: nodes[a].x + dx * len * t - dz * lane, z: nodes[a].z + dz * len * t + dx * lane, ry: Math.atan2(dx, dz), agent: { ...s.agent, a, b, t, len } };
    } else if (s.agent) spec = { ...s, agent: { ...s.agent } };
    const R = 0.5 * Math.hypot(s.size[0], s.size[2]);
    if (!this._clearOf(spec.x, spec.z, R)) return false;
    let busy = false;
    this.query(spec.x, spec.z, R, (o) => {
      if (busy || o.st === 2) return;
      if (Math.hypot(o.p.x - spec.x, o.p.z - spec.z) < (R + o.footR) * 0.6 && Math.abs(o.p.y - spec.y) < (s.size[1] + o.size[1]) / 2) busy = true;
    });
    if (busy) return false;
    const it = this.addItem(spec);
    it.home = s;
    it.born = this.time;
    this.added.push(it);
    this.events.push({ t: 'regen', p: { x: spec.x, z: spec.z }, r: R, big: false });
    return true;
  }

  // дом отстраивается заново: остатки и обломки на его месте уходят под землю, новый поднимается из-под земли
  _rebuild(e) {
    const g = e.g;
    if (!this._clearOf(g.x, g.z, g.R)) return false;
    const junk = [];
    let blocked = false;
    for (const o of this.groups.get(e.gid) || []) {
      if (o.st === 1) blocked = true;
      else if (o.st === 0) junk.push(o);
    }
    this.query(g.x, g.z, g.R, (o) => {
      if (o.st === 2 || o.kind !== 'chunk') return;
      if (Math.hypot(o.p.x - g.x, o.p.z - g.z) > g.R + o.footR * 0.5) return;
      if (o.st === 1) blocked = true;
      else junk.push(o);
    });
    if (blocked) return false;
    for (const o of junk) {
      o.noRegen = true;
      this.events.push({ t: 'sink', it: { ...o, p: { ...o.p }, q: { ...o.q } } });
      this.remove(o, true);
    }
    if (this.wakeLater) this.wakeLater.delete(e.gid);
    this.groups.set(e.gid, []);
    for (const s of g.specs) {
      const it = this.addItem(s);
      it.home = s;
      it.born = this.time;
      it.riseH = g.top;
      this.added.push(it);
    }
    this._fitGroup(this.groups.get(e.gid));
    g.alive = g.n;
    g.queued = false;
    this.events.push({ t: 'regen', p: { x: g.x, z: g.z }, r: g.R, big: true });
    return true;
  }

  // ---------- бонусы на карте ----------
  _pickups() {
    const P = this.pickups;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= DT;
      if (p.life <= 0) {
        P.splice(i, 1);
        continue;
      }
      for (const h of this.holes) {
        if (!h.alive || Math.hypot(h.x - p.x, h.z - p.z) > h.r + 0.6) continue;
        h.eff[p.type] = PICK_TIME[p.type];
        // заморозка замедляет всех соперников рядом (в пределах 60 м)
        if (p.type === 'freeze') for (const o of this.holes) if (o !== h && o.alive && Math.hypot(o.x - h.x, o.z - h.z) < 60) o.eff.slow = PICK_TIME.slow;
        h.picks++;
        this.events.push({ t: 'pick', h, type: p.type, p: { x: p.x, z: p.z } });
        P.splice(i, 1);
        break;
      }
    }
    this._gold();
    this.pickT -= DT;
    if (this.pickT > 0) return;
    this.pickT = 3.5 + this.rnd() * 3;
    if (P.length >= this.pickupsOn) return;
    // бонус появляется на дороге, подальше от дыр
    const L = this.map.lines;
    for (let k = 0; k < 8; k++) {
      const a = L[Math.floor(this.rnd() * L.length)];
      const b = (this.rnd() * 2 - 1) * (this.map.span / 2 - 4);
      const [x, z] = this.rnd() < 0.5 ? [a, b] : [b, a];
      if (!this.holes.every((h) => !h.alive || Math.hypot(h.x - x, h.z - z) > h.r + 7)) continue;
      if (P.some((o) => Math.hypot(o.x - x, o.z - z) < 12)) continue;
      P.push({ id: NEXT++, type: PICK_TYPES[Math.floor(this.rnd() * PICK_TYPES.length)], x, z, life: 30 });
      break;
    }
  }

  // золотая цель: время от времени один прохожий, зверь или машина становится золотым
  _gold() {
    const g = this.gold;
    if (g) {
      if (g.st === 2) this.gold = null;
      return;
    }
    if (this.goldT == null) this.goldT = 20 + this.rnd() * 10;
    this.goldT -= DT;
    if (this.goldT > 0) return;
    this.goldT = 30 + this.rnd() * 20;
    const A = this.agents;
    for (let k = 0; k < 12 && A.length; k++) {
      const it = A[Math.floor(this.rnd() * A.length)];
      if (it.st !== 0 || it.gold) continue;
      if (!this.holes.every((h) => !h.alive || Math.hypot(h.x - it.p.x, h.z - it.p.z) > h.r + 14)) continue;
      it.gold = true;
      it.pts = GOLD_PTS;
      it.tint = 0xffc020;
      this.gold = it;
      this.events.push({ t: 'gold', it });
      return;
    }
  }

  // доля разрушенного города
  progress() {
    return this.totalVol ? this.eatenVol / this.totalVol : 0;
  }
}

export function yawQuat(a) {
  return { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) };
}

export function rotate(q, v) {
  // v' = q v q*
  const [x, y, z] = v;
  const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;
  return [ix * qw + iw * -qx + iy * -qz - iz * -qy, iy * qw + iw * -qy + iz * -qx - ix * -qz, iz * qw + iw * -qz + ix * -qy - iy * -qx];
}
