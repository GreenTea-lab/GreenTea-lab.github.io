// Физика паркура без рендера: состояние уровня (движущиеся, исчезающие, вращающиеся платформы, косилки)
// и персонаж-цилиндр с прыжком, «временем койота», буфером прыжка, ступеньками и переносом на платформах
import { PH } from './data.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// подготовить уровень к игре: текущие позиции и скорости платформ
export function initLevel(lv) {
  for (const p of lv.plats) {
    p.cx = p.x;
    p.cy = p.y;
    p.cz = p.z;
    p.vx = p.vy = p.vz = 0;
    p.gone = 0;
    p.fadeT = 0;
    p.ang = 0;
  }
  for (const b of lv.bars) b.ang = b.ph;
  for (const c of lv.coins) c.got = false;
  lv.time = 0;
}

export function tickLevel(lv, dt) {
  lv.time += dt;
  const t = lv.time;
  for (const p of lv.plats) {
    if (p.mv) {
      const m = p.mv;
      const s = Math.sin(t * m.sp + m.ph),
        c = Math.cos(t * m.sp + m.ph) * m.sp;
      // лифт ходит от низа вверх (0..2·ay), остальные — в обе стороны
      const k = m.ay ? (s + 1) / 2 : s;
      const kv = m.ay ? c / 2 : c;
      p.cx = p.x + m.ax * k;
      p.cy = p.y + m.ay * 2 * k;
      p.cz = p.z + m.az * k;
      p.vx = m.ax * kv;
      p.vy = m.ay * 2 * kv;
      p.vz = m.az * kv;
    }
    if (p.disc) p.ang += p.disc.w * dt;
    if (p.fade) {
      if (p.gone > 0) {
        p.gone -= dt;
        if (p.gone <= 0) p.fadeT = 0;
      } else if (p.fadeT > 0) {
        p.fadeT += dt;
        if (p.fadeT > 0.6) {
          p.gone = 2.4;
          p.fadeT = 0;
        }
      }
    }
  }
  for (const b of lv.bars) b.ang += b.sp * dt;
}

const solid = (p) => !(p.fade && p.gone > 0);
const isRound = (p) => p.pillar || p.disc;
const radius = (p) => p.pillar || (p.disc && p.disc.r);

// расстояние от точки до формы платформы в плоскости XZ (0 — внутри) и нормаль выталкивания
function xzDist(p, x, z) {
  if (isRound(p)) {
    const dx = x - p.cx,
      dz = z - p.cz;
    const d = Math.hypot(dx, dz);
    const R = radius(p);
    if (d < 1e-6) return { d: -R, nx: 1, nz: 0 };
    return { d: d - R, nx: dx / d, nz: dz / d };
  }
  const hx = p.w / 2,
    hz = p.d / 2;
  const qx = clamp(x, p.cx - hx, p.cx + hx),
    qz = clamp(z, p.cz - hz, p.cz + hz);
  const dx = x - qx,
    dz = z - qz;
  const d = Math.hypot(dx, dz);
  if (d > 1e-6) return { d, nx: dx / d, nz: dz / d };
  // центр внутри прямоугольника — выталкиваем по ближайшей стороне
  const ex = hx - Math.abs(x - p.cx),
    ez = hz - Math.abs(z - p.cz);
  if (ex < ez) return { d: -ex, nx: Math.sign(x - p.cx) || 1, nz: 0 };
  return { d: -ez, nx: 0, nz: Math.sign(z - p.cz) || 1 };
}

export function makePlayer(lv) {
  const s = lv.plats[0];
  return { x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 0, yaw: 0, ground: null, coy: 0, buf: 0, cp: 0, hitT: 0, air: 0, deaths: 0, onIce: false };
}

// опора под ногами (верх платформы рядом со стопой)
function support(P, lv, r) {
  let best = null;
  for (const p of lv.plats) {
    if (!solid(p)) continue;
    const top = p.cy;
    if (P.y < top - 0.08 || P.y > top + 0.06) continue;
    if (xzDist(p, P.x, P.z).d < r) {
      if (!best || top > best.cy) best = p;
    }
  }
  return best;
}

