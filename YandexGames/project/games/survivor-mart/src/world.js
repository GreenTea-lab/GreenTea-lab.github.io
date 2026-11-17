// Логика: день торговли (покупатели, полки, касса с проверкой батареек, поиск хлама, персонал), ночь обороны (зомби, баррикады, капканы)
import { save } from './save.js';
import {
  GOODS, GOOD_IDS, RECIPES, LOCS, WAGE, WEAPONS, ZOMBIES, isHorde, isBoss, BUILD, SHELF_SLOTS, SHELF_CAP, SHELF_D, REG, REG_SPOT, QUEUE, STORAGE, BENCH,
  GUARD_NIGHT, GUARD_DAY, ENTRIES, FRONT_Z, WALL_T, LOOT_SPOTS, SPOT_LOOT, TRAP_SLOTS, SHOP, xpNeed,
  NIGHT_H0, NIGHT_H1, NIGHT_LOOT, COT, HEAL, nightCount, dayZCount, newZombiesOn,
} from './data.js';
import { Nav, buildGrid, shelfCount } from './nav.js';

export const DAY_LEN = 180; // секунд реального времени на 8:00–20:00
export const NIGHT_LEN = 150; // секунд на 20:00–6:00
export const SLEEP_K = 8; // во сне ночь идёт в 8 раз быстрее
export const H0 = 8,
  H1 = 20,
  SCAV_BACK = 18;
export const PRICE_MULT = [0.75, 1, 1.35];
export const CARRY = 6;

const rnd = Math.random;
const rr = (a, b) => a + rnd() * (b - a);
const pick = (a) => a[(rnd() * a.length) | 0];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// случайный вид зомби из открытых к этому дню
function zType(d, pool) {
  const w = {};
  for (const [k, Z] of Object.entries(ZOMBIES)) if (Z.w && d >= Z.from && (!pool || pool.includes(k))) w[k] = Z.w;
  return wpick(w);
}
const hourTxt = (h) => {
  const hh = Math.floor(h) % 24,
    mm = Math.floor(((h % 1) * 60) / 10) * 10;
  return hh + ':' + String(mm).padStart(2, '0');
};
export { hourTxt };
function wpick(weights) {
  let s = 0;
  for (const k in weights) s += weights[k];
  let r = rnd() * s;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0];
}

// навыки → числа
export function perks(sk) {
  return {
    testT: sk.serv >= 1 ? 0.5 : 1,
    tell: sk.serv >= 2,
    tip: sk.serv >= 3 ? 0.1 : 0,
    repMul: sk.serv >= 4 ? 1.5 : 1,
    hp: 100 + (sk.surv >= 1 ? 25 : 0) + (sk.surv >= 4 ? 25 : 0),
    dmg: sk.surv >= 2 ? 1.2 : 1,
    speed: sk.surv >= 3 ? 1.12 : 1,
    regenNight: sk.surv >= 4,
    wage: sk.mgmt >= 1 ? 0.8 : 1,
    staffSp: sk.mgmt >= 2 ? 1.25 : 1,
    scav: sk.mgmt >= 3 ? 3 : 0,
    cust: sk.mgmt >= 4 ? 1.15 : 1,
    craftSp: sk.craft >= 1 ? 1.4 : 1,
    dbl: sk.craft >= 2 ? 0.25 : 0,
    barMul: sk.craft >= 3 ? 1.3 : 1,
    repairCost: sk.craft >= 4 ? 0.5 : 1,
  };
}

export function barMax(e, build, pk) {
  const base = e.door ? 150 + 60 * build.walls : 100 + 50 * build.walls;
  return Math.round(base * pk.barMul);
}

export function wageOf(s, pk) {
  return Math.round(WAGE[s.lvl] * pk.wage);
}

// разложить сумму на батарейки разных номиналов
function makeBatteries(total) {
  const out = [];
  let left = total;
  const den = [20, 10, 5, 2, 1];
  while (left > 0 && out.length < 7) {
    const ok = den.filter((d) => d <= left);
    let d = ok[0];
    // иногда мельче, чтобы было разнообразнее
    if (ok.length > 1 && rnd() < 0.35 && out.length < 5) d = ok[1];
    out.push(d);
    left -= d;
  }
  if (left > 0) out[out.length - 1] += left;
  return out.map((v) => ({ v, dead: false, st: '?', charge: 0 }));
}

export class World {
  constructor(opts = {}) {
    const s = save.data;
    this.s = s;
    this.opts = opts;
    this.day = s.day;
    this.pk = perks(s.skills);
    this.nShelves = shelfCount(s.build);
    while (s.shelves.length < this.nShelves) s.shelves.push({ type: null, n: 0 });
    this.shelves = s.shelves;
    this.nav = new Nav(buildGrid(this.nShelves));
    this.nav.open = (e, mode) => this.entryOpen(e, mode);
    this.fx = [];
    this.time = 0; // реальные секунды с начала фазы
    this.phase = opts.phase || 'day';
    this.hour = opts.hour ?? H0;
    this.finished = false;
    this.ids = 1;
    // игрок
    const W = WEAPONS.find((w) => w.id === s.weapon) || WEAPONS[0];
    this.weapon = W;
    this.P = { x: REG_SPOT.x - 1.2, z: REG_SPOT.z + 0.2, dir: Math.PI, hp: this.pk.hp, max: this.pk.hp, hand: null, atkCd: 0, swing: 0, moving: false, ko: false, hurtT: 0, act: null, near: null, aim: null, speedK: 1, slowT: 0 };
    this.sleeping = false;
    if (this.phase === 'day' && this.hour <= H0 + 0.01) {
      this.P.x = 0;
      this.P.z = -4.2;
      this.P.dir = 0;
    }
    // баррикады
    this.barr = ENTRIES.map((e) => {
      const max = barMax(e, s.build, this.pk);
      const v = s.barr[e.id];
      return { e, max, hp: v < 0 || v === undefined ? max : Math.min(max, v), hit: 0 };
    });
    // места поиска
    const looted = (s.cur && s.cur.looted) || [];
    this.spots = LOOT_SPOTS.map((L) => ({ L, done: looted.includes(L.id) }));
    this.traps = TRAP_SLOTS.map((p, k) => ({ x: p[0], z: p[1], on: s.traps.includes(k), snap: 0 }));
    this.custs = [];
    this.queue = [];
    this.zs = [];
    this.proj = [];
    this.co = null;
    this.custT = this.day === 1 ? 999 : 4;
    // днём изредка забредают зомби: с каждым днём чаще
    this.dayZ = [];
    const nz = Math.floor(dayZCount(this.day) + rnd() * 0.9);
    for (let k = 0; k < nz; k++) this.dayZ.push(rr(9.2, 19.2));
    this.dayZ.sort((a, b) => a - b);
    this.dayZ = this.dayZ.filter((h) => h > this.hour);
    this.sum = { sales: 0, items: 0, kills: 0, served: 0, scammed: 0, caught: 0, rep0: s.rep, lvl0: s.lvl, drops: {}, scav: [], gifts: 0, refused: 0, lost: 0, angry: 0, stolen: 0, slept: 0, nightLoot: 0 };
    this.spawnPlan = [];
    this.nightT = 0;
    this.wave = 0;
    this.waves = 0;
    this.saveT = 0;
    // персонал
    this.staff = s.staff.map((st) => this.makeStaff(st));
    if (this.phase === 'night') this.startNight(true);
  }

  // ---------- правки с планшета посреди дня ----------
  setWeapon(id) {
    this.weapon = WEAPONS.find((w) => w.id === id) || WEAPONS[0];
  }
  applySkills() {
    this.pk = perks(this.s.skills);
    const k = this.P.hp / this.P.max;
    this.P.max = this.pk.hp;
    this.P.hp = this.P.max * k;
  }
  syncStaff() {
    const have = new Map(this.staff.map((o) => [o.s.id, o]));
    this.staff = this.s.staff.map((st) => {
      const o = have.get(st.id);
      if (o) return o;
      const n = this.makeStaff(st);
      if (n.state === 'leaving' || n.state === 'away') n.state = 'idle';
      n.x = 0;
      n.z = -4.2;
      return n;
    });
  }
  applyBuild() {
    const s = this.s;
    const n = shelfCount(s.build);
    if (n !== this.nShelves) {
      this.nShelves = n;
      while (s.shelves.length < n) s.shelves.push({ type: null, n: 0 });
      this.nav.g = buildGrid(n);
    }
    for (const b of this.barr) {
      const max = barMax(b.e, s.build, this.pk);
      if (max > b.max) b.hp += max - b.max;
      b.max = max;
    }
  }

  // ---------- проёмы ----------
  doorOpen() {
    return this.phase === 'day' || this.phase === 'dusk';
  }
  entryOpen(k, mode) {
    const b = this.barr[k];
    // свои ходят через дверь всегда (изнутри она открывается), в окна не лазят
    if (mode === 'p') return !!b.e.door;
    // зомби: через сломанную баррикаду или открытую днём дверь
    return b.hp <= 0 || (b.e.door && this.doorOpen());
  }

  inside(x, z) {
    return x > SHOP.x0 && x < SHOP.x1 && z > SHOP.z0 && z < FRONT_Z;
  }

  emit(t, o = {}) {
    o.t = t;
    this.fx.push(o);
  }

  addRep(d) {
    if (d > 0) d *= this.pk.repMul;
    this.s.rep = Math.max(0, Math.min(100, this.s.rep + d));
  }

  addXP(n) {
    const s = this.s;
    s.xp += n;
    while (s.xp >= xpNeed(s.lvl)) {
      s.xp -= xpNeed(s.lvl);
      s.lvl++;
      s.sp++;
      this.emit('lvl', { n: s.lvl });
    }
  }

  addStock(type, n) {
    if (type === 'bat') {
      this.s.bat += n;
      this.s.earned += n;
      return;
    }
    this.s.stock[type] = (this.s.stock[type] || 0) + n;
  }

