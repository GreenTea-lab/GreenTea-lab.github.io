// Бот для проверок и промо: обыскивает парковку, раскладывает товар, стоит на кассе, отбивается ночью
import { REG_SPOT, STORAGE, SHELF_SLOTS, SHELF_D, SHELF_CAP, GOOD_IDS, FRONT_Z, WALL_T, ENTRIES, COT } from './data.js';
import { save } from './save.js';

export class Bot {
  constructor(w, o = {}) {
    this.w = w;
    this.path = null;
    this.goal = null;
    this.re = 0;
    this.wait = 0;
    this.o = o;
  }

  go(x, z, dt) {
    const w = this.w,
      P = w.P;
    const key = x.toFixed(1) + ',' + z.toFixed(1);
    this.re -= dt;
    if (this.goal !== key || this.re <= 0 || !this.path) {
      this.goal = key;
      this.re = 1.0;
      this.path = w.nav.path(P.x, P.z, x, z, 'p') || [];
    }
    while (this.path.length && Math.hypot(this.path[0][0] - P.x, this.path[0][1] - P.z) < 0.2) this.path.shift();
    if (!this.path.length) return { mx: 0, mz: 0, arrived: Math.hypot(P.x - x, P.z - z) < 0.6 };
    const [tx, tz] = this.path[0];
    const dx = tx - P.x,
      dz = tz - P.z,
      d = Math.hypot(dx, dz);
    return { mx: dx / d, mz: dz / d, arrived: false };
  }

  input(dt) {
    const w = this.w,
      P = w.P,
      s = save.data;
    if (P.ko) return { mx: 0, mz: 0 };
    this.wait -= dt;
    if (w.phase === 'night') return this.night(dt);
    if (w.phase === 'dusk') {
      const m = this.go(0, -6.5, dt);
      return { mx: m.mx, mz: m.mz };
    }
    // касса
    if (w.co && (w.queue.length || w.co)) {
      const m = this.go(REG_SPOT.x, REG_SPOT.z, dt);
      if (P.atReg) {
        const co = w.co;
        if (this.wait <= 0) {
          this.wait = this.o.fastTest ? 0.05 : 0.3;
          if (co.needy) w.giftNeedy();
          else if (co.testing < 0) {
            const bad = co.bats.findIndex((b) => b.st === 'bad');
            const unk = co.bats.findIndex((b) => b.st === '?');
            if (bad >= 0) w.rejectBattery(bad);
            else if (unk >= 0) w.testBattery(unk);
            else w.acceptPay();
          }
        }
        return { mx: 0, mz: 0 };
      }
      return { mx: m.mx, mz: m.mz };
    }
    // дневной зомби рядом — прогнать
    const dz = !w.co && this.nearZ(10);
    if (dz) return this.fight(dz, dt);
    // полки
    if (P.hand) {
      let k = w.shelves.findIndex((sh, i) => i < w.nShelves && sh.type === P.hand.type && sh.n < SHELF_CAP);
      if (k < 0) k = w.shelves.findIndex((sh, i) => i < w.nShelves && sh.n === 0);
      if (k < 0) {
        w.returnHand();
        return { mx: 0, mz: 0 };
      }
      const [x, z] = SHELF_SLOTS[k];
      const m = this.go(x, z + SHELF_D / 2 + 0.6, dt);
      if (P.near && P.near.kind === 'shelf' && P.near.ref === k) return { mx: 0, mz: 0, act: true };
      return { mx: m.mx, mz: m.mz };
    }
    const low = w.shelves.findIndex((sh, i) => i < w.nShelves && (sh.n < 3 && ((sh.type && s.stock[sh.type] > 0) || (!sh.type || sh.n === 0))));
    const anyStock = GOOD_IDS.some((id) => s.stock[id] > 0);
    if (low >= 0 && anyStock) {
      const sh = w.shelves[low];
      let type = sh.type && s.stock[sh.type] > 0 ? sh.type : null;
      if (!type) {
        const shown = new Set(w.shelves.filter((x) => x.n > 0).map((x) => x.type));
        type = GOOD_IDS.filter((id) => s.stock[id] > 0).sort((a, b) => (shown.has(a) - shown.has(b)) || s.stock[b] - s.stock[a])[0];
      }
      const m = this.go(STORAGE.x, STORAGE.z, dt);
      if (P.near && P.near.kind === 'storage') {
        w.takeFromStorage(type);
        return { mx: 0, mz: 0 };
      }
      return { mx: m.mx, mz: m.mz };
    }
    // поиск по парковке
    const sp = w.spots.filter((x) => !x.done).sort((a, b) => Math.hypot(a.L.ix - P.x, a.L.iz - P.z) - Math.hypot(b.L.ix - P.x, b.L.iz - P.z))[0];
    if (sp && !this.o.noLoot) {
      const m = this.go(sp.L.ix, sp.L.iz, dt);
      if (P.act) return { mx: 0, mz: 0 };
      if (P.near && P.near.kind === 'loot' && P.near.ref === sp) return { mx: 0, mz: 0, act: true };
      return { mx: m.mx, mz: m.mz };
    }
    const m = this.go(REG_SPOT.x, REG_SPOT.z, dt);
    return { mx: m.mx, mz: m.mz };
  }

