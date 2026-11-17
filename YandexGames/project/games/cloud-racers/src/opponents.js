// Соперники: записи настоящих игроков («призраки» из асинхронного мультиплеера) и боты, которые
// занимают свободные места. Все соперники движутся в координатах трассы (s, d) и проходят сквозь игрока.
import { speedProfile, STEP, LAPS, rng } from './tracks.js';
import { CARS, PAINTS, carStats } from './cars.js';

export const SAMPLE = 0.1; // шаг записи, с
export const REC_VER = 1;

// ---------- запись заезда ----------
export class Recorder {
  constructor() {
    this.s = [];
    this.d = [];
    this.y = [];
    this.f = [];
    this.next = 0;
  }
  push(t, car, force) {
    if (force) this.next = Math.min(this.next, t);
    while (t >= this.next) {
      this.s.push(Math.round(car.sTotal * 10));
      this.d.push(Math.round(car.d * 10));
      this.y.push(Math.round((car.yawRel() * 180) / Math.PI));
      this.f.push((car.boostT > 0 || car.nitroT > 0 ? 1 : 0) | (car.drift ? 2 : 0));
      this.next += SAMPLE;
    }
  }
  // компактная строка: приращения s, d, угол, флаги
  encode() {
    const out = [];
    let ps = 0;
    for (let i = 0; i < this.s.length; i++) {
      out.push((this.s[i] - ps).toString(36) + ',' + this.d[i].toString(36) + ',' + this.y[i].toString(36) + (this.f[i] ? ',' + this.f[i] : ''));
      ps = this.s[i];
    }
    return out.join(';');
  }
}

export function decode(str) {
  const parts = String(str).split(';');
  const s = new Float32Array(parts.length),
    d = new Float32Array(parts.length),
    y = new Float32Array(parts.length),
    f = new Uint8Array(parts.length);
  let ps = 0;
  for (let i = 0; i < parts.length; i++) {
    const a = parts[i].split(',');
    ps += parseInt(a[0], 36);
    s[i] = ps / 10;
    d[i] = parseInt(a[1], 36) / 10;
    y[i] = (parseInt(a[2], 36) * Math.PI) / 180;
    f[i] = a[3] ? +a[3] : 0;
    if (!isFinite(s[i]) || !isFinite(d[i]) || !isFinite(y[i])) return null;
  }
  return { s, d, y, f };
}

// разбор сессии SDK: [{id, meta, player:{name}, timeline:[{payload}]}] → призрак или null
export function parseSession(sess, T, startS) {
  try {
    let head = null,
      data = '',
      fin = 0;
    const chunks = [];
    for (const tx of sess.timeline || []) {
      let p = tx.payload;
      if (typeof p === 'string') {
        try {
          p = JSON.parse(p);
        } catch (e) {
          continue;
        }
      }
      if (!p || typeof p !== 'object') continue;
      if (p.h) head = p;
      if (typeof p.c === 'string') chunks[p.k | 0] = p.c;
      if (p.fin) fin = +p.fin;
    }
    data = chunks.join('');
    if (!head || head.v !== REC_VER || head.tr !== T.idx || !data || !fin) return null;
    const rec = decode(data);
    if (!rec || rec.s.length < 50) return null;
    // проверка правдоподобия: старт на месте, без телепортов, финиш достигнут
    const L = T.n * STEP;
    if (Math.abs(rec.s[0] - startS) > 3) return null;
    for (let i = 1; i < rec.s.length; i++) {
      const ds = rec.s[i] - rec.s[i - 1];
      if (ds > 7.5 || ds < -3) return null;
      if (Math.abs(rec.d[i]) > T.halfW + 0.5) return null;
    }
    if (rec.s[rec.s.length - 1] < LAPS * L - 1) return null;
    const finT = rec.s.findIndex((v) => v >= LAPS * L);
    const time = finT < 0 ? fin : finT * SAMPLE;
    if (time < (LAPS * L) / 55) return null;
    const car = CARS.some((c) => c.id === head.car) ? head.car : 'bug';
    const paint = PAINTS.includes(head.p) ? head.p : PAINTS[0];
    const name = String((sess.player && sess.player.name) || head.n || '').slice(0, 18);
    return { kind: 'ghost', rec, car, paint, name, time };
  } catch (e) {
    return null;
  }
}

// заголовок и куски данных для commit()
export function sessionPayloads(rec, T, carId, paint, name, finTime) {
  const head = { h: 1, v: REC_VER, tr: T.idx, car: carId, p: paint, n: String(name || '').slice(0, 18) };
  const str = rec.encode();
  const CH = 6000;
  const chunks = [];
  for (let k = 0; k * CH < str.length; k++) chunks.push({ k, c: str.slice(k * CH, (k + 1) * CH) });
  return [head, ...chunks, { fin: Math.round(finTime * 1000) / 1000 }];
}

// ---------- имена ботов ----------
const NAMES_RU = ['Алёна', 'Миша', 'Даня', 'Катя', 'Артём', 'Соня', 'Лёша К.', 'Вика', 'Тимур', 'Полина', 'Илья', 'Настя', 'Егор', 'Маша П.', 'Кирилл', 'Ксюша', 'Дима', 'Аня', 'Рома', 'Лиза', 'Саша', 'Ваня', 'Варя', 'Никита', 'Оля', 'Гоша', 'Женя', 'Таня', 'Марк', 'Ева'];
const NAMES_EN = ['Alex', 'Mia', 'Leo', 'Emma', 'Noah', 'Lily', 'Max', 'Zoe', 'Sam', 'Ella', 'Jack', 'Ava', 'Ben', 'Ivy', 'Luke', 'Ruby', 'Finn', 'Nora', 'Theo', 'Chloe'];