  // ---------- шаг ----------
  step(dt, inp) {
    if (this.finished) return;
    this.time += dt;
    this.fx.length = this.fx.length > 200 ? 0 : this.fx.length;
    if (this.phase === 'day' || this.phase === 'dusk') this.stepDay(dt);
    else if (this.phase === 'night') this.stepNight(dt);
    if (this.finished) return;
    this.stepPlayer(dt, inp);
    this.stepCustomers(dt);
    this.stepStaff(dt);
    this.stepZombies(dt);
    this.stepProj(dt);
    this.stepCraft(dt);
    this.stepCheckout(dt);
    for (const b of this.barr) b.hit = Math.max(0, b.hit - dt);
    for (const tr of this.traps) tr.snap = Math.max(0, tr.snap - dt);
    this.saveT += dt;
    if (this.saveT > 8) {
      this.saveT = 0;
      this.persist(false);
    }
  }

  persist(cloud = true) {
    const s = this.s;
    for (const b of this.barr) s.barr[b.e.id] = b.hp >= b.max ? -1 : Math.max(0, Math.round(b.hp));
    s.traps = this.traps.map((t, k) => (t.on ? k : -1)).filter((k) => k >= 0);
    if (!this.finished) {
      const night = this.phase === 'night';
      s.cur = { phase: this.phase === 'dusk' ? 'day' : this.phase, t: night ? Math.min(this.hour, NIGHT_H1 - 0.3) : Math.min(this.hour, H1 - 0.5), looted: this.spots.filter((p) => p.done).map((p) => p.L.id), day: this.day };
    }
    save.write(cloud);
  }

  // ---------- день ----------
  stepDay(dt) {
    const prev = this.hour;
    if (this.phase === 'day') {
      this.hour = Math.min(H1, this.hour + (dt * (H1 - H0)) / DAY_LEN);
      if (prev < SCAV_BACK && this.hour >= SCAV_BACK) this.scavReturn();
      if (prev < H1 - 1 && this.hour >= H1 - 1) this.emit('closing');
      if (this.hour >= H1) {
        this.phase = 'dusk';
        this.duskT = 0;
        this.emit('dusk');
        for (const c of this.custs) if (c.state !== 'queue' && c.state !== 'leave' && c.state !== 'flee') this.custGiveUp(c, false);
      }
      // покупатели
      this.custT -= dt;
      if (this.custT <= 0) {
        const s = this.s;
        const repK = 1.5 - s.rep / 100;
        const signK = 1 / (1 + 0.16 * s.build.sign);
        const dayK = 1 + Math.min(0.6, (this.day - 1) * 0.05);
        this.custT = (6.0 * repK * signK) / this.pk.cust / dayK * rr(0.7, 1.3);
        if (this.custs.length < 7 + s.build.shelves) this.spawnCustomer();
      }
      // днём изредка забредают зомби
      while (this.dayZ.length && this.hour >= this.dayZ[0]) {
        this.dayZ.shift();
        const z = this.spawnZombie(zType(this.day, ['walker', 'crawler', 'runner', 'thief']), 'side');
        this.emit('dayZombie', { x: z.x, z: z.z, type: z.type });
      }
    } else {
      // сумерки: ждём, пока покупатели разойдутся и добытчики вернутся
      this.duskT = (this.duskT || 0) + dt;
      if (this.staff.some((st) => st.state === 'away' || st.state === 'leaving')) this.scavReturn();
      if (this.duskT > 25) {
        // страховка: задержавшиеся расходятся, свои заходят внутрь
        this.custs = [];
        this.queue = [];
        this.co = null;
        for (const st of this.staff) {
          if (st.ko || st.state === 'away' || this.inside(st.x, st.z)) continue;
          if (st.state === 'return') this.scavLoot(st);
          st.x = 0.9;
          st.z = -7.7;
          st.path = null;
          st.state = 'idle';
        }
      }
      const left = this.custs.filter((c) => !c.gone).length;
      const scavOut = this.staff.some((st) => st.state === 'away' || st.state === 'return');
      if ((!left && !scavOut && this.duskT > 3) || this.duskT > 26) this.startNight();
    }
  }

  // план ночи: когда и кто придёт (секунды от 20:00)
  nightPlan() {
    const d = this.day;
    const n = nightCount(d);
    const plan = [];
    if (isHorde(d)) {
      this.waves = 3;
      const per = [0.28, 0.33, 0.39].map((f) => Math.max(1, Math.round(n * f)));
      [0.06, 0.33, 0.6].forEach((f0, wi) => {
        let at = f0 * NIGHT_LEN;
        for (let k = 0; k < per[wi]; k++) {
          plan.push({ at, type: wi === 0 && k < 2 ? 'walker' : zType(d), wave: wi + 1 });
          at += rr(0.5, 1.2);
        }
        if (wi === 2 && isBoss(d)) plan.push({ at: f0 * NIGHT_LEN + 3, type: 'boss', wave: 3 });
      });
    } else {
      this.waves = 1;
      for (let k = 0; k < n; k++) plan.push({ at: NIGHT_LEN * (0.03 + (0.72 * (k + rnd() * 0.8)) / n), type: d <= 1 ? 'walker' : zType(d), wave: 1 });
    }
    // новые виды этого дня — хотя бы по одному, пораньше
    newZombiesOn(d).forEach((tp, k) => {
      const p = plan.filter((q) => q.type !== 'boss')[Math.min(plan.length - 1, 1 + k)];
      if (p) p.type = tp;
    });
    plan.sort((a, b) => a.at - b.at);
    return plan;
  }

  startNight(resume = false) {
    this.phase = 'night';
    this.time = 0;
    this.co = null;
    this.custs = [];
    this.queue = [];
    if (this.P.hand) this.returnHand();
    if (!resume) {
      this.hour = NIGHT_H0;
      // ночью на парковке снова есть что поискать
      for (const sp of this.spots) sp.done = false;
    }
    this.hour = Math.max(NIGHT_H0, Math.min(NIGHT_H1 - 0.3, this.hour));
    this.nightT = ((this.hour - NIGHT_H0) / (NIGHT_H1 - NIGHT_H0)) * NIGHT_LEN;
    const plan = this.nightPlan();
    this.totalZ = plan.length;
    this.spawnPlan = plan.filter((p) => p.at > this.nightT);
    this.wave = 0;
    // персонал: охранник у двери снаружи, остальные внутри
    for (const st of this.staff) {
      if (st.state === 'away') continue;
      st.path = null;
      st.carry = null;
      st.task = null;
      st.state = 'idle';
      if (resume && !this.inside(st.x, st.z) && st.s.role !== 'guard') {
        st.x = rr(-1, 2);
        st.z = rr(-8, -6);
      }
    }
    // зомби, бродившие днём, остаются
    for (const z of this.zs) if (!z.dead && z.mode === 'roam') z.roamT = rr(5, 20);
    this.emit('night', { horde: isHorde(this.day), boss: isBoss(this.day), resume });
  }

  stepNight(dt) {
    this.nightT += dt;
    const prev = this.hour;
    this.hour = NIGHT_H0 + (this.nightT / NIGHT_LEN) * (NIGHT_H1 - NIGHT_H0);
    if (prev < NIGHT_H1 - 1 && this.hour >= NIGHT_H1 - 1) this.emit('dawnSoon');
    const alive = this.zs.filter((z) => !z.dead).length;
    while (this.spawnPlan.length && this.spawnPlan[0].at <= this.nightT) {
      // не больше 18 живых разом: остальные подождут
      if (alive >= 18 && this.spawnPlan[0].type !== 'boss') {
        this.spawnPlan[0].at += 2;
        this.spawnPlan.sort((a, b) => a.at - b.at);
        break;
      }
      const p = this.spawnPlan.shift();
      if (p.wave > this.wave) {
        this.wave = p.wave;
        this.emit('wave', { n: p.wave, of: this.waves });
      }
      this.spawnZombie(p.type, p.type === 'crawler' ? 'lurk' : 'any');
    }
    // рассвет: ночь кончается по часам, а не по зомби
    if (this.hour >= NIGHT_H1 && !this.P.ko) {
      if (this.sleeping) this.sum.slept = 1;
      this.dawn();
      return;
    }
    if (this.pk.regenNight && !this.P.ko) this.P.hp = Math.min(this.P.max, this.P.hp + dt * 1.5);
    if (this.sleeping) {
      this.P.hp = Math.min(this.P.max, this.P.hp + dt * 2.5);
      // разбудят зомби в лавке
      if (this.zs.some((z) => !z.dead && this.inside(z.x, z.z))) this.wake('inside');
    }
  }

  // ---------- сон на раскладушке ----------
  sleepBlock() {
    if (this.phase !== 'night') return 'sleepDay';
    if (this.zs.some((z) => !z.dead && (this.inside(z.x, z.z) || dist(z, this.P) < 6))) return 'sleepDanger';
    return null;
  }
  sleep() {
    const why = this.sleepBlock();
    if (why) {
      this.emit('need', { what: why });
      return false;
    }
    this.sleeping = true;
    this.P.act = null;
    this.P.x = COT.x;
    this.P.z = COT.z;
    this.emit('sleep');
    return true;
  }
  wake(why = 'self') {
    if (!this.sleeping) return;
    this.sleeping = false;
    this.P.x = COT.x;
    this.P.z = COT.z + 0.5;
    this.emit('wake', { why });
  }

  // ---------- лечение бинтом или аптечкой со склада ----------
  heal() {
    const P = this.P,
      s = this.s;
    if (P.ko || P.hp >= P.max - 0.5) return false;
    const id = s.stock.bandage > 0 && P.max - P.hp <= 45 ? 'bandage' : s.stock.medkit > 0 ? 'medkit' : s.stock.bandage > 0 ? 'bandage' : null;
    if (!id) {
      this.emit('need', { what: 'noHeal' });
      return false;
    }
    s.stock[id]--;
    const n = Math.min(P.max - P.hp, HEAL[id]);
    P.hp += n;
    this.emit('heal', { x: P.x, z: P.z, n: Math.round(n), id });
    return true;
  }

