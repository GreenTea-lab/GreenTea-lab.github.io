// Гости у окна выдачи: на каждый заказ подходит зверёк и ждёт в очереди;
// получив блюдо, радостно подпрыгивает и уходит, а не дождавшись — уходит грустный.
// Плюс пара прохожих, которые гуляют вокруг кухни.
import * as THREE from 'three';
import { makeChef, animChef } from './models.js';
import { blobShadow, disposeTree, B } from './gfx.js';
import { CHEFS } from './data.js';

const SHIRTS = ['#7ac8ff', '#ffb35c', '#b48cff', '#8be07a', '#ff8fb0', '#ffd84a', '#6fd6c8'];
const CAPS = ['#ff6b6b', '#4aa3ff', '#ffd23f', '#8be05e', '#ff9ac0', null, null];
const WALK = 1.6;

export class Guests {
  constructor(view) {
    this.v = view;
    this.k = view.k;
    this.list = new Map(); // id заказа → гость
    this.n = 0;
    const k = this.k;
    // окно выдачи и сторона «наружу»
    this.win = null;
    for (const t of k.tiles) {
      if (t.type !== 'serve') continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = k.tile(t.x + dx, t.z + dz);
        if (!n || n.type === 'void') {
          this.win = { t, dx, dz };
          break;
        }
      }
      if (this.win) break;
    }
    this.walkers = [];
    if (this.win) this.addWalkers();
    this.addDiners(view.seats || []);
  }

  // посетители кафе за столиками: сидят, едят и болтают
  addDiners(seats) {
    this.diners = [];
    const k = this.k;
    seats.forEach((s, i) => {
      if ((i * 7 + k.idx * 3) % 5 > 2 || this.diners.length >= 8) return;
      const ch = this.mk(k.idx * 13 + i * 5 + 1);
      ch.group.scale.setScalar(0.82);
      ch.group.position.set(s.x, s.y, s.z);
      ch.group.rotation.y = s.face;
      ch.sh.position.set(s.x, 0.025, s.z);
      this.diners.push({ ch, ph: i * 1.7, eat: 2 + ((i * 3) % 5) });
    });
  }

  diner(d, dt) {
    const now = performance.now() / 1000;
    animChef(d.ch, now * 2 + d.ph, 0, false, false, 0);
    d.eat -= dt;
    if (d.eat < 0) d.eat = 3 + ((d.ph * 7) % 4);
    // ложка ко рту
    if (d.eat < 0.8) {
      const u = Math.sin((d.eat / 0.8) * Math.PI);
      d.ch.hands[1].position.set(0.18, 0.5 + u * 0.32, 0.28);
      d.ch.head.rotation.x = -u * 0.1;
    } else {
      d.ch.head.rotation.x = 0;
      d.ch.head.rotation.y = Math.sin(now * 0.7 + d.ph) * 0.35; // оглядываются, болтают
    }
  }

  // насколько расширить кадр камеры, чтобы очередь была видна
  extra() {
    if (!this.win) return { x0: 0, x1: 0, z0: 0, z1: 0 };
    const { dx, dz } = this.win;
    const e = 1.7;
    return { x0: dx < 0 ? e : 0, x1: dx > 0 ? e : 0, z0: dz < 0 ? e : 0, z1: dz > 0 ? e : 0 };
  }

  // место в очереди: первый у окна, остальные вдоль стены
  slot(i) {
    const { t, dx, dz } = this.win;
    const v = this.v;
    const sx = -dz,
      sz = dx; // вдоль стены
    // очередь уходит в ту сторону, где больше места внутри кадра
    const mid = dx !== 0 ? t.z - this.k.H / 2 : t.x - this.k.W / 2;
    const sgn = mid > 0 ? -1 : 1;
    const along = i === 0 ? 0 : (i - 0.15) * 0.82;
    return {
      x: v.wx(t.x) + dx * 1.05 + sx * along * sgn,
      z: v.wz(t.z) + dz * 1.05 + sz * along * sgn,
      face: Math.atan2(-dx, -dz),
    };
  }

  spawnPoint(far) {
    const { t, dx, dz } = this.win;
    const v = this.v;
    const sx = -dz,
      sz = dx;
    const d = far ? 7 : 5;
    return { x: v.wx(t.x) + dx * 1.6 + sx * d, z: v.wz(t.z) + dz * 1.6 + sz * d };
  }

  mk(seed) {
    const skin = CHEFS[seed % CHEFS.length].id;
    const ch = makeChef(skin, SHIRTS[(seed * 3 + 1) % SHIRTS.length], { hat: false, cap: CAPS[(seed * 5 + 2) % CAPS.length] });
    ch.group.scale.setScalar(0.92);
    const sh = blobShadow(0.38, 0.22);
    this.v.scene.add(ch.group);
    this.v.scene.add(sh);
    ch.sh = sh;
    return ch;
  }

  addWalkers() {
    // двое гуляют вдоль кухни снаружи, под мягкую музыку
    const k = this.k;
    const v = this.v;
    const routes = [
      { a: [v.ox - 0.8, v.oz + 0.5], b: [v.ox - 0.8, -v.oz - 0.3] },
      { a: [-v.ox + 0.8 + (this.win.dx > 0 ? 1.9 : 0), -v.oz - 0.3], b: [-v.ox + 0.8 + (this.win.dx > 0 ? 1.9 : 0), v.oz + 0.8] },
    ];
    routes.forEach((r, i) => {
      const ch = this.mk(k.idx * 7 + i * 3 + 4);
      const w = { ch, r, p: i * 0.5, dir: 1, pause: 1 + i * 2, ph: 0 };
      this.walkers.push(w);
    });
  }

  update(dt) {
    if (!this.win) {
      for (const d of this.diners) this.diner(d, dt);
      return;
    }
    const k = this.k;
    const ids = new Set(k.orders.map((o) => o.id));
    // новые заказы — новые гости
    k.orders.forEach((o) => {
      if (this.list.has(o.id)) return;
      const ch = this.mk(o.id * 5 + k.idx);
      const sp = this.spawnPoint(false);
      const g = { ch, x: sp.x, z: sp.z, dir: 0, st: 'wait', t: 0, ph: Math.random() * 6, jump: 0 };
      this.list.set(o.id, g);
    });
    // события: выдали или ушёл
    for (const e of k.events) {
      if (!e.oid) continue;
      const g = this.list.get(e.oid);
      if (!g) continue;
      if (e.type === 'serve') {
        g.st = 'happy';
        g.t = 0.9;
        for (let i = 0; i < 6; i++) this.v.spawn(g.x, 1.6, g.z, (Math.random() - 0.5) * 1.2, 1.6 + Math.random(), (Math.random() - 0.5) * 1.2, '#ff7aa2', 0.07, 1.0, 1.2);
      } else if (e.type === 'miss') {
        g.st = 'sad';
        g.t = 0.6;
        for (let i = 0; i < 5; i++) this.v.spawn(g.x, 1.55, g.z, (Math.random() - 0.5) * 0.5, 0.6, (Math.random() - 0.5) * 0.5, '#9aa0b0', 0.08, 0.9, -0.2, 0.15);
      }
    }
    // ожидающие встают по местам в порядке заказов
    let qi = 0;
    for (const o of k.orders) {
      const g = this.list.get(o.id);
      if (!g || g.st !== 'wait') continue;
      const s = this.slot(qi++);
      this.walk(g, s.x, s.z, dt, WALK, s.face);
      // нетерпение: пританцовывают, когда время на исходе
      g.worry = o.left / o.pat < 0.3;
    }
    for (const [id, g] of this.list) {
      if (g.st === 'happy' || g.st === 'sad') {
        g.t -= dt;
        if (g.st === 'happy') g.jump = Math.max(0, Math.sin((0.9 - g.t) * 9)) * 0.35 * Math.max(0, g.t);
        if (g.t <= 0) g.st = 'leave';
        else this.walk(g, g.x, g.z, dt, 0, g.dir);
      }
      if (g.st === 'leave') {
        const sp = this.spawnPoint(true);
        const tx = sp.x + this.win.dx * 0.8,
          tz = sp.z + this.win.dz * 0.8;
        const done = this.walk(g, tx, tz, dt, g.sad ? 1.1 : WALK);
        if (done) {
          this.remove(g);
          this.list.delete(id);
        }
      } else if (g.st === 'wait' && !ids.has(id)) g.st = 'leave';
      this.pose(g, dt);
    }
    for (const w of this.walkers) this.walker(w, dt);
    for (const d of this.diners) this.diner(d, dt);
  }

  walk(g, tx, tz, dt, sp, face) {
    const dx = tx - g.x,
      dz = tz - g.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.04 && sp > 0) {
      const s = Math.min(d, sp * dt);
      g.x += (dx / d) * s;
      g.z += (dz / d) * s;
      g.dir = turn(g.dir, Math.atan2(dx, dz), dt * 10);
      g.mv = sp * 1.8;
      g.ph += dt * 9;
      return false;
    }
    g.mv = 0;
    if (face !== undefined) g.dir = turn(g.dir, face, dt * 8);
    return true;
  }

  pose(g, dt) {
    const ch = g.ch;
    ch.group.position.set(g.x, g.jump || 0, g.z);
    ch.group.rotation.y = g.dir;
    const fidget = g.worry && !g.mv ? Math.sin(performance.now() / 90) * 0.6 : 0;
    animChef(ch, g.mv ? g.ph : performance.now() / 300 + fidget, g.mv || (g.worry ? 0.9 : 0), false, false, 0);
    if (g.st === 'happy') {
      ch.hands[0].position.y = 0.75;
      ch.hands[1].position.y = 0.75;
    }
    if (g.st === 'sad' || (g.st === 'leave' && g.sad)) ch.head.rotation.x = 0.3;
    if (g.st === 'sad') g.sad = true;
    ch.sh.position.set(g.x, 0.025, g.z);
  }

  walker(w, dt) {
    const [ax, az] = w.r.a,
      [bx, bz] = w.r.b;
    const len = Math.hypot(bx - ax, bz - az) || 1;
    let moving = 0;
    if (w.pause > 0) w.pause -= dt;
    else {
      w.p += (w.dir * dt * 0.9) / len;
      moving = 1;
      if (w.p >= 1 || w.p <= 0) {
        w.p = Math.max(0, Math.min(1, w.p));
        w.dir *= -1;
        w.pause = 2 + Math.random() * 3;
      }
    }
    const x = ax + (bx - ax) * w.p,
      z = az + (bz - az) * w.p;
    const want = moving ? Math.atan2((bx - ax) * w.dir, (bz - az) * w.dir) : 0;
    w.ph += dt * 7 * moving;
    w.face = turn(w.face || 0, moving ? want : 0, dt * 5);
    const ch = w.ch;
    ch.group.position.set(x, 0, z);
    ch.group.rotation.y = w.face;
    animChef(ch, moving ? w.ph : performance.now() / 400, moving ? 1.5 : 0, false, false, 0);
    if (!moving) ch.hands[0].position.y = 0.45 + Math.max(0, Math.sin(performance.now() / 250)) * 0.25; // машет лапкой
    ch.sh.position.set(x, 0.025, z);
  }

  remove(g) {
    this.v.scene.remove(g.ch.group);
    this.v.scene.remove(g.ch.sh);
    disposeTree(g.ch.group);
  }

  dispose() {
    for (const g of this.list.values()) this.remove(g);
    for (const w of this.walkers) this.remove(w);
    for (const d of this.diners) this.remove(d);
    this.list.clear();
  }
}

function turn(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, k);
}
