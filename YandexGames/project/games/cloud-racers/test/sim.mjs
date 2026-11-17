// Быстрая симуляция физики без браузера: автопилот с дрифтом и без
import { buildTrack, speedProfile, STEP, LAPS } from '../src/tracks.js';
import { PlayerCar } from '../src/physics.js';
import { carStats } from '../src/cars.js';
function race(idx, mode, car = 'bug', ups = [0, 0, 0, 0]) {
  const T = buildTrack(idx);
  const st = carStats(car, ups);
  const p = new PlayerCar(T, st, -20, -3);
  const prof = speedProfile(T, st.vmax, st.turn, st.accel);
  const dt = 1 / 60;
  let t = 0, hits = 0, drifts = 0, turbos = 0, wasDrift = 0;
  while (p.sTotal < LAPS * T.n * STEP && t < 300) {
    const i = p.hint, n = T.n;
    const look = 9 + Math.floor(p.speed * 0.35);
    const j = (i + look) % n;
    const tx = T.x[j] + T.nx[j] * T.line[j] * 0.85, tz = T.z[j] + T.nz[j] * T.line[j] * 0.85;
    let dh = p.h - Math.atan2(tx - p.x, tz - p.z);
    while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, dh * 2.6));
    const vlim = prof[(i + 6) % n] * 1.04;
    let drift = false;
    if (mode === 'drift') drift = p.drift ? Math.abs(T.k[(i + 5) % n]) > 0.012 : Math.abs(steer) > 0.45 && Math.abs(T.k[(i + 10) % n]) > 0.02;
    const inp = { steer, brake: mode !== 'nobrake' && p.vf > vlim + 1.5 && !p.drift, drift, nitro: mode !== 'nonitro' && p.nitro >= 1 && Math.abs(steer) < 0.2 };
    if (inp.nitro) p.useNitro();
    p.step(dt, inp, false);
    for (const e of p.ev) { if (e.startsWith('hit')) hits++; if (e.startsWith('boost:turbo')) turbos++; if (e === 'driftStart') drifts++; }
    p.ev.length = 0;
    t += dt;
  }
  return { t: t.toFixed(2), hits, drifts, turbos };
}
for (const idx of [0, 2, 5, 6, 7, 8, 9, 10, 11]) console.log(idx, 'plain', JSON.stringify(race(idx, 'plain')), 'drift', JSON.stringify(race(idx, 'drift')), 'max', JSON.stringify(race(idx, 'plain', 'rocket', [5, 5, 5, 5])));