  nearZ(r) {
    const P = this.w.P;
    let tg = null,
      bd = r;
    for (const z of this.w.zs) {
      if (z.dead || z.gone) continue;
      const d = Math.hypot(z.x - P.x, z.z - P.z);
      if (d < bd) (bd = d), (tg = z);
    }
    return tg ? { z: tg, d: bd } : null;
  }

  // подойти к зомби вплотную: удар идёт сам
  fight(t, dt) {
    const w = this.w;
    if (t.d < w.weapon.range * 0.7) return { mx: 0, mz: 0 };
    const m = this.go(t.z.x, t.z.z, dt);
    return { mx: m.mx, mz: m.mz };
  }

  night(dt) {
    const w = this.w,
      P = w.P,
      s = save.data;
    if (w.sleeping) return { mx: 0, mz: 0 };
    const meds = (s.stock.bandage || 0) + (s.stock.medkit || 0);
    if (P.hp < P.max * 0.4 && meds > 0 && this.wait <= 0) {
      this.wait = 0.5;
      return { mx: 0, mz: 0, heal: true };
    }
    // зомби в лавке — первым делом
    const ins = w.zs.find((z) => !z.dead && w.inside(z.x, z.z));
    if (ins) return this.fight({ z: ins, d: Math.hypot(ins.x - P.x, ins.z - P.z) }, dt);
    const t = this.nearZ(this.o.calm ? 5 : 9);
    if (t && (P.hp > P.max * 0.3 || t.d < 3)) return this.fight(t, dt);
    // чинить баррикады с той стороны, где стоим
    const k = w.barr.findIndex((b) => b.hp < b.max * 0.6);
    if (k >= 0 && s.stock.wood > 0) {
      const out = P.z > FRONT_Z;
      const m = this.go(ENTRIES[k].x, out ? FRONT_Z + WALL_T + 0.6 : FRONT_Z - 0.6, dt);
      if (P.near && P.near.kind === 'repair' && !P.act) return { mx: 0, mz: 0, act: true };
      return { mx: m.mx, mz: m.mz };
    }
    // ночной поиск по стоянке
    if (!this.o.noLoot && w.hour < 27 && P.hp > P.max * 0.5) {
      const sp = w.spots.filter((x) => !x.done).sort((a, b) => Math.hypot(a.L.ix - P.x, a.L.iz - P.z) - Math.hypot(b.L.ix - P.x, b.L.iz - P.z))[0];
      if (sp) {
        if (P.act) return { mx: 0, mz: 0 };
        if (P.near && P.near.kind === 'loot' && P.near.ref === sp) return { mx: 0, mz: 0, act: true };
        const m = this.go(sp.L.ix, sp.L.iz, dt);
        return { mx: m.mx, mz: m.mz };
      }
    }
    // поспать под утро
    if (!this.o.noSleep && w.hour >= 25.5 && !w.sleepBlock()) {
      if (P.near && P.near.kind === 'cot') return { mx: 0, mz: 0, act: true };
      const m = this.go(COT.x, COT.z, dt);
      return { mx: m.mx, mz: m.mz };
    }
    const m = this.go(0, -5.5, dt);
    return { mx: m.mx, mz: m.mz };
  }
}