  dawn() {
    if (this.finished) return;
    this.finished = true;
    this.phase = 'dawn';
    // трофеи с поля
    for (const [k, n] of Object.entries(this.sum.drops)) this.addStock(k, n);
    this.persist(false);
    this.emit('dawn');
  }

  // продавец без сознания и решил дождаться утра
  surrender() {
    const s = this.s;
    const lostBat = Math.round(s.bat * 0.15);
    s.bat -= lostBat;
    let lostItems = 0;
    for (const id of GOOD_IDS) {
      const n = Math.floor((s.stock[id] || 0) * 0.2);
      s.stock[id] -= n;
      lostItems += n;
    }
    for (const b of this.barr) b.hp = Math.min(b.hp, b.max * 0.3);
    this.sum.lostBat = lostBat;
    this.sum.lostItems = lostItems;
    this.zs = [];
    this.spawnPlan = [];
    this.P.ko = false;
    this.P.hp = this.P.max * 0.5;
    this.dawn();
  }

  revive() {
    this.P.ko = false;
    this.P.hp = this.P.max;
    this.P.hurtT = 2.5;
    // отбросить ближайших зомби
    for (const z of this.zs) {
      const d = dist(z, this.P);
      if (d < 3 && !z.dead) {
        const nx = z.x + ((z.x - this.P.x) / (d || 1)) * 1.5,
          nz = z.z + ((z.z - this.P.z) / (d || 1)) * 1.5;
        if (this.nav.free(nx, nz, 0.2, 'z')) {
          z.x = nx;
          z.z = nz;
        }
        z.stun = 1.2;
        z.hunt = null;
      }
    }
    this.emit('revive');
  }

  // ---------- игрок ----------
  stepPlayer(dt, inp) {
    const P = this.P;
    P.hurtT = Math.max(0, P.hurtT - dt);
    P.swing = Math.max(0, P.swing - dt);
    P.slowT = Math.max(0, P.slowT - dt);
    P.atkCd -= dt;
    if (P.ko) return;
    if (inp.heal) this.heal();
    let mx = inp.mx || 0,
      mz = inp.mz || 0;
    const l = Math.hypot(mx, mz);
    // во сне: любое движение будит
    if (this.sleeping) {
      P.moving = false;
      P.near = null;
      if (l > 0.3 || inp.act) this.wake('self');
      return;
    }
    if (l > 1) (mx /= l), (mz /= l);
    P.moving = l > 0.05;
    const sp = 4.3 * this.pk.speed * (P.hand ? 0.92 : 1) * (P.slowT > 0 ? 0.55 : 1);
    if (P.moving) {
      const nx = P.x + mx * sp * dt,
        nz = P.z + mz * sp * dt;
      let moved = false;
      if (this.nav.free(nx, P.z, 0.22, 'p')) (P.x = nx), (moved = true);
      if (this.nav.free(P.x, nz, 0.22, 'p')) (P.z = nz), (moved = true);
      // упёрлись в угол: соскальзываем вбок, чтобы не застревать у косяков
      if (!moved)
        for (const a of [0.75, -0.75, 1.3, -1.3]) {
          const c = Math.cos(a),
            sn = Math.sin(a);
          const ax = P.x + (mx * c - mz * sn) * sp * dt * 0.8,
            az = P.z + (mx * sn + mz * c) * sp * dt * 0.8;
          if (this.nav.free(ax, az, 0.22, 'p')) {
            P.x = ax;
            P.z = az;
            break;
          }
        }
      const want = Math.atan2(mx, mz);
      P.dir = lerpAng(P.dir, want, Math.min(1, dt * 14));
    }
    // ближайшее действие
    P.near = this.findNear();
    if (P.act) {
      // долгое действие продолжается, пока стоишь рядом
      const A = P.act;
      if (!P.near || P.near.kind !== A.kind || P.near.ref !== A.ref || !this.canDo(P.near)) {
        P.act = null;
      } else {
        A.t += dt;
        if (A.kind === 'repair') {
          if (A.t >= 0.5) {
            A.t = 0;
            this.repairTick(A.ref);
          }
        } else if (A.t >= A.dur) {
          P.act = null;
          this.finishAct(A);
        }
      }
    }
    if (inp.act) this.doAction();
    // касса
    P.atReg = Math.hypot(P.x - REG_SPOT.x, P.z - REG_SPOT.z) < 0.85;
    // бой: автоудар по ближайшему зомби
    this.playerAttack(dt);
  }

  findNear() {
    const P = this.P;
    let best = null,
      bd = 1e9;
    const consider = (kind, x, z, r, ref, extra) => {
      const d = Math.hypot(P.x - x, P.z - z);
      if (d < r && d < bd) {
        bd = d;
        best = Object.assign({ kind, x, z, ref }, extra);
      }
    };
    const night = this.phase === 'night';
    consider('storage', STORAGE.x, STORAGE.z, 1.25, 0);
    consider('bench', BENCH.x, BENCH.z, 1.3, 0);
    if (night) consider('cot', COT.x, COT.z, 1.3, 0);
    if (!night)
      for (let k = 0; k < this.nShelves; k++) {
        const [x, z] = SHELF_SLOTS[k];
        consider('shelf', x, z + SHELF_D / 2 + 0.6, 1.0, k);
      }
    for (const sp of this.spots) if (!sp.done) consider('loot', sp.L.ix, sp.L.iz, 1.35, sp);
    // баррикаду можно чинить и изнутри, и снаружи
    this.barr.forEach((b, k) => {
      if (b.hp >= b.max || (b.e.door && this.doorOpen())) return;
      consider('repair', b.e.x, FRONT_Z - 0.6, 1.25, k);
      consider('repair', b.e.x, FRONT_Z + WALL_T + 0.6, 1.25, k);
    });
    if (this.s.stock.trap > 0) this.traps.forEach((tr, k) => !tr.on && consider('trap', tr.x, tr.z, 0.95, k));
    return best;
  }

  canDo(n) {
    if (n.kind === 'repair') return this.s.stock.wood > 0 && this.barr[n.ref].hp < this.barr[n.ref].max;
    return true;
  }

  doAction() {
    const P = this.P;
    const n = P.near;
    if (!n || P.act) return;
    switch (n.kind) {
      case 'storage':
        this.emit('ui', { what: 'storage' });
        break;
      case 'bench':
        this.emit('ui', { what: 'bench' });
        break;
      case 'cot':
        this.sleep();
        break;
      case 'shelf':
        this.shelfAction(n.ref);
        break;
      case 'loot':
        P.act = { kind: 'loot', ref: n.ref, t: 0, dur: 1.1 };
        this.emit('search');
        break;
      case 'repair':
        if (this.s.stock.wood <= 0) {
          this.emit('need', { what: 'wood' });
          break;
        }
        P.act = { kind: 'repair', ref: n.ref, t: 0, dur: 0 };
        break;
      case 'trap': {
        const tr = this.traps[n.ref];
        if (this.s.stock.trap > 0 && !tr.on) {
          this.s.stock.trap--;
          tr.on = true;
          this.emit('trapSet', { x: tr.x, z: tr.z });
        }
        break;
      }
    }
  }

  finishAct(A) {
    if (A.kind === 'loot') {
      const sp = A.ref;
      if (sp.done) return;
      sp.done = true;
      const night = this.phase === 'night';
      const table = night ? NIGHT_LOOT : SPOT_LOOT[sp.L.kind];
      const got = {};
      const rolls = night ? 2 + (rnd() < 0.5 ? 1 : 0) : 3 + (rnd() < 0.5 ? 1 : 0);
      for (let k = 0; k < rolls; k++) {
        const it = wpick(table);
        const n = it === 'bat' ? (night ? 6 : 3) + ((rnd() * 5) | 0) : 1 + (rnd() < 0.35 ? 1 : 0);
        got[it] = (got[it] || 0) + n;
      }
      for (const [k, n] of Object.entries(got)) this.addStock(k, n);
      if (night) this.sum.nightLoot++;
      this.addXP(night ? 5 : 3);
      this.emit('loot', { x: sp.L.ix, z: sp.L.iz, got });
    }
  }

  repairTick(k) {
    const b = this.barr[k];
    const s = this.s;
    if (s.stock.wood <= 0 || b.hp >= b.max) return;
    b.woodAcc = (b.woodAcc || 0) + this.pk.repairCost;
    if (b.woodAcc >= 1) {
      b.woodAcc -= 1;
      s.stock.wood--;
    }
    b.hp = Math.min(b.max, b.hp + 25);
    this.sum.repaired = (this.sum.repaired || 0) + 1;
    this.emit('repair', { x: b.e.x, z: FRONT_Z + 0.2, k });
  }

  shelfAction(k) {
    const P = this.P;
    const sh = this.shelves[k];
    if (P.hand) {
      if (sh.n > 0 && sh.type !== P.hand.type) {
        this.emit('need', { what: 'shelfBusy' });
        return;
      }
      sh.type = P.hand.type;
      const put = Math.min(P.hand.n, SHELF_CAP - sh.n);
      if (put <= 0) {
        this.emit('need', { what: 'shelfFull' });
        return;
      }
      sh.n += put;
      P.hand.n -= put;
      if (P.hand.n <= 0) P.hand = null;
      this.emit('place', { k, n: put });
      if (this.day === 1 && this.custT > 900) this.custT = 3;
    } else if (sh.n > 0) {
      const take = Math.min(CARRY, sh.n);
      sh.n -= take;
      P.hand = { type: sh.type, n: take };
      this.emit('take', { k });
    } else this.emit('need', { what: 'emptyHands' });
  }

  takeFromStorage(type) {
    const P = this.P;
    const s = this.s;
    if (P.hand) this.returnHand();
    const n = Math.min(CARRY, s.stock[type] || 0);
    if (n <= 0) return false;
    s.stock[type] -= n;
    P.hand = { type, n };
    this.emit('take', {});
    return true;
  }

