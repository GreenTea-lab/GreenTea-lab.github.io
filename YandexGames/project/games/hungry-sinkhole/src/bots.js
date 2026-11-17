import { canEatHole, fitOf, safe } from './sim.js';
// Боты-дыры: ищут, где вкусно (много влезающих предметов), гоняются за мелкими дырами и удирают от крупных
export function botThink(sim, h, dt) {
  if (!h.alive) return;
  h.think = (h.think || 0) - dt;
  if (h.think <= 0) {
    h.think = 0.3 + (1 - h.skill) * 0.7 + sim.rnd() * 0.3;
    // ленивые иногда отвлекаются и просто катаются
    if (h.lazy && !h.flee && sim.rnd() < h.lazy * 0.25) {
      const lim = sim.half - 6, a = sim.rnd() * Math.PI * 2;
      h.tx = Math.max(-lim, Math.min(lim, h.x + Math.cos(a) * 14));
      h.tz = Math.max(-lim, Math.min(lim, h.z + Math.sin(a) * 14));
      h.roam = sim.time + 1.5 + sim.rnd() * 2;
    } else plan(sim, h);
  }
  let dx = h.tx - h.x, dz = h.tz - h.z;
  let d = Math.hypot(dx, dz);
  if (h.flee) {
    dx = h.fx;
    dz = h.fz;
    d = 1;
  }
  if (d < 0.6) {
    h.throttle = 0.2;
    return;
  }
  // плавный поворот
  const want = Math.atan2(dx, dz);
  let cur = h.ang == null ? want : h.ang;
  let da = want - cur;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  cur += Math.max(-1, Math.min(1, da)) * Math.min(1, dt * (3 + h.skill * 3));
  h.ang = cur;
  h.dirX = Math.sin(cur);
  h.dirZ = Math.cos(cur);
  h.throttle = h.flee ? 1 : Math.min(1, 0.55 + d / 6) * (0.82 + h.skill * 0.18);
}

function plan(sim, h) {
  const lim = sim.half - 6;
  // нет прогресса несколько секунд — цель «несъедобна», едем в другое место
  if (h.pts !== h.lastPts) {
    h.lastPts = h.pts;
    h.stallT = sim.time;
  } else if (sim.time - (h.stallT || 0) > 3.5 && !h.roam) {
    const a = sim.rnd() * Math.PI * 2;
    h.tx = Math.max(-lim, Math.min(lim, h.x + Math.cos(a) * 30));
    h.tz = Math.max(-lim, Math.min(lim, h.z + Math.sin(a) * 30));
    h.roam = sim.time + 3;
    h.stallT = sim.time;
  }
  if (h.roam) {
    if (sim.time < h.roam && Math.hypot(h.tx - h.x, h.tz - h.z) > 3) return;
    h.roam = 0;
  }
  // угрозы и добыча
  let fx = 0, fz = 0, prey = null, pd = 1e9;
  for (const o of sim.holes) {
    if (o === h || !o.alive) continue;
    const d = Math.hypot(o.x - h.x, o.z - h.z);
    if (canEatHole(o, h) && d < o.r + (6 + h.skill * 8) * (h.fear ?? 1)) {
      const w = 1 / Math.max(1, d - o.r);
      fx += ((h.x - o.x) / (d || 1)) * w;
      fz += ((h.z - o.z) / (d || 1)) * w;
    } else if (canEatHole(h, o) && !safe(o) && d < (h.hunt ?? 16) + h.r * 2 && h.aggro > 0.3) {
      // охотники особенно любят гоняться за игроком
      const dd = o.me && h.likesPlayer ? d * 0.5 : d;
      if (dd < pd) {
        pd = dd;
        prey = o;
      }
    }
  }
  h.flee = false;
  if (fx || fz) {
    // у стены разворачиваемся вдоль неё
    const L = Math.hypot(fx, fz);
    fx /= L;
    fz /= L;
    if (Math.abs(h.x + fx * 8) > lim) fx = 0;
    if (Math.abs(h.z + fz * 8) > lim) fz = 0;
    if (fx || fz) {
      h.flee = true;
      h.fx = fx;
      h.fz = fz;
      return;
    }
  }
  if (prey && sim.rnd() < h.aggro) {
    const lead = 0.2 + (h.lead ?? 0.2) * Math.min(1.5, pd / 8);
    h.tx = prey.x + prey.vx * lead;
    h.tz = prey.z + prey.vz * lead;
    return;
  }
  // бонус рядом — заезжаем за ним (умные чаще)
  if (sim.pickups.length && sim.rnd() < 0.25 + h.skill * 0.5) {
    let pk = null, pdist = 10 + h.r * 2;
    for (const p of sim.pickups) {
      const d = Math.hypot(p.x - h.x, p.z - h.z);
      if (d < pdist) {
        pdist = d;
        pk = p;
      }
    }
    if (pk) {
      h.tx = pk.x;
      h.tz = pk.z;
      return;
    }
  }
  // золотая цель рядом — умные боты за ней охотятся
  const G = sim.gold;
  if (G && G.st !== 2 && fitOf(G) < h.r * 1.9 && sim.rnd() < h.skill * 0.6 && Math.hypot(G.p.x - h.x, G.p.z - h.z) < 18 + h.r * 3) {
    h.tx = G.p.x;
    h.tz = G.p.z;
    return;
  }
  // еда: проверяем несколько точек вокруг, держимся текущей цели, если она ещё вкусная
  const R = 10 + h.r * 3;
  let best = null, bv = 0;
  const tries = 5 + Math.round(h.skill * 6);
  const cand = [];
  if (h.tx != null) cand.push([h.tx, h.tz, 1.25]);
  for (let i = 0; i < tries; i++) {
    const a = sim.rnd() * Math.PI * 2, d = 3 + sim.rnd() * R;
    cand.push([h.x + Math.cos(a) * d, h.z + Math.sin(a) * d, 1]);
  }
  for (const [x, z, bonus] of cand) {
    if (Math.abs(x) > lim || Math.abs(z) > lim) continue;
    let v = 0;
    sim.query(x, z, h.r + 2, (it) => {
      if (it.st === 2 || fitOf(it) >= h.r * 1.9 || it.p.y > it.rad + 0.3) return;
      if (Math.hypot(it.p.x - x, it.p.z - z) > h.r + 2) return;
      v += Math.min(it.vol, 30) + it.pts * 0.05;
    });
    v = (v * bonus) / (6 + Math.hypot(x - h.x, z - h.z));
    if (v > bv) {
      bv = v;
      best = [x, z];
    }
  }
  if (best) {
    h.tx = best[0];
    h.tz = best[1];
  } else if (h.tx == null || Math.hypot(h.tx - h.x, h.tz - h.z) < 2) {
    h.tx = (sim.rnd() * 2 - 1) * lim;
    h.tz = (sim.rnd() * 2 - 1) * lim;
  }
}