// один шаг физики. inp: { x, z (направление в мире, длина 0..1), jump (нажали), held (держат) }
export function stepPlayer(P, lv, inp, dt) {
  const ev = [];
  const th = lv.theme;
  const gm = th.grav || 1;
  const r = PH.r;
  // перенос платформой
  const g = P.ground;
  if (g) {
    if (g.mv) {
      P.x += g.vx * dt;
      P.z += g.vz * dt;
      if (g.vy) P.y = g.cy;
    }
    if (g.disc) {
      const a = g.disc.w * dt;
      const dx = P.x - g.cx,
        dz = P.z - g.cz;
      const c = Math.cos(a),
        s = Math.sin(a);
      P.x = g.cx + dx * c - dz * s;
      P.z = g.cz + dx * s + dz * c;
      P.yaw -= a;
    }
    if (g.fade && g.fadeT === 0 && g.gone <= 0) {
      g.fadeT = 0.001;
      ev.push('crack');
    }
  }
  // управление
  const ice = th.ice && !!g;
  const tx = inp.x * PH.speed,
    tz = inp.z * PH.speed;
  const m = Math.hypot(inp.x, inp.z);
  let acc = g ? (ice ? 9 : m < 0.05 ? PH.accG * 1.4 : PH.accG) : PH.accA;
  if (P.hitT > 0) {
    P.hitT -= dt;
    acc *= 0.2;
  }
  const dvx = tx - P.vx,
    dvz = tz - P.vz;
  const dv = Math.hypot(dvx, dvz);
  const maxDv = acc * dt;
  if (dv <= maxDv) {
    P.vx = tx;
    P.vz = tz;
  } else {
    P.vx += (dvx / dv) * maxDv;
    P.vz += (dvz / dv) * maxDv;
  }
  if (Math.hypot(P.vx, P.vz) > 0.4 && m > 0.05) {
    const want = Math.atan2(P.vx, P.vz);
    let d = want - P.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    P.yaw += d * Math.min(1, dt * 14);
  }
  // прыжок с «временем койота» и буфером
  if (g) P.coy = PH.coyote;
  else P.coy -= dt;
  if (inp.jump) P.buf = PH.buffer;
  else P.buf -= dt;
  if (P.buf > 0 && P.coy > 0) {
    P.vy = PH.jump * (gm < 1 ? 0.86 : 1);
    if (g && g.mv && g.vy > 0) P.vy += g.vy * 0.5;
    P.ground = null;
    P.coy = 0;
    P.buf = 0;
    P.jmp = true;
    P.jt = 0;
    ev.push('jump');
  }
  // гравитация; отпустил прыжок рано — прыжок ниже
  const G = PH.grav * gm;
  // короткий тап всё равно даёт заметный прыжок: срез высоты только после 0,12 с
  P.jt = (P.jt || 0) + dt;
  if (!P.ground) {
    P.vy -= G * dt * (P.vy > 0 && P.jmp && !inp.held && P.jt > 0.12 ? 1.9 : 1);
    P.vy = Math.max(P.vy, -32);
  }
  // движение по горизонтали с выталкиванием и ступеньками
  P.x += P.vx * dt;
  P.z += P.vz * dt;
  for (const p of lv.plats) {
    if (!solid(p)) continue;
    const top = p.cy,
      bot = p.cy - p.t;
    if (P.y >= top - 0.02 || P.y + PH.h <= bot) continue;
    if (Math.abs(P.x - p.cx) > (p.w || 0) / 2 + 3 || Math.abs(P.z - p.cz) > (p.d || 0) / 2 + 3) continue;
    const q = xzDist(p, P.x, P.z);
    if (q.d >= r) continue;
    if (top - P.y <= PH.step && P.vy <= 0.5) {
      // ступенька: шагаем наверх
      P.y = top;
      P.vy = 0;
      P.ground = p;
      continue;
    }
    const push = r - q.d;
    P.x += q.nx * push;
    P.z += q.nz * push;
    const vn = P.vx * q.nx + P.vz * q.nz;
    if (vn < 0) {
      P.vx -= vn * q.nx;
      P.vz -= vn * q.nz;
    }
  }
  // движение по вертикали: приземление и удар головой
  const prevY = P.y;
  if (!P.ground) P.y += P.vy * dt;
  let landed = null;
  for (const p of lv.plats) {
    if (!solid(p)) continue;
    const q = xzDist(p, P.x, P.z);
    if (q.d >= r * 0.8) continue;
    const top = p.cy,
      bot = p.cy - p.t;
    if (P.vy <= 0 && prevY >= top - 0.06 - Math.max(0, -p.vy * dt) && P.y <= top) {
      if (!landed || top > landed.cy) landed = p;
    } else if (P.vy > 0 && prevY + PH.h <= bot + 0.05 && P.y + PH.h > bot) {
      P.y = bot - PH.h;
      P.vy = 0;
    }
  }
  if (landed) {
    const impact = -P.vy;
    P.y = landed.cy;
    P.vy = 0;
    if (!P.ground) ev.push(impact > 6 ? 'landHard' : 'land');
    P.ground = landed;
    P.last = landed;
    P.air = 0;
    P.jmp = false;
    if (landed.bounce) {
      P.vy = PH.bounce * (gm < 1 ? 0.82 : 1);
      P.ground = null;
      ev.push('bounce');
    }
  } else if (P.ground) {
    const s = support(P, lv, r * 0.8);
    if (s) {
      P.ground = s;
      P.y = s.cy;
    } else P.ground = null;
  }
  if (P.ground) P.air = 0;
  else P.air += dt;
  // косилки: столб в центре — препятствие, планка сбивает
  for (const b of lv.bars) {
    if (P.y < b.y + 0.5 && P.y + PH.h > b.y - 0.6) {
      const dx = P.x - b.x,
        dz = P.z - b.z;
      const d = Math.hypot(dx, dz);
      const R0 = 0.38 + r;
      if (d < R0 && d > 1e-6) {
        P.x = b.x + (dx / d) * R0;
        P.z = b.z + (dz / d) * R0;
      }
    }
  }
  for (const b of lv.bars) {
    if (P.y > b.y + 0.25 || P.y + PH.h < b.y - 0.25) continue;
    for (const sgn of b.two ? [1, -1] : [1]) {
      const ax = Math.sin(b.ang) * b.len * sgn,
        az = Math.cos(b.ang) * b.len * sgn;
      // ближайшая точка отрезка от центра до конца
      const k = clamp(((P.x - b.x) * ax + (P.z - b.z) * az) / (b.len * b.len), 0, 1);
      const qx = b.x + ax * k,
        qz = b.z + az * k;
      const d = Math.hypot(P.x - qx, P.z - qz);
      if (d < r + 0.24 && P.hitT <= 0) {
        // толкает по направлению вращения и наружу
        const tx = Math.cos(b.ang) * Math.sign(b.sp) * sgn,
          tz = -Math.sin(b.ang) * Math.sign(b.sp) * sgn;
        const ox = (P.x - b.x) / (Math.hypot(P.x - b.x, P.z - b.z) || 1),
          oz = (P.z - b.z) / (Math.hypot(P.x - b.x, P.z - b.z) || 1);
        P.vx = tx * 6.5 + ox * 2;
        P.vz = tz * 6.5 + oz * 2;
        P.vy = 5;
        P.ground = null;
        P.hitT = 0.45;
        P.jmp = false;
        ev.push('hit');
      }
    }
  }
  // монеты
  for (const c of lv.coins) {
    if (c.got) continue;
    const dx = P.x - c.x,
      dy = P.y + 0.8 - c.y,
      dz = P.z - c.z;
    if (dx * dx + dy * dy + dz * dz < 1.05) {
      c.got = true;
      ev.push('coin');
    }
  }
  // чекпоинт и финиш
  if (P.ground) {
    if (P.ground.cp && P.cp !== P.ground.id) {
      P.cp = P.ground.id;
      ev.push('cp');
    }
    if (P.ground.finish) ev.push('finish');
  }
  // падение
  if (P.y < lv.kill) {
    respawn(P, lv);
    P.deaths++;
    ev.push('fall');
  }
  return ev;
}

// направление пути от платформы (для разворота после возрождения)
export function pathYaw(lv, id) {
  const a = lv.plats[id],
    b = lv.plats[Math.min(lv.plats.length - 1, id + 1)];
  if (a === b) return 0;
  return Math.atan2(b.x - a.x, b.z - a.z);
}

export function respawn(P, lv) {
  const p = lv.plats[P.cp] || lv.plats[0];
  P.x = p.x;
  P.y = p.y + 0.02;
  P.z = p.z;
  P.vx = P.vy = P.vz = 0;
  P.ground = null;
  P.hitT = 0;
  P.yaw = pathYaw(lv, p.id);
}
