// Трассы: процедурные замкнутые кольца (звёздная кривая r(θ) — гарантированно без самопересечений),
// равномерная выборка по длине, кривизна, гоночная линия и профиль скорости для ботов.
export const LAPS = 3;
export const STEP = 1; // шаг выборки, м

export const THEMES = ['meadow', 'beach', 'snow', 'night'];

// 12 трасс: по 3 на тему
export const TRACKS = [
  { theme: 'meadow', seed: 11, R: 105, sx: 1.15, sz: 0.9, amp: 0.2, harm: [2, 3], hAmp: 3, width: 14 },
  { theme: 'meadow', seed: 12, R: 118, sx: 1.0, sz: 1.0, amp: 0.26, harm: [2, 3, 4], hAmp: 5, width: 13.5 },
  { theme: 'meadow', seed: 13, R: 125, sx: 1.25, sz: 0.85, amp: 0.3, harm: [3, 4], hAmp: 6, width: 13 },
  { theme: 'beach', seed: 21, R: 112, sx: 1.2, sz: 0.95, amp: 0.24, harm: [2, 4], hAmp: 4, width: 13.5 },
  { theme: 'beach', seed: 22, R: 126, sx: 1.05, sz: 1.05, amp: 0.3, harm: [2, 3, 5], hAmp: 6, width: 13 },
  { theme: 'beach', seed: 23, R: 132, sx: 1.25, sz: 0.88, amp: 0.36, harm: [3, 5, 7], hAmp: 7, width: 12.5 },
  { theme: 'snow', seed: 31, R: 120, sx: 1.1, sz: 1.0, amp: 0.36, harm: [2, 4, 6], hAmp: 7, width: 13 },
  { theme: 'snow', seed: 32, R: 130, sx: 1.2, sz: 0.9, amp: 0.4, harm: [3, 5, 7], hAmp: 8, width: 12.5 },
  { theme: 'snow', seed: 33, R: 136, sx: 1.0, sz: 1.1, amp: 0.42, harm: [2, 5, 8], hAmp: 9, width: 12.5 },
  { theme: 'night', seed: 41, R: 128, sx: 1.15, sz: 0.95, amp: 0.42, harm: [3, 6, 8], hAmp: 7, width: 13 },
  { theme: 'night', seed: 42, R: 136, sx: 1.2, sz: 0.92, amp: 0.45, harm: [2, 5, 7, 9], hAmp: 9, width: 12.5 },
  { theme: 'night', seed: 43, R: 142, sx: 1.1, sz: 1.05, amp: 0.48, harm: [3, 5, 8, 10], hAmp: 10, width: 12 },
];

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// кривая по углу θ
function curveFn(def, H) {
  return (th) => {
    let r = 1;
    for (const h of H.r) r += h.a * Math.cos(h.k * th + h.p);
    let y = 0;
    for (const h of H.y) y += h.a * Math.sin(h.k * th + h.p);
    return [Math.cos(th) * r * def.R * def.sx, y, Math.sin(th) * r * def.R * def.sz];
  };
}

function harmonics(def, scale) {
  const R = rng(def.seed);
  const r = def.harm.map((k, i) => ({ k, a: (def.amp / def.harm.length) * (0.7 + R() * 0.6) * (i === 0 ? 1.4 : 1) * scale, p: R() * Math.PI * 2 }));
  const y = [1, 2, 3].map((k) => ({ k, a: def.hAmp * (k === 1 ? 0.5 : k === 2 ? 0.35 : 0.15) * (0.6 + R() * 0.8), p: R() * Math.PI * 2 }));
  return { r, y };
}

// плотная выборка и перевыборка по длине
function sample(def, H) {
  const f = curveFn(def, H);
  const N = 4000;
  const raw = [];
  let len = 0;
  let prev = f(0);
  raw.push({ p: prev, l: 0 });
  for (let i = 1; i <= N; i++) {
    const p = f((i / N) * Math.PI * 2);
    len += Math.hypot(p[0] - prev[0], p[2] - prev[2]);
    raw.push({ p, l: len });
    prev = p;
  }
  const n = Math.round(len / STEP);
  const pts = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / n) * len;
    while (raw[j + 1].l < target) j++;
    const a = raw[j],
      b = raw[j + 1];
    const t = (target - a.l) / (b.l - a.l || 1);
    pts.push([a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t, a.p[2] + (b.p[2] - a.p[2]) * t]);
  }
  return { pts, len };
}

function curvatures(pts) {
  const n = pts.length;
  const k = new Float32Array(n);
  const W = 4;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - W + n) % n],
      b = pts[i],
      c = pts[(i + W) % n];
    const h1 = Math.atan2(b[2] - a[2], b[0] - a[0]);
    const h2 = Math.atan2(c[2] - b[2], c[0] - b[0]);
    let d = h2 - h1;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    k[i] = d / (W * STEP);
  }
  return k;
}