  returnHand() {
    const P = this.P;
    if (!P.hand) return;
    this.s.stock[P.hand.type] += P.hand.n;
    P.hand = null;
    this.emit('place', {});
  }

  // урон с учётом брони каски
  zDmg(z, dmg, ranged) {
    const A = ZOMBIES[z.type].armor;
    return A ? dmg * A[ranged ? 1 : 0] : dmg;
  }

  playerAttack(dt) {
    const P = this.P;
    if (P.atkCd > 0) return;
    const W = this.weapon;
    let tg = null,
      bd = 1e9;
    for (const z of this.zs) {
      if (z.dead || z.gone) continue;
      const d = dist(z, P) - ZOMBIES[z.type].r;
      if (d < W.range && d < bd) {
        // сквозь стены и закрытые баррикады не бьём: нужна прямая видимость
        if (!this.nav.los(P.x, P.z, z.x, z.z, 'z', 0.05)) continue;
        bd = d;
        tg = z;
      }
    }
    if (!tg) return;
    P.atkCd = W.cd;
    P.dir = Math.atan2(tg.x - P.x, tg.z - P.z);
    P.swing = 0.25;
    const dmg = W.dmg * this.pk.dmg;
    if (W.ranged) {
      this.proj.push({ x: P.x, z: P.z, y: 1.0, tg, dmg, sp: 16, kind: W.id === 'sling' ? 'stone' : 'nail', life: 1.2, ranged: true });
      this.emit('shoot', { w: W.id });
    } else {
      this.emit('swing', { w: W.id });
      if (W.arc) {
        for (const z of this.zs) {
          if (z.dead || z.gone) continue;
          const d = dist(z, P) - ZOMBIES[z.type].r;
          if (d > W.range) continue;
          const a = Math.atan2(z.x - P.x, z.z - P.z);
          if ((Math.abs(angDiff(a, P.dir)) < 1.0 || z === tg) && this.nav.los(P.x, P.z, z.x, z.z, 'z', 0.05)) this.hitZombie(z, this.zDmg(z, dmg, false), P);
        }
      } else this.hitZombie(tg, this.zDmg(tg, dmg, false), P);
    }
  }

  // ---------- покупатели ----------
  spawnCustomer() {
    const s = this.s;
    const onShelf = {};
    for (const sh of this.shelves) if (sh.type && sh.n > 0) onShelf[sh.type] = GOODS[sh.type].dem;
    const known = {};
    for (const id of GOOD_IDS) if (GOODS[id].day <= this.day) known[id] = GOODS[id].dem;
    const nW = 1 + (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.22 ? 1 : 0);
    const wants = [];
    for (let k = 0; k < nW; k++) {
      const pool = Object.keys(onShelf).length && rnd() < 0.72 ? onShelf : known;
      const it = wpick(pool);
      if (!wants.includes(it)) wants.push(it);
    }
    const side = rnd() < 0.5 ? -1 : 1;
    const lane = side < 0 ? 17.2 : 19.0;
    // нечестных меньше у доброй лавки, больше у барыги
    const cheat = rnd() < 0.16 + (s.rep < 30 ? 0.1 : 0) - (s.rep > 70 ? 0.07 : 0) + Math.min(0.08, this.day * 0.006);
    const needy = this.day >= 2 && rnd() < 0.06;
    const c = {
      id: this.ids++,
      x: side * 24,
      z: lane,
      dir: side < 0 ? Math.PI / 2 : -Math.PI / 2,
      look: (rnd() * 1e6) | 0,
      wants,
      got: [],
      state: 'in',
      path: null,
      wait: 0,
      patience: 45 * (1 + 0.2 * s.build.register),
      cheat,
      needy,
      speed: rr(1.9, 2.4),
      bubble: null,
      moving: false,
    };
    c.path = this.nav.path(c.x, c.z, 0, -4.0, 'p');
    if (!c.path) return;
    this.custs.push(c);
  }

  custBubble(c, kind, type, t = 2.2) {
    c.bubble = { kind, type, t };
  }

  // уйти (с покупками или без)
  custLeave(c, fast = false) {
    c.state = fast ? 'flee' : 'leave';
    const side = c.x < 0 ? -1 : 1;
    c.path = this.nav.path(c.x, c.z, side * 25, side < 0 ? 17.2 : 19.0, 'p') || [[side * 25, 18]];
    c.speed = fast ? 3.4 : c.speed;
    this.queue = this.queue.filter((q) => q !== c);
    if (this.co && this.co.c === c) this.co = null;
  }

  // покупатель уходит, вернув товар на склад
  custGiveUp(c, angry) {
    for (const it of c.got) this.s.stock[it]++;
    c.got = [];
    if (angry) {
      this.addRep(-1.5);
      this.custBubble(c, 'angry');
      this.sum.angry++;
    }
    this.custLeave(c);
  }

  nextWant(c) {
    while (c.wants.length) {
      const it = c.wants[0];
      // ближайшая полка с этим товаром
      let best = -1,
        bd = 1e9;
      for (let k = 0; k < this.nShelves; k++) {
        const sh = this.shelves[k];
        if (sh.type !== it || sh.n <= 0) continue;
        const [x, z] = SHELF_SLOTS[k];
        const d = Math.hypot(c.x - x, c.z - z);
        if (d < bd) (bd = d), (best = k);
      }
      if (best >= 0) {
        const [x, z] = SHELF_SLOTS[best];
        c.shelf = best;
        c.state = 'browse';
        c.path = this.nav.path(c.x, c.z, x + rr(-0.35, 0.35), z + SHELF_D / 2 + 0.6, 'p');
        if (c.path) return true;
      }
      // нет на полках — огорчился
      c.wants.shift();
      this.custBubble(c, 'miss', it, 2.4);
      this.addRep(-0.1);
      this.sum.missed = (this.sum.missed || 0) + 1;
    }
    return false;
  }

  toQueue(c) {
    if (!c.got.length) {
      this.custLeave(c);
      return;
    }
    c.state = 'queue';
    if (!this.queue.includes(c)) this.queue.push(c);
    this.updateQueue();
  }

  updateQueue() {
    this.queue.forEach((c, k) => {
      const q = QUEUE[Math.min(k, QUEUE.length - 1)];
      const tx = q[0] + (k >= QUEUE.length ? (k - QUEUE.length + 1) * -0.6 : 0);
      if (c.qk !== k) {
        c.qk = k;
        c.path = this.nav.path(c.x, c.z, tx, q[1], 'p');
      }
    });
  }

  stepCustomers(dt) {
    for (const c of this.custs) {
      if (c.bubble) {
        c.bubble.t -= dt;
        if (c.bubble.t <= 0) c.bubble = null;
      }
      const arrived = this.moveAlong(c, dt, c.speed, 'p');
      // зомби рядом — бегом отсюда
      if (c.state !== 'flee' && c.state !== 'leave') {
        for (const z of this.zs) {
          if (z.dead || z.gone) continue;
          if (dist(z, c) < 2.0) {
            for (const it of c.got) this.s.stock[it]++;
            c.got = [];
            this.custBubble(c, 'scared', null, 2.5);
            this.addRep(-0.4);
            this.sum.scared = (this.sum.scared || 0) + 1;
            this.custLeave(c, true);
            this.emit('scream', { x: c.x, z: c.z });
            break;
          }
        }
      }
      switch (c.state) {
        case 'in':
          if (arrived && !this.nextWant(c)) this.toQueue(c);
          break;
        case 'browse':
          if (arrived) {
            c.wait += dt;
            const sh = this.shelves[c.shelf];
            c.dir = Math.PI;
            if (c.wait > 0.7) {
              c.wait = 0;
              const it = c.wants.shift();
              if (sh.type === it && sh.n > 0) {
                const pl = this.s.prices[it] ?? 1;
                if (pl === 2 && rnd() < 0.3) {
                  this.custBubble(c, 'pricey', it);
                  this.addRep(-0.3);
                  this.sum.refused++;
                } else {
                  const n = pl === 0 && sh.n > 1 && rnd() < 0.3 ? 2 : 1;
                  sh.n -= n;
                  for (let q = 0; q < n; q++) c.got.push(it);
                  this.emit('grab', { k: c.shelf, x: c.x, z: c.z });
                }
              } else c.wants.unshift(it);
              if (!this.nextWant(c)) this.toQueue(c);
            }
          }
          break;
        case 'queue':
          c.patience -= dt * (this.queue[0] === c ? 0.6 : 1);
          if (arrived) c.dir = this.queue[0] === c ? Math.PI : lookAt(c, REG.x, REG.z);
          if (c.patience < 12 && !c.bubble) this.custBubble(c, 'wait', null, 1.5);
          if (c.patience <= 0) {
            this.custGiveUp(c, true);
            this.updateQueue();
          }
          break;
        case 'leave':
        case 'flee':
          if (arrived || Math.abs(c.x) > 24.5) c.gone = true;
          break;
      }
    }
    if (this.custs.some((c) => c.gone)) {
      this.custs = this.custs.filter((c) => !c.gone);
      this.updateQueue();
    }
    this.separate(this.custs, 0.55, 'p');
  }

  // ---------- касса ----------
  front() {
    const c = this.queue[0];
    if (!c || c.state !== 'queue' || c.path) return null;
    return Math.hypot(c.x - QUEUE[0][0], c.z - QUEUE[0][1]) < 0.4 ? c : null;
  }

