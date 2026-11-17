// Аркадная физика машины игрока: разгон, руление, дрифт с мини-турбо, нитро, ускорители, бортики
import { track, heightAt, STEP } from './tracks.js';

export class PlayerCar {
  constructor(T, stats, s0, d0) {
    this.T = T;
    this.st = stats;
    const n = T.n;
    const i = ((Math.round(s0 / STEP) % n) + n) % n;
    this.x = T.x[i] + T.nx[i] * d0;
    this.z = T.z[i] + T.nz[i] * d0;
    this.y = T.y[i];
    this.h = Math.atan2(T.tx[i], T.tz[i]);
    this.vx = 0;
    this.vz = 0;
    this.vf = 0;
    this.hint = i;
    this.sTotal = s0;
    this.sPrev = ((s0 % (n * STEP)) + n * STEP) % (n * STEP);
    this.d = d0;
    this.drift = 0; // направление дрифта: -1, 0, 1
    this.driftT = 0;
    this.boostT = 0;
    this.boostKind = '';
    this.nitro = 0;
    this.nitroT = 0;
    this.yawVis = 0;
    this.pitch = 0;
    this.hit = 0;
    this.wrongT = 0;
    this.steerVis = 0;
    this.ev = []; // события для звука и эффектов
  }

  get speed() {
    return Math.hypot(this.vx, this.vz);
  }

  boost(sec, kind) {
    if (sec > this.boostT) this.boostT = sec;
    this.boostKind = kind;
    this.ev.push('boost:' + kind);
  }

  useNitro() {
    if (this.nitro < 0.999 || this.nitroT > 0) return false;
    this.nitro = 0;
    this.nitroT = this.st.nitroTime;
    this.ev.push('nitro');
    return true;
  }