const cache = {};

export function buildTrack(idx) {
  if (cache[idx]) return cache[idx];
  const def = TRACKS[idx];
  // уменьшаем амплитуды, пока минимальный радиус поворота не станет приемлемым
  let scale = 1,
    S,
    K;
  const minR = def.width * 1.45;
  for (let it = 0; it < 12; it++) {
    const H = harmonics(def, scale);
    S = sample(def, H);
    K = curvatures(S.pts);
    let mx = 0;
    for (const v of K) mx = Math.max(mx, Math.abs(v));
    if (1 / mx >= minR) break;
    scale *= 0.88;
  }
  let pts = S.pts;
  const n = pts.length;
  // старт — на самом прямом участке
  let best = 0,
    bestV = 1e9;
  for (let i = 0; i < n; i += 2) {
    let sum = 0;
    for (let j = -50; j <= 30; j++) sum += Math.abs(K[(i + j + n) % n]);
    if (sum < bestV) {
      bestV = sum;
      best = i;
    }
  }
  pts = pts.slice(best).concat(pts.slice(0, best));
  // высота: сглаживаем и прижимаем старт к нулю; не ниже 0.4
  const ys = pts.map((p) => p[1]);
  let minY = 1e9;
  for (const v of ys) minY = Math.min(minY, v);
  for (let i = 0; i < n; i++) {
    const dist = Math.min(i, n - i);
    const f = Math.min(1, Math.max(0, (dist - 25) / 70));
    const flat = f * f * (3 - 2 * f);
    pts[i][1] = 0.4 + (ys[i] - minY) * flat;
  }
  const k = curvatures(pts);
  const T = {
    idx,
    def,
    theme: def.theme,
    n,
    len: n * STEP,
    halfW: def.width / 2,
    x: new Float32Array(n),
    y: new Float32Array(n),
    z: new Float32Array(n),
    tx: new Float32Array(n),
    tz: new Float32Array(n),
    nx: new Float32Array(n), // нормаль влево
    nz: new Float32Array(n),
    k,
    slope: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    T.x[i] = p[0];
    T.y[i] = p[1];
    T.z[i] = p[2];
  }
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n,
      b = (i + 1) % n;
    let dx = T.x[b] - T.x[a],
      dz = T.z[b] - T.z[a];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    T.tx[i] = dx;
    T.tz[i] = dz;
    // поворот касательной на +90° (против часовой при виде сверху, ось Y вверх → «лево» при движении)
    T.nx[i] = dz;
    T.nz[i] = -dx;
    T.slope[i] = (T.y[b] - T.y[a]) / (2 * STEP);
  }
  // кривизна: знак относительно нормали
  // k>0 — поворот к нормали (влево)
  for (let i = 0; i < n; i++) {
    const a = (i - 4 + n) % n,
      b = (i + 4) % n;
    const cross = T.tx[a] * T.tz[b] - T.tz[a] * T.tx[b];
    T.k[i] = Math.abs(T.k[i]) * (cross < 0 ? 1 : -1);
  }
  racingLine(T);
  placeItems(T);
  buildHash(T);
  cache[idx] = T;
  return T;
}

// гоночная линия (смещение) и базовый профиль скорости при поворотной скорости ω = 1
function racingLine(T) {
  const n = T.n;
  const line = new Float32Array(n);
  const W = 22;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = -W; j <= W; j++) s += T.k[(i + j + n) % n] * (1 - Math.abs(j) / (W + 1));
    s /= W;
    // внутрь поворота: k>0 — поворот к нормали, значит внутренняя сторона по +нормали
    line[i] = Math.max(-1, Math.min(1, s * 26)) * T.halfW * 0.55;
  }
  T.line = line;
  // радиус поворота
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = -6; j <= 6; j++) m = Math.max(m, Math.abs(T.k[(i + j + n) % n]));
    R[i] = 1 / Math.max(m, 1e-4);
  }
  T.radius = R;
}

// профиль скорости бота для заданных характеристик
export function speedProfile(T, vmax, turn, accel) {
  const n = T.n;
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = Math.min(vmax, turn * T.radius[i] * 1.12);
  // торможение назад, разгон вперёд (по два круга, чтобы замкнуть)
  const dec = 22;
  for (let r = 0; r < 2; r++)
    for (let i = n - 1; i >= 0; i--) {
      const nx = v[(i + 1) % n];
      v[i] = Math.min(v[i], Math.sqrt(nx * nx + 2 * dec * STEP));
    }
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < n; i++) {
      const pv = v[(i - 1 + n) % n];
      v[i] = Math.min(v[i], Math.sqrt(pv * pv + 2 * accel * 0.8 * STEP));
    }
  return v;
}