  stepCheckout(dt) {
    const c = this.front();
    if (!c) {
      if (this.co && !this.custs.includes(this.co.c)) this.co = null;
      return;
    }
    if (!this.co || this.co.c !== c) this.co = this.makeCheckout(c);
    const co = this.co;
    if (co.testing >= 0) {
      co.testT -= dt;
      if (co.testT <= 0) {
        const b = co.bats[co.testing];
        b.st = b.dead ? 'bad' : 'ok';
        this.emit(b.dead ? 'batBad' : 'batOk');
        co.testing = -1;
      }
    }
    // кассир работает, если продавца нет у кассы
    const cashier = this.staff.find((st) => st.s.role === 'cashier' && st.state === 'reg' && !st.ko);
    if (!this.P.atReg && cashier) {
      co.staffT = (co.staffT ?? 2.6 - 0.3 * cashier.s.lvl) - dt * this.pk.staffSp;
      if (co.staffT <= 0) {
        if (co.needy) {
          // кассир не решает за хозяина: просит прийти позже
          if (!co.waitBoss) {
            co.waitBoss = true;
            this.custBubble(c, 'wait', null, 2);
          }
        } else {
          const catchP = 0.4 + 0.12 * cashier.s.lvl;
          for (const b of co.bats) {
            if (b.dead && rnd() < catchP) this.swapBattery(co, b);
          }
          this.acceptPay(true);
        }
      }
    }
  }

  makeCheckout(c) {
    const items = c.got.map((type) => ({ type, price: Math.max(1, Math.round(GOODS[type].p * PRICE_MULT[this.s.prices[type] ?? 1])) }));
    const total = items.reduce((a, b) => a + b.price, 0);
    const co = { c, items, total, bats: [], testing: -1, testT: 0, needy: c.needy };
    if (!c.needy) {
      co.bats = makeBatteries(total);
      for (const b of co.bats) b.charge = rr(0.72, 1);
      // в обучении первый покупатель обязательно подсунет севшую батарейку
      const T = this.s.tut;
      const tutCheat = !T.skip && !T.bad && this.day === 1 && co.bats.length > 1;
      if (c.cheat || tutCheat) {
        const nDead = !tutCheat && total > 25 && rnd() < 0.5 ? 2 : 1;
        const idx = co.bats.map((b, k) => k).sort((a, b) => co.bats[b].v - co.bats[a].v + rr(-6, 6));
        for (let q = 0; q < Math.min(nDead, co.bats.length); q++) {
          const b = co.bats[idx[q]];
          b.dead = true;
          b.charge = rr(0, 0.12);
        }
      }
      // перемешать
      co.bats.sort(() => rnd() - 0.5);
    }
    this.emit('coStart');
    return co;
  }

  testBattery(i) {
    const co = this.co;
    if (!co || co.testing >= 0) return;
    const b = co.bats[i];
    if (!b || b.st !== '?') return;
    co.testing = i;
    co.testT = Math.max(0.12, 0.45 * this.pk.testT - 0.08 * this.s.build.register);
    this.emit('test');
  }

  swapBattery(co, b) {
    b.dead = false;
    b.st = 'ok';
    b.swapped = true;
    b.charge = rr(0.75, 1);
    this.sum.caught++;
    this.addXP(2);
  }

  rejectBattery(i) {
    const co = this.co;
    if (!co) return;
    const b = co.bats[i];
    if (!b || b.st !== 'bad') return;
    this.swapBattery(co, b);
    this.custBubble(co.c, 'oops', null, 1.6);
    this.emit('swap');
  }

  acceptPay(byStaff = false) {
    const co = this.co;
    if (!co || co.needy || (co.testing >= 0 && !byStaff)) return;
    let paid = 0,
      lost = 0;
    for (const b of co.bats) b.dead ? (lost += b.v) : (paid += b.v);
    let tip = 0;
    if (this.s.rep >= 80 && rnd() < 0.3) tip += 1 + ((rnd() * 3) | 0);
    if (this.pk.tip) tip += Math.round(paid * this.pk.tip);
    this.s.bat += paid + tip;
    this.s.earned += paid + tip;
    this.sum.sales += paid + tip;
    this.sum.items += co.items.length;
    this.sum.served++;
    this.s.stats.sold += co.items.length;
    this.s.stats.served++;
    // доброта и жадность цен
    let rep = 0.6;
    for (const it of co.items) {
      const pl = this.s.prices[it.type] ?? 1;
      rep += pl === 0 ? 0.35 : pl === 2 ? -0.3 : 0;
    }
    this.addRep(rep);
    this.addXP(Math.ceil(paid / 4) + 1);
    if (lost) {
      this.sum.scammed += lost;
      this.emit('scammed', { n: lost });
    }
    this.emit('sale', { n: paid + tip, tip, x: REG.x, z: REG.z, byStaff });
    const c = co.c;
    this.co = null;
    c.got = [];
    this.custBubble(c, 'happy', null, 1.8);
    this.custLeave(c);
    this.updateQueue();
  }

  giftNeedy() {
    const co = this.co;
    if (!co || !co.needy) return;
    this.addRep(4);
    this.addXP(4);
    this.sum.gifts++;
    this.s.stats.gifts++;
    this.emit('gift', { x: REG.x, z: REG.z });
    const c = co.c;
    this.co = null;
    c.got = [];
    this.custBubble(c, 'love', null, 2.4);
    this.custLeave(c);
    this.updateQueue();
  }

  refuseNeedy() {
    const co = this.co;
    if (!co || !co.needy) return;
    this.addRep(-1.5);
    const c = co.c;
    this.custGiveUp(c, false);
    this.custBubble(c, 'sad', null, 2);
    this.co = null;
    this.updateQueue();
  }

  // ---------- персонал ----------
  makeStaff(st) {
    const o = { s: st, x: rr(-1, 3), z: rr(-8, -5), dir: 0, state: 'idle', path: null, carry: null, task: null, wait: 0, hp: 60 + 15 * st.lvl, max: 60 + 15 * st.lvl, ko: false, atkCd: 0, moving: false, swing: 0 };
    if (st.unpaid) o.state = 'off';
    if (st.role === 'scav' && st.loc && !st.hurt && !st.unpaid && this.phase === 'day') {
      if (this.hour < SCAV_BACK) {
        o.state = this.hour <= H0 + 0.01 ? 'leaving' : 'away';
        if (o.state === 'leaving') {
          o.x = rr(-0.6, 0.6);
          o.z = -4.2;
          o.path = this.nav.path(o.x, o.z, 25, 18.2, 'p');
        }
      } else if (!(this.s.cur && this.s.cur.scavDone)) {
        o.state = 'away';
      }
    }
    if (st.hurt) o.state = 'rest';
    return o;
  }

  scavReturn() {
    for (const o of this.staff) {
      if (o.state !== 'away' && o.state !== 'leaving') continue;
      o.state = 'return';
      o.x = 24.5;
      o.z = 18.2;
      o.path = this.nav.path(o.x, o.z, 0.5, -4.4, 'p');
    }
  }

  // добыча с вылазки
  scavLoot(o) {
    const st = o.s;
    const L = LOCS.find((l) => l.id === st.loc) || LOCS[0];
    const hurtP = Math.max(0.02, L.danger - 0.03 * st.lvl);
    const hurt = rnd() < hurtP;
    let n = 5 + 3 * st.lvl + this.pk.scav;
    if (hurt) n = Math.ceil(n / 2);
    const got = {};
    for (let k = 0; k < n; k++) {
      const it = wpick(L.loot);
      const q = it === 'bat' ? 4 + ((rnd() * 6) | 0) : 1;
      got[it] = (got[it] || 0) + q;
    }
    for (const [k, q] of Object.entries(got)) this.addStock(k, q);
    if (hurt) {
      st.hurt = 1;
      st.hurtDay = this.day;
    }
    this.sum.scav.push({ name: st.name, loc: L.id, got, hurt });
    this.emit('scavBack', { name: st.name, got, hurt, x: o.x, z: o.z });
    this.addXP(4);
  }

  stepStaff(dt) {
    const night = this.phase === 'night';
    const k = this.pk.staffSp;
    for (const o of this.staff) {
      o.swing = Math.max(0, o.swing - dt);
      if (o.ko) continue;
      const role = o.s.role;
      if (o.state === 'away') continue;
      const arrived = this.moveAlong(o, dt, 2.6 * k * (o.state === 'return' || o.state === 'leaving' ? 1.1 : 1), 'p');
      if (o.state === 'leaving') {
        if (arrived || o.x > 24) o.state = 'away';
        continue;
      }
      if (o.state === 'return') {
        if (arrived) {
          o.state = 'idle';
          this.scavLoot(o);
          if (this.s.cur) this.s.cur.scavDone = 1;
        }
        continue;
      }
      if (o.state === 'rest' || o.state === 'off') {
        if (!o.path && !o.restSpot) {
          o.restSpot = [rr(-2.2, 1.2), -10.6];
          o.path = this.nav.path(o.x, o.z, o.restSpot[0], o.restSpot[1], 'p');
        }
        continue;
      }
      if (role === 'guard') this.guardAI(o, dt, arrived, night);
      else if (night) this.goIdle(o, arrived);
      else if (role === 'cashier') {
        // стоит за кассой, если продавец не там
        const busy = this.P.atReg;
        const spot = busy ? [REG_SPOT.x + 1.2, REG_SPOT.z - 0.4] : [REG_SPOT.x, REG_SPOT.z];
        if (o.state !== 'reg' && o.state !== 'toReg') {
          o.state = 'toReg';
          o.path = this.nav.path(o.x, o.z, spot[0], spot[1], 'p');
        } else if (o.state === 'toReg' && arrived) o.state = 'reg';
        else if (o.state === 'reg' && busy && Math.hypot(o.x - REG_SPOT.x, o.z - REG_SPOT.z) < 0.6) {
          o.state = 'toReg';
          o.path = this.nav.path(o.x, o.z, spot[0], spot[1], 'p');
        } else if (o.state === 'reg' && !busy && Math.hypot(o.x - REG_SPOT.x, o.z - REG_SPOT.z) > 0.6) {
          o.state = 'toReg';
          o.path = this.nav.path(o.x, o.z, REG_SPOT.x, REG_SPOT.z, 'p');
        }
        if (o.state === 'reg') o.dir = 0;
      } else if (role === 'stocker') this.stockerAI(o, dt, arrived);
      else this.goIdle(o, arrived);
    }
    this.separate(this.staff.filter((o) => o.state !== 'away' && o.state !== 'reg'), 0.5, 'p');
  }