export function botNames(lang, k, seed) {
  const R = rng(seed);
  const pool = lang === 'ru' ? NAMES_RU.concat(NAMES_EN.slice(0, 5)) : NAMES_EN.concat(['Kai', 'Luna', 'Oscar', 'Isla', 'Hugo']);
  const a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

// ---------- бот ----------
// skill 0.8..1 — доля от идеального профиля скорости
export function makeBot(T, { name, carId, ups, paint, skill, seed, laneBias }) {
  const st = carStats(carId, ups);
  const prof = speedProfile(T, st.vmax, st.turn, st.accel);
  return { kind: 'bot', name, car: carId, paint, st, prof, skill, R: rng(seed), laneBias, v: 0, mistakeT: 0, boostT: 0, wob: 0 };
}

// ---------- соперник на трассе ----------
export class Opponent {
  constructor(T, src, gridS, gridD, playerStartS) {
    this.T = T;
    this.src = src;
    this.name = src.name;
    this.car = src.car;
    this.paint = src.paint;
    this.kind = src.kind;
    this.gridS = gridS;
    this.gridD = gridD;
    this.offS = gridS - playerStartS; // призрак записан со стартовой позиции игрока
    this.s = gridS;
    this.d = gridD;
    this.yaw = 0;
    this.flags = 0;
    this.v = 0;
    this.finished = false;
    this.finishTime = 0;
    this.i = 0;
  }

  // t — время гонки (до старта отрицательное или 0)
  update(t, dt, playerS) {
    const T = this.T;
    const L = T.n * STEP;
    if (this.kind === 'ghost') {
      const r = this.src.rec;
      const f = Math.max(0, t / SAMPLE);
      const i = Math.min(r.s.length - 1, Math.floor(f));
      const j = Math.min(r.s.length - 1, i + 1);
      const k = f - i;
      // стартовая решётка: смещение плавно уходит за первые секунды
      const fade = Math.max(0, 1 - t / 7);
      let s = r.s[i] + (r.s[j] - r.s[i]) * k;
      let d = r.d[i] + (r.d[j] - r.d[i]) * k;
      if (i >= r.s.length - 1) {
        // после конца записи — катится дальше
        const extra = (t - (r.s.length - 1) * SAMPLE) * 18;
        s = r.s[r.s.length - 1] + Math.max(0, extra);
      }
      const ps = this.s;
      this.s = s + this.offS * fade;
      this.d = d * (1 - fade) + this.gridD * fade;
      this.yaw = r.y[i];
      this.flags = r.f[i];
      this.v = dt > 0 ? (this.s - ps) / dt : 0;
      if (!this.finished && s >= LAPS * L) {
        this.finished = true;
        this.finishTime = this.src.time;
      }
      return;
    }
    // бот
    const b = this.src;
    if (t <= 0) {
      this.s = this.gridS;
      this.d = this.gridD;
      this.v = 0;
      return;
    }
    const idx = ((Math.floor(this.s / STEP) % T.n) + T.n) % T.n;
    let target = b.prof[idx] * b.skill;
    // лёгкая «резинка»: далеко впереди — чуть сбрасывает, далеко позади — поджимает
    const gap = this.s - playerS;
    if (gap > 60) target *= 0.965;
    else if (gap < -80) target *= 1.03;
    // ошибки
    b.mistakeT -= dt;
    if (b.mistakeT < -2 && b.R() < dt * 0.035) b.mistakeT = 0.8 + b.R() * 0.8;
    if (b.mistakeT > 0) target *= 0.78;
    // ускорители на трассе
    for (const p of T.boosts) {
      const ds = ((this.s - p.i * STEP) % L + L) % L;
      if (ds < 1.2 && Math.abs(this.d - p.d) < 2.2 && b.boostT <= 0) b.boostT = 1.1;
    }
    if (b.boostT > 0) {
      b.boostT -= dt;
      target = Math.max(target, b.st.vmax * 1.25);
    }
    if (this.finished) target = Math.min(target, 16);
    const acc = target > this.v ? b.st.accel * (b.boostT > 0 ? 2.2 : 1) : 22;
    this.v += Math.max(-acc * dt, Math.min(acc * dt, target - this.v));
    this.s += this.v * dt;
    // поперёк: гоночная линия + личное смещение + покачивание
    b.wob += dt * (0.4 + b.R() * 0.2);
    const want = T.line[idx] * 0.9 + b.laneBias + Math.sin(b.wob) * 0.9;
    const lim = T.halfW - 0.9;
    const tgt = Math.max(-lim, Math.min(lim, want));
    const pd = this.d;
    this.d += Math.max(-4 * dt, Math.min(4 * dt, tgt - this.d));
    // угол: по направлению движения + занос в крутых поворотах
    const lat = dt > 0 ? (this.d - pd) / dt : 0;
    const drift = Math.abs(T.k[idx]) > 0.035 && this.v > 18 ? Math.sign(T.k[idx]) * 0.25 : 0;
    this.yaw += (Math.atan2(lat, Math.max(5, this.v)) + drift - this.yaw) * Math.min(1, dt * 6);
    this.flags = (b.boostT > 0 ? 1 : 0) | (drift ? 2 : 0);
    if (!this.finished && this.s >= LAPS * L) {
      this.finished = true;
      this.finishTime = t;
    }
  }

  // прогноз времени финиша (для таблицы результатов, если ещё едет)
  estimate(t) {
    if (this.finished) return this.finishTime;
    if (this.kind === 'ghost') return this.src.time;
    const L = this.T.n * STEP;
    const left = LAPS * L - this.s;
    let avg = 0;
    for (let i = 0; i < this.T.n; i += 5) avg += this.src.prof[i] * this.src.skill;
    avg /= Math.ceil(this.T.n / 5);
    return t + left / Math.max(10, avg);
  }
}
