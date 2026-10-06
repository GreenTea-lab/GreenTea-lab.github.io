// Бот проходит уровни на настоящей физике (без рендера). node tools/bot.mjs [уровень]
import { genLevel, LEVELS, PH } from '../src/data.js';
import { initLevel, tickLevel, makePlayer, stepPlayer } from '../src/physics.js';

const DT = 1 / 120;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function supported(lv, x, y, z) {
  for (const p of lv.plats) {
    if (p.fade && p.gone > 0) continue;
    if (Math.abs(p.cy - y) > 0.35) continue;
    const R = p.pillar || (p.disc && p.disc.r);
    if (R ? Math.hypot(x - p.cx, z - p.cz) < R : Math.abs(x - p.cx) < p.w / 2 && Math.abs(z - p.cz) < p.d / 2) return true;
  }
  return false;
}
// расстояние от точки до края цели в плоскости
function edgeDist(p, x, z, px, pz) {
  const R = p.pillar || (p.disc && p.disc.r);
  if (R) return Math.hypot(x - px, z - pz) - R;
  return Math.hypot(Math.max(0, Math.abs(x - px) - p.w / 2), Math.max(0, Math.abs(z - pz) - p.d / 2));
}
// решение бота на один шаг физики: куда бежать и прыгать ли. st = { ti, held, deaths }
export function decide(st, lv, P) {
  if (st.ti === undefined) Object.assign(st, { ti: 1, held: false, deaths: P.deaths });
  if (P.deaths !== st.deaths) {
    st.deaths = P.deaths;
    st.ti = P.cp + 1;
  }
  let ti = st.ti, held = st.held;
    const on = P.ground || (P.air < 0.15 && P.last);
    if (P.ground) ti = P.ground.id + 1;
    else if (on) ti = Math.max(ti, on.id + 1);
    if (ti >= lv.plats.length) ti = lv.plats.length - 1;
    const T = lv.plats[ti];
    const G = P.ground;
    // упреждение для движущейся цели (время полёта ~0.6 с)
    const lead = T.mv ? 0.6 : 0;
    let tx = T.cx + (T.vx || 0) * lead, tz = T.cz + (T.vz || 0) * lead;
    if (T.mv && T.mv.ax + T.mv.az !== 0) {
      const m = T.mv, ph = (lv.time + lead) * m.sp + m.ph;
      tx = T.x + m.ax * Math.sin(ph);
      tz = T.z + m.az * Math.sin(ph);
    }
    let dx = tx - P.x, dz = tz - P.z;
    const dist = Math.hypot(dx, dz) || 1;
    let go = 1, jump = false;
    if (G) {
      // точка своей платформы, ближайшая к цели: сначала идём к ней (балки, зигзаги)
      let qx = tx, qz = tz;
      const R = G.pillar || (G.disc && G.disc.r);
      const m = 0.12;
      if (R) {
        const d0 = Math.hypot(tx - G.cx, tz - G.cz) || 1;
        const k = Math.min(1, (R - m) / d0);
        qx = G.cx + (tx - G.cx) * k;
        qz = G.cz + (tz - G.cz) * k;
      } else {
        qx = Math.max(G.cx - G.w / 2 + m, Math.min(G.cx + G.w / 2 - m, tx));
        qz = Math.max(G.cz - G.d / 2 + m, Math.min(G.cz + G.d / 2 - m, tz));
      }
      // косилка: обходим центральный столб сбоку
      const bar = lv.bars.find((q) => Math.abs(q.x - G.cx) < 0.1 && Math.abs(q.z - G.cz) < 0.1);
      if (bar) {
        const fx = tx - G.cx, fz = tz - G.cz, fl = Math.hypot(fx, fz) || 1;
        const along = ((P.x - G.cx) * fx + (P.z - G.cz) * fz) / fl;
        if (along < 0.4) {
          qx = G.cx + (-fz / fl) * 1.6 + (fx / fl) * 0.6;
          qz = G.cz + (fx / fl) * 1.6 + (fz / fl) * 0.6;
        }
      }
      const atEdge = Math.hypot(qx - P.x, qz - P.z) < 0.5;
      if (!atEdge && G !== T) {
        dx = qx - P.x;
        dz = qz - P.z;
      }
      const reach = edgeDist(T, P.x, P.z, tx, tz);
      const dy = T.cy - P.y;
      const lim = (G.bounce ? 6 : dy <= 0 ? 4.1 : 4.1 - dy * 1.2) * (lv.theme.grav ? 1.15 : 1);
      // лифт-цель высоко — ждём; стоим на лифте — ждём, пока поднимет
      if (T.mv && T.mv.ay && T.cy > T.y + 0.6 && T !== G) go = atEdge ? 0 : 0.5;
      if (G.mv && G.mv.ay && T.cy > G.cy + 0.3) go = 0;
      const sp = Math.hypot(P.vx, P.vz);
      const hx = sp > 1 ? P.vx / sp : dx / (Math.hypot(dx, dz) || 1), hz = sp > 1 ? P.vz / sp : dz / (Math.hypot(dx, dz) || 1);
      const ahead = !supported(lv, P.x + hx * 0.4, P.y, P.z + hz * 0.4);
      // движущаяся вбок цель: прыгаем, когда она будет у пути
      let ready = true;
      if (T.mv && !T.mv.ay) ready = Math.hypot(tx - T.x, tz - T.z) < 1.0;
      if ((atEdge || ahead) && G !== T && !(bar && Math.hypot(P.x - G.cx, P.z - G.cz) < 2.6)) {
        if (reach < lim && go > 0 && ready) jump = true;
        else if (!ready) go = 0;
        else if (atEdge) go = 0;
      }
      if (dy > PH.step && reach < 0.9 && go > 0) jump = true;
      // косилка: прыгаем, когда планка подлетает
      for (const b of lv.bars) {
        if (Math.abs(b.y - P.y - 0.55) > 0.3) continue;
        const rx = P.x - b.x, rz = P.z - b.z;
        if (Math.hypot(rx, rz) > b.len + 0.6) continue;
        for (const s2 of b.two ? [1, -1] : [1]) {
          const a = Math.atan2(rx, rz);
          const d = wrap((a - (b.ang + (s2 < 0 ? Math.PI : 0))) * Math.sign(b.sp));
          const tt = d / Math.abs(b.sp);
          if (tt > 0.16 && tt < 0.42) {
            jump = true;
            go = 0.15;
          }
        }
      }
    } else {
      // в воздухе: тормозим над целью, чтобы не перелететь
      const ed = edgeDist(T, P.x, P.z, tx, tz);
      if (ed <= 0 && dist < 0.8) go = dist / 0.8;
      if (P.y > T.cy && ed <= 0) go = Math.min(go, 0.6);
    }
    const dl = Math.hypot(dx, dz) || 1;
    const ix = dx / dl, iz = dz / dl;
    if (jump) held = true;
    if (!G && P.vy < 0) held = false;
  st.ti = ti;
  st.held = held;
  return { x: ix * go, z: iz * go, jump, held: held || jump, ti };
}
export function play(L, limit = 900) {
  const lv = genLevel(L);
  initLevel(lv);
  const P = makePlayer(lv);
  const st = {};
  let t = 0;
  const deathAt = {};
  while (t < limit) {
    tickLevel(lv, DT);
    const inp = decide(st, lv, P);
    const ti = inp.ti;
    const ev = stepPlayer(P, lv, inp, DT);
    t += DT;
    if (ev.includes('finish')) return { L, ok: true, t: +t.toFixed(1), deaths: P.deaths, par: lv.par, deathAt };
    if (ev.includes('fall')) { const k = lv.plats[ti].seg + ':' + ti; deathAt[k] = (deathAt[k] || 0) + 1; if (P.deaths > 60) break; }
  }
  return { L, ok: false, t: +t.toFixed(1), deaths: P.deaths, at: st.ti, of: lv.plats.length, seg: lv.plats[st.ti] && lv.plats[st.ti].seg, deathAt };
}
if (typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`) {
  const only = +process.argv[2];
  let fail = 0;
  for (let L = only || 1; L <= (only || LEVELS); L++) {
    const r = play(L);
    if (!r.ok) fail++;
    console.log(JSON.stringify(r));
  }
  console.log(fail ? `не пройдено: ${fail}` : 'бот прошёл все уровни');
}