  goIdle(o, arrived) {
    if (o.state !== 'idle' && o.state !== 'toIdle') o.state = 'idle';
    if (o.state === 'idle' && !o.path) {
      o.wait -= 1 / 60;
      if (o.wait <= 0) {
        o.wait = rr(3, 7);
        const spots = [[-1, -10.4], [2.6, -10.2], [-3.2, -7.6], [0.9, -7.7], [3.2, -8.2]];
        const p = pick(spots);
        o.path = this.nav.path(o.x, o.z, p[0] + rr(-0.4, 0.4), p[1] + rr(-0.3, 0.3), 'p');
      }
    }
  }

  stockerAI(o, dt, arrived) {
    const s = this.s;
    const cap = 3 + o.s.lvl;
    if (!o.task) {
      // полка, которую стоит пополнить
      let best = null,
        need = 0;
      for (let k = 0; k < this.nShelves; k++) {
        const sh = this.shelves[k];
        let type = sh.type;
        if (!type || (sh.n === 0 && !(s.stock[type] > 0))) {
          // пустая полка — выставить то, чего больше всего на складе и нет на других полках
          const shown = new Set(this.shelves.filter((x) => x.n > 0).map((x) => x.type));
          let bt = null,
            bn = 0;
          for (const id of GOOD_IDS) if (!shown.has(id) && s.stock[id] > bn) (bn = s.stock[id]), (bt = id);
          if (!bt) continue;
          type = bt;
        }
        const want = SHELF_CAP - (sh.type === type ? sh.n : 0);
        if (want >= 3 && s.stock[type] > 0 && want > need) {
          need = want;
          best = { k, type };
        }
      }
      if (best) {
        o.task = best;
        o.state = 'toStore';
        o.path = this.nav.path(o.x, o.z, STORAGE.x + rr(-0.8, 0.8), STORAGE.z + 0.15, 'p');
      } else this.goIdle(o, arrived);
      return;
    }
    const T = o.task;
    if (o.state === 'toStore' && arrived) {
      o.wait += dt * this.pk.staffSp;
      if (o.wait > 0.6) {
        o.wait = 0;
        const n = Math.min(cap, s.stock[T.type] || 0);
        if (n <= 0) {
          o.task = null;
          o.state = 'idle';
          return;
        }
        s.stock[T.type] -= n;
        o.carry = { type: T.type, n };
        o.state = 'toShelf';
        const [x, z] = SHELF_SLOTS[T.k];
        o.path = this.nav.path(o.x, o.z, x + rr(-0.3, 0.3), z + SHELF_D / 2 + 0.6, 'p');
      }
    } else if (o.state === 'toShelf' && arrived) {
      o.dir = Math.PI;
      o.wait += dt * this.pk.staffSp;
      if (o.wait > 0.5) {
        o.wait = 0;
        const sh = this.shelves[T.k];
        if (sh.n > 0 && sh.type !== o.carry.type) {
          s.stock[o.carry.type] += o.carry.n;
        } else {
          sh.type = o.carry.type;
          const put = Math.min(o.carry.n, SHELF_CAP - sh.n);
          sh.n += put;
          s.stock[o.carry.type] += o.carry.n - put;
          this.emit('place', { k: T.k, staff: 1 });
        }
        o.carry = null;
        o.task = null;
        o.state = 'idle';
        o.wait = rr(0.5, 1.5);
      }
    } else if (!o.path && o.state !== 'toStore' && o.state !== 'toShelf') {
      o.task = null;
    }
  }

  guardAI(o, dt, arrived, night) {
    const post = night ? GUARD_NIGHT : GUARD_DAY;
    if (Math.hypot(o.x - post.x, o.z - post.z) > 0.5 && !o.path) o.path = this.nav.path(o.x, o.z, post.x + rr(-0.2, 0.2), post.z, 'p');
    o.atkCd -= dt;
    if (o.atkCd > 0) return;
    let tg = null,
      bd = 8.5 + o.s.lvl * 0.3;
    for (const z of this.zs) {
      if (z.dead || z.gone) continue;
      const d = dist(z, o);
      if (d < bd && this.nav.los(o.x, o.z, z.x, z.z, 'z', 0.05)) (bd = d), (tg = z);
    }
    if (!tg) {
      if (!o.path) o.dir = 0;
      return;
    }
    o.atkCd = 1.1 - 0.1 * o.s.lvl;
    o.dir = Math.atan2(tg.x - o.x, tg.z - o.z);
    o.swing = 0.25;
    this.proj.push({ x: o.x, z: o.z, y: 1.1, tg, dmg: 6 + 4 * o.s.lvl, sp: 15, kind: 'nail', life: 1.2, ranged: true });
    this.emit('shoot', { w: 'guard' });
  }

  // ---------- зомби ----------
  spawnZombie(type, where) {
    const Z = ZOMBIES[type];
    let x, z;
    const P = this.P;
    if (where === 'lurk') {
      // ползун прячется у машин и мусорок подальше от продавца
      const far = LOOT_SPOTS.filter((L) => Math.hypot(L.ix - P.x, L.iz - P.z) > 9);
      const L = pick(far.length ? far : LOOT_SPOTS);
      for (let k = 0; k < 12; k++) {
        x = L.ix + rr(-1.6, 1.6);
        z = L.iz + rr(-0.6, 1.6);
        if (this.nav.free(x, z, 0.25, 'z')) break;
      }
    } else if (where === 'side' || rnd() < 0.6) {
      const sd = rnd() < 0.5 ? -1 : 1;
      x = sd * 23.5;
      z = rr(-9, 12);
    } else {
      x = rr(-16, 16);
      z = 23.5;
    }
    const hpK = 1 + 0.05 * (this.day - 1);
    const night = this.phase === 'night';
    const zb = {
      id: this.ids++,
      type,
      x,
      z,
      dir: 0,
      hp: Z.hp * hpK,
      max: Z.hp * hpK,
      sp: Z.sp * rr(0.9, 1.1),
      dmg: Z.dmg * (1 + 0.03 * (this.day - 1)),
      path: null,
      repath: 0,
      atkCd: 1,
      stun: 0,
      hit: 0,
      dead: 0,
      entry: (rnd() * 3) | 0,
      look: (rnd() * 1e6) | 0,
      moving: false,
      slam: 4,
      atk: 0,
      // roam — бродит по парковке, raid — ломится в лавку, lurk — ползун в засаде
      mode: where === 'lurk' ? 'lurk' : night && rnd() < 0.55 ? 'raid' : 'roam',
      roamT: rr(10, 28),
      hunt: null,
      rage: 0,
      screamT: 0,
      screamCd: rr(1, 3),
      spitCd: rr(1, 2),
      lunge: 0,
      carry: null,
    };
    if (type === 'boss') zb.mode = 'raid';
    // к ближайшему проёму с небольшой случайностью
    const ds = this.barr.map((b) => Math.abs(b.e.x - x) + rr(0, 8));
    zb.entry = ds.indexOf(Math.min(...ds));
    this.zs.push(zb);
    this.emit('zspawn', { type });
    return zb;
  }

  // кого зомби видит: продавец, персонал, днём покупатели
  zSense(z) {
    const night = this.phase === 'night';
    const range = (night ? 7.5 : 8.5) * (z.type === 'screamer' ? 1.2 : 1);
    let best = null,
      bd = 1e9;
    const cand = (e, kind) => {
      const d = dist(z, e);
      const cur = z.hunt === e;
      if (d > (cur ? 12 : range) || d > bd) return;
      if (!cur && !this.nav.los(z.x, z.z, e.x, e.z, 'z', 0.1)) return;
      bd = d;
      best = { e, kind, d };
    };
    if (!this.P.ko && !this.sleeping) cand(this.P, 'p');
    else if (this.sleeping && this.inside(z.x, z.z)) cand(this.P, 'p');
    for (const o of this.staff) if (!o.ko && o.state !== 'away' && o.state !== 'leaving') cand(o, 's');
    if (!night) for (const c of this.custs) if (c.state !== 'flee' && c.state !== 'leave') cand(c, 'c');
    return best;
  }

  // крикун зовёт всех вокруг на продавца
  rally(z) {
    for (const q of this.zs) {
      if (q.dead || q.gone || dist(q, z) > 14) continue;
      q.hunt = this.P;
      q.rage = 6;
      q.path = null;
      if (q.mode === 'lurk') q.mode = 'roam';
    }
  }

  // идти к цели: напрямую, если видно, иначе по сетке; false — не дойти
  zGo(z, x, z2, sp, dt, goal) {
    if (this.nav.los(z.x, z.z, x, z2, 'z', 0.25)) {
      z.path = null;
      const d = Math.hypot(x - z.x, z2 - z.z) || 1;
      const k = (sp * dt) / d;
      const nx = z.x + (x - z.x) * Math.min(1, k),
        nz = z.z + (z2 - z.z) * Math.min(1, k);
      if (this.nav.free(nx, z.z, 0.2, 'z')) z.x = nx;
      if (this.nav.free(z.x, nz, 0.2, 'z')) z.z = nz;
      z.dir = lerpAng(z.dir, Math.atan2(x - z.x, z2 - z.z), Math.min(1, dt * 8));
      z.moving = true;
      return true;
    }
    if (!z.path || z.repath <= 0 || z.goal !== goal) {
      z.repath = 1.2;
      z.goal = goal;
      z.path = this.nav.path(z.x, z.z, x, z2, 'z');
      if (!z.path) return false;
    }
    this.moveAlong(z, dt, sp, 'z');
    return true;
  }