// монеты и ускорители
function placeItems(T) {
  const R = rng(T.def.seed * 7 + 3);
  const n = T.n;
  T.boosts = [];
  T.coins = [];
  // ускорители перед выходом на прямые
  let last = -999;
  for (let i = 60; i < n - 40; i += 4) {
    let straight = 0;
    for (let j = 0; j < 40; j++) straight = Math.max(straight, Math.abs(T.k[(i + j) % n]));
    if (straight < 0.006 && i - last > 140) {
      T.boosts.push({ i, d: (R() - 0.5) * T.halfW * 0.9 });
      last = i;
    }
  }
  if (T.boosts.length < 2) T.boosts.push({ i: Math.floor(n * 0.5), d: 0 }, { i: Math.floor(n * 0.8), d: 0 });
  // ряды монет
  const groups = Math.floor(n / 90);
  for (let g = 0; g < groups; g++) {
    const i0 = Math.floor(((g + 0.5) / groups) * n);
    if (i0 < 50 || T.boosts.some((b) => Math.abs(b.i - i0) < 30)) continue;
    const d0 = (R() - 0.5) * T.halfW * 1.1;
    const curve = (R() - 0.5) * 0.6;
    for (let c = 0; c < 6; c++) T.coins.push({ i: (i0 + c * 5) % n, d: Math.max(-T.halfW + 2, Math.min(T.halfW - 2, d0 + curve * c * 2)) });
  }
}

// пространственный хэш точек трассы для поиска расстояния от декораций
function buildHash(T) {
  const C = 16;
  const map = new Map();
  for (let i = 0; i < T.n; i += 2) {
    const key = Math.floor(T.x[i] / C) + ',' + Math.floor(T.z[i] / C);
    let a = map.get(key);
    if (!a) map.set(key, (a = []));
    a.push(i);
  }
  T._hash = map;
  T._C = C;
}

// расстояние от точки до осевой трассы (по горизонтали) и индекс ближайшей точки
export function nearest(T, x, z) {
  const C = T._C;
  const cx = Math.floor(x / C),
    cz = Math.floor(z / C);
  let best = 1e9,
    bi = -1;
  for (let a = -2; a <= 2; a++)
    for (let b = -2; b <= 2; b++) {
      const arr = T._hash.get(cx + a + ',' + (cz + b));
      if (!arr) continue;
      for (const i of arr) {
        const d = (T.x[i] - x) ** 2 + (T.z[i] - z) ** 2;
        if (d < best) {
          best = d;
          bi = i;
        }
      }
    }
  return { d: bi < 0 ? 1e9 : Math.sqrt(best), i: bi };
}

// локальный поиск ближайшей точки от предыдущего индекса (для машин)
export function track(T, x, z, hint) {
  const n = T.n;
  let bi = hint,
    best = (T.x[hint] - x) ** 2 + (T.z[hint] - z) ** 2;
  for (let j = -12; j <= 12; j++) {
    const i = (hint + j + n) % n;
    const d = (T.x[i] - x) ** 2 + (T.z[i] - z) ** 2;
    if (d < best) {
      best = d;
      bi = i;
    }
  }
  // уточнение внутри отрезка
  const dx = x - T.x[bi],
    dz = z - T.z[bi];
  const along = dx * T.tx[bi] + dz * T.tz[bi];
  const lat = dx * T.nx[bi] + dz * T.nz[bi];
  return { i: bi, s: bi * STEP + along, d: lat };
}

// точка трассы по s (м) и смещению d
export function pointAt(T, s, d, out) {
  const n = T.n;
  let f = s / STEP;
  f = ((f % n) + n) % n;
  const i = Math.floor(f),
    t = f - i,
    j = (i + 1) % n;
  const x = T.x[i] + (T.x[j] - T.x[i]) * t;
  const y = T.y[i] + (T.y[j] - T.y[i]) * t;
  const z = T.z[i] + (T.z[j] - T.z[i]) * t;
  const nx = T.nx[i] + (T.nx[j] - T.nx[i]) * t;
  const nz = T.nz[i] + (T.nz[j] - T.nz[i]) * t;
  const tx = T.tx[i] + (T.tx[j] - T.tx[i]) * t;
  const tz = T.tz[i] + (T.tz[j] - T.tz[i]) * t;
  out = out || {};
  out.x = x + nx * d;
  out.y = y;
  out.z = z + nz * d;
  out.tx = tx;
  out.tz = tz;
  out.i = i;
  out.slope = T.slope[i];
  return out;
}

// высота поверхности трассы для произвольного индекса с интерполяцией
export function heightAt(T, s) {
  const n = T.n;
  let f = s / STEP;
  f = ((f % n) + n) % n;
  const i = Math.floor(f),
    t = f - i;
  return T.y[i] + (T.y[(i + 1) % n] - T.y[i]) * t;
}