  // inp: { steer -1..1 (вправо +), brake, drift, nitro }
  step(dt, inp, frozen) {
    const T = this.T,
      st = this.st;
    let fx = Math.sin(this.h),
      fz = Math.cos(this.h);
    let lx = Math.cos(this.h),
      lz = -Math.sin(this.h);
    let vf = this.vx * fx + this.vz * fz;
    if (frozen) {
      this.vx = this.vz = 0;
      this.vf = 0;
      return;
    }
    const boosting = this.boostT > 0 || this.nitroT > 0;
    const vmax = st.vmax * (boosting ? 1.28 : 1);
    // газ всегда, тормоз — по кнопке
    if (inp.brake) {
      if (vf > 0.5) vf -= 26 * dt;
      else vf = Math.max(-9, vf - 8 * dt);
    } else if (vf < vmax) {
      vf += (st.accel * (1 - Math.max(0, vf) / vmax) + (boosting ? 18 : 0)) * dt;
      vf = Math.min(vf, vmax);
    } else vf += (vmax - vf) * Math.min(1, 1.6 * dt);
    // подъёмы чуть тормозят, спуски разгоняют
    const tr0 = track(T, this.x, this.z, this.hint);
    const sl = T.slope[tr0.i] * (fx * T.tx[tr0.i] + fz * T.tz[tr0.i]);
    vf -= sl * 9.8 * 0.35 * dt;

    // дрифт
    const steer = Math.max(-1, Math.min(1, inp.steer || 0));
    if (!this.drift && inp.drift && Math.abs(steer) > 0.25 && vf > 12) {
      this.drift = Math.sign(steer);
      this.driftT = 0;
      this.ev.push('driftStart');
    }
    if (this.drift && (!inp.drift || vf < 8)) {
      // отпустили — мини-турбо
      if (this.driftT > 1.7) this.boost(1.0, 'turbo2');
      else if (this.driftT > 0.75) this.boost(0.55, 'turbo1');
      this.drift = 0;
      this.driftT = 0;
      this.ev.push('driftEnd');
    }
    const sf = Math.min(1, Math.abs(vf) / 7) * (1 - 0.22 * Math.max(0, Math.min(1, (Math.abs(vf) - st.vmax * 0.55) / st.vmax)));
    let yaw;
    if (this.drift) {
      this.driftT += dt;
      this.nitro = Math.min(1, this.nitro + 0.12 * dt * (st.nitroFill / 0.1));
      const k = 1 + 0.55 * steer * this.drift;
      yaw = -this.drift * st.turn * 1.18 * k * sf;
    } else {
      yaw = -steer * st.turn * sf * Math.sign(vf || 1);
    }
    this.h += yaw * dt;
    // поворот вектора скорости за машиной (сцепление)
    fx = Math.sin(this.h);
    fz = Math.cos(this.h);
    lx = Math.cos(this.h);
    lz = -Math.sin(this.h);
    // скорость в новых осях: продольная задаётся газом, боковая гасится сцеплением
    let nf = vf;
    let nl = this.vx * lx + this.vz * lz;
    const grip = this.drift ? 2.6 : 10;
    nl = nl * Math.exp(-grip * dt);
    if (this.drift) nl += this.drift * vf * 0.6 * dt; // занос наружу
    // потеря скорости в повороте
    nf -= Math.abs(steer) * nf * (this.drift ? 0.05 : 0.09) * dt;
    this.vx = fx * nf + lx * nl;
    this.vz = fz * nf + lz * nl;
    this.vf = nf;

    this.boostT = Math.max(0, this.boostT - dt);
    if (this.nitroT > 0) this.nitroT = Math.max(0, this.nitroT - dt);
    else this.nitro = Math.min(1, this.nitro + 0.012 * dt);

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // бортики
    const tr = track(T, this.x, this.z, tr0.i);
    this.hint = tr.i;
    const lim = T.halfW - 0.75;
    this.hit = 0;
    if (Math.abs(tr.d) > lim) {
      const sg = Math.sign(tr.d);
      const nx = T.nx[tr.i],
        nz = T.nz[tr.i];
      const over = tr.d - sg * lim;
      this.x -= nx * over;
      this.z -= nz * over;
      const vn = this.vx * nx + this.vz * nz;
      if (vn * sg > 0) {
        this.vx -= nx * vn * 1.35;
        this.vz -= nz * vn * 1.35;
        const imp = Math.abs(vn);
        this.hit = imp;
        const k = Math.max(0.6, 1 - imp * 0.025);
        this.vx *= k;
        this.vz *= k;
        // доворачиваем вдоль трассы
        const th = Math.atan2(T.tx[tr.i], T.tz[tr.i]);
        let dh = th - this.h;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        if (Math.abs(dh) < 1.4) this.h += dh * Math.min(1, imp * 0.03);
        if (imp > 3) this.ev.push('hit:' + imp.toFixed(1));
      }
      tr.d = sg * lim;
    }
    this.d = tr.d;
    // прогресс по трассе (без разрывов)
    const L = T.n * STEP;
    const s = ((tr.s % L) + L) % L;
    let ds = s - this.sPrev;
    if (ds < -L / 2) ds += L;
    if (ds > L / 2) ds -= L;
    this.sTotal += ds;
    this.sPrev = s;
    // высота и наклон
    const ty = heightAt(T, s);
    this.y += (ty - this.y) * Math.min(1, dt * 20);
    this.pitch = Math.atan(T.slope[tr.i] * (fx * T.tx[tr.i] + fz * T.tz[tr.i]));
    // визуальный угол заноса относительно скорости
    const sp = this.speed;
    const slip = sp > 2 ? Math.atan2(this.vx * lx + this.vz * lz, this.vx * fx + this.vz * fz) : 0;
    this.yawVis += (slip - this.yawVis) * Math.min(1, dt * 8);
    this.steerVis += ((this.drift ? this.drift * 0.25 : steer * 0.45) - this.steerVis) * Math.min(1, dt * 10);
    // едем не туда
    const along = fx * T.tx[tr.i] + fz * T.tz[tr.i];
    if (along < -0.2 && sp > 1) this.wrongT += dt;
    else this.wrongT = Math.max(0, this.wrongT - dt * 2);
  }

  // вернуть на трассу по направлению движения (если долго едем задом)
  respawn() {
    const T = this.T;
    const i = this.hint;
    this.x = T.x[i];
    this.z = T.z[i];
    this.h = Math.atan2(T.tx[i], T.tz[i]);
    this.vx = T.tx[i] * 8;
    this.vz = T.tz[i] * 8;
    this.wrongT = 0;
    this.drift = 0;
  }

  // смещение и угол относительно трассы — для записи призрака
  yawRel() {
    const T = this.T,
      i = this.hint;
    let dh = this.h - Math.atan2(T.tx[i], T.tz[i]);
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    return dh;
  }
}