  stepZombies(dt) {
    const night = this.phase === 'night';
    for (const z of this.zs) {
      if (z.dead || z.gone) {
        if (z.dead) z.dead += dt;
        continue;
      }
      z.hit = Math.max(0, z.hit - dt);
      z.atk = Math.max(0, z.atk - dt);
      z.rage = Math.max(0, z.rage - dt);
      z.lunge = Math.max(0, z.lunge - dt);
      z.screamCd -= dt;
      z.spitCd -= dt;
      if (z.stun > 0) {
        z.stun -= dt;
        z.moving = false;
        continue;
      }
      const Z = ZOMBIES[z.type];
      z.atkCd -= dt;
      z.repath -= dt;
      // капканы
      for (const tr of this.traps) {
        if (!tr.on || Math.hypot(z.x - tr.x, z.z - tr.z) > 0.55) continue;
        tr.on = false;
        tr.snap = 0.6;
        z.stun = 2.2;
        this.hitZombie(z, 45, null);
        this.emit('trap', { x: tr.x, z: tr.z });
      }
      if (z.dead) continue;
      const sp = z.sp * (z.rage > 0 ? 1.35 : 1) * (z.lunge > 0 ? 2.3 : 1);
      // крик
      if (z.screamT > 0) {
        z.screamT -= dt;
        z.moving = false;
        if (z.screamT <= 0) this.rally(z);
        continue;
      }
      // хапуга с добычей убегает с парковки
      if (z.carry) {
        this.thiefRun(z, sp, dt);
        continue;
      }
      let T = z.type === 'thief' ? null : this.zSense(z);
      if (T && T.kind === 'c' && z.type === 'crawler') T = null;
      if (T) {
        z.hunt = T.e;
        if (z.mode === 'lurk') {
          // ползун ждёт, пока подойдут близко, и бросается
          if (T.d > 2.6) {
            z.moving = false;
            z.dir = lerpAng(z.dir, Math.atan2(T.e.x - z.x, T.e.z - z.z), Math.min(1, dt * 3));
            continue;
          }
          z.mode = 'roam';
          z.lunge = 0.9;
          this.emit('zgrowl', { x: z.x, z: z.z });
        }
        if (z.type === 'screamer' && T.kind === 'p' && z.screamCd <= 0) {
          z.screamT = 1.1;
          z.screamCd = 10;
          z.dir = Math.atan2(T.e.x - z.x, T.e.z - z.z);
          this.emit('zscream', { x: z.x, z: z.z });
          continue;
        }
        if (z.type === 'spitter' && T.kind === 'p' && T.d > 2.4 && T.d < 7 && this.nav.los(z.x, z.z, T.e.x, T.e.z, 'z', 0.1)) {
          // плевун держит дистанцию и плюётся слизью туда, где стоит продавец
          z.moving = false;
          z.dir = lerpAng(z.dir, Math.atan2(T.e.x - z.x, T.e.z - z.z), Math.min(1, dt * 8));
          if (z.spitCd <= 0) {
            z.spitCd = 2.4;
            z.atk = 0.35;
            this.proj.push({ x: z.x, z: z.z, y: 1.2, tx: T.e.x, tz: T.e.z, sp: 6.5, kind: 'spit', life: 2, dmg: z.dmg, from: z });
            this.emit('spit', { x: z.x, z: z.z });
          }
          continue;
        }
        const reach = 0.75 + Z.r;
        if (T.d < reach && this.nav.los(z.x, z.z, T.e.x, T.e.z, 'z', 0.05)) {
          z.moving = false;
          z.dir = Math.atan2(T.e.x - z.x, T.e.z - z.z);
          this.zAttack(z, T);
        } else if (!this.zGo(z, T.e.x, T.e.z, sp, dt, 'hunt')) {
          // не добраться (продавец за закрытой дверью) — ломиться в ближайший проём
          z.hunt = null;
          z.mode = 'raid';
          z.entry = this.nearEntry(z);
          z.path = null;
        }
        this.bossSlam(z, T.d, dt);
        continue;
      }
      z.hunt = null;
      if (z.mode === 'lurk') {
        z.moving = false;
        continue;
      }
      if (z.type === 'thief') {
        this.thiefSteal(z, sp, dt);
        continue;
      }
      if (this.inside(z.x, z.z)) {
        this.zInside(z, sp, dt);
        continue;
      }
      if (night && z.mode === 'raid') {
        this.zRaid(z, sp, dt);
        continue;
      }
      // бродит по парковке; ночью рано или поздно идёт ломиться в лавку
      z.roamT -= dt;
      if (night && z.roamT <= 0) {
        z.mode = 'raid';
        z.entry = this.nearEntry(z);
        z.path = null;
        continue;
      }
      if (!z.path || z.repath <= 0 || z.goal !== 'roam') {
        z.repath = rr(4, 8);
        z.goal = 'roam';
        const L = pick(LOOT_SPOTS);
        const tx = night ? L.ix + rr(-2, 2) : rr(-7, 7),
          tz = night ? L.iz + rr(-2, 2) : rr(-1.5, 7);
        z.path = this.nav.path(z.x, z.z, tx, tz, 'z');
      }
      this.moveAlong(z, dt, sp * 0.75, 'z');
    }
    this.zs = this.zs.filter((z) => !z.gone && (!z.dead || z.dead < 1.2));
    this.separate(this.zs.filter((z) => !z.dead), 0.6);
  }

  nearEntry(z) {
    let k = 0,
      bd = 1e9;
    this.barr.forEach((b, i) => {
      const d = Math.abs(b.e.x - z.x) + (b.hp <= 0 ? -2 : 0);
      if (d < bd) (bd = d), (k = i);
    });
    return k;
  }

  bossSlam(z, d, dt) {
    if (z.type !== 'boss') return;
    z.slam -= dt;
    if (z.slam <= 0 && d < 2.6) {
      z.slam = 4;
      z.atk = 0.5;
      this.emit('slam', { x: z.x, z: z.z });
      if (dist(z, this.P) < 2.4) this.hurtPlayer(16);
      for (const o of this.staff) if (dist(z, o) < 2.4) this.hurtStaff(o, 16);
    }
  }

  // ночью: к своему проёму, ломать доски; сломали — внутрь
  zRaid(z, sp, dt) {
    const b = this.barr[z.entry];
    const Z = ZOMBIES[z.type];
    if (b.hp <= 0) {
      if (!z.path || z.goal !== 'in') {
        z.goal = 'in';
        z.path = this.nav.path(z.x, z.z, b.e.x + rr(-0.5, 0.5), FRONT_Z - 1.5, 'z');
        if (!z.path) z.mode = 'roam';
      }
      this.moveAlong(z, dt, sp, 'z');
      return;
    }
    const ax = b.e.x + ((z.id % 3) - 1) * 0.55,
      az = FRONT_Z + WALL_T + 0.75 + (z.type === 'boss' ? 0.4 : 0);
    if (!z.path || z.goal !== 'barr' + z.entry) {
      z.goal = 'barr' + z.entry;
      z.path = this.nav.path(z.x, z.z, ax, az, 'z');
    }
    const arrived = this.moveAlong(z, dt, sp, 'z');
    if (arrived || Math.hypot(z.x - ax, z.z - az) < 0.5) {
      z.dir = Math.PI;
      z.moving = false;
      if (z.atkCd <= 0) {
        z.atkCd = 1.05;
        z.atk = 0.35;
        if (z.type === 'bloater') {
          this.explode(z);
          b.hp -= Z.bar;
        } else b.hp -= Z.bar * (1 + 0.04 * (this.day - 1));
        b.hit = 0.25;
        this.emit('barHit', { k: z.entry, x: b.e.x, z: FRONT_Z + 0.2, broke: b.hp <= 0 });
        if (b.hp <= 0) {
          b.hp = 0;
          this.emit('barBreak', { k: z.entry, x: b.e.x });
          this.wake('barr');
          for (const q of this.zs) if (q.goal && q.goal.startsWith('barr')) q.path = null;
        }
      }
    }
  }

  // зомби в лавке: тащит товар с полок
  zInside(z, sp, dt) {
    let best = -1,
      bd = 1e9;
    for (let k = 0; k < this.nShelves; k++) {
      const sh = this.shelves[k];
      if (sh.n <= 0) continue;
      const [x, zz] = SHELF_SLOTS[k];
      const d = Math.hypot(z.x - x, z.z - zz);
      if (d < bd) (bd = d), (best = k);
    }
    if (best < 0) {
      if (!z.path || z.repath <= 0) {
        z.repath = 3;
        z.path = this.nav.path(z.x, z.z, rr(-6, 6), rr(-10, -4), 'z');
      }
      this.moveAlong(z, dt, sp * 0.6, 'z');
      return;
    }
    const [x, zz] = SHELF_SLOTS[best];
    const tz = zz + SHELF_D / 2 + 0.55;
    if (Math.hypot(z.x - x, z.z - tz) > 0.5) {
      if (!z.path || z.goal !== 'shelf' + best) {
        z.goal = 'shelf' + best;
        z.path = this.nav.path(z.x, z.z, x, tz, 'z');
      }
      this.moveAlong(z, dt, sp, 'z');
      return;
    }
    z.moving = false;
    z.dir = Math.PI;
    if (z.atkCd <= 0) {
      z.atkCd = 1.6;
      z.atk = 0.35;
      const sh = this.shelves[best];
      sh.n--;
      this.sum.stolen++;
      this.emit('steal', { x: z.x, z: z.z, k: best, type: sh.type });
    }
  }

