// Бот для проверки баланса: собирает конфеты и угощения, сдаёт в котёл, обходит врагов, ловит их с фонарём
import { CS } from './map.js';
import { ENEMY } from './data.js';

export class Bot {
  constructor(w, skill = 1) {
    this.w = w;
    this.skill = skill; // 0..1: 1 — осторожный и жадный до фонарей
    this.think = 0;
    this.tf = null;
    this.goal = null;
  }

  threats() {
    const w = this.w;
    const out = [];
    for (const e of w.enemies) {
      if (e.dead > 0 || e.fade < 1) continue;
      if (e.type === 'witch') continue;
      if (e.type === 'spider') {
        if (e.phase !== 'up') out.push([e.x, e.z, 1.5]);
        continue;
      }
      out.push([e.x, e.z, e.type === 'boss' ? 3.2 : e.state === 'charge' ? 3.5 : 2.4]);
      if (e.type === 'skel' && e.state === 'alert') out.push([e.x + e.cdir[0] * 3, e.z + e.cdir[1] * 3, 2.4]);
    }
    for (const b of w.bats) if (b.t > 0) {
      out.push([b.x, b.z, 2.2]);
      out.push([b.x + b.dx * 0.35, b.z + b.dz * 0.35, 2.2]);
    }
    for (const b of w.bones) out.push([b.x + b.dx * 0.2, b.z + b.dz * 0.2, 1.6]);
    for (const v of w.waves) out.push([v.x, v.z, v.max + 0.6]);
    return out;
  }

  danger(x, z, th) {
    let d = 0;
    for (const [tx, tz, r] of th) {
      const k = r - Math.hypot(tx - x, tz - z);
      if (k > 0) d += k * k;
    }
    return d;
  }

  pickGoal() {
    const w = this.w,
      P = w.p;
    const pf = w.playerField();
    const W = w.map.W;
    const dist = (x, z) => {
      const i = Math.floor(x / CS),
        j = Math.floor(z / CS);
      const v = pf[j * W + i];
      return v < 0 ? 999 : v;
    };
    const left = w.time - w.t;
    const homeD = dist(w.cauldron.x, w.cauldron.z + 2.5);
    // с фонарём — ловить
    if (w.power) {
      let best = null,
        bd = 1e9;
      for (const e of w.enemies) {
        if (e.dead > 0 || e.type === 'spider' || e.type === 'witch') continue;
        const d = e.type === 'boss' ? Math.hypot(e.x - P.x, e.z - P.z) / CS : dist(e.x, e.z);
        const v = d - (e.type === 'boss' ? 6 : 0);
        if (d < P.powerT * 2.2 && v < bd) (bd = v), (best = e);
      }
      if (best) return { x: best.x, z: best.z, kind: 'hunt' };
    }
    // босс: сначала фонарь
    if (w.boss && !w.power && w.boss.dead <= 0) {
      let best = null,
        bd = 1e9;
      for (const L of w.lanterns) if (L.on && dist(L.x, L.z) < bd) (bd = dist(L.x, L.z)), (best = L);
      if (best && (P.bag < w.st.bag * 0.6 || bd < 6)) return { x: best.x, z: best.z, kind: 'lantern' };
    }
    const need = P.bag >= w.st.bag || (P.bag > 0 && left < homeD * CS / w.st.speed + 2.5) || (P.bag >= w.st.bag * 0.7 && homeD < 5);
    if (need) return { x: w.cauldron.x, z: w.cauldron.z, kind: 'home' };
    let best = null,
      bv = -1;
    for (const h of w.houses) {
      if (!h.lit) continue;
      const d = dist(h.x, h.z);
      const v = 5.5 / (d + 2);
      if (v > bv) (bv = v), (best = { x: h.x, z: h.z, kind: 'house' });
    }
    for (const c of w.candies) {
      if (c.dead || c.fly > 0) continue;
      const d = dist(c.x, c.z);
      const v = c.v / (d + 1.2);
      if (v > bv) (bv = v), (best = { x: c.x, z: c.z, kind: 'candy' });
    }
    if (this.skill > 0.5) for (const L of w.lanterns) {
      if (!L.on) continue;
      const d = dist(L.x, L.z);
      const v = (w.enemies.length * 0.8) / (d + 2);
      if (v > bv) (bv = v), (best = { x: L.x, z: L.z, kind: 'lantern' });
    }
    return best || { x: w.cauldron.x, z: w.cauldron.z, kind: 'home' };
  }

  input(dt) {
    const w = this.w,
      P = w.p;
    this.think -= dt;
    if (this.think <= 0 || !this.goal) {
      this.think = 0.2;
      this.goal = this.pickGoal();
      let gx = this.goal.x,
        gz = this.goal.z;
      if (this.goal.kind === 'home') gz += 0;
      const [gi, gj] = w.cellOf(...w.freeNear(gx, gz));
      this.gi = gi;
      this.gj = gj;
      this.tf = w.nav.field(gi, gj, this.tf);
    }
    const th = this.threats();
    const [i, j] = w.cellOf(P.x, P.z);
    const W = w.map.W;
    const cur = this.tf[j * W + i];
    let bx = 0,
      bz = 0;
    if (cur <= 0) {
      bx = this.goal.x - P.x;
      bz = this.goal.z - P.z;
    } else {
      // соседи: прогресс к цели минус опасность
      let best = null,
        bs = -1e9;
      const hunting = this.goal.kind === 'hunt';
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + dx,
          nj = j + dz;
        if (!w.nav.walk(ni, nj)) continue;
        const v = this.tf[nj * W + ni];
        if (v < 0) continue;
        const cx = (ni + 0.5) * CS,
          cz = (nj + 0.5) * CS;
        const dg = hunting ? 0 : this.danger((cx + P.x) / 2, (cz + P.z) / 2, th) + this.danger(cx, cz, th);
        const s = (cur - v) * 3 - dg * (1.2 + this.skill) - (dx === 0 && dz === 0 ? 0.5 : 0);
        if (s > bs) (bs = s), (best = [cx, cz]);
      }
      if (best) {
        bx = best[0] - P.x;
        bz = best[1] - P.z;
      }
    }
    const l = Math.hypot(bx, bz);
    const here = this.danger(P.x, P.z, th);
    return { mx: l > 0.05 ? bx / l : 0, mz: l > 0.05 ? bz / l : 0, dash: here > 1.4 && this.skill > 0.3 && !w.power };
  }
}