  // хапуга: к полке с товаром, хватает и убегает
  thiefSteal(z, sp, dt) {
    let best = -1,
      bn = 0;
    for (let k = 0; k < this.nShelves; k++) if (this.shelves[k].n > bn) (bn = this.shelves[k].n), (best = k);
    if (best < 0) {
      // нечего брать — бродит
      if (!z.path || z.repath <= 0) {
        z.repath = 5;
        z.path = this.nav.path(z.x, z.z, rr(-8, 8), rr(-2, 6), 'z');
      }
      this.moveAlong(z, dt, sp * 0.7, 'z');
      return;
    }
    const [x, zz] = SHELF_SLOTS[best];
    const tz = zz + SHELF_D / 2 + 0.55;
    if (Math.hypot(z.x - x, z.z - tz) > 0.5) {
      if (!z.path || z.goal !== 'shelf' + best || z.repath <= 0) {
        z.goal = 'shelf' + best;
        z.repath = 3;
        z.path = this.nav.path(z.x, z.z, x, tz, 'z');
        // ночью лавка закрыта — сначала ломать доски
        if (!z.path && this.phase === 'night') {
          z.entry = this.nearEntry(z);
          return this.zRaid(z, sp, dt);
        }
      }
      this.moveAlong(z, dt, sp, 'z');
      return;
    }
    const sh = this.shelves[best];
    const n = Math.min(2, sh.n);
    sh.n -= n;
    z.carry = { type: sh.type, n };
    z.path = null;
    this.emit('grab', { k: best, x: z.x, z: z.z, thief: 1 });
    this.emit('thief', { x: z.x, z: z.z });
  }

  thiefRun(z, sp, dt) {
    const sd = z.x < 0 ? -1 : 1;
    if (!z.path || z.goal !== 'run') {
      z.goal = 'run';
      z.path = this.nav.path(z.x, z.z, sd * 23.8, 8, 'z') || [[sd * 23.8, 8]];
    }
    const arrived = this.moveAlong(z, dt, sp * 1.1, 'z');
    if (arrived || Math.abs(z.x) > 23.5) {
      this.sum.stolen += z.carry.n;
      this.emit('thiefGone', { n: z.carry.n });
      z.gone = true;
    }
  }

  zAttack(z, T) {
    if (z.atkCd > 0) return;
    z.atkCd = 1.1;
    z.atk = 0.35;
    if (z.type === 'bloater') {
      this.explode(z);
      return;
    }
    if (T.kind === 'p') {
      this.hurtPlayer(z.dmg);
      // ползун хватает за ногу: продавец замедляется
      if (z.type === 'crawler') this.P.slowT = 1.3;
    } else if (T.kind === 's') this.hurtStaff(T.e, z.dmg);
  }

  hurtPlayer(n) {
    const P = this.P;
    if (P.hurtT > 0 || P.ko) return;
    this.wake('hurt');
    P.hp -= n;
    P.hurtT = 0.45;
    this.emit('hurt', { x: P.x, z: P.z, n });
    if (P.hp <= 0) {
      P.hp = 0;
      P.ko = true;
      P.act = null;
      this.emit('ko');
    }
  }

  hurtStaff(o, n) {
    if (o.ko) return;
    o.hp -= n;
    this.emit('staffHurt', { x: o.x, z: o.z });
    if (o.hp <= 0) {
      o.ko = true;
      o.hp = 0;
      o.s.hurt = 1;
      o.s.hurtDay = this.day;
      this.emit('staffKo', { name: o.s.name, x: o.x, z: o.z });
    }
  }

  explode(z) {
    if (z.dead) return;
    z.hp = 0;
    z.dead = 0.001;
    z.exploded = true;
    this.emit('boom', { x: z.x, z: z.z });
    if (dist(z, this.P) < 2.2) this.hurtPlayer(ZOMBIES.bloater.dmg);
    for (const o of this.staff) if (dist(z, o) < 2.2) this.hurtStaff(o, ZOMBIES.bloater.dmg);
    for (const q of this.zs) if (q !== z && !q.dead && dist(q, z) < 2.2) this.hitZombie(q, 30, null);
    this.killed(z);
  }

  hitZombie(z, dmg, from) {
    if (z.dead || z.gone) return;
    z.hp -= dmg;
    z.hit = 0.15;
    if (z.mode === 'lurk') z.mode = 'roam';
    if (from) {
      // лёгкий отскок
      const d = dist(z, from) || 1;
      const kb = z.type === 'boss' || z.type === 'brute' || z.type === 'hardhat' ? 0.05 : 0.22;
      const nx = z.x + ((z.x - from.x) / d) * kb,
        nz = z.z + ((z.z - from.z) / d) * kb;
      if (this.nav.free(nx, nz, 0.2, 'z')) {
        z.x = nx;
        z.z = nz;
      }
      // ударили — злится на продавца
      if (from === this.P && !z.carry) z.hunt = this.P;
    }
    this.emit('zhit', { x: z.x, z: z.z, n: Math.round(dmg), armor: !!ZOMBIES[z.type].armor });
    if (z.hp <= 0) {
      if (z.type === 'bloater') return this.explode(z);
      z.dead = 0.001;
      this.killed(z);
    }
  }

  killed(z) {
    // хапуга роняет украденное — назад на склад
    if (z.carry) {
      this.addStock(z.carry.type, z.carry.n);
      this.emit('recovered', { x: z.x, z: z.z, type: z.carry.type, n: z.carry.n });
      z.carry = null;
    }
    this.sum.kills++;
    this.s.stats.kills++;
    this.addXP(z.type === 'boss' ? 60 : z.type === 'brute' ? 10 : 5);
    // трофеи — соберутся утром
    const D = this.sum.drops;
    const roll = (k, p, n = 1) => rnd() < p && (D[k] = (D[k] || 0) + n);
    roll('scrap', 0.55);
    roll('cloth', 0.22);
    roll('parts', z.type === 'brute' || z.type === 'boss' ? 0.8 : 0.1, z.type === 'boss' ? 4 : 1);
    roll('chem', z.type === 'bloater' ? 0.7 : 0.06);
    roll('bat', z.type === 'boss' ? 1 : 0.12, z.type === 'boss' ? 60 : 1 + ((rnd() * 3) | 0));
    this.emit('zdie', { x: z.x, z: z.z, type: z.type, boss: z.type === 'boss' });
  }

  stepProj(dt) {
    for (const p of this.proj) {
      p.life -= dt;
      if (p.kind === 'spit') {
        // слизь летит в точку и растекается лужей
        const dx = p.tx - p.x,
          dz = p.tz - p.z;
        const d = Math.hypot(dx, dz);
        const st = p.sp * dt;
        p.y = 0.4 + Math.min(1, d / 3) * 0.8;
        if (d <= st) {
          p.life = 0;
          this.emit('splat', { x: p.tx, z: p.tz });
          if (Math.hypot(this.P.x - p.tx, this.P.z - p.tz) < 0.75 && !this.P.ko) {
            this.hurtPlayer(p.dmg);
            this.P.slowT = 2;
          }
        } else {
          p.x += (dx / d) * st;
          p.z += (dz / d) * st;
          if (!this.nav.free(p.x, p.z, 0.05, 'z')) p.life = 0;
        }
        continue;
      }
      const tg = p.tg;
      if (!tg || tg.dead || tg.gone) {
        p.life = 0;
        continue;
      }
      const dx = tg.x - p.x,
        dz = tg.z - p.z;
      const d = Math.hypot(dx, dz);
      const st = p.sp * dt;
      if (d <= st + 0.2) {
        this.hitZombie(tg, this.zDmg(tg, p.dmg, true), p);
        p.life = 0;
      } else {
        p.x += (dx / d) * st;
        p.z += (dz / d) * st;
      }
    }
    this.proj = this.proj.filter((p) => p.life > 0);
  }

  // ---------- верстак ----------
  craft(id) {
    const R = RECIPES.find((r) => r.id === id);
    const s = this.s;
    if (!R || R.lvl > s.build.bench) return false;
    for (const [k, n] of Object.entries(R.in)) if ((s.stock[k] || 0) < n) return false;
    if (s.crafting.length >= 4) return false;
    for (const [k, n] of Object.entries(R.in)) s.stock[k] -= n;
    s.crafting.push({ id, left: R.time });
    this.emit('craftStart');
    return true;
  }

  stepCraft(dt) {
    const q = this.s.crafting;
    if (!q.length) return;
    const c = q[0];
    c.left -= dt * this.pk.craftSp;
    if (c.left <= 0) {
      q.shift();
      const R = RECIPES.find((r) => r.id === c.id);
      let n = R.out;
      if (this.pk.dbl && rnd() < this.pk.dbl) n *= 2;
      this.addStock(c.id, n);
      this.addXP(3);
      this.emit('crafted', { id: c.id, n, x: BENCH.x, z: BENCH.z - 0.8 });
    }
  }

  // ---------- общее движение ----------
  moveAlong(e, dt, sp, mode) {
    if (!e.path || !e.path.length) {
      e.moving = false;
      e.path = null;
      return true;
    }
    const [tx, tz] = e.path[0];
    const dx = tx - e.x,
      dz = tz - e.z;
    const d = Math.hypot(dx, dz);
    const st = sp * dt;
    if (d <= st) {
      e.x = tx;
      e.z = tz;
      e.path.shift();
      if (!e.path.length) {
        e.path = null;
        e.moving = false;
        return true;
      }
    } else {
      e.x += (dx / d) * st;
      e.z += (dz / d) * st;
    }
    e.moving = true;
    e.dir = lerpAng(e.dir, Math.atan2(dx, dz), Math.min(1, dt * 10));
    return false;
  }

  // мягкое расталкивание
  separate(list, r, mode = 'z') {
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i],
          b = list[j];
        const dx = b.x - a.x,
          dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < r) {
          const k = ((r - d) / d) * 0.25;
          const ax = a.x - dx * k,
            az = a.z - dz * k,
            bx = b.x + dx * k,
            bz = b.z + dz * k;
          if (this.nav.free(ax, az, 0.15, mode)) (a.x = ax), (a.z = az);
          if (this.nav.free(bx, bz, 0.15, mode)) (b.x = bx), (b.z = bz);
        }
      }
  }
}

export function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function lerpAng(a, b, k) {
  return a + angDiff(b, a) * k;
}
function lookAt(e, x, z) {
  return Math.atan2(x - e.x, z - e.z);
}
